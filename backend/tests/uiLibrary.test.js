import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

describe('Biblioteca de Componentes de UI (Item A2 - Rosé Editorial)', () => {
  const uiDir = path.join(rootDir, 'src/components/ui');

  test('Todos os 18+ componentes obrigatórios da seção 2.5 devem existir em src/components/ui/', () => {
    const requiredComponents = [
      'Botao.jsx',
      'Button.jsx',
      'Chip.jsx',
      'ChipSelecionavel.jsx',
      'Cartao.jsx',
      'Card.jsx',
      'CartaoServico.jsx',
      'CartaoProfissional.jsx',
      'CartaoProximoHorario.jsx',
      'CartaoClube.jsx',
      'CampoTexto.jsx',
      'CampoTelefone.jsx',
      'CampoCodigo.jsx',
      'Input.jsx',
      'FaixaDeDias.jsx',
      'GradeDeHorarios.jsx',
      'BarraDeProgresso.jsx',
      'BarraFixaInferior.jsx',
      'BottomSheet.jsx',
      'Toast.jsx',
      'Skeleton.jsx',
      'EstadoVazio.jsx',
      'EstadoErro.jsx',
      'NavegacaoInferior.jsx',
      'Avatar.jsx',
      'PlaceholderImagem.jsx',
      'ModalRecorteImagem.jsx',
    ];

    requiredComponents.forEach((file) => {
      const filePath = path.join(uiDir, file);
      expect(fs.existsSync(filePath)).toBe(true);
    });
  });

  test('O arquivo barrel src/components/ui/index.js deve exportar todos os componentes', () => {
    const indexPath = path.join(uiDir, 'index.js');
    expect(fs.existsSync(indexPath)).toBe(true);
    const content = fs.readFileSync(indexPath, 'utf-8');

    const expectedExports = [
      'Botao',
      'Button',
      'Chip',
      'ChipSelecionavel',
      'Cartao',
      'Card',
      'CartaoServico',
      'CartaoProfissional',
      'CartaoProximoHorario',
      'CartaoClube',
      'CampoTexto',
      'CampoTelefone',
      'CampoCodigo',
      'Input',
      'FaixaDeDias',
      'GradeDeHorarios',
      'BarraDeProgresso',
      'BarraFixaInferior',
      'BottomSheet',
      'Toast',
      'Skeleton',
      'EstadoVazio',
      'EstadoErro',
      'NavegacaoInferior',
      'Avatar',
      'PlaceholderImagem',
      'ModalRecorteImagem',
    ];

    expectedExports.forEach((exp) => {
      expect(content).toContain(exp);
    });
  });

  test('Componentes legados devem atuar como adapters com retrocompatibilidade total', () => {
    const buttonContent = fs.readFileSync(path.join(uiDir, 'Button.jsx'), 'utf-8');
    expect(buttonContent).toContain("from './Botao.jsx'");
    expect(buttonContent).toContain('mapVariants');

    const cardContent = fs.readFileSync(path.join(uiDir, 'Card.jsx'), 'utf-8');
    expect(cardContent).toContain("from './Cartao.jsx'");

    const inputContent = fs.readFileSync(path.join(uiDir, 'Input.jsx'), 'utf-8');
    expect(inputContent).toContain("from './CampoTexto.jsx'");
  });

  test('Componentes interativos devem implementar conformidade com W3C WAI-ARIA', () => {
    const chipSelContent = fs.readFileSync(path.join(uiDir, 'ChipSelecionavel.jsx'), 'utf-8');
    expect(chipSelContent).toContain('aria-checked');
    expect(chipSelContent).toContain('role=');

    const bottomSheetContent = fs.readFileSync(path.join(uiDir, 'BottomSheet.jsx'), 'utf-8');
    expect(bottomSheetContent).toContain('role="dialog"');
    expect(bottomSheetContent).toContain('aria-modal="true"');

    const barraProgressoContent = fs.readFileSync(path.join(uiDir, 'BarraDeProgresso.jsx'), 'utf-8');
    expect(barraProgressoContent).toContain('role="progressbar"');
    expect(barraProgressoContent).toContain('aria-valuenow');

    const toastContent = fs.readFileSync(path.join(uiDir, 'Toast.jsx'), 'utf-8');
    expect(toastContent).toContain('role="alert"');

    const estadoErroContent = fs.readFileSync(path.join(uiDir, 'EstadoErro.jsx'), 'utf-8');
    expect(estadoErroContent).toContain('role="alert"');
  });

  test('Vitrine /ui-kit deve estar registrada nas rotas de desenvolvimento', () => {
    const appPath = path.join(rootDir, 'src/App.jsx');
    const appContent = fs.readFileSync(appPath, 'utf-8');
    expect(appContent).toContain('UiKitShowcase');
    expect(appContent).toContain('path="/ui-kit"');
  });

  test('Layout Base com Área Segura (Item A3) deve centralizar safe-area-inset no TelaCliente', () => {
    const telaClientePath = path.join(uiDir, 'TelaCliente.jsx');
    expect(fs.existsSync(telaClientePath)).toBe(true);

    const telaClienteContent = fs.readFileSync(telaClientePath, 'utf-8');
    expect(telaClienteContent).toContain('env(safe-area-inset-top');
    expect(telaClienteContent).toContain('env(safe-area-inset-bottom');

    // Validar que as principais telas do cliente não repetem mais paddings manuais de safe area
    const clientPages = [
      'HomeCliente.jsx',
      'PerfilCliente.jsx',
      'HistoricoAgendamentos.jsx',
      'AgendamentoServicos.jsx',
      'AgendamentoHorarios.jsx',
      'AgendamentoRevisao.jsx',
      'AcessoTelefone.jsx',
      'AcessoSenha.jsx',
      'CadastroCliente.jsx',
    ];

    clientPages.forEach((page) => {
      const pagePath = path.join(rootDir, 'src/pages', page);
      const pageContent = fs.readFileSync(pagePath, 'utf-8');
      expect(pageContent).toContain('TelaCliente');
      expect(pageContent).not.toContain('pt-[calc(env(safe-area-inset-top,0px)+12px)]');
      expect(pageContent).not.toContain('pt-[calc(env(safe-area-inset-top,0px)+24px)]');
      expect(pageContent).not.toContain('pt-[calc(env(safe-area-inset-top,0px)+36px)]');
    });
  });

  test('Agenda do Salão (Item J4) deve seguir a especificação Rosé Editorial 1:1 com G2', () => {
    const agendaPath = path.join(rootDir, 'src/pages/AgendaProfissional.jsx');
    expect(fs.existsSync(agendaPath)).toBe(true);

    const content = fs.readFileSync(agendaPath, 'utf-8');
    // Altura canônica de 72px por hora
    expect(content).toContain('ROW_HEIGHT = 72');
    expect(content).toContain('START_HOUR = 8');
    expect(content).toContain('END_HOUR = 20');
    // Linha do agora em tempo real
    expect(content).toContain('nowTopPosition');
    expect(content).toContain('bg-[#D32F2F]');
    // Legenda de status
    expect(content).toContain('Confirmado');
    expect(content).toContain('Pendente');
    expect(content).toContain('Concluído');
    expect(content).toContain('Cancelado');
    // Ações rápidas de agendamento
    expect(content).toContain('Marcar como Concluído');
    expect(content).toContain('Novo agendamento');
  });
});


