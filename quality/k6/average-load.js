import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 10 }, // Ramp-up para 10 VUs
    { duration: '1m', target: 25 },  // Subida para 25 VUs (uso médio padrão)
    { duration: '2m', target: 25 },  // Platô de estabilidade
    { duration: '30s', target: 0 },  // Ramp-down
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<2000', 'p(99)<5000'],
    checks: ['rate>0.99'],
  },
};

const BASE_URL = __ENV.TARGET_URL || 'http://localhost:5001';
const TENANT_SLUG = __ENV.TENANT_SLUG || 'salaoteste';

export default function () {
  // Simula navegação de usuário no agendamento / leitura pública
  const resTenant = http.get(`${BASE_URL}/api/tenants/by-slug/${TENANT_SLUG}`);
  check(resTenant, {
    'tenant status ok': (r) => r.status === 200 || r.status === 404,
  });

  sleep(Math.random() * 2 + 1); // Pausa realista entre ações (1-3s)

  const resHealth = http.get(`${BASE_URL}/health/complete`);
  check(resHealth, {
    'db latency < 200ms': (r) => r.status === 200 && r.json().db_latency_ms < 200,
  });

  sleep(Math.random() * 2 + 1);
}

