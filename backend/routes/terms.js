import express from 'express';
import { authMiddleware, requireRole } from '../middlewares/auth.js';
import {
  listTermsTemplates,
  createTermsTemplate,
  deleteTermsTemplate
} from '../services/termService.js';
import { requestConsent } from '../services/consentService.js';

const router = express.Router();

// 1. Listar todos os modelos de termos do salão
router.get('/', authMiddleware, requireRole(['manager', 'superadmin', 'professional']), async (req, res) => {
  const tenant_id = req.user.tenant_id;
  try {
    const list = await listTermsTemplates(tenant_id);
    return res.json(list);
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    req.log?.error(error, 'Erro ao listar templates de termos');
    return res.status(500).json({ error: 'Erro interno ao listar termos.' });
  }
});

// 2. Criar novo modelo de termo
router.post('/', authMiddleware, requireRole(['manager', 'superadmin']), async (req, res) => {
  const tenant_id = req.user.tenant_id;
  const { title, content } = req.body;

  try {
    const created = await createTermsTemplate(tenant_id, title, content);
    return res.status(201).json(created);
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    req.log?.error(error, 'Erro ao criar template de termo');
    return res.status(500).json({ error: 'Erro interno ao salvar termo.' });
  }
});

// 2.1 Solicitar assinatura de termo para um cliente (usado pelo painel GestaoLGPD)
router.post('/request-signature', authMiddleware, requireRole(['manager', 'superadmin', 'professional']), async (req, res) => {
  const tenant_id = req.user.tenant_id;
  const staff_id = req.user.id;
  const { client_id, term_template_id } = req.body;

  try {
    const result = await requestConsent(tenant_id, staff_id, client_id, term_template_id);
    return res.status(201).json(result);
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    req.log?.error(error, 'Erro ao solicitar assinatura');
    return res.status(500).json({ error: 'Erro interno ao criar solicitação.' });
  }
});

// 3. Deletar modelo de termo
router.delete('/:id', authMiddleware, requireRole(['manager', 'superadmin']), async (req, res) => {
  const tenant_id = req.user.tenant_id;
  const { id } = req.params;

  try {
    await deleteTermsTemplate(tenant_id, id);
    return res.json({ message: 'Termo excluído com sucesso.' });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    req.log?.error(error, 'Erro ao excluir template de termo');
    return res.status(500).json({ error: 'Erro interno ao excluir termo.' });
  }
});

export default router;
