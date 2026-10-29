import express from 'express';
import { z } from 'zod';
import { validate } from '../middlewares/validate.js';
import { authMiddleware } from '../middlewares/auth.js';
import {
  createEvolution,
  listClientEvolutions,
  updateEvolution,
  deleteEvolution
} from '../services/evolutionService.js';

const router = express.Router();

const createEvolutionSchema = z.object({
  body: z.object({
    client_id: z.string().uuid(),
    procedure_name: z.string().min(2, 'Nome do procedimento é obrigatório'),
    notes: z.string().optional().default(''),
    measurements: z.record(z.any()).optional().default({}),
    before_photos: z.array(z.string()).optional().default([]),
    after_photos: z.array(z.string()).optional().default([]),
    photo_consent_level: z.enum(['none', 'internal_only', 'social_media_anonymous', 'social_media_full']).optional().default('internal_only'),
    session_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD').optional(),
    appointment_id: z.string().uuid().nullable().optional(),
    staff_id: z.string().uuid().nullable().optional()
  })
});

const updateEvolutionSchema = z.object({
  body: z.object({
    procedure_name: z.string().min(2).optional(),
    notes: z.string().optional(),
    measurements: z.record(z.any()).optional(),
    before_photos: z.array(z.string()).optional(),
    after_photos: z.array(z.string()).optional(),
    photo_consent_level: z.enum(['none', 'internal_only', 'social_media_anonymous', 'social_media_full']).optional(),
    session_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
  })
});

// 1. Criar novo registro de evolução clínica
router.post('/', authMiddleware, validate(createEvolutionSchema), async (req, res) => {
  const { tenant_id, role } = req.user;

  if (role === 'client') {
    return res.status(403).json({ error: 'Apenas profissionais ou gestores podem registrar evoluções clínicas.' });
  }

  try {
    const evolution = await createEvolution({
      tenantId: tenant_id,
      clientId: req.body.client_id,
      staffId: req.body.staff_id,
      appointmentId: req.body.appointment_id,
      sessionDate: req.body.session_date,
      procedureName: req.body.procedure_name,
      notes: req.body.notes,
      measurements: req.body.measurements,
      beforePhotos: req.body.before_photos,
      afterPhotos: req.body.after_photos,
      photoConsentLevel: req.body.photo_consent_level,
      requestingUser: req.user,
      req
    });

    return res.status(201).json(evolution);
  } catch (error) {
    if (error.statusCode === 403) {
      return res.status(403).json({ error: error.message });
    }
    req.log.error(error, 'Erro ao registrar evolução clínica');
    return res.status(500).json({ error: 'Erro ao criar evolução clínica.' });
  }
});

// 2. Listar evoluções clínicas da cliente (Gestor/Profissional vinculado/Próprio cliente)
router.get('/client/:clientId', authMiddleware, async (req, res) => {
  const { tenant_id } = req.user;
  const { clientId } = req.params;

  try {
    const evolutions = await listClientEvolutions(tenant_id, clientId, req.user, req);
    return res.json(evolutions);
  } catch (error) {
    if (error.statusCode === 403) {
      return res.status(403).json({ error: error.message });
    }
    req.log.error(error, 'Erro ao listar evoluções clínicas');
    return res.status(500).json({ error: 'Erro ao listar evoluções clínicas.' });
  }
});

// 3. Atualizar evolução clínica
router.put('/:id', authMiddleware, validate(updateEvolutionSchema), async (req, res) => {
  const { tenant_id, role } = req.user;
  const { id } = req.params;

  if (role === 'client') {
    return res.status(403).json({ error: 'Apenas profissionais ou gestores podem editar evoluções.' });
  }

  try {
    const updated = await updateEvolution(tenant_id, id, req.body, req.user, req);
    return res.json(updated);
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    req.log.error(error, 'Erro ao atualizar evolução clínica');
    return res.status(500).json({ error: 'Erro ao atualizar evolução clínica.' });
  }
});

// 4. Excluir evolução clínica (Apenas gestores/administradores)
router.delete('/:id', authMiddleware, async (req, res) => {
  const { tenant_id } = req.user;
  const { id } = req.params;

  try {
    const result = await deleteEvolution(tenant_id, id, req.user, req);
    return res.json(result);
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    req.log.error(error, 'Erro ao excluir evolução clínica');
    return res.status(500).json({ error: 'Erro ao excluir evolução clínica.' });
  }
});

export default router;
