import React, { useState, useEffect, useMemo } from 'react';
import { useTenant } from '../../context/TenantContext';
import { api } from '../../lib/api';
import { useNotification } from '../../context/NotificationProvider';
import { 
  Gift, 
  Search, 
  X, 
  Copy, 
  Check, 
  MoreHorizontal, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Sparkles
} from 'lucide-react';
import { EstadoVazio } from '../../components/ui/EstadoVazio';
import { formatCurrency, formatNumber } from '../../utils/formatters';

const GestaoGiftCards = () => {
  const { tenant } = useTenant();
  const { showSuccess, showError, confirm } = useNotification();
  
  const [giftCards, setGiftCards] = useState([]);
  const [loading, setLoading] = useState(false);

  // Barra de validação PIX (topo direito)
  const [pixSearchCode, setPixSearchCode] = useState('');
  const [pixDetails, setPixDetails] = useState(null);
  const [showPixModal, setShowPixModal] = useState(false);
  const [confirmingPix, setConfirmingPix] = useState(false);

  // Filtros e Busca
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'active' | 'redeemed' | 'pending'
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedCode, setCopiedCode] = useState(null);
  const [openDropdownId, setOpenDropdownId] = useState(null);

  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  useEffect(() => {
    if (tenant?.id) {
      fetchData();
    }
  }, [tenant]);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.giftcard-actions-dropdown')) {
        setOpenDropdownId(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await api.request('/giftcards/admin');
      setGiftCards(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setGiftCards([]);
      showError("Erro ao carregar vales-presente.");
    } finally {
      setLoading(false);
    }
  };

  // 3 KPIs Canônicos (§9.6 J10 · Mockup G10)
  const kpiStats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Vales do mês atual
    const monthCards = giftCards.filter(gc => {
      const d = new Date(gc.created_at || gc.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const vendidosMesValor = monthCards.reduce((acc, gc) => acc + Number(gc.original_value || gc.value || 0), 0);
    const vendidosMesQtd = monthCards.length;

    // Resgatados (status REDEEMED ou PARTIALLY_REDEEMED)
    const resgatadosCards = giftCards.filter(gc => gc.status === 'REDEEMED' || gc.status === 'PARTIALLY_REDEEMED');
    const resgatadosValor = resgatadosCards.reduce((acc, gc) => {
      const orig = Number(gc.original_value || gc.value || 0);
      const rem = Number(gc.remaining_balance ?? gc.current_balance ?? 0);
      return acc + Math.max(0, orig - rem);
    }, 0);
    const resgatadosQtd = resgatadosCards.length;

    // Saldo em Aberto (status ACTIVE ou PARTIALLY_REDEEMED)
    const saldoEmAberto = giftCards
      .filter(gc => gc.status === 'ACTIVE' || gc.status === 'PARTIALLY_REDEEMED')
      .reduce((acc, gc) => acc + Number(gc.remaining_balance ?? gc.current_balance ?? gc.original_value ?? 0), 0);

    return {
      vendidosMesValor,
      vendidosMesQtd,
      resgatadosValor,
      resgatadosQtd,
      saldoEmAberto
    };
  }, [giftCards]);

  // Filtragem e Busca
  const filteredGiftCards = useMemo(() => {
    return giftCards.filter(card => {
      // Filtro de Status
      if (activeFilter === 'active') {
        if (card.status !== 'ACTIVE' && card.status !== 'PARTIALLY_REDEEMED') return false;
      } else if (activeFilter === 'redeemed') {
        if (card.status !== 'REDEEMED') return false;
      } else if (activeFilter === 'pending') {
        if (card.status !== 'PENDING_PAYMENT') return false;
      }

      // Busca por código, solicitação ou nome
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        const matchesCode = card.redemption_code && card.redemption_code.toLowerCase().includes(term);
        const matchesReq = card.request_id && card.request_id.toLowerCase().includes(term);
        const matchesRecipient = card.recipient_name && card.recipient_name.toLowerCase().includes(term);
        const matchesBuyer = card.buyer_name && card.buyer_name.toLowerCase().includes(term);

        if (!matchesCode && !matchesReq && !matchesRecipient && !matchesBuyer) return false;
      }

      return true;
    });
  }, [giftCards, activeFilter, searchTerm]);

  // Paginação
  const totalPages = itemsPerPage === 'all' ? 1 : Math.max(1, Math.ceil(filteredGiftCards.length / itemsPerPage));
  const paginatedGiftCards = useMemo(() => {
    if (itemsPerPage === 'all') return filteredGiftCards;
    const start = (currentPage - 1) * itemsPerPage;
    return filteredGiftCards.slice(start, start + itemsPerPage);
  }, [filteredGiftCards, currentPage, itemsPerPage]);

  // Copiar código para área de transferência
  const handleCopyCode = (code) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    showSuccess(`Código ${code} copiado!`);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Consultar PIX no topo direito
  const handleConsultPix = async (e) => {
    e.preventDefault();
    if (!pixSearchCode.trim()) return;
    
    setLoading(true);
    setPixDetails(null);
    try {
      const codeClean = pixSearchCode.trim().toUpperCase();
      const data = await api.request(`/giftcards/admin/request/${codeClean}`);
      setPixDetails(data);
      setShowPixModal(true);
    } catch (err) {
      showError(err.message || "Solicitação não encontrada.");
    } finally {
      setLoading(false);
    }
  };

  // Confirmar Pagamento do PIX
  const handleConfirmPixPayment = async () => {
    if (!pixDetails) return;
    if (!(await confirm(`Confirmar o recebimento de ${formatCurrency(pixDetails.original_value)} para a solicitação ${pixDetails.request_id}?`))) return;

    setConfirmingPix(true);
    try {
      const response = await api.request(`/giftcards/admin/confirm-payment/${pixDetails.request_id}`, { method: 'POST' });
      showSuccess('Pagamento confirmado e vale-presente ativado!');
      setShowPixModal(false);
      setPixSearchCode('');
      fetchData();
    } catch (err) {
      showError(err.message || "Erro ao confirmar pagamento.");
    } finally {
      setConfirmingPix(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in text-ink">
      
      {/* 1. Cabeçalho Editorial com Barra de Validação PIX (§9.6 J10 · Mockup G10) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-line pb-4">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-ink">Vales-presente</h1>
          <p className="text-sm text-ink-soft mt-1">Acompanhe vendas, pagamentos e resgates.</p>
        </div>

        {/* Barra de Validação PIX Integrada em Pílula */}
        <form onSubmit={handleConsultPix} className="flex items-center gap-2 p-1.5 rounded-full border border-line bg-white shadow-2xs shrink-0">
          <span className="text-xs font-medium text-ink-soft pl-3 whitespace-nowrap hidden sm:inline">
            Validar pagamento PIX
          </span>
          <input
            type="text"
            placeholder="VP-XXXXXXXX"
            value={pixSearchCode}
            onChange={e => setPixSearchCode(e.target.value.toUpperCase())}
            className="w-32 sm:w-36 rounded-full border border-line px-3 py-1.5 text-xs font-mono uppercase text-ink focus:border-brand outline-none text-center"
          />
          <button
            type="submit"
            className="px-4 py-1.5 rounded-full bg-brand hover:bg-brand-hover text-white text-xs font-semibold shadow-xs cursor-pointer active:scale-98 transition-all shrink-0"
          >
            Consultar
          </button>
        </form>
      </div>

      {/* 2. Grade de 3 KPIs Compactos (§9.6 J10 · Mockup G10) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        {/* KPI: VENDIDOS NO MÊS */}
        <div className="rounded-[22px] border border-line bg-white p-5 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-ink-soft block">
            VENDIDOS NO MÊS
          </span>
          <span className="font-display text-3xl sm:text-4xl font-bold text-ink tabular-nums lining-nums block">
            {formatCurrency(kpiStats.vendidosMesValor)}
          </span>
          <span className="text-xs text-ink-soft block tabular-nums">
            {kpiStats.vendidosMesQtd} {kpiStats.vendidosMesQtd === 1 ? 'vale' : 'vales'}
          </span>
        </div>

        {/* KPI: RESGATADOS */}
        <div className="rounded-[22px] border border-line bg-white p-5 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-ink-soft block">
            RESGATADOS
          </span>
          <span className="font-display text-3xl sm:text-4xl font-bold text-ink tabular-nums lining-nums block">
            {formatCurrency(kpiStats.resgatadosValor)}
          </span>
          <span className="text-xs text-ink-soft block tabular-nums">
            {kpiStats.resgatadosQtd} {kpiStats.resgatadosQtd === 1 ? 'vale' : 'vales'}
          </span>
        </div>

        {/* KPI: SALDO EM ABERTO */}
        <div className="rounded-[22px] border border-line bg-white p-5 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-ink-soft block">
            SALDO EM ABERTO
          </span>
          <span className="font-display text-3xl sm:text-4xl font-bold text-ink tabular-nums lining-nums block">
            {formatCurrency(kpiStats.saldoEmAberto)}
          </span>
          <span className="text-xs text-ink-soft block">Vales ativos a honrar</span>
        </div>

      </div>

      {/* 3. Barra de Ferramentas: Filtros em Chips e Busca em Tempo Real */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        
        {/* Chips de Filtro */}
        <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar pb-1">
          <button
            onClick={() => { setActiveFilter('all'); setCurrentPage(1); }}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
              activeFilter === 'all'
                ? 'bg-brand text-white shadow-xs'
                : 'bg-white text-ink-soft hover:bg-stone-50 border border-line'
            }`}
          >
            Todos
          </button>

          <button
            onClick={() => { setActiveFilter('active'); setCurrentPage(1); }}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
              activeFilter === 'active'
                ? 'bg-brand text-white shadow-xs'
                : 'bg-white text-ink-soft hover:bg-stone-50 border border-line'
            }`}
          >
            Ativos
          </button>

          <button
            onClick={() => { setActiveFilter('redeemed'); setCurrentPage(1); }}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
              activeFilter === 'redeemed'
                ? 'bg-brand text-white shadow-xs'
                : 'bg-white text-ink-soft hover:bg-stone-50 border border-line'
            }`}
          >
            Resgatados
          </button>

          <button
            onClick={() => { setActiveFilter('pending'); setCurrentPage(1); }}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
              activeFilter === 'pending'
                ? 'bg-brand text-white shadow-xs'
                : 'bg-white text-ink-soft hover:bg-stone-50 border border-line'
            }`}
          >
            Aguardando pagamento
          </button>
        </div>

        {/* Busca em Tempo Real */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-ink-soft absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por código ou nome"
            value={searchTerm}
            onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="w-full pl-11 pr-10 py-2 rounded-full border border-line bg-white text-sm text-ink focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand shadow-2xs transition-all placeholder:text-ink-soft/70"
          />
          {searchTerm && (
            <button
              onClick={() => { setSearchTerm(''); setCurrentPage(1); }}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-soft hover:text-ink cursor-pointer p-0.5"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

      </div>

      {/* 4. Tabela Corporativa Rosé Editorial (§9.6 J10 · Mockup G10) */}
      {loading ? (
        <div className="py-20 text-center text-ink-soft flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-2 border-brand/30 border-t-brand rounded-full animate-spin" />
          <span className="text-sm">Carregando vales-presente...</span>
        </div>
      ) : filteredGiftCards.length === 0 ? (
        <div className="bg-white rounded-[22px] border border-line p-8 shadow-xs">
          <EstadoVazio
            icone={<Gift className="w-8 h-8 text-brand" />}
            titulo="Nenhum vale-presente cadastrado"
            descricao={searchTerm || activeFilter !== 'all' ? "Tente alterar os filtros ou o termo de busca digitado." : "Os vales vendidos ou solicitados aparecerão listados aqui."}
            textoAcao={searchTerm || activeFilter !== 'all' ? "Limpar filtros" : undefined}
            aoClicarAcao={searchTerm || activeFilter !== 'all' ? () => { setSearchTerm(''); setActiveFilter('all'); } : undefined}
          />
        </div>
      ) : (
        <div className="rounded-[22px] border border-line bg-white shadow-xs overflow-hidden">
          
          {/* Tabela Desktop e Tablet (>= 768px) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-line bg-stone-50/50 text-[11px] font-bold uppercase tracking-wider text-ink-soft">
                  <th className="px-6 py-4">SOLICITAÇÃO</th>
                  <th className="px-6 py-4">CÓDIGO DO VALE</th>
                  <th className="px-6 py-4">PRESENTEADO(A)</th>
                  <th className="px-6 py-4">VALOR</th>
                  <th className="px-6 py-4">SALDO</th>
                  <th className="px-6 py-4">PAGAMENTO</th>
                  <th className="px-6 py-4">SITUAÇÃO</th>
                  <th className="px-6 py-4 text-right">AÇÕES</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/70 text-sm">
                {paginatedGiftCards.map((card) => {
                  const isPaid = card.payment_status === 'CONFIRMED' || card.status === 'ACTIVE' || card.status === 'REDEEMED' || card.status === 'PARTIALLY_REDEEMED';
                  const isRedeemed = card.status === 'REDEEMED';
                  const isPartiallyRedeemed = card.status === 'PARTIALLY_REDEEMED';
                  const isActive = card.status === 'ACTIVE';

                  return (
                    <tr key={card.id || card.request_id} className="hover:bg-stone-50/60 transition-colors">
                      {/* SOLICITAÇÃO */}
                      <td className="px-6 py-4">
                        <span className="inline-block px-2.5 py-1 rounded-lg bg-stone-100 font-mono text-xs text-ink-soft">
                          {card.request_id || '—'}
                        </span>
                      </td>

                      {/* CÓDIGO DO VALE COM COPIAR */}
                      <td className="px-6 py-4">
                        {card.redemption_code ? (
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-semibold text-ink">
                              {card.redemption_code}
                            </span>
                            <button
                              onClick={() => handleCopyCode(card.redemption_code)}
                              className="text-xs font-semibold text-brand hover:underline cursor-pointer flex items-center gap-0.5"
                              title="Copiar código"
                            >
                              {copiedCode === card.redemption_code ? (
                                <span className="text-emerald-700 flex items-center gap-0.5">
                                  <Check className="w-3 h-3" /> Copiado
                                </span>
                              ) : (
                                <span>Copiar</span>
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-ink-soft/60 italic">Aguardando ativação</span>
                        )}
                      </td>

                      {/* PRESENTEADO(A) */}
                      <td className="px-6 py-4 font-medium text-ink">
                        {card.recipient_name || card.buyer_name || 'Cliente'}
                      </td>

                      {/* VALOR */}
                      <td className="px-6 py-4 font-display text-sm font-bold text-ink tabular-nums lining-nums">
                        {formatCurrency(card.original_value || card.value || 0)}
                      </td>

                      {/* SALDO */}
                      <td className="px-6 py-4 font-display text-sm font-bold text-ink tabular-nums lining-nums">
                        {formatCurrency(card.remaining_balance ?? card.current_balance ?? (isRedeemed ? 0 : card.original_value) ?? 0)}
                      </td>

                      {/* PAGAMENTO */}
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          isPaid 
                            ? 'bg-[#E8F5E9] text-[#2E7D32]' 
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {isPaid ? 'Pago' : 'Pendente'}
                        </span>
                      </td>

                      {/* SITUAÇÃO */}
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          isRedeemed 
                            ? 'bg-stone-100 text-ink-soft' 
                            : isPartiallyRedeemed
                            ? 'bg-blue-100 text-blue-800'
                            : isActive
                            ? 'bg-[#E8F5E9] text-[#2E7D32]'
                            : 'bg-stone-100 text-ink-soft'
                        }`}>
                          {isRedeemed ? 'Resgatado' : isPartiallyRedeemed ? 'Parcial' : isActive ? 'Ativo' : 'Pendente'}
                        </span>
                      </td>

                      {/* AÇÕES */}
                      <td className="px-6 py-4 text-right">
                        <div className="relative inline-block giftcard-actions-dropdown">
                          <button
                            onClick={() => setOpenDropdownId(openDropdownId === (card.id || card.request_id) ? null : (card.id || card.request_id))}
                            className="w-8 h-8 rounded-full border border-line flex items-center justify-center text-ink-soft hover:text-ink cursor-pointer transition-all hover:bg-stone-50"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>

                          {openDropdownId === (card.id || card.request_id) && (
                            <div className="absolute right-0 top-9 w-44 rounded-xl bg-white border border-line shadow-lg py-1 z-30 animate-scale-up text-left">
                              {card.redemption_code && (
                                <button
                                  onClick={() => { handleCopyCode(card.redemption_code); setOpenDropdownId(null); }}
                                  className="w-full px-4 py-2 text-xs font-medium text-ink hover:bg-stone-50 flex items-center gap-2 cursor-pointer"
                                >
                                  <Copy className="w-3.5 h-3.5 text-ink-soft" />
                                  Copiar código
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  setPixSearchCode(card.request_id || '');
                                  setPixDetails(card);
                                  setShowPixModal(true);
                                  setOpenDropdownId(null);
                                }}
                                className="w-full px-4 py-2 text-xs font-medium text-ink hover:bg-stone-50 flex items-center gap-2 cursor-pointer border-t border-line/60"
                              >
                                Ver detalhes
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Modo Mobile em Cartões (< 768px) (§9.6 J8) */}
          <div className="md:hidden divide-y divide-line">
            {paginatedGiftCards.map((card) => (
              <div key={card.id || card.request_id} className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-semibold text-sm text-ink block">
                      {card.recipient_name || card.buyer_name || 'Cliente'}
                    </span>
                    <span className="font-mono text-xs text-ink-soft">
                      {card.request_id}
                    </span>
                  </div>

                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    card.status === 'REDEEMED' ? 'bg-stone-100 text-ink-soft' : 'bg-[#E8F5E9] text-[#2E7D32]'
                  }`}>
                    {card.status === 'REDEEMED' ? 'Resgatado' : 'Ativo'}
                  </span>
                </div>

                {card.redemption_code && (
                  <div className="flex items-center justify-between p-2 rounded-xl bg-stone-50 border border-line/60">
                    <span className="font-mono text-xs font-bold text-ink">
                      {card.redemption_code}
                    </span>
                    <button
                      onClick={() => handleCopyCode(card.redemption_code)}
                      className="text-xs font-semibold text-brand cursor-pointer"
                    >
                      Copiar
                    </button>
                  </div>
                )}

                <div className="flex items-center justify-between pt-1">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-ink-soft block leading-none">Valor / Saldo</span>
                    <span className="font-display text-base font-bold text-brand tabular-nums lining-nums">
                      {formatCurrency(card.original_value || 0)}
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      setPixSearchCode(card.request_id || '');
                      setPixDetails(card);
                      setShowPixModal(true);
                    }}
                    className="px-3.5 py-1.5 rounded-full border border-line text-xs font-semibold text-ink-soft hover:text-ink cursor-pointer"
                  >
                    Detalhes
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Rodapé de Paginação Rosé Editorial (§9.6 J10 · Mockup G10) */}
          <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-t border-line gap-3 text-xs text-ink-soft">
            <div className="flex items-center gap-2">
              <span>Itens por página:</span>
              <select
                value={itemsPerPage}
                onChange={e => {
                  const val = e.target.value === 'all' ? 'all' : Number(e.target.value);
                  setItemsPerPage(val);
                  setCurrentPage(1);
                }}
                className="border border-line rounded-lg px-2 py-1 bg-white text-ink text-xs font-medium outline-none cursor-pointer"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value="all">Todos</option>
              </select>
            </div>

            <div className="flex items-center gap-3">
              <span>
                {currentPage} de {totalPages}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="w-7 h-7 rounded-full border border-line flex items-center justify-center text-ink-soft hover:text-ink disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="w-7 h-7 rounded-full border border-line flex items-center justify-center text-ink-soft hover:text-ink disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* 5. Modal: Detalhes / Validação de PIX */}
      {showPixModal && pixDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-[24px] border border-line shadow-2xl p-6 relative animate-scale-up space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <h2 className="font-display text-2xl font-bold text-ink">Solicitação PIX</h2>
              <button 
                onClick={() => setShowPixModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-ink-soft hover:text-ink cursor-pointer hover:bg-stone-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-stone-50 rounded-2xl p-4 border border-line/60 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-ink-soft">Solicitação:</span>
                <span className="font-mono font-semibold text-ink">{pixDetails.request_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-soft">Comprador(a):</span>
                <span className="font-semibold text-ink">{pixDetails.buyer_name || 'Não informado'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-soft">Presenteado(a):</span>
                <span className="font-semibold text-ink">{pixDetails.recipient_name || 'Não informado'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-soft">Situação do PIX:</span>
                <span className={`font-semibold ${pixDetails.payment_status === 'CONFIRMED' ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {pixDetails.payment_status === 'CONFIRMED' ? 'Confirmado' : 'Aguardando confirmação'}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-line/60 text-sm">
                <span className="font-bold text-ink">Valor do Vale:</span>
                <span className="font-display text-lg font-bold text-brand tabular-nums lining-nums">
                  {formatCurrency(pixDetails.original_value || pixDetails.value || 0)}
                </span>
              </div>
            </div>

            {pixDetails.redemption_code && (
              <div className="p-3 bg-brand-tint/20 rounded-xl border border-brand/10 text-center">
                <span className="text-[10px] uppercase font-bold text-brand block mb-1">Código de Resgate</span>
                <span className="font-mono text-base font-bold text-ink">{pixDetails.redemption_code}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
              <button
                type="button"
                onClick={() => setShowPixModal(false)}
                className="px-4 py-2 rounded-full border border-stone-300 text-ink-soft text-xs font-semibold hover:bg-stone-50 cursor-pointer"
              >
                Fechar
              </button>

              {pixDetails.payment_status !== 'CONFIRMED' && (
                <button
                  type="button"
                  disabled={confirmingPix}
                  onClick={handleConfirmPixPayment}
                  className="px-5 py-2.5 rounded-full bg-brand text-white text-xs font-semibold hover:bg-brand-hover shadow-xs disabled:opacity-50 cursor-pointer transition-all active:scale-98"
                >
                  {confirmingPix ? 'Confirmando...' : 'Confirmar Recebimento PIX'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default GestaoGiftCards;
