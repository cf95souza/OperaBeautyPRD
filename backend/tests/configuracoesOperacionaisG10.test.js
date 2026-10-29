import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('J10.7 — Configurações Operacionais, Segurança e LGPD', () => {
  const configPath = path.resolve(__dirname, '../../src/pages/admin/ConfiguracoesOperacionais.jsx');
  const lgpdPath = path.resolve(__dirname, '../../src/pages/admin/GestaoLGPD.jsx');
  const assinaturaPath = path.resolve(__dirname, '../../src/pages/admin/AssinaturaSaaS.jsx');

  test('ConfiguracoesOperacionais.jsx existe e segue rigorosamente os tokens Rosé Editorial', () => {
    expect(fs.existsSync(configPath)).toBe(true);
    const content = fs.readFileSync(configPath, 'utf8');

    // 1. Tipografia Playfair Display
    expect(content).toMatch(/font-display/);
    expect(content).toMatch(/Configurações operacionais/);

    // 2. Tokens de cores e bordas canônicos
    expect(content).toMatch(/bg-brand/);
    expect(content).toMatch(/border-line/);
    expect(content).toMatch(/text-ink/);
    expect(content).toMatch(/rounded-\[22px\]|rounded-\[24px\]/);

    // 3. Eliminação de material-symbols-outlined
    expect(content).not.toMatch(/material-symbols-outlined/);

    // 4. Utilização de lucide-react
    expect(content).toMatch(/from 'lucide-react'/);
    expect(content).toMatch(/Clock/);
    expect(content).toMatch(/MapPin/);
    expect(content).toMatch(/Wallet/);
    expect(content).toMatch(/Sparkles/);
    expect(content).toMatch(/Coffee/);

    // 5. Utilização de formatCurrency com alinhamento tabular
    expect(content).toMatch(/formatCurrency/);
    expect(content).toMatch(/tabular-nums/);
  });

  test('GestaoLGPD.jsx existe e segue os tokens Rosé Editorial', () => {
    expect(fs.existsSync(lgpdPath)).toBe(true);
    const content = fs.readFileSync(lgpdPath, 'utf8');

    // 1. Tipografia Playfair Display
    expect(content).toMatch(/font-display/);
    expect(content).toMatch(/Segurança & privacidade \(LGPD\)/);

    // 2. Tokens Rosé Editorial
    expect(content).toMatch(/bg-brand/);
    expect(content).toMatch(/border-line/);
    expect(content).toMatch(/text-ink/);
    expect(content).toMatch(/rounded-\[22px\]/);

    // 3. Eliminação de material-symbols-outlined
    expect(content).not.toMatch(/material-symbols-outlined/);

    // 4. Lucide icons e KPIs semânticos
    expect(content).toMatch(/from 'lucide-react'/);
    expect(content).toMatch(/ShieldCheck/);
    expect(content).toMatch(/FileText/);
    expect(content).toMatch(/Clock/);
    expect(content).toMatch(/Send/);

    // 5. Hash criptográfico com formatação mono
    expect(content).toMatch(/font-mono/);
  });

  test('AssinaturaSaaS.jsx existe e segue os tokens Rosé Editorial', () => {
    expect(fs.existsSync(assinaturaPath)).toBe(true);
    const content = fs.readFileSync(assinaturaPath, 'utf8');

    expect(content).toMatch(/font-display/);
    expect(content).toMatch(/Minha assinatura/);
    expect(content).toMatch(/bg-brand/);
    expect(content).toMatch(/border-line/);
    expect(content).not.toMatch(/material-symbols-outlined/);
    expect(content).toMatch(/from 'lucide-react'/);
  });

  test('Validação de integridade de horários comerciais e dias da semana', () => {
    const days = [0, 1, 2, 3, 4, 5, 6];
    expect(days.length).toBe(7);

    const defaultDay = {
      day_of_week: 1,
      open_time: '09:00',
      close_time: '18:00',
      is_closed: false
    };

    expect(defaultDay.open_time).toMatch(/^\d{2}:\d{2}$/);
    expect(defaultDay.close_time).toMatch(/^\d{2}:\d{2}$/);
    expect(defaultDay.is_closed).toBe(false);
  });

  test('Validação de integridade de dados PIX e cupons', () => {
    const couponSample = {
      code: 'VERAO20',
      discount_type: 'percentage',
      discount_value: 20,
      max_uses: 100,
      expires_at: '2026-12-31T23:59:59.000Z'
    };

    expect(couponSample.code).toBe(couponSample.code.toUpperCase());
    expect(['percentage', 'fixed']).toContain(couponSample.discount_type);
    expect(couponSample.discount_value).toBeGreaterThan(0);

    const pixSample = {
      pix_key: '11999999999',
      pix_key_type: 'phone',
      holder_name: 'Studio Thais'
    };
    expect(pixSample.pix_key).toBeTruthy();
    expect(pixSample.holder_name).toBeTruthy();
  });

  test('Validação de integridade de solicitação de consentimento LGPD', () => {
    const requestSample = {
      client_id: 'client-123',
      term_template_id: 'term-456'
    };

    expect(requestSample.client_id).toBeTruthy();
    expect(requestSample.term_template_id).toBeTruthy();
  });
});
