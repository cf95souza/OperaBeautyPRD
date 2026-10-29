import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { formatCurrency } from '../utils/formatters';
import { useSEO } from '../hooks/useSEO';
import { captureReferralFromUrl } from '../lib/referralTracker';
import { 
  Check, 
  X as CloseIcon, 
  Sparkles, 
  ArrowRight, 
  ShieldCheck, 
  MessageCircle, 
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Zap,
  Users,
  Image as ImageIcon,
  Send,
  Lock,
  Layers,
  HeartHandshake
} from 'lucide-react';

const PaginaPlanos = () => {
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' | 'yearly'
  const [selectedPlanModal, setSelectedPlanModal] = useState(null);
  const [openFaqIndex, setOpenFaqIndex] = useState(null);
  const [leadForm, setLeadForm] = useState({ name: '', salon_name: '', phone: '', email: '' });
  const [submittingLead, setSubmittingLead] = useState(false);
  const [leadSuccess, setLeadSuccess] = useState(false);
  const [referralInfo, setReferralInfo] = useState(null);
  const [isResellerEnabled, setIsResellerEnabled] = useState(false);

  useEffect(() => {
    api.resellers.getStatus().then(status => {
      if (status && status.enabled) {
        setIsResellerEnabled(true);
        captureReferralFromUrl().then(info => {
          if (info) setReferralInfo(info);
        });
      } else {
        setIsResellerEnabled(false);
      }
    }).catch(() => setIsResellerEnabled(false));
  }, []);

  useSEO({
    title: 'Planos e Preços | OperaBeauty — Software de Gestão para Salões',
    description: 'Escolha o plano ideal para o seu salão de beleza, barbearia ou clínica de estética. Solo, Essencial, Premium ou Signature. Teste 14 dias grátis sem cartão.',
    url: '/planos'
  });

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const data = await api.plans.list(true);
        if (Array.isArray(data)) {
          const activePlans = data
            .filter(p => p.is_active)
            .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
          setPlans(activePlans);
        }
      } catch (err) {
        console.error('Erro ao carregar planos:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPlans();
  }, []);

  const handleOpenLeadModal = (plan) => {
    setSelectedPlanModal(plan);
    setLeadSuccess(false);
  };

  const handleLeadSubmit = async (e) => {
    e.preventDefault();
    setSubmittingLead(true);
    try {
      try {
        await fetch('/api/leads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            ...leadForm, 
            plan: selectedPlanModal?.name,
            cycle: billingCycle 
          })
        });
      } catch {
        // Fallback gracioso
      }

      setLeadSuccess(true);
      setTimeout(() => {
        const planName = selectedPlanModal?.name || 'OperaBeauty';
        const cycleText = billingCycle === 'yearly' ? 'Anual (com 2 meses grátis)' : 'Mensal';
        const msg = `Olá! Me chamo ${encodeURIComponent(leadForm.name)} e gostaria de iniciar meu teste grátis de 14 dias no plano *${encodeURIComponent(planName)}* (${encodeURIComponent(cycleText)}) para o salão *${encodeURIComponent(leadForm.salon_name)}*.`;
        window.open(`https://wa.me/5511922928343?text=${msg}`, '_blank');
        setSelectedPlanModal(null);
        setSubmittingLead(false);
      }, 1200);
    } catch {
      setSubmittingLead(false);
    }
  };

  const comparisonFeatures = [
    {
      category: 'Estrutura & Limites',
      items: [
        { label: 'Profissionais Inclusos', solo: '1 profissional', essencial: 'Até 3', premium: 'Até 6', signature: 'Até 12' },
        { label: 'Profissional Adicional', solo: '—', essencial: 'R$ 15/mês', premium: 'R$ 15/mês', signature: 'R$ 15/mês' },
        { label: 'Banners no Aplicativo', solo: '1 banner', essencial: '2 banners', premium: '3 banners', signature: '5 banners' },
        { label: 'Disparos de WhatsApp/mês', solo: 'Opcional', essencial: 'Opcional', premium: '200 inclusos', signature: '500 inclusos' },
        { label: 'Mini-site Público com SEO', solo: true, essencial: true, premium: true, signature: true },
      ]
    },
    {
      category: 'Agenda & Atendimento',
      items: [
        { label: 'Agendamentos & Clientes Ilimitados', solo: true, essencial: true, premium: true, signature: true },
        { label: 'Lembretes Automáticos por Push', solo: true, essencial: true, premium: true, signature: true },
        { label: 'Vários Serviços por Visita (Carrinho)', solo: true, essencial: true, premium: true, signature: true },
        { label: 'Variações de Preço & Extras (Upsell)', solo: true, essencial: true, premium: true, signature: true },
        { label: 'Lista de Espera Inteligente', solo: false, essencial: false, premium: true, signature: true },
        { label: 'Política de Cancelamento & Faltas', solo: true, essencial: true, premium: true, signature: true },
      ]
    },
    {
      category: 'Retenção & Receita',
      items: [
        { label: 'Cupons de Desconto Promocionais', solo: true, essencial: true, premium: true, signature: true },
        { label: 'Clube de Fidelidade & Cashback', solo: false, essencial: false, premium: true, signature: true },
        { label: 'Pacotes de Sessões Pré-Pagos', solo: false, essencial: false, premium: true, signature: true },
        { label: 'Campanhas de Aniversário & Retorno', solo: false, essencial: false, premium: true, signature: true },
        { label: 'Programa Indique e Ganhe', solo: false, essencial: false, premium: true, signature: true },
        { label: 'Vales-Presente Digitais (Gift Cards)', solo: false, essencial: false, premium: false, signature: true },
      ]
    },
    {
      category: 'Operação, Caixa & Saúde',
      items: [
        { label: 'Controle de Estoque & Insumos', solo: false, essencial: true, premium: true, signature: true },
        { label: 'Controle de Caixa & Fluxo Financeiro', solo: false, essencial: true, premium: true, signature: true },
        { label: 'Comissões Automáticas da Equipe', solo: false, essencial: true, premium: true, signature: true },
        { label: 'Anamnese Dinâmica & Termos com Assinatura', solo: false, essencial: false, premium: true, signature: true },
        { label: 'Avaliações & Impulsionador Google Reviews', solo: false, essencial: false, premium: true, signature: true },
        { label: 'PDV com Conferência Cega de Caixa & Split', solo: false, essencial: false, premium: false, signature: true },
        { label: 'Relatórios Analíticos Avançados & BI', solo: false, essencial: false, premium: false, signature: true },
        { label: 'Gateway Nativo de WhatsApp Conectado', solo: false, essencial: false, premium: false, signature: true },
      ]
    },
    {
      category: 'Suporte & Implantação',
      items: [
        { label: 'Suporte por WhatsApp', solo: 'Horário comercial', essencial: 'Horário comercial', premium: 'Prioritário', signature: 'Gerente VIP' },
        { label: 'Treinamento & Importação Assistida', solo: 'Guias e vídeos', essencial: 'Planilha modelo', premium: 'Suporte dedicado', signature: 'Consultoria 1:1' },
      ]
    }
  ];

  const faqs = [
    {
      q: 'Como funciona o teste grátis de 14 dias?',
      a: 'Você cria sua conta em menos de 2 minutos sem precisar informar cartão de crédito. Durante 14 dias, você tem acesso total a todos os recursos do plano escolhido para configurar serviços, cadastrar sua equipe e receber agendamentos reais.'
    },
    {
      q: 'Posso trocar de plano ou cancelar a qualquer momento?',
      a: 'Sim! Não temos fidelidade nem multas nos planos mensais. Você pode fazer upgrade ou downgrade de plano direto no painel com recálculo automático proporcional.'
    },
    {
      q: 'Como funciona o desconto no plano Anual?',
      a: 'Ao optar pelo ciclo Anual, você ganha 2 meses grátis de assinatura (cerca de 17% de desconto). O valor pode ser quitado via PIX ou parcelado no cartão de crédito.'
    },
    {
      q: 'E se a minha equipe crescer além do limite do plano?',
      a: 'Você pode adicionar profissionais extras pagando apenas R$ 15,00 por profissional adicional ao mês, sem a necessidade de migrar de plano obrigatoriamente.'
    },
    {
      q: 'Meus clientes precisam baixar algum aplicativo pesado?',
      a: 'Não! O OperaBeauty funciona como um PWA leve no navegador do celular ou computador. Suas clientes agendam em 3 passos com a identidade visual completa do seu salão.'
    }
  ];

  return (
    <div className="min-h-screen bg-[#FBF7F5] text-[#2B2327] selection:bg-[#F6E4E4] selection:text-[#8E3B4E]">
      {/* Banner de Indicação de Parceiro (F4) */}
      {isResellerEnabled && referralInfo && (
        <aside 
          aria-label="Benefício de indicação de parceiro"
          className="bg-gradient-to-r from-[#2B1720] via-[#481E2C] to-[#2B1720] border-b border-[#8E3B4E]/40 text-white py-2.5 px-4 text-center text-xs font-medium flex items-center justify-center gap-2 relative z-50 animate-in slide-in-from-top-2 duration-300"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse flex-shrink-0" />
          <span>
            Indicação de parceiro oficial: <strong>{referralInfo.reseller_name || 'Parceiro'}</strong> (código <span className="font-mono text-amber-200 font-bold">{referralInfo.code}</span>). Você ganhou <strong>1 MÊS TOTALMENTE GRÁTIS</strong> no plano que escolher!
          </span>
        </aside>
      )}

      {/* Header Fixo */}
      <header className="sticky top-0 z-40 bg-[#FBF7F5]/90 backdrop-blur-md border-b border-[#EADFDC]/70">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <span className="font-serif text-2xl sm:text-3xl font-semibold tracking-tight text-[#2B2327] group-hover:text-[#8E3B4E] transition">
              OperaBeauty
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
            <Link to="/#recursos" className="hover:text-[#8E3B4E] transition">Recursos</Link>
            <Link to="/#como-funciona" className="hover:text-[#8E3B4E] transition">Como Funciona</Link>
            <span className="text-[#8E3B4E] font-semibold">Planos</span>
            {isResellerEnabled && (
              <Link to="/parceiros" className="hover:text-[#8E3B4E] transition flex items-center gap-1 font-semibold text-[#8E3B4E]">
                <Sparkles className="w-3.5 h-3.5" />
                Parceiros
              </Link>
            )}
            <Link to="/#perguntas" className="hover:text-[#8E3B4E] transition">Dúvidas</Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link 
              to="/demo"
              className="text-xs font-semibold px-4 py-2 rounded-full border border-[#EADFDC] bg-white hover:border-[#8E3B4E] hover:text-[#8E3B4E] transition"
            >
              Ver Demonstração
            </Link>
            <button
              onClick={() => handleOpenLeadModal(plans.find(p => p.is_featured) || plans[0])}
              className="text-xs font-bold px-5 py-2.5 rounded-full bg-[#8E3B4E] hover:bg-[#783040] text-white shadow-xs transition"
            >
              Testar 14 Dias Grátis
            </button>
          </div>
        </div>
      </header>

      {/* Hero dos Planos */}
      <section className="pt-16 pb-12 px-6 max-w-5xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#F6E4E4] text-[#8E3B4E] text-xs font-bold uppercase tracking-wider mb-4">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Investimento Transparente & Retorno Real</span>
        </div>

        <h1 className="font-serif text-3xl sm:text-5xl font-bold text-[#2B2327] tracking-tight leading-tight max-w-3xl mx-auto">
          O plano ideal para transformar a gestão do seu salão
        </h1>

        <p className="text-base sm:text-lg text-[#6F6168] mt-4 max-w-2xl mx-auto leading-relaxed">
          Sem taxas por agendamento, sem fidelidade e com 14 dias de teste grátis com suporte humanizado.
        </p>

        {/* Toggle Mensal / Anual */}
        <div className="mt-8 inline-flex items-center p-1.5 rounded-full bg-white border border-[#EADFDC] shadow-xs">
          <button
            type="button"
            onClick={() => setBillingCycle('monthly')}
            className={`px-5 py-2 rounded-full text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              billingCycle === 'monthly'
                ? 'bg-[#2B2327] text-white shadow-xs'
                : 'text-[#6F6168] hover:text-[#2B2327]'
            }`}
          >
            Faturamento Mensal
          </button>
          <button
            type="button"
            onClick={() => setBillingCycle('yearly')}
            className={`px-5 py-2 rounded-full text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
              billingCycle === 'yearly'
                ? 'bg-[#8E3B4E] text-white shadow-xs'
                : 'text-[#6F6168] hover:text-[#2B2327]'
            }`}
          >
            <span>Faturamento Anual</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide ${
              billingCycle === 'yearly' ? 'bg-white/20 text-white' : 'bg-[#F6E4E4] text-[#8E3B4E]'
            }`}>
              2 meses grátis
            </span>
          </button>
        </div>
      </section>

      {/* Grid dos 4 Cards Oficiais */}
      <section className="max-w-6xl mx-auto px-6 pb-20">
        {loading ? (
          <div className="py-16 text-center text-sm text-[#6F6168]">Carregando catálogo de planos oficiais...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
            {plans.map((plan) => {
              const isFeatured = plan.is_featured;
              const monthlyPrice = billingCycle === 'yearly' && plan.yearly_price
                ? parseFloat(plan.yearly_price) / 12
                : parseFloat(plan.price);

              const marketingList = Array.isArray(plan.marketing_features) && plan.marketing_features.length > 0
                ? plan.marketing_features
                : (Array.isArray(plan.features) ? plan.features : []);

              return (
                <div
                  key={plan.id}
                  className={`rounded-[26px] p-6 sm:p-7 flex flex-col justify-between transition-all relative ${
                    isFeatured
                      ? 'bg-white border-2 border-[#8E3B4E] shadow-xl lg:-translate-y-2'
                      : 'bg-white/80 border border-[#EADFDC] hover:border-[#8E3B4E]/40 shadow-xs'
                  }`}
                >
                  {isFeatured && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#8E3B4E] text-white text-[10px] font-extrabold uppercase tracking-wider px-3.5 py-1 rounded-full shadow-xs flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      <span>{plan.badge_label || 'Mais Escolhido'}</span>
                    </div>
                  )}

                  <div>
                    <div className="mb-4">
                      <h3 className="font-serif font-bold text-2xl text-[#2B2327]">{plan.name}</h3>
                      <p className="text-xs text-[#6F6168] mt-1.5 leading-relaxed min-h-[36px]">
                        {plan.description}
                      </p>
                    </div>

                    <div className="my-5 pt-4 border-t border-[#EADFDC]">
                      <div className="flex items-baseline gap-1">
                        <span className="font-serif font-bold text-3xl sm:text-4xl text-[#2B2327] tabular-nums">
                          {formatCurrency(monthlyPrice)}
                        </span>
                        <span className="text-xs text-[#6F6168] font-medium">/mês</span>
                      </div>
                      {billingCycle === 'yearly' && plan.yearly_price ? (
                        <p className="text-[11px] font-semibold text-[#8E3B4E] mt-1">
                          Total anual: {formatCurrency(plan.yearly_price)} (economia de R$ {(parseFloat(plan.price) * 2).toFixed(2).replace('.', ',')})
                        </p>
                      ) : (
                        <p className="text-[11px] text-[#6F6168] mt-1">Cobrança mensal flexível sem fidelidade</p>
                      )}
                    </div>

                    {/* Especificações Rápidas */}
                    <div className="space-y-2 py-3 px-3.5 rounded-xl bg-[#FBF7F5] border border-[#EADFDC]/60 text-xs text-[#6F6168] mb-5">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-[#8E3B4E]" /> Equipe:
                        </span>
                        <strong className="text-[#2B2327]">
                          {plan.max_professionals === 1 ? '1 profissional' : `Até ${plan.max_professionals}`}
                        </strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <ImageIcon className="w-3.5 h-3.5 text-[#8E3B4E]" /> Banners App:
                        </span>
                        <strong className="text-[#2B2327]">{plan.max_banners}</strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Send className="w-3.5 h-3.5 text-[#8E3B4E]" /> WhatsApp:
                        </span>
                        <strong className="text-[#2B2327]">
                          {plan.max_whatsapp_messages > 0 ? `${plan.max_whatsapp_messages}/mês` : 'Opcional'}
                        </strong>
                      </div>
                    </div>

                    {/* Lista de Recursos */}
                    <div className="space-y-2.5 mb-6">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#6F6168] block">
                        Destaques inclusos
                      </span>
                      {marketingList.map((feat, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-[#2B2327] leading-tight">
                          <Check className="w-3.5 h-3.5 text-[#8E3B4E] shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => handleOpenLeadModal(plan)}
                      className={`w-full py-3 rounded-full text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer ${
                        isFeatured
                          ? 'bg-[#8E3B4E] hover:bg-[#783040] text-white'
                          : 'bg-[#2B2327] hover:bg-black text-white'
                      }`}
                    >
                      <span>Começar 14 dias grátis</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                    <p className="text-[10px] text-center text-[#6F6168] mt-2">
                      Sem cartão de crédito • Cancele quando quiser
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Tabela Comparativa Detalhada Lado a Lado */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        <div className="text-center mb-10">
          <span className="text-xs font-bold uppercase tracking-wider text-[#8E3B4E] bg-[#F6E4E4] px-3.5 py-1 rounded-full">
            Comparativo Completo
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#2B2327] mt-3">
            Compare os recursos lado a lado
          </h2>
          <p className="text-sm text-[#6F6168] mt-2">
            Veja exatamente o que cada plano oferece para o seu salão ou clínica de estética.
          </p>
        </div>

        <div className="bg-white rounded-[26px] border border-[#EADFDC] shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#EADFDC] bg-[#FBF7F5]">
                  <th className="p-4 sm:p-5 font-serif font-bold text-sm text-[#2B2327] w-2/5">
                    Funcionalidade
                  </th>
                  <th className="p-4 sm:p-5 font-bold text-center text-[#2B2327] w-[15%]">
                    Solo
                  </th>
                  <th className="p-4 sm:p-5 font-bold text-center text-[#2B2327] w-[15%]">
                    Essencial
                  </th>
                  <th className="p-4 sm:p-5 font-bold text-center text-[#8E3B4E] bg-[#F6E4E4]/40 w-[15%]">
                    <span className="block text-[10px] uppercase font-extrabold text-[#8E3B4E]">Mais Escolhido</span>
                    Premium
                  </th>
                  <th className="p-4 sm:p-5 font-bold text-center text-[#2B2327] w-[15%]">
                    Signature
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EADFDC]/60">
                {comparisonFeatures.map((cat, catIdx) => (
                  <React.Fragment key={catIdx}>
                    <tr className="bg-stone-50/80">
                      <td colSpan={5} className="py-2.5 px-4 sm:px-5 font-bold text-[11px] text-[#6F6168] uppercase tracking-wider">
                        {cat.category}
                      </td>
                    </tr>
                    {cat.items.map((item, itemIdx) => (
                      <tr key={itemIdx} className="hover:bg-[#FBF7F5]/50 transition-colors">
                        <td className="py-3 px-4 sm:px-5 font-medium text-[#2B2327]">
                          {item.label}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {typeof item.solo === 'boolean' ? (
                            item.solo ? <Check className="w-4 h-4 text-[#8E3B4E] mx-auto" /> : <CloseIcon className="w-3.5 h-3.5 text-stone-300 mx-auto" />
                          ) : (
                            <span className="font-semibold text-[#2B2327]">{item.solo}</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {typeof item.essencial === 'boolean' ? (
                            item.essencial ? <Check className="w-4 h-4 text-[#8E3B4E] mx-auto" /> : <CloseIcon className="w-3.5 h-3.5 text-stone-300 mx-auto" />
                          ) : (
                            <span className="font-semibold text-[#2B2327]">{item.essencial}</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center bg-[#F6E4E4]/20 font-semibold">
                          {typeof item.premium === 'boolean' ? (
                            item.premium ? <Check className="w-4 h-4 text-[#8E3B4E] mx-auto" /> : <CloseIcon className="w-3.5 h-3.5 text-stone-300 mx-auto" />
                          ) : (
                            <span className="text-[#8E3B4E] font-bold">{item.premium}</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center font-semibold text-[#2B2327]">
                          {typeof item.signature === 'boolean' ? (
                            item.signature ? <Check className="w-4 h-4 text-[#8E3B4E] mx-auto" /> : <CloseIcon className="w-3.5 h-3.5 text-stone-300 mx-auto" />
                          ) : (
                            <span>{item.signature}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Seção de Dúvidas Frequentes */}
      <section className="bg-white border-t border-[#EADFDC] py-16 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <HelpCircle className="w-8 h-8 text-[#8E3B4E] mx-auto mb-2" />
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#2B2327]">
              Perguntas Frequentes sobre os Planos
            </h2>
            <p className="text-xs text-[#6F6168] mt-1">Tudo o que você precisa saber sobre valores e contratação.</p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => (
              <div 
                key={idx}
                className="rounded-2xl border border-[#EADFDC] overflow-hidden transition-all bg-[#FBF7F5]/50"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaqIndex(openFaqIndex === idx ? null : idx)}
                  className="w-full p-4 sm:p-5 flex items-center justify-between text-left font-semibold text-sm text-[#2B2327] hover:text-[#8E3B4E] transition cursor-pointer"
                >
                  <span>{faq.q}</span>
                  {openFaqIndex === idx ? <ChevronUp className="w-4 h-4 shrink-0 text-[#8E3B4E]" /> : <ChevronDown className="w-4 h-4 shrink-0 text-[#6F6168]" />}
                </button>
                {openFaqIndex === idx && (
                  <div className="px-5 pb-5 pt-1 text-xs text-[#6F6168] leading-relaxed border-t border-[#EADFDC]/40">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-12 text-center p-6 rounded-2xl bg-[#F6E4E4]/40 border border-[#8E3B4E]/20">
            <h3 className="font-serif font-bold text-lg text-[#2B2327]">Ainda ficou com alguma dúvida?</h3>
            <p className="text-xs text-[#6F6168] mt-1 mb-4">Converse diretamente com um dos nossos consultores especializados.</p>
            <a
              href="https://wa.me/5511922928343?text=Ol%C3%A1!%20Tenho%20d%C3%BAvidas%20sobre%20os%20planos%20do%20OperaBeauty."
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#8E3B4E] text-white text-xs font-bold hover:bg-[#783040] shadow-xs transition"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Chamar no WhatsApp</span>
            </a>
          </div>
        </div>
      </section>

      {/* Modal Lead para Iniciar Teste Grátis */}
      {selectedPlanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-[26px] max-w-md w-full p-6 sm:p-7 border border-[#EADFDC] shadow-2xl relative animate-scale-up">
            <button
              onClick={() => setSelectedPlanModal(null)}
              className="absolute top-5 right-5 text-[#6F6168] hover:text-[#2B2327] p-1.5 rounded-full hover:bg-stone-100 transition cursor-pointer"
            >
              <CloseIcon className="w-4 h-4" />
            </button>

            <div className="mb-5">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-[#F6E4E4] text-[#8E3B4E]">
                14 Dias Grátis · Plano {selectedPlanModal.name}
              </span>
              <h3 className="font-serif font-bold text-2xl text-[#2B2327] mt-2">
                Começar seu teste grátis
              </h3>
              <p className="text-xs text-[#6F6168] mt-1">
                Sem cartão de crédito. Leva menos de 2 minutos para configurar seu salão.
              </p>
            </div>

            {leadSuccess ? (
              <div className="py-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-[#E8F5E9] text-[#2E7D32] flex items-center justify-center mx-auto">
                  <Check className="w-6 h-6" />
                </div>
                <h4 className="font-serif font-bold text-xl text-[#2B2327]">Tudo pronto!</h4>
                <p className="text-xs text-[#6F6168]">Redirecionando para seu consultor no WhatsApp...</p>
              </div>
            ) : (
              <form onSubmit={handleLeadSubmit} className="space-y-3.5 text-xs">
                <div>
                  <label className="block font-semibold text-[#2B2327] mb-1">Seu Nome Completo *</label>
                  <input
                    type="text"
                    required
                    value={leadForm.name}
                    onChange={e => setLeadForm({ ...leadForm, name: e.target.value })}
                    placeholder="Ex: Amanda Silva"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#EADFDC] bg-[#FBF7F5] focus:outline-none focus:border-[#8E3B4E]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#2B2327] mb-1">Nome do Salão ou Estúdio *</label>
                  <input
                    type="text"
                    required
                    value={leadForm.salon_name}
                    onChange={e => setLeadForm({ ...leadForm, salon_name: e.target.value })}
                    placeholder="Ex: Studio Amanda Beauty"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#EADFDC] bg-[#FBF7F5] focus:outline-none focus:border-[#8E3B4E]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#2B2327] mb-1">WhatsApp com DDD *</label>
                  <input
                    type="tel"
                    required
                    value={leadForm.phone}
                    onChange={e => setLeadForm({ ...leadForm, phone: e.target.value })}
                    placeholder="(11) 99999-9999"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#EADFDC] bg-[#FBF7F5] focus:outline-none focus:border-[#8E3B4E]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#2B2327] mb-1">E-mail Profissional</label>
                  <input
                    type="email"
                    value={leadForm.email}
                    onChange={e => setLeadForm({ ...leadForm, email: e.target.value })}
                    placeholder="amanda@studiodatha.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#EADFDC] bg-[#FBF7F5] focus:outline-none focus:border-[#8E3B4E]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingLead}
                  className="w-full py-3 rounded-full bg-[#8E3B4E] hover:bg-[#783040] text-white font-bold text-xs shadow-xs transition mt-2 cursor-pointer disabled:opacity-50"
                >
                  {submittingLead ? 'Preparando seu salão...' : 'Liberar Meu Acesso Grátis →'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Footer Simples */}
      <footer className="border-t border-[#EADFDC] bg-[#FBF7F5] py-8 px-6 text-center text-xs text-[#6F6168]">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} OperaBeauty. Todos os direitos reservados.</p>
          <div className="flex items-center gap-6">
            <Link to="/termos" className="hover:text-[#2B2327] transition">Termos de Uso</Link>
            <Link to="/privacidade" className="hover:text-[#2B2327] transition">Privacidade</Link>
            <Link to="/dpo" className="hover:text-[#2B2327] transition font-semibold text-brand">Canal DPO</Link>
            <Link to="/superadmin/login" className="hover:text-[#2B2327] transition">Super Admin</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PaginaPlanos;
