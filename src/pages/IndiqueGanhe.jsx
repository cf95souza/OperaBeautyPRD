import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTenant } from '../context/TenantContext';
import { api } from '../lib/api';
import { useNotification } from '../context/NotificationProvider';

const IndiqueGanhe = () => {
  const { tenant_slug } = useParams();
  const navigate = useNavigate();
  const { tenant, session } = useTenant();
  const { showError } = useNotification();
  
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) {
      navigate(`/${tenant_slug}/login`);
      return;
    }
    
    if (tenant && !tenant.features?.referral) {
      showError("Programa Indique e Ganhe não está ativo.");
      navigate(`/${tenant_slug}/home`);
      return;
    }

    const fetchStats = async () => {
      setLoading(true);
      try {
        const data = await api.request('/referral/stats');
        setStats(data);
      } catch (err) {
        console.error(err);
        showError("Erro ao carregar estatísticas.");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [tenant, session, navigate, tenant_slug, showError]);

  const handleShare = () => {
    if (!stats?.referralCode) return;
    
    const url = `${window.location.origin}/${tenant_slug}/cadastro?ref=${stats.referralCode}`;
    const text = `Descobri o salão ${tenant?.name} e achei a sua cara! Use meu link para ganhar R$ 20 na sua primeira visita: ${url}`;
    
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleCopy = () => {
    if (!stats?.referralCode) return;
    const url = `${window.location.origin}/${tenant_slug}/cadastro?ref=${stats.referralCode}`;
    navigator.clipboard.writeText(url);
    alert("Link copiado!");
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center font-body-md bg-background text-on-background">Carregando...</div>;

  return (
    <div className="bg-background text-on-background min-h-screen font-body-md">
      <header className="w-full top-0 sticky z-40 bg-surface shadow-sm transition-all duration-300 ease-in-out pt-[calc(env(safe-area-inset-top,0px)+28px)] pb-2 md:pt-4">
        <div className="flex justify-between items-center px-gutter py-sm w-full max-w-7xl mx-auto">
          <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center bg-surface-variant/30 text-on-surface rounded-full active:scale-95 transition-all">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="font-headline-md text-headline-md-mobile md:text-headline-md text-primary tracking-tight text-center flex-1">
            Indique e Ganhe
          </h1>
          <div className="w-10"></div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-container-margin py-lg animate-fade-in-up">
        
        <div className="bg-gradient-to-br from-primary to-secondary rounded-3xl p-6 text-on-primary mb-8 shadow-xl text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
          <span className="material-symbols-outlined text-[64px] mb-2 opacity-90">volunteer_activism</span>
          <h2 className="font-headline-md text-2xl font-bold mb-2">Compartilhe Beleza</h2>
          <p className="text-on-primary/90 text-sm mb-6 max-w-[250px] mx-auto">
            Convide suas amigas e ganhe R$ 20 na sua carteira para cada amiga que se cadastrar.
          </p>
          
          <div className="bg-surface/10 rounded-2xl p-4 backdrop-blur-sm border border-white/20">
            <p className="text-xs font-bold uppercase tracking-widest mb-1 text-white/80">Seu Código Exclusivo</p>
            <p className="font-mono text-3xl font-black tracking-wider text-white">
              {stats?.referralCode || '----'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-surface-container-lowest p-5 rounded-2xl shadow-sm text-center border border-surface-variant/50">
            <span className="material-symbols-outlined text-primary mb-2 text-[32px]">group_add</span>
            <p className="text-sm text-secondary mb-1">Amigos Indicados</p>
            <p className="font-headline-md text-3xl text-on-surface">{stats?.totalFriends || 0}</p>
          </div>
          <div className="bg-surface-container-lowest p-5 rounded-2xl shadow-sm text-center border border-surface-variant/50">
            <span className="material-symbols-outlined text-success mb-2 text-[32px]">payments</span>
            <p className="text-sm text-secondary mb-1">Total Ganho</p>
            <p className="font-headline-md text-3xl text-on-surface">R$ {parseFloat(stats?.totalBonus || 0).toFixed(2).replace('.', ',')}</p>
          </div>
        </div>

        <div className="space-y-4">
          <button 
            onClick={handleShare}
            className="w-full py-4 bg-[#25D366] text-white font-bold rounded-xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 hover:bg-[#20bd5a]"
          >
            <span className="material-symbols-outlined">share</span>
            Convidar pelo WhatsApp
          </button>
          
          <button 
            onClick={handleCopy}
            className="w-full py-4 border border-outline-variant text-on-surface font-bold rounded-xl active:scale-95 transition-all flex items-center justify-center gap-2 hover:bg-surface-variant"
          >
            <span className="material-symbols-outlined">content_copy</span>
            Copiar Link
          </button>
        </div>

      </main>
    </div>
  );
};

export default IndiqueGanhe;
