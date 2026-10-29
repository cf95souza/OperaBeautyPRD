import express from 'express';
import { z } from 'zod';
import { validate } from '../middlewares/validate.js';
import { authMiddleware, requireRole } from '../middlewares/auth.js';
import {
  getMonthlyImpactReport,
  sendImpactReportWhatsApp,
  getRetentionReport,
  getStaffRankingReport,
  getServicesRankingReport,
  getHeatmapReport
} from '../services/reportService.js';

const router = express.Router();
const managerOnly = requireRole(['manager', 'superadmin']);

const monthlyImpactQuerySchema = z.object({
  query: z.object({
    year: z.coerce.number().int().min(2020).max(2100).optional(),
    month: z.coerce.number().int().min(1).max(12).optional(),
    tenant_id: z.string().uuid().optional() // Para superadmin inspecionar salões
  }),
  body: z.any(),
  params: z.any()
});

const sendImpactWhatsAppSchema = z.object({
  body: z.object({
    year: z.coerce.number().int().min(2020).max(2100).optional(),
    month: z.coerce.number().int().min(1).max(12).optional(),
    phone: z.string().min(10).optional().nullable()
  }),
  query: z.any(),
  params: z.any()
});

// 1. Relatório Mensal "Impacto OperaBeauty" (Item D9 P1)
router.get(
  '/monthly-impact',
  authMiddleware,
  managerOnly,
  validate(monthlyImpactQuerySchema),
  async (req, res) => {
    try {
      const { year, month, tenant_id: targetTenantId } = req.query;
      const tenantId = req.user.role === 'superadmin' && targetTenantId 
        ? targetTenantId 
        : req.user.tenant_id;

      if (!tenantId) {
        return res.status(400).json({ error: 'Tenant ID é obrigatório.' });
      }

      const report = await getMonthlyImpactReport(tenantId, year, month);
      return res.json(report);
    } catch (error) {
      if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
      req.log?.error(error, 'Erro ao gerar relatório mensal de impacto');
      return res.status(500).json({ error: 'Erro interno ao gerar relatório de impacto.' });
    }
  }
);

// 2. Disparo do Resumo por WhatsApp para o Gestor (D9 P1)
router.post(
  '/monthly-impact/send-whatsapp',
  authMiddleware,
  managerOnly,
  validate(sendImpactWhatsAppSchema),
  async (req, res) => {
    try {
      const { year, month, phone } = req.body;
      const tenantId = req.user.tenant_id;

      const result = await sendImpactReportWhatsApp(tenantId, year, month, phone);
      return res.json(result);
    } catch (error) {
      if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
      req.log?.error(error, 'Erro ao enviar relatório de impacto via WhatsApp');
      return res.status(500).json({ error: error.message || 'Erro interno ao enviar WhatsApp.' });
    }
  }
);

// 3. Taxa de Retenção de Clientes (Últimos 30 dias - BI)
router.get('/bi/retention', authMiddleware, managerOnly, async (req, res) => {
  try {
    const { tenant_id } = req.user;
    const data = await getRetentionReport(tenant_id);
    return res.json(data);
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    req.log?.error(error, 'Erro no relatório de retenção');
    return res.status(500).json({ error: 'Erro ao gerar relatório de retenção' });
  }
});

// 4. Ranking de Profissionais (Últimos 30 dias - BI)
router.get('/bi/staff-ranking', authMiddleware, managerOnly, async (req, res) => {
  try {
    const { tenant_id } = req.user;
    const ranking = await getStaffRankingReport(tenant_id);
    return res.json(ranking);
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    req.log?.error(error, 'Erro no ranking de staff');
    return res.status(500).json({ error: 'Erro ao gerar ranking de equipe' });
  }
});

// 5. Ranking de Serviços mais Populares (Últimos 30 dias - BI)
router.get('/bi/services-ranking', authMiddleware, managerOnly, async (req, res) => {
  try {
    const { tenant_id } = req.user;
    const ranking = await getServicesRankingReport(tenant_id);
    return res.json(ranking);
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    req.log?.error(error, 'Erro no ranking de serviços');
    return res.status(500).json({ error: 'Erro ao gerar ranking de serviços' });
  }
});

// 6. Mapa de Calor / Ociosidade de Horários (Últimos 30 dias - BI)
router.get('/bi/heatmap', authMiddleware, managerOnly, async (req, res) => {
  try {
    const { tenant_id } = req.user;
    const heatmap = await getHeatmapReport(tenant_id);
    return res.json(heatmap);
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    req.log?.error(error, 'Erro ao gerar mapa de calor');
    return res.status(500).json({ error: 'Erro ao gerar mapa de calor de ociosidade.' });
  }
});

export default router;
