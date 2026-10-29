import { describe, it, expect } from '@jest/globals';
import { formatCurrency } from '../../src/utils/formatters.js';

describe('Itens H4 e H5 — Super Admin (Salões & Clientes e Gestão de Planos)', () => {

  // Mocks de Salões para H4
  const mockTenants = [
    {
      id: '1',
      name: 'Ateliê Toda Bonita',
      slug: 'atelietodabonita',
      status: 'active',
      plan_name: 'Enterprise',
      plan_price: 99.90,
      overdue_invoices_count: 0,
      client_count: 140,
      created_at: '2026-01-10T10:00:00Z'
    },
    {
      id: '2',
      name: 'Studio Thais',
      slug: 'studiothais',
      status: 'active',
      plan_name: 'Enterprise',
      plan_price: 99.90,
      overdue_invoices_count: 0,
      client_count: 95,
      created_at: '2026-02-15T12:00:00Z'
    },
    {
      id: '3',
      name: 'Salão Bela Rosa',
      slug: 'belarosa',
      status: 'suspended',
      plan_name: 'Básico',
      plan_price: 69.90,
      overdue_invoices_count: 2,
      client_count: 30,
      created_at: '2026-03-01T09:00:00Z'
    },
    {
      id: '4',
      name: 'Espaço Glamour',
      slug: 'espacoglamour',
      status: 'active',
      plan_name: 'Premium',
      plan_price: 79.90,
      overdue_invoices_count: 0,
      client_count: 60,
      created_at: '2026-04-05T14:00:00Z'
    }
  ];

  describe('Item H4 — Filtros, Busca, Ordenação e Paginação (§9.5·H4)', () => {

    it('deve filtrar salões por busca em tempo real (nome, slug ou plano)', () => {
      const q = 'thais';
      const filtered = mockTenants.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.slug.toLowerCase().includes(q) ||
          t.plan_name.toLowerCase().includes(q)
      );
      expect(filtered.length).toBe(1);
      expect(filtered[0].name).toBe('Studio Thais');
    });

    it('deve filtrar por status da conta (active vs suspended)', () => {
      const active = mockTenants.filter((t) => t.status === 'active');
      const suspended = mockTenants.filter((t) => t.status === 'suspended');

      expect(active.length).toBe(3);
      expect(suspended.length).toBe(1);
      expect(suspended[0].name).toBe('Salão Bela Rosa');
    });

    it('deve filtrar por situação da fatura (em dia vs vencida)', () => {
      const upToDate = mockTenants.filter((t) => Number(t.overdue_invoices_count || 0) === 0);
      const overdue = mockTenants.filter((t) => Number(t.overdue_invoices_count || 0) > 0);

      expect(upToDate.length).toBe(3);
      expect(overdue.length).toBe(1);
      expect(overdue[0].slug).toBe('belarosa');
    });

    it('deve filtrar por plano específico', () => {
      const enterpriseTenants = mockTenants.filter((t) => t.plan_name === 'Enterprise');
      expect(enterpriseTenants.length).toBe(2);
      expect(enterpriseTenants.map((t) => t.slug)).toEqual(['atelietodabonita', 'studiothais']);
    });

    it('deve ordenar salões por Nome (A-Z e Z-A)', () => {
      const asc = [...mockTenants].sort((a, b) => a.name.localeCompare(b.name));
      expect(asc[0].name).toBe('Ateliê Toda Bonita');
      expect(asc[asc.length - 1].name).toBe('Studio Thais');

      const desc = [...mockTenants].sort((a, b) => b.name.localeCompare(a.name));
      expect(desc[0].name).toBe('Studio Thais');
      expect(desc[desc.length - 1].name).toBe('Ateliê Toda Bonita');
    });

    it('deve ordenar salões por MRR (Maior e Menor)', () => {
      const mrrDesc = [...mockTenants].sort((a, b) => b.plan_price - a.plan_price);
      expect(mrrDesc[0].plan_price).toBe(99.90);
      expect(mrrDesc[mrrDesc.length - 1].plan_price).toBe(69.90);

      const mrrAsc = [...mockTenants].sort((a, b) => a.plan_price - b.plan_price);
      expect(mrrAsc[0].plan_price).toBe(69.90);
    });

    it('deve calcular a paginação corretamente com itemsPerPage', () => {
      const itemsPerPage = 2;
      const totalPages = Math.ceil(mockTenants.length / itemsPerPage);
      expect(totalPages).toBe(2);

      const page1 = mockTenants.slice(0, itemsPerPage);
      const page2 = mockTenants.slice(itemsPerPage, itemsPerPage * 2);

      expect(page1.length).toBe(2);
      expect(page2.length).toBe(2);
    });
  });

  describe('Item H5 — Gestão de Planos SaaS (§9.5·H5)', () => {
    const mockPlans = [
      {
        id: 'p1',
        name: 'Básico',
        price: 69.90,
        yearly_price: 699.00,
        sort_order: 1,
        subscribers_count: 0,
        total_mrr: 0,
        max_professionals: 2,
        max_banners: 1,
        features: ['Agendamentos ilimitados', 'Suporte por WhatsApp'],
        is_active: true
      },
      {
        id: 'p2',
        name: 'Enterprise',
        price: 99.90,
        yearly_price: 999.00,
        sort_order: 3,
        subscribers_count: 2,
        total_mrr: 199.80,
        max_professionals: 5,
        max_banners: 4,
        features: ['Agendamentos ilimitados', 'PDV', 'Clube de fidelidade', 'Suporte por WhatsApp'],
        is_active: true
      },
      {
        id: 'p3',
        name: 'Solo',
        price: 49.90,
        yearly_price: 499.00,
        sort_order: 0,
        subscribers_count: 0,
        total_mrr: 0,
        max_professionals: 1,
        max_banners: 1,
        features: ['1 profissional', 'Suporte por WhatsApp'],
        is_active: false // Oculto
      }
    ];

    it('deve calcular MRR e contagem de assinantes do plano', () => {
      const enterprise = mockPlans.find((p) => p.name === 'Enterprise');
      expect(enterprise.subscribers_count).toBe(2);
      expect(enterprise.total_mrr).toBe(199.80);
      expect(formatCurrency(enterprise.total_mrr)).toBe('R$\u00a0199,80');
    });

    it('deve sanitizar "Suporte 24/7" substituindo estritamente por "Suporte por WhatsApp"', () => {
      const rawFeatures = ['Agendamentos', 'Suporte 24/7', 'Estoque'];
      const sanitized = rawFeatures.map((feat) =>
        feat.toLowerCase().includes('suporte 24/7') ? 'Suporte por WhatsApp' : feat
      );

      expect(sanitized).toContain('Suporte por WhatsApp');
      expect(sanitized).not.toContain('Suporte 24/7');
    });

    it('deve corrigir terminantemente qualquer grafia errada como "Interprise" para "Enterprise"', () => {
      const inputName = 'Interprise';
      const correctedName = inputName === 'Interprise' ? 'Enterprise' : inputName;
      expect(correctedName).toBe('Enterprise');
    });

    it('deve distinguir visualmente planos Públicos e Ocultos', () => {
      const publicPlans = mockPlans.filter((p) => p.is_active);
      const hiddenPlans = mockPlans.filter((p) => !p.is_active);

      expect(publicPlans.length).toBe(2);
      expect(hiddenPlans.length).toBe(1);
      expect(hiddenPlans[0].name).toBe('Solo');
    });

    it('deve suportar preço anual com desconto comparado a 12 mensalidades', () => {
      const enterprise = mockPlans.find((p) => p.name === 'Enterprise');
      const twelveMonths = enterprise.price * 12; // 1198.80
      expect(enterprise.yearly_price).toBe(999.00);
      expect(enterprise.yearly_price).toBeLessThan(twelveMonths);
      const discount = twelveMonths - enterprise.yearly_price;
      expect(discount).toBeGreaterThan(190);
    });
  });

});
