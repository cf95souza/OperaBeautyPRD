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
  refreshSaaSInvoicePix
} from '../services/saasBillingService.js';

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

