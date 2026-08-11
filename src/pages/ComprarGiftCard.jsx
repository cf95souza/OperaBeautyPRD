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
  
  const [activeTab, setActiveTab] = useState('comprar'); // 'comprar' ou 'meus-vales'
  
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
  
  // States for Meus Vales
  const [myGiftCards, setMyGiftCards] = useState([]);
  const [loadingMyGifts, setLoadingMyGifts] = useState(false);

  useEffect(() => {
    if (!tenant) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const [servicesData, paymentData] = await Promise.all([
          api.services.list(tenant.id),
          api.request(`/giftcards/payment-methods?tenant_id=${tenant.id}`, { method: 'GET' })
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

  useEffect(() => {
    if (activeTab === 'meus-vales' && tenant?.id) {
      fetchMyGifts();
    }
  }, [activeTab, tenant]);

  const fetchMyGifts = async () => {
    setLoadingMyGifts(true);
    try {
      const data = await api.request('/giftcards/my-gifts');
      setMyGiftCards(data || []);
    } catch (err) {
      console.error(err);
      showError("Erro ao carregar seus vales-presente.");
    } finally {
      setLoadingMyGifts(false);
    }
  };

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

  const copyToClipboard = (text, msg = "Copiado para a área de transferência!") => {
    navigator.clipboard.writeText(text);
    showSuccess(msg);
  };

  const statusLabel = (status, paymentStatus) => {
    if (paymentStatus === 'PENDING') return 'Aguardando Pagamento';
    if (status === 'ACTIVE') return 'Disponível para Envio';
    if (status === 'PARTIALLY_REDEEMED') return 'Uso Parcial';
    if (status === 'REDEEMED') return 'Totalmente Utilizado';
    if (status === 'EXPIRED') return 'Expirado';
    if (status === 'CANCELLED') return 'Cancelado';
    return status;
  };

  const statusColor = (status, paymentStatus) => {
    if (paymentStatus === 'PENDING') return 'bg-amber-100 text-amber-800';
    if (status === 'ACTIVE') return 'bg-primary text-on-primary';
    if (status === 'PARTIALLY_REDEEMED') return 'bg-blue-100 text-blue-800';
    if (status === 'REDEEMED') return 'bg-surface-variant text-on-surface-variant';
    if (status === 'EXPIRED') return 'bg-red-100 text-red-800';
    if (status === 'CANCELLED') return 'bg-red-100 text-red-800';
    return 'bg-surface-variant text-on-surface';
  };

  if (loading || !session) return <div className="min-h-screen flex items-center justify-center font-body-md bg-background text-on-background">Carregando...</div>;

  const defaultPix = paymentMethods.length > 0 ? paymentMethods[0] : null;

  return (
    <div className="bg-background text-on-background min-h-screen font-body-md">
      <header className="w-full top-0 sticky z-40 bg-surface shadow-sm transition-all duration-300 ease-in-out pt-[calc(env(safe-area-inset-top,0px)+28px)] pb-2 md:pt-4">
        <div className="flex justify-between items-center px-gutter py-sm w-full max-w-7xl mx-auto">
          <button onClick={() => navigate(`/${tenant_slug}/perfil`)} className="w-10 h-10 flex items-center justify-center bg-surface-variant/30 text-on-surface rounded-full active:scale-95 transition-all">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="font-headline-md text-headline-md-mobile md:text-headline-md text-primary tracking-tight text-center flex-1">
            Vales-Presente
          </h1>
          <div className="w-10"></div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-container-margin py-lg animate-fade-in-up pb-32">
        
        {/* Tabs */}
        {!purchasedRequest && (
          <div className="flex gap-2 mb-8 bg-surface-variant/30 p-1.5 rounded-xl max-w-md mx-auto">
            <button 
              onClick={() => setActiveTab('comprar')}
              className={`flex-1 py-2.5 px-4 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${activeTab === 'comprar' ? 'bg-primary text-on-primary shadow-sm' : 'text-secondary hover:bg-surface-variant/50'}`}
            >
              <span className="material-symbols-outlined text-[20px]">add_shopping_cart</span>
              Comprar
            </button>
            <button 
              onClick={() => setActiveTab('meus-vales')}
              className={`flex-1 py-2.5 px-4 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${activeTab === 'meus-vales' ? 'bg-primary text-on-primary shadow-sm' : 'text-secondary hover:bg-surface-variant/50'}`}
            >
              <span className="material-symbols-outlined text-[20px]">card_giftcard</span>
              Meus Vales
            </button>
          </div>
        )}

        {/* Tab: Comprar */}
        {activeTab === 'comprar' && !purchasedRequest && (
          <div className="max-w-lg mx-auto">
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
          </div>
        )}

        {/* Tab: Sucesso após compra */}
        {purchasedRequest && (
          <div className="max-w-lg mx-auto bg-surface-container-lowest p-8 rounded-3xl shadow-2xl border border-surface-variant/50 text-center relative overflow-hidden animate-in zoom-in-95">
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
              onClick={() => {
                setPurchasedRequest(null);
                setActiveTab('meus-vales');
              }}
              className="w-full py-4 text-primary font-bold rounded-xl hover:bg-surface-variant transition-colors mt-2"
            >
              Ir para Meus Vales
            </button>
          </div>
        )}

        {/* Tab: Meus Vales */}
        {activeTab === 'meus-vales' && !purchasedRequest && (
          <div className="w-full">
            {loadingMyGifts ? (
              <div className="flex justify-center items-center py-20">
                <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
              </div>
            ) : myGiftCards.length === 0 ? (
              <div className="bg-surface-container rounded-2xl p-8 text-center border border-outline-variant/30 max-w-lg mx-auto">
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 text-primary">
                  <span className="material-symbols-outlined text-4xl">card_giftcard</span>
                </div>
                <h2 className="font-headline-sm text-on-surface mb-2">Nenhum Vale-Presente</h2>
                <p className="text-secondary font-body-md mb-6">Você ainda não comprou nenhum vale-presente.</p>
                <button 
                  onClick={() => setActiveTab('comprar')}
                  className="px-6 py-3 bg-primary text-on-primary font-bold rounded-full hover:bg-primary/90 transition-colors"
                >
                  Comprar Agora
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                {myGiftCards.map(gc => (
                  <div key={gc.id} className="bg-surface-container rounded-2xl overflow-hidden border border-outline-variant/50 flex flex-col shadow-sm">
                    <div className="p-5 flex-1 border-b border-outline-variant/30">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-primary">redeem</span>
                          <h3 className="font-headline-sm text-on-surface m-0 text-base md:text-lg">Para: {gc.recipient_name || 'Alguém especial'}</h3>
                        </div>
                        <span className={`px-2.5 py-1 text-[10px] uppercase font-bold tracking-wider rounded-full ${statusColor(gc.status, gc.payment_status)}`}>
                          {statusLabel(gc.status, gc.payment_status)}
                        </span>
                      </div>
                      
                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-secondary">Serviço:</span>
                          <span className="font-bold text-on-surface">{gc.service_name || 'Livre (Saldo)'}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-secondary">Valor Original:</span>
                          <span className="font-bold text-primary">R$ {parseFloat(gc.original_value).toFixed(2).replace('.', ',')}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-secondary">Saldo Restante:</span>
                          <span className="font-bold text-on-surface">R$ {parseFloat(gc.available_balance).toFixed(2).replace('.', ',')}</span>
                        </div>
                      </div>

                      {gc.payment_status === 'PENDING' && (
                        <div className="bg-amber-50 rounded-xl p-3 text-sm mt-4 border border-amber-200">
                          <p className="text-amber-800 font-bold mb-1">Aguardando Pagamento</p>
                          <p className="text-amber-700 mb-2">Para liberar o vale-presente, envie o comprovante do PIX para o salão informando o ID da solicitação abaixo:</p>
                          <div className="flex items-center justify-between bg-white rounded-lg p-2 border border-amber-200">
                            <span className="font-mono font-bold tracking-wider">{gc.request_id}</span>
                            <button 
                              onClick={() => copyToClipboard(gc.request_id, "ID Copiado!")}
                              className="text-amber-600 p-1 hover:bg-amber-100 rounded"
                            >
                              <span className="material-symbols-outlined text-[18px]">content_copy</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {gc.status === 'ACTIVE' && gc.redemption_code && (
                        <div className="bg-primary/5 rounded-xl p-3 text-sm mt-4 border border-primary/20">
                          <p className="text-primary font-bold mb-2">Código de Resgate Secreto</p>
                          <div className="flex items-center justify-between bg-white rounded-lg p-3 border border-primary/20">
                            <span className="font-mono font-bold text-base tracking-wider text-primary">{gc.redemption_code}</span>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="p-4 bg-surface-container-lowest">
                      {gc.status === 'ACTIVE' && gc.redemption_code ? (
                        <button 
                          onClick={() => {
                            const linkAgenda = `${window.location.origin}/${tenant_slug}/agendar`;
                            const msg = `🎁 Você ganhou um Vale-Presente!\n\nEstou te presenteando com um vale no valor de *R$ ${parseFloat(gc.original_value).toFixed(2).replace('.', ',')}*${gc.service_name ? ` para o serviço de *${gc.service_name}*` : ''}!\n\n🎟️ Seu código de resgate é: *${gc.redemption_code}*\n\nPara utilizar, acesse a nossa agenda online pelo link abaixo, escolha o seu horário e insira este código na tela final de confirmação:\n${linkAgenda}\n\nCom carinho! ❤️`;
                            const encodedMsg = encodeURIComponent(msg);
                            window.open(`https://wa.me/?text=${encodedMsg}`, '_blank');
                          }}
                          className="w-full py-3 bg-[#25D366] text-white font-bold rounded-xl hover:bg-[#20b858] transition-colors flex items-center justify-center gap-2"
                        >
                          <span className="font-bold text-lg mr-1 leading-none">W</span>
                          Enviar via WhatsApp
                        </button>
                      ) : (
                        <button 
                          disabled
                          className="w-full py-3 bg-surface-variant text-on-surface-variant font-bold rounded-xl opacity-50 cursor-not-allowed"
                        >
                          {gc.payment_status === 'PENDING' ? 'Aguardando Pagamento' : 'Utilizado'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  );
};

export default ComprarGiftCard;
