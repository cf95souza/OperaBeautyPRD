import React from 'react';
import { Link } from 'react-router-dom';
import { 
  ShieldCheck, Lock, Eye, Server, ArrowLeft, CheckCircle2, 
  FileCheck, Users, Database, Mail, HelpCircle, ExternalLink 
} from 'lucide-react';

export default function PrivacyPolicy() {
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
              Privacidade
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              to="/termos"
              className="text-xs font-semibold text-ink-muted hover:text-ink transition hidden sm:inline"
            >
              Termos de Uso
            </Link>
            <Link
              to="/dpo"
              className="text-xs font-semibold text-brand hover:text-brand-hover transition"
            >
              Canal do DPO / Exercer Direitos
            </Link>
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-line hover:bg-surface text-xs font-semibold text-ink transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Voltar
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Header */}
      <section className="bg-surface border-b border-line py-12 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-muted text-brand text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            Conformidade Integral com a LGPD (Lei Federal nº 13.709/2018)
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold text-ink tracking-tight">
            Política de Privacidade e Proteção de Dados
          </h1>
          <p className="text-sm sm:text-base text-ink-muted max-w-2xl mx-auto">
            Saiba como protegemos seus dados e os dados dos seus clientes com isolamento seguro, criptografia de ponta a ponta e respeito à sua privacidade.
          </p>
          <div className="flex items-center justify-center gap-4 text-xs text-ink-muted pt-2">
            <span>Última revisão: 28 de Outubro de 2026</span>
            <span>•</span>
            <span className="text-emerald-700 font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Auditoria Contínua de Segurança
            </span>
          </div>
        </div>
      </section>

      {/* Grid de 3 Cartões: A Divisão de Papéis sob a LGPD */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 -mt-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          <div className="p-6 rounded-2xl bg-surface border border-line shadow-md space-y-2.5">
            <div className="w-10 h-10 rounded-xl bg-brand-muted text-brand flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-brand block">
              1. O Salão de Beleza
            </span>
            <h3 className="text-base font-bold text-ink">
              Controlador dos Dados dos Clientes
            </h3>
            <p className="text-xs text-ink-muted leading-relaxed">
              O salão parceiro é o Controlador dos dados pessoais dos seus clientes finais, decidindo quais serviços oferecer, agendar e quais prontuários/fichas de anamnese preencher.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-surface border-2 border-brand/30 shadow-md space-y-2.5">
            <div className="w-10 h-10 rounded-xl bg-brand text-white flex items-center justify-center">
              <Server className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-brand block">
              2. A OperaBeauty
            </span>
            <h3 className="text-base font-bold text-ink">
              Operadora Tecnológica dos Dados
            </h3>
            <p className="text-xs text-ink-muted leading-relaxed">
              A OperaBeauty atua como Operadora (Data Processor), processando os agendamentos e prontuários estritamente sob comando e autorização do Salão, sem utilizá-los para fins próprios.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-surface border border-line shadow-md space-y-2.5">
            <div className="w-10 h-10 rounded-xl bg-brand-muted text-brand flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-brand block">
              3. O Titular de Dados
            </span>
            <h3 className="text-base font-bold text-ink">
              O Dono Absoluto dos Seus Dados
            </h3>
            <p className="text-xs text-ink-muted leading-relaxed">
              Clientes finais, donos de salão e colaboradores têm direitos garantidos pelo Art. 18 da LGPD de acessar, corrigir, anonimizar, portar ou excluir seus dados a qualquer momento.
            </p>
          </div>

        </div>
      </section>

      {/* Conteúdo Principal da Política */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-8 text-sm text-ink leading-relaxed">
        
        {/* Seção 1 */}
        <section className="p-6 sm:p-8 rounded-2xl bg-surface border border-line space-y-3">
          <h2 className="text-lg sm:text-xl font-display font-bold text-ink flex items-center gap-2">
            <Database className="w-5 h-5 text-brand" />
            1. Dados Pessoais que Coletamos e Tratamos
          </h2>
          <p>
            Para possibilitar a experiência fluida de agendamento e a gestão eficiente do salão, coletamos as seguintes categorias de dados:
          </p>
          <div className="space-y-3 text-xs sm:text-sm">
            <div className="p-4 rounded-xl bg-bg border border-line">
              <strong className="text-ink block mb-1">a) Dados de Clientes Finais dos Salões:</strong>
              <p className="text-ink-muted">
                Nome completo, número de WhatsApp/telefone, data de nascimento (para ações de aniversário), histórico de atendimentos e fotos de procedimentos anexadas na ficha com autorização.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-bg border border-line">
              <strong className="text-ink block mb-1">b) Dados dos Estabelecimentos e Gestores:</strong>
              <p className="text-ink-muted">
                Razão social ou nome fantasia, CNPJ ou CPF, endereço físico, e-mail de faturamento, dados de repasse bancário e registros de auditoria interna da plataforma.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-bg border border-line">
              <strong className="text-ink block mb-1">c) Dados Técnicos e de Navegação:</strong>
              <p className="text-ink-muted">
                Endereço IP, dados do navegador, identificador de dispositivo e cookies estritamente necessários para manter a sessão autenticada com segurança.
              </p>
            </div>
          </div>
        </section>

        {/* Seção 2 */}
        <section className="p-6 sm:p-8 rounded-2xl bg-surface border border-line space-y-3">
          <h2 className="text-lg sm:text-xl font-display font-bold text-ink flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-brand" />
            2. Bases Legais para o Tratamento de Dados (Art. 7º e 11 da LGPD)
          </h2>
          <p>
            Todo tratamento de dados realizado pela plataforma apoia-se em hipóteses legais autorizadoras expressamente previstas na LGPD:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-ink-muted text-xs sm:text-sm">
            <li><strong>Execução de Contrato (Art. 7º, V):</strong> para permitir o agendamento de horários, emissão de comandas, reserva de slots na agenda e faturamento de assinaturas.</li>
            <li><strong>Cumprimento de Obrigação Legal e Fiscal (Art. 7º, II):</strong> para emissão de notas fiscais de serviço e registros fiscais exigidos pela Receita Federal.</li>
            <li><strong>Legítimo Interesse (Art. 7º, IX):</strong> para envio de lembretes de agendamento por WhatsApp/push notification e proteção contra fraudes.</li>
            <li><strong>Consentimento Específico (Art. 7º, I e Art. 11, I):</strong> para termos de consentimento estético (como procedimentos químicos) e fichas de anamnese.</li>
          </ul>
        </section>

        {/* Seção 3 */}
        <section className="p-6 sm:p-8 rounded-2xl bg-surface border border-line space-y-3">
          <h2 className="text-lg sm:text-xl font-display font-bold text-ink flex items-center gap-2">
            <Lock className="w-5 h-5 text-brand" />
            3. Medidas Técnicas de Segurança da Informação
          </h2>
          <p>
            A OperaBeauty adota arquitetura de segurança por design (Privacy by Design) para proteger as informações contra perda, acesso não autorizado e incidentes:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
            <div className="p-3.5 rounded-xl bg-bg border border-line">
              <strong className="text-ink block">Isolamento Multi-Tenant Estrito</strong>
              <span className="text-ink-muted">Cada salão possui banco com Row Level Security (RLS), impedindo cruzamento de dados entre estabelecimentos.</span>
            </div>
            <div className="p-3.5 rounded-xl bg-bg border border-line">
              <strong className="text-ink block">Fotos de Prontuário Confidenciais</strong>
              <span className="text-ink-muted">Imagens de procedimentos exigem rota autenticada com cabeçalhos anti-cache privados (Cache-Control: private, no-store).</span>
            </div>
            <div className="p-3.5 rounded-xl bg-bg border border-line">
              <strong className="text-ink block">Criptografia Forte em Trânsito</strong>
              <span className="text-ink-muted">Todo tráfego trafega por túnel TLS 1.3 / HTTPS gerado automaticamente pelo Caddy Web Server com HSTS ativo.</span>
            </div>
            <div className="p-3.5 rounded-xl bg-bg border border-line">
              <strong className="text-ink block">Senhas Hash e Zero Acesso Cru</strong>
              <span className="text-ink-muted">Senhas protegidas com algoritmo bcrypt e múltiplos rounds de salt; ninguém (nem a equipe técnica) tem acesso à senha em texto puro.</span>
            </div>
          </div>
        </section>

        {/* Seção 4 */}
        <section className="p-6 sm:p-8 rounded-2xl bg-surface border border-line space-y-3">
          <h2 className="text-lg sm:text-xl font-display font-bold text-ink flex items-center gap-2">
            <Eye className="w-5 h-5 text-brand" />
            4. Seus Direitos como Titular de Dados (Art. 18 da LGPD)
          </h2>
          <p>
            Você pode exercer livremente a qualquer momento, de forma simplificada e gratuita, os seguintes direitos:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-ink-muted text-xs sm:text-sm">
            <li>Confirmação da existência de tratamento dos seus dados.</li>
            <li>Acesso aos dados pessoais mantidos na plataforma.</li>
            <li>Correção de dados incompletos, inexatos ou desatualizados.</li>
            <li>Anonimização, bloqueio ou eliminação de dados desnecessários ou excessivos.</li>
            <li>Portabilidade dos dados para outro fornecedor de serviços em formato aberto.</li>
            <li>Eliminação dos dados pessoais tratados com consentimento.</li>
            <li>Revogação do consentimento concedido anteriormente.</li>
          </ul>

          <div className="mt-4 p-5 rounded-2xl bg-brand-muted/50 border border-brand/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <strong className="text-ink text-sm block">Deseja exercer algum dos seus direitos agora?</strong>
              <p className="text-xs text-ink-muted mt-0.5">
                Envie sua solicitação diretamente pelo formulário oficial de privacidade e acompanhe via protocolo.
              </p>
            </div>
            <Link
              to="/dpo"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand text-white text-xs font-bold hover:bg-brand-hover transition shrink-0 shadow-xs"
            >
              Abrir Solicitação LGPD
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </section>

        {/* Seção 5 */}
        <section className="p-6 sm:p-8 rounded-2xl bg-surface border border-line space-y-3">
          <h2 className="text-lg sm:text-xl font-display font-bold text-ink flex items-center gap-2">
            <Mail className="w-5 h-5 text-brand" />
            5. Encarregado pelo Tratamento de Dados Pessoais (DPO)
          </h2>
          <p>
            A OperaBeauty mantém um comitê e canal permanente de relacionamento com os titulares de dados e com a Autoridade Nacional de Proteção de Dados (ANPD):
          </p>
          <div className="p-4 rounded-xl bg-bg border border-line space-y-1.5 text-xs sm:text-sm">
            <p><strong>Encarregado (DPO):</strong> Comitê de Segurança e Privacidade OperaBeauty</p>
            <p><strong>E-mail Institucional:</strong> <a href="mailto:privacidade@operabeauty.com.br" className="text-brand font-semibold underline">privacidade@operabeauty.com.br</a></p>
            <p><strong>Prazo Máximo de Resposta:</strong> Até 15 (quinze) dias úteis nos termos do Art. 19 da LGPD</p>
          </div>
        </section>

      </main>

      {/* Rodapé */}
      <footer className="bg-surface border-t border-line py-8 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center space-y-3">
          <div className="flex items-center justify-center gap-4 text-xs text-ink-muted">
            <Link to="/termos" className="hover:text-ink transition">Termos de Uso</Link>
            <span>•</span>
            <Link to="/dpo" className="hover:text-ink transition">Canal do DPO</Link>
            <span>•</span>
            <Link to="/dpa" className="hover:text-ink transition">Contrato DPA (Operadora)</Link>
          </div>
          <p className="text-xs text-ink-muted font-mono">
            © 2026 OperaBeauty SaaS. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
