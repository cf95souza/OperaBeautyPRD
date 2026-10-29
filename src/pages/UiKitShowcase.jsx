import React, { useState } from 'react';
import {
  Botao,
  Chip,
  ChipSelecionavel,
  Cartao,
  CartaoServico,
  CartaoProfissional,
  CartaoProximoHorario,
  CartaoClube,
  CampoTexto,
  CampoTelefone,
  CampoCodigo,
  FaixaDeDias,
  GradeDeHorarios,
  BarraDeProgresso,
  BarraFixaInferior,
  BottomSheet,
  Toast,
  ProvedorToast,
  useToast,
  Skeleton,
  EstadoVazio,
  EstadoErro,
  NavegacaoInferior,
  Avatar,
  PlaceholderImagem,
  ModalRecorteImagem,
} from '../components/ui';
import { useTenant } from '../context/TenantContext';
import {
  Sparkles,
  Heart,
  Palette,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sliders,
  Calendar,
  Layers,
  Phone,
  Search,
  Upload,
} from 'lucide-react';

export const UiKitShowcaseContent = () => {
  const { tenant, applyLiveTheme } = useTenant();
  const { dispararToast } = useToast();

  // Estados locais interativos
  const [temaAtivo, setTemaAtivo] = useState(tenant?.branding?.theme_id || 'rose');
  const [chipAtivo, setChipAtivo] = useState('cabelo');
  const [chipsMultiplos, setChipsMultiplos] = useState(['mechas']);
  const [etapaProgresso, setEtapaProgresso] = useState(2);
  const [bottomSheetAberto, setBottomSheetAberto] = useState(false);
  const [modalRecorteAberto, setModalRecorteAberto] = useState(false);
  const [horarioEscolhido, setHorarioEscolhido] = useState('14:30');
  const [codigoOtp, setCodigoOtp] = useState('');
  const [botaoLoading, setBotaoLoading] = useState(false);
  const [imagemPreview, setImagemPreview] = useState(null);

  const temas = [
    { id: 'rose', nome: 'Rosé Editorial', hex: '#8E3B4E' },
    { id: 'nude', nome: 'Nude Clássico', hex: '#7A5C4D' },
    { id: 'lavender', nome: 'Lavanda Suave', hex: '#635380' },
    { id: 'sage', nome: 'Sálvia Natural', hex: '#3F6B55' },
    { id: 'noir', nome: 'Preto & Dourado', hex: '#242124' },
    { id: 'bordeaux', nome: 'Bordô Elegante', hex: '#632034' },
  ];

  const trocarTema = (novoTemaId) => {
    setTemaAtivo(novoTemaId);
    if (applyLiveTheme) {
      applyLiveTheme(novoTemaId);
    }
  };

  const alternarMultiplo = (id) => {
    setChipsMultiplos((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <div className="min-h-screen bg-bg text-ink font-sans pb-32">
      {/* Topo / Banner Editorial */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-line/70 px-4 py-4 sm:px-8">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-brand-tint text-brand uppercase tracking-wider border border-brand/20">
                Design System
              </span>
              <span className="text-[12px] text-ink-soft">Rosé Editorial v1.0</span>
            </div>
            <h1 className="font-serif text-[26px] sm:text-[30px] font-bold text-ink mt-1">
              Biblioteca de Componentes UI
            </h1>
          </div>

          {/* Troca Rápida de Tema ao Vivo */}
          <div className="flex items-center gap-2 flex-wrap bg-bg p-1.5 rounded-2xl border border-line/60">
            <Palette className="w-4 h-4 text-brand ml-2 shrink-0" />
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {temas.map((t) => (
                <button
                  key={t.id}
                  onClick={() => trocarTema(t.id)}
                  title={t.nome}
                  className={`w-7 h-7 rounded-full transition-transform flex items-center justify-center text-white ${
                    temaAtivo === t.id ? 'ring-2 ring-offset-2 ring-brand scale-110 shadow-sm' : 'opacity-85 hover:opacity-100 hover:scale-105'
                  }`}
                  style={{ backgroundColor: t.hex }}
                >
                  {temaAtivo === t.id && <span className="text-[10px]">✓</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-8 mt-8 flex flex-col gap-12">
        {/* Seção 1: Botões */}
        <section className="flex flex-col gap-4 text-left">
          <div className="border-b border-line/60 pb-2">
            <h2 className="font-serif text-[22px] font-bold text-ink">1. Botões (`Botao`)</h2>
            <p className="text-[13px] text-ink-soft">
              Variantes com altura 52px (lg), 44px (md), 36px (sm), foco visível acessível e spinners de loading.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-center">
            <Botao variante="primario" tamanho="lg">
              Primário (52px)
            </Botao>
            <Botao variante="secundario" tamanho="lg">
              Secundário (52px)
            </Botao>
            <Botao variante="contorno" tamanho="lg">
              Contorno (52px)
            </Botao>
            <Botao variante="danger" tamanho="lg">
              Perigo (52px)
            </Botao>
          </div>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <Botao variante="primario" tamanho="md">
              Médio (44px)
            </Botao>
            <Botao variante="secundario" tamanho="sm">
              Pequeno (36px)
            </Botao>
            <Botao variante="texto" tamanho="sm">
              Botão Texto
            </Botao>
            <Botao
              variante="primario"
              tamanho="md"
              isLoading={botaoLoading}
              onClick={() => {
                setBotaoLoading(true);
                setTimeout(() => setBotaoLoading(false), 2000);
              }}
            >
              {botaoLoading ? 'Processando...' : 'Clique p/ Loading'}
            </Botao>
            <Botao variante="primario" tamanho="md" disabled>
              Desabilitado
            </Botao>
          </div>
        </section>

        {/* Seção 2: Chips e Seleção */}
        <section className="flex flex-col gap-4 text-left">
          <div className="border-b border-line/60 pb-2">
            <h2 className="font-serif text-[22px] font-bold text-ink">
              2. Chips & Seleção (`Chip` e `ChipSelecionavel`)
            </h2>
            <p className="text-[13px] text-ink-soft">
              Fundo rosé suave `#F6E4E4`, texto em alto contraste, estados ativo, contadores e acessibilidade `role="checkbox"`.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            {['cabelo', 'unhas', 'sobrancelha', 'estetica', 'outros'].map((cat) => (
              <Chip
                key={cat}
                selecionado={chipAtivo === cat}
                onClick={() => setChipAtivo(cat)}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </Chip>
            ))}
          </div>

          <div className="flex flex-wrap gap-2.5 pt-2">
            <ChipSelecionavel
              selecionado={chipsMultiplos.includes('mechas')}
              aoAlternar={() => alternarMultiplo('mechas')}
              contador={3}
            >
              Mechas & Loiros
            </ChipSelecionavel>
            <ChipSelecionavel
              selecionado={chipsMultiplos.includes('hidratacao')}
              aoAlternar={() => alternarMultiplo('hidratacao')}
              contador={12}
            >
              Hidratação Intensiva
            </ChipSelecionavel>
            <ChipSelecionavel
              selecionado={chipsMultiplos.includes('manicure')}
              aoAlternar={() => alternarMultiplo('manicure')}
            >
              Manicure & Pedicure
            </ChipSelecionavel>
            <ChipSelecionavel disabled>
              Indisponível (Disabled)
            </ChipSelecionavel>
          </div>
        </section>

        {/* Seção 3: Formulários */}
        <section className="flex flex-col gap-4 text-left">
          <div className="border-b border-line/60 pb-2">
            <h2 className="font-serif text-[22px] font-bold text-ink">
              3. Entradas de Formulário (`CampoTexto`, `CampoTelefone`, `CampoCodigo`)
            </h2>
            <p className="text-[13px] text-ink-soft">
              Campos de 56px com raio 18px, foco sutil em `--color-brand`, máscara brasileira e campo de código OTP com auto-avanço.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <CampoTexto
              id="ex-nome"
              label="Nome Completo"
              placeholder="Ex: Amanda Silva"
              textoAjuda="Como prefere ser chamada"
            />
            <CampoTelefone
              id="ex-tel"
              label="WhatsApp / Telefone"
              placeholder="(11) 98765-4321"
            />
            <CampoTexto
              id="ex-erro"
              label="Campo com Erro"
              defaultValue="emailinvalido@"
              error="Por favor, informe um formato válido"
            />
          </div>

          <div className="p-6 rounded-[22px] bg-white border border-line/70 flex flex-col items-center gap-3">
            <h4 className="font-serif text-[18px] font-bold text-ink">
              Código de Verificação OTP (WhatsApp / SMS)
            </h4>
            <p className="text-[13px] text-ink-soft text-center max-w-sm">
              Campo individual por dígito, avanço automático e suporte a colar código completo.
            </p>
            <CampoCodigo
              qtdDigitos={4}
              valor={codigoOtp}
              aoMudar={setCodigoOtp}
              aoCompletar={(cod) =>
                dispararToast({
                  titulo: 'Código Verificado',
                  mensagem: `Código ${cod} validado com sucesso!`,
                  tipo: 'sucesso',
                })
              }
            />
          </div>
        </section>

        {/* Seção 4: Cartões do Domínio */}
        <section className="flex flex-col gap-4 text-left">
          <div className="border-b border-line/60 pb-2">
            <h2 className="font-serif text-[22px] font-bold text-ink">
              4. Cartões do Domínio (`Cartao`, `CartaoProfissional`, `CartaoProximoHorario`, `CartaoClube`)
            </h2>
            <p className="text-[13px] text-ink-soft">
              Superfície branca com cantos de 22px, borda sutil, sombras suaves e tipografia Rosé Editorial.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <CartaoProximoHorario
              diaSemana="TER"
              diaMes="20"
              mesAbreviado="OUT"
              horario="14:30"
              servicoNome="Corte & Escova Modeladora"
              profissionalNome="Juliana Costa"
              duracao="45 min"
              aoRemarcar={() =>
                dispararToast({
                  titulo: 'Remarcação',
                  mensagem: 'Direcionando para o fluxo de horários...',
                  tipo: 'info',
                })
              }
              aoVerDetalhes={() => setBottomSheetAberto(true)}
            />

            <CartaoClube
              titulo="Clube Vip Studio Thaís"
              sessoesDisponiveis={2}
              isAssinante={true}
              beneficioPrincipal="2 Cortes ou Escovas gratuitas por mês"
              aoClicarAcao={() => setBottomSheetAberto(true)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <CartaoProfissional
              id="prof-1"
              nome="Juliana Costa"
              especialidade="Especialista em Mechas & Cortes"
              nota={4.9}
              avaliacoesQtd={48}
              proximoHorario="Hoje às 14:30"
              selecionado={true}
            />
            <CartaoProfissional
              id="prof-2"
              nome="Caio Profissional"
              especialidade="Barbearia, Corte e Escova"
              nota={5.0}
              avaliacoesQtd={29}
              proximoHorario="Amanhã às 10:00"
              selecionado={false}
            />
          </div>
        </section>

        {/* Seção 5: Barra de Progresso e Horários */}
        <section className="flex flex-col gap-4 text-left">
          <div className="border-b border-line/60 pb-2">
            <h2 className="font-serif text-[22px] font-bold text-ink">
              5. Seleção de Tempo & Fluxo (`BarraDeProgresso` e `GradeDeHorarios`)
            </h2>
            <p className="text-[13px] text-ink-soft">
              Indicador de etapas com preenchimento contínuo e grade de horários em 3 colunas e 44px de altura.
            </p>
          </div>

          <div className="p-6 rounded-[22px] bg-white border border-line/70 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-[14px] font-bold text-ink">Barra de Progresso Rosé</span>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4].map((step) => (
                  <button
                    key={step}
                    onClick={() => setEtapaProgresso(step)}
                    className={`w-7 h-7 rounded-full text-[12px] font-bold ${
                      etapaProgresso === step
                        ? 'bg-brand text-white'
                        : 'bg-bg text-ink-soft hover:bg-brand-tint'
                    }`}
                  >
                    {step}
                  </button>
                ))}
              </div>
            </div>
            <BarraDeProgresso
              etapaAtual={etapaProgresso}
              totalEtapas={4}
              tituloEtapa={
                etapaProgresso === 1
                  ? 'Escolha de Serviços'
                  : etapaProgresso === 2
                  ? 'Data e Horário'
                  : etapaProgresso === 3
                  ? 'Revisão & Descontos'
                  : 'Confirmação'
              }
            />
          </div>

          <div className="p-6 rounded-[22px] bg-white border border-line/70">
            <h4 className="font-serif text-[18px] font-bold text-ink mb-4">
              Grade de Horários (`GradeDeHorarios`)
            </h4>
            <GradeDeHorarios
              horarios={[
                '09:00',
                '09:30',
                '10:00',
                '10:30',
                '11:00',
                '11:30',
                '13:00',
                '13:30',
                '14:00',
                '14:30',
                '15:00',
                '15:30',
                '18:00',
                '18:30',
                '19:00',
              ]}
              horarioSelecionado={horarioEscolhido}
              bloqueados={['10:00', '13:30', '15:00']}
              aoSelecionarHorario={(hora) => {
                setHorarioEscolhido(hora);
                dispararToast({
                  titulo: 'Horário Marcado',
                  mensagem: `Selecionado: ${hora}`,
                  tipo: 'sucesso',
                });
              }}
            />
          </div>
        </section>

        {/* Seção 6: Avatares, Placeholders e Imagens */}
        <section className="flex flex-col gap-4 text-left">
          <div className="border-b border-line/60 pb-2">
            <h2 className="font-serif text-[22px] font-bold text-ink">
              6. Avatares & Placeholders (`Avatar` e `PlaceholderImagem`)
            </h2>
            <p className="text-[13px] text-ink-soft">
              Sem caixas vazias ou imagens quebradas; suporte a monogramas editoriais em Playfair e ícones contextuais de categoria.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="p-6 rounded-[22px] bg-white border border-line/70 flex flex-col gap-4">
              <h4 className="font-serif text-[16px] font-bold text-ink">Avatares com Iniciais & Status</h4>
              <div className="flex items-center gap-4">
                <Avatar nome="Thaís Silva" tamanho="xl" anel status="online" />
                <Avatar nome="Caio Profissional" tamanho="lg" status="ocupado" />
                <Avatar nome="Amanda Souza" tamanho="md" status="offline" />
                <Avatar nome="Cliente VIP" tamanho="sm" />
              </div>
            </div>

            <div className="p-6 rounded-[22px] bg-white border border-line/70 flex flex-col gap-4">
              <h4 className="font-serif text-[16px] font-bold text-ink">
                Placeholders Contextuais de Serviços
              </h4>
              <div className="flex items-center gap-4">
                <div className="flex flex-col items-center gap-1">
                  <PlaceholderImagem categoria="cabelo" className="w-12 h-12 rounded-2xl" />
                  <span className="text-[10px] text-ink-soft">Cabelo</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <PlaceholderImagem categoria="unhas" className="w-12 h-12 rounded-2xl" />
                  <span className="text-[10px] text-ink-soft">Unhas</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <PlaceholderImagem categoria="sobrancelha" className="w-12 h-12 rounded-2xl" />
                  <span className="text-[10px] text-ink-soft">Sobrancelha</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <PlaceholderImagem categoria="estetica" className="w-12 h-12 rounded-2xl" />
                  <span className="text-[10px] text-ink-soft">Estética</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Seção 7: Feedback, Toasts & Estados */}
        <section className="flex flex-col gap-4 text-left">
          <div className="border-b border-line/60 pb-2">
            <h2 className="font-serif text-[22px] font-bold text-ink">
              7. Feedback & Estados (`Toast`, `BottomSheet`, `Skeleton`, `EstadoVazio`, `EstadoErro`)
            </h2>
            <p className="text-[13px] text-ink-soft">
              Componentes para carregamento gracioso, notificações de sucesso/erro e estados acolhedores.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Botao
              variante="primario"
              tamanho="md"
              onClick={() =>
                dispararToast({
                  titulo: 'Agendamento Confirmado!',
                  mensagem: 'Enviamos os detalhes para seu WhatsApp.',
                  tipo: 'sucesso',
                })
              }
            >
              Disparar Toast Sucesso
            </Botao>
            <Botao
              variante="secundario"
              tamanho="md"
              onClick={() =>
                dispararToast({
                  titulo: 'Atenção ao Horário',
                  mensagem: 'Chegue com 10 minutos de antecedência.',
                  tipo: 'alerta',
                })
              }
            >
              Toast Alerta
            </Botao>
            <Botao
              variante="danger"
              tamanho="md"
              onClick={() =>
                dispararToast({
                  titulo: 'Erro ao Processar',
                  mensagem: 'Não foi possível conectar ao servidor.',
                  tipo: 'erro',
                })
              }
            >
              Toast Erro
            </Botao>
            <Botao
              variante="contorno"
              tamanho="md"
              onClick={() => setBottomSheetAberto(true)}
            >
              Abrir BottomSheet
            </Botao>
          </div>

          {/* Skeleton Shimmer */}
          <div className="p-6 rounded-[22px] bg-white border border-line/70 flex flex-col gap-4">
            <h4 className="font-serif text-[16px] font-bold text-ink">
              Shimmer de Carregamento (`Skeleton`)
            </h4>
            <div className="flex items-center gap-4">
              <Skeleton variante="circulo" className="w-14 h-14" />
              <div className="flex-1 flex flex-col gap-2">
                <Skeleton variante="texto" className="w-2/5 h-4" />
                <Skeleton variante="texto" className="w-3/4 h-3.5" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <EstadoVazio
              titulo="Nenhum horário marcado"
              descricao="Reserve seu próximo momento de cuidado em poucos toques."
              textoAcao="+ Agendar Novo Horário"
              aoClicarAcao={() =>
                dispararToast({
                  titulo: 'Navegação',
                  mensagem: 'Redirecionando para agendamento...',
                  tipo: 'info',
                })
              }
            />

            <EstadoErro
              titulo="Falha na conexão"
              mensagem="Não conseguimos sincronizar com o salão no momento."
              aoTentarNovamente={() =>
                dispararToast({
                  titulo: 'Tentando novamente',
                  mensagem: 'Reconectando aos serviços...',
                  tipo: 'info',
                })
              }
            />
          </div>
        </section>
      </main>

      {/* Drawer / BottomSheet Interativo */}
      <BottomSheet
        aberto={bottomSheetAberto}
        aoFechar={() => setBottomSheetAberto(false)}
        titulo="Detalhes do Atendimento"
        subtitulo="Studio Thaís · Terça, 20 de Outubro"
      >
        <div className="flex flex-col gap-4 text-left">
          <div className="p-4 rounded-[18px] bg-brand-tint border border-line/60">
            <span className="text-[12px] font-bold text-brand uppercase tracking-wider">
              Procedimento Confirmado
            </span>
            <h4 className="font-serif text-[18px] font-bold text-ink mt-1">
              Corte & Escova Modeladora
            </h4>
            <p className="text-[13px] text-ink-soft">
              Profissional: <strong>Juliana Costa</strong> · Duração: 45 minutos
            </p>
          </div>

          <div className="text-[14px] text-ink-soft leading-relaxed">
            <p>
              Local: Rua das Acácias, 120 - Jardins, São Paulo - SP.
            </p>
            <p className="mt-2 text-[12px] text-ink-soft/80">
              Caso precise remarcar, você pode fazer isso com até 2 horas de antecedência pelo aplicativo.
            </p>
          </div>

          <Botao
            variante="primario"
            tamanho="lg"
            className="w-full mt-2"
            onClick={() => {
              setBottomSheetAberto(false);
              dispararToast({
                titulo: 'Ação Concluída',
                mensagem: 'Agendamento salvo no seu calendário.',
                tipo: 'sucesso',
              });
            }}
          >
            Entendido
          </Botao>
        </div>
      </BottomSheet>
    </div>
  );
};

export const UiKitShowcase = () => {
  return (
    <ProvedorToast>
      <UiKitShowcaseContent />
    </ProvedorToast>
  );
};

export default UiKitShowcase;
