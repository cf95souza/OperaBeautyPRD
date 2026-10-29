import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { formatCurrency } from '../../utils/formatters';
import { Sparkles, Lock, ArrowLeft, CheckCircle2, ArrowRight } from 'lucide-react';

const UpgradePlanRequired = () => {
  const navigate = useNavigate();
  const { tenant_slug } = useParams();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const data = await api.plans.list(true);
        if (Array.isArray(data)) {
          setPlans(data.filter(p => p.is_active).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)));
        }
      } catch (err) {
        console.error('Erro ao listar planos:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPlans();
  }, []);

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 max-w-4xl mx-auto w-full min-h-[75vh] animate-fade-in">
      <div className="text-center max-w-lg mx-auto mb-8">
        <div className="w-16 h-16 bg-brand-tint rounded-2xl flex items-center justify-center text-brand mx-auto mb-4 relative shadow-2xs">
          <Sparkles className="w-8 h-8" />
          <div className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-rose-600 text-white rounded-full flex items-center justify-center shadow-xs">
            <Lock className="w-3.5 h-3.5" />
          </div>
        </div>

        <h2 className="font-display font-bold text-2xl sm:text-3xl text-ink tracking-tight mb-2">
          Recurso Exclusivo do Plano
        </h2>
        
        <p className="text-sm text-ink-soft leading-relaxed">
          Esta funcionalidade não está habilitada no plano contratado do seu salão. 
          Conheça os planos oficiais do <strong>OperaBeauty</strong> e faça o upgrade para desbloquear automações e ferramentas avançadas.
        </p>
      </div>

      {/* Grid Resumido dos 4 Planos */}
      {loading ? (
        <div className="text-xs text-ink-soft py-8">Carregando planos disponíveis...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full mb-8">
          {plans.map((p) => (
            <div 
              key={p.id}
              className={`p-4 rounded-2xl border flex flex-col justify-between ${
                p.is_featured 
                  ? 'border-2 border-brand bg-stone-50/80 shadow-xs' 
                  : 'border-line bg-white'
              }`}
            >
              <div>
                {p.is_featured && (
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300 uppercase tracking-wide inline-block mb-1.5">
                    ★ {p.badge_label || 'Mais Escolhido'}
                  </span>
                )}
                <h4 className="font-display font-bold text-lg text-ink">{p.name}</h4>
                <div className="my-2">
                  <span className="font-display font-bold text-xl text-brand tabular-nums">
                    {formatCurrency(p.price)}
                  </span>
                  <span className="text-[10px] text-ink-soft font-medium">/mês</span>
                </div>
                <p className="text-[11px] text-ink-soft leading-tight mb-3">
                  {p.description}
                </p>
                <div className="space-y-1 text-[11px] text-ink-soft border-t border-line/60 pt-2 mb-3">
                  <div><strong>Equipe:</strong> {p.max_professionals === 1 ? '1 profissional' : `Até ${p.max_professionals}`}</div>
                  <div><strong>Banners:</strong> {p.max_banners}</div>
                  <div><strong>WhatsApp:</strong> {p.max_whatsapp_messages > 0 ? `${p.max_whatsapp_messages}/mês` : 'Opcional'}</div>
                </div>
              </div>

              <a
                href={`https://wa.me/5511999999999?text=Ol%C3%A1%2C%20gostaria%20de%20fazer%20upgrade%20para%20o%20plano%20${p.name}%20no%20OperaBeauty!`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2 rounded-full text-center text-xs font-bold bg-ink text-white hover:bg-ink-strong transition-all shadow-2xs block"
              >
                Contratar {p.name}
              </a>
            </div>
          ))}
        </div>
      )}

      {/* Ações de Retorno e Detalhes */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="px-5 py-2.5 rounded-full border border-line hover:bg-stone-50 text-ink-soft font-semibold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Voltar à página anterior</span>
        </button>
        <button
          onClick={() => navigate(`/${tenant_slug}/staff/admin/assinatura`)}
          className="px-6 py-2.5 rounded-full bg-brand text-white hover:bg-brand-hover font-semibold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <span>Gerenciar Minha Assinatura</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

export default UpgradePlanRequired;
