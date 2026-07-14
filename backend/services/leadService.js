import pool from '../config/db.js';

export const createLead = async (name, email, phone, salon_name) => {
  const result = await pool.query(
    `INSERT INTO public.cap_leads (name, email, phone, salon_name, status, created_at)
     VALUES ($1, $2, $3, $4, 'new', NOW())
     RETURNING id, name, email, phone, salon_name, status, created_at`,
    [name, email, phone, salon_name || null]
  );
  return result.rows[0];
};

export const listLeads = async (limit, offset) => {
  const result = await pool.query(
    'SELECT id, name, email, phone, salon_name, status, created_at FROM public.cap_leads ORDER BY created_at DESC LIMIT $1 OFFSET $2',
    [limit, offset]
  );
  return result.rows;
};
