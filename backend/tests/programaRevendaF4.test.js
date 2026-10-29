import express from 'express';
import request from 'supertest';
import { jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

// Mock isolado do pool do PostgreSQL para testes unitários rápidos
const mockDbQuery = jest.fn();
jest.unstable_mockModule('../config/db.js', () => ({
  default: {
    query: mockDbQuery
  }
}));

const {
  validateReferralCode,
  registerReseller,
  getResellerDashboard,
  requestPayout,
  applyReferralToNewTenant,
  processInvoiceCommission
} = await import('../services/resellerService.js');

const resellerRoutes = (await import('../routes/reseller.js')).default;

// Cria app isolado para testar rotas sem carregar workers/redis
const testApp = express();
testApp.use(express.json());
testApp.use('/api/resellers', resellerRoutes);

describe('Fase 45: F4 (P2) — Programa de Indicação e Revenda SaaS OperaBeauty', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('1. Validação de Estrutura de Arquivos e DDL de Afiliados', () => {
    test('o script de migração SQL phase35_saas_reseller_program.sql deve existir e conter as 4 tabelas', () => {
      const sqlPath = path.join(rootDir, 'migrations/phase35_saas_reseller_program.sql');
      expect(fs.existsSync(sqlPath)).toBe(true);

      const sqlContent = fs.readFileSync(sqlPath, 'utf-8');
      expect(sqlContent).toContain('cap_saas_resellers');
      expect(sqlContent).toContain('cap_saas_referrals');
      expect(sqlContent).toContain('cap_saas_commissions');
      expect(sqlContent).toContain('cap_saas_payouts');
      expect(sqlContent).toContain('PARCEIROVIP');
    });

    test('o componente de interface PainelRevendedor.jsx deve existir e conter KPIs e saque PIX', () => {
      const compPath = path.join(rootDir, 'src/pages/PainelRevendedor.jsx');
      expect(fs.existsSync(compPath)).toBe(true);

      const content = fs.readFileSync(compPath, 'utf-8');
      expect(content).toContain('Programa de Parceiros');
      expect(content).toContain('Salões Indicados');
      expect(content).toContain('Assinaturas Ativas');
      expect(content).toContain('MRR Recorrente Est.');
      expect(content).toContain('Solicitar Saque PIX');
      expect(content).toContain('operabeauty.com.br/?ref=');
    });

    test('o utilitário referralTracker.js deve conter captura de parâmetros e janela de 30 dias', () => {
      const trackerPath = path.join(rootDir, 'src/lib/referralTracker.js');
      expect(fs.existsSync(trackerPath)).toBe(true);

      const content = fs.readFileSync(trackerPath, 'utf-8');
      expect(content).toContain('operabeauty_saas_ref');
      expect(content).toContain('captureReferralFromUrl');
      expect(content).toContain('30 * 24 * 60 * 60 * 1000');
    });
  });

  describe('2. Validação de Código de Cupom e Afiliado (validateReferralCode)', () => {
    test('deve rejeitar código vazio ou inexistente', async () => {
      mockDbQuery.mockResolvedValueOnce({ rows: [] });
      const res = await validateReferralCode('CODIGOINEXISTENTE');
      expect(res.valid).toBe(false);
    });

    test('deve validar com sucesso código ativo e retornar benefício de 1 mês grátis mútuo', async () => {
      mockDbQuery.mockResolvedValueOnce({
        rows: [{
          id: 'reseller-uuid-1',
          name: 'Thaís Consultora',
          referral_code: 'PARCEIROVIP',
          commission_rate: '20.00',
          status: 'active'
        }]
      });

      const res = await validateReferralCode('PARCEIROVIP');
      expect(res.valid).toBe(true);
      expect(res.reseller_name).toBe('Thaís Consultora');
      expect(res.benefit).toContain('1 mês grátis');
      expect(res.commission_rate).toBe('20.00');
    });
  });

  describe('3. Cadastro de Novo Revendedor/Parceiro (registerReseller)', () => {
    test('deve gerar código exclusivo se não fornecido e cadastrar parceiro', async () => {
      mockDbQuery
        .mockResolvedValueOnce({ rows: [] }) // Verificação de duplicidade de e-mail/código
        .mockResolvedValueOnce({
          rows: [{
            id: 'new-reseller-uuid',
            name: 'Juliana Designer',
            email: 'juliana@salao.com',
            phone: '(11) 99999-8888',
            referral_code: 'JULIANA123',
            commission_rate: '20.00',
            pix_key_type: 'cpf',
            pix_key: '12345678900',
            status: 'active'
          }]
        });

      const res = await registerReseller({
        name: 'Juliana Designer',
        email: 'juliana@salao.com',
        phone: '(11) 99999-8888',
        pix_key_type: 'cpf',
        pix_key: '12345678900'
      });

      expect(res.id).toBe('new-reseller-uuid');
      expect(res.referral_code).toBe('JULIANA123');
      expect(res.commission_rate).toBe('20.00');
    });

    test('deve barrar tentativa de cadastro sem dados obrigatórios', async () => {
      await expect(registerReseller({})).rejects.toThrow('Nome, e-mail e telefone são obrigatórios');
    });
  });

  describe('4. Regras de Negócio de Saque PIX (Mínimo R$ 50,00 e Saldo Disponível)', () => {
    test('deve rejeitar saque com valor inferior a R$ 50,00', async () => {
      await expect(requestPayout('reseller-1', 49.90)).rejects.toThrow('mínimo');
    });

    test('deve rejeitar saque quando o parceiro não possui saldo suficiente', async () => {
      mockDbQuery
        .mockResolvedValueOnce({
          rows: [{ id: 'reseller-1', name: 'Ana', pix_key: '123', pix_key_type: 'cpf', status: 'active' }]
        })
        .mockResolvedValueOnce({ rows: [{ available_balance: '30.00' }] }); // Saldo de comissões disponíveis

      await expect(requestPayout('reseller-1', 100.00)).rejects.toThrow('Saldo insuficiente');
    });
  });

  describe('5. Cálculo de Comissão de 20% sobre Mensalidade (processInvoiceCommission)', () => {
    test('deve calcular comissão de 20% para a fatura do salão indicado', async () => {
      mockDbQuery
        .mockResolvedValueOnce({
          rows: [{
            id: 'inv-456',
            tenant_id: 'tenant-123',
            amount: '129.90',
            status: 'paid',
            reference_month: '2026-10',
            reseller_id: 'reseller-1',
            commission_rate: '20.00',
            reseller_status: 'active'
          }]
        })
        .mockResolvedValueOnce({ rows: [] }) // Idempotência (não existe ainda)
        .mockResolvedValueOnce({
          rows: [{
            id: 'comm-uuid-1',
            reseller_id: 'reseller-1',
            tenant_id: 'tenant-123',
            invoice_id: 'inv-456',
            invoice_amount: '129.90',
            commission_rate: 20.00,
            commission_amount: 25.98,
            status: 'available'
          }]
        });

      const comm = await processInvoiceCommission('inv-456');

      expect(comm).toBeDefined();
      expect(comm.commission_amount).toBe(25.98);
    });
  });

  describe('6. Rotas Express da API de Parceiros (/api/resellers)', () => {
    test('GET /api/resellers/validate/:code com código válido retorna 200', async () => {
      mockDbQuery.mockResolvedValueOnce({
        rows: [{
          id: 'reseller-1',
          name: 'Parceiro VIP',
          referral_code: 'PARCEIROVIP',
          commission_rate: '20.00',
          status: 'active'
        }]
      });

      const res = await request(testApp).get('/api/resellers/validate/PARCEIROVIP');
      expect(res.status).toBe(200);
      expect(res.body.valid).toBe(true);
      expect(res.body.reseller_name).toBe('Parceiro VIP');
    });

    test('GET /api/resellers/validate/:code com código inexistente retorna 404', async () => {
      mockDbQuery.mockResolvedValueOnce({ rows: [] });

      const res = await request(testApp).get('/api/resellers/validate/INVALIDO999');
      expect(res.status).toBe(404);
      expect(res.body.valid).toBe(false);
    });

    test('POST /api/resellers/login sem identificador retorna 400', async () => {
      const res = await request(testApp).post('/api/resellers/login').send({});
      expect(res.status).toBe(400);
    });

    test('POST /api/resellers/payout/:id com valor menor que 50 retorna 400', async () => {
      const res = await request(testApp).post('/api/resellers/payout/reseller-1').send({ amount: 25 });
      expect(res.status).toBe(400);
    });

    test('GET /api/resellers/status retorna status global e comissão padrão', async () => {
      mockDbQuery.mockResolvedValueOnce({
        rows: [{ reseller_program_enabled: false, reseller_default_commission_rate: '20.00' }]
      });

      const res = await request(testApp).get('/api/resellers/status');
      expect(res.status).toBe(200);
      expect(res.body.enabled).toBe(false);
      expect(res.body.default_commission).toBe(20.00);
    });

    test('POST /api/resellers/register retorna 403 Forbidden quando programa está desabilitado', async () => {
      mockDbQuery.mockResolvedValueOnce({
        rows: [{ reseller_program_enabled: false, reseller_default_commission_rate: '20.00' }]
      });

      const res = await request(testApp).post('/api/resellers/register').send({
        name: 'Tentativa Pública',
        email: 'public@test.com',
        phone: '11999999999'
      });

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('temporariamente fechado');
    });

    test('POST /api/resellers/register permite cadastro pelo Super Admin mesmo com programa desabilitado', async () => {
      // Quando is_superadmin é true, pula a verificação de ativação pública
      // 1. Verificação de duplicidade de e-mail/código
      // 2. Insert na tabela cap_saas_resellers
      mockDbQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [{
            id: 'superadmin-created-uuid',
            name: 'Parceiro VIP Exclusivo',
            email: 'vip@test.com',
            phone: '11988887777',
            referral_code: 'SUPERVIP',
            commission_rate: '25.00',
            status: 'active'
          }]
        });

      const res = await request(testApp).post('/api/resellers/register').send({
        name: 'Parceiro VIP Exclusivo',
        email: 'vip@test.com',
        phone: '11988887777',
        referral_code: 'SUPERVIP',
        commission_rate: 25,
        is_superadmin: true
      });

      expect(res.status).toBe(201);
      expect(res.body.reseller.referral_code).toBe('SUPERVIP');
    });
  });

  describe('7. Governança e Relatório no Painel Super Admin', () => {
    test('migração phase36_reseller_governance_superadmin.sql deve existir e adicionar flags de governança', () => {
      const sqlPath = path.join(rootDir, 'migrations/phase36_reseller_governance_superadmin.sql');
      expect(fs.existsSync(sqlPath)).toBe(true);

      const sqlContent = fs.readFileSync(sqlPath, 'utf-8');
      expect(sqlContent).toContain('reseller_program_enabled');
      expect(sqlContent).toContain('reseller_default_commission_rate');
      expect(sqlContent).toContain('DEFAULT FALSE');
    });

    test('tela ParceirosAdmin.jsx deve conter chave PIX auditável, toggle de ativação e aprovação de saques', () => {
      const pagePath = path.join(rootDir, 'src/pages/superadmin/ParceirosAdmin.jsx');
      expect(fs.existsSync(pagePath)).toBe(true);

      const content = fs.readFileSync(pagePath, 'utf-8');
      expect(content).toContain('Parceiros & Programa de Revenda');
      expect(content).toContain('Chave PIX');
      expect(content).toContain('Confirmar Pagamento');
      expect(content).toContain('Confirmar Recusa');
      expect(content).toContain('Convidar Parceiro Manualmente');
    });
  });

});

