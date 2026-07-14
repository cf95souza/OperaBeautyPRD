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
    social_whatsapp: z.string().nullable().optional()
  }),
  query: z.any(), params: z.any()
});


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
    social_whatsapp
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
      social_whatsapp
    );

    return res.json(updatedTenant);
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    req.log.error(error, 'Erro ao atualizar branding');
    return res.status(500).json({ error: 'Erro interno ao atualizar customização.' });
  }
});

export default router;
