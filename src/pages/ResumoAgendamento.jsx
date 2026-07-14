import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTenant } from '../context/TenantContext';
import { api } from '../lib/api';
import { useNotification } from '../context/NotificationProvider';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import RemanejarModal from '../components/admin/RemanejarModal';

const ResumoAgendamento = () => {
  const { tenant_slug, id } = useParams();
  const navigate = useNavigate();
  const { tenant } = useTenant();
  const { showError } = useNotification();

  const [agendamento, setAgendamento] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [isRemanejarModalOpen, setIsRemanejarModalOpen] = useState(false);

  const fetchAppointment = async () => {
    try {
      const data = await api.appointments.get(id);
      setAgendamento(data);
    } catch (err) {
      console.error(err);
      setError("Não foi possível carregar os detalhes deste agendamento.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchAppointment();
    }
  }, [id]);

  const handleUpdateStatus = async (newStatus) => {
    if (!id) return;
    setSaving(true);
    try {
      await api.appointments.update(id, { status: newStatus });
      await fetchAppointment();
    } catch (err) {
      console.error(err);
      showError("Erro ao atualizar o status do atendimento: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'in-progress': return 'bg-tertiary text-on-tertiary';
      case 'completed': return 'bg-[#2e7d32] text-white';
      case 'cancelled': return 'bg-error text-white';
      default: return 'bg-secondary text-on-secondary'; // scheduled
    }
  };

  const getStatusLabel = (status) => {
    switch (status?.toLowerCase()) {
      case 'in-progress': return 'Em andamento';
      case 'completed': return 'Concluído';
      case 'cancelled': return 'Cancelado';
      default: return 'Agendado'; // scheduled
    }
  };

  const formatDateTime = (isoString) => {
    if (!isoString) return '';
    try {
      const dateObj = parseISO(isoString);
      const dayStr = format(dateObj, "EEEE, dd 'de' MMMM", { locale: ptBR });
      const hourStr = format(dateObj, "HH:mm");
      const capitalizedDayStr = dayStr.charAt(0).toUpperCase() + dayStr.slice(1);
      return `${capitalizedDayStr} às ${hourStr}`;
    } catch (e) {
      return '';
    }
  };

  if (loading) {
    return (
      <div className="max-w-[800px] mx-auto py-lg flex flex-col items-center justify-center min-h-[300px]">
        <span className="material-symbols-outlined animate-spin text-primary text-4xl">progress_activity</span>
        <p className="text-secondary mt-2">Carregando detalhes do agendamento...</p>
      </div>
    );
  }

  if (error || !agendamento) {
    return (
      <div className="max-w-[800px] mx-auto py-lg px-container-margin md:px-0 text-center">
        <div className="bg-white rounded-2xl shadow-[0px_4px_20px_rgba(0,0,0,0.04)] p-xl border border-surface-variant/20 flex flex-col items-center">
          <span className="material-symbols-outlined text-error text-5xl mb-4">error</span>
          <h2 className="font-headline-md text-headline-md text-on-surface mb-2">Ops! Ocorreu um problema</h2>
          <p className="text-secondary mb-6">{error || 'Agendamento não encontrado.'}</p>
          <button 
            onClick={() => navigate(`/${tenant_slug}/staff/agenda-profissional`)}
            className="bg-primary text-on-primary px-xl py-sm rounded-lg font-bold hover:bg-on-primary-fixed-variant transition-colors"
          >
            Voltar para Agenda
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[800px] mx-auto py-lg px-container-margin md:px-0 animate-fade-in-up">
      {/* Header com botão de voltar */}
      <div className="flex items-center gap-4 mb-xl">
        <button 
          onClick={() => navigate(`/${tenant_slug}/staff/agenda-profissional`)}
          className="p-2 rounded-full hover:bg-surface-variant text-on-surface transition-colors flex items-center justify-center"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div>
          <h1 className="font-headline-md text-headline-md text-primary">Resumo do Agendamento</h1>
          <p className="font-body-md text-body-md text-secondary">Detalhes do atendimento</p>
        </div>
      </div>

      {/* Card Principal */}
      <div className="bg-surface-container-lowest rounded-2xl shadow-[0px_10px_30px_rgba(0,0,0,0.08)] p-md md:p-xl mb-xl border border-surface-variant/20">
        
        {/* Status Badge */}
        <div className="flex items-start mb-lg gap-4">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center text-xl font-bold shrink-0">
            {agendamento.client_name?.charAt(0).toUpperCase()}
          </div>
          <div className="flex flex-col items-start min-w-0 flex-1">
            <h2 className="font-headline-sm text-lg sm:text-headline-sm text-on-surface truncate w-full">{agendamento.client_name}</h2>
            <p className="font-body-md text-sm sm:text-body-md text-secondary mb-2">{agendamento.client_phone || 'Telefone não informado'}</p>
            <span className={`px-3 py-1 rounded-full font-label-sm text-[11px] sm:text-[12px] uppercase tracking-wider text-center w-fit ${getStatusColor(agendamento.status)}`}>
              {getStatusLabel(agendamento.status)}
            </span>
          </div>
        </div>

        <hr className="border-surface-variant mb-lg" />

        {/* Detalhes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-lg mb-xl">
          <div>
            <p className="font-label-sm text-label-sm text-secondary mb-1">Serviço</p>
            <p className="font-body-lg text-body-lg text-on-surface font-medium">{agendamento.service_name}</p>
            <p className="font-body-sm text-body-sm text-tertiary mt-1">Duração estimada: {agendamento.duration_minutes}m</p>
          </div>
          <div>
            <p className="font-label-sm text-label-sm text-secondary mb-1">Data e Horário</p>
            <p className="font-body-lg text-body-lg text-on-surface font-medium">{formatDateTime(agendamento.start_time)}</p>
          </div>
          <div>
            <p className="font-label-sm text-label-sm text-secondary mb-1">Profissional</p>
            <p className="font-body-lg text-body-lg text-on-surface font-medium">{agendamento.staff_name}</p>
          </div>
          <div>
            <p className="font-label-sm text-label-sm text-secondary mb-1">Valor</p>
            <p className="font-body-lg text-body-lg text-primary font-medium">
              {Number(agendamento.total_price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
          </div>
        </div>

        {/* Ações */}
        <div className="flex flex-col sm:flex-row gap-4 mt-xl">
          {agendamento.status === 'scheduled' && (
            <>
              <button 
                disabled={saving}
                onClick={() => handleUpdateStatus('in-progress')}
                className="flex-1 bg-secondary text-on-secondary px-6 py-3 rounded-xl font-label-lg text-label-lg hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2 shadow-sm"
              >
                <span className="material-symbols-outlined">play_arrow</span>
                {saving ? 'Iniciando...' : 'Iniciar Atendimento'}
              </button>
              
              <button 
                disabled={saving}
                onClick={() => setIsRemanejarModalOpen(true)}
                className="flex-1 bg-surface-container-high text-on-surface px-6 py-3 rounded-xl font-label-lg text-label-lg hover:bg-surface-variant disabled:opacity-50 transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                <span className="material-symbols-outlined">edit_calendar</span>
                Remanejar Horário
              </button>
            </>
          )}
          {agendamento.status === 'in-progress' && (
            <button 
              disabled={saving}
              onClick={() => handleUpdateStatus('completed')}
              className="flex-1 bg-primary text-on-primary px-6 py-3 rounded-xl font-label-lg text-label-lg hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2 shadow-sm"
            >
              <span className="material-symbols-outlined">check_circle</span>
              {saving ? 'Finalizando...' : 'Finalizar Atendimento'}
            </button>
          )}
          
          <Link 
            to={`/${tenant_slug}/staff/ficha-cliente/${agendamento.client_id}`}
            className="flex-1 border-2 border-primary text-primary px-6 py-3 rounded-xl font-label-lg text-label-lg hover:bg-primary hover:text-on-primary transition-all flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined">assignment_ind</span>
            Ver Ficha do Cliente
          </Link>
        </div>
        
      </div>

      <RemanejarModal 
        isOpen={isRemanejarModalOpen}
        onClose={() => setIsRemanejarModalOpen(false)}
        agendamento={agendamento}
        onSuccess={() => {
          setIsRemanejarModalOpen(false);
          fetchAppointment(); // Recarrega os dados com a nova data/profissional
        }}
      />
      
    </div>
  );
};

export default ResumoAgendamento;
