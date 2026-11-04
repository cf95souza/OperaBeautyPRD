import { describe, it, expect, jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

describe('Campanhas de Marketing — Correção de Query cap_tenants status e is_active', () => {
  const campaignServicePath = path.join(rootDir, 'backend/services/campaignService.js');
  const serviceContent = fs.readFileSync(campaignServicePath, 'utf8');

  it('deve usar a coluna "status" de cap_tenants e não a coluna inexistente "is_active"', () => {
    // Verifica que a query em runCampaignScan não faz SELECT ... FROM cap_tenants WHERE is_active = true
    expect(serviceContent).not.toMatch(/FROM\s+public\.cap_tenants\s+WHERE[^\n]*is_active/i);
    expect(serviceContent).toMatch(/FROM\s+public\.cap_tenants\s+WHERE[^\n]*status\s*=\s*'active'/i);
  });

  it('deve manter is_active = true apenas na tabela cap_marketing_campaigns', () => {
    expect(serviceContent).toMatch(/FROM\s+public\.cap_marketing_campaigns\s+WHERE\s+tenant_id\s*=\s*\$1\s+AND\s+is_active\s*=\s*true/i);
  });
});
