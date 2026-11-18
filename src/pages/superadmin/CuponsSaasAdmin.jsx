import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { useNotification } from '../../context/NotificationProvider';
import { 
  Ticket, 
  Plus, 
  Trash2, 
  Power, 
  Sparkles, 
  Calendar, 
  Users, 
  Percent, 
  DollarSign, 
  CheckCircle2, 
  AlertCircle,
  Copy,
  Layers
} from 'lucide-react';
import { formatCurrency, formatDate } from '../../utils/formatters';

const CuponsSaasAdmin = () => {
  const { showSuccess, showError } = useNotification();
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    code: '',
    description: '',
    discount_type: 'percentage', // 'percentage' | 'fixed'
    discount_value: '',
    applies_to: 'first_month',   // 'first_month' | 'all_months' | 'yearly'
    plan_slug: 'all',            // 'all' | 'basico' | 'essencial' | 'premium'
    max_uses: '',
    expires_at: ''
  });

  const fetchCoupons = async () => {
    setLoading(true);
    try {
      const data = await api.saasCoupons.list();
      setCoupons(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Erro ao buscar cupons SaaS:', err);
      showError('Não foi possível carregar os cupons.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const handleOpenModal = () => {
    setForm({
      code: '',
      description: '',
      discount_type: 'percentage',
      discount_value: '',
      applies_to: 'first_month',
      plan_slug: 'all',
      max_uses: '',
      expires_at: ''
    });
    setIsModalOpen(true);
  };

  const handleCreateCoupon = async (e) => {
    e.preventDefault();
    if (!form.code.trim()) {
      showError('Informe o código do cupom.');
      return;
    }
    const val = parseFloat(form.discount_value);
    if (isNaN(val) || val <= 0) {
      showError('Valor de desconto inválido.');
      return;
    }
    if (form.discount_type === 'percentage' && val > 100) {
      showError('Desconto percentual não pode ser maior que 100%.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        code: form.code.trim().toUpperCase(),
        description: form.description.trim() || null,
        discount_type: form.discount_type,
        discount_value: val,
        applies_to: form.applies_to,
        plan_slugs: form.plan_slug === 'all' ? [] : [form.plan_slug],
        max_uses: form.max_uses ? parseInt(form.max_uses, 10) : null,
        expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null
      };

      await api.saasCoupons.create(payload);
      showSuccess(`Cupom ${payload.code} criado com sucesso!`);
      setIsModalOpen(false);
      fetchCoupons();
    } catch (err) {
      showError(err.message || 'Falha ao cadastrar cupom.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (id, currentStatus, code) => {
    try {
      await api.saasCoupons.toggleStatus(id, !currentStatus);
      showSuccess(`Cupom ${code} ${!currentStatus ? 'ativado' : 'pausado'}!`);
      fetchCoupons();
    } catch (err) {
      showError(err.message || 'Erro ao alterar status.');
    }
  };

  const handleDelete = async (id, code) => {
    if (!window.confirm(`Tem certeza que deseja excluir permanentemente o cupom ${code}?`)) return;
    try {
      await api.saasCoupons.delete(id);
      showSuccess(`Cupom ${code} excluído com sucesso!`);
      fetchCoupons();
    } catch (err) {
      showError(err.message || 'Erro ao excluir cupom.');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard?.writeText(text);
    showSuccess(`Código "${text}" copiado!`);
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in max-w-7xl mx-auto pb-12">
      
      {/* 1. CABEÇALHO */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-stone-200 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 text-[#7C3A4D] flex items-center justify-center shadow-xs">
              <Ticket className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-display font-bold text-2xl md:text-3xl text-stone-900 leading-tight">
                Cupons & Descontos SaaS
              </h1>
              <p className="text-stone-500 text-xs sm:text-sm mt-0.5">
                Crie e gerencie cupons promocionais para atrair e fechar novas assinaturas de salões.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenModal}
          className="bg-[#7C3A4D] hover:bg-[#682F40] text-white font-semibold text-xs md:text-sm px-5 py-2.5 rounded-full flex items-center gap-2 shadow-xs transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Criar Novo Cupom</span>
        </button>
      </div>

      {/* 2. CARDS RESUMO / ESTRATÉGIA COMERCIAL (PRINT 3) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Plano Básico</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">R$ 39,90/mês</span>
          </div>
          <p className="text-xs text-stone-700 leading-relaxed font-medium">
            <strong>Estratégia:</strong> "Custa menos que 1 serviço!" Ideal para profissionais autônomas e estúdios com até 2 profissionais.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Plano Essencial</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-[#7C3A4D]">Cupom Ativo: 30% OFF</span>
          </div>
          <p className="text-xs text-stone-700 leading-relaxed font-medium">
            <strong>Oferta:</strong> De R$ 59,90 por <strong>R$ 41,93</strong> no 1º mês com o cupom <span className="font-mono font-bold text-[#7C3A4D]">ESSENCIAL30</span>.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Plano Premium</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800">Cupom Ativo: 40% OFF</span>
          </div>
          <p className="text-xs text-stone-700 leading-relaxed font-medium">
            <strong>Oferta:</strong> De R$ 79,90 por <strong>R$ 47,94</strong> no 1º mês com o cupom <span className="font-mono font-bold text-amber-800">PREMIUM40</span>.
          </p>
        </div>
      </div>

      {/* 3. TABELA DE CUPONS */}
      <div className="bg-white rounded-[24px] border border-stone-200 shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-stone-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Ticket className="w-4 h-4 text-[#7C3A4D]" />
            <h2 className="font-display font-bold text-base text-stone-900">
              Catálogo de Cupons Ativos e Inativos ({coupons.length})
            </h2>
          </div>
          <span className="text-xs text-stone-400">
            Aplicáveis na regularização e assinatura de salões
          </span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-xs text-stone-400">Carregando catálogo de cupons...</div>
        ) : coupons.length === 0 ? (
          <div className="py-16 text-center text-xs text-stone-500 flex flex-col items-center justify-center gap-2">
            <AlertCircle className="w-8 h-8 text-stone-300" />
            <p>Nenhum cupom cadastrado ainda.</p>
            <button
              onClick={handleOpenModal}
              className="mt-2 text-xs font-bold text-[#7C3A4D] underline cursor-pointer"
            >
              Criar o primeiro cupom agora
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-stone-100 bg-stone-50/70 text-[11px] font-semibold text-stone-500 uppercase tracking-wider">
                  <th className="py-3.5 px-5">Código</th>
                  <th className="py-3.5 px-4">Campanha / Descrição</th>
                  <th className="py-3.5 px-4">Desconto</th>
                  <th className="py-3.5 px-4">Aplicação</th>
                  <th className="py-3.5 px-4">Planos Elegíveis</th>
                  <th className="py-3.5 px-4">Usos / Limite</th>
                  <th className="py-3.5 px-4">Validade</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {coupons.map((c) => {
                  let plansList = c.plan_slugs;
                  if (typeof plansList === 'string') {
                    try { plansList = JSON.parse(plansList); } catch { plansList = []; }
                  }
                  const plansText = !Array.isArray(plansList) || plansList.length === 0 
                    ? 'Todos os planos' 
                    : plansList.map(p => p.toUpperCase()).join(', ');

                  return (
                    <tr key={c.id} className="hover:bg-stone-50/60 transition-colors">
                      <td className="py-3.5 px-5">
                        <div className="inline-flex items-center gap-1.5 font-mono font-bold text-sm text-[#7C3A4D] bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-100">
                          <span>{c.code}</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(c.code)}
                            className="text-[#7C3A4D]/60 hover:text-[#7C3A4D] cursor-pointer"
                            title="Copiar código"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-stone-800 max-w-xs">
                        {c.description || '—'}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-stone-900 text-sm">
                          {c.discount_type === 'percentage' 
                            ? `${Number(c.discount_value)}%` 
                            : formatCurrency(c.discount_value)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-stone-600">
                        {c.applies_to === 'first_month' ? (
                          <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 font-semibold text-[10px]">
                            1º Mês
                          </span>
                        ) : c.applies_to === 'yearly' ? (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 font-semibold text-[10px]">
                            Anual
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 font-semibold text-[10px]">
                            Recorrente
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-[11px] font-semibold text-stone-700 bg-stone-100 px-2 py-0.5 rounded">
                          {plansText}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-stone-700">
                        <strong>{c.current_uses}</strong> {c.max_uses ? `/ ${c.max_uses}` : '(ilimitado)'}
                      </td>
                      <td className="py-3.5 px-4 text-stone-600">
                        {c.expires_at ? formatDate(c.expires_at) : 'Sem expiração'}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          c.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-100 text-stone-500'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${c.is_active ? 'bg-emerald-500' : 'bg-stone-400'}`} />
                          <span>{c.is_active ? 'Ativo' : 'Pausado'}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(c.id, c.is_active, c.code)}
                            className="p-1.5 rounded-lg text-stone-500 hover:text-stone-800 hover:bg-stone-100 transition-colors cursor-pointer"
                            title={c.is_active ? 'Pausar cupom' : 'Ativar cupom'}
                          >
                            <Power className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(c.id, c.code)}
                            className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Excluir cupom permanentemente"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 4. MODAL DE CADASTRO DE NOVO CUPOM */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fade-in"
          onClick={() => !saving && setIsModalOpen(false)}
        >
          <div 
            className="bg-white rounded-[26px] border border-stone-200 shadow-2xl w-full max-w-lg p-6 sm:p-7 flex flex-col gap-4 animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <Ticket className="w-5 h-5 text-[#7C3A4D]" />
                <h3 className="font-display font-bold text-lg text-stone-900">Novo Cupom SaaS</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-500 flex items-center justify-center transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCoupon} className="flex flex-col gap-3.5 text-xs">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Código do Cupom <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: ESSENCIAL30, PREMIUM40, NATAL2026"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  className="w-full font-mono uppercase bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs focus:bg-white focus:outline-none focus:border-[#7C3A4D]"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Descrição / Finalidade da Campanha</label>
                <input
                  type="text"
                  placeholder="Ex: 30% no 1º mês para novas adesões do plano Essencial"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs focus:bg-white focus:outline-none focus:border-[#7C3A4D]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Tipo de Desconto</label>
                  <select
                    value={form.discount_type}
                    onChange={(e) => setForm({ ...form, discount_type: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 text-xs focus:bg-white focus:outline-none"
                  >
                    <option value="percentage">Porcentagem (%)</option>
                    <option value="fixed">Valor Fixo em Reais (R$)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    Valor do Desconto <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder={form.discount_type === 'percentage' ? 'Ex: 30' : 'Ex: 20.00'}
                    value={form.discount_value}
                    onChange={(e) => setForm({ ...form, discount_value: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs focus:bg-white focus:outline-none focus:border-[#7C3A4D]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Plano Elegível</label>
                  <select
                    value={form.plan_slug}
                    onChange={(e) => setForm({ ...form, plan_slug: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 text-xs focus:bg-white focus:outline-none"
                  >
                    <option value="all">Todos os Planos</option>
                    <option value="basico">Apenas Plano Básico</option>
                    <option value="essencial">Apenas Plano Essencial</option>
                    <option value="premium">Apenas Plano Premium</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Aplicação</label>
                  <select
                    value={form.applies_to}
                    onChange={(e) => setForm({ ...form, applies_to: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 text-xs focus:bg-white focus:outline-none"
                  >
                    <option value="first_month">Apenas no 1º Mês</option>
                    <option value="all_months">Todas as Mensalidades</option>
                    <option value="yearly">Apenas no Plano Anual</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Limite Máximo de Usos</label>
                  <input
                    type="number"
                    placeholder="Vazio = Ilimitado"
                    value={form.max_uses}
                    onChange={(e) => setForm({ ...form, max_uses: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs focus:bg-white focus:outline-none focus:border-[#7C3A4D]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Data de Expiração</label>
                  <input
                    type="date"
                    value={form.expires_at}
                    onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs focus:bg-white focus:outline-none focus:border-[#7C3A4D]"
                  />
                </div>
              </div>

              <div className="flex justify-end items-center gap-2 pt-4 border-t border-stone-100 mt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-full text-stone-600 hover:bg-stone-100 text-xs font-medium cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-[#7C3A4D] hover:bg-[#682F40] text-white px-6 py-2.5 rounded-full text-xs font-semibold cursor-pointer disabled:opacity-50 transition-all shadow-xs"
                >
                  {saving ? 'Criando Cupom...' : 'Salvar e Publicar Cupom'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default CuponsSaasAdmin;
