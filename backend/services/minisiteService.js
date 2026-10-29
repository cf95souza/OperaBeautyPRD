import pool from '../config/db.js';
import redisClient from '../config/redis.js';
import { resolveDemoSlug } from './tenantService.js';

/**
 * Retorna os dados consolidados do mini-site público do salão.
 * @param {string} rawSlug - Identificador amigável do salão
 * @returns {Promise<Object>} Dados estruturados para o mini-site
 */
export const getMinisiteData = async (rawSlug) => {
  const isDemo = ['demo', 'studiodemo', 'studiothais', 'studiodatha'].includes(String(rawSlug || '').trim().toLowerCase());
  const slug = resolveDemoSlug(rawSlug);
  const cacheKey = `minisite:${slug}`;
  try {
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (isDemo) parsed.is_demo = true;
      return parsed;
    }
  } catch (err) {
    // Falha silenciosa no cache Redis
  }

  // 1. Dados institucionais do Salão
  const tenantRes = await pool.query(
    `SELECT 
        id, slug, name, status, logo_url,
        theme_id, brand_hex, primary_color, secondary_color, tertiary_color,
        banners, welcome_message,
        address, social_instagram, social_facebook, social_whatsapp,
        google_review_url, google_maps_url,
        headline, about_text, minisite_gallery,
        meta_title, meta_description, meta_image_url,
        minisite_enabled,
        waiting_menu_enabled, waiting_menu_items
     FROM public.cap_tenants
     WHERE slug = $1 LIMIT 1`,
    [slug]
  );

  if (tenantRes.rows.length === 0) {
    const error = new Error('Salão não encontrado.');
    error.statusCode = 404;
    throw error;
  }

  const tenant = tenantRes.rows[0];

  if (tenant.status !== 'active') {
    const error = new Error('Este estabelecimento está temporariamente indisponível.');
    error.statusCode = 403;
    throw error;
  }

  const tenantId = tenant.id;

  // 2. Média e Top Avaliações Públicas (D16)
  const reviewsStatsRes = await pool.query(
    `SELECT 
        ROUND(AVG(rating), 1) as average_rating,
        COUNT(id) as total_reviews
     FROM public.cap_reviews
     WHERE tenant_id = $1`,
    [tenantId]
  );

  const topReviewsRes = await pool.query(
    `SELECT 
        r.id, r.rating, r.comment, r.created_at, r.staff_reply, r.replied_at,
        c.name as client_name,
        s.name as service_name
     FROM public.cap_reviews r
     LEFT JOIN public.cap_clients c ON c.id = r.client_id
     LEFT JOIN public.cap_services s ON s.id = r.service_id
     WHERE r.tenant_id = $1 AND r.is_public = TRUE AND r.rating >= 4
     ORDER BY r.rating DESC, r.created_at DESC
     LIMIT 6`,
    [tenantId]
  );

  // 3. Trabalhos do Lookbook / Vitrine
  const lookbookRes = await pool.query(
    `SELECT l.id, l.title, l.description, l.image_url, s.name as service_name
     FROM public.cap_lookbook l
     LEFT JOIN public.cap_services s ON s.id = l.service_id
     WHERE l.tenant_id = $1
     ORDER BY l.created_at DESC
     LIMIT 8`,
    [tenantId]
  );

  // 4. Horários de Funcionamento da Semana
  const hoursRes = await pool.query(
    `SELECT day_of_week, open_time, close_time, is_closed
     FROM public.cap_business_hours
     WHERE tenant_id = $1
     ORDER BY day_of_week ASC`,
    [tenantId]
  );

  // 5. Equipe do Salão
  const staffRes = await pool.query(
    `SELECT id, name, role, commission_rate
     FROM public.cap_staff
     WHERE tenant_id = $1 AND is_active = TRUE
     ORDER BY name ASC`,
    [tenantId]
  );

  // 6. Principais Serviços em Destaque
  const servicesRes = await pool.query(
    `SELECT id, name, short_description, price, duration_minutes, is_starting_price
     FROM public.cap_services
     WHERE tenant_id = $1 AND is_active = TRUE
     ORDER BY price ASC
     LIMIT 8`,
    [tenantId]
  );

  const payload = {
    tenant: {
      ...tenant,
      rating: parseFloat(reviewsStatsRes.rows[0]?.average_rating || 0),
      total_reviews: parseInt(reviewsStatsRes.rows[0]?.total_reviews || 0, 10),
    },
    reviews: topReviewsRes.rows.map(r => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.created_at,
      staffReply: r.staff_reply,
      clientName: r.client_name ? r.client_name.split(' ')[0] + ' ' + (r.client_name.split(' ')[1] ? r.client_name.split(' ')[1][0] + '.' : '') : 'Cliente',
      serviceName: r.service_name || null
    })),
    lookbook: lookbookRes.rows,
    businessHours: hoursRes.rows,
    staff: staffRes.rows.map(s => ({
      id: s.id,
      name: s.name,
      role: s.role === 'admin' ? 'Fundadora & Especialista' : s.role === 'manager' ? 'Gestora & Especialista' : 'Profissional Especialista',
      photoUrl: s.photo_url || null
    })),
    featuredServices: servicesRes.rows,
    seo: {
      title: tenant.meta_title || `${tenant.name} | Beleza, Estética & Bem-Estar`,
      description: tenant.meta_description || tenant.headline || tenant.about_text || 'Agende seu horário com nossos profissionais especialistas.',
      image: tenant.meta_image_url || tenant.logo_url || 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1200&q=80',
      url: `/${tenant.slug}/site`
    }
  };

  if (isDemo) {
    payload.is_demo = true;
  }

  try {
    // Cache de 15 minutos (900s)
    await redisClient.setex(cacheKey, 900, JSON.stringify(payload));
  } catch (err) {
    // Falha silenciosa
  }

  return payload;
};

/**
 * Atualiza as configurações do mini-site e SEO do salão.
 * @param {string} tenantId - UUID do salão
 * @param {Object} data - Parâmetros a serem atualizados
 */
export const updateMinisiteSettings = async (tenantId, data) => {
  const {
    headline,
    about_text,
    minisite_gallery,
    google_maps_url,
    meta_title,
    meta_description,
    meta_image_url,
    minisite_enabled
  } = data;

  const result = await pool.query(
    `UPDATE public.cap_tenants
     SET 
        headline = COALESCE($1, headline),
        about_text = COALESCE($2, about_text),
        minisite_gallery = COALESCE($3, minisite_gallery),
        google_maps_url = COALESCE($4, google_maps_url),
        meta_title = COALESCE($5, meta_title),
        meta_description = COALESCE($6, meta_description),
        meta_image_url = COALESCE($7, meta_image_url),
        minisite_enabled = COALESCE($8, minisite_enabled)
     WHERE id = $9
     RETURNING id, slug, name, headline, about_text, minisite_gallery, google_maps_url, meta_title, meta_description, meta_image_url, minisite_enabled`,
    [
      headline !== undefined ? headline : null,
      about_text !== undefined ? about_text : null,
      minisite_gallery !== undefined ? JSON.stringify(minisite_gallery) : null,
      google_maps_url !== undefined ? google_maps_url : null,
      meta_title !== undefined ? meta_title : null,
      meta_description !== undefined ? meta_description : null,
      meta_image_url !== undefined ? meta_image_url : null,
      minisite_enabled !== undefined ? minisite_enabled : null,
      tenantId
    ]
  );

  if (result.rows.length === 0) {
    const error = new Error('Salão não encontrado.');
    error.statusCode = 404;
    throw error;
  }

  const updated = result.rows[0];

  // Invalidação atômica de cache
  try {
    await redisClient.del(`minisite:${updated.slug}`);
    await redisClient.del(`tenant_slug:${updated.slug}`);
  } catch (err) {
    // Falha silenciosa
  }

  return updated;
};
