import express from 'express';
import { authMiddleware, requireRole } from '../middlewares/auth.js';
import { z } from 'zod';
import { validate } from '../middlewares/validate.js';
import {
  listFeatureFlags,
  createFeatureFlag,
  updateFeatureFlag,
  deleteFeatureFlag,
  listTenantFeatureFlags,
  toggleTenantFeatureFlag
} from '../services/featureFlagService.js';
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
import * as auditService from '../services/auditService.js';
import * as storageService from '../services/storageService.js';

const router = express.Router();

router.use(authMiddleware, requireRole(['superadmin']));

// ==========================================
// AUDITORIA E SAÚDE (Logs e Storage)
// ==========================================

router.get('/audit-logs', async (req, res) => {
  try {
    const logs = await auditService.getSuperAdminLogs();
    res.json(logs);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: 'Erro ao buscar logs de auditoria' });
  }
});

router.get('/storage-usage', async (req, res) => {
  try {
    const usage = await storageService.getTenantStorageUsage();
    res.json(usage);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: 'Erro ao buscar uso de armazenamento' });
  }
});

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
    id: z.string().uuid('ID inválido.')
  }),
  body: z.object({
    password: z.string().min(8, 'Senha deve ter no mínimo 8 caracteres.')
      .regex(/[A-Z]/, 'Precisa ter 1 maiúscula.')
      .regex(/[a-z]/, 'Precisa ter 1 minúscula.')
      .regex(/[\W_]/, 'Precisa ter 1 caractere especial.')
  }),
  query: z.any()
});

const createFeatureFlagSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Nome da flag é obrigatório.').regex(/^[a-z0-9_]+$/, 'Apenas letras minúsculas, números e sublinhados são permitidos.'),
    description: z.string().optional().default(''),
    is_active_global: z.boolean().optional().default(false)
  }),
  query: z.any(), params: z.any()
});

const updateFeatureFlagSchema = z.object({
  params: z.object({
    id: z.string().uuid('ID inválido.')
  }),
  body: z.object({
    name: z.string().min(1, 'Nome da flag é obrigatório.').regex(/^[a-z0-9_]+$/, 'Apenas letras minúsculas, números e sublinhados são permitidos.'),
    description: z.string().optional().default(''),
    is_active_global: z.boolean().optional().default(false)
  }),
  query: z.any()
});

const toggleTenantFlagSchema = z.object({
  body: z.object({
    tenant_id: z.string().uuid('ID do inquilino inválido.'),
    feature_flag_id: z.string().uuid('ID da feature flag inválido.'),
    is_enabled: z.boolean()
  }),
  query: z.any(), params: z.any()
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

router.get('/overdue-tenants', async (req, res) => {
  try {
    const { getOverdueTenants } = await import('../services/superadminService.js');
    const overdue = await getOverdueTenants();
    return res.json(overdue);
  } catch (error) {
    req.log.error(error, 'Erro ao listar inadimplentes para o Super Admin');
    return res.status(500).json({ error: 'Erro interno ao listar salões inadimplentes.' });
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

const adminCreateSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Nome é obrigatório.'),
    email: z.string().email('E-mail inválido.'),
    password: z.string().min(8, 'Senha deve ter no mínimo 8 caracteres.')
      .regex(/[A-Z]/, 'Precisa ter 1 maiúscula.')
      .regex(/[a-z]/, 'Precisa ter 1 minúscula.')
      .regex(/[\W_]/, 'Precisa ter 1 caractere especial.')
  }),
  query: z.any(), params: z.any()
});

const adminUpdateSchema = z.object({
  params: z.object({ id: z.string().uuid('ID inválido') }),
  body: z.object({
    name: z.string().min(1, 'Nome é obrigatório.'),
    email: z.string().email('E-mail inválido.'),
    password: z.string().min(8, 'Senha deve ter no mínimo 8 caracteres.')
      .regex(/[A-Z]/, 'Precisa ter 1 maiúscula.')
      .regex(/[a-z]/, 'Precisa ter 1 minúscula.')
      .regex(/[\W_]/, 'Precisa ter 1 caractere especial.').optional().or(z.literal(''))
  }),
  query: z.any()
});

router.get('/admins', async (req, res) => {
  try {
    const { listPlatformAdmins } = await import('../services/superadminService.js');
    const admins = await listPlatformAdmins();
    return res.json(admins);
  } catch (error) {
    req.log.error(error, 'Erro ao listar administradores da plataforma');
    return res.status(500).json({ error: 'Erro interno ao listar administradores.' });
  }
});

router.post('/admins', validate(adminCreateSchema), async (req, res) => {
  try {
    const { createPlatformAdmin } = await import('../services/superadminService.js');
    const { name, email, password } = req.body;
    const admin = await createPlatformAdmin(name, email, password);
    return res.status(201).json(admin);
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    req.log.error(error, 'Erro ao criar administrador da plataforma');
    return res.status(500).json({ error: 'Erro interno ao criar administrador.' });
  }
});

router.put('/admins/:id', validate(adminUpdateSchema), async (req, res) => {
  try {
    const { updatePlatformAdmin } = await import('../services/superadminService.js');
    const { id } = req.params;
    const { name, email, password } = req.body;
    const admin = await updatePlatformAdmin(id, name, email, password);
    return res.json(admin);
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    req.log.error(error, 'Erro ao atualizar administrador da plataforma');
    return res.status(500).json({ error: 'Erro interno ao atualizar administrador.' });
  }
});

router.delete('/admins/:id', async (req, res) => {
  try {
    const { deletePlatformAdmin } = await import('../services/superadminService.js');
    const { id } = req.params;
    const result = await deletePlatformAdmin(id);
    return res.json(result);
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    req.log.error(error, 'Erro ao deletar administrador da plataforma');
    return res.status(500).json({ error: 'Erro interno ao deletar administrador.' });
  }
});

// ==========================================
// MURAL DE AVISOS (BROADCAST SYSTEM)
// ==========================================

const announcementSchema = z.object({
  body: z.object({
    title: z.string().min(1, 'Título é obrigatório.'),
    content: z.string().min(1, 'Conteúdo é obrigatório.'),
    type: z.enum(['info', 'warning', 'success', 'error']).optional().default('info'),
    is_active: z.boolean().optional().default(true),
    expires_at: z.string().optional().nullable()
  }),
  query: z.any(), params: z.any()
});

router.get('/announcements', async (req, res) => {
  try {
    const { listAnnouncements } = await import('../services/superadminService.js');
    const items = await listAnnouncements();
    return res.json(items);
  } catch (error) {
    req.log.error(error, 'Erro ao listar avisos');
    return res.status(500).json({ error: 'Erro interno ao listar avisos.' });
  }
});

router.post('/announcements', validate(announcementSchema), async (req, res) => {
  try {
    const { createAnnouncement } = await import('../services/superadminService.js');
    const { title, content, type, is_active, expires_at } = req.body;
    const item = await createAnnouncement(title, content, type, is_active, expires_at);
    return res.status(201).json(item);
  } catch (error) {
    req.log.error(error, 'Erro ao criar aviso');
    return res.status(500).json({ error: 'Erro interno ao criar aviso.' });
  }
});

router.put('/announcements/:id', validate(announcementSchema), async (req, res) => {
  try {
    const { updateAnnouncement } = await import('../services/superadminService.js');
    const { id } = req.params;
    const { title, content, type, is_active, expires_at } = req.body;
    const item = await updateAnnouncement(id, title, content, type, is_active, expires_at);
    return res.json(item);
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    req.log.error(error, 'Erro ao atualizar aviso');
    return res.status(500).json({ error: 'Erro interno ao atualizar aviso.' });
  }
});

router.delete('/announcements/:id', async (req, res) => {
  try {
    const { deleteAnnouncement } = await import('../services/superadminService.js');
    const { id } = req.params;
    const result = await deleteAnnouncement(id);
    return res.json(result);
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    req.log.error(error, 'Erro ao deletar aviso');
    return res.status(500).json({ error: 'Erro interno ao deletar aviso.' });
  }
});

// ==========================================
// FEATURE FLAGS (GESTÃO DE MÓDULOS BETA)
// ==========================================

router.get('/feature-flags', async (req, res) => {
  try {
    const flags = await listFeatureFlags();
    return res.json(flags);
  } catch (error) {
    req.log.error(error, 'Erro ao listar feature flags');
    return res.status(500).json({ error: 'Erro interno ao listar feature flags.' });
  }
});

router.post('/feature-flags', validate(createFeatureFlagSchema), async (req, res) => {
  try {
    const { name, description, is_active_global } = req.body;
    const flag = await createFeatureFlag(name, description, is_active_global);
    return res.status(201).json(flag);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Já existe uma Feature Flag com este nome.' });
    }
    req.log.error(error, 'Erro ao criar feature flag');
    return res.status(500).json({ error: 'Erro interno ao criar feature flag.' });
  }
});

router.put('/feature-flags/:id', validate(updateFeatureFlagSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, is_active_global } = req.body;
    const flag = await updateFeatureFlag(id, name, description, is_active_global);
    return res.json(flag);
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Já existe uma Feature Flag com este nome.' });
    }
    req.log.error(error, 'Erro ao atualizar feature flag');
    return res.status(500).json({ error: 'Erro interno ao atualizar feature flag.' });
  }
});

router.delete('/feature-flags/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await deleteFeatureFlag(id);
    return res.json({ message: 'Feature flag deletada com sucesso.', flag: result });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    req.log.error(error, 'Erro ao deletar feature flag');
    return res.status(500).json({ error: 'Erro interno ao deletar feature flag.' });
  }
});

router.get('/feature-flags/tenants/:tenantId', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const flags = await listTenantFeatureFlags(tenantId);
    return res.json(flags);
  } catch (error) {
    req.log.error(error, 'Erro ao obter feature flags do tenant');
    return res.status(500).json({ error: 'Erro interno ao obter feature flags do tenant.' });
  }
});

router.post('/feature-flags/tenants', validate(toggleTenantFlagSchema), async (req, res) => {
  try {
    const { tenant_id, feature_flag_id, is_enabled } = req.body;
    const result = await toggleTenantFeatureFlag(tenant_id, feature_flag_id, is_enabled);
    return res.json(result);
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    req.log.error(error, 'Erro ao alterar feature flag do tenant');
    return res.status(500).json({ error: 'Erro interno ao alterar feature flag do tenant.' });
  }
});

export default router;
