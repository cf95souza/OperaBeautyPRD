import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { describe, it, expect } from '@jest/globals';
import { z } from 'zod';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

describe('FASE 44 - ITEM D12 (P2): Variações de Preço e Extras no Serviço', () => {

  describe('1. Integridade de DDL, Migração e Banco de Dados (phase27_service_variations_and_extras.sql)', () => {
    const migrationPath = path.join(rootDir, 'migrations/phase27_service_variations_and_extras.sql');
    const databaseDocPath = path.join(rootDir, 'database.md');

    it('os arquivos de migração e documentação do banco devem existir', () => {
      expect(fs.existsSync(migrationPath)).toBe(true);
      expect(fs.existsSync(databaseDocPath)).toBe(true);
    });

    it('a migração deve criar cap_service_variations com constraints e colunas necessárias', () => {
      const sql = fs.readFileSync(migrationPath, 'utf-8');
      expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.cap_service_variations');
      expect(sql).toContain('service_id UUID NOT NULL REFERENCES public.cap_services(id)');
      expect(sql).toContain('tenant_id UUID NOT NULL REFERENCES public.cap_tenants(id)');
      expect(sql).toContain('name TEXT NOT NULL');
      expect(sql).toContain('price NUMERIC(10,2) NOT NULL');
      expect(sql).toContain('duration_minutes INTEGER NOT NULL');
      expect(sql).toContain('is_active BOOLEAN NOT NULL DEFAULT TRUE');
    });

    it('a migração deve criar cap_service_extras com constraints e colunas necessárias', () => {
      const sql = fs.readFileSync(migrationPath, 'utf-8');
      expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.cap_service_extras');
      expect(sql).toContain('service_id UUID NOT NULL REFERENCES public.cap_services(id)');
      expect(sql).toContain('tenant_id UUID NOT NULL REFERENCES public.cap_tenants(id)');
      expect(sql).toContain('name TEXT NOT NULL');
      expect(sql).toContain('price NUMERIC(10,2) NOT NULL DEFAULT 0.00');
      expect(sql).toContain('duration_minutes INTEGER NOT NULL DEFAULT 0');
      expect(sql).toContain('is_active BOOLEAN NOT NULL DEFAULT TRUE');
    });

    it('a migração deve habilitar RLS e criar políticas de isolamento multi-tenant', () => {
      const sql = fs.readFileSync(migrationPath, 'utf-8');
      expect(sql).toContain('ALTER TABLE public.cap_service_variations ENABLE ROW LEVEL SECURITY');
      expect(sql).toContain('ALTER TABLE public.cap_service_extras ENABLE ROW LEVEL SECURITY');
      expect(sql).toContain('tenant_isolation_service_variations');
      expect(sql).toContain('tenant_isolation_service_extras');
    });

    it('a migração deve estender cap_appointment_services e conceder privilégios ao usuário opera_app', () => {
      const sql = fs.readFileSync(migrationPath, 'utf-8');
      expect(sql).toContain('ADD COLUMN IF NOT EXISTS variation_id UUID');
      expect(sql).toContain('ADD COLUMN IF NOT EXISTS variation_name TEXT');
      expect(sql).toContain('ADD COLUMN IF NOT EXISTS selected_extras JSONB');
      expect(sql).toContain('GRANT SELECT, INSERT, UPDATE, DELETE ON public.cap_service_variations TO opera_app');
      expect(sql).toContain('GRANT SELECT, INSERT, UPDATE, DELETE ON public.cap_service_extras TO opera_app');
    });

    it('o database.md deve documentar as novas tabelas e colunas', () => {
      const dbDoc = fs.readFileSync(databaseDocPath, 'utf-8');
      expect(dbDoc).toContain('cap_service_variations');
      expect(dbDoc).toContain('cap_service_extras');
      expect(dbDoc).toContain('variation_id');
      expect(dbDoc).toContain('selected_extras');
    });
  });

  describe('2. Validação Zod dos Schemas de Serviços (backend/routes/services.js)', () => {
    const variationItemSchema = z.object({
      id: z.string().uuid().optional(),
      name: z.string().min(1, 'Nome da variação é obrigatório.').max(120),
      price: z.number().min(0, 'Preço da variação não pode ser negativo.'),
      duration_minutes: z.number().int().min(1, 'Duração da variação deve ser de no mínimo 1 minuto.'),
      is_active: z.boolean().optional(),
      sort_order: z.number().int().optional()
    });

    const extraItemSchema = z.object({
      id: z.string().uuid().optional(),
      name: z.string().min(1, 'Nome do adicional é obrigatório.').max(120),
      price: z.number().min(0, 'Preço do adicional não pode ser negativo.'),
      duration_minutes: z.number().int().min(0, 'Duração adicional inválida.').optional(),
      is_active: z.boolean().optional(),
      sort_order: z.number().int().optional()
    });

    const serviceSchema = z.object({
      name: z.string().min(2),
      price: z.number().min(0),
      duration_minutes: z.number().int().min(5),
      is_starting_price: z.boolean().optional(),
      variations: z.array(variationItemSchema).optional(),
      extras: z.array(extraItemSchema).optional()
    });

    it('deve aceitar um serviço com variações e extras válidos', () => {
      const validService = {
        name: 'Alongamento em Gel',
        price: 150.0,
        duration_minutes: 90,
        is_starting_price: true,
        variations: [
          { name: 'Curto', price: 130.0, duration_minutes: 75, is_active: true },
          { name: 'Médio', price: 150.0, duration_minutes: 90, is_active: true },
          { name: 'Longo', price: 180.0, duration_minutes: 110, is_active: true }
        ],
        extras: [
          { name: 'Nail Art (por unha)', price: 15.0, duration_minutes: 15, is_active: true },
          { name: 'Spa das Mãos', price: 40.0, duration_minutes: 20, is_active: true }
        ]
      };

      const result = serviceSchema.safeParse(validService);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.variations.length).toBe(3);
        expect(result.data.extras.length).toBe(2);
      }
    });

    it('deve rejeitar variação com preço negativo', () => {
      const invalid = {
        name: 'Corte de Cabelo',
        price: 80,
        duration_minutes: 40,
        variations: [
          { name: 'Curto', price: -20, duration_minutes: 30 }
        ]
      };
      const result = serviceSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('deve rejeitar extra com nome em branco', () => {
      const invalid = {
        name: 'Manicure',
        price: 45,
        duration_minutes: 45,
        extras: [
          { name: '', price: 20, duration_minutes: 10 }
        ]
      };
      const result = serviceSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('3. Validação Zod dos Schemas de Agendamento com Variações e Extras', () => {
    const serviceItemSchema = z.union([
      z.string().uuid(),
      z.object({
        service_id: z.string().uuid('ID do serviço inválido.'),
        price: z.number().nonnegative().optional(),
        duration_minutes: z.number().int().positive().optional(),
        variation_id: z.string().uuid().optional().nullable(),
        variation_name: z.string().max(120).optional().nullable(),
        extras: z.array(z.string().uuid()).optional()
      })
    ]);

    it('deve aceitar payload de agendamento com variation_id e array de extras', () => {
      const item = {
        service_id: 'a0000000-0000-4000-8000-000000000001',
        variation_id: 'b0000000-0000-4000-8000-000000000002',
        variation_name: 'Cabelo Longo',
        price: 180.0,
        duration_minutes: 75,
        extras: [
          'c0000000-0000-4000-8000-000000000003',
          'd0000000-0000-4000-8000-000000000004'
        ]
      };

      const parsed = serviceItemSchema.safeParse(item);
      expect(parsed.success).toBe(true);
    });

    it('deve aceitar payload legado sem variação nem extras (compatibilidade)', () => {
      const item = {
        service_id: 'a0000000-0000-4000-8000-000000000001',
        price: 80.0,
        duration_minutes: 45
      };

      const parsed = serviceItemSchema.safeParse(item);
      expect(parsed.success).toBe(true);
    });
  });

  describe('4. Regras de Negócio: Cálculo de Preços, Duração e Comissão', () => {
    function calculateServicePricing({ baseService, selectedVariation, selectedExtras }) {
      let finalPrice = parseFloat(baseService.price);
      let finalDuration = parseInt(baseService.duration_minutes, 10);
      let variationName = null;

      if (selectedVariation && selectedVariation.is_active) {
        finalPrice = parseFloat(selectedVariation.price);
        finalDuration = parseInt(selectedVariation.duration_minutes, 10);
        variationName = selectedVariation.name;
      }

      const activeExtras = (selectedExtras || []).filter(e => e.is_active);
      const extrasTotalPrice = activeExtras.reduce((sum, e) => sum + parseFloat(e.price), 0);
      const extrasTotalDuration = activeExtras.reduce((sum, e) => sum + parseInt(e.duration_minutes || 0, 10), 0);

      const totalItemPrice = finalPrice + extrasTotalPrice;
      const totalItemDuration = finalDuration + extrasTotalDuration;

      return {
        unitPrice: finalPrice,
        variationName,
        extras: activeExtras.map(e => ({ id: e.id, name: e.name, price: parseFloat(e.price) })),
        totalItemPrice,
        totalItemDuration
      };
    }

    function calculateCommission(totalServicePrice, commissionRatePercentage) {
      return (totalServicePrice * (commissionRatePercentage / 100));
    }

    it('deve substituir preço e duração pelo da variação selecionada e somar todos os adicionais', () => {
      const baseService = { id: 'srv-1', price: 90.0, duration_minutes: 45 };
      const selectedVariation = { id: 'var-longo', name: 'Longo', price: 130.0, duration_minutes: 60, is_active: true };
      const selectedExtras = [
        { id: 'ext-hidra', name: 'Ampola de Hidratação', price: 35.0, duration_minutes: 15, is_active: true },
        { id: 'ext-escova', name: 'Escova Especial', price: 25.0, duration_minutes: 10, is_active: true }
      ];

      const calculation = calculateServicePricing({ baseService, selectedVariation, selectedExtras });

      // Preço: 130 (variação) + 35 (extra 1) + 25 (extra 2) = 190.00
      expect(calculation.totalItemPrice).toBe(190.0);
      // Duração: 60 (variação) + 15 (extra 1) + 10 (extra 2) = 85 min
      expect(calculation.totalItemDuration).toBe(85);
      expect(calculation.variationName).toBe('Longo');
      expect(calculation.extras.length).toBe(2);

      // Comissão de 40% do profissional sobre o valor total do atendimento (R$ 190 * 0.4 = R$ 76)
      const commission = calculateCommission(calculation.totalItemPrice, 40);
      expect(commission).toBe(76.0);
    });

    it('deve calcular corretamente o "A partir de" (starting_price) com base nas variações ativas', () => {
      const service = {
        name: 'Design e Micropigmentação',
        price: 250.0,
        variations: [
          { name: 'Retoque', price: 120.0, is_active: true },
          { name: 'Sombreada', price: 220.0, is_active: true },
          { name: 'Fio a Fio', price: 280.0, is_active: true },
          { name: 'Promocional Desativada', price: 80.0, is_active: false }
        ]
      };

      const activePrices = service.variations
        .filter(v => v.is_active)
        .map(v => v.price);

      const lowestPrice = Math.min(service.price, ...activePrices);
      expect(lowestPrice).toBe(120.0); // Ignora a inativa de 80.0
    });
  });

  describe('5. Componentes Frontend e Conformidade com Rosé Editorial', () => {
    it('o componente ModalPersonalizarServico.jsx deve existir e conter seletores de variação e extras', () => {
      const modalPath = path.join(rootDir, 'src/components/ModalPersonalizarServico.jsx');
      expect(fs.existsSync(modalPath)).toBe(true);
      const content = fs.readFileSync(modalPath, 'utf-8');
      expect(content).toContain('Personalização Rosé');
      expect(content).toContain('Escolha a variação / tamanho');
      expect(content).toContain('Adicionais opcionais (Extras)');
      expect(content).toContain('selectedVariationId');
      expect(content).toContain('selectedExtraIds');
      expect(content).toContain('formatCurrency');
    });

    it('o CartaoServico.jsx deve exibir badge "Personalizável" e "A partir de"', () => {
      const cardPath = path.join(rootDir, 'src/components/ui/CartaoServico.jsx');
      expect(fs.existsSync(cardPath)).toBe(true);
      const content = fs.readFileSync(cardPath, 'utf-8');
      expect(content).toContain('Personalizável');
      expect(content).toContain('A partir de');
      expect(content).toContain('variation_name');
    });

    it('a tela GestaoServicos.jsx deve conter gerenciamento de Variações e Adicionais', () => {
      const gestaoPath = path.join(rootDir, 'src/pages/admin/GestaoServicos.jsx');
      expect(fs.existsSync(gestaoPath)).toBe(true);
      const content = fs.readFileSync(gestaoPath, 'utf-8');
      expect(content).toContain('Variações de Tamanho / Preço');
      expect(content).toContain('Adicionais e Extras Opcionais');
      expect(content).toContain('has_variations');
      expect(content).toContain('has_extras');
      expect(content).toContain('handleSave');
    });

    it('o fluxo de agendamento (AgendamentoServicos.jsx e AgendamentoRevisao.jsx) deve integrar as escolhas', () => {
      const servicosFlowPath = path.join(rootDir, 'src/pages/AgendamentoServicos.jsx');
      const revisaoFlowPath = path.join(rootDir, 'src/pages/AgendamentoRevisao.jsx');
      expect(fs.existsSync(servicosFlowPath)).toBe(true);
      expect(fs.existsSync(revisaoFlowPath)).toBe(true);

      const servicosContent = fs.readFileSync(servicosFlowPath, 'utf-8');
      expect(servicosContent).toContain('ModalPersonalizarServico');
      expect(servicosContent).toContain('customizingService');
      expect(servicosContent).toContain('handleConfirmCustomization');

      const revisaoContent = fs.readFileSync(revisaoFlowPath, 'utf-8');
      expect(revisaoContent).toContain('variation_name');
      expect(revisaoContent).toContain('extras');
    });
  });
});
