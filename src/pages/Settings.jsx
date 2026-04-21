import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Settings as SettingsIcon, 
  Palette, 
  Clock, 
  CalendarOff, 
  Save, 
  Loader2, 
  Phone,
  Layout,
  Globe,
  Plus,
  Trash2,
  CheckCircle2,
  X,
  Scissors
} from 'lucide-react';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('branding');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingHours, setSavingHours] = useState(false);
  
  // States for different categories
  const [branding, setBranding] = useState({
    salon_name: '',
    primary_color: '#be185d',
    instagram_url: '',
    whatsapp_number: '',
    logo_url: ''
  });

  const [businessHours, setBusinessHours] = useState([]);
  const [loadingHours, setLoadingHours] = useState(false);
  const [blockedDates, setBlockedDates] = useState([]);
  const [newBlockedDate, setNewBlockedDate] = useState({ date: '', reason: '' });

  useEffect(() => {
    fetchSettings();
    fetchBusinessHours();
    fetchBlockedDates();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    const { data } = await supabase.from('cap_settings').select('*').single();
    if (data) setBranding(data);
    setLoading(false);
  };

  const fetchBusinessHours = async () => {
    setLoadingHours(true);
    const { data } = await supabase.from('cap_business_hours').select('*').order('day_of_week');
    if (data) setBusinessHours(data);
    setLoadingHours(false);
  };

  const handleInitializeHours = async () => {
    setLoadingHours(true);
    const defaultHours = [
      { day_of_week: 0, open_time: '00:00:00', close_time: '00:00:00', is_closed: true },
      { day_of_week: 1, open_time: '09:00:00', close_time: '18:00:00', is_closed: false },
      { day_of_week: 2, open_time: '09:00:00', close_time: '18:00:00', is_closed: false },
      { day_of_week: 3, open_time: '09:00:00', close_time: '18:00:00', is_closed: false },
      { day_of_week: 4, open_time: '09:00:00', close_time: '18:00:00', is_closed: false },
      { day_of_week: 5, open_time: '09:00:00', close_time: '18:00:00', is_closed: false },
      { day_of_week: 6, open_time: '09:00:00', close_time: '18:00:00', is_closed: false }
    ];
    
    const { error } = await supabase.from('cap_business_hours').insert(defaultHours);
    if (error) alert('Erro ao inicializar: ' + error.message);
    else fetchBusinessHours();
    setLoadingHours(false);
  };

  const fetchBlockedDates = async () => {
    const { data } = await supabase.from('cap_blocked_dates').select('*').order('blocked_date', { ascending: false });
    if (data) setBlockedDates(data || []);
  };

  const handleSaveBranding = async () => {
    setSaving(true);
    const { error } = await supabase.from('cap_settings').update(branding).eq('id', branding.id);
    if (error) alert('Erro ao salvar branding: ' + error.message);
    else alert('Identidade visual atualizada com sucesso!');
    setSaving(false);
  };

  // 🌟 NOVO: Lógica de Salvamento Manual para Horários
  const handleHourChange = (id, field, value) => {
    setBusinessHours(prev => prev.map(h => h.id === id ? { ...h, [field]: value } : h));
  };

  const toggleDayClosedLocal = (id) => {
    setBusinessHours(prev => prev.map(h => h.id === id ? { ...h, is_closed: !h.is_closed } : h));
  };

  const handleSaveHours = async () => {
    setSavingHours(true);
    try {
      // Faz o update de cada linha alterada (Upsert funciona melhor para múltiplos registros se tivermos os IDs)
      const { error } = await supabase
        .from('cap_business_hours')
        .upsert(businessHours);
        
      if (error) throw error;
      alert('Jornada semanal salva com sucesso!');
    } catch (err) {
      alert('Erro ao salvar horários: ' + err.message);
    }
    setSavingHours(false);
  };

  const handleAddBlockedDate = async (e) => {
    e.preventDefault();
    if (!newBlockedDate.date) return;
    const { error } = await supabase.from('cap_blocked_dates').insert([{ blocked_date: newBlockedDate.date, reason: newBlockedDate.reason }]);
    if (error) alert('Erro ao bloquear data: ' + error.message);
    else { setNewBlockedDate({ date: '', reason: '' }); fetchBlockedDates(); }
  };

  const deleteBlockedDate = async (id) => {
    await supabase.from('cap_blocked_dates').delete().eq('id', id);
    fetchBlockedDates();
  };

  if (loading) return <div className="p-10 text-center"><Loader2 className="animate-spin mx-auto text-accent" /></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-6xl mx-auto px-4 md:px-0">
      <div>
        <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none">CONFIGURAÇÕES</h2>
        <p className="text-sm text-slate-400 font-medium mt-1">Gerencie a identidade e as regras reais do seu salão.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar Tabs */}
        <div className="lg:w-72 shrink-0 space-y-2">
          <button onClick={() => setActiveTab('branding')} className={`w-full flex items-center justify-between px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'branding' ? 'bg-slate-900 text-white shadow-xl shadow-slate-900/20' : 'text-slate-400 hover:bg-white border border-transparent'}`}><div className="flex items-center gap-3"><Palette size={18} /> IDENTIDADE VISUAL</div> {activeTab === 'branding' && <ChevronRight size={14} />}</button>
          <button onClick={() => setActiveTab('hours')} className={`w-full flex items-center justify-between px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'hours' ? 'bg-slate-900 text-white shadow-xl shadow-slate-900/20' : 'text-slate-400 hover:bg-white border border-transparent'}`}><div className="flex items-center gap-3"><Clock size={18} /> JORNADA DE TRABALHO</div> {activeTab === 'hours' && <ChevronRight size={14} />}</button>
          <button onClick={() => setActiveTab('blocked')} className={`w-full flex items-center justify-between px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'blocked' ? 'bg-slate-900 text-white shadow-xl shadow-slate-900/20' : 'text-slate-400 hover:bg-white border border-transparent'}`}><div className="flex items-center gap-3"><CalendarOff size={18} /> DATAS BLOQUEADAS</div> {activeTab === 'blocked' && <ChevronRight size={14} />}</button>
        </div>

        {/* Tab Content */}
        <div className="flex-1">
          {activeTab === 'branding' && (
            <div className="card-base p-10 space-y-8 bg-white border-slate-100 shadow-2xl shadow-slate-200/50">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                     <label className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] px-1">Nome do Salão</label>
                     <input type="text" value={branding.salon_name} onChange={(e) => setBranding({...branding, salon_name: e.target.value})} className="input-base text-lg font-bold" />
                  </div>
                  <div className="space-y-2">
                     <label className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] px-1">Cor Primária (HEX)</label>
                     <div className="flex gap-3"><input type="color" value={branding.primary_color} onChange={(e) => setBranding({...branding, primary_color: e.target.value})} className="w-12 h-12 rounded-xl border-none cursor-pointer bg-slate-50 p-1" /><input type="text" value={branding.primary_color} onChange={(e) => setBranding({...branding, primary_color: e.target.value})} className="input-base font-mono font-bold" /></div>
                  </div>
                   <div className="space-y-2 md:col-span-2">
                    <label className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] px-1">Logotipo (URL)</label>
                    <div className="flex gap-4"><div className="w-16 h-16 bg-slate-50 border-2 border-slate-100 rounded-2xl flex items-center justify-center overflow-hidden shrink-0">{branding.logo_url ? <img src={branding.logo_url} alt="Logo" className="w-full h-full object-contain" /> : <Layout className="text-slate-200" size={24} />}</div><input type="text" value={branding.logo_url} onChange={(e) => setBranding({...branding, logo_url: e.target.value})} className="input-base" placeholder="https://..." /></div>
                  </div>
                  <div className="space-y-2"><label className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] px-1"><Globe size={12} className="inline mr-1" /> Instagram</label><input type="text" value={branding.instagram_url} onChange={(e) => setBranding({...branding, instagram_url: e.target.value})} className="input-base" /></div>
                  <div className="space-y-2"><label className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] px-1"><Phone size={12} className="inline mr-1" /> WhatsApp</label><input type="text" value={branding.whatsapp_number} onChange={(e) => setBranding({...branding, whatsapp_number: e.target.value})} className="input-base" /></div>
               </div>
               <div className="pt-6 border-t border-slate-50 flex justify-end">
                  <button onClick={handleSaveBranding} disabled={saving} className="btn-accent px-10 py-4 flex items-center gap-3 shadow-xl shadow-accent/20 rounded-2xl">
                     {saving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />} <span className="font-black uppercase text-xs tracking-widest">Salvar Branding</span>
                  </button>
               </div>
            </div>
          )}

          {activeTab === 'hours' && (
            <div className="card-base bg-white border-slate-100 shadow-2xl shadow-slate-200/50 overflow-hidden">
               <div className="p-8 border-b border-slate-50 flex justify-between items-center">
                  <div><h3 className="text-xl font-black text-slate-900 tracking-tight uppercase">Jornada Semanal</h3><p className="text-xs text-slate-400 font-medium">Os horários serão aplicados após clicar em salvar.</p></div>
                  <button onClick={handleSaveHours} disabled={savingHours || loadingHours} className="btn-accent px-6 py-3 rounded-xl flex items-center gap-2 shadow-lg shadow-accent/20">
                     {savingHours ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                     <span className="text-[10px] font-black uppercase tracking-widest">Salvar Jornada</span>
                  </button>
               </div>
               <div className="divide-y divide-slate-50">
                  {loadingHours ? (
                    <div className="p-20 text-center text-slate-300"><Loader2 className="animate-spin mx-auto mb-3" /><p className="text-[10px] font-black uppercase tracking-widest">Sincronizando...</p></div>
                  ) : businessHours.length === 0 ? (
                    <div className="p-16 text-center space-y-6"><Clock size={48} className="mx-auto text-slate-100" /><button onClick={handleInitializeHours} className="btn-accent px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest">Inicializar Horários</button></div>
                  ) : (
                    businessHours.map((hour) => (
                      <div key={hour.id} className="p-6 flex items-center justify-between group hover:bg-slate-50 transition-all">
                         <div className="flex items-center gap-12">
                            <div className="w-24 text-xs font-black text-slate-900 border-l-4 border-accent pl-6 uppercase tracking-[0.2em]">{['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][hour.day_of_week]}</div>
                            {!hour.is_closed ? (
                              <div className="flex items-center gap-4 animate-in fade-in slide-in-from-left-4">
                                 <div className="space-y-1">
                                    <label className="text-[9px] font-black text-slate-300 uppercase tracking-widest block text-center">Abertura</label>
                                    <input type="time" value={(hour.open_time || '09:00:00').substring(0, 5)} onChange={(e) => handleHourChange(hour.id, 'open_time', e.target.value)} className="text-sm font-black bg-white border border-slate-200 rounded-xl px-5 py-3 focus:border-accent outline-none shadow-sm" />
                                 </div>
                                 <div className="pt-5 text-slate-200 font-bold">---</div>
                                 <div className="space-y-1">
                                    <label className="text-[9px] font-black text-slate-300 uppercase tracking-widest block text-center">Fechamento</label>
                                    <input type="time" value={(hour.close_time || '18:00:00').substring(0, 5)} onChange={(e) => handleHourChange(hour.id, 'close_time', e.target.value)} className="text-sm font-black bg-white border border-slate-200 rounded-xl px-5 py-3 focus:border-accent outline-none shadow-sm" />
                                 </div>
                              </div>
                            ) : (
                              <div className="text-rose-400 italic text-xs font-black uppercase tracking-widest flex items-center gap-2"><X size={14} /> Fechado para o público</div>
                            )}
                         </div>
                         <button onClick={() => toggleDayClosedLocal(hour.id)} className={`px-6 py-2.5 rounded-2xl text-[9px] font-black uppercase tracking-widest border transition-all ${hour.is_closed ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-white text-slate-300 border-slate-100 hover:text-accent hover:border-accent hover:bg-accent/5'}`}>{hour.is_closed ? 'Ativar Dia' : 'Desativar Dia'}</button>
                      </div>
                    ))
                  )}
               </div>
               {businessHours.length > 0 && (
                 <div className="p-8 bg-slate-50/50 flex justify-center border-t border-slate-50">
                    <button onClick={handleSaveHours} disabled={savingHours} className="btn-accent px-12 py-5 rounded-2xl flex items-center gap-3 shadow-2xl shadow-accent/30 active:scale-95 transition-all">
                       {savingHours ? <Loader2 size={24} className="animate-spin" /> : <Save size={24} />}
                       <span className="text-sm font-black uppercase tracking-widest">Salvar alterações da jornada</span>
                    </button>
                 </div>
               )}
            </div>
          )}

          {activeTab === 'blocked' && (
            <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
               <div className="card-base p-8 bg-white border-slate-100 shadow-2xl shadow-slate-200/50">
                  <h3 className="font-black text-slate-900 mb-6 flex items-center gap-3 uppercase tracking-tighter"><Plus size={20} className="text-accent" /> Bloquear Nova Data</h3>
                  <form onSubmit={handleAddBlockedDate} className="grid grid-cols-1 md:grid-cols-3 gap-5">
                     <input type="date" className="input-base md:col-span-1" value={newBlockedDate.date} onChange={(e) => setNewBlockedDate({...newBlockedDate, date: e.target.value})} />
                     <input type="text" placeholder="Motivo (ex: Feriado Local)" className="input-base md:col-span-1" value={newBlockedDate.reason} onChange={(e) => setNewBlockedDate({...newBlockedDate, reason: e.target.value})} />
                     <button type="submit" className="btn-primary py-4 px-8 font-black uppercase text-xs tracking-widest shadow-xl">Bloquear Data</button>
                  </form>
               </div>
               <div className="card-base bg-white border-slate-100 shadow-xl shadow-slate-200/30 overflow-hidden">
                  <div className="p-4 bg-slate-50/50 border-b border-slate-100"><h4 className="text-[10px] font-black text-slate-300 uppercase tracking-widest px-4">Datas de Recesso</h4></div>
                  <div className="divide-y divide-slate-50">
                     {blockedDates.length === 0 ? <div className="p-16 text-center text-slate-300 font-bold uppercase text-[10px] tracking-widest leading-none">Nenhuma data bloqueada</div> : blockedDates.map((item) => (
                       <div key={item.id} className="p-6 flex items-center justify-between group hover:bg-slate-50/50 transition-all"><div className="flex items-center gap-5"><div className="p-3 bg-accent/10 text-accent rounded-xl shadow-inner"><CalendarOff size={20} /></div><div><p className="text-sm font-black text-slate-900">{new Date(item.blocked_date + 'T00:00:00').toLocaleDateString('pt-BR')}</p><p className="text-xs text-slate-400 font-medium">{item.reason || 'Sem motivo especificado'}</p></div></div><button onClick={() => deleteBlockedDate(item.id)} className="p-3 text-slate-200 hover:text-accent hover:bg-accent/5 rounded-xl opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={18} /></button></div>
                     ))}
                  </div>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ChevronRight = ({ size }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>;

export default Settings;
