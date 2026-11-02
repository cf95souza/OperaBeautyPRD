import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useTenant } from '../../context/TenantContext';
import { api } from '../../lib/api';
import { useNotification } from '../../context/NotificationProvider';
import { 
  Users, 
  Plus, 
  X, 
  Star, 
  Edit2, 
  Clock, 
  Calendar, 
  CheckCircle2, 
  ChevronDown,
  Sparkles,
  Shield,
  Phone,
  Mail,
  Award
} from 'lucide-react';
import { EstadoVazio } from '../../components/ui/EstadoVazio';
import { formatCurrency, formatNumber } from '../../utils/formatters';

const GestaoEquipe = () => {
  const { tenant_slug } = useParams();
  const { tenant } = useTenant();
  const { showSuccess, showError, confirm } = useNotification();

  const [staffList, setStaffList] = useState([]);
  const [reviewsStats, setReviewsStats] = useState({});
  const [servicesList, setServicesList] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Desempenho do mês
  const [selectedPeriod, setSelectedPeriod] = useState('current_month'); // 'current_month' | 'last_month'
  const [teamStats, setTeamStats] = useState({ totalServices: 0, totalCommission: 0 });
  const [rankingList, setRankingList] = useState([]);

  // Modais
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [staffFormData, setStaffFormData] = useState({ 
    name: '', 
    phone: '', 
    email: '', 
    password: '', 
    role: 'professional', 
    is_active: true, 
    commission_rate: 0, 
    service_ids: [] 
  });
  const [savingStaff, setSavingStaff] = useState(false);

  // Modal Horários e Serviços
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleStaff, setScheduleStaff] = useState(null);
  const [selectedServices, setSelectedServices] = useState([]);
  const [savingSchedule, setSavingSchedule] = useState(false);

  useEffect(() => {
    if (!tenant) return;
    fetchStaff();
    fetchServices();
  }, [tenant, selectedPeriod]);

  const fetchServices = async () => {
    try {
      const data = await api.services.list(tenant.id);
      if (data) setServicesList(data);
    } catch (e) {
      console.error("Erro ao carregar serviços", e);
    }
  };

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const data = await api.staff.list(tenant.id);
      if (data) setStaffList(data);
      
      try {
        const stats = await api.request('/reviews/stats');
        if (stats && stats.staff) {
          const statsMap = {};
          stats.staff.forEach(s => { statsMap[s.id] = s.average; });
          setReviewsStats(statsMap);
        }
      } catch (e) {
        // Estatísticas de reviews opcionais
      }
      
      // Carrega métricas de desempenho do período selecionado
      const today = new Date();
      let startIso, endIso;
      if (selectedPeriod === 'current_month') {
        startIso = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
        endIso = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();
      } else {
        startIso = new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString();
        endIso = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999).toISOString();
      }
      
      const apptData = await api.appointments.list({
        start_date: startIso,
        end_date: endIso
      });
      
      if (apptData && Array.isArray(apptData)) {
        const completed = apptData.filter(a => a.status === 'completed');
        const totalServices = completed.length;
        const totalCommission = completed.reduce((sum, a) => sum + Number(a.staff_commission_value || 0), 0);
        setTeamStats({ totalServices, totalCommission });

        // Ranking de comissões por profissional
        const staffRankingMap = {};
        completed.forEach(a => {
          const sId = a.staff_id || 'unknown';
          const sName = a.staff_name || 'Profissional';
          if (!staffRankingMap[sId]) {
            staffRankingMap[sId] = { id: sId, name: sName, servicesCount: 0, commissionTotal: 0 };
          }
          staffRankingMap[sId].servicesCount += 1;
          staffRankingMap[sId].commissionTotal += Number(a.staff_commission_value || 0);
        });

        const sorted = Object.values(staffRankingMap).sort((a, b) => b.commissionTotal - a.commissionTotal);
        setRankingList(sorted);
      }
      
    } catch (err) {
      console.error(err);
      showError('Erro ao carregar dados da equipe.');
    } finally {
      setLoading(false);
    }
  };

  // Obter Monograma (ex: "Caio Profissional" -> "CA", "Thais Gestor" -> "TH")
  const getMonogram = (name) => {
    if (!name) return 'OP';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Máscara suave de telefone (ex: "(11) 9•••• ••22")
  const formatMaskedPhone = (phone) => {
    if (!phone) return 'Telefone não cadastrado';
    const clean = phone.replace(/\D/g, '');
    if (clean.length === 11) {
      const ddd = clean.slice(0, 2);
      const firstDigit = clean.slice(2, 3);
      const lastDigits = clean.slice(-4);
      return `(${ddd}) ${firstDigit}•••• ••${lastDigits.slice(-2)}`;
    }
    return phone;
  };

  // Modal Novo / Edição
  const openNewModal = () => {
    setEditingStaff(null);
    setStaffFormData({ 
      name: '', 
      phone: '', 
      email: '', 
      password: '', 
      role: 'professional', 
      is_active: true, 
      commission_rate: 0, 
      service_ids: [] 
    });
    setShowStaffModal(true);
  };

  const openEditModal = (staff) => {
    setEditingStaff(staff);
    setStaffFormData({ 
      name: staff.name, 
      phone: staff.phone, 
      email: staff.email,
      password: '', // Senha vazia a menos que o gestor queira trocar
      role: staff.role || 'professional', 
      is_active: staff.is_active,
      commission_rate: staff.commission_rate || 0,
      service_ids: staff.service_ids || []
    });
    setShowStaffModal(true);
  };

  // Modal Horários e Serviços
  const openScheduleModal = (staff) => {
    setScheduleStaff(staff);
    setSelectedServices(staff.service_ids || []);
    setShowScheduleModal(true);
  };

  const handleSaveStaff = async (e) => {
    e.preventDefault();
    if (!tenant) return;
    setSavingStaff(true);
    try {
      const cleanPhone = staffFormData.phone.replace(/\D/g, '');
      
      const payload = {
        name: staffFormData.name.trim(),
        phone: cleanPhone,
        email: staffFormData.email.trim(),
        password: staffFormData.password || undefined,
        role: staffFormData.role,
        is_active: staffFormData.is_active,
        commission_rate: Number(staffFormData.commission_rate) || 0,
        service_ids: staffFormData.service_ids
      };

      if (editingStaff) {
        await api.staff.update(editingStaff.id, payload);
        showSuccess('Profissional atualizado com sucesso!');
      } else {
        if (!staffFormData.password) {
          showError('A senha é obrigatória para cadastrar.');
          setSavingStaff(false);
          return;
        }
        await api.staff.create(payload);
        showSuccess('Profissional cadastrado com sucesso!');
      }

      setShowStaffModal(false);
      fetchStaff();
    } catch (err) {
      console.error(err);
      showError(err.message || 'Erro ao salvar profissional. Verifique os dados.');
    } finally {
      setSavingStaff(false);
    }
  };

  const handleSaveSchedule = async (e) => {
    e.preventDefault();
    if (!scheduleStaff) return;
    setSavingSchedule(true);
    try {
      const payload = {
        name: scheduleStaff.name,
        phone: scheduleStaff.phone,
        email: scheduleStaff.email,
        role: scheduleStaff.role,
        is_active: scheduleStaff.is_active,
        commission_rate: Number(scheduleStaff.commission_rate) || 0,
        service_ids: selectedServices
      };
      await api.staff.update(scheduleStaff.id, payload);
      showSuccess(`Serviços e horários de ${scheduleStaff.name} atualizados!`);
      setShowScheduleModal(false);
      fetchStaff();
    } catch (err) {
      console.error(err);
      showError('Erro ao atualizar serviços do profissional.');
    } finally {
      setSavingSchedule(false);
    }
  };

  // Limite de profissionais no plano
  const maxStaffAllowed = tenant?.plan_max_staff || 5;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8 animate-fade-in text-ink">
      
      {/* 1. Cabeçalho Editorial (§9.6 J10 · Mockup G8) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-4">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-ink">Equipe</h1>
          <p className="text-sm text-ink-soft mt-1">Profissionais, comissões e desempenho.</p>
        </div>

        <div className="flex items-center gap-3">
          <span className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-stone-100 text-ink-soft border border-line/60">
            {staffList.length} de {maxStaffAllowed} profissionais no seu plano
          </span>

          <button 
            onClick={openNewModal}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-brand hover:bg-brand-hover text-white text-sm font-semibold shadow-xs hover:shadow-md transition-all active:scale-98 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Novo profissional</span>
          </button>
        </div>
      </div>

      {/* 2. Grid de Cards dos Membros da Equipe */}
      {loading ? (
        <div className="py-20 text-center text-ink-soft flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-2 border-brand/30 border-t-brand rounded-full animate-spin" />
          <span className="text-sm">Carregando equipe do salão...</span>
        </div>
      ) : staffList.length === 0 ? (
        <div className="bg-white rounded-[24px] border border-line p-8 shadow-xs">
          <EstadoVazio
            icone={<Users className="w-8 h-8 text-brand" />}
            titulo="Nenhum profissional cadastrado"
            descricao="Cadastre os membros da sua equipe para organizar a agenda, vincular procedimentos e calcular comissões."
            textoAcao="+ Adicionar Profissional"
            aoClicarAcao={openNewModal}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {staffList.map((staff) => {
            const monogram = getMonogram(staff.name);
            const reviewAvg = reviewsStats[staff.id];
            const commission = Number(staff.commission_rate || 0);

            return (
              <div 
                key={staff.id} 
                className={`rounded-[24px] border border-line bg-white p-6 shadow-xs flex flex-col justify-between space-y-5 hover:shadow-md transition-all group ${
                  !staff.is_active ? 'opacity-70 bg-stone-50/50' : ''
                }`}
              >
                {/* Topo do Card: Avatar + Nome + Função + Badge Ativo */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3.5">
                    {/* Monograma Editorial Rosé */}
                    <div className="w-14 h-14 rounded-full bg-brand-tint/60 text-brand flex items-center justify-center font-display text-lg font-bold shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                      {monogram}
                    </div>

                    <div>
                      <h3 className="font-display text-lg font-bold text-ink group-hover:text-brand transition-colors">
                        {staff.name}
                      </h3>
                      <p className="text-xs text-ink-soft">
                        {staff.role === 'manager' ? 'Gestor' : 'Profissional'}
                      </p>
                    </div>
                  </div>

                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium tabular-nums ${
                    staff.is_active 
                      ? 'bg-[#E8F5E9] text-[#2E7D32]' 
                      : 'bg-stone-200 text-ink-soft'
                  }`}>
                    {staff.is_active ? 'Ativo' : 'Inativo'}
                  </span>
                </div>

                {/* Linha de Contato */}
                <div className="text-xs text-ink-soft">
                  <span>{formatMaskedPhone(staff.phone)}</span>
                  <span className="mx-1.5 opacity-60">·</span>
                  <span>{staff.email ? 'e-mail cadastrado' : 'sem e-mail'}</span>
                </div>

                {/* Sub-cards de Métricas: COMISSÃO e NOTA MÉDIA */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-stone-50 rounded-2xl p-3.5 border border-line/40">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-ink-soft mb-1">
                      COMISSÃO
                    </span>
                    <span className="font-display text-2xl font-bold text-ink tabular-nums lining-nums">
                      {commission.toFixed(commission % 1 === 0 ? 0 : 1).replace('.', ',')}%
                    </span>
                  </div>

                  <div className="bg-stone-50 rounded-2xl p-3.5 border border-line/40">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-ink-soft mb-1">
                      NOTA MÉDIA
                    </span>
                    <div className="flex items-center gap-1.5">
                      {reviewAvg ? (
                        <>
                          <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                          <span className="font-display text-2xl font-bold text-ink tabular-nums">
                            {reviewAvg}
                          </span>
                        </>
                      ) : (
                        <span className="font-display text-2xl font-bold text-ink-soft/60">
                          —
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Ações no Rodapé do Card */}
                <div className="flex items-center gap-2 pt-2 border-t border-line/60">
                  <button
                    onClick={() => openEditModal(staff)}
                    className="px-4 py-1.5 rounded-full border border-line text-xs font-semibold text-ink-soft hover:text-ink hover:border-ink-soft hover:bg-stone-50 transition-all cursor-pointer"
                  >
                    Editar
                  </button>

                  <button
                    onClick={() => openScheduleModal(staff)}
                    className="px-4 py-1.5 rounded-full border border-brand/40 text-xs font-semibold text-brand hover:bg-brand-tint/20 transition-all cursor-pointer"
                  >
                    Horários e serviços
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* 3. Seção "Desempenho do mês" (§9.6 J10 · Mockup G8) */}
      <div className="rounded-[24px] border border-line bg-white p-6 md:p-8 shadow-xs space-y-6">
        
        {/* Cabeçalho da Seção */}
        <div className="flex items-center justify-between pb-2 border-b border-line/60">
          <h2 className="font-display text-2xl font-bold text-ink">
            Desempenho do mês
          </h2>

          <div className="relative">
            <select
              value={selectedPeriod}
              onChange={e => setSelectedPeriod(e.target.value)}
              className="appearance-none pl-4 pr-8 py-1.5 rounded-full border border-line bg-stone-50 text-xs font-semibold text-ink hover:border-brand/40 focus:border-brand outline-none cursor-pointer transition-colors"
            >
              <option value="current_month">Mês atual</option>
              <option value="last_month">Mês anterior</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-ink-soft absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* 2 KPIs Compactos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-stone-50 rounded-2xl p-5 border border-line/40">
            <span className="block text-[11px] font-bold uppercase tracking-wider text-ink-soft mb-1.5">
              SERVIÇOS CONCLUÍDOS
            </span>
            <span className="font-display text-3xl sm:text-4xl font-bold text-ink tabular-nums">
              {teamStats.totalServices}
            </span>
          </div>

          <div className="bg-stone-50 rounded-2xl p-5 border border-line/40">
            <span className="block text-[11px] font-bold uppercase tracking-wider text-ink-soft mb-1.5">
              COMISSÃO GERADA
            </span>
            <span className="font-display text-3xl sm:text-4xl font-bold text-ink tabular-nums lining-nums">
              {formatCurrency(teamStats.totalCommission)}
            </span>
          </div>
        </div>

        {/* Quadro de Ranking ou Estado Neutro */}
        {teamStats.totalServices === 0 ? (
          <div className="rounded-2xl border border-dashed border-stone-200 p-8 text-center space-y-1">
            <p className="font-medium text-sm text-ink-soft">
              Sem atendimentos concluídos neste mês.
            </p>
            <p className="text-xs text-ink-soft/80">
              O ranking de comissões por profissional aparece aqui.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink-soft">
              Ranking de Comissões
            </h3>
            <div className="divide-y divide-line/60 border border-line/60 rounded-2xl overflow-hidden bg-stone-50/30">
              {rankingList.map((rank, index) => (
                <div key={rank.id} className="p-4 flex items-center justify-between text-sm">
                  <div className="flex items-center gap-3">
                    <span className="w-6 text-center font-bold text-xs text-ink-soft tabular-nums">
                      #{index + 1}
                    </span>
                    <span className="font-semibold text-ink">{rank.name}</span>
                    <span className="text-xs text-ink-soft tabular-nums">
                      ({rank.servicesCount} atendimentos)
                    </span>
                  </div>

                  <span className="font-display text-base font-bold text-brand tabular-nums lining-nums">
                    {formatCurrency(rank.commissionTotal)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* 4. Modal: Novo / Editar Profissional */}
      {showStaffModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fade-in overflow-y-auto">
          <div className="bg-white w-full max-w-md rounded-[24px] border border-line shadow-2xl p-6 md:p-8 relative animate-scale-up my-8">
            <div className="flex items-center justify-between pb-3 border-b border-line mb-4">
              <h2 className="font-display text-2xl font-bold text-ink">
                {editingStaff ? 'Editar Profissional' : 'Novo Profissional'}
              </h2>
              <button 
                onClick={() => setShowStaffModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-ink-soft hover:text-ink cursor-pointer hover:bg-stone-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStaff} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-ink-soft mb-1.5">
                  Nome Completo *
                </label>
                <input 
                  required 
                  type="text"
                  placeholder="Ex: Ana Paula Soares"
                  value={staffFormData.name} 
                  onChange={e => setStaffFormData({ ...staffFormData, name: e.target.value })}
                  className="w-full border border-line rounded-xl px-4 py-2.5 bg-white text-sm text-ink focus:border-brand outline-none shadow-2xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-ink-soft mb-1.5">
                    Telefone *
                  </label>
                  <input 
                    required 
                    type="tel"
                    placeholder="(11) 99999-9999"
                    value={staffFormData.phone} 
                    onChange={e => setStaffFormData({ ...staffFormData, phone: e.target.value })}
                    className="w-full border border-line rounded-xl px-4 py-2.5 bg-white text-sm text-ink focus:border-brand outline-none tabular-nums shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-ink-soft mb-1.5">
                    Comissão (%)
                  </label>
                  <input 
                    type="number" 
                    min="0" 
                    max="100" 
                    step="0.1"
                    placeholder="50"
                    value={staffFormData.commission_rate} 
                    onChange={e => setStaffFormData({ ...staffFormData, commission_rate: e.target.value })}
                    className="w-full border border-line rounded-xl px-4 py-2.5 bg-white text-sm text-ink focus:border-brand outline-none tabular-nums shadow-2xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-ink-soft mb-1.5">
                  E-mail de Acesso *
                </label>
                <input 
                  required 
                  type="email"
                  placeholder="profissional@salao.com.br"
                  value={staffFormData.email} 
                  onChange={e => setStaffFormData({ ...staffFormData, email: e.target.value })}
                  className="w-full border border-line rounded-xl px-4 py-2.5 bg-white text-sm text-ink focus:border-brand outline-none shadow-2xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-ink-soft mb-1.5">
                    Função / Acesso
                  </label>
                  <select
                    value={staffFormData.role}
                    onChange={e => setStaffFormData({ ...staffFormData, role: e.target.value })}
                    className="w-full border border-line rounded-xl px-3.5 py-2.5 bg-white text-sm text-ink focus:border-brand outline-none cursor-pointer"
                  >
                    <option value="professional">Profissional</option>
                    <option value="manager">Gestor</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-ink-soft mb-1.5">
                    {editingStaff ? 'Nova Senha (opcional)' : 'Senha de Acesso *'}
                  </label>
                  <input 
                    type="password"
                    placeholder="••••••••"
                    required={!editingStaff}
                    value={staffFormData.password} 
                    onChange={e => setStaffFormData({ ...staffFormData, password: e.target.value })}
                    className="w-full border border-line rounded-xl px-4 py-2.5 bg-white text-sm text-ink focus:border-brand outline-none shadow-2xs"
                  />
                </div>
              </div>

              {editingStaff && (
                <div className="flex items-center gap-2 pt-1">
                  <input 
                    type="checkbox" 
                    id="staff_is_active"
                    checked={staffFormData.is_active} 
                    onChange={e => setStaffFormData({ ...staffFormData, is_active: e.target.checked })}
                    className="rounded border-line text-brand focus:ring-brand accent-brand cursor-pointer"
                  />
                  <label htmlFor="staff_is_active" className="text-xs font-medium text-ink cursor-pointer">
                    Profissional ativo na equipe
                  </label>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
                <button
                  type="button"
                  onClick={() => setShowStaffModal(false)}
                  className="px-4 py-2 rounded-full border border-stone-300 text-ink-soft text-xs font-semibold hover:bg-stone-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingStaff}
                  className="px-5 py-2.5 rounded-full bg-brand text-white text-xs font-semibold hover:bg-brand-hover shadow-xs disabled:opacity-50 cursor-pointer transition-all active:scale-98"
                >
                  {savingStaff ? 'Salvando...' : (editingStaff ? 'Salvar Alterações' : 'Cadastrar Profissional')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Modal: Horários e Serviços Habilitados */}
      {showScheduleModal && scheduleStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fade-in overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-[24px] border border-line shadow-2xl p-6 md:p-8 relative animate-scale-up my-8">
            <div className="flex items-center justify-between pb-3 border-b border-line mb-4">
              <div>
                <h2 className="font-display text-2xl font-bold text-ink">Horários e Serviços</h2>
                <p className="text-xs text-ink-soft mt-0.5">{scheduleStaff.name}</p>
              </div>
              <button 
                onClick={() => setShowScheduleModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-ink-soft hover:text-ink cursor-pointer hover:bg-stone-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSchedule} className="space-y-5">
              
              {/* Seleção de Procedimentos Habilitados */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-ink-soft">
                    Serviços Habilitados
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedServices.length === servicesList.length) {
                        setSelectedServices([]);
                      } else {
                        setSelectedServices(servicesList.map(s => s.id));
                      }
                    }}
                    className="text-xs font-semibold text-brand hover:underline cursor-pointer"
                  >
                    {selectedServices.length === servicesList.length ? 'Desmarcar todos' : 'Marcar todos'}
                  </button>
                </div>

                <div className="max-h-56 overflow-y-auto hide-scrollbar space-y-1.5 border border-line rounded-xl p-3 bg-stone-50/40">
                  {servicesList.length === 0 ? (
                    <p className="text-xs text-ink-soft italic py-2 text-center">Nenhum serviço cadastrado.</p>
                  ) : (
                    servicesList.map(srv => {
                      const isChecked = selectedServices.includes(srv.id);
                      return (
                        <label 
                          key={srv.id} 
                          className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                            isChecked ? 'bg-brand-tint/30 text-ink' : 'hover:bg-white text-ink-soft'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={e => {
                                if (e.target.checked) {
                                  setSelectedServices([...selectedServices, srv.id]);
                                } else {
                                  setSelectedServices(selectedServices.filter(id => id !== srv.id));
                                }
                              }}
                              className="rounded border-line text-brand focus:ring-brand accent-brand cursor-pointer"
                            />
                            <span className="text-xs font-semibold text-ink">{srv.name}</span>
                          </div>
                          <span className="text-xs font-medium tabular-nums text-brand">
                            {formatCurrency(srv.price)}
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Informação sobre Grade de Horários */}
              <div className="bg-brand-tint/20 rounded-xl p-3.5 border border-brand/10 flex items-start gap-2.5">
                <Clock className="w-4 h-4 text-brand shrink-0 mt-0.5" />
                <p className="text-xs text-ink-soft leading-relaxed">
                  Os horários e a grade de trabalho semanal podem ser gerenciados e visualizados diretamente na <strong>Agenda</strong> do salão.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="px-4 py-2 rounded-full border border-stone-300 text-ink-soft text-xs font-semibold hover:bg-stone-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingSchedule}
                  className="px-5 py-2.5 rounded-full bg-brand text-white text-xs font-semibold hover:bg-brand-hover shadow-xs disabled:opacity-50 cursor-pointer transition-all active:scale-98"
                >
                  {savingSchedule ? 'Salvando...' : 'Salvar Configurações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default GestaoEquipe;
