import React, { useState } from 'react';
import { X, Lock, AlertTriangle, CheckCircle2, DollarSign, CreditCard, QrCode } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

export const ModalFecharCaixa = ({ isOpen, onClose, onConfirm, currentRegister, loading }) => {
  const [actualCash, setActualCash] = useState('');
  const [actualPix, setActualPix] = useState('');
  const [actualCredit, setActualCredit] = useState('');
  const [actualDebit, setActualDebit] = useState('');
  const [notes, setNotes] = useState('');

  if (!isOpen || !currentRegister) return null;

  const parseMoney = (valStr) => {
    if (!valStr) return 0;
    const clean = valStr.replace(/\D/g, '');
    return clean ? parseFloat(clean) / 100 : 0;
  };

  const formatInputMoney = (val) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(val);
  };

  const handleMoneyChange = (setter) => (e) => {
    const rawValue = e.target.value.replace(/\D/g, '');
    const numericValue = rawValue ? parseFloat(rawValue) / 100 : 0;
    setter(formatInputMoney(numericValue));
  };

  const numCash = parseMoney(actualCash);
  const numPix = parseMoney(actualPix);
  const numCredit = parseMoney(actualCredit);
  const numDebit = parseMoney(actualDebit);

  const totalReported = numCash + numPix + numCredit + numDebit;
  const expectedTotal = currentRegister.current_expected_total || 0;
  const expectedCash = currentRegister.current_cash_in_drawer || 0;
  const cashDiff = numCash - expectedCash;

  const handleSubmit = (e) => {
    e.preventDefault();
    onConfirm({
      cash_register_id: currentRegister.id,
      actual_cash: numCash,
      actual_pix: numPix,
      actual_credit: numCredit,
      actual_debit: numDebit,
      notes: notes.trim() || null
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
      <div className="relative w-full max-w-lg bg-white rounded-3xl border border-line shadow-2xl p-6 sm:p-7 overflow-hidden max-h-[92vh] overflow-y-auto">
        <button
          onClick={onClose}
          disabled={loading}
          className="absolute top-5 right-5 text-ink-soft hover:text-ink transition-colors p-1 rounded-full hover:bg-stone-100 cursor-pointer disabled:opacity-50"
          aria-label="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-xl text-ink">Fechamento de Caixa</h3>
            <p className="text-xs text-ink-soft">Conferência física e encerramento do expediente</p>
          </div>
        </div>

        {/* Resumo Esperado pelo Sistema */}
        <div className="p-4 bg-surface rounded-2xl border border-line mb-5 space-y-2">
          <span className="text-xs font-semibold text-ink-soft uppercase tracking-wider block">
            Valores Calculados pelo Sistema
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-center">
            <div className="bg-white p-2.5 rounded-xl border border-line/60">
              <span className="text-2xs text-ink-soft block">Gaveta (Dinheiro)</span>
              <span className="text-xs font-bold text-ink lining-nums">{formatCurrency(expectedCash)}</span>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-line/60">
              <span className="text-2xs text-ink-soft block">PIX</span>
              <span className="text-xs font-bold text-ink lining-nums">{formatCurrency(currentRegister.sales_by_method?.pix || 0)}</span>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-line/60">
              <span className="text-2xs text-ink-soft block">Crédito</span>
              <span className="text-xs font-bold text-ink lining-nums">{formatCurrency(currentRegister.sales_by_method?.credit || 0)}</span>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-line/60">
              <span className="text-2xs text-ink-soft block">Débito</span>
              <span className="text-xs font-bold text-ink lining-nums">{formatCurrency(currentRegister.sales_by_method?.debit || 0)}</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3">
            <span className="block text-xs font-semibold text-ink uppercase tracking-wider">
              Contagem Física Apurada (Informe os Valores)
            </span>

            {/* Dinheiro contado */}
            <div>
              <label className="block text-2xs text-ink-soft font-medium mb-1">
                Dinheiro em Espécie contado na Gaveta (R$)
              </label>
              <div className="relative">
                <DollarSign className="w-4 h-4 text-ink-soft absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="R$ 0,00"
                  value={actualCash}
                  onChange={handleMoneyChange(setActualCash)}
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-line bg-white text-sm font-semibold text-ink focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                />
              </div>
            </div>

            {/* PIX nas contas/maquininhas */}
            <div>
              <label className="block text-2xs text-ink-soft font-medium mb-1">
                PIX Conferido nos Extratos / Comprovantes (R$)
              </label>
              <div className="relative">
                <QrCode className="w-4 h-4 text-ink-soft absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="R$ 0,00"
                  value={actualPix}
                  onChange={handleMoneyChange(setActualPix)}
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-line bg-white text-sm font-semibold text-ink focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                />
              </div>
            </div>

            {/* Cartão de Crédito */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-2xs text-ink-soft font-medium mb-1">
                  Cartão de Crédito (R$)
                </label>
                <div className="relative">
                  <CreditCard className="w-4 h-4 text-ink-soft absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="R$ 0,00"
                    value={actualCredit}
                    onChange={handleMoneyChange(setActualCredit)}
                    required
                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-line bg-white text-sm font-semibold text-ink focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                  />
                </div>
              </div>

              <div>
                <label className="block text-2xs text-ink-soft font-medium mb-1">
                  Cartão de Débito (R$)
                </label>
                <div className="relative">
                  <CreditCard className="w-4 h-4 text-ink-soft absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="R$ 0,00"
                    value={actualDebit}
                    onChange={handleMoneyChange(setActualDebit)}
                    required
                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-line bg-white text-sm font-semibold text-ink focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Comparativo de Quebra / Sobra */}
          <div className={`p-3.5 rounded-2xl border flex items-center justify-between text-xs ${
            Math.abs(cashDiff) < 0.01
              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-800'
              : cashDiff > 0
              ? 'bg-blue-50/70 border-blue-200 text-blue-800'
              : 'bg-amber-50/70 border-amber-200 text-amber-800'
          }`}>
            <div className="flex items-center gap-2">
              {Math.abs(cashDiff) < 0.01 ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              )}
              <span>
                {Math.abs(cashDiff) < 0.01
                  ? 'Caixa em dinheiro bateu perfeitamente!'
                  : cashDiff > 0
                  ? 'Sobra identificada em dinheiro na gaveta:'
                  : 'Diferença / Quebra em dinheiro na gaveta:'}
              </span>
            </div>
            <span className="font-bold lining-nums text-sm">
              {cashDiff > 0 ? `+${formatCurrency(cashDiff)}` : formatCurrency(cashDiff)}
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-soft uppercase tracking-wider mb-1.5">
              Observações do Fechamento
            </label>
            <textarea
              rows={2}
              placeholder="Ex: Turno encerrado sem intercorrências..."
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
              Voltar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 rounded-full bg-amber-700 text-white hover:bg-amber-800 font-medium text-sm transition-all shadow-xs cursor-pointer flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Fechando...</span>
                </>
              ) : (
                <span>Encerrar Caixa</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
