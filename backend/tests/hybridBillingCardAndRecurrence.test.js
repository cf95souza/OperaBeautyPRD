import { describe, it, expect } from '@jest/globals';
import fs from 'fs';
import path from 'path';

const rootDir = process.cwd().endsWith('backend') 
  ? path.resolve(process.cwd(), '..') 
  : process.cwd();

/**
 * Suíte de Testes Fase 51 / G40:
 * Checkout Híbrido SaaS (PIX + Cartão Seguro Mercado Pago + Recorrência)
 * e Não-Retenção de Dados Sensíveis (PCI-DSS)
 */
describe('Fase 51 / G40: Checkout Híbrido SaaS Seguro (PIX + Cartão Mercado Pago)', () => {

  describe('1. Migração Phase 51 e Estrutura de Dados', () => {
    it('deve existir o arquivo de migração phase51_card_payments_and_recurrent_billing.sql', () => {
      const migrationPath = path.resolve(rootDir, 'migrations/phase51_card_payments_and_recurrent_billing.sql');
      expect(fs.existsSync(migrationPath)).toBe(true);

      const content = fs.readFileSync(migrationPath, 'utf8');
      expect(content).toContain('mp_preapproval_id');
      expect(content).toContain('mp_preference_id');
      expect(content).toContain('mp_init_point');
      expect(content).toContain('installments');
    });
  });

  describe('2. Backend Services e Endpoints de Cartão Seguro', () => {
    it('saasBillingService.js deve exportar createSaaSCardPreference e createSaaSSubscriptionPreapproval', () => {
      const servicePath = path.resolve(rootDir, 'backend/services/saasBillingService.js');
      const content = fs.readFileSync(servicePath, 'utf8');

      expect(content).toContain('export const createSaaSCardPreference');
      expect(content).toContain('export const createSaaSSubscriptionPreapproval');
      expect(content).toContain('https://api.mercadopago.com/checkout/preferences');
      expect(content).toContain('https://api.mercadopago.com/preapproval');
    });

    it('invoices.js deve conter as rotas de preferência de cartão e assinatura recorrente', () => {
      const routesPath = path.resolve(rootDir, 'backend/routes/invoices.js');
      const content = fs.readFileSync(routesPath, 'utf8');

      expect(content).toContain('/:id/create-card-preference');
      expect(content).toContain('/subscribe-card');
    });

    it('Princípio PCI-DSS: Não deve haver colunas de número de cartão ou CVV em tabelas locais', () => {
      const migrationPath = path.resolve(rootDir, 'migrations/phase51_card_payments_and_recurrent_billing.sql');
      const content = fs.readFileSync(migrationPath, 'utf8');

      expect(content.toLowerCase()).not.toContain('card_number');
      expect(content.toLowerCase()).not.toContain('card_cvv');
      expect(content.toLowerCase()).not.toContain('cvv');
      expect(content.toLowerCase()).not.toContain('card_expiration');
    });
  });

  describe('3. Frontend API Client e Modal Híbrido', () => {
    it('api.js deve exportar createCardPreference e subscribeCard', () => {
      const apiPath = path.resolve(rootDir, 'src/lib/api.js');
      const content = fs.readFileSync(apiPath, 'utf8');

      expect(content).toContain('createCardPreference');
      expect(content).toContain('subscribeCard');
    });

    it('ModalPagamentoPixSaaS.jsx deve suportar abas PIX e Cartão com indicação PCI-DSS', () => {
      const modalPath = path.resolve(rootDir, 'src/components/admin/ModalPagamentoPixSaaS.jsx');
      const content = fs.readFileSync(modalPath, 'utf8');

      expect(content).toContain("activeTab === 'pix'");
      expect(content).toContain("activeTab === 'card'");
      expect(content).toContain('Pagar com Cartão no Mercado Pago');
      expect(content).toContain('Débito Automático Mensal');
      expect(content).toContain('PCI-DSS');
    });
  });
});
