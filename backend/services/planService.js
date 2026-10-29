import pool from '../config/db.js';

export const listPlans = async (includeInactive = true) => {
  const whereClause = includeInactive ? '' : 'WHERE p.is_active = TRUE';
  const result = await pool.query(`
    SELECT p.id, p.name, p.slug, p.description, p.price, p.yearly_price, p.sort_order, p.interval, 
           p.max_professionals, p.max_banners, p.max_whatsapp_messages, p.is_featured, p.badge_label,
           p.features, p.marketing_features, p.extra_professional_price, p.is_active,
           (SELECT COUNT(*) FROM public.cap_tenants t WHERE t.plan_id = p.id AND t.status = 'active')::int as subscribers_count,
           (SELECT COALESCE(SUM(t.plan_price), 0) FROM public.cap_tenants t WHERE t.plan_id = p.id AND t.status = 'active')::float as total_mrr
    FROM public.cap_plans p
    ${whereClause}
    ORDER BY COALESCE(p.sort_order, 0) ASC, p.price ASC
  `);
  return result.rows;
};

export const createPlan = async (name, price, yearly_price, sort_order, interval, max_professionals, max_banners, features) => {
  const result = await pool.query(
    `INSERT INTO public.cap_plans (name, price, yearly_price, sort_order, interval, max_professionals, max_banners, features, is_active, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE, NOW())
     RETURNING id, name, price, yearly_price, sort_order, interval, max_professionals, max_banners, features, is_active, created_at`,
    [
      name, 
      parseFloat(price), 
      yearly_price ? parseFloat(yearly_price) : null, 
      sort_order ? parseInt(sort_order, 10) : 0, 
      interval || 'month', 
      max_professionals || null, 
      max_banners || 1, 
      JSON.stringify(features || [])
    ]
  );
  return result.rows[0];
};

export const updatePlan = async (id, name, price, yearly_price, sort_order, interval, max_professionals, max_banners, features, is_active) => {
  const fields = [];
  const values = [];
  let idx = 1;

  if (name !== undefined) {
    fields.push(`name = $${idx++}`);
    values.push(name);
  }
  if (price !== undefined) {
    fields.push(`price = $${idx++}`);
    values.push(parseFloat(price));
  }
  if (yearly_price !== undefined) {
    fields.push(`yearly_price = $${idx++}`);
    values.push(yearly_price === null || yearly_price === '' ? null : parseFloat(yearly_price));
  }
  if (sort_order !== undefined) {
    fields.push(`sort_order = $${idx++}`);
    values.push(parseInt(sort_order, 10));
  }
  if (interval !== undefined) {
    fields.push(`interval = $${idx++}`);
    values.push(interval);
  }
  if (max_professionals !== undefined) {
    fields.push(`max_professionals = $${idx++}`);
    values.push(max_professionals === null || max_professionals === '' ? null : parseInt(max_professionals, 10));
  }
  if (max_banners !== undefined) {
    fields.push(`max_banners = $${idx++}`);
    values.push(max_banners === null || max_banners === '' ? null : parseInt(max_banners, 10));
  }
  if (features !== undefined) {
    fields.push(`features = $${idx++}`);
    values.push(JSON.stringify(features));
  }
  if (is_active !== undefined) {
    fields.push(`is_active = $${idx++}`);
    values.push(Boolean(is_active));
  }

  if (fields.length === 0) {
    const existing = await pool.query('SELECT * FROM public.cap_plans WHERE id = $1', [id]);
    return existing.rows[0];
  }

  values.push(id);
  const sql = `
    UPDATE public.cap_plans
    SET ${fields.join(', ')}
    WHERE id = $${idx}
    RETURNING id, name, price, yearly_price, sort_order, interval, max_professionals, max_banners, features, is_active, created_at
  `;

  const result = await pool.query(sql, values);
  if (result.rows.length === 0) {
    const error = new Error('Plano não encontrado.');
    error.statusCode = 404;
    throw error;
  }

  return result.rows[0];
};

export const reorderPlans = async (orderedIds) => {
  if (!Array.isArray(orderedIds)) return;
  for (let i = 0; i < orderedIds.length; i++) {
    await pool.query('UPDATE public.cap_plans SET sort_order = $1 WHERE id = $2', [i + 1, orderedIds[i]]);
  }
};
