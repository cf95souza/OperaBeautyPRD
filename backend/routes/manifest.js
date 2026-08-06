import express from 'express';
import pool from '../config/db.js';

const router = express.Router();

/**
 * GET /api/manifest/:slug
 * Gera um manifest.json dinâmico por tenant.
 * 
 * O iOS Safari precisa de um manifest servido via URL real (não data: URI)
 * para manter o modo standalone (PWA) durante navegações internas.
 * 
 * Query params:
 *   ?mode=staff  →  start_url para staff/login
 *   (default)    →  start_url para client/home
 */
router.get('/:slug', async (req, res) => {
  const { slug } = req.params;
  const isStaff = req.query.mode === 'staff';

  try {
    // Busca o nome real do salão para exibir no PWA
    const result = await pool.query(
      'SELECT name, primary_color FROM public.cap_tenants WHERE slug = $1 AND status = $2 LIMIT 1',
      [slug, 'active']
    );

    const tenant = result.rows[0];
    const tenantName = tenant?.name || slug.charAt(0).toUpperCase() + slug.slice(1);
    const themeColor = tenant?.primary_color || '#be185d';

    const pwaName = isStaff ? `${tenantName}` : tenantName;
    const startUrl = isStaff ? `/${slug}/staff/login` : `/${slug}/home`;
    const scope = `/${slug}/`;

    const manifest = {
      name: pwaName,
      short_name: pwaName,
      description: `Aplicativo ${tenantName}`,
      display: 'standalone',
      start_url: startUrl,
      scope: scope,
      theme_color: themeColor,
      background_color: '#ffffff',
      orientation: 'portrait',
      lang: 'pt-BR',
      icons: [
        { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
        { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
        { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
      ]
    };

    res.setHeader('Content-Type', 'application/manifest+json');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    return res.json(manifest);
  } catch (error) {
    console.error('Erro ao gerar manifest:', error);
    // Fallback: retorna manifest genérico para não quebrar o PWA
    const fallback = {
      name: slug,
      short_name: slug,
      display: 'standalone',
      start_url: `/${slug}/`,
      scope: `/${slug}/`,
      theme_color: '#be185d',
      background_color: '#ffffff',
      orientation: 'portrait',
      lang: 'pt-BR',
      icons: [
        { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
        { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' }
      ]
    };
    res.setHeader('Content-Type', 'application/manifest+json');
    return res.json(fallback);
  }
});

export default router;
