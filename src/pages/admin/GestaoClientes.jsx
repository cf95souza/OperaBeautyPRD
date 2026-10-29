import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Search, 
  Plus, 
  FileUp, 
  MessageCircle, 
  KeyRound, 
  X, 
  Upload, 
  Check, 
  AlertCircle, 
  ChevronDown, 
  ChevronLeft, 
  ChevronRight,
  Download,
  Users
} from 'lucide-react';
import { useTenant } from '../../context/TenantContext';
import { api } from '../../lib/api';
import { useNotification } from '../../context/NotificationProvider';
import { formatCurrency, formatNumber } from '../../utils/formatters';
import { formatarTelefoneBR } from '../../components/ui/CampoTelefone';
import ModalImportarPlanilha from '../../components/admin/ModalImportarPlanilha';

const SEGMENTOS = [
  { id: 'todas', label: 'Todas' },
  { id: 'vip', label: 'VIP' },
  { id: 'sumidas', label: 'Sumidas há 60 dias' },
  { id: 'aniversariantes', label: 'Aniversariantes' },
  { id: 'sem_anamnese', label: 'Sem anamnese' },
];

const OPCOES_ORDENACAO = [
  { id: 'maior_gasto', label: 'maior gasto' },
  { id: 'mais_visitas', label: 'mais visitas' },
  { id: 'mais_recentes', label: 'mais recentes' },
  { id: 'nome_az', label: 'nome (A-Z)' },
];

const ITENS_POR_PAGINA = 15;

const GestaoClientes = () => {
  const { tenant_slug } = useParams();
  const { tenant } = useTenant();
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotification();

  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  // Filtros e ordenação
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSegment, setActiveSegment] = useState('todas');
  const [selectedSort, setSelectedSort] = useState('maior_gasto');
  const [currentPage, setCurrentPage] = useState(1);

  // Modais
  const [showNewClientModal, setShowNewClientModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showPwdModal, setShowPwdModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);

  // Estado do formulário de novo cliente
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    birth_date: '',
    vip_tier: 'Prata',
    password: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estado da redefinição de senha
  const [newPassword, setNewPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    if (!tenant) return;
    fetchClients();
  }, [tenant]);

  const fetchClients = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await api.clients.list(tenant.id);
      setClients(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Erro ao buscar clientes.');
    } finally {
      setLoading(false);
    }
  };

  // Badge de Nível VIP harmonizada com a paleta Rosé Editorial (sem azuis destoantes)
  const renderVipBadge = (tier) => {
    const rawTier = tier || 'Prata';
    const styles = {
      Prata: 'bg-stone-100 text-stone-700 border-stone-200/80',
      Ouro: 'bg-amber-50/90 text-amber-800 border-amber-200/80',
      VIP: 'bg-brand-tint text-brand border-brand/20',
      Black: 'bg-stone-900 text-amber-200 border-stone-800'
    };
    const styleClass = styles[rawTier] || styles.Prata;

    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium border shadow-2xs ${styleClass}`}>
        <span className="text-[10px]">★</span>
        {rawTier}
      </span>
    );
  };

  // Filtragem e segmentação avançada
  const filteredAndSortedClients = useMemo(() => {
    let result = [...clients];

    // 1. Busca por nome ou telefone
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const qDigits = searchQuery.replace(/\D/g, '');
      result = result.filter(c => {
        const nameMatch = (c.name || '').toLowerCase().includes(q);
        const phoneMatch = (c.phone || '').includes(qDigits || q);
        return nameMatch || phoneMatch;
      });
    }

    // 2. Filtro por chips de segmento
    const now = new Date();
    const currentMonth = now.getMonth() + 1; // 1 a 12

    if (activeSegment === 'vip') {
      result = result.filter(c => c.vip_tier === 'VIP' || c.vip_tier === 'Black');
    } else if (activeSegment === 'sumidas') {
      result = result.filter(c => {
        if (!c.last_visit) return false;
        const lastDate = new Date(c.last_visit);
        const diffDays = (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24);
        return diffDays >= 60;
      });
    } else if (activeSegment === 'aniversariantes') {
      result = result.filter(c => {
        if (!c.birth_date) return false;
        const parts = String(c.birth_date).split('-');
        if (parts.length >= 2) {
          const birthMonth = parseInt(parts[1], 10);
          return birthMonth === currentMonth;
        }
        return false;
      });
    } else if (activeSegment === 'sem_anamnese') {
      result = result.filter(c => {
        if (!c.anamnese_data) return true;
        if (typeof c.anamnese_data === 'object') {
          return Object.keys(c.anamnese_data).length === 0;
        }
        return false;
      });
    }

    // 3. Ordenação
    result.sort((a, b) => {
      if (selectedSort === 'maior_gasto') {
        return Number(b.ltv || 0) - Number(a.ltv || 0);
      }
      if (selectedSort === 'mais_visitas') {
        return Number(b.visits || 0) - Number(a.visits || 0);
      }
      if (selectedSort === 'mais_recentes') {
        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      }
      if (selectedSort === 'nome_az') {
        return (a.name || '').localeCompare(b.name || '');
      }
      return 0;
    });

    return result;
  }, [clients, searchQuery, activeSegment, selectedSort]);

  // Paginação
  const totalPaginas = Math.ceil(filteredAndSortedClients.length / ITENS_POR_PAGINA) || 1;
  const paginatedClients = useMemo(() => {
    const inicio = (currentPage - 1) * ITENS_POR_PAGINA;
    return filteredAndSortedClients.slice(inicio, inicio + ITENS_POR_PAGINA);
  }, [filteredAndSortedClients, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeSegment, selectedSort]);

  // Ações de formulário: Criar Novo Cliente
  const handleCreateClient = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showError('Por favor, informe o nome do cliente.');
      return;
    }
    const cleanPhone = formData.phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      showError('Por favor, informe um telefone celular válido com DDD.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.clients.create({
        name: formData.name.trim(),
        phone: cleanPhone,
        birth_date: formData.birth_date || null,
        vip_tier: formData.vip_tier || 'Prata',
        password: formData.password || '123456'
      });
      showSuccess(`Cliente ${formData.name} cadastrado com sucesso!`);
      setShowNewClientModal(false);
      setFormData({ name: '', phone: '', birth_date: '', vip_tier: 'Prata', password: '' });
      await fetchClients();
    } catch (err) {
      console.error(err);
      showError(err.message || 'Erro ao cadastrar cliente.');
    } finally {
      setIsSubmitting(false);
    }
  };




  // Download do modelo CSV
  const handleDownloadTemplate = () => {
    const csvContent = 'data:text/csv;charset=utf-8,nome,telefone,nascimento,nivel\nMaria Silva,11999998888,1992-05-14,Prata\nJuliana Santos,11988887777,1988-11-20,VIP';
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'modelo_clientes_operabeauty.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Redefinir senha de acesso da cliente
  const handleOpenResetPwd = (client, e) => {
    e.stopPropagation();
    setSelectedClient(client);
    setNewPassword('');
    setShowPwdModal(true);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 4) {
      showError('A senha precisa ter pelo menos 4 caracteres.');
      return;
    }

    setIsResetting(true);
    try {
      await api.clients.updatePassword(selectedClient.id, newPassword);
      showSuccess(`Senha de ${selectedClient.name} redefinida com sucesso!`);
      setShowPwdModal(false);
    } catch (err) {
      console.error(err);
      showError(err.message || 'Erro ao redefinir a senha do cliente.');
    } finally {
      setIsResetting(false);
    }
  };

  const handleOpenWhatsApp = (phone, name, e) => {
    e.stopPropagation();
    const clean = phone.replace(/\D/g, '');
    const finalPhone = clean.startsWith('55') ? clean : `55${clean}`;
    const saudacao = `Olá ${name || ''}! Tudo bem? Entramos em contato pelo ${tenant?.name || 'nosso salão'}.`;
    const url = `https://wa.me/${finalPhone}?text=${encodeURIComponent(saudacao)}`;
    window.open(url, '_blank');
  };

  const handleRowClick = (clientId) => {
    navigate(`/${tenant_slug}/staff/ficha-cliente/${clientId}`);
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-[1360px] mx-auto w-full flex flex-col gap-6 animate-fade-in">
      
      {/* 1. Cabeçalho Canônico (Título Playfair + Subtítulo + Ações) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold text-on-surface tracking-tight">
            Clientes
          </h1>
          <p className="text-xs sm:text-sm text-secondary font-sans mt-1">
            Sua base, fidelização e histórico.
          </p>
        </div>

        {/* Lado Direito: Busca + Importar + Novo Cliente */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          {/* Campo de Busca em Pílula */}
          <div className="relative w-full sm:w-64 md:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-secondary w-4 h-4 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar por nome ou telefone"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-line rounded-full text-xs sm:text-sm text-on-surface placeholder:text-secondary/70 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand shadow-2xs transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary hover:text-on-surface"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Botão Secundário: Importar Planilha */}
          <button
            onClick={() => setShowImportModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-brand text-brand hover:bg-brand-tint/60 text-xs sm:text-sm font-medium transition-colors cursor-pointer"
          >
            <FileUp className="w-4 h-4" />
            <span>Importar planilha</span>
          </button>

          {/* Botão Primário: Novo Cliente */}
          <button
            onClick={() => setShowNewClientModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-brand text-white hover:bg-brand-dark text-xs sm:text-sm font-medium transition-colors shadow-2xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Novo cliente</span>
          </button>
        </div>
      </div>

      {/* 2. Barra de Segmentos (Chips em Pílula) e Ordenação */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        {/* Chips de Segmentação com Rolagem Suave (§9.6·J8) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none flex-nowrap shrink-0 max-w-full">
          {SEGMENTOS.map((seg) => {
            const isActive = activeSegment === seg.id;
            return (
              <button
                key={seg.id}
                onClick={() => setActiveSegment(seg.id)}
                className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                  isActive
                    ? 'bg-brand text-white shadow-2xs font-semibold'
                    : 'bg-brand-tint text-brand hover:bg-brand-tint/80 border border-brand/10'
                }`}
              >
                {seg.label}
              </button>
            );
          })}
        </div>

        {/* Dropdown de Ordenação */}
        <div className="flex items-center gap-2 self-end sm:self-auto text-xs text-secondary shrink-0">
          <span>Ordenar:</span>
          <div className="relative inline-block">
            <select
              value={selectedSort}
              onChange={(e) => setSelectedSort(e.target.value)}
              className="appearance-none bg-transparent pr-5 text-on-surface font-medium hover:text-brand cursor-pointer focus:outline-none"
            >
              {OPCOES_ORDENACAO.map((op) => (
                <option key={op.id} value={op.id}>
                  {op.label}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-secondary absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* 3. Tabela Canônica Rosé Editorial (G3) */}
      <div className="bg-white border border-line rounded-[22px] overflow-hidden shadow-2xs">
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-3 border-brand/30 border-t-brand rounded-full animate-spin" />
            <p className="text-xs sm:text-sm text-secondary">Carregando base de clientes...</p>
          </div>
        ) : errorMsg ? (
          <div className="p-8 text-center flex flex-col items-center justify-center gap-2 text-error">
            <AlertCircle className="w-8 h-8 text-error/80" />
            <p className="font-medium text-sm">{errorMsg}</p>
            <button
              onClick={fetchClients}
              className="mt-2 text-xs font-semibold text-brand underline cursor-pointer"
            >
              Tentar novamente
            </button>
          </div>
        ) : filteredAndSortedClients.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
            <div className="w-14 h-14 rounded-full bg-brand-tint text-brand flex items-center justify-center mb-1">
              <Users className="w-7 h-7" />
            </div>
            <h3 className="font-serif text-lg font-bold text-on-surface">
              {searchQuery ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}
            </h3>
            <p className="text-xs sm:text-sm text-secondary max-w-sm">
              {searchQuery
                ? `Não encontramos clientes correspondentes a "${searchQuery}". Tente outro termo.`
                : 'Comece adicionando clientes à sua base para gerenciar agendamentos, histórico e fidelidade.'}
            </p>
            {!searchQuery && (
              <button
                onClick={() => setShowNewClientModal(true)}
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-brand text-white hover:bg-brand-dark text-xs font-medium transition-colors shadow-2xs"
              >
                <Plus className="w-4 h-4" />
                <span>Cadastrar primeiro cliente</span>
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Visualização em Tabela para Desktop e Tablet Paisagem (>= 768px) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-line bg-white text-[11px] font-semibold text-secondary uppercase tracking-wider">
                    <th scope="col" className="py-4 px-6 w-[34%]">
                      CLIENTE
                    </th>
                    <th scope="col" className="py-4 px-6 w-[18%]">
                      NÍVEL
                    </th>
                    <th scope="col" className="py-4 px-6 text-center w-[14%]">
                      VISITAS
                    </th>
                    <th scope="col" className="py-4 px-6 text-right w-[18%]">
                      GASTO TOTAL
                    </th>
                    <th scope="col" className="py-4 px-6 text-right w-[16%]">
                      AÇÕES
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60">
                  {paginatedClients.map((client) => {
                    const initials = (client.name || 'C')
                      .split(' ')
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((p) => p[0])
                      .join('')
                      .toUpperCase();

                    return (
                      <tr
                        key={client.id}
                        onClick={() => handleRowClick(client.id)}
                        className="hover:bg-brand-tint/20 transition-colors cursor-pointer group"
                      >
                        {/* Coluna CLIENTE: Avatar + Nome + Telefone */}
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3.5">
                            <div className="w-10 h-10 rounded-full bg-brand-tint border border-brand/15 text-brand font-serif font-bold text-sm flex items-center justify-center shrink-0">
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-sm text-on-surface group-hover:text-brand transition-colors truncate">
                                {client.name}
                              </p>
                              <p className="text-xs text-secondary font-mono tracking-tight mt-0.5">
                                {formatarTelefoneBR(client.phone)}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Coluna NÍVEL: Badge na Paleta Rosé Editorial */}
                        <td className="py-4 px-6">
                          {renderVipBadge(client.vip_tier)}
                        </td>

                        {/* Coluna VISITAS: Numerais Tabulares */}
                        <td className="py-4 px-6 text-center">
                          <span className="tabular-nums lining-nums text-sm font-medium text-on-surface">
                            {formatNumber(client.visits || 0)}
                          </span>
                        </td>

                        {/* Coluna GASTO TOTAL: Formatação BRL Tabular */}
                        <td className="py-4 px-6 text-right">
                          <span className="tabular-nums lining-nums text-sm font-bold text-on-surface">
                            {formatCurrency(client.ltv || 0)}
                          </span>
                        </td>

                        {/* Coluna AÇÕES: WhatsApp + Abrir Ficha + Redefinir Senha */}
                        <td className="py-4 px-6 text-right">
                          <div className="inline-flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                            {/* Botão de Contorno WhatsApp */}
                            <button
                              onClick={(e) => handleOpenWhatsApp(client.phone, client.name, e)}
                              title="Chamar no WhatsApp"
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-brand text-brand hover:bg-brand hover:text-white text-xs font-medium transition-colors cursor-pointer"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">WhatsApp</span>
                            </button>

                            {/* Ação rápida discreta: Chave de Redefinição de Senha */}
                            <button
                              onClick={(e) => handleOpenResetPwd(client, e)}
                              title="Redefinir senha de acesso"
                              className="p-1.5 text-secondary hover:text-brand hover:bg-brand-tint/60 rounded-full transition-colors cursor-pointer"
                            >
                              <KeyRound className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Visualização em Cartões Rosé Editorial para Mobile / Telas Compactas (< 768px) (§9.6·J8) */}
            <div className="md:hidden divide-y divide-line/60">
              {paginatedClients.map((client) => {
                const initials = (client.name || 'C')
                  .split(' ')
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((p) => p[0])
                  .join('')
                  .toUpperCase();

                return (
                  <div
                    key={client.id}
                    onClick={() => handleRowClick(client.id)}
                    className="p-4 flex flex-col gap-3 hover:bg-brand-tint/20 transition-colors cursor-pointer group active:bg-brand-tint/30"
                  >
                    {/* Linha Superior: Avatar + Nome + Badge VIP */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-11 h-11 rounded-full bg-brand-tint border border-brand/15 text-brand font-serif font-bold text-sm flex items-center justify-center shrink-0 shadow-2xs">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm text-on-surface group-hover:text-brand transition-colors truncate">
                            {client.name}
                          </p>
                          <p className="text-xs text-secondary font-mono tracking-tight mt-0.5">
                            {formatarTelefoneBR(client.phone)}
                          </p>
                        </div>
                      </div>
                      <div className="shrink-0 pt-0.5">
                        {renderVipBadge(client.vip_tier)}
                      </div>
                    </div>

                    {/* Linha do Meio: Métricas (Visitas e LTV) */}
                    <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-stone-50 border border-line/60 text-xs">
                      <div className="flex items-center gap-1.5 text-secondary">
                        <span className="font-medium text-stone-600">Visitas:</span>
                        <span className="tabular-nums font-bold text-on-surface">
                          {formatNumber(client.visits || 0)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-secondary font-medium">Gasto Total:</span>
                        <span className="tabular-nums font-bold text-brand font-serif text-sm">
                          {formatCurrency(client.ltv || 0)}
                        </span>
                      </div>
                    </div>

                    {/* Rodapé: Ações com Touch Targets Confortáveis (min 44px) */}
                    <div className="flex items-center gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={(e) => handleOpenWhatsApp(client.phone, client.name, e)}
                        className="flex-1 min-h-[44px] inline-flex items-center justify-center gap-2 px-3 py-2 rounded-full border border-brand/30 text-brand bg-brand-tint/30 hover:bg-brand hover:text-white text-xs font-semibold transition-colors active:scale-98"
                      >
                        <MessageCircle className="w-4 h-4" />
                        <span>WhatsApp</span>
                      </button>

                      <button
                        onClick={() => handleRowClick(client.id)}
                        className="flex-1 min-h-[44px] inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-full bg-brand text-white hover:bg-brand-dark text-xs font-semibold transition-colors shadow-2xs active:scale-98"
                      >
                        <span>Abrir Ficha</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>

                      <button
                        onClick={(e) => handleOpenResetPwd(client, e)}
                        title="Redefinir senha de acesso"
                        aria-label="Redefinir senha de acesso"
                        className="w-11 h-11 shrink-0 flex items-center justify-center rounded-full border border-line text-secondary hover:text-brand hover:bg-brand-tint/60 transition-colors"
                      >
                        <KeyRound className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Rodapé da Tabela: Paginação */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-line/60 bg-white text-xs text-secondary">
              <p>
                Mostrando{' '}
                <span className="font-semibold text-on-surface">
                  {Math.min(filteredAndSortedClients.length, (currentPage - 1) * ITENS_POR_PAGINA + 1)}
                </span>{' '}
                a{' '}
                <span className="font-semibold text-on-surface">
                  {Math.min(filteredAndSortedClients.length, currentPage * ITENS_POR_PAGINA)}
                </span>{' '}
                de <span className="font-semibold text-on-surface">{filteredAndSortedClients.length}</span> clientes
              </p>

              {totalPaginas > 1 && (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-full border border-line text-secondary hover:text-on-surface disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <span className="px-3 py-1 font-medium text-on-surface">
                    Página {currentPage} de {totalPaginas}
                  </span>

                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPaginas, p + 1))}
                    disabled={currentPage === totalPaginas}
                    className="p-1.5 rounded-full border border-line text-secondary hover:text-on-surface disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* 4. Modal: Cadastrar Novo Cliente */}
      {showNewClientModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white border border-line rounded-[24px] shadow-xl max-w-md w-full p-6 relative animate-in zoom-in-95 duration-150">
            <button
              onClick={() => setShowNewClientModal(false)}
              className="absolute top-5 right-5 text-secondary hover:text-on-surface transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-serif text-xl font-bold text-on-surface mb-1">
              Cadastrar Novo Cliente
            </h3>
            <p className="text-xs text-secondary mb-5">
              Adicione um cliente à base de {tenant?.name || 'seu salão'}.
            </p>

            <form onSubmit={handleCreateClient} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-secondary uppercase tracking-wider mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Amanda Ferreira"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-white border border-line rounded-xl text-sm text-on-surface focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-secondary uppercase tracking-wider mb-1">
                  Telefone Celular *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="(11) 99999-9999"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: formatarTelefoneBR(e.target.value) })
                  }
                  className="w-full px-3.5 py-2.5 bg-white border border-line rounded-xl text-sm text-on-surface focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-secondary uppercase tracking-wider mb-1">
                    Nascimento (opcional)
                  </label>
                  <input
                    type="date"
                    value={formData.birth_date}
                    onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-line rounded-xl text-xs sm:text-sm text-on-surface focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-secondary uppercase tracking-wider mb-1">
                    Nível VIP
                  </label>
                  <select
                    value={formData.vip_tier}
                    onChange={(e) => setFormData({ ...formData, vip_tier: e.target.value })}
                    className="w-full px-3 py-2.5 bg-white border border-line rounded-xl text-xs sm:text-sm text-on-surface focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                  >
                    <option value="Prata">★ Prata</option>
                    <option value="Ouro">★ Ouro</option>
                    <option value="VIP">★ VIP</option>
                    <option value="Black">★ Black</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-secondary uppercase tracking-wider mb-1">
                  Senha Provisória
                </label>
                <input
                  type="text"
                  placeholder="Padrão: 123456"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white border border-line rounded-xl text-sm text-on-surface focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand placeholder:text-secondary/60"
                />
                <p className="text-[11px] text-secondary mt-1">
                  A cliente poderá alterar sua senha pelo aplicativo a qualquer momento.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setShowNewClientModal(false)}
                  className="px-4 py-2 rounded-full border border-line text-secondary hover:text-on-surface text-xs font-medium transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-full bg-brand text-white hover:bg-brand-dark text-xs font-semibold transition-colors shadow-2xs disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Cadastrando...' : 'Cadastrar Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Modal Universal: Importar Planilha (D10) */}
      <ModalImportarPlanilha
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        tipo="clientes"
        onSuccess={fetchClients}
      />

      {/* 6. Modal: Redefinir Senha do Cliente */}
      {showPwdModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white border border-line rounded-[24px] shadow-xl max-w-sm w-full p-6 relative animate-in zoom-in-95 duration-150">
            <button
              onClick={() => setShowPwdModal(false)}
              className="absolute top-5 right-5 text-secondary hover:text-on-surface transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-10 h-10 rounded-full bg-brand-tint text-brand flex items-center justify-center mb-3">
              <KeyRound className="w-5 h-5" />
            </div>

            <h3 className="font-serif text-lg font-bold text-on-surface mb-1">
              Redefinir Senha
            </h3>
            <p className="text-xs text-secondary mb-4">
              Informe a nova senha de acesso para <strong>{selectedClient?.name}</strong>.
            </p>

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-secondary uppercase tracking-wider mb-1">
                  Nova Senha *
                </label>
                <input
                  type="password"
                  required
                  placeholder="Mínimo de 4 caracteres"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-line rounded-xl text-sm text-on-surface focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPwdModal(false)}
                  className="px-4 py-2 rounded-full border border-line text-secondary hover:text-on-surface text-xs font-medium transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isResetting}
                  className="px-5 py-2 rounded-full bg-brand text-white hover:bg-brand-dark text-xs font-semibold transition-colors shadow-2xs disabled:opacity-50 cursor-pointer"
                >
                  {isResetting ? 'Salvando...' : 'Confirmar Senha'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GestaoClientes;
