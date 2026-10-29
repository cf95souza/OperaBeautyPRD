import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { jest } from '@jest/globals';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('D20 (P2) — Mini-site do Salão & SEO Social Dinâmico', () => {

  describe('1. Integridade de DDL, Migração e Governança C5', () => {
    test('Arquivo de migração phase34_salon_minisite.sql deve existir e conter estrutura completa', () => {
      const migrationPath = path.resolve(__dirname, '../migrations/phase34_salon_minisite.sql');
      expect(fs.existsSync(migrationPath)).toBe(true);

      const sql = fs.readFileSync(migrationPath, 'utf-8');
      expect(sql).toContain('about_text');
      expect(sql).toContain('headline');
      expect(sql).toContain('minisite_gallery');
      expect(sql).toContain('google_maps_url');
      expect(sql).toContain('meta_title');
      expect(sql).toContain('meta_description');
      expect(sql).toContain('meta_image_url');
      expect(sql).toContain('minisite_enabled');
      expect(sql).toContain('GRANT SELECT, UPDATE ON public.cap_tenants TO opera_app');
    });
  });

  describe('2. Lógica do Serviço de Mini-site (minisiteService.js)', () => {
    let mockPool;
    let mockRedis;
    let minisiteService;

    const mockTenant = {
      id: '11111111-1111-1111-1111-111111111111',
      slug: 'studiodatha',
      name: 'Studio da Tha',
      status: 'active',
      headline: 'Realçando sua beleza natural',
      about_text: 'História do salão...',
      google_maps_url: 'https://maps.google.com/?q=studio',
      google_review_url: 'https://g.page/r/studio',
      meta_title: 'Studio da Tha | Beleza',
      meta_description: 'Agende seu horário online',
      meta_image_url: 'https://img.com/capa.jpg',
      minisite_gallery: [{ url: 'https://img.com/espaco1.jpg', caption: 'Recepção' }]
    };

    beforeAll(async () => {
      mockPool = {
        query: jest.fn((sql, params) => {
          if (sql.includes('FROM public.cap_tenants')) {
            return Promise.resolve({ rows: [mockTenant] });
          }
          if (sql.includes('AVG(rating)')) {
            return Promise.resolve({ rows: [{ average_rating: '4.9', total_reviews: '35' }] });
          }
          if (sql.includes('FROM public.cap_reviews')) {
            return Promise.resolve({ rows: [
              { id: 'rev-1', rating: 5, comment: 'Maravilhoso!', client_name: 'Beatriz Alcantara', service_name: 'Manicure' }
            ]});
          }
          if (sql.includes('FROM public.cap_lookbook')) {
            return Promise.resolve({ rows: [
              { id: 'look-1', title: 'Unhas Decoradas', image_url: 'https://img.com/unhas.jpg', category: 'Unhas' }
            ]});
          }
          if (sql.includes('FROM public.cap_business_hours')) {
            return Promise.resolve({ rows: [
              { day_of_week: 1, open_time: '09:00:00', close_time: '19:00:00', is_closed: false }
            ]});
          }
          if (sql.includes('FROM public.cap_staff')) {
            return Promise.resolve({ rows: [
              { id: 'staff-1', name: 'Thais Rodrigues', role: 'admin', photo_url: null }
            ]});
          }
          if (sql.includes('UPDATE public.cap_tenants')) {
            return Promise.resolve({ rows: [{
              id: '11111111-1111-1111-1111-111111111111',
              slug: 'studiodatha',
              headline: params[0] || 'Novo Slogan Atualizado',
              about_text: params[1] || 'Nova história...'
            }] });
          }
          if (sql.includes('FROM public.cap_services')) {
            return Promise.resolve({ rows: [
              { id: 'serv-1', name: 'Manicure Clássica', price: '45.00', duration_minutes: 45, category: 'Unhas' }
            ]});
          }
          return Promise.resolve({ rows: [] });
        })
      };

      mockRedis = {
        get: jest.fn().mockResolvedValue(null),
        setex: jest.fn().mockResolvedValue('OK'),
        del: jest.fn().mockResolvedValue(1)
      };

      jest.unstable_mockModule('../config/db.js', () => ({ default: mockPool }));
      jest.unstable_mockModule('../config/redis.js', () => ({ default: mockRedis }));

      minisiteService = await import('../services/minisiteService.js');
    });

    test('getMinisiteData deve consolidar tenant, avaliações, lookbook, horários e equipe', async () => {
      const result = await minisiteService.getMinisiteData('studiodatha');

      expect(result).toBeDefined();
      expect(result.tenant.name).toBe('Studio da Tha');
      expect(result.tenant.rating).toBe(4.9);
      expect(result.tenant.total_reviews).toBe(35);
      expect(result.reviews).toHaveLength(1);
      expect(result.reviews[0].clientName).toBe('Beatriz A.');
      expect(result.lookbook).toHaveLength(1);
      expect(result.businessHours).toHaveLength(1);
      expect(result.staff).toHaveLength(1);
      expect(result.featuredServices).toHaveLength(1);
      expect(result.seo.title).toBe('Studio da Tha | Beleza');
    });

    test('updateMinisiteSettings deve atualizar configurações e invalidar cache do Redis', async () => {
      const updated = await minisiteService.updateMinisiteSettings('11111111-1111-1111-1111-111111111111', {
        headline: 'Novo Slogan Atualizado',
        about_text: 'Nova história...'
      });

      expect(updated.headline).toBe('Novo Slogan Atualizado');
      expect(mockPool.query).toHaveBeenCalled();
      expect(mockRedis.del).toHaveBeenCalledWith('minisite:studiodatha');
    });
  });

  describe('3. Validação do Componente Frontend e SEO Dinâmico (F3 / D20)', () => {
    test('MiniSiteSalao.jsx deve existir e conter seções completas de galeria, avaliações e localização', () => {
      const pagePath = path.resolve(__dirname, '../../src/pages/MiniSiteSalao.jsx');
      expect(fs.existsSync(pagePath)).toBe(true);

      const content = fs.readFileSync(pagePath, 'utf-8');
      expect(content).toContain('useSEO');
      expect(content).toContain('allGalleryItems');
      expect(content).toContain('reviews');
      expect(content).toContain('businessHours');
      expect(content).toContain('currentOpenStatus');
      expect(content).toContain('google_maps_url');
      expect(content).toContain('handleGoToBooking');
    });

    test('GestaoMiniSite.jsx deve existir e conter formulário de SEO e pré-visualização WhatsApp', () => {
      const adminPath = path.resolve(__dirname, '../../src/pages/admin/GestaoMiniSite.jsx');
      expect(fs.existsSync(adminPath)).toBe(true);

      const content = fs.readFileSync(adminPath, 'utf-8');
      expect(content).toContain('minisite_enabled');
      expect(content).toContain('headline');
      expect(content).toContain('about_text');
      expect(content).toContain('meta_title');
      expect(content).toContain('meta_description');
      expect(content).toContain('meta_image_url');
      expect(content).toContain('Pré-visualização no WhatsApp');
    });

    test('useSEO hook deve gerenciar tags OpenGraph dinamicamente', () => {
      const hookPath = path.resolve(__dirname, '../../src/hooks/useSEO.js');
      expect(fs.existsSync(hookPath)).toBe(true);

      const content = fs.readFileSync(hookPath, 'utf-8');
      expect(content).toContain('og:title');
      expect(content).toContain('og:description');
      expect(content).toContain('og:image');
      expect(content).toContain('twitter:card');
    });
  });
});
