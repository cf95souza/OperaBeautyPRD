import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { describe, it, expect } from '@jest/globals';
import { z } from 'zod';

import {
  renderCampaignMessage,
  isClientInCooldown
} from '../services/campaignService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

describe('FASE 44 - ITEM D15 (P2): Campanhas Automáticas de Retenção e Marketing', () => {

  describe('1. Integridade de DDL e Migração (phase30_automated_campaigns.sql)', () => {
    const migrationPath = path.join(rootDir, 'migrations/phase30_automated_campaigns.sql');

    it('o arquivo de migração phase30 deve existir', () => {
      expect(fs.existsSync(migrationPath)).toBe(true);
    });

    it('a migração deve criar a tabela cap_marketing_campaigns com todas as colunas canônicas', () => {
      const sql = fs.readFileSync(migrationPath, 'utf-8');
      expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.cap_marketing_campaigns');
      expect(sql).toContain('type VARCHAR(30)');
      expect(sql).toContain('name TEXT NOT NULL');
      expect(sql).toContain('is_active BOOLEAN');
      expect(sql).toContain('message_template TEXT');
      expect(sql).toContain('discount_type VARCHAR(20)');
      expect(sql).toContain('discount_value NUMERIC(10,2)');
      expect(sql).toContain('coupon_validity_days INT');
      expect(sql).toContain('min_days_inactive INT');
      expect(sql).toContain('cooldown_days INT');
    });

    it('a migração deve criar a tabela cap_campaign_logs para rastreamento e deduplicação', () => {
      const sql = fs.readFileSync(migrationPath, 'utf-8');
      expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.cap_campaign_logs');
      expect(sql).toContain('campaign_id UUID NOT NULL');
      expect(sql).toContain('client_id UUID NOT NULL');
      expect(sql).toContain('campaign_type VARCHAR(30)');
      expect(sql).toContain('phone VARCHAR(30)');
      expect(sql).toContain('message_content TEXT NOT NULL');
      expect(sql).toContain('coupon_code TEXT');
      expect(sql).toContain('status VARCHAR(20)');
    });

    it('a migração deve adicionar os campos de opt-out em cap_clients', () => {
      const sql = fs.readFileSync(migrationPath, 'utf-8');
      expect(sql).toContain('ALTER TABLE public.cap_clients');
      expect(sql).toContain('ADD COLUMN IF NOT EXISTS marketing_opt_out BOOLEAN');
      expect(sql).toContain('ADD COLUMN IF NOT EXISTS opt_out_at TIMESTAMPTZ');
    });

    it('a migração deve definir RLS e conceder privilégios estritos para opera_app (Princípio C5)', () => {
      const sql = fs.readFileSync(migrationPath, 'utf-8');
      expect(sql).toContain('ENABLE ROW LEVEL SECURITY');
      expect(sql).toContain('GRANT SELECT, INSERT, UPDATE, DELETE ON public.cap_marketing_campaigns TO opera_app');
      expect(sql).toContain('GRANT SELECT, INSERT, UPDATE, DELETE ON public.cap_campaign_logs TO opera_app');
    });
  });

  describe('2. Renderização de Templates e Interpolação de Mensagens', () => {
    it('deve substituir corretamente os placeholders da mensagem de aniversário', () => {
      const template = 'Olá {cliente_nome}! Parabéns pelo seu dia no {salao_nome}! Seu presente é o cupom {cupom_codigo} com {cupom_desconto}% OFF válido por {dias_validade} dias!';
      const params = {
        clientName: 'Mariana Silva',
        salonName: 'Studio da Tha',
        couponCode: 'NIVER20-ABC123',
        discountPercent: 20,
        validityDays: 15
      };

      const result = renderCampaignMessage(template, params);

      expect(result).toBe('Olá Mariana! Parabéns pelo seu dia no Studio da Tha! Seu presente é o cupom NIVER20-ABC123 com 20% OFF válido por 15 dias!');
    });

    it('deve funcionar perfeitamente quando não há cupom ou dias de validade informados', () => {
      const template = 'Olá {cliente_nome}! Sentimos sua falta no {salao_nome}!';
      const params = {
        clientName: 'Carla Dias',
        salonName: 'Studio da Tha'
      };

      const result = renderCampaignMessage(template, params);

      expect(result).toBe('Olá Carla! Sentimos sua falta no Studio da Tha!');
    });
  });

  describe('3. Regra de Deduplicação, Carência (Cooldown) e Prevenção de Spam', () => {
    it('deve considerar em cooldown quando houver disparo recente dentro da janela', async () => {
      const sentAt = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000); // 5 dias atrás
      const cooldownDays = 30; // carência de 30 dias

      const inCooldown = await isClientInCooldown(sentAt, cooldownDays);
      expect(inCooldown).toBe(true);
    });

    it('deve liberar disparo quando o tempo decorrido ultrapassar a janela de carência', async () => {
      const sentAt = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000); // 35 dias atrás
      const cooldownDays = 30; // carência de 30 dias

      const inCooldown = await isClientInCooldown(sentAt, cooldownDays);
      expect(inCooldown).toBe(false);
    });

    it('deve liberar disparo se nunca houve disparo anterior (sentAt null ou undefined)', async () => {
      expect(await isClientInCooldown(null, 30)).toBe(false);
      expect(await isClientInCooldown(undefined, 30)).toBe(false);
    });
  });

  describe('4. Schemas Zod de Validação de Campanhas e Opt-out (Segurança Server-Side)', () => {
    const updateCampaignSchema = z.object({
      name: z.string().min(2).max(100).optional(),
      is_active: z.boolean().optional(),
      message_template: z.string().min(10).max(2000).optional(),
      discount_type: z.enum(['percentage', 'fixed']).optional(),
      discount_value: z.number().min(0).max(1000).optional(),
      coupon_validity_days: z.number().int().min(1).max(90).optional(),
      min_days_inactive: z.number().int().min(15).max(365).optional(),
      send_channel: z.enum(['whatsapp', 'push', 'both']).optional(),
      cooldown_days: z.number().int().min(1).max(730).optional()
    });

    const optOutSchema = z.object({
      opt_out: z.boolean()
    });

    it('deve validar com sucesso um payload válido de atualização de campanha', () => {
      const validPayload = {
        is_active: true,
        cooldown_days: 360,
        discount_type: 'percentage',
        discount_value: 15,
        coupon_validity_days: 10,
        message_template: 'Parabéns {cliente_nome}! Aqui está seu cupom {cupom_codigo}'
      };

      const parsed = updateCampaignSchema.safeParse(validPayload);
      expect(parsed.success).toBe(true);
    });

    it('deve rejeitar valor de desconto negativo', () => {
      const invalidNegative = { discount_value: -5 };
      expect(updateCampaignSchema.safeParse(invalidNegative).success).toBe(false);
    });

    it('deve validar corretamente o schema de alternância de opt-out', () => {
      expect(optOutSchema.safeParse({ opt_out: true }).success).toBe(true);
      expect(optOutSchema.safeParse({ opt_out: false }).success).toBe(true);
      expect(optOutSchema.safeParse({ opt_out: 'sim' }).success).toBe(false);
    });
  });

  describe('5. Integração com Rotina Cron Diária (backend/cron/reminders.js)', () => {
    const cronFilePath = path.join(rootDir, 'backend/cron/reminders.js');

    it('o arquivo reminders.js deve existir e conter a invocação de runCampaignScan', () => {
      expect(fs.existsSync(cronFilePath)).toBe(true);
      const content = fs.readFileSync(cronFilePath, 'utf-8');
      expect(content).toContain('runCampaignScan');
      expect(content).toContain('Campanhas Automáticas');
    });
  });

});
