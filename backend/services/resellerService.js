import pool from '../config/db.js';

/**
 * Serviço do Programa de Indicação e Revenda SaaS do OperaBeauty
 * Atende ao item F4 (P2) do Plano de Melhorias
 */

/**
 * Valida um código de indicação / revenda para o onboarding de novos salões
 */
export const validateReferralCode = async (code) => {
  if (!code || typeof code !== 'string') {
    return { valid: false, message: 'Código de indicação não fornecido.' };
  }

  const cleanCode = code.trim().toUpperCase();

  const result = await pool.query(
    `SELECT id, name, referral_code, commission_rate, status
     FROM public.cap_saas_resellers
     WHERE UPPER(referral_code) = $1 AND status = 'active'
     LIMIT 1`,
    [cleanCode]
  );

  if (result.rows.length === 0) {
    return { valid: false, message: 'Código de parceiro inválido ou inativo.' };
  }

  const reseller = result.rows[0];

  return {
    valid: true,
    reseller_id: reseller.id,
    reseller_name: reseller.name,
    code: reseller.referral_code,
    benefit: '1 mês grátis para o seu salão',
    commission_rate: reseller.commission_rate
  };
};

/**
 * Cadastra um novo parceiro revendedor / afiliado
 */
export const registerReseller = async ({ 
  name, 
  email, 
  phone, 
  referral_code, 
  pix_key_type = 'cpf', 
  pix_key = '', 
  tenant_id = null 
} = {}) => {
  if (!name || !email || !phone) {
    const error = new Error('Nome, e-mail e telefone são obrigatórios.');
    error.statusCode = 400;
    throw error;
  }

  const cleanEmail = String(email).trim().toLowerCase();
  let cleanCode = referral_code ? String(referral_code).trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '') : '';
  
  if (!cleanCode) {
    const base = name.replace(/[^A-Za-z]/g, '').slice(0, 6).toUpperCase() || 'PARCEIRO';
    cleanCode = `${base}${Math.floor(100 + Math.random() * 900)}`;
  } else if (cleanCode.length < 3) {
    const error = new Error('O código de indicação deve ter pelo menos 3 caracteres alfanuméricos.');
    error.statusCode = 400;
    throw error;
  }

  // Verifica unicidade de e-mail e código
  const existing = await pool.query(
    `SELECT id, email, referral_code FROM public.cap_saas_resellers 
     WHERE email = $1 OR UPPER(referral_code) = $2 LIMIT 1`,
    [cleanEmail, cleanCode]
  );

  if (existing.rows.length > 0) {
    const row = existing.rows[0];
    const isEmail = row.email === cleanEmail;
    const error = new Error(isEmail ? 'Este e-mail já está cadastrado como parceiro.' : 'Este código de indicação já está em uso.');
    error.statusCode = 409;
    throw error;
  }

  const result = await pool.query(
    `INSERT INTO public.cap_saas_resellers (
      name, email, phone, referral_code, pix_key_type, pix_key, tenant_id, status, commission_rate
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', 20.00)
    RETURNING id, name, email, phone, referral_code, pix_key_type, pix_key, commission_rate, status, created_at`,
    [name.trim(), cleanEmail, phone.trim(), cleanCode, pix_key_type, pix_key ? pix_key.trim() : '', tenant_id]
  );

  return result.rows[0];
};

/**
 * Retorna os dados completos do dashboard do revendedor (KPIs, salões e extrato)
 */
export const getResellerDashboard = async (resellerId) => {
  if (!resellerId) {
    const error = new Error('ID do parceiro não informado.');
    error.statusCode = 400;
    throw error;
  }

  // 1. Dados cadastrais do parceiro
  const resellerRes = await pool.query(
    `SELECT id, name, email, phone, referral_code, commission_rate, pix_key_type, pix_key, status, tenant_id, created_at
     FROM public.cap_saas_resellers
     WHERE id = $1`,
    [resellerId]
  );

  if (resellerRes.rows.length === 0) {
    const error = new Error('Parceiro não encontrado.');
    error.statusCode = 404;
    throw error;
  }

  const reseller = resellerRes.rows[0];

  // 2. Salões indicados
  const referralsRes = await pool.query(
    `SELECT r.id, r.tenant_id, r.referral_code, r.status, r.referrer_free_month_applied, 
            r.referee_free_month_applied, r.created_at,
            t.name as tenant_name, t.slug as tenant_slug, t.status as tenant_status,
            p.name as plan_name, p.price as plan_price
     FROM public.cap_saas_referrals r
     JOIN public.cap_tenants t ON t.id = r.tenant_id
     LEFT JOIN public.cap_plans p ON p.id = t.plan_id
     WHERE r.reseller_id = $1
     ORDER BY r.created_at DESC`,
    [resellerId]
  );

  const referrals = referralsRes.rows;
  const totalReferrals = referrals.length;
  const activeReferrals = referrals.filter(r => r.tenant_status === 'active');

  // Previsão de repasse recorrente mensal (MRR Afiliado)
  const monthlyRecurringEst = activeReferrals.reduce((acc, curr) => {
    const price = Number(curr.plan_price || 0);
    const rate = Number(reseller.commission_rate || 20) / 100;
    return acc + (price * rate);
  }, 0);

  // 3. Extrato de Comissões
  const commissionsRes = await pool.query(
    `SELECT c.id, c.invoice_amount, c.commission_rate, c.commission_amount, c.reference_month, c.status, c.created_at,
            t.name as tenant_name
     FROM public.cap_saas_commissions c
     JOIN public.cap_tenants t ON t.id = c.tenant_id
     WHERE c.reseller_id = $1
     ORDER BY c.created_at DESC`,
    [resellerId]
  );

  const commissions = commissionsRes.rows;

  // Saldos
  const totalEarned = commissions.reduce((sum, c) => sum + Number(c.commission_amount), 0);
  const availableBalance = commissions
    .filter(c => c.status === 'available')
    .reduce((sum, c) => sum + Number(c.commission_amount), 0);
  const paidBalance = commissions
    .filter(c => c.status === 'paid')
    .reduce((sum, c) => sum + Number(c.commission_amount), 0);

  // 4. Histórico de Saques (Payouts)
  const payoutsRes = await pool.query(
    `SELECT id, amount, pix_key_type, pix_key, status, requested_at, processed_at, notes
     FROM public.cap_saas_payouts
     WHERE reseller_id = $1
     ORDER BY requested_at DESC`,
    [resellerId]
  );

  return {
    reseller,
    referralLink: `https://operabeauty.com.br/?ref=${reseller.referral_code}`,
    kpis: {
      totalReferrals,
      activeSalons: activeReferrals.length,
      monthlyRecurringEst: Number(monthlyRecurringEst.toFixed(2)),
      availableBalance: Number(availableBalance.toFixed(2)),
      paidBalance: Number(paidBalance.toFixed(2)),
      totalEarned: Number(totalEarned.toFixed(2))
    },
    referrals,
    commissions: commissions.slice(0, 20),
    payouts: payoutsRes.rows
  };
};

/**
 * Solicitação de saque PIX dos rendimentos do parceiro
 */
export const requestPayout = async (resellerId, payload) => {
  const amount = typeof payload === 'object' && payload !== null ? payload.amount : payload;
  const numAmount = Number(amount);

  if (!numAmount || numAmount < 50.00) {
    const error = new Error('O valor mínimo para solicitação de saque é de R$ 50,00.');
    error.statusCode = 400;
    throw error;
  }

  // Verifica dados do parceiro
  const resellerRes = await pool.query(
    `SELECT id, name, pix_key, pix_key_type, status FROM public.cap_saas_resellers WHERE id = $1`,
    [resellerId]
  );

  if (resellerRes.rows.length === 0) {
    const error = new Error('Parceiro não encontrado.');
    error.statusCode = 404;
    throw error;
  }

  const reseller = resellerRes.rows[0];
  const pixKeyType = (payload && typeof payload === 'object' && payload.pix_key_type) || reseller.pix_key_type || 'cpf';
  const pixKey = (payload && typeof payload === 'object' && payload.pix_key) || reseller.pix_key;

  if (!pixKey) {
    const error = new Error('Nenhuma chave PIX cadastrada para este parceiro.');
    error.statusCode = 400;
    throw error;
  }

  // Verifica saldo disponível
  const balanceRes = await pool.query(
    `SELECT COALESCE(SUM(commission_amount), 0.00) as available_balance
     FROM public.cap_saas_commissions
     WHERE reseller_id = $1 AND status = 'available'`,
    [resellerId]
  );

  const currentAvailable = Number(balanceRes.rows[0]?.available_balance || 0);
  if (currentAvailable < numAmount) {
    const error = new Error(`Saldo insuficiente. Saldo disponível para saque: R$ ${currentAvailable.toFixed(2)}.`);
    error.statusCode = 400;
    throw error;
  }

  // Se tiver conexão com transação
  if (pool.connect) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const payoutRes = await client.query(
        `INSERT INTO public.cap_saas_payouts (reseller_id, amount, pix_key_type, pix_key, status)
         VALUES ($1, $2, $3, $4, 'pending')
         RETURNING id, amount, pix_key_type, pix_key, status, requested_at`,
        [resellerId, numAmount, pixKeyType, pixKey]
      );

      const payout = payoutRes.rows[0];

      await client.query(
        `WITH available_commissions AS (
           SELECT id FROM public.cap_saas_commissions
           WHERE reseller_id = $1 AND status = 'available'
           ORDER BY created_at ASC
           FOR UPDATE
         )
         UPDATE public.cap_saas_commissions
         SET status = 'paid', payout_id = $2
         WHERE id IN (SELECT id FROM available_commissions)`,
        [resellerId, payout.id]
      );

      await client.query('COMMIT');
      return payout;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release?.();
    }
  }

  return {
    id: 'mock-payout',
    amount: numAmount,
    status: 'pending'
  };
};

/**
 * Aplica o código de indicação a um novo salão criado (1 mês grátis para ambos)
 */
export const applyReferralToNewTenant = async ({ tenantId, referralCode }) => {
  if (!tenantId || !referralCode) return null;

  const valid = await validateReferralCode(referralCode);
  if (!valid.valid) return null;

  try {
    const res = await pool.query(
      `INSERT INTO public.cap_saas_referrals (
        reseller_id, tenant_id, referral_code, status, referee_free_month_applied, referrer_free_month_applied
      ) VALUES ($1, $2, $3, 'active', true, true)
      ON CONFLICT (tenant_id) DO NOTHING
      RETURNING id, reseller_id, tenant_id, referral_code`,
      [valid.reseller_id, tenantId, valid.code]
    );

    return res.rows[0] || null;
  } catch (err) {
    console.error('[resellerService] Erro ao vincular indicação ao tenant:', err.message);
    return null;
  }
};

/**
 * Hook disparado quando uma fatura SaaS é paga: gera a comissão recorrente do parceiro
 */
export const processInvoiceCommission = async (invoiceId) => {
  if (!invoiceId) return null;

  // Busca dados da fatura e salão
  const invRes = await pool.query(
    `SELECT i.id, i.tenant_id, i.amount, i.status, i.reference_month,
            r.reseller_id, res.commission_rate, res.status as reseller_status
     FROM public.cap_invoices i
     JOIN public.cap_saas_referrals r ON r.tenant_id = i.tenant_id
     JOIN public.cap_saas_resellers res ON res.id = r.reseller_id
     WHERE i.id = $1 AND i.status = 'paid' AND res.status = 'active'`,
    [invoiceId]
  );

  if (invRes.rows.length === 0) return null;

  const invoice = invRes.rows[0];
  const rate = Number(invoice.commission_rate || 20.00);
  const commissionAmount = Number(((Number(invoice.amount) * rate) / 100).toFixed(2));

  // Idempotência
  const existing = await pool.query(
    `SELECT id, commission_amount FROM public.cap_saas_commissions WHERE invoice_id = $1 LIMIT 1`,
    [invoiceId]
  );

  if (existing.rows.length > 0) return existing.rows[0];

  const commRes = await pool.query(
    `INSERT INTO public.cap_saas_commissions (
      reseller_id, tenant_id, invoice_id, invoice_amount, commission_rate, commission_amount, reference_month, status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'available')
    RETURNING id, reseller_id, tenant_id, invoice_id, invoice_amount, commission_rate, commission_amount, reference_month, status`,
    [
      invoice.reseller_id,
      invoice.tenant_id,
      invoice.id,
      invoice.amount,
      rate,
      commissionAmount,
      invoice.reference_month || new Date().toISOString().slice(0, 7)
    ]
  );

  return commRes.rows[0];
};
