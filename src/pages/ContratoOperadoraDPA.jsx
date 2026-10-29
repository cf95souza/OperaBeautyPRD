import React from 'react';
import { Link } from 'react-router-dom';
import { 
  ShieldCheck, Server, ArrowLeft, CheckCircle2, Lock, FileText, 
  Database, Scale, AlertTriangle 
} from 'lucide-react';

export default function ContratoOperadoraDPA() {
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
              Anexo DPA
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
              to="/privacidade"
              className="text-xs font-semibold text-ink-muted hover:text-ink transition hidden sm:inline"
            >
              Política de Privacidade
            </Link>
            <Link
              to="/dpo"
              className="text-xs font-semibold text-brand hover:text-brand-hover transition"
            >
              Canal DPO
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
        <div className="max-w-3xl mx-auto text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-muted text-brand text-xs font-semibold">
            <Scale className="w-3.5 h-3.5" />
            Data Processing Agreement (DPA) · Aditivo Contratual LGPD
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-ink tracking-tight">
            Contrato de Operadora de Dados Pessoais
          </h1>
          <p className="text-sm text-ink-muted max-w-xl mx-auto">
            Instrumento vinculante de tratamento de dados entre o Salão de Beleza (Controlador) e a OperaBeauty (Operadora), nos termos do Art. 39 da Lei Federal nº 13.709/2018.
          </p>
        </div>
      </section>

      {/* Conteúdo Jurídico */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-8 text-sm text-ink leading-relaxed">
        
        <section className="p-6 sm:p-8 rounded-2xl bg-surface border border-line space-y-3">
          <h2 className="text-lg sm:text-xl font-display font-bold text-ink flex items-center gap-2">
            <FileText className="w-5 h-5 text-brand" />
            1. Premissas e Vinculação Contratual
          </h2>
          <p>
            1.1. O presente instrumento integra formalmente os Termos de Uso e o Contrato de Assinatura SaaS do OperaBeauty, aplicando-se a todo e qualquer tratamento de dados pessoais de clientes finais, profissionais e parceiros do Salão.
          </p>
          <p>
            1.2. Para fins deste aditivo:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-ink-muted text-xs sm:text-sm">
            <li><strong>Controlador:</strong> O Salão de Beleza / Estética contratante, a quem competem as decisões referentes ao tratamento de dados pessoais.</li>
            <li><strong>Operadora:</strong> A OperaBeauty (OperaTech Systems), que realiza o tratamento de dados pessoais em nome e sob as instruções estritas do Controlador.</li>
          </ul>
        </section>

        <section className="p-6 sm:p-8 rounded-2xl bg-surface border border-line space-y-3">
          <h2 className="text-lg sm:text-xl font-display font-bold text-ink flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-brand" />
            2. Obrigações e Compromissos da Operadora (OperaBeauty)
          </h2>
          <p>
            2.1. A OperaBeauty compromete-se a:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-ink-muted text-xs sm:text-sm">
            <li>Tratar os dados pessoais do Salão <strong>exclusivamente</strong> com a finalidade de viabilizar a execução das funcionalidades do software (agendamentos, comissões, comandas, prontuários e notificações).</li>
            <li>Não sublicenciar, comercializar, monetizar ou alugar a base de clientes do salão para anunciantes ou terceiros.</li>
            <li>Garantir que todos os colaboradores internos com acesso eventual a bancos de dados em rotinas de suporte assinem termo rigoroso de confidencialidade (NDA).</li>
            <li>Aplicar salvaguardas técnicas adequadas, incluindo isolamento multi-tenant, criptografia em trânsito TLS 1.3 e em repouso.</li>
            <li>Auxiliar o Controlador no atendimento às solicitações de exercício de direitos dos titulares (Art. 18 da LGPD) e ordens da Autoridade Nacional de Proteção de Dados (ANPD).</li>
          </ul>
        </section>

        <section className="p-6 sm:p-8 rounded-2xl bg-surface border border-line space-y-3">
          <h2 className="text-lg sm:text-xl font-display font-bold text-ink flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            3. Notificação de Incidentes de Segurança
          </h2>
          <p>
            3.1. Caso a Operadora tome ciência de qualquer incidente comprovado de segurança que possa acarretar risco ou dano relevante aos titulares de dados do Salão, obriga-se a notificar o Controlador por e-mail no prazo máximo de <strong>48 (quarenta e oito) horas</strong> úteis após a confirmação do evento.
          </p>
          <p>
            3.2. A notificação conterá, no mínimo: a natureza dos dados afetados, as medidas técnicas corretivas adotadas e as orientações para mitigação de riscos.
          </p>
        </section>

        <section className="p-6 sm:p-8 rounded-2xl bg-surface border border-line space-y-3">
          <h2 className="text-lg sm:text-xl font-display font-bold text-ink flex items-center gap-2">
            <Database className="w-5 h-5 text-brand" />
            4. Término do Tratamento e Devolução dos Dados
          </h2>
          <p>
            4.1. Encerrada a relação contratual entre o Salão e a OperaBeauty, o Salão poderá exportar todos os seus dados em formato estruturado (JSON/CSV) durante o período de carência e retenção assegurado de 60 dias.
          </p>
          <p>
            4.2. Esgotado o prazo de guarda, a OperaBeauty realizará a eliminação segura ou a anonimização irreversível dos dados dos clientes do salão em seus servidores de produção, ressalvada a guarda estritamente necessária para cumprimento de obrigação legal ou fiscal (Art. 16 da LGPD).
          </p>
        </section>

      </main>

      {/* Rodapé */}
      <footer className="bg-surface border-t border-line py-8 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center space-y-3">
          <div className="flex items-center justify-center gap-4 text-xs text-ink-muted">
            <Link to="/termos" className="hover:text-ink transition">Termos de Uso</Link>
            <span>•</span>
            <Link to="/privacidade" className="hover:text-ink transition">Política de Privacidade</Link>
            <span>•</span>
            <Link to="/dpo" className="hover:text-ink transition">Canal do DPO</Link>
          </div>
          <p className="text-xs text-ink-muted font-mono">
            © 2026 OperaBeauty SaaS. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
