import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

describe('Gestão de Equipe do Gestor (Item J10.4 - Mockup G8 - Rosé Editorial)', () => {
  const filePath = path.join(rootDir, 'src/pages/admin/GestaoEquipe.jsx');

  test('O arquivo GestaoEquipe.jsx deve existir', () => {
    expect(fs.existsSync(filePath)).toBe(true);
  });

  test('Deve conter o cabeçalho editorial oficial e contador do plano conforme mockup G8', () => {
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain('Equipe');
    expect(content).toContain('Profissionais, comissões e desempenho.');
    expect(content).toContain('profissionais no seu plano');
    expect(content).toContain('Novo profissional');
  });

  test('Deve conter cards dos profissionais com monograma, status, comissão e nota média', () => {
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain('getMonogram');
    expect(content).toContain('COMISSÃO');
    expect(content).toContain('NOTA MÉDIA');
    expect(content).toContain('Ativo');
    expect(content).toContain('formatMaskedPhone');
    expect(content).toContain('Editar');
    expect(content).toContain('Horários e serviços');
  });

  test('Deve conter a seção "Desempenho do mês" com os 2 KPIs canônicos e tipografia tabular-nums', () => {
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain('Desempenho do mês');
    expect(content).toContain('SERVIÇOS CONCLUÍDOS');
    expect(content).toContain('COMISSÃO GERADA');
    expect(content).toContain('Mês atual');
    expect(content).toContain('tabular-nums');
    expect(content).toContain('lining-nums');
    expect(content).toContain('formatCurrency');
  });

  test('Deve conter o quadro pontilhado acolhedor quando não houver atendimentos no mês', () => {
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain('Sem atendimentos concluídos neste mês.');
    expect(content).toContain('O ranking de comissões por profissional aparece aqui.');
  });

  test('Deve conter modais editoriais para profissional e para horários/serviços', () => {
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain('Novo Profissional');
    expect(content).toContain('Editar Profissional');
    expect(content).toContain('Horários e Serviços');
    expect(content).toContain('Serviços Habilitados');
    expect(content).toContain('handleSaveStaff');
    expect(content).toContain('handleSaveSchedule');
  });
});
