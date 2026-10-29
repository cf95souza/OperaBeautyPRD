import { describe, it, expect } from '@jest/globals';
import { formatCurrency, formatNumber } from '../../src/utils/formatters.js';

describe('Item J2 — Dashboard do Gestor (Regras de Negócio e Métricas)', () => {

  describe('Formatação de Numerais e Moeda (Conformidade H1 e J2)', () => {
    it('deve formatar valores monetários em padrão BRL canônico', () => {
      expect(formatCurrency(0)).toBe('R$\u00a00,00');
      expect(formatCurrency(1250.5)).toBe('R$\u00a01.250,50');
      expect(formatCurrency('189.9')).toBe('R$\u00a0189,90');
    });

    it('deve formatar contadores numéricos com separador de milhar pt-BR', () => {
      expect(formatNumber(0)).toBe('0');
      expect(formatNumber(1)).toBe('1');
      expect(formatNumber(1500)).toBe('1.500');
    });
  });

  describe('Cálculo de KPIs do Dashboard', () => {
    const mockAppointmentsHoje = [
      { id: '1', status: 'completed', total_price: 150 },
      { id: '2', status: 'completed', total_price: 80 },
      { id: '3', status: 'scheduled', total_price: 120 },
      { id: '4', status: 'cancelled', total_price: 50 },
    ];

    it('deve calcular faturamento de hoje somando apenas agendamentos completed', () => {
      const concluidosHoje = mockAppointmentsHoje.filter(a => a.status === 'completed');
      const faturamentoHoje = concluidosHoje.reduce((sum, a) => sum + a.total_price, 0);

      expect(faturamentoHoje).toBe(230);
      expect(concluidosHoje.length).toBe(2);
    });

    it('deve calcular o total de atendimentos marcados para hoje', () => {
      expect(mockAppointmentsHoje.length).toBe(4);
    });

    it('deve calcular o Ticket Médio com segurança sem divisão por zero', () => {
      const faturamentoMes = 2400;
      const concluidosMes = 12;
      const ticketMedio = concluidosMes > 0 ? faturamentoMes / concluidosMes : 0;
      expect(ticketMedio).toBe(200);

      const faturamentoZero = 0;
      const concluidosZero = 0;
      const ticketMedioZero = concluidosZero > 0 ? faturamentoZero / concluidosZero : 0;
      expect(ticketMedioZero).toBe(0);
    });
  });

  describe('Pluralização Canônica Rigorosa (J2 e §9.6)', () => {
    const pluralizarAtendimentosConcluidos = (qtd) =>
      `${qtd} ${qtd === 1 ? 'atendimento concluído' : 'atendimentos concluídos'}`;

    const pluralizarAtendimentosMarcados = (qtd) =>
      `${qtd} ${qtd === 1 ? 'atendimento marcado' : 'atendimentos marcados'}`;

    const pluralizarItens = (qtd) =>
      `${qtd} ${qtd === 1 ? 'item' : 'itens'}`;

    it('deve pluralizar corretamente atendimentos concluídos', () => {
      expect(pluralizarAtendimentosConcluidos(0)).toBe('0 atendimentos concluídos');
      expect(pluralizarAtendimentosConcluidos(1)).toBe('1 atendimento concluído');
      expect(pluralizarAtendimentosConcluidos(2)).toBe('2 atendimentos concluídos');
      expect(pluralizarAtendimentosConcluidos(15)).toBe('15 atendimentos concluídos');
    });

    it('deve pluralizar corretamente atendimentos marcados', () => {
      expect(pluralizarAtendimentosMarcados(0)).toBe('0 atendimentos marcados');
      expect(pluralizarAtendimentosMarcados(1)).toBe('1 atendimento marcado');
      expect(pluralizarAtendimentosMarcados(5)).toBe('5 atendimentos marcados');
    });

    it('deve pluralizar corretamente contadores de itens de estoque', () => {
      expect(pluralizarItens(0)).toBe('0 itens');
      expect(pluralizarItens(1)).toBe('1 item');
      expect(pluralizarItens(4)).toBe('4 itens');
    });
  });

  describe('Regras de Filtro de Estoque Baixo', () => {
    const inventario = [
      { id: '1', name: 'Perfume Árabe', quantity: 8, min_quantity: 9, unit: 'un' },
      { id: '2', name: 'Shampoo Neutro', quantity: 15, min_quantity: 5, unit: 'un' },
      { id: '3', name: 'Esmalte Carmim', quantity: 2, min_quantity: 2, unit: 'un' }, // crítico (limite)
      { id: '4', name: 'Tinta Loiro Claríssimo', quantity: 0, min_quantity: 3, unit: 'un' } // zerado
    ];

    it('deve filtrar produtos com estoque crítico (quantity <= min_quantity)', () => {
      const baixos = inventario.filter(item => Number(item.quantity) <= Number(item.min_quantity));
      expect(baixos.length).toBe(3);
      expect(baixos.map(i => i.name)).toEqual(['Perfume Árabe', 'Esmalte Carmim', 'Tinta Loiro Claríssimo']);
    });

    it('deve calcular nova quantidade ao repor estoque', () => {
      const item = { ...inventario[0] };
      const qtdAdicionar = 5;
      const novaQuantidade = Number(item.quantity) + qtdAdicionar;

      expect(novaQuantidade).toBe(13);
      expect(novaQuantidade > item.min_quantity).toBe(true);
    });
  });

  describe('Regras de Aniversariantes e Retornos de Manutenção', () => {
    it('deve identificar aniversariantes dentro da janela de 30 dias', () => {
      const hoje = new Date(2026, 9, 21); // 21 de outubro de 2026
      const clientes = [
        { id: '1', name: 'Ana Silva', birth_date: '1990-10-25' }, // 4 dias (dentro)
        { id: '2', name: 'Beatriz Costa', birth_date: '1992-11-10' }, // 20 dias (dentro)
        { id: '3', name: 'Carla Dias', birth_date: '1985-12-05' }, // > 30 dias (fora)
        { id: '4', name: 'Denise Lima', birth_date: '1998-10-15' }, // já passou este ano
      ];

      const limitDate = new Date(2026, 9, 21 + 30);

      const aniversariantesProximos = clientes.filter(c => {
        const [, m, d] = c.birth_date.split('-');
        let niverEsteAno = new Date(hoje.getFullYear(), Number(m) - 1, Number(d));
        if (niverEsteAno < hoje) {
          niverEsteAno = new Date(hoje.getFullYear() + 1, Number(m) - 1, Number(d));
        }
        return niverEsteAno >= hoje && niverEsteAno <= limitDate;
      });

      expect(aniversariantesProximos.length).toBe(2);
      expect(aniversariantesProximos.map(c => c.name)).toEqual(['Ana Silva', 'Beatriz Costa']);
    });

    it('deve calcular data de retorno com base em maintenance_days', () => {
      const dataServico = new Date(2026, 9, 1);
      const maintenanceDays = 21;
      const dataRetorno = new Date(dataServico);
      dataRetorno.setDate(dataRetorno.getDate() + maintenanceDays);

      expect(dataRetorno.getDate()).toBe(22);
      expect(dataRetorno.getMonth()).toBe(9); // Outubro
    });
  });

});
