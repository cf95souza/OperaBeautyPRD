import express from 'express';
import pool from '../config/db.js';
import { authMiddleware, requireRole } from '../middlewares/auth.js';

const router = express.Router();

// Middleware to ensure user is a manager (to see reports)
const managerOnly = requireRole(['manager', 'superadmin']);

// 1. Taxa de Retenção de Clientes (Últimos 30 dias)
router.get('/bi/retention', authMiddleware, managerOnly, async (req, res) => {
  try {
    const { tenant_id } = req.user;

    // Busca clientes únicos que agendaram nos últimos 30 dias
    const currentMonthClients = await pool.query(`
      SELECT DISTINCT client_id 
      FROM public.cap_appointments 
      WHERE tenant_id = $1 
      AND appointment_date >= CURRENT_DATE - INTERVAL '30 days'
      AND status IN ('completed', 'confirmed')
    `, [tenant_id]);

    const activeClients = currentMonthClients.rows.map(row => row.client_id);
    const totalActive = activeClients.length;

    if (totalActive === 0) {
      return res.json({ retained: 0, new: 0, total: 0, retainedPercentage: 0 });
    }

    // Desses ativos, quantos já tinham agendamentos antes de 30 dias atrás? (Retidos)
    const retainedQuery = await pool.query(`
      SELECT COUNT(DISTINCT client_id) as retained_count
      FROM public.cap_appointments
      WHERE tenant_id = $1
      AND client_id = ANY($2::uuid[])
      AND appointment_date < CURRENT_DATE - INTERVAL '30 days'
      AND status IN ('completed', 'confirmed')
    `, [tenant_id, activeClients]);

    const retainedCount = parseInt(retainedQuery.rows[0].retained_count, 10);
    const newCount = totalActive - retainedCount;
    const retainedPercentage = Math.round((retainedCount / totalActive) * 100);

    return res.json({
      retained: retainedCount,
      new: newCount,
      total: totalActive,
      retainedPercentage
    });
  } catch (error) {
    console.error("Erro no relatório de retenção:", error);
    return res.status(500).json({ error: 'Erro ao gerar relatório de retenção' });
  }
});

// 2. Ranking de Profissionais (Faturamento e Cancelamentos) - Últimos 30 dias
router.get('/bi/staff-ranking', authMiddleware, managerOnly, async (req, res) => {
  try {
    const { tenant_id } = req.user;

    // Obtém o faturamento e cancelamentos por profissional nos últimos 30 dias
    const rankingQuery = await pool.query(`
      WITH completed_revenue AS (
        SELECT 
          professional_id, 
          COALESCE(SUM(total_price), 0) as revenue,
          COUNT(*) as completed_count
        FROM public.cap_appointments
        WHERE tenant_id = $1
        AND appointment_date >= CURRENT_DATE - INTERVAL '30 days'
        AND status = 'completed'
        GROUP BY professional_id
      ),
      cancelled_stats AS (
        SELECT 
          professional_id,
          COUNT(*) as cancelled_count
        FROM public.cap_appointments
        WHERE tenant_id = $1
        AND appointment_date >= CURRENT_DATE - INTERVAL '30 days'
        AND status = 'cancelled'
        GROUP BY professional_id
      ),
      total_stats AS (
        SELECT 
          professional_id,
          COUNT(*) as total_count
        FROM public.cap_appointments
        WHERE tenant_id = $1
        AND appointment_date >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY professional_id
      )
      
      SELECT 
        s.id, 
        s.name,
        COALESCE(cr.revenue, 0) as revenue,
        COALESCE(cr.completed_count, 0) as completed,
        COALESCE(cs.cancelled_count, 0) as cancelled,
        COALESCE(ts.total_count, 0) as total,
        CASE WHEN COALESCE(ts.total_count, 0) > 0 
             THEN ROUND((COALESCE(cs.cancelled_count, 0)::numeric / ts.total_count::numeric) * 100, 1)
             ELSE 0 
        END as cancellation_rate
      FROM public.cap_staff s
      LEFT JOIN completed_revenue cr ON s.id = cr.professional_id
      LEFT JOIN cancelled_stats cs ON s.id = cs.professional_id
      LEFT JOIN total_stats ts ON s.id = ts.professional_id
      WHERE s.tenant_id = $1 AND s.role = 'professional'
      ORDER BY revenue DESC
    `, [tenant_id]);

    return res.json(rankingQuery.rows.map(row => ({
      ...row,
      revenue: parseFloat(row.revenue),
      cancellation_rate: parseFloat(row.cancellation_rate)
    })));
  } catch (error) {
    console.error("Erro no relatório de ranking:", error);
    return res.status(500).json({ error: 'Erro ao gerar ranking de profissionais' });
  }
});

// 3. Mapa de Calor (Ociosidade Estratégica) - Últimos 30 dias
router.get('/bi/heatmap', authMiddleware, managerOnly, async (req, res) => {
  try {
    const { tenant_id } = req.user;

    // Pega a distribuição de agendamentos (qualquer status não cancelado) por dia da semana e hora
    const heatmapQuery = await pool.query(`
      SELECT 
        EXTRACT(ISODOW FROM appointment_date) as day_of_week, 
        EXTRACT(HOUR FROM appointment_time) as hour_of_day,
        COUNT(*) as appointment_count
      FROM public.cap_appointments
      WHERE tenant_id = $1
      AND appointment_date >= CURRENT_DATE - INTERVAL '30 days'
      AND status != 'cancelled'
      GROUP BY day_of_week, hour_of_day
      ORDER BY day_of_week, hour_of_day
    `, [tenant_id]);

    // Format output: Array of { day: 1-7, hour: 0-23, count: X }
    const heatmap = heatmapQuery.rows.map(row => ({
      day: parseInt(row.day_of_week, 10), // 1 (Monday) to 7 (Sunday)
      hour: parseInt(row.hour_of_day, 10),
      count: parseInt(row.appointment_count, 10)
    }));

    return res.json(heatmap);
  } catch (error) {
    console.error("Erro no mapa de calor:", error);
    return res.status(500).json({ error: 'Erro ao gerar mapa de calor' });
  }
});

export default router;
