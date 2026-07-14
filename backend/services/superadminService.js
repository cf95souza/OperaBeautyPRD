import pool from '../config/db.js';
import { encrypt } from '../utils/crypto.js';

export const getDashboardMetrics = async () => {
  const tenantsCount = await pool.query("SELECT COUNT(*) FROM public.cap_tenants");
  const activeTenantsCount = await pool.query("SELECT COUNT(*) FROM public.cap_tenants WHERE status = 'active'");
  const totalStaffCount = await pool.query("SELECT COUNT(*) FROM public.cap_staff WHERE is_active = TRUE");
  const totalClientsCount = await pool.query("SELECT COUNT(*) FROM public.cap_clients");
  const uniqueClientsCount = await pool.query("SELECT COUNT(DISTINCT phone) FROM public.cap_clients");
  
  const invoicesPaid = await pool.query("SELECT SUM(amount) as paid FROM public.cap_invoices WHERE status = 'paid'");
  const invoicesPending = await pool.query("SELECT SUM(amount) as pending FROM public.cap_invoices WHERE status = 'pending'");

  return {
    total_tenants: parseInt(tenantsCount.rows[0].count),
    active_tenants: parseInt(activeTenantsCount.rows[0].count),
    total_staff: parseInt(totalStaffCount.rows[0].count),
    total_clients: parseInt(totalClientsCount.rows[0].count),
    unique_clients: parseInt(uniqueClientsCount.rows[0].count),
    earnings_paid: parseFloat(invoicesPaid.rows[0].paid || '0'),
    earnings_pending: parseFloat(invoicesPending.rows[0].pending || '0')
  };
};

export const listTenantsWithStats = async () => {
  const result = await pool.query(`
    SELECT t.id, t.slug, t.name, t.status, t.plan_price, t.plan_id, t.primary_color, t.secondary_color, t.created_at,
           (SELECT COUNT(*) FROM public.cap_staff s WHERE s.tenant_id = t.id AND s.is_active = TRUE) as staff_count,
           (SELECT COUNT(*) FROM public.cap_clients c WHERE c.tenant_id = t.id) as client_count
    FROM public.cap_tenants t
    ORDER BY t.created_at DESC
  `);
  return result.rows;
};

export const getTenantById = async (id) => {
  const result = await pool.query('SELECT id, slug, name, status, plan_price, plan_id, logo_url, primary_color, secondary_color, tertiary_color, banners, banner_url, banner_title, banner_subtitle, welcome_message, address, social_instagram, social_facebook, social_whatsapp, created_at FROM public.cap_tenants WHERE id = $1', [id]);
  if (result.rows.length === 0) {
    const error = new Error('Salão não encontrado.');
    error.statusCode = 404;
    throw error;
  }
  return result.rows[0];
};

export const createTenant = async (name, slug, plan_price, plan_id, welcome_message, primary_color, secondary_color) => {
  const existCheck = await pool.query('SELECT id FROM public.cap_tenants WHERE slug = $1', [slug]);
  if (existCheck.rows.length > 0) {
    const error = new Error('Este link único (slug) já está sendo utilizado por outro salão.');
    error.statusCode = 409;
    throw error;
  }

  const result = await pool.query(
    `INSERT INTO public.cap_tenants (name, slug, status, plan_price, plan_id, welcome_message, primary_color, secondary_color, created_at)
     VALUES ($1, $2, 'active', $3, $4, $5, $6, $7, NOW())
     RETURNING id, slug, name, status, plan_price, plan_id, logo_url, primary_color, secondary_color, tertiary_color, banners, banner_url, banner_title, banner_subtitle, welcome_message, address, social_instagram, social_facebook, social_whatsapp, created_at`,
    [name, slug, parseFloat(plan_price || 59.99), plan_id || null, welcome_message || '', primary_color || '#7c5357', secondary_color || '#eeb9bd']
  );

  return result.rows[0];
};

export const updateTenant = async (id, name, slug, status, plan_price, plan_id, primary_color, secondary_color) => {
  const result = await pool.query(
    `UPDATE public.cap_tenants 
     SET name = COALESCE($1, name),
         slug = COALESCE($2, slug),
         status = COALESCE($3, status),
         plan_price = COALESCE($4, plan_price),
         plan_id = COALESCE($5, plan_id),
         primary_color = COALESCE($6, primary_color),
         secondary_color = COALESCE($7, secondary_color)
     WHERE id = $8 RETURNING id, slug, name, status, plan_price, plan_id, logo_url, primary_color, secondary_color, tertiary_color, banners, banner_url, banner_title, banner_subtitle, welcome_message, address, social_instagram, social_facebook, social_whatsapp, created_at`,
    [name, slug, status, plan_price !== undefined ? parseFloat(plan_price) : null, plan_id, primary_color, secondary_color, id]
  );

  if (result.rows.length === 0) {
    const error = new Error('Salão não encontrado.');
    error.statusCode = 404;
    throw error;
  }

  return result.rows[0];
};

export const deleteTenant = async (id) => {
  const result = await pool.query(
    `DELETE FROM public.cap_tenants WHERE id = $1 RETURNING id, name`,
    [id]
  );

  if (result.rows.length === 0) {
    const error = new Error('Salão não encontrado.');
    error.statusCode = 404;
    throw error;
  }

  return result.rows[0];
};

export const resetStaffPassword = async (id, password) => {
  const result = await pool.query(
    `UPDATE public.cap_staff 
     SET password_hash = crypt($1, gen_salt('bf'))
     WHERE id = $2
     RETURNING id, name`,
    [password, id]
  );

  if (result.rows.length === 0) {
    const error = new Error('Membro da equipe não encontrado.');
    error.statusCode = 404;
    throw error;
  }

  return result.rows[0];
};

export const createInitialStaff = async (tenant_id, name, phone, email, password, role) => {
  const result = await pool.query(
    'SELECT cap_register_staff($1, $2, $3, $4, $5, $6) AS staff_id',
    [tenant_id, name, phone, email, password, role]
  );

  return {
    id: result.rows[0].staff_id,
    name,
    phone,
    email,
    role,
    is_active: true
  };
};

export const getPlatformSettings = async () => {
  const result = await pool.query('SELECT id, payment_gateway, gateway_api_key, gateway_public_key FROM public.cap_platform_settings LIMIT 1');
  if (result.rows.length === 0) {
    return null;
  }
  const settings = result.rows[0];
  if (settings.gateway_api_key) {
    settings.gateway_api_key = '****' + settings.gateway_api_key.slice(-4);
  }
  return settings;
};

export const savePlatformSettings = async (payment_gateway, gateway_api_key, gateway_public_key) => {
  const encryptedApiKey = encrypt(gateway_api_key);
  const check = await pool.query('SELECT id FROM public.cap_platform_settings LIMIT 1');
  let result;
  if (check.rows.length > 0) {
    result = await pool.query(
      `UPDATE public.cap_platform_settings 
       SET payment_gateway = $1, gateway_api_key = $2, gateway_public_key = $3, updated_at = NOW() 
       WHERE id = $4 
       RETURNING id, payment_gateway, gateway_api_key, gateway_public_key`,
      [payment_gateway, encryptedApiKey, gateway_public_key, check.rows[0].id]
    );
  } else {
    result = await pool.query(
      `INSERT INTO public.cap_platform_settings (payment_gateway, gateway_api_key, gateway_public_key, updated_at) 
       VALUES ($1, $2, $3, NOW()) 
       RETURNING id, payment_gateway, gateway_api_key, gateway_public_key`,
      [payment_gateway, encryptedApiKey, gateway_public_key]
    );
  }
  const settings = result.rows[0];
  if (settings.gateway_api_key) {
    settings.gateway_api_key = '****' + settings.gateway_api_key.slice(-4);
  }
  return settings;
};
