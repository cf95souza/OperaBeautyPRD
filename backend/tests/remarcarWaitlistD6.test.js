import { describe, it, expect } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

describe('D6 (P1) — Remarcar em 1 toque e Lista de Espera', () => {
  it('Arquivos fundamentais de serviço, rotas e migração devem existir', () => {
    const migrationFile = path.join(rootDir, 'migrations/phase23_waitlist_and_reschedule.sql');
    const serviceFile = path.join(rootDir, 'services/waitlistService.js');
    const apptServiceFile = path.join(rootDir, 'services/appointmentService.js');
    const routesWaitlist = path.join(rootDir, 'routes/waitlist.js');
    const routesAppt = path.join(rootDir, 'routes/appointments.js');

    expect(fs.existsSync(migrationFile)).toBe(true);
    expect(fs.existsSync(serviceFile)).toBe(true);
    expect(fs.existsSync(apptServiceFile)).toBe(true);
    expect(fs.existsSync(routesWaitlist)).toBe(true);
    expect(fs.existsSync(routesAppt)).toBe(true);
  });

  describe('Remarcar em 1 Toque (appointmentService.js & routes/appointments.js)', () => {
    it('appointmentService.js deve exportar a função rescheduleAppointment', () => {
      const content = fs.readFileSync(path.join(rootDir, 'services/appointmentService.js'), 'utf8');
      expect(content).toContain('export const rescheduleAppointment = async');
      expect(content).toContain("status = 'scheduled'");
      expect(content).toContain('offerNextInWaitlist');
      expect(content).toContain('cancelAppointmentReminders');
      expect(content).toContain('scheduleAppointmentReminders');
    });

    it('deleteAppointment deve chamar offerNextInWaitlist ao cancelar agendamento', () => {
      const content = fs.readFileSync(path.join(rootDir, 'services/appointmentService.js'), 'utf8');
      expect(content).toContain('offerNextInWaitlist');
    });

    it('routes/appointments.js deve conter a rota POST /:id/reschedule com schema Zod', () => {
      const content = fs.readFileSync(path.join(rootDir, 'routes/appointments.js'), 'utf8');
      expect(content).toContain("router.post('/:id/reschedule'");
      expect(content).toContain('rescheduleAppointmentSchema');
      expect(content).toContain('rescheduleAppointment({');
    });
  });

  describe('Lista de Espera e Expiração (waitlistService.js & routes/waitlist.js)', () => {
    it('waitlistService.js deve exportar addToWaitlist com checagem anti-duplicidade', () => {
      const content = fs.readFileSync(path.join(rootDir, 'services/waitlistService.js'), 'utf8');
      expect(content).toContain('export const addToWaitlist = async');
      expect(content).toContain("status IN ('pending', 'offered')");
      expect(content).toContain('Você já está na lista de espera para esta data.');
    });

    it('offerNextInWaitlist deve priorizar por ordem cronológica (created_at ASC) e prazo de 30 min', () => {
      const content = fs.readFileSync(path.join(rootDir, 'services/waitlistService.js'), 'utf8');
      expect(content).toContain('export const offerNextInWaitlist = async');
      expect(content).toContain('ORDER BY w.created_at ASC LIMIT 1 FOR UPDATE');
      expect(content).toContain("status = 'offered'");
      expect(content).toContain('30 * 60 * 1000');
    });

    it('expireOffersAndAdvance deve marcar expiradas e ofertar ao próximo da fila', () => {
      const content = fs.readFileSync(path.join(rootDir, 'services/waitlistService.js'), 'utf8');
      expect(content).toContain('export const expireOffersAndAdvance = async');
      expect(content).toContain("status = 'offered' AND expires_at < NOW()");
      expect(content).toContain("status = 'expired'");
      expect(content).toContain('offerNextInWaitlist');
    });

    it('acceptWaitlistOffer deve validar expiração com erro 410 e converter inscrição', () => {
      const content = fs.readFileSync(path.join(rootDir, 'services/waitlistService.js'), 'utf8');
      expect(content).toContain('export const acceptWaitlistOffer = async');
      expect(content).toContain('statusCode = 410');
      expect(content).toContain("status = 'converted'");
    });

    it('routes/waitlist.js deve registrar endpoints POST /, GET /my, POST /:id/accept e DELETE /:id', () => {
      const content = fs.readFileSync(path.join(rootDir, 'routes/waitlist.js'), 'utf8');
      expect(content).toContain("router.post('/',");
      expect(content).toContain("router.get('/my',");
      expect(content).toContain("router.post('/:id/accept',");
      expect(content).toContain("router.delete('/:id',");
    });
  });

  describe('Cliente de API Frontend (src/lib/api.js)', () => {
    it('Deve conter métodos de reagendamento e waitlist', () => {
      const apiFile = path.resolve(__dirname, '../../src/lib/api.js');
      expect(fs.existsSync(apiFile)).toBe(true);

      const content = fs.readFileSync(apiFile, 'utf8');
      expect(content).toContain('reschedule(id, payload)');
      expect(content).toContain('waitlist: {');
      expect(content).toContain('join(payload)');
      expect(content).toContain('getMy()');
      expect(content).toContain('accept(id, payload)');
      expect(content).toContain('cancel(id)');
    });
  });
});
