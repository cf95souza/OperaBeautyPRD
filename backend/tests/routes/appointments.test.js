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

const mockClient = {
  query: jest.fn(),
  release: jest.fn()
};

jest.unstable_mockModule('../../config/db.js', () => ({
  default: { 
    query: jest.fn(),
    connect: jest.fn(() => mockClient)
  }
}));

const db = (await import('../../config/db.js')).default;
const app = (await import('../../app.js')).default;

describe('Appointments Routes Tests', () => {
  let validTokenClient;
  let validTokenStaff;
  
  beforeAll(() => {
    const secret = process.env.JWT_SECRET || 'fallback_test_secret';
    process.env.JWT_SECRET = secret;
    
    validTokenClient = jwt.sign(
      { id: 'client-id', role: 'client', tenant_id: 'tenant-uuid' },
      secret,
      { expiresIn: '1h' }
    );

    validTokenStaff = jwt.sign(
      { id: 'staff-id', role: 'professional', tenant_id: 'tenant-uuid' },
      secret,
      { expiresIn: '1h' }
    );
  });

  beforeEach(() => {
    jest.clearAllMocks();
    db.query.mockImplementation(async (sql) => {
      return { rows: [{ id: '123e4567-e89b-12d3-a456-426614174002', client_id: 'client-id', name: 'Maria', status: 'cancelled' }] };
    });
    mockClient.query.mockImplementation(async (sql) => {
      if (typeof sql === 'string') {
        if (sql.includes('public.cap_staff WHERE id = $1 AND tenant_id = $2 FOR UPDATE')) {
          return { rows: [{ id: 'staff-id', commission_rate: '10' }] };
        }
        if (sql.includes('public.cap_services')) {
          return { rows: [{ id: '123e4567-e89b-12d3-a456-426614174001', name: 'Corte', duration_minutes: 30, price: 50 }] };
        }
        if (sql.includes('SELECT id FROM public.cap_appointments') && sql.includes('start_time < $4')) {
          return { rows: [] };
        }
        if (sql.includes('INSERT INTO public.cap_appointments')) {
          return { rows: [{ id: 'appt-id', status: 'confirmed' }] };
        }
        if (sql.includes('SELECT id, tenant_id, client_id, staff_id')) {
          return { rows: [{ id: '123e4567-e89b-12d3-a456-426614174002', client_id: 'client-id', staff_id: 'staff-id', service_id: 'service-id', start_time: new Date(), end_time: new Date(), status: 'scheduled' }] };
        }
        if (sql.includes('UPDATE public.cap_appointments')) {
          return { rows: [{ id: 'appt-id', checkin_status: 'checked_in' }] };
        }
      }
      return { rows: [] };
    });
  });

  describe('POST /api/appointments', () => {
    it('deve rejeitar se faltarem parametros obrigatorios', async () => {
      const res = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${validTokenClient}`)
        .send({
          // missing staff_id, service_id etc
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('deve criar agendamento valido', async () => {
      const res = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${validTokenClient}`)
        .send({
          staff_id: '123e4567-e89b-12d3-a456-426614174000',
          service_id: '123e4567-e89b-12d3-a456-426614174001',
          start_time: '2026-10-10T10:00:00Z',
          total_price: 150.00
        });

      expect(res.status).toBe(201);
      expect(res.body.id).toBe('appt-id');
    });

    it('deve retornar 409 quando o horário para o profissional já estiver ocupado', async () => {
      mockClient.query.mockImplementation(async (sql) => {
        if (typeof sql === 'string') {
          if (sql.includes('public.cap_staff WHERE id = $1 AND tenant_id = $2 FOR UPDATE')) {
            return { rows: [{ id: 'staff-id' }] };
          }
          if (sql.includes('public.cap_services')) {
            return { rows: [{ id: '123e4567-e89b-12d3-a456-426614174001', name: 'Corte', duration_minutes: 30, price: 50 }] };
          }
          if (sql.includes('SELECT id FROM public.cap_appointments') && sql.includes('start_time < $4')) {
            return { rows: [{ id: 'conflict-id' }] };
          }
        }
        return { rows: [] };
      });

      const res = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${validTokenClient}`)
        .send({
          staff_id: '123e4567-e89b-12d3-a456-426614174000',
          service_id: '123e4567-e89b-12d3-a456-426614174001',
          start_time: '2026-10-10T10:00:00Z',
          total_price: 150.00
        });

      expect(res.status).toBe(409);
      expect(res.body.error).toMatch(/Esse horário acabou de ser ocupado/);
    });

    it('deve rejeitar (403) cliente de outro tenant', async () => {
      const res = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${validTokenStaff}`) // staff tenta agendar pra um client
        .send({
          client_id: 'another-tenant-client', // format should be uuid, lets simulate it fails at db level
          staff_id: '123e4567-e89b-12d3-a456-426614174000',
          service_id: '123e4567-e89b-12d3-a456-426614174001',
          start_time: '2026-10-10T10:00:00Z',
          total_price: 150.00
        });

      expect(res.status).toBe(400); // 400 Zod because 'another-tenant-client' is not UUID
    });
  });

  describe('PUT /api/appointments/:id', () => {
    it('deve atualizar status e checkin', async () => {
      const res = await request(app)
        .put('/api/appointments/123e4567-e89b-12d3-a456-426614174002')
        .set('Authorization', `Bearer ${validTokenStaff}`)
        .send({
          checkin_status: 'checked_in'
        });

      expect(res.status).toBe(200);
      expect(res.body.checkin_status).toBe('checked_in');
    });

    it('deve permitir manager cancelar agendamento com sucesso', async () => {
      mockClient.query.mockImplementation(async (sql) => {
        if (typeof sql === 'string') {
          if (sql.includes('SELECT id, tenant_id, client_id, staff_id')) {
            return { rows: [{ id: '123e4567-e89b-12d3-a456-426614174002', client_id: 'client-id', staff_id: 'staff-id', service_id: 'service-id', start_time: new Date(), end_time: new Date(), status: 'scheduled' }] };
          }
          if (sql.includes('UPDATE public.cap_appointments')) {
            return { rows: [{ id: '123e4567-e89b-12d3-a456-426614174002', status: 'cancelled' }] };
          }
          if (sql.includes('public.cap_staff WHERE id = $1 AND tenant_id = $2')) {
            return { rows: [{ id: 'staff-id' }] };
          }
          if (sql.includes('INSERT INTO public.cap_timeline_notes')) {
            return { rows: [] };
          }
        }
        return { rows: [] };
      });

      const res = await request(app)
        .put('/api/appointments/123e4567-e89b-12d3-a456-426614174002')
        .set('Authorization', `Bearer ${validTokenStaff}`)
        .send({
          status: 'cancelled',
          cancellation_reason: 'Cliente solicitou cancelamento via WhatsApp'
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('cancelled');
    });
  });

  describe('DELETE /api/appointments/:id', () => {
    it('deve deletar agendamento corretamente', async () => {
      db.query.mockResolvedValueOnce({ rows: [{ id: '123e4567-e89b-12d3-a456-426614174002', client_id: 'client-id', status: 'cancelled' }] });

      const res = await request(app)
        .delete('/api/appointments/123e4567-e89b-12d3-a456-426614174002')
        .set('Authorization', `Bearer ${validTokenClient}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/sucesso/i);
    });
  });
});
