import express from 'express';
import { z } from 'zod';
import { validate } from '../middlewares/validate.js';
import { authMiddleware } from '../middlewares/auth.js';
import {
  addToWaitlist,
  listWaitlist,
  getMyWaitlist,
  acceptWaitlistOffer,
  cancelWaitlistEntry,
  expireOffersAndAdvance
} from '../services/waitlistService.js';

const router = express.Router();

const addToWaitlistSchema = z.object({
  body: z.object({
    desired_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data desejada inválida (formato AAAA-MM-DD).'),
    service_id: z.string().uuid('ID do serviço inválido.').nullable().optional(),
    professional_id: z.string().uuid('ID do profissional inválido.').nullable().optional(),
    preferred_time_range: z.enum(['any', 'morning', 'afternoon', 'night']).optional()
  }),
  params: z.any(),
  query: z.any()
});

const acceptOfferSchema = z.object({
  body: z.object({
    start_time: z.string().datetime({ message: 'Data/hora de início inválida.' }),
    staff_id: z.string().uuid().nullable().optional(),
    service_id: z.string().uuid().nullable().optional(),
    services: z.array(z.any()).optional(),
    total_price: z.coerce.number().min(0).optional()
  }),
  params: z.object({
    id: z.string().uuid('ID da oferta inválido.')
  }),
  query: z.any()
});

/**
 * POST /api/waitlist - Cliente entra na lista de espera
 */
router.post('/', authMiddleware, validate(addToWaitlistSchema), async (req, res) => {
  const { desired_date, service_id, professional_id, preferred_time_range } = req.body;
  const tenantId = req.user.tenant_id;
  const clientId = req.user.id;

  try {
    const entry = await addToWaitlist({
      tenantId,
      clientId,
      desiredDate: desired_date,
      serviceId: service_id,
      professionalId: professional_id,
      preferredTimeRange: preferred_time_range
    });

    return res.status(201).json(entry);
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    req.log.error(error, 'Erro ao entrar na lista de espera');
    return res.status(500).json({ error: 'Erro interno ao entrar na lista de espera.' });
  }
});

/**
 * GET /api/waitlist/my - Minhas inscrições na lista de espera (Cliente)
 */
router.get('/my', authMiddleware, async (req, res) => {
  const tenantId = req.user.tenant_id;
  const clientId = req.user.id;

  try {
    const entries = await getMyWaitlist(tenantId, clientId);
    return res.json(entries);
  } catch (error) {
    req.log.error(error, 'Erro ao listar minhas inscrições na fila');
    return res.status(500).json({ error: 'Erro interno ao consultar lista de espera.' });
  }
});

/**
 * POST /api/waitlist/:id/accept - Aceitar oferta de vaga liberada
 */
router.post('/:id/accept', authMiddleware, validate(acceptOfferSchema), async (req, res) => {
  const { id } = req.params;
  const { start_time, staff_id, service_id, services, total_price } = req.body;
  const tenantId = req.user.tenant_id;
  const clientId = req.user.id;

  try {
    const appt = await acceptWaitlistOffer({
      tenantId,
      waitlistId: id,
      clientId,
      start_time,
      staff_id,
      service_id,
      services,
      total_price
    });

    return res.status(201).json(appt);
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    req.log.error(error, 'Erro ao aceitar oferta de vaga');
    return res.status(500).json({ error: 'Erro interno ao confirmar vaga da lista de espera.' });
  }
});

/**
 * DELETE /api/waitlist/:id - Cancelar/Sair da lista de espera
 */
router.delete('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const tenantId = req.user.tenant_id;
  const clientId = req.user.id;
  const userRole = req.user.role;

  try {
    const cancelled = await cancelWaitlistEntry({
      tenantId,
      waitlistId: id,
      clientId,
      userRole
    });

    return res.json(cancelled);
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    req.log.error(error, 'Erro ao cancelar inscrição na fila');
    return res.status(500).json({ error: 'Erro interno ao cancelar lista de espera.' });
  }
});

/**
 * GET /api/waitlist - Listagem da fila (Gestor/Equipe)
 */
router.get('/', authMiddleware, async (req, res) => {
  const tenantId = req.user.tenant_id;
  const userRole = req.user.role;
  const { status, date } = req.query;

  if (userRole === 'client') {
    return res.status(403).json({ error: 'Acesso negado.' });
  }

  try {
    // Rotina automática de expiração antes de listar
    await expireOffersAndAdvance(tenantId).catch(() => {});

    const list = await listWaitlist(tenantId, status, date);
    return res.json(list);
  } catch (error) {
    req.log.error(error, 'Erro ao listar fila de espera');
    return res.status(500).json({ error: 'Erro interno ao consultar lista de espera.' });
  }
});

export default router;
