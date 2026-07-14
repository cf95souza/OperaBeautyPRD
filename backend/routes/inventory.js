import express from 'express';
import { z } from 'zod';
import { validate } from '../middlewares/validate.js';
import { authMiddleware, requireRole } from '../middlewares/auth.js';
import { logAudit } from '../services/auditService.js';
import {
  listInventory,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem
} from '../services/inventoryService.js';

const router = express.Router();

const inventoryItemSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Nome do item é obrigatório.'),
    quantity: z.coerce.number().min(0, 'A quantidade não pode ser negativa.'),
    unit: z.string().min(1, 'A unidade de medida é obrigatória.'),
    min_quantity: z.coerce.number().min(0, 'A quantidade mínima não pode ser negativa.'),
    type: z.enum(['professional', 'sale']).optional(),
    price: z.coerce.number().min(0, 'O preço de venda não pode ser negativo.').optional(),
    is_active: z.boolean().optional()
  }),
  query: z.any(), params: z.any()
});

router.get('/', authMiddleware, requireRole(['manager', 'professional']), async (req, res) => {
  const tenantId = req.user.tenant_id;
  const limit = parseInt(req.query.limit) || 1000;
  const offset = parseInt(req.query.offset) || 0;

  try {
    const items = await listInventory(tenantId, limit, offset);
    return res.json(items);
  } catch (error) {
    req.log.error(error, 'Erro ao listar estoque');
    return res.status(500).json({ error: 'Erro interno ao obter dados do estoque.' });
  }
});

router.post('/', authMiddleware, requireRole(['manager']), validate(inventoryItemSchema), async (req, res) => {
  const { name, quantity, unit, min_quantity, type, price } = req.body;
  const tenantId = req.user.tenant_id;

  if (!name || quantity === undefined || !unit || min_quantity === undefined) {
    return res.status(400).json({ error: 'Parâmetros insuficientes para criar item de estoque.' });
  }

  try {
    const newItem = await createInventoryItem(tenantId, name, quantity, unit, min_quantity, type, price);

    await logAudit({
      req,
      action: 'CREATE_INVENTORY',
      entityName: 'cap_inventory',
      entityId: newItem.id,
      newData: newItem
    });

    return res.status(201).json(newItem);
  } catch (error) {
    req.log.error(error, 'Erro ao criar item de estoque');
    return res.status(500).json({ error: 'Erro interno ao cadastrar item no estoque.' });
  }
});

router.put('/:id', authMiddleware, requireRole(['manager']), validate(inventoryItemSchema), async (req, res) => {
  const { id } = req.params;
  const { name, quantity, unit, min_quantity, type, price, is_active } = req.body;
  const tenantId = req.user.tenant_id;

  if (!name || quantity === undefined || !unit || min_quantity === undefined) {
    return res.status(400).json({ error: 'Parâmetros insuficientes para atualizar item.' });
  }

  try {
    const { oldItem, updatedItem } = await updateInventoryItem(id, tenantId, name, quantity, unit, min_quantity, type, price, is_active);

    await logAudit({
      req,
      action: 'UPDATE_INVENTORY',
      entityName: 'cap_inventory',
      entityId: id,
      oldData: oldItem,
      newData: updatedItem
    });

    return res.json(updatedItem);
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    req.log.error(error, 'Erro ao atualizar item de estoque');
    return res.status(500).json({ error: 'Erro interno ao salvar item.' });
  }
});

router.delete('/:id', authMiddleware, requireRole(['manager']), async (req, res) => {
  const { id } = req.params;
  const tenantId = req.user.tenant_id;

  try {
    const deletedItem = await deleteInventoryItem(id, tenantId);

    await logAudit({
      req,
      action: 'DELETE_INVENTORY',
      entityName: 'cap_inventory',
      entityId: id,
      oldData: deletedItem,
      newData: { is_active: false }
    });

    return res.json({ message: 'Item desativado com sucesso.', item: deletedItem });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    req.log.error(error, 'Erro ao desativar item de estoque');
    return res.status(500).json({ error: 'Erro interno ao remover item.' });
  }
});

export default router;
