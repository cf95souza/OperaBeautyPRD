import { describe, it, expect } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

describe('Fix/Produção: Referral Settings sem updated_at em cap_tenants & Notificações Gestora', () => {
  const referralServicePath = path.join(rootDir, 'backend/services/referralService.js');
  const notificationServicePath = path.join(rootDir, 'backend/services/notificationService.js');

  const referralContent = fs.readFileSync(referralServicePath, 'utf8');
  const notifContent = fs.readFileSync(notificationServicePath, 'utf8');

  it('updateReferralSettings não deve conter updated_at em cap_tenants', () => {
    // Proíbe updated_at na query de cap_tenants em updateReferralSettings
    expect(referralContent).not.toMatch(/UPDATE\s+public\.cap_tenants[\s\S]*?updated_at\s*=\s*NOW\(\)/i);
  });

  it('getMyNotifications deve suportar visibilidade ampla para gestores (manager)', () => {
    expect(notifContent).toContain("isManager = userRole === 'manager'");
    expect(notifContent).toContain('WHERE tenant_id = $1');
  });

  it('getMyNotifications deve conter rotina de sincronização retroativa para agendamentos recentes', () => {
    expect(notifContent).toContain('INSERT INTO public.cap_notifications');
    expect(notifContent).toContain('SELECT 1 FROM public.cap_notifications');
  });
});
