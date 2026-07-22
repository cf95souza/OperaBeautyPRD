import pool from '../config/db.js';

export const listClients = async (tenantId, limit, offset) => {
  const result = await pool.query(
    `SELECT 
        c.id, c.name, c.phone, c.birth_date, c.vip_tier, c.created_at,
        COUNT(a.id) FILTER (WHERE a.status = 'completed') as visits,
        COALESCE(SUM(a.total_price) FILTER (WHERE a.status = 'completed'), 0) as ltv
     FROM public.cap_clients c
     LEFT JOIN public.cap_appointments a ON c.id = a.client_id
     WHERE c.tenant_id = $1
     GROUP BY c.id
     ORDER BY c.name LIMIT $2 OFFSET $3`,
    [tenantId, limit, offset]
  );
  return result.rows;
};

export const updateMe = async (userId, tenantId, name, birth_date) => {
  const result = await pool.query(
    `UPDATE public.cap_clients 
     SET name = $1, birth_date = $2
     WHERE id = $3 AND tenant_id = $4
     RETURNING id, name, birth_date`,
    [name, birth_date || null, userId, tenantId]
  );
  return result.rows[0];
};

export const updateClientPassword = async (clientId, tenantId, password) => {
  await pool.query(
    'SELECT cap_update_client_password($1, $2, $3)',
    [clientId, tenantId, password]
  );
};

export const getClientById = async (id, tenantId, userId, userRole) => {
  if (userRole === 'client' && userId !== id) {
    const error = new Error('Acesso negado. Você só pode visualizar seus próprios dados.');
    error.statusCode = 403;
    throw error;
  }

  const result = await pool.query(
    'SELECT id, name, phone, birth_date, anamnese_data, vip_tier, created_at FROM public.cap_clients WHERE id = $1 AND tenant_id = $2',
    [id, tenantId]
  );

  if (result.rows.length === 0) {
    const error = new Error('Cliente não encontrado.');
    error.statusCode = 404;
    throw error;
  }

  return result.rows[0];
};

export const updateClient = async (id, tenantId, userId, userRole, name, phone, birth_date, vip_tier) => {
  if (userRole === 'client' && userId !== id) {
    const error = new Error('Acesso negado. Você só pode atualizar seus próprios dados.');
    error.statusCode = 403;
    throw error;
  }

  // Apenas equipe administrativa pode alterar a categoria VIP
  const isStaff = userRole === 'manager' || userRole === 'professional';
  const finalVipTier = isStaff ? vip_tier : undefined;

  const result = await pool.query(
    `UPDATE public.cap_clients 
     SET name = COALESCE($1, name),
         phone = COALESCE($2, phone),
         birth_date = COALESCE($3, birth_date),
         vip_tier = COALESCE($4, vip_tier)
     WHERE id = $5 AND tenant_id = $6
     RETURNING id, name, phone, birth_date, vip_tier`,
    [name, phone, birth_date || null, finalVipTier || null, id, tenantId]
  );

  if (result.rows.length === 0) {
    const error = new Error('Cliente não encontrado ou acesso negado.');
    error.statusCode = 404;
    throw error;
  }

  return result.rows[0];
};

export const updateAnamnese = async (id, tenantId, anamnese_data) => {
  const result = await pool.query(
    `UPDATE public.cap_clients 
     SET anamnese_data = $1
     WHERE id = $2 AND tenant_id = $3
     RETURNING id, name, anamnese_data`,
    [JSON.stringify(anamnese_data), id, tenantId]
  );

  if (result.rows.length === 0) {
    const error = new Error('Cliente não encontrado.');
    error.statusCode = 404;
    throw error;
  }

  return result.rows[0];
};

export const getClientTimeline = async (id, tenantId) => {
  const result = await pool.query(
    `SELECT n.id, n.content, n.image_path, n.created_at, n.appointment_id, 
            a.start_time as appointment_date,
            json_build_object('name', COALESCE(s.name, s2.name)) as cap_staff
     FROM public.cap_timeline_notes n
     LEFT JOIN public.cap_appointments a ON n.appointment_id = a.id
     LEFT JOIN public.cap_staff s ON n.staff_id = s.id
     LEFT JOIN public.cap_staff s2 ON a.staff_id = s2.id
     WHERE n.client_id = $1 AND n.tenant_id = $2
     ORDER BY n.created_at DESC`,
    [id, tenantId]
  );
  return result.rows;
};

export const createTimelineNote = async (id, tenantId, staffId, content, appointment_id, image_path) => {
  const result = await pool.query(
    `INSERT INTO public.cap_timeline_notes (tenant_id, client_id, appointment_id, staff_id, content, image_path, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW())
     RETURNING id, tenant_id, client_id, appointment_id, staff_id, content, image_path, created_at`,
    [tenantId, id, appointment_id || null, staffId || null, content, image_path || null]
  );
  return result.rows[0];
};

export const deleteTimelineNote = async (noteId, tenantId) => {
  await pool.query(
    'DELETE FROM public.cap_timeline_notes WHERE id = $1 AND tenant_id = $2',
    [noteId, tenantId]
  );
};

// LGPD Compliance (FINDING-27)
export const exportClientData = async (userId, tenantId) => {
  const profile = await pool.query('SELECT name, phone, birth_date, anamnese_data, created_at FROM public.cap_clients WHERE id = $1 AND tenant_id = $2', [userId, tenantId]);
  const appointments = await pool.query('SELECT id, status, total_price, start_time, end_time, created_at FROM public.cap_appointments WHERE client_id = $1 AND tenant_id = $2', [userId, tenantId]);
  const timeline = await pool.query('SELECT id, content, created_at FROM public.cap_timeline_notes WHERE client_id = $1 AND tenant_id = $2', [userId, tenantId]);
  
  if (profile.rows.length === 0) throw new Error('Cliente não encontrado.');
  
  return {
    perfil: profile.rows[0],
    agendamentos: appointments.rows,
    prontuario: timeline.rows
  };
};

export const anonymizeClient = async (userId, tenantId) => {
  // Gera um telefone falso para manter a restrição de NOT NULL e possível UNIQUE, ex: DEL-a1b2c3d4
  const deletedPhone = `DEL-${userId.substring(0, 8)}`;
  const result = await pool.query(`
    UPDATE public.cap_clients
    SET name = 'ANÔNIMO (LGPD)',
        phone = $3,
        email = NULL,
        password_hash = NULL,
        anamnese_data = '{}'::jsonb
    WHERE id = $1 AND tenant_id = $2
    RETURNING id
  `, [userId, tenantId, deletedPhone]);
  
  if (result.rows.length === 0) throw new Error('Cliente não encontrado.');
  return result.rows[0];
};
