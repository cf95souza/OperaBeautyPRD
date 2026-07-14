import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';

const SuperAdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await api.auth.loginSuperAdmin(email, password);
      
      // Salva no localStorage para uso do SuperAdminProtectedRoute e me()
      localStorage.setItem('operabeauty_token', res.token);
      localStorage.setItem('operabeauty_user', JSON.stringify(res.user));
      
      navigate('/superadmin');
    } catch (err) {
      setError(err.message || 'Erro ao realizar login.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-surface text-on-surface font-body-md animate-fade-in-up px-4">
      <div className="w-full max-w-[448px] p-lg bg-surface-container-lowest rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.08)]">
        
        <div className="flex flex-col items-center mb-xl">
          <div className="w-16 h-16 bg-primary-container text-on-primary-container rounded-full flex items-center justify-center mb-md">
            <span className="material-symbols-outlined text-[32px]">admin_panel_settings</span>
          </div>
          <h1 className="font-headline-md text-headline-md text-primary tracking-tight">SaaS Mestre</h1>
          <p className="font-body-md text-secondary mt-xs">Acesso exclusivo do Super Admin</p>
        </div>

        {error && (
          <div className="mb-md p-sm bg-error-container text-on-error-container rounded-lg font-label-sm text-center border border-error/30">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="flex flex-col gap-lg">
          <div>
            <label className="font-label-md text-label-md text-on-surface block mb-sm">E-mail</label>
            <input 
              type="email" 
              className="w-full bg-surface-container-low border-none rounded-lg px-md py-3 font-body-md text-body-md focus:ring-2 focus:ring-primary outline-none transition-all"
              placeholder="admin@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="off"
              required
            />
          </div>

          <div>
            <label className="font-label-md text-label-md text-on-surface block mb-sm">Senha</label>
            <input 
              type="password" 
              className="w-full bg-surface-container-low border-none rounded-lg px-md py-3 font-body-md text-body-md focus:ring-2 focus:ring-primary outline-none transition-all"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-primary text-on-primary font-label-md text-label-md py-3 rounded-full mt-sm hover:opacity-90 active:scale-95 transition-all shadow-sm disabled:opacity-50"
          >
            {loading ? 'Autenticando...' : 'Entrar no Painel Global'}
          </button>
        </form>

      </div>
    </div>
  );
};

export default SuperAdminLogin;
