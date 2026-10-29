import { getMinisiteData } from './minisiteService.js';
import { resolveDemoSlug } from './tenantService.js';

const DIAS_SEMANA_SCHEMA = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday'
];

/**
 * Escapa strings para prevenção de XSS e injeção em atributos HTML
 */
const escapeHtml = (str) => {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

/**
 * Gera o documento HTML completo com meta tags dinâmicas de SEO, Open Graph, Twitter Cards
 * e dados estruturados Schema.org (BeautySalon) para compartilhamento em redes sociais e indexação.
 * Atende ao requisito F3 (P2) e D20 do Plano de Melhorias.
 * 
 * @param {Object} params
 * @param {string} params.slug - Identificador único ou alias do salão (ex.: studiothais, demo)
 * @param {string} [params.subpath='site'] - Sub-rota acessada (ex.: 'site', 'home', '')
 * @param {string} [params.origin='https://operabeauty.com.br'] - Domínio base do sistema
 * @returns {Promise<string>} Documento HTML pré-renderizado
 */
export const renderTenantSeoHtml = async ({ slug, subpath = 'site', origin = 'https://operabeauty.com.br' }) => {
  const cleanSlug = resolveDemoSlug(slug);
  const data = await getMinisiteData(cleanSlug);

  const tenant = data.tenant;
  const canonicalPath = subpath && subpath !== 'home' ? `/${slug}/${subpath}` : `/${slug}`;
  const canonicalUrl = `${origin}${canonicalPath}`;

  // Determina título e descrição contextuais
  let pageTitle = tenant.meta_title;
  let pageDescription = tenant.meta_description;

  if (subpath === 'home') {
    pageTitle = `${tenant.name} | Agendamento Online & Clube de Fidelidade`;
    pageDescription = tenant.welcome_message || `Agende serviços no ${tenant.name} com confirmação automática, acumule cashback e acompanhe seus horários.`;
  } else {
    pageTitle = pageTitle || `${tenant.name} | Beleza, Estética & Bem-Estar`;
    pageDescription = pageDescription || tenant.headline || tenant.about_text || `Conheça o espaço ${tenant.name}, confira os serviços em destaque e reserve seu horário online.`;
  }

  const shareImage = tenant.meta_image_url || tenant.logo_url || 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1200&q=80';

  // Montagem do Schema.org BeautySalon (JSON-LD)
  const schemaOrg = {
    '@context': 'https://schema.org',
    '@type': 'BeautySalon',
    '@id': `${canonicalUrl}#salon`,
    'name': tenant.name,
    'description': pageDescription,
    'image': shareImage,
    'url': canonicalUrl,
    'telephone': tenant.social_whatsapp || undefined,
    'priceRange': '$$',
    'address': tenant.address ? {
      '@type': 'PostalAddress',
      'streetAddress': tenant.address,
      'addressCountry': 'BR'
    } : undefined
  };

  if (tenant.rating && Number(tenant.rating) > 0) {
    schemaOrg.aggregateRating = {
      '@type': 'AggregateRating',
      'ratingValue': String(tenant.rating),
      'reviewCount': String(tenant.total_reviews || 1),
      'bestRating': '5',
      'worstRating': '1'
    };
  }

  if (Array.isArray(data.businessHours) && data.businessHours.length > 0) {
    schemaOrg.openingHoursSpecification = data.businessHours
      .filter(h => !h.is_closed)
      .map(h => ({
        '@type': 'OpeningHoursSpecification',
        'dayOfWeek': DIAS_SEMANA_SCHEMA[h.day_of_week] || 'Monday',
        'opens': h.open_time ? h.open_time.substring(0, 5) : '09:00',
        'closes': h.close_time ? h.close_time.substring(0, 5) : '18:00'
      }));
  }

  // Lista de serviços destacados para o noscript/crawlers
  const featuredServicesHtml = Array.isArray(data.featuredServices)
    ? data.featuredServices.slice(0, 8).map(s => `<li><strong>${escapeHtml(s.name)}</strong> - R$ ${Number(s.price || 0).toFixed(2)} (${s.duration_minutes || 60} min)</li>`).join('\n')
    : '';

  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <title>${escapeHtml(pageTitle)}</title>
    <meta name="description" content="${escapeHtml(pageDescription)}" />
    <meta name="robots" content="index, follow" />
    <link rel="canonical" href="${escapeHtml(canonicalUrl)}" />

    <!-- Open Graph / Redes Sociais (WhatsApp, Facebook, LinkedIn, Telegram) -->
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="${escapeHtml(tenant.name)}" />
    <meta property="og:title" content="${escapeHtml(pageTitle)}" />
    <meta property="og:description" content="${escapeHtml(pageDescription)}" />
    <meta property="og:image" content="${escapeHtml(shareImage)}" />
    <meta property="og:url" content="${escapeHtml(canonicalUrl)}" />
    <meta property="og:locale" content="pt_BR" />

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(pageTitle)}" />
    <meta name="twitter:description" content="${escapeHtml(pageDescription)}" />
    <meta name="twitter:image" content="${escapeHtml(shareImage)}" />

    <!-- Cores e Identidade do Salão (White Label) -->
    <meta name="theme-color" content="${escapeHtml(tenant.primary_color || '#1F1B1C')}" />

    <!-- Dados Estruturados Schema.org (JSON-LD) -->
    <script type="application/ld+json">
${JSON.stringify(schemaOrg, null, 2)}
    </script>
  </head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #FAF6F0; color: #2B2327;">
    <div id="root"></div>
    <noscript>
      <div style="max-width: 680px; margin: 40px auto; padding: 24px; background: #fff; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.06);">
        <h1 style="margin-top: 0; color: #8E3B4E;">${escapeHtml(tenant.name)}</h1>
        <p style="font-size: 16px; line-height: 1.5;">${escapeHtml(tenant.about_text || tenant.headline || pageDescription)}</p>
        ${tenant.address ? `<p><strong>Endereço:</strong> ${escapeHtml(tenant.address)}</p>` : ''}
        ${tenant.social_whatsapp ? `<p><strong>WhatsApp:</strong> ${escapeHtml(tenant.social_whatsapp)}</p>` : ''}
        ${featuredServicesHtml ? `<h3>Serviços em Destaque:</h3><ul>${featuredServicesHtml}</ul>` : ''}
        <p><a href="${escapeHtml(canonicalUrl)}" style="display: inline-block; padding: 12px 24px; background: #8E3B4E; color: #fff; text-decoration: none; border-radius: 9999px; font-weight: bold;">Agendar Horário Online</a></p>
      </div>
    </noscript>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>`;
};
