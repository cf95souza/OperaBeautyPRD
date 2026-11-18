import pool from '../config/db.js';
import { refreshSaaSInvoicePix } from './saasBillingService.js';
import { logAudit } from './auditService.js';

/**
 * Serviço de Gerenciamento de Cupons SaaS e Campanhas Promocionais (Fase 50)
 */

export const listSaaSCoupons = async () => {
  const result = await pool.query(
    `SELECT id, code, description, discount_type, discount_value, applies_to,
            plan_slugs, max_uses, current_uses, expires_at, is_active, created_at
     FROM public.cap_saas_coupons
     ORDER BY created_at DESC`
  );
  return result.rows;
};

export const createSaaSCoupon = async ({
  code,
  description,
  discount_type,
  discount_value,
  applies_to = 'first_month',
  plan_slugs = [],
  max_uses = null,
  expires_at = null
}) => {
  const cleanCode = String(code || '').trim().toUpperCase();
  if (!cleanCode) {
    const error = new Error('Código do cupom é obrigatório.');
    error.statusCode = 400;
    throw error;
  }

  const numValue = Number(discount_value);
  if (isNaN(numValue) || numValue <= 0) {
    const error = new Error('Valor de desconto inválido.');
    error.statusCode = 400;
    throw error;
  }

  if (discount_type === 'percentage' && numValue > 100) {
    const error = new Error('Desconto percentual não pode ser superior a 100%.');
    error.statusCode = 400;
    throw error;
  }

  const result = await pool.query(
    `INSERT INTO public.cap_saas_coupons (
       code, description, discount_type, discount_value, applies_to, plan_slugs, max_uses, expires_at, is_active
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE)
     RETURNING *`,
    [
      cleanCode,
      description || null,
      discount_type,
      numValue,
      applies_to,
      JSON.stringify(Array.isArray(plan_slugs) ? plan_slugs : []),
      max_uses ? parseInt(max_uses, 10) : null,
      expires_at || null
    ]
  );

  return result.rows[0];
};

export const toggleSaaSCoupon = async (id, isActive) => {
  const result = await pool.query(
    `UPDATE public.cap_saas_coupons
     SET is_active = $2
     WHERE id = $1
     RETURNING *`,
    [id, Boolean(isActive)]
  );
  if (result.rows.length === 0) {
    const error = new Error('Cupom não encontrado.');
    error.statusCode = 404;
    throw error;
  }
  return result.rows[0];
};

export const deleteSaaSCoupon = async (id) => {
  const result = await pool.query(
    `DELETE FROM public.cap_saas_coupons
     WHERE id = $1
     RETURNING id, code`,
    [id]
  );
  if (result.rows.length === 0) {
    const error = new Error('Cupom não encontrado.');
    error.statusCode = 404;
    throw error;
  }
  return result.rows[0];
};

/**
 * Valida se um cupom pode ser aplicado ao plano e valor informado
 */
export const validateSaaSCoupon = async ({ code, planSlug, currentAmount }) => {
  const cleanCode = String(code || '').trim().toUpperCase();
  if (!cleanCode) {
    const error = new Error('Informe o código do cupom.');
    error.statusCode = 400;
    throw error;
  }

  const result = await pool.query(
    `SELECT * FROM public.cap_saas_coupons WHERE code = $1 LIMIT 1`,
    [cleanCode]
  );

  if (result.rows.length === 0) {
    const error = new Error(`Cupom "${cleanCode}" não encontrado ou inválido.`);
    error.statusCode = 404;
    throw error;
  }

  const coupon = result.rows[0];

  if (!coupon.is_active) {
    const error = new Error(`O cupom "${cleanCode}" está desativado.`);
    error.statusCode = 400;
    throw error;
  }

  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
    const error = new Error(`O cupom "${cleanCode}" expirou.`);
    error.statusCode = 400;
    throw error;
  }

  if (coupon.max_uses !== null && coupon.current_uses >= coupon.max_uses) {
    const error = new Error(`O cupom "${cleanCode}" atingiu o limite máximo de utilizações.`);
    error.statusCode = 400;
    throw error;
  }

  // Validar elegibilidade de planos
  let eligiblePlans = coupon.plan_slugs;
  if (typeof eligiblePlans === 'string') {
    try { eligiblePlans = JSON.parse(eligiblePlans); } catch { eligiblePlans = []; }
  }
  if (Array.isArray(eligiblePlans) && eligiblePlans.length > 0 && planSlug) {
    const planMatch = eligiblePlans.some(p => String(p).toLowerCase() === String(planSlug).toLowerCase());
    if (!planMatch) {
      const error = new Error(`O cupom "${cleanCode}" não é válido para o plano selecionado (${planSlug}).`);
      error.statusCode = 400;
      throw error;
    }
  }

  const basePrice = Number(currentAmount);
  let discountAmount = 0;

  if (coupon.discount_type === 'percentage') {
    discountAmount = (basePrice * Number(coupon.discount_value)) / 100;
  } else {
    discountAmount = Number(coupon.discount_value);
  }

  if (discountAmount > basePrice) {
    discountAmount = basePrice;
  }

  const finalAmount = Math.max(0, Number((basePrice - discountAmount).toFixed(2)));

  return {
    coupon_id: coupon.id,
    code: coupon.code,
    description: coupon.description,
    discount_type: coupon.discount_type,
    discount_value: Number(coupon.discount_value),
    discount_amount: Number(discountAmount.toFixed(2)),
    original_amount: Number(basePrice.toFixed(2)),
    final_amount: finalAmount
  };
};

/**
 * Aplica um cupom a uma fatura existente e regenera o QR Code PIX
 */
export const applyCouponToInvoice = async ({ invoiceId, couponCode, tenantId }) => {
  // 1. Buscar a fatura
  const invoiceRes = await pool.query(
    `SELECT i.*, t.slug as tenant_slug, p.slug as plan_slug
     FROM public.cap_invoices i
     JOIN public.cap_tenants t ON t.id = i.tenant_id
     LEFT JOIN public.cap_plans p ON p.id = t.plan_id
     WHERE i.id = $1`,
    [invoiceId]
  );

  if (invoiceRes.rows.length === 0) {
    const error = new Error('Fatura não encontrada.');
    error.statusCode = 404;
    throw error;
  }

  const invoice = invoiceRes.rows[0];

  if (tenantId && invoice.tenant_id !== tenantId) {
    const error = new Error('Acesso negado a esta fatura.');
    error.statusCode = 403;
    throw error;
  }

  if (invoice.status === 'paid') {
    const error = new Error('Não é possível aplicar cupom em fatura já quitada.');
    error.statusCode = 400;
    throw error;
  }

  const baseAmount = Number(invoice.original_amount || invoice.amount);

  // 2. Validar o cupom
  const validation = await validateSaaSCoupon({
    code: couponCode,
    planSlug: invoice.plan_slug,
    currentAmount: baseAmount
  });

  // 3. Atualizar a fatura com o desconto
  await pool.query(
    `UPDATE public.cap_invoices
     SET original_amount = COALESCE(original_amount, amount),
         amount = $2,
         discount_amount = $3,
         applied_coupon_code = $4
     WHERE id = $1`,
    [invoiceId, validation.final_amount, validation.discount_amount, validation.code]
  );

  // 4. Incrementar o uso do cupom
  await pool.query(
    `UPDATE public.cap_saas_coupons
     SET current_uses = current_uses + 1
     WHERE id = $1`,
    [validation.coupon_id]
  );

  // 5. Regenerar o QR Code PIX com o novo valor
  const refreshed = await refreshSaaSInvoicePix(invoiceId);

  return {
    success: true,
    message: `Cupom ${validation.code} aplicado com sucesso! Desconto de R$ ${validation.discount_amount.toFixed(2)}.`,
    validation,
    invoice: refreshed?.invoice
  };
};

/**
 * Aplicação manual de desconto pelo Super Admin
 */
export const applyManualDiscountToInvoice = async ({ invoiceId, discountAmount, reason, superAdminId }) => {
  const discount = Number(discountAmount);
  if (isNaN(discount) || discount <= 0) {
    const error = new Error('Valor de desconto inválido.');
    error.statusCode = 400;
    throw error;
  }

  const invoiceRes = await pool.query(
    `SELECT * FROM public.cap_invoices WHERE id = $1`,
    [invoiceId]
  );

  if (invoiceRes.rows.length === 0) {
    const error = new Error('Fatura não encontrada.');
    error.statusCode = 404;
    throw error;
  }

  const invoice = invoiceRes.rows[0];
  if (invoice.status === 'paid') {
    const error = new Error('Esta fatura já está quitada.');
    error.statusCode = 400;
    throw error;
  }

  const baseAmount = Number(invoice.original_amount || invoice.amount);
  const finalAmount = Math.max(0, Number((baseAmount - discount).toFixed(2)));

  await pool.query(
    `UPDATE public.cap_invoices
     SET original_amount = COALESCE(original_amount, amount),
         amount = $2,
         discount_amount = $3,
         applied_coupon_code = $4
     WHERE id = $1`,
    [invoiceId, finalAmount, discount, `MANUAL:${reason || 'Ajuste SuperAdmin'}`]
  );

  await logAudit({
    tenantId: invoice.tenant_id,
    userId: superAdminId,
    userRole: 'superadmin',
    action: 'INVOICE_MANUAL_DISCOUNT',
    details: { invoiceId, baseAmount, discount, finalAmount, reason }
  });

  const refreshed = await refreshSaaSInvoicePix(invoiceId);

  return {
    success: true,
    message: `Desconto manual de R$ ${discount.toFixed(2)} aplicado com sucesso.`,
    invoice: refreshed?.invoice
  };
};
