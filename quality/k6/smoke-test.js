import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 3,
  duration: '30s',
  thresholds: {
    http_req_failed: ['rate<0.01'], // Erros HTTP abaixo de 1%
    http_req_duration: ['p(95)<2000', 'p(99)<5000'], // 95% abaixo de 2s
    checks: ['rate>0.99'], // Pelo menos 99% dos checks funcionais
  },
};

const BASE_URL = __ENV.TARGET_URL || 'http://localhost:5001';
const TENANT_SLUG = __ENV.TENANT_SLUG || 'salaoteste';

export default function () {
  // 1. Health check de liveness
  const resHealth = http.get(`${BASE_URL}/health`);
  check(resHealth, {
    'health status 200': (r) => r.status === 200,
    'health body ok': (r) => r.json().status === 'OK',
  });

  sleep(1);

  // 2. Health check completo (PostgreSQL)
  const resDb = http.get(`${BASE_URL}/health/complete`);
  check(resDb, {
    'db health status 200': (r) => r.status === 200,
    'db latency present': (r) => r.json().db_latency_ms !== undefined,
  });

  sleep(1);

  // 3. Consulta de Tenant por Slug (Jornada pública do cliente)
  const resTenant = http.get(`${BASE_URL}/api/tenants/by-slug/${TENANT_SLUG}`);
  check(resTenant, {
    'tenant status 200 or 404': (r) => r.status === 200 || r.status === 404,
  });

  sleep(1);
}

