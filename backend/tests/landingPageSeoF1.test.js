import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Fase 45: F1 (P1) — Landing Page com SEO, Separada do App e Demonstração', () => {
  const robotsPath = path.resolve(__dirname, '../../public/robots.txt');
  const sitemapPath = path.resolve(__dirname, '../../public/sitemap.xml');
  const indexHtmlPath = path.resolve(__dirname, '../../index.html');
  const landingPagePath = path.resolve(__dirname, '../../src/pages/LandingPage.jsx');
  const useSeoPath = path.resolve(__dirname, '../../src/hooks/useSEO.js');

  describe('1. Diretivas de Rastreamento (robots.txt)', () => {
    test('public/robots.txt deve existir e estar configurado corretamente', () => {
      expect(fs.existsSync(robotsPath)).toBe(true);
      const content = fs.readFileSync(robotsPath, 'utf8');

      expect(content).toContain('User-agent: *');
      expect(content).toContain('Allow: /');
      expect(content).toContain('Allow: /planos');
      expect(content).toContain('Allow: /termos');
      expect(content).toContain('Allow: /privacidade');
      expect(content).toContain('Disallow: /api/');
      expect(content).toContain('Disallow: /superadmin/');
      expect(content).toContain('Disallow: /staff/');
      expect(content).toContain('Sitemap: https://operabeauty.com.br/sitemap.xml');
    });
  });

  describe('2. Mapa de Páginas Canônicas (sitemap.xml)', () => {
    test('public/sitemap.xml deve existir e conter URLs canônicas essenciais com prioridades', () => {
      expect(fs.existsSync(sitemapPath)).toBe(true);
      const content = fs.readFileSync(sitemapPath, 'utf8');

      expect(content).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(content).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"');
      expect(content).toContain('<loc>https://operabeauty.com.br/</loc>');
      expect(content).toContain('<loc>https://operabeauty.com.br/planos</loc>');
      expect(content).toContain('<loc>https://operabeauty.com.br/termos</loc>');
      expect(content).toContain('<loc>https://operabeauty.com.br/privacidade</loc>');
      expect(content).toContain('<priority>1.0</priority>');
      expect(content).toContain('<priority>0.9</priority>');
    });
  });

  describe('3. Meta Tags Estáticas e Dados Estruturados em index.html', () => {
    test('index.html deve conter título, descrição, canonical e metatags para crawlers estáticos', () => {
      expect(fs.existsSync(indexHtmlPath)).toBe(true);
      const content = fs.readFileSync(indexHtmlPath, 'utf8');

      // Title e descrição
      expect(content).toContain('<title>OperaBeauty — O Aplicativo e Sistema com a Marca do Seu Salão</title>');
      expect(content).toContain('name="description"');
      expect(content).toContain('rel="canonical" href="https://operabeauty.com.br/"');

      // Open Graph
      expect(content).toContain('property="og:type" content="website"');
      expect(content).toContain('property="og:site_name" content="OperaBeauty"');
      expect(content).toContain('property="og:title"');
      expect(content).toContain('property="og:description"');
      expect(content).toContain('property="og:image"');
      expect(content).toContain('property="og:url" content="https://operabeauty.com.br/"');

      // Twitter Card
      expect(content).toContain('name="twitter:card" content="summary_large_image"');
      expect(content).toContain('name="twitter:title"');
      expect(content).toContain('name="twitter:image"');

      // Schema.org JSON-LD
      expect(content).toContain('type="application/ld+json"');
      expect(content).toContain('"@type": "SoftwareApplication"');
      expect(content).toContain('"@type": "Organization"');
      expect(content).toContain('OperaBeauty SaaS');
    });
  });

  describe('4. Hook de SEO e Injeção Dinâmica (useSEO.js)', () => {
    test('useSEO.js deve suportar título, descrição, canonical link e jsonLd Schema.org', () => {
      expect(fs.existsSync(useSeoPath)).toBe(true);
      const content = fs.readFileSync(useSeoPath, 'utf8');

      expect(content).toContain('canonical');
      expect(content).toContain('jsonLd');
      expect(content).toContain('rel="canonical"');
      expect(content).toContain('application/ld+json');
    });
  });

  describe('5. Landing Page Dinâmica (LandingPage.jsx)', () => {
    test('LandingPage.jsx deve invocar useSEO com FAQPage e dados estruturados', () => {
      expect(fs.existsSync(landingPagePath)).toBe(true);
      const content = fs.readFileSync(landingPagePath, 'utf8');

      expect(content).toContain('useSEO');
      expect(content).toContain('@type\': \'FAQPage');
      expect(content).toContain('@type\': \'SoftwareApplication');
      expect(content).toContain('https://operabeauty.com.br/');
    });

    test('LandingPage.jsx deve conter demonstração animada com 3 abas no smartphone', () => {
      const content = fs.readFileSync(landingPagePath, 'utf8');

      expect(content).toContain('activeDemoTab');
      expect(content).toContain('Agendamento no App');
      expect(content).toContain('Lembrete WhatsApp');
      expect(content).toContain('Clube & Retenção');
      expect(content).toContain('Studio Thaís');
      expect(content).toContain('Confirmar Presença');
    });

    test('LandingPage.jsx deve conter o botão flutuante de WhatsApp para conversão de vendas', () => {
      const content = fs.readFileSync(landingPagePath, 'utf8');

      expect(content).toContain('https://wa.me/5511922928343');
      expect(content).toContain('Falar no WhatsApp');
      expect(content).toContain('MessageCircle');
    });
  });

  describe('6. Distribuição dos Arquivos no Build Final (dist)', () => {
    test('dist/ deve conter index.html, robots.txt e sitemap.xml', () => {
      const distIndex = path.resolve(__dirname, '../../dist/index.html');
      const distRobots = path.resolve(__dirname, '../../dist/robots.txt');
      const distSitemap = path.resolve(__dirname, '../../dist/sitemap.xml');

      expect(fs.existsSync(distIndex)).toBe(true);
      expect(fs.existsSync(distRobots)).toBe(true);
      expect(fs.existsSync(distSitemap)).toBe(true);
    });
  });
});
