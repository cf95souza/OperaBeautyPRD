import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Calendar, Check, Copy, CheckCheck, Clock, AlertTriangle, Sparkles, QrCode } from 'lucide-react';
import { useTenant } from '../context/TenantContext';
import { useBooking } from '../context/BookingContext';
import { TelaCliente } from '../components/ui/TelaCliente';
import { api } from '../lib/api';

// Helper para converter VAPID key pública para Uint8Array
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Formatar data para exibição (Ex: "quarta, 28 de outubro")
function formatDataSubtitulo(dateStr) {
  if (!dateStr) return 'em breve';
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day, 12, 0, 0);
    const diaSem = date.toLocaleDateString('pt-BR', { weekday: 'long' });
    const mes = date.toLocaleDateString('pt-BR', { month: 'long' });
    return `${diaSem.toLowerCase()}, ${day} de ${mes.toLowerCase()}`;
  } catch (e) {
    return dateStr;
  }
}

// Formatar duração em minutos para formato legível (Ex: 90 -> "1h30")
function formatDuration(minutes) {
  if (!minutes) return '1h';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h}h${m.toString().padStart(2, '0')}`;
  if (h > 0) return `${h}h`;
  return `${m} min`;
}

const AgendamentoConfirmado = () => {
  const { tenant_slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { tenant, session } = useTenant();
  const { bookingData, clearBooking } = useBooking();

  // Dados recebidos via navegação
  const appointmentId = location.state?.appointmentId;
  const initialDepositData = location.state?.depositData;

  const [reminderActive, setReminderActive] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');

  // Estado unificado do Sinal PIX (D3)
  const [depositState, setDepositState] = useState(() => {
    if (initialDepositData && initialDepositData.requiresDeposit) {
      return {
        requiresDeposit: true,
        status: initialDepositData.depositStatus || 'pending',
        amount: initialDepositData.depositAmount || initialDepositData.amount,
        pixCode: initialDepositData.depositPixCode || initialDepositData.pixCode,
        pixQr: initialDepositData.depositPixQr || initialDepositData.pixQr,
        expiresAt: initialDepositData.depositExpiresAt || initialDepositData.expiresAt,
        provider: initialDepositData.depositProvider || initialDepositData.provider
      };
    }
    return {
      requiresDeposit: false,
      status: 'paid', // Sem sinal exigido = aprovado diretamente
      amount: 0,
      pixCode: '',
      pixQr: '',
      expiresAt: null,
      provider: ''
    };
  });

  // Disparo festivo de confetes com a paleta Rosé Editorial
  const triggerConfetti = useCallback(() => {
    const colors = ['#8E3B4E', '#F6E4E4', '#C9A66B', '#B76E79', '#FAF6F0'];
    const confettiCount = 35;

    for (let i = 0; i < confettiCount; i++) {
      const confetti = document.createElement('div');
      confetti.style.position = 'fixed';
      confetti.style.width = Math.random() * 7 + 4 + 'px';
      confetti.style.height = confetti.style.width;
      confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      confetti.style.left = Math.random() * 100 + 'vw';
      confetti.style.top = '-10px';
      confetti.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
      confetti.style.zIndex = '999';
      confetti.style.opacity = (Math.random() * 0.7 + 0.3).toString();
      document.body.appendChild(confetti);

      const duration = Math.random() * 2.5 + 2;
      const destinationY = window.innerHeight + 20;
      const destinationX = (Math.random() - 0.5) * 160;

      confetti
        .animate(
          [
            { transform: 'translate(0, 0) rotate(0deg)', opacity: 1 },
            {
              transform: `translate(${destinationX}px, ${destinationY}px) rotate(${
                Math.random() * 360
              }deg)`,
              opacity: 0
            }
          ],
          {
            duration: duration * 1000,
            easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
          }
        )
        .onfinish = () => confetti.remove();
    }
  }, []);

  // Se não exigir sinal, dispara confetes imediatamente no carregamento inicial
  useEffect(() => {
    if (!depositState.requiresDeposit || depositState.status === 'paid') {
      triggerConfetti();
    }
  }, [depositState.requiresDeposit, depositState.status, triggerConfetti]);

  // Contagem regressiva do PIX (15 minutos padrão)
  useEffect(() => {
    if (!depositState.expiresAt || depositState.status !== 'pending') return;

    const updateTimer = () => {
      const now = new Date().getTime();
      const expiry = new Date(depositState.expiresAt).getTime();
      const diff = expiry - now;

      if (diff <= 0) {
        setTimeLeft('00:00');
        setDepositState((prev) => ({ ...prev, status: 'expired' }));
      } else {
        const mins = Math.floor(diff / 60000);
        const secs = Math.floor((diff % 60000) / 1000);
        setTimeLeft(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
      }
    };

    updateTimer();
    const timerInterval = setInterval(updateTimer, 1000);
    return () => clearInterval(timerInterval);
  }, [depositState.expiresAt, depositState.status]);

  // Polling em tempo real para detecção automática de pagamento aprovado
  useEffect(() => {
    if (!appointmentId || !depositState.requiresDeposit || depositState.status !== 'pending') {
      return;
    }

    let isMounted = true;
    const interval = setInterval(async () => {
      try {
        const res = await api.payments.getDepositStatus(appointmentId);
        if (res && isMounted) {
          if (res.depositStatus === 'paid' && depositState.status !== 'paid') {
            setDepositState((prev) => ({
              ...prev,
              status: 'paid',
              paidAt: res.depositPaidAt
            }));
            triggerConfetti();
          } else if (res.depositStatus === 'expired' && depositState.status !== 'expired') {
            setDepositState((prev) => ({
              ...prev,
              status: 'expired'
            }));
          }
        }
      } catch (err) {
        console.warn('Verificação de sinal em segundo plano:', err);
      }
    }, 4000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [appointmentId, depositState.requiresDeposit, depositState.status, triggerConfetti]);

  // Copiar código Copia-e-Cola do PIX
  const handleCopyPix = async () => {
    if (!depositState.pixCode) return;
    try {
      await navigator.clipboard.writeText(depositState.pixCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (e) {
      const textArea = document.createElement('textarea');
      textArea.value = depositState.pixCode;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  // Simular Pagamento Aprovado (Exclusivo para Sandbox / Desenvolvimento Local)
  const handleSimulatePayment = async () => {
    if (!appointmentId || simulating) return;
    setSimulating(true);
    try {
      await api.payments.simulatePaid(appointmentId);
      setDepositState((prev) => ({
        ...prev,
        status: 'paid'
      }));
      triggerConfetti();
    } catch (err) {
      alert('Erro ao simular pagamento: ' + (err.message || 'Verifique o servidor.'));
    } finally {
      setSimulating(false);
    }
  };

  // Armazena cópia local dos dados do agendamento para exibição antes do clearBooking
  const confirmedData = useMemo(() => {
    return {
      serviceName:
        bookingData.service?.name ||
        (bookingData.services && bookingData.services.map((s) => s.name).join(' + ')) ||
        'Corte + Escova',
      professionalName:
        location.state?.assignedStaffName ||
        (bookingData.professional?.id === 'any'
          ? (bookingData.professional?.name !== 'Qualquer profissional' ? bookingData.professional?.name : 'Profissional Designado')
          : (bookingData.professional?.name || 'Profissional Designado')),
      durationMinutes:
        bookingData.service?.duration ||
        (bookingData.services &&
          bookingData.services.reduce(
            (acc, s) => acc + parseInt(s.duration_minutes || s.duration || 30, 10),
            0
          )) ||
        90,
      totalPrice:
        bookingData.service?.price ||
        (bookingData.services &&
          bookingData.services.reduce((acc, s) => acc + parseFloat(s.price || 0), 0)) ||
        95,
      date: bookingData.date || new Date().toISOString().split('T')[0],
      time: bookingData.time || '11:00'
    };
  }, [bookingData]);

  // Primeiro nome do cliente
  const clientName = useMemo(() => {
    if (session?.name) {
      return session.name.split(' ')[0];
    }
    return 'você';
  }, [session]);

  // Ir para os agendamentos / agenda
  const handleViewAppointments = () => {
    clearBooking();
    navigate(`/${tenant_slug}/historico`);
  };

  // Gerador de arquivo .ics para Google Calendar, Apple Calendar, Outlook
  const handleAddToCalendar = () => {
    if (!confirmedData.date || !confirmedData.time) return;

    const startDateTime = new Date(`${confirmedData.date}T${confirmedData.time}:00`);
    const duration = confirmedData.durationMinutes || 60;
    const endDateTime = new Date(startDateTime.getTime() + duration * 60000);

    const pad = (n) => (n < 10 ? '0' + n : n);
    const formatToLocalICSString = (date) => {
      return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}T${pad(
        date.getHours()
      )}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
    };

    const startICS = formatToLocalICSString(startDateTime);
    const endICS = formatToLocalICSString(endDateTime);

    const title = `${confirmedData.serviceName} no ${tenant?.name || 'Salão'}`;
    const description = `Agendamento de ${confirmedData.serviceName} com ${confirmedData.professionalName}. Te esperamos!`;
    const location = `${tenant?.name || 'Salão de Beleza'}`;

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//OperaBeauty//Agendamento//PT',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `DTSTART:${startICS}`,
      `DTEND:${endICS}`,
      `SUMMARY:${title}`,
      `DESCRIPTION:${description}`,
      `LOCATION:${location}`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `agendamento_${tenant_slug || 'operabeauty'}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Ativação de lembrete push notification (D1)
  const handleToggleReminder = async () => {
    if (reminderActive || subscribing) return;

    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setReminderActive(true);
      return;
    }

    try {
      setSubscribing(true);
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        alert('Por favor, autorize notificações no navegador para receber os lembretes.');
        setSubscribing(false);
        return;
      }

      // 1. Obter VAPID key pública do backend
      const res = await api.notifications.getVapidPublicKey();
      const publicKey = res?.publicKey;
      if (!publicKey) {
        setReminderActive(true);
        setSubscribing(false);
        return;
      }

      // 2. Registrar/obter Service Worker
      const convertedVapidKey = urlBase64ToUint8Array(publicKey);
      const registration = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      // 3. Assinar Push no navegador
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey,
      });

      // 4. Salvar assinatura no backend vinculada ao cliente
      await api.notifications.subscribe(subscription);
      setReminderActive(true);
    } catch (e) {
      console.warn('Fallback ao registrar push notification:', e);
      setReminderActive(true);
    } finally {
      setSubscribing(false);
    }
  };

  const isDepositPending = depositState.requiresDeposit && depositState.status === 'pending';
  const isDepositExpired = depositState.requiresDeposit && depositState.status === 'expired';

  return (
    <TelaCliente fundo="bg-bg" containerClassName="justify-center items-center px-5 py-8" className="selection:bg-brand-tint selection:text-brand">
      {/* Container Centralizado Rosé Editorial */}
      <div className="w-full max-w-[390px] flex flex-col items-center">
        
        {/* ======================================================== */}
        {/* ESTADO 1: AGENDAMENTO AGUARDANDO SINAL PIX (D3 PENDENTE) */}
        {/* ======================================================== */}
        {isDepositPending && (
          <div className="w-full flex flex-col items-center animate-fade-in">
            {/* Ícone de Relógio com Pulso Rosé */}
            <div className="w-[112px] h-[112px] rounded-full bg-brand-tint flex items-center justify-center transition-transform duration-500 scale-100 mb-6 relative">
              <div className="w-[72px] h-[72px] rounded-full bg-brand flex items-center justify-center text-white shadow-xs">
                <Clock size={36} strokeWidth={2.6} className="animate-pulse" />
              </div>
              {timeLeft && (
                <span className="absolute -bottom-2 bg-ink text-surface text-[11px] font-bold px-3 py-1 rounded-full shadow-sm">
                  {timeLeft}
                </span>
              )}
            </div>

            {/* Título e Subtítulo */}
            <h1 className="font-serif text-[30px] font-bold text-ink text-center tracking-tight leading-tight">
              Quase lá, {clientName}!
            </h1>
            <p className="text-sm text-ink-soft text-center mt-2 leading-snug">
              Pague o sinal via PIX para garantir sua vaga na agenda. O horário fica reservado por até 15 minutos.
            </p>

            {/* Cartão de Cobrança PIX */}
            <div className="w-full bg-surface rounded-[24px] border border-brand/30 shadow-sm p-6 my-5 space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-line/60">
                <span className="text-sm text-ink-soft font-medium">Sinal antecipado</span>
                <span className="font-serif text-2xl font-bold text-brand tabular-nums">
                  R$ {Number(depositState.amount || 0).toFixed(2).replace('.', ',')}
                </span>
              </div>

              {/* QR Code PIX (se fornecido em imagem/base64) */}
              {depositState.pixQr ? (
                <div className="flex flex-col items-center justify-center py-2">
                  <div className="p-3 bg-white border border-line rounded-2xl shadow-xs">
                    <img
                      src={depositState.pixQr}
                      alt="QR Code PIX para pagamento de sinal"
                      className="w-48 h-48 object-contain"
                    />
                  </div>
                  <span className="text-[11px] text-ink-soft mt-2 flex items-center gap-1">
                    <QrCode size={13} />
                    Abra o app do seu banco e escaneie o código
                  </span>
                </div>
              ) : null}

              {/* Chave Copia-e-Cola */}
              {depositState.pixCode && (
                <div className="space-y-2 pt-1">
                  <label className="text-xs font-semibold text-ink-soft block">
                    Código Copia-e-Cola PIX
                  </label>
                  <div className="p-3 bg-bg rounded-xl border border-line/70 text-xs font-mono text-ink break-all select-all max-h-24 overflow-y-auto leading-relaxed">
                    {depositState.pixCode}
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyPix}
                    className="w-full h-11 rounded-full bg-brand-tint text-brand font-semibold text-sm hover:bg-brand hover:text-white active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <CheckCheck size={18} className="text-green-600" />
                        <span>Código PIX Copiado! ✓</span>
                      </>
                    ) : (
                      <>
                        <Copy size={17} />
                        <span>Copiar código PIX</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Status do Polling */}
              <div className="flex items-center justify-center gap-2 pt-2 text-xs text-ink-soft">
                <span className="w-2.5 h-2.5 rounded-full bg-brand animate-ping" />
                <span>Aguardando confirmação do banco...</span>
              </div>

              {/* Botão de Homologação / Simulação no Sandbox */}
              <div className="pt-2 border-t border-line/40 text-center">
                <button
                  type="button"
                  onClick={handleSimulatePayment}
                  disabled={simulating}
                  className="text-xs text-brand/80 hover:text-brand font-medium hover:underline inline-flex items-center gap-1 cursor-pointer py-1"
                >
                  <Sparkles size={13} />
                  <span>{simulating ? 'Confirmando...' : '⚡ Simular Pagamento Aprovado'}</span>
                </button>
              </div>
            </div>

            {/* Botão Secundário de Consulta */}
            <button
              type="button"
              onClick={handleViewAppointments}
              className="w-full h-[48px] rounded-full border border-line text-ink-soft hover:text-ink font-medium text-sm transition-all flex items-center justify-center cursor-pointer mt-2"
            >
              <span>Ver agendamento pendente</span>
            </button>
          </div>
        )}

        {/* ======================================================== */}
        {/* ESTADO 2: SINAL EXPIRADO (HORÁRIO LIBERADO)              */}
        {/* ======================================================== */}
        {isDepositExpired && (
          <div className="w-full flex flex-col items-center animate-fade-in">
            <div className="w-[112px] h-[112px] rounded-full bg-rose-50 flex items-center justify-center mb-6">
              <div className="w-[72px] h-[72px] rounded-full bg-rose-600 flex items-center justify-center text-white shadow-xs">
                <AlertTriangle size={36} strokeWidth={2.4} />
              </div>
            </div>

            <h1 className="font-serif text-[30px] font-bold text-ink text-center tracking-tight leading-tight">
              Tempo esgotado
            </h1>
            <p className="text-base text-ink-soft text-center mt-2 leading-snug">
              O prazo de 15 minutos para pagamento do sinal encerrou e o horário foi liberado para a agenda do salão.
            </p>

            <div className="w-full bg-surface rounded-[24px] border border-line/70 p-5 my-6 text-sm text-ink-soft text-center leading-relaxed">
              Você pode iniciar uma nova reserva agora mesmo e garantir outro horário disponível.
            </div>

            <button
              type="button"
              onClick={() => {
                clearBooking();
                navigate(`/${tenant_slug}/agendar/servicos`);
              }}
              className="w-full h-[52px] rounded-full bg-brand text-white font-medium text-base hover:opacity-95 active:scale-[0.98] transition-all flex items-center justify-center shadow-sm cursor-pointer"
            >
              <span>Escolher outro horário</span>
            </button>
          </div>
        )}

        {/* ======================================================== */}
        {/* ESTADO 3: CONFIRMADO / SINAL PAGO (FLUXO FINAL FELIZ)    */}
        {/* ======================================================== */}
        {!isDepositPending && !isDepositExpired && (
          <div className="w-full flex flex-col items-center animate-fade-in">
            {/* 1. Círculo de Checkmark com Animação Suave */}
            <div className="w-[112px] h-[112px] rounded-full bg-brand-tint flex items-center justify-center transition-transform duration-500 scale-100 mb-6">
              <div className="w-[72px] h-[72px] rounded-full bg-brand flex items-center justify-center text-white shadow-xs">
                <Check size={36} strokeWidth={3} className="animate-fade-in" />
              </div>
            </div>

            {/* 2. Título Principal em Playfair Display */}
            <h1 className="font-serif text-[32px] font-bold text-ink text-center tracking-tight leading-tight">
              Tudo certo, {clientName}!
            </h1>

            {/* 3. Subtítulo Editorial */}
            <p className="text-base text-ink-soft text-center mt-2 leading-snug">
              Te esperamos {formatDataSubtitulo(confirmedData.date)}, às {confirmedData.time}.
            </p>

            {/* 4. Cartão-Resumo Branco Rosé */}
            <div className="w-full bg-surface rounded-[24px] border border-line/70 shadow-xs p-6 my-6 space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-ink-soft font-normal">Serviços</span>
                <span className="font-bold text-ink text-right">{confirmedData.serviceName}</span>
              </div>

              <div className="flex justify-between items-center text-sm">
                <span className="text-ink-soft font-normal">Profissional</span>
                <span className="font-bold text-ink text-right">
                  {confirmedData.professionalName}
                </span>
              </div>

              <div className="flex justify-between items-center text-sm">
                <span className="text-ink-soft font-normal">Duração</span>
                <span className="font-bold text-ink text-right">
                  {formatDuration(confirmedData.durationMinutes)}
                </span>
              </div>

              <div className="flex justify-between items-center text-sm">
                <span className="text-ink-soft font-normal">Total do Atendimento</span>
                <span className="font-bold text-ink text-lg text-right tabular-nums">
                  R$ {parseFloat(confirmedData.totalPrice).toFixed(0).replace('.', ',') === parseFloat(confirmedData.totalPrice).toFixed(2).replace('.', ',')
                    ? parseFloat(confirmedData.totalPrice).toFixed(0)
                    : parseFloat(confirmedData.totalPrice).toFixed(2).replace('.', ',')}
                </span>
              </div>

              {depositState.requiresDeposit && (
                <div className="pt-3 border-t border-line/60 flex justify-between items-center text-xs">
                  <span className="text-brand font-medium flex items-center gap-1.5">
                    <Sparkles size={14} />
                    Sinal via PIX Confirmado
                  </span>
                  <span className="font-bold text-brand tabular-nums">
                    R$ {Number(depositState.amount || 0).toFixed(2).replace('.', ',')} ✓
                  </span>
                </div>
              )}
            </div>

            {/* 5. Faixa de Lembrete 24h Antes */}
            <div className="w-full bg-brand-tint/60 rounded-[20px] px-5 py-3.5 flex items-center justify-between gap-3 mb-6">
              <span className="text-sm font-medium text-ink">Quer um lembrete 24h antes?</span>
              <button
                type="button"
                onClick={handleToggleReminder}
                disabled={subscribing}
                className={`px-4 py-2 rounded-full font-medium text-sm transition-all cursor-pointer shrink-0 ${
                  reminderActive
                    ? 'bg-ink text-surface'
                    : 'bg-brand text-white hover:opacity-95 active:scale-95 shadow-xs'
                }`}
              >
                {subscribing ? 'Ativando...' : (reminderActive ? 'Ativado ✓' : 'Ativar')}
              </button>
            </div>

            {/* 6. Botões de Ação Empilhados */}
            <div className="w-full flex flex-col gap-3">
              {/* Botão Primário: Adicionar ao Calendário */}
              <button
                type="button"
                onClick={handleAddToCalendar}
                className="w-full h-[52px] rounded-full bg-brand text-white font-medium text-base hover:opacity-95 active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 shadow-sm cursor-pointer"
              >
                <Calendar size={19} />
                <span>Adicionar ao calendário</span>
              </button>

              {/* Botão Secundário: Ver meus agendamentos */}
              <button
                type="button"
                onClick={handleViewAppointments}
                className="w-full h-[52px] rounded-full border border-brand/80 text-brand bg-transparent hover:bg-brand/5 active:scale-[0.98] transition-all font-medium text-base flex items-center justify-center cursor-pointer"
              >
                <span>Ver meus agendamentos</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </TelaCliente>
  );
};

export default AgendamentoConfirmado;
