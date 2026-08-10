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
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  
  const [formData, setFormData] = useState({
    service_id: '',
    recipient_name: '',
    recipient_phone: '',
    message: ''
  });
  
  const [purchasedRequest, setPurchasedRequest] = useState(null);

  useEffect(() => {
    if (!tenant) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const [servicesData, paymentData] = await Promise.all([
          api.services.list(tenant.id),
          api.request('/giftcards/payment-methods', { method: 'GET' })
        ]);
        if (servicesData) {
          setServices(servicesData.filter(s => s.is_active));
        }
        if (paymentData) {
          setPaymentMethods(paymentData);
        }
      } catch (err) {
        console.error("Erro ao carregar dados:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [tenant]);

  useEffect(() => {
    if (!session && !loading) {
      showError("Faça login para comprar um Vale-Presente.");
      navigate(`/${tenant_slug}/login`);
    }
  }, [session, loading, navigate, tenant_slug, showError]);

  const selectedService = services.find(s => s.id === formData.service_id);

  const handlePurchase = async (e) => {
    e.preventDefault();
    if (!formData.service_id) {
      showError("Selecione um serviço para presentear.");
      return;
    }
    
    setPurchasing(true);
    try {
      const response = await api.request('/giftcards', {
        method: 'POST',
        body: JSON.stringify({
          service_id: formData.service_id,
          recipient_name: formData.recipient_name,
          recipient_phone: formData.recipient_phone,
          message: formData.message,
          original_value: parseFloat(selectedService.price)
        })
      });
      setPurchasedRequest(response);
      showSuccess("Solicitação gerada com sucesso!");
    } catch (err) {
      showError("Erro ao gerar solicitação.");
      console.error(err);
    } finally {
      setPurchasing(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    showSuccess("Copiado para a área de transferência!");
  };

  if (loading || !session) return <div className="min-h-screen flex items-center justify-center font-body-md bg-background text-on-background">Carregando...</div>;

  const defaultPix = paymentMethods.length > 0 ? paymentMethods[0] : null;

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
        {!purchasedRequest ? (
          <>
            <div className="text-center mb-xl">
              <div className="w-20 h-20 bg-primary-container text-primary rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                <span className="material-symbols-outlined text-[40px]">redeem</span>
              </div>
              <h2 className="font-headline-md text-on-surface mb-2">Presenteie quem você ama</h2>
              <p className="text-secondary text-sm">Preencha os dados abaixo. Você receberá um código de solicitação para confirmar o pagamento via Pix.</p>
            </div>

            <form onSubmit={handlePurchase} className="space-y-6 bg-surface-container-lowest p-6 rounded-2xl shadow-[0px_4px_20px_rgba(0,0,0,0.04)]">
              <div>
                <label className="block font-bold text-sm text-secondary mb-2">Serviço a presentear *</label>
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

              <div>
                <label className="block font-bold text-sm text-secondary mb-2">WhatsApp do presenteado(a) <span className="text-xs font-normal">(Opcional)</span></label>
                <input 
                  type="text"
                  placeholder="(XX) XXXXX-XXXX"
                  className="w-full p-4 border border-outline-variant rounded-xl outline-none focus:border-primary bg-transparent text-on-surface"
                  value={formData.recipient_phone}
                  onChange={e => setFormData({...formData, recipient_phone: e.target.value})}
                />
              </div>

              <div>
                <label className="block font-bold text-sm text-secondary mb-2">Mensagem para o Cartão <span className="text-xs font-normal">(Opcional)</span></label>
                <textarea 
                  placeholder="Escreva uma mensagem de carinho..."
                  className="w-full p-4 border border-outline-variant rounded-xl outline-none focus:border-primary bg-transparent text-on-surface min-h-[100px]"
                  value={formData.message}
                  onChange={e => setFormData({...formData, message: e.target.value})}
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
                    <span className="material-symbols-outlined">shopping_cart_checkout</span>
                    Gerar Solicitação
                  </>
                )}
              </button>
            </form>
          </>
        ) : (
          <div className="bg-surface-container-lowest p-8 rounded-3xl shadow-2xl border border-surface-variant/50 text-center relative overflow-hidden animate-in zoom-in-95">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary to-secondary"></div>
            
            <div className="w-16 h-16 bg-primary-container text-primary rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="material-symbols-outlined text-[32px]">info</span>
            </div>
            
            <h2 className="font-headline-md text-on-surface mb-2">Quase lá!</h2>
            <p className="text-secondary text-sm mb-6">Sua solicitação foi gerada. Para o código de resgate ser liberado, realize o pagamento via PIX para o estabelecimento.</p>

            <div className="bg-surface-variant/30 p-4 rounded-2xl mb-6 border border-surface-variant text-left">
              <p className="text-xs font-bold text-secondary uppercase tracking-wider mb-2 text-center">ID DA SOLICITAÇÃO</p>
              <p className="font-mono text-2xl font-bold text-primary tracking-widest text-center">{purchasedRequest.request_id}</p>
              <p className="text-xs text-center text-on-surface-variant mt-1">Este não é o código de resgate!</p>
            </div>

            {defaultPix && (
              <div className="bg-surface-container p-4 rounded-2xl mb-6 text-left border border-outline-variant">
                <p className="font-bold text-sm mb-2 text-on-surface">Dados para Pagamento (PIX)</p>
                <div className="flex justify-between items-center bg-background p-3 rounded-xl border border-outline-variant mb-2">
                  <span className="font-mono text-sm break-all text-on-surface">{defaultPix.pix_key}</span>
                  <button onClick={() => copyToClipboard(defaultPix.pix_key)} className="text-primary p-2 shrink-0">
                    <span className="material-symbols-outlined">content_copy</span>
                  </button>
                </div>
                <p className="text-xs text-on-surface-variant">Nome: {defaultPix.holder_name}</p>
                {defaultPix.holder_document && <p className="text-xs text-on-surface-variant">Doc: {defaultPix.holder_document}</p>}
                <p className="text-xs text-on-surface-variant mt-2 font-bold">Valor: R$ {parseFloat(purchasedRequest.original_value).toFixed(2).replace('.', ',')}</p>
              </div>
            )}

            <div className="mb-6">
              <p className="text-sm text-secondary mb-3">Após pagar, envie o comprovante e o ID da Solicitação para o WhatsApp do Salão.</p>
              <button 
                onClick={() => {
                  const msg = `Olá! Realizei o pagamento do meu Vale-Presente.\n\nID da solicitação: *${purchasedRequest.request_id}*\nValor: R$ ${parseFloat(purchasedRequest.original_value).toFixed(2).replace('.', ',')}\n\nSegue o comprovante do Pix.`;
                  copyToClipboard(msg);
                }}
                className="w-full py-3 bg-surface border border-outline text-on-surface font-bold rounded-xl active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined">content_copy</span>
                Copiar Mensagem
              </button>
            </div>

            <button 
              onClick={() => navigate(`/${tenant_slug}/home`)}
              className="w-full py-4 text-primary font-bold rounded-xl hover:bg-surface-variant transition-colors mt-2"
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
