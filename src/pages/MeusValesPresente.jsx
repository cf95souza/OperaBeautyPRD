import React, { useState, useEffect } from 'react';
import { useTenant } from '../context/TenantContext';
import { api } from '../lib/api';
import { useNotification } from '../context/NotificationProvider';
import { useNavigate } from 'react-router-dom';

const MeusValesPresente = () => {
  const { tenant } = useTenant();
  const { showSuccess, showError } = useNotification();
  const navigate = useNavigate();
  
  const [giftCards, setGiftCards] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (tenant?.id) {
      fetchData();
    }
  }, [tenant]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Usar api.request para chamar a rota
      const data = await api.request('/giftcards/my-gifts');
      setGiftCards(data || []);
    } catch (err) {
      console.error(err);
      showError("Erro ao carregar seus vales-presente.");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text, message = "Copiado!") => {
    navigator.clipboard.writeText(text);
    showSuccess(message);
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

  return (
    <div className="flex-1 w-full max-w-5xl mx-auto pb-[calc(env(safe-area-inset-bottom,0px)+100px)] animate-fade-in-up px-4 md:px-6 pt-[calc(env(safe-area-inset-top,0px)+24px)]">
      
      <div className="flex items-center gap-3 mb-8">
        <button 
          onClick={() => navigate(`/${tenant?.slug}/perfil`)}
          className="p-2 bg-surface-variant/50 hover:bg-surface-variant text-on-surface rounded-full transition-colors"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div>
          <h1 className="font-headline-md text-primary m-0">Meus Vales-Presente</h1>
          <p className="font-body-sm text-secondary">Acompanhe e envie seus presentes.</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
        </div>
      ) : giftCards.length === 0 ? (
        <div className="bg-surface-container rounded-2xl p-8 text-center border border-outline-variant/30">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 text-primary">
            <span className="material-symbols-outlined text-4xl">card_giftcard</span>
          </div>
          <h2 className="font-headline-sm text-on-surface mb-2">Nenhum Vale-Presente</h2>
          <p className="text-secondary font-body-md mb-6">Você ainda não comprou nenhum vale-presente.</p>
          <button 
            onClick={() => navigate(`/${tenant?.slug}/comprar-giftcard`)}
            className="px-6 py-3 bg-primary text-on-primary font-bold rounded-full hover:bg-primary/90 transition-colors"
          >
            Comprar Agora
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {giftCards.map(gc => (
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
                      const msg = `🎁 Você ganhou um Vale-Presente!\n\nEstou te presenteando com um vale no valor de *R$ ${parseFloat(gc.original_value).toFixed(2).replace('.', ',')}*${gc.service_name ? ` para o serviço de *${gc.service_name}*` : ''}!\n\n🎟️ Seu código de resgate é: *${gc.redemption_code}*\n\nBasta apresentar este código no ${tenant.name} na hora do pagamento.\n\nCom carinho! ❤️`;
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
  );
};

export default MeusValesPresente;
