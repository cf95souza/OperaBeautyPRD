import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTenant } from '../../context/TenantContext';
import { api } from '../../lib/api';
import { format, parseISO } from 'date-fns';
import { useNotification } from '../../context/NotificationProvider';
import { 
  Clock, 
  MapPin, 
  Phone, 
  Wallet, 
  Sparkles, 
  Coffee, 
  Calendar, 
  Tag, 
  Plus, 
  Trash2, 
  Save, 
  Info, 
  X, 
  Lock, 
  Check, 
  AlertCircle,
  ExternalLink,
  ChevronDown,
  MessageSquare,
  QrCode,
  Smartphone,
  RefreshCw,
  Copy,
  CreditCard,
  ShieldCheck,
  Send,
  Loader2,
  RotateCcw
} from 'lucide-react';
import QRCode from 'qrcode';
import { formatCurrency } from '../../utils/formatters';

const InstagramIcon = ({ className = 'w-3.5 h-3.5' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

const FacebookIcon = ({ className = 'w-3.5 h-3.5' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);

const DAYS_OF_WEEK = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Segunda-feira' },
  { value: 2, label: 'Terça-feira' },
  { value: 3, label: 'Quarta-feira' },
  { value: 4, label: 'Quinta-feira' },
  { value: 5, label: 'Sexta-feira' },
  { value: 6, label: 'Sábado' },
];

const ConfiguracoesOperacionais = () => {
  const { tenant_slug } = useParams();
  const navigate = useNavigate();
  const { tenant } = useTenant();
  const { showSuccess, showError, confirm } = useNotification();

  const [businessHours, setBusinessHours] = useState([]);
  const [exceptions, setExceptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Localização e Redes Sociais
  const [address, setAddress] = useState('');
  const [socialInstagram, setSocialInstagram] = useState('');
  const [socialFacebook, setSocialFacebook] = useState('');
  const [socialWhatsapp, setSocialWhatsapp] = useState('');

  // Cashback / Fidelidade
  const [cashbackPercentage, setCashbackPercentage] = useState(0);
  const [cashbackExpirationDays, setCashbackExpirationDays] = useState(30);

  // Self Check-in (Mimos)
  const [waitingMenuEnabled, setWaitingMenuEnabled] = useState(false);
  const [waitingMenuItems, setWaitingMenuItems] = useState([]);
  const [newItemInput, setNewItemInput] = useState('');

  // PIX
  const [pixKey, setPixKey] = useState('');
  const [pixKeyType, setPixKeyType] = useState('cpf');
  const [pixHolderName, setPixHolderName] = useState('');
  const [pixHolderDocument, setPixHolderDocument] = useState('');

  // Gateway de Pagamento & Sinal por PIX (Fase 44 - D3 P1)
  const [gatewayProvider, setGatewayProvider] = useState('manual_pix');
  const [gatewayIsActive, setGatewayIsActive] = useState(false);
  const [gatewaySandbox, setGatewaySandbox] = useState(false);
  const [gatewayExpiration, setGatewayExpiration] = useState(15);
  const [gatewayAccessToken, setGatewayAccessToken] = useState('');
  const [gatewayApiKey, setGatewayApiKey] = useState('');
  const [gatewayHasToken, setGatewayHasToken] = useState(false);

  // Modal Exceção
  const [showExceptionModal, setShowExceptionModal] = useState(false);
  const [newException, setNewException] = useState({ date: '', is_closed: true, open_time: '09:00', close_time: '18:00', reason: '' });

  // Cupons
  const [coupons, setCoupons] = useState([]);
  const [services, setServices] = useState([]);
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [newCoupon, setNewCoupon] = useState({ code: '', discount_type: 'percentage', discount_value: 10, max_uses: '', expires_at: '', service_id: '' });

  // WhatsApp Gateway (Fase 44 - D2 P1)
  const [waStatus, setWaStatus] = useState('DISCONNECTED');
  const [waPhone, setWaPhone] = useState('');
  const [waPairingCode, setWaPairingCode] = useState('');
  const [waQrCode, setWaQrCode] = useState('');
  const [waConnecting, setWaConnecting] = useState(false);
  const [waInputPhone, setWaInputPhone] = useState('');
  const [waConnectTab, setWaConnectTab] = useState('qr');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [waTestPhone, setWaTestPhone] = useState('');
  const [waSendingTest, setWaSendingTest] = useState(false);
  const [waRunningCron, setWaRunningCron] = useState(false);
  const [waCronReport, setWaCronReport] = useState(null);

  // Política de Cancelamento e Faltas (Fase 44 - D8 P1)
  const [minCancellationHours, setMinCancellationHours] = useState(2);
  const [noShowToleranceCount, setNoShowToleranceCount] = useState(2);
  const [noShowPenaltyAction, setNoShowPenaltyAction] = useState('warn');

  useEffect(() => {
    if (tenant?.id) {
      fetchData();
      setAddress(tenant.address || '');
      setSocialInstagram(tenant.social_instagram || '');
      setSocialFacebook(tenant.social_facebook || '');
      setSocialWhatsapp(tenant.social_whatsapp || '');
      setCashbackPercentage(tenant.cashback_percentage || 0);
      setCashbackExpirationDays(tenant.cashback_expiration_days || 30);
      setWaitingMenuEnabled(tenant.waiting_menu_enabled || false);
      setWaitingMenuItems(tenant.waiting_menu_items || ['Água', 'Café', 'Espumante']);
      setMinCancellationHours(tenant.min_cancellation_hours !== undefined ? tenant.min_cancellation_hours : 2);
      setNoShowToleranceCount(tenant.no_show_tolerance_count !== undefined ? tenant.no_show_tolerance_count : 2);
      setNoShowPenaltyAction(tenant.no_show_penalty_action || 'warn');
    }
  }, [tenant]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Horários
      const hoursData = await api.settings.getBusinessHours(tenant.id);
      let loadedHours = [...(hoursData || [])];
      const missingDays = DAYS_OF_WEEK.filter(d => !loadedHours.some(h => h.day_of_week === d.value));
      missingDays.forEach(d => {
        loadedHours.push({
          day_of_week: d.value,
          open_time: '09:00',
          close_time: '18:00',
          is_closed: d.value === 0
        });
      });
      loadedHours.sort((a, b) => a.day_of_week - b.day_of_week);
      setBusinessHours(loadedHours);

      // 2. Exceções
      const exceptionsData = await api.settings.getExceptions(tenant.id);
      setExceptions(exceptionsData || []);

      // 3. Cupons
      const couponsData = await api.coupons.list(tenant.id);
      setCoupons(couponsData || []);

      // 4. Serviços para cupons
      const servicesData = await api.services.list(tenant.id);
      setServices((servicesData || []).filter(s => s.is_active));

      // 5. PIX e Gateway de Pagamento & Sinal (D3 P1)
      try {
        const pixData = await api.request(`/giftcards/payment-methods?tenant_id=${tenant.id}`);
        if (pixData && pixData.length > 0) {
          setPixKey(pixData[0].pix_key || '');
          setPixKeyType(pixData[0].pix_key_type || 'cpf');
          setPixHolderName(pixData[0].holder_name || '');
          setPixHolderDocument(pixData[0].holder_document || '');
        }

        const gwConfig = await api.payments.getGatewayConfig();
        if (gwConfig) {
          setGatewayProvider(gwConfig.provider || 'manual_pix');
          setGatewayIsActive(gwConfig.is_active || false);
          setGatewaySandbox(gwConfig.sandbox_mode || false);
          setGatewayExpiration(gwConfig.deposit_expiration_minutes || 15);
          setGatewayHasToken(gwConfig.has_access_token || gwConfig.has_api_key || false);
          if (gwConfig.pix_key && !pixKey) {
            setPixKey(gwConfig.pix_key);
            setPixKeyType(gwConfig.pix_key_type || 'cpf');
            setPixHolderName(gwConfig.holder_name || '');
          }
        }
      } catch (err) {
        console.error("Erro ao carregar PIX e Gateway:", err);
      }

      // 6. WhatsApp Gateway Status (apenas se o plano contemplar a feature)
      if (tenant?.features?.whatsapp_gateway) {
        try {
          const waData = await api.whatsapp.getStatus();
          if (waData) {
            setWaStatus(waData.status || 'DISCONNECTED');
            setWaPhone(waData.phone_number || '');
            setWaPairingCode(waData.pairing_code || '');
            setWaQrCode(waData.qr_code || '');
          }
        } catch (waErr) {
          console.warn("WhatsApp status unavailable:", waErr);
        }
      }
    } catch (err) {
      console.error("Erro ao carregar dados operacionais:", err);
    }
    setLoading(false);
  };

  // Converte string bruta do QR do Baileys para imagem Base64 via QRCode.toDataURL
  useEffect(() => {
    if (waQrCode) {
      QRCode.toDataURL(waQrCode, {
        width: 250,
        margin: 2,
        color: {
          dark: '#1c1917',
          light: '#ffffff'
        }
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error('Erro ao renderizar QR Code WhatsApp:', err));
    } else {
      setQrDataUrl('');
    }
  }, [waQrCode]);

  // Monitoramento contínuo em tempo real enquanto estiver aguardando pareamento (QR ou Código)
  useEffect(() => {
    let interval = null;
    if (waStatus === 'SCAN_QR' || waStatus === 'PAIRING_CODE') {
      interval = setInterval(async () => {
        try {
          const waData = await api.whatsapp.getStatus();
          if (waData) {
            if (waData.status === 'CONNECTED') {
              setWaStatus('CONNECTED');
              setWaPhone(waData.phone_number || waData.phoneNumber || '');
              setWaPairingCode('');
              setWaQrCode('');
              setQrDataUrl('');
              showSuccess('🎉 WhatsApp conectado com sucesso!');
            } else if (waData.status === 'SCAN_QR' && waData.qr_code && waData.qr_code !== waQrCode) {
              setWaQrCode(waData.qr_code);
            }
          }
        } catch (_) {}
      }, 3000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [waStatus, waQrCode]);

  const handleConnectWhatsApp = async (method = 'qr') => {
    if (method === 'pairing_code' && !waInputPhone.trim()) {
      showError('Informe o número de telefone com DDD para gerar o código.');
      return;
    }

    setWaConnecting(true);
    try {
      const clean = waInputPhone.replace(/\D/g, '');
      const res = await api.whatsapp.connect(clean, method);
      if (res.status === 'PAIRING_CODE') {
        setWaStatus('PAIRING_CODE');
        setWaPairingCode(res.pairingCode || res.pairing_code);
        showSuccess('Código gerado! Digite no seu WhatsApp no celular.');
      } else if (res.status === 'CONNECTED') {
        setWaStatus('CONNECTED');
        setWaPhone(res.phoneNumber || res.phone_number || clean);
        setWaPairingCode('');
        setWaQrCode('');
        setQrDataUrl('');
        showSuccess('WhatsApp conectado com sucesso!');
      } else if (res.status === 'SCAN_QR' || res.qr || res.qr_code) {
        setWaStatus('SCAN_QR');
        setWaQrCode(res.qr || res.qr_code);
        showSuccess('QR Code gerado! Aponte a câmera do WhatsApp no iPhone ou Android.');
      }
    } catch (err) {
      console.error(err);
      showError(err.message || 'Erro ao conectar WhatsApp.');
    } finally {
      setWaConnecting(false);
    }
  };

  const handleDisconnectWhatsApp = async () => {
    if (await confirm('Deseja realmente desconectar o WhatsApp do seu salão? Os lembretes automáticos serão pausados e você poderá conectar outro número imediatamente.')) {
      try {
        await api.whatsapp.disconnect();
        setWaStatus('DISCONNECTED');
        setWaPhone('');
        setWaPairingCode('');
        setWaQrCode('');
        setQrDataUrl('');
        showSuccess('WhatsApp desconectado com sucesso. O número foi desvinculado e você já pode conectar um novo aparelho.');
      } catch (err) {
        showError('Erro ao desconectar WhatsApp.');
      }
    }
  };

  const handleRefreshWhatsApp = async () => {
    try {
      const waData = await api.whatsapp.getStatus();
      if (waData) {
        setWaStatus(waData.status || 'DISCONNECTED');
        setWaPhone(waData.phone_number || '');
        setWaPairingCode(waData.pairing_code || '');
        setWaQrCode(waData.qr_code || '');
        if (waData.status === 'CONNECTED') {
          showSuccess('WhatsApp está ativo e conectado!');
        } else {
          showSuccess('Status atualizado.');
        }
      }
    } catch (err) {
      showError('Não foi possível atualizar o status do WhatsApp.');
    }
  };

  const handleSendTestMessage = async () => {
    if (!waTestPhone.trim()) {
      showError('Informe um número de telefone com DDD para o teste.');
      return;
    }
    setWaSendingTest(true);
    try {
      const clean = waTestPhone.replace(/\D/g, '');
      await api.whatsapp.sendTest(clean);
      showSuccess(`🚀 Mensagem de teste enviada com sucesso para ${waTestPhone}! Verifique o WhatsApp.`);
    } catch (err) {
      showError(err.message || 'Erro ao enviar mensagem de teste via WhatsApp.');
    } finally {
      setWaSendingTest(false);
    }
  };

  const handleTriggerCronReminders = async () => {
    setWaRunningCron(true);
    setWaCronReport(null);
    try {
      const res = await api.whatsapp.triggerCronReminders();
      setWaCronReport(res?.report);
      const totalSent = (res?.report?.reminders2h?.length || 0) + (res?.report?.reminders24h?.length || 0);
      showSuccess(`Varredura concluída! ${totalSent} lembrete(s) processado(s).`);
    } catch (err) {
      showError(err.message || 'Falha ao executar varredura de lembretes.');
    } finally {
      setWaRunningCron(false);
    }
  };

  const handleHourChange = (dayOfWeek, field, value) => {
    setBusinessHours(prev => prev.map(h => {
      if (h.day_of_week === dayOfWeek) {
        return { ...h, [field]: value };
      }
      return h;
    }));
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      // 1. Atualizar branding e configurações do tenant
      await api.tenants.updateBranding({
        address,
        social_instagram: socialInstagram,
        social_facebook: socialFacebook,
        social_whatsapp: socialWhatsapp,
        cashback_percentage: parseFloat(cashbackPercentage) || 0,
        cashback_expiration_days: parseInt(cashbackExpirationDays) || 30,
        waiting_menu_enabled: waitingMenuEnabled,
        waiting_menu_items: waitingMenuItems,
        min_cancellation_hours: parseInt(minCancellationHours, 10),
        no_show_penalty_action: noShowPenaltyAction,
        no_show_tolerance_count: parseInt(noShowToleranceCount, 10)
      });

      // 2. Salvar PIX se preenchido
      if (pixKey && pixHolderName) {
        await api.request('/giftcards/payment-methods', {
          method: 'POST',
          body: JSON.stringify({
            pix_key: pixKey,
            pix_key_type: pixKeyType,
            holder_name: pixHolderName,
            holder_document: pixHolderDocument
          })
        });
      }

      // 3. Salvar Gateway de Pagamento e Sinal PIX (D3 P1)
      await api.payments.saveGatewayConfig({
        provider: gatewayProvider,
        is_active: gatewayIsActive,
        sandbox_mode: gatewaySandbox,
        deposit_expiration_minutes: parseInt(gatewayExpiration, 10) || 15,
        credentials: {
          accessToken: gatewayAccessToken || undefined,
          apiKey: gatewayApiKey || undefined
        },
        pix_key: pixKey,
        pix_key_type: pixKeyType,
        holder_name: pixHolderName
      });

      // 4. Horários de funcionamento
      const cleanBusinessHours = businessHours.map(({ id, ...rest }) => rest);
      await api.settings.updateBusinessHours(cleanBusinessHours);

      showSuccess('Configurações salvas com sucesso!');
      fetchData();
    } catch (e) {
      console.error(e);
      showError('Erro ao salvar as configurações.');
    }
    setSaving(false);
  };

  const handleAddException = async () => {
    if (!newException.date) {
      showError("Por favor selecione a data.");
      return;
    }

    const toInsert = {
      tenant_id: tenant.id,
      exception_date: newException.date,
      is_closed: newException.is_closed,
      open_time: newException.is_closed ? null : newException.open_time,
      close_time: newException.is_closed ? null : newException.close_time,
      reason: newException.reason || 'Sem motivo informado'
    };

    try {
      await api.settings.addException(toInsert);
      setShowExceptionModal(false);
      setNewException({ date: '', is_closed: true, open_time: '09:00', close_time: '18:00', reason: '' });
      showSuccess('Exceção adicionada com sucesso!');
      fetchData();
    } catch (err) {
      console.error(err);
      showError('Erro ao adicionar exceção.');
    }
  };

  const handleDeleteException = async (id) => {
    if (await confirm('Deseja realmente remover esta exceção de horário?')) {
      try {
        await api.settings.deleteException(id);
        showSuccess('Exceção removida com sucesso!');
        fetchData();
      } catch (err) {
        console.error(err);
        showError('Erro ao remover exceção.');
      }
    }
  };

  const handleAddCoupon = async () => {
    if (!newCoupon.code || !newCoupon.discount_value) {
      showError("Preencha o código e o valor do desconto.");
      return;
    }

    const toInsert = {
      tenant_id: tenant.id,
      code: newCoupon.code.toUpperCase().replace(/\s+/g, ''),
      discount_type: newCoupon.discount_type,
      discount_value: parseFloat(newCoupon.discount_value),
      max_uses: newCoupon.max_uses ? parseInt(newCoupon.max_uses) : null,
      expires_at: newCoupon.expires_at ? new Date(newCoupon.expires_at + 'T23:59:59').toISOString() : null,
      service_id: newCoupon.service_id || null
    };

    try {
      await api.coupons.create(toInsert);
      setShowCouponModal(false);
      setNewCoupon({ code: '', discount_type: 'percentage', discount_value: 10, max_uses: '', expires_at: '', service_id: '' });
      showSuccess('Cupom criado com sucesso!');
      fetchData();
    } catch (err) {
      console.error(err);
      showError('Erro ao adicionar cupom.');
    }
  };

  const handleDeleteCoupon = async (id) => {
    if (await confirm('Deseja inativar/remover este cupom de desconto?')) {
      try {
        await api.coupons.delete(id);
        showSuccess('Cupom removido com sucesso!');
        fetchData();
      } catch (err) {
        console.error(err);
        showError('Erro ao remover cupom.');
      }
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-ink-soft">
        <div className="w-9 h-9 border-3 border-brand/20 border-t-brand rounded-full animate-spin mb-3" />
        <span className="text-sm font-medium">Carregando configurações operacionais...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in pb-16 max-w-7xl mx-auto">
      {/* Cabeçalho Editorial Rosé */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-3xl sm:text-4xl text-ink tracking-tight">
            Configurações operacionais
          </h1>
          <p className="text-sm text-ink-soft mt-1">
            Jornada de funcionamento, dados de contato, PIX e benefícios do salão.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSaveAll}
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full bg-brand hover:bg-brand-hover text-white text-sm font-semibold transition-all shadow-xs disabled:opacity-50 cursor-pointer"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Salvando...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Salvar alterações</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Grid Principal: 2 Colunas (8 + 4) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Coluna Esquerda: Jornada, Contato, PIX, Cashback e Mimos (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* 1. Jornada de Funcionamento (Padrão) */}
          <div className="rounded-[22px] border border-line bg-white shadow-xs p-6 sm:p-7">
            <div className="flex items-start gap-3.5 mb-6">
              <div className="w-10 h-10 rounded-xl bg-brand-tint flex items-center justify-center text-brand shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-display font-bold text-xl text-ink">Jornada de funcionamento padrão</h2>
                <p className="text-xs sm:text-sm text-ink-soft mt-0.5">
                  Defina os dias e os horários em que o estabelecimento aceita agendamentos.
                </p>
              </div>
            </div>

            <div className="divide-y divide-line/60">
              {DAYS_OF_WEEK.map((day) => {
                const dayData = businessHours.find(h => h.day_of_week === day.value) || {};
                const isOpen = !dayData.is_closed;

                return (
                  <div key={day.value} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center justify-between sm:w-52">
                      <span className={`text-sm font-medium ${isOpen ? 'text-ink' : 'text-ink-soft'}`}>
                        {day.label}
                      </span>

                      {/* Switch Toggle Rosé */}
                      <label className="relative inline-flex items-center cursor-pointer ml-3">
                        <input
                          type="checkbox"
                          checked={isOpen}
                          onChange={(e) => handleHourChange(day.value, 'is_closed', !e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-stone-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand" />
                      </label>
                    </div>

                    {/* Inputs de Horários */}
                    <div className={`flex items-center gap-2.5 transition-opacity ${isOpen ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                      <input
                        type="text"
                        value={dayData.open_time?.substring(0, 5) || '09:00'}
                        onChange={(e) => handleHourChange(day.value, 'open_time', e.target.value)}
                        disabled={!isOpen}
                        placeholder="09:00"
                        maxLength={5}
                        className="w-24 px-3 py-1.5 bg-stone-50/70 border border-line rounded-xl text-center text-sm font-medium text-ink focus:border-brand focus:bg-white focus:ring-1 focus:ring-brand outline-none transition-all tabular-nums"
                      />
                      <span className="text-xs font-medium text-ink-soft">às</span>
                      <input
                        type="text"
                        value={dayData.close_time?.substring(0, 5) || '18:00'}
                        onChange={(e) => handleHourChange(day.value, 'close_time', e.target.value)}
                        disabled={!isOpen}
                        placeholder="18:00"
                        maxLength={5}
                        className="w-24 px-3 py-1.5 bg-stone-50/70 border border-line rounded-xl text-center text-sm font-medium text-ink focus:border-brand focus:bg-white focus:ring-1 focus:ring-brand outline-none transition-all tabular-nums"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. Contato & Localização */}
          <div className="rounded-[22px] border border-line bg-white shadow-xs p-6 sm:p-7">
            <div className="flex items-start gap-3.5 mb-5">
              <div className="w-10 h-10 rounded-xl bg-brand-tint flex items-center justify-center text-brand shrink-0">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-display font-bold text-xl text-ink">Contato & localização</h2>
                <p className="text-xs sm:text-sm text-ink-soft mt-0.5">
                  Informações exibidas na tela de login e no rodapé do app para as suas clientes.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs uppercase font-semibold text-ink-soft tracking-wider mb-1.5">
                  Endereço Comercial
                </label>
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Ex: Av. Paulista, 1000 - Bela Vista, São Paulo - SP, 01310-100"
                  rows={2}
                  className="w-full px-3.5 py-2.5 bg-stone-50/70 border border-line rounded-xl text-sm text-ink placeholder:text-stone-400 focus:border-brand focus:bg-white focus:ring-1 focus:ring-brand outline-none transition-all resize-y"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                <div>
                  <label className="flex items-center gap-1.5 text-xs uppercase font-semibold text-ink-soft tracking-wider mb-1.5">
                    <InstagramIcon className="w-3.5 h-3.5 text-brand" />
                    Instagram
                  </label>
                  <input
                    type="url"
                    value={socialInstagram}
                    onChange={(e) => setSocialInstagram(e.target.value)}
                    placeholder="https://instagram.com/seu_perfil"
                    className="w-full px-3.5 py-2.5 bg-stone-50/70 border border-line rounded-xl text-sm text-ink placeholder:text-stone-400 focus:border-brand focus:bg-white focus:ring-1 focus:ring-brand outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-1.5 text-xs uppercase font-semibold text-ink-soft tracking-wider mb-1.5">
                    <FacebookIcon className="w-3.5 h-3.5 text-brand" />
                    Facebook
                  </label>
                  <input
                    type="url"
                    value={socialFacebook}
                    onChange={(e) => setSocialFacebook(e.target.value)}
                    placeholder="https://facebook.com/sua_pagina"
                    className="w-full px-3.5 py-2.5 bg-stone-50/70 border border-line rounded-xl text-sm text-ink placeholder:text-stone-400 focus:border-brand focus:bg-white focus:ring-1 focus:ring-brand outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-1.5 text-xs uppercase font-semibold text-ink-soft tracking-wider mb-1.5">
                    <Phone className="w-3.5 h-3.5 text-brand" />
                    WhatsApp
                  </label>
                  <input
                    type="url"
                    value={socialWhatsapp}
                    onChange={(e) => setSocialWhatsapp(e.target.value)}
                    placeholder="https://wa.me/5511999999999"
                    className="w-full px-3.5 py-2.5 bg-stone-50/70 border border-line rounded-xl text-sm text-ink placeholder:text-stone-400 focus:border-brand focus:bg-white focus:ring-1 focus:ring-brand outline-none transition-all"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 2.1 WhatsApp Oficial do Salão (Automações & Lembretes em 1 Toque - Fase 44 D2) */}
          <div className="rounded-[22px] border border-line bg-white shadow-xs p-6 sm:p-7">
            <div className="flex items-start justify-between gap-4 mb-5">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-display font-bold text-xl text-ink">WhatsApp oficial & automações</h2>
                    {waStatus === 'CONNECTED' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                        Conectado
                      </span>
                    ) : waStatus === 'SCAN_QR' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-ping"></span>
                        Aguardando Câmera / QR Code
                      </span>
                    ) : waStatus === 'PAIRING_CODE' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-ping"></span>
                        Aguardando Código
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-stone-100 text-stone-600 border border-stone-200">
                        Desconectado
                      </span>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm text-ink-soft mt-0.5">
                    Envie lembretes automáticos 24h e 2h antes com botões de confirmação e remarcação em 1 toque sem taxas por mensagem.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleRefreshWhatsApp}
                title="Atualizar status da conexão"
                className="p-2 rounded-xl border border-line hover:bg-stone-50 text-ink-soft hover:text-ink transition-all cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {!tenant?.features?.whatsapp_gateway ? (
              <div className="rounded-2xl border border-line/80 bg-stone-50/60 p-6 sm:p-7 text-center flex flex-col items-center">
                <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 mb-3 shadow-xs">
                  <Lock className="w-5 h-5" />
                </div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-brand-tint text-brand mb-2">
                  Exclusivo do Maior Plano
                </span>
                <h3 className="text-base sm:text-lg font-display font-bold text-ink mb-1.5">
                  Lembretes automáticos com confirmação em 1 toque
                </h3>
                <p className="text-xs sm:text-sm text-ink-soft max-w-md mb-5 leading-relaxed">
                  Reduza o índice de faltas (no-show) em até 80% conectando o WhatsApp oficial do seu salão para confirmações e remarcações em tempo real sem pagar taxas por mensagem.
                </p>
                <button
                  type="button"
                  onClick={() => navigate(`/${tenant_slug}/staff/admin/assinatura`)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand hover:bg-brand-dark text-white text-xs font-semibold rounded-xl transition-all shadow-xs cursor-pointer"
                >
                  <span>Fazer upgrade de plano</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <>
            {/* ESTADO 1: CONECTADO */}
            {waStatus === 'CONNECTED' ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Smartphone className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-xs uppercase tracking-wider font-bold text-emerald-900">Linha Ativa do Salão</p>
                        <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                      </div>
                      <p className="text-lg font-bold font-mono text-emerald-950 mt-0.5">
                        +{waPhone || socialWhatsapp || 'Conectada'}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleDisconnectWhatsApp}
                    className="self-start sm:self-auto px-4 py-2.5 bg-white border border-rose-200 hover:bg-rose-50 text-rose-700 text-xs font-semibold rounded-xl transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
                    title="Desconecta a sessão atual para permitir conectar outro número ou aparelho"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Desconectar / Trocar de Número</span>
                  </button>
                </div>

                <div className="mt-4 pt-3.5 border-t border-emerald-200/70 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-emerald-900 font-medium">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Lembretes 24h e 2h antes ativos</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Confirmação e remarcação em 1 toque ativas</span>
                  </div>
                </div>

                {/* ÁREA DE TESTE IMEDIATO DE DISPARO */}
                <div className="mt-4 pt-3.5 border-t border-emerald-200/70">
                  <p className="text-xs font-bold text-emerald-950 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Send className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Testar Envio de Mensagem Imediato</span>
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="tel"
                      value={waTestPhone}
                      onChange={(e) => setWaTestPhone(e.target.value)}
                      placeholder="DDD + Telefone (ex: 11999998888)"
                      className="flex-1 px-3.5 py-2 bg-white border border-emerald-300 rounded-xl text-xs font-mono text-ink placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                    />
                    <button
                      type="button"
                      disabled={waSendingTest}
                      onClick={handleSendTestMessage}
                      className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                    >
                      {waSendingTest ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Enviando...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>Disparar Mensagem de Teste</span>
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-[11px] text-emerald-800 mt-1.5">
                    Dispara um WhatsApp de verificação em tempo real diretamente da linha do salão para validar a entrega.
                  </p>
                </div>

                {/* ÁREA DE VERIFICAÇÃO AUTOMÁTICA DOS AGENDAMENTOS (SIMULAÇÃO DE CRON) */}
                <div className="mt-4 pt-3.5 border-t border-emerald-200/70 bg-emerald-100/50 -mx-5 sm:-mx-7 -mb-5 sm:-mb-7 p-4 sm:p-5 rounded-b-2xl">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-emerald-700" />
                        <span>Automação Contínua de Lembretes (2h e 24h)</span>
                      </p>
                      <p className="text-[11px] text-emerald-800 mt-0.5 max-w-xl">
                        A rotina roda automaticamente a cada 5 minutos em segundo plano no servidor, checando agendamentos de hoje (2h antes) e de amanhã (24h antes).
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={waRunningCron}
                      onClick={handleTriggerCronReminders}
                      className="px-4 py-2 bg-stone-900 hover:bg-black disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                    >
                      {waRunningCron ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Verificando Agenda...</span>
                        </>
                      ) : (
                        <>
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Executar Verificação Agora</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Relatório Detalhado da Execução Sob Demanda */}
                  {waCronReport && (
                    <div className="mt-3 p-3 bg-white rounded-xl border border-emerald-200 text-xs text-ink space-y-2">
                      <div className="flex items-center justify-between font-semibold border-b border-line pb-1.5">
                        <span className="text-emerald-800">Resultado da Varredura</span>
                        <span className="text-[11px] text-ink-soft">
                          {new Date(waCronReport.executedAt).toLocaleTimeString('pt-BR')}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div className="p-2 bg-stone-50 rounded-lg">
                          <span className="text-ink-soft block">Lembretes 2h disparados:</span>
                          <strong className="text-emerald-700 text-sm">{waCronReport.reminders2h?.length || 0}</strong>
                        </div>
                        <div className="p-2 bg-stone-50 rounded-lg">
                          <span className="text-ink-soft block">Lembretes 24h disparados:</span>
                          <strong className="text-emerald-700 text-sm">{waCronReport.reminders24h?.length || 0}</strong>
                        </div>
                      </div>

                      {((waCronReport.reminders2h?.length || 0) + (waCronReport.reminders24h?.length || 0) === 0) && (
                        <p className="text-[11px] text-stone-500 italic">
                          Nenhum agendamento pendente de aviso encontrado para as próximas 2h ou 24h neste momento (ou todos já foram notificados anteriormente).
                        </p>
                      )}

                      {waCronReport.reminders2h?.length > 0 && (
                        <div>
                          <span className="font-semibold text-emerald-900 text-[11px] block mb-1">Enviados (2 Horas Antes):</span>
                          <ul className="space-y-1">
                            {waCronReport.reminders2h.map((r, idx) => (
                              <li key={idx} className="text-[11px] bg-emerald-50 text-emerald-900 px-2 py-1 rounded flex items-center justify-between">
                                <span>{r.client} ({r.phone})</span>
                                <span className="font-bold">{r.time} · {r.status}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {waCronReport.reminders24h?.length > 0 && (
                        <div>
                          <span className="font-semibold text-emerald-900 text-[11px] block mb-1">Enviados (24 Horas Antes):</span>
                          <ul className="space-y-1">
                            {waCronReport.reminders24h.map((r, idx) => (
                              <li key={idx} className="text-[11px] bg-blue-50 text-blue-900 px-2 py-1 rounded flex items-center justify-between">
                                <span>{r.client} ({r.phone})</span>
                                <span className="font-bold">{r.time} · {r.status}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : waStatus === 'SCAN_QR' ? (
              /* ESTADO 2: AGUARDANDO LEITURA DO QR CODE (IDEAL PARA IPHONE E DESKTOP) */
              <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-5 sm:p-7 text-center">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-amber-100 text-amber-900 mb-2">
                  <QrCode className="w-3.5 h-3.5 text-amber-700" />
                  <span>Escanear com a Câmera do WhatsApp</span>
                </div>
                <h3 className="text-base sm:text-lg font-display font-bold text-ink mb-1">
                  Aponte a câmera do seu celular para conectar
                </h3>
                <p className="text-xs text-ink-soft max-w-sm mx-auto mb-4">
                  Compatível com iPhone (iOS) e Android. A conexão é reconhecida automaticamente em poucos segundos.
                </p>

                {/* Exibição do QR Code Oficial Renderizado */}
                <div className="bg-white p-4 rounded-2xl border border-amber-300 shadow-sm inline-block mb-5">
                  {qrDataUrl ? (
                    <img
                      src={qrDataUrl}
                      alt="QR Code WhatsApp"
                      className="w-56 h-56 mx-auto rounded-lg"
                    />
                  ) : (
                    <div className="w-56 h-56 flex flex-col items-center justify-center bg-stone-50 rounded-lg gap-2.5 text-stone-400">
                      <RefreshCw className="w-7 h-7 animate-spin text-brand" />
                      <span className="text-xs font-medium">Carregando QR Code oficial...</span>
                    </div>
                  )}
                </div>

                {/* Instruções Detalhadas para iPhone e Android */}
                <div className="max-w-md mx-auto text-left bg-white/90 p-4 rounded-xl border border-amber-200 text-xs text-amber-950 space-y-1.5 mb-5 shadow-2xs">
                  <p className="font-bold text-ink flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4 text-emerald-600" />
                    <span>Como conectar no seu celular agora:</span>
                  </p>
                  <p>1. Abra o WhatsApp no aparelho celular do salão.</p>
                  <p>2. Toque em <strong>Configurações</strong> (no iPhone) ou nos <strong>3 pontinhos</strong> (no Android) &gt; <strong>Aparelhos conectados</strong>.</p>
                  <p>3. Toque em <strong>Conectar um aparelho</strong>.</p>
                  <p>4. <strong>Aponte a câmera</strong> para o QR Code acima. O sistema conectará sozinho!</p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    disabled={waConnecting}
                    onClick={() => handleConnectWhatsApp('qr')}
                    className="px-4 py-2.5 bg-brand hover:bg-brand-dark text-white text-xs font-semibold rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${waConnecting ? 'animate-spin' : ''}`} />
                    <span>{waConnecting ? 'Atualizando...' : 'Atualizar QR Code'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setWaStatus('DISCONNECTED');
                      setWaConnectTab('code');
                    }}
                    className="px-4 py-2.5 bg-white border border-line text-ink hover:bg-stone-50 text-xs font-medium rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Smartphone className="w-3.5 h-3.5 text-ink-soft" />
                    <span>Prefiro Código de 8 Dígitos</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setWaStatus('DISCONNECTED')}
                    className="px-4 py-2.5 bg-white border border-line text-ink-soft hover:text-ink text-xs font-medium rounded-xl transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : waStatus === 'PAIRING_CODE' ? (
              /* ESTADO 3: AGUARDANDO CÓDIGO DE 8 DÍGITOS */
              <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-5 sm:p-7 text-center">
                <p className="text-xs uppercase tracking-wider font-bold text-amber-900 mb-2">
                  Código de Pareamento de 8 Dígitos
                </p>
                <div className="inline-flex items-center gap-3 bg-white px-6 py-3 rounded-2xl border border-amber-300 shadow-xs mb-4">
                  <span className="font-mono text-3xl sm:text-4xl font-bold tracking-widest text-ink">
                    {waPairingCode}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(waPairingCode);
                      showSuccess('Código copiado para a área de transferência!');
                    }}
                    title="Copiar código"
                    className="p-2 rounded-xl border border-line hover:bg-stone-100 text-ink-soft hover:text-ink transition-all cursor-pointer"
                  >
                    <Copy className="w-5 h-5" />
                  </button>
                </div>

                <div className="max-w-md mx-auto text-left bg-white/80 p-4 rounded-xl border border-amber-200 text-xs text-amber-950 space-y-1.5 mb-5 shadow-2xs">
                  <p className="font-bold text-ink">Como conectar no seu celular agora:</p>
                  <p>1. Abra o WhatsApp no aparelho celular do salão.</p>
                  <p>2. Toque em <strong>Configurações</strong> (ou nos 3 pontinhos) &gt; <strong>Aparelhos conectados</strong>.</p>
                  <p>3. Toque em <strong>Conectar um aparelho</strong> &gt; <strong>Conectar com número de telefone</strong>.</p>
                  <p>4. Digite o código de 8 dígitos exibido acima.</p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={handleRefreshWhatsApp}
                    className="px-5 py-2.5 bg-brand hover:bg-brand-dark text-white text-xs font-semibold rounded-xl transition-all shadow-xs cursor-pointer"
                  >
                    Já digitei no celular (Verificar conexão)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleConnectWhatsApp('qr')}
                    className="px-4 py-2.5 bg-white border border-line text-ink hover:bg-stone-50 text-xs font-medium rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <QrCode className="w-3.5 h-3.5 text-ink-soft" />
                    <span>Prefiro Escanear QR Code</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setWaStatus('DISCONNECTED')}
                    className="px-4 py-2.5 bg-white border border-line text-ink-soft hover:text-ink text-xs font-medium rounded-xl transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              /* ESTADO 4: DESCONECTADO (SELEÇÃO DE MÉTODO QR CODE VS CÓDIGO) */
              <div className="space-y-4">
                {/* Abas de Escolha do Método */}
                <div className="flex items-center gap-1.5 p-1 bg-stone-100 rounded-2xl max-w-md mx-auto border border-line/60">
                  <button
                    type="button"
                    onClick={() => setWaConnectTab('qr')}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      waConnectTab === 'qr'
                        ? 'bg-white text-brand shadow-xs border border-line/40'
                        : 'text-ink-soft hover:text-ink'
                    }`}
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>Escanear QR Code (iPhone/PC)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setWaConnectTab('code')}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      waConnectTab === 'code'
                        ? 'bg-white text-brand shadow-xs border border-line/40'
                        : 'text-ink-soft hover:text-ink'
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>Código de 8 Dígitos</span>
                  </button>
                </div>

                {/* Conteúdo Aba QR Code */}
                {waConnectTab === 'qr' ? (
                  <div className="rounded-2xl border border-line/80 bg-stone-50/60 p-5 sm:p-6 text-center space-y-4">
                    <div className="w-10 h-10 rounded-2xl bg-brand-tint text-brand flex items-center justify-center mx-auto">
                      <QrCode className="w-5 h-5" />
                    </div>
                    <div className="max-w-md mx-auto">
                      <h4 className="text-sm font-bold text-ink">Conexão rápida com a câmera</h4>
                      <p className="text-xs text-ink-soft mt-1 leading-relaxed">
                        Recomendado para quem usa computador ou tem <strong>iPhone (iOS)</strong>. Basta apontar a câmera do WhatsApp para o QR Code e conectar em 2 segundos.
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={waConnecting}
                      onClick={() => handleConnectWhatsApp('qr')}
                      className="inline-flex items-center gap-2 px-6 py-2.5 bg-brand hover:bg-brand-dark text-white text-xs font-semibold rounded-xl transition-all shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      {waConnecting ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Gerando QR Code...</span>
                        </>
                      ) : (
                        <>
                          <QrCode className="w-4 h-4" />
                          <span>Gerar QR Code para Escanear</span>
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  /* Conteúdo Aba Código de 8 Dígitos */
                  <div className="rounded-2xl border border-line/80 bg-stone-50/60 p-5 sm:p-6 space-y-3.5">
                    <div className="flex items-start gap-3">
                      <Info className="w-4 h-4 text-brand mt-0.5 shrink-0" />
                      <p className="text-xs text-ink-soft leading-relaxed">
                        Ideal para quando você estiver gerenciando o salão <strong>pelo próprio celular</strong>. Digite o número com DDD para receber um código de 8 dígitos na tela.
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs uppercase font-semibold text-ink-soft tracking-wider mb-1.5">
                        Número do WhatsApp do Salão (com DDD) *
                      </label>
                      <div className="flex flex-col sm:flex-row gap-2.5">
                        <input
                          type="tel"
                          value={waInputPhone}
                          onChange={(e) => setWaInputPhone(e.target.value)}
                          placeholder="Ex: 11988887777"
                          className="flex-1 px-3.5 py-2.5 bg-white border border-line rounded-xl text-sm font-mono text-ink placeholder:text-stone-400 focus:border-brand focus:ring-1 focus:ring-brand outline-none transition-all"
                        />

                        <button
                          type="button"
                          disabled={waConnecting}
                          onClick={() => handleConnectWhatsApp('pairing_code')}
                          className="px-5 py-2.5 bg-brand hover:bg-brand-dark text-white text-xs font-semibold rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                        >
                          {waConnecting ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              <span>Gerando código...</span>
                            </>
                          ) : (
                            <>
                              <Smartphone className="w-4 h-4" />
                              <span>Gerar Código de 8 Dígitos</span>
                            </>
                          )}
                        </button>
                      </div>
                      <p className="text-[11px] text-ink-soft mt-1.5">
                        Digite apenas números com o DDD (Ex: 11 para São Paulo). O código internacional +55 é inserido automaticamente.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
              </>
            )}
          </div>

          {/* 3. Gateway de Pagamento & Sinal Antecipado por PIX (Fase 44 - D3 P1) */}
          <div className="rounded-[22px] border border-line bg-white shadow-xs p-6 sm:p-7 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-5">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-brand-tint flex items-center justify-center text-brand shrink-0">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-display font-bold text-xl text-ink">Gateway de pagamento & sinal por PIX</h2>
                  <p className="text-xs sm:text-sm text-ink-soft mt-0.5">
                    Recebimento de sinal para garantia de horário, combate a faltas e validação de vales-presente.
                  </p>
                </div>
              </div>

              {/* Toggle Principal de Ativação do Sinal */}
              <div className="flex items-center gap-3 bg-stone-50 px-4 py-2 rounded-2xl border border-line shrink-0">
                <span className="text-xs font-semibold text-ink">
                  {gatewayIsActive ? 'Sinal Ativado' : 'Sinal Desativado'}
                </span>
                <button
                  type="button"
                  onClick={() => setGatewayIsActive(!gatewayIsActive)}
                  className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer p-0.5 shadow-2xs ${
                    gatewayIsActive ? 'bg-brand' : 'bg-stone-300'
                  }`}
                >
                  <div 
                    className={`w-5 h-5 rounded-full bg-white shadow-xs transition-transform transform ${
                      gatewayIsActive ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Configurações do Gateway Quando Ativo */}
            {gatewayIsActive && (
              <div className="space-y-5 bg-stone-50/70 p-5 rounded-2xl border border-line animate-fade-in">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Provedor */}
                  <div>
                    <label className="block text-xs uppercase font-semibold text-ink-soft tracking-wider mb-1.5">
                      Provedor de Pagamento
                    </label>
                    <div className="relative">
                      <select
                        value={gatewayProvider}
                        onChange={(e) => setGatewayProvider(e.target.value)}
                        className="w-full appearance-none px-3.5 py-2.5 bg-white border border-line rounded-xl text-sm font-medium text-ink focus:border-brand outline-none transition-all pr-9 cursor-pointer"
                      >
                        <option value="simulator">Simulador Sandbox (Ambiente de Testes)</option>
                        <option value="manual_pix">PIX Manual (Chave do Salão)</option>
                        <option value="mercadopago">Mercado Pago (PIX Dinâmico Automático)</option>
                        <option value="asaas">Asaas (PIX Dinâmico Automático)</option>
                        <option value="abacatepay">AbacatePay (PIX Automático)</option>
                      </select>
                      <ChevronDown className="w-4 h-4 text-ink-soft absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  {/* Prazo de Expiração */}
                  <div>
                    <label className="block text-xs uppercase font-semibold text-ink-soft tracking-wider mb-1.5">
                      Prazo para Pagamento do Sinal
                    </label>
                    <div className="relative">
                      <select
                        value={gatewayExpiration}
                        onChange={(e) => setGatewayExpiration(Number(e.target.value))}
                        className="w-full appearance-none px-3.5 py-2.5 bg-white border border-line rounded-xl text-sm font-medium text-ink focus:border-brand outline-none transition-all pr-9 cursor-pointer tabular-nums"
                      >
                        <option value={10}>10 minutos</option>
                        <option value={15}>15 minutos (Recomendado)</option>
                        <option value={30}>30 minutos</option>
                        <option value={60}>1 hora</option>
                      </select>
                      <ChevronDown className="w-4 h-4 text-ink-soft absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  {/* Sandbox Mode */}
                  <div>
                    <label className="block text-xs uppercase font-semibold text-ink-soft tracking-wider mb-1.5">
                      Modo Sandbox / Testes
                    </label>
                    <div className="flex items-center justify-between h-[42px] px-3.5 bg-white border border-line rounded-xl">
                      <span className="text-xs text-ink-soft">
                        {gatewaySandbox ? 'Ambiente de Testes' : 'Ambiente Real (Produção)'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setGatewaySandbox(!gatewaySandbox)}
                        className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer p-0.5 ${
                          gatewaySandbox ? 'bg-amber-600' : 'bg-stone-300'
                        }`}
                      >
                        <div 
                          className={`w-4 h-4 rounded-full bg-white shadow-xs transition-transform transform ${
                            gatewaySandbox ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Credenciais Privadas Seguras com Criptografia AES-256-GCM */}
                {gatewayProvider === 'mercadopago' && (
                  <div className="bg-white p-4 rounded-xl border border-line space-y-2 animate-fade-in">
                    <label className="flex items-center justify-between text-xs uppercase font-semibold text-ink-soft tracking-wider">
                      <span className="flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        Access Token do Mercado Pago (Criptografado com AES-256-GCM)
                      </span>
                      {gatewayHasToken && (
                        <span className="text-emerald-700 font-semibold normal-case text-xs">
                          ✓ Token configurado
                        </span>
                      )}
                    </label>
                    <input
                      type="password"
                      value={gatewayAccessToken}
                      onChange={(e) => setGatewayAccessToken(e.target.value)}
                      placeholder={gatewayHasToken ? '•••••••••••••••••••••••••••••••• (deixe em branco para manter)' : 'APP_USR-0000000000000000-000000-...'}
                      className="w-full px-3.5 py-2.5 bg-stone-50/70 border border-line rounded-xl text-sm font-mono text-ink placeholder:text-stone-400 focus:border-brand focus:bg-white focus:ring-1 focus:ring-brand outline-none transition-all"
                    />
                    <p className="text-[11px] text-ink-soft">
                      100% dos fundos caem diretamente na conta Mercado Pago do salão. A OperaBeauty não retém valores.
                    </p>
                  </div>
                )}

                {gatewayProvider === 'asaas' && (
                  <div className="bg-white p-4 rounded-xl border border-line space-y-2 animate-fade-in">
                    <label className="flex items-center justify-between text-xs uppercase font-semibold text-ink-soft tracking-wider">
                      <span className="flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        API Key do Asaas ($aact_...)
                      </span>
                      {gatewayHasToken && (
                        <span className="text-emerald-700 font-semibold normal-case text-xs">
                          ✓ Chave configurada
                        </span>
                      )}
                    </label>
                    <input
                      type="password"
                      value={gatewayApiKey}
                      onChange={(e) => setGatewayApiKey(e.target.value)}
                      placeholder={gatewayHasToken ? '•••••••••••••••••••••••••••••••• (deixe em branco para manter)' : '$aact_YTU5YTE0M2M6N2Z...'}
                      className="w-full px-3.5 py-2.5 bg-stone-50/70 border border-line rounded-xl text-sm font-mono text-ink placeholder:text-stone-400 focus:border-brand focus:bg-white focus:ring-1 focus:ring-brand outline-none transition-all"
                    />
                  </div>
                )}

                {gatewayProvider === 'simulator' && (
                  <div className="bg-amber-50/70 p-3.5 rounded-xl border border-amber-200/80 text-xs text-amber-950 flex items-start gap-2.5">
                    <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <p leading-relaxed>
                      <strong>Modo Simulador Ativo:</strong> Ao agendar qualquer serviço com sinal exigido, um QR Code PIX de teste será emitido na tela final e o cliente (ou você em homologação) poderá clicar em <em>"Simular Pagamento Aprovado"</em> para confirmar o horário instantaneamente sem movimentar dinheiro real.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Dados da Chave PIX do Estabelecimento */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm text-ink flex items-center gap-2">
                <Wallet className="w-4 h-4 text-brand" />
                Chave PIX Direta do Estabelecimento
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase font-semibold text-ink-soft tracking-wider mb-1.5">
                    Tipo de Chave PIX *
                  </label>
                  <div className="relative">
                    <select
                      value={pixKeyType}
                      onChange={(e) => setPixKeyType(e.target.value)}
                      className="w-full appearance-none px-3.5 py-2.5 bg-stone-50/70 border border-line rounded-xl text-sm text-ink focus:border-brand focus:bg-white focus:ring-1 focus:ring-brand outline-none transition-all pr-9 cursor-pointer"
                    >
                      <option value="cpf">CPF / CNPJ</option>
                      <option value="email">E-mail</option>
                      <option value="phone">Telefone</option>
                      <option value="random">Chave Aleatória</option>
                    </select>
                    <ChevronDown className="w-4 h-4 text-ink-soft absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs uppercase font-semibold text-ink-soft tracking-wider mb-1.5">
                    Chave PIX *
                  </label>
                  <input
                    type="text"
                    value={pixKey}
                    onChange={(e) => setPixKey(e.target.value)}
                    placeholder="Informe a chave cadastrada no seu banco..."
                    className="w-full px-3.5 py-2.5 bg-stone-50/70 border border-line rounded-xl text-sm font-mono text-ink placeholder:text-stone-400 focus:border-brand focus:bg-white focus:ring-1 focus:ring-brand outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase font-semibold text-ink-soft tracking-wider mb-1.5">
                    Nome do Titular da Conta *
                  </label>
                  <input
                    type="text"
                    value={pixHolderName}
                    onChange={(e) => setPixHolderName(e.target.value)}
                    placeholder="Ex: Studio Thais Eireli"
                    className="w-full px-3.5 py-2.5 bg-stone-50/70 border border-line rounded-xl text-sm text-ink placeholder:text-stone-400 focus:border-brand focus:bg-white focus:ring-1 focus:ring-brand outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase font-semibold text-ink-soft tracking-wider mb-1.5">
                    CPF/CNPJ do Titular (Opcional)
                  </label>
                  <input
                    type="text"
                    value={pixHolderDocument}
                    onChange={(e) => setPixHolderDocument(e.target.value)}
                    placeholder="00.000.000/0001-00"
                    className="w-full px-3.5 py-2.5 bg-stone-50/70 border border-line rounded-xl text-sm text-ink placeholder:text-stone-400 focus:border-brand focus:bg-white focus:ring-1 focus:ring-brand outline-none transition-all"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 3.1 Política de Cancelamento e Controle de Faltas (No-Show - Fase 44 D8 P1) */}
          <div className="rounded-[22px] border border-line bg-white shadow-xs p-6 sm:p-7">
            <div className="flex items-start gap-3.5 mb-5">
              <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-brand shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-display font-bold text-xl text-ink">Política de cancelamento & faltas (no-show)</h2>
                <p className="text-xs sm:text-sm text-ink-soft mt-0.5">
                  Defina a antecedência mínima para cancelamentos online e proteja sua agenda contra ausências imprevistas.
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1. Antecedência Mínima */}
                <div>
                  <label className="block text-xs uppercase font-semibold text-ink-soft tracking-wider mb-1.5">
                    Antecedência Mínima para Cancelar
                  </label>
                  <div className="relative">
                    <select
                      value={minCancellationHours}
                      onChange={(e) => setMinCancellationHours(Number(e.target.value))}
                      className="w-full appearance-none px-3.5 py-2.5 bg-stone-50/70 border border-line rounded-xl text-sm font-medium text-ink focus:border-brand focus:bg-white focus:ring-1 focus:ring-brand outline-none transition-all pr-9 cursor-pointer tabular-nums"
                    >
                      <option value={0}>Sem prazo (a qualquer momento)</option>
                      <option value={1}>1 hora antes</option>
                      <option value={2}>2 horas antes (Padrão)</option>
                      <option value={4}>4 horas antes</option>
                      <option value={6}>6 horas antes</option>
                      <option value={12}>12 horas antes</option>
                      <option value={24}>24 horas antes</option>
                      <option value={48}>48 horas antes</option>
                    </select>
                    <ChevronDown className="w-4 h-4 text-ink-soft absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                  <p className="text-[11px] text-ink-soft mt-1.5">
                    Com menos de {minCancellationHours}h, a cliente é direcionada a falar com a recepção.
                  </p>
                </div>

                {/* 2. Tolerância de Faltas */}
                <div>
                  <label className="block text-xs uppercase font-semibold text-ink-soft tracking-wider mb-1.5">
                    Tolerância de Faltas Sem Aviso
                  </label>
                  <div className="relative">
                    <select
                      value={noShowToleranceCount}
                      onChange={(e) => setNoShowToleranceCount(Number(e.target.value))}
                      className="w-full appearance-none px-3.5 py-2.5 bg-stone-50/70 border border-line rounded-xl text-sm font-medium text-ink focus:border-brand focus:bg-white focus:ring-1 focus:ring-brand outline-none transition-all pr-9 cursor-pointer tabular-nums"
                    >
                      <option value={1}>1 falta tolerada</option>
                      <option value={2}>2 faltas toleradas (Padrão)</option>
                      <option value={3}>3 faltas toleradas</option>
                      <option value={5}>5 faltas toleradas</option>
                    </select>
                    <ChevronDown className="w-4 h-4 text-ink-soft absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                  <p className="text-[11px] text-ink-soft mt-1.5">
                    Limite de faltas acumuladas antes de disparar a ação do salão.
                  </p>
                </div>

                {/* 3. Ação ao Atingir Tolerância */}
                <div>
                  <label className="block text-xs uppercase font-semibold text-ink-soft tracking-wider mb-1.5">
                    Ação ao Exceder as Faltas
                  </label>
                  <div className="relative">
                    <select
                      value={noShowPenaltyAction}
                      onChange={(e) => setNoShowPenaltyAction(e.target.value)}
                      className="w-full appearance-none px-3.5 py-2.5 bg-stone-50/70 border border-line rounded-xl text-sm font-medium text-ink focus:border-brand focus:bg-white focus:ring-1 focus:ring-brand outline-none transition-all pr-9 cursor-pointer"
                    >
                      <option value="warn">Apenas Alertar na Ficha do CRM</option>
                      <option value="require_deposit">Exigir Sinal PIX Obrigatório</option>
                      <option value="block">Bloquear Agendamento Online</option>
                    </select>
                    <ChevronDown className="w-4 h-4 text-ink-soft absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                  <p className="text-[11px] text-ink-soft mt-1.5">
                    {noShowPenaltyAction === 'warn' && 'Apenas destaca o histórico de faltas no prontuário da cliente.'}
                    {noShowPenaltyAction === 'require_deposit' && 'Novas reservas desta cliente exigirão pagamento de sinal PIX.'}
                    {noShowPenaltyAction === 'block' && 'A cliente não poderá agendar online até liberação pelo gestor.'}
                  </p>
                </div>
              </div>

              {/* Box Informativo Rosé Editorial */}
              <div className="rounded-xl border border-rose-200/70 bg-rose-50/40 p-4 text-xs text-rose-950 flex items-start gap-3">
                <Info className="w-4 h-4 text-brand shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-ink">Gestão Humanizada de Faltas:</p>
                  <p className="text-ink-soft leading-relaxed">
                    Sua equipe pode marcar falta diretamente pelo card do agendamento na agenda quando a cliente não comparecer. Na Ficha CRM da cliente, o gestor pode perdoar ausências ou reverter bloqueios com um único toque.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 4. Fidelização e Cashback */}
          <div className="rounded-[22px] border border-line bg-white shadow-xs p-6 sm:p-7">
            <div className="flex items-start gap-3.5 mb-5">
              <div className="w-10 h-10 rounded-xl bg-brand-tint flex items-center justify-center text-brand shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-display font-bold text-xl text-ink">Regras de cashback e fidelidade</h2>
                <p className="text-xs sm:text-sm text-ink-soft mt-0.5">
                  Retorne parte do valor gasto para a carteira da cliente e estimule novas visitas.
                </p>
              </div>
            </div>

            {!tenant?.features?.clube ? (
              <div className="rounded-xl border border-line/80 bg-stone-50/60 p-5 text-center flex flex-col items-center">
                <div className="w-9 h-9 rounded-full bg-stone-200/70 flex items-center justify-center text-ink-soft mb-2">
                  <Lock className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-semibold text-ink mb-1">Recurso do Clube Fidelidade</h3>
                <p className="text-xs text-ink-soft max-w-sm mb-3">
                  Ative o Clube de Assinaturas no seu plano SaaS para habilitar o Cashback automático por atendimento.
                </p>
                <button
                  type="button"
                  onClick={() => navigate(`/${tenant_slug}/staff/admin/assinatura`)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand hover:underline"
                >
                  Ver planos disponíveis <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase font-semibold text-ink-soft tracking-wider mb-1.5">
                    Porcentagem de Cashback (%)
                  </label>
                  <input
                    type="number"
                    value={cashbackPercentage}
                    onChange={(e) => setCashbackPercentage(e.target.value)}
                    placeholder="Ex: 5.0"
                    min="0"
                    max="100"
                    step="0.1"
                    className="w-full px-3.5 py-2.5 bg-stone-50/70 border border-line rounded-xl text-sm font-medium text-ink focus:border-brand focus:bg-white focus:ring-1 focus:ring-brand outline-none transition-all tabular-nums"
                  />
                  <p className="text-[11px] text-ink-soft mt-1">Percentual creditado na carteira da cliente ao concluir serviço.</p>
                </div>

                <div>
                  <label className="block text-xs uppercase font-semibold text-ink-soft tracking-wider mb-1.5">
                    Prazo de Expiração (Dias)
                  </label>
                  <input
                    type="number"
                    value={cashbackExpirationDays}
                    onChange={(e) => setCashbackExpirationDays(e.target.value)}
                    placeholder="Ex: 30"
                    min="1"
                    className="w-full px-3.5 py-2.5 bg-stone-50/70 border border-line rounded-xl text-sm font-medium text-ink focus:border-brand focus:bg-white focus:ring-1 focus:ring-brand outline-none transition-all tabular-nums"
                  />
                  <p className="text-[11px] text-ink-soft mt-1">Tempo limite para a cliente resgatar antes de expirar.</p>
                </div>
              </div>
            )}
          </div>

          {/* 5. Self Check-in e Mimos na Recepção */}
          <div className="rounded-[22px] border border-line bg-white shadow-xs p-6 sm:p-7">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-brand-tint flex items-center justify-center text-brand shrink-0">
                  <Coffee className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-display font-bold text-xl text-ink">Self check-in & menu de espera</h2>
                  <p className="text-xs sm:text-sm text-ink-soft mt-0.5">
                    Permita que as clientes confirmem presença e escolham um mimo ao chegarem no salão.
                  </p>
                </div>
              </div>

              {/* Switch Toggle */}
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={waitingMenuEnabled}
                  onChange={(e) => setWaitingMenuEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-stone-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand" />
              </label>
            </div>

            {waitingMenuEnabled && (
              <div className="pt-4 border-t border-line/60 space-y-4 animate-fade-in">
                <label className="block text-xs uppercase font-semibold text-ink-soft tracking-wider">
                  Mimos Disponíveis para as Clientes
                </label>

                <div className="flex flex-wrap gap-2">
                  {waitingMenuItems.map((item, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand-tint text-brand text-xs font-semibold"
                    >
                      <span>{item}</span>
                      <button
                        type="button"
                        onClick={() => setWaitingMenuItems(prev => prev.filter((_, i) => i !== idx))}
                        className="hover:text-red-700 transition-colors cursor-pointer"
                        title={`Remover ${item}`}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                  {waitingMenuItems.length === 0 && (
                    <span className="text-xs text-ink-soft italic">Nenhum mimo adicionado ainda.</span>
                  )}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newItemInput}
                    onChange={(e) => setNewItemInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (newItemInput.trim() && !waitingMenuItems.includes(newItemInput.trim())) {
                          setWaitingMenuItems([...waitingMenuItems, newItemInput.trim()]);
                          setNewItemInput('');
                        }
                      }
                    }}
                    placeholder="Ex: Chá gelado de hibisco (pressione Enter)"
                    className="flex-1 px-3.5 py-2.5 bg-stone-50/70 border border-line rounded-xl text-sm text-ink placeholder:text-stone-400 focus:border-brand focus:bg-white focus:ring-1 focus:ring-brand outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newItemInput.trim() && !waitingMenuItems.includes(newItemInput.trim())) {
                        setWaitingMenuItems([...waitingMenuItems, newItemInput.trim()]);
                        setNewItemInput('');
                      }
                    }}
                    className="px-4 py-2.5 rounded-xl border border-line hover:bg-stone-50 text-ink text-xs font-semibold transition-colors shrink-0 cursor-pointer"
                  >
                    Adicionar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Coluna Direita: Exceções, Cupons e Alerta Institucional (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* 1. Exceções de Horário e Feriados */}
          <div className="rounded-[22px] border border-line bg-white shadow-xs p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-brand-tint flex items-center justify-center text-brand">
                  <Calendar className="w-4 h-4" />
                </div>
                <h3 className="font-display font-bold text-lg text-ink">Exceções de horário</h3>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-stone-100 text-ink-soft tabular-nums">
                {exceptions.length}
              </span>
            </div>

            <p className="text-xs text-ink-soft mb-4">
              Datas de recesso, feriados ou dias com horário especial de atendimento.
            </p>

            <div className="space-y-2.5 mb-4 max-h-[280px] overflow-y-auto pr-1">
              {exceptions.map(exc => (
                <div key={exc.id} className="p-3 rounded-xl border border-line/70 bg-stone-50/50 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-ink truncate">{exc.reason || 'Sem motivo'}</p>
                    <p className="text-[11px] text-ink-soft mt-0.5">
                      {format(parseISO(exc.exception_date), 'dd/MM/yyyy')}
                      {exc.is_closed ? (
                        <span className="ml-1.5 px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 font-medium">Fechado</span>
                      ) : (
                        <span className="ml-1.5 text-ink-soft font-mono">{exc.open_time?.substring(0, 5)} às {exc.close_time?.substring(0, 5)}</span>
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteException(exc.id)}
                    className="p-1.5 rounded-lg text-ink-soft hover:text-red-700 hover:bg-red-50 transition-colors shrink-0 cursor-pointer"
                    title="Remover exceção"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {exceptions.length === 0 && (
                <p className="text-xs text-ink-soft italic py-3 text-center">Nenhuma exceção cadastrada.</p>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowExceptionModal(true)}
              className="w-full py-2.5 px-4 rounded-xl border border-line text-ink hover:bg-stone-50 text-xs font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-brand" />
              <span>Nova exceção</span>
            </button>
          </div>

          {/* 2. Cupons de Desconto */}
          <div className="rounded-[22px] border border-line bg-white shadow-xs p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-brand-tint flex items-center justify-center text-brand">
                  <Tag className="w-4 h-4" />
                </div>
                <h3 className="font-display font-bold text-lg text-ink">Cupons de desconto</h3>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-stone-100 text-ink-soft tabular-nums">
                {coupons.length}
              </span>
            </div>

            <p className="text-xs text-ink-soft mb-4">
              Códigos promocionais para aplicar no PDV ou no agendamento online.
            </p>

            <div className="space-y-2.5 mb-4 max-h-[280px] overflow-y-auto pr-1">
              {coupons.map(coupon => (
                <div key={coupon.id} className="p-3 rounded-xl border border-line/70 bg-stone-50/50 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-mono text-xs font-bold text-ink">{coupon.code}</span>
                      {coupon.service_id ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-200 text-stone-700 font-medium truncate max-w-[110px]">
                          {coupon.service_name || 'Específico'}
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-tint text-brand font-semibold">
                          Global
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-ink-soft">
                      {coupon.discount_type === 'percentage' ? `${coupon.discount_value}% OFF` : `${formatCurrency(coupon.discount_value)} OFF`}
                      {coupon.max_uses ? ` • ${coupon.current_uses || 0}/${coupon.max_uses} usos` : ''}
                      {coupon.expires_at ? ` • Até ${format(parseISO(coupon.expires_at), 'dd/MM/yy')}` : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteCoupon(coupon.id)}
                    className="p-1.5 rounded-lg text-ink-soft hover:text-red-700 hover:bg-red-50 transition-colors shrink-0 cursor-pointer"
                    title="Remover cupom"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {coupons.length === 0 && (
                <p className="text-xs text-ink-soft italic py-3 text-center">Nenhum cupom ativo.</p>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowCouponModal(true)}
              className="w-full py-2.5 px-4 rounded-xl border border-line text-ink hover:bg-stone-50 text-xs font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-brand" />
              <span>Novo cupom</span>
            </button>
          </div>

          {/* 3. Card Informativo Institucional */}
          <div className="rounded-[22px] border border-brand/20 bg-brand-tint/30 p-5">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-brand shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-brand mb-1">Impacto na Disponibilidade</h4>
                <p className="text-xs text-ink leading-relaxed">
                  Alterações na jornada afetam a grade de todos os profissionais. Atendimentos já confirmados fora dos novos horários exigirão alinhamento manual com os clientes.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Rosé: Nova Exceção de Horário */}
      {showExceptionModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-[24px] border border-line w-full max-w-md p-6 sm:p-7 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display font-bold text-xl text-ink">Adicionar exceção de data</h3>
              <button
                type="button"
                onClick={() => setShowExceptionModal(false)}
                className="p-1.5 rounded-lg text-ink-soft hover:text-ink transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs uppercase font-semibold text-ink-soft tracking-wider mb-1.5">
                  Motivo / Título
                </label>
                <input
                  type="text"
                  value={newException.reason}
                  onChange={(e) => setNewException({ ...newException, reason: e.target.value })}
                  placeholder="Ex: Feriado de Carnaval, Manutenção..."
                  className="w-full px-3.5 py-2.5 bg-stone-50/70 border border-line rounded-xl text-sm text-ink placeholder:text-stone-400 focus:border-brand focus:bg-white focus:ring-1 focus:ring-brand outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs uppercase font-semibold text-ink-soft tracking-wider mb-1.5">
                  Data da Exceção
                </label>
                <input
                  type="date"
                  value={newException.date}
                  onChange={(e) => setNewException({ ...newException, date: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-stone-50/70 border border-line rounded-xl text-sm text-ink focus:border-brand focus:bg-white focus:ring-1 focus:ring-brand outline-none transition-all"
                />
              </div>

              <div className="flex items-center gap-3 p-3 bg-stone-50/70 rounded-xl border border-line">
                <input
                  type="checkbox"
                  id="exc-closed"
                  checked={newException.is_closed}
                  onChange={(e) => setNewException({ ...newException, is_closed: e.target.checked })}
                  className="w-4 h-4 accent-brand cursor-pointer"
                />
                <label htmlFor="exc-closed" className="text-xs font-semibold text-ink cursor-pointer">
                  Salão fechado durante o dia inteiro?
                </label>
              </div>

              {!newException.is_closed && (
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-xs uppercase font-semibold text-ink-soft tracking-wider mb-1.5">
                      Abertura
                    </label>
                    <input
                      type="text"
                      value={newException.open_time}
                      onChange={(e) => setNewException({ ...newException, open_time: e.target.value })}
                      placeholder="09:00"
                      maxLength={5}
                      className="w-full px-3.5 py-2.5 bg-stone-50/70 border border-line rounded-xl text-sm text-center text-ink focus:border-brand focus:bg-white focus:ring-1 focus:ring-brand outline-none transition-all tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase font-semibold text-ink-soft tracking-wider mb-1.5">
                      Fechamento
                    </label>
                    <input
                      type="text"
                      value={newException.close_time}
                      onChange={(e) => setNewException({ ...newException, close_time: e.target.value })}
                      placeholder="18:00"
                      maxLength={5}
                      className="w-full px-3.5 py-2.5 bg-stone-50/70 border border-line rounded-xl text-sm text-center text-ink focus:border-brand focus:bg-white focus:ring-1 focus:ring-brand outline-none transition-all tabular-nums"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-line">
              <button
                type="button"
                onClick={() => setShowExceptionModal(false)}
                className="px-5 py-2.5 text-xs font-semibold text-ink-soft hover:bg-stone-50 rounded-full transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleAddException}
                className="px-6 py-2.5 text-xs font-semibold bg-brand hover:bg-brand-hover text-white rounded-full transition-colors shadow-xs cursor-pointer"
              >
                Adicionar exceção
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Rosé: Novo Cupom de Desconto */}
      {showCouponModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-[24px] border border-line w-full max-w-md p-6 sm:p-7 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display font-bold text-xl text-ink">Criar cupom de desconto</h3>
              <button
                type="button"
                onClick={() => setShowCouponModal(false)}
                className="p-1.5 rounded-lg text-ink-soft hover:text-ink transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs uppercase font-semibold text-ink-soft tracking-wider mb-1.5">
                  Código do Cupom *
                </label>
                <input
                  type="text"
                  value={newCoupon.code}
                  onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })}
                  placeholder="EX: PRIMEIRAVEZ20"
                  className="w-full px-3.5 py-2.5 bg-stone-50/70 border border-line rounded-xl text-sm font-mono uppercase text-ink placeholder:text-stone-400 focus:border-brand focus:bg-white focus:ring-1 focus:ring-brand outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs uppercase font-semibold text-ink-soft tracking-wider mb-1.5">
                  Válido Para
                </label>
                <div className="relative">
                  <select
                    value={newCoupon.service_id}
                    onChange={(e) => setNewCoupon({ ...newCoupon, service_id: e.target.value })}
                    className="w-full appearance-none px-3.5 py-2.5 bg-stone-50/70 border border-line rounded-xl text-sm text-ink focus:border-brand focus:bg-white focus:ring-1 focus:ring-brand outline-none transition-all pr-9 cursor-pointer"
                  >
                    <option value="">Todos os serviços (Global)</option>
                    {services.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-ink-soft absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs uppercase font-semibold text-ink-soft tracking-wider mb-1.5">
                    Tipo de Desconto
                  </label>
                  <div className="relative">
                    <select
                      value={newCoupon.discount_type}
                      onChange={(e) => setNewCoupon({ ...newCoupon, discount_type: e.target.value })}
                      className="w-full appearance-none px-3.5 py-2.5 bg-stone-50/70 border border-line rounded-xl text-sm text-ink focus:border-brand focus:bg-white focus:ring-1 focus:ring-brand outline-none transition-all pr-9 cursor-pointer"
                    >
                      <option value="percentage">Porcentagem (%)</option>
                      <option value="fixed">Valor Fixo (R$)</option>
                    </select>
                    <ChevronDown className="w-4 h-4 text-ink-soft absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs uppercase font-semibold text-ink-soft tracking-wider mb-1.5">
                    Valor do Desconto *
                  </label>
                  <input
                    type="number"
                    value={newCoupon.discount_value}
                    onChange={(e) => setNewCoupon({ ...newCoupon, discount_value: e.target.value })}
                    min="0"
                    step="0.01"
                    placeholder="10"
                    className="w-full px-3.5 py-2.5 bg-stone-50/70 border border-line rounded-xl text-sm text-ink focus:border-brand focus:bg-white focus:ring-1 focus:ring-brand outline-none transition-all tabular-nums"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs uppercase font-semibold text-ink-soft tracking-wider mb-1.5">
                    Máximo de Usos
                  </label>
                  <input
                    type="number"
                    value={newCoupon.max_uses}
                    onChange={(e) => setNewCoupon({ ...newCoupon, max_uses: e.target.value })}
                    placeholder="Ilimitado"
                    min="1"
                    className="w-full px-3.5 py-2.5 bg-stone-50/70 border border-line rounded-xl text-sm text-ink focus:border-brand focus:bg-white focus:ring-1 focus:ring-brand outline-none transition-all tabular-nums"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase font-semibold text-ink-soft tracking-wider mb-1.5">
                    Válido Até
                  </label>
                  <input
                    type="date"
                    value={newCoupon.expires_at}
                    onChange={(e) => setNewCoupon({ ...newCoupon, expires_at: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-stone-50/70 border border-line rounded-xl text-sm text-ink focus:border-brand focus:bg-white focus:ring-1 focus:ring-brand outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-line">
              <button
                type="button"
                onClick={() => setShowCouponModal(false)}
                className="px-5 py-2.5 text-xs font-semibold text-ink-soft hover:bg-stone-50 rounded-full transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleAddCoupon}
                className="px-6 py-2.5 text-xs font-semibold bg-brand hover:bg-brand-hover text-white rounded-full transition-colors shadow-xs cursor-pointer"
              >
                Criar cupom
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConfiguracoesOperacionais;
