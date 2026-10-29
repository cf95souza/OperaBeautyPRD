import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, DollarSign, Gift, ArrowUpRight, Copy, Check, 
  Share2, ShieldCheck, TrendingUp, Sparkles, AlertCircle, 
  HelpCircle, ChevronRight, LogOut, Wallet, Award, CheckCircle2
} from 'lucide-react';
import useSEO from '../hooks/useSEO';

export default function PainelRevendedor() {
  useSEO({
    title: 'Programa de Parceiros & Revenda | OperaBeauty',
    description: 'Indique salões e ganhe 20% de comissão recorrente todo mês sobre as assinaturas ativas. 1 mês grátis para você e para o salão indicado.',
    canonical: 'https://operabeauty.com.br/parceiros'
  });

  // Estado de autenticação do parceiro
  const [partnerId, setPartnerId] = useState(() => localStorage.getItem('operabeauty_partner_id') || '');
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // 'login' ou 'register'
  const [copied, setCopied] = useState(false);
  const [isProgramEnabled, setIsProgramEnabled] = useState(false);

  useEffect(() => {
    fetch('/api/resellers/status')
      .then(res => res.json())
      .then(data => {
        setIsProgramEnabled(Boolean(data?.enabled));
      })
      .catch(() => setIsProgramEnabled(false));
  }, []);

  // Formulário de Login
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginError, setLoginError] = useState('');

  // Formulário de Cadastro
  const [regForm, setRegForm] = useState({
    name: '',
    email: '',
    phone: '',
    referral_code: '',
    pix_key_type: 'cpf',
    pix_key: ''
  });
  const [regError, setRegError] = useState('');
  const [regSuccess, setRegSuccess] = useState(false);

  // Modal de Saque
  const [payoutModalOpen, setPayoutModalOpen] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [payoutFeedback, setPayoutFeedback] = useState(null);

  // Buscar dados do dashboard se logado
  useEffect(() => {
    if (!partnerId) return;

    async function loadDashboard() {
      setLoading(true);
      try {
        const res = await fetch(`/api/resellers/dashboard/${partnerId}`);
        if (!res.ok) {
          if (res.status === 404) {
            handleLogout();
          }
          return;
        }
        const data = await res.json();
        setDashboardData(data);
      } catch (err) {
        console.error('Erro ao carregar dashboard de parceiro:', err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, [partnerId]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    if (!loginIdentifier.trim()) {
      setLoginError('Informe seu e-mail ou código de parceiro.');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/resellers/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: loginIdentifier.trim() })
      });
      const data = await res.json();

      if (!res.ok) {
        setLoginError(data.error || 'Parceiro não encontrado.');
        return;
      }

      localStorage.setItem('operabeauty_partner_id', data.reseller.id);
      setPartnerId(data.reseller.id);
      setDashboardData(data);
    } catch (err) {
      setLoginError('Erro de conexão ao acessar o painel.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setRegError('');
    if (!regForm.name || !regForm.email || !regForm.phone) {
      setRegError('Preencha nome, e-mail e telefone para continuar.');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/resellers/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(regForm)
      });
      const data = await res.json();

      if (!res.ok) {
        setRegError(data.error || 'Erro ao realizar cadastro.');
        return;
      }

      setRegSuccess(true);
      localStorage.setItem('operabeauty_partner_id', data.reseller.id);
      setPartnerId(data.reseller.id);
      setDashboardData({
        reseller: data.reseller,
        referralLink: data.referralLink,
        kpis: { totalReferrals: 0, activeSalons: 0, monthlyRecurringEst: 0, availableBalance: 0, paidBalance: 0, totalEarned: 0 },
        referrals: [],
        commissions: [],
        payouts: []
      });
    } catch (err) {
      setRegError('Erro de conexão ao cadastrar parceiro.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('operabeauty_partner_id');
    setPartnerId('');
    setDashboardData(null);
  };

  const copyLink = () => {
    if (!dashboardData?.referralLink) return;
    navigator.clipboard.writeText(dashboardData.referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const shareWhatsApp = () => {
    if (!dashboardData?.referralLink) return;
    const code = dashboardData.reseller.referral_code;
    const msg = encodeURIComponent(
      `Olá! Recomendo o OperaBeauty para a gestão e agendamentos do seu salão de beleza. ` +
      `Usando o meu link de parceiro você ganha 1 MÊS GRÁTIS de teste:\n\n${dashboardData.referralLink}`
    );
    window.open(`https://api.whatsapp.com/send?text=${msg}`, '_blank');
  };

  const handleRequestPayout = async (e) => {
    e.preventDefault();
    setPayoutFeedback(null);
    const amountNum = parseFloat(payoutAmount);

    if (isNaN(amountNum) || amountNum < 50) {
      setPayoutFeedback({ type: 'error', message: 'O valor mínimo para saque via PIX é de R$ 50,00.' });
      return;
    }

    const available = parseFloat(dashboardData?.kpis?.availableBalance || 0);
    if (amountNum > available) {
      setPayoutFeedback({ type: 'error', message: `Saldo insuficiente. Disponível: R$ ${available.toFixed(2)}.` });
      return;
    }

    try {
      setPayoutLoading(true);
      const res = await fetch(`/api/resellers/payout/${partnerId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amountNum })
      });
      const data = await res.json();

      if (!res.ok) {
        setPayoutFeedback({ type: 'error', message: data.error || 'Falha ao processar saque.' });
        return;
      }

      setPayoutFeedback({ type: 'success', message: 'Solicitação de saque PIX confirmada com sucesso!' });
      // Atualizar dados
      const dashRes = await fetch(`/api/resellers/dashboard/${partnerId}`);
      if (dashRes.ok) {
        setDashboardData(await dashRes.json());
      }
      setTimeout(() => {
        setPayoutModalOpen(false);
        setPayoutFeedback(null);
        setPayoutAmount('');
      }, 2000);
    } catch (err) {
      setPayoutFeedback({ type: 'error', message: 'Erro ao solicitar saque PIX.' });
    } finally {
      setPayoutLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link to="/" className="text-xl font-bold bg-gradient-to-r from-rose-400 to-amber-300 bg-clip-text text-transparent flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-rose-400" />
              OperaBeauty
            </Link>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-300 border border-rose-500/20 font-medium">
              Programa de Parceiros
            </span>
          </div>

          <div className="flex items-center space-x-4">
            <Link to="/planos" className="text-sm text-slate-400 hover:text-white transition">
              Planos & Preços
            </Link>
            <Link to="/" className="text-sm text-slate-400 hover:text-white transition hidden sm:inline-block">
              Ver Demonstração
            </Link>
            {partnerId && (
              <button 
                onClick={handleLogout}
                className="text-sm text-rose-400 hover:text-rose-300 flex items-center gap-1.5 transition ml-2"
                title="Sair do painel"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sair</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {!partnerId ? (
          /* ============================================================ */
          /* TELA 1: APRESENTAÇÃO DO PROGRAMA + CADASTRO / LOGIN           */
          /* ============================================================ */
          <div>
            {/* Hero do Programa */}
            <div className="text-center max-w-3xl mx-auto mb-12">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs font-semibold uppercase tracking-wider mb-4">
                <Award className="w-4 h-4" />
                20% de Comissão Recorrente Mensal
              </div>
              <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
                Indique Salões e Ganhe{' '}
                <span className="bg-gradient-to-r from-rose-400 via-pink-400 to-amber-300 bg-clip-text text-transparent">
                  Renda Recorrente Todo Mês
                </span>
              </h1>
              <p className="mt-4 text-base sm:text-lg text-slate-400">
                Torne-se um parceiro oficial OperaBeauty. Indique salões de beleza, barbearias e clínicas de estética. 
                Cada novo salão ganha <strong>1 mês grátis</strong> e você recebe <strong>20% de todas as mensalidades</strong> pagas, direto na sua conta via PIX.
              </p>
            </div>

            {/* Destaques em 3 Passos */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur">
                <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mb-4">
                  <Share2 className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">1. Compartilhe seu Link</h3>
                <p className="text-sm text-slate-400">
                  Cadastre-se gratuitamente e receba seu link exclusivo e código personalizado para divulgar no WhatsApp e redes sociais.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur">
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mb-4">
                  <Gift className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">2. Salão Ganha 1 Mês Grátis</h3>
                <p className="text-sm text-slate-400">
                  O salão indicado tem 30 dias de isenção total para testar o sistema completo com agenda, comanda e WhatsApp.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">3. Receba 20% Todo Mês</h3>
                <p className="text-sm text-slate-400">
                  Enquanto a assinatura do salão estiver ativa, você recebe comissão recorrente automática via PIX. Sem limites de indicações.
                </p>
              </div>
            </div>

            {/* Card de Autenticação / Cadastro */}
            <div className="max-w-xl mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
              {!isProgramEnabled && (
                <div className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-amber-200 text-sm mb-0.5">Programa em Fase de Convite Exclusivo</strong>
                    Novas adesões públicas estão temporariamente suspensas pelo Super Admin. Se você já possui um código de parceiro concedido, acerte seu acesso na aba <strong>"Já sou Parceiro"</strong>.
                  </div>
                </div>
              )}

              <div className="flex border-b border-slate-800 pb-4 mb-6">
                <button
                  type="button"
                  onClick={() => setAuthMode('login')}
                  className={`flex-1 py-2 text-center font-semibold text-sm transition border-b-2 -mb-4 ${
                    authMode === 'login'
                      ? 'border-rose-500 text-rose-400'
                      : 'border-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  Já sou Parceiro
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMode('register')}
                  className={`flex-1 py-2 text-center font-semibold text-sm transition border-b-2 -mb-4 ${
                    authMode === 'register'
                      ? 'border-rose-500 text-rose-400'
                      : 'border-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  Criar Conta de Parceiro {!isProgramEnabled && <span className="text-[10px] text-amber-400">(Fechado)</span>}
                </button>
              </div>

              {authMode === 'login' ? (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      E-mail ou Código de Parceiro
                    </label>
                    <input
                      type="text"
                      value={loginIdentifier}
                      onChange={(e) => setLoginIdentifier(e.target.value)}
                      placeholder="ex: PARCEIROVIP ou thais@gmail.com"
                      className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 transition"
                      required
                    />
                  </div>

                  {loginError && (
                    <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      {loginError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-semibold rounded-xl transition shadow-lg shadow-rose-500/25 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? 'Acessando...' : 'Acessar Painel de Parceiro'}
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <p className="text-center text-xs text-slate-500 mt-2">
                    Dica: use o código de teste <strong>PARCEIROVIP</strong> para testar agora.
                  </p>
                </form>
              ) : (
                <form onSubmit={handleRegister} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                      Seu Nome Completo
                    </label>
                    <input
                      type="text"
                      value={regForm.name}
                      onChange={(e) => setRegForm({ ...regForm, name: e.target.value })}
                      placeholder="Maria Silva"
                      className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 transition"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                        E-mail
                      </label>
                      <input
                        type="email"
                        value={regForm.email}
                        onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                        placeholder="maria@email.com"
                        className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 transition"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                        WhatsApp
                      </label>
                      <input
                        type="text"
                        value={regForm.phone}
                        onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })}
                        placeholder="(11) 98765-4321"
                        className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 transition"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                      Código de Indicação Personalizado (opcional)
                    </label>
                    <input
                      type="text"
                      value={regForm.referral_code}
                      onChange={(e) => setRegForm({ ...regForm, referral_code: e.target.value.toUpperCase().replace(/\s+/g, '') })}
                      placeholder="Ex: MARIASALON, CONSULTORIAVIP"
                      className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 transition uppercase"
                    />
                    <span className="text-[11px] text-slate-500 mt-0.5 block">
                      Se deixar em branco, geraremos um código exclusivo para você.
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                        Tipo Chave PIX
                      </label>
                      <select
                        value={regForm.pix_key_type}
                        onChange={(e) => setRegForm({ ...regForm, pix_key_type: e.target.value })}
                        className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-rose-500 transition"
                      >
                        <option value="cpf">CPF</option>
                        <option value="cnpj">CNPJ</option>
                        <option value="email">E-mail</option>
                        <option value="phone">Telefone</option>
                        <option value="random">Aleatória</option>
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                        Chave PIX para Receber
                      </label>
                      <input
                        type="text"
                        value={regForm.pix_key}
                        onChange={(e) => setRegForm({ ...regForm, pix_key: e.target.value })}
                        placeholder="Chave para repasse"
                        className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 transition"
                      />
                    </div>
                  </div>

                  {regError && (
                    <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      {regError}
                    </div>
                  )}

                  {!isProgramEnabled ? (
                    <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs rounded-xl text-center">
                      Novos cadastros públicos suspensos pelo Super Admin. Contate o suporte para solicitar um convite VIP.
                    </div>
                  ) : (
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3.5 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-semibold rounded-xl transition shadow-lg shadow-rose-500/25 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {loading ? 'Cadastrando...' : 'Quero Ser Parceiro Agora'}
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                </form>
              )}
            </div>
          </div>
        ) : (
          /* ============================================================ */
          /* TELA 2: DASHBOARD COMPLETO DO PARCEIRO LOGADO                */
          /* ============================================================ */
          <div className="space-y-8">
            {/* Header com Boas-Vindas */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
                    Olá, {dashboardData?.reseller?.name || 'Parceiro'}! 👋
                  </h1>
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Ativo ({dashboardData?.reseller?.commission_rate || '20'}% Recorrente)
                  </span>
                </div>
                <p className="text-sm text-slate-400">
                  Gerencie suas indicações de salões, acompanhe faturas pagas e solicite saques via PIX.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setPayoutModalOpen(true)}
                  className="px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold text-sm shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition"
                >
                  <Wallet className="w-4 h-4" />
                  Solicitar Saque PIX
                </button>
              </div>
            </div>

            {/* Caixa de Compartilhamento do Link de Indicação */}
            <div className="bg-gradient-to-br from-rose-950/40 via-slate-900 to-slate-900 border border-rose-500/30 rounded-3xl p-6 sm:p-8">
              <div className="flex items-center gap-2 text-rose-400 font-semibold text-sm mb-2">
                <Sparkles className="w-4 h-4" />
                Seu Link Exclusivo de Indicação
              </div>
              <p className="text-sm text-slate-300 mb-4">
                Ao acessar por este link, o salão ganha automaticamente <strong>1 mês grátis</strong> na assinatura e você fica vinculado como indicador com <strong>20% de comissão permanente</strong>.
              </p>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 font-mono text-xs sm:text-sm text-rose-300 select-all overflow-x-auto">
                  {dashboardData?.referralLink || `https://operabeauty.com.br/?ref=${dashboardData?.reseller?.referral_code}`}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={copyLink}
                    className="flex-1 sm:flex-none px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition border border-slate-700"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    {copied ? 'Copiado!' : 'Copiar Link'}
                  </button>

                  <button
                    onClick={shareWhatsApp}
                    className="flex-1 sm:flex-none px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-600/25"
                  >
                    <Share2 className="w-4 h-4" />
                    Enviar WhatsApp
                  </button>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
                <CheckCircle2 className="w-4 h-4 text-rose-400" />
                Código de cupom manual: <span className="font-mono text-white font-bold">{dashboardData?.reseller?.referral_code}</span> (pode ser digitado no checkout)
              </div>
            </div>

            {/* Grade de 4 KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Salões Indicados</span>
                  <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center">
                    <Users className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-3xl font-extrabold text-white">
                  {dashboardData?.kpis?.totalReferrals || 0}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Cadastros totais realizados
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Assinaturas Ativas</span>
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-3xl font-extrabold text-white">
                  {dashboardData?.kpis?.activeSalons || 0}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Salões pagando mensalidade
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">MRR Recorrente Est.</span>
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-3xl font-extrabold text-white">
                  R$ {parseFloat(dashboardData?.kpis?.monthlyRecurringEst || 0).toFixed(2)}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Previsão mensal garantida
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-slate-900 border border-emerald-500/30 bg-emerald-950/10">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Saldo para Saque</span>
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <DollarSign className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-3xl font-extrabold text-emerald-300">
                  R$ {parseFloat(dashboardData?.kpis?.availableBalance || 0).toFixed(2)}
                </div>
                <div className="text-xs text-emerald-500/80 mt-1">
                  Mínimo R$ 50,00 via PIX
                </div>
              </div>
            </div>

            {/* Tabela de Salões Indicados */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-rose-400" />
                Salões que Você Indicou ({dashboardData?.referrals?.length || 0})
              </h2>

              {(!dashboardData?.referrals || dashboardData.referrals.length === 0) ? (
                <div className="text-center py-12 border border-dashed border-slate-800 rounded-2xl">
                  <Share2 className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400 text-sm">Você ainda não tem nenhum salão indicado.</p>
                  <p className="text-xs text-slate-500 mt-1">Compartilhe seu link exclusivo com donas de salão e profissionais de beleza!</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-300">
                    <thead className="text-xs uppercase bg-slate-950/50 text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="py-3 px-4">Salão</th>
                        <th className="py-3 px-4">Plano</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Data Indicação</th>
                        <th className="py-3 px-4">Benefício Concedido</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {dashboardData.referrals.map((ref) => (
                        <tr key={ref.id} className="hover:bg-slate-800/40 transition">
                          <td className="py-3.5 px-4 font-medium text-white">{ref.tenant_name || 'Salão Parceiro'}</td>
                          <td className="py-3.5 px-4 capitalize">{ref.plan || 'Essencial'}</td>
                          <td className="py-3.5 px-4">
                            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                              ref.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                            }`}>
                              {ref.status === 'active' ? 'Ativo' : 'Trial Grátis'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-xs text-slate-400">
                            {new Date(ref.created_at).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="py-3.5 px-4 text-xs text-rose-300 font-medium">
                            1 Mês Grátis Mútuo
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Extrato de Comissões e Repasses */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Comissões Recebidas */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
                <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                  Histórico de Comissões
                </h3>
                {(!dashboardData?.commissions || dashboardData.commissions.length === 0) ? (
                  <p className="text-xs text-slate-500 py-6 text-center">Nenhuma comissão faturada até o momento.</p>
                ) : (
                  <div className="space-y-3">
                    {dashboardData.commissions.map((c) => (
                      <div key={c.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs">
                        <div>
                          <div className="font-semibold text-white">Mensalidade: R$ {parseFloat(c.invoice_amount).toFixed(2)}</div>
                          <div className="text-slate-500">{new Date(c.created_at).toLocaleDateString('pt-BR')} • {c.rate_percentage}% comissão</div>
                        </div>
                        <div className="text-emerald-400 font-bold text-sm">
                          + R$ {parseFloat(c.amount).toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Saques PIX Solicitados */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
                <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-teal-400" />
                  Histórico de Saques PIX
                </h3>
                {(!dashboardData?.payouts || dashboardData.payouts.length === 0) ? (
                  <p className="text-xs text-slate-500 py-6 text-center">Nenhum saque solicitado até o momento.</p>
                ) : (
                  <div className="space-y-3">
                    {dashboardData.payouts.map((p) => (
                      <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs">
                        <div>
                          <div className="font-semibold text-white">Chave: {p.pix_key} ({p.pix_key_type})</div>
                          <div className="text-slate-500">{new Date(p.created_at).toLocaleDateString('pt-BR')}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-white font-bold">R$ {parseFloat(p.amount).toFixed(2)}</div>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            p.status === 'paid' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                          }`}>
                            {p.status === 'paid' ? 'Pago' : 'Em processamento'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modal de Solicitação de Saque PIX */}
      {payoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative">
            <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
              <Wallet className="w-5 h-5 text-emerald-400" />
              Solicitar Repasse PIX
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              O repasse será feito para a chave PIX cadastrada na sua conta.
            </p>

            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl mb-4 text-xs">
              <div className="text-slate-400">Chave PIX Cadastrada:</div>
              <div className="font-mono text-white font-semibold mt-0.5">
                {dashboardData?.reseller?.pix_key || 'Não informada'} ({dashboardData?.reseller?.pix_key_type || 'cpf'})
              </div>
              <div className="mt-2 text-slate-400">Saldo Disponível:</div>
              <div className="text-emerald-400 font-bold text-base">
                R$ {parseFloat(dashboardData?.kpis?.availableBalance || 0).toFixed(2)}
              </div>
            </div>

            <form onSubmit={handleRequestPayout} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Valor a Sacar (Mínimo R$ 50,00)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="50"
                  max={dashboardData?.kpis?.availableBalance || 0}
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(e.target.value)}
                  placeholder="50.00"
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              {payoutFeedback && (
                <div className={`p-3 text-xs rounded-xl flex items-center gap-2 ${
                  payoutFeedback.type === 'success' 
                    ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' 
                    : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
                }`}>
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {payoutFeedback.message}
                </div>
              )}

              <div className="flex items-center gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setPayoutModalOpen(false)}
                  className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-semibold transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={payoutLoading}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold transition shadow-lg shadow-emerald-600/25 disabled:opacity-50"
                >
                  {payoutLoading ? 'Processando...' : 'Confirmar Saque'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-8 bg-slate-950 text-slate-500 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            © {new Date().getFullYear()} OperaBeauty. Todos os direitos reservados.
          </div>
          <div className="flex items-center space-x-6">
            <Link to="/privacidade" className="hover:text-slate-400 transition">Privacidade</Link>
            <Link to="/termos" className="hover:text-slate-400 transition">Termos</Link>
            <Link to="/planos" className="hover:text-slate-400 transition">Planos</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
