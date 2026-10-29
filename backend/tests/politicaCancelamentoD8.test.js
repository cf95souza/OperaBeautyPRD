import { describe, it, expect } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

describe('D8 (P1) — Política de Cancelamento e Controle de Faltas (No-Show)', () => {
  describe('1. Migração e DDL de Banco de Dados (Phase 24)', () => {
    it('O arquivo de migração phase24_cancellation_and_no_shows.sql deve existir e conter os campos e índices', () => {
      const migrationFile = path.join(rootDir, 'migrations/phase24_cancellation_and_no_shows.sql');
      expect(fs.existsSync(migrationFile)).toBe(true);

      const content = fs.readFileSync(migrationFile, 'utf8');
      // Tenants
      expect(content).toContain('min_cancellation_hours INT DEFAULT 2');
      expect(content).toContain("no_show_penalty_action VARCHAR(30) DEFAULT 'warn'");
      expect(content).toContain('no_show_tolerance_count INT DEFAULT 2');
      // Clients
      expect(content).toContain('no_show_count INT DEFAULT 0');
      expect(content).toContain('is_blocked BOOLEAN DEFAULT FALSE');
      expect(content).toContain('blocked_reason TEXT');
      expect(content).toContain('idx_cap_clients_is_blocked');
      // Appointments
      expect(content).toContain('no_show_marked_at TIMESTAMPTZ');
      expect(content).toContain('no_show_marked_by UUID');
      expect(content).toContain('cancellation_reason TEXT');
      // Grants para opera_app (C5)
      expect(content).toContain("IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'opera_app') THEN");
      expect(content).toContain('GRANT SELECT, INSERT, UPDATE, DELETE ON public.cap_appointments TO opera_app;');
    });
  });

  describe('2. appointmentService.js — Regras de Bloqueio e Janela de Cancelamento', () => {
    const serviceContent = fs.readFileSync(path.join(rootDir, 'services/appointmentService.js'), 'utf8');

    it('createAppointment deve verificar se o cliente está bloqueado e lançar erro CLIENT_BLOCKED', () => {
      expect(serviceContent).toContain('cData.is_blocked');
      expect(serviceContent).toContain("blockErr.code = 'CLIENT_BLOCKED'");
      expect(serviceContent).toContain('Seu cadastro está temporariamente bloqueado para agendamentos online');
    });

    it('updateAppointment deve validar a janela mínima de cancelamento para o cliente', () => {
      expect(serviceContent).toContain("status === 'cancelled'");
      expect(serviceContent).toContain('min_cancellation_hours');
      expect(serviceContent).toContain("userRole === 'client'");
      expect(serviceContent).toContain("cancelErr.code = 'CANCELLATION_WINDOW_EXPIRED'");
      expect(serviceContent).toContain('cancellation_reason');
    });

    it('deleteAppointment deve validar a janela de antecedência e registrar nota de cancelamento na timeline', () => {
      expect(serviceContent).toContain('export const deleteAppointment = async');
      expect(serviceContent).toContain('CANCELLATION_WINDOW_EXPIRED');
      expect(serviceContent).toContain('cap_timeline_notes');
    });

    it('rescheduleAppointment deve respeitar a janela de antecedência antes de permitir reagendamento', () => {
      expect(serviceContent).toContain('export const rescheduleAppointment = async');
      expect(serviceContent).toContain('min_cancellation_hours');
      expect(serviceContent).toContain('CANCELLATION_WINDOW_EXPIRED');
    });

    it('deve exportar markAppointmentNoShow e undoAppointmentNoShow com atualização de contador e timeline', () => {
      expect(serviceContent).toContain('export const markAppointmentNoShow = async');
      expect(serviceContent).toContain("status = 'no_show'");
      expect(serviceContent).toContain('no_show_count = no_show_count + 1');
      expect(serviceContent).toContain("penaltyAction === 'block'");
      expect(serviceContent).toContain('is_blocked = TRUE');
      expect(serviceContent).toContain('export const undoAppointmentNoShow = async');
      expect(serviceContent).toContain("status = 'scheduled'");
      expect(serviceContent).toContain('GREATEST(0, no_show_count - 1)');
    });
  });

  describe('3. clientService.js — Métodos de Gestão de Faltas e Bloqueios no CRM', () => {
    const clientContent = fs.readFileSync(path.join(rootDir, 'services/clientService.js'), 'utf8');

    it('deve retornar no_show_count, is_blocked e blocked_reason em listClients e getClientById', () => {
      expect(clientContent).toContain('c.no_show_count');
      expect(clientContent).toContain('c.is_blocked');
      expect(clientContent).toContain('c.blocked_reason');
    });

    it('deve exportar resetClientNoShows com log automático na timeline', () => {
      expect(clientContent).toContain('export const resetClientNoShows = async');
      expect(clientContent).toContain('no_show_count = 0');
      expect(clientContent).toContain('cap_timeline_notes');
      expect(clientContent).toContain('Histórico de faltas zerado pela gestão do salão');
    });

    it('deve exportar toggleClientBlock com atualização de motivo e log na timeline', () => {
      expect(clientContent).toContain('export const toggleClientBlock = async');
      expect(clientContent).toContain('is_blocked = $1');
      expect(clientContent).toContain('blocked_reason = CASE WHEN $1 = TRUE THEN $2 ELSE NULL END');
      expect(clientContent).toContain('Cliente bloqueado para agendamentos online');
      expect(clientContent).toContain('Bloqueio de agendamentos online removido');
    });
  });

  describe('4. Rotas da API (appointments.js & clients.js & tenants.js)', () => {
    it('routes/appointments.js deve expor rotas POST /:id/no-show e POST /:id/undo-no-show', () => {
      const routesContent = fs.readFileSync(path.join(rootDir, 'routes/appointments.js'), 'utf8');
      expect(routesContent).toContain("router.post('/:id/no-show'");
      expect(routesContent).toContain("router.post('/:id/undo-no-show'");
      expect(routesContent).toContain('markAppointmentNoShow');
      expect(routesContent).toContain('undoAppointmentNoShow');
    });

    it('routes/clients.js deve expor POST /:id/reset-no-shows e POST /:id/toggle-block para gestores', () => {
      const routesContent = fs.readFileSync(path.join(rootDir, 'routes/clients.js'), 'utf8');
      expect(routesContent).toContain("router.post('/:id/reset-no-shows', authMiddleware, requireRole(['manager'])");
      expect(routesContent).toContain("router.post('/:id/toggle-block', authMiddleware, requireRole(['manager'])");
    });

    it('routes/tenants.js deve validar e aceitar parâmetros de cancelamento e no-show em PUT /branding', () => {
      const routesContent = fs.readFileSync(path.join(rootDir, 'routes/tenants.js'), 'utf8');
      expect(routesContent).toContain('min_cancellation_hours');
      expect(routesContent).toContain('no_show_penalty_action');
      expect(routesContent).toContain('no_show_tolerance_count');
    });
  });

  describe('5. Lógica Pura: Cálculo de Antecedência e Política de No-Show', () => {
    it('Deve calcular corretamente se o horário está dentro ou fora da janela mínima em horas', () => {
      const minHours = 2;
      const now = new Date('2026-10-25T14:00:00.000Z');

      // Agendamento daqui a 1 hora (deve bloquear cancelamento pelo cliente)
      const appt1 = new Date('2026-10-25T15:00:00.000Z');
      const hoursUntil1 = (appt1.getTime() - now.getTime()) / (1000 * 60 * 60);
      expect(hoursUntil1).toBe(1);
      expect(hoursUntil1 < minHours).toBe(true);

      // Agendamento daqui a 3 horas (deve permitir cancelamento pelo cliente)
      const appt2 = new Date('2026-10-25T17:00:00.000Z');
      const hoursUntil2 = (appt2.getTime() - now.getTime()) / (1000 * 60 * 60);
      expect(hoursUntil2).toBe(3);
      expect(hoursUntil2 < minHours).toBe(false);
    });

    it('Deve verificar transição de tolerância de faltas para bloqueio automático', () => {
      const tolerance = 2;
      const currentCount = 1;
      const newCount = currentCount + 1; // 2 faltas
      const penaltyAction = 'block';

      const shouldBlock = penaltyAction === 'block' && newCount >= tolerance;
      expect(shouldBlock).toBe(true);

      const penaltyActionWarn = 'warn';
      const shouldBlockWarn = penaltyActionWarn === 'block' && newCount >= tolerance;
      expect(shouldBlockWarn).toBe(false);
    });
  });
});
