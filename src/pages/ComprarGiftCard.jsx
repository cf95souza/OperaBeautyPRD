import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTenant } from '../context/TenantContext';
import { api } from '../lib/api';
import { useNotification } from '../context/NotificationProvider';

const ComprarGiftCard = () => {
  const { tenant_slug } = useParams();
  const navigate = useNavigate();
  const { tenant, session } = useTenant();
  const { showSuccess, showError } = useNotification();
  
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  
  const [formData, setFormData] = useState({
    service_id: '',
    recipient_name: ''
  });
  
  const [purchasedCard, setPurchasedCard] = useState(null);

  useEffect(() => {
    if (!tenant) return;
    const fetchServices = async () => {
      setLoading(true);
      try {
        const data = await api.services.list(tenant.id);
        if (data) {
          setServices(data.filter(s => s.is_active));
        }
      } catch (err) {
        console.error("Erro ao carregar serviços:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchServices();
  }, [tenant]);

  // Redireciona se não estiver logado
  useEffect(() => {
    if (!session && !loading) {
      showError("Faça login para comprar um Vale-Presente.");
      navigate(`/${tenant_slug}/login`);
    }
  }, [session, loading, navigate, tenant_slug, showError]);

  const handlePurchase = async (e) => {
    e.preventDefault();
    if (!formData.service_id) {
      showError("Selecione um serviço para presentear.");
      return;
    }
    
    setPurchasing(true);
    try {
      // Simulação de fluxo de pagamento: O serviço de gift card cria direto.
      const response = await api.request('/giftcards', {
        method: 'POST',
        body: JSON.stringify({
          service_id: formData.service_id,
          recipient_name: formData.recipient_name
        })
      });
      setPurchasedCard(response);
      showSuccess("Vale-Presente gerado com sucesso!");
    } catch (err) {
      showError("Erro ao gerar Vale-Presente.");
      console.error(err);
    } finally {
      setPurchasing(false);
    }
  };

  const selectedService = services.find(s => s.id === formData.service_id);

  if (loading || !session) return <div className="min-h-screen flex items-center justify-center font-body-md bg-background text-on-background">Carregando...</div>;

  return (
    <div className="bg-background text-on-background min-h-screen font-body-md">
      <header className="w-full top-0 sticky z-40 bg-surface shadow-sm transition-all duration-300 ease-in-out pt-[calc(env(safe-area-inset-top,0px)+28px)] pb-2 md:pt-4">
        <div className="flex justify-between items-center px-gutter py-sm w-full max-w-7xl mx-auto">
          <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center bg-surface-variant/30 text-on-surface rounded-full active:scale-95 transition-all">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="font-headline-md text-headline-md-mobile md:text-headline-md text-primary tracking-tight text-center flex-1">
            Vales-Presente
          </h1>
          <div className="w-10"></div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-container-margin py-lg animate-fade-in-up">
        {!purchasedCard ? (
          <>
            <div className="text-center mb-xl">
              <div className="w-20 h-20 bg-primary-container text-primary rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                <span className="material-symbols-outlined text-[40px]">redeem</span>
              </div>
              <h2 className="font-headline-md text-on-surface mb-2">Presenteie quem você ama</h2>
              <p className="text-secondary text-sm">Escolha um serviço do salão e gere um Vale-Presente exclusivo para enviar por WhatsApp.</p>
            </div>

            <form onSubmit={handlePurchase} className="space-y-6 bg-surface-container-lowest p-6 rounded-2xl shadow-[0px_4px_20px_rgba(0,0,0,0.04)]">
              <div>
                <label className="block font-bold text-sm text-secondary mb-2">Serviço a presentear</label>
                <select 
                  className="w-full p-4 border border-outline-variant rounded-xl outline-none focus:border-primary bg-transparent text-on-surface"
                  value={formData.service_id}
                  onChange={e => setFormData({...formData, service_id: e.target.value})}
                  required
                >
                  <option value="">Selecione um serviço...</option>
                  {services.map(s => (
                    <option key={s.id} value={s.id}>{s.name} - R$ {parseFloat(s.price).toFixed(2).replace('.', ',')}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-sm text-secondary mb-2">Nome do presenteado(a) <span className="text-xs font-normal">(Opcional)</span></label>
                <input 
                  type="text"
                  placeholder="Ex: Maria Silva"
                  className="w-full p-4 border border-outline-variant rounded-xl outline-none focus:border-primary bg-transparent text-on-surface"
                  value={formData.recipient_name}
                  onChange={e => setFormData({...formData, recipient_name: e.target.value})}
                />
              </div>

              {selectedService && (
                <div className="bg-primary/5 p-4 rounded-xl border border-primary/20">
                  <p className="text-sm text-secondary text-center">Valor do presente</p>
                  <p className="text-2xl font-bold text-primary text-center">R$ {parseFloat(selectedService.price).toFixed(2).replace('.', ',')}</p>
                </div>
              )}

              <button 
                type="submit"
                disabled={purchasing}
                className="w-full py-4 bg-primary text-on-primary font-bold rounded-xl shadow-lg active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {purchasing ? (
                  <span className="material-symbols-outlined animate-spin">progress_activity</span>
                ) : (
                  <>
                    <span className="material-symbols-outlined">payments</span>
                    Comprar e Gerar Código
                  </>
                )}
              </button>
            </form>
          </>
        ) : (
          <div className="bg-surface-container-lowest p-8 rounded-3xl shadow-2xl border border-surface-variant/50 text-center relative overflow-hidden animate-in zoom-in-95">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary to-secondary"></div>
            
            <div className="w-16 h-16 bg-success/20 text-success rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="material-symbols-outlined text-[32px]">check_circle</span>
            </div>
            
            <h2 className="font-headline-md text-on-surface mb-2">Prontinho!</h2>
            <p className="text-secondary text-sm mb-8">O Vale-Presente foi gerado e está pronto para ser enviado.</p>

            <div className="bg-surface-variant/30 p-6 rounded-2xl mb-8 border border-surface-variant">
              <p className="text-xs font-bold text-secondary uppercase tracking-wider mb-2">Código do Presente</p>
              <p className="font-mono text-3xl font-bold text-primary tracking-widest">{purchasedCard.code}</p>
            </div>

            <a 
              href={`https://wa.me/?text=Olá! Comprei um Vale-Presente no salão ${tenant.name} para você!%0A%0A🎁 *Serviço:* ${selectedService?.name || ''}%0A🔑 *Código:* ${purchasedCard.code}%0A%0AApresente este código na recepção para resgatar o seu presente!`}
              target="_blank" 
              rel="noopener noreferrer"
              className="w-full py-4 bg-[#25D366] text-white font-bold rounded-xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 mb-4 hover:bg-[#20bd5a]"
            >
              <span className="material-symbols-outlined">share</span>
              Enviar por WhatsApp
            </a>

            <button 
              onClick={() => navigate(`/${tenant_slug}/home`)}
              className="w-full py-4 text-primary font-bold rounded-xl hover:bg-surface-variant transition-colors"
            >
              Voltar para Início
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default ComprarGiftCard;
