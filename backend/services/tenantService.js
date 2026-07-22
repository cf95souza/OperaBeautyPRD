import pool from '../config/db.js';
import { getActiveFlagsForTenant } from './featureFlagService.js';
import redisClient from '../config/redis.js';

export const getTenantBySlug = async (slug) => {
  const cacheKey = `tenant_slug:${slug}`;
  const cachedData = await redisClient.get(cacheKey);

  if (cachedData) {
    return JSON.parse(cachedData);
  }

  const result = await pool.query(
    `SELECT t.id, t.slug, t.name, t.status, t.plan_price, t.logo_url, t.primary_color, t.secondary_color, t.tertiary_color, 
            t.banner_url, t.banner_title, t.banner_subtitle, t.banners, t.welcome_message, t.created_at, t.plan_id,
            t.address, t.social_instagram, t.social_facebook, t.social_whatsapp,
            t.cashback_percentage, t.cashback_expiration_days,
            t.waiting_menu_enabled, t.waiting_menu_items,
            p.max_banners, p.max_professionals, p.features as plan_features
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

  // Obter as flags ativas para este Tenant
  const dbFlags = await getActiveFlagsForTenant(tenant.id);
  const planFeatures = tenant.plan_features || [];
  
  tenant.features = { ...dbFlags };
  planFeatures.forEach(feat => {
    tenant.features[feat] = true;
  });

  // Obter média de avaliações do Tenant
  const ratingResult = await pool.query(
    `SELECT ROUND(AVG(rating), 1) as average, COUNT(id) as total_reviews FROM public.cap_reviews WHERE tenant_id = $1`,
    [tenant.id]
  );
  tenant.rating = parseFloat(ratingResult.rows[0].average || 0);
  tenant.total_reviews = parseInt(ratingResult.rows[0].total_reviews || 0, 10);

  // TTL de 30 minutos (1800 segundos) para os dados públicos do salão
  await redisClient.setex(cacheKey, 1800, JSON.stringify(tenant));

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
  social_whatsapp,
  cashback_percentage,
  cashback_expiration_days,
  waiting_menu_enabled,
  waiting_menu_items
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
         social_whatsapp = $14,
         cashback_percentage = COALESCE($15, cashback_percentage),
         cashback_expiration_days = COALESCE($16, cashback_expiration_days),
         waiting_menu_enabled = COALESCE($17, waiting_menu_enabled),
         waiting_menu_items = COALESCE($18, waiting_menu_items)
     WHERE id = $19
     RETURNING id, slug, name, status, plan_price, plan_id, logo_url, primary_color, secondary_color, tertiary_color, banners, banner_url, banner_title, banner_subtitle, welcome_message, address, social_instagram, social_facebook, social_whatsapp, cashback_percentage, cashback_expiration_days, waiting_menu_enabled, waiting_menu_items, created_at`,
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
      cashback_percentage !== undefined ? parseFloat(cashback_percentage) : null,
      cashback_expiration_days !== undefined ? parseInt(cashback_expiration_days) : null,
      waiting_menu_enabled !== undefined ? waiting_menu_enabled : null,
      waiting_menu_items ? JSON.stringify(waiting_menu_items) : null,
      tenant_id
    ]
  );

  if (result.rows.length === 0) {
    const error = new Error('Salão não encontrado.');
    error.statusCode = 404;
    throw error;
  }
  
  // Invalidar cache
  await redisClient.del(`tenant_slug:${result.rows[0].slug}`);

  return result.rows[0];
};
