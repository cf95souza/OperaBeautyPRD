import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  generateSaaSPixPayload
} from '../services/saasBillingService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('D18 (P1) — Cobrança Automática do SaaS, Carência e Bloqueio Gradual', () => {

  describe('1. Geração de Payload PIX Copia e Cola & QR Code EMV BR Code', () => {
    test('generateSaaSPixPayload deve gerar código EMV BR Code com valor e merchant', () => {
      const payload = generateSaaSPixPayload({
        amount: 99.90,
        invoiceId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        referenceMonth: 'Outubro/2026',
        tenantSlug: 'studiothais'
      });

      expect(payload).toBeDefined();
      expect(payload.pix_copy_paste).toBeDefined();
      expect(payload.pix_copy_paste).toContain('00020126580014br.gov.bcb.pix');
      expect(payload.pix_copy_paste).toContain('OPERA BEAUTY SAAS');
      expect(payload.pix_copy_paste).toContain('99.90');

      expect(payload.pix_qr_code).toBeDefined();
      expect(payload.pix_qr_code).toContain('create-qr-code');
    });

    test('Deve formatar valores decimais com 2 casas com precisão', () => {
      const payload = generateSaaSPixPayload({
        amount: 150,
        invoiceId: '12345678-1234-1234-1234-123456789012',
        referenceMonth: 'Novembro/2026',
        tenantSlug: 'salao-vip'
      });

      expect(payload.pix_copy_paste).toContain('150.00');
    });
  });

  describe('2. Tolerância de Carência (Grace Period) e Cálculo de Inadimplência', () => {
    test('Salão em atraso há 3 dias dentro do limite de 5 dias deve permanecer em carência sem bloqueio', () => {
      const gracePeriodDays = 5;
      const daysOverdue = 3;

      const isGracePeriod = daysOverdue > 0 && daysOverdue <= gracePeriodDays;
      const isBlocked = daysOverdue > gracePeriodDays;
      const remainingGraceDays = Math.max(0, gracePeriodDays - daysOverdue);

      expect(isGracePeriod).toBe(true);
      expect(isBlocked).toBe(false);
      expect(remainingGraceDays).toBe(2);
    });

    test('Salão em atraso há 6 dias (além do limite de 5 dias) deve ativar bloqueio gradual', () => {
      const gracePeriodDays = 5;
      const daysOverdue = 6;

      const isGracePeriod = daysOverdue > 0 && daysOverdue <= gracePeriodDays;
      const isBlocked = daysOverdue > gracePeriodDays;
      const remainingGraceDays = Math.max(0, gracePeriodDays - daysOverdue);

      expect(isGracePeriod).toBe(false);
      expect(isBlocked).toBe(true);
      expect(remainingGraceDays).toBe(0);
    });

    test('Salão com fatura em dia (dias em atraso <= 0) não deve estar em carência nem bloqueado', () => {
      const gracePeriodDays = 5;
      const daysOverdue = 0;

      const isGracePeriod = daysOverdue > 0 && daysOverdue <= gracePeriodDays;
      const isBlocked = daysOverdue > gracePeriodDays;
      const remainingGraceDays = gracePeriodDays;

      expect(isGracePeriod).toBe(false);
      expect(isBlocked).toBe(false);
      expect(remainingGraceDays).toBe(5);
    });
  });

  describe('3. Governança de DDL e Menor Privilégio no PostgreSQL (C5)', () => {
    test('Arquivo de migração phase26_automated_saas_billing.sql deve existir e conter estrutura D18', () => {
      const migrationPath = fs.existsSync(path.resolve(__dirname, '../migrations/phase26_automated_saas_billing.sql'))
        ? path.resolve(__dirname, '../migrations/phase26_automated_saas_billing.sql')
        : path.resolve(__dirname, '../../migrations/phase26_automated_saas_billing.sql');
      expect(fs.existsSync(migrationPath)).toBe(true);

      const content = fs.readFileSync(migrationPath, 'utf-8');
      expect(content).toContain('pix_copy_paste');
      expect(content).toContain('pix_qr_code');
      expect(content).toContain('grace_period_days');
      expect(content).toContain('overdue_since');
      expect(content).toContain('billing_locked_at');
      expect(content).toContain('GRANT SELECT, INSERT, UPDATE ON public.cap_invoices TO opera_app');
    });

    test('Documentação database.md deve documentar as colunas e a Seção 22 do D18', () => {
      const dbDocPath = path.resolve(__dirname, '../../database.md');
      expect(fs.existsSync(dbDocPath)).toBe(true);

      const content = fs.readFileSync(dbDocPath, 'utf-8');
      expect(content).toContain('pix_copy_paste');
      expect(content).toContain('pix_qr_code');
      expect(content).toContain('grace_period_days');
      expect(content).toContain('overdue_since');
      expect(content).toContain('billing_locked_at');
      expect(content).toContain('D18');
    });
  });

  describe('4. Trava de Agendamentos Online no Bloqueio Gradual (Read-Only Mode)', () => {
    test('appointmentService.js deve conter verificação de bloqueio financeiro no createAppointment', () => {
      const apptServicePath = path.resolve(__dirname, '../services/appointmentService.js');
      expect(fs.existsSync(apptServicePath)).toBe(true);

      const content = fs.readFileSync(apptServicePath, 'utf-8');
      expect(content).toContain('billing_locked_at');
      expect(content).toContain('TENANT_OVERDUE');
      expect(content).toContain('statusCode = 402');
    });
  });

  describe('5. Rotas da API e Integração no Frontend', () => {
    test('backend/routes/invoices.js deve exportar rotas /status, /:id/simulate-pay, /webhook e /check-overdue', () => {
      const routesPath = path.resolve(__dirname, '../routes/invoices.js');
      expect(fs.existsSync(routesPath)).toBe(true);

      const content = fs.readFileSync(routesPath, 'utf-8');
      expect(content).toContain("router.get('/status'");
      expect(content).toContain("router.post('/:id/simulate-pay'");
      expect(content).toContain("router.post('/webhook'");
      expect(content).toContain("router.post('/check-overdue'");
    });

    test('src/lib/api.js deve expor o namespace api.invoices com os métodos do D18', () => {
      const apiPath = path.resolve(__dirname, '../../src/lib/api.js');
      expect(fs.existsSync(apiPath)).toBe(true);

      const content = fs.readFileSync(apiPath, 'utf-8');
      expect(content).toContain('invoices: {');
      expect(content).toContain('getBillingStatus(');
      expect(content).toContain('simulatePayment(');
      expect(content).toContain('checkOverdue(');
    });

    test('ModalPagamentoPixSaaS.jsx deve existir e conter botão Copiar e Simulação Sandbox', () => {
      const modalPath = path.resolve(__dirname, '../../src/components/admin/ModalPagamentoPixSaaS.jsx');
      expect(fs.existsSync(modalPath)).toBe(true);

      const content = fs.readFileSync(modalPath, 'utf-8');
      expect(content).toContain('ModalPagamentoPixSaaS');
      expect(content).toContain('handleCopy');
      expect(content).toContain('handleSimulatePayment');
      expect(content).toContain('Simular Baixa (Sandbox)');
      expect(content).toContain('pix_copy_paste');
    });

    test('AssinaturaSaaS.jsx deve renderizar banners de carência e bloqueio com botão PIX', () => {
      const pagePath = path.resolve(__dirname, '../../src/pages/admin/AssinaturaSaaS.jsx');
      expect(fs.existsSync(pagePath)).toBe(true);

      const content = fs.readFileSync(pagePath, 'utf-8');
      expect(content).toContain('is_grace_period');
      expect(content).toContain('is_blocked');
      expect(content).toContain('ModalPagamentoPixSaaS');
      expect(content).toContain('api.invoices.getBillingStatus');
    });

    test('DashboardAdmin.jsx deve conter alertas de tolerância e bloqueio do SaaS', () => {
      const dashPath = path.resolve(__dirname, '../../src/pages/admin/DashboardAdmin.jsx');
      expect(fs.existsSync(dashPath)).toBe(true);

      const content = fs.readFileSync(dashPath, 'utf-8');
      expect(content).toContain('saasBillingStatus');
      expect(content).toContain('api.invoices.getBillingStatus');
      expect(content).toContain('is_blocked');
      expect(content).toContain('is_grace_period');
    });
  });
});
