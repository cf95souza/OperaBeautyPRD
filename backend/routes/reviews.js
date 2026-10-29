import express from 'express';
import { z } from 'zod';
import { validate } from '../middlewares/validate.js';
import { authMiddleware, requireRole, optionalAuth } from '../middlewares/auth.js';
import {
  createReview,
  getPendingReview,
  listReviews,
  listPublicReviews,
  getReviewsStats,
  toggleReviewVisibility,
  replyToReview,
  updateGoogleReviewUrl
} from '../services/reviewService.js';
import { resolveTenantId } from '../services/authService.js';

const router = express.Router();
const staffOnly = requireRole(['manager', 'superadmin', 'professional']);
const managerOnly = requireRole(['manager', 'superadmin']);

// Schemas Zod de Validação
const createReviewSchema = z.object({
  body: z.object({
    appointment_id: z.string().uuid('ID de agendamento inválido.'),
    rating: z.coerce.number().int().min(1, 'Nota mínima é 1.').max(5, 'Nota máxima é 5.'),
    comment: z.string().max(1000, 'Comentário deve ter no máximo 1000 caracteres.').optional().nullable()
  }),
  params: z.any(),
  query: z.any()
});

const listReviewsSchema = z.object({
  query: z.object({
    professional_id: z.string().uuid().optional(),
    rating: z.coerce.number().int().min(1).max(5).optional(),
    is_public: z.enum(['true', 'false']).transform(v => v === 'true').optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    offset: z.coerce.number().int().min(0).optional()
  }),
  body: z.any(),
  params: z.any()
});

const visibilitySchema = z.object({
  params: z.object({
    id: z.string().uuid('ID de avaliação inválido.')
  }),
  body: z.object({
    is_public: z.boolean()
  }),
  query: z.any()
});

const replySchema = z.object({
  params: z.object({
    id: z.string().uuid('ID de avaliação inválido.')
  }),
  body: z.object({
    reply: z.string().min(1, 'Resposta não pode ser vazia.').max(1000, 'Resposta deve ter no máximo 1000 caracteres.')
  }),
  query: z.any()
});

const googleUrlSchema = z.object({
  body: z.object({
    google_review_url: z.string().url('URL do Google Reviews inválida.').max(500).or(z.literal(''))
  }),
  params: z.any(),
  query: z.any()
});

// 1. Estatísticas de avaliações (Geral, Estrelas, Ranking de Profissionais e Link do Google)
router.get('/stats', authMiddleware, staffOnly, async (req, res) => {
  const tenant_id = req.user.tenant_id;

  try {
    const stats = await getReviewsStats(tenant_id);
    return res.json(stats);
  } catch (error) {
    req.log?.error(error, 'Erro ao buscar estatísticas de avaliações');
    return res.status(500).json({ error: 'Erro interno ao buscar estatísticas de avaliações.' });
  }
});

// 2. Cliente posta uma nova avaliação
router.post('/', authMiddleware, requireRole(['client']), validate(createReviewSchema), async (req, res) => {
  const { appointment_id, rating, comment } = req.body;
  const client_id = req.user.id;
  const tenant_id = req.user.tenant_id;

  try {
    const result = await createReview(tenant_id, client_id, appointment_id, rating, comment);
    return res.status(201).json(result);
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Este atendimento já possui uma avaliação registrada.' });
    }
    req.log?.error(error, 'Erro ao postar review');
    return res.status(500).json({ error: 'Erro interno ao salvar avaliação.' });
  }
});

// 3. Buscar agendamentos pendentes de avaliação para o cliente logado
router.get('/pending', authMiddleware, requireRole(['client']), async (req, res) => {
  const client_id = req.user.id;
  const tenant_id = req.user.tenant_id;

  try {
    const pending = await getPendingReview(tenant_id, client_id);
    return res.json(pending ? [pending] : []);
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    req.log?.error(error, 'Erro ao buscar pendência de review');
    return res.status(500).json({ error: 'Erro interno ao buscar avaliação pendente.' });
  }
});

// 4. Vitrine pública de avaliações (Para Home, Lookbook e Mini-site do salão)
router.get('/public', optionalAuth, async (req, res) => {
  let tenant_id = req.query.tenant_id || req.user?.tenant_id;
  const tenant_slug = req.query.tenant_slug;
  const limit = req.query.limit || 10;

  if (!tenant_id && tenant_slug) {
    tenant_id = await resolveTenantId(null, tenant_slug);
  }

  if (!tenant_id) {
    return res.status(400).json({ error: 'tenant_id ou tenant_slug é obrigatório.' });
  }

  try {
    const reviews = await listPublicReviews(tenant_id, limit);
    return res.json(reviews);
  } catch (error) {
    req.log?.error(error, 'Erro ao listar reviews públicos');
    return res.status(500).json({ error: 'Erro ao buscar avaliações públicas.' });
  }
});

// 5. Equipe/Gestor lista todas as avaliações com filtros
router.get('/', authMiddleware, staffOnly, validate(listReviewsSchema), async (req, res) => {
  const tenant_id = req.user.tenant_id;
  const { professional_id, rating, is_public, limit, offset } = req.query;

  try {
    const list = await listReviews(tenant_id, {
      professionalId: professional_id,
      rating,
      isPublic: is_public,
      limit,
      offset
    });
    return res.json(list);
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    req.log?.error(error, 'Erro ao listar avaliações');
    return res.status(500).json({ error: 'Erro interno ao listar avaliações.' });
  }
});

// 6. Moderação de Visibilidade Pública (Gestor)
router.patch('/:id/visibility', authMiddleware, managerOnly, validate(visibilitySchema), async (req, res) => {
  const tenant_id = req.user.tenant_id;
  const { id } = req.params;
  const { is_public } = req.body;

  try {
    const updated = await toggleReviewVisibility(tenant_id, id, is_public);
    return res.json(updated);
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    req.log?.error(error, 'Erro ao alterar visibilidade de avaliação');
    return res.status(500).json({ error: 'Erro ao alterar visibilidade.' });
  }
});

// 7. Resposta à Avaliação (Gestor ou Profissional)
router.post('/:id/reply', authMiddleware, staffOnly, validate(replySchema), async (req, res) => {
  const tenant_id = req.user.tenant_id;
  const { id } = req.params;
  const { reply } = req.body;
  const staff_id = req.user.staff_id || req.user.id;

  try {
    const updated = await replyToReview(tenant_id, id, reply, staff_id);
    return res.json(updated);
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    req.log?.error(error, 'Erro ao responder avaliação');
    return res.status(500).json({ error: 'Erro ao registrar resposta.' });
  }
});

// 8. Atualizar link do Google Reviews do Salão (Gestor)
router.put('/google-url', authMiddleware, managerOnly, validate(googleUrlSchema), async (req, res) => {
  const tenant_id = req.user.tenant_id;
  const { google_review_url } = req.body;

  try {
    const updated = await updateGoogleReviewUrl(tenant_id, google_review_url);
    return res.json(updated);
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    req.log?.error(error, 'Erro ao atualizar URL do Google Reviews');
    return res.status(500).json({ error: 'Erro ao atualizar link do Google Reviews.' });
  }
});

export default router;
