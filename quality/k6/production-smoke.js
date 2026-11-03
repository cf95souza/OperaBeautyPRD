import http from 'k6/http';
import { check, sleep } from 'k6';

/**
 * Script de Verificação Pós-Deploy Protegido para PRODUÇÃO (VPS)
 * Diretrizes obrigatórias da skill system-quality-gate:
 * - Carga restrita a 1 a 3 VUs
 * - Duração máxima de 3 minutos
 * - Apenas rotas idempotentes de leitura (GET)
 * - NUNCA efetua mutações, cadastros ou exclusões
 */
export const options = {
  vus: 2,
  duration: '2m',
  thresholds: {
    http_req_failed: ['rate<0.01'], // Abortar se erros > 1%
    http_req_duration: ['p(95)<2000'],
    checks: ['rate>0.99'],
  },
};

const BASE_URL = __ENV.TARGET_URL;

export default function () {
  if (!BASE_URL) {
    throw new Error('TARGET_URL não definido via variável de ambiente.');
  }

  // 1. Health check básico do Caddy / API
  const res = http.get(`${BASE_URL}/health`);
  check(res, {
    'status 200': (r) => r.status === 200,
    'body ok': (r) => r.json().status === 'OK',
  });

  sleep(2);
}

