import request from 'supertest';
import { jest } from '@jest/globals';

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

describe('Auth Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/login-staff', () => {
    it('deve retornar 400 se faltar e-mail, senha ou tenant_slug', async () => {
      const res = await request(app)
        .post('/api/auth/login-staff')
        .send({ email: 'test@test.com' }); // falta a senha e o tenant_slug

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('deve retornar erro 401 para credenciais inválidas (usuário não encontrado)', async () => {
      // Configura o mock do banco de dados para retornar vazio (usuário não existe)
      db.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .post('/api/auth/login-staff')
        .send({ tenant_slug: 'demo', email: 'inexistente@test.com', password: 'SenhaForte!123' });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Credenciais inválidas.');
    });

    // Testar o sucesso exigiria mockar a função crypt() do postgres ou mockar o authService.
    // Como o authService usa chamadas SQL cruas com gen_salt, o mock no banco precisa simular
    // a resposta correta de um login, o que é um pouco mais complexo de fazer apenas mockando query().
  });
});
