import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  MessageCircle, 
  KeyRound, 
  Calendar as CalendarIcon, 
  Plus, 
  Upload, 
  X, 
  Check, 
  AlertCircle, 
  RefreshCw, 
  Trash2, 
  Image as ImageIcon,
  ChevronDown,
  User,
  Clock,
  ExternalLink,
  UserX,
  Lock,
  Unlock,
  RotateCcw,
  Layers,
  Camera,
  ShieldCheck,
  FileSignature,
  Maximize2
} from 'lucide-react';
import { format, differenceInYears } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useTenant } from '../context/TenantContext';
import { api } from '../lib/api';
import { useNotification } from '../context/NotificationProvider';
import { formatCurrency, formatNumber } from '../utils/formatters';
import { formatarTelefoneBR } from '../components/ui/CampoTelefone';
import NewAppointmentModal from '../components/NewAppointmentModal';

// Subcomponente de Anexo de Imagem da Timeline com tratamento do bug do print original e autenticação segura de CRM
const ImagemAnexoTimeline = ({ src, alt = 'Anexo da nota' }) => {
  const [hasError, setHasError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showLightbox, setShowLightbox] = useState(false);

  const fullSrc = useMemo(() => {
    if (!src) return '';
    let base = src.startsWith('http') || src.startsWith('/') ? src : `/uploads/${src}`;

    // Se for foto privada do CRM (/api/uploads/crm/), anexa o token de autenticação via query param
    if (base.includes('/uploads/crm') || base.includes('/api/uploads/crm')) {
      const token = localStorage.getItem('operabeauty_token') || localStorage.getItem('token');
      if (token && !base.includes('token=')) {
        base += (base.includes('?') ? '&' : '?') + `token=${encodeURIComponent(token)}`;
      }
    }
    return base;
  }, [src, retryKey]);

  if (hasError) {
    return (
      <div className="mt-3 p-3.5 bg-brand-tint/30 border border-brand/20 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-on-surface">
        <div className="flex items-center gap-2 text-brand">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="font-medium">
            [IMAGEM ANEXADA · se falhar, mostrar aviso e botão "Tentar de novo"]
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setHasError(false);
              setIsLoading(true);
              setRetryKey((k) => k + 1);
            }}
            className="inline-flex items-center gap-1 px-3 py-1 bg-white border border-line rounded-full text-xs font-semibold text-brand hover:bg-brand-tint transition-colors cursor-pointer shadow-2xs"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Tentar de novo</span>
          </button>
          <a
            href={fullSrc}
            target="_blank"
            rel="noreferrer"
            className="p-1 text-secondary hover:text-brand"
            title="Tentar abrir URL direta"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mt-3 relative rounded-xl overflow-hidden border border-line max-w-md bg-stone-100 group">
        {isLoading && (
          <div className="h-44 w-full flex items-center justify-center bg-stone-100 text-secondary text-xs animate-pulse">
            Carregando imagem anexada...
          </div>
        )}
        <img
          key={retryKey}
          src={fullSrc}
          alt={alt}
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setIsLoading(false);
            setHasError(true);
          }}
          onClick={() => setShowLightbox(true)}
          className={`w-full max-h-72 object-cover cursor-pointer hover:scale-[1.01] transition-transform duration-200 ${
            isLoading ? 'hidden' : 'block'
          }`}
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none" />
      </div>

      {/* Lightbox / Zoom da Imagem */}
      {showLightbox && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setShowLightbox(false)}
        >
          <div className="relative max-w-4xl max-h-[90vh] w-full flex items-center justify-center">
            <button
              onClick={() => setShowLightbox(false)}
              className="absolute -top-10 right-0 text-white/80 hover:text-white p-2"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={fullSrc}
              alt={alt}
              className="max-h-[85vh] max-w-full rounded-2xl object-contain shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </>
  );
};

const FichaClienteCRM = () => {
  const { tenant_slug, id } = useParams();
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotification();
  const { tenant, session } = useTenant();

  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ visits: 0, ltv: 0, favoriteServices: [], nextAppt: null });

  // Timeline / Prontuário
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [newImage, setNewImage] = useState(null);
  const [savingNote, setSavingNote] = useState(false);
  const fileInputRef = useRef(null);

  // VIP Dropdown
  const [isVipDropdownOpen, setIsVipDropdownOpen] = useState(false);

  // Anamnese
  const [anamnesisTemplate, setAnamnesisTemplate] = useState([]);
  const [anamnesisData, setAnamnesisData] = useState(null);
  const [isAnamnesisExpired, setIsAnamnesisExpired] = useState(false);

  // Modais
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [showPwdModal, setShowPwdModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  // Controle de Faltas e Bloqueio (D8)
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockReason, setBlockReason] = useState('');
  const [isTogglingBlock, setIsTogglingBlock] = useState(false);
  const [isResettingNoShows, setIsResettingNoShows] = useState(false);
  const [isTogglingOptOut, setIsTogglingOptOut] = useState(false);

  // Pacotes de Sessões da Cliente (D13)
  const [clientPackages, setClientPackages] = useState([]);
  const [showSellPackageModal, setShowSellPackageModal] = useState(false);
  const [availablePackages, setAvailablePackages] = useState([]);
  const [selectedPackageToSell, setSelectedPackageToSell] = useState('');
  const [packagePaymentMethod, setPackagePaymentMethod] = useState('pix');
  const [packageNotes, setPackageNotes] = useState('');
  const [isSellingPackage, setIsSellingPackage] = useState(false);

  // Evolução Clínica e Fotos Antes & Depois (D14)
  const [evolutions, setEvolutions] = useState([]);
  const [showEvolutionModal, setShowEvolutionModal] = useState(false);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [evolutionProcedure, setEvolutionProcedure] = useState('');
  const [evolutionDate, setEvolutionDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [evolutionNotes, setEvolutionNotes] = useState('');
  const [evolutionMeasurements, setEvolutionMeasurements] = useState({
    peso: '',
    cintura: '',
    quadril: '',
    busto: '',
    outros: ''
  });
  const [evolutionBeforePhotos, setEvolutionBeforePhotos] = useState([]);
  const [evolutionAfterPhotos, setEvolutionAfterPhotos] = useState([]);
  const [evolutionPhotoConsent, setEvolutionPhotoConsent] = useState('internal_only');
  const [isSavingEvolution, setIsSavingEvolution] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  useEffect(() => {
    if (!tenant || !id) return;
    fetchClientData();
  }, [tenant, id]);

  const fetchClientData = async () => {
    setLoading(true);
    try {
      // 1. Dados básicos e histórico de agendamentos
      const clientData = await api.clients.get(id);
      const apptsData = await api.appointments.list({ client_id: id });

      const cData = {
        ...clientData,
        cap_appointments: Array.isArray(apptsData) ? apptsData : []
      };
      setClient(cData);

      // 2. Cálculo das estatísticas
      const appts = cData.cap_appointments;
      const completed = appts.filter((a) => a.status === 'completed');
      const ltv = completed.reduce((sum, a) => sum + Number(a.total_price || 0), 0);

      // Ranking de serviços favoritos
      const srvCounts = {};
      completed.forEach((a) => {
        const srvName = a.service_name || a.cap_services?.name || 'Serviço';
        srvCounts[srvName] = (srvCounts[srvName] || 0) + 1;
      });
      const sortedServices = Object.keys(srvCounts)
        .map((k) => ({ name: k, count: srvCounts[k] }))
        .sort((a, b) => b.count - a.count);

      // Próximo agendamento futuro
      const now = new Date();
      const future = appts
        .filter((a) => new Date(a.start_time) > now && a.status === 'scheduled')
        .sort((a, b) => new Date(a.start_time) - new Date(b.start_time));

      setStats({
        visits: completed.length,
        ltv,
        favoriteServices: sortedServices.slice(0, 5),
        nextAppt: future.length > 0 ? future[0] : null
      });

      // 3. Carregar Linha do Tempo (CRM)
      try {
        const nData = await api.clients.getTimeline(id);
        setNotes(Array.isArray(nData) ? nData : []);
      } catch (nErr) {
        console.error('Erro ao carregar notas:', nErr);
      }

      // 4. Carregar Ficha de Anamnese
      try {
        const token = localStorage.getItem('operabeauty_token');
        const resTmpl = await fetch(`/api/anamnesis/template/${tenant.id}`);
        if (resTmpl.ok) {
          const tmpl = await resTmpl.json();
          setAnamnesisTemplate(tmpl.fields_schema || []);
        }

        const resAns = await fetch(`/api/anamnesis/client/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (resAns.ok) {
          const ans = await resAns.json();
          if (ans && Object.keys(ans.answers || {}).length > 0) {
            setAnamnesisData(ans);
            setIsAnamnesisExpired(ans.expires_at ? new Date(ans.expires_at) < new Date() : false);
          } else {
            setAnamnesisData(null);
            setIsAnamnesisExpired(false);
          }
        }
      } catch (err) {
        console.error('Erro ao carregar anamnese:', err);
      }

      // 5. Carregar Pacotes de Sessões da Cliente (D13)
      try {
        const pkgs = await api.packages.getClientPackages(id);
        setClientPackages(Array.isArray(pkgs) ? pkgs : []);
      } catch (pErr) {
        console.error('Erro ao carregar pacotes da cliente:', pErr);
      }

      // 6. Carregar Evoluções Clínicas e Procedimentos (D14)
      try {
        const evols = await api.evolutions.listByClient(id);
        setEvolutions(Array.isArray(evols) ? evols : []);
      } catch (eErr) {
        console.error('Erro ao carregar evoluções clínicas:', eErr);
      }
    } catch (err) {
      console.error(err);
      showError(err.message || 'Erro ao carregar dados da cliente.');
    } finally {
      setLoading(false);
    }
  };

  // Abertura do modal de venda de pacote
  const handleOpenSellPackageModal = async () => {
    setShowSellPackageModal(true);
    try {
      const res = await api.packages.list();
      const activeOnly = (Array.isArray(res) ? res : []).filter((p) => p.is_active);
      setAvailablePackages(activeOnly);
      if (activeOnly.length > 0 && !selectedPackageToSell) {
        setSelectedPackageToSell(activeOnly[0].id);
      }
    } catch (err) {
      console.error('Erro ao carregar lista de pacotes:', err);
    }
  };

  // Venda e crédito de pacote direto na ficha do CRM
  const handleSellPackage = async (e) => {
    e.preventDefault();
    if (!selectedPackageToSell) {
      showError('Selecione um pacote para vender.');
      return;
    }
    setIsSellingPackage(true);
    try {
      await api.packages.sell({
        package_id: selectedPackageToSell,
        client_id: id,
        payment_method: packagePaymentMethod,
        notes: packageNotes.trim() || undefined
      });
      showSuccess('Pacote vendido e creditado no saldo da cliente com sucesso!');
      setShowSellPackageModal(false);
      setPackageNotes('');
      const pkgs = await api.packages.getClientPackages(id);
      setClientPackages(Array.isArray(pkgs) ? pkgs : []);
    } catch (err) {
      console.error(err);
      showError(err.message || 'Erro ao processar venda do pacote.');
    } finally {
      setIsSellingPackage(false);
    }
  };

  // Handlers de Evolução Clínica e Antes/Depois (D14)
  const handleOpenEvolutionModal = () => {
    setEvolutionProcedure('');
    setEvolutionDate(format(new Date(), 'yyyy-MM-dd'));
    setEvolutionNotes('');
    setEvolutionMeasurements({ peso: '', cintura: '', quadril: '', busto: '', outros: '' });
    setEvolutionBeforePhotos([]);
    setEvolutionAfterPhotos([]);
    setEvolutionPhotoConsent('internal_only');
    setShowEvolutionModal(true);
  };

  const handleUploadEvolutionPhoto = async (e, type) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingPhoto(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const token = localStorage.getItem('operabeauty_token');
      const res = await fetch('/api/upload/image', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Falha no upload da foto');
      }

      const data = await res.json();
      if (type === 'before') {
        setEvolutionBeforePhotos((prev) => [...prev, data.url]);
      } else {
        setEvolutionAfterPhotos((prev) => [...prev, data.url]);
      }
      showSuccess('Foto anexada com sucesso!');
    } catch (err) {
      console.error(err);
      showError(err.message || 'Erro ao enviar foto.');
    } finally {
      setIsUploadingPhoto(false);
      e.target.value = '';
    }
  };

  const handleSaveEvolution = async (e) => {
    e.preventDefault();
    if (!evolutionProcedure.trim()) {
      showError('Por favor, informe o nome do procedimento realizado.');
      return;
    }

    setIsSavingEvolution(true);
    try {
      // Filtrar medidas preenchidas
      const cleanMeasurements = {};
      Object.entries(evolutionMeasurements).forEach(([k, v]) => {
        if (v && String(v).trim()) {
          cleanMeasurements[k] = String(v).trim();
        }
      });

      await api.evolutions.create({
        client_id: id,
        procedure_name: evolutionProcedure.trim(),
        session_date: evolutionDate,
        notes: evolutionNotes.trim(),
        measurements: cleanMeasurements,
        before_photos: evolutionBeforePhotos,
        after_photos: evolutionAfterPhotos,
        photo_consent_level: evolutionPhotoConsent
      });

      showSuccess('Sessão de evolução clínica registrada com sucesso!');
      setShowEvolutionModal(false);

      // Recarregar evoluções
      const evols = await api.evolutions.listByClient(id);
      setEvolutions(Array.isArray(evols) ? evols : []);
    } catch (err) {
      console.error(err);
      showError(err.message || 'Erro ao salvar evolução clínica.');
    } finally {
      setIsSavingEvolution(false);
    }
  };

  const handleDeleteEvolution = async (evolutionId) => {
    if (!window.confirm('Deseja realmente excluir este registro de evolução clínica?')) {
      return;
    }
    try {
      await api.evolutions.delete(evolutionId);
      showSuccess('Registro de evolução excluído com sucesso.');
      setEvolutions((prev) => prev.filter((item) => item.id !== evolutionId));
    } catch (err) {
      console.error(err);
      showError(err.message || 'Erro ao excluir evolução clínica.');
    }
  };

  // Alternar Opt-In / Opt-Out de Marketing (D15)
  const handleToggleOptOut = async () => {
    if (!client) return;
    const newOptOut = !client.marketing_opt_out;
    setIsTogglingOptOut(true);
    try {
      await api.campaigns.toggleClientOptOut(client.id, newOptOut);
      setClient((prev) => ({ ...prev, marketing_opt_out: newOptOut }));
      showSuccess(newOptOut ? 'Cliente retirado das campanhas de marketing (Opt-out).' : 'Cliente reativado para receber campanhas (Opt-in).');
    } catch (err) {
      console.error(err);
      showError(err.message || 'Erro ao alterar preferência de marketing.');
    } finally {
      setIsTogglingOptOut(false);
    }
  };

  // Atualizar Nível VIP
  const handleUpdateVipTier = async (newTier) => {
    try {
      const updated = await api.clients.update(id, { vip_tier: newTier });
      setClient((prev) => ({ ...prev, vip_tier: updated.vip_tier }));
      showSuccess(`Categoria VIP atualizada para ${newTier}!`);
    } catch (err) {
      console.error(err);
      showError('Erro ao atualizar categoria VIP.');
    }
  };

  // Zerar Faltas (No-Show)
  const handleResetNoShows = async () => {
    if (!window.confirm(`Deseja realmente zerar o histórico de ${client.no_show_count || 0} falta(s) de ${client.name}? Esta ação será registrada na linha do tempo.`)) {
      return;
    }
    setIsResettingNoShows(true);
    try {
      await api.clients.resetNoShows(id);
      showSuccess('Histórico de faltas zerado com sucesso!');
      await fetchClientData();
    } catch (err) {
      console.error(err);
      showError(err.message || 'Erro ao zerar faltas da cliente.');
    } finally {
      setIsResettingNoShows(false);
    }
  };

  // Bloquear ou Desbloquear Agendamentos Online
  const handleToggleBlock = async (shouldBlock, reason = '') => {
    setIsTogglingBlock(true);
    try {
      await api.clients.toggleBlock(id, { is_blocked: shouldBlock, reason });
      showSuccess(shouldBlock ? 'Agendamento online bloqueado para este cliente.' : 'Agendamento online liberado com sucesso!');
      setShowBlockModal(false);
      setBlockReason('');
      await fetchClientData();
    } catch (err) {
      console.error(err);
      showError(err.message || 'Erro ao atualizar restrição do cliente.');
    } finally {
      setIsTogglingBlock(false);
    }
  };

  // Badge de Nível VIP na Paleta Rosé Editorial
  const renderVipBadge = (tier) => {
    const rawTier = tier || 'Prata';
    const styles = {
      Prata: 'bg-stone-100 text-stone-700 border-stone-200/80',
      Ouro: 'bg-amber-50 text-amber-800 border-amber-200/80',
      VIP: 'bg-brand-tint text-brand border-brand/20',
      Black: 'bg-stone-900 text-amber-200 border-stone-800'
    };
    const styleClass = styles[rawTier] || styles.Prata;

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border shadow-2xs ${styleClass}`}>
        <span className="text-[11px]">★</span>
        {rawTier}
      </span>
    );
  };

  // Adicionar Nota à Linha do Tempo
  const handleAddNote = async () => {
    if (!newNote.trim() && !newImage) return;
    setSavingNote(true);
    try {
      const fd = new FormData();
      if (newNote.trim()) fd.append('content', newNote.trim());
      if (newImage) fd.append('image', newImage);

      await api.clients.addTimelineNote(client.id, fd);
      setNewNote('');
      setNewImage(null);
      showSuccess('Observação registrada com sucesso!');

      // Recarrega apenas a timeline
      const nData = await api.clients.getTimeline(id);
      setNotes(Array.isArray(nData) ? nData : []);
    } catch (err) {
      console.error(err);
      showError(err.message || 'Erro ao salvar anotação.');
    } finally {
      setSavingNote(false);
    }
  };

  // Excluir Nota
  const handleDeleteNote = async (noteId) => {
    if (!window.confirm('Tem certeza de que deseja excluir esta observação?')) return;
    try {
      await api.clients.deleteTimelineNote(client.id, noteId);
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
      showSuccess('Observação excluída.');
    } catch (err) {
      console.error(err);
      showError('Erro ao excluir observação.');
    }
  };

  // Redefinir Senha
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 4) {
      showError('A senha precisa ter pelo menos 4 caracteres.');
      return;
    }

    setIsResetting(true);
    try {
      await api.clients.updatePassword(client.id, newPassword);
      showSuccess(`Senha de ${client.name} redefinida com sucesso!`);
      setShowPwdModal(false);
      setNewPassword('');
    } catch (err) {
      console.error(err);
      showError(err.message || 'Erro ao redefinir a senha.');
    } finally {
      setIsResetting(false);
    }
  };

  // WhatsApp
  const handleOpenWhatsApp = (customMsg = null) => {
    if (!client?.phone) return;
    const clean = client.phone.replace(/\D/g, '');
    const finalPhone = clean.startsWith('55') ? clean : `55${clean}`;
    const saudacao = customMsg || `Olá ${client.name}! Tudo bem? Entramos em contato pelo ${tenant?.name || 'nosso salão'}.`;
    const url = `https://wa.me/${finalPhone}?text=${encodeURIComponent(saudacao)}`;
    window.open(url, '_blank');
  };

  // Enviar Link de Anamnese via WhatsApp
  const handleSendAnamnesisWhatsApp = () => {
    const link = `${window.location.origin}/${tenant_slug}/anamnese`;
    const msg = `Olá ${client.name}! Tudo bem? Para garantir a excelência e personalização do seu atendimento no ${tenant?.name || 'nosso espaço'}, por favor preencha sua ficha rápida de anamnese através do link:\n\n${link}\n\nLeva menos de 2 minutos!`;
    handleOpenWhatsApp(msg);
  };

  if (loading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-8 h-8 border-3 border-brand/30 border-t-brand rounded-full animate-spin" />
        <p className="text-sm text-secondary">Carregando ficha da cliente...</p>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="p-12 text-center max-w-md mx-auto">
        <div className="w-12 h-12 rounded-full bg-brand-tint text-brand flex items-center justify-center mx-auto mb-3">
          <User className="w-6 h-6" />
        </div>
        <h2 className="font-serif text-xl font-bold text-on-surface">Cliente não encontrada</h2>
        <p className="text-xs text-secondary mt-1 mb-4">O cadastro solicitado não existe ou você não tem acesso.</p>
        <Link
          to={`/${tenant_slug}/staff/admin/clientes`}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand text-white text-xs font-semibold rounded-full hover:bg-brand-dark transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Voltar para Clientes</span>
        </Link>
      </div>
    );
  }

  // Tratamento da data de nascimento
  const parseLocalBirthDate = (dateStr) => {
    if (!dateStr) return null;
    const [year, month, day] = String(dateStr).split('T')[0].split('-');
    return new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
  };
  const localBirthDate = parseLocalBirthDate(client.birth_date);
  const age = localBirthDate ? differenceInYears(new Date(), localBirthDate) : null;

  const initials = (client.name || 'C')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-[1360px] mx-auto w-full flex flex-col gap-6 animate-fade-in">
      
      {/* 1. Topo Canônico: Voltar + Nome Playfair + Ações (+ Agendar e Redefinir Senha) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <Link
            to={`/${tenant_slug}/staff/admin/clientes`}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-secondary hover:text-brand transition-colors mb-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Clientes</span>
          </Link>
          <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold text-on-surface tracking-tight">
            {client.name}
          </h1>
        </div>

        {/* Ações no Topo */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Botão Secundário: Redefinir Senha */}
          <button
            onClick={() => {
              setNewPassword('');
              setShowPwdModal(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-brand text-brand hover:bg-brand-tint/60 text-xs sm:text-sm font-medium transition-colors cursor-pointer"
          >
            <KeyRound className="w-4 h-4" />
            <span>Redefinir senha</span>
          </button>

          {/* Botão Primário: + Agendar */}
          <button
            onClick={() => setShowAppointmentModal(true)}
            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-brand text-white hover:bg-brand-dark text-xs sm:text-sm font-medium transition-colors shadow-2xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Agendar</span>
          </button>
        </div>
      </div>

      {/* Banner de Bloqueio Online se ativo */}
      {client.is_blocked && (
        <div className="bg-red-50/90 border border-red-200/90 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-red-950 shadow-2xs">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-red-100 text-red-700 shrink-0 mt-0.5">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-semibold text-sm">Agendamento Online Restrito</h4>
              <p className="text-xs text-red-800 mt-0.5">
                {client.blocked_reason || 'Cliente com restrição de agendamentos pelo link público devido a faltas/política do salão.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleToggleBlock(false)}
            disabled={isTogglingBlock}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full bg-white border border-red-300 hover:bg-red-100/60 text-red-800 text-xs font-semibold transition-colors shrink-0 shadow-2xs cursor-pointer"
          >
            <Unlock className="w-3.5 h-3.5" />
            <span>{isTogglingBlock ? 'Liberando...' : 'Liberar Agendamentos'}</span>
          </button>
        </div>
      )}

      {/* 2. Grid de Duas Colunas Canônica (G4) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* ========================================================
            COLUNA ESQUERDA: Perfil da Cliente, Métricas e Top Serviços (5 cols)
            ======================================================== */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="bg-white border border-line rounded-[22px] p-6 shadow-2xs flex flex-col gap-5">
            
            {/* Topo do Card: Avatar + Badge Nível + Classificar */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-brand-tint border border-brand/20 text-brand font-serif font-bold text-2xl flex items-center justify-center shrink-0 shadow-2xs">
                {initials}
              </div>

              <div className="flex flex-col items-start gap-1">
                {renderVipBadge(client.vip_tier)}

                {/* Dropdown de Classificação VIP */}
                <div className="relative mt-0.5">
                  <button
                    type="button"
                    onClick={() => setIsVipDropdownOpen(!isVipDropdownOpen)}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-secondary hover:text-brand transition-colors cursor-pointer"
                  >
                    <span>Classificar</span>
                    <ChevronDown className="w-3 h-3" />
                  </button>

                  {isVipDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-20" onClick={() => setIsVipDropdownOpen(false)} />
                      <div className="absolute left-0 top-full mt-1.5 w-32 bg-white border border-line rounded-xl shadow-lg py-1.5 z-30 animate-fade-in">
                        {['Prata', 'Ouro', 'VIP', 'Black'].map((tier) => (
                          <button
                            key={tier}
                            type="button"
                            onClick={() => {
                              handleUpdateVipTier(tier);
                              setIsVipDropdownOpen(false);
                            }}
                            className={`w-full text-left px-3 py-1.5 text-xs font-medium hover:bg-brand-tint/40 flex items-center justify-between transition-colors cursor-pointer ${
                              (client.vip_tier || 'Prata') === tier ? 'text-brand font-semibold bg-brand-tint/20' : 'text-on-surface'
                            }`}
                          >
                            <span>{tier}</span>
                            {(client.vip_tier || 'Prata') === tier && <Check className="w-3.5 h-3.5 text-brand" />}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Dados de Contato e Aniversário */}
            <div className="flex flex-col gap-1.5 pt-1 border-t border-line/60">
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-sm text-on-surface font-medium">
                  {formatarTelefoneBR(client.phone)}
                </span>
                <button
                  type="button"
                  onClick={() => handleOpenWhatsApp()}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/80 text-[11px] font-semibold transition-colors cursor-pointer"
                >
                  <MessageCircle className="w-3 h-3 text-emerald-600" />
                  <span>WhatsApp</span>
                </button>
              </div>

              <p className="text-xs text-secondary">
                {localBirthDate 
                  ? `Aniversário: ${format(localBirthDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })} (${age} anos)`
                  : 'Aniversário: Não informado'}
              </p>

              {/* Preferência de Campanhas Automáticas / Opt-out (D15) */}
              <div className="flex items-center justify-between pt-2 border-t border-line/40 text-xs">
                <span className="text-secondary flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm">campaign</span>
                  Campanhas Automáticas:
                </span>
                <button
                  type="button"
                  onClick={handleToggleOptOut}
                  disabled={isTogglingOptOut}
                  title={client.marketing_opt_out ? "Clique para ativar recebimento de promoções" : "Clique para desativar recebimento de promoções"}
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border transition-all cursor-pointer ${
                    client.marketing_opt_out
                      ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-current" />
                  <span>{client.marketing_opt_out ? 'Desativado (Opt-out)' : 'Ativo (Recebe ofertas)'}</span>
                </button>
              </div>
            </div>

            {/* Blocos de Métricas: VISITAS, TOTAL GASTO e FALTAS (NO-SHOW) */}
            <div className="grid grid-cols-3 gap-2.5 pt-2">
              <div className="bg-stone-50 border border-line/60 rounded-xl p-3 flex flex-col justify-between">
                <span className="text-[10px] font-semibold text-secondary uppercase tracking-wider mb-1">
                  VISITAS
                </span>
                <span className="text-xl font-bold text-on-surface tabular-nums">
                  {formatNumber(stats.visits)}
                </span>
              </div>

              <div className="bg-stone-50 border border-line/60 rounded-xl p-3 flex flex-col justify-between">
                <span className="text-[10px] font-semibold text-secondary uppercase tracking-wider mb-1">
                  TOTAL GASTO
                </span>
                <span className="text-base sm:text-lg font-bold text-on-surface tabular-nums lining-nums mt-0.5 truncate">
                  {formatCurrency(stats.ltv)}
                </span>
              </div>

              <div className={`border rounded-xl p-3 flex flex-col justify-between ${
                (client.no_show_count || 0) > 0 
                  ? 'bg-amber-50/60 border-amber-200/80 text-amber-950' 
                  : 'bg-stone-50 border-line/60 text-on-surface'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-secondary">
                    FALTAS
                  </span>
                  {(client.no_show_count || 0) > 0 && (
                    <button
                      type="button"
                      onClick={handleResetNoShows}
                      disabled={isResettingNoShows}
                      title="Zerar faltas"
                      className="text-secondary hover:text-brand transition-colors p-0.5 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className={`text-xl font-bold tabular-nums ${
                    (client.no_show_count || 0) > 0 ? 'text-amber-800' : 'text-on-surface'
                  }`}>
                    {client.no_show_count || 0}
                  </span>
                  <span className="text-[10px] text-secondary">
                    no-show
                  </span>
                </div>
              </div>
            </div>

            {/* Controle de Status de Agendamento Online */}
            <div className={`p-3 rounded-xl border flex items-center justify-between text-xs transition-colors ${
              client.is_blocked
                ? 'bg-red-50/40 border-red-200/60 text-red-900'
                : 'bg-stone-50/60 border-line/60 text-on-surface'
            }`}>
              <div className="flex items-center gap-2">
                {client.is_blocked ? (
                  <Lock className="w-3.5 h-3.5 text-red-600 shrink-0" />
                ) : (
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                )}
                <span className="font-medium text-xs">
                  {client.is_blocked ? 'Agendamento online bloqueado' : 'Agendamento online liberado'}
                </span>
              </div>
              {client.is_blocked ? (
                <button
                  type="button"
                  onClick={() => handleToggleBlock(false)}
                  disabled={isTogglingBlock}
                  className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer"
                >
                  {isTogglingBlock ? 'Liberando...' : 'Liberar'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setBlockReason('Excesso de faltas consecutivas sem aviso prévio.');
                    setShowBlockModal(true);
                  }}
                  className="text-[11px] font-semibold text-red-600 hover:text-red-700 hover:underline cursor-pointer"
                >
                  Bloquear
                </button>
              )}
            </div>

            {/* Seção: SERVIÇOS MAIS FEITOS */}
            <div className="pt-2 border-t border-line/60 flex flex-col gap-2">
              <span className="text-[11px] font-semibold text-secondary uppercase tracking-wider">
                SERVIÇOS MAIS FEITOS
              </span>

              {stats.favoriteServices && stats.favoriteServices.length > 0 ? (
                <div className="space-y-1.5">
                  {stats.favoriteServices.map((srv, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between py-1.5 text-xs text-on-surface border-b border-line/30 last:border-0"
                    >
                      <span className="font-medium truncate max-w-[200px]">
                        {idx + 1}º {srv.name}
                      </span>
                      <span className="tabular-nums font-semibold text-secondary">
                        {srv.count}x
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-secondary py-1 italic">
                  Nenhum serviço realizado ainda.
                </p>
              )}
            </div>
          </div>

          {/* Card: Pacotes de Sessões da Cliente (D13) */}
          <div className="bg-white border border-line rounded-[22px] p-6 shadow-2xs flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-brand-tint text-brand flex items-center justify-center shrink-0">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-serif text-base font-bold text-on-surface">
                    Pacotes de Sessões
                  </h3>
                  <p className="text-[11px] text-secondary">
                    Controle de saldo pré-pago
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleOpenSellPackageModal}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-brand-tint text-brand hover:bg-brand hover:text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Vender Pacote</span>
              </button>
            </div>

            {clientPackages.length === 0 ? (
              <div className="p-4 bg-stone-50 border border-line/60 rounded-xl text-center flex flex-col items-center gap-2">
                <p className="text-xs text-secondary italic">
                  Esta cliente ainda não possui pacotes de sessões contratados.
                </p>
                <button
                  type="button"
                  onClick={handleOpenSellPackageModal}
                  className="text-xs font-semibold text-brand hover:underline cursor-pointer"
                >
                  + Vender primeiro pacote
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {clientPackages.map((cpkg) => {
                  const pct = Math.round((cpkg.remaining_sessions / Math.max(1, cpkg.total_sessions)) * 100);
                  const isExpired = cpkg.expires_at ? new Date(cpkg.expires_at) < new Date() : false;
                  const isActive = cpkg.status === 'active' && !isExpired && cpkg.remaining_sessions > 0;

                  return (
                    <div
                      key={cpkg.id}
                      className="p-3.5 bg-stone-50/80 border border-line/60 rounded-xl flex flex-col gap-2.5 transition-all hover:border-brand/30"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="text-xs font-bold text-on-surface">
                            {cpkg.package_name || cpkg.cap_packages?.name}
                          </h4>
                          <p className="text-[11px] text-secondary">
                            {cpkg.service_name || cpkg.cap_packages?.cap_services?.name || 'Serviço'}
                          </p>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          isActive
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : cpkg.remaining_sessions === 0
                            ? 'bg-stone-100 text-stone-600 border border-stone-200'
                            : 'bg-red-50 text-red-800 border border-red-200'
                        }`}>
                          {isActive ? 'Ativo' : cpkg.remaining_sessions === 0 ? 'Concluído' : 'Expirado'}
                        </span>
                      </div>

                      {/* Progresso de Sessões */}
                      <div>
                        <div className="flex justify-between items-center text-[11px] mb-1">
                          <span className="text-secondary">Saldo restante:</span>
                          <span className="font-bold text-brand tabular-nums">
                            {cpkg.remaining_sessions} de {cpkg.total_sessions} sessões
                          </span>
                        </div>
                        <div className="w-full h-2 bg-stone-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-brand rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                          />
                        </div>
                      </div>

                      {/* Metadados e datas */}
                      <div className="pt-2 border-t border-line/40 flex items-center justify-between text-[10px] text-secondary">
                        <span>
                          Validade: {cpkg.expires_at ? format(new Date(cpkg.expires_at), 'dd/MM/yyyy') : 'Sem expiração'}
                        </span>
                        {cpkg.last_session_at ? (
                          <span>Última sessão: {format(new Date(cpkg.last_session_at), 'dd/MM/yyyy')}</span>
                        ) : (
                          <span>Nenhuma sessão usada</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ========================================================
            COLUNA DIREITA: Ficha de Anamnese & Observações da Equipe (7 cols)
            ======================================================== */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          
          {/* 1. Card: Ficha de Anamnese */}
          <div className="bg-white border border-line rounded-[22px] p-6 shadow-2xs flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-xl font-bold text-on-surface">
                Ficha de anamnese
              </h2>
              {/* Badge de Status Canônica: Pendente (Âmbar suave) ou Atualizada (Verde suave) */}
              {anamnesisData ? (
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/80">
                  Atualizada
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200/80">
                  Pendente
                </span>
              )}
            </div>

            {/* Descrição do Estado */}
            {!anamnesisData ? (
              <div className="flex flex-col gap-3">
                <p className="text-xs sm:text-sm text-secondary">
                  A cliente ainda não preencheu a ficha.
                </p>
                <div>
                  <button
                    type="button"
                    onClick={handleSendAnamnesisWhatsApp}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-brand text-brand hover:bg-brand hover:text-white text-xs font-medium transition-colors cursor-pointer"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>Enviar link pelo WhatsApp</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-secondary pb-1 border-b border-line/50">
                  <p>
                    Última resposta registrada em:{' '}
                    <span className="font-medium text-on-surface">
                      {anamnesisData.updated_at 
                        ? format(new Date(anamnesisData.updated_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                        : 'Data indisponível'}
                    </span>
                  </p>
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-brand">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Criptografia AES-256 em Repouso</span>
                  </span>
                </div>

                {/* Status do Termo de Consentimento e Assinatura Digital */}
                {anamnesisData.terms_accepted ? (
                  <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                      <div className="text-xs">
                        <p className="font-semibold text-emerald-950">
                          Termo de Consentimento (v{anamnesisData.terms_version || 1}) Assinado
                        </p>
                        <p className="text-emerald-800 text-[11px] mt-0.5">
                          Aceite digital em {anamnesisData.consented_at ? format(new Date(anamnesisData.consented_at), "dd/MM/yyyy 'às' HH:mm") : 'data registrada'} 
                          {anamnesisData.consent_ip_address ? ` • IP: ${anamnesisData.consent_ip_address}` : ''}
                        </p>
                        {anamnesisData.consent_hash && (
                          <p className="text-[10px] text-emerald-700/80 font-mono mt-1 truncate max-w-xs sm:max-w-md">
                            Hash SHA-256: {anamnesisData.consent_hash.slice(0, 16)}...{anamnesisData.consent_hash.slice(-8)}
                          </p>
                        )}
                      </div>
                    </div>

                    {anamnesisData.signature_data && (
                      <button
                        type="button"
                        onClick={() => setShowSignatureModal(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-100 text-xs font-semibold transition-colors shrink-0 shadow-2xs cursor-pointer"
                      >
                        <FileSignature className="w-3.5 h-3.5" />
                        <span>Ver Assinatura</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-3.5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs text-amber-900">
                      <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                      <span>Termo de consentimento digital pendente de assinatura pela cliente.</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleSendAnamnesisWhatsApp}
                      className="text-xs font-semibold text-amber-900 underline hover:text-amber-950 shrink-0"
                    >
                      Cobrar via WhatsApp
                    </button>
                  </div>
                )}

                {/* Respostas das Perguntas de Saúde */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {anamnesisTemplate.map((field) => {
                    const ans = anamnesisData.answers?.[field.id];
                    let display = 'Não informado';
                    if (ans !== undefined && ans !== null && ans !== '') {
                      display = Array.isArray(ans) ? ans.join(', ') : String(ans);
                    }
                    return (
                      <div key={field.id} className="bg-stone-50 border border-line/60 rounded-xl p-3">
                        <p className="text-[11px] font-semibold text-secondary uppercase tracking-wider mb-0.5">
                          {field.label}
                        </p>
                        <p className="text-xs sm:text-sm font-medium text-on-surface">
                          {display}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 2. Card: Evoluções Clínicas, Procedimentos & Antes/Depois (D14) */}
          <div className="bg-white border border-line rounded-[22px] p-6 shadow-2xs flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-serif text-xl font-bold text-on-surface">
                  Evolução clínica & Sessões
                </h2>
                <p className="text-xs text-secondary mt-0.5">
                  Prontuário com fotos comparativas antes/depois, medidas e notas de procedimento.
                </p>
              </div>

              <button
                type="button"
                onClick={handleOpenEvolutionModal}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-brand text-white text-xs font-semibold hover:bg-brand-hover active:scale-95 transition-all shadow-2xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Nova sessão</span>
              </button>
            </div>

            {evolutions.length === 0 ? (
              <div className="bg-stone-50/70 border border-dashed border-line rounded-2xl p-8 text-center text-secondary">
                <Camera className="w-10 h-10 text-secondary/40 mx-auto mb-2" />
                <p className="text-sm font-semibold text-on-surface">Nenhuma evolução registrada</p>
                <p className="text-xs text-secondary mt-1 max-w-sm mx-auto">
                  Registre as sessões de tratamento com medidas corporais/faciais e fotos comparativas para acompanhar os resultados da cliente.
                </p>
                <button
                  type="button"
                  onClick={handleOpenEvolutionModal}
                  className="mt-4 inline-flex items-center gap-1 px-4 py-2 rounded-full border border-brand text-brand hover:bg-brand hover:text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Registrar primeira sessão</span>
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {evolutions.map((evol) => {
                  const consentLabels = {
                    internal_only: 'Uso Interno',
                    social_media_anonymous: 'Redes Sociais (Anônimo)',
                    social_media_full: 'Redes Sociais (Autorizado)',
                    none: 'Sem Consentimento'
                  };

                  const beforeList = Array.isArray(evol.before_photos) ? evol.before_photos : [];
                  const afterList = Array.isArray(evol.after_photos) ? evol.after_photos : [];
                  const measurementsList = Object.entries(evol.measurements || {});

                  return (
                    <div
                      key={evol.id}
                      className="bg-stone-50/60 border border-line rounded-2xl p-4 sm:p-5 space-y-3.5 transition-all hover:bg-stone-50"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-line/60">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-serif text-base font-bold text-on-surface">
                              {evol.procedure_name}
                            </h3>
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-brand/10 text-brand">
                              {consentLabels[evol.photo_consent_level] || 'Uso Interno'}
                            </span>
                          </div>
                          <p className="text-xs text-secondary mt-0.5">
                            {format(new Date(evol.session_date), 'dd/MM/yyyy')} • Atendido por{' '}
                            <span className="font-medium text-on-surface">{evol.staff_name || 'Profissional'}</span>
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteEvolution(evol.id)}
                          className="text-stone-400 hover:text-red-600 transition-colors self-end sm:self-center p-1"
                          title="Excluir sessão"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Anotações da Sessão */}
                      {evol.notes && (
                        <p className="text-xs sm:text-sm text-on-surface leading-relaxed whitespace-pre-wrap">
                          {evol.notes}
                        </p>
                      )}

                      {/* Medidas Registradas */}
                      {measurementsList.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {measurementsList.map(([key, val]) => (
                            <div
                              key={key}
                              className="px-3 py-1 rounded-xl bg-white border border-line text-xs flex items-center gap-1.5 shadow-2xs"
                            >
                              <span className="font-semibold text-secondary uppercase tracking-wider text-[10px]">
                                {key}:
                              </span>
                              <span className="font-bold text-on-surface">{val}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Fotos Antes e Depois */}
                      {(beforeList.length > 0 || afterList.length > 0) && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                          {/* Coluna Antes */}
                          <div className="space-y-1.5">
                            <span className="text-[11px] font-semibold text-secondary uppercase tracking-wider block">
                              Antes ({beforeList.length})
                            </span>
                            {beforeList.length === 0 ? (
                              <div className="h-24 bg-stone-100 rounded-xl border border-line flex items-center justify-center text-secondary/50 text-xs italic">
                                Nenhuma foto
                              </div>
                            ) : (
                              <div className="grid grid-cols-2 gap-2">
                                {beforeList.map((url, idx) => (
                                  <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-line bg-stone-100 group">
                                    <img
                                      src={url}
                                      alt={`Antes ${idx + 1}`}
                                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                    />
                                    <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/60 text-white text-[9px] font-semibold">
                                      Antes
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Coluna Depois */}
                          <div className="space-y-1.5">
                            <span className="text-[11px] font-semibold text-secondary uppercase tracking-wider block">
                              Depois ({afterList.length})
                            </span>
                            {afterList.length === 0 ? (
                              <div className="h-24 bg-stone-100 rounded-xl border border-line flex items-center justify-center text-secondary/50 text-xs italic">
                                Nenhuma foto
                              </div>
                            ) : (
                              <div className="grid grid-cols-2 gap-2">
                                {afterList.map((url, idx) => (
                                  <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-line bg-stone-100 group">
                                    <img
                                      src={url}
                                      alt={`Depois ${idx + 1}`}
                                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                    />
                                    <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-brand/80 text-white text-[9px] font-semibold">
                                      Depois
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 2. Card: Observações da Equipe (Timeline & Upload) */}
          <div className="bg-white border border-line rounded-[22px] p-6 shadow-2xs flex flex-col gap-5">
            <h2 className="font-serif text-xl font-bold text-on-surface">
              Observações da equipe
            </h2>

            {/* Caixa de Texto para Nova Observação */}
            <div className="space-y-3">
              <textarea
                rows="3"
                placeholder="Preferências, misturas, alertas..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                className="w-full p-3.5 bg-white border border-line rounded-xl text-xs sm:text-sm text-on-surface placeholder:text-secondary/70 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand resize-none transition-all"
              />

              {/* Prévia de Imagem Selecionada */}
              {newImage && (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-brand-tint/40 border border-brand/20 rounded-xl text-xs text-brand font-medium">
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span className="truncate max-w-[200px]">{newImage.name}</span>
                  <button
                    type="button"
                    onClick={() => setNewImage(null)}
                    className="hover:text-error transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Barra de Ações: Anexar Imagem e Salvar Observação */}
              <div className="flex items-center justify-between gap-3 pt-1">
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => setNewImage(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-brand text-brand hover:bg-brand-tint/60 text-xs font-medium transition-colors cursor-pointer"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>Anexar imagem</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleAddNote}
                  disabled={savingNote || (!newNote.trim() && !newImage)}
                  className={`px-5 py-2 rounded-full text-xs font-semibold transition-all ${
                    !newNote.trim() && !newImage
                      ? 'bg-stone-300 text-stone-600 cursor-not-allowed'
                      : 'bg-brand text-white hover:bg-brand-dark cursor-pointer shadow-2xs'
                  }`}
                >
                  {savingNote ? 'Salvando...' : 'Salvar observação'}
                </button>
              </div>
            </div>

            {/* Linha do Tempo de Observações */}
            <div className="pt-3 border-t border-line/60 space-y-3">
              {notes.length === 0 ? (
                <p className="text-xs text-secondary py-3 text-center italic">
                  Nenhuma observação registrada para esta cliente ainda.
                </p>
              ) : (
                notes.map((note) => {
                  const author = note.cap_staff?.name || 'Profissional';
                  const dateStr = note.created_at
                    ? format(new Date(note.created_at), "dd MMM yyyy, HH:mm", { locale: ptBR })
                    : '';

                  return (
                    <div
                      key={note.id}
                      className="p-4 bg-stone-50 border border-line/60 rounded-xl flex flex-col gap-2 relative group"
                    >
                      <div className="flex items-center justify-between text-xs text-secondary">
                        <span className="font-semibold text-on-surface">
                          {author} <span className="font-normal text-secondary">· {dateStr}</span>
                        </span>
                        {(session?.role === 'manager' || session?.id === note.staff_id) && (
                          <button
                            type="button"
                            onClick={() => handleDeleteNote(note.id)}
                            title="Excluir nota"
                            className="opacity-0 group-hover:opacity-100 text-secondary hover:text-error transition-opacity cursor-pointer p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {note.content && (
                        <p className="text-xs sm:text-sm text-on-surface whitespace-pre-wrap">
                          {note.content}
                        </p>
                      )}

                      {/* Anexo de Imagem Resiliente */}
                      {note.image_path && (
                        <ImagemAnexoTimeline src={note.image_path} />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Modal: Redefinir Senha */}
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
              Informe a nova senha de acesso para <strong>{client.name}</strong>.
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

      {/* 4. Modal: Novo Agendamento (com cliente pré-selecionado) */}
      {showAppointmentModal && (
        <NewAppointmentModal
          isOpen={showAppointmentModal}
          onClose={() => setShowAppointmentModal(false)}
          initialClient={client}
          onSuccess={() => {
            setShowAppointmentModal(false);
            fetchClientData();
          }}
        />
      )}

      {/* 5. Modal: Bloquear Agendamento Online */}
      {showBlockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white border border-line rounded-[24px] shadow-xl max-w-sm w-full p-6 relative animate-in zoom-in-95 duration-150">
            <button
              onClick={() => setShowBlockModal(false)}
              className="absolute top-5 right-5 text-secondary hover:text-on-surface transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-10 h-10 rounded-full bg-red-100 text-red-700 flex items-center justify-center mb-3">
              <Lock className="w-5 h-5" />
            </div>

            <h3 className="font-serif text-lg font-bold text-on-surface mb-1">
              Restringir Agendamento Online
            </h3>
            <p className="text-xs text-secondary mb-4">
              Informe o motivo para bloquear novos agendamentos online de <strong>{client.name}</strong>.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleToggleBlock(true, blockReason);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-secondary uppercase tracking-wider mb-1">
                  Motivo da Restrição *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Ex: Excesso de faltas consecutivas sem aviso prévio."
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-line rounded-xl text-xs sm:text-sm text-on-surface focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBlockModal(false)}
                  className="px-4 py-2 rounded-full border border-line text-secondary hover:text-on-surface text-xs font-medium transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isTogglingBlock}
                  className="px-5 py-2 rounded-full bg-red-700 text-white hover:bg-red-800 text-xs font-semibold transition-colors shadow-2xs disabled:opacity-50 cursor-pointer"
                >
                  {isTogglingBlock ? 'Bloqueando...' : 'Confirmar Bloqueio'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Vender Pacote de Sessões Direto no CRM (D13) */}
      {showSellPackageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl border border-line p-6 max-w-md w-full shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-brand-tint text-brand flex items-center justify-center shrink-0">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif text-lg font-bold text-on-surface">
                    Vender Pacote de Sessões
                  </h3>
                  <p className="text-xs text-secondary">
                    Cliente: <strong>{client.name}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSellPackageModal(false)}
                className="p-1 rounded-full text-secondary hover:text-on-surface hover:bg-stone-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSellPackage} className="mt-4 space-y-4">
              {availablePackages.length === 0 ? (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-center text-xs text-amber-900">
                  Nenhum pacote ativo cadastrado no catálogo do salão. Cadastre pacotes na aba Catálogo &gt; Pacotes de Sessões.
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-secondary uppercase tracking-wider mb-1.5">
                      Selecione o Modelo de Pacote *
                    </label>
                    <select
                      value={selectedPackageToSell}
                      onChange={(e) => setSelectedPackageToSell(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-line rounded-xl text-xs sm:text-sm text-on-surface focus:outline-none focus:border-brand"
                    >
                      {availablePackages.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} — {p.total_sessions} sessões ({parseFloat(p.price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-secondary uppercase tracking-wider mb-1.5">
                      Forma de Pagamento *
                    </label>
                    <select
                      value={packagePaymentMethod}
                      onChange={(e) => setPackagePaymentMethod(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-line rounded-xl text-xs sm:text-sm text-on-surface focus:outline-none focus:border-brand"
                    >
                      <option value="pix">PIX</option>
                      <option value="credit_card">Cartão de Crédito</option>
                      <option value="debit_card">Cartão de Débito</option>
                      <option value="cash">Dinheiro</option>
                      <option value="transfer">Transferência Bancária</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-secondary uppercase tracking-wider mb-1.5">
                      Observações Internas (Opcional)
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Pago no balcão via maquininha"
                      value={packageNotes}
                      onChange={(e) => setPackageNotes(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-line rounded-xl text-xs sm:text-sm text-on-surface focus:outline-none focus:border-brand"
                    />
                  </div>
                </>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-line">
                <button
                  type="button"
                  onClick={() => setShowSellPackageModal(false)}
                  className="px-4 py-2 rounded-full border border-line text-secondary hover:text-on-surface text-xs font-medium transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSellingPackage || availablePackages.length === 0}
                  className="px-5 py-2 rounded-full bg-brand text-white hover:bg-brand-dark text-xs font-semibold transition-colors shadow-2xs disabled:opacity-50 cursor-pointer"
                >
                  {isSellingPackage ? 'Creditando...' : 'Confirmar Venda'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Visualização de Assinatura Digital Jurídica (D14) */}
      {showSignatureModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl border border-line p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div className="flex items-center gap-2">
                <FileSignature className="w-5 h-5 text-brand" />
                <h3 className="font-serif text-lg font-bold text-on-surface">Assinatura Eletrônica</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSignatureModal(false)}
                className="p-1 rounded-full text-secondary hover:text-on-surface hover:bg-stone-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 bg-stone-50 border border-line rounded-2xl flex items-center justify-center min-h-[160px]">
              {anamnesisData?.signature_data ? (
                <img
                  src={anamnesisData.signature_data}
                  alt="Assinatura Digital da Cliente"
                  className="max-h-36 object-contain"
                />
              ) : (
                <p className="text-xs text-secondary italic">Nenhum traço de assinatura capturado.</p>
              )}
            </div>

            <div className="bg-stone-50/70 border border-line/60 rounded-xl p-3 text-[11px] text-secondary space-y-1">
              <p><strong>Cliente:</strong> {client?.name}</p>
              <p><strong>Aceite do Termo:</strong> Versão {anamnesisData?.terms_version || 1}</p>
              <p><strong>Data/Hora:</strong> {anamnesisData?.consented_at ? format(new Date(anamnesisData.consented_at), "dd/MM/yyyy 'às' HH:mm:ss") : 'N/D'}</p>
              {anamnesisData?.consent_ip_address && (
                <p><strong>Endereço IP:</strong> {anamnesisData.consent_ip_address}</p>
              )}
              {anamnesisData?.consent_hash && (
                <p className="font-mono text-[10px] break-all text-brand">
                  <strong>Hash SHA-256:</strong> {anamnesisData.consent_hash}
                </p>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowSignatureModal(false)}
                className="px-5 py-2 rounded-full bg-brand text-white text-xs font-semibold hover:bg-brand-hover transition-colors cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Nova Sessão de Evolução Clínica (D14) */}
      {showEvolutionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl border border-line p-6 max-w-lg w-full shadow-2xl my-8 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-brand/10 text-brand flex items-center justify-center shrink-0">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif text-lg font-bold text-on-surface">Nova Sessão de Evolução</h3>
                  <p className="text-xs text-secondary">Registro clínico, fotos e medidas de {client?.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEvolutionModal(false)}
                className="p-1 rounded-full text-secondary hover:text-on-surface hover:bg-stone-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEvolution} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-secondary uppercase tracking-wider mb-1">
                    Procedimento Realizado *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Drenagem Linfática, Botox, Mechas"
                    value={evolutionProcedure}
                    onChange={(e) => setEvolutionProcedure(e.target.value)}
                    className="w-full px-3.5 py-2 bg-white border border-line rounded-xl text-xs sm:text-sm text-on-surface focus:outline-none focus:border-brand"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-secondary uppercase tracking-wider mb-1">
                    Data da Sessão *
                  </label>
                  <input
                    type="date"
                    required
                    value={evolutionDate}
                    onChange={(e) => setEvolutionDate(e.target.value)}
                    className="w-full px-3.5 py-2 bg-white border border-line rounded-xl text-xs sm:text-sm text-on-surface focus:outline-none focus:border-brand"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-secondary uppercase tracking-wider mb-1">
                  Consentimento para Fotos
                </label>
                <select
                  value={evolutionPhotoConsent}
                  onChange={(e) => setEvolutionPhotoConsent(e.target.value)}
                  className="w-full px-3.5 py-2 bg-white border border-line rounded-xl text-xs sm:text-sm text-on-surface focus:outline-none focus:border-brand"
                >
                  <option value="internal_only">Apenas Uso Interno (Prontuário Confidencial)</option>
                  <option value="social_media_anonymous">Autorizado p/ Redes Sociais (Anônimo / Sem Rosto)</option>
                  <option value="social_media_full">Autorizado p/ Redes Sociais (Completo)</option>
                  <option value="none">Não Autorizado para Registro Fotográfico</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-secondary uppercase tracking-wider mb-1">
                  Notas Técnicas da Evolução & Cuidados
                </label>
                <textarea
                  rows={3}
                  placeholder="Relato do procedimento, produtos utilizados, reações da pele ou instruções..."
                  value={evolutionNotes}
                  onChange={(e) => setEvolutionNotes(e.target.value)}
                  className="w-full p-3 bg-white border border-line rounded-xl text-xs sm:text-sm text-on-surface focus:outline-none focus:border-brand resize-none"
                />
              </div>

              {/* Medidas Corporais / Faciais */}
              <div className="bg-stone-50 border border-line/80 rounded-2xl p-3.5 space-y-2">
                <span className="block text-[11px] font-semibold text-secondary uppercase tracking-wider">
                  Medições da Sessão (Opcional)
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="text-[10px] text-secondary font-medium block">Peso (kg)</label>
                    <input
                      type="text"
                      placeholder="Ex: 62.5"
                      value={evolutionMeasurements.peso}
                      onChange={(e) => setEvolutionMeasurements(prev => ({ ...prev, peso: e.target.value }))}
                      className="w-full bg-white border border-line rounded-lg px-2 py-1 text-xs text-on-surface focus:outline-none focus:border-brand"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-secondary font-medium block">Cintura (cm)</label>
                    <input
                      type="text"
                      placeholder="Ex: 71"
                      value={evolutionMeasurements.cintura}
                      onChange={(e) => setEvolutionMeasurements(prev => ({ ...prev, cintura: e.target.value }))}
                      className="w-full bg-white border border-line rounded-lg px-2 py-1 text-xs text-on-surface focus:outline-none focus:border-brand"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-secondary font-medium block">Quadril (cm)</label>
                    <input
                      type="text"
                      placeholder="Ex: 98"
                      value={evolutionMeasurements.quadril}
                      onChange={(e) => setEvolutionMeasurements(prev => ({ ...prev, quadril: e.target.value }))}
                      className="w-full bg-white border border-line rounded-lg px-2 py-1 text-xs text-on-surface focus:outline-none focus:border-brand"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-secondary font-medium block">Outros / Altura</label>
                    <input
                      type="text"
                      placeholder="Ex: Busto 90"
                      value={evolutionMeasurements.outros}
                      onChange={(e) => setEvolutionMeasurements(prev => ({ ...prev, outros: e.target.value }))}
                      className="w-full bg-white border border-line rounded-lg px-2 py-1 text-xs text-on-surface focus:outline-none focus:border-brand"
                    />
                  </div>
                </div>
              </div>

              {/* Upload de Fotos de Antes e Depois */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* Fotos Antes */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-secondary uppercase tracking-wider">
                      Fotos de Antes ({evolutionBeforePhotos.length})
                    </span>
                    <label className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-line bg-white hover:bg-stone-50 text-[11px] font-semibold text-brand cursor-pointer transition-colors shadow-2xs">
                      <Plus className="w-3 h-3" />
                      <span>Anexar</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(e) => handleUploadEvolutionPhoto(e, 'before')}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {evolutionBeforePhotos.map((url, idx) => (
                      <div key={idx} className="relative w-16 h-16 rounded-xl overflow-hidden border border-line group">
                        <img src={url} alt={`Antes ${idx + 1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setEvolutionBeforePhotos(prev => prev.filter((_, i) => i !== idx))}
                          className="absolute inset-0 bg-black/60 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    {evolutionBeforePhotos.length === 0 && (
                      <div className="w-full py-4 bg-stone-50 border border-dashed border-line rounded-xl text-center text-secondary/60 text-xs italic">
                        Sem fotos de antes
                      </div>
                    )}
                  </div>
                </div>

                {/* Fotos Depois */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-secondary uppercase tracking-wider">
                      Fotos de Depois ({evolutionAfterPhotos.length})
                    </span>
                    <label className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-line bg-white hover:bg-stone-50 text-[11px] font-semibold text-brand cursor-pointer transition-colors shadow-2xs">
                      <Plus className="w-3 h-3" />
                      <span>Anexar</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(e) => handleUploadEvolutionPhoto(e, 'after')}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {evolutionAfterPhotos.map((url, idx) => (
                      <div key={idx} className="relative w-16 h-16 rounded-xl overflow-hidden border border-line group">
                        <img src={url} alt={`Depois ${idx + 1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setEvolutionAfterPhotos(prev => prev.filter((_, i) => i !== idx))}
                          className="absolute inset-0 bg-black/60 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    {evolutionAfterPhotos.length === 0 && (
                      <div className="w-full py-4 bg-stone-50 border border-dashed border-line rounded-xl text-center text-secondary/60 text-xs italic">
                        Sem fotos de depois
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {isUploadingPhoto && (
                <p className="text-xs text-brand font-medium animate-pulse text-center">
                  Enviando imagem segura para o prontuário...
                </p>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-line">
                <button
                  type="button"
                  onClick={() => setShowEvolutionModal(false)}
                  className="px-4 py-2 rounded-full border border-line text-secondary hover:text-on-surface text-xs font-medium transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingEvolution || isUploadingPhoto}
                  className="px-5 py-2 rounded-full bg-brand text-white hover:bg-brand-hover text-xs font-semibold transition-all shadow-2xs disabled:opacity-50 cursor-pointer"
                >
                  {isSavingEvolution ? 'Gravando...' : 'Salvar Sessão de Evolução'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FichaClienteCRM;
