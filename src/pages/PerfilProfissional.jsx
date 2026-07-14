import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTenant } from '../context/TenantContext';
import { api } from '../lib/api';
import { useNotification } from '../context/NotificationProvider';

const PerfilProfissional = () => {
  const { tenant_slug } = useParams();
  const navigate = useNavigate();
  const { tenant, session, login } = useTenant();
  const { showSuccess, showError } = useNotification();

  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!session) {
      navigate(`/${tenant_slug}/staff/login`);
      return;
    }

    const fetchProfile = async () => {
      try {
        // Obter dados atualizados do profissional a partir do endpoint /auth/me
        const data = await api.auth.me();
        if (data) {
          setNome(data.name || '');
          setTelefone(data.phone || '');
          setEmail(data.email || '');
        }
      } catch (err) {
        console.error("Erro ao buscar dados do perfil do profissional:", err);
      } finally {
        setInitialLoad(false);
      }
    };

    fetchProfile();
  }, [session, navigate, tenant_slug]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!nome.trim()) { showError("O nome é obrigatório."); return; }
    if (!telefone.trim()) { showError("O telefone é obrigatório."); return; }

    if (novaSenha || confirmarSenha) {
      if (novaSenha !== confirmarSenha) {
        showError("As senhas não coincidem."); return;
      }
      if (novaSenha.length < 4) {
        showError("A nova senha deve ter no mínimo 4 caracteres."); return;
      }
    }

    setLoading(true);
    try {
      const cleanPhone = telefone.replace(/\D/g, '');

      await api.staff.updateMe({
        name: nome,
        phone: cleanPhone,
        password: novaSenha || undefined
      });

      // Atualizar a sessão local no contexto para atualizar o nome na barra lateral imediatamente
      if (login) {
        login({
          ...session,
          name: nome
        });
      }

      setNovaSenha('');
      setConfirmarSenha('');
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error(err);
      showError("Erro ao salvar alterações: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-[800px] mx-auto py-lg px-container-margin md:px-0 animate-fade-in-up">
      {/* Header */}
      <div className="mb-xl">
        <h2 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface mb-xs">
          Meu Perfil
        </h2>
        <p className="font-body-md text-body-md text-on-surface-variant">
          Gerencie suas informações cadastrais e senha de acesso.
        </p>
      </div>

      {initialLoad ? (
        <div className="flex justify-center py-xl">
          <span className="material-symbols-outlined animate-spin text-primary text-4xl">progress_activity</span>
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-lg">
          {/* Card: Dados Cadastrais */}
          <div className="bg-white rounded-xl shadow-[0px_4px_20px_rgba(0,0,0,0.04)] p-md md:p-lg border border-surface-variant/20">
            <h3 className="font-headline-md text-headline-md text-on-surface mb-md flex items-center gap-sm border-b border-surface-variant/30 pb-xs">
              <span className="material-symbols-outlined text-primary">badge</span>
              Dados Cadastrais
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-1">Nome Completo</label>
                <input 
                  required 
                  type="text" 
                  className="w-full border border-outline-variant rounded-lg px-md py-sm bg-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" 
                  value={nome} 
                  onChange={e => setNome(e.target.value)} 
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-1">Telefone (Contato)</label>
                <input 
                  required 
                  type="tel" 
                  placeholder="(11) 99999-9999" 
                  className="w-full border border-outline-variant rounded-lg px-md py-sm bg-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" 
                  value={telefone} 
                  onChange={e => setTelefone(e.target.value)} 
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-on-surface-variant mb-1">
                  E-mail de Login (Somente Leitura)
                </label>
                <div className="relative">
                  <input 
                    disabled 
                    type="email" 
                    className="w-full border border-outline-variant rounded-lg px-md py-sm bg-surface-variant/30 text-on-surface-variant/70 cursor-not-allowed outline-none select-none pr-10" 
                    value={email} 
                  />
                  <span className="material-symbols-outlined text-[20px] text-on-surface-variant/40 absolute right-3 top-2.5">
                    lock
                  </span>
                </div>
                <p className="text-xs text-secondary mt-1">
                  O e-mail é utilizado para acessar a sua conta e não pode ser alterado diretamente.
                </p>
              </div>
            </div>
          </div>

          {/* Card: Alterar Senha */}
          <div className="bg-white rounded-xl shadow-[0px_4px_20px_rgba(0,0,0,0.04)] p-md md:p-lg border border-surface-variant/20">
            <h3 className="font-headline-md text-headline-md text-on-surface mb-md flex items-center gap-sm border-b border-surface-variant/30 pb-xs">
              <span className="material-symbols-outlined text-primary">lock_reset</span>
              Segurança e Senha
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-1">Nova Senha</label>
                <input 
                  type="password" 
                  placeholder="••••••••" 
                  className="w-full border border-outline-variant rounded-lg px-md py-sm bg-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" 
                  value={novaSenha} 
                  onChange={e => setNovaSenha(e.target.value)} 
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-1">Confirmar Nova Senha</label>
                <input 
                  type="password" 
                  placeholder="••••••••" 
                  className="w-full border border-outline-variant rounded-lg px-md py-sm bg-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" 
                  value={confirmarSenha} 
                  onChange={e => setConfirmarSenha(e.target.value)} 
                />
              </div>
            </div>
            <p className="text-xs text-secondary mt-md">
              Preencha os campos acima apenas se desejar alterar a sua senha de acesso atual.
            </p>
          </div>

          {/* Feedback & Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-md pt-sm">
            <div>
              {saved && (
                <div className="flex items-center gap-sm text-[#2e7d32] font-semibold animate-fade-in">
                  <span className="material-symbols-outlined">check_circle</span>
                  <span>Alterações salvas com sucesso!</span>
                </div>
              )}
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full sm:w-auto flex items-center justify-center gap-sm bg-primary text-on-primary px-xl py-sm rounded-lg font-bold hover:bg-on-primary-fixed-variant disabled:opacity-50 transition-all shadow-sm"
            >
              {loading ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[20px]">save</span>
                  <span>Salvar Dados</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default PerfilProfissional;
