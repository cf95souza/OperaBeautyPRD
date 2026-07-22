import express from 'express';
import { z } from 'zod';
import { validate } from '../middlewares/validate.js';
import { authMiddleware, requireRole } from '../middlewares/auth.js';
import { requireFeature } from '../middlewares/featureFlagMiddleware.js';
import {
  createSalonMembership,
  listSalonMemberships,
  updateSalonMembership,
  subscribeClientToMembership,
  listClientSubscriptions,
  listAllSubscriptionsForTenant
} from '../services/membershipService.js';

const router = express.Router();

// 1. Schemas de validação Zod
const createPlanSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Nome é obrigatório.'),
    description: z.string().optional(),
    price: z.number().positive('O preço deve ser maior que zero.'),
    billing_cycle: z.enum(['monthly', 'yearly']),
    service_id: z.string().uuid('ID do serviço inválido.'),
    usage_limit: z.number().int().nonnegative('Limite inválido.')
  }),
  params: z.any(), query: z.any()
});

const updatePlanSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Nome inválido.').optional(),
    description: z.string().optional(),
    price: z.number().positive('O preço deve ser maior que zero.').optional(),
    billing_cycle: z.enum(['monthly', 'yearly']).optional(),
    service_id: z.string().uuid('ID do serviço inválido.').optional(),
    usage_limit: z.number().int().nonnegative('Limite inválido.').optional(),
    is_active: z.boolean().optional()
  }),
  params: z.object({
    id: z.string().uuid('ID do plano inválido.')
  }), query: z.any()
});

const subscribeSchema = z.object({
  body: z.object({
    membership_id: z.string().uuid('ID do plano inválido.')
  }),
  params: z.any(), query: z.any()
});

// 2. Rotas

// Criar Plano (Apenas gerente)
router.post('/plans', authMiddleware, requireFeature('clube'), requireRole(['manager']), validate(createPlanSchema), async (req, res) => {
  const { name, description, price, billing_cycle, service_id, usage_limit } = req.body;
  const tenantId = req.user.tenant_id;

  try {
    const plan = await createSalonMembership(tenantId, name, description, price, billing_cycle, service_id, usage_limit);
    return res.status(201).json(plan);
  } catch (error) {
    req.log.error(error, 'Erro ao criar plano de assinatura');
    return res.status(500).json({ error: 'Erro interno ao salvar plano.' });
  }
});

// Listar Planos (Público - para adesão e exibição)
router.get('/plans', async (req, res) => {
  const { tenant_id } = req.query;

  if (!tenant_id) {
    return res.status(400).json({ error: 'tenant_id é obrigatório.' });
  }

  try {
    const plans = await listSalonMemberships(tenant_id);
    return res.json(plans);
  } catch (error) {
    console.error('Erro ao listar planos de assinatura:', error);
    return res.status(500).json({ error: 'Erro interno ao listar planos.' });
  }
});

// Atualizar Plano (Apenas gerente)
router.put('/plans/:id', authMiddleware, requireFeature('clube'), requireRole(['manager']), validate(updatePlanSchema), async (req, res) => {
  const { id } = req.params;
  const { name, description, price, billing_cycle, service_id, usage_limit, is_active } = req.body;
  const tenantId = req.user.tenant_id;

  try {
    const updated = await updateSalonMembership(id, tenantId, name, description, price, billing_cycle, service_id, usage_limit, is_active);
    return res.json(updated);
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    req.log.error(error, 'Erro ao atualizar plano');
    return res.status(500).json({ error: 'Erro interno ao atualizar plano.' });
  }
});

// Cliente subscreve a um plano (Simulado)
router.post('/subscribe', authMiddleware, requireFeature('clube'), requireRole(['client']), validate(subscribeSchema), async (req, res) => {
  const { membership_id } = req.body;
  const clientId = req.user.id;
  const tenantId = req.user.tenant_id;

  try {
    const subscription = await subscribeClientToMembership(tenantId, clientId, membership_id);
    return res.status(201).json(subscription);
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    req.log.error(error, 'Erro ao assinar plano');
    return res.status(500).json({ error: 'Erro interno ao processar assinatura.' });
  }
});

// Listar assinaturas do cliente logado
router.get('/my', authMiddleware, requireFeature('clube'), requireRole(['client']), async (req, res) => {
  const clientId = req.user.id;
  const tenantId = req.user.tenant_id;

  try {
    const subscriptions = await listClientSubscriptions(clientId, tenantId);
    return res.json(subscriptions);
  } catch (error) {
    req.log.error(error, 'Erro ao obter assinaturas do cliente');
    return res.status(500).json({ error: 'Erro interno ao consultar assinaturas.' });
  }
});

// Listar todas as assinaturas do salão (Apenas gerente/profissionais)
router.get('/subscriptions', authMiddleware, requireFeature('clube'), requireRole(['manager', 'professional']), async (req, res) => {
  const tenantId = req.user.tenant_id;

  try {
    const subscriptions = await listAllSubscriptionsForTenant(tenantId);
    return res.json(subscriptions);
  } catch (error) {
    req.log.error(error, 'Erro ao listar assinaturas do salão');
    return res.status(500).json({ error: 'Erro interno ao listar assinaturas.' });
  }
});

export default router;
