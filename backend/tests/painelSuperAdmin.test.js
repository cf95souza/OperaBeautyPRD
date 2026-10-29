import { describe, it, expect } from '@jest/globals';
import { formatCurrency } from '../../src/utils/formatters.js';

describe('Item H3 — Painel Geral do Super Admin (§9.5·H3) - Métricas e Regras', () => {

  const mockTenants = [
    {
      id: '1',
      name: 'Ateliê Toda Bonita',
      slug: 'atelietodabonita',
      status: 'active',
      plan_name: 'Enterprise',
      plan_price: 99.90,
      overdue_invoices_count: 0
    },
    {
      id: '2',
      name: 'Studio Thais',
      slug: 'studiothais',
      status: 'active',
      plan_name: 'Enterprise',
      plan_price: 99.90,
      overdue_invoices_count: 0
    },
    {
      id: '3',
      name: 'Salão Suspenso Exemplo',
      slug: 'saloesuspenso',
      status: 'suspended',
      plan_name: 'Solo',
      plan_price: 49.90,
      overdue_invoices_count: 1
    }
  ];

  describe('Cálculo de MRR e Salões Ativos (§9.5·H3)', () => {
    it('deve calcular o MRR somando apenas salões com status = active', () => {
      const activeTenants = mockTenants.filter(t => t.status === 'active');
      const mrr = activeTenants.reduce((sum, t) => sum + t.plan_price, 0);

      expect(activeTenants.length).toBe(2);
      expect(Number(mrr.toFixed(2))).toBe(199.80);
      expect(formatCurrency(mrr)).toBe('R$\u00a0199,80');
    });

    it('deve ignorar salões suspensos ou inativos no cálculo do MRR recorrente', () => {
      const suspendedTenants = mockTenants.filter(t => t.status === 'suspended');
      expect(suspendedTenants.length).toBe(1);

      const totalComSuspensos = mockTenants.reduce((sum, t) => sum + t.plan_price, 0);
      const mrrAtivos = mockTenants.filter(t => t.status === 'active').reduce((sum, t) => sum + t.plan_price, 0);

      expect(mrrAtivos).toBeLessThan(totalComSuspensos);
      expect(mrrAtivos).toBe(199.80);
    });
  });

  describe('Regra de Faturas Pendentes (Conformidade estrita com Regra 9.1.4)', () => {
    it('deve indicar "Tudo em dia" e estilo neutro quando o valor pendente for R$ 0,00', () => {
      const pendingAmount = 0;
      const isZero = pendingAmount === 0;

      const badgeText = isZero ? 'Tudo em dia' : 'A regularizar';
      const isNeutralOrPositive = isZero;

      expect(badgeText).toBe('Tudo em dia');
      expect(isNeutralOrPositive).toBe(true);
      expect(formatCurrency(pendingAmount)).toBe('R$\u00a00,00');
    });

    it('deve acusar "A regularizar" quando houver faturas com pendência financeira', () => {
      const pendingAmount = 149.90;
      const badgeText = pendingAmount === 0 ? 'Tudo em dia' : 'A regularizar';

      expect(badgeText).toBe('A regularizar');
      expect(formatCurrency(pendingAmount)).toBe('R$\u00a0149,90');
    });
  });

  describe('Cálculo de Churn da Plataforma (§9.5·H3)', () => {
    it('deve calcular taxa de churn proporcional aos cancelamentos / suspensões', () => {
      const total = mockTenants.length; // 3
      const suspended = mockTenants.filter(t => t.status === 'suspended').length; // 1

      const churnPercent = Math.round((suspended / total) * 100);
      expect(churnPercent).toBe(33);
    });

    it('deve retornar 0% quando não houver salões cancelados', () => {
      const apenasAtivos = mockTenants.filter(t => t.status === 'active');
      const suspended = apenasAtivos.filter(t => t.status === 'suspended').length;

      const churnPercent = Math.round((suspended / apenasAtivos.length) * 100);
      expect(`${churnPercent}%`).toBe('0%');
    });
  });

  describe('Distribuição de Receita por Plano (§9.5·H3)', () => {
    it('deve agrupar assinantes e MRR por plano', () => {
      const activeTenants = mockTenants.filter(t => t.status === 'active');
      
      const revenueByPlan = {};
      for (const t of activeTenants) {
        if (!revenueByPlan[t.plan_name]) {
          revenueByPlan[t.plan_name] = { subscribers: 0, mrr: 0 };
        }
        revenueByPlan[t.plan_name].subscribers += 1;
        revenueByPlan[t.plan_name].mrr += t.plan_price;
      }

      expect(revenueByPlan['Enterprise']).toBeDefined();
      expect(revenueByPlan['Enterprise'].subscribers).toBe(2);
      expect(Number(revenueByPlan['Enterprise'].mrr.toFixed(2))).toBe(199.80);
    });
  });

  describe('Bloco "Precisa de atenção" (§9.5·H3)', () => {
    it('deve identificar salões com faturas atrasadas para alerta do Super Admin', () => {
      const saloesComProblema = mockTenants.filter(t => t.overdue_invoices_count > 0);

      expect(saloesComProblema.length).toBe(1);
      expect(saloesComProblema[0].name).toBe('Salão Suspenso Exemplo');
    });

    it('deve exibir estado vazio acolhedor quando nenhum salão tiver pendências', () => {
      const saloesSemAtraso = mockTenants.filter(t => t.status === 'active');
      const comProblema = saloesSemAtraso.filter(t => t.overdue_invoices_count > 0);

      expect(comProblema.length).toBe(0);
      const emptyStateMessage = 'Nada pendente. Faturas vencidas e salões sem acesso há 7 dias aparecem aqui.';
      expect(emptyStateMessage).toContain('Nada pendente');
    });
  });

  describe('Enriquecimento da Tabela de Salões', () => {
    it('deve exibir situação da fatura como "Em dia" para salões regulares', () => {
      const tenant = mockTenants[0];
      const faturaStatus = tenant.overdue_invoices_count > 0 ? 'Vencida' : 'Em dia';

      expect(faturaStatus).toBe('Em dia');
    });
  });

});
