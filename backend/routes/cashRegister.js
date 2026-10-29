import express from 'express';
import { z } from 'zod';
import { validate } from '../middlewares/validate.js';
import { authMiddleware, requireRole } from '../middlewares/auth.js';
import {
  getCurrentCashRegister,
  openCashRegister,
  addCashMovement,
  closeCashRegister,
  listCashRegisters,
  getCashRegisterDetails
} from '../services/cashRegisterService.js';

const router = express.Router();
const staffOnly = requireRole(['manager', 'superadmin', 'professional']);
const managerOnly = requireRole(['manager', 'superadmin']);

// Schemas Zod de Validação
const openSchema = z.object({
  body: z.object({
    initial_balance: z.coerce.number().min(0, 'Saldo inicial não pode ser negativo.').default(0),
    notes: z.string().max(500).optional().nullable()
  }),
  params: z.any(),
  query: z.any()
});

const movementSchema = z.object({
  body: z.object({
    cash_register_id: z.string().uuid('ID de caixa inválido.'),
    type: z.enum(['supply', 'bleed'], { required_error: "Tipo deve ser 'supply' ou 'bleed'." }),
    amount: z.coerce.number().positive('Valor deve ser maior que zero.'),
    reason: z.string().min(2, 'Justificativa obrigatória (mínimo 2 caracteres).').max(500)
  }),
  params: z.any(),
  query: z.any()
});

const closeSchema = z.object({
  body: z.object({
    cash_register_id: z.string().uuid('ID de caixa inválido.'),
    actual_cash: z.coerce.number().min(0, 'Valor em dinheiro não pode ser negativo.').default(0),
    actual_pix: z.coerce.number().min(0, 'Valor em PIX não pode ser negativo.').default(0),
    actual_credit: z.coerce.number().min(0, 'Valor em cartão de crédito não pode ser negativo.').default(0),
    actual_debit: z.coerce.number().min(0, 'Valor em cartão de débito não pode ser negativo.').default(0),
    notes: z.string().max(500).optional().nullable()
  }),
  params: z.any(),
  query: z.any()
});

const detailsSchema = z.object({
  params: z.object({
    id: z.string().uuid('ID de caixa inválido.')
  }),
  body: z.any(),
  query: z.any()
});

const historySchema = z.object({
  query: z.object({
    limit: z.coerce.number().int().min(1).max(100).default(20).optional(),
    offset: z.coerce.number().int().min(0).default(0).optional()
  }),
  body: z.any(),
  params: z.any()
});

// 1. Obter Caixa Aberto Atual
router.get('/current', authMiddleware, staffOnly, async (req, res) => {
  const tenant_id = req.user.tenant_id;
  try {
    const register = await getCurrentCashRegister(tenant_id);
    return res.json(register || { isOpen: false });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    req.log?.error(error, 'Erro ao buscar caixa atual');
    return res.status(500).json({ error: 'Erro ao buscar status do caixa.' });
  }
});

// 2. Abertura de Caixa Diário
router.post('/open', authMiddleware, staffOnly, validate(openSchema), async (req, res) => {
  const tenant_id = req.user.tenant_id;
  const staff_id = req.user.id;
  const { initial_balance, notes } = req.body;

  try {
    const opened = await openCashRegister(tenant_id, staff_id, { initial_balance, notes });
    return res.status(201).json(opened);
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    req.log?.error(error, 'Erro ao abrir caixa');
    return res.status(500).json({ error: 'Erro ao abrir sessão de caixa.' });
  }
});

// 3. Registrar Movimentação Avulsa (Sangria / Suprimento)
router.post('/movements', authMiddleware, staffOnly, validate(movementSchema), async (req, res) => {
  const tenant_id = req.user.tenant_id;
  const staff_id = req.user.id;
  const { cash_register_id, type, amount, reason } = req.body;

  try {
    const movement = await addCashMovement(tenant_id, cash_register_id, staff_id, { type, amount, reason });
    return res.status(201).json(movement);
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    req.log?.error(error, 'Erro ao registrar movimentação de caixa');
    return res.status(500).json({ error: 'Erro ao registrar movimentação.' });
  }
});

// 4. Fechamento de Caixa Diário
router.post('/close', authMiddleware, staffOnly, validate(closeSchema), async (req, res) => {
  const tenant_id = req.user.tenant_id;
  const staff_id = req.user.id;
  const { cash_register_id, actual_cash, actual_pix, actual_credit, actual_debit, notes } = req.body;

  try {
    const closed = await closeCashRegister(
      tenant_id,
      cash_register_id,
      staff_id,
      { actual_cash, actual_pix, actual_credit, actual_debit },
      notes
    );
    return res.json(closed);
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    req.log?.error(error, 'Erro ao fechar caixa');
    return res.status(500).json({ error: 'Erro ao fechar sessão de caixa.' });
  }
});

// 5. Histórico de Sessões de Caixa
router.get('/history', authMiddleware, managerOnly, validate(historySchema), async (req, res) => {
  const tenant_id = req.user.tenant_id;
  const { limit, offset } = req.query;

  try {
    const list = await listCashRegisters(tenant_id, { limit, offset });
    return res.json(list);
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    req.log?.error(error, 'Erro ao listar histórico de caixa');
    return res.status(500).json({ error: 'Erro ao buscar histórico de caixa.' });
  }
});

// 6. Detalhes de uma Sessão de Caixa Específica
router.get('/:id', authMiddleware, managerOnly, validate(detailsSchema), async (req, res) => {
  const tenant_id = req.user.tenant_id;
  const { id } = req.params;

  try {
    const details = await getCashRegisterDetails(tenant_id, id);
    return res.json(details);
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    req.log?.error(error, 'Erro ao buscar detalhes de caixa');
    return res.status(500).json({ error: 'Erro ao buscar detalhes da sessão de caixa.' });
  }
});

export default router;
