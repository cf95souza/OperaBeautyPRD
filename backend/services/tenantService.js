import pool from '../config/db.js';

export const getTenantBySlug = async (slug) => {
  const result = await pool.query(
    `SELECT t.id, t.slug, t.name, t.status, t.plan_price, t.logo_url, t.primary_color, t.secondary_color, t.tertiary_color, 
            t.banner_url, t.banner_title, t.banner_subtitle, t.banners, t.welcome_message, t.created_at, t.plan_id,
            t.address, t.social_instagram, t.social_facebook, t.social_whatsapp,
            p.max_banners, p.max_professionals
     FROM public.cap_tenants t
     LEFT JOIN public.cap_plans p ON p.id = t.plan_id
     WHERE t.slug = $1`,
    [slug]
  );

  if (result.rows.length === 0) {
    const error = new Error('Salão não encontrado.');
    error.statusCode = 404;
    throw error;
  }

  const tenant = result.rows[0];

  if (tenant.status !== 'active') {
    const error = new Error('Este estabelecimento está temporariamente suspenso.');
    error.statusCode = 403;
    throw error;
  }

  return tenant;
};

export const updateBranding = async (
  tenant_id, 
  name, 
  primary_color, 
  secondary_color, 
  tertiary_color, 
  logo_url, 
  banners, 
  welcome_message,
  address,
  social_instagram,
  social_facebook,
  social_whatsapp
) => {
  const planCheck = await pool.query(
    `SELECT p.max_banners 
     FROM public.cap_tenants t
     LEFT JOIN public.cap_plans p ON p.id = t.plan_id
     WHERE t.id = $1`,
    [tenant_id]
  );
  
  const maxBannersAllowed = planCheck.rows[0]?.max_banners ?? 1;

  if (banners && Array.isArray(banners) && banners.length > maxBannersAllowed) {
    const error = new Error(`O seu plano permite no máximo ${maxBannersAllowed} banner(s).`);
    error.statusCode = 400;
    throw error;
  }

  const bannersJson = banners ? JSON.stringify(banners) : null;
  const firstBanner = banners && banners[0] ? banners[0] : null;
  const legacyUrl = firstBanner ? firstBanner.url : '';
  const legacyTitle = firstBanner ? firstBanner.title : '';
  const legacySubtitle = firstBanner ? firstBanner.subtitle : '';

  const result = await pool.query(
    `UPDATE public.cap_tenants 
     SET name = COALESCE($1, name),
         primary_color = COALESCE($2, primary_color),
         secondary_color = COALESCE($3, secondary_color),
         tertiary_color = COALESCE($4, tertiary_color),
         logo_url = COALESCE($5, logo_url),
         banners = COALESCE($6, banners),
         banner_url = COALESCE($7, banner_url),
         banner_title = COALESCE($8, banner_title),
         banner_subtitle = COALESCE($9, banner_subtitle),
         welcome_message = COALESCE($10, welcome_message),
         address = $11,
         social_instagram = $12,
         social_facebook = $13,
         social_whatsapp = $14
     WHERE id = $15
     RETURNING id, slug, name, status, plan_price, plan_id, logo_url, primary_color, secondary_color, tertiary_color, banners, banner_url, banner_title, banner_subtitle, welcome_message, address, social_instagram, social_facebook, social_whatsapp, created_at`,
    [
      name, 
      primary_color, 
      secondary_color, 
      tertiary_color, 
      logo_url, 
      bannersJson, 
      banners ? legacyUrl : null, 
      banners ? legacyTitle : null, 
      banners ? legacySubtitle : null, 
      welcome_message, 
      address,
      social_instagram,
      social_facebook,
      social_whatsapp,
      tenant_id
    ]
  );

  if (result.rows.length === 0) {
    const error = new Error('Salão não encontrado.');
    error.statusCode = 404;
    throw error;
  }

  return result.rows[0];
};
