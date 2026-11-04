import express from 'express';
import { z } from 'zod';
import { validate } from '../middlewares/validate.js';
import { authMiddleware } from '../middlewares/auth.js';
import {
  getCampaigns,
  updateCampaign,
  runCampaignScan,
  getCampaignLogs,
  toggleClientOptOut
} from '../services/campaignService.js';

const router = express.Router();

const updateCampaignSchema = z.object({
  params: z.object({
    type: z.enum(['birthday', 'maintenance', 'reactivation_60d']).optional()
  }).optional(),
  body: z.object({
    name: z.string().min(2).optional(),
    message_template: z.string().min(5).optional(),
    discount_type: z.enum(['percentage', 'fixed']).optional(),
    discount_value: z.number().nonnegative().optional(),
    coupon_validity_days: z.number().int().positive().optional(),
    min_days_inactive: z.number().int().min(15).optional(),
    send_channel: z.enum(['whatsapp', 'push', 'both']).optional(),
    cooldown_days: z.number().int().positive().optional(),
    is_active: z.boolean().optional()
  }),
  query: z.any()
});

const optOutSchema = z.object({
  params: z.object({
    clientId: z.string().uuid().optional()
  }).optional(),
  body: z.object({
    opt_out: z.boolean()
  }),
  query: z.any()
});

// 1. Obter campanhas e estatísticas do salão (Apenas Gestor/Admin)
router.get('/', authMiddleware, async (req, res) => {
  const { tenant_id, role } = req.user;

  if (role !== 'admin' && role !== 'manager' && role !== 'superadmin') {
    return res.status(403).json({ error: 'Acesso negado. Apenas gestores podem gerenciar campanhas.' });
  }

  try {
    const data = await getCampaigns(tenant_id);
    return res.json(data);
  } catch (error) {
    req.log.error(error, 'Erro ao obter campanhas');
    return res.status(500).json({ error: 'Erro ao carregar campanhas automáticas.' });
  }
});

// 2. Atualizar parâmetros de uma campanha (Apenas Gestor/Admin)
router.put('/:type', authMiddleware, validate(updateCampaignSchema), async (req, res) => {
  const { tenant_id, role } = req.user;
  const { type } = req.params;

  if (role !== 'admin' && role !== 'manager' && role !== 'superadmin') {
    return res.status(403).json({ error: 'Acesso negado. Apenas gestores podem editar campanhas.' });
  }

  try {
    const updated = await updateCampaign(tenant_id, type, req.body);
    return res.json(updated);
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    req.log.error(error, 'Erro ao atualizar campanha');
    return res.status(500).json({ error: 'Erro ao atualizar campanha.' });
  }
});

// 3. Executar varredura manual de campanhas (Apenas Gestor/Admin)
router.post('/run', authMiddleware, async (req, res) => {
  const { tenant_id, role } = req.user;

  if (role !== 'admin' && role !== 'manager' && role !== 'superadmin') {
    return res.status(403).json({ error: 'Acesso negado. Apenas gestores podem disparar campanhas.' });
  }

  try {
    const results = await runCampaignScan(tenant_id);
    return res.json({
      success: true,
      message: 'Varredura de campanhas executada com sucesso!',
      results
    });
  } catch (error) {
    req.log.error(error, 'Erro ao executar varredura de campanhas');
    return res.status(500).json({ 
      error: error.message || 'Erro ao executar varredura de campanhas.'
    });
  }
});

// 4. Histórico detalhado de envios e consumo
router.get('/history', authMiddleware, async (req, res) => {
  const { tenant_id, role } = req.user;
  const { limit, offset, type } = req.query;

  if (role !== 'admin' && role !== 'manager' && role !== 'superadmin') {
    return res.status(403).json({ error: 'Acesso negado.' });
  }

  try {
    const logs = await getCampaignLogs(tenant_id, {
      limit: parseInt(limit, 10) || 50,
      offset: parseInt(offset, 10) || 0,
      type: type || null
    });
    return res.json(logs);
  } catch (error) {
    req.log.error(error, 'Erro ao buscar histórico de campanhas');
    return res.status(500).json({ error: 'Erro ao carregar histórico.' });
  }
});

// 5. Configurar Opt-Out de marketing da cliente
router.post('/clients/:clientId/opt-out', authMiddleware, validate(optOutSchema), async (req, res) => {
  const { tenant_id, role, id: userId } = req.user;
  const { clientId } = req.params;
  const { opt_out } = req.body;

  // Apenas a própria cliente ou gestor
  if (role === 'client' && userId !== clientId) {
    return res.status(403).json({ error: 'Você só pode alterar seu próprio status de opt-out.' });
  }

  try {
    const updated = await toggleClientOptOut(tenant_id, clientId, opt_out);
    return res.json(updated);
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    req.log.error(error, 'Erro ao alterar opt-out de marketing');
    return res.status(500).json({ error: 'Erro ao atualizar preferência de marketing.' });
  }
});

export default router;
