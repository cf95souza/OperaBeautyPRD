import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

describe('Gestão de Vales-Presente do Gestor (Item J10.6 - Mockup G10 - Rosé Editorial)', () => {
  const filePath = path.join(rootDir, 'src/pages/admin/GestaoGiftCards.jsx');

  test('O arquivo GestaoGiftCards.jsx deve existir', () => {
    expect(fs.existsSync(filePath)).toBe(true);
  });

  test('Deve conter o cabeçalho editorial oficial e a barra de validação PIX conforme mockup G10', () => {
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain('Vales-presente');
    expect(content).toContain('Acompanhe vendas, pagamentos e resgates.');
    expect(content).toContain('Validar pagamento PIX');
    expect(content).toContain('VP-XXXXXXXX');
    expect(content).toContain('Consultar');
  });

  test('Deve conter os 3 KPIs compactos canônicos com numerais alinhados', () => {
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain('VENDIDOS NO MÊS');
    expect(content).toContain('RESGATADOS');
    expect(content).toContain('SALDO EM ABERTO');
    expect(content).toContain('tabular-nums');
    expect(content).toContain('lining-nums');
    expect(content).toContain('formatCurrency');
  });

  test('Deve conter chips de filtro e busca em tempo real', () => {
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain('Todos');
    expect(content).toContain('Ativos');
    expect(content).toContain('Resgatados');
    expect(content).toContain('Aguardando pagamento');
    expect(content).toContain('Buscar por código ou nome');
  });

  test('Deve conter estrutura de tabela corporativa com cabeçalhos canônicos e ação de cópia', () => {
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain('<table');
    expect(content).toContain('SOLICITAÇÃO');
    expect(content).toContain('CÓDIGO DO VALE');
    expect(content).toContain('PRESENTEADO(A)');
    expect(content).toContain('VALOR');
    expect(content).toContain('SALDO');
    expect(content).toContain('PAGAMENTO');
    expect(content).toContain('SITUAÇÃO');
    expect(content).toContain('AÇÕES');
    expect(content).toContain('Copiar');
    expect(content).toContain('handleCopyCode');
  });

  test('Deve conter controles de paginação editorial e modal de validação PIX', () => {
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain('Itens por página:');
    expect(content).toContain('Solicitação PIX');
    expect(content).toContain('handleConfirmPixPayment');
  });
});
