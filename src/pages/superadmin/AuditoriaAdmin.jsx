import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { 
  ShieldCheck, 
  HardDrive, 
  FileText, 
  Search, 
  RefreshCw, 
  X, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight, 
  Eye, 
  ShieldAlert, 
  CreditCard, 
  Link2, 
  Edit3, 
  ExternalLink 
} from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
import EstadoVazio from '../../components/ui/EstadoVazio';

/**
 * Mapeamento e configuração semântica das ações auditáveis do Super Admin (§9.5·H9)
 */
const getActionConfig = (action) => {
  switch (action) {
    case 'SUSPEND_TENANT':
      return {
        label: 'Suspensão de Conta',
        shortLabel: 'Suspensão',
        badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
        dotClass: 'bg-rose-500',
        icon: ShieldAlert,
        category: 'SUSPEND_TENANT'
      };
    case 'REACTIVATE_TENANT':
      return {
        label: 'Reativação de Conta',
        shortLabel: 'Reativação',
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        dotClass: 'bg-emerald-500',
        icon: CheckCircle2,
        category: 'REACTIVATE_TENANT'
      };
    case 'UPDATE_TENANT_PLAN':
      return {
        label: 'Troca de Plano',
        shortLabel: 'Troca de Plano',
        badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
        dotClass: 'bg-amber-500',
        icon: CreditCard,
        category: 'UPDATE_TENANT_PLAN'
      };
    case 'UPDATE_TENANT_SLUG':
      return {
        label: 'Alteração de Slug',
        shortLabel: 'Novo Slug',
        badgeClass: 'bg-sky-50 text-sky-700 border-sky-200',
        dotClass: 'bg-sky-500',
        icon: Link2,
        category: 'UPDATE_TENANT_SLUG'
      };
    case 'UPDATE_TENANT':
      return {
        label: 'Edição Cadastral',
        shortLabel: 'Edição',
        badgeClass: 'bg-stone-100 text-stone-700 border-stone-200',
        dotClass: 'bg-stone-500',
        icon: Edit3,
        category: 'UPDATE_TENANT'
      };
    default:
      return {
        label: action || 'Ação Administrativa',
        shortLabel: action || 'Outros',
        badgeClass: 'bg-stone-100 text-stone-600 border-stone-200',
        dotClass: 'bg-stone-400',
        icon: FileText,
        category: action
      };
  }
};

const parseJsonSafe = (val) => {
  if (!val) return null;
  if (typeof val === 'object') return val;
  try {
    return JSON.parse(val);
  } catch {
    return null;
  }
};

/**
 * Modal de Inspeção Completa do Evento de Auditoria (§9.5·H9)
 */
const ModalDetalhesAuditoria = ({ log, onClose }) => {
  if (!log) return null;
  const config = getActionConfig(log.action);
  const Icon = config.icon;
  const oldData = parseJsonSafe(log.old_data);
  const newData = parseJsonSafe(log.new_data);

  const formatDateFull = (dateString) => {
    if (!dateString) return 'N/A';
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    }).format(new Date(dateString));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[90vh]"
        role="dialog"
      >
        {/* Cabeçalho do Modal */}
        <div className="p-6 border-b border-stone-100 flex items-start justify-between bg-stone-50/60">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border ${config.badgeClass}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${config.badgeClass}`}>
                  {config.label}
                </span>
                <span className="text-xs text-stone-400 font-mono">
                  ID: {log.id ? String(log.id).substring(0, 8) : 'N/A'}
                </span>
              </div>
              <h3 className="font-serif text-lg font-bold text-stone-900 mt-1">
                {log.tenant_name || 'Salão / Plataforma'}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-stone-200/60 flex items-center justify-center text-stone-500 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Conteúdo do Modal */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm">
          {/* Card de Alerta Especial (Motivo da Suspensão) */}
          {newData?.reason && (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-rose-900">
              <div className="flex items-center gap-2 font-semibold text-xs uppercase tracking-wider text-rose-700 mb-1">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                Motivo Registrado para a Suspensão
              </div>
              <p className="text-sm font-medium text-rose-950 mt-1">
                "{newData.reason}"
              </p>
              {newData.confirmed_name && (
                <p className="text-xs text-rose-700/80 mt-2">
                  Nome digitado na confirmação deliberada: <strong className="font-semibold text-rose-900">"{newData.confirmed_name}"</strong>
                </p>
              )}
            </div>
          )}

          {/* Comparativo Visual: Antes vs Depois (§9.5·H9) */}
          {(oldData || newData) && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-3">
                Transformação de Estado (Diff de Auditoria)
              </h4>

              {/* Caso Específico: Troca de Plano */}
              {log.action === 'UPDATE_TENANT_PLAN' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-stretch">
                  <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-500 block mb-1">
                      Plano Anterior
                    </span>
                    <div className="font-bold text-stone-900 text-base">
                      {oldData?.plan_name || 'Plano Antigo'}
                    </div>
                    <div className="text-stone-600 text-sm font-semibold tabular-nums mt-0.5">
                      {formatCurrency(oldData?.plan_price || 0)} / mês
                    </div>
                  </div>

                  <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-4 relative">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-800 block mb-1">
                      Novo Plano Atribuído
                    </span>
                    <div className="font-bold text-amber-950 text-base">
                      {newData?.plan_name || 'Novo Plano'}
                    </div>
                    <div className="text-amber-900 text-sm font-semibold tabular-nums mt-0.5">
                      {formatCurrency(newData?.plan_price || 0)} / mês
                    </div>
                  </div>
                </div>
              ) : log.action === 'UPDATE_TENANT_SLUG' ? (
                /* Caso Específico: Alteração de Slug */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-stretch">
                  <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-500 block mb-1">
                      Slug Anterior
                    </span>
                    <span className="font-mono text-sm font-medium text-stone-700 bg-white px-2 py-1 rounded border border-stone-200 inline-block">
                      @{oldData?.slug}
                    </span>
                  </div>

                  <div className="bg-sky-50 border border-sky-200 rounded-2xl p-4">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-sky-800 block mb-1">
                      Novo Slug Registrado
                    </span>
                    <span className="font-mono text-sm font-bold text-sky-950 bg-white px-2 py-1 rounded border border-sky-200 inline-block">
                      @{newData?.slug}
                    </span>
                  </div>
                </div>
              ) : (
                /* Visualização Genérica de Objetos */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-500 block mb-2">
                      Estado Anterior
                    </span>
                    <pre className="text-xs font-mono text-stone-700 overflow-x-auto whitespace-pre-wrap bg-white p-3 rounded-xl border border-stone-200/80">
                      {oldData ? JSON.stringify(oldData, null, 2) : 'Nenhum estado prévio'}
                    </pre>
                  </div>

                  <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-2xl p-4">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-800 block mb-2">
                      Novo Estado Registrado
                    </span>
                    <pre className="text-xs font-mono text-emerald-950 overflow-x-auto whitespace-pre-wrap bg-white p-3 rounded-xl border border-emerald-200/80">
                      {newData ? JSON.stringify(newData, null, 2) : 'Nenhum novo estado'}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Metadados Técnicos do Evento */}
          <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 space-y-2 text-xs">
            <div className="font-semibold text-stone-800 uppercase tracking-wider text-[11px] mb-1">
              Metadados de Segurança & Auditoria
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-stone-600">
              <div>
                <span className="text-stone-400">Data e Hora:</span>{' '}
                <strong className="text-stone-800 font-mono tabular-nums">{formatDateFull(log.created_at)}</strong>
              </div>
              <div>
                <span className="text-stone-400">Responsável:</span>{' '}
                <strong className="text-stone-800">{log.admin_name || 'Super Admin'}</strong>
              </div>
              <div>
                <span className="text-stone-400">IP de Origem:</span>{' '}
                <strong className="text-stone-800 font-mono">{log.ip_address || '127.0.0.1'}</strong>
              </div>
              <div>
                <span className="text-stone-400">Entidade:</span>{' '}
                <strong className="text-stone-800 font-mono">{log.entity_name}</strong>
              </div>
              {log.tenant_id && (
                <div className="sm:col-span-2">
                  <span className="text-stone-400">ID do Salão:</span>{' '}
                  <span className="text-stone-800 font-mono text-[11px]">{log.tenant_id}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Rodapé com Fechamento e Link */}
        <div className="p-4 bg-stone-50 border-t border-stone-100 flex items-center justify-between">
          {log.tenant_id ? (
            <Link
              to={`/superadmin/tenants/${log.tenant_id}`}
              className="text-xs font-medium text-brand hover:underline flex items-center gap-1"
            >
              Abrir cadastro do salão <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          ) : <div />}
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-stone-900 text-white font-medium text-xs rounded-xl hover:bg-stone-800 transition-colors shadow-sm"
          >
            Fechar Inspeção
          </button>
        </div>
      </div>
    </div>
  );
};

const AuditoriaAdmin = () => {
  const [logs, setLogs] = useState([]);
  const [storage, setStorage] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('logs'); // 'logs' ou 'storage'
  
  // Filtros Avançados de Auditoria (§9.5·H9)
  const [selectedAction, setSelectedAction] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLogForDetails, setSelectedLogForDetails] = useState(null);

  useEffect(() => {
    fetchData();
  }, [selectedAction]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [storageData, logsData] = await Promise.all([
        api.superadmin.getStorageUsage(),
        api.superadmin.getAuditLogs({
          action: selectedAction !== 'ALL' ? selectedAction : undefined
        })
      ]);
      setStorage(storageData || []);
      setLogs(logsData || []);
    } catch (err) {
      console.error('Erro ao buscar dados de auditoria', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchData();
  };

  // Filtragem em tempo real por texto
  const filteredLogs = useMemo(() => {
    if (!searchTerm.trim()) return logs;
    const term = searchTerm.toLowerCase().trim();
    return logs.filter((log) => {
      const tenantMatch = (log.tenant_name || '').toLowerCase().includes(term);
      const slugMatch = (log.tenant_slug || '').toLowerCase().includes(term);
      const actionMatch = (log.action || '').toLowerCase().includes(term);
      const adminMatch = (log.admin_name || '').toLowerCase().includes(term);
      const reasonMatch = (log.new_data?.reason || '').toLowerCase().includes(term);
      return tenantMatch || slugMatch || actionMatch || adminMatch || reasonMatch;
    });
  }, [logs, searchTerm]);

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const d = new Date(dateString);
    const dateFormatted = new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    }).format(d);
    const timeFormatted = new Intl.DateTimeFormat('pt-BR', {
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    }).format(d);
    return { dateFormatted, timeFormatted };
  };

  // Ações rápidas em pílulas para filtragem
  const filterPills = [
    { id: 'ALL', label: 'Todas as Ações' },
    { id: 'SUSPEND_TENANT', label: 'Suspensões', icon: ShieldAlert },
    { id: 'REACTIVATE_TENANT', label: 'Reativações', icon: CheckCircle2 },
    { id: 'UPDATE_TENANT_PLAN', label: 'Troca de Plano', icon: CreditCard },
    { id: 'UPDATE_TENANT_SLUG', label: 'Alteração de Slug', icon: Link2 },
    { id: 'UPDATE_TENANT', label: 'Edições Gerais', icon: Edit3 }
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* 1. CABEÇALHO INSTITUCIONAL ROSÉ EDITORIAL */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
              Audit Trail Ativo & Imutável (§9.5·H9)
            </span>
          </div>
          <h1 className="font-serif text-3xl font-bold text-stone-900 tracking-tight">
            Auditoria e Governança
          </h1>
          <p className="font-sans text-sm text-stone-600 mt-1 max-w-2xl">
            Acompanhe a trilha de segurança do Super Admin (suspensões, trocas de plano e alterações de link), além do monitoramento de armazenamento dos studios.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-center">
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-stone-50 border border-stone-200 text-stone-700 rounded-xl text-xs font-medium transition-colors shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-brand' : 'text-stone-500'}`} />
            Sincronizar
          </button>
        </div>
      </header>

      {/* 2. ABAS PRINCIPAIS (TABS) */}
      <div className="flex items-center gap-2 border-b border-stone-200">
        <button
          onClick={() => setActiveTab('logs')}
          className={`flex items-center gap-2 px-5 py-3 font-medium text-sm border-b-2 transition-all ${
            activeTab === 'logs'
              ? 'border-brand text-brand font-semibold'
              : 'border-transparent text-stone-500 hover:text-stone-800 hover:border-stone-300'
          }`}
        >
          <FileText className="w-4 h-4" />
          Logs de Ações Administrativas
          <span className={`px-2 py-0.5 rounded-full text-xs font-bold tabular-nums ${
            activeTab === 'logs' ? 'bg-brand/10 text-brand' : 'bg-stone-100 text-stone-600'
          }`}>
            {filteredLogs.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('storage')}
          className={`flex items-center gap-2 px-5 py-3 font-medium text-sm border-b-2 transition-all ${
            activeTab === 'storage'
              ? 'border-brand text-brand font-semibold'
              : 'border-transparent text-stone-500 hover:text-stone-800 hover:border-stone-300'
          }`}
        >
          <HardDrive className="w-4 h-4" />
          Armazenamento por Studio
          <span className={`px-2 py-0.5 rounded-full text-xs font-bold tabular-nums ${
            activeTab === 'storage' ? 'bg-brand/10 text-brand' : 'bg-stone-100 text-stone-600'
          }`}>
            {storage.length}
          </span>
        </button>
      </div>

      {/* 3. CONTEÚDO PRINCIPAL */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          {/* BARRA DE FERRAMENTAS E FILTROS (§9.5·H9) */}
          <div className="bg-white p-4 rounded-2xl border border-stone-200/80 shadow-sm space-y-3">
            {/* Pílulas de Ações */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {filterPills.map((pill) => {
                const isSelected = selectedAction === pill.id;
                const PillIcon = pill.icon;
                return (
                  <button
                    key={pill.id}
                    onClick={() => setSelectedAction(pill.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                      isSelected
                        ? 'bg-stone-900 text-white shadow-sm'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200/70 border border-transparent'
                    }`}
                  >
                    {PillIcon && <PillIcon className="w-3.5 h-3.5" />}
                    {pill.label}
                  </button>
                );
              })}
            </div>

            {/* Campo de Busca Rápida */}
            <div className="relative">
              <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nome do salão, slug (@link), motivo da suspensão ou administrador..."
                className="w-full bg-stone-50 border border-stone-200 rounded-xl pl-10 pr-10 py-2.5 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand focus:bg-white transition-all"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* TABELA DE AUDITORIA */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 bg-white border border-stone-200 rounded-2xl shadow-sm">
              <span className="material-symbols-outlined animate-spin text-brand text-4xl mb-2">sync</span>
              <p className="text-xs text-stone-500 font-medium">Carregando trilha de auditoria...</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="bg-white border border-stone-200 rounded-2xl p-8 shadow-sm">
              <EstadoVazio
                icone={<FileText className="w-8 h-8 text-brand" />}
                titulo={searchTerm ? 'Nenhum log encontrado para a busca' : 'Nenhum registro de auditoria'}
                descricao={
                  searchTerm
                    ? `Não foram localizados registros compatíveis com o termo "${searchTerm}".`
                    : 'As ações de governança (suspensões, trocas de plano e alterações de link) serão registradas aqui em tempo real.'
                }
                acao={
                  searchTerm ? (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-semibold transition-colors"
                    >
                      Limpar Filtro de Busca
                    </button>
                  ) : null
                }
                className="border-0 shadow-none bg-transparent my-0"
              />
            </div>
          ) : (
            <div className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-stone-50/70 text-stone-600 font-semibold text-xs border-b border-stone-200/80">
                      <th className="py-3.5 px-5">Data / Hora</th>
                      <th className="py-3.5 px-5">Ação de Segurança</th>
                      <th className="py-3.5 px-5">Salão / Studio</th>
                      <th className="py-3.5 px-5">Resumo da Alteração</th>
                      <th className="py-3.5 px-5">Origem & IP</th>
                      <th className="py-3.5 px-5 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 text-sm">
                    {filteredLogs.map((log) => {
                      const config = getActionConfig(log.action);
                      const Icon = config.icon;
                      const { dateFormatted, timeFormatted } = formatDate(log.created_at);
                      const rowOld = parseJsonSafe(log.old_data);
                      const rowNew = parseJsonSafe(log.new_data);

                      return (
                        <tr 
                          key={log.id} 
                          className="hover:bg-stone-50/60 transition-colors group"
                        >
                          {/* Data / Hora */}
                          <td className="py-4 px-5 whitespace-nowrap">
                            <div className="text-xs font-semibold text-stone-900 font-mono tabular-nums lining-nums">
                              {dateFormatted}
                            </div>
                            <div className="text-[11px] text-stone-400 font-mono tabular-nums">
                              {timeFormatted}
                            </div>
                          </td>

                          {/* Ação */}
                          <td className="py-4 px-5 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${config.badgeClass}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${config.dotClass}`}></span>
                              {config.label}
                            </span>
                          </td>

                          {/* Salão */}
                          <td className="py-4 px-5">
                            {log.tenant_id ? (
                              <Link 
                                to={`/superadmin/tenants/${log.tenant_id}`}
                                className="group-hover:text-brand transition-colors block"
                              >
                                <div className="font-semibold text-stone-900 text-sm flex items-center gap-1">
                                  {log.tenant_name || 'Salão'}
                                  <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-stone-400" />
                                </div>
                                {log.tenant_slug && (
                                  <div className="text-xs text-stone-400 font-mono">
                                    @{log.tenant_slug}
                                  </div>
                                )}
                              </Link>
                            ) : (
                              <div>
                                <div className="font-semibold text-stone-900 text-sm">
                                  {log.tenant_name || 'Plataforma Global'}
                                </div>
                                <div className="text-xs text-stone-400">
                                  Sistema SaaS
                                </div>
                              </div>
                            )}
                          </td>

                          {/* Resumo da Alteração (§9.5·H9) */}
                          <td className="py-4 px-5">
                            {log.action === 'SUSPEND_TENANT' ? (
                              <div className="text-xs text-rose-800 line-clamp-2 max-w-xs">
                                <span className="font-semibold">Motivo:</span> "{rowNew?.reason || 'Não informado'}"
                              </div>
                            ) : log.action === 'REACTIVATE_TENANT' ? (
                              <div className="text-xs text-emerald-800 flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                Acesso e agendamento restabelecidos
                              </div>
                            ) : log.action === 'UPDATE_TENANT_PLAN' ? (
                              <div className="text-xs text-amber-950 flex items-center gap-1.5 font-medium">
                                <span className="text-stone-500 line-through">
                                  {rowOld?.plan_name || 'Plano'}
                                </span>
                                <ArrowRight className="w-3 h-3 text-amber-700 shrink-0" />
                                <span className="font-bold text-amber-900">
                                  {rowNew?.plan_name || 'Novo Plano'}
                                </span>
                                {rowNew?.plan_price && (
                                  <span className="text-stone-400 tabular-nums">
                                    ({formatCurrency(rowNew.plan_price)})
                                  </span>
                                )}
                              </div>
                            ) : log.action === 'UPDATE_TENANT_SLUG' ? (
                              <div className="text-xs text-sky-900 flex items-center gap-1.5 font-mono">
                                <span className="text-stone-400 line-through">@{rowOld?.slug}</span>
                                <ArrowRight className="w-3 h-3 text-sky-600 shrink-0" />
                                <span className="font-bold text-sky-700">@{rowNew?.slug}</span>
                              </div>
                            ) : (
                              <div className="text-xs text-stone-600 line-clamp-1">
                                {log.entity_name} atualizado
                              </div>
                            )}
                          </td>

                          {/* Origem e IP */}
                          <td className="py-4 px-5 whitespace-nowrap">
                            <div className="text-xs font-medium text-stone-800">
                              {log.admin_name || 'Super Admin'}
                            </div>
                            <div className="text-[11px] text-stone-400 font-mono">
                              IP: {log.ip_address || '127.0.0.1'}
                            </div>
                          </td>

                          {/* Botão Ver Detalhes */}
                          <td className="py-4 px-5 text-right whitespace-nowrap">
                            <button
                              onClick={() => setSelectedLogForDetails(log)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-stone-200 text-stone-700 text-xs font-semibold hover:bg-stone-100 hover:text-stone-900 transition-colors shadow-2xs"
                            >
                              <Eye className="w-3.5 h-3.5 text-stone-500" />
                              Detalhes
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. ABA DE ARMAZENAMENTO (STUDIOS) */}
      {activeTab === 'storage' && (
        <div className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-stone-50/70 text-stone-600 font-semibold text-xs border-b border-stone-200/80">
                  <th className="py-3.5 px-6">Studio / Salão</th>
                  <th className="py-3.5 px-6">Consumo CRM / Fotos</th>
                  <th className="py-3.5 px-6">Quota de Armazenamento</th>
                  <th className="py-3.5 px-6 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-sm">
                {storage.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="py-8 text-center">
                      <EstadoVazio
                        icone={<HardDrive className="w-8 h-8 text-brand" />}
                        titulo="Nenhum dado de armazenamento"
                        descricao="Nenhum arquivo ou upload foi registrado pelos salões até o momento."
                        className="my-2 border-0 shadow-none bg-transparent"
                      />
                    </td>
                  </tr>
                ) : (
                  storage.map((tenant) => {
                    const bytes = Number(tenant.total_bytes || 0);
                    const quotaLimit = 50 * 1024 * 1024; // 50MB
                    const percentUsed = Math.min(100, (bytes / quotaLimit) * 100);

                    return (
                      <tr key={tenant.tenant_id} className="hover:bg-stone-50/60 transition-colors">
                        <td className="py-4 px-6">
                          <Link
                            to={`/superadmin/tenants/${tenant.tenant_id}`}
                            className="font-semibold text-stone-900 text-sm hover:text-brand transition-colors flex items-center gap-1"
                          >
                            {tenant.tenant_name}
                            <ExternalLink className="w-3 h-3 text-stone-400" />
                          </Link>
                          <div className="text-xs text-stone-400 font-mono">@{tenant.tenant_slug}</div>
                        </td>

                        <td className="py-4 px-6 font-mono text-sm font-bold text-stone-800 tabular-nums">
                          {formatBytes(bytes)}
                        </td>

                        <td className="py-4 px-6">
                          <div className="w-full bg-stone-100 rounded-full h-2.5 max-w-[160px] overflow-hidden">
                            <div 
                              className={`h-2.5 rounded-full transition-all ${
                                percentUsed > 90 ? 'bg-rose-500' : percentUsed > 70 ? 'bg-amber-500' : 'bg-brand'
                              }`} 
                              style={{ width: `${percentUsed}%` }}
                            ></div>
                          </div>
                          <span className="text-[10px] text-stone-400 font-mono mt-1 block tabular-nums">
                            {percentUsed.toFixed(1)}% de 50 MB
                          </span>
                        </td>

                        <td className="py-4 px-6 text-right">
                          <Link
                            to={`/superadmin/tenants/${tenant.tenant_id}`}
                            className="text-xs font-semibold text-brand hover:underline"
                          >
                            Ver Salão
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. MODAL DE DETALHES DE AUDITORIA */}
      {selectedLogForDetails && (
        <ModalDetalhesAuditoria
          log={selectedLogForDetails}
          onClose={() => setSelectedLogForDetails(null)}
        />
      )}
    </div>
  );
};

export default AuditoriaAdmin;
