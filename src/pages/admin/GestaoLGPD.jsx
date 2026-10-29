import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { useNotification } from '../../context/NotificationProvider';
import { 
  ShieldCheck, 
  FileText, 
  Clock, 
  Send, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  ChevronDown, 
  X,
  FileSignature
} from 'lucide-react';

const GestaoLGPD = () => {
  const { showSuccess, showError, confirm } = useNotification();
  const [stats, setStats] = useState({ total: 0, pending: 0, signed: 0, recent: [] });
  const [templates, setTemplates] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  // Formulário Template
  const [newTemplate, setNewTemplate] = useState({ title: '', content: '' });
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);

  // Formulário Envio
  const [sendForm, setSendForm] = useState({ client_id: '', term_template_id: '' });
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsData, termsData, clientsData] = await Promise.all([
        api.request('/consents/stats').catch(() => ({ total: 0, pending: 0, signed: 0, recent: [] })),
        api.request('/terms').catch(() => []),
        api.request('/clients').catch(() => [])
      ]);
      setStats(statsData || { total: 0, pending: 0, signed: 0, recent: [] });
      setTemplates(termsData || []);
      setClients(clientsData || []);
    } catch (err) {
      console.error('Erro ao carregar dados LGPD', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = async (e) => {
    e.preventDefault();
    if (!newTemplate.title.trim() || !newTemplate.content.trim()) {
      showError('Preencha o título e o conteúdo legal do modelo.');
      return;
    }
    setSavingTemplate(true);
    try {
      await api.request('/terms', {
        method: 'POST',
        body: JSON.stringify(newTemplate)
      });
      setNewTemplate({ title: '', content: '' });
      setIsCreatingTemplate(false);
      showSuccess('Modelo de termo criado com sucesso!');
      fetchData();
    } catch (err) {
      console.error(err);
      showError('Erro ao criar modelo de termo.');
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleDeleteTemplate = async (id) => {
    if (await confirm('Deseja realmente excluir este modelo de termo?')) {
      try {
        await api.request(`/terms/${id}`, { method: 'DELETE' });
        showSuccess('Modelo excluído com sucesso!');
        fetchData();
      } catch (err) {
        console.error(err);
        showError('Erro ao excluir modelo de termo.');
      }
    }
  };

  const handleRequestSignature = async (e) => {
    e.preventDefault();
    if (!sendForm.client_id || !sendForm.term_template_id) {
      showError('Selecione uma cliente e um modelo de termo.');
      return;
    }
    setIsSending(true);
    try {
      await api.request('/terms/request-signature', {
        method: 'POST',
        body: JSON.stringify(sendForm)
      });
      showSuccess('Solicitação de assinatura enviada com sucesso para o app da cliente!');
      setSendForm({ client_id: '', term_template_id: '' });
      fetchData();
    } catch (err) {
      console.error(err);
      showError('Erro ao solicitar assinatura.');
    } finally {
      setIsSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-ink-soft">
        <div className="w-9 h-9 border-3 border-brand/20 border-t-brand rounded-full animate-spin mb-3" />
        <span className="text-sm font-medium">Carregando dados de conformidade e LGPD...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in pb-16 max-w-7xl mx-auto">
      {/* Cabeçalho Editorial Rosé */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-3xl sm:text-4xl text-ink tracking-tight">
            Segurança & privacidade (LGPD)
          </h1>
          <p className="text-sm text-ink-soft mt-1">
            Termos de consentimento, assinaturas digitais com validação criptográfica e conformidade jurídica.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#E8F5E9] text-[#2E7D32] text-xs font-semibold">
            <ShieldCheck className="w-4 h-4" />
            Conformidade LGPD Ativa
          </span>
        </div>
      </div>

      {/* Grade de 3 KPIs Compactos */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        
        {/* KPI 1: Termos Gerados */}
        <div className="rounded-[22px] border border-line bg-white shadow-xs p-5 sm:p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-brand-tint flex items-center justify-center text-brand shrink-0">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs uppercase font-semibold text-ink-soft tracking-wider">Termos Gerados</p>
            <h3 className="font-display font-bold text-2xl sm:text-3xl text-ink mt-0.5 tabular-nums">
              {stats.total || 0}
            </h3>
            <p className="text-xs text-ink-soft mt-0.5">Emitidos pela plataforma</p>
          </div>
        </div>

        {/* KPI 2: Assinaturas Pendentes */}
        <div className="rounded-[22px] border border-line bg-white shadow-xs p-5 sm:p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#FFF8E1] flex items-center justify-center text-[#B78103] shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs uppercase font-semibold text-ink-soft tracking-wider">Assinaturas Pendentes</p>
            <h3 className="font-display font-bold text-2xl sm:text-3xl text-ink mt-0.5 tabular-nums">
              {stats.pending || 0}
            </h3>
            <p className="text-xs text-ink-soft mt-0.5">Aguardando confirmação</p>
          </div>
        </div>

        {/* KPI 3: Assinados e Válidos */}
        <div className="rounded-[22px] border border-line bg-white shadow-xs p-5 sm:p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#E8F5E9] flex items-center justify-center text-[#2E7D32] shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs uppercase font-semibold text-ink-soft tracking-wider">Assinados (Válidos)</p>
            <h3 className="font-display font-bold text-2xl sm:text-3xl text-ink mt-0.5 tabular-nums">
              {stats.signed || 0}
            </h3>
            <p className="text-xs text-ink-soft mt-0.5">Com hash criptográfico</p>
          </div>
        </div>
      </div>

      {/* Grid Principal: 2 Colunas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Coluna Esquerda: Disparo e Histórico Recente (6 cols) */}
        <div className="lg:col-span-6 space-y-6">
          
          {/* Card: Solicitar Assinatura */}
          <div className="rounded-[22px] border border-line bg-white shadow-xs p-6 sm:p-7">
            <div className="flex items-start gap-3.5 mb-5">
              <div className="w-10 h-10 rounded-xl bg-brand-tint flex items-center justify-center text-brand shrink-0">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-display font-bold text-xl text-ink">Solicitar assinatura de termo</h2>
                <p className="text-xs sm:text-sm text-ink-soft mt-0.5">
                  Envie o termo de consentimento diretamente para a cliente aceitar no app ou via link.
                </p>
              </div>
            </div>

            <form onSubmit={handleRequestSignature} className="space-y-4">
              <div>
                <label className="block text-xs uppercase font-semibold text-ink-soft tracking-wider mb-1.5">
                  Cliente *
                </label>
                <div className="relative">
                  <select
                    value={sendForm.client_id}
                    onChange={(e) => setSendForm({ ...sendForm, client_id: e.target.value })}
                    required
                    className="w-full appearance-none px-3.5 py-2.5 bg-stone-50/70 border border-line rounded-xl text-sm text-ink focus:border-brand focus:bg-white focus:ring-1 focus:ring-brand outline-none transition-all pr-9 cursor-pointer"
                  >
                    <option value="">Selecione a cliente...</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.phone ? `(${c.phone})` : ''}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-ink-soft absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase font-semibold text-ink-soft tracking-wider mb-1.5">
                  Modelo de Termo *
                </label>
                <div className="relative">
                  <select
                    value={sendForm.term_template_id}
                    onChange={(e) => setSendForm({ ...sendForm, term_template_id: e.target.value })}
                    required
                    className="w-full appearance-none px-3.5 py-2.5 bg-stone-50/70 border border-line rounded-xl text-sm text-ink focus:border-brand focus:bg-white focus:ring-1 focus:ring-brand outline-none transition-all pr-9 cursor-pointer"
                  >
                    <option value="">Selecione o modelo legal...</option>
                    {templates.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.title}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-ink-soft absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSending}
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full bg-brand hover:bg-brand-hover text-white text-sm font-semibold transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {isSending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Enviando solicitação...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Disparar para o app da cliente</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Card: Histórico de Solicitações Recentes */}
          <div className="rounded-[22px] border border-line bg-white shadow-xs p-6 sm:p-7">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-bold text-xl text-ink">Últimas solicitações</h2>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-stone-100 text-ink-soft tabular-nums">
                {stats.recent?.length || 0}
              </span>
            </div>

            <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
              {!stats.recent || stats.recent.length === 0 ? (
                <div className="text-center py-8 text-ink-soft">
                  <FileSignature className="w-8 h-8 text-stone-300 mx-auto mb-2" />
                  <p className="text-xs italic">Nenhuma solicitação de consentimento enviada recentemente.</p>
                </div>
              ) : (
                stats.recent.map(r => (
                  <div key={r.id} className="p-3.5 rounded-xl border border-line/70 bg-stone-50/50 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <h4 className="text-sm font-semibold text-ink truncate">{r.client_name || 'Cliente'}</h4>
                      <p className="text-xs text-ink-soft mt-0.5 truncate">{r.term_title || 'Termo Geral'}</p>
                      {r.status === 'signed' && r.digital_hash && (
                        <p className="text-[10px] text-brand font-mono mt-1 truncate" title={`Hash: ${r.digital_hash}`}>
                          Hash: {r.digital_hash.substring(0, 18)}...
                        </p>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      {r.status === 'signed' ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#E8F5E9] text-[#2E7D32]">
                          Assinado
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#FFF8E1] text-[#B78103]">
                          Pendente
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Coluna Direita: Gerenciamento de Modelos de Termos (6 cols) */}
        <div className="lg:col-span-6 space-y-6">
          <div className="rounded-[22px] border border-line bg-white shadow-xs p-6 sm:p-7">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-brand-tint flex items-center justify-center text-brand shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-display font-bold text-xl text-ink">Modelos de termos</h2>
                  <p className="text-xs sm:text-sm text-ink-soft mt-0.5">
                    Termos de consentimento livre e esclarecido para procedimentos.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsCreatingTemplate(!isCreatingTemplate)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-line text-ink hover:bg-stone-50 text-xs font-semibold transition-colors shrink-0 cursor-pointer"
              >
                {isCreatingTemplate ? (
                  <>
                    <X className="w-3.5 h-3.5" />
                    <span>Fechar</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5 text-brand" />
                    <span>Novo modelo</span>
                  </>
                )}
              </button>
            </div>

            {/* Formulário Retrátil Rosé de Novo Modelo */}
            {isCreatingTemplate && (
              <form onSubmit={handleCreateTemplate} className="mb-6 p-4 sm:p-5 rounded-2xl border border-brand/30 bg-brand-tint/20 space-y-3.5 animate-fade-in">
                <h3 className="text-xs font-bold uppercase tracking-wider text-brand">Cadastrar Novo Modelo Legal</h3>
                <div>
                  <label className="block text-xs uppercase font-semibold text-ink-soft tracking-wider mb-1.5">
                    Título do Termo *
                  </label>
                  <input
                    type="text"
                    value={newTemplate.title}
                    onChange={(e) => setNewTemplate({ ...newTemplate, title: e.target.value })}
                    placeholder="Ex: Termo de Consentimento - Procedimento Capilar"
                    required
                    className="w-full px-3.5 py-2.5 bg-white border border-line rounded-xl text-sm text-ink placeholder:text-stone-400 focus:border-brand focus:ring-1 focus:ring-brand outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase font-semibold text-ink-soft tracking-wider mb-1.5">
                    Texto Jurídico Completo *
                  </label>
                  <textarea
                    value={newTemplate.content}
                    onChange={(e) => setNewTemplate({ ...newTemplate, content: e.target.value })}
                    placeholder="Eu, cliente, declaro estar ciente de todos os cuidados pré e pós procedimento..."
                    rows={4}
                    required
                    className="w-full px-3.5 py-2.5 bg-white border border-line rounded-xl text-sm text-ink placeholder:text-stone-400 focus:border-brand focus:ring-1 focus:ring-brand outline-none transition-all resize-y"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsCreatingTemplate(false)}
                    className="px-4 py-2 rounded-full text-xs font-semibold text-ink-soft hover:bg-white transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={savingTemplate}
                    className="px-5 py-2 rounded-full bg-brand hover:bg-brand-hover text-white text-xs font-semibold transition-colors shadow-xs cursor-pointer"
                  >
                    {savingTemplate ? 'Salvando...' : 'Salvar modelo'}
                  </button>
                </div>
              </form>
            )}

            {/* Listagem de Modelos */}
            <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
              {templates.length === 0 && !isCreatingTemplate ? (
                <div className="text-center py-8 text-ink-soft">
                  <FileText className="w-8 h-8 text-stone-300 mx-auto mb-2" />
                  <p className="text-xs italic">Nenhum modelo de termo cadastrado ainda.</p>
                </div>
              ) : (
                templates.map(t => (
                  <div key={t.id} className="p-4 rounded-xl border border-line/70 bg-stone-50/50 group">
                    <div className="flex items-start justify-between gap-3 mb-1.5">
                      <h4 className="text-sm font-semibold text-ink">{t.title}</h4>
                      <button
                        type="button"
                        onClick={() => handleDeleteTemplate(t.id)}
                        className="p-1 rounded-lg text-ink-soft hover:text-red-700 hover:bg-red-50 transition-colors shrink-0 cursor-pointer"
                        title="Excluir modelo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-xs text-ink-soft line-clamp-2 leading-relaxed whitespace-pre-wrap">
                      {t.content}
                    </p>
                    <div className="mt-2.5 text-[10px] text-ink-soft/70">
                      Criado em {new Date(t.created_at || Date.now()).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GestaoLGPD;
