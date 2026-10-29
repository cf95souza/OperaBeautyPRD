import express from 'express';
import { z } from 'zod';
import { authMiddleware, requireRole } from '../middlewares/auth.js';
import {
  getClientReferralProfile,
  validateReferralCode,
  getAdminReferralDashboard,
  updateReferralSettings
} from '../services/referralService.js';
import pool from '../config/db.js';

const router = express.Router();

// Schema Zod para atualização das configurações do programa pelo gestor
const referralSettingsSchema = z.object({
  active: z.boolean().optional(),
  rewardType: z.enum(['wallet', 'coupon']).optional(),
  referrerReward: z.number().nonnegative().optional(),
  refereeReward: z.number().nonnegative().optional(),
  trigger: z.enum(['on_signup', 'on_first_completed_appointment']).optional(),
  customMessage: z.string().max(600).optional().nullable()
});

/**
 * GET /api/referral/profile
 * Retorna o perfil de indicação da cliente autenticada (código, métricas, link e mensagem).
 */
router.get('/profile', authMiddleware, requireRole(['client']), async (req, res) => {
  try {
    const { id, tenant_id } = req.user;
    const baseUrl = req.get('origin') || `${req.protocol}://${req.get('host')}`;
    const profile = await getClientReferralProfile(tenant_id, id, baseUrl);
    return res.json(profile);
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    req.log?.error(error, 'Erro ao buscar perfil de indicação da cliente');
    return res.status(500).json({ error: 'Erro ao buscar perfil de indicação.' });
  }
});

/**
 * GET /api/referral/stats (Alias retrocompatível)
 */
router.get('/stats', authMiddleware, requireRole(['client']), async (req, res) => {
  try {
    const { id, tenant_id } = req.user;
    const baseUrl = req.get('origin') || `${req.protocol}://${req.get('host')}`;
    const profile = await getClientReferralProfile(tenant_id, id, baseUrl);
    return res.json({
      referralCode: profile.referralCode,
      totalFriends: profile.stats.totalFriends,
      totalBonus: profile.stats.totalBonusEarned,
      ...profile
    });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    req.log?.error(error, 'Erro ao buscar estatísticas de indicação');
    return res.status(500).json({ error: 'Erro ao buscar estatísticas de indicação.' });
  }
});

/**
 * GET /api/referral/validate/:code
 * Endpoint público que valida o código de indicação antes do cadastro.
 */
router.get('/validate/:code', async (req, res) => {
  try {
    const { code } = req.params;
    let tenantId = req.query.tenant_id;
    const tenantSlug = req.query.tenant_slug;

    if (!tenantId && tenantSlug) {
      const tenantRes = await pool.query(
        'SELECT id FROM public.cap_tenants WHERE slug = $1 LIMIT 1',
        [tenantSlug]
      );
      if (tenantRes.rows.length > 0) {
        tenantId = tenantRes.rows[0].id;
      }
    }

    if (!tenantId) {
      return res.status(400).json({ valid: false, message: 'Salão não informado.' });
    }

    const validation = await validateReferralCode(tenantId, code);
    return res.json(validation);
  } catch (error) {
    req.log?.error(error, 'Erro ao validar código de indicação');
    return res.status(500).json({ valid: false, message: 'Erro ao validar código de indicação.' });
  }
});

/**
 * GET /api/referral/admin/dashboard
 * Retorna os KPIs, embaixadoras e histórico de indicações para a gestão.
 */
router.get('/admin/dashboard', authMiddleware, requireRole(['manager', 'superadmin']), async (req, res) => {
  try {
    const { tenant_id } = req.user;
    const { page, limit, search } = req.query;
    const dashboard = await getAdminReferralDashboard(tenant_id, { page, limit, search });
    return res.json(dashboard);
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    req.log?.error(error, 'Erro ao buscar dashboard de indicações');
    return res.status(500).json({ error: 'Erro ao buscar dashboard de indicações.' });
  }
});

/**
 * PUT /api/referral/admin/settings
 * Atualiza as configurações e regras do programa de indicação pelo gestor.
 */
router.put('/admin/settings', authMiddleware, requireRole(['manager', 'superadmin']), async (req, res) => {
  try {
    const { tenant_id } = req.user;
    const parsed = referralSettingsSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: 'Dados inválidos.',
        details: parsed.error.issues.map(i => i.message)
      });
    }

    const updated = await updateReferralSettings(tenant_id, parsed.data);
    return res.json({
      message: 'Configurações do programa de indicação atualizadas com sucesso.',
      settings: updated
    });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    req.log?.error(error, 'Erro ao atualizar configurações de indicação');
    return res.status(500).json({ error: 'Erro ao atualizar configurações de indicação.' });
  }
});

export default router;
