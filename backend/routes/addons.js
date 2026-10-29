import express from 'express';
import { z } from 'zod';
import { authMiddleware, requireRole } from '../middlewares/auth.js';
import {
  listAvailableAddons,
  getTenantAddons,
  subscribeAddon,
  cancelAddon,
  updateAddonConfig,
  verifyCustomDomainDns
} from '../services/addonService.js';

const router = express.Router();

// Schemas Zod de validação
const subscribeAddonSchema = z.object({
  tenant_id: z.string().uuid('ID de salão inválido.'),
  addon_slug: z.string().min(2, 'Slug do complemento é obrigatório.'),
  config: z.record(z.any()).optional().default({})
});

const cancelAddonSchema = z.object({
  tenant_id: z.string().uuid('ID de salão inválido.'),
  addon_slug: z.string().min(2, 'Slug do complemento é obrigatório.')
});

const updateConfigSchema = z.object({
  tenant_id: z.string().uuid('ID de salão inválido.'),
  addon_slug: z.string().min(2, 'Slug do complemento é obrigatório.'),
  config: z.record(z.any())
});

const verifyDomainSchema = z.object({
  tenant_id: z.string().uuid('ID de salão inválido.'),
  domain: z.string().min(3, 'Nome de domínio inválido.')
});

/**
 * GET /api/addons
 * Lista os complementos oficiais disponíveis na plataforma
 */
router.get('/', async (req, res) => {
  try {
    const addons = await listAvailableAddons();
    res.json({ success: true, addons });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/addons/tenant/:tenantId?
 * Consulta os complementos contratados e limites ativos do salão
 */
router.get('/tenant/:tenantId?', authMiddleware, async (req, res) => {
  try {
    const tenantId = req.params.tenantId || req.user.tenant_id;
    if (!tenantId) {
      return res.status(400).json({ success: false, message: 'ID do salão é obrigatório.' });
    }

    // Regra de segurança: gestores só podem ver os complementos do próprio salão
    if (req.user.role !== 'superadmin' && req.user.tenant_id !== tenantId) {
      return res.status(403).json({ success: false, message: 'Acesso negado aos dados deste salão.' });
    }

    const data = await getTenantAddons(tenantId);
    res.json({ success: true, ...data });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/addons/subscribe
 * Contratação de um complemento (WhatsApp extra, Domínio Próprio ou NFS-e)
 */
router.post('/subscribe', authMiddleware, requireRole(['manager', 'admin', 'superadmin']), async (req, res) => {
  try {
    const parsed = subscribeAddonSchema.parse(req.body);

    if (req.user.role !== 'superadmin' && req.user.tenant_id !== parsed.tenant_id) {
      return res.status(403).json({ success: false, message: 'Você só pode contratar complementos para o seu próprio salão.' });
    }

    const result = await subscribeAddon({
      tenantId: parsed.tenant_id,
      addonSlug: parsed.addon_slug,
      config: parsed.config,
      userId: req.user.id
    });

    res.status(201).json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: 'Dados inválidos.', errors: err.errors });
    }
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/addons/cancel
 * Cancelamento de um complemento contratado
 */
router.post('/cancel', authMiddleware, requireRole(['manager', 'admin', 'superadmin']), async (req, res) => {
  try {
    const parsed = cancelAddonSchema.parse(req.body);

    if (req.user.role !== 'superadmin' && req.user.tenant_id !== parsed.tenant_id) {
      return res.status(403).json({ success: false, message: 'Você só pode cancelar complementos do seu próprio salão.' });
    }

    const result = await cancelAddon({
      tenantId: parsed.tenant_id,
      addonSlug: parsed.addon_slug,
      userId: req.user.id
    });

    res.json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: 'Dados inválidos.', errors: err.errors });
    }
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
});

/**
 * PUT /api/addons/config
 * Atualização da configuração de um complemento (ex: domínio próprio ou dados fiscais)
 */
router.put('/config', authMiddleware, requireRole(['manager', 'admin', 'superadmin']), async (req, res) => {
  try {
    const parsed = updateConfigSchema.parse(req.body);

    if (req.user.role !== 'superadmin' && req.user.tenant_id !== parsed.tenant_id) {
      return res.status(403).json({ success: false, message: 'Você só pode alterar configurações do seu próprio salão.' });
    }

    const result = await updateAddonConfig({
      tenantId: parsed.tenant_id,
      addonSlug: parsed.addon_slug,
      config: parsed.config,
      userId: req.user.id
    });

    res.json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: 'Dados inválidos.', errors: err.errors });
    }
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/addons/verify-domain
 * Verificação do apontamento DNS do domínio próprio
 */
router.post('/verify-domain', authMiddleware, requireRole(['manager', 'admin', 'superadmin']), async (req, res) => {
  try {
    const parsed = verifyDomainSchema.parse(req.body);

    if (req.user.role !== 'superadmin' && req.user.tenant_id !== parsed.tenant_id) {
      return res.status(403).json({ success: false, message: 'Você só pode verificar domínios do seu próprio salão.' });
    }

    const result = await verifyCustomDomainDns({
      tenantId: parsed.tenant_id,
      domain: parsed.domain
    });

    res.json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: 'Dados inválidos.', errors: err.errors });
    }
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
});

export default router;
