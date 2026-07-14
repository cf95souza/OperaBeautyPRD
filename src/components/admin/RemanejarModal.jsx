import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { useTenant } from '../../context/TenantContext';
import { format, parseISO } from 'date-fns';

const RemanejarModal = ({ isOpen, onClose, agendamento, onSuccess }) => {
  const { tenant } = useTenant();
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [staffList, setStaffList] = useState([]);
  
  const [selectedStaff, setSelectedStaff] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [isClosed, setIsClosed] = useState(false);

  // Inicializar com os dados atuais do agendamento
  useEffect(() => {
    if (isOpen && agendamento) {
      setSelectedStaff(agendamento.staff_id);
      if (agendamento.start_time) {
        const dateObj = parseISO(agendamento.start_time);
        setSelectedDate(format(dateObj, 'yyyy-MM-dd'));
      }
      setSelectedTime('');
      fetchStaff();
    }
  }, [isOpen, agendamento]);

  const fetchStaff = async () => {
    if (!tenant?.id) return;
    try {
      const data = await api.staff.list(tenant.id);
      // Filtrar apenas ativos
      setStaffList(data.filter(s => s.is_active));
    } catch (err) {
      console.error('Erro ao buscar equipe:', err);
    }
  };

  // Carregar slots quando staff ou data mudar
  useEffect(() => {
    if (isOpen && selectedStaff && selectedDate && tenant?.id) {
      fetchSlots();
    } else {
      setSlots([]);
    }
  }, [selectedStaff, selectedDate, isOpen, tenant]);

  const fetchSlots = async () => {
    setLoadingSlots(true);
    try {
      // 1. Fetch occupied slots
      const apptData = await api.appointments.getOccupiedSlots(
        tenant.id, 
        selectedDate, 
        selectedStaff
      );
      
      let bookedTimes = [];
      if (apptData) {
        bookedTimes = apptData
          // Ignorar o agendamento atual para permitir manter o mesmo horário se quiser
          .filter(app => app.id !== agendamento.id)
          .map(app => {
            const dt = new Date(app.start_time);
            return `${dt.getHours().toString().padStart(2, '0')}:${dt.getMinutes().toString().padStart(2, '0')}`;
          });
      }

      // 2. Fetch Business Hours & Exceptions
      const [bhRes, exRes] = await Promise.all([
        api.settings.getBusinessHours(tenant.id),
        api.settings.getExceptions(tenant.id)
      ]);

      let startHour = 8;
      let endHour = 19;
      let isClosedDay = false;

      const dateObj = new Date(selectedDate + 'T00:00:00');
      const dow = dateObj.getDay();

      if (bhRes && Array.isArray(bhRes)) {
        const dayConfig = bhRes.find(d => d.day_of_week === dow);
        if (dayConfig) {
          if (dayConfig.is_closed) {
            isClosedDay = true;
          } else if (dayConfig.open_time && dayConfig.close_time) {
            startHour = parseInt(dayConfig.open_time.split(':')[0], 10);
            endHour = parseInt(dayConfig.close_time.split(':')[0], 10) - 1; 
          }
        }
      }

      if (exRes && Array.isArray(exRes)) {
        const exception = exRes.find(e => e.exception_date && String(e.exception_date).startsWith(selectedDate));
        if (exception) {
          if (exception.is_closed) {
            isClosedDay = true;
          } else if (exception.open_time && exception.close_time) {
            isClosedDay = false;
            startHour = parseInt(exception.open_time.split(':')[0], 10);
            endHour = parseInt(exception.close_time.split(':')[0], 10) - 1;
          }
        }
      }

      setIsClosed(isClosedDay);

      const allSlots = [];
      if (!isClosedDay) {
        for (let i = startHour; i <= endHour; i++) {
          const slotStr = `${i.toString().padStart(2, '0')}:00`;
          allSlots.push({
            time: slotStr,
            isBooked: bookedTimes.includes(slotStr)
          });
        }
      }

      setSlots(allSlots);
      // Limpa a seleção de horário se mudar a data ou prof
      setSelectedTime('');

    } catch (err) {
      console.error("Erro ao carregar horários", err);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleSave = async () => {
    if (!selectedStaff || !selectedDate || !selectedTime) return;

    setSaving(true);
    try {
      const newStartTime = new Date(`${selectedDate}T${selectedTime}:00-03:00`); // Assumindo UTC-3 ou timezone local
      
      await api.appointments.update(agendamento.id, {
        staff_id: selectedStaff,
        start_time: newStartTime.toISOString()
      });
      
      onSuccess();
    } catch (err) {
      console.error(err);
      alert('Erro ao remanejar agendamento: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 animate-fade-in">
      <div className="bg-surface rounded-2xl shadow-xl w-full max-w-md flex flex-col max-h-[90vh]">
        <div className="p-xl border-b border-surface-variant flex justify-between items-center bg-surface-container-lowest rounded-t-2xl">
          <h2 className="font-headline-sm text-headline-sm text-primary">Remanejar Agendamento</h2>
          <button onClick={onClose} className="text-secondary hover:text-on-surface transition-colors p-2">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-xl overflow-y-auto flex-1">
          <p className="text-secondary mb-lg">
            Escolha um novo profissional, data e horário para o serviço de <strong className="text-on-surface">{agendamento?.service_name}</strong>.
          </p>

          <div className="space-y-md">
            <div>
              <label className="block font-label-md text-label-md text-on-surface mb-2">Profissional</label>
              <select
                value={selectedStaff}
                onChange={(e) => setSelectedStaff(e.target.value)}
                className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-4 py-3 text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              >
                <option value="">Selecione...</option>
                {staffList.map(staff => (
                  <option key={staff.id} value={staff.id}>{staff.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-label-md text-label-md text-on-surface mb-2">Nova Data</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-4 py-3 text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block font-label-md text-label-md text-on-surface">Horário Disponível</label>
                {loadingSlots && <span className="material-symbols-outlined animate-spin text-primary text-[18px]">progress_activity</span>}
              </div>

              {selectedDate && selectedStaff ? (
                isClosed ? (
                  <div className="p-4 bg-surface-variant rounded-lg text-center text-secondary text-sm">
                    Salão fechado nesta data.
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-2">
                    {slots.map((slot) => (
                      <button
                        key={slot.time}
                        disabled={slot.isBooked}
                        onClick={() => setSelectedTime(slot.time)}
                        className={`p-2 rounded-lg text-sm font-medium transition-all ${
                          slot.isBooked 
                            ? 'bg-surface-variant text-secondary opacity-50 cursor-not-allowed'
                            : selectedTime === slot.time
                              ? 'bg-primary text-on-primary'
                              : 'bg-surface-container-lowest border border-outline-variant text-on-surface hover:border-primary'
                        }`}
                      >
                        {slot.time}
                      </button>
                    ))}
                    {slots.length === 0 && !loadingSlots && (
                      <div className="col-span-4 p-4 text-center text-secondary text-sm">
                        Nenhum horário configurado para este dia.
                      </div>
                    )}
                  </div>
                )
              ) : (
                <div className="p-4 border border-dashed border-outline-variant rounded-lg text-center text-secondary text-sm">
                  Selecione profissional e data para ver os horários.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-xl border-t border-surface-variant bg-surface-container-lowest flex justify-end gap-md rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 rounded-full font-label-lg text-label-lg text-secondary hover:bg-surface-variant transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !selectedTime || !selectedDate || !selectedStaff}
            className="px-6 py-2 rounded-full font-label-lg text-label-lg bg-primary text-on-primary hover:opacity-90 disabled:opacity-50 transition-all flex items-center gap-2 shadow-sm"
          >
            {saving ? (
              <>
                <span className="material-symbols-outlined animate-spin text-[20px]">sync</span>
                Salvando...
              </>
            ) : (
              'Confirmar Remanejamento'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RemanejarModal;
