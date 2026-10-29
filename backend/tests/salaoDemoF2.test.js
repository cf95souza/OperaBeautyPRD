import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { resolveDemoSlug } from '../services/tenantService.js';
import { isDemoTenantSlug } from '../../src/lib/demoUtils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

describe('Fase 45: F2 (P1) — Salão de Demonstração Público ("Studio Demo") e QR Code', () => {

  describe('1. Resolução Canônica de Slugs Demo (resolveDemoSlug)', () => {
    test('Deve mapear aliases de demonstração para o tenant demo studiothais', () => {
      expect(resolveDemoSlug('demo')).toBe('studiothais');
      expect(resolveDemoSlug('DEMO')).toBe('studiothais');
      expect(resolveDemoSlug('studiodemo')).toBe('studiothais');
      expect(resolveDemoSlug('studiodatha')).toBe('studiothais');
      expect(resolveDemoSlug('studiothais')).toBe('studiothais');
    });

    test('Deve manter slugs de outros salões inalterados', () => {
      expect(resolveDemoSlug('atelietodabonita')).toBe('atelietodabonita');
      expect(resolveDemoSlug('salao-premier')).toBe('salao-premier');
      expect(resolveDemoSlug(null)).toBeNull();
    });
  });

  describe('2. Validação da Função isDemoTenantSlug do Frontend', () => {
    test('Deve identificar slugs de demonstração como verdadeiros', () => {
      expect(isDemoTenantSlug('demo')).toBe(true);
      expect(isDemoTenantSlug('DEMO')).toBe(true);
      expect(isDemoTenantSlug('studiodemo')).toBe(true);
      expect(isDemoTenantSlug('studiothais')).toBe(true);
      expect(isDemoTenantSlug('studiodatha')).toBe(true);
    });

    test('Deve rejeitar slugs de salões reais não-demo', () => {
      expect(isDemoTenantSlug('atelietodabonita')).toBe(false);
      expect(isDemoTenantSlug('salao-vip')).toBe(false);
      expect(isDemoTenantSlug('')).toBe(false);
      expect(isDemoTenantSlug(null)).toBe(false);
    });
  });

  describe('3. Componente DemoBanner (src/components/DemoBanner.jsx)', () => {
    const bannerPath = path.join(rootDir, 'src/components/DemoBanner.jsx');

    test('Arquivo DemoBanner.jsx deve existir e conter estrutura visual de topo', () => {
      expect(fs.existsSync(bannerPath)).toBe(true);
      const content = fs.readFileSync(bannerPath, 'utf8');
      
      expect(content).toContain('demo-banner-topbar');
      expect(content).toContain('Modo Demonstração');
      expect(content).toContain('sticky top-0');
    });

    test('Deve conter botão de retorno à Landing Page ("/")', () => {
      const content = fs.readFileSync(bannerPath, 'utf8');
      expect(content).toContain('btn-demo-back-to-landing');
      expect(content).toContain('to="/"');
      expect(content).toContain('Voltar ao Site');
    });

    test('Deve conter botão e modal de QR Code para smartphone', () => {
      const content = fs.readFileSync(bannerPath, 'utf8');
      expect(content).toContain('btn-demo-qrcode');
      expect(content).toContain('demo-qrcode-modal');
      expect(content).toContain('QRCode.toDataURL');
      expect(content).toContain('Testar no Celular');
    });

    test('Deve conter CTA para criar salão apontando para /planos', () => {
      const content = fs.readFileSync(bannerPath, 'utf8');
      expect(content).toContain('btn-demo-create-salon');
      expect(content).toContain('to="/planos"');
      expect(content).toContain('Criar Meu Salão');
    });
  });

  describe('4. Acoplamento de DemoBanner em App.jsx', () => {
    const appPath = path.join(rootDir, 'src/App.jsx');

    test('App.jsx deve importar e renderizar DemoBanner dentro de TenantWrapper', () => {
      const content = fs.readFileSync(appPath, 'utf8');
      expect(content).toContain("import DemoBanner from './components/DemoBanner';");
      expect(content).toContain('<DemoBanner />');
      expect(content).toContain('<Outlet />');
    });
  });

  describe('5. Landing Page com Integração do Salão Demo e QR Code (src/pages/LandingPage.jsx)', () => {
    const landingPath = path.join(rootDir, 'src/pages/LandingPage.jsx');

    test('Landing Page deve possuir botões de demonstração apontando para /demo', () => {
      const content = fs.readFileSync(landingPath, 'utf8');
      expect(content).toContain('to="/demo"');
      expect(content).toContain('Ver demonstração');
    });

    test('Landing Page deve conter botão de testar no celular com QR Code no Hero', () => {
      const content = fs.readFileSync(landingPath, 'utf8');
      expect(content).toContain('btn-hero-qrcode');
      expect(content).toContain('Testar no celular');
    });

    test('Landing Page deve renderizar modal com QR Code interativo gerado via qrcode', () => {
      const content = fs.readFileSync(landingPath, 'utf8');
      expect(content).toContain('hero-qrcode-modal');
      expect(content).toContain('QRCode.toDataURL');
      expect(content).toContain('Teste no seu Celular');
    });
  });

  describe('6. PaginaPlanos.jsx com Link para Demonstração', () => {
    const planosPath = path.join(rootDir, 'src/pages/PaginaPlanos.jsx');

    test('PaginaPlanos.jsx deve apontar o botão Ver Demonstração para /demo', () => {
      const content = fs.readFileSync(planosPath, 'utf8');
      expect(content).toContain('to="/demo"');
      expect(content).toContain('Ver Demonstração');
    });
  });

});
