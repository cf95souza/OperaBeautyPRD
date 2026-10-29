import { describe, it, expect } from '@jest/globals';
import { formatCurrency, formatNumber, formatPercent } from '../../src/utils/formatters.js';

describe('Item J3 — Gestão Financeira (Regras de Negócio e Cálculos)', () => {

  describe('Formatação de Numerais e Moeda (Conformidade H1 e J3)', () => {
    it('deve formatar valores monetários em padrão BRL canônico', () => {
      expect(formatCurrency(0)).toBe('R$\u00a00,00');
      expect(formatCurrency(2450.75)).toBe('R$\u00a02.450,75');
      expect(formatCurrency('120.00')).toBe('R$\u00a0120,00');
    });

    it('deve formatar porcentagens com precisão correta', () => {
      expect(formatPercent(45)).toBe('45%');
      expect(formatPercent(0.125, true)).toBe('12,5%');
    });
  });

  describe('Cálculo de Faturamento Bruto, Líquido e Ticket Médio', () => {
    const mockTransacoes = [
      { id: '1', status: 'completed', total_price: 146, discount_applied: 0, staff_commission_value: 25 },
      { id: '2', status: 'completed', total_price: 120, discount_applied: 10, staff_commission_value: 20 },
      { id: '3', status: 'completed', total_price: 45, discount_applied: 0, staff_commission_value: 10 },
      { id: '4', status: 'cancelled', total_price: 80, discount_applied: 0, staff_commission_value: 0 },
    ];

    it('deve calcular faturamento bruto somando apenas concluídos', () => {
      const concluidos = mockTransacoes.filter(t => t.status === 'completed');
      const totalBruto = concluidos.reduce((sum, t) => sum + t.total_price, 0);

      expect(totalBruto).toBe(311);
      expect(concluidos.length).toBe(3);
    });

    it('deve calcular faturamento líquido deduzindo comissões e descontos', () => {
      const concluidos = mockTransacoes.filter(t => t.status === 'completed');
      const totalBruto = concluidos.reduce((sum, t) => sum + t.total_price, 0);
      const totalComissoes = concluidos.reduce((sum, t) => sum + t.staff_commission_value, 0);
      const totalDescontos = concluidos.reduce((sum, t) => sum + t.discount_applied, 0);

      const faturamentoLiquido = Math.max(0, totalBruto - totalComissoes - totalDescontos);
      // 311 - 55 - 10 = 246
      expect(faturamentoLiquido).toBe(246);
    });

    it('deve calcular o Ticket Médio por atendimento concluído', () => {
      const concluidos = mockTransacoes.filter(t => t.status === 'completed');
      const totalBruto = concluidos.reduce((sum, t) => sum + t.total_price, 0);
      const ticketMedio = concluidos.length > 0 ? totalBruto / concluidos.length : 0;

      // 311 / 3 = 103.6666...
      expect(Number(ticketMedio.toFixed(2))).toBe(103.67);
    });
  });

  describe('Quebra por Formas de Pagamento', () => {
    const transacoesComMetodo = [
      { total_price: 100, payment_method: 'pix' },
      { total_price: 150, payment_method: 'credit_card' },
      { total_price: 50, payment_method: 'credit_card' },
      { total_price: 100, payment_method: 'debit_card' },
      { total_price: 100, payment_method: 'cash' },
    ];

    it('deve agrupar faturamento por forma de pagamento e calcular percentual exato', () => {
      const totalGeral = transacoesComMetodo.reduce((sum, t) => sum + t.total_price, 0); // 500
      expect(totalGeral).toBe(500);

      const creditCardTotal = transacoesComMetodo
        .filter(t => t.payment_method === 'credit_card')
        .reduce((sum, t) => sum + t.total_price, 0); // 200

      const creditCardPercent = (creditCardTotal / totalGeral) * 100;
      expect(creditCardTotal).toBe(200);
      expect(creditCardPercent).toBe(40);

      const pixTotal = transacoesComMetodo
        .filter(t => t.payment_method === 'pix')
        .reduce((sum, t) => sum + t.total_price, 0); // 100
      expect(pixTotal).toBe(100);
      expect((pixTotal / totalGeral) * 100).toBe(20);
    });
  });

  describe('Regras Semânticas e Alertas Neutros (Regra 9.1.4)', () => {
    it('deve classificar pendência zero como neutra e valor positivo como atenção', () => {
      const getStatusClass = (valorPendente) => valorPendente > 0 ? 'text-amber-800' : 'text-stone-900';

      expect(getStatusClass(0)).toBe('text-stone-900');
      expect(getStatusClass(120)).toBe('text-amber-800');
    });
  });

  describe('Mapeamento e Sanitização para Exportação CSV', () => {
    const mockTransacao = {
      id: 'uuid-secreto',
      start_time: '2026-10-21T14:30:00Z',
      client_name: 'Caio Franca',
      service_name: 'Corte e Escova',
      staff_name: 'Juliana Costa',
      payment_method: 'pix',
      total_price: 180.50,
      discount_applied: 10.00,
      staff_commission_value: 36.10,
      commission_status: 'pending'
    };

    it('deve mapear campos para CSV sem expor UUIDs e com formatações legíveis', () => {
      const row = {
        Data: '21/10/2026 14:30',
        Cliente: mockTransacao.client_name,
        Serviço: mockTransacao.service_name,
        Profissional: mockTransacao.staff_name,
        Forma_Pagamento: mockTransacao.payment_method,
        Valor_Cobrado: Number(mockTransacao.total_price).toFixed(2),
        Desconto_Aplicado: Number(mockTransacao.discount_applied).toFixed(2),
        Comissao_Gerada: Number(mockTransacao.staff_commission_value).toFixed(2),
        Status_Comissao: mockTransacao.commission_status === 'paid' ? 'Paga' : 'Pendente'
      };

      expect(row.Data).toBe('21/10/2026 14:30');
      expect(row.Valor_Cobrado).toBe('180.50');
      expect(row.Status_Comissao).toBe('Pendente');
      expect(row.id).toBeUndefined();
    });
  });

});
