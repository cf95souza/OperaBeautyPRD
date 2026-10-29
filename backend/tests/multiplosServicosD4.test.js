import { describe, it, expect } from '@jest/globals';
import { z } from 'zod';

describe('FASE 44 - ITEM D4 (P1): Vários serviços por visita', () => {

  describe('1. Cálculo de Bloco Contínuo na Agenda e Soma de Preços', () => {
    function calculateContinuousBlock(services, startTime) {
      if (!services || services.length === 0) {
        throw new Error('Nenhum serviço selecionado');
      }

      const totalDurationMinutes = services.reduce(
        (sum, s) => sum + parseInt(s.duration_minutes || s.duration || 30, 10),
        0
      );
      const totalPrice = services.reduce(
        (sum, s) => sum + parseFloat(s.price || 0),
        0
      );

      const startDate = new Date(startTime);
      const endDate = new Date(startDate.getTime() + totalDurationMinutes * 60 * 1000);

      return {
        totalDurationMinutes,
        totalPrice,
        startTime: startDate,
        endTime: endDate,
        primaryServiceId: services[0].service_id || services[0].id,
        consolidatedName: services.map(s => s.name).join(' + ')
      };
    }

    it('deve somar as durações e calcular o horário de término correto para múltiplos serviços', () => {
      const services = [
        { id: 'srv-1', name: 'Corte Feminino', duration_minutes: 45, price: 90.00 },
        { id: 'srv-2', name: 'Hidratação Profunda', duration_minutes: 60, price: 150.00 },
        { id: 'srv-3', name: 'Escova Modelada', duration_minutes: 30, price: 60.00 }
      ];

      const startTime = '2026-11-10T14:00:00.000Z';
      const block = calculateContinuousBlock(services, startTime);

      expect(block.totalDurationMinutes).toBe(135); // 45 + 60 + 30 = 135 min (2h15)
      expect(block.totalPrice).toBe(300.00); // 90 + 150 + 60 = 300
      expect(block.primaryServiceId).toBe('srv-1');
      expect(block.consolidatedName).toBe('Corte Feminino + Hidratação Profunda + Escova Modelada');

      // Término às 16:15
      expect(block.endTime.toISOString()).toBe('2026-11-10T16:15:00.000Z');
    });

    it('deve manter compatibilidade quando selecionado apenas 1 serviço', () => {
      const services = [
        { id: 'srv-1', name: 'Design de Sobrancelha', duration_minutes: 30, price: 45.00 }
      ];

      const startTime = '2026-11-10T10:00:00.000Z';
      const block = calculateContinuousBlock(services, startTime);

      expect(block.totalDurationMinutes).toBe(30);
      expect(block.totalPrice).toBe(45.00);
      expect(block.endTime.toISOString()).toBe('2026-11-10T10:30:00.000Z');
    });
  });

  describe('2. Validação Zod do Schema de Agendamento com Múltiplos Serviços', () => {
    const serviceItemSchema = z.union([
      z.string().uuid(),
      z.object({
        service_id: z.string().uuid('ID do serviço inválido.'),
        price: z.number().nonnegative().optional(),
        duration_minutes: z.number().int().positive().optional()
      })
    ]);

    const appointmentBodySchema = z.object({
      staff_id: z.string().uuid(),
      service_id: z.string().uuid().optional(),
      services: z.array(serviceItemSchema).min(1).optional(),
      start_time: z.string().datetime(),
      total_price: z.number().nonnegative()
    });

    it('deve aceitar array estruturado de serviços com preços e durações individuais', () => {
      const payload = {
        staff_id: '11111111-1111-4111-a111-111111111111',
        service_id: '22222222-2222-4222-a222-222222222222',
        services: [
          {
            service_id: '22222222-2222-4222-a222-222222222222',
            price: 80.00,
            duration_minutes: 40
          },
          {
            service_id: '33333333-3333-4333-a333-333333333333',
            price: 120.00,
            duration_minutes: 50
          }
        ],
        start_time: '2026-11-10T14:00:00.000Z',
        total_price: 200.00
      };

      const result = appointmentBodySchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('deve rejeitar payload com array de serviços vazio', () => {
      const payload = {
        staff_id: '11111111-1111-4111-a111-111111111111',
        services: [],
        start_time: '2026-11-10T14:00:00.000Z',
        total_price: 0
      };

      const result = appointmentBodySchema.safeParse(payload);
      expect(result.success).toBe(false);
    });
  });

  describe('3. Cálculo de Comissões Individuais por Serviço na Conclusão', () => {
    function calculateCommissions(appointmentServices, commissionRatePct, fallbackTotalPrice = 0) {
      if (appointmentServices && appointmentServices.length > 0) {
        let totalCommission = 0;
        const details = appointmentServices.map(item => {
          const itemPrice = parseFloat(item.price || 0);
          const commission = (itemPrice * commissionRatePct) / 100;
          totalCommission += commission;
          return {
            service_id: item.service_id,
            price: itemPrice,
            commission_amount: commission
          };
        });
        return {
          totalCommission,
          details
        };
      }

      // Fallback para agendamentos antigos / sem tabela N:M
      return {
        totalCommission: (fallbackTotalPrice * commissionRatePct) / 100,
        details: []
      };
    }

    it('deve calcular a comissão individual de cada serviço e totalizar com exatidão', () => {
      const staffCommissionRate = 40.0; // 40% de comissão para a profissional
      const appointmentServices = [
        { service_id: 'srv-corte', price: 100.00 },
        { service_id: 'srv-coloracao', price: 250.00 },
        { service_id: 'srv-escova', price: 50.00 }
      ];

      const result = calculateCommissions(appointmentServices, staffCommissionRate);

      expect(result.details.length).toBe(3);
      expect(result.details[0].commission_amount).toBe(40.00);  // 40% de 100
      expect(result.details[1].commission_amount).toBe(100.00); // 40% de 250
      expect(result.details[2].commission_amount).toBe(20.00);  // 40% de 50
      expect(result.totalCommission).toBe(160.00);             // 40 + 100 + 20 = 160
    });

    it('deve usar fallback para agendamentos legados que não possuem lista de serviços', () => {
      const staffCommissionRate = 50.0;
      const result = calculateCommissions([], staffCommissionRate, 120.00);

      expect(result.totalCommission).toBe(60.00);
      expect(result.details.length).toBe(0);
    });
  });

  describe('4. Baixa Automática de Insumos de Estoque por Serviço', () => {
    function processStockReduction(servicesDetails, inventoryDb) {
      const updatedInventory = { ...inventoryDb };
      const consumptionLog = [];

      for (const service of servicesDetails) {
        if (!service.reduces_stock || !service.inputs) continue;

        for (const input of service.inputs) {
          const currentQty = updatedInventory[input.inventory_id] || 0;
          const consumed = parseFloat(input.quantity_consumed);
          const newQty = Math.max(0, currentQty - consumed);
          updatedInventory[input.inventory_id] = newQty;
          consumptionLog.push({
            service_id: service.id,
            inventory_id: input.inventory_id,
            consumed,
            remaining: newQty
          });
        }
      }

      return { updatedInventory, consumptionLog };
    }

    it('deve abater estoque de insumos apenas para os serviços que reduzem estoque', () => {
      const initialStock = {
        'tintura-loiro': 10,
        'ox-30': 5,
        'oleo-finalizador': 20
      };

      const servicesInAppointment = [
        {
          id: 'srv-corte',
          reduces_stock: false, // corte simples não consome produto
          inputs: []
        },
        {
          id: 'srv-mechas',
          reduces_stock: true,
          inputs: [
            { inventory_id: 'tintura-loiro', quantity_consumed: 2 },
            { inventory_id: 'ox-30', quantity_consumed: 1 }
          ]
        },
        {
          id: 'srv-tratamento',
          reduces_stock: true,
          inputs: [
            { inventory_id: 'oleo-finalizador', quantity_consumed: 0.5 }
          ]
        }
      ];

      const { updatedInventory, consumptionLog } = processStockReduction(servicesInAppointment, initialStock);

      expect(updatedInventory['tintura-loiro']).toBe(8);
      expect(updatedInventory['ox-30']).toBe(4);
      expect(updatedInventory['oleo-finalizador']).toBe(19.5);
      expect(consumptionLog.length).toBe(3);
    });
  });

  describe('5. Campo Descrição Curta (short_description)', () => {
    const serviceSchema = z.object({
      name: z.string().min(1),
      short_description: z.string().max(255).nullable().optional(),
      duration_minutes: z.number().int().positive(),
      price: z.number().positive()
    });

    it('deve aceitar descrição curta válida com até 255 caracteres', () => {
      const payload = {
        name: 'Escova Modelada',
        short_description: 'Lavagem com massagem capilar e finalização com ondas.',
        duration_minutes: 40,
        price: 70.00
      };

      const result = serviceSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('deve aceitar descrição curta nula ou ausente', () => {
      const payload = {
        name: 'Corte Tradicional',
        duration_minutes: 30,
        price: 50.00
      };

      const result = serviceSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('deve rejeitar descrição curta superior a 255 caracteres', () => {
      const payload = {
        name: 'Procedimento Longo',
        short_description: 'a'.repeat(256),
        duration_minutes: 30,
        price: 50.00
      };

      const result = serviceSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });
  });

});
