import express from 'express';
import { z } from 'zod';
import { validate } from '../middlewares/validate.js';
import { authMiddleware, requireRole } from '../middlewares/auth.js';
import { listPlans, createPlan, updatePlan, reorderPlans } from '../services/planService.js';

const router = express.Router();

const planSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Nome é obrigatório.'),
    price: z.coerce.number().min(0, 'Preço inválido.'),
    yearly_price: z.coerce.number().nullable().optional(),
    sort_order: z.coerce.number().nullable().optional(),
    interval: z.string().optional(),
    max_professionals: z.coerce.number().nullable().optional(),
    max_banners: z.coerce.number().nullable().optional(),
    features: z.array(z.string()).nullable().optional(),
    is_active: z.boolean().optional()
  }),
  query: z.any(), params: z.any()
});

const updatePlanSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Nome é obrigatório.').optional(),
    price: z.coerce.number().min(0, 'Preço inválido.').optional(),
    yearly_price: z.coerce.number().nullable().optional(),
    sort_order: z.coerce.number().nullable().optional(),
    interval: z.string().optional(),
    max_professionals: z.coerce.number().nullable().optional(),
    max_banners: z.coerce.number().nullable().optional(),
    features: z.array(z.string()).nullable().optional(),
    is_active: z.boolean().optional()
  }),
  query: z.any(), params: z.any()
});

router.get('/', async (req, res) => {
  try {
    const includeInactive = req.query.active_only !== 'true';
    const plans = await listPlans(includeInactive);
    return res.json(plans);
  } catch (error) {
    req.log.error(error, 'Erro ao listar planos');
    return res.status(500).json({ error: 'Erro interno ao consultar planos.' });
  }
});

router.post('/', authMiddleware, requireRole(['superadmin']), validate(planSchema), async (req, res) => {
  const { name, price, yearly_price, sort_order, interval, max_professionals, max_banners, features } = req.body;

  try {
    const plan = await createPlan(name, price, yearly_price, sort_order, interval, max_professionals, max_banners, features);
    return res.status(201).json(plan);
  } catch (error) {
    req.log.error(error, 'Erro ao criar plano');
    return res.status(500).json({ error: 'Erro interno ao cadastrar plano.' });
  }
});

router.put('/reorder', authMiddleware, requireRole(['superadmin']), async (req, res) => {
  const { ordered_ids } = req.body;
  if (!Array.isArray(ordered_ids)) {
    return res.status(400).json({ error: 'ordered_ids deve ser uma lista de IDs.' });
  }

  try {
    await reorderPlans(ordered_ids);
    const plans = await listPlans();
    return res.json(plans);
  } catch (error) {
    req.log.error(error, 'Erro ao reordenar planos');
    return res.status(500).json({ error: 'Erro interno ao reordenar planos.' });
  }
});

router.put('/:id', authMiddleware, requireRole(['superadmin']), validate(updatePlanSchema), async (req, res) => {
  const { id } = req.params;
  const { name, price, yearly_price, sort_order, interval, max_professionals, max_banners, features, is_active } = req.body;

  try {
    const plan = await updatePlan(id, name, price, yearly_price, sort_order, interval, max_professionals, max_banners, features, is_active);
    return res.json(plan);
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    req.log.error(error, 'Erro ao atualizar plano');
    return res.status(500).json({ error: 'Erro interno ao salvar plano.' });
  }
});

export default router;
