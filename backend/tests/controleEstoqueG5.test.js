import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

describe('Controle de Estoque do Gestor (Item J10 - Mockup G5 - Rosé Editorial)', () => {
  const filePath = path.join(rootDir, 'src/pages/admin/ControleEstoque.jsx');

  test('O arquivo ControleEstoque.jsx deve existir', () => {
    expect(fs.existsSync(filePath)).toBe(true);
  });

  test('Deve conter o cabeçalho editorial oficial conforme mockup G5', () => {
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain('Estoque');
    expect(content).toContain('Suprimentos profissionais e produtos de venda.');
    expect(content).toContain('Registrar entrada');
    expect(content).toContain('Novo item');
  });

  test('Deve conter os 3 KPIs compactos canônicos com numerais alinhados (Regra H1)', () => {
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain('ITENS CADASTRADOS');
    expect(content).toContain('VALOR EM ESTOQUE');
    expect(content).toContain('ABAIXO DO MÍNIMO');
    expect(content).toContain('tabular-nums');
    expect(content).toContain('lining-nums');
    expect(content).toContain('formatCurrency');
    expect(content).toContain('formatNumber');
  });

  test('Deve conter os chips de filtro e a busca por item', () => {
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain('Todos os itens');
    expect(content).toContain('Uso profissional');
    expect(content).toContain('Venda');
    expect(content).toContain('Abaixo do mínimo');
    expect(content).toContain('Buscar item');
  });

  test('Deve conter estrutura de tabela corporativa com cabeçalhos e barra de progresso', () => {
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain('<table');
    expect(content).toContain('ITEM');
    expect(content).toContain('ESTOQUE');
    expect(content).toContain('MÍNIMO');
    expect(content).toContain('PREÇO');
    expect(content).toContain('SITUAÇÃO');
    expect(content).toContain('AÇÕES');
    expect(content).toContain('stockRatio');
    expect(content).toContain('Entrada');
    expect(content).toContain('Ajustar');
  });

  test('Deve conter a nota explicativa de integração com dashboard e baixa automática', () => {
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain('Itens abaixo do mínimo aparecem no dashboard com o botão “Repor”. O consumo por serviço dá baixa automática ao concluir o atendimento.');
  });

  test('Deve conter modais editoriais para criação/ajuste e registro de entrada', () => {
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain('Registrar entrada');
    expect(content).toContain('Confirmar entrada');
    expect(content).toContain('Salvar item');
    expect(content).toContain('handleRestock');
    expect(content).toContain('handleSaveItem');
  });
});
