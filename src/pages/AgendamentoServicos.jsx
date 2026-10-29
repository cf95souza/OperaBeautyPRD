import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ChevronLeft, ArrowRight, Search, Sparkles } from 'lucide-react';
import { useTenant } from '../context/TenantContext';
import { useBooking } from '../context/BookingContext';
import { api } from '../lib/api';
import CartaoServico from '../components/ui/CartaoServico';
import { TelaCliente } from '../components/ui/TelaCliente';
import ModalPersonalizarServico from '../components/ModalPersonalizarServico';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// Formatador elegante de duração (ex: 90 min -> 1h30, 60 min -> 1h, 45 min -> 45 min)
const formatDuration = (totalMinutes) => {
  if (!totalMinutes || totalMinutes <= 0) return '0 min';
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0 && minutes > 0) {
    return `${hours}h${minutes < 10 ? '0' : ''}${minutes}`;
  } else if (hours > 0) {
    return `${hours}h`;
  }
  return `${minutes} min`;
};

// Extrator de categoria inteligente pelo nome do serviço
const inferCategory = (serviceName = '') => {
  const lower = serviceName.toLowerCase();
  if (
    lower.includes('corte') ||
    lower.includes('escova') ||
    lower.includes('cabelo') ||
    lower.includes('mechas') ||
    lower.includes('luzes') ||
    lower.includes('tintura') ||
    lower.includes('penteado') ||
    lower.includes('barba') ||
    lower.includes('hidratação') ||
    lower.includes('cronograma')
  ) {
    return 'Cabelo';
  }
  if (
    lower.includes('unha') ||
    lower.includes('manicure') ||
    lower.includes('pedicure') ||
    lower.includes('gel') ||
    lower.includes('fibra') ||
    lower.includes('esmaltação')
  ) {
    return 'Unhas';
  }
  if (
    lower.includes('sobrancelha') ||
    lower.includes('cilios') ||
    lower.includes('lash') ||
    lower.includes('henna') ||
    lower.includes('olhar')
  ) {
    return 'Sobrancelha';
  }
  if (
    lower.includes('massagem') ||
    lower.includes('drenagem') ||
    lower.includes('limpeza') ||
    lower.includes('facial') ||
    lower.includes('estética') ||
    lower.includes('depilação') ||
    lower.includes('laser')
  ) {
    return 'Estética';
  }
  return 'Outros';
};

const AgendamentoServicos = () => {
  const { tenant_slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { tenant } = useTenant();
  const { bookingData, updateBooking } = useBooking();

  const [dbServices, setDbServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedServices, setSelectedServices] = useState([]);
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [autoProcessed, setAutoProcessed] = useState(false);

  // Estados de Personalização (Variações & Extras - D12 P2)
  const [customizingService, setCustomizingService] = useState(null);
  const [customizingInitial, setCustomizingInitial] = useState(null);
  const [isCustomizingModalOpen, setIsCustomizingModalOpen] = useState(false);

  // 1. Carrega a lista de serviços ativos do salão
  useEffect(() => {
    let isMounted = true;
    const fetchServices = async () => {
      if (!tenant) return;
      setLoading(true);
      try {
        const data = await api.services.list(tenant.id);
        if (data && isMounted) {
          const actives = data.filter((s) => s.is_active);
          setDbServices(actives);

          // Inicializa seleção a partir de dados pré-existentes na sessão ou rota
          const preselectedId = location.state?.preselectedServiceId;
          if (preselectedId) {
            const found = actives.find((s) => s.id === preselectedId);
            if (found) {
              setSelectedServices([found]);
            }
          } else if (bookingData.services && Array.isArray(bookingData.services) && bookingData.services.length > 0) {
            setSelectedServices(bookingData.services);
          } else if (bookingData.service && bookingData.service.id) {
            const found = actives.find((s) => s.id === bookingData.service.id);
            if (found) {
              setSelectedServices([found]);
            }
          }
        }
      } catch (err) {
        console.error('Erro ao carregar serviços:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchServices();
    return () => {
      isMounted = false;
    };
  }, [tenant, location.state]);

  // Se veio redirecionado com profissional pré-selecionado (ex: Repetir Último Serviço)
  useEffect(() => {
    if (!autoProcessed && dbServices.length > 0 && location.state?.preselectedStaffId && selectedServices.length > 0) {
      setAutoProcessed(true);
      navigate(`/${tenant_slug}/agendar/profissionais`, {
        state: { preselectedStaffId: location.state.preselectedStaffId }
      });
    }
  }, [dbServices, location.state, autoProcessed, navigate, tenant_slug, selectedServices]);

  // 2. Extrai categorias dinâmicas baseadas nos serviços cadastrados na ordem do design
  const categories = useMemo(() => {
    const canonicalOrder = ['Todos', 'Cabelo', 'Unhas', 'Sobrancelha', 'Estética', 'Outros'];
    const found = new Set(['Todos']);
    dbServices.forEach((s) => {
      found.add(inferCategory(s.name));
    });
    return Array.from(found).sort((a, b) => {
      const idxA = canonicalOrder.indexOf(a);
      const idxB = canonicalOrder.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });
  }, [dbServices]);

  // 3. Filtro por categoria ativa e busca textual
  const filteredServices = useMemo(() => {
    return dbServices.filter((service) => {
      const matchesCategory =
        activeCategory === 'Todos' || inferCategory(service.name) === activeCategory;
      const matchesSearch =
        !searchQuery.trim() ||
        service.name.toLowerCase().includes(searchQuery.toLowerCase().trim());
      return matchesCategory && matchesSearch;
    });
  }, [dbServices, activeCategory, searchQuery]);

  // 4. Alterna seleção de serviço com suporte a Variações e Extras (Item D12 P2)
  const handleToggleService = (service) => {
    const hasCustomizations = (service.variations && service.variations.length > 0) || (service.extras && service.extras.length > 0);
    const existing = selectedServices.find((s) => s.id === service.id);

    if (hasCustomizations) {
      setCustomizingService(service);
      setCustomizingInitial(existing || null);
      setIsCustomizingModalOpen(true);
      return;
    }

    setSelectedServices((prev) => {
      if (existing) {
        return prev.filter((s) => s.id !== service.id);
      } else {
        return [...prev, service];
      }
    });
  };

  const handleConfirmCustomization = (customizedService) => {
    setSelectedServices((prev) => {
      const idx = prev.findIndex((s) => s.id === customizedService.id);
      if (idx !== -1) {
        const updated = [...prev];
        updated[idx] = customizedService;
        return updated;
      }
      return [...prev, customizedService];
    });
  };

  const handleRemoveCustomization = (serviceToRemove) => {
    setSelectedServices((prev) => prev.filter((s) => s.id !== serviceToRemove.id));
  };

  // 5. Totalizadores em tempo real
  const selectedCount = selectedServices.length;
  const totalPrice = useMemo(() => {
    return selectedServices.reduce((sum, s) => sum + parseFloat(s.price || 0), 0);
  }, [selectedServices]);

  const totalMinutes = useMemo(() => {
    return selectedServices.reduce(
      (sum, s) => sum + parseInt(s.duration_minutes || s.duration || 30, 10),
      0
    );
  }, [selectedServices]);

  const formattedDuration = formatDuration(totalMinutes);

  // 6. Prosseguir para a próxima etapa (Profissionais)
  const handleContinue = () => {
    if (selectedCount === 0) return;

    const primaryService = selectedServices[0];
    const consolidatedName = selectedServices.map((s) => s.name).join(' + ');

    // Salva tanto o array de múltiplos serviços quanto o consolidado para retrocompatibilidade
    updateBooking({
      services: selectedServices,
      service: {
        id: primaryService.id,
        name: consolidatedName,
        price: totalPrice,
        duration: totalMinutes,
        is_starting_price: selectedServices.some((s) => s.is_starting_price),
        selectedServices: selectedServices
      }
    });

    navigate(`/${tenant_slug}/agendar/profissionais`);
  };

  return (
    <TelaCliente temBarraFixaInferior className="selection:bg-brand-tint selection:text-brand">
      {/* Container Centralizado Padrão Mobile */}
      <div className="w-full max-w-[420px] mx-auto px-5 pt-3 flex-1 flex flex-col pb-8">
        
        {/* 1. Topo do Fluxo: Botão Voltar + Barra de Progresso + Etapa */}
        <header className="flex items-center justify-between gap-3 pt-1 pb-4">
          <button
            type="button"
            onClick={() => navigate(`/${tenant_slug}/home`)}
            className="w-10 h-10 rounded-full border border-line bg-surface text-ink flex items-center justify-center hover:bg-brand-tint/30 transition-all active:scale-95 shadow-xs shrink-0 cursor-pointer"
            aria-label="Voltar para a página inicial"
          >
            <ChevronLeft size={20} strokeWidth={2.4} />
          </button>

          {/* Barra de Progresso Rosé Editorial (Etapa 1 de 4 = 25%) */}
          <div className="flex-1 h-1.5 bg-[#EADFDC] rounded-full overflow-hidden mx-1.5">
            <div
              className="h-full bg-brand rounded-full transition-all duration-300"
              style={{ width: '25%' }}
            />
          </div>

          <span className="font-sans text-[13px] font-semibold text-ink-soft shrink-0">
            1 de 4
          </span>
        </header>

        {/* 2. Cabeçalho da Tela com Saudação Editorial */}
        <section className="pt-2 pb-4 text-left">
          <h1 className="font-display text-[28px] font-semibold text-ink leading-tight tracking-tight">
            Escolha seu serviço
          </h1>
          <p className="font-sans text-[14px] text-ink-soft mt-1">
            Pode escolher mais de um.
          </p>
        </section>

        {/* Campo de Busca Rápida (Quando houver mais de 12 serviços conforme §3.5) */}
        {dbServices.length > 12 && (
          <div className="relative mb-3">
            <Search
              size={17}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-soft"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar serviço..."
              className="w-full h-10 pl-10 pr-4 rounded-full border border-line bg-surface font-sans text-[14px] text-ink placeholder:text-ink-soft/70 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/40 shadow-xs"
            />
          </div>
        )}

        {/* 3. Filtro de Categorias Horizontal (Chips) */}
        {categories.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1.5 mb-4 hide-scrollbar select-none">
            {categories.map((cat) => {
              const isCatActive = activeCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className={cn(
                    'px-5 h-9 rounded-full font-sans text-[13px] transition-all duration-200 shrink-0 cursor-pointer select-none',
                    isCatActive
                      ? 'bg-brand text-white font-semibold shadow-xs'
                      : 'bg-[#F6E4E4] text-[#8E3B4E] font-medium hover:bg-[#ebd4d4]'
                  )}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        )}

        {/* 4. Lista de Serviços (Cartões Compactos) */}
        <main className="space-y-3 flex-1">
          {loading ? (
            /* Skeleton Loading Suave */
            <div className="space-y-3 animate-pulse">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="w-full h-[76px] rounded-card bg-surface border border-line/60 p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3.5 flex-1">
                    <div className="w-12 h-12 rounded-[18px] bg-brand-tint/50" />
                    <div className="space-y-2 flex-1">
                      <div className="h-4 bg-line/60 rounded w-1/2" />
                      <div className="h-3 bg-line/40 rounded w-1/3" />
                    </div>
                  </div>
                  <div className="w-9 h-9 rounded-full bg-line/40" />
                </div>
              ))}
            </div>
          ) : filteredServices.length === 0 ? (
            /* Estado Vazio Acolhedor */
            <div className="w-full bg-surface rounded-card p-8 border border-line shadow-card text-center space-y-3 my-6">
              <div className="w-12 h-12 rounded-full bg-[#F6E4E4] text-brand border border-line/60 flex items-center justify-center mx-auto shadow-xs">
                <Sparkles size={22} strokeWidth={2} />
              </div>
              <h3 className="font-display text-[18px] font-semibold text-ink">
                Nenhum serviço encontrado
              </h3>
              <p className="font-sans text-[13px] text-ink-soft">
                Tente selecionar outra categoria ou buscar por outro termo.
              </p>
            </div>
          ) : (
            filteredServices.map((service) => {
              const selectedItem = selectedServices.find((s) => s.id === service.id);
              const isSelected = Boolean(selectedItem);
              return (
                <CartaoServico
                  key={service.id}
                  servico={selectedItem || service}
                  selecionado={isSelected}
                  onToggle={handleToggleService}
                />
              );
            })
          )}
        </main>
      </div>

      {/* 5. Barra Fixa Inferior: Resumo Total + Botão Continuar */}
      <footer className="fixed bottom-0 left-0 right-0 z-40 bg-surface/95 backdrop-blur-md border-t border-line/60 px-5 pt-3.5 pb-[calc(env(safe-area-inset-bottom,0px)+16px)] shadow-[0_-8px_24px_rgba(142,59,78,0.06)]">
        <div className="max-w-[420px] mx-auto w-full space-y-3">
          {/* Linha com Resumo de Quantidade/Tempo e Preço Total */}
          <div className="flex items-center justify-between">
            <span className="font-sans text-[14px] text-ink-soft font-medium">
              {selectedCount === 0
                ? 'Nenhum serviço selecionado'
                : selectedCount === 1
                ? `1 serviço · ${formattedDuration}`
                : `${selectedCount} serviços · ${formattedDuration}`}
            </span>
            <span className="font-display text-[24px] font-bold text-brand tracking-tight [font-feature-settings:'lnum'] tabular-nums">
              R$ {selectedCount === 0 ? '0' : totalPrice.toFixed(2).replace('.', ',').replace(',00', '')}
            </span>
          </div>

          {/* Botão Primário "Continuar →" */}
          <button
            type="button"
            onClick={handleContinue}
            disabled={selectedCount === 0}
            className={cn(
              'h-[52px] w-full rounded-full font-sans text-[16px] font-semibold flex items-center justify-center gap-2 transition-all duration-200 shadow-md',
              selectedCount > 0
                ? 'bg-brand text-white hover:opacity-95 active:scale-[0.99] cursor-pointer'
                : 'bg-line/80 text-ink-soft/60 cursor-not-allowed opacity-80'
            )}
          >
            <span>Continuar</span>
            <ArrowRight size={18} strokeWidth={2.4} />
          </button>
        </div>
      </footer>

      {/* Modal de Personalização Rosé (Variações & Extras - D12 P2) */}
      <ModalPersonalizarServico
        isOpen={isCustomizingModalOpen}
        onClose={() => setIsCustomizingModalOpen(false)}
        servico={customizingService}
        initialSelection={customizingInitial}
        onConfirm={handleConfirmCustomization}
        onRemove={handleRemoveCustomization}
      />
    </TelaCliente>
  );
};

export default AgendamentoServicos;
