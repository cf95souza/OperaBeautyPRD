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

describe('Security & Authorization Tests (FINDING-17)', () => {
  let validTokenClientA;
  let validTokenClientB;
  
  beforeAll(() => {
    const secret = process.env.JWT_SECRET || 'fallback_test_secret';
    process.env.JWT_SECRET = secret;
    
    // Token para o Cliente A (Tenant A)
    validTokenClientA = jwt.sign(
      { id: 'clientA-id', role: 'client', tenant_id: 'tenant-A-uuid' },
      secret,
      { expiresIn: '1h' }
    );

    // Token para o Cliente B (Tenant B)
    validTokenClientB = jwt.sign(
      { id: 'clientB-id', role: 'client', tenant_id: 'tenant-B-uuid' },
      secret,
      { expiresIn: '1h' }
    );
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Multi-Tenant & IDOR Isolation', () => {
    it('deve retornar 403 Forbidden ao Cliente A tentar ler dados do Cliente B', async () => {
      // Cliente A tentando dar GET no ID do Cliente B
      const res = await request(app)
        .get('/api/clients/clientB-id')
        .set('Authorization', `Bearer ${validTokenClientA}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/Acesso negado/i);
    });

    it('deve retornar 403 Forbidden ao Cliente A tentar alterar dados do Cliente B', async () => {
      // Cliente A tentando dar PUT no ID do Cliente B
      const res = await request(app)
        .put('/api/clients/clientB-id')
        .set('Authorization', `Bearer ${validTokenClientA}`)
        .send({ name: 'Hackeado' });

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/Acesso negado/i);
    });
  });

  describe('Password Strength Validation', () => {
    it('deve retornar erro 400 (Zod) para senhas fracas ao tentar trocar a senha', async () => {
       const res = await request(app)
        .put('/api/clients/me/password')
        .set('Authorization', `Bearer ${validTokenClientA}`)
        .send({
          password: 'senhafraca' // Falha: sem maiúscula, sem número, sem especial
        });

       expect(res.status).toBe(400);
       expect(res.body.error).toBeDefined();
       
       // Verifica se as mensagens de validação do Zod estão presentes
       const errorMsg = JSON.stringify(res.body);
       expect(errorMsg).toMatch(/1 maiúscula/i);
       expect(errorMsg).toMatch(/1 caractere especial/i);
    });
    
    it('deve permitir a alteração se a senha for forte e atender a complexidade', async () => {
       // Configura o mock do DB para simular sucesso
       db.query.mockResolvedValueOnce({ rows: [{ cap_update_client_password: true }] });

       const res = await request(app)
        .put('/api/clients/me/password')
        .set('Authorization', `Bearer ${validTokenClientA}`)
        .send({
          password: 'SenhaForte!@#2024' // Atende todos os requisitos
        });

       if(res.status !== 200) console.log('DEBUG 200 TEST:', res.body);
       expect(res.status).toBe(200);
       expect(res.body.message).toMatch(/sucesso/i);
    });
  });
});
