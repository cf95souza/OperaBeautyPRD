import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { formatCurrency, formatNumber, formatPercent } from '../../src/utils/formatters.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

describe('H1 (P0 visual) — Numerais Alinhados e Tabulares', () => {
  const indexCssPath = path.join(rootDir, 'src/index.css');
  const indexCss = fs.readFileSync(indexCssPath, 'utf8');

  test('Deve conter regras de font-variant-numeric: lining-nums para títulos e fontes Playfair/serif', () => {
    expect(indexCss).toMatch(/font-variant-numeric:\s*lining-nums/);
    expect(indexCss).toMatch(/font-feature-settings:\s*['"]lnum['"]/);
    expect(indexCss).toContain('.font-serif');
    expect(indexCss).toContain('.font-display');
  });

  test('Deve conter regras de font-variant-numeric: lining-nums tabular-nums para tabelas e KPIs', () => {
    expect(indexCss).toMatch(/font-variant-numeric:\s*lining-nums\s+tabular-nums/);
    expect(indexCss).toContain('.tabular-nums');
    expect(indexCss).toContain('.kpi-value');
  });

  test('Utilitários Tailwind v4 lining-nums e tabular-nums devem existir', () => {
    expect(indexCss).toContain('@utility lining-nums');
    expect(indexCss).toContain('@utility tabular-nums');
    expect(indexCss).toContain('@utility font-numeric-aligned');
  });

  test('formatCurrency deve formatar valores monetários canônicos em BRL (R$ 0,00)', () => {
    const zeroFormatted = formatCurrency(0);
    // Deve conter R$, 0 e 00
    expect(zeroFormatted).toMatch(/R\$\s*0,00/);

    const normalFormatted = formatCurrency(1250.5);
    expect(normalFormatted).toMatch(/R\$\s*1\.250,50/);

    const nullFormatted = formatCurrency(null);
    expect(nullFormatted).toMatch(/R\$\s*0,00/);

    const stringFormatted = formatCurrency("99.90");
    expect(stringFormatted).toMatch(/R\$\s*99,90/);
  });

  test('formatNumber e formatPercent devem formatar corretamente', () => {
    expect(formatNumber(1000)).toBe('1.000');
    expect(formatNumber(0)).toBe('0');
    expect(formatPercent(15)).toBe('15%');
    expect(formatPercent(0)).toBe('0%');
  });
});
