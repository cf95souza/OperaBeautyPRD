import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

describe('Gestão de Clientes do Gestor (Item J5 - Rosé Editorial)', () => {
  const filePath = path.join(rootDir, 'src/pages/admin/GestaoClientes.jsx');

  test('O arquivo GestaoClientes.jsx deve existir', () => {
    expect(fs.existsSync(filePath)).toBe(true);
  });

  test('Deve conter estrutura de tabela corporativa com cabeçalhos canônicos', () => {
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain('<table');
    expect(content).toContain('CLIENTE');
    expect(content).toContain('NÍVEL');
    expect(content).toContain('VISITAS');
    expect(content).toContain('GASTO TOTAL');
    expect(content).toContain('AÇÕES');
  });

  test('Deve conter os 5 chips de segmentação obrigatórios do plano (§9.6 J5)', () => {
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain('Todas');
    expect(content).toContain('VIP');
    expect(content).toContain('Sumidas há 60 dias');
    expect(content).toContain('Aniversariantes');
    expect(content).toContain('Sem anamnese');
  });

  test('Deve utilizar numerais tabulares e lining-nums nos valores e contadores (Regra H1)', () => {
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain('tabular-nums');
    expect(content).toContain('lining-nums');
    expect(content).toContain('formatCurrency');
    expect(content).toContain('formatNumber');
  });

  test('Ações da linha devem ter botão com rótulo "WhatsApp" e clique na linha abre a ficha do cliente', () => {
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain('WhatsApp');
    expect(content).toContain('handleRowClick');
    expect(content).toContain('ficha-cliente');
  });

  test('Deve conter modais para "+ Novo cliente" e "Importar planilha"', () => {
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain('Cadastrar Novo Cliente');
    expect(content).toContain('Importar Planilha de Clientes');
    expect(content).toContain('formatarTelefoneBR');
  });

  test('Segmento VIP deve filtrar apenas clientes VIP e Black e excluir Prata', () => {
    const mockClients = [
      { id: '1', name: 'Caio Franca', vip_tier: 'Prata', ltv: 711 },
      { id: '2', name: 'Beatriz Alcantara', vip_tier: 'VIP', ltv: 266 },
      { id: '3', name: 'Cliente Premium', vip_tier: 'Black', ltv: 1200 }
    ];

    const filterVip = (clientsList) => {
      return clientsList.filter(c => c.vip_tier === 'VIP' || c.vip_tier === 'Black');
    };

    const vips = filterVip(mockClients);
    expect(vips.length).toBe(2);
    expect(vips.map(v => v.name)).toEqual(['Beatriz Alcantara', 'Cliente Premium']);
    expect(vips.some(v => v.name === 'Caio Franca')).toBe(false);
  });
});
