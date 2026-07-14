import pool from '../config/db.js';

export const listPlans = async () => {
  const result = await pool.query(
    'SELECT id, name, price, interval, max_professionals, max_banners, features, is_active FROM public.cap_plans WHERE is_active = TRUE ORDER BY price ASC'
  );
  return result.rows;
};

export const createPlan = async (name, price, interval, max_professionals, max_banners, features) => {
  const result = await pool.query(
    `INSERT INTO public.cap_plans (name, price, interval, max_professionals, max_banners, features, is_active, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, TRUE, NOW())
     RETURNING id, name, price, interval, max_professionals, max_banners, features, is_active, created_at`,
    [name, parseFloat(price), interval || 'month', max_professionals || null, max_banners || 1, JSON.stringify(features || [])]
  );
  return result.rows[0];
};

export const updatePlan = async (id, name, price, interval, max_professionals, max_banners, features, is_active) => {
  const result = await pool.query(
    `UPDATE public.cap_plans 
     SET name = $1, 
         price = $2, 
         interval = $3, 
         max_professionals = $4, 
         max_banners = $5,
         features = $6,
         is_active = COALESCE($7, is_active)
     WHERE id = $8
     RETURNING id, name, price, interval, max_professionals, max_banners, features, is_active, created_at`,
    [name, parseFloat(price), interval, max_professionals, max_banners, JSON.stringify(features), is_active, id]
  );

  if (result.rows.length === 0) {
    const error = new Error('Plano não encontrado.');
    error.statusCode = 404;
    throw error;
  }

  return result.rows[0];
};
