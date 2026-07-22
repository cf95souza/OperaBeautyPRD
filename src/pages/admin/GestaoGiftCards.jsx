import React, { useState, useEffect } from 'react';
import { useTenant } from '../../context/TenantContext';
import { api } from '../../lib/api';
import { useNotification } from '../../context/NotificationProvider';

const GestaoGiftCards = () => {
  const { tenant } = useTenant();
  const { showSuccess, showError, confirm } = useNotification();
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
      const data = await api.request('/giftcards/admin');
      setGiftCards(data || []);
    } catch (err) {
      console.error(err);
      showError("Erro ao carregar gift cards.");
    } finally {
      setLoading(false);
    }
  };

  const handleRedeem = async (code) => {
    if (await confirm(`Confirmar o resgate do Vale-Presente ${code}? Isso não pode ser desfeito.`)) {
      try {
        await api.request(`/giftcards/redeem/${code}`, { method: 'POST' });
        showSuccess("Gift Card resgatado com sucesso!");
        fetchData();
      } catch (err) {
        showError(err.message || "Erro ao resgatar.");
      }
    }
  };

  if (loading) return <div className="p-xl flex justify-center">Carregando...</div>;

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto pb-xl animate-fade-in-up">
      <div className="mb-xl">
        <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-primary mb-sm flex items-center gap-2">
          <span className="material-symbols-outlined text-4xl">card_giftcard</span> Vales-Presente
        </h1>
        <p className="font-body-md text-body-md text-secondary">
          Acompanhe os vales-presente emitidos pelo salão. Quando a pessoa presenteada chegar para o atendimento, você pode resgatar o código aqui.
        </p>
      </div>

      <div className="bg-surface-container-lowest rounded-xl shadow-[0px_4px_20px_rgba(0,0,0,0.04)] overflow-hidden">
        {giftCards.length === 0 ? (
          <div className="p-xl text-center">
            <span className="material-symbols-outlined text-6xl text-surface-variant mb-4">redeem</span>
            <h3 className="font-headline-md text-on-surface mb-2">Nenhum Vale-Presente</h3>
            <p className="text-secondary">Seus clientes ainda não presentearam ninguém com os serviços do salão.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-surface-variant bg-surface-variant/30 text-secondary">
                  <th className="p-4 font-semibold text-sm">Código</th>
                  <th className="p-4 font-semibold text-sm">Serviço</th>
                  <th className="p-4 font-semibold text-sm">Comprador</th>
                  <th className="p-4 font-semibold text-sm">Presenteado(a)</th>
                  <th className="p-4 font-semibold text-sm">Status</th>
                  <th className="p-4 font-semibold text-sm text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {giftCards.map((gc) => (
                  <tr key={gc.id} className="border-b border-surface-variant/50 hover:bg-surface-variant/10 transition-colors">
                    <td className="p-4">
                      <span className="font-mono bg-surface-variant text-on-surface-variant px-2 py-1 rounded text-xs font-bold tracking-wider">
                        {gc.code}
                      </span>
                    </td>
                    <td className="p-4 text-on-surface font-semibold">{gc.service_name || 'Serviço Removido'}</td>
                    <td className="p-4 text-secondary">{gc.purchaser_name || 'Desconhecido'}</td>
                    <td className="p-4 text-secondary">{gc.recipient_name || '-'}</td>
                    <td className="p-4">
                      {gc.status === 'active' && <span className="bg-primary-container text-on-primary-container px-3 py-1 rounded-full text-xs font-bold">Ativo</span>}
                      {gc.status === 'redeemed' && <span className="bg-success/20 text-success px-3 py-1 rounded-full text-xs font-bold">Resgatado</span>}
                      {gc.status === 'expired' && <span className="bg-error/20 text-error px-3 py-1 rounded-full text-xs font-bold">Expirado</span>}
                    </td>
                    <td className="p-4 text-right">
                      {gc.status === 'active' && (
                        <button 
                          onClick={() => handleRedeem(gc.code)}
                          className="bg-primary text-on-primary px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors"
                        >
                          Resgatar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default GestaoGiftCards;
