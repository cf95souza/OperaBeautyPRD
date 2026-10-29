import express from 'express';
import { z } from 'zod';
import { validate } from '../middlewares/validate.js';
import { authMiddleware, requireRole } from '../middlewares/auth.js';
import {
  createOrder,
  addItemToOrder,
  removeItemFromOrder,
  checkoutOrder,
  getOrderById,
  listOrders,
  cancelOrder
} from '../services/orderService.js';

const router = express.Router();
const staffOnly = requireRole(['manager', 'superadmin', 'professional']);

// Schemas Zod de Validação
const createOrderSchema = z.object({
  body: z.object({
    client_id: z.string().uuid().optional().nullable(),
    appointment_id: z.string().uuid().optional().nullable(),
    tip_amount: z.coerce.number().min(0).default(0).optional(),
    tip_staff_id: z.string().uuid().optional().nullable(),
    coupon_code: z.string().max(50).optional().nullable(),
    notes: z.string().max(1000).optional().nullable(),
    items: z.array(z.object({
      item_type: z.enum(['service', 'product']),
      service_id: z.string().uuid().optional().nullable(),
      inventory_id: z.string().uuid().optional().nullable(),
      staff_id: z.string().uuid().optional().nullable(),
      name: z.string().min(1, 'Nome do item obrigatório.'),
      quantity: z.coerce.number().int().min(1, 'Quantidade mínima é 1.'),
      unit_price: z.coerce.number().min(0, 'Preço unitário não pode ser negativo.'),
      variation_name: z.string().optional().nullable(),
      selected_extras: z.array(z.any()).optional().nullable()
    })).default([]).optional()
  }),
  params: z.any(),
  query: z.any()
});

const addItemSchema = z.object({
  params: z.object({
    id: z.string().uuid('ID de comanda inválido.')
  }),
  body: z.object({
    item_type: z.enum(['service', 'product']),
    service_id: z.string().uuid().optional().nullable(),
    inventory_id: z.string().uuid().optional().nullable(),
    staff_id: z.string().uuid().optional().nullable(),
    name: z.string().min(1, 'Nome do item obrigatório.').optional(),
    quantity: z.coerce.number().int().min(1, 'Quantidade mínima é 1.').default(1),
    unit_price: z.coerce.number().min(0).optional(),
    variation_name: z.string().optional().nullable(),
    selected_extras: z.array(z.any()).optional().nullable()
  }),
  query: z.any()
});

const removeItemSchema = z.object({
  params: z.object({
    id: z.string().uuid('ID de comanda inválido.'),
    itemId: z.string().uuid('ID de item inválido.')
  }),
  body: z.any(),
  query: z.any()
});

const checkoutSchema = z.object({
  params: z.object({
    id: z.string().uuid('ID de comanda inválido.')
  }),
  body: z.object({
    payments: z.array(z.object({
      payment_method: z.enum(['cash', 'pix', 'credit_card', 'debit_card', 'wallet', 'giftcard']),
      amount: z.coerce.number().positive('Valor de cada pagamento deve ser maior que zero.'),
      installments: z.coerce.number().int().min(1).default(1).optional(),
      giftcard_code: z.string().optional().nullable(),
      details: z.record(z.any()).optional().nullable()
    })).min(1, 'Pelo menos uma forma de pagamento deve ser informada.'),
    tip_amount: z.coerce.number().min(0).optional(),
    tip_staff_id: z.string().uuid().optional().nullable(),
    discount_amount: z.coerce.number().min(0).optional(),
    notes: z.string().max(1000).optional().nullable()
  }),
  query: z.any()
});

const listOrdersSchema = z.object({
  query: z.object({
    status: z.enum(['open', 'paid', 'cancelled']).optional(),
    clientId: z.string().uuid().optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de data YYYY-MM-DD').optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20).optional(),
    offset: z.coerce.number().int().min(0).default(0).optional()
  }),
  body: z.any(),
  params: z.any()
});

const cancelSchema = z.object({
  params: z.object({
    id: z.string().uuid('ID de comanda inválido.')
  }),
  body: z.object({
    reason: z.string().max(500).optional().nullable()
  }),
  query: z.any()
});

// 1. Criar Comanda
router.post('/', authMiddleware, staffOnly, validate(createOrderSchema), async (req, res) => {
  const tenant_id = req.user.tenant_id;
  const staff_id = req.user.id;

  try {
    const order = await createOrder(tenant_id, staff_id, req.body);
    return res.status(201).json(order);
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    req.log?.error(error, 'Erro ao criar comanda');
    return res.status(500).json({ error: 'Erro ao criar comanda.' });
  }
});

// 2. Adicionar Item à Comanda
router.post('/:id/items', authMiddleware, staffOnly, validate(addItemSchema), async (req, res) => {
  const tenant_id = req.user.tenant_id;
  const { id } = req.params;

  try {
    const item = await addItemToOrder(tenant_id, id, req.body);
    return res.status(201).json(item);
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    req.log?.error(error, 'Erro ao adicionar item à comanda');
    return res.status(500).json({ error: 'Erro ao adicionar item.' });
  }
});

// 3. Remover Item da Comanda
router.delete('/:id/items/:itemId', authMiddleware, staffOnly, validate(removeItemSchema), async (req, res) => {
  const tenant_id = req.user.tenant_id;
  const { id, itemId } = req.params;

  try {
    await removeItemFromOrder(tenant_id, id, itemId);
    return res.json({ success: true, message: 'Item removido da comanda com sucesso.' });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    req.log?.error(error, 'Erro ao remover item da comanda');
    return res.status(500).json({ error: 'Erro ao remover item.' });
  }
});

// 4. Checkout e Quitação da Comanda (Split Payment)
router.post('/:id/checkout', authMiddleware, staffOnly, validate(checkoutSchema), async (req, res) => {
  const tenant_id = req.user.tenant_id;
  const staff_id = req.user.id;
  const { id } = req.params;

  try {
    const receipt = await checkoutOrder(tenant_id, id, staff_id, req.body);
    return res.json(receipt);
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    req.log?.error(error, 'Erro no checkout da comanda');
    return res.status(500).json({ error: 'Erro ao processar fechamento da comanda.' });
  }
});

// 5. Listar Comandas
router.get('/', authMiddleware, staffOnly, validate(listOrdersSchema), async (req, res) => {
  const tenant_id = req.user.tenant_id;
  const { status, clientId, date, limit, offset } = req.query;

  try {
    const orders = await listOrders(tenant_id, { status, clientId, date, limit, offset });
    return res.json(orders);
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    req.log?.error(error, 'Erro ao listar comandas');
    return res.status(500).json({ error: 'Erro ao buscar comandas.' });
  }
});

// 6. Detalhes de uma Comanda
router.get('/:id', authMiddleware, staffOnly, async (req, res) => {
  const tenant_id = req.user.tenant_id;
  const { id } = req.params;

  try {
    const order = await getOrderById(tenant_id, id);
    return res.json(order);
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    req.log?.error(error, 'Erro ao obter comanda');
    return res.status(500).json({ error: 'Erro ao buscar comanda.' });
  }
});

// 7. Cancelar Comanda Aberta
router.post('/:id/cancel', authMiddleware, staffOnly, validate(cancelSchema), async (req, res) => {
  const tenant_id = req.user.tenant_id;
  const staff_id = req.user.id;
  const { id } = req.params;
  const { reason } = req.body;

  try {
    const cancelled = await cancelOrder(tenant_id, id, staff_id, reason);
    return res.json(cancelled);
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    req.log?.error(error, 'Erro ao cancelar comanda');
    return res.status(500).json({ error: 'Erro ao cancelar comanda.' });
  }
});

export default router;
