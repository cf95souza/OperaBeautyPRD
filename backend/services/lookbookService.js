import pool from '../config/db.js';

export const listLookbooks = async (tenantId) => {
  const query = `
    SELECT l.id, l.image_url, l.title, l.description, l.created_at,
           s.id as service_id, s.name as service_name, s.duration_minutes, s.price,
           st.id as staff_id, st.name as staff_name
    FROM public.cap_lookbook l
    LEFT JOIN public.cap_services s ON l.service_id = s.id
    LEFT JOIN public.cap_staff st ON l.staff_id = st.id
    WHERE l.tenant_id = $1
    ORDER BY l.created_at DESC
  `;
  const result = await pool.query(query, [tenantId]);
  return result.rows;
};

export const createLookbook = async (tenantId, { image_url, title, description, service_id, staff_id }) => {
  const query = `
    INSERT INTO public.cap_lookbook (tenant_id, image_url, title, description, service_id, staff_id)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id, tenant_id, image_url, title, description, service_id, staff_id
  `;
  const result = await pool.query(query, [
    tenantId, 
    image_url, 
    title || null, 
    description || null, 
    service_id || null, 
    staff_id || null
  ]);
  return result.rows[0];
};

export const deleteLookbook = async (tenantId, id) => {
  const check = await pool.query('SELECT id FROM public.cap_lookbook WHERE id = $1 AND tenant_id = $2', [id, tenantId]);
  if (check.rows.length === 0) {
    const error = new Error('Foto não encontrada.');
    error.statusCode = 404;
    throw error;
  }

  const query = `DELETE FROM public.cap_lookbook WHERE id = $1 AND tenant_id = $2 RETURNING id`;
  const result = await pool.query(query, [id, tenantId]);
  return result.rows[0];
};
