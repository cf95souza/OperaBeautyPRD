import express from 'express';
import pool from '../config/db.js';
import { authMiddleware, requireRole } from '../middlewares/auth.js';

const router = express.Router();

// 1. Listar todos os modelos de termos do salão
router.get('/', authMiddleware, requireRole(['manager', 'superadmin', 'professional']), async (req, res) => {
  const tenant_id = req.user.tenant_id;

  try {
    const result = await pool.query(
      `SELECT id, title, content, created_at FROM public.cap_terms_templates WHERE tenant_id = $1 ORDER BY created_at DESC`,
      [tenant_id]
    );
    return res.json(result.rows);
  } catch (error) {
    console.error('Erro ao listar templates de termos:', error);
    return res.status(500).json({ error: 'Erro interno' });
  }
});

// 2. Criar novo modelo de termo
router.post('/', authMiddleware, requireRole(['manager', 'superadmin']), async (req, res) => {
  const tenant_id = req.user.tenant_id;
  const { title, content } = req.body;

  if (!title || !content) {
    return res.status(400).json({ error: 'Título e conteúdo são obrigatórios.' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO public.cap_terms_templates (tenant_id, title, content) VALUES ($1, $2, $3) RETURNING id, title`,
      [tenant_id, title, content]
    );
    return res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao criar template de termo:', error);
    return res.status(500).json({ error: 'Erro interno' });
  }
});

// 3. Deletar modelo de termo
router.delete('/:id', authMiddleware, requireRole(['manager', 'superadmin']), async (req, res) => {
  const tenant_id = req.user.tenant_id;
  const { id } = req.params;

  try {
    const result = await pool.query(
      `DELETE FROM public.cap_terms_templates WHERE id = $1 AND tenant_id = $2 RETURNING id`,
      [id, tenant_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Termo não encontrado.' });
    }
    return res.json({ message: 'Termo excluído com sucesso.' });
  } catch (error) {
    console.error('Erro ao excluir template de termo:', error);
    return res.status(500).json({ error: 'Erro interno' });
  }
});

// 4. Enviar termo para o cliente assinar (cria consent e envia notificação)
router.post('/request-signature', authMiddleware, requireRole(['manager', 'superadmin', 'professional']), async (req, res) => {
  const tenant_id = req.user.tenant_id;
  const staff_id = req.user.id;
  const { client_id, term_template_id } = req.body;

  if (!client_id || !term_template_id) {
    return res.status(400).json({ error: 'Cliente e Termo são obrigatórios.' });
  }

  try {
    // Buscar o template
    const templateQuery = await pool.query(
      `SELECT title, content FROM public.cap_terms_templates WHERE id = $1 AND tenant_id = $2`,
      [term_template_id, tenant_id]
    );

    if (templateQuery.rows.length === 0) {
      return res.status(404).json({ error: 'Template não encontrado.' });
    }

    const template = templateQuery.rows[0];

    // Criar o consent
    const consentQuery = await pool.query(
      `INSERT INTO public.cap_consents (tenant_id, client_id, staff_id, term_template_id, content_snapshot) 
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [tenant_id, client_id, staff_id, term_template_id, template.content]
    );

    // Disparar notificação (import dinâmico para evitar dependência cíclica se houver)
    const { notifyClient } = await import('../services/notificationService.js');
    await notifyClient(
      tenant_id,
      client_id,
      '✍️ Assinatura Solicitada',
      `O termo "${template.title}" foi enviado para sua assinatura. Toque para assinar.`
    );

    return res.status(201).json({ message: 'Solicitação enviada com sucesso.', consent_id: consentQuery.rows[0].id });
  } catch (error) {
    console.error('Erro ao solicitar assinatura:', error);
    return res.status(500).json({ error: 'Erro interno' });
  }
});

export default router;
