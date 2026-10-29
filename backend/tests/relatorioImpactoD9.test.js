import { describe, it, expect } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const frontendDir = path.resolve(__dirname, '../../src');

describe('D9 (P1) — Relatório Mensal "Impacto OperaBeauty"', () => {
  describe('1. reportService.js — Lógica de Consolidação de Retorno & Economia', () => {
    const reportServicePath = path.join(rootDir, 'services/reportService.js');
    const content = fs.readFileSync(reportServicePath, 'utf8');

    it('reportService.js deve existir', () => {
      expect(fs.existsSync(reportServicePath)).toBe(true);
    });

    it('Deve exportar as funções getMonthlyImpactReport e sendImpactReportWhatsApp', () => {
      expect(content).toContain('export const getMonthlyImpactReport = async');
      expect(content).toContain('export const sendImpactReportWhatsApp = async');
    });

    it('Não deve utilizar a coluna inexistente appointment_date, mas sim start_time', () => {
      expect(content).not.toContain('appointment_date');
      expect(content).toContain('start_time');
      expect(content).toContain('a.start_time >= $2 AND a.start_time <= $3');
    });

    it('Deve calcular horas poupadas com base em agendamentos autônomos (10 min por agendamento)', () => {
      expect(content).toContain('onlineBookingsCount');
      expect(content).toContain('minutesSaved');
      expect(content).toContain('hoursSaved');
      expect(content).toContain('10'); // 10 minutos por marcação
    });

    it('Deve calcular faltas evitadas e faturamento protegido via lembretes automáticos', () => {
      expect(content).toContain('protectedRevenue');
      expect(content).toContain('no_shows_prevented');
      expect(content).toContain('prevented_loss_revenue');
    });

    it('Deve calcular faturamento total, crescimento percentual vs mês anterior e ticket médio', () => {
      expect(content).toContain('totalRevenue');
      expect(content).toContain('averageTicket');
      expect(content).toContain('growthPercent');
    });

    it('Deve calcular taxa de fidelização e novos vs recorrentes', () => {
      expect(content).toContain('newClients');
      expect(content).toContain('returningClients');
      expect(content).toContain('retentionRate');
    });

    it('Deve consolidar métricas de Clube do Salão e Carteira de Cashback', () => {
      expect(content).toContain('activeClubMembers');
      expect(content).toContain('cashbackDistributed');
      expect(content).toContain('cashbackRedeemed');
      expect(content).toContain('redemption_rate');
    });

    it('Deve identificar os Top Serviços e o Profissional Destaque do mês', () => {
      expect(content).toContain('topServices');
      expect(content).toContain('topStaff');
      expect(content).toContain('completed_count');
    });

    it('sendImpactReportWhatsApp deve estruturar a mensagem executiva e enviar via gateway WhatsApp', () => {
      expect(content).toContain('whatsappService.sendMessage');
      expect(content).toContain('Relatório Mensal: Impacto OperaBeauty');
      expect(content).toContain('Economia de Tempo');
      expect(content).toContain('Receita Protegida');
    });
  });

  describe('2. routes/reports.js — Endpoints REST e Validação Server-Side (Zod)', () => {
    const reportsRoutePath = path.join(rootDir, 'routes/reports.js');
    const content = fs.readFileSync(reportsRoutePath, 'utf8');

    it('reports.js deve existir', () => {
      expect(fs.existsSync(reportsRoutePath)).toBe(true);
    });

    it('Deve registrar as rotas GET /monthly-impact e POST /monthly-impact/send-whatsapp', () => {
      expect(content).toContain("'/monthly-impact'");
      expect(content).toContain("'/monthly-impact/send-whatsapp'");
      expect(content).toContain('router.get');
      expect(content).toContain('router.post');
    });

    it('Rotas devem exigir permissão de gestor ou superadmin com requireRole', () => {
      expect(content).toContain("requireRole(['manager', 'superadmin'])");
    });

    it('Deve registrar a rota GET /bi/heatmap e exportar getHeatmapReport', () => {
      expect(content).toContain("'/bi/heatmap'");
      expect(content).toContain('getHeatmapReport');
    });

    it('Deve possuir validação Zod para os filtros e corpo da requisição', () => {
      expect(content).toContain('monthlyImpactQuerySchema');
      expect(content).toContain('sendImpactWhatsAppSchema');
      expect(content).toContain('phone');
    });
  });

  describe('3. cron/reminders.js — Agendamento Recorrente Mensal', () => {
    const cronPath = path.join(rootDir, 'cron/reminders.js');
    const content = fs.readFileSync(cronPath, 'utf8');

    it('Deve agendar notificação mensal no dia 1º de cada mês às 08:00', () => {
      expect(content).toContain("'0 8 1 * *'");
      expect(content).toContain('Relatório Mensal de Impacto Disponível!');
      expect(content).toContain('cap_notifications');
    });
  });

  describe('4. Frontend — Cliente de API e Interfaces de Apresentação', () => {
    it('src/lib/api.js deve expor os métodos reports.getMonthlyImpact e reports.sendMonthlyImpactWhatsApp', () => {
      const apiPath = path.join(frontendDir, 'lib/api.js');
      expect(fs.existsSync(apiPath)).toBe(true);
      const content = fs.readFileSync(apiPath, 'utf8');

      expect(content).toContain('getMonthlyImpact');
      expect(content).toContain('sendMonthlyImpactWhatsApp');
      expect(content).toContain('/reports/monthly-impact');
    });

    it('src/pages/admin/RelatoriosBI.jsx deve conter design editorial, pílulas de meses e suporte a @media print', () => {
      const biPath = path.join(frontendDir, 'pages/admin/RelatoriosBI.jsx');
      expect(fs.existsSync(biPath)).toBe(true);
      const content = fs.readFileSync(biPath, 'utf8');

      expect(content).toContain('Impacto OperaBeauty');
      expect(content).toContain('available_months');
      expect(content).toContain('@media print');
      expect(content).toContain('window.print');
      expect(content).toContain('sendMonthlyImpactWhatsApp');
    });

    it('src/pages/admin/DashboardAdmin.jsx deve exibir o banner comemorativo de Impacto OperaBeauty', () => {
      const dashPath = path.join(frontendDir, 'pages/admin/DashboardAdmin.jsx');
      expect(fs.existsSync(dashPath)).toBe(true);
      const content = fs.readFileSync(dashPath, 'utf8');

      expect(content).toContain('Banner Comemorativo de Impacto OperaBeauty no Mês');
      expect(content).toContain('monthlyImpact');
      expect(content).toContain('api.reports.getMonthlyImpact');
    });
  });
});
