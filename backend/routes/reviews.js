import express from 'express';
import pool from '../config/db.js';
import { authMiddleware, requireRole } from '../middlewares/auth.js';

const router = express.Router();

// 1. Cliente posta uma nova avaliação
router.post('/', authMiddleware, requireRole(['client']), async (req, res) => {
  const { appointment_id, rating, comment } = req.body;
  const client_id = req.user.id;
  const tenant_id = req.user.tenant_id;

  if (!appointment_id || !rating || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Dados inválidos.' });
  }

  try {
    // Verificar se o agendamento pertence ao cliente e está concluído
    const apptQuery = await pool.query(
      `SELECT professional_id, status FROM public.cap_appointments 
       WHERE id = $1 AND client_id = $2 AND tenant_id = $3`,
      [appointment_id, client_id, tenant_id]
    );

    if (apptQuery.rows.length === 0) {
      return res.status(404).json({ error: 'Agendamento não encontrado.' });
    }

    if (apptQuery.rows[0].status !== 'completed') {
      return res.status(400).json({ error: 'Apenas agendamentos concluídos podem ser avaliados.' });
    }

    const professional_id = apptQuery.rows[0].professional_id;

    // Inserir a review
    await pool.query(
      `INSERT INTO public.cap_reviews (tenant_id, appointment_id, client_id, professional_id, rating, comment)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [tenant_id, appointment_id, client_id, professional_id, rating, comment || null]
    );

    return res.status(201).json({ message: 'Avaliação enviada com sucesso!' });
  } catch (error) {
    if (error.constraint === 'unique_appointment_review') {
      return res.status(400).json({ error: 'Este agendamento já foi avaliado.' });
    }
    console.error('Erro ao postar review:', error);
    return res.status(500).json({ error: 'Erro interno ao salvar avaliação.' });
  }
});

// 2. Buscar agendamentos pendentes de avaliação para o cliente logado
router.get('/pending', authMiddleware, requireRole(['client']), async (req, res) => {
  const client_id = req.user.id;
  const tenant_id = req.user.tenant_id;

  try {
    // Busca agendamentos concluídos que NÃO existem na tabela de reviews
    // Retorna apenas 1 (o mais recente)
    const pendingQuery = await pool.query(
      `SELECT a.id as appointment_id, a.appointment_date, s.name as service_name, p.name as professional_name
       FROM public.cap_appointments a
       JOIN public.cap_services s ON a.service_id = s.id
       JOIN public.cap_staff p ON a.professional_id = p.id
       LEFT JOIN public.cap_reviews r ON a.id = r.appointment_id
       WHERE a.client_id = $1 AND a.tenant_id = $2 
       AND a.status = 'completed'
       AND r.id IS NULL
       ORDER BY a.appointment_date DESC, a.appointment_time DESC
       LIMIT 1`,
      [client_id, tenant_id]
    );

    if (pendingQuery.rows.length === 0) {
      return res.json(null);
    }

    return res.json(pendingQuery.rows[0]);
  } catch (error) {
    console.error('Erro ao buscar reviews pendentes:', error);
    return res.status(500).json({ error: 'Erro interno' });
  }
});

// 3. Buscar médias de avaliação (Para gestores)
router.get('/stats', authMiddleware, requireRole(['manager', 'superadmin']), async (req, res) => {
  const tenant_id = req.user.tenant_id;

  try {
    // Média geral do salão
    const tenantAvgQuery = await pool.query(
      `SELECT ROUND(AVG(rating), 1) as average, COUNT(*) as total_reviews
       FROM public.cap_reviews WHERE tenant_id = $1`,
      [tenant_id]
    );

    // Média por profissional
    const staffAvgQuery = await pool.query(
      `SELECT p.id, p.name, 
              COALESCE(ROUND(AVG(r.rating), 1), 0) as average, 
              COUNT(r.id) as total_reviews
       FROM public.cap_staff p
       LEFT JOIN public.cap_reviews r ON p.id = r.professional_id
       WHERE p.tenant_id = $1 AND p.role = 'professional'
       GROUP BY p.id, p.name
       ORDER BY average DESC, total_reviews DESC`,
      [tenant_id]
    );

    return res.json({
      tenant: {
        average: parseFloat(tenantAvgQuery.rows[0].average || 0),
        total: parseInt(tenantAvgQuery.rows[0].total_reviews, 10)
      },
      staff: staffAvgQuery.rows.map(s => ({
        ...s,
        average: parseFloat(s.average)
      }))
    });
  } catch (error) {
    console.error('Erro ao buscar stats de reviews:', error);
    return res.status(500).json({ error: 'Erro interno' });
  }
});

export default router;
