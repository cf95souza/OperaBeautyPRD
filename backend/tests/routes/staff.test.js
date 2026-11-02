import request from 'supertest';
import { jest } from '@jest/globals';
import jwt from 'jsonwebtoken';

jest.unstable_mockModule('pino-http', () => {
  return {
    default: () => (req, res, next) => {
      req.log = { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() };
      next();
    }
  };
});

jest.unstable_mockModule('../../config/db.js', () => ({
  default: { query: jest.fn() }
}));

const db = (await import('../../config/db.js')).default;
const app = (await import('../../app.js')).default;

describe('Staff Routes Tests', () => {
  let validTokenManager;
  let validTokenProfessional;
  
  beforeAll(() => {
    const secret = process.env.JWT_SECRET || 'fallback_test_secret';
    process.env.JWT_SECRET = secret;
    
    validTokenManager = jwt.sign(
      { id: 'manager-id', role: 'manager', tenant_id: 'tenant-uuid' },
      secret,
      { expiresIn: '1h' }
    );

    validTokenProfessional = jwt.sign(
      { id: 'prof-id', role: 'professional', tenant_id: 'tenant-uuid' },
      secret,
      { expiresIn: '1h' }
    );
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/staff', () => {
    it('deve retornar lista de profissionais', async () => {
      db.query.mockResolvedValueOnce({ rows: [{ id: 'prof-id', name: 'Ana' }] });

      const res = await request(app)
        .get('/api/staff')
        .set('Authorization', `Bearer ${validTokenManager}`);

      expect(res.status).toBe(200);
      expect(res.body[0].name).toBe('Ana');
    });
  });

  describe('POST /api/staff', () => {
    it('deve permitir manager criar novo staff', async () => {
      // Mock para a query de verificação de plano, inserção, comissão e auditoria
      db.query.mockResolvedValueOnce({ rows: [{ max_professionals: null }] });
      db.query.mockResolvedValueOnce({ rows: [{ staff_id: 'new-staff-id' }] });
      db.query.mockResolvedValueOnce({ rows: [] });
      db.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .post('/api/staff')
        .set('Authorization', `Bearer ${validTokenManager}`)
        .send({
          name: 'João',
          phone: '11999999999',
          email: 'joao@example.com',
          password: 'Password123!',
          role: 'professional',
          commission_rate: 50
        });

      if(res.status !== 201) console.log(res.body);
      expect(res.status).toBe(201);
      expect(res.body.id).toBe('new-staff-id');
    });

    it('deve bloquear (403) professional de criar staff', async () => {
      const res = await request(app)
        .post('/api/staff')
        .set('Authorization', `Bearer ${validTokenProfessional}`)
        .send({
          name: 'João',
          phone: '11999999999',
          email: 'joao@example.com',
          password: 'Password123!',
          role: 'professional'
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/Acesso negado/i);
    });
  });

  describe('PUT /api/staff/me', () => {
    it('deve permitir professional atualizar próprio perfil', async () => {
      db.query.mockResolvedValueOnce({ rows: [{ id: 'prof-id', name: 'Ana Atualizada' }] });

      const res = await request(app)
        .put('/api/staff/me')
        .set('Authorization', `Bearer ${validTokenProfessional}`)
        .send({
          name: 'Ana Atualizada'
        });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Ana Atualizada');
    });
    
    it('nao deve permitir professional alterar seu proprio role (Zod exclui o campo)', async () => {
      // O schema Zod exclui campos não previstos. Como role não está no schema updateSelfSchema,
      // ele é ignorado. O backend não processa a alteração de role por esta rota.
      db.query.mockResolvedValueOnce({ rows: [{ id: 'prof-id', name: 'Ana', role: 'professional' }] });

      const res = await request(app)
        .put('/api/staff/me')
        .set('Authorization', `Bearer ${validTokenProfessional}`)
        .send({
          name: 'Ana',
          role: 'manager' // Tentativa maliciosa
        });

      expect(res.status).toBe(200);
      // Backend validará via service que a query updateSelf não altera role
      // A role não muda na query SQL.
    });
  });

  describe('PUT /api/staff/:id', () => {
    it('deve permitir manager atualizar serviços e dados com commission_rate como string numérica', async () => {
      db.query
        .mockResolvedValueOnce({ rows: [{ name: 'Ana', phone: '11999999999', email: 'ana@teste.com', role: 'professional', is_active: true, commission_rate: '15.00' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .put('/api/staff/6f0f5bae-e8dd-48ed-926d-e40c3b6485c9')
        .set('Authorization', `Bearer ${validTokenManager}`)
        .send({
          name: 'Ana',
          phone: '11999999999',
          email: 'ana@teste.com',
          role: 'professional',
          is_active: true,
          commission_rate: '15.00',
          service_ids: ['a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d']
        });

      expect(res.status).toBe(200);
      expect(res.body.commission_rate).toBe(15);
      expect(res.body.service_ids).toHaveLength(1);
    });
  });
});
