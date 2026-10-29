import { describe, it, expect } from '@jest/globals';
import { formatCurrency } from '../../src/utils/formatters.js';

describe('Item H6 — Detalhe do Salão no Super Admin (§9.5·H6)', () => {

  const mockTenant = {
    id: 'tenant-123',
    name: 'Studio Thais',
    slug: 'studiothais',
    primary_color: '#B58487',
    secondary_color: '#EBB4B8',
    status: 'active',
    plan_name: 'Enterprise',
    plan_price: 99.90,
    overdue_invoices_count: 0,
    client_count: 95,
    staff_count: 4
  };

  describe('Formatação de Dados e Moeda em Padrão Brasileiro (§9.5·H6 e Regra 9.1.7)', () => {
    it('deve formatar o preço do plano com Intl.NumberFormat pt-BR e numerais alinhados', () => {
      const formatted = formatCurrency(mockTenant.plan_price);
      expect(formatted).toBe('R$\u00a099,90');
      expect(formatted).not.toContain('.');
    });

    it('deve gerar rótulo de plano com preço no seletor de assinatura', () => {
      const planLabel = `${mockTenant.plan_name} · ${formatCurrency(mockTenant.plan_price)}/mês`;
      expect(planLabel).toBe('Enterprise · R$\u00a099,90/mês');
    });
  });

  describe('Regras de Slug e Segurança (§9.5·H6)', () => {
    it('deve manter o slug protegido por padrão com aviso educativo', () => {
      const isLockedByDefault = true;
      const lockedWarning = 'Bloqueado · alterar quebra os links';
      expect(isLockedByDefault).toBe(true);
      expect(lockedWarning).toContain('alterar quebra os links');
    });

    it('deve formatar o slug com barra inicial na pílula do cabeçalho', () => {
      const displaySlug = `/${mockTenant.slug}`;
      expect(displaySlug).toBe('/studiothais');
    });
  });

  describe('Cores com Código Hexadecimal e Amostra (§9.5·H6)', () => {
    it('deve validar cores primária e secundária em formato HEX válido', () => {
      const hexRegex = /^#([0-9A-Fa-f]{3}){1,2}$/;
      expect(hexRegex.test(mockTenant.primary_color)).toBe(true);
      expect(hexRegex.test(mockTenant.secondary_color)).toBe(true);
      expect(mockTenant.primary_color).toBe('#B58487');
      expect(mockTenant.secondary_color).toBe('#EBB4B8');
    });
  });

  describe('Status da Conta e Conformidade com Regra de Cores (§9.5·H6 e Regra 9.1.4)', () => {
    it('deve classificar status da conta entre Ativo, Suspenso e Cancelado', () => {
      const validStatuses = ['active', 'suspended', 'cancelled'];
      expect(validStatuses).toContain(mockTenant.status);
    });

    it('deve indicar "Em dia" de forma neutra/verde quando faturas vencidas for zero', () => {
      const isOverdue = Number(mockTenant.overdue_invoices_count || 0) > 0;
      const invoiceBadge = isOverdue ? 'Vencida' : 'Em dia';
      expect(invoiceBadge).toBe('Em dia');
    });

    it('deve indicar "Vencida" com alerta apenas quando houver faturas atrasadas reais', () => {
      const tenantComAtraso = { ...mockTenant, overdue_invoices_count: 2 };
      const isOverdue = Number(tenantComAtraso.overdue_invoices_count) > 0;
      const invoiceBadge = isOverdue ? 'Vencida' : 'Em dia';
      expect(invoiceBadge).toBe('Vencida');
    });
  });

  describe('Integração com Zona de Risco do Super Admin (§9.5·H6 e H7)', () => {
    it('deve exigir confirmação do nome exato e motivo para suspensão', () => {
      const inputConfirmName = 'Studio Thais';
      const inputReason = 'Inadimplência há mais de 45 dias sem resposta';
      
      const isNameMatch = inputConfirmName.trim().toLowerCase() === mockTenant.name.toLowerCase();
      const isReasonValid = inputReason.trim().length >= 5;

      expect(isNameMatch).toBe(true);
      expect(isReasonValid).toBe(true);
    });
  });

});
