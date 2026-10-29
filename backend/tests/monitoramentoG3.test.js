import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import request from 'supertest';
import app from '../app.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

describe('G3 (P1) — Monitoramento, Observabilidade, Limites de Recursos e Containers sem Root', () => {
  const monitorScriptPath = path.join(rootDir, 'scripts/system_monitor.sh');
  const monitorDocPath = path.join(rootDir, 'docs/monitoramento.md');
  const mainComposePath = path.join(rootDir, 'docker-compose.yml');
  const stagingComposePath = path.join(rootDir, 'docker-compose.staging.yml');
  const backendDockerfilePath = path.join(rootDir, 'backend/Dockerfile');
  const waDockerfilePath = path.join(rootDir, 'gateway-whatsapp/Dockerfile');

  test('Todos os arquivos estruturais de monitoramento G3 devem existir', () => {
    expect(fs.existsSync(monitorScriptPath)).toBe(true);
    expect(fs.existsSync(monitorDocPath)).toBe(true);
    expect(fs.existsSync(mainComposePath)).toBe(true);
    expect(fs.existsSync(stagingComposePath)).toBe(true);
    expect(fs.existsSync(backendDockerfilePath)).toBe(true);
    expect(fs.existsSync(waDockerfilePath)).toBe(true);
  });

  describe('1. Endpoint de Telemetria e Observabilidade (/health/system)', () => {
    test('GET /health/system deve responder com status de integridade, memória e serviços', async () => {
      const res = await request(app).get('/health/system');
      expect([200, 503]).toContain(res.status);
      expect(res.body).toHaveProperty('status');
      expect(res.body).toHaveProperty('timestamp');
      expect(res.body).toHaveProperty('uptime_seconds');
      expect(res.body).toHaveProperty('memory');
      expect(res.body.memory).toHaveProperty('heap_used_mb');
      expect(res.body.memory).toHaveProperty('heap_total_mb');
      expect(res.body.memory).toHaveProperty('rss_mb');
      expect(res.body).toHaveProperty('services');
      expect(res.body.services).toHaveProperty('database');
      expect(res.body.services).toHaveProperty('redis');
    }, 10000);

    test('GET /health básico deve continuar respondendo 200 OK (Liveness Probe)', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('OK');
    });
  });

  describe('2. Limites Declarativos de CPU e Memória (docker-compose.yml)', () => {
    let content;
    beforeAll(() => {
      content = fs.readFileSync(mainComposePath, 'utf8');
    });

    test('db deve conter limites de recursos estritos (1.5 CPU e 1024M RAM)', () => {
      expect(content).toContain("cpus: '1.50'");
      expect(content).toContain('memory: 1024M');
    });

    test('redis deve conter limites de recursos estritos (0.5 CPU e 256M RAM)', () => {
      expect(content).toContain("cpus: '0.50'");
      expect(content).toContain('memory: 256M');
    });

    test('api deve conter limites de recursos estritos (1.0 CPU e 768M RAM)', () => {
      expect(content).toContain("cpus: '1.00'");
      expect(content).toContain('memory: 768M');
    });

    test('caddy e wa-gateway devem conter limites configurados', () => {
      expect(content).toContain('memory: 512M');
    });
  });

  describe('3. Containers sem Root (Princípio de Menor Privilégio)', () => {
    test('backend/Dockerfile deve executar sob usuário não-root (USER nodeuser)', () => {
      const dockerfile = fs.readFileSync(backendDockerfilePath, 'utf8');
      expect(dockerfile).toContain('USER nodeuser');
      expect(dockerfile).toContain('adduser -S nodeuser');
    });

    test('gateway-whatsapp/Dockerfile deve executar sob usuário não-root (USER nodeuser)', () => {
      const dockerfile = fs.readFileSync(waDockerfilePath, 'utf8');
      expect(dockerfile).toContain('USER nodeuser');
      expect(dockerfile).toContain('adduser -S nodeuser');
    });
  });

  describe('4. Script de Auditoria e Alertas (scripts/system_monitor.sh)', () => {
    let script;
    beforeAll(() => {
      script = fs.readFileSync(monitorScriptPath, 'utf8');
    });

    test('Deve ser script bash estrito com set -euo pipefail', () => {
      expect(script).toMatch(/^#!\/bin\/bash/);
      expect(script).toContain('set -euo pipefail');
    });

    test('Deve conter verificações de disco, memória, containers e backup', () => {
      expect(script).toContain('DISK_WARN_THRESHOLD');
      expect(script).toContain('DISK_CRIT_THRESHOLD');
      expect(script).toContain('MEM_WARN_FREE_PERCENT');
      expect(script).toContain('REQUIRED_CONTAINERS');
      expect(script).toContain('BACKUP_DAILY_DIR');
      expect(script).toContain('send_webhook_alert');
    });
  });

  describe('5. Guia de Monitoramento e Observabilidade (docs/monitoramento.md)', () => {
    let doc;
    beforeAll(() => {
      doc = fs.readFileSync(monitorDocPath, 'utf8');
    });

    test('Deve documentar endpoints de telemetria, monitores externos e limites de CPU/RAM', () => {
      expect(doc).toContain('/health/system');
      expect(doc).toContain('UptimeRobot');
      expect(doc).toContain('Limites de Recursos Declarativos');
      expect(doc).toContain('system_monitor.sh');
    });
  });
});
