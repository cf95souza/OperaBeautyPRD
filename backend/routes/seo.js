import express from 'express';
import { renderTenantSeoHtml } from '../services/seoRendererService.js';
import { getMinisiteData } from '../services/minisiteService.js';
import { resolveDemoSlug } from '../services/tenantService.js';

const router = express.Router();

/**
 * Endpoint de pré-renderização de HTML com Open Graph, Twitter Cards e Schema.org
 * Utilizado por robôs de redes sociais (WhatsApp, Facebook, Twitter, Telegram, Googlebot)
 * e também para testes diretos de SSR (F3 / D20).
 */
router.get('/render/:slug/:subpath?', async (req, res) => {
  const { slug, subpath } = req.params;
  const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:8080';
  const origin = `${protocol}://${host}`;

  try {
    const html = await renderTenantSeoHtml({ 
      slug, 
      subpath: subpath || 'site', 
      origin 
    });

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=600, s-maxage=1800');
    return res.status(200).send(html);
  } catch (error) {
    if (error.statusCode === 404) {
      return res.status(404).send(`<!doctype html><html><head><title>Salão Não Encontrado</title></head><body style="font-family: sans-serif; text-align: center; padding: 50px;"><h1>Salão não encontrado</h1><p>O estabelecimento solicitado não existe ou está temporariamente indisponível.</p><a href="/">Voltar ao início</a></body></html>`);
    }
    req.log?.error?.(error, 'Erro ao renderizar HTML de SEO do salão');
    return res.status(500).send('Erro interno ao gerar página de compartilhamento.');
  }
});

/**
 * Endpoint JSON retornando dados consolidados de SEO e Schema.org para o salão
 */
router.get('/tenant/:slug/:subpath?', async (req, res) => {
  const { slug, subpath } = req.params;
  const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:8080';
  const origin = `${protocol}://${host}`;

  try {
    const cleanSlug = resolveDemoSlug(slug);
    const data = await getMinisiteData(cleanSlug);
    const tenant = data.tenant;
    const targetSubpath = subpath || 'site';
    const canonicalUrl = `${origin}/${tenant.slug}/${targetSubpath}`;

    return res.json({
      title: tenant.meta_title || `${tenant.name} | Beleza, Estética & Bem-Estar`,
      description: tenant.meta_description || tenant.headline || tenant.about_text || 'Agende online com profissionais especialistas.',
      image: tenant.meta_image_url || tenant.logo_url,
      canonicalUrl,
      tenantId: tenant.id,
      slug: tenant.slug,
      name: tenant.name,
      rating: tenant.rating,
      totalReviews: tenant.total_reviews,
      minisiteEnabled: tenant.minisite_enabled
    });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    return res.status(500).json({ error: 'Erro ao obter dados de SEO do salão.' });
  }
});

export default router;
