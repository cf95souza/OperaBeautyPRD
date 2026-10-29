import React, { useState } from 'react';
import { X, ArrowDownRight, ArrowUpRight, DollarSign } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

export const ModalMovimentacaoCaixa = ({ isOpen, onClose, onConfirm, type, maxBleed, loading }) => {
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');

  if (!isOpen) return null;

  const isBleed = type === 'bleed';

  const handleSubmit = (e) => {
    e.preventDefault();
    const numericAmount = parseFloat(amount.replace(/\D/g, '') / 100) || 0;
    onConfirm({
      type,
      amount: numericAmount,
      reason: reason.trim()
    });
  };

  const handleAmountChange = (e) => {
    const rawValue = e.target.value.replace(/\D/g, '');
    const numericValue = rawValue ? parseFloat(rawValue) / 100 : 0;
    setAmount(
      new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(numericValue)
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
      <div className="relative w-full max-w-md bg-white rounded-3xl border border-line shadow-2xl p-6 sm:p-7 overflow-hidden">
        <button
          onClick={onClose}
          disabled={loading}
          className="absolute top-5 right-5 text-ink-soft hover:text-ink transition-colors p-1 rounded-full hover:bg-stone-100 cursor-pointer disabled:opacity-50"
          aria-label="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${
            isBleed ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'
          }`}>
            {isBleed ? <ArrowDownRight className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
          </div>
          <div>
            <h3 className="font-display font-bold text-xl text-ink">
              {isBleed ? 'Registrar Sangria' : 'Registrar Suprimento'}
            </h3>
            <p className="text-xs text-ink-soft">
              {isBleed ? 'Retirada de dinheiro da gaveta do caixa' : 'Reforço de troco ou entrada avulsa em dinheiro'}
            </p>
          </div>
        </div>

        {isBleed && maxBleed !== undefined && (
          <div className="p-3 bg-stone-50 rounded-2xl border border-line/60 mb-4 flex items-center justify-between text-xs text-ink-soft">
            <span>Disponível em dinheiro na gaveta:</span>
            <span className="font-bold text-ink">{formatCurrency(maxBleed)}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-ink-soft uppercase tracking-wider mb-1.5">
              Valor da Movimentação (R$)
            </label>
            <div className="relative">
              <DollarSign className="w-4 h-4 text-ink-soft absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="R$ 0,00"
                value={amount}
                onChange={handleAmountChange}
                required
                className="w-full pl-10 pr-4 py-3 rounded-2xl border border-line bg-surface text-base font-medium text-ink focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-soft uppercase tracking-wider mb-1.5">
              Justificativa / Motivo
            </label>
            <textarea
              rows={2}
              placeholder={isBleed ? 'Ex: Pagamento de motoboy, compra de insumo de urgência, recolhimento para cofre...' : 'Ex: Reforço de moedas para troco da recepção...'}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              className="w-full p-3 rounded-2xl border border-line bg-surface text-sm text-ink focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-3 rounded-full border border-line text-ink-soft hover:text-ink font-medium text-sm transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`flex-1 py-3 rounded-full text-white font-medium text-sm transition-all shadow-xs cursor-pointer flex items-center justify-center gap-2 ${
                isBleed ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <span>Confirmar {isBleed ? 'Sangria' : 'Suprimento'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
