import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

describe('D5 (P1) — "Qualquer Profissional" e "Próximo Horário Livre"', () => {
  const servicePath = path.join(rootDir, 'backend/services/appointmentService.js');
  const routesPath = path.join(rootDir, 'backend/routes/appointments.js');
  const apiPath = path.join(rootDir, 'src/lib/api.js');

  test('Arquivos fundamentais de serviço, rotas e cliente da API devem existir', () => {
    expect(fs.existsSync(servicePath)).toBe(true);
    expect(fs.existsSync(routesPath)).toBe(true);
    expect(fs.existsSync(apiPath)).toBe(true);
  });

  describe('Serviço de Agendamento (appointmentService.js)', () => {
    const serviceContent = fs.readFileSync(servicePath, 'utf8');

    test('Deve exportar a função getEligibleStaff para filtrar profissionais capacitados', () => {
      expect(serviceContent).toContain('export const getEligibleStaff = async');
      expect(serviceContent).toContain('cap_staff_services');
    });

    test('getOccupiedSlots deve suportar Qualquer Profissional e só bloquear horários se TODOS os profissionais estiverem ocupados', () => {
      expect(serviceContent).toContain('getOccupiedSlots = async');
      expect(serviceContent).toContain('slotData.busyStaffSet.size >= eligibleStaff.length');
      expect(serviceContent).toContain('fullyOccupiedSlots.push');
    });

    test('getNextAvailableSlot deve varrer os próximos 14 dias e encontrar o primeiro slot livre', () => {
      expect(serviceContent).toContain('export const getNextAvailableSlot = async');
      expect(serviceContent).toContain('cap_business_hours');
      expect(serviceContent).toContain('cap_date_exceptions');
      expect(serviceContent).toContain('isToday && slotMin <= nowTotalMinutes + 15');
    });

    test('createAppointment deve suportar staff_id: any/null e distribuir com balanceamento de carga para o profissional com menor número de atendimentos', () => {
      expect(serviceContent).toContain('if (!targetStaffId || targetStaffId === \'any\')');
      expect(serviceContent).toContain('freeStaffList.sort');
      expect(serviceContent).toContain('countA - countB');
      expect(serviceContent).toContain('targetStaffId = freeStaffList[0].id');
      expect(serviceContent).toContain('appointment.staff_name = staffName');
    });
  });

  describe('Rotas Express (backend/routes/appointments.js)', () => {
    const routesContent = fs.readFileSync(routesPath, 'utf8');

    test('createAppointmentSchema deve aceitar staff_id opcional, nulo ou "any"', () => {
      expect(routesContent).toMatch(/staff_id:\s*z\.union\(\[\s*z\.string\(\)\.uuid\(\),\s*z\.literal\('any'\)\s*\]\)\.nullable\(\)\.optional\(\)/);
    });

    test('Deve conter a rota GET /next-available-slot antes das rotas parametrizadas', () => {
      expect(routesContent).toContain("router.get('/next-available-slot'");
      expect(routesContent).toContain('getNextAvailableSlot');
    });

    test('Rota GET /occupied-slots deve receber e repassar service_id e service_ids', () => {
      expect(routesContent).toContain("router.get('/occupied-slots'");
      expect(routesContent).toContain('service_id, service_ids');
    });
  });

  describe('Cliente de API Frontend (src/lib/api.js)', () => {
    const apiContent = fs.readFileSync(apiPath, 'utf8');

    test('Deve conter api.appointments.getNextAvailableSlot', () => {
      expect(apiContent).toContain('async getNextAvailableSlot(tenantId');
      expect(apiContent).toContain('/appointments/next-available-slot');
    });

    test('api.appointments.getOccupiedSlots deve suportar serviceId e serviceIds', () => {
      expect(apiContent).toContain('getOccupiedSlots(tenantId, date, staffId = null, serviceId = null, serviceIds = null)');
      expect(apiContent).toContain('service_ids');
    });
  });
});
