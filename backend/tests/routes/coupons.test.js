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

describe('Coupons Routes Tests', () => {
  let validTokenClient;
  
  beforeAll(() => {
    const secret = process.env.JWT_SECRET || 'fallback_test_secret';
    process.env.JWT_SECRET = secret;
    
    validTokenClient = jwt.sign(
      { id: 'client-id', role: 'client', tenant_id: 'tenant-uuid' },
      secret,
      { expiresIn: '1h' }
    );
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/coupons/:id/redeem', () => {
    it('deve resgatar cupom com sucesso', async () => {
      // Mock validateCoupon select query e redeemCoupon update query
      db.query
        .mockResolvedValueOnce({ rows: [{ id: 'coupon-id', uses: 0, max_uses: 1, expires_at: null, status: 'active' }] }) // SELECT
        .mockResolvedValueOnce({ rows: [{ id: 'coupon-id', uses: 1, max_uses: 1 }] }); // UPDATE

      const res = await request(app)
        .post('/api/coupons/coupon-id/redeem?tenant_id=tenant-uuid')
        .set('Authorization', `Bearer ${validTokenClient}`);

      expect(res.status).toBe(200);
      expect(res.body.uses).toBe(1);
    });

    it('deve rejeitar cupom expirado', async () => {
      db.query.mockResolvedValueOnce({ rows: [{ id: 'coupon-id', status: 'expired' }] }); 

      const res = await request(app)
        .post('/api/coupons/coupon-id/redeem?tenant_id=tenant-uuid')
        .set('Authorization', `Bearer ${validTokenClient}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/expirado ou inativo/i);
    });

    it('deve rejeitar limite de usos excedido', async () => {
      db.query.mockResolvedValueOnce({ rows: [{ id: 'coupon-id', uses: 5, max_uses: 5, status: 'active' }] }); 

      const res = await request(app)
        .post('/api/coupons/coupon-id/redeem?tenant_id=tenant-uuid')
        .set('Authorization', `Bearer ${validTokenClient}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/limite máximo de usos/i);
    });

    it('deve retornar 404 para cupom de outro tenant (isolamento)', async () => {
      db.query.mockResolvedValueOnce({ rows: [] }); // Simula que a query de SELECT validando o tenant_id retornou vazio

      const res = await request(app)
        .post('/api/coupons/other-tenant-coupon-id/redeem?tenant_id=tenant-uuid')
        .set('Authorization', `Bearer ${validTokenClient}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toMatch(/não encontrado/i);
    });
  });
});
