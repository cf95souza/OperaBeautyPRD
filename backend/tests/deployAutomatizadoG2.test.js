import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

describe('G2 (P1) — Deploy Automatizado, GHCR, Rollback em 1 Comando e Staging', () => {
  const deployWorkflowPath = path.join(rootDir, '.github/workflows/deploy.yml');
  const rollbackWorkflowPath = path.join(rootDir, '.github/workflows/rollback.yml');
  const rollbackScriptPath = path.join(rootDir, 'scripts/rollback.sh');
  const stagingComposePath = path.join(rootDir, 'docker-compose.staging.yml');
  const mainComposePath = path.join(rootDir, 'docker-compose.yml');
  const deployDocPath = path.join(rootDir, 'docs/deploy.md');

  test('Todos os arquivos estruturais da esteira G2 devem existir', () => {
    expect(fs.existsSync(deployWorkflowPath)).toBe(true);
    expect(fs.existsSync(rollbackWorkflowPath)).toBe(true);
    expect(fs.existsSync(rollbackScriptPath)).toBe(true);
    expect(fs.existsSync(stagingComposePath)).toBe(true);
    expect(fs.existsSync(mainComposePath)).toBe(true);
    expect(fs.existsSync(deployDocPath)).toBe(true);
  });

  describe('1. Workflow de CI/CD e Deploy (.github/workflows/deploy.yml)', () => {
    let content;
    beforeAll(() => {
      content = fs.readFileSync(deployWorkflowPath, 'utf8');
    });

    test('Deve possuir triggers para main, staging, develop e workflow_dispatch', () => {
      expect(content).toContain('main');
      expect(content).toContain('staging');
      expect(content).toContain('develop');
      expect(content).toContain('workflow_dispatch:');
    });

    test('Deve ter permissão para escrita no GitHub Container Registry (GHCR)', () => {
      expect(content).toContain('packages: write');
    });

    test('Deve conter o Quality Gate com testes e build do Vite antes do deploy', () => {
      expect(content).toContain('quality-gate:');
      expect(content).toContain('npm run build');
      expect(content).toContain('npm test');
    });

    test('Deve construir e publicar imagens com tags de commit imutáveis e latest no GHCR', () => {
      expect(content).toContain('ghcr.io');
      expect(content).toContain('docker/login-action');
      expect(content).toContain('docker/build-push-action');
      expect(content).toContain('github.sha');
      expect(content).toContain('api:');
      expect(content).toContain('caddy:');
      expect(content).toContain('wa-gateway:');
    });

    test('Deve conter etapa de deploy remoto na VPS com Auto-Rollback se healthcheck falhar', () => {
      expect(content).toContain('deploy-vps:');
      expect(content).toContain('appleboy/ssh-action');
      expect(content).toContain('docker compose pull');
      expect(content).toContain('docker compose up -d');
      expect(content).toContain('.last_deployed_tag');
      expect(content).toContain('./scripts/rollback.sh');
    });
  });

  describe('2. Workflow de Rollback em 1 Clique (.github/workflows/rollback.yml)', () => {
    let content;
    beforeAll(() => {
      content = fs.readFileSync(rollbackWorkflowPath, 'utf8');
    });

    test('Deve ser acionado via workflow_dispatch com input para tag alvo', () => {
      expect(content).toContain('workflow_dispatch:');
      expect(content).toContain('target_tag:');
      expect(content).toContain('environment:');
    });

    test('Deve invocar o script scripts/rollback.sh na VPS via SSH', () => {
      expect(content).toContain('appleboy/ssh-action');
      expect(content).toContain('./scripts/rollback.sh');
    });
  });

  describe('3. Script de Rollback na VPS (scripts/rollback.sh)', () => {
    let content;
    beforeAll(() => {
      content = fs.readFileSync(rollbackScriptPath, 'utf8');
    });

    test('Deve ser script bash estrito com set -euo pipefail', () => {
      expect(content).toMatch(/^#!\/bin\/bash/);
      expect(content).toContain('set -euo pipefail');
    });

    test('Deve suportar fallback automático para .last_deployed_tag', () => {
      expect(content).toContain('.last_deployed_tag');
      expect(content).toContain('TARGET_TAG');
    });

    test('Deve atualizar IMAGE_TAG no .env e executar docker compose pull && up', () => {
      expect(content).toContain('IMAGE_TAG');
      expect(content).toContain('docker compose pull');
      expect(content).toContain('docker compose up -d');
    });

    test('Deve executar loop de healthcheck pós-rollback testando API e Caddy', () => {
      expect(content).toContain('5001/health');
      expect(content).toContain('8080');
      expect(content).toContain('MAX_ATTEMPTS');
      expect(content).toContain('HEALTHY=true');
    });

    test('Deve conter suporte a webhooks para notificação de equipe', () => {
      expect(content).toContain('send_notification');
      expect(content).toContain('WEBHOOK_URL');
    });
  });

  describe('4. Ambiente de Staging (docker-compose.staging.yml)', () => {
    let content;
    beforeAll(() => {
      content = fs.readFileSync(stagingComposePath, 'utf8');
    });

    test('Deve conter portas não conflitantes com a produção', () => {
      expect(content).toContain('STAGING_API_PORT:-5002');
      expect(content).toContain('STAGING_PORT_HTTP:-8081');
    });

    test('Deve conter banco de dados e volumes isolados de staging', () => {
      expect(content).toContain('operabeauty_staging');
      expect(content).toContain('operabeauty-staging-pgdata');
      expect(content).toContain('operabeauty-staging-net');
    });

    test('Deve definir ambiente NODE_ENV como staging', () => {
      expect(content).toContain('NODE_ENV: staging');
    });
  });

  describe('5. Parametrização no docker-compose.yml Principal', () => {
    let content;
    beforeAll(() => {
      content = fs.readFileSync(mainComposePath, 'utf8');
    });

    test('Serviço api deve suportar API_IMAGE e IMAGE_TAG', () => {
      expect(content).toContain('${API_IMAGE:-operabeauty-api}:${IMAGE_TAG:-latest}');
    });

    test('Serviço caddy deve suportar CADDY_IMAGE e IMAGE_TAG', () => {
      expect(content).toContain('${CADDY_IMAGE:-operabeauty-caddy}:${IMAGE_TAG:-latest}');
    });

    test('Serviço wa-gateway deve suportar WA_GATEWAY_IMAGE e IMAGE_TAG', () => {
      expect(content).toContain('${WA_GATEWAY_IMAGE:-operabeauty-wa-gateway}:${IMAGE_TAG:-latest}');
    });
  });

  describe('6. Guia Operacional de Deploy (docs/deploy.md)', () => {
    let content;
    beforeAll(() => {
      content = fs.readFileSync(deployDocPath, 'utf8');
    });

    test('Deve descrever as secrets de CI/CD, o processo de rollback e o ambiente de staging', () => {
      expect(content).toContain('SSH_HOST');
      expect(content).toContain('SSH_PRIVATE_KEY');
      expect(content).toContain('Rollback em 1 Comando');
      expect(content).toContain('Auto-Rollback');
      expect(content).toContain('docker-compose.staging.yml');
    });
  });
});
