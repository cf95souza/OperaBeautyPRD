import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTenant } from '../../context/TenantContext';
import { api } from '../../lib/api';
import { format, parseISO } from 'date-fns';
import { useNotification } from '../../context/NotificationProvider';

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

  // Novos estados para localização e redes sociais
  const [address, setAddress] = useState('');
  const [socialInstagram, setSocialInstagram] = useState('');
  const [socialFacebook, setSocialFacebook] = useState('');
  const [socialWhatsapp, setSocialWhatsapp] = useState('');

  // Estados para cashback
  const [cashbackPercentage, setCashbackPercentage] = useState(0);
  const [cashbackExpirationDays, setCashbackExpirationDays] = useState(30);

  // Estados para Self Check-in (Mimos)
  const [waitingMenuEnabled, setWaitingMenuEnabled] = useState(false);
  const [waitingMenuItems, setWaitingMenuItems] = useState([]);
  const [newItemInput, setNewItemInput] = useState('');

  // Modal Exception State
  const [showExceptionModal, setShowExceptionModal] = useState(false);
  const [newException, setNewException] = useState({ date: '', is_closed: true, open_time: '09:00', close_time: '18:00', reason: '' });

  // Coupon State
  const [coupons, setCoupons] = useState([]);
  const [services, setServices] = useState([]);
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [newCoupon, setNewCoupon] = useState({ code: '', discount_type: 'percentage', discount_value: 10, max_uses: '', expires_at: '', service_id: '' });

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
    }
  }, [tenant]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch Business Hours
      const hoursData = await api.settings.getBusinessHours(tenant.id);
      
      // Initialize defaults if missing
      let loadedHours = [...(hoursData || [])];
      const missingDays = DAYS_OF_WEEK.filter(d => !loadedHours.some(h => h.day_of_week === d.value));
      
      missingDays.forEach(d => {
        loadedHours.push({
          day_of_week: d.value,
          open_time: '09:00',
          close_time: '18:00',
          is_closed: d.value === 0 // default sunday closed
        });
      });

      loadedHours.sort((a, b) => a.day_of_week - b.day_of_week);
      setBusinessHours(loadedHours);

      // Fetch Exceptions
      const exceptionsData = await api.settings.getExceptions(tenant.id);
      setExceptions(exceptionsData || []);
      
      // Fetch Coupons
      const couponsData = await api.coupons.list(tenant.id);
      setCoupons(couponsData || []);

      // Fetch Services for Coupon binding
      const servicesData = await api.services.list(tenant.id);
      setServices((servicesData || []).filter(s => s.is_active));
    } catch (err) {
      console.error("Erro ao carregar dados operacionais:", err);
    }
    setLoading(false);
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
      // 1. Salvar dados de endereço, redes sociais e cashback do Tenant
      await api.tenants.updateBranding({
        address,
        social_instagram: socialInstagram,
        social_facebook: socialFacebook,
        social_whatsapp: socialWhatsapp,
        cashback_percentage: parseFloat(cashbackPercentage),
        cashback_expiration_days: parseInt(cashbackExpirationDays),
        waiting_menu_enabled: waitingMenuEnabled,
        waiting_menu_items: waitingMenuItems
      });

      // 2. Upsert Business Hours
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
      showError("Por favor selecione a data."); return;
    }
    
    const toInsert = {
      tenant_id: tenant.id,
      exception_date: newException.date,
      is_closed: newException.is_closed,
      open_time: newException.is_closed ? null : newException.open_time,
      close_time: newException.is_closed ? null : newException.close_time,
      reason: newException.reason
    };

    try {
      await api.settings.addException(toInsert);
      setShowExceptionModal(false);
      setNewException({ date: '', is_closed: true, open_time: '09:00', close_time: '18:00', reason: '' });
      fetchData(); // refresh
    } catch (err) {
      console.error(err);
      showError('Erro ao adicionar exceção.');
    }
  };

  const handleDeleteException = async (id) => {
    if (await confirm('Deseja remover esta exceção?')) {
      try {
        await api.settings.deleteException(id);
        fetchData();
      } catch (err) {
        console.error(err);
        showError('Erro ao remover exceção.');
      }
    }
  };

  const handleAddCoupon = async () => {
    if (!newCoupon.code || !newCoupon.discount_value) {
      showError("Preencha o código e o valor do desconto."); return;
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
      fetchData(); // refresh
    } catch (err) {
      console.error(err);
      showError('Erro ao adicionar cupom.');
    }
  };

  const handleDeleteCoupon = async (id) => {
    if (await confirm('Deseja inativar/remover este cupom?')) {
      try {
        await api.coupons.delete(id);
        fetchData();
      } catch (err) {
        console.error(err);
        showError('Erro ao remover cupom.');
      }
    }
  };

  if (loading) return <div className="p-xl flex justify-center text-secondary">Carregando horários...</div>;

  return (
    <>
      <div className="flex-1 p-container-margin md:p-xl max-w-[1200px] w-full mx-auto pb-32 md:pb-xl animate-fade-in-up">
        <div className="mb-xl flex justify-between items-end">
          <div>
            <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-primary mb-sm">Configurações Operacionais</h1>
            <p className="font-body-md text-body-md text-secondary">Gerencie horários, dias de funcionamento e exceções/bloqueios.</p>
          </div>
          <button onClick={handleSaveAll} disabled={saving} className="hidden md:flex bg-primary text-on-primary font-label-md text-label-md px-lg py-sm rounded-lg items-center gap-sm hover:bg-on-primary-container transition-colors shadow-sm">
            <span className="material-symbols-outlined text-[18px]">save</span>
            {saving ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-xl">
          {/* Bento Grid Section: Working Hours */}
          <section className="lg:col-span-8 space-y-md">
            <h2 className="font-headline-md text-headline-md text-on-surface mb-md flex items-center gap-sm">
              <span className="material-symbols-outlined text-primary">schedule</span>
              Jornada de Funcionamento (Padrão)
            </h2>
            <div className="bg-surface-container-lowest rounded-xl shadow-[0px_4px_20px_rgba(0,0,0,0.04)] p-lg flex flex-col gap-md">
              
              {DAYS_OF_WEEK.map((day) => {
                const dayData = businessHours.find(h => h.day_of_week === day.value) || {};
                const isOpen = !dayData.is_closed;
                return (
                  <div key={day.value} className="flex flex-col sm:flex-row sm:items-center justify-between py-sm border-b border-surface-variant gap-sm">
                    <div className="flex items-center justify-between sm:w-48">
                      <span className={`font-label-md text-label-md ${isOpen ? 'text-on-surface' : 'text-secondary'}`}>{day.label}</span>
                      <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                        <input 
                          checked={isOpen}
                          onChange={(e) => handleHourChange(day.value, 'is_closed', !e.target.checked)}
                          className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 appearance-none cursor-pointer" 
                          id={`toggle-${day.value}`} 
                          name={`toggle-${day.value}`} 
                          type="checkbox"
                        />
                        <label className="toggle-label block overflow-hidden h-5 rounded-full bg-surface-variant cursor-pointer" htmlFor={`toggle-${day.value}`}></label>
                      </div>
                    </div>
                    <div className={`flex items-center gap-sm transition-opacity ${isOpen ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                      <input 
                        value={dayData.open_time?.substring(0, 5) || '09:00'}
                        onChange={(e) => handleHourChange(day.value, 'open_time', e.target.value)}
                        disabled={!isOpen}
                        className="bg-transparent border-b border-outline-variant focus:border-primary text-body-md font-body-md text-on-surface pb-1 outline-none w-24 text-center" 
                        type="text" 
                        placeholder="09:00"
                        maxLength={5}
                      />
                      <span className="text-secondary font-body-md text-body-md">às</span>
                      <input 
                        value={dayData.close_time?.substring(0, 5) || '18:00'}
                        onChange={(e) => handleHourChange(day.value, 'close_time', e.target.value)}
                        disabled={!isOpen}
                        className="bg-transparent border-b border-outline-variant focus:border-primary text-body-md font-body-md text-on-surface pb-1 outline-none w-24 text-center" 
                        type="text" 
                        placeholder="18:00"
                        maxLength={5}
                      />
                    </div>
                  </div>
                )
              })}
              
            </div>

            {/* Seção Contato & Localização */}
            <h2 className="font-headline-md text-headline-md text-on-surface mt-xl mb-md flex items-center gap-sm">
              <span className="material-symbols-outlined text-primary">distance</span>
              Contato & Localização
            </h2>
            <div className="bg-surface-container-lowest rounded-xl shadow-[0px_4px_20px_rgba(0,0,0,0.04)] p-lg flex flex-col gap-lg">
              <p className="font-body-sm text-body-sm text-secondary -mt-sm">Essas informações alimentam os menus da tela de login do seu salão. Se deixadas em branco, os respectivos menus não aparecerão.</p>
              
              <div className="flex flex-col gap-sm">
                <label className="font-label-md text-label-md text-on-surface">Endereço Comercial</label>
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Ex: Av. Paulista, 1000 - Bela Vista, São Paulo - SP, 01310-100"
                  className="w-full min-h-[80px] p-md bg-transparent border border-outline-variant focus:border-primary rounded-xl text-body-md outline-none transition-all resize-y"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
                <div className="flex flex-col gap-xs">
                  <label className="font-label-md text-label-md text-on-surface flex items-center gap-xs">
                    <span className="material-symbols-outlined text-[18px] text-primary">link</span> Instagram
                  </label>
                  <input
                    value={socialInstagram}
                    onChange={(e) => setSocialInstagram(e.target.value)}
                    placeholder="https://instagram.com/seu_perfil"
                    className="w-full p-md bg-transparent border border-outline-variant focus:border-primary rounded-xl text-body-md outline-none transition-all"
                    type="url"
                  />
                </div>

                <div className="flex flex-col gap-xs">
                  <label className="font-label-md text-label-md text-on-surface flex items-center gap-xs">
                    <span className="material-symbols-outlined text-[18px] text-primary">link</span> Facebook
                  </label>
                  <input
                    value={socialFacebook}
                    onChange={(e) => setSocialFacebook(e.target.value)}
                    placeholder="https://facebook.com/sua_pagina"
                    className="w-full p-md bg-transparent border border-outline-variant focus:border-primary rounded-xl text-body-md outline-none transition-all"
                    type="url"
                  />
                </div>

                <div className="flex flex-col gap-xs">
                  <label className="font-label-md text-label-md text-on-surface flex items-center gap-xs">
                    <span className="material-symbols-outlined text-[18px] text-primary">link</span> WhatsApp
                  </label>
                  <input
                    value={socialWhatsapp}
                    onChange={(e) => setSocialWhatsapp(e.target.value)}
                    placeholder="https://wa.me/5511999999999"
                    className="w-full p-md bg-transparent border border-outline-variant focus:border-primary rounded-xl text-body-md outline-none transition-all"
                    type="url"
                  />
                </div>
              </div>
            </div>

            {/* Seção Bento: Fidelização e Cashback */}
            <div className="bg-surface-container-lowest rounded-xl shadow-[0px_4px_20px_rgba(0,0,0,0.04)] p-lg flex flex-col gap-md mt-lg">
              <h3 className="font-headline-md text-[20px] text-on-surface mb-xs flex items-center gap-sm">
                <span className="material-symbols-outlined text-primary">stars</span>
                Regras de Cashback (Clube Fidelidade)
              </h3>
              <p className="font-body-md text-body-md text-secondary">
                Habilite o retorno de saldo para fidelizar clientes em serviços.
              </p>
              
              {!tenant?.features?.clube ? (
                <div className="bg-surface p-md rounded-xl border border-outline-variant/30 text-center">
                  <span className="material-symbols-outlined text-3xl text-secondary mb-1">lock</span>
                  <p className="font-label-md text-secondary mb-1">Recurso Indisponível</p>
                  <p className="text-xs text-secondary mb-3">Ative o Clube de Assinaturas no seu plano SaaS para habilitar o Cashback.</p>
                  <button 
                    type="button" 
                    onClick={() => navigate(`/${tenant_slug}/staff/admin/assinatura`)}
                    className="text-primary font-bold text-xs hover:underline"
                  >
                    Ver Planos SaaS &rarr;
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-md mt-base">
                  <div className="flex flex-col gap-xs">
                    <label className="font-label-md text-label-md text-on-surface">Porcentagem de Cashback (%)</label>
                    <input
                      value={cashbackPercentage}
                      onChange={(e) => setCashbackPercentage(e.target.value)}
                      placeholder="Ex: 5.00"
                      min="0"
                      max="100"
                      step="0.1"
                      className="w-full p-md bg-transparent border border-outline-variant focus:border-primary rounded-xl text-body-md outline-none transition-all"
                      type="number"
                    />
                    <span className="text-[10px] text-secondary">Porcentagem que retorna como saldo na carteira da cliente.</span>
                  </div>

                  <div className="flex flex-col gap-xs">
                    <label className="font-label-md text-label-md text-on-surface">Prazo de Expiração (Dias)</label>
                    <input
                      value={cashbackExpirationDays}
                      onChange={(e) => setCashbackExpirationDays(e.target.value)}
                      placeholder="Ex: 30"
                      min="1"
                      className="w-full p-md bg-transparent border border-outline-variant focus:border-primary rounded-xl text-body-md outline-none transition-all"
                      type="number"
                    />
                    <span className="text-[10px] text-secondary">Dias para a cliente utilizar o cashback antes de expirar.</span>
                  </div>
                </div>
              )}
            </div>

            {/* Experiência do Cliente */}
            <div className="bg-surface-container-lowest rounded-xl shadow-[0px_4px_20px_rgba(0,0,0,0.04)] p-lg flex flex-col gap-md mt-lg border-l-4 border-l-accent">
              <div className="flex justify-between items-center mb-xs">
                <h3 className="font-headline-md text-[20px] text-on-surface flex items-center gap-sm">
                  <span className="material-symbols-outlined text-primary">concierge</span>
                  Self Check-in e Menu de Espera
                </h3>
                <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                  <input 
                    checked={waitingMenuEnabled}
                    onChange={(e) => setWaitingMenuEnabled(e.target.checked)}
                    className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 appearance-none cursor-pointer" 
                    id="toggle-waiting-menu" 
                    type="checkbox"
                  />
                  <label className="toggle-label block overflow-hidden h-5 rounded-full bg-surface-variant cursor-pointer" htmlFor="toggle-waiting-menu"></label>
                </div>
              </div>
              <p className="font-body-md text-body-md text-secondary">
                Permita que suas clientes façam check-in pelo app e escolham um mimo (ex: café, água) antes de serem atendidas.
              </p>
              
              <div className={`transition-all duration-300 ${waitingMenuEnabled ? 'opacity-100 max-h-[500px] mt-md' : 'opacity-50 max-h-0 overflow-hidden mt-0 pointer-events-none'}`}>
                <label className="font-label-md text-label-md text-on-surface mb-2 block">Opções do Menu</label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {waitingMenuItems.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-1 bg-primary-container text-on-primary-container px-3 py-1.5 rounded-full text-sm font-medium">
                      {item}
                      <button 
                        onClick={() => setWaitingMenuItems(prev => prev.filter((_, i) => i !== idx))}
                        className="text-on-primary-container hover:text-error flex items-center justify-center ml-1"
                      >
                        <span className="material-symbols-outlined text-[16px]">close</span>
                      </button>
                    </div>
                  ))}
                  {waitingMenuItems.length === 0 && (
                    <span className="text-secondary text-sm italic">Nenhum item adicionado.</span>
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
                    placeholder="Ex: Chá gelado (pressione Enter)"
                    className="flex-1 p-3 bg-transparent border border-outline-variant focus:border-primary rounded-xl text-body-md outline-none transition-all"
                  />
                  <button 
                    onClick={() => {
                      if (newItemInput.trim() && !waitingMenuItems.includes(newItemInput.trim())) {
                        setWaitingMenuItems([...waitingMenuItems, newItemInput.trim()]);
                        setNewItemInput('');
                      }
                    }}
                    className="bg-secondary-container text-on-secondary-container px-4 py-2 rounded-xl font-bold hover:bg-secondary-container/80 transition-colors"
                  >
                    Adicionar
                  </button>
                </div>
              </div>
            </div>
          </section>
          
          {/* Sidebar Info/Settings */}
          <section className="lg:col-span-4 space-y-xl">
            <div className="bg-surface-container-lowest rounded-xl shadow-[0px_4px_20px_rgba(0,0,0,0.04)] p-lg">
              <h3 className="font-headline-md text-[20px] text-on-surface mb-md flex items-center gap-sm">
                <span className="material-symbols-outlined text-primary text-[20px]">calendar_add_on</span>
                Exceções de Horário
              </h3>
              <p className="font-body-md text-body-md text-secondary mb-md">Adicione datas de recesso, feriados ou dias com horário especial (ex: aberturas em domingos excepcionais).</p>
              
              <div className="space-y-sm mb-md max-h-[300px] overflow-y-auto">
                {exceptions.map(exc => (
                  <div key={exc.id} className="flex justify-between items-center bg-surface p-sm rounded-lg border border-surface-variant">
                    <div>
                      <p className="font-label-md text-label-md text-on-surface">{exc.reason || 'Sem motivo'}</p>
                      <p className="font-body-sm text-[12px] text-secondary">
                        {format(parseISO(exc.exception_date), 'dd/MM/yyyy')} 
                        {exc.is_closed ? ' - Fechado' : ` - das ${exc.open_time?.substring(0, 5)} às ${exc.close_time?.substring(0, 5)}`}
                      </p>
                    </div>
                    <button onClick={() => handleDeleteException(exc.id)} className="text-outline hover:text-error transition-colors">
                      <span className="material-symbols-outlined">delete</span>
                    </button>
                  </div>
                ))}
                {exceptions.length === 0 && (
                  <p className="text-body-sm text-secondary italic">Nenhuma exceção cadastrada.</p>
                )}
              </div>
              
              <button onClick={() => setShowExceptionModal(true)} className="w-full border border-primary text-primary font-label-md text-label-md py-sm rounded-lg hover:bg-primary-container hover:text-on-primary-container transition-colors flex items-center justify-center gap-xs">
                <span className="material-symbols-outlined text-[18px]">add</span> Nova Exceção
              </button>
            </div>
            
            {/* Coupons Section */}
            <div className="bg-surface-container-lowest rounded-xl shadow-[0px_4px_20px_rgba(0,0,0,0.04)] p-lg">
              <h3 className="font-headline-md text-[20px] text-on-surface mb-md flex items-center gap-sm">
                <span className="material-symbols-outlined text-primary text-[20px]">local_activity</span>
                Cupons de Desconto
              </h3>
              
              <div className="space-y-sm mb-md max-h-[300px] overflow-y-auto">
                {coupons.map(coupon => (
                  <div key={coupon.id} className="flex justify-between items-center bg-surface p-sm rounded-lg border border-surface-variant">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-label-md text-label-md text-on-surface font-mono">{coupon.code}</p>
                        {coupon.service_id ? (
                          <span className="bg-tertiary-container text-on-tertiary-container text-[10px] px-2 py-0.5 rounded-full font-semibold truncate max-w-[120px]">
                            {coupon.service_name || 'Serviço Específico'}
                          </span>
                        ) : (
                          <span className="bg-primary-container text-on-primary-container text-[10px] px-2 py-0.5 rounded-full font-semibold">Global</span>
                        )}
                      </div>
                      <p className="font-body-sm text-[12px] text-secondary mt-1">
                        {coupon.discount_type === 'percentage' ? `${coupon.discount_value}%` : `R$ ${coupon.discount_value.toFixed(2)}`}
                        {coupon.max_uses ? ` • ${coupon.current_uses || 0}/${coupon.max_uses} usos` : ` • Usado ${coupon.current_uses || 0}x`}
                        {coupon.expires_at && ` • Válido até ${format(parseISO(coupon.expires_at), 'dd/MM/yyyy')}`}
                      </p>
                    </div>
                    <button onClick={() => handleDeleteCoupon(coupon.id)} className="text-outline hover:text-error transition-colors">
                      <span className="material-symbols-outlined">delete</span>
                    </button>
                  </div>
                ))}
                {coupons.length === 0 && (
                  <p className="text-body-sm text-secondary italic">Nenhum cupom ativo.</p>
                )}
              </div>
              
              <button onClick={() => setShowCouponModal(true)} className="w-full border border-primary text-primary font-label-md text-label-md py-sm rounded-lg hover:bg-primary-container hover:text-on-primary-container transition-colors flex items-center justify-center gap-xs">
                <span className="material-symbols-outlined text-[18px]">add</span> Novo Cupom
              </button>
            </div>
            
            <div className="bg-primary-container rounded-xl shadow-[0px_4px_20px_rgba(0,0,0,0.04)] p-lg">
              <h3 className="font-headline-md text-[20px] text-on-primary-container mb-sm flex items-center gap-sm">
                <span className="material-symbols-outlined text-on-primary-container text-[20px]">info</span>
                Aviso
              </h3>
              <p className="font-body-md text-body-md text-on-primary-container opacity-90">
                Alterações na jornada afetam a disponibilidade de todos os profissionais. Agendamentos existentes fora dos novos horários ou nas exceções exigirão reagendamento manual.
              </p>
            </div>
          </section>
        </div>

        {/* Mobile Save FAB */}
        <button onClick={handleSaveAll} disabled={saving} className="md:hidden fixed bottom-6 right-4 bg-primary text-on-primary rounded-full p-md shadow-[0px_10px_30px_rgba(0,0,0,0.08)] flex items-center justify-center hover:scale-105 transition-transform z-40">
          <span className="material-symbols-outlined text-[24px]">save</span>
        </button>
      </div>

      {showExceptionModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-[500px] flex flex-col p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold mb-4 text-slate-900">Adicionar Exceção de Data</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Motivo / Título</label>
                <input 
                  type="text" 
                  value={newException.reason}
                  onChange={(e) => setNewException({...newException, reason: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-all"
                  placeholder="Ex: Feriado Nacional, Evento..."
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Data</label>
                <input 
                  type="date" 
                  value={newException.date}
                  onChange={(e) => setNewException({...newException, date: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-all"
                />
              </div>
              <div className="flex items-center gap-2 mt-4 mb-2 bg-slate-50 p-3 rounded-lg border border-slate-100">
                <input 
                  type="checkbox" 
                  id="exc-closed"
                  checked={newException.is_closed}
                  onChange={(e) => setNewException({...newException, is_closed: e.target.checked})}
                  className="w-4 h-4 text-accent border-slate-300 rounded focus:ring-accent"
                />
                <label htmlFor="exc-closed" className="text-sm font-bold text-slate-700 cursor-pointer">Dia Inteiro Fechado?</label>
              </div>
              {!newException.is_closed && (
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-bold text-slate-700 mb-1">Abertura</label>
                    <input 
                      type="text" 
                      value={newException.open_time}
                      onChange={(e) => setNewException({...newException, open_time: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-all"
                      placeholder="09:00"
                      maxLength={5}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-bold text-slate-700 mb-1">Fechamento</label>
                    <input 
                      type="text" 
                      value={newException.close_time}
                      onChange={(e) => setNewException({...newException, close_time: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-all"
                      placeholder="18:00"
                      maxLength={5}
                    />
                  </div>
                </div>
              )}
            </div>
            <div className="mt-8 flex justify-end gap-3">
              <button onClick={() => setShowExceptionModal(false)} className="px-6 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors">Cancelar</button>
              <button onClick={handleAddException} className="px-6 py-2.5 text-sm font-bold bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors shadow-lg shadow-slate-200">Adicionar</button>
            </div>
          </div>
        </div>
      )}

      {/* Coupon Modal */}
      {showCouponModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-[400px] flex flex-col p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold mb-4 text-slate-900">Novo Cupom</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Código do Cupom</label>
                <input 
                  type="text" 
                  value={newCoupon.code}
                  onChange={(e) => setNewCoupon({...newCoupon, code: e.target.value.toUpperCase()})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:border-accent focus:ring-1 focus:ring-accent outline-none font-mono uppercase"
                  placeholder="EX: VERAO20"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Válido Para</label>
                <select
                  value={newCoupon.service_id}
                  onChange={(e) => setNewCoupon({...newCoupon, service_id: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:border-accent focus:ring-1 focus:ring-accent outline-none"
                >
                  <option value="">Todos os Serviços (Global)</option>
                  {services.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-bold text-slate-700 mb-1">Tipo de Desconto</label>
                  <select
                    value={newCoupon.discount_type}
                    onChange={(e) => setNewCoupon({...newCoupon, discount_type: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:border-accent focus:ring-1 focus:ring-accent outline-none"
                  >
                    <option value="percentage">Porcentagem (%)</option>
                    <option value="fixed">Valor Fixo (R$)</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-bold text-slate-700 mb-1">Valor</label>
                  <input 
                    type="number" 
                    value={newCoupon.discount_value}
                    onChange={(e) => setNewCoupon({...newCoupon, discount_value: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:border-accent focus:ring-1 focus:ring-accent outline-none"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-bold text-slate-700 mb-1">Máximo de Usos</label>
                  <input 
                    type="number" 
                    value={newCoupon.max_uses}
                    onChange={(e) => setNewCoupon({...newCoupon, max_uses: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:border-accent focus:ring-1 focus:ring-accent outline-none"
                    placeholder="Ilimitado"
                    min="1"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-bold text-slate-700 mb-1">Válido Até</label>
                  <input 
                    type="date" 
                    value={newCoupon.expires_at}
                    onChange={(e) => setNewCoupon({...newCoupon, expires_at: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:border-accent focus:ring-1 focus:ring-accent outline-none"
                  />
                </div>
              </div>
            </div>
            <div className="mt-8 flex justify-end gap-3">
              <button onClick={() => setShowCouponModal(false)} className="px-6 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors">Cancelar</button>
              <button onClick={handleAddCoupon} className="px-6 py-2.5 text-sm font-bold bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors shadow-lg shadow-slate-200">Criar Cupom</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .toggle-checkbox:checked { right: 0; border-color: var(--color-primary); }
        .toggle-checkbox:checked + .toggle-label { background-color: var(--color-primary-container); }
        .toggle-checkbox:checked + .toggle-label:after { transform: translateX(100%); border-color: white; }
      `}</style>
    </>
  );
};

export default ConfiguracoesOperacionais;
