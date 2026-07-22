import express from 'express';
import { z } from 'zod';
import { listLookbooks, createLookbook, deleteLookbook } from '../services/lookbookService.js';
import { authMiddleware, requireRole } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';

const router = express.Router();

// Schemas
const createLookbookSchema = z.object({
  body: z.object({
    image_url: z.string().url('URL de imagem inválida.'),
    title: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
    service_id: z.string().uuid('ID de serviço inválido').optional().nullable(),
    staff_id: z.string().uuid('ID de profissional inválido').optional().nullable()
  }),
  query: z.any(), params: z.any()
});

const deleteLookbookSchema = z.object({
  params: z.object({
    id: z.string().uuid('ID inválido.')
  }),
  body: z.any(), query: z.any()
});

// Listar Lookbook (Aberto, pode ser acessado pelo client ou admin, desde que o tenant_id venha do params ou header - aqui assumiremos que client auth envia tenant_id)
// Para simplificar, cliente passa tenant_id se for publico ou pega do user.
router.get('/', async (req, res) => {
  // Vamos usar um param de query para tenant_id, útil para rotas públicas ou pegar do user autenticado.
  const tenantId = req.query.tenant_id || (req.user ? req.user.tenant_id : null);
  
  if (!tenantId) {
    return res.status(400).json({ error: 'tenant_id é obrigatório.' });
  }

  try {
    const lookbooks = await listLookbooks(tenantId);
    return res.json(lookbooks);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao listar lookbook.' });
  }
});

// Criar Lookbook (Apenas Admin/Manager)
router.post('/', authMiddleware, requireRole(['manager', 'admin']), validate(createLookbookSchema), async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const newLookbook = await createLookbook(tenantId, req.body);
    return res.status(201).json(newLookbook);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao criar item no lookbook.' });
  }
});

// Deletar Lookbook
router.delete('/:id', authMiddleware, requireRole(['manager', 'admin']), validate(deleteLookbookSchema), async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { id } = req.params;
    await deleteLookbook(tenantId, id);
    return res.status(204).send();
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    console.error(error);
    return res.status(500).json({ error: 'Erro ao deletar item no lookbook.' });
  }
});

export default router;
