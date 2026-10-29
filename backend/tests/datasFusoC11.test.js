import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { formatDate, formatTime, formatDateTime, parseLocalDate, DEFAULT_TIMEZONE } from '../../src/utils/formatters.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

describe('C11 (P1) — Datas e Fuso Horário (America/Sao_Paulo)', () => {
  const dbConfigPath = path.join(rootDir, 'backend/config/db.js');
  const dockerComposePath = path.join(rootDir, 'docker-compose.yml');
  const migrationPath = path.join(rootDir, 'migrations/phase17_timezone_and_dates.sql');
  const databaseDocPath = path.join(rootDir, 'database.md');
  const formattersPath = path.join(rootDir, 'src/utils/formatters.js');

  test('Todos os arquivos de governança, banco e formatadores devem existir', () => {
    expect(fs.existsSync(dbConfigPath)).toBe(true);
    expect(fs.existsSync(dockerComposePath)).toBe(true);
    expect(fs.existsSync(migrationPath)).toBe(true);
    expect(fs.existsSync(databaseDocPath)).toBe(true);
    expect(fs.existsSync(formattersPath)).toBe(true);
  });

  describe('1. Configuração do Servidor e Banco (America/Sao_Paulo & Parser)', () => {
    const dbConfig = fs.readFileSync(dbConfigPath, 'utf8');
    const dockerCompose = fs.readFileSync(dockerComposePath, 'utf8');
    const migration = fs.readFileSync(migrationPath, 'utf8');

    test('backend/config/db.js deve fixar process.env.TZ como America/Sao_Paulo', () => {
      expect(dbConfig).toMatch(/process\.env\.TZ\s*=\s*process\.env\.TZ\s*\|\|\s*'America\/Sao_Paulo'/);
    });

    test('backend/config/db.js deve manter o parser de DATE como string pura (sem conversão de fuso)', () => {
      expect(dbConfig).toMatch(/pg\.types\.setTypeParser\(pg\.types\.builtins\.DATE,\s*\(value\)\s*=>\s*value\)/);
    });

    test('backend/config/db.js deve configurar SET TIME ZONE na conexão do pool', () => {
      expect(dbConfig).toMatch(/pool\.on\('connect'/);
      expect(dbConfig).toMatch(/SET TIME ZONE 'America\/Sao_Paulo'/);
    });

    test('docker-compose.yml deve conter TZ: America/Sao_Paulo nos serviços db, api e caddy', () => {
      expect(dockerCompose).toMatch(/container_name:\s*operabeauty-db[\s\S]*?TZ:\s*America\/Sao_Paulo/);
      expect(dockerCompose).toMatch(/container_name:\s*operabeauty-api[\s\S]*?TZ:\s*America\/Sao_Paulo/);
      expect(dockerCompose).toMatch(/container_name:\s*operabeauty-caddy[\s\S]*?TZ:\s*America\/Sao_Paulo/);
    });

    test('migration phase17 deve configurar ALTER DATABASE e roles para America/Sao_Paulo', () => {
      expect(migration).toMatch(/ALTER DATABASE operabeauty SET timezone TO 'America\/Sao_Paulo'/i);
      expect(migration).toMatch(/ALTER ROLE postgres SET timezone TO 'America\/Sao_Paulo'/i);
      expect(migration).toMatch(/ALTER ROLE opera_app SET timezone TO 'America\/Sao_Paulo'/i);
    });

    test('migration phase17 deve garantir que horários de agendamento sejam TIMESTAMPTZ', () => {
      expect(migration).toMatch(/ALTER TABLE public\.cap_appointments[\s\S]*?start_time TYPE TIMESTAMPTZ/i);
      expect(migration).toMatch(/ALTER TABLE public\.cap_appointments[\s\S]*?end_time TYPE TIMESTAMPTZ/i);
    });
  });

  describe('2. Utilitários Frontend e Formatação Segura (formatters.js)', () => {
    test('DEFAULT_TIMEZONE deve ser estritamente America/Sao_Paulo', () => {
      expect(DEFAULT_TIMEZONE).toBe('America/Sao_Paulo');
    });

    test('formatDate deve formatar strings puras YYYY-MM-DD sem deslocamento para o dia anterior', () => {
      // Data pura (ex: vencimento de fatura, aniversário, exceção)
      const formatted = formatDate('2026-10-23');
      expect(formatted).toBe('23/10/2026');
      expect(formatted).not.toBe('22/10/2026');
    });

    test('formatDate com virada de mês/ano deve manter integridade exata', () => {
      expect(formatDate('2026-01-01')).toBe('01/01/2026');
      expect(formatDate('2026-12-31')).toBe('31/12/2026');
    });

    test('formatDate no modo long deve exibir o mês por extenso em português', () => {
      const formatted = formatDate('2026-10-23', 'long');
      expect(formatted.toLowerCase()).toContain('outubro');
      expect(formatted).toContain('2026');
    });

    test('formatTime deve formatar horário no padrão 24 horas brasileiro (HH:MM)', () => {
      const timeIso = '2026-10-23T14:30:00Z';
      const formatted = formatTime(timeIso);
      // Em UTC-3, 14:30 UTC vira 11:30
      expect(formatted).toMatch(/^\d{2}:\d{2}$/);
    });

    test('formatDateTime deve combinar data e hora com preposição "às"', () => {
      const isoString = '2026-10-23T15:45:00.000Z';
      const formatted = formatDateTime(isoString);
      expect(formatted).toContain('às');
      expect(formatted).toMatch(/\d{2}\/\d{2}\/\d{4} às \d{2}:\d{2}/);
    });

    test('parseLocalDate deve instanciar data no meio-dia local para evitar shifts noturnos', () => {
      const parsed = parseLocalDate('2026-10-23');
      expect(parsed).toBeInstanceOf(Date);
      expect(parsed.getDate()).toBe(23);
      expect(parsed.getMonth()).toBe(9); // 0-indexed (outubro = 9)
      expect(parsed.getFullYear()).toBe(2026);
    });
  });

  describe('3. Teste de Virada de Dia e Horário de Verão Histórico', () => {
    test('Virada de dia no fuso America/Sao_Paulo deve manter o dia correto', () => {
      // 23:59:00 UTC-3 em ISO UTC é 02:59:00Z do dia seguinte
      const noiteIso = '2026-10-23T23:59:00-03:00';
      const dtf = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit' });
      expect(dtf.format(new Date(noiteIso))).toBe('23');

      // 00:01:00 UTC-3
      const madrugadaIso = '2026-10-24T00:01:00-03:00';
      expect(dtf.format(new Date(madrugadaIso))).toBe('24');
    });

    test('Horário de verão histórico (2018 vs 2026): timezone IANA deve aplicar offsets corretos', () => {
      // Em janeiro de 2018, o Brasil adotava horário de verão (UTC-2)
      const dtfSummer = new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        timeZoneName: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });

      // 15 de janeiro de 2018 às 12:00 UTC
      const date2018 = new Date('2018-01-15T12:00:00Z');
      const formatted2018 = dtfSummer.format(date2018);
      // Em UTC-2 (horário de verão), 12:00Z é 10:00
      expect(formatted2018).toContain('10:00');

      // 15 de janeiro de 2026 (sem horário de verão, UTC-3)
      const date2026 = new Date('2026-01-15T12:00:00Z');
      const formatted2026 = dtfSummer.format(date2026);
      // Em UTC-3 (sem horário de verão), 12:00Z é 09:00
      expect(formatted2026).toContain('09:00');
    });
  });
});
