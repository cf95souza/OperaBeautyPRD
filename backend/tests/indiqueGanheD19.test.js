import { jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('D19 (P2) — Programa Indique e Ganhe (Sistema de Indicação de Amigas)', () => {

  describe('1. Integridade de DDL, Migração e Governança C5', () => {
    test('Arquivo de migração phase33_referral_program.sql deve existir e conter estrutura completa', () => {
      const migrationPath = fs.existsSync(path.resolve(__dirname, '../migrations/phase33_referral_program.sql'))
        ? path.resolve(__dirname, '../migrations/phase33_referral_program.sql')
        : path.resolve(__dirname, '../../migrations/phase33_referral_program.sql');
      expect(fs.existsSync(migrationPath)).toBe(true);

      const content = fs.readFileSync(migrationPath, 'utf8');

      // Tabela cap_referrals
      expect(content).toContain('CREATE TABLE IF NOT EXISTS public.cap_referrals');
      expect(content).toContain('referrer_id UUID NOT NULL REFERENCES public.cap_clients');
      expect(content).toContain('referee_id UUID NOT NULL REFERENCES public.cap_clients');
      expect(content).toContain('uq_referral_tenant_referee UNIQUE');
      expect(content).toContain('chk_no_self_referral CHECK (referrer_id <> referee_id)');

      // Configuração em cap_tenants
      expect(content).toContain('referral_program_active BOOLEAN');
      expect(content).toContain('referral_reward_type');
      expect(content).toContain('referral_referrer_reward');
      expect(content).toContain('referral_referee_reward');
      expect(content).toContain('referral_trigger');

      // Row Level Security (RLS)
      expect(content).toContain('ENABLE ROW LEVEL SECURITY');
      expect(content).toContain('tenant_isolation_referrals');

      // Menor privilégio C5 (opera_app)
      expect(content).toContain('GRANT SELECT, INSERT, UPDATE, DELETE ON public.cap_referrals TO opera_app');
      expect(content).toContain('GRANT SELECT, UPDATE ON public.cap_tenants TO opera_app');
    });
  });

  describe('2. Geração Criptográfica e Unicidade de Códigos de Indicação', () => {
    test('generateUniqueReferralCode deve gerar código limpo sem caracteres ambíguos', async () => {
      const { generateUniqueReferralCode } = await import('../services/referralService.js');

      let queryCalls = [];
      const mockClient = {
        query: jest.fn().mockImplementation((sql, params) => {
          queryCalls.push({ sql, params });
          return Promise.resolve({ rows: [] });
        })
      };

      const code = await generateUniqueReferralCode(mockClient, 'tenant-123', 'Beatriz Alcantara', 'client-uuid-999');

      expect(typeof code).toBe('string');
      expect(code.length).toBe(8); // 4 letras do nome + 4 caracteres alfanuméricos
      expect(code.startsWith('BEAT')).toBe(true);
      expect(code).not.toMatch(/[0O1I]/);
    });
  });

  describe('3. Validação Pública de Códigos de Indicação (Anti-Enumeração e Elegibilidade)', () => {
    test('validateReferralCode deve rejeitar se código estiver vazio ou nulo', async () => {
      const { validateReferralCode } = await import('../services/referralService.js');
      const res = await validateReferralCode('tenant-1', '');
      expect(res.valid).toBe(false);
      expect(res.message).toContain('não fornecido');
    });
  });

  describe('4. Regras Anti-Fraude e Cadastro de Nova Amiga', () => {
    test('recordReferralOnSignup deve impedir auto-indicação (referrerId === newClientId)', async () => {
      const { recordReferralOnSignup } = await import('../services/referralService.js');

      const mockDb = {
        query: jest.fn().mockImplementation((sql) => {
          if (sql.includes('cap_tenants')) {
            return Promise.resolve({
              rows: [{ referral_program_active: true, referral_referrer_reward: 15, referral_referee_reward: 15, referral_trigger: 'on_first_completed_appointment' }]
            });
          }
          if (sql.includes('cap_clients') && sql.includes('referral_code')) {
            return Promise.resolve({
              rows: [{ id: 'mesmo-client-id', name: 'Beatriz' }]
            });
          }
          return Promise.resolve({ rows: [] });
        })
      };

      const res = await recordReferralOnSignup(mockDb, 'tenant-1', 'mesmo-client-id', 'BEAT9999');
      expect(res).toBeNull();
    });

    test('recordReferralOnSignup deve impedir que o mesmo cliente seja indicado duas vezes', async () => {
      const { recordReferralOnSignup } = await import('../services/referralService.js');

      const mockDb = {
        query: jest.fn().mockImplementation((sql) => {
          if (sql.includes('cap_tenants')) {
            return Promise.resolve({
              rows: [{ referral_program_active: true, referral_referrer_reward: 15, referral_referee_reward: 15, referral_trigger: 'on_first_completed_appointment' }]
            });
          }
          if (sql.includes('cap_clients') && sql.includes('referral_code')) {
            return Promise.resolve({
              rows: [{ id: 'referrer-1', name: 'Beatriz' }]
            });
          }
          if (sql.includes('cap_referrals') && sql.includes('referee_id')) {
            return Promise.resolve({
              rows: [{ id: 'ref-existente' }]
            });
          }
          return Promise.resolve({ rows: [] });
        })
      };

      const res = await recordReferralOnSignup(mockDb, 'tenant-1', 'nova-amiga-id', 'BEAT9999');
      expect(res).toBeNull();
    });

    test('recordReferralOnSignup deve conceder bônus imediato quando o trigger for on_signup', async () => {
      const { recordReferralOnSignup } = await import('../services/referralService.js');

      let executedQueries = [];
      const mockDb = {
        query: jest.fn().mockImplementation((sql, params) => {
          executedQueries.push({ sql, params });
          if (sql.includes('cap_tenants')) {
            return Promise.resolve({
              rows: [{ referral_program_active: true, referral_referrer_reward: 20, referral_referee_reward: 20, referral_trigger: 'on_signup' }]
            });
          }
          if (sql.includes('cap_clients') && sql.includes('referral_code')) {
            return Promise.resolve({
              rows: [{ id: 'referrer-1', name: 'Beatriz Alcantara' }]
            });
          }
          if (sql.includes('SELECT') && sql.includes('cap_referrals')) {
            return Promise.resolve({ rows: [] });
          }
          if (sql.includes('INSERT INTO public.cap_referrals')) {
            return Promise.resolve({
              rows: [{
                id: 'referral-instant-1',
                tenant_id: 'tenant-1',
                referrer_id: 'referrer-1',
                referee_id: 'referee-1',
                referral_code: 'BEAT9999',
                status: 'completed',
                trigger_type: 'on_signup',
                referrer_reward_amount: 20.00,
                referee_reward_amount: 20.00
              }]
            });
          }
          if (sql.includes('SELECT id, name FROM public.cap_clients WHERE id IN')) {
            return Promise.resolve({
              rows: [
                { id: 'referrer-1', name: 'Beatriz Alcantara' },
                { id: 'referee-1', name: 'Camila Rocha' }
              ]
            });
          }
          if (sql.includes('INSERT INTO public.cap_wallet_transactions')) {
            return Promise.resolve({ rowCount: 1, rows: [{ id: 'tx-instant-1' }] });
          }
          if (sql.includes('INSERT INTO public.cap_client_wallets')) {
            return Promise.resolve({ rowCount: 1 });
          }
          return Promise.resolve({ rows: [] });
        })
      };

      const res = await recordReferralOnSignup(mockDb, 'tenant-1', 'referee-1', 'BEAT9999');
      expect(res).not.toBeNull();
      expect(res.status).toBe('completed');
      expect(res.trigger_type).toBe('on_signup');

      const walletTxs = executedQueries.filter(q => q.sql.includes('INSERT INTO public.cap_wallet_transactions'));
      expect(walletTxs.length).toBe(2);
      expect(walletTxs[0].params[4]).toBe('referral:referrer:referral-instant-1');
      expect(walletTxs[1].params[4]).toBe('referral:referee:referral-instant-1');
    });
  });

  describe('5. Conclusão no Primeiro Atendimento e Idempotência de Crédito em Carteira (C10)', () => {
    test('completeReferralOnAppointmentCompleted deve atualizar status para completed e creditar carteira com idempotência', async () => {
      const { completeReferralOnAppointmentCompleted } = await import('../services/referralService.js');

      let executedQueries = [];
      const mockDb = {
        query: jest.fn().mockImplementation((sql, params) => {
          executedQueries.push({ sql, params });

          if (sql.includes('cap_referrals') && sql.includes('status = \'pending\'')) {
            return Promise.resolve({
              rows: [{
                id: 'referral-uuid-1',
                tenant_id: 'tenant-1',
                referrer_id: 'referrer-1',
                referee_id: 'referee-1',
                referrer_reward_amount: 15.00,
                referee_reward_amount: 15.00,
                status: 'pending'
              }]
            });
          }
          if (sql.includes('UPDATE public.cap_referrals') && sql.includes('status = \'completed\'')) {
            return Promise.resolve({
              rows: [{
                id: 'referral-uuid-1',
                tenant_id: 'tenant-1',
                referrer_id: 'referrer-1',
                referee_id: 'referee-1',
                referrer_reward_amount: 15.00,
                referee_reward_amount: 15.00,
                status: 'completed',
                appointment_id: 'app-999'
              }]
            });
          }
          if (sql.includes('SELECT id, name FROM public.cap_clients WHERE id IN')) {
            return Promise.resolve({
              rows: [
                { id: 'referrer-1', name: 'Beatriz Alcantara' },
                { id: 'referee-1', name: 'Camila Rocha' }
              ]
            });
          }
          if (sql.includes('INSERT INTO public.cap_wallet_transactions')) {
            return Promise.resolve({ rowCount: 1, rows: [{ id: 'tx-1' }] });
          }
          if (sql.includes('INSERT INTO public.cap_client_wallets')) {
            return Promise.resolve({ rowCount: 1 });
          }
          return Promise.resolve({ rows: [] });
        })
      };

      const result = await completeReferralOnAppointmentCompleted(mockDb, 'tenant-1', 'app-999', 'referee-1');

      expect(result).not.toBeNull();
      expect(result.status).toBe('completed');
      expect(result.appointment_id).toBe('app-999');

      // Verifica se houve inserção de transação na carteira para o autor com chave de idempotência
      const walletTxQueries = executedQueries.filter(q => q.sql.includes('INSERT INTO public.cap_wallet_transactions'));
      expect(walletTxQueries.length).toBe(2);

      // Chave de idempotência estrita
      expect(walletTxQueries[0].params[4]).toBe('referral:referrer:referral-uuid-1');
      expect(walletTxQueries[1].params[4]).toBe('referral:referee:referral-uuid-1');
    });
  });

  describe('6. Gestão Administrativa e Governança das Regras', () => {
    test('processReferralBonuses deve gravar notas na timeline do CRM', async () => {
      const { processReferralBonuses } = await import('../services/referralService.js');

      let crmNotes = [];
      const mockClient = {
        query: jest.fn().mockImplementation((sql, params) => {
          if (sql.includes('SELECT id, name FROM public.cap_clients')) {
            return Promise.resolve({
              rows: [
                { id: 'ref-1', name: 'Beatriz Alcantara' },
                { id: 'ref-2', name: 'Juliana Paes' }
              ]
            });
          }
          if (sql.includes('INSERT INTO public.cap_wallet_transactions')) {
            return Promise.resolve({ rowCount: 1, rows: [{ id: 'tx-crm' }] });
          }
          if (sql.includes('INSERT INTO public.cap_timeline_notes')) {
            crmNotes.push({ sql, params });
            return Promise.resolve({ rowCount: 1 });
          }
          return Promise.resolve({ rowCount: 1, rows: [] });
        })
      };

      await processReferralBonuses(mockClient, 'tenant-1', {
        id: 'ref-bonus-123',
        referrer_id: 'ref-1',
        referee_id: 'ref-2',
        referrer_reward_amount: 15.0,
        referee_reward_amount: 15.0
      });

      expect(crmNotes.length).toBe(2);
      expect(crmNotes[0].params[2]).toContain('Indique e Ganhe');
      expect(crmNotes[1].params[2]).toContain('Boas-Vindas Indique e Ganhe');
    });
  });
});
