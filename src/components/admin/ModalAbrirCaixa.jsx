import React, { useState } from 'react';
import { X, LockOpen, DollarSign, FileText } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

export const ModalAbrirCaixa = ({ isOpen, onClose, onConfirm, loading }) => {
  const [initialBalance, setInitialBalance] = useState('');
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const balance = parseFloat(initialBalance.replace(/\D/g, '') / 100) || 0;
    onConfirm({
      initial_balance: balance,
      notes: notes.trim() || null
    });
  };

  const handleBalanceChange = (e) => {
    const rawValue = e.target.value.replace(/\D/g, '');
    const numericValue = rawValue ? parseFloat(rawValue) / 100 : 0;
    setInitialBalance(
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
          <div className="w-11 h-11 rounded-2xl bg-brand-tint/70 text-brand flex items-center justify-center">
            <LockOpen className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-xl text-ink">Abertura de Caixa</h3>
            <p className="text-xs text-ink-soft">Inicie o expediente e registre o fundo de troco</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-ink-soft uppercase tracking-wider mb-1.5">
              Fundo de Troco Inicial (R$)
            </label>
            <div className="relative">
              <DollarSign className="w-4 h-4 text-ink-soft absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="R$ 0,00"
                value={initialBalance}
                onChange={handleBalanceChange}
                required
                className="w-full pl-10 pr-4 py-3 rounded-2xl border border-line bg-surface text-base font-medium text-ink focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              />
            </div>
            <p className="text-2xs text-ink-soft mt-1">
              Dinheiro físico já presente na gaveta para iniciar as operações.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-soft uppercase tracking-wider mb-1.5">
              Observações (Opcional)
            </label>
            <textarea
              rows={2}
              placeholder="Ex: Turno da manhã, notas de R$ 5 e R$ 10..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
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
              className="flex-1 py-3 rounded-full bg-brand text-white hover:opacity-95 font-medium text-sm transition-all shadow-xs cursor-pointer flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Abrindo...</span>
                </>
              ) : (
                <span>Confirmar Abertura</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
