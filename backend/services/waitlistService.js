import pool from '../config/db.js';
import { tenantQuery } from '../utils/tenantQuery.js';
import { notifyClient, notifyStaff } from './notificationService.js';
import { createAppointment } from './appointmentService.js';

/**
 * Adiciona cliente à lista de espera de uma data/serviço
 */
export const addToWaitlist = async ({
  tenantId,
  clientId,
  desiredDate,
  serviceId = null,
  professionalId = null,
  preferredTimeRange = 'any'
}) => {
  if (!desiredDate) {
    const error = new Error('A data desejada é obrigatória.');
    error.statusCode = 400;
    throw error;
  }

  // Prevenção de duplicidade: o cliente não pode ter 2 inscrições ativas para o mesmo dia
  const check = await tenantQuery(
    tenantId,
    `SELECT id FROM public.cap_waitlist 
     WHERE tenant_id = $1 AND client_id = $2 AND desired_date = $3 AND status IN ('pending', 'offered')`,
    [tenantId, clientId, desiredDate]
  );

  if (check.rows.length > 0) {
    const error = new Error('Você já está na lista de espera para esta data.');
    error.statusCode = 400;
    throw error;
  }

  const result = await tenantQuery(
    tenantId,
    `INSERT INTO public.cap_waitlist (
       tenant_id, client_id, service_id, professional_id, desired_date, preferred_time_range, status
     ) VALUES ($1, $2, $3, $4, $5, $6, 'pending')
     RETURNING id, desired_date, status, created_at`,
    [tenantId, clientId, serviceId || null, professionalId || null, desiredDate, preferredTimeRange || 'any']
  );

  return result.rows[0];
};

/**
 * Lista entradas da fila de espera do inquilino (visão do gestor)
 */
export const listWaitlist = async (tenantId, status = 'pending', date = null) => {
  if (!tenantId) {
    return [];
  }

  let query = `
    SELECT w.id, w.desired_date, w.status, w.preferred_time_range, w.offered_at, w.expires_at, w.created_at,
           c.id as client_id, c.name as client_name, c.phone as client_phone,
           s.id as service_id, s.name as service_name, s.price as service_price,
           p.id as professional_id, p.name as professional_name
    FROM public.cap_waitlist w
    LEFT JOIN public.cap_clients c ON w.client_id = c.id
    LEFT JOIN public.cap_services s ON w.service_id = s.id
    LEFT JOIN public.cap_staff p ON w.professional_id = p.id
    WHERE w.tenant_id = $1
  `;
  const params = [tenantId];

  if (status && status !== 'all' && status !== 'undefined' && status !== 'null') {
    params.push(status);
    query += ` AND w.status = $${params.length}`;
  }

  // Prevenir erro de sintaxe SQL se date for "undefined", "null" ou formato inválido
  const isValidDate = typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date.trim());
  if (isValidDate) {
    params.push(date.trim());
    query += ` AND w.desired_date = $${params.length}`;
  }

  query += ` ORDER BY w.created_at ASC`;

  const result = await tenantQuery(tenantId, query, params);
  return result.rows || [];
};

/**
 * Consulta as inscrições do cliente logado na lista de espera
 */
export const getMyWaitlist = async (tenantId, clientId) => {
  const query = `
    SELECT w.id, w.desired_date, w.status, w.preferred_time_range, w.offered_at, w.expires_at, w.created_at,
           s.id as service_id, s.name as service_name, s.duration_minutes, s.price as service_price,
           p.id as professional_id, p.name as professional_name
    FROM public.cap_waitlist w
    LEFT JOIN public.cap_services s ON w.service_id = s.id
    LEFT JOIN public.cap_staff p ON w.professional_id = p.id
    WHERE w.tenant_id = $1 AND w.client_id = $2 AND w.status IN ('pending', 'offered')
    ORDER BY w.desired_date ASC, w.created_at ASC
  `;

  const result = await tenantQuery(tenantId, query, [tenantId, clientId]);
  return result.rows;
};

/**
 * Oferece a vaga liberada ao primeiro cliente da fila na ordem de chegada
 */
export const offerNextInWaitlist = async ({ tenantId, date, serviceId = null, staffId = null, startTime = null }) => {
  if (!date) return null;

  const clientDb = await pool.connect();
  try {
    await clientDb.query('BEGIN');

    const dateStr = typeof date === 'string' ? date.split('T')[0] : new Date(date).toISOString().split('T')[0];

    // Busca o primeiro cliente da fila respeitando FIFO (ORDER BY created_at ASC) com lock FOR UPDATE
    let query = `
      SELECT w.id, w.client_id, w.service_id, w.professional_id, w.desired_date,
             c.name as client_name, c.phone as client_phone,
             s.name as service_name,
             t.name as tenant_name, t.slug as tenant_slug
      FROM public.cap_waitlist w
      JOIN public.cap_clients c ON w.client_id = c.id
      LEFT JOIN public.cap_services s ON w.service_id = s.id
      JOIN public.cap_tenants t ON w.tenant_id = t.id
      WHERE w.tenant_id = $1 
        AND w.desired_date = $2 
        AND w.status = 'pending'
    `;
    const params = [tenantId, dateStr];

    if (serviceId) {
      params.push(serviceId);
      query += ` AND (w.service_id IS NULL OR w.service_id = $${params.length})`;
    }

    if (staffId) {
      params.push(staffId);
      query += ` AND (w.professional_id IS NULL OR w.professional_id = $${params.length})`;
    }

    query += ` ORDER BY w.created_at ASC LIMIT 1 FOR UPDATE OF w SKIP LOCKED`;

    const waitlistRes = await clientDb.query(query, params);

    if (waitlistRes.rows.length === 0) {
      await clientDb.query('COMMIT');
      return null;
    }

    const candidate = waitlistRes.rows[0];
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutos de janela exclusiva

    await clientDb.query(
      `UPDATE public.cap_waitlist 
       SET status = 'offered', offered_at = NOW(), expires_at = $1, notified_at = NOW()
       WHERE id = $2`,
      [expiresAt, candidate.id]
    );

    await clientDb.query('COMMIT');

    // 1. Notifica o cliente via Web Push
    const formattedDate = new Date(`${dateStr}T12:00:00Z`).toLocaleDateString('pt-BR');
    const serviceLabel = candidate.service_name || 'seu procedimento';
    const actionUrl = `/${candidate.tenant_slug}/agendar/horarios?waitlistId=${candidate.id}&date=${dateStr}`;

    notifyClient(
      tenantId,
      candidate.client_id,
      '⚡ Vaga Liberada!',
      `Uma vaga para ${serviceLabel} abriu para você no dia ${formattedDate}! Garanta nos próximos 30 min.`,
      actionUrl
    ).catch(err => console.error('Falha ao enviar push para contemplado da lista:', err));

    // 2. Notifica gestores
    const managers = await pool.query(
      `SELECT id FROM public.cap_staff WHERE tenant_id = $1 AND role IN ('manager', 'superadmin')`,
      [tenantId]
    );
    for (const manager of managers.rows) {
      notifyStaff(
        tenantId,
        manager.id,
        '📋 Oferta de Vaga Enviada',
        `Uma vaga liberada em ${formattedDate} foi oferecida a ${candidate.client_name} (Lista de Espera).`
      ).catch(err => console.error(err));
    }

    return {
      waitlistId: candidate.id,
      clientId: candidate.client_id,
      clientName: candidate.client_name,
      expiresAt
    };
  } catch (error) {
    await clientDb.query('ROLLBACK');
    console.error('Erro em offerNextInWaitlist:', error);
    throw error;
  } finally {
    clientDb.release();
  }
};

/**
 * Expira ofertas de lista de espera cujo prazo encerrou e avança a fila
 */
export const expireOffersAndAdvance = async (tenantId = null) => {
  let query = `
    SELECT id, tenant_id, desired_date, service_id, professional_id
    FROM public.cap_waitlist
    WHERE status = 'offered' AND expires_at < NOW()
  `;
  const params = [];
  if (tenantId) {
    params.push(tenantId);
    query += ` AND tenant_id = $1`;
  }

  const expiredRes = await pool.query(query, params);

  for (const entry of expiredRes.rows) {
    await pool.query(
      `UPDATE public.cap_waitlist SET status = 'expired' WHERE id = $1`,
      [entry.id]
    );

    // Oferece a vaga ao próximo da fila
    offerNextInWaitlist({
      tenantId: entry.tenant_id,
      date: entry.desired_date,
      serviceId: entry.service_id,
      staffId: entry.professional_id
    }).catch(err => console.error('Erro ao avançar fila de espera:', err));
  }

  return { expiredCount: expiredRes.rows.length };
};

/**
 * Aceitar a oferta de vaga e converter em agendamento
 */
export const acceptWaitlistOffer = async ({
  tenantId,
  waitlistId,
  clientId,
  start_time,
  staff_id,
  service_id,
  services,
  total_price
}) => {
  const waitlistRes = await pool.query(
    `SELECT id, tenant_id, client_id, service_id, professional_id, desired_date, status, expires_at
     FROM public.cap_waitlist
     WHERE id = $1 AND tenant_id = $2`,
    [waitlistId, tenantId]
  );

  if (waitlistRes.rows.length === 0) {
    const error = new Error('Oferta da lista de espera não encontrada.');
    error.statusCode = 404;
    throw error;
  }

  const entry = waitlistRes.rows[0];

  if (entry.client_id !== clientId) {
    const error = new Error('Acesso negado para esta oferta.');
    error.statusCode = 403;
    throw error;
  }

  if (entry.status === 'expired' || (entry.expires_at && new Date(entry.expires_at) < new Date())) {
    await pool.query(`UPDATE public.cap_waitlist SET status = 'expired' WHERE id = $1`, [waitlistId]);
    const error = new Error('Esta oferta de horário expirou e a vaga foi repassada para o próximo da fila.');
    error.statusCode = 410;
    throw error;
  }

  if (entry.status === 'converted') {
    const error = new Error('Esta vaga já foi confirmada anteriormente.');
    error.statusCode = 400;
    throw error;
  }

  // Cria o agendamento real
  const appt = await createAppointment({
    finalClientId: clientId,
    staff_id: staff_id || entry.professional_id || 'any',
    service_id: service_id || entry.service_id,
    services,
    start_time,
    total_price,
    tenantId
  });

  // Marca a inscrição como convertida
  await pool.query(
    `UPDATE public.cap_waitlist 
     SET status = 'converted', appointment_id = $1 
     WHERE id = $2`,
    [appt.id, waitlistId]
  );

  return appt;
};

/**
 * Cancela a inscrição do cliente na lista de espera
 */
export const cancelWaitlistEntry = async ({ tenantId, waitlistId, clientId, userRole }) => {
  const check = await pool.query(
    `SELECT client_id FROM public.cap_waitlist WHERE id = $1 AND tenant_id = $2`,
    [waitlistId, tenantId]
  );

  if (check.rows.length === 0) {
    const error = new Error('Registro da lista de espera não encontrado.');
    error.statusCode = 404;
    throw error;
  }

  if (userRole === 'client' && check.rows[0].client_id !== clientId) {
    const error = new Error('Acesso negado.');
    error.statusCode = 403;
    throw error;
  }

  const result = await pool.query(
    `UPDATE public.cap_waitlist SET status = 'cancelled' WHERE id = $1 AND tenant_id = $2 RETURNING id, status`,
    [waitlistId, tenantId]
  );

  return result.rows[0];
};
