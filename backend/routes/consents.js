import express from 'express';
import { authMiddleware, requireRole } from '../middlewares/auth.js';
import {
  listPendingConsents,
  signConsent,
  requestConsent,
  listAllConsents,
  getConsentsStats
} from '../services/consentService.js';

const router = express.Router();

// 0. Estatísticas e histórico recente de consentimentos (LGPD)
router.get('/stats', authMiddleware, requireRole(['manager', 'superadmin', 'professional']), async (req, res) => {
  const tenant_id = req.user.tenant_id;

  try {
    const stats = await getConsentsStats(tenant_id);
    return res.json(stats);
  } catch (error) {
    req.log?.error(error, 'Erro ao buscar estatísticas de consentimentos');
    return res.status(500).json({ error: 'Erro interno ao consultar estatísticas de consentimentos.' });
  }
});

// 1. Cliente visualiza seus termos pendentes
router.get('/pending', authMiddleware, requireRole(['client']), async (req, res) => {
  const tenant_id = req.user.tenant_id;
  const client_id = req.user.id;

  try {
    const list = await listPendingConsents(tenant_id, client_id);
    return res.json(list);
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    req.log?.error(error, 'Erro ao listar termos pendentes');
    return res.status(500).json({ error: 'Erro interno ao consultar termos pendentes.' });
  }
});

// 2. Cliente assina um termo
router.put('/:id/sign', authMiddleware, requireRole(['client']), async (req, res) => {
  const tenant_id = req.user.tenant_id;
  const client_id = req.user.id;
  const { id } = req.params;

  try {
    const client_ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const user_agent = req.headers['user-agent'] || 'unknown';

    const result = await signConsent(tenant_id, id, client_id, client_ip, user_agent);
    return res.json(result);
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    req.log?.error(error, 'Erro ao assinar termo');
    return res.status(500).json({ error: 'Erro interno ao processar assinatura.' });
  }
});

// 3. Gestor solicita a assinatura de um termo para um cliente
router.post('/request', authMiddleware, requireRole(['manager', 'superadmin', 'professional']), async (req, res) => {
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

// 4. Gestor lista todos os consentimentos do salão
router.get('/', authMiddleware, requireRole(['manager', 'superadmin', 'professional']), async (req, res) => {
  const tenant_id = req.user.tenant_id;
  try {
    const list = await listAllConsents(tenant_id);
    return res.json(list);
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    req.log?.error(error, 'Erro ao listar consentimentos');
    return res.status(500).json({ error: 'Erro interno ao listar termos assinados.' });
  }
});

export default router;
