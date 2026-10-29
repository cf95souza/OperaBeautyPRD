import { describe, it, expect } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const frontendDir = path.resolve(__dirname, '../../src');

describe('D10 (P1) — Importação de Clientes e Serviços por Planilha', () => {

  describe('1. clientService.js — Importação Transacional de Clientes & Deduplicação', () => {
    const clientServicePath = path.join(rootDir, 'services/clientService.js');
    const content = fs.readFileSync(clientServicePath, 'utf8');

    it('clientService.js deve existir', () => {
      expect(fs.existsSync(clientServicePath)).toBe(true);
    });

    it('Deve exportar a função importClients aceitando tenantId, clientsList, options e userId', () => {
      expect(content).toContain('export const importClients = async (tenantId, clientsList, options = {}, userId = null)');
    });

    it('Deve aplicar isolamento multi-tenant (RLS) com SET LOCAL app.current_tenant_id', () => {
      expect(content).toContain("SET LOCAL app.current_tenant_id = $1");
    });

    it('Deve verificar se o salão existe e bloquear importação para contas suspensas', () => {
      expect(content).toContain("status === 'suspended'");
      expect(content).toContain('Conta do salão está suspensa. Importação bloqueada.');
    });

    it('Deve realizar pré-validação e deduplicação no próprio lote de clientes', () => {
      expect(content).toContain('seenPhonesInBatch');
      expect(content).toContain('Telefone duplicado na planilha');
      expect(content).toContain('Nome do cliente é obrigatório.');
      expect(content).toContain('Telefone inválido (mínimo 10 dígitos com DDD).');
    });

    it('Deve suportar o modo transacional all_or_nothing abortando se houver erros de validação', () => {
      expect(content).toContain('all_or_nothing && rejected.length > 0');
      expect(content).toContain('Importação abortada:');
    });

    it('Deve executar a gravação dentro de transação PostgreSQL com BEGIN, COMMIT e ROLLBACK', () => {
      expect(content).toContain("await client.query('BEGIN')");
      expect(content).toContain("await client.query('COMMIT')");
      expect(content).toContain("await client.query('ROLLBACK')");
    });

    it('Deve suportar on_duplicate = skip e on_duplicate = update', () => {
      expect(content).toContain("on_duplicate === 'update'");
      expect(content).toContain('UPDATE public.cap_clients');
      expect(content).toContain('INSERT INTO public.cap_clients');
    });

    it('Deve registrar a ação de importação na trilha de auditoria via logAudit', () => {
      expect(content).toContain("logAudit(tenantId, userId, 'IMPORT_CLIENTS'");
    });
  });

  describe('2. routes/clients.js — Rota e Schema de Validação Zod', () => {
    const clientsRoutePath = path.join(rootDir, 'routes/clients.js');
    const content = fs.readFileSync(clientsRoutePath, 'utf8');

    it('Deve conter o schema importClientsSchema validando array de clientes e options', () => {
      expect(content).toContain('const importClientsSchema = z.object({');
      expect(content).toContain('all_or_nothing: z.boolean()');
      expect(content).toContain("on_duplicate: z.enum(['skip', 'update'])");
      expect(content).toContain('Limite máximo de 1000 clientes por lote');
    });

    it('Deve proteger a rota POST /import com authMiddleware, requireRole([manager]) e validate', () => {
      expect(content).toContain("router.post('/import', authMiddleware, requireRole(['manager']), validate(importClientsSchema)");
    });
  });

  describe('3. catalogService.js — Importação Transacional de Serviços', () => {
    const catalogServicePath = path.join(rootDir, 'services/catalogService.js');
    const content = fs.readFileSync(catalogServicePath, 'utf8');

    it('catalogService.js deve exportar importServices', () => {
      expect(content).toContain('export const importServices = async (tenantId, servicesList, options = {}, userId = null)');
    });

    it('Deve aplicar isolamento de tenant e checar status da conta', () => {
      expect(content).toContain("SET LOCAL app.current_tenant_id = $1");
      expect(content).toContain("status === 'suspended'");
    });

    it('Deve validar campos essenciais (nome, preço positivo e duração > 0)', () => {
      expect(content).toContain('Nome do serviço é obrigatório.');
      expect(content).toContain('Preço deve ser um valor numérico positivo.');
      expect(content).toContain('Duração deve ser maior que zero minutos.');
    });

    it('Deve detectar duplicidade de serviços por nome no próprio lote e no banco', () => {
      expect(content).toContain('seenNamesInBatch');
      expect(content).toContain('Serviço com mesmo nome duplicado na planilha');
    });

    it('Deve executar transação atômica e invalidar cache do catálogo no Redis', () => {
      expect(content).toContain("await client.query('BEGIN')");
      expect(content).toContain("await client.query('COMMIT')");
      expect(content).toContain("await client.query('ROLLBACK')");
      expect(content).toContain('await redisClient.del(`tenant:${tenantId}:services`)');
    });

    it('Deve registrar a importação de serviços na auditoria via logAudit', () => {
      expect(content).toContain("logAudit(tenantId, userId, 'IMPORT_SERVICES'");
    });
  });

  describe('4. routes/services.js — Rota e Schema de Validação Zod', () => {
    const servicesRoutePath = path.join(rootDir, 'routes/services.js');
    const content = fs.readFileSync(servicesRoutePath, 'utf8');

    it('Deve conter o schema importServicesSchema com limite de serviços por lote', () => {
      expect(content).toContain('const importServicesSchema = z.object({');
      expect(content).toContain('Limite máximo de 500 serviços por lote');
    });

    it('Deve proteger a rota POST /import com permissão de gestor', () => {
      expect(content).toContain("router.post('/import', authMiddleware, requireRole(['manager']), validate(importServicesSchema)");
    });
  });

  describe('5. src/lib/api.js — Métodos no Cliente REST', () => {
    const apiPath = path.join(frontendDir, 'lib/api.js');
    const content = fs.readFileSync(apiPath, 'utf8');

    it('api.clients deve conter método import aceitando clients e options', () => {
      expect(content).toContain('async import(clients, options = {})');
      expect(content).toContain("return request('/clients/import'");
    });

    it('api.services deve conter método import aceitando services e options', () => {
      expect(content).toContain('async import(services, options = {})');
      expect(content).toContain("return request('/services/import'");
    });
  });
});
