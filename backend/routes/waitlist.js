import express from 'express';
import pool from '../config/db.js';
import { authMiddleware, requireRole } from '../middlewares/auth.js';

const router = express.Router();

// 1. Cliente entra na fila de espera
router.post('/', authMiddleware, requireRole(['client']), async (req, res) => {
  const { desired_date, service_id, professional_id } = req.body;
  const client_id = req.user.id;
  const tenant_id = req.user.tenant_id;

  if (!desired_date) {
    return res.status(400).json({ error: 'A data desejada é obrigatória.' });
  }

  try {
    // Verifica se já está na fila para esse dia
    const check = await pool.query(
      `SELECT id FROM public.cap_waitlist WHERE tenant_id = $1 AND client_id = $2 AND desired_date = $3 AND status = 'pending'`,
      [tenant_id, client_id, desired_date]
    );

    if (check.rows.length > 0) {
      return res.status(400).json({ error: 'Você já está na lista de espera para esta data.' });
    }

    const result = await pool.query(
      `INSERT INTO public.cap_waitlist (tenant_id, client_id, service_id, professional_id, desired_date)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [tenant_id, client_id, service_id || null, professional_id || null, desired_date]
    );

    return res.status(201).json({ message: 'Adicionado à lista de espera com sucesso!', id: result.rows[0].id });
  } catch (error) {
    console.error('Erro ao entrar na waitlist:', error);
    return res.status(500).json({ error: 'Erro interno' });
  }
});

// 2. Gestor lista a fila de espera
router.get('/', authMiddleware, requireRole(['manager', 'superadmin', 'professional']), async (req, res) => {
  const tenant_id = req.user.tenant_id;
  const { status = 'pending', date } = req.query;

  try {
    let query = `
      SELECT w.id, w.desired_date, w.status, w.created_at,
             c.name as client_name, c.phone as client_phone,
             s.name as service_name, p.name as professional_name
      FROM public.cap_waitlist w
      JOIN public.cap_clients c ON w.client_id = c.id
      LEFT JOIN public.cap_services s ON w.service_id = s.id
      LEFT JOIN public.cap_staff p ON w.professional_id = p.id
      WHERE w.tenant_id = $1 AND w.status = $2
    `;
    const params = [tenant_id, status];

    if (date) {
      params.push(date);
      query += ` AND w.desired_date = $3`;
    }

    query += ` ORDER BY w.created_at ASC`;

    const result = await pool.query(query, params);
    return res.json(result.rows);
  } catch (error) {
    console.error('Erro ao listar waitlist:', error);
    return res.status(500).json({ error: 'Erro interno' });
  }
});

// 3. Gestor atualiza o status de um pedido da fila
router.put('/:id', authMiddleware, requireRole(['manager', 'superadmin', 'professional']), async (req, res) => {
  const tenant_id = req.user.tenant_id;
  const { id } = req.params;
  const { status } = req.body;

  if (!['pending', 'fulfilled', 'cancelled'].includes(status)) {
    return res.status(400).json({ error: 'Status inválido' });
  }

  try {
    const result = await pool.query(
      `UPDATE public.cap_waitlist SET status = $1 WHERE id = $2 AND tenant_id = $3 RETURNING id`,
      [status, id, tenant_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Registro não encontrado' });
    }

    return res.json({ message: 'Status atualizado com sucesso' });
  } catch (error) {
    console.error('Erro ao atualizar waitlist:', error);
    return res.status(500).json({ error: 'Erro interno' });
  }
});

export default router;
