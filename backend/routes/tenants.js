import express from 'express';
import { authMiddleware, requireRole } from '../middlewares/auth.js';
import { z } from 'zod';
import { validate } from '../middlewares/validate.js';
import { getTenantBySlug, updateBranding } from '../services/tenantService.js';

const router = express.Router();

const updateBrandingSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'O nome do estabelecimento é obrigatório.').optional(),
    primary_color: z.string().optional(),
    secondary_color: z.string().optional(),
    tertiary_color: z.string().optional(),
    logo_url: z.string().nullable().optional(),
    banners: z.array(z.any()).nullable().optional(),
    welcome_message: z.string().nullable().optional(),
    address: z.string().nullable().optional(),
    social_instagram: z.string().nullable().optional(),
    social_facebook: z.string().nullable().optional(),
    social_whatsapp: z.string().nullable().optional(),
    cashback_percentage: z.number().min(0).max(100).optional(),
    cashback_expiration_days: z.number().int().min(1).optional(),
    waiting_menu_enabled: z.boolean().optional(),
    waiting_menu_items: z.array(z.string()).optional()
  }),
  query: z.any(), params: z.any()
});


/**
 * @swagger
 * /api/tenants/by-slug/{slug}:
 *   get:
 *     summary: Retorna os dados públicos de um salão (Tenant)
 *     description: Endpoint utilizado pela página pública para carregar o visual, banners e permissões do salão. Utiliza cache Redis.
 *     tags:
 *       - Tenants (Salões)
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         description: Slug único do salão (ex. meusalao)
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Dados do salão retornados com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                   example: 1
 *                 slug:
 *                   type: string
 *                   example: "meusalao"
 *                 name:
 *                   type: string
 *                   example: "Salão Beauty Express"
 *                 status:
 *                   type: string
 *                   example: "active"
 *       403:
 *         description: O estabelecimento está temporariamente suspenso.
 *       404:
 *         description: Salão não encontrado.
 */
router.get('/by-slug/:slug', async (req, res) => {
  const { slug } = req.params;

  try {
    const tenant = await getTenantBySlug(slug);
    return res.json(tenant);
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    req.log.error(error, 'Erro ao obter tenant por slug');
    return res.status(500).json({ error: 'Erro interno ao obter dados do salão.' });
  }
});

router.put('/branding', authMiddleware, requireRole(['manager']), validate(updateBrandingSchema), async (req, res) => {
  const { 
    name, 
    primary_color, 
    secondary_color, 
    tertiary_color, 
    logo_url, 
    banners, 
    welcome_message,
    address,
    social_instagram,
    social_facebook,
    social_whatsapp,
    cashback_percentage,
    cashback_expiration_days,
    waiting_menu_enabled,
    waiting_menu_items
  } = req.body;
  const tenant_id = req.user.tenant_id;

  try {
    const updatedTenant = await updateBranding(
      tenant_id, 
      name, 
      primary_color, 
      secondary_color, 
      tertiary_color, 
      logo_url, 
      banners, 
      welcome_message,
      address,
      social_instagram,
      social_facebook,
      social_whatsapp,
      cashback_percentage,
      cashback_expiration_days,
      waiting_menu_enabled,
      waiting_menu_items
    );

    return res.json(updatedTenant);
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    req.log.error(error, 'Erro ao atualizar branding');
    return res.status(500).json({ error: 'Erro interno ao atualizar customização.' });
  }
});

router.get('/platform-announcements', async (req, res) => {
  try {
    const { getActiveAnnouncements } = await import('../services/superadminService.js');
    const announcements = await getActiveAnnouncements();
    return res.json(announcements);
  } catch (error) {
    req.log.error(error, 'Erro ao obter avisos da plataforma');
    return res.status(500).json({ error: 'Erro ao buscar avisos.' });
  }
});

export default router;
