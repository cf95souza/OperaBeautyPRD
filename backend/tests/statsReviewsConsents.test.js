import { describe, it, expect } from '@jest/globals';
import fs from 'node:fs';
import path from 'node:path';

describe('Correção de Contratos de API: Stats de Reviews, Consents e LGPD', () => {

  describe('1. Contrato e Rota de Reviews Stats (GestaoEquipe)', () => {
    const reviewServicePath = path.resolve(process.cwd(), 'services/reviewService.js');
    const reviewRoutesPath = path.resolve(process.cwd(), 'routes/reviews.js');

    it('reviewService.js deve exportar a função getReviewsStats com agregações por tenant e staff', () => {
      const content = fs.readFileSync(reviewServicePath, 'utf8');
      expect(content).toContain('export const getReviewsStats');
      expect(content).toContain('r.professional_id as id');
      expect(content).toContain('ROUND(AVG(r.rating), 1)::float as average');
      expect(content).toContain('COUNT(r.id)::int as total_reviews');
      expect(content).toContain('WHERE r.tenant_id = $1');
    });

    it('routes/reviews.js deve registrar o endpoint GET /stats com autenticação', () => {
      const content = fs.readFileSync(reviewRoutesPath, 'utf8');
      expect(content).toContain("router.get('/stats'");
      expect(content).toContain('getReviewsStats');
      expect(content).toContain("requireRole(['manager', 'superadmin', 'professional'])");
    });
  });

  describe('2. Contrato e Rota de Consents Stats (GestaoLGPD)', () => {
    const consentServicePath = path.resolve(process.cwd(), 'services/consentService.js');
    const consentRoutesPath = path.resolve(process.cwd(), 'routes/consents.js');
    const termsRoutesPath = path.resolve(process.cwd(), 'routes/terms.js');

    it('consentService.js deve exportar a função getConsentsStats com total, pending, signed e recent', () => {
      const content = fs.readFileSync(consentServicePath, 'utf8');
      expect(content).toContain('export const getConsentsStats');
      expect(content).toContain("COUNT(CASE WHEN status = 'pending' THEN 1 END)::int as pending");
      expect(content).toContain("COUNT(CASE WHEN status = 'signed' THEN 1 END)::int as signed");
      expect(content).toContain('ORDER BY c.created_at DESC');
      expect(content).toContain('LIMIT 10');
    });

    it('routes/consents.js deve registrar o endpoint GET /stats protegido por role', () => {
      const content = fs.readFileSync(consentRoutesPath, 'utf8');
      expect(content).toContain("router.get('/stats'");
      expect(content).toContain('getConsentsStats');
      expect(content).toContain("requireRole(['manager', 'superadmin', 'professional'])");
    });

    it('routes/terms.js deve conter o endpoint alias POST /request-signature para compatibilidade com GestaoLGPD', () => {
      const content = fs.readFileSync(termsRoutesPath, 'utf8');
      expect(content).toContain("router.post('/request-signature'");
      expect(content).toContain('requestConsent');
    });
  });
});
