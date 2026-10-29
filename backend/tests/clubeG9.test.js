import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

describe('Clube de Assinaturas do Gestor (Item J10.5 - Mockup G9 - Rosé Editorial)', () => {
  const filePath = path.join(rootDir, 'src/pages/admin/GestaoAssinaturas.jsx');

  test('O arquivo GestaoAssinaturas.jsx deve existir', () => {
    expect(fs.existsSync(filePath)).toBe(true);
  });

  test('Deve conter o cabeçalho editorial oficial conforme mockup G9', () => {
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain('Clube de assinaturas');
    expect(content).toContain('Planos recorrentes para fidelizar clientes e garantir receita no mês.');
    expect(content).toContain('Criar plano');
  });

  test('Deve conter os 3 KPIs compactos canônicos com numerais alinhados', () => {
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain('PLANOS ATIVOS');
    expect(content).toContain('ASSINANTES');
    expect(content).toContain('RECEITA RECORRENTE');
    expect(content).toContain('tabular-nums');
    expect(content).toContain('lining-nums');
    expect(content).toContain('formatCurrency');
  });

  test('Deve conter as abas oficiais Planos do clube e Clientes assinantes', () => {
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain('Planos do clube');
    expect(content).toContain('Clientes assinantes');
  });

  test('Deve conter card do plano com serviços inclusos, uso por ciclo e ações', () => {
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain('Serviços inclusos');
    expect(content).toContain('Uso por ciclo');
    expect(content).toContain('Editar');
    expect(content).toContain('Pausar vendas');
  });

  test('Deve conter o preview canônico "COMO A CLIENTE VÊ NO APP" com borda dourada', () => {
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain('COMO A CLIENTE VÊ NO APP');
    expect(content).toContain('CLUBE STUDIO');
    expect(content).toContain('border-amber-200');
  });

  test('Deve conter modais editoriais de criação/edição e tabela de assinantes', () => {
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain('Editar Plano do Clube');
    expect(content).toContain('Novo Plano de Assinatura');
    expect(content).toContain('handleSave');
    expect(content).toContain('handleRenewSubscription');
  });
});
