import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { 
  ShieldCheck, Lock, Mail, ArrowLeft, Send, Search, CheckCircle2, 
  Clock, AlertCircle, Copy, Check, FileText, UserCheck, HelpCircle 
} from 'lucide-react';

export default function CanalPrivacidadeDPO() {
  const [activeTab, setActiveTab] = useState('new'); // 'new' | 'check'

  // Estados do formulário de nova solicitação
  const [form, setForm] = useState({
    name: '',
    email: '',
    document: '',
    requester_type: 'client',
    request_type: 'access',
    details: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [protocolGenerated, setProtocolGenerated] = useState(null);
  const [copiedProtocol, setCopiedProtocol] = useState(false);
  const [formError, setFormError] = useState(null);

  // Estados de consulta de protocolo
  const [searchProtocol, setSearchProtocol] = useState('');
  const [checkingProtocol, setCheckingProtocol] = useState(false);
  const [protocolResult, setProtocolResult] = useState(null);
  const [searchError, setSearchError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);

    try {
      const res = await api.privacy.sendRequest(form);
      setProtocolGenerated(res);
      setForm({
        name: '',
        email: '',
        document: '',
        requester_type: 'client',
        request_type: 'access',
        details: ''
      });
    } catch (err) {
      setFormError(err.message || 'Erro ao registrar solicitação. Verifique os dados.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSearchProtocol = async (e) => {
    e.preventDefault();
    if (!searchProtocol.trim()) return;

    setCheckingProtocol(true);
    setSearchError(null);
    setProtocolResult(null);

    try {
      const res = await api.privacy.checkStatus(searchProtocol.trim());
      setProtocolResult(res);
    } catch (err) {
      setSearchError(err.message || 'Protocolo não localizado. Verifique se o código foi digitado corretamente.');
    } finally {
      setCheckingProtocol(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedProtocol(true);
    setTimeout(() => setCopiedProtocol(false), 2000);
  };

  const translateRequestType = (type) => {
    const map = {
      access: 'Confirmação e Acesso aos Dados',
      correction: 'Correção de Dados Incompletos ou Inexatos',
      anonymization: 'Anonimização ou Bloqueio de Dados',
      deletion: 'Eliminação dos Dados Pessoais',
      portability: 'Portabilidade dos Dados',
      consent_revocation: 'Revogação de Consentimento',
      information: 'Dúvidas e Informações Gerais'
    };
    return map[type] || type;
  };

  const translateStatus = (status) => {
    const map = {
      received: { label: 'Recebido / Aguardando Triagem', color: 'bg-blue-100 text-blue-800 border-blue-200' },
      under_review: { label: 'Em Análise pelo DPO', color: 'bg-amber-100 text-amber-800 border-amber-200' },
      completed: { label: 'Concluído e Respondido', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
      rejected: { label: 'Finalizado com Justificativa', color: 'bg-slate-100 text-slate-800 border-slate-200' }
    };
    return map[status] || { label: status, color: 'bg-slate-100 text-slate-800' };
  };

  return (
    <div className="min-h-screen bg-bg text-ink font-sans selection:bg-brand-muted selection:text-ink pb-16">
      {/* Topo de Navegação */}
      <header className="sticky top-0 z-40 bg-surface/90 backdrop-blur-md border-b border-line">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <span className="font-display font-bold text-xl text-ink tracking-tight group-hover:text-brand transition">
              Opera<span className="text-brand">Beauty</span>
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-brand-muted text-brand">
              Canal DPO
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
              to="/termos"
              className="text-xs font-semibold text-ink-muted hover:text-ink transition hidden sm:inline"
            >
              Termos de Uso
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
            <UserCheck className="w-3.5 h-3.5" />
            Canal do Encarregado pelo Tratamento de Dados (DPO)
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-ink tracking-tight">
            Portal de Privacidade e Direitos do Titular
          </h1>
          <p className="text-sm text-ink-muted max-w-xl mx-auto">
            Este canal exclusivo é dedicado ao exercício dos direitos previstos no Artigo 18 da Lei Geral de Proteção de Dados (LGPD).
          </p>
          <div className="pt-2 flex items-center justify-center gap-2 text-xs text-ink-muted">
            <Mail className="w-4 h-4 text-brand" />
            <span>Contato direto: <strong className="text-ink">privacidade@operabeauty.com.br</strong></span>
          </div>
        </div>
      </section>

      {/* Conteúdo Central */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-8 space-y-6">
        
        {/* Seletor de Abas */}
        <div className="flex rounded-2xl bg-surface border border-line p-1 shadow-xs">
          <button
            onClick={() => setActiveTab('new')}
            className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 ${
              activeTab === 'new'
                ? 'bg-brand text-white shadow-xs'
                : 'text-ink-muted hover:text-ink'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            Exercer Direitos LGPD
          </button>
          <button
            onClick={() => setActiveTab('check')}
            className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 ${
              activeTab === 'check'
                ? 'bg-brand text-white shadow-xs'
                : 'text-ink-muted hover:text-ink'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            Consultar Protocolo
          </button>
        </div>

        {/* ABA 1: Nova Solicitação */}
        {activeTab === 'new' && (
          <div className="space-y-6 animate-fade-in">
            {protocolGenerated ? (
              /* Sucesso: Exibição do Protocolo */
              <div className="p-8 rounded-2xl bg-surface border-2 border-emerald-500/30 shadow-lg text-center space-y-5">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                    Solicitação Protocolada com Sucesso
                  </span>
                  <h2 className="text-2xl font-display font-bold text-ink mt-1">
                    Seu Pedido Está Sob Análise do DPO
                  </h2>
                  <p className="text-xs text-ink-muted mt-2 max-w-md mx-auto">
                    {protocolGenerated.deadline_info} Guarde seu número de protocolo para acompanhar a evolução do atendimento.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-bg border border-line max-w-sm mx-auto flex items-center justify-between gap-3">
                  <div className="text-left">
                    <span className="text-[11px] text-ink-muted block font-semibold">Número do Protocolo:</span>
                    <strong className="text-base text-ink font-mono">{protocolGenerated.protocol}</strong>
                  </div>
                  <button
                    onClick={() => copyToClipboard(protocolGenerated.protocol)}
                    className="p-2 rounded-lg border border-line hover:bg-surface text-ink-muted hover:text-ink transition flex items-center gap-1 text-xs"
                    title="Copiar Protocolo"
                  >
                    {copiedProtocol ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedProtocol ? 'Copiado!' : 'Copiar'}</span>
                  </button>
                </div>

                <div className="pt-2 flex justify-center gap-3">
                  <button
                    onClick={() => {
                      setSearchProtocol(protocolGenerated.protocol);
                      setActiveTab('check');
                    }}
                    className="px-4 py-2 rounded-xl bg-ink text-white text-xs font-semibold hover:bg-black transition"
                  >
                    Ver Status no Acompanhamento
                  </button>
                  <button
                    onClick={() => setProtocolGenerated(null)}
                    className="px-4 py-2 rounded-xl border border-line bg-surface text-xs font-semibold text-ink hover:bg-bg transition"
                  >
                    Abrir Outra Solicitação
                  </button>
                </div>
              </div>
            ) : (
              /* Formulário */
              <form onSubmit={handleSubmit} className="p-6 sm:p-8 rounded-2xl bg-surface border border-line shadow-xs space-y-4">
                <div className="border-b border-line pb-4">
                  <h2 className="text-lg font-bold text-ink flex items-center gap-2">
                    <FileText className="w-5 h-5 text-brand" />
                    Formulário Oficial de Requisição do Titular
                  </h2>
                  <p className="text-xs text-ink-muted mt-1">
                    Preencha os campos abaixo com exatidão para que o Encarregado de Dados localize os seus registros.
                  </p>
                </div>

                {formError && (
                  <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-ink mb-1">Nome Completo *</label>
                    <input
                      type="text"
                      required
                      placeholder="Seu nome completo"
                      value={form.name}
                      onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-line bg-surface text-sm text-ink focus:outline-brand"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ink mb-1">E-mail para Resposta *</label>
                    <input
                      type="email"
                      required
                      placeholder="seuemail@exemplo.com"
                      value={form.email}
                      onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-line bg-surface text-sm text-ink focus:outline-brand"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-ink mb-1">
                      CPF ou Documento de Identificação <span className="text-ink-muted">(opcional)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="000.000.000-00"
                      value={form.document}
                      onChange={(e) => setForm(prev => ({ ...prev, document: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-line bg-surface text-sm text-ink focus:outline-brand"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ink mb-1">Qual é o seu vínculo com o OperaBeauty? *</label>
                    <select
                      value={form.requester_type}
                      onChange={(e) => setForm(prev => ({ ...prev, requester_type: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-line bg-surface text-sm text-ink focus:outline-brand"
                    >
                      <option value="client">Sou Cliente de um Salão Parceiro</option>
                      <option value="tenant_admin">Sou Dono ou Gestor de Salão</option>
                      <option value="staff">Sou Profissional / Colaborador do Salão</option>
                      <option value="partner">Sou Parceiro / Consultor de Revenda</option>
                      <option value="visitor">Sou Visitante do Site / Outro</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink mb-1">Qual direito da LGPD você deseja exercer? *</label>
                  <select
                    value={form.request_type}
                    onChange={(e) => setForm(prev => ({ ...prev, request_type: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-line bg-surface text-sm text-ink focus:outline-brand"
                  >
                    <option value="access">Acesso e Cópia dos meus dados armazenados (Art. 18, II)</option>
                    <option value="correction">Correção de dados incompletos ou inexatos (Art. 18, III)</option>
                    <option value="anonymization">Anonimização ou bloqueio de dados excessivos (Art. 18, IV)</option>
                    <option value="deletion">Eliminação de dados tratados com consentimento (Art. 18, VI)</option>
                    <option value="portability">Portabilidade dos dados em arquivo estruturado (Art. 18, V)</option>
                    <option value="consent_revocation">Revogação de consentimento de atendimento ou fotos (Art. 18, IX)</option>
                    <option value="information">Dúvidas gerais sobre tratamento e segurança (Art. 18, VII)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink mb-1">Detalhes e Justificativa da Solicitação *</label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Descreva com detalhes o seu pedido (ex: nome do salão que você frequenta, dados que deseja corrigir ou excluir)..."
                    value={form.details}
                    onChange={(e) => setForm(prev => ({ ...prev, details: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-line bg-surface text-sm text-ink focus:outline-brand"
                  />
                  <span className="text-[11px] text-ink-muted block mt-1">
                    Quanto mais detalhes e informações de contexto você fornecer, mais célere será a localização no banco de dados.
                  </span>
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <span className="text-xs text-ink-muted">Prazo legal de retorno: até 15 dias úteis</span>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-brand hover:bg-brand-hover text-white text-xs font-bold shadow-xs transition disabled:opacity-50"
                  >
                    {submitting ? 'Registrando...' : 'Protocolar Solicitação'}
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* ABA 2: Consulta de Protocolo */}
        {activeTab === 'check' && (
          <div className="p-6 sm:p-8 rounded-2xl bg-surface border border-line shadow-xs space-y-6 animate-fade-in">
            <div>
              <h2 className="text-lg font-bold text-ink flex items-center gap-2">
                <Search className="w-5 h-5 text-brand" />
                Consultar Andamento de Solicitação
              </h2>
              <p className="text-xs text-ink-muted mt-1">
                Insira o código do protocolo recebido no momento do envio para verificar a análise do DPO.
              </p>
            </div>

            <form onSubmit={handleSearchProtocol} className="flex gap-2">
              <input
                type="text"
                required
                placeholder="Ex: LGPD-20261028-51CE"
                value={searchProtocol}
                onChange={(e) => setSearchProtocol(e.target.value.toUpperCase())}
                className="flex-1 px-4 py-2.5 rounded-xl border border-line bg-surface text-sm text-ink font-mono uppercase focus:outline-brand"
              />
              <button
                type="submit"
                disabled={checkingProtocol}
                className="px-5 py-2.5 rounded-xl bg-brand hover:bg-brand-hover text-white text-xs font-bold transition disabled:opacity-50"
              >
                {checkingProtocol ? 'Consultando...' : 'Consultar'}
              </button>
            </form>

            {searchError && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{searchError}</span>
              </div>
            )}

            {protocolResult && (
              <div className="p-5 rounded-2xl bg-bg border border-line space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-line">
                  <div>
                    <span className="text-[11px] text-ink-muted block">Protocolo</span>
                    <strong className="text-base text-ink font-mono">{protocolResult.protocol}</strong>
                  </div>
                  <div>
                    {(() => {
                      const st = translateStatus(protocolResult.status);
                      return (
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${st.color}`}>
                          <Clock className="w-3.5 h-3.5" />
                          {st.label}
                        </span>
                      );
                    })()}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-ink-muted block">Tipo de Direito Requisitado:</span>
                    <strong className="text-ink">{translateRequestType(protocolResult.request_type)}</strong>
                  </div>
                  <div>
                    <span className="text-ink-muted block">Data de Registro:</span>
                    <strong className="text-ink">{new Date(protocolResult.created_at).toLocaleDateString('pt-BR')} às {new Date(protocolResult.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</strong>
                  </div>
                </div>

                {protocolResult.resolution_notes && (
                  <div className="p-4 rounded-xl bg-surface border border-line space-y-1">
                    <span className="text-xs font-bold text-ink block">Parecer / Resposta do Encarregado (DPO):</span>
                    <p className="text-xs text-ink-muted leading-relaxed whitespace-pre-line">
                      {protocolResult.resolution_notes}
                    </p>
                    {protocolResult.resolved_at && (
                      <span className="text-[11px] text-ink-muted block pt-1">
                        Concluído em {new Date(protocolResult.resolved_at).toLocaleDateString('pt-BR')}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  );
}
