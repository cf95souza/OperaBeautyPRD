import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { describe, it, expect, beforeAll } from '@jest/globals';
import { z } from 'zod';

// Configura a chave de criptografia para os testes
process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'operabeauty-secure-encryption-key-test-32bytes';

import { encrypt, decrypt } from '../utils/crypto.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

describe('FASE 44 - ITEM D14 (P2): Anamnese Dinâmica, Termo de Consentimento e Evolução Clínica', () => {

  describe('1. Integridade de DDL, Migração e Banco de Dados (phase29_anamnesis_consent_and_evolution.sql)', () => {
    const migrationPath = path.join(rootDir, 'migrations/phase29_anamnesis_consent_and_evolution.sql');

    it('o arquivo de migração phase29 deve existir', () => {
      expect(fs.existsSync(migrationPath)).toBe(true);
    });

    it('a migração deve evoluir cap_anamnesis_templates com termos e versioneamento', () => {
      const sql = fs.readFileSync(migrationPath, 'utf-8');
      expect(sql).toContain('ALTER TABLE public.cap_anamnesis_templates');
      expect(sql).toContain('ADD COLUMN IF NOT EXISTS terms_text TEXT');
      expect(sql).toContain('ADD COLUMN IF NOT EXISTS terms_version INTEGER');
      expect(sql).toContain('ADD COLUMN IF NOT EXISTS require_terms BOOLEAN');
      expect(sql).toContain('ADD COLUMN IF NOT EXISTS require_signature BOOLEAN');
    });

    it('a migração deve evoluir cap_client_anamnesis com criptografia e dados de consentimento', () => {
      const sql = fs.readFileSync(migrationPath, 'utf-8');
      expect(sql).toContain('ALTER TABLE public.cap_client_anamnesis');
      expect(sql).toContain('ADD COLUMN IF NOT EXISTS answers_encrypted TEXT');
      expect(sql).toContain('ADD COLUMN IF NOT EXISTS terms_accepted BOOLEAN');
      expect(sql).toContain('ADD COLUMN IF NOT EXISTS consented_at TIMESTAMPTZ');
      expect(sql).toContain('ADD COLUMN IF NOT EXISTS consent_ip_address VARCHAR(45)');
      expect(sql).toContain('ADD COLUMN IF NOT EXISTS consent_hash VARCHAR(64)');
      expect(sql).toContain('ADD COLUMN IF NOT EXISTS signature_data TEXT');
    });

    it('a migração deve criar cap_client_evolutions com campos de sessão, medidas, fotos e consentimento', () => {
      const sql = fs.readFileSync(migrationPath, 'utf-8');
      expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.cap_client_evolutions');
      expect(sql).toContain('tenant_id UUID NOT NULL REFERENCES public.cap_tenants(id)');
      expect(sql).toContain('client_id UUID NOT NULL REFERENCES public.cap_clients(id)');
      expect(sql).toContain('staff_id UUID REFERENCES public.cap_staff(id)');
      expect(sql).toContain('procedure_name TEXT NOT NULL');
      expect(sql).toContain('measurements JSONB NOT NULL DEFAULT \'{}\'::jsonb');
      expect(sql).toContain('before_photos JSONB NOT NULL DEFAULT \'[]\'::jsonb');
      expect(sql).toContain('after_photos JSONB NOT NULL DEFAULT \'[]\'::jsonb');
      expect(sql).toContain('photo_consent_level VARCHAR(30) NOT NULL DEFAULT \'internal_only\'');
      expect(sql).toContain('CHECK (photo_consent_level IN (\'none\', \'internal_only\', \'social_media_anonymous\', \'social_media_full\'))');
    });

    it('a migração deve habilitar RLS e conceder privilégios estritos ao usuário opera_app (C5)', () => {
      const sql = fs.readFileSync(migrationPath, 'utf-8');
      expect(sql).toContain('ALTER TABLE public.cap_client_evolutions ENABLE ROW LEVEL SECURITY');
      expect(sql).toContain('CREATE POLICY tenant_isolation_client_evolutions ON public.cap_client_evolutions');
      expect(sql).toContain('GRANT SELECT, INSERT, UPDATE, DELETE ON public.cap_client_evolutions TO opera_app');
      expect(sql).toContain('GRANT SELECT, INSERT, UPDATE, DELETE ON public.cap_client_anamnesis TO opera_app');
      expect(sql).toContain('GRANT SELECT, INSERT, UPDATE, DELETE ON public.cap_anamnesis_templates TO opera_app');
    });
  });

  describe('2. Criptografia em Repouso dos Dados de Saúde (LGPD Art. 11)', () => {
    it('deve criptografar e descriptografar dados médicos sensíveis usando AES-256-GCM', () => {
      const sensitiveHealthData = JSON.stringify({
        alergias: ['Látex', 'Amônia', 'Dipirona'],
        gestante: true,
        semanas_gestacao: 18,
        historico_cirurgico: 'Rinoplastia em 2024',
        medicamentos_em_uso: ['Ácido Fólico', 'Vitamina D'],
        pressao_arterial: 'Normal',
        tipo_pele: 'Sensível com Rosácea'
      });

      const encrypted = encrypt(sensitiveHealthData);
      expect(encrypted).not.toBe(sensitiveHealthData);
      expect(encrypted).toContain(':'); // Formato iv:authTag:cipherText
      expect(encrypted.split(':')).toHaveLength(3);

      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(sensitiveHealthData);
      const parsed = JSON.parse(decrypted);
      expect(parsed.alergias).toContain('Amônia');
      expect(parsed.gestante).toBe(true);
    });

    it('deve retornar null em caso de tentativa de decifrar payload adulterado', () => {
      const original = encrypt('Dados confidenciais');
      const parts = original.split(':');
      // Adultera o cipherText
      const corrupted = `${parts[0]}:${parts[1]}:badf00d12345`;
      const result = decrypt(corrupted);
      expect(result).toBeNull();
    });
  });

  describe('3. Hash Criptográfico de Integridade Jurídica (SHA-256)', () => {
    it('deve gerar hash de não repúdio inviolável para o aceite digital do termo', () => {
      const termsText = 'Declaro que todas as informações de saúde são verdadeiras.';
      const termsVersion = 1;
      const clientId = 'c1234567-89ab-4def-9123-456789abcdef';
      const clientIp = '189.120.45.10';
      const consentedAt = '2026-10-27T10:00:00.000Z';

      const payload = `${termsText}|v${termsVersion}|${clientId}|${clientIp}|${consentedAt}`;
      const hash1 = crypto.createHash('sha256').update(payload).digest('hex');
      const hash2 = crypto.createHash('sha256').update(payload).digest('hex');

      expect(hash1).toHaveLength(64);
      expect(hash1).toBe(hash2);

      // Qualquer alteração mínima no termo gera um hash completamente diferente
      const modifiedPayload = `${termsText} |v${termsVersion}|${clientId}|${clientIp}|${consentedAt}`;
      const modifiedHash = crypto.createHash('sha256').update(modifiedPayload).digest('hex');
      expect(modifiedHash).not.toBe(hash1);
    });
  });

  describe('4. Schemas Zod de Validação de Anamnese e Evolução Clínica', () => {
    const updateTemplateSchema = z.object({
      fields_schema: z.array(z.object({
        id: z.string(),
        type: z.enum(['text', 'textarea', 'radio', 'checkbox', 'select']),
        label: z.string(),
        options: z.array(z.string()).optional(),
        required: z.boolean().optional()
      })),
      terms_text: z.string().optional(),
      terms_version: z.number().int().positive().optional(),
      require_terms: z.boolean().optional(),
      require_signature: z.boolean().optional()
    });

    const createEvolutionSchema = z.object({
      client_id: z.string().uuid(),
      procedure_name: z.string().min(2),
      notes: z.string().optional().default(''),
      measurements: z.record(z.any()).optional().default({}),
      before_photos: z.array(z.string()).optional().default([]),
      after_photos: z.array(z.string()).optional().default([]),
      photo_consent_level: z.enum(['none', 'internal_only', 'social_media_anonymous', 'social_media_full']).optional().default('internal_only'),
      session_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
    });

    it('deve validar template com perguntas e termos legais', () => {
      const validTemplate = {
        fields_schema: [
          { id: 'f1', type: 'text', label: 'Possui alergias?', required: true },
          { id: 'f2', type: 'radio', label: 'Está gestante?', options: ['Sim', 'Não'], required: true }
        ],
        terms_text: 'Termo oficial do salão.',
        terms_version: 2,
        require_terms: true,
        require_signature: true
      };

      const result = updateTemplateSchema.safeParse(validTemplate);
      expect(result.success).toBe(true);
    });

    it('deve rejeitar tipo de campo inválido no formulário de anamnese', () => {
      const invalidTemplate = {
        fields_schema: [
          { id: 'f1', type: 'unsupported_input_type', label: 'Teste' }
        ]
      };

      const result = updateTemplateSchema.safeParse(invalidTemplate);
      expect(result.success).toBe(false);
    });

    it('deve validar criação de evolução clínica com fotos e consentimento', () => {
      const validEvolution = {
        client_id: '123e4567-e89b-12d3-a456-426614174000',
        procedure_name: 'Microagulhamento Facial',
        notes: 'Sessão 1/3 realizada com sucesso. Aplicado sérum calmante.',
        measurements: { hidratacao: '35%', sensibilidade: 'Moderada' },
        before_photos: ['/uploads/before-1.jpg'],
        after_photos: ['/uploads/after-1.jpg'],
        photo_consent_level: 'social_media_anonymous',
        session_date: '2026-10-27'
      };

      const result = createEvolutionSchema.safeParse(validEvolution);
      expect(result.success).toBe(true);
    });

    it('deve rejeitar nível de consentimento de foto não reconhecido', () => {
      const invalidEvolution = {
        client_id: '123e4567-e89b-12d3-a456-426614174000',
        procedure_name: 'Drenagem',
        photo_consent_level: 'invalid_level'
      };

      const result = createEvolutionSchema.safeParse(invalidEvolution);
      expect(result.success).toBe(false);
    });
  });

  describe('5. Verificação de Frontend e Design System Rosé Editorial', () => {
    it('o componente de assinatura digital eletrônica deve existir', () => {
      const compPath = path.join(rootDir, 'src/components/ui/AssinaturaDigitalCanvas.jsx');
      expect(fs.existsSync(compPath)).toBe(true);
      const content = fs.readFileSync(compPath, 'utf-8');
      expect(content).toContain('canvasRef');
      expect(content).toContain('toDataURL');
      expect(content).toContain('touch-none');
    });

    it('a tela de configuração de template deve conter suporte a termos e versões', () => {
      const templatePath = path.join(rootDir, 'src/pages/admin/AnamneseTemplate.jsx');
      const content = fs.readFileSync(templatePath, 'utf-8');
      expect(content).toContain('termsVersion');
      expect(content).toContain('requireTerms');
      expect(content).toContain('requireSignature');
      expect(content).toContain('api.anamnesis.updateTemplate');
    });

    it('a tela ClienteAnamnese deve conter aceite do termo e assinatura manuscrita', () => {
      const clientePath = path.join(rootDir, 'src/pages/ClienteAnamnese.jsx');
      const content = fs.readFileSync(clientePath, 'utf-8');
      expect(content).toContain('AssinaturaDigitalCanvas');
      expect(content).toContain('termsAccepted');
      expect(content).toContain('api.anamnesis.submit');
    });

    it('o CRM da cliente deve exibir o card de evolução clínica com fotos antes/depois', () => {
      const crmPath = path.join(rootDir, 'src/pages/FichaClienteCRM.jsx');
      const content = fs.readFileSync(crmPath, 'utf-8');
      expect(content).toContain('Evolução clínica & Sessões');
      expect(content).toContain('api.evolutions.listByClient');
      expect(content).toContain('before_photos');
      expect(content).toContain('after_photos');
      expect(content).toContain('showSignatureModal');
    });
  });
});
