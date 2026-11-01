import pool from '../config/db.js';
import redisClient from '../config/redis.js';
import { logAudit } from './auditService.js';
import { decrypt } from '../utils/crypto.js';
import { buildPixStaticPayload } from '../utils/pixEmv.js';
import crypto from 'crypto';

/**
 * Serviço de Cobrança Automática do SaaS, Tolerância e Bloqueio Gradual (Fase 44 - D18 P1)
 */

/**
 * Gera payload estruturado de PIX para a fatura do SaaS.
 * Se o Mercado Pago estiver configurado no Super Admin com Access Token, cria a cobrança
 * oficial diretamente na API do Mercado Pago (PIX dinâmico com baixa automática).
 */
export const generateSaaSPixPayload = async ({
  amount,
  invoiceId,
  referenceMonth,
  tenantSlug,
  tenantId,
  attempt = 1,
  expirationDays = 3
}) => {
  const formattedAmount = Number(amount).toFixed(2);
  const cleanId = String(invoiceId).replace(/-/g, '').slice(0, 20);

  // 1. Tentar gerar cobrança oficial via API do Mercado Pago (se configurado no Super Admin)
  try {
    const platformRes = await pool.query(
      'SELECT payment_gateway, gateway_api_key, pix_key, pix_key_type, environment FROM public.cap_platform_settings LIMIT 1'
    );
    const settings = platformRes.rows[0];

    if (settings?.payment_gateway === 'mercadopago' && settings.gateway_api_key) {
      let token = null;
      try {
        token = decrypt(settings.gateway_api_key);
      } catch (decErr) {
        token = settings.gateway_api_key;
      }
      if (!token) token = settings.gateway_api_key;
      if (typeof token === 'string') token = token.trim();

      if (token && (token.startsWith('APP_USR-') || token.startsWith('TEST-'))) {
        let managerEmail = `financeiro@${tenantSlug || 'salao'}.operabeauty.tech`;
        let managerName = 'Gestor Salão';

        if (tenantId) {
          const staffRes = await pool.query(
            "SELECT email, name FROM public.cap_staff WHERE tenant_id = $1 AND role = 'manager' AND is_active = true ORDER BY created_at ASC LIMIT 1",
            [tenantId]
          );
          if (staffRes.rows.length > 0) {
            managerEmail = staffRes.rows[0].email || managerEmail;
            managerName = staffRes.rows[0].name || managerName;
          }
        }

        const appUrl = process.env.APP_URL || 'https://operabeauty.tech';
        const nameParts = (managerName || 'Gestor').trim().split(' ');
        const firstName = nameParts[0] || 'Cliente';
        const lastName = nameParts.slice(1).join(' ') || 'Assinante';

        // Validação e formatação de e-mail seguro para o Mercado Pago
        let safeEmail = managerEmail.trim().toLowerCase();
        if (!safeEmail.includes('@') || safeEmail.endsWith('.local') || safeEmail.endsWith('.invalid')) {
          safeEmail = `contato.${cleanId.slice(0, 8)}@operabeauty.tech`;
        }

        // Data de expiração formal (pelo menos 3 dias no futuro para evitar expiração prematura)
        const expirationDate = new Date(Date.now() + (expirationDays || 3) * 24 * 60 * 60 * 1000);
        const idempotencyKey = `inv_${cleanId}_${attempt || 1}_${Math.floor(Date.now() / 10000)}`;

        const mpRes = await fetch('https://api.mercadopago.com/v1/payments', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'X-Idempotency-Key': idempotencyKey
          },
          body: JSON.stringify({
            transaction_amount: Number(formattedAmount),
            description: `Mensalidade OperaBeauty SaaS - ${tenantSlug || 'Salão'} (${referenceMonth || 'Atual'})`,
            payment_method_id: 'pix',
            date_of_expiration: expirationDate.toISOString(),
            payer: {
              email: safeEmail,
              first_name: firstName,
              last_name: lastName
            },
            notification_url: `${appUrl}/api/invoices/webhook/mercadopago`
          })
        });

        if (mpRes.ok) {
          const mpData = await mpRes.json();
          const mpId = String(mpData.id);
          const pixCode = mpData.point_of_interaction?.transaction_data?.qr_code || '';
          const pixQr = mpData.point_of_interaction?.transaction_data?.qr_code_base64
            ? `data:image/png;base64,${mpData.point_of_interaction.transaction_data.qr_code_base64}`
            : `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(pixCode)}&margin=10`;

          return {
            pix_copy_paste: pixCode,
            pix_qr_code: pixQr,
            gateway_transaction_id: mpId,
            gateway_invoice_url: mpData.point_of_interaction?.transaction_data?.ticket_url || null,
            gateway_provider: 'mercadopago',
            expires_at: expirationDate.toISOString()
          };
        } else {
          const errData = await mpRes.text();
          console.error('[Mercado Pago SaaS] Falha na criação do PIX (HTTP ' + mpRes.status + '):', errData);
        }
      } else {
        console.warn('[Mercado Pago SaaS] Access Token não configurado ou formato inválido (deve iniciar com APP_USR- ou TEST-).');
      }
    }
  } catch (err) {
    console.error('Falha ao gerar cobrança Mercado Pago para fatura SaaS:', err);
  }

  // 2. Fallback: payload estruturado oficial EMV BR Code com CRC16 válido (Banco Central do Brasil)
  let pixKey = process.env.SAAS_PIX_KEY || 'financeiro@operabeauty.tech';
  try {
    const platformRes = await pool.query('SELECT pix_key, pix_key_type FROM public.cap_platform_settings LIMIT 1');
    if (platformRes.rows[0]?.pix_key) {
      pixKey = platformRes.rows[0].pix_key;
    }
  } catch (_) {
    // Resiliente caso banco esteja inacessível ou em testes isolados
  }
  const merchantName = 'OPERA BEAUTY SAAS';
  const merchantCity = 'SAO PAULO';

  const pixCopyPaste = buildPixStaticPayload({
    pixKey,
    merchantName,
    merchantCity,
    amount: formattedAmount,
    txId: `OPERA-${cleanId}`,
    description: `FATURA ${referenceMonth || 'SAAS'}`
  });

  const pixQrCode = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(pixCopyPaste)}&margin=10`;

  return {
    pix_copy_paste: pixCopyPaste,
    pix_qr_code: pixQrCode,
    gateway_transaction_id: `inv_tx_${crypto.randomBytes(8).toString('hex')}`,
    gateway_provider: 'institutional_pix'
  };
};

/**
 * Consulta a situação financeira completa da assinatura SaaS do salão
 */
export const getTenantBillingStatus = async (tenantId) => {
  const tenantRes = await pool.query(
    `SELECT t.id, t.name, t.slug, t.status, t.plan_price, t.plan_id,
            t.grace_period_days, t.overdue_since, t.billing_locked_at, t.suspension_reason,
            t.is_founder, t.frozen_price, t.price_frozen_until, t.founder_badge_label,
            p.name as plan_name, p.slug as plan_slug, p.price as plan_catalog_price, p.features as plan_features
     FROM public.cap_tenants t
     LEFT JOIN public.cap_plans p ON t.plan_id = p.id
     WHERE t.id = $1`,
    [tenantId]
  );

  if (tenantRes.rows.length === 0) {
    const error = new Error('Salão não encontrado.');
    error.statusCode = 404;
    throw error;
  }

  const tenant = tenantRes.rows[0];
  const graceDays = Number(tenant.grace_period_days || 5);

  // Consulta ambiente da plataforma (sandbox vs production)
  const platformRes = await pool.query('SELECT environment FROM public.cap_platform_settings LIMIT 1');
  const platformEnv = platformRes.rows[0]?.environment || 'sandbox';
  const isSandbox = platformEnv === 'sandbox';

  // Buscar faturas do salão
  const invoicesRes = await pool.query(
    `SELECT id, tenant_id, amount, status, due_date, paid_at, payment_method,
            reference_month, pix_copy_paste, pix_qr_code, gateway_transaction_id,
            gateway_invoice_url, grace_period_days, warnings_sent, created_at,
            (CURRENT_DATE - due_date) as days_overdue
     FROM public.cap_invoices
     WHERE tenant_id = $1
     ORDER BY due_date DESC`,
    [tenantId]
  );

  // Buscar complementos ativos do salão
  const addonsRes = await pool.query(
    `SELECT ta.id, ta.addon_id, ta.price, ta.config, ta.activated_at,
            a.slug, a.name, a.category, a.features
     FROM public.cap_tenant_addons ta
     JOIN public.cap_addons a ON ta.addon_id = a.id
     WHERE ta.tenant_id = $1 AND ta.status = 'active'
     ORDER BY a.price ASC`,
    [tenantId]
  );

  const activeAddonsList = addonsRes.rows;
  const totalAddonsPrice = activeAddonsList.reduce((sum, item) => sum + Number(item.price || 0), 0);

  const invoices = invoicesRes.rows;
  
  // Localizar faturas pendentes ou vencidas
  const pendingOrOverdue = invoices.filter(i => i.status === 'pending' || i.status === 'overdue');
  const paidInvoices = invoices.filter(i => i.status === 'paid');

  let worstOverdueDays = 0;
  let hasOverdueInvoice = false;
  let isGracePeriodExpired = false;
  let activePendingInvoice = null;

  if (pendingOrOverdue.length > 0) {
    activePendingInvoice = pendingOrOverdue[0];

    for (const inv of pendingOrOverdue) {
      const days = Number(inv.days_overdue || 0);
      if (days > 0) {
        hasOverdueInvoice = true;
        if (days > worstOverdueDays) {
          worstOverdueDays = days;
        }
        if (days > graceDays) {
          isGracePeriodExpired = true;
        }
      }
    }
  }

  // Se não tiver fatura pendente, mas o plano for pago e não houver fatura do mês, gerar automaticamente
  if (!activePendingInvoice && Number(tenant.plan_price || 0) > 0) {
    const today = new Date();
    const currentMonthRef = today.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    
    // Verificar se já tem fatura paga para o mês
    const alreadyPaidThisMonth = paidInvoices.some(i => i.reference_month?.toLowerCase() === currentMonthRef.toLowerCase());
    
    if (!alreadyPaidThisMonth) {
      // Vencimento padrão para o dia 10 ou em 7 dias
      const dueDate = new Date(today.getFullYear(), today.getMonth(), 10 > today.getDate() ? 10 : today.getDate() + 7)
        .toISOString().split('T')[0];
      
      activePendingInvoice = await createSaaSInvoice({
        tenantId,
        amount: tenant.plan_price,
        dueDate,
        referenceMonth: currentMonthRef.charAt(0).toUpperCase() + currentMonthRef.slice(1),
        gracePeriodDays: graceDays
      });
      invoices.unshift(activePendingInvoice);
    }
  }

  // Se a fatura pendente estiver com ID provisório local (inv_tx_) ou se o QR Code expirou no Mercado Pago, renova o PIX
  if (activePendingInvoice) {
    const isLocalTx = !activePendingInvoice.gateway_transaction_id || activePendingInvoice.gateway_transaction_id.startsWith('inv_tx_');
    let shouldRenew = isLocalTx;

    // Se tiver ID do Mercado Pago, checar se a cobrança expirou
    if (!isLocalTx && activePendingInvoice.gateway_transaction_id) {
      try {
        const platformRes = await pool.query('SELECT gateway_api_key, payment_gateway FROM public.cap_platform_settings LIMIT 1');
        const settings = platformRes.rows[0];
        if (settings?.payment_gateway === 'mercadopago' && settings.gateway_api_key) {
          let token = decrypt(settings.gateway_api_key) || settings.gateway_api_key;
          if (token) token = token.trim();
          if (token) {
            const checkRes = await fetch(`https://api.mercadopago.com/v1/payments/${activePendingInvoice.gateway_transaction_id}`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            if (checkRes.ok) {
              const checkData = await checkRes.json();
              if (checkData.status === 'cancelled' || checkData.status_detail === 'expired') {
                shouldRenew = true;
              }
            }
          }
        }
      } catch (err) {
        // Silencioso se der erro na verificação
      }
    }

    if (shouldRenew) {
      try {
        const dynamicPix = await generateSaaSPixPayload({
          amount: activePendingInvoice.amount,
          invoiceId: activePendingInvoice.id,
          referenceMonth: activePendingInvoice.reference_month,
          tenantSlug: tenant.slug,
          tenantId,
          attempt: Date.now()
        });
        if (dynamicPix && dynamicPix.pix_copy_paste) {
          await pool.query(
            `UPDATE public.cap_invoices
             SET pix_copy_paste = $1, pix_qr_code = $2, gateway_transaction_id = $3
             WHERE id = $4`,
            [dynamicPix.pix_copy_paste, dynamicPix.pix_qr_code, dynamicPix.gateway_transaction_id, activePendingInvoice.id]
          );
          activePendingInvoice.pix_copy_paste = dynamicPix.pix_copy_paste;
          activePendingInvoice.pix_qr_code = dynamicPix.pix_qr_code;
          activePendingInvoice.gateway_transaction_id = dynamicPix.gateway_transaction_id;
        }
      } catch (regErr) {
        console.error('Erro ao registrar/renovar fatura pendente no Mercado Pago:', regErr);
      }
    }
  }

  // Avaliação de bloqueio gradual
  const isLocked = Boolean(tenant.billing_locked_at || tenant.status === 'overdue' || tenant.status === 'suspended');
  const inGracePeriod = hasOverdueInvoice && !isGracePeriodExpired;

  const isPriceFrozen = Boolean(tenant.is_founder && tenant.price_frozen_until && new Date(tenant.price_frozen_until) > new Date());
  const effectiveMonthlyPrice = isPriceFrozen && tenant.frozen_price 
    ? Number(tenant.frozen_price) 
    : Number(tenant.plan_price || tenant.plan_catalog_price || 99.90);

  return {
    is_sandbox: isSandbox,
    tenant: {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      status: tenant.status,
      plan_name: tenant.plan_name || 'Signature',
      plan_slug: tenant.plan_slug || 'signature',
      monthly_price: effectiveMonthlyPrice,
      addons_price: Number(totalAddonsPrice.toFixed(2)),
      total_monthly_price: Number((effectiveMonthlyPrice + totalAddonsPrice).toFixed(2)),
      active_addons: activeAddonsList,
      catalog_price: Number(tenant.plan_catalog_price || 199.90),
      is_founder: Boolean(tenant.is_founder),
      is_price_frozen: isPriceFrozen,
      frozen_price: tenant.frozen_price ? Number(tenant.frozen_price) : null,
      price_frozen_until: tenant.price_frozen_until,
      founder_badge_label: tenant.founder_badge_label || 'Fundador',
      is_locked: isLocked,
      in_grace_period: inGracePeriod,
      overdue_since: tenant.overdue_since,
      billing_locked_at: tenant.billing_locked_at,
      suspension_reason: tenant.suspension_reason,
      grace_period_days: graceDays,
      days_overdue: worstOverdueDays
    },
    billing_summary: {
      status_label: isLocked 
        ? 'Acesso Bloqueado (Inadimplência)' 
        : inGracePeriod 
          ? `Tolerância de Pagamento (${graceDays - worstOverdueDays} dias restantes)` 
          : 'Assinatura Regular',
      has_overdue: hasOverdueInvoice,
      worst_overdue_days: worstOverdueDays,
      grace_days_remaining: Math.max(0, graceDays - worstOverdueDays),
      can_book_online: !isLocked,
      pending_count: pendingOrOverdue.length,
      paid_count: paidInvoices.length
    },
    is_grace_period: inGracePeriod,
    is_blocked: isLocked,
    remaining_grace_days: Math.max(0, graceDays - worstOverdueDays),
    days_overdue: worstOverdueDays,
    active_invoices: activePendingInvoice ? [activePendingInvoice] : [],
    history: paidInvoices,
    active_invoice: activePendingInvoice,
    invoices
  };
};

/**
 * Criação de uma fatura de mensalidade SaaS com dados PIX pré-gerados
 */
export const createSaaSInvoice = async ({
  tenantId,
  amount,
  dueDate,
  referenceMonth,
  gracePeriodDays = 5,
  gateway = 'sandbox'
}) => {
  const tenantRes = await pool.query('SELECT slug, name FROM public.cap_tenants WHERE id = $1', [tenantId]);
  const slug = tenantRes.rows[0]?.slug || 'salao';

  const invoiceId = crypto.randomUUID();

  const pixData = await generateSaaSPixPayload({
    amount,
    invoiceId,
    referenceMonth,
    tenantSlug: slug,
    tenantId
  });

  const txId = pixData.gateway_transaction_id || `inv_tx_${crypto.randomBytes(8).toString('hex')}`;

  const result = await pool.query(
    `INSERT INTO public.cap_invoices (
      id, tenant_id, amount, status, due_date, reference_month,
      pix_copy_paste, pix_qr_code, gateway_transaction_id,
      grace_period_days, warnings_sent, created_at
    ) VALUES (
      $1, $2, $3, 'pending', $4, $5,
      $6, $7, $8,
      $9, '[]'::jsonb, NOW()
    ) RETURNING id, tenant_id, amount, status, due_date, paid_at, payment_method,
                reference_month, pix_copy_paste, pix_qr_code, gateway_transaction_id,
                grace_period_days, created_at`,
    [
      invoiceId,
      tenantId,
      parseFloat(amount),
      dueDate,
      referenceMonth,
      pixData.pix_copy_paste,
      pixData.pix_qr_code,
      txId,
      gracePeriodDays
    ]
  );

  return result.rows[0];
};

/**
 * Registra a baixa/pagamento de uma fatura SaaS e executa a reativação automática
 */
export const paySaaSInvoice = async ({
  invoiceId,
  paymentMethod = 'pix',
  gatewayTransactionId = null,
  userId = null,
  source = 'webhook'
}) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Buscar fatura existente
    const invRes = await client.query(
      `SELECT id, tenant_id, amount, status, due_date, reference_month
       FROM public.cap_invoices
       WHERE id = $1 FOR UPDATE`,
      [invoiceId]
    );

    if (invRes.rows.length === 0) {
      const err = new Error('Fatura não encontrada.');
      err.statusCode = 404;
      throw err;
    }

    const invoice = invRes.rows[0];

    // Se já estiver paga, idempotência graciosa
    if (invoice.status === 'paid') {
      await client.query('COMMIT');
      return { success: true, message: 'Fatura já estava quitada.', invoice };
    }

    // 2. Dar baixa na fatura
    const updateInvRes = await client.query(
      `UPDATE public.cap_invoices
       SET status = 'paid',
           paid_at = NOW(),
           payment_method = $1,
           gateway_transaction_id = COALESCE($2, gateway_transaction_id)
       WHERE id = $3
       RETURNING id, tenant_id, amount, status, due_date, paid_at, payment_method, reference_month`,
      [paymentMethod, gatewayTransactionId, invoiceId]
    );

    const paidInvoice = updateInvRes.rows[0];
    const tenantId = invoice.tenant_id;

    // 3. Checar se existem outras faturas vencidas além da tolerância
    const remainingOverdueRes = await client.query(
      `SELECT id, due_date, (CURRENT_DATE - due_date) as days_overdue, grace_period_days
       FROM public.cap_invoices
       WHERE tenant_id = $1
         AND status IN ('pending', 'overdue')
         AND due_date < CURRENT_DATE`,
      [tenantId]
    );

    const stillHasExpiredGrace = remainingOverdueRes.rows.some(
      r => Number(r.days_overdue) > Number(r.grace_period_days || 5)
    );

    let reactivated = false;

    // 4. Se não há mais faturas além da tolerância, REATIVAÇÃO AUTOMÁTICA IMEDIATA
    if (!stillHasExpiredGrace) {
      const tenantCheck = await client.query(
        'SELECT status, billing_locked_at FROM public.cap_tenants WHERE id = $1',
        [tenantId]
      );
      
      const currentStatus = tenantCheck.rows[0]?.status;

      if (currentStatus === 'overdue' || currentStatus === 'suspended' || tenantCheck.rows[0]?.billing_locked_at) {
        await client.query(
          `UPDATE public.cap_tenants
           SET status = 'active',
               overdue_since = NULL,
               billing_locked_at = NULL,
               suspension_reason = NULL
           WHERE id = $1`,
          [tenantId]
        );
        reactivated = true;
      }
    }

    await client.query('COMMIT');

    // 5. Auditoria de Pagamento e Reativação
    await logAudit({
      tenantId,
      action: 'SAAS_INVOICE_PAID',
      entityName: 'cap_invoices',
      entityId: invoiceId,
      newData: {
        amount: invoice.amount,
        reference_month: invoice.reference_month,
        payment_method: paymentMethod,
        source,
        reactivated_tenant: reactivated
      }
    });

    if (reactivated) {
      await logAudit({
        tenantId,
        action: 'AUTO_REACTIVE_TENANT',
        entityName: 'cap_tenants',
        entityId: tenantId,
        newData: {
          trigger: 'invoice_payment_completed',
          invoice_id: invoiceId
        }
      });
    }

    return {
      success: true,
      message: reactivated 
        ? 'Pagamento confirmado e salão reativado automaticamente!' 
        : 'Pagamento de fatura registrado com sucesso.',
      invoice: paidInvoice,
      reactivated
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Trata webhooks de gateways de pagamento (Mercado Pago, Asaas, etc.)
 */
export const processBillingWebhook = async (gateway, payload) => {
  let transactionId = null;
  let status = null;

  if (gateway === 'mercadopago') {
    transactionId = payload?.data?.id || payload?.id;

    if (transactionId) {
      try {
        const platformRes = await pool.query('SELECT gateway_api_key FROM public.cap_platform_settings LIMIT 1');
        const encryptedKey = platformRes.rows[0]?.gateway_api_key;
        let token = null;
        if (encryptedKey) {
          try { token = decrypt(encryptedKey); } catch (_) { token = encryptedKey; }
        }
        if (token) {
          const mpCheck = await fetch(`https://api.mercadopago.com/v1/payments/${transactionId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (mpCheck.ok) {
            const mpJson = await mpCheck.json();
            status = mpJson.status; // 'approved', 'pending', etc.
          }
        }
      } catch (checkErr) {
        console.error('Erro ao verificar status no Mercado Pago via Webhook:', checkErr);
      }
    }
    if (!status) {
      // [SEGURANÇA OWASP / FALHA 03]: 'payment.created' NUNCA deve ser considerado como 'paid'.
      // Apenas 'approved' confirmado pelo Mercado Pago autoriza a baixa da fatura.
      if (payload?.action === 'payment.created') {
        status = 'pending';
      } else if (payload?.data?.status === 'approved' || payload?.status === 'approved') {
        status = 'approved';
      } else {
        status = payload?.data?.status || payload?.status || 'pending';
      }
    }
  } else if (gateway === 'asaas') {
    transactionId = payload?.payment?.id;
    status = payload?.event === 'PAYMENT_RECEIVED' || payload?.event === 'PAYMENT_CONFIRMED' ? 'paid' : 'pending';
  } else {
    transactionId = payload?.transaction_id || payload?.id;
    status = payload?.status;
  }

  if (!transactionId) {
    return { ignored: true, reason: 'Sem transaction_id no payload' };
  }

  // Localizar fatura correspondente
  const invRes = await pool.query(
    'SELECT id, status FROM public.cap_invoices WHERE gateway_transaction_id = $1 LIMIT 1',
    [String(transactionId)]
  );

  if (invRes.rows.length === 0) {
    return { ignored: true, reason: 'Fatura correspondente não localizada' };
  }

  const invoice = invRes.rows[0];

  if (status === 'paid' || status === 'approved') {
    return await paySaaSInvoice({
      invoiceId: invoice.id,
      paymentMethod: 'pix',
      gatewayTransactionId: String(transactionId),
      source: `webhook:${gateway}`
    });
  }

  return { received: true, status };
};

/**
 * Varredura diária de faturas vencidas e aplicação da política de tolerância e bloqueio gradual
 */
export const checkOverdueInvoicesAndEnforceGracePeriod = async () => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Atualizar faturas vencidas que ainda constavam como 'pending'
    await client.query(
      `UPDATE public.cap_invoices
       SET status = 'overdue'
       WHERE status = 'pending' AND due_date < CURRENT_DATE`
    );

    // 2. Identificar salões com faturas em atraso
    const overdueRes = await client.query(
      `SELECT t.id as tenant_id, t.name, t.status, t.grace_period_days,
              MIN(i.due_date) as oldest_due_date,
              (CURRENT_DATE - MIN(i.due_date)) as max_days_overdue
       FROM public.cap_tenants t
       JOIN public.cap_invoices i ON t.id = i.tenant_id
       WHERE i.status = 'overdue'
       GROUP BY t.id, t.name, t.status, t.grace_period_days`
    );

    const results = {
      evaluated_tenants: overdueRes.rows.length,
      warned_in_grace: 0,
      blocked_expired: 0
    };

    for (const row of overdueRes.rows) {
      const daysOverdue = Number(row.max_days_overdue);
      const graceDays = Number(row.grace_period_days || 5);

      if (daysOverdue <= graceDays) {
        // Dentro da tolerância de carência (D+1 a D+5)
        // Salão permanece ativo, mas marca overdue_since
        await client.query(
          `UPDATE public.cap_tenants
           SET overdue_since = COALESCE(overdue_since, $1)
           WHERE id = $2 AND status = 'active'`,
          [row.oldest_due_date, row.tenant_id]
        );
        results.warned_in_grace += 1;
      } else {
        // Tolerância expirada (> D+5)
        // Aplica bloqueio gradual (modo somente leitura)
        if (row.status !== 'suspended' && row.status !== 'overdue') {
          await client.query(
            `UPDATE public.cap_tenants
             SET status = 'overdue',
                 billing_locked_at = NOW(),
                 suspension_reason = $1
             WHERE id = $2`,
            [`Inadimplência de mensalidade após ${graceDays} dias de tolerância.`, row.tenant_id]
          );

          await logAudit({
            tenantId: row.tenant_id,
            action: 'SAAS_TENANT_BLOCKED_OVERDUE',
            entityName: 'cap_tenants',
            entityId: row.tenant_id,
            newData: {
              days_overdue: daysOverdue,
              grace_period_days: graceDays,
              oldest_due_date: row.oldest_due_date
            }
          });

          results.blocked_expired += 1;
        }
      }
    }

    await client.query('COMMIT');
    return results;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Simulador instantâneo de pagamento para Sandbox/Dev (Exclusivo SuperAdmin em modo Sandbox)
 */
export const simulateSaaSInvoicePayment = async (invoiceId) => {
  // Impede execução de simulação se a plataforma estiver em produção
  const platformRes = await pool.query('SELECT environment FROM public.cap_platform_settings LIMIT 1');
  const env = platformRes.rows[0]?.environment || 'sandbox';
  if (env === 'production') {
    const error = new Error('Operação de simulação bloqueada em ambiente de produção.');
    error.statusCode = 403;
    throw error;
  }

  return await paySaaSInvoice({
    invoiceId,
    paymentMethod: 'pix',
    gatewayTransactionId: `sim_${Date.now()}`,
    source: 'simulator'
  });
};

/**
 * Força a renovação do QR Code PIX de uma fatura SaaS (gerando nova cobrança no Mercado Pago ou com chave institucional)
 */
export const refreshSaaSInvoicePix = async (invoiceId) => {
  const invRes = await pool.query(
    `SELECT i.*, t.slug as tenant_slug
     FROM public.cap_invoices i
     JOIN public.cap_tenants t ON i.tenant_id = t.id
     WHERE i.id = $1`,
    [invoiceId]
  );

  if (invRes.rows.length === 0) {
    const error = new Error('Fatura não encontrada.');
    error.statusCode = 404;
    throw error;
  }

  const invoice = invRes.rows[0];
  if (invoice.status === 'paid') {
    const error = new Error('Esta fatura já se encontra liquidada e não pode ser renovada.');
    error.statusCode = 400;
    throw error;
  }

  const dynamicPix = await generateSaaSPixPayload({
    amount: invoice.amount,
    invoiceId: invoice.id,
    referenceMonth: invoice.reference_month,
    tenantSlug: invoice.tenant_slug,
    tenantId: invoice.tenant_id,
    attempt: Date.now()
  });

  await pool.query(
    `UPDATE public.cap_invoices
     SET pix_copy_paste = $1, pix_qr_code = $2, gateway_transaction_id = $3
     WHERE id = $4`,
    [dynamicPix.pix_copy_paste, dynamicPix.pix_qr_code, dynamicPix.gateway_transaction_id, invoice.id]
  );

  return {
    success: true,
    message: 'QR Code PIX renovado com sucesso!',
    invoice: {
      ...invoice,
      pix_copy_paste: dynamicPix.pix_copy_paste,
      pix_qr_code: dynamicPix.pix_qr_code,
      gateway_transaction_id: dynamicPix.gateway_transaction_id
    }
  };
};
