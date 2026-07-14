import pool from '../config/db.js';

export const listAppointments = async ({ role, id, userTenantId, targetTenantId, start_date, end_date, staff_id, client_id, limit, offset }) => {
  let queryText = '';
  let queryParams = [];

  if (role === 'client') {
    queryText = `
      SELECT a.id, a.start_time, a.end_time, a.status, a.total_price,
             s.name as service_name, s.duration_minutes,
             st.name as staff_name,
             t.name as tenant_name, t.slug as tenant_slug
      FROM public.cap_appointments a
      JOIN public.cap_services s ON a.service_id = s.id
      JOIN public.cap_staff st ON a.staff_id = st.id
      JOIN public.cap_tenants t ON a.tenant_id = t.id
      WHERE a.client_id = $1 AND a.tenant_id = $2
      ORDER BY a.start_time DESC LIMIT $3 OFFSET $4
    `;
    queryParams = [id, targetTenantId, limit, offset];
  } else {
    queryText = `
      SELECT a.id, a.start_time, a.end_time, a.status, a.total_price, a.staff_commission_value, a.commission_status, a.commission_paid_at,
             s.name as service_name, s.duration_minutes, s.id as service_id, s.maintenance_days,
             st.name as staff_name, st.id as staff_id,
             c.name as client_name, c.phone as client_phone, c.id as client_id
      FROM public.cap_appointments a
      JOIN public.cap_services s ON a.service_id = s.id
      JOIN public.cap_staff st ON a.staff_id = st.id
      JOIN public.cap_clients c ON a.client_id = c.id
      WHERE a.tenant_id = $1
    `;
    queryParams = [targetTenantId];
    let paramIndex = 2;

    if (start_date && end_date) {
      queryText += ` AND a.start_time >= $${paramIndex} AND a.start_time <= $${paramIndex + 1}`;
      queryParams.push(new Date(start_date));
      queryParams.push(new Date(end_date));
      paramIndex += 2;
    }

    if (staff_id) {
      queryText += ` AND a.staff_id = $${paramIndex}`;
      queryParams.push(staff_id);
      paramIndex += 1;
    }

    if (client_id) {
      queryText += ` AND a.client_id = $${paramIndex}`;
      queryParams.push(client_id);
      paramIndex += 1;
    }

    queryParams.push(limit, offset);
    queryText += ` ORDER BY a.start_time ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
  }

  const result = await pool.query(queryText, queryParams);
  return result.rows;
};

export const getOccupiedSlots = async ({ tenant_id, date, staff_id }) => {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  let queryText = `
    SELECT start_time, end_time, staff_id 
    FROM public.cap_appointments 
    WHERE tenant_id = $1 
      AND start_time >= $2 
      AND start_time <= $3 
      AND status != 'cancelled'
  `;
  let queryParams = [tenant_id, startOfDay, endOfDay];

  if (staff_id) {
    queryText += ' AND staff_id = $4';
    queryParams.push(staff_id);
  }

  const result = await pool.query(queryText, queryParams);
  return result.rows;
};

export const getAppointmentById = async ({ id, tenant_id, role, userId }) => {
  const queryText = `
    SELECT a.id, a.start_time, a.end_time, a.status, a.total_price, a.staff_commission_value, a.commission_status, a.commission_paid_at,
           s.name as service_name, s.duration_minutes, s.id as service_id,
           st.name as staff_name, st.id as staff_id,
           c.name as client_name, c.phone as client_phone, c.id as client_id
    FROM public.cap_appointments a
    JOIN public.cap_services s ON a.service_id = s.id
    JOIN public.cap_staff st ON a.staff_id = st.id
    JOIN public.cap_clients c ON a.client_id = c.id
    WHERE a.id = $1 AND a.tenant_id = $2
  `;

  const result = await pool.query(queryText, [id, tenant_id]);

  if (result.rows.length === 0) {
    const error = new Error('Agendamento não encontrado.');
    error.statusCode = 404;
    throw error;
  }

  const appointment = result.rows[0];

  if (role === 'client' && appointment.client_id !== userId) {
    const error = new Error('Acesso negado.');
    error.statusCode = 403;
    throw error;
  }

  return appointment;
};

import { notifyStaff } from './notificationService.js';

export const createAppointment = async ({ finalClientId, staff_id, service_id, start_time, total_price, tenantId }) => {
  const serviceRes = await pool.query('SELECT name, duration_minutes FROM public.cap_services WHERE id = $1 AND tenant_id = $2', [service_id, tenantId]);
  if (serviceRes.rows.length === 0) {
    const error = new Error('Serviço não encontrado.');
    error.statusCode = 404;
    throw error;
  }

  const duration = serviceRes.rows[0].duration_minutes;
  const serviceName = serviceRes.rows[0].name;
  const startTime = new Date(start_time);
  const endTime = new Date(startTime.getTime() + duration * 60 * 1000);

  const result = await pool.query(
    `INSERT INTO public.cap_appointments (tenant_id, client_id, staff_id, service_id, start_time, end_time, status, total_price, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, 'scheduled', $7, NOW())
     RETURNING id, tenant_id, client_id, staff_id, service_id, start_time, end_time, status, total_price, staff_commission_value, created_at`,
    [tenantId, finalClientId, staff_id, service_id, startTime, endTime, total_price]
  );

  const clientRes = await pool.query('SELECT name FROM public.cap_clients WHERE id = $1 AND tenant_id = $2', [finalClientId, tenantId]);
  const clientName = clientRes.rows[0]?.name || 'Um cliente';

  const formattedTime = startTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const formattedDate = startTime.toLocaleDateString('pt-BR');

  // Disparar Push/In-App (não travar o processo principal)
  notifyStaff(
    tenantId, 
    staff_id, 
    'Novo Agendamento 📅', 
    `${clientName} agendou ${serviceName} para ${formattedDate} às ${formattedTime}.`
  ).catch(err => console.error('Falha ao disparar push notification:', err));

  return result.rows[0];
};

export const updateAppointment = async ({ id, tenantId, userRole, userId, staff_id, service_id, start_time, status, total_price }) => {
  const clientConnection = await pool.connect();

  try {
    await clientConnection.query('BEGIN');

    const appQuery = await clientConnection.query(
      'SELECT id, tenant_id, client_id, staff_id, service_id, start_time, end_time, status, total_price, staff_commission_value, created_at FROM public.cap_appointments WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    );

    if (appQuery.rows.length === 0) {
      const error = new Error('Agendamento não encontrado.');
      error.statusCode = 404;
      throw error;
    }

    const currentApp = appQuery.rows[0];

    if (userRole === 'client') {
      if (currentApp.client_id !== userId) {
        const error = new Error('Acesso negado. Você só gerencia seus próprios agendamentos.');
        error.statusCode = 403;
        throw error;
      }
      if (status && status !== 'cancelled') {
        const error = new Error('Clientes só podem alterar o status do agendamento para cancelado.');
        error.statusCode = 403;
        throw error;
      }
    }

    let finalStaffId = staff_id || currentApp.staff_id;
    let finalServiceId = service_id || currentApp.service_id;
    let finalStartTime = start_time ? new Date(start_time) : currentApp.start_time;
    let finalEndTime = currentApp.end_time;
    let finalStatus = status || currentApp.status;
    let finalTotalPrice = total_price !== undefined ? total_price : currentApp.total_price;
    let finalCommissionVal = currentApp.staff_commission_value;

    if (service_id || start_time) {
      const serviceRes = await clientConnection.query('SELECT duration_minutes FROM public.cap_services WHERE id = $1 AND tenant_id = $2', [finalServiceId, tenantId]);
      const duration = serviceRes.rows[0].duration_minutes;
      finalEndTime = new Date(new Date(finalStartTime).getTime() + duration * 60 * 1000);
    }

    if (finalStatus === 'completed' && currentApp.status !== 'completed') {
      const staffRes = await clientConnection.query('SELECT commission_rate FROM public.cap_staff WHERE id = $1 AND tenant_id = $2', [finalStaffId, tenantId]);
      const commissionRate = parseFloat(staffRes.rows[0]?.commission_rate || '0');
      finalCommissionVal = (finalTotalPrice * commissionRate) / 100;

      const serviceDetail = await clientConnection.query('SELECT reduces_stock FROM public.cap_services WHERE id = $1 AND tenant_id = $2', [finalServiceId, tenantId]);
      
      if (serviceDetail.rows[0]?.reduces_stock) {
        const inputsRes = await clientConnection.query(
          'SELECT inventory_id, quantity_consumed FROM public.cap_service_inventory WHERE service_id = $1 AND tenant_id = $2',
          [finalServiceId, tenantId]
        );

        for (const input of inputsRes.rows) {
          await clientConnection.query(
            `UPDATE public.cap_inventory 
             SET quantity = quantity - $1
             WHERE id = $2 AND tenant_id = $3`,
            [parseFloat(input.quantity_consumed), input.inventory_id, tenantId]
          );
        }
      }
    }

    const updateResult = await clientConnection.query(
      `UPDATE public.cap_appointments 
       SET staff_id = $1,
           service_id = $2,
           start_time = $3,
           end_time = $4,
           status = $5,
           total_price = $6,
           staff_commission_value = $7
       WHERE id = $8 AND tenant_id = $9
       RETURNING id, tenant_id, client_id, staff_id, service_id, start_time, end_time, status, total_price, staff_commission_value, commission_status, commission_paid_at, created_at`,
      [finalStaffId, finalServiceId, finalStartTime, finalEndTime, finalStatus, finalTotalPrice, finalCommissionVal, id, tenantId]
    );

    await clientConnection.query('COMMIT');
    return updateResult.rows[0];
  } catch (error) {
    await clientConnection.query('ROLLBACK');
    throw error;
  } finally {
    clientConnection.release();
  }
};

export const deleteAppointment = async ({ id, tenantId, userId, userRole }) => {
  const checkQuery = await pool.query(
    'SELECT client_id FROM public.cap_appointments WHERE id = $1 AND tenant_id = $2',
    [id, tenantId]
  );

  if (checkQuery.rows.length === 0) {
    const error = new Error('Agendamento não encontrado.');
    error.statusCode = 404;
    throw error;
  }

  if (userRole === 'client' && checkQuery.rows[0].client_id !== userId) {
    const error = new Error('Acesso negado. Você só pode cancelar seus próprios agendamentos.');
    error.statusCode = 403;
    throw error;
  }

  const result = await pool.query(
    "UPDATE public.cap_appointments SET status = 'cancelled' WHERE id = $1 AND tenant_id = $2 RETURNING id, tenant_id, client_id, staff_id, service_id, start_time, end_time, status, total_price, staff_commission_value, created_at",
    [id, tenantId]
  );

  return result.rows[0];
};

export const payCommissions = async ({ tenantId, userRole, staff_id }) => {
  if (userRole !== 'manager' && userRole !== 'superadmin') {
    const error = new Error('Acesso negado. Apenas gestores podem fechar comissões.');
    error.statusCode = 403;
    throw error;
  }

  const result = await pool.query(
    `UPDATE public.cap_appointments 
     SET commission_status = 'paid', commission_paid_at = NOW() 
     WHERE tenant_id = $1 AND staff_id = $2 AND commission_status = 'pending' AND status = 'completed'
     RETURNING id`,
    [tenantId, staff_id]
  );

  return { paidCount: result.rowCount };
};
