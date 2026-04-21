import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  User, 
  Lock, 
  Save, 
  CheckCircle2, 
  Loader2,
  ShieldCheck,
  AlertCircle,
  Crown
} from 'lucide-react';

const ProfileSettings = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    full_name: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    // 1. Tentar Sessão Interna
    const savedSession = localStorage.getItem('cap_internal_session');
    if (savedSession) {
      const internalUser = JSON.parse(savedSession);
      const { data } = await supabase
        .from('cap_profiles')
        .select('*')
        .eq('id', internalUser.user_id)
        .single();
      
      setProfile(data);
      setFormData(prev => ({ ...prev, full_name: data?.full_name || '' }));
      setLoading(false);
      return;
    }

    // 2. Tentar Sessão Oficial
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('cap_profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      setProfile(data);
      setFormData(prev => ({ ...prev, full_name: data?.full_name || '' }));
    }
    setLoading(false);
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      // 1. Atualizar Nome no Perfil
      const { error: profileError } = await supabase
        .from('cap_profiles')
        .update({ full_name: formData.full_name })
        .eq('id', profile.id);

      if (profileError) throw profileError;

      // 2. Atualizar Senha (se preenchida)
      if (formData.newPassword) {
        if (formData.newPassword !== formData.confirmPassword) {
          throw new Error('As senhas não coincidem.');
        }
        if (formData.newPassword.length < 6) {
          throw new Error('A senha deve ter pelo menos 6 caracteres.');
        }

        const isInternal = localStorage.getItem('cap_internal_session');
        
        if (isInternal) {
          const { error: internalAuthError } = await supabase.rpc('cap_update_self_password', {
            p_user_id: profile.id,
            p_new_password: formData.newPassword
          });
          if (internalAuthError) throw internalAuthError;
        } else {
          const { error: authError } = await supabase.auth.updateUser({
            password: formData.newPassword
          });
          if (authError) throw authError;
        }
      }

      setSuccess(true);
      setFormData(prev => ({ ...prev, newPassword: '', confirmPassword: '' }));
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-accent" size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in duration-500">
      <header>
        <h2 className="text-3xl font-serif text-slate-900 tracking-tight">Minha Conta</h2>
        <p className="text-slate-500 mt-1 italic">Personalize sua identidade e segurança na plataforma.</p>
      </header>

      <div className="p-6 bg-emerald-50/30 rounded-2xl border border-emerald-100 shadow-sm flex items-center gap-6 animate-in slide-in-from-top-4 duration-700">
          <div className="p-3 bg-white rounded-xl shadow-sm shrink-0">
             <ShieldCheck className="text-emerald-500" size={24} />
          </div>
          <div>
             <p className="text-sm font-black text-slate-900 uppercase tracking-widest">Acesso Habilitado & Protegido</p>
             <p className="text-xs text-slate-600 mt-1">Sua conta está ativa e conta com criptografia de ponta a ponta para proteger seus dados profissionais.</p>
          </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Lado Esquerdo: Info */}
        <div className="md:col-span-1 space-y-4">
           <div className="card-base p-8 text-center flex flex-col items-center justify-center border-t-4 border-t-accent">
              <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-4 text-3xl font-serif text-slate-300 border-4 border-white shadow-xl">
                 {formData.full_name.substring(0,2).toUpperCase()}
              </div>
              <p className="font-serif text-xl text-slate-900">{profile?.full_name}</p>
              <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-slate-50 text-slate-400 rounded-full text-[10px] uppercase font-bold tracking-widest border border-slate-100">
                <Crown size={12} className={profile?.role === 'admin' ? "text-accent" : "text-slate-300"} />
                {profile?.role === 'admin' ? 'Proprietário' : 'Profissional'}
              </div>
           </div>
           
        </div>

        {/* Lado Direito: Formulário */}
        <div className="md:col-span-2">
           <form onSubmit={handleUpdateProfile} className="card-base p-8 bg-white space-y-6 shadow-premium">
              {error && (
                <div className="p-4 bg-rose-50 text-rose-600 text-xs font-bold rounded-xl flex items-center gap-2 border border-rose-100">
                   <AlertCircle size={16} /> {error}
                </div>
              )}

              {success && (
                <div className="p-4 bg-emerald-50 text-emerald-600 text-xs font-bold rounded-xl flex items-center gap-2 border border-emerald-100 animate-in zoom-in-95">
                   <CheckCircle2 size={16} /> Alterações salvas com sucesso!
                </div>
              )}

              <div className="space-y-4">
                <h3 className="text-sm font-serif text-slate-900 uppercase tracking-widest border-b border-slate-100 pb-3">Identidade no Salão</h3>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Nome Profissional</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="text" 
                      className="input-base !pl-12 py-3 bg-slate-50/50 border-slate-200"
                      value={formData.full_name}
                      onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                   <h3 className="text-sm font-serif text-slate-900 uppercase tracking-widest">Credenciais de Acesso</h3>
                   <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest bg-slate-50 px-2 py-1 rounded">Opcional</span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Definir Nova Senha</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input 
                        type="password" 
                        className="input-base !pl-12 py-3 bg-slate-50/50 border-slate-200"
                        placeholder="••••••••"
                        value={formData.newPassword}
                        onChange={(e) => setFormData({...formData, newPassword: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Repetir Senha</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input 
                        type="password" 
                        className="input-base !pl-12 py-3 bg-slate-50/50 border-slate-200"
                        placeholder="••••••••"
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={saving}
                className="w-full btn-primary py-4 mt-6 flex items-center justify-center gap-2 shadow-lg shadow-rose-200"
              >
                {saving ? <Loader2 className="animate-spin text-white" size={20} /> : <Save size={18} />}
                {saving ? 'Sincronizando...' : 'Atualizar Meus Dados'}
              </button>
           </form>
        </div>
      </div>
    </div>
  );
};

export default ProfileSettings;
