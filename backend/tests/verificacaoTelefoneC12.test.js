import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import request from 'supertest';
import { jest } from '@jest/globals';
import { checkPhoneIpLimiter, checkPhonePhoneLimiter } from '../routes/auth.js';
import { checkClientExists, resolveTenantId } from '../services/authService.js';
import pool from '../config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

describe('C12 (P1) — Rota Pública de Verificação de Telefone & Proteção contra Enumeração', () => {
  const authRoutesPath = path.join(rootDir, 'backend/routes/auth.js');
  const authServicePath = path.join(rootDir, 'backend/services/authService.js');
  const frontendApiPath = path.join(rootDir, 'src/lib/api.js');

  test('Arquivos de rotas, serviços e cliente frontend devem existir', () => {
    expect(fs.existsSync(authRoutesPath)).toBe(true);
    expect(fs.existsSync(authServicePath)).toBe(true);
    expect(fs.existsSync(frontendApiPath)).toBe(true);
  });

  describe('1. Análise Estática de Segurança e Governança do Código', () => {
    const authRoutes = fs.readFileSync(authRoutesPath, 'utf8');
    const authService = fs.readFileSync(authServicePath, 'utf8');
    const frontendApi = fs.readFileSync(frontendApiPath, 'utf8');

    test('backend/routes/auth.js deve conter a rota canônica GET /check-phone', () => {
      expect(authRoutes).toMatch(/router\.get\(\s*['"]\/check-phone['"]/);
    });

    test('backend/routes/auth.js deve manter POST /check-client para compatibilidade', () => {
      expect(authRoutes).toMatch(/router\.post\(\s*['"]\/check-client['"]/);
    });

    test('Ambas as rotas devem aplicar rate limiters por IP e por Telefone', () => {
      expect(authRoutes).toMatch(/\/check-phone[\s\S]*?checkPhoneIpLimiter[\s\S]*?checkPhonePhoneLimiter/);
      expect(authRoutes).toMatch(/\/check-client[\s\S]*?checkPhoneIpLimiter[\s\S]*?checkPhonePhoneLimiter/);
    });

    test('Respostas de verificação devem ser estritamente no formato { action: "login" | "register" } sem vazamento de dados', () => {
      const checkPhoneMatches = [...authRoutes.matchAll(/action:\s*result\.exists\s*\?\s*['"]login['"]\s*:\s*['"]register['"]/g)];
      expect(checkPhoneMatches.length).toBeGreaterThanOrEqual(2);
      expect(authRoutes).not.toMatch(/check-phone[\s\S]*?res\.json\(\{\s*client_id/);
      expect(authRoutes).not.toMatch(/check-phone[\s\S]*?res\.json\(\{\s*name/);
    });

    test('src/lib/api.js deve expor o método checkPhone() com suporte a GET /auth/check-phone', () => {
      expect(frontendApi).toMatch(/checkPhone\s*\(\s*tenantIdOrSlug,\s*phone\s*\)/);
      expect(frontendApi).toMatch(/\/auth\/check-phone\?/);
    });
  });

  describe('2. Configuração dos Limitadores de Taxa (Rate Limiters)', () => {
    test('checkPhoneIpLimiter deve ter limite de 30 requisições por janela de 15 minutos', () => {
      expect(checkPhoneIpLimiter).toBeDefined();
      const authRoutes = fs.readFileSync(authRoutesPath, 'utf8');
      expect(authRoutes).toMatch(/checkPhoneIpLimiter\s*=\s*rateLimit\(\{[\s\S]*?windowMs:\s*15\s*\*\s*60\s*\*\s*1000[\s\S]*?max:\s*30/);
    });

    test('checkPhonePhoneLimiter deve ter limite de 5 requisições por janela de 10 minutos', () => {
      expect(checkPhonePhoneLimiter).toBeDefined();
      const authRoutes = fs.readFileSync(authRoutesPath, 'utf8');
      expect(authRoutes).toMatch(/checkPhonePhoneLimiter\s*=\s*rateLimit\(\{[\s\S]*?windowMs:\s*10\s*\*\s*60\s*\*\s*1000[\s\S]*?max:\s*5/);
    });

    test('keyGenerator de checkPhonePhoneLimiter deve normalizar números e isolar por tenant', () => {
      const authRoutes = fs.readFileSync(authRoutesPath, 'utf8');
      expect(authRoutes).toMatch(/keyGenerator:\s*\(req\)\s*=>/);
      expect(authRoutes).toMatch(/phone_limit:\$\{tenant\}:\$\{cleanPhone/);
    });
  });

  describe('3. Validação e Resolução de Tenant e Telefone (Unitário)', () => {
    test('resolveTenantId deve retornar o próprio UUID caso seja fornecido', async () => {
      const dummyUuid = '11111111-2222-3333-4444-555555555555';
      const resolved = await resolveTenantId(dummyUuid, null);
      expect(resolved).toBe(dummyUuid);
    });

    test('resolveTenantId deve retornar null se não passar tenant_id nem slug', async () => {
      const resolved = await resolveTenantId(null, null);
      expect(resolved).toBeNull();
    });

    test('checkClientExists deve rejeitar telefones com menos de 10 dígitos numéricos', async () => {
      await expect(checkClientExists('tenant-id', '12345')).rejects.toThrow('Telefone inválido.');
      await expect(checkClientExists('tenant-id', '(11) 9876')).rejects.toThrow('Telefone inválido.');
    });
  });

  describe('4. Teste de Integração HTTP com Express Mock', () => {
    let app;
    let originalQuery;

    beforeAll(() => {
      originalQuery = pool.query;
      app = express();
      app.use(express.json());

      // Mock da rota GET /auth/check-phone usando a mesma lógica
      app.get('/auth/check-phone', async (req, res) => {
        const { tenant_id, tenant_slug, phone } = req.query;
        if (!tenant_id && !tenant_slug) {
          return res.status(400).json({ error: 'É necessário informar tenant_id ou tenant_slug.' });
        }
        if (!phone || phone.replace(/\D/g, '').length < 10) {
          return res.status(400).json({ error: 'Telefone inválido.' });
        }
        try {
          const resolvedTenantId = await resolveTenantId(tenant_id, tenant_slug);
          if (!resolvedTenantId) {
            return res.status(404).json({ error: 'Salão não encontrado.' });
          }
          const result = await checkClientExists(resolvedTenantId, phone);
          return res.json({ action: result.exists ? 'login' : 'register' });
        } catch (error) {
          if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
          return res.status(500).json({ error: 'Erro interno.' });
        }
      });

      // Mock da rota POST /auth/check-client
      app.post('/auth/check-client', async (req, res) => {
        const { tenant_id, tenant_slug, phone } = req.body;
        if (!tenant_id && !tenant_slug) {
          return res.status(400).json({ error: 'É necessário informar tenant_id ou tenant_slug.' });
        }
        if (!phone || phone.replace(/\D/g, '').length < 10) {
          return res.status(400).json({ error: 'Telefone inválido.' });
        }
        try {
          const resolvedTenantId = await resolveTenantId(tenant_id, tenant_slug);
          if (!resolvedTenantId) {
            return res.status(404).json({ error: 'Salão não encontrado.' });
          }
          const result = await checkClientExists(resolvedTenantId, phone);
          return res.json({ action: result.exists ? 'login' : 'register' });
        } catch (error) {
          if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
          return res.status(500).json({ error: 'Erro interno.' });
        }
      });
    });

    afterAll(async () => {
      pool.query = originalQuery;
    });

    test('GET /auth/check-phone deve retornar 400 se faltar identificação do tenant', async () => {
      const res = await request(app).get('/auth/check-phone?phone=11987654321');
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/tenant/i);
    });

    test('GET /auth/check-phone deve retornar 400 se o telefone for curto', async () => {
      const res = await request(app).get('/auth/check-phone?tenant_slug=salao-demo&phone=123');
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/telefone/i);
    });

    test('GET /auth/check-phone deve retornar 404 se o tenant não for encontrado', async () => {
      pool.query = jest.fn().mockResolvedValueOnce({ rows: [] }); // cap_tenants
      const res = await request(app).get('/auth/check-phone?tenant_slug=inexistente&phone=11987654321');
      expect(res.status).toBe(404);
      expect(res.body.error).toMatch(/Salão não encontrado/i);
    });

    test('GET /auth/check-phone deve retornar { action: "login" } quando cliente existir', async () => {
      pool.query = jest.fn()
        .mockResolvedValueOnce({ rows: [{ id: 'tenant-uuid-123' }] }) // resolveTenantId
        .mockResolvedValueOnce({ rows: [{ id: 'client-uuid-999' }] }); // checkClientExists

      const res = await request(app).get('/auth/check-phone?tenant_slug=salao-vip&phone=(11) 98888-7777');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ action: 'login' });
      // Nunca vaza ID ou dados do cliente
      expect(res.body.id).toBeUndefined();
      expect(res.body.client_id).toBeUndefined();
    });

    test('GET /auth/check-phone deve retornar { action: "register" } quando cliente NÃO existir', async () => {
      pool.query = jest.fn()
        .mockResolvedValueOnce({ rows: [{ id: 'tenant-uuid-123' }] })
        .mockResolvedValueOnce({ rows: [] }); // Não achou

      const res = await request(app).get('/auth/check-phone?tenant_slug=salao-vip&phone=(11) 91111-2222');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ action: 'register' });
    });

    test('POST /auth/check-client legado deve responder exatamente no mesmo formato', async () => {
      pool.query = jest.fn()
        .mockResolvedValueOnce({ rows: [{ id: 'client-uuid-888' }] });

      const res = await request(app)
        .post('/auth/check-client')
        .send({ tenant_id: 'tenant-uuid-123', phone: '11999998888' });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ action: 'login' });
    });
  });
});
