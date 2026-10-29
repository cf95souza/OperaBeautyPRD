import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { useNotification } from '../../context/NotificationProvider';
import { 
  ToggleLeft, 
  ToggleRight, 
  Plus, 
  Edit3, 
  Trash2, 
  Building2, 
  CheckCircle2, 
  XCircle, 
  X, 
  Sparkles,
  Layers,
  Check
} from 'lucide-react';
import { EstadoVazio } from '../../components/ui/EstadoVazio';

/**
 * Gestão de Feature Flags e Módulos Modulares do Super Admin (Rosé Editorial)
 */
const FeatureFlagsAdmin = () => {
  const { showSuccess, showError, confirm } = useNotification();
  const [flags, setFlags] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [tenantFlags, setTenantFlags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tenantLoading, setTenantLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFlag, setEditingFlag] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_active_global: false
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedTenantId) {
      fetchTenantFlags(selectedTenantId);
    } else {
      setTenantFlags([]);
    }
  }, [selectedTenantId]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [flagsData, tenantsData] = await Promise.all([
        api.superadmin.listFeatureFlags(),
        api.superadmin.listTenants()
      ]);
      setFlags(flagsData || []);
      setTenants(tenantsData || []);
    } catch (err) {
      showError('Erro ao carregar dados de Feature Flags.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTenantFlags = async (tenantId) => {
    try {
      setTenantLoading(true);
      const data = await api.superadmin.listTenantFeatureFlags(tenantId);
      setTenantFlags(data || []);
    } catch (err) {
      showError('Erro ao buscar as flags do salão selecionado.');
      console.error(err);
    } finally {
      setTenantLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingFlag) {
        await api.superadmin.updateFeatureFlag(editingFlag.id, formData);
        showSuccess('Feature Flag atualizada com sucesso!');
      } else {
        await api.superadmin.createFeatureFlag(formData);
        showSuccess('Feature Flag criada com sucesso!');
      }
      setIsModalOpen(false);
      fetchInitialData();
      if (selectedTenantId) {
        fetchTenantFlags(selectedTenantId);
      }
    } catch (err) {
      showError(err.message || 'Erro ao salvar Feature Flag.');
    }
  };

  const openModal = (flag = null) => {
    if (flag) {
      setEditingFlag(flag);
      setFormData({
        name: flag.name,
        description: flag.description || '',
        is_active_global: Boolean(flag.is_active_global)
      });
    } else {
      setEditingFlag(null);
      setFormData({
        name: '',
        description: '',
        is_active_global: false
      });
    }
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (await confirm('Excluir Feature Flag?', 'A flag será removida permanentemente e todos os salões perderão as configurações associadas a ela.')) {
      try {
        await api.superadmin.deleteFeatureFlag(id);
        showSuccess('Feature Flag excluída com sucesso!');
        fetchInitialData();
        if (selectedTenantId) {
          fetchTenantFlags(selectedTenantId);
        }
      } catch (err) {
        showError(err.message || 'Erro ao excluir Feature Flag.');
      }
    }
  };

  const handleToggleTenantFlag = async (flagId, isEnabled) => {
    if (!selectedTenantId) return;
    try {
      await api.superadmin.toggleTenantFeatureFlag({
        tenant_id: selectedTenantId,
        feature_flag_id: flagId,
        is_enabled: isEnabled
      });
      showSuccess('Configuração do salão atualizada com sucesso!');
      fetchTenantFlags(selectedTenantId);
    } catch (err) {
      showError('Erro ao atualizar flag do salão.');
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-16 max-w-7xl mx-auto">
      {/* Cabeçalho Editorial Rosé */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-3xl sm:text-4xl text-ink tracking-tight">
            Feature Flags & Módulos
          </h1>
          <p className="text-sm text-ink-soft mt-1">
            Controle modularmente a ativação de funcionalidades globais e permissões exclusivas por salão.
          </p>
        </div>

        <button
          onClick={() => openModal()}
          className="px-5 py-2.5 rounded-full bg-brand hover:bg-brand-hover text-white text-xs font-semibold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Nova Feature Flag</span>
        </button>
      </div>

      {loading ? (
        <div className="p-16 text-center text-xs text-ink-soft italic">
          Carregando módulos da plataforma...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coluna 1 & 2: Módulos Cadastrados (Global) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-brand-tint flex items-center justify-center text-brand">
                  <Layers className="w-4 h-4" />
                </div>
                <h2 className="font-display font-bold text-lg text-ink">Módulos Cadastrados</h2>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-stone-100 text-ink-soft tabular-nums">
                {flags.length} flags
              </span>
            </div>

            <div className="rounded-[22px] border border-line bg-white shadow-xs overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-stone-50 border-b border-line text-xs font-semibold uppercase tracking-wider text-ink-soft">
                    <th className="p-4">Identificador</th>
                    <th className="p-4">Descrição</th>
                    <th className="p-4 text-center">Global</th>
                    <th className="p-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60">
                  {flags.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="p-8 text-center">
                        <EstadoVazio
                          icone={<ToggleLeft className="w-7 h-7 text-brand" />}
                          titulo="Nenhuma Feature Flag cadastrada"
                          descricao="Controle modularmente quais funcionalidades e módulos estão liberados para cada plano ou salão."
                          textoAcao="+ Criar Feature Flag"
                          aoClicarAcao={() => openModal()}
                          className="my-2 border-0 shadow-none bg-transparent"
                        />
                      </td>
                    </tr>
                  ) : (
                    flags.map((flag) => (
                      <tr key={flag.id} className="hover:bg-stone-50/60 transition-colors">
                        <td className="p-4">
                          <code className="px-2.5 py-1 bg-stone-100 text-brand rounded-lg font-mono text-xs font-semibold">
                            {flag.name}
                          </code>
                        </td>
                        <td className="p-4 text-xs text-ink-soft max-w-xs leading-relaxed">
                          {flag.description || 'Sem descrição'}
                        </td>
                        <td className="p-4 text-center">
                          {flag.is_active_global ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#E8F5E9] text-[#2E7D32]">
                              <CheckCircle2 className="w-3 h-3" />
                              Ativo
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-stone-100 text-stone-600">
                              <XCircle className="w-3 h-3" />
                              Por Salão
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openModal(flag)}
                              className="p-1.5 rounded-lg text-ink-soft hover:text-brand hover:bg-stone-100 transition-colors cursor-pointer"
                              title="Editar"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(flag.id)}
                              className="p-1.5 rounded-lg text-ink-soft hover:text-rose-600 hover:bg-stone-100 transition-colors cursor-pointer"
                              title="Excluir"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Coluna 3: Liberação por Salão Específico */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-brand-tint flex items-center justify-center text-brand">
                <Building2 className="w-4 h-4" />
              </div>
              <h2 className="font-display font-bold text-lg text-ink">Liberação por Salão</h2>
            </div>

            <div className="rounded-[22px] border border-line bg-white shadow-xs p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-ink-soft mb-1.5">
                  Selecione o Salão
                </label>
                <select
                  value={selectedTenantId}
                  onChange={(e) => setSelectedTenantId(e.target.value)}
                  className="w-full text-xs bg-stone-50 border border-line rounded-xl px-3.5 py-2.5 text-ink outline-none focus:border-brand transition-colors"
                >
                  <option value="">-- Escolha um salão para gerenciar --</option>
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id}>{t.name} ({t.slug})</option>
                  ))}
                </select>
              </div>

              {selectedTenantId ? (
                <div className="space-y-3 pt-2 border-t border-line/60">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-ink">Módulos no Salão</span>
                    <span className="text-ink-soft tabular-nums">{tenantFlags.length} disponíveis</span>
                  </div>

                  {tenantLoading ? (
                    <div className="text-center py-6 text-xs text-ink-soft italic">Carregando permissões...</div>
                  ) : tenantFlags.length === 0 ? (
                    <div className="text-center py-6 text-xs text-ink-soft italic">Nenhuma flag cadastrada.</div>
                  ) : (
                    <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
                      {tenantFlags.map((tf) => (
                        <div 
                          key={tf.feature_flag_id}
                          className="p-3 rounded-xl border border-line bg-stone-50/50 hover:bg-stone-50 transition-colors flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-ink truncate">{tf.name}</p>
                            <p className="text-[11px] text-ink-soft line-clamp-1 mt-0.5">{tf.description || 'Sem descrição'}</p>
                            {tf.is_active_global && (
                              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block mt-1">
                                Ativo Globalmente (Todos)
                              </span>
                            )}
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer shrink-0">
                            <input
                              type="checkbox"
                              disabled={tf.is_active_global}
                              checked={tf.is_active}
                              onChange={(e) => handleToggleTenantFlag(tf.feature_flag_id, e.target.checked)}
                              className="sr-only peer"
                            />
                            <div className="w-9 h-5 bg-stone-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand disabled:opacity-40"></div>
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-ink-soft italic leading-relaxed">
                  Selecione um salão acima para liberar ou restringir módulos Beta exclusivamente para ele.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Nova / Editar Flag */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div 
            className="relative w-full max-w-md bg-white rounded-[26px] shadow-2xl border border-line overflow-hidden flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-[#FAF7F5] px-6 py-5 border-b border-line flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-brand-tint flex items-center justify-center text-brand">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-xl text-ink leading-tight">
                    {editingFlag ? 'Editar Feature Flag' : 'Nova Feature Flag'}
                  </h3>
                  <p className="text-xs text-ink-soft">
                    {editingFlag ? 'Atualize o identificador e regras globais' : 'Defina um novo módulo para a plataforma'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-full text-ink-soft hover:text-ink hover:bg-stone-100 transition-colors cursor-pointer"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5">
                  Identificador Único (Slug em minúsculas)
                </label>
                <input
                  type="text"
                  required
                  disabled={!!editingFlag}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
                  placeholder="ex: whatsapp_gateway, bi_reports"
                  className="w-full text-xs font-mono bg-stone-50 border border-line rounded-xl px-3.5 py-2.5 text-ink outline-none focus:border-brand disabled:opacity-50"
                />
                <p className="text-[11px] text-ink-soft mt-1">
                  Usado no código e middleware com requireFeature('nome'). Apenas letras e sublinhados.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5">
                  Descrição do Módulo
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Explique qual recurso ou funcionalidade essa flag controla"
                  rows="3"
                  className="w-full text-xs bg-stone-50 border border-line rounded-xl px-3.5 py-2.5 text-ink outline-none focus:border-brand"
                />
              </div>

              <div className="p-3.5 rounded-xl border border-line bg-stone-50 flex items-start gap-3">
                <input
                  type="checkbox"
                  id="chk_active_global"
                  checked={formData.is_active_global}
                  onChange={(e) => setFormData({ ...formData, is_active_global: e.target.checked })}
                  className="w-4 h-4 text-brand rounded border-line mt-0.5"
                />
                <label htmlFor="chk_active_global" className="text-xs text-ink cursor-pointer">
                  <strong className="block text-ink font-semibold">Ativa Globalmente</strong>
                  <span className="text-ink-soft block text-[11px] mt-0.5">
                    Se marcado, todos os salões da plataforma recebem acesso imediato sem necessidade de liberação manual.
                  </span>
                </label>
              </div>

              <div className="pt-3 border-t border-line flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-full border border-stone-300 bg-white hover:bg-stone-50 text-xs font-semibold text-stone-700 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-full bg-brand hover:bg-brand-hover text-white text-xs font-semibold transition-colors shadow-2xs cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Salvar Flag</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeatureFlagsAdmin;
