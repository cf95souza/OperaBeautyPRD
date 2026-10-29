import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

describe('Catálogo de Serviços do Gestor (Item J10.3 - Mockup G7 - Rosé Editorial)', () => {
  const filePath = path.join(rootDir, 'src/pages/admin/GestaoServicos.jsx');

  test('O arquivo GestaoServicos.jsx deve existir', () => {
    expect(fs.existsSync(filePath)).toBe(true);
  });

  test('Deve conter o cabeçalho editorial oficial conforme mockup G7', () => {
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain('Serviços');
    expect(content).toContain('Catálogo, duração, preço e consumo de estoque.');
    expect(content).toContain('Novo serviço');
  });

  test('Deve conter chips de filtro com contadores e barra de busca canônica', () => {
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain('Todos (');
    expect(content).toContain('Ativos (');
    expect(content).toContain('Desativados (');
    expect(content).toContain('Buscar serviço');
  });

  test('Deve conter estrutura de tabela corporativa com cabeçalhos canônicos', () => {
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain('<table');
    expect(content).toContain('SERVIÇO');
    expect(content).toContain('DURAÇÃO');
    expect(content).toContain('CONSUMO');
    expect(content).toContain('RETORNO (DIAS)');
    expect(content).toContain('VALOR');
    expect(content).toContain('ATIVO');
    expect(content).toContain('AÇÕES');
  });

  test('Deve conter numerais alinhados com tipografia tabular-nums e formatCurrency', () => {
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain('tabular-nums');
    expect(content).toContain('lining-nums');
    expect(content).toContain('formatCurrency');
  });

  test('Deve conter o switch toggle de ativo/inativo e botões de ação', () => {
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain('handleToggleActive');
    expect(content).toContain('Editar');
    expect(content).toContain('handleEdit');
  });

  test('Deve conter o card de Dica editorial oficial no rodapé', () => {
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain('Dica');
    expect(content).toContain('Informe os dias de retorno para a cliente receber o lembrete de manutenção, e o consumo de estoque para dar baixa automática ao concluir o atendimento.');
  });

  test('Deve conter modal editorial de criação e edição com consumo de estoque', () => {
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain('Novo Serviço');
    expect(content).toContain('Editar Serviço');
    expect(content).toContain('Baixa Automática de Estoque');
    expect(content).toContain('handleSave');
  });
});
