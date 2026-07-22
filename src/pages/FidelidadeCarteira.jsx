import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTenant } from '../context/TenantContext';
import { api } from '../lib/api';
import { useNotification } from '../context/NotificationProvider';
import ClienteBottomNavBar from '../components/ClienteBottomNavBar';

const FidelidadeCarteira = () => {
  const { tenant_slug } = useParams();
  const navigate = useNavigate();
  const { session, loading: loadingTenant } = useTenant();
  const { showError } = useNotification();

  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (loadingTenant) return;
    if (!session || session.role !== 'client') {
      navigate(`/${tenant_slug}/login`);
      return;
    }
    fetchData();
  }, [session, loadingTenant, navigate, tenant_slug]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await api.wallets.getMyWallet();
      if (data) {
        setBalance(parseFloat(data.balance || 0));
        setTransactions(data.transactions || []);
      }
    } catch (err) {
      console.error(err);
      showError('Erro ao carregar dados da carteira.');
    } finally {
      setLoading(false);
    }
  };

  if (loadingTenant || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-primary">
        <span className="material-symbols-outlined animate-spin text-4xl">progress_activity</span>
      </div>
    );
  }

  return (
    <div className="bg-background text-on-background min-h-screen pb-[90px] md:pb-6 font-body-md text-body-md antialiased">
      {/* Header */}
      <header className="w-full top-0 sticky z-40 bg-surface shadow-sm pt-[calc(env(safe-area-inset-top,0px)+28px)] pb-2 md:pt-4">
        <div className="flex justify-between items-center px-gutter py-sm w-full max-w-7xl mx-auto">
          <button 
            onClick={() => navigate(-1)} 
            className="p-2 rounded-full hover:bg-surface-variant text-on-surface transition-colors flex items-center justify-center"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="font-headline-md text-headline-md-mobile md:text-headline-md text-primary tracking-tight flex-1 text-center pr-10">
            Minha Carteira
          </h1>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-lg mx-auto px-container-margin py-lg space-y-xl animate-fade-in-up">
        
        {/* Card de Saldo */}
        <section className="bg-gradient-to-br from-primary to-primary/95 text-on-primary rounded-2xl p-lg shadow-md flex flex-col justify-between relative overflow-hidden h-[180px]">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-bl-full -z-10"></div>
          
          <div>
            <span className="font-label-sm text-[11px] uppercase tracking-widest opacity-80 block mb-1">Saldo de Cashback</span>
            <span className="font-headline-lg text-4xl font-bold">R$ {balance.toFixed(2).replace('.', ',')}</span>
          </div>

          <div className="flex justify-between items-center border-t border-white/10 pt-md mt-md">
            <span className="text-[11px] opacity-75">Use o seu saldo como desconto no próximo serviço!</span>
            <button 
              onClick={() => navigate(`/${tenant_slug}/agendar/profissionais`)}
              className="bg-white text-primary text-xs font-bold px-4 py-2.5 rounded-full hover:bg-white/95 transition-all shadow-sm shrink-0 active:scale-95"
            >
              Agendar Agora
            </button>
          </div>
        </section>

        {/* Extrato de Transações */}
        <section className="space-y-md">
          <h2 className="font-headline-md text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">receipt_long</span> Extrato de Uso
          </h2>

          {transactions.length === 0 ? (
            <div className="bg-surface-container-lowest p-lg rounded-2xl border border-outline-variant/30 text-center text-secondary shadow-sm">
              <span className="material-symbols-outlined text-4xl mb-2 opacity-30">stars</span>
              <p className="font-label-lg mb-1">Nenhuma movimentação</p>
              <p className="text-xs">Realize e conclua serviços para começar a acumular cashback na sua carteira digital.</p>
            </div>
          ) : (
            <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl overflow-hidden shadow-sm divide-y divide-outline-variant/20">
              {transactions.map(trans => {
                const isCredit = trans.type === 'credit';
                const formattedDate = new Date(trans.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
                
                return (
                  <div key={trans.id} className="p-md flex items-center justify-between gap-md hover:bg-surface-variant/10 transition-colors">
                    <div className="flex items-center gap-md min-w-0">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                        trans.is_expired
                          ? 'bg-error-container/20 text-error'
                          : isCredit 
                          ? 'bg-[#EBFDF5] text-[#059669]' 
                          : 'bg-surface-variant text-secondary'
                      }`}>
                        <span className="material-symbols-outlined text-[20px]">
                          {trans.is_expired ? 'history_toggle_off' : isCredit ? 'add_circle' : 'remove_circle'}
                        </span>
                      </div>
                      <div className="min-w-0 text-left">
                        <span className="font-label-md text-sm text-on-surface block truncate" title={trans.description}>
                          {trans.description}
                        </span>
                        <span className="text-[10px] text-secondary block">{formattedDate}</span>
                        {isCredit && !trans.is_expired && trans.expires_at && (
                          <span className="text-[9px] bg-amber-50 text-amber-700 border border-amber-200/50 px-1.5 py-0.5 rounded mt-1 inline-block">
                            Validade: {new Date(trans.expires_at).toLocaleDateString('pt-BR')}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className={`font-headline-sm font-bold text-sm ${
                        trans.is_expired
                          ? 'text-error line-through'
                          : isCredit 
                          ? 'text-[#059669]' 
                          : 'text-secondary'
                      }`}>
                        {isCredit ? '+' : ''} R$ {Math.abs(Number(trans.amount)).toFixed(2).replace('.', ',')}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* Nav Bar do Cliente */}
      <ClienteBottomNavBar activeTab="home" tenantSlug={tenant_slug} />
    </div>
  );
};

export default FidelidadeCarteira;
