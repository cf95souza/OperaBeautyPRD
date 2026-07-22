import express from 'express';
import pool from '../config/db.js';
import { authMiddleware, requireRole } from '../middlewares/auth.js';
import crypto from 'crypto';

const router = express.Router();

// 1. Cliente visualiza seus termos pendentes
router.get('/pending', authMiddleware, requireRole(['client']), async (req, res) => {
  const tenant_id = req.user.tenant_id;
  const client_id = req.user.id;

  try {
    const result = await pool.query(
      `SELECT c.id, c.content_snapshot, c.created_at, t.title 
       FROM public.cap_consents c
       JOIN public.cap_terms_templates t ON c.term_template_id = t.id
       WHERE c.tenant_id = $1 AND c.client_id = $2 AND c.status = 'pending'
       ORDER BY c.created_at DESC`,
      [tenant_id, client_id]
    );
    return res.json(result.rows);
  } catch (error) {
    console.error('Erro ao listar pendentes:', error);
    return res.status(500).json({ error: 'Erro interno' });
  }
});

// 2. Cliente assina um termo
router.put('/:id/sign', authMiddleware, requireRole(['client']), async (req, res) => {
  const tenant_id = req.user.tenant_id;
  const client_id = req.user.id;
  const { id } = req.params;

  try {
    // Verificar se o termo existe e está pendente
    const consentQuery = await pool.query(
      `SELECT id, content_snapshot FROM public.cap_consents WHERE id = $1 AND tenant_id = $2 AND client_id = $3 AND status = 'pending'`,
      [id, tenant_id, client_id]
    );

    if (consentQuery.rows.length === 0) {
      return res.status(404).json({ error: 'Termo não encontrado ou já assinado.' });
    }

    const consent = consentQuery.rows[0];

    // Coletar dados de assinatura
    const client_ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const user_agent = req.headers['user-agent'] || 'unknown';
    const signed_at = new Date().toISOString();

    // Gerar Hash Criptográfico
    // O hash garante que o texto no snapshot, o id do cliente e a hora que ele assinou são autênticos.
    const rawData = `${consent.content_snapshot}|${client_id}|${client_ip}|${signed_at}`;
    const digital_hash = crypto.createHash('sha256').update(rawData).digest('hex');

    // Atualizar no banco
    await pool.query(
      `UPDATE public.cap_consents 
       SET status = 'signed', signed_at = $1, client_ip = $2, user_agent = $3, digital_hash = $4
       WHERE id = $5`,
      [signed_at, client_ip, user_agent, digital_hash, id]
    );

    return res.json({ message: 'Termo assinado com sucesso!', hash: digital_hash });
  } catch (error) {
    console.error('Erro ao assinar termo:', error);
    return res.status(500).json({ error: 'Erro interno' });
  }
});

// 3. Gestor visualiza estatísticas LGPD (Para o Painel)
router.get('/stats', authMiddleware, requireRole(['manager', 'superadmin']), async (req, res) => {
  const tenant_id = req.user.tenant_id;

  try {
    const totalQuery = await pool.query(
      `SELECT count(*) as total FROM public.cap_consents WHERE tenant_id = $1`,
      [tenant_id]
    );
    const pendingQuery = await pool.query(
      `SELECT count(*) as pending FROM public.cap_consents WHERE tenant_id = $1 AND status = 'pending'`,
      [tenant_id]
    );
    const signedQuery = await pool.query(
      `SELECT count(*) as signed FROM public.cap_consents WHERE tenant_id = $1 AND status = 'signed'`,
      [tenant_id]
    );

    // Listar histórico recente de assinaturas
    const recentQuery = await pool.query(
      `SELECT c.id, c.status, c.signed_at, c.digital_hash, t.title as term_title, cl.name as client_name
       FROM public.cap_consents c
       JOIN public.cap_terms_templates t ON c.term_template_id = t.id
       JOIN public.cap_clients cl ON c.client_id = cl.id
       WHERE c.tenant_id = $1
       ORDER BY c.created_at DESC
       LIMIT 10`,
      [tenant_id]
    );

    return res.json({
      total: parseInt(totalQuery.rows[0].total),
      pending: parseInt(pendingQuery.rows[0].pending),
      signed: parseInt(signedQuery.rows[0].signed),
      recent: recentQuery.rows
    });
  } catch (error) {
    console.error('Erro ao buscar stats lgpd:', error);
    return res.status(500).json({ error: 'Erro interno' });
  }
});

export default router;
