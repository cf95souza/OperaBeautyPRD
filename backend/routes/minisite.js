import express from 'express';
import { authMiddleware, requireRole } from '../middlewares/auth.js';
import { z } from 'zod';
import { validate } from '../middlewares/validate.js';
import { getMinisiteData, updateMinisiteSettings } from '../services/minisiteService.js';

const router = express.Router();

const updateMinisiteSchema = z.object({
  body: z.object({
    headline: z.string().max(300, 'A headline deve ter no máximo 300 caracteres.').optional(),
    about_text: z.string().max(2000, 'O texto institucional deve ter no máximo 2000 caracteres.').optional(),
    minisite_gallery: z.array(z.object({
      url: z.string().url('URL da imagem inválida.'),
      caption: z.string().optional()
    })).optional(),
    google_maps_url: z.string().url('URL do Google Maps inválida.').nullable().optional(),
    meta_title: z.string().max(120, 'O título de SEO deve ter no máximo 120 caracteres.').optional(),
    meta_description: z.string().max(300, 'A descrição de SEO deve ter no máximo 300 caracteres.').optional(),
    meta_image_url: z.string().url('URL da imagem de compartilhamento inválida.').nullable().optional(),
    minisite_enabled: z.boolean().optional()
  }),
  query: z.any(),
  params: z.any()
});

/**
 * Retorna os dados completos do mini-site público do salão
 */
router.get('/:slug', async (req, res) => {
  const { slug } = req.params;
  try {
    const data = await getMinisiteData(slug);
    return res.json(data);
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    req.log.error(error, 'Erro ao carregar dados do mini-site');
    return res.status(500).json({ error: 'Erro interno ao carregar mini-site.' });
  }
});

/**
 * Endpoint de SEO / Pré-visualização Open Graph para WhatsApp e redes sociais (F3 / D20)
 */
router.get('/:slug/seo', async (req, res) => {
  const { slug } = req.params;
  try {
    const data = await getMinisiteData(slug);
    return res.json(data.seo);
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    return res.status(500).json({ error: 'Erro ao obter tags de SEO.' });
  }
});

/**
 * Atualiza configurações do mini-site (Apenas Gestor e Admin)
 */
router.put('/', authMiddleware, requireRole(['manager', 'admin']), validate(updateMinisiteSchema), async (req, res) => {
  const tenantId = req.user.tenant_id;
  try {
    const updated = await updateMinisiteSettings(tenantId, req.body);
    return res.json({
      message: 'Mini-site e dados de SEO atualizados com sucesso.',
      minisite: updated
    });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    req.log.error(error, 'Erro ao salvar configurações do mini-site');
    return res.status(500).json({ error: 'Erro interno ao salvar configurações do mini-site.' });
  }
});

export default router;
