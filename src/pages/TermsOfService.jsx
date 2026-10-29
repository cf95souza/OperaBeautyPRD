import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  ShieldCheck, FileText, Lock, Clock, ArrowLeft, CheckCircle2, 
  AlertTriangle, Server, Database, Scale, Download, Mail, ExternalLink 
} from 'lucide-react';

export default function TermsOfService() {
  const [activeSection, setActiveSection] = useState('objeto');

  const scrollTo = (id) => {
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="min-h-screen bg-bg text-ink font-sans selection:bg-brand-muted selection:text-ink">
      {/* Topo de Navegação */}
      <header className="sticky top-0 z-40 bg-surface/90 backdrop-blur-md border-b border-line">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <span className="font-display font-bold text-xl text-ink tracking-tight group-hover:text-brand transition">
              Opera<span className="text-brand">Beauty</span>
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-brand-muted text-brand">
              Jurídico
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              to="/privacidade"
              className="text-xs font-semibold text-ink-muted hover:text-ink transition hidden sm:inline"
            >
              Política de Privacidade
            </Link>
            <Link
              to="/dpo"
              className="text-xs font-semibold text-brand hover:text-brand-hover transition hidden sm:inline"
            >
              Canal DPO
            </Link>
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-line hover:bg-surface text-xs font-semibold text-ink transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Voltar ao Início
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Header */}
      <section className="bg-surface border-b border-line py-12 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-muted text-brand text-xs font-semibold">
            <Scale className="w-3.5 h-3.5" />
            Instrumento de Licença de Software como Serviço (SaaS)
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold text-ink tracking-tight">
            Termos de Uso e Contrato de Licença
          </h1>
          <p className="text-sm sm:text-base text-ink-muted max-w-2xl mx-auto">
            Diretrizes operacionais, direitos de propriedade, compromissos de nível de serviço (SLA) e relação entre Salão Controlador e OperaBeauty Operadora.
          </p>
          <div className="flex items-center justify-center gap-4 text-xs text-ink-muted pt-2">
            <span>Versão 2.4</span>
            <span>•</span>
            <span>Vigência: 28 de Outubro de 2026</span>
            <span>•</span>
            <span className="text-emerald-700 font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Em conformidade com a LGPD
            </span>
          </div>
        </div>
      </section>

      {/* Card de Destaque: Papéis LGPD */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 -mt-6">
        <div className="p-6 sm:p-8 rounded-2xl bg-surface border-2 border-brand/20 shadow-lg shadow-brand/5 space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-brand text-white flex items-center justify-center shrink-0 shadow-sm">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-brand">
                Princípio Fundamental de Titularidade (Art. 39 da LGPD)
              </span>
              <h2 className="text-lg sm:text-xl font-display font-bold text-ink mt-0.5">
                O Salão é o Controlador dos seus dados; a OperaBeauty é a Operadora da tecnologia
              </h2>
              <p className="text-xs sm:text-sm text-ink-muted mt-2 leading-relaxed">
                Você e seu estabelecimento possuem a <strong>titularidade exclusiva</strong> de todas as informações geradas na plataforma (cadastro de clientes, prontuários, fichas de anamnese, histórico de atendimentos e financeiro). A OperaBeauty não comercializa, não compartilha e não utiliza seus dados para finalidades estranhas à prestação dos serviços contratados.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Conteúdo Principal com Layout em Colunas */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Índice Lateral Sticky */}
          <aside className="lg:col-span-1 hidden lg:block">
            <div className="sticky top-24 p-5 rounded-2xl bg-surface border border-line space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                Índice de Cláusulas
              </p>
              <nav className="space-y-1">
                {[
                  { id: 'objeto', label: '1. Objeto e Licença' },
                  { id: 'planos', label: '2. Planos e Assinatura' },
                  { id: 'suspensao', label: '3. Suspensão Segura' },
                  { id: 'sla', label: '4. Nível de Serviço (SLA)' },
                  { id: 'obrigacoes', label: '5. Deveres do Salão' },
                  { id: 'propriedade', label: '6. Propriedade e Dados' },
                  { id: 'dpo', label: '7. Encarregado e LGPD' },
                  { id: 'rescisao', label: '8. Cancelamento e Foro' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => scrollTo(item.id)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition ${
                      activeSection === item.id
                        ? 'bg-brand text-white'
                        : 'text-ink-muted hover:text-ink hover:bg-bg'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </nav>

              <div className="pt-4 border-t border-line">
                <Link
                  to="/dpo"
                  className="flex items-center justify-between text-xs font-bold text-brand hover:underline"
                >
                  Canal Oficial do DPO
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </aside>

          {/* Texto das Cláusulas */}
          <article className="lg:col-span-3 space-y-10 text-sm text-ink leading-relaxed">
            
            {/* Cláusula 1 */}
            <section id="objeto" className="p-6 sm:p-8 rounded-2xl bg-surface border border-line space-y-3 scroll-mt-24">
              <div className="flex items-center gap-2 text-brand font-bold text-xs uppercase tracking-wider">
                <FileText className="w-4 h-4" /> Cláusula Primeira
              </div>
              <h2 className="text-xl font-display font-bold text-ink">
                1. Objeto, Escopo e Licença de Uso
              </h2>
              <p>
                1.1. O presente contrato tem por objeto a concessão de licença de uso temporária, revogável, onerosa e não exclusiva do software como serviço (SaaS) denominado <strong>OperaBeauty</strong>, desenvolvido e mantido para a gestão de salões de beleza, clínicas de estética, esmalterias e profissionais da beleza.
              </p>
              <p>
                1.2. O serviço abrange módulos de agendamento online white-label, controle de comissões, ficha e prontuário CRM com anexo de imagens privadas, catálogo de serviços, emissão e fechamento de comandas, controle de estoque, vales-presente e ferramentas de marketing e fidelização.
              </p>
              <p>
                1.3. O salão contratante expressamente reconhece que o OperaBeauty não é uma franquia nem presta serviços de estética, sendo exclusivamente a fornecedora da tecnologia de apoio e automação.
              </p>
            </section>

            {/* Cláusula 2 */}
            <section id="planos" className="p-6 sm:p-8 rounded-2xl bg-surface border border-line space-y-3 scroll-mt-24">
              <div className="flex items-center gap-2 text-brand font-bold text-xs uppercase tracking-wider">
                <Server className="w-4 h-4" /> Cláusula Segunda
              </div>
              <h2 className="text-xl font-display font-bold text-ink">
                2. Modalidades de Planos, Faturamento e Upgrades
              </h2>
              <p>
                2.1. O acesso ao sistema é concedido sob a contratação de um dos 4 planos oficiais da matriz da plataforma:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-ink-muted">
                <li><strong>Plano Solo</strong> (R$ 49,90/mês): 1 profissional, agendamentos ilimitados, lembretes push/e-mail e personalização de tema.</li>
                <li><strong>Plano Essencial</strong> (R$ 79,90/mês): até 3 profissionais, controle completo de estoque, fluxo de caixa e comissões.</li>
                <li><strong>Plano Premium</strong> (R$ 129,90/mês): até 6 profissionais, clube de fidelidade, cashback, anamnese e avaliações no Google.</li>
                <li><strong>Plano Signature</strong> (R$ 199,90/mês): até 12 profissionais, PDV completo com conferência cega, relatórios BI e gateway WhatsApp nativo.</li>
              </ul>
              <p>
                2.2. O faturamento é realizado de forma recorrente pré-paga (mensal ou anual com desconto de 2 meses) via PIX, cartão de crédito ou boleto bancário por meio de gateways devidamente integrados.
              </p>
              <p>
                2.3. A inclusão de profissionais adicionais além da franquia do plano contratado está sujeita à cobrança avulsa de R$ 15,00/mês por profissional ativo.
              </p>
            </section>

            {/* Cláusula 3 */}
            <section id="suspensao" className="p-6 sm:p-8 rounded-2xl bg-surface border border-line space-y-3 scroll-mt-24">
              <div className="flex items-center gap-2 text-amber-600 font-bold text-xs uppercase tracking-wider">
                <AlertTriangle className="w-4 h-4" /> Cláusula Terceira
              </div>
              <h2 className="text-xl font-display font-bold text-ink">
                3. Política de Suspensão Segura e Salvaguarda de Dados
              </h2>
              <p>
                3.1. <strong>Carência Sem Bloqueio Imediato:</strong> Em respeito à rotina do salão e à continuidade dos atendimentos, a eventual inadimplência ou falha na renovação da fatura garante ao salão um prazo de carência de <strong>5 (cinco) dias úteis</strong> com acesso regular mantido antes de qualquer limitação de recursos.
              </p>
              <p>
                3.2. <strong>Suspensão Temporária:</strong> Esgotado o prazo de carência sem regularização, a conta passará ao status "suspenso", interrompendo novos agendamentos públicos no app do cliente, mas mantendo a tela do gestor acessível para pagamento da pendência ou exportação de dados.
              </p>
              <p>
                3.3. <strong>Custódia e Retenção Garantida de 60 Dias:</strong> A OperaBeauty compromete-se a guardar e manter intactos todos os bancos de dados, cadastros de clientes e prontuários do salão pelo prazo mínimo de <strong>60 (sessenta) dias</strong> a contar da suspensão, período no qual a reativação imediata restaura todos os dados sem perda.
              </p>
            </section>

            {/* Cláusula 4 */}
            <section id="sla" className="p-6 sm:p-8 rounded-2xl bg-surface border border-line space-y-3 scroll-mt-24">
              <div className="flex items-center gap-2 text-brand font-bold text-xs uppercase tracking-wider">
                <Clock className="w-4 h-4" /> Cláusula Quarta
              </div>
              <h2 className="text-xl font-display font-bold text-ink">
                4. Níveis de Serviço (SLA) e Disponibilidade
              </h2>
              <p>
                4.1. A OperaBeauty emprega esforços contínuos e arquitetura redundante com contêineres Docker, proxy seguro Caddy e banco PostgreSQL para entregar uma meta de disponibilidade (uptime) de <strong>99,5% ao mês</strong>.
              </p>
              <p>
                4.2. Não são computadas no SLA eventuais paradas decorrentes de:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-ink-muted">
                <li>Manutenções preventivas programadas (realizadas preferencialmente entre 02h00 e 05h00 da manhã no horário de Brasília).</li>
                <li>Falhas na conectividade do provedor de internet do salão ou nos dispositivos dos usuários.</li>
                <li>Casos fortuitos ou de força maior (queda em backbones globais ou instabilidades de provedores de nuvem).</li>
              </ul>
            </section>

            {/* Cláusula 5 */}
            <section id="obrigacoes" className="p-6 sm:p-8 rounded-2xl bg-surface border border-line space-y-3 scroll-mt-24">
              <div className="flex items-center gap-2 text-brand font-bold text-xs uppercase tracking-wider">
                <Lock className="w-4 h-4" /> Cláusula Quinta
              </div>
              <h2 className="text-xl font-display font-bold text-ink">
                5. Obrigações, Confidencialidade e Uso Aceitável
              </h2>
              <p>
                5.1. O salão obriga-se a manter sob estrito sigilo suas credenciais administrativas e senhas dos colaboradores, zelando pelo princípio do privilégio mínimo de acesso.
              </p>
              <p>
                5.2. É expressamente vedado:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-ink-muted">
                <li>Praticar engenharia reversa, descompilação ou cópia de trechos do código-fonte e algoritmos proprietários.</li>
                <li>Utilizar os recursos de disparo de mensagens ou WhatsApp para envio de spam em massa não autorizado.</li>
                <li>Armazenar conteúdo ilícito, pornográfico ou ofensivo nas fichas e prontuários do sistema.</li>
              </ul>
            </section>

            {/* Cláusula 6 */}
            <section id="propriedade" className="p-6 sm:p-8 rounded-2xl bg-surface border border-line space-y-3 scroll-mt-24">
              <div className="flex items-center gap-2 text-brand font-bold text-xs uppercase tracking-wider">
                <Database className="w-4 h-4" /> Cláusula Sexta
              </div>
              <h2 className="text-xl font-display font-bold text-ink">
                6. Propriedade Intelectual e Portabilidade Irrestrita de Dados
              </h2>
              <p>
                6.1. <strong>Propriedade do Software:</strong> O software, marca, logotipos institucionais, componentes de interface (Design System Rosé Editorial) e documentação são de propriedade exclusiva da OperaBeauty.
              </p>
              <p>
                6.2. <strong>Propriedade dos Dados do Salão:</strong> O salão é o <strong>único e exclusivo proprietário</strong> de todos os dados inseridos na plataforma.
              </p>
              <p>
                6.3. <strong>Portabilidade Sem Amarras:</strong> O salão poderá a qualquer tempo, sem custos adicionais, exportar a base completa de seus clientes, histórico de serviços e estoque em formatos padronizados (JSON/CSV) por meio das ferramentas de LGPD e relatórios nativos.
              </p>
            </section>

            {/* Cláusula 7 */}
            <section id="dpo" className="p-6 sm:p-8 rounded-2xl bg-surface border border-line space-y-3 scroll-mt-24">
              <div className="flex items-center gap-2 text-brand font-bold text-xs uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4" /> Cláusula Sétima
              </div>
              <h2 className="text-xl font-display font-bold text-ink">
                7. Proteção de Dados e Canal do Encarregado (DPO)
              </h2>
              <p>
                7.1. A OperaBeauty cumpre integralmente as disposições da Lei Federal nº 13.709/2018 (Lei Geral de Proteção de Dados - LGPD).
              </p>
              <p>
                7.2. Para o atendimento a requisições de titulares de dados, esclarecimento de dúvidas sobre tratamento de dados e relacionamento com a ANPD, o contato do Encarregado de Dados (DPO) é:
              </p>
              <div className="p-4 rounded-xl bg-bg border border-line flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-brand" />
                  <div>
                    <span className="text-xs text-ink-muted block">Canal Oficial do Encarregado (DPO):</span>
                    <strong className="text-sm text-ink">privacidade@operabeauty.com.br</strong>
                  </div>
                </div>
                <Link
                  to="/dpo"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand text-white text-xs font-semibold hover:bg-brand-hover transition"
                >
                  Abrir Chamado LGPD
                </Link>
              </div>
            </section>

            {/* Cláusula 8 */}
            <section id="rescisao" className="p-6 sm:p-8 rounded-2xl bg-surface border border-line space-y-3 scroll-mt-24">
              <div className="flex items-center gap-2 text-brand font-bold text-xs uppercase tracking-wider">
                <Scale className="w-4 h-4" /> Cláusula Oitava
              </div>
              <h2 className="text-xl font-display font-bold text-ink">
                8. Rescisão, Vigência e Foro de Eleição
              </h2>
              <p>
                8.1. O contrato vigorará por prazo indeterminado, iniciando-se na data do aceite eletrônico ou cadastro do salão na plataforma.
              </p>
              <p>
                8.2. O cancelamento pode ser solicitado a qualquer momento diretamente pelo painel administrativo, sem aplicação de multas rescisórias ou períodos de fidelidade para planos mensais.
              </p>
              <p>
                8.3. Fica eleito o Foro da Comarca da sede da empresa prestadora para dirimir eventuais controvérsias oriundas deste instrumento, com renúncia expressa a qualquer outro.
              </p>
            </section>

          </article>
        </div>
      </main>

      {/* Aviso de Governança e Rodapé */}
      <footer className="bg-surface border-t border-line py-8 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center space-y-3">
          <p className="text-xs text-ink-muted">
            Nota de Governança: Estes termos constituem a minuta oficial da plataforma OperaBeauty. Recomenda-se a revisão periódica por assessoria contábil e jurídica conforme o regime tributário e societário de cada estabelecimento.
          </p>
          <p className="text-xs text-ink-muted font-mono">
            © 2026 OperaBeauty SaaS. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
