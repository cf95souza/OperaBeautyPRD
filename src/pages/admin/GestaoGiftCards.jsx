import React, { useState, useEffect } from 'react';
import { useTenant } from '../../context/TenantContext';
import { api } from '../../lib/api';
import { useNotification } from '../../context/NotificationProvider';

const GestaoGiftCards = () => {
  const { tenant } = useTenant();
  const { showSuccess, showError, confirm } = useNotification();
  
  const [activeTab, setActiveTab] = useState('pagamentos'); // 'pagamentos', 'resgate', 'lista'
  
  const [giftCards, setGiftCards] = useState([]);
  const [loading, setLoading] = useState(false);

  // Pagamentos state
  const [requestIdInput, setRequestIdInput] = useState('');
  const [requestDetails, setRequestDetails] = useState(null);
  
  // Resgate state
  const [redemptionCodeInput, setRedemptionCodeInput] = useState('');
  const [redemptionDetails, setRedemptionDetails] = useState(null);
  const [redeemAmount, setRedeemAmount] = useState('');

  useEffect(() => {
    if (tenant?.id && activeTab === 'lista') {
      fetchData();
    }
  }, [tenant, activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await api.request('/giftcards/admin');
      setGiftCards(data || []);
    } catch (err) {
      console.error(err);
      showError("Erro ao carregar gift cards.");
    } finally {
      setLoading(false);
    }
  };

  // ----- PAGAMENTOS -----
  const handleConsultRequest = async (e) => {
    e.preventDefault();
    if (!requestIdInput) return;
    setLoading(true);
    setRequestDetails(null);
    try {
      const data = await api.request(`/giftcards/admin/request/${requestIdInput}`);
      setRequestDetails(data);
    } catch (err) {
      showError(err.message || "Solicitação não encontrada.");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmPayment = async () => {
    if (await confirm(`Confirmar o recebimento de R$ ${parseFloat(requestDetails.original_value).toFixed(2)} para a solicitação ${requestDetails.request_id}?`)) {
      setLoading(true);
      try {
        const response = await api.request(`/giftcards/admin/confirm-payment/${requestDetails.request_id}`, { method: 'POST' });
        showSuccess(response.message);
        // Atualiza a view com o código gerado
        setRequestDetails({
          ...requestDetails,
          payment_status: 'CONFIRMED',
          status: 'ACTIVE',
          redemption_code: response.gift_card.redemption_code
        });
      } catch (err) {
        showError(err.message || "Erro ao confirmar pagamento.");
      } finally {
        setLoading(false);
      }
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    showSuccess("Copiado!");
  };

  // ----- RESGATE -----
  const handleConsultCode = async (e) => {
    e.preventDefault();
    if (!redemptionCodeInput) return;
    setLoading(true);
    setRedemptionDetails(null);
    try {
      const data = await api.request(`/giftcards/validate/${redemptionCodeInput}`);
      setRedemptionDetails(data);
      setRedeemAmount(data.available_balance); // Default to total balance
    } catch (err) {
      showError(err.message || "Código inválido.");
    } finally {
      setLoading(false);
    }
  };

  const handleRedeem = async (e) => {
    e.preventDefault();
    const amount = parseFloat(redeemAmount);
    if (isNaN(amount) || amount <= 0) {
      showError("Informe um valor válido para o resgate.");
      return;
    }

    if (amount > parseFloat(redemptionDetails.available_balance)) {
      showError("Valor excede o saldo disponível.");
      return;
    }

    if (await confirm(`Confirmar resgate de R$ ${amount.toFixed(2)} deste Vale-Presente?`)) {
      setLoading(true);
      try {
        const response = await api.request(`/giftcards/redeem/${redemptionDetails.redemption_code}`, { 
          method: 'POST',
          body: JSON.stringify({ amount })
        });
        showSuccess(response.message);
        setRedemptionDetails(null);
        setRedemptionCodeInput('');
      } catch (err) {
        showError(err.message || "Erro ao resgatar.");
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto pb-xl animate-fade-in-up">
      <div className="mb-xl">
        <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-primary mb-sm flex items-center gap-2">
          <span className="material-symbols-outlined text-4xl">card_giftcard</span> Vales-Presente
        </h1>
        <p className="font-body-md text-body-md text-secondary">
          Gerencie pagamentos e resgates de vales-presente.
        </p>
      </div>

      <div className="flex gap-2 mb-8 bg-surface-variant/30 p-2 rounded-xl overflow-x-auto">
        <button 
          onClick={() => setActiveTab('pagamentos')}
          className={`flex-1 py-3 px-6 rounded-lg font-bold text-sm transition-all whitespace-nowrap ${activeTab === 'pagamentos' ? 'bg-primary text-on-primary shadow-sm' : 'text-secondary hover:bg-surface-variant/50'}`}
        >
          Validar Pagamento
        </button>
        <button 
          onClick={() => setActiveTab('resgate')}
          className={`flex-1 py-3 px-6 rounded-lg font-bold text-sm transition-all whitespace-nowrap ${activeTab === 'resgate' ? 'bg-primary text-on-primary shadow-sm' : 'text-secondary hover:bg-surface-variant/50'}`}
        >
          Validar Código (Resgate)
        </button>
        <button 
          onClick={() => setActiveTab('lista')}
          className={`flex-1 py-3 px-6 rounded-lg font-bold text-sm transition-all whitespace-nowrap ${activeTab === 'lista' ? 'bg-primary text-on-primary shadow-sm' : 'text-secondary hover:bg-surface-variant/50'}`}
        >
          Todos os Vales
        </button>
      </div>

      <div className="bg-surface-container-lowest rounded-2xl shadow-[0px_4px_20px_rgba(0,0,0,0.04)] overflow-hidden">
        
        {/* TABA: PAGAMENTOS */}
        {activeTab === 'pagamentos' && (
          <div className="p-xl max-w-2xl mx-auto">
            <h2 className="font-headline-sm text-primary mb-6">Confirmar Pagamento PIX</h2>
            <form onSubmit={handleConsultRequest} className="flex gap-4 mb-8">
              <input 
                type="text" 
                placeholder="ID da Solicitação (Ex: VP-XXXX)" 
                className="flex-1 p-4 border border-outline-variant rounded-xl outline-none focus:border-primary uppercase font-mono"
                value={requestIdInput}
                onChange={e => setRequestIdInput(e.target.value)}
                required
              />
              <button type="submit" disabled={loading} className="px-6 py-4 bg-primary text-on-primary font-bold rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50">
                Consultar
              </button>
            </form>

            {requestDetails && (
              <div className="bg-surface-container p-6 rounded-2xl border border-outline-variant animate-in fade-in">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <p className="text-xs font-bold text-secondary uppercase tracking-wider mb-1">ID da Solicitação</p>
                    <p className="font-mono text-xl font-bold text-on-surface">{requestDetails.request_id}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-secondary uppercase tracking-wider mb-1">Valor</p>
                    <p className="text-xl font-bold text-primary">R$ {parseFloat(requestDetails.original_value).toFixed(2).replace('.', ',')}</p>
                  </div>
                </div>

                <div className="space-y-4 mb-8">
                  <div className="flex justify-between border-b border-outline-variant pb-2">
                    <span className="text-secondary">Comprador</span>
                    <span className="font-bold">{requestDetails.purchaser_name || 'Desconhecido'}</span>
                  </div>
                  <div className="flex justify-between border-b border-outline-variant pb-2">
                    <span className="text-secondary">Presenteado</span>
                    <span className="font-bold">{requestDetails.recipient_name || '-'}</span>
                  </div>
                  <div className="flex justify-between border-b border-outline-variant pb-2">
                    <span className="text-secondary">WhatsApp</span>
                    <span className="font-bold">{requestDetails.recipient_phone || '-'}</span>
                  </div>
                  <div className="flex justify-between border-b border-outline-variant pb-2">
                    <span className="text-secondary">Status de Pagamento</span>
                    <span className={`font-bold ${requestDetails.payment_status === 'CONFIRMED' ? 'text-success' : 'text-error'}`}>
                      {requestDetails.payment_status === 'CONFIRMED' ? 'CONFIRMADO' : 'PENDENTE'}
                    </span>
                  </div>
                </div>

                {requestDetails.payment_status === 'PENDING' && (
                  <div className="space-y-4">
                    <div className="bg-error/10 p-4 rounded-xl text-error text-sm font-bold flex items-center gap-2">
                      <span className="material-symbols-outlined">warning</span>
                      Confirme somente após verificar o recebimento do PIX na conta do salão.
                    </div>
                    <button 
                      onClick={handleConfirmPayment}
                      disabled={loading}
                      className="w-full py-4 bg-success text-white font-bold rounded-xl hover:bg-success/90 transition-colors disabled:opacity-50"
                    >
                      Confirmar Pagamento
                    </button>
                  </div>
                )}

                {requestDetails.payment_status === 'CONFIRMED' && requestDetails.redemption_code && (
                  <div className="bg-success/10 p-6 rounded-xl border border-success/20 text-center animate-in zoom-in-95">
                    <p className="text-success font-bold mb-4">Pagamento Confirmado! Código gerado:</p>
                    <div className="bg-white p-4 rounded-lg border border-outline-variant mb-4 flex justify-between items-center">
                      <span className="font-mono text-2xl font-bold text-on-surface">{requestDetails.redemption_code}</span>
                      <button onClick={() => copyToClipboard(requestDetails.redemption_code)} className="text-primary p-2">
                        <span className="material-symbols-outlined">content_copy</span>
                      </button>
                    </div>
                    
                    <a 
                      href={`https://wa.me/${requestDetails.recipient_phone ? requestDetails.recipient_phone.replace(/\D/g, '') : ''}?text=🎁 Você recebeu um Vale-Presente!%0A%0AO estabelecimento ${tenant.name} preparou um presente para você.%0A%0A💰 Valor: R$ ${parseFloat(requestDetails.original_value).toFixed(2).replace('.', ',')}%0A🎟️ Código de resgate: *${requestDetails.redemption_code}*%0A%0AApresente este código no estabelecimento para utilizar seu vale!`}
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="w-full py-4 bg-[#25D366] text-white font-bold rounded-xl hover:bg-[#20bd5a] transition-colors flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined">share</span>
                      Enviar ao Presenteado
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TABA: RESGATE */}
        {activeTab === 'resgate' && (
          <div className="p-xl max-w-2xl mx-auto">
            <h2 className="font-headline-sm text-primary mb-6">Validar Código e Resgatar</h2>
            <form onSubmit={handleConsultCode} className="flex gap-4 mb-8">
              <input 
                type="text" 
                placeholder="Código (Ex: VG-XXXX-XXXX-XXXX)" 
                className="flex-1 p-4 border border-outline-variant rounded-xl outline-none focus:border-primary uppercase font-mono"
                value={redemptionCodeInput}
                onChange={e => setRedemptionCodeInput(e.target.value)}
                required
              />
              <button type="submit" disabled={loading} className="px-6 py-4 bg-primary text-on-primary font-bold rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50">
                Validar
              </button>
            </form>

            {redemptionDetails && (
              <div className="bg-surface-container p-6 rounded-2xl border border-outline-variant animate-in fade-in">
                <div className="flex justify-between items-center mb-6 border-b border-outline-variant pb-4">
                  <div className="flex items-center gap-3 text-success">
                    <span className="material-symbols-outlined text-3xl">check_circle</span>
                    <h3 className="font-headline-sm">Código Válido</h3>
                  </div>
                  <span className="bg-success/20 text-success px-3 py-1 rounded-full text-xs font-bold uppercase">
                    {redemptionDetails.status}
                  </span>
                </div>

                <div className="space-y-4 mb-8">
                  <div className="flex justify-between border-b border-outline-variant pb-2">
                    <span className="text-secondary">Presenteado</span>
                    <span className="font-bold">{redemptionDetails.recipient_name || '-'}</span>
                  </div>
                  <div className="flex justify-between border-b border-outline-variant pb-2">
                    <span className="text-secondary">Serviço Referência</span>
                    <span className="font-bold">{redemptionDetails.service_name || '-'}</span>
                  </div>
                  <div className="flex justify-between border-b border-outline-variant pb-2">
                    <span className="text-secondary">Valor Original</span>
                    <span className="font-bold text-on-surface">R$ {parseFloat(redemptionDetails.original_value).toFixed(2).replace('.', ',')}</span>
                  </div>
                  <div className="flex justify-between border-b border-outline-variant pb-2 bg-primary/5 p-2 rounded">
                    <span className="text-primary font-bold">Saldo Disponível</span>
                    <span className="font-bold text-primary text-lg">R$ {parseFloat(redemptionDetails.available_balance).toFixed(2).replace('.', ',')}</span>
                  </div>
                </div>

                <form onSubmit={handleRedeem} className="space-y-4">
                  <div>
                    <label className="block font-bold text-sm text-secondary mb-2">Valor a resgatar (R$)</label>
                    <input 
                      type="number"
                      step="0.01"
                      max={redemptionDetails.available_balance}
                      className="w-full p-4 border border-outline-variant rounded-xl outline-none focus:border-primary text-xl font-bold text-primary"
                      value={redeemAmount}
                      onChange={e => setRedeemAmount(e.target.value)}
                      required
                    />
                  </div>
                  
                  <button 
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 bg-primary text-on-primary font-bold rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined">shopping_bag</span>
                    Confirmar Resgate
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        {/* TABA: LISTA */}
        {activeTab === 'lista' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-surface-variant bg-surface-variant/30 text-secondary">
                  <th className="p-4 font-semibold text-sm">ID Solicit.</th>
                  <th className="p-4 font-semibold text-sm">Código VG</th>
                  <th className="p-4 font-semibold text-sm">Presenteado(a)</th>
                  <th className="p-4 font-semibold text-sm">Valor</th>
                  <th className="p-4 font-semibold text-sm">Saldo</th>
                  <th className="p-4 font-semibold text-sm">Status Pagto</th>
                  <th className="p-4 font-semibold text-sm">Status Vale</th>
                </tr>
              </thead>
              <tbody>
                {giftCards.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="p-8 text-center text-secondary">Nenhum vale-presente encontrado.</td>
                  </tr>
                ) : (
                  giftCards.map((gc) => (
                    <tr key={gc.id} className="border-b border-surface-variant/50 hover:bg-surface-variant/10 transition-colors">
                      <td className="p-4">
                        <span className="font-mono bg-surface-variant text-on-surface-variant px-2 py-1 rounded text-xs font-bold tracking-wider">
                          {gc.request_id}
                        </span>
                      </td>
                      <td className="p-4">
                        {gc.redemption_code ? (
                          <span className="font-mono bg-primary/10 text-primary px-2 py-1 rounded text-xs font-bold tracking-wider">
                            {gc.redemption_code}
                          </span>
                        ) : (
                          <span className="text-secondary text-xs italic">Aguardando PIX</span>
                        )}
                      </td>
                      <td className="p-4 text-secondary">{gc.recipient_name || '-'}</td>
                      <td className="p-4 text-on-surface font-semibold">R$ {parseFloat(gc.original_value).toFixed(2).replace('.', ',')}</td>
                      <td className="p-4 text-on-surface font-semibold">R$ {parseFloat(gc.available_balance).toFixed(2).replace('.', ',')}</td>
                      <td className="p-4">
                        {gc.payment_status === 'CONFIRMED' ? (
                          <span className="bg-success/20 text-success px-3 py-1 rounded-full text-xs font-bold">Pago</span>
                        ) : (
                          <span className="bg-error/10 text-error px-3 py-1 rounded-full text-xs font-bold">Pendente</span>
                        )}
                      </td>
                      <td className="p-4">
                        <span className="bg-surface-variant text-on-surface px-3 py-1 rounded-full text-xs font-bold uppercase">{gc.status.replace('_', ' ')}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default GestaoGiftCards;

