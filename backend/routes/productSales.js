import express from 'express';
import { z } from 'zod';
import { validate } from '../middlewares/validate.js';
import { authMiddleware, requireRole } from '../middlewares/auth.js';
import { requireFeature } from '../middlewares/featureFlagMiddleware.js';
import { createProductSale, listProductSales } from '../services/productSaleService.js';

const router = express.Router();

const createSaleSchema = z.object({
  body: z.object({
    client_id: z.string().uuid('ID do cliente inválido.').nullable().optional(),
    payment_method: z.enum(['credit_card', 'debit_card', 'cash', 'pix']),
    items: z.array(z.object({
      inventory_id: z.string().uuid('ID do produto inválido.'),
      quantity: z.number().int().positive('A quantidade deve ser de pelo menos 1 unidade.')
    })).min(1, 'O carrinho precisa ter no mínimo 1 item.')
  }),
  params: z.any(), query: z.any()
});

// Registrar Nova Venda (Gerente e Profissionais)
router.post('/', authMiddleware, requireFeature('pdv'), requireRole(['manager', 'professional']), validate(createSaleSchema), async (req, res) => {
  const { client_id, payment_method, items } = req.body;
  const tenantId = req.user.tenant_id;

  try {
    const sale = await createProductSale(tenantId, client_id, payment_method, items);
    return res.status(201).json(sale);
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    req.log.error(error, 'Erro ao registrar venda de produto no PDV');
    return res.status(500).json({ error: 'Erro interno ao salvar venda.' });
  }
});

// Listar Histórico de Vendas (Apenas gerente)
router.get('/', authMiddleware, requireFeature('pdv'), requireRole(['manager']), async (req, res) => {
  const tenantId = req.user.tenant_id;

  try {
    const sales = await listProductSales(tenantId);
    return res.json(sales);
  } catch (error) {
    req.log.error(error, 'Erro ao obter histórico de vendas de produtos');
    return res.status(500).json({ error: 'Erro interno ao carregar histórico.' });
  }
});

export default router;
