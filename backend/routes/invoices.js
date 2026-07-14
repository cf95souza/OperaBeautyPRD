import express from 'express';
import { authMiddleware, requireRole } from '../middlewares/auth.js';
import { z } from 'zod';
import { validate } from '../middlewares/validate.js';
import { listInvoices, createInvoice, payInvoice } from '../services/invoiceService.js';

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

// Registrar Pagamento / Baixa de Fatura
router.put('/:id/pay', authMiddleware, requireRole(['superadmin']), validate(payInvoiceSchema), async (req, res) => {
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
