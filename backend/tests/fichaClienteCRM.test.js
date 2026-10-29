import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

describe('Ficha da Cliente CRM (Item J6 - Rosé Editorial)', () => {
  const filePath = path.join(rootDir, 'src/pages/FichaClienteCRM.jsx');

  test('O arquivo FichaClienteCRM.jsx deve existir', () => {
    expect(fs.existsSync(filePath)).toBe(true);
  });

  test('Deve conter estrutura de duas colunas (perfil à esquerda, anamnese e observações à direita)', () => {
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain('lg:grid-cols-12');
    expect(content).toContain('lg:col-span-5');
    expect(content).toContain('lg:col-span-7');
  });

  test('Anamnese não preenchida deve aparecer como "Pendente" suave e NÃO como "Vencida / Pendente" vermelha', () => {
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain('Pendente');
    expect(content).not.toContain('Vencida / Pendente');
  });

  test('Deve conter botão de enviar link de anamnese pelo WhatsApp', () => {
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain('Enviar link pelo WhatsApp');
    expect(content).toContain('handleSendAnamnesisWhatsApp');
  });

  test('Deve conter tratamento resiliente contra erro de imagem de anexo (bug do print)', () => {
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain('ImagemAnexoTimeline');
    expect(content).toContain('Tentar de novo');
    expect(content).toContain('onError');
  });

  test('Deve conter ações no topo: "Redefinir senha" e "+ Agendar"', () => {
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain('Redefinir senha');
    expect(content).toContain('Agendar');
    expect(content).toContain('NewAppointmentModal');
  });

  test('Deve utilizar numerais tabulares e lining-nums (Regra H1)', () => {
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain('tabular-nums');
    expect(content).toContain('lining-nums');
    expect(content).toContain('formatCurrency');
  });
});
