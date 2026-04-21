import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { User, Briefcase, Mail, Lock, ArrowRight, Loader2, Sparkles, CheckCircle2 } from 'lucide-react';

const ProfessionalRegister = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'professional',
    specialty: ''
  });

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 1. Criar Auth User
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      });

      if (authError) throw authError;

      if (authData.user) {
        // 2. Criar Perfil (is_active: false por padrão)
        const { error: profileError } = await supabase
          .from('cap_profiles')
          .insert([
            {
              id: authData.user.id,
              full_name: formData.fullName,
              role: 'professional',
              is_active: false
            }
          ]);

        if (profileError) throw profileError;
        
        setSuccess(true);
      }
    } catch (err) {
      setError(err.message || 'Falha ao registrar profissional');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fdfcfb] p-6">
        <div className="max-w-md w-full bg-white rounded-3xl p-10 shadow-xl shadow-rose-100/50 border border-rose-50 text-center animate-in zoom-in-95 duration-500">
          <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="text-emerald-500" size={40} />
          </div>
          <h2 className="text-2xl font-serif text-slate-900 mb-4">Cadastro Enviado!</h2>
          <p className="text-slate-500 text-sm leading-relaxed mb-8">
            Seu perfil foi criado com sucesso. Agora, o gestor do Capelli irá analisar seu cadastro. 
            Você poderá acessar o sistema assim que seu perfil for habilitado.
          </p>
          <Link 
            to="/login" 
            className="btn-accent inline-flex items-center gap-2 px-8 py-3 rounded-full text-sm font-bold"
          >
            Voltar para o Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fdfcfb] flex flex-col items-center justify-center p-6 lg:p-12">
      <div className="w-full max-w-lg space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
        
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-rose-50 text-rose-500 rounded-full text-[10px] font-bold uppercase tracking-widest mb-2">
            <Sparkles size={12} />
            Seja um parceiro Capelli
          </div>
          <h1 className="text-4xl lg:text-5xl font-serif text-slate-900 tracking-tight">Crie seu Perfil</h1>
          <p className="text-slate-500 text-sm max-w-xs mx-auto">Cadastre-se para gerenciar sua agenda e clientes em nossa plataforma.</p>
        </div>

        <div className="bg-white rounded-[2rem] p-8 lg:p-10 shadow-2xl shadow-rose-100/30 border border-slate-50">
          {error && (
            <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 text-xs font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleRegister} className="grid grid-cols-1 gap-5">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Nome Completo</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input 
                  type="text" 
                  required
                  className="input-base pl-12 h-14 rounded-2xl border-slate-100 focus:border-rose-200"
                  placeholder="Seu nome artístico ou completo"
                  value={formData.fullName}
                  onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">E-mail Profissional</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input 
                  type="email" 
                  required
                  className="input-base pl-12 h-14 rounded-2xl border-slate-100 focus:border-rose-200"
                  placeholder="seu@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Senha</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input 
                  type="password" 
                  required
                  className="input-base pl-12 h-14 rounded-2xl border-slate-100 focus:border-rose-200"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                />
              </div>
            </div>

            <div className="pt-4">
              <button 
                type="submit" 
                disabled={loading}
                className="btn-accent w-full py-5 rounded-2xl text-sm font-bold shadow-xl shadow-rose-200/50 flex items-center justify-center gap-3 group"
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : (
                  <>
                    Enviar Cadastro para Análise
                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-8 text-center pt-6 border-t border-slate-50">
            <p className="text-slate-400 text-xs">
              Já faz parte da equipe? {' '}
              <Link to="/login" className="text-rose-500 font-bold hover:underline">Faça Login</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfessionalRegister;
