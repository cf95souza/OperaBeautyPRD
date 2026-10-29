import { describe, it, expect } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

describe('J9 (P1) — Limpeza de Dados e Textos (Plano §9.1 itens 7 a 9 & §9.6)', () => {
  it('SuperAdmin.jsx deve ter pluralização rigorosa de cancelamentos (sem parênteses genéricos)', () => {
    const filePath = path.join(rootDir, 'src/pages/superadmin/SuperAdmin.jsx');
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Não deve conter 'cancelamento(s)'
    expect(content).not.toContain('cancelamento(s)');
    // Deve conter pluralização dinâmica
    expect(content).toContain("1 cancelamento");
    expect(content).toContain("cancelamentos");
  });

  it('ConfiguracoesOperacionais.jsx deve formatar cupom de valor fixo com vírgula padrão brasileira', () => {
    const filePath = path.join(rootDir, 'src/pages/admin/ConfiguracoesOperacionais.jsx');
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Não deve ter toFixed(2) solto sem substituição de ponto por vírgula em cupom
    expect(content).not.toContain('R$ ${coupon.discount_value.toFixed(2)}');
    const hasValidFormatting = content.includes("formatCurrency(coupon.discount_value)") || content.includes("replace('.', ',')");
    expect(hasValidFormatting).toBe(true);
  });

  it('GestaoGiftCards.jsx deve formatar valor de confirmação com vírgula padrão brasileira', () => {
    const filePath = path.join(rootDir, 'src/pages/admin/GestaoGiftCards.jsx');
    const content = fs.readFileSync(filePath, 'utf8');
    
    expect(content).not.toContain('requestDetails.original_value).toFixed(2)} para');
    const hasValidFormatting = content.includes("formatCurrency") || content.includes(".replace('.', ',')");
    expect(hasValidFormatting).toBe(true);
  });

  it('Migração phase11_cleanup_data_and_texts.sql deve existir e sanitizar banco de dados', () => {
    const migrationPath = path.join(rootDir, 'migrations/phase11_cleanup_data_and_texts.sql');
    expect(fs.existsSync(migrationPath)).toBe(true);

    const sqlContent = fs.readFileSync(migrationPath, 'utf8');
    expect(sqlContent).toContain('UPDATE cap_plans');
    expect(sqlContent).toContain('Beatriz Alcantara');
    expect(sqlContent).toContain('Thais Rodrigues');
    expect(sqlContent).toContain('DELETE FROM cap_timeline_notes');
    expect(sqlContent).toContain('Suporte por WhatsApp');
  });

  it('FichaClienteCRM.jsx deve usar texto acolhedor e neutro de gênero', () => {
    const filePath = path.join(rootDir, 'src/pages/FichaClienteCRM.jsx');
    const content = fs.readFileSync(filePath, 'utf8');
    
    expect(content).not.toContain('O cliente ainda não preencheu');
    expect(content).toContain('A cliente ainda não preencheu');
  });
});
