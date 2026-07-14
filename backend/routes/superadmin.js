import express from 'express';
import { authMiddleware, requireRole } from '../middlewares/auth.js';
import { z } from 'zod';
import { validate } from '../middlewares/validate.js';
import {
  getDashboardMetrics,
  listTenantsWithStats,
  getTenantById,
  createTenant,
  updateTenant,
  deleteTenant,
  resetStaffPassword,
  createInitialStaff,
  getPlatformSettings,
  savePlatformSettings
} from '../services/superadminService.js';

const router = express.Router();

router.use(authMiddleware, requireRole(['superadmin']));

const dashboardMetricsSchema = z.object({
  query: z.any(), body: z.any(), params: z.any()
});

const listTenantsSchema = z.object({
  query: z.any(), body: z.any(), params: z.any()
});

const getTenantSchema = z.object({
  params: z.object({
    id: z.string().uuid('ID do inquilino inválido.')
  }),
  query: z.any(), body: z.any()
});

const createTenantSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Nome do salão é obrigatório.'),
    slug: z.string().min(1, 'Link único (slug) é obrigatório.'),
    plan_price: z.number().positive('Preço do plano deve ser maior que zero.').optional(),
    plan_id: z.string().uuid('ID do plano inválido.').nullable().optional(),
    welcome_message: z.string().optional(),
    primary_color: z.string().optional(),
    secondary_color: z.string().optional()
  }),
  query: z.any(), params: z.any()
});

const updateTenantSchema = z.object({
  params: z.object({
    id: z.string().uuid('ID do inquilino inválido.')
  }),
  body: z.object({
    name: z.string().optional(),
    slug: z.string().optional(),
    status: z.enum(['active', 'inactive']).optional(),
    plan_price: z.number().positive().nullable().optional(),
    plan_id: z.string().uuid().nullable().optional(),
    primary_color: z.string().optional(),
    secondary_color: z.string().optional()
  }),
  query: z.any()
});

const deleteTenantSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, 'ID do inquilino inválido.')
  }),
  query: z.any().optional(), body: z.any().optional()
});

const resetStaffPasswordSchema = z.object({
  params: z.object({
    id: z.string().uuid('ID do funcionário inválido.')
  }),
  body: z.object({
    password: z.string().min(8, 'Senha deve ter no mínimo 8 caracteres.').regex(/[A-Z]/, 'Precisa ter 1 maiúscula.').regex(/[a-z]/, 'Precisa ter 1 minúscula.').regex(/[\W_]/, 'Precisa ter 1 caractere especial.')
  }),
  query: z.any()
});

const createInitialStaffSchema = z.object({
  body: z.object({
    tenant_id: z.string().uuid('ID do inquilino inválido.'),
    name: z.string().min(1, 'Nome é obrigatório.'),
    phone: z.string().min(1, 'Telefone é obrigatório.'),
    email: z.string().email('E-mail inválido.'),
    password: z.string().min(8, 'Senha deve ter no mínimo 8 caracteres.').regex(/[A-Z]/, 'Precisa ter 1 maiúscula.').regex(/[a-z]/, 'Precisa ter 1 minúscula.').regex(/[\W_]/, 'Precisa ter 1 caractere especial.'),
    role: z.enum(['professional', 'manager', 'admin'], { errorMap: () => ({ message: 'Cargo inválido. Deve ser professional, manager ou admin.' }) })
  }),
  query: z.any(), params: z.any()
});

const platformSettingsSchema = z.object({
  query: z.any(), body: z.any(), params: z.any()
});

const savePlatformSettingsSchema = z.object({
  body: z.object({
    payment_gateway: z.enum(['mercadopago', 'stripe', 'abacatepay'], { errorMap: () => ({ message: 'Gateway de pagamento inválido.' }) }),
    gateway_api_key: z.string().min(1, 'A chave de API é obrigatória.'),
    gateway_public_key: z.string().optional().nullable()
  }),
  query: z.any(), params: z.any()
});

router.get('/dashboard-metrics', validate(dashboardMetricsSchema), async (req, res) => {
  try {
    const metrics = await getDashboardMetrics();
    return res.json(metrics);
  } catch (error) {
    req.log.error(error, 'Erro ao obter métricas do dashboard do Super Admin');
    return res.status(500).json({ error: 'Erro interno ao consultar métricas globais.' });
  }
});

router.get('/tenants', validate(listTenantsSchema), async (req, res) => {
  try {
    const tenants = await listTenantsWithStats();
    return res.json(tenants);
  } catch (error) {
    req.log.error(error, 'Erro ao listar tenants para o Super Admin');
    return res.status(500).json({ error: 'Erro interno ao listar salões.' });
  }
});

router.get('/tenants/:id', validate(getTenantSchema), async (req, res) => {
  const { id } = req.params;
  try {
    const tenant = await getTenantById(id);
    return res.json(tenant);
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    req.log.error(error, 'Erro ao obter salão por ID');
    return res.status(500).json({ error: 'Erro interno ao consultar salão.' });
  }
});

router.post('/tenants', validate(createTenantSchema), async (req, res) => {
  const { name, slug, plan_price, plan_id, welcome_message, primary_color, secondary_color } = req.body;

  try {
    const newTenant = await createTenant(name, slug, plan_price, plan_id, welcome_message, primary_color, secondary_color);
    return res.status(201).json(newTenant);
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    req.log.error(error, 'Erro ao cadastrar novo tenant');
    return res.status(500).json({ error: 'Erro interno ao realizar onboarding do salão.' });
  }
});

router.put('/tenants/:id', validate(updateTenantSchema), async (req, res) => {
  const { id } = req.params;
  const { name, slug, status, plan_price, plan_id, primary_color, secondary_color } = req.body;

  try {
    const updatedTenant = await updateTenant(id, name, slug, status, plan_price, plan_id, primary_color, secondary_color);
    return res.json(updatedTenant);
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    req.log.error(error, 'Erro ao atualizar tenant pelo superadmin');
    return res.status(500).json({ error: 'Erro interno ao atualizar salão.' });
  }
});

router.delete('/tenants/:id', validate(deleteTenantSchema), async (req, res) => {
  const { id } = req.params;
  try {
    const deleted = await deleteTenant(id);
    return res.json({ message: 'Salão excluído com sucesso.', tenant: deleted });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    req.log.error(error, 'Erro ao excluir tenant pelo superadmin');
    return res.status(500).json({ error: 'Erro interno ao excluir salão.' });
  }
});

router.put('/staff/:id/password', validate(resetStaffPasswordSchema), async (req, res) => {
  const { id } = req.params;
  const { password } = req.body;

  try {
    const staff = await resetStaffPassword(id, password);
    return res.json({ message: 'Senha redefinida com sucesso.', staff });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    req.log.error(error, 'Erro ao redefinir senha de funcionário pelo Super Admin');
    return res.status(500).json({ error: 'Erro interno ao redefinir senha.' });
  }
});

router.post('/staff', validate(createInitialStaffSchema), async (req, res) => {
  const { tenant_id, name, phone, email, password, role } = req.body;

  try {
    const staff = await createInitialStaff(tenant_id, name, phone, email, password, role);
    return res.status(201).json(staff);
  } catch (error) {
    req.log.error(error, 'Erro ao criar funcionário pelo Super Admin');
    return res.status(500).json({ error: 'Erro interno ao cadastrar funcionário.' });
  }
});

router.get('/settings', validate(platformSettingsSchema), async (req, res) => {
  try {
    const settings = await getPlatformSettings();
    return res.json(settings);
  } catch (error) {
    req.log.error(error, 'Erro ao obter configurações globais da plataforma');
    return res.status(500).json({ error: 'Erro interno ao obter configurações.' });
  }
});

router.post('/settings', validate(savePlatformSettingsSchema), async (req, res) => {
  const { payment_gateway, gateway_api_key, gateway_public_key } = req.body;
  try {
    const settings = await savePlatformSettings(payment_gateway, gateway_api_key, gateway_public_key);
    return res.json(settings);
  } catch (error) {
    req.log.error(error, 'Erro ao salvar configurações globais da plataforma');
    return res.status(500).json({ error: 'Erro interno ao salvar configurações.' });
  }
});

export default router;
