import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

describe('PDV — Caixa Rápido do Gestor (Item J10.2 - Mockup G6 - Rosé Editorial)', () => {
  const filePath = path.join(rootDir, 'src/pages/admin/PDV.jsx');

  test('O arquivo PDV.jsx deve existir', () => {
    expect(fs.existsSync(filePath)).toBe(true);
  });

  test('Deve conter o cabeçalho editorial oficial e controle de abas conforme mockup G6', () => {
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain('PDV — caixa rápido');
    expect(content).toContain('Venda de produtos com baixa automática de estoque.');
    expect(content).toContain('Frente de caixa');
    expect(content).toContain('Histórico de vendas');
  });

  test('Deve conter a barra de busca e os chips de categoria canônicos', () => {
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain('Buscar produto por nome ou código');
    expect(content).toContain('Todos');
    expect(content).toContain('Perfumaria');
  });

  test('Deve conter grid de produtos e card de ação rápida de cadastro pontilhado', () => {
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain('Cadastrar produto');
    expect(content).toContain('border-dashed');
    expect(content).toContain('addToCart');
  });

  test('Deve conter o painel de Carrinho com seletor de cliente, itens e botões de quantidade', () => {
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain('Carrinho');
    expect(content).toContain('Cliente (opcional)');
    expect(content).toContain('Venda avulsa');
    expect(content).toContain('updateCartQty');
    expect(content).toContain('clearCart');
  });

  test('Deve conter seleção de formas de pagamento em pílula (Pix, Crédito, Débito, Dinheiro)', () => {
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain('FORMA DE PAGAMENTO');
    expect(content).toContain('Pix');
    expect(content).toContain('Crédito');
    expect(content).toContain('Débito');
    expect(content).toContain('Dinheiro');
  });

  test('Deve conter resumo de valores com tipografia corporativa tabular-nums / lining-nums', () => {
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain('Subtotal');
    expect(content).toContain('Desconto');
    expect(content).toContain('Total');
    expect(content).toContain('tabular-nums');
    expect(content).toContain('lining-nums');
    expect(content).toContain('formatCurrency');
  });

  test('Deve conter modal de benefícios/cupom e modal de novo produto', () => {
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain('Aplicar Benefício');
    expect(content).toContain('Código do Cupom ou Vale');
    expect(content).toContain('Novo Produto de Venda');
    expect(content).toContain('Finalizar venda');
  });

  test('Deve conter modal de comprovante / sucesso da venda e histórico de pedidos', () => {
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain('Venda Concluída!');
    expect(content).toContain('Nova Venda');
    expect(content).toContain('Nenhuma venda registrada ainda');
  });
});
