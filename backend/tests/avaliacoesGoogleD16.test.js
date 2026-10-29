import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { describe, it, expect } from '@jest/globals';
import { z } from 'zod';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

describe('FASE 44 - ITEM D16 (P2): Avaliações e Google Reviews', () => {

  describe('1. Integridade de DDL e Migração (phase31_reviews_and_google.sql)', () => {
    const migrationPath = path.join(rootDir, 'migrations/phase31_reviews_and_google.sql');

    it('o arquivo de migração phase31 deve existir', () => {
      expect(fs.existsSync(migrationPath)).toBe(true);
    });

    it('a migração deve estender cap_tenants com google_review_url', () => {
      const sql = fs.readFileSync(migrationPath, 'utf-8');
      expect(sql).toContain('ALTER TABLE public.cap_tenants');
      expect(sql).toContain('ADD COLUMN IF NOT EXISTS google_review_url TEXT');
    });

    it('a migração deve evoluir cap_reviews com campos de moderação e resposta da equipe', () => {
      const sql = fs.readFileSync(migrationPath, 'utf-8');
      expect(sql).toContain('ALTER TABLE public.cap_reviews');
      expect(sql).toContain('ADD COLUMN IF NOT EXISTS service_id UUID');
      expect(sql).toContain('ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT TRUE');
      expect(sql).toContain('ADD COLUMN IF NOT EXISTS staff_reply TEXT');
      expect(sql).toContain('ADD COLUMN IF NOT EXISTS replied_at TIMESTAMPTZ');
      expect(sql).toContain('ADD COLUMN IF NOT EXISTS replied_by UUID');
    });

    it('a migração deve garantir unicidade de exatamente uma avaliação por atendimento (Regra de Aceite D16)', () => {
      const sql = fs.readFileSync(migrationPath, 'utf-8');
      expect(sql).toContain('CREATE UNIQUE INDEX IF NOT EXISTS uq_idx_reviews_appointment');
      expect(sql).toContain('ON public.cap_reviews (appointment_id)');
      expect(sql).toContain('WHERE appointment_id IS NOT NULL');
    });

    it('a migração deve definir RLS e conceder privilégios estritos ao papel opera_app (Princípio C5)', () => {
      const sql = fs.readFileSync(migrationPath, 'utf-8');
      expect(sql).toContain('ENABLE ROW LEVEL SECURITY');
      expect(sql).toContain('GRANT SELECT, INSERT, UPDATE, DELETE ON public.cap_reviews TO opera_app');
      expect(sql).toContain('GRANT SELECT, UPDATE ON public.cap_tenants TO opera_app');
    });
  });

  describe('2. Regra de Negócio: Lógica de Convite ao Google Reviews', () => {
    // Helper puro simulando a lógica de decisão de convite do backend
    const determineGoogleInvite = (rating, googleReviewUrl) => {
      const numRating = Number(rating);
      const hasUrl = Boolean(googleReviewUrl && googleReviewUrl.trim());
      const shouldInvite = numRating >= 4 && hasUrl;
      return {
        invite_google: shouldInvite,
        google_review_url: shouldInvite ? googleReviewUrl.trim() : null
      };
    };

    it('deve disparar convite ao Google quando a nota for 5 e o salão tiver link configurado', () => {
      const result = determineGoogleInvite(5, 'https://g.page/r/studiodatha/review');
      expect(result.invite_google).toBe(true);
      expect(result.google_review_url).toBe('https://g.page/r/studiodatha/review');
    });

    it('deve disparar convite ao Google quando a nota for 4 e o salão tiver link configurado', () => {
      const result = determineGoogleInvite(4, 'https://g.page/r/studiodatha/review');
      expect(result.invite_google).toBe(true);
      expect(result.google_review_url).toBe('https://g.page/r/studiodatha/review');
    });

    it('NÃO deve convidar para o Google quando a nota for neutra ou baixa (1, 2 ou 3 estrelas)', () => {
      expect(determineGoogleInvite(3, 'https://g.page/r/studiodatha/review').invite_google).toBe(false);
      expect(determineGoogleInvite(2, 'https://g.page/r/studiodatha/review').invite_google).toBe(false);
      expect(determineGoogleInvite(1, 'https://g.page/r/studiodatha/review').invite_google).toBe(false);
    });

    it('NÃO deve convidar para o Google se o salão não cadastrou o link do Google Reviews', () => {
      expect(determineGoogleInvite(5, null).invite_google).toBe(false);
      expect(determineGoogleInvite(5, '').invite_google).toBe(false);
      expect(determineGoogleInvite(5, undefined).invite_google).toBe(false);
    });
  });

  describe('3. Schemas Zod de Validação de Entrada e Segurança Server-Side', () => {
    const createReviewSchema = z.object({
      appointment_id: z.string().uuid(),
      rating: z.coerce.number().int().min(1).max(5),
      comment: z.string().max(1000).optional().nullable()
    });

    const replySchema = z.object({
      reply: z.string().min(1).max(1000)
    });

    const googleUrlSchema = z.object({
      google_review_url: z.string().url().max(500).or(z.literal(''))
    });

    it('deve validar com sucesso um payload válido de avaliação de 1 a 5 estrelas', () => {
      const valid = {
        appointment_id: '123e4567-e89b-12d3-a456-426614174000',
        rating: 5,
        comment: 'Atendimento perfeito, amei o corte!'
      };
      expect(createReviewSchema.safeParse(valid).success).toBe(true);
    });

    it('deve rejeitar nota zero ou superior a 5 estrelas', () => {
      const zero = { appointment_id: '123e4567-e89b-12d3-a456-426614174000', rating: 0 };
      const six = { appointment_id: '123e4567-e89b-12d3-a456-426614174000', rating: 6 };

      expect(createReviewSchema.safeParse(zero).success).toBe(false);
      expect(createReviewSchema.safeParse(six).success).toBe(false);
    });

    it('deve rejeitar resposta vazia da equipe', () => {
      expect(replySchema.safeParse({ reply: '' }).success).toBe(false);
      expect(replySchema.safeParse({ reply: 'Muito obrigado, venha sempre!' }).success).toBe(true);
    });

    it('deve validar URL oficial do Google e permitir limpar com string vazia', () => {
      expect(googleUrlSchema.safeParse({ google_review_url: 'https://g.page/r/test/review' }).success).toBe(true);
      expect(googleUrlSchema.safeParse({ google_review_url: '' }).success).toBe(true);
      expect(googleUrlSchema.safeParse({ google_review_url: 'link-invalido' }).success).toBe(false);
    });
  });

  describe('4. Componentes Frontend do Design System Rosé Editorial', () => {
    it('o componente ReviewModal deve existir e conter suporte a convite do Google', () => {
      const modalPath = path.join(rootDir, 'src/components/ReviewModal.jsx');
      expect(fs.existsSync(modalPath)).toBe(true);
      const content = fs.readFileSync(modalPath, 'utf-8');
      expect(content).toContain('google_invite');
      expect(content).toContain('Avaliar 5 estrelas no Google');
    });

    it('a tela de Gestão de Avaliações deve existir com métricas e ranking de equipe', () => {
      const pagePath = path.join(rootDir, 'src/pages/admin/GestaoAvaliacoes.jsx');
      expect(fs.existsSync(pagePath)).toBe(true);
      const content = fs.readFileSync(pagePath, 'utf-8');
      expect(content).toContain('Nota Média Geral');
      expect(content).toContain('Taxa de Satisfação');
      expect(content).toContain('Google Reviews');
      expect(content).toContain('Média por Profissional');
      expect(content).toContain('Responder à cliente');
    });

    it('a rota staff/admin/avaliacoes deve estar registrada no App.jsx e no AdminLayout.jsx', () => {
      const appContent = fs.readFileSync(path.join(rootDir, 'src/App.jsx'), 'utf-8');
      const layoutContent = fs.readFileSync(path.join(rootDir, 'src/components/admin/AdminLayout.jsx'), 'utf-8');

      expect(appContent).toContain('staff/admin/avaliacoes');
      expect(layoutContent).toContain('staff/admin/avaliacoes');
    });
  });

});
