import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';

const GestaoLGPD = () => {
  const [stats, setStats] = useState({ total: 0, pending: 0, signed: 0, recent: [] });
  const [templates, setTemplates] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  // Formulário Template
  const [newTemplate, setNewTemplate] = useState({ title: '', content: '' });
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);

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
        api.request('/consents/stats'),
        api.request('/terms'),
        api.request('/clients')
      ]);
      setStats(statsData);
      setTemplates(termsData);
      setClients(clientsData);
    } catch (err) {
      console.error('Erro ao carregar dados LGPD', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = async (e) => {
    e.preventDefault();
    if (!newTemplate.title || !newTemplate.content) return;
    try {
      await api.request('/terms', {
        method: 'POST',
        body: JSON.stringify(newTemplate)
      });
      setNewTemplate({ title: '', content: '' });
      setIsCreatingTemplate(false);
      fetchData();
    } catch (err) {
      alert('Erro ao criar template.');
    }
  };

  const handleDeleteTemplate = async (id) => {
    if (!confirm('Deseja excluir este template?')) return;
    try {
      await api.request(`/terms/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (err) {
      alert('Erro ao excluir template.');
    }
  };

  const handleRequestSignature = async (e) => {
    e.preventDefault();
    if (!sendForm.client_id || !sendForm.term_template_id) return;
    setIsSending(true);
    try {
      await api.request('/terms/request-signature', {
        method: 'POST',
        body: JSON.stringify(sendForm)
      });
      alert('Solicitação de assinatura enviada com sucesso!');
      setSendForm({ client_id: '', term_template_id: '' });
      fetchData();
    } catch (err) {
      alert('Erro ao solicitar assinatura.');
    } finally {
      setIsSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <span className="material-symbols-outlined animate-spin text-primary text-[48px]">progress_activity</span>
      </div>
    );
  }

  return (
    <div className="space-y-lg animate-fade-in">
      <header>
        <h2 className="font-headline-md text-on-surface">Painel LGPD e Assinaturas</h2>
        <p className="text-secondary">Monitore o risco jurídico da clínica e gerencie assinaturas digitais de consentimento.</p>
      </header>

      {/* Stats LGPD */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
        <div className="bg-surface-container-low p-6 rounded-2xl border border-outline-variant/30 flex items-center gap-4">
          <div className="w-12 h-12 bg-primary-container text-primary rounded-full flex items-center justify-center">
            <span className="material-symbols-outlined">description</span>
          </div>
          <div>
            <h3 className="font-headline-sm">{stats.total}</h3>
            <p className="text-secondary text-sm">Termos Gerados</p>
          </div>
        </div>
        <div className="bg-surface-container-low p-6 rounded-2xl border border-outline-variant/30 flex items-center gap-4">
          <div className="w-12 h-12 bg-[#fff3e0] text-[#e65100] rounded-full flex items-center justify-center">
            <span className="material-symbols-outlined">hourglass_empty</span>
          </div>
          <div>
            <h3 className="font-headline-sm">{stats.pending}</h3>
            <p className="text-secondary text-sm">Assinaturas Pendentes</p>
          </div>
        </div>
        <div className="bg-surface-container-low p-6 rounded-2xl border border-outline-variant/30 flex items-center gap-4">
          <div className="w-12 h-12 bg-[#e8f5e9] text-[#2e7d32] rounded-full flex items-center justify-center">
            <span className="material-symbols-outlined">verified</span>
          </div>
          <div>
            <h3 className="font-headline-sm">{stats.signed}</h3>
            <p className="text-secondary text-sm">Assinados (Legalmente Válidos)</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-xl">
        {/* Envio de Termo e Histórico */}
        <div className="space-y-lg">
          <section className="bg-white p-6 rounded-2xl shadow-sm border border-outline-variant/30">
            <h3 className="font-headline-sm text-on-surface mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">send</span>
              Solicitar Assinatura
            </h3>
            <form onSubmit={handleRequestSignature} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-on-surface mb-1">Cliente</label>
                <select 
                  className="w-full p-3 bg-surface-container-lowest border border-outline-variant rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                  value={sendForm.client_id}
                  onChange={(e) => setSendForm({ ...sendForm, client_id: e.target.value })}
                  required
                >
                  <option value="">Selecione um cliente...</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-on-surface mb-1">Modelo de Termo</label>
                <select 
                  className="w-full p-3 bg-surface-container-lowest border border-outline-variant rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                  value={sendForm.term_template_id}
                  onChange={(e) => setSendForm({ ...sendForm, term_template_id: e.target.value })}
                  required
                >
                  <option value="">Selecione um modelo...</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.title}</option>
                  ))}
                </select>
              </div>
              <button 
                type="submit" 
                disabled={isSending}
                className="w-full bg-primary text-on-primary py-3 rounded-xl font-bold flex justify-center items-center gap-2 hover:opacity-90 transition-opacity"
              >
                {isSending ? <span className="material-symbols-outlined animate-spin">sync</span> : 'Disparar para App do Cliente'}
              </button>
            </form>
          </section>

          <section className="bg-white p-6 rounded-2xl shadow-sm border border-outline-variant/30">
            <h3 className="font-headline-sm text-on-surface mb-4">Últimas Solicitações</h3>
            <div className="space-y-3">
              {stats.recent?.length === 0 ? (
                <p className="text-secondary text-sm">Nenhuma solicitação recente.</p>
              ) : (
                stats.recent.map(r => (
                  <div key={r.id} className="flex justify-between items-center p-3 border border-surface-variant rounded-xl bg-surface-container-lowest">
                    <div>
                      <h4 className="font-label-md">{r.client_name}</h4>
                      <p className="text-xs text-secondary">{r.term_title}</p>
                      {r.status === 'signed' && (
                        <p className="text-[10px] text-tertiary font-mono mt-1" title="Hash criptográfico">
                          Hash: {r.digital_hash?.substring(0,16)}...
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      {r.status === 'signed' ? (
                        <span className="bg-[#e8f5e9] text-[#2e7d32] px-2 py-1 rounded-md text-xs font-bold">Assinado</span>
                      ) : (
                        <span className="bg-[#fff3e0] text-[#e65100] px-2 py-1 rounded-md text-xs font-bold">Pendente</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        {/* Gerenciamento de Modelos */}
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-outline-variant/30">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-headline-sm text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">gavel</span>
              Modelos de Termos
            </h3>
            <button 
              onClick={() => setIsCreatingTemplate(!isCreatingTemplate)}
              className="text-primary font-label-md hover:underline"
            >
              {isCreatingTemplate ? 'Cancelar' : '+ Novo Modelo'}
            </button>
          </div>

          {isCreatingTemplate && (
            <form onSubmit={handleCreateTemplate} className="mb-6 p-4 bg-surface-container-lowest border border-primary/30 rounded-xl space-y-4 animate-fade-in-up">
              <div>
                <label className="block text-sm font-medium text-on-surface mb-1">Título do Termo</label>
                <input 
                  type="text" 
                  className="w-full p-2 bg-white border border-outline-variant rounded-lg focus:border-primary outline-none"
                  placeholder="Ex: Termo de Consentimento - Luz Pulsada"
                  value={newTemplate.title}
                  onChange={(e) => setNewTemplate({ ...newTemplate, title: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-on-surface mb-1">Conteúdo Legal</label>
                <textarea 
                  className="w-full p-2 bg-white border border-outline-variant rounded-lg focus:border-primary outline-none h-32"
                  placeholder="Eu, declaro para os devidos fins que..."
                  value={newTemplate.content}
                  onChange={(e) => setNewTemplate({ ...newTemplate, content: e.target.value })}
                  required
                />
              </div>
              <button type="submit" className="bg-primary text-on-primary px-4 py-2 rounded-lg text-sm font-bold w-full">
                Salvar Modelo
              </button>
            </form>
          )}

          <div className="space-y-4">
            {templates.length === 0 && !isCreatingTemplate && (
              <p className="text-secondary text-sm text-center py-4">Nenhum modelo cadastrado.</p>
            )}
            {templates.map(t => (
              <div key={t.id} className="p-4 border border-surface-variant rounded-xl bg-surface-container-lowest">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-label-lg text-on-surface">{t.title}</h4>
                  <button 
                    onClick={() => handleDeleteTemplate(t.id)}
                    className="text-error hover:bg-error-container p-1 rounded-full transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
                <p className="text-sm text-secondary line-clamp-3 whitespace-pre-wrap">{t.content}</p>
                <div className="mt-2 text-xs text-tertiary">
                  Criado em {new Date(t.created_at).toLocaleDateString('pt-BR')}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default GestaoLGPD;
