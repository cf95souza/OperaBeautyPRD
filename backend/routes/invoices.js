import express from 'express';
import pool from '../config/db.js';
import { authMiddleware, requireRole } from '../middlewares/auth.js';
import { z } from 'zod';
import { validate } from '../middlewares/validate.js';
import { listInvoices, createInvoice, payInvoice } from '../services/invoiceService.js';
import {
  getTenantBillingStatus,
  simulateSaaSInvoicePayment,
  processBillingWebhook,
  checkOverdueInvoicesAndEnforceGracePeriod,
  refreshSaaSInvoicePix,
  verifySaaSInvoicePayment
} from '../services/saasBillingService.js';
import {
  validateSaaSCoupon,
  applyCouponToInvoice,
  applyManualDiscountToInvoice
} from '../services/saasCouponService.js';
import { decrypt } from '../utils/crypto.js';

const router = express.Router();

const createInvoiceSchema = z.object({
  body: z.object({
    tenant_id: z.string().uuid('ID do inquilino inválido.'),
    amount: z.coerce.number().positive('Valor deve ser positivo.'),
    due_date: z.string().min(1, 'Data de vencimento é obrigatória.'),
    reference_month: z.string().min(1, 'Mês de referência é obrigatório.')
  }),
  query: z.any(), params: z.any()
});

const payInvoiceSchema = z.object({
  body: z.object({
    payment_method: z.string().optional()
  }),
  query: z.any(), params: z.any()
});

// Situação financeira completa do SaaS do Salão (Carência, Bloqueio, Faturas Abertas e PIX)
router.get('/status', authMiddleware, async (req, res) => {
  const { role } = req.user;
  const userTenantId = req.user.tenant_id;
  const targetTenantId = (role === 'superadmin' && req.query.tenant_id) ? req.query.tenant_id : userTenantId;

  if (!targetTenantId) {
    return res.status(400).json({ error: 'Tenant ID não informado.' });
  }

  try {
    const billingStatus = await getTenantBillingStatus(targetTenantId);
    return res.json(billingStatus);
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    req.log.error(error, 'Erro ao consultar status de faturamento do SaaS');
    return res.status(500).json({ error: 'Erro interno ao consultar faturamento do SaaS.' });
  }
});

// Simular pagamento de fatura SaaS (Ambiente Sandbox / Demonstração - EXCLUSIVO SUPERADMIN)
router.post('/:id/simulate-pay', authMiddleware, requireRole(['superadmin']), async (req, res) => {
  const { id } = req.params;

  try {
    const result = await simulateSaaSInvoicePayment(id);
    return res.json(result);
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    req.log.error(error, 'Erro ao simular pagamento de fatura SaaS');
    return res.status(500).json({ error: error.message || 'Erro ao simular pagamento.' });
  }
});

// Renovar QR Code PIX de Fatura SaaS (Gera nova cobrança no Mercado Pago ou com chave institucional)
router.post('/:id/refresh-pix', authMiddleware, requireRole(['superadmin', 'manager']), async (req, res) => {
  const { id } = req.params;

  try {
    const result = await refreshSaaSInvoicePix(id);
    return res.json(result);
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    req.log.error(error, 'Erro ao renovar QR Code PIX da fatura');
    return res.status(500).json({ error: error.message || 'Erro ao renovar PIX da fatura.' });
  }
});

// Manipulador comum de Webhook de Faturas SaaS
const handleBillingWebhook = async (req, res) => {
  try {
    let gateway = req.params?.gateway;
    const payload = req.body;

    if (!gateway) {
      const platformRes = await pool.query('SELECT payment_gateway FROM public.cap_platform_settings LIMIT 1');
      gateway = platformRes.rows[0]?.payment_gateway || 'mercadopago';
    }

    const result = await processBillingWebhook(gateway, payload);
    return res.json(result);
  } catch (error) {
    req.log.error(error, 'Erro ao processar webhook de fatura SaaS');
    return res.status(400).json({ error: error.message || 'Falha ao processar webhook.' });
  }
};

// Webhook para baixa automática do SaaS por gateways de pagamento (Mercado Pago, Asaas, etc.)
router.post('/webhook', express.json(), handleBillingWebhook);
router.post('/webhook/:gateway', express.json(), handleBillingWebhook);

// Rotina periódica / manual para checar faturas vencidas, aplicar carência e bloqueio gradual
router.post('/check-overdue', authMiddleware, requireRole(['superadmin', 'manager']), async (req, res) => {
  try {
    const result = await checkOverdueInvoicesAndEnforceGracePeriod();
    return res.json(result);
  } catch (error) {
    req.log.error(error, 'Erro ao processar checagem de inadimplência SaaS');
    return res.status(500).json({ error: 'Erro ao verificar faturas em atraso.' });
  }
});

// Verificar Pagamento Manualmente no Gateway em Tempo Real (Mercado Pago PIX)
router.post('/:id/verify-payment', authMiddleware, requireRole(['superadmin', 'manager']), async (req, res) => {
  const { id } = req.params;

  try {
    const result = await verifySaaSInvoicePayment(id);
    return res.json(result);
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    req.log.error(error, 'Erro ao verificar pagamento da fatura no gateway');
    return res.status(500).json({ error: error.message || 'Erro ao verificar pagamento.' });
  }
});

// Validar Cupom de Desconto SaaS
router.post('/validate-coupon', authMiddleware, async (req, res) => {
  const { code, plan_slug, current_amount } = req.body;

  try {
    const result = await validateSaaSCoupon({
      code,
      planSlug: plan_slug,
      currentAmount: current_amount
    });
    return res.json(result);
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    req.log.error(error, 'Erro ao validar cupom SaaS');
    return res.status(400).json({ error: error.message || 'Cupom inválido.' });
  }
});

// Aplicar Cupom de Desconto na Fatura SaaS Aberta
router.post('/:id/apply-coupon', authMiddleware, requireRole(['superadmin', 'manager']), async (req, res) => {
  const { id } = req.params;
  const { code } = req.body;
  const userTenantId = req.user.role === 'superadmin' ? null : req.user.tenant_id;

  try {
    const result = await applyCouponToInvoice({
      invoiceId: id,
      couponCode: code,
      tenantId: userTenantId
    });
    return res.json(result);
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    req.log.error(error, 'Erro ao aplicar cupom na fatura');
    return res.status(400).json({ error: error.message || 'Erro ao aplicar cupom.' });
  }
});

// Aplicar Desconto Manual em Fatura (Exclusivo Super Admin)
router.post('/:id/manual-discount', authMiddleware, requireRole(['superadmin']), async (req, res) => {
  const { id } = req.params;
  const { discount_amount, reason } = req.body;

  try {
    const result = await applyManualDiscountToInvoice({
      invoiceId: id,
      discountAmount: discount_amount,
      reason,
      superAdminId: req.user.id
    });
    return res.json(result);
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    req.log.error(error, 'Erro ao aplicar desconto manual na fatura');
    return res.status(400).json({ error: error.message || 'Erro ao aplicar desconto.' });
  }
});

// Testar credenciais e conectividade com o Gateway (Exclusivo Super Admin)
router.post('/test-gateway', authMiddleware, requireRole(['superadmin']), async (req, res) => {
  try {
    const platformRes = await pool.query(
      'SELECT payment_gateway, gateway_api_key, pix_key, pix_key_type, environment FROM public.cap_platform_settings LIMIT 1'
    );
    const settings = platformRes.rows[0];

    if (!settings || settings.payment_gateway !== 'mercadopago' || !settings.gateway_api_key) {
      return res.status(400).json({ 
        success: false, 
        error: 'Gateway Mercado Pago não configurado. Adicione o Access Token nas configurações da plataforma.' 
      });
    }

    let token = null;
    try {
      token = decrypt(settings.gateway_api_key);
    } catch {
      token = settings.gateway_api_key;
    }
    if (!token) token = settings.gateway_api_key;
    token = token.trim();

    // Consultar dados da conta do Mercado Pago para testar o token
    const testRes = await fetch('https://api.mercadopago.com/users/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!testRes.ok) {
      const errData = await testRes.json().catch(() => ({}));
      return res.status(400).json({ 
        success: false, 
        error: `Access Token rejeitado pelo Mercado Pago (${testRes.status}): ${errData.message || 'Token inválido ou revogado.'}` 
      });
    }

    const userData = await testRes.json();

    return res.json({
      success: true,
      message: 'Conexão com Mercado Pago validada com sucesso!',
      account: {
        id: userData.id,
        nickname: userData.nickname,
        email: userData.email,
        site_id: userData.site_id,
        environment: settings.environment || 'production'
      }
    });
  } catch (error) {
    req.log.error(error, 'Erro ao testar conexão com Mercado Pago');
    return res.status(500).json({ success: false, error: error.message || 'Erro de conexão.' });
  }
});

// Listar Faturas
router.get('/', authMiddleware, async (req, res) => {
  const { role } = req.user;
  const userTenantId = req.user.tenant_id;
  const queryTenantId = req.query.tenant_id;

  try {
    const invoices = await listInvoices(role, userTenantId, queryTenantId);
    return res.json(invoices);
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    req.log.error(error, 'Erro ao listar faturas');
    return res.status(500).json({ error: 'Erro interno ao consultar faturas.' });
  }
});

// Gerar Fatura Manual
router.post('/', authMiddleware, requireRole(['superadmin']), validate(createInvoiceSchema), async (req, res) => {
  const { tenant_id, amount, due_date, reference_month } = req.body;

  try {
    const invoice = await createInvoice(tenant_id, amount, due_date, reference_month);
    return res.status(201).json(invoice);
  } catch (error) {
    req.log.error(error, 'Erro ao gerar fatura manual');
    return res.status(500).json({ error: 'Erro interno ao gerar fatura.' });
  }
});

// Registrar Pagamento / Baixa de Fatura (Manual pelo Super Admin)
router.put('/:id/pay', authMiddleware, requireRole(['superadmin', 'manager']), validate(payInvoiceSchema), async (req, res) => {
  const { id } = req.params;
  const { payment_method } = req.body;

  try {
    const updatedInvoice = await payInvoice(id, payment_method);
    return res.json(updatedInvoice);
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    req.log.error(error, 'Erro ao registrar pagamento de fatura');
    return res.status(500).json({ error: 'Erro interno ao atualizar pagamento.' });
  }
});

export default router;

