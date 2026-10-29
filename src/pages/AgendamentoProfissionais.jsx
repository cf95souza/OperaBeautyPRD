import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ChevronLeft, Sparkles, Check, ArrowRight, Star } from 'lucide-react';
import { useTenant } from '../context/TenantContext';
import { useBooking } from '../context/BookingContext';
import { api } from '../lib/api';
import { TelaCliente } from '../components/ui/TelaCliente';
import CartaoProfissional from '../components/ui/CartaoProfissional';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const AgendamentoProfissionais = () => {
  const { tenant_slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { tenant } = useTenant();
  const { bookingData, updateBooking } = useBooking();

  const [dbStaff, setDbStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStaff, setSelectedStaff] = useState(() => bookingData.professional || null);
  const [autoProcessed, setAutoProcessed] = useState(false);

  useEffect(() => {
    if (!tenant) return;
    let isMounted = true;
    const fetchStaff = async () => {
      setLoading(true);
      try {
        const data = await api.staff.list(tenant.id);
        if (isMounted && data) {
          setDbStaff(data.filter((s) => s.is_active));
        }
      } catch (err) {
        console.error('Erro ao carregar profissionais:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchStaff();
    return () => {
      isMounted = false;
    };
  }, [tenant]);

  // Filtra profissionais capacitados para os serviços selecionados
  const filteredStaff = useMemo(() => {
    const selectedServiceIds = [];
    if (bookingData.services && bookingData.services.length > 0) {
      bookingData.services.forEach((s) => selectedServiceIds.push(s.id));
    } else if (bookingData.service?.id) {
      selectedServiceIds.push(bookingData.service.id);
    }

    if (selectedServiceIds.length === 0) return dbStaff;

    return dbStaff.filter((staff) => {
      if (!staff.service_ids || staff.service_ids.length === 0) return true;
      return selectedServiceIds.every((sId) => staff.service_ids.includes(sId));
    });
  }, [dbStaff, bookingData.services, bookingData.service]);

  // Se veio com profissional pré-selecionado via state
  useEffect(() => {
    if (!autoProcessed && dbStaff.length > 0 && location.state?.preselectedStaffId) {
      const staff = dbStaff.find((s) => s.id === location.state.preselectedStaffId);
      if (staff) {
        setSelectedStaff(staff);
        updateBooking('professional', staff);
        setAutoProcessed(true);
        navigate(`/${tenant_slug}/agendar/horarios`);
      }
    }
  }, [dbStaff, location.state, autoProcessed, navigate, tenant_slug, updateBooking]);

  const handleSelectStaff = (staff) => {
    setSelectedStaff(staff);
    updateBooking('professional', staff);
    navigate(`/${tenant_slug}/agendar/horarios`);
  };

  const handleSelectAny = () => {
    setSelectedStaff({ id: 'any', name: 'Qualquer profissional' });
    updateBooking('professional', { id: 'any', name: 'Qualquer profissional' });
    navigate(`/${tenant_slug}/agendar/horarios`);
  };

  const handleContinue = () => {
    if (selectedStaff) {
      updateBooking('professional', selectedStaff.id === 'any' ? { id: 'any', name: 'Qualquer profissional' } : selectedStaff);
    } else {
      updateBooking('professional', { id: 'any', name: 'Qualquer profissional' });
    }
    navigate(`/${tenant_slug}/agendar/horarios`);
  };

  const isAnySelected = !selectedStaff || selectedStaff?.id === 'any';

  return (
    <TelaCliente temBarraFixaInferior className="selection:bg-brand-tint selection:text-brand">
      {/* Container Centralizado Padrão Mobile */}
      <div className="w-full max-w-[420px] mx-auto px-5 pt-3 flex-1 flex flex-col pb-8">
        {/* 1. Topo do Fluxo: Botão Voltar + Barra de Progresso + Etapa 2 de 4 */}
        <header className="flex items-center justify-between gap-3 pt-1 pb-4">
          <button
            type="button"
            onClick={() => navigate(`/${tenant_slug}/agendar/servicos`)}
            className="w-10 h-10 rounded-full border border-line bg-surface text-ink flex items-center justify-center hover:bg-brand-tint/30 transition-all active:scale-95 shadow-xs shrink-0 cursor-pointer"
            aria-label="Voltar para a seleção de serviços"
          >
            <ChevronLeft size={20} strokeWidth={2.4} />
          </button>

          {/* Barra de Progresso Rosé Editorial (Etapa 2 de 4 = 50%) */}
          <div className="flex-1 h-1.5 bg-[#EADFDC] rounded-full overflow-hidden mx-1.5">
            <div
              className="h-full bg-brand rounded-full transition-all duration-300"
              style={{ width: '50%' }}
            />
          </div>

          <span className="font-sans text-[13px] font-semibold text-ink-soft shrink-0">
            2 de 4
          </span>
        </header>

        {/* 2. Título da Tela */}
        <section className="pt-2 pb-2 text-left">
          <h1 className="font-display text-[28px] font-semibold text-ink leading-tight tracking-tight">
            Escolha a profissional
          </h1>
          <p className="font-sans text-[14px] text-ink-soft mt-1">
            Selecione uma especialista ou escolha a primeira vaga livre.
          </p>
        </section>

        {/* 3. Card Destaque: Qualquer Profissional (D5 P1) */}
        <section className="my-3">
          <div
            role="button"
            tabIndex={0}
            onClick={handleSelectAny}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleSelectAny();
              }
            }}
            className={cn(
              'group relative flex items-center justify-between p-4 rounded-[22px] border transition-all duration-200 select-none cursor-pointer',
              isAnySelected
                ? 'border-brand ring-2 ring-brand/15 shadow-premium bg-brand-tint/15'
                : 'bg-white border-line/70 hover:border-brand/40 hover:shadow-card shadow-xs active:scale-[0.99]'
            )}
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div
                className={cn(
                  'w-12 h-12 rounded-full flex items-center justify-center shrink-0 transition-colors shadow-xs',
                  isAnySelected
                    ? 'bg-brand text-white'
                    : 'bg-[#F6E4E4] text-brand group-hover:bg-brand-tint'
                )}
              >
                <Sparkles size={22} className="stroke-[2.2]" />
              </div>

              <div className="flex flex-col min-w-0 text-left">
                <div className="flex items-center gap-2">
                  <h4 className="text-[16px] font-bold text-ink truncate group-hover:text-brand transition-colors">
                    Qualquer profissional
                  </h4>
                  <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider text-brand bg-brand-tint/80 px-2 py-0.5 rounded-full border border-brand/20">
                    Mais rápido
                  </span>
                </div>
                <p className="text-[13px] text-ink-soft truncate font-sans mt-0.5">
                  Primeiro horário livre com a equipe
                </p>
              </div>
            </div>

            <div className="shrink-0 ml-3">
              <div
                className={cn(
                  'w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200',
                  isAnySelected
                    ? 'bg-brand text-white shadow-sm ring-2 ring-brand/20'
                    : 'border border-line/80 text-ink-soft group-hover:border-brand/40 group-hover:text-brand'
                )}
              >
                {isAnySelected ? (
                  <Check className="w-4 h-4 stroke-[2.5]" />
                ) : (
                  <span className="text-[13px] font-medium">+</span>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Separador Editorial */}
        <div className="relative flex py-2 items-center">
          <div className="flex-grow border-t border-line/60"></div>
          <span className="flex-shrink mx-3 text-[11px] font-bold uppercase tracking-wider text-ink-soft/70">
            ou escolha por preferência
          </span>
          <div className="flex-grow border-t border-line/60"></div>
        </div>

        {/* 4. Lista de Profissionais Habilitados */}
        <main className="space-y-3 flex-1 mt-2">
          {loading ? (
            <div className="space-y-3 animate-pulse">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-[76px] rounded-[22px] bg-line/40" />
              ))}
            </div>
          ) : filteredStaff.length === 0 ? (
            <div className="w-full bg-surface rounded-[22px] p-6 border border-line shadow-card text-center space-y-2 my-4">
              <p className="font-sans text-[14px] text-ink-soft">
                Nenhum profissional cadastrado para os serviços selecionados.
              </p>
            </div>
          ) : (
            filteredStaff.map((staff) => {
              const isSelected = selectedStaff?.id === staff.id;
              return (
                <CartaoProfissional
                  key={staff.id}
                  id={staff.id}
                  nome={staff.name}
                  especialidade={staff.role === 'manager' ? 'Especialista Sênior' : 'Profissional'}
                  nota={5.0}
                  selecionado={isSelected}
                  aoSelecionar={() => handleSelectStaff(staff)}
                />
              );
            })
          )}
        </main>
      </div>

      {/* 5. Barra Fixa Inferior */}
      <footer className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-line px-5 py-3 safe-area-bottom shadow-lg">
        <div className="w-full max-w-[420px] mx-auto flex items-center justify-between gap-3">
          <div className="text-left min-w-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-ink-soft block">
              Profissional
            </span>
            <span className="text-[14px] font-bold text-ink truncate block">
              {selectedStaff ? selectedStaff.name : 'Qualquer profissional'}
            </span>
          </div>

          <button
            type="button"
            onClick={handleContinue}
            className="h-[52px] px-6 rounded-full bg-brand text-white font-sans text-[15px] font-semibold flex items-center justify-center gap-2 hover:bg-brand-hover transition-all active:scale-98 shadow-sm cursor-pointer shrink-0"
          >
            <span>Ver horários</span>
            <ArrowRight size={18} strokeWidth={2.2} />
          </button>
        </div>
      </footer>
    </TelaCliente>
  );
};

export default AgendamentoProfissionais;
