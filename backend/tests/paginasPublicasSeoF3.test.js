import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { jest } from '@jest/globals';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

// Mock isolado do serviço de minisite para testes unitários rápidos sem dependência de Postgres no host
jest.unstable_mockModule('../services/minisiteService.js', () => ({
  getMinisiteData: jest.fn(async (slug) => {
    if (slug === 'salao-inexistente') {
      const error = new Error('Salão não encontrado.');
      error.statusCode = 404;
      throw error;
    }

    return {
      tenant: {
        id: '69d1f386-17ef-490f-9c7c-8b276f27b6d2',
        slug: 'studiothais',
        name: 'Studio Thaís',
        status: 'active',
        meta_title: 'Studio da Tha | Beleza, Estética & Bem-Estar',
        meta_description: 'Agende seu horário no Studio da Tha. Manicure, sobrancelhas e estética com especialistas.',
        meta_image_url: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1200&q=80',
        logo_url: 'https://images.unsplash.com/photo-1560066984-138dadb4c035',
        banner_url: 'https://images.unsplash.com/photo-1560066984-138dadb4c035',
        headline: 'Realçando sua beleza natural com sofisticação!',
        about_text: 'No Studio da Tha, cada atendimento é uma experiência acolhedora.',
        welcome_message: 'Bem-vindo ao salão. Agende seu próximo momento abaixo.',
        address: 'Av. Paulista, 1000 - São Paulo, SP',
        social_whatsapp: '(11) 99999-9999',
        rating: '5.0',
        total_reviews: 8
      },
      businessHours: [
        { day_of_week: 1, open_time: '09:00:00', close_time: '18:00:00', is_closed: false },
        { day_of_week: 2, open_time: '09:00:00', close_time: '18:00:00', is_closed: false }
      ],
      featuredServices: [
        { id: '1', name: 'Corte', price: '45.00', duration_minutes: 60 },
        { id: '2', name: 'Escova', price: '50.00', duration_minutes: 60 }
      ],
      seo: {
        title: 'Studio da Tha | Beleza, Estética & Bem-Estar',
        description: 'Agende seu horário no Studio da Tha.',
        image: 'https://images.unsplash.com/photo-1560066984-138dadb4c035',
        url: '/studiothais/site'
      }
    };
  }),
  updateMinisiteSettings: jest.fn()
}));

const { renderTenantSeoHtml } = await import('../services/seoRendererService.js');

describe('Fase 45: F3 (P2) — Páginas Públicas dos Salões com SEO Dinâmico e OpenGraph SSR', () => {

  describe('1. Serviço de Renderização HTML (renderTenantSeoHtml)', () => {
    test('Deve renderizar HTML completo para o mini-site do salão com meta tags do salão', async () => {
      const html = await renderTenantSeoHtml({ 
        slug: 'studiothais', 
        subpath: 'site', 
        origin: 'https://operabeauty.com.br' 
      });

      expect(html).toContain('<!doctype html>');
      expect(html).toContain('<html lang="pt-BR">');
      expect(html).toContain('<meta property="og:site_name" content="Studio Thaís" />');
      expect(html).toContain('<meta property="og:url" content="https://operabeauty.com.br/studiothais/site" />');
      expect(html).toContain('<link rel="canonical" href="https://operabeauty.com.br/studiothais/site" />');
      expect(html).toContain('content="summary_large_image"');
      expect(html).toContain('<meta property="og:image"');
      expect(html).toContain('Studio da Tha');
    });

    test('Deve renderizar Schema.org BeautySalon válido em JSON-LD', async () => {
      const html = await renderTenantSeoHtml({ 
        slug: 'studiothais', 
        subpath: 'site', 
        origin: 'https://operabeauty.com.br' 
      });

      expect(html).toContain('"@type": "BeautySalon"');
      expect(html).toContain('"name": "Studio Thaís"');
      expect(html).toContain('"@context": "https://schema.org"');
      expect(html).toContain('aggregateRating');
      expect(html).toContain('openingHoursSpecification');
      expect(html).toContain('Av. Paulista, 1000 - São Paulo, SP');
    });

    test('Deve suportar alias de demonstração demo e subpath home', async () => {
      const htmlHome = await renderTenantSeoHtml({ 
        slug: 'demo', 
        subpath: 'home', 
        origin: 'https://operabeauty.com.br' 
      });

      expect(htmlHome).toContain('Studio Thaís | Agendamento Online &amp; Clube de Fidelidade');
      expect(htmlHome).toContain('https://operabeauty.com.br/demo');
    });
  });

  describe('2. Rotas do Backend Express (backend/routes/seo.js & backend/app.js)', () => {
    const seoRoutePath = path.join(rootDir, 'backend/routes/seo.js');
    const appPath = path.join(rootDir, 'backend/app.js');

    test('Arquivo routes/seo.js deve existir e conter endpoints de render e preview', () => {
      expect(fs.existsSync(seoRoutePath)).toBe(true);
      const content = fs.readFileSync(seoRoutePath, 'utf8');
      expect(content).toContain('/render/:slug/:subpath?');
      expect(content).toContain('/tenant/:slug/:subpath?');
      expect(content).toContain('renderTenantSeoHtml');
      expect(content).toContain("res.setHeader('Content-Type', 'text/html; charset=utf-8');");
    });

    test('app.js deve registrar a rota /api/seo', () => {
      const content = fs.readFileSync(appPath, 'utf8');
      expect(content).toContain("import seoRoutes from './routes/seo.js';");
      expect(content).toContain("app.use('/api/seo', seoRoutes);");
    });
  });

  describe('3. SEO Dinâmico Client-side em MiniSiteSalao.jsx e HomeCliente.jsx', () => {
    const minisitePath = path.join(rootDir, 'src/pages/MiniSiteSalao.jsx');
    const homeClientePath = path.join(rootDir, 'src/pages/HomeCliente.jsx');

    test('MiniSiteSalao.jsx deve enriquecer useSEO com BeautySalon Schema.org e canonical', () => {
      const content = fs.readFileSync(minisitePath, 'utf8');
      expect(content).toContain("useSEO");
      expect(content).toContain("'@type': 'BeautySalon'");
      expect(content).toContain("canonical:");
      expect(content).toContain("jsonLd: jsonLdData");
    });

    test('HomeCliente.jsx deve acoplar useSEO dinâmico com o nome do salão', () => {
      const content = fs.readFileSync(homeClientePath, 'utf8');
      expect(content).toContain("import { useSEO } from '../hooks/useSEO';");
      expect(content).toContain("useSEO({");
      expect(content).toContain("tenant?.name");
      expect(content).toContain("Agendamento Online");
    });
  });

  describe('4. Configuração de Roteamento de Bots no Caddyfile', () => {
    const caddyPath = path.join(rootDir, 'Caddyfile');

    test('Caddyfile deve conter matcher @social_crawlers cobrindo WhatsApp, Facebook, Telegram e Twitter', () => {
      const content = fs.readFileSync(caddyPath, 'utf8');
      expect(content).toContain('@social_crawlers');
      expect(content).toContain('whatsapp');
      expect(content).toContain('facebookexternalhit');
      expect(content).toContain('twitterbot');
      expect(content).toContain('telegrambot');
      expect(content).toContain('googlebot');
    });

    test('Caddyfile deve encaminhar requisições de robôs sociais para /api/seo/render{path}', () => {
      const content = fs.readFileSync(caddyPath, 'utf8');
      expect(content).toContain('rewrite * /api/seo/render{path}');
      expect(content).toContain('reverse_proxy api:5000');
    });
  });

});
