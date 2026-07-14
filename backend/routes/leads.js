import express from 'express';
import { z } from 'zod';
import { validate } from '../middlewares/validate.js';
import { authMiddleware, requireRole } from '../middlewares/auth.js';
import { createLead, listLeads } from '../services/leadService.js';

const router = express.Router();

const leadSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres.'),
    email: z.string().email('E-mail inválido.'),
    phone: z.string().min(10, 'Telefone inválido.'),
    salon_name: z.string().optional().nullable(),
  }),
  query: z.any(), params: z.any()
});

router.post('/', validate(leadSchema), async (req, res) => {
  const { name, email, phone, salon_name } = req.body;

  try {
    const lead = await createLead(name, email, phone, salon_name);
    return res.status(201).json({ message: 'Lead capturado com sucesso!', lead });
  } catch (error) {
    req.log.error(error, 'Erro ao capturar lead');
    return res.status(500).json({ error: 'Erro interno ao processar lead.' });
  }
});

router.get('/', authMiddleware, requireRole(['superadmin']), async (req, res) => {
  const limit = parseInt(req.query.limit) || 1000;
  const offset = parseInt(req.query.offset) || 0;

  try {
    const leads = await listLeads(limit, offset);
    return res.json(leads);
  } catch (error) {
    req.log.error(error, 'Erro ao listar leads');
    return res.status(500).json({ error: 'Erro interno ao buscar leads.' });
  }
});

export default router;
