import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { useNotification } from '../../context/NotificationProvider';
import { 
  CreditCard, 
  QrCode, 
  ShieldCheck, 
  Key, 
  Copy, 
  Check, 
  ExternalLink, 
  Sparkles, 
  Lock, 
  LogOut, 
  Clock, 
  RefreshCw, 
  Eye, 
  EyeOff,
  AlertTriangle,
  Server
} from 'lucide-react';

/**
 * Configurações Globais da Plataforma SaaS (Super Admin) - Rosé Editorial
 */
const SettingsAdmin = () => {
  const navigate = useNavigate();
  const { showSuccess, showError, confirm } = useNotification();

  // Estados do Gateway e Cobrança SaaS
  const [gateway, setGateway] = useState('sandbox');
  const [environment, setEnvironment] = useState('sandbox');
  const [pixKey, setPixKey] = useState('');
  const [pixKeyType, setPixKeyType] = useState('cnpj');
  const [apiKey, setApiKey] = useState('');
  const [publicKey, setPublicKey] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [gracePeriodDays, setGracePeriodDays] = useState(5);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  // Estados de Carregamento e Interface
  const [loading, setLoading] = useState(true);
  const [savingGateway, setSavingGateway] = useState(false);
  const [testingGateway, setTestingGateway] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  // Estados de Segurança e Troca de Senha Mestre
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const webhookUrl = `${window.location.origin}/api/invoices/webhook`;

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const data = await api.superadmin.getPlatformSettings();
      if (data) {
        setGateway(data.payment_gateway || 'sandbox');
        setEnvironment(data.environment || 'sandbox');
        setPixKey(data.pix_key || '');
        setPixKeyType(data.pix_key_type || 'cnpj');
        setPublicKey(data.gateway_public_key || '');
        setGracePeriodDays(Number(data.grace_period_days || 5));
        setHasApiKey(Boolean(data.has_api_key || data.gateway_api_key));
        if (data.gateway_api_key) {
          setApiKey(data.gateway_api_key);
        }
        if (data.webhook_secret) {
          setWebhookSecret(data.webhook_secret);
        }
      }
    } catch (err) {
      console.error('Erro ao buscar configurações da plataforma:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveGateway = async (e) => {
    e?.preventDefault?.();
    setSavingGateway(true);
    try {
      const payload = {
        payment_gateway: gateway,
        environment,
        pix_key: pixKey,
        pix_key_type: pixKeyType,
        gateway_api_key: apiKey,
        gateway_public_key: publicKey,
        webhook_secret: webhookSecret,
        grace_period_days: Number(gracePeriodDays)
      };

      const data = await api.superadmin.savePlatformSettings(payload);
      if (data) {
        setHasApiKey(Boolean(data.has_api_key || data.gateway_api_key));
        if (data.gateway_api_key) setApiKey(data.gateway_api_key);
      }
      showSuccess('Configurações de cobrança do SaaS salvas com sucesso!');
    } catch (error) {
      console.error(error);
      showError(error.message || 'Erro ao salvar as configurações.');
    } finally {
      setSavingGateway(false);
    }
  };

  const handleTestGateway = async () => {
    setTestingGateway(true);
    setTestResult(null);
    try {
      const res = await api.superadmin.testGateway({
        payment_gateway: gateway,
        gateway_api_key: apiKey
      });
      setTestResult(res);
      if (res.success) {
        showSuccess(res.message || 'Conexão validada com sucesso!');
      } else {
        showError(res.message || 'Falha na validação das credenciais.');
      }
    } catch (err) {
      const failObj = { success: false, message: err.message || 'Erro ao conectar à API do gateway.' };
      setTestResult(failObj);
      showError(failObj.message);
    } finally {
      setTestingGateway(false);
    }
  };

  const handleCopyWebhook = async () => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(webhookUrl);
      } else {
        const input = document.createElement('input');
        input.value = webhookUrl;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
      }
      setCopiedWebhook(true);
      showSuccess('URL do Webhook copiada com sucesso!');
      setTimeout(() => setCopiedWebhook(false), 3000);
    } catch (err) {
      showError('Não foi possível copiar automaticamente.');
    }
  };

  const handleLogout = async () => {
    if (await confirm('Sair do Painel Master?', 'Você precisará autenticar-se novamente com e-mail, senha e 2FA para acessar o Super Admin.')) {
      api.auth.logout();
      navigate('/superadmin/login');
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-16 max-w-5xl mx-auto">
      {/* Cabeçalho Editorial Rosé */}
      <div>
        <h1 className="font-display font-bold text-3xl sm:text-4xl text-ink tracking-tight">
          Configurações da Plataforma
        </h1>
        <p className="text-sm text-ink-soft mt-1">
          Gerencie o gateway de cobrança das mensalidades dos salões, chave PIX oficial, webhooks e segurança mestre.
        </p>
      </div>

      {loading ? (
        <div className="p-16 text-center text-xs text-ink-soft italic">
          Carregando parâmetros globais da plataforma...
        </div>
      ) : (
        <div className="space-y-6">
          {/* Card 1: Cobrança Automática do SaaS & Gateway Master */}
          <div className="rounded-[22px] border border-line bg-white shadow-xs p-6 sm:p-7 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-line/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-brand-tint flex items-center justify-center text-brand">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-xl text-ink">
                    Gateway de Pagamento SaaS & Chave PIX
                  </h3>
                  <p className="text-xs text-ink-soft">
                    Configurações de recebimento das mensalidades pagas pelos donos de salão (D18).
                  </p>
                </div>
              </div>

              {/* Seletor de Ambiente */}
              <div className="flex items-center gap-2 self-start sm:self-center">
                <span className="text-xs text-ink-soft font-medium">Ambiente:</span>
                <div className="inline-flex rounded-full p-1 bg-stone-100 border border-line">
                  <button
                    type="button"
                    onClick={() => setEnvironment('sandbox')}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                      environment === 'sandbox'
                        ? 'bg-brand text-white shadow-2xs'
                        : 'text-ink-soft hover:text-ink'
                    }`}
                  >
                    Sandbox (Testes)
                  </button>
                  <button
                    type="button"
                    onClick={() => setEnvironment('production')}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                      environment === 'production'
                        ? 'bg-emerald-700 text-white shadow-2xs'
                        : 'text-ink-soft hover:text-ink'
                    }`}
                  >
                    Produção (Real)
                  </button>
                </div>
              </div>
            </div>

            <form onSubmit={handleSaveGateway} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Provedor de Pagamento */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-ink-soft mb-1.5">
                    Provedor / Gateway Integrado
                  </label>
                  <select
                    value={gateway}
                    onChange={(e) => setGateway(e.target.value)}
                    className="w-full text-xs bg-stone-50 border border-line rounded-xl px-3.5 py-2.5 text-ink outline-none focus:border-brand transition-colors cursor-pointer"
                  >
                    <option value="sandbox">Simulador Sandbox (Nativo OperaBeauty)</option>
                    <option value="mercadopago">Mercado Pago</option>
                    <option value="asaas">Asaas Pagamentos</option>
                    <option value="abacatepay">AbacatePay</option>
                    <option value="stripe">Stripe</option>
                  </select>
                  <p className="text-[11px] text-ink-soft mt-1">
                    Processa a geração do QR Code e a baixa automática das mensalidades do software.
                  </p>
                </div>

                {/* Dias de Carência Padrão */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-ink-soft mb-1.5">
                    Tolerância de Carência (Grace Period)
                  </label>
                  <div className="flex items-center gap-2">
                    <select
                      value={gracePeriodDays}
                      onChange={(e) => setGracePeriodDays(Number(e.target.value))}
                      className="w-full text-xs bg-stone-50 border border-line rounded-xl px-3.5 py-2.5 text-ink outline-none focus:border-brand transition-colors cursor-pointer"
                    >
                      <option value={3}>3 dias de carência</option>
                      <option value={5}>5 dias de carência (Recomendado)</option>
                      <option value={7}>7 dias de carência</option>
                      <option value={10}>10 dias de carência</option>
                    </select>
                  </div>
                  <p className="text-[11px] text-ink-soft mt-1">
                    Prazo em que o salão continua funcionando normalmente após o vencimento antes do bloqueio gradual.
                  </p>
                </div>

                {/* Chave PIX Oficial da Plataforma */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-ink-soft mb-1.5">
                    Chave PIX Institucional do SaaS
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={pixKeyType}
                      onChange={(e) => setPixKeyType(e.target.value)}
                      className="w-32 text-xs bg-stone-50 border border-line rounded-xl px-2.5 py-2.5 text-ink outline-none focus:border-brand"
                    >
                      <option value="cnpj">CNPJ</option>
                      <option value="email">E-mail</option>
                      <option value="phone">Celular</option>
                      <option value="random">Aleatória</option>
                    </select>
                    <input
                      type="text"
                      value={pixKey}
                      onChange={(e) => setPixKey(e.target.value)}
                      placeholder="ex: 12.345.678/0001-99 ou financeiro@..."
                      className="flex-1 text-xs bg-stone-50 border border-line rounded-xl px-3.5 py-2.5 text-ink outline-none focus:border-brand font-mono"
                    />
                  </div>
                  <p className="text-[11px] text-ink-soft mt-1">
                    Utilizada na montagem do payload EMV BR Code dos QR Codes das faturas de mensalidade.
                  </p>
                </div>

                {/* Token Privado de API */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-ink-soft">
                      Access Token / Chave Privada da API
                    </label>
                    {hasApiKey && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        Criptografia Ativa (AES-256)
                      </span>
                    )}
                  </div>
                  <div className="relative flex items-center">
                    <input
                      type={showApiKey ? "text" : "password"}
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder={hasApiKey ? "Chave protegida no banco. Digite nova para alterar." : "Cole sua chave de API aqui"}
                      className="w-full text-xs font-mono bg-stone-50 border border-line rounded-xl px-3.5 py-2.5 pr-10 text-ink outline-none focus:border-brand"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-2 text-ink-soft hover:text-ink p-1 cursor-pointer"
                    >
                      {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  <div className="mt-2 flex items-center justify-between">
                    <button
                      type="button"
                      disabled={testingGateway}
                      onClick={handleTestGateway}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-line bg-stone-50 hover:bg-stone-100 text-xs font-semibold text-ink transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {testingGateway ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-brand" />
                          <span>Validando no Mercado Pago...</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-3.5 h-3.5 text-brand" />
                          <span>Testar Conexão com Gateway</span>
                        </>
                      )}
                    </button>
                    <span className="text-[11px] text-ink-soft">
                      {gateway === 'mercadopago' ? 'Copie o "Access Token" (APP_USR-)' : 'Valida conexão oficial'}
                    </span>
                  </div>

                  {/* Diagnóstico em tempo real */}
                  {testResult && (
                    <div className={`mt-3 p-3.5 rounded-xl text-xs border ${
                      testResult.success 
                        ? testResult.is_sandbox && environment === 'production'
                          ? 'bg-amber-50 border-amber-200 text-amber-900'
                          : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                        : 'bg-rose-50 border-rose-200 text-rose-900'
                    }`}>
                      <div className="flex items-start gap-2">
                        {testResult.success ? (
                          testResult.is_sandbox && environment === 'production' ? (
                            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          ) : (
                            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          )
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        )}
                        <div className="space-y-1">
                          <p className="font-semibold leading-tight">{testResult.message}</p>
                          {testResult.nickname && (
                            <div className="text-[11px] opacity-90 space-y-0.5 pt-1">
                              <div>Conta: <strong>{testResult.nickname}</strong> ({testResult.email || 'sem e-mail'})</div>
                              <div>Ambiente da Chave: <strong>{testResult.is_sandbox ? 'Sandbox (Testes)' : 'Produção Real'}</strong> • País: <strong>{testResult.country || 'MLB'}</strong></div>
                            </div>
                          )}
                          {testResult.is_sandbox && environment === 'production' && (
                            <p className="text-[11px] font-bold text-amber-800 pt-1">
                              Aviso Crítico: Chaves TEST- não podem ser pagas por aplicativos bancários reais (Nubank, etc.). Para testes reais de R$ 1, utilize as Credenciais de Produção.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Chave Pública */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-ink-soft mb-1.5">
                    Public Key (Opcional)
                  </label>
                  <input
                    type="text"
                    value={publicKey}
                    onChange={(e) => setPublicKey(e.target.value)}
                    placeholder="Cole a chave pública se exigida pelo provedor"
                    className="w-full text-xs font-mono bg-stone-50 border border-line rounded-xl px-3.5 py-2.5 text-ink outline-none focus:border-brand"
                  />
                </div>

                {/* Segredo do Webhook */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-ink-soft mb-1.5">
                    Webhook Secret / Assinatura (Opcional)
                  </label>
                  <input
                    type="password"
                    value={webhookSecret}
                    onChange={(e) => setWebhookSecret(e.target.value)}
                    placeholder="Segredo para validação de integridade HMAC"
                    className="w-full text-xs font-mono bg-stone-50 border border-line rounded-xl px-3.5 py-2.5 text-ink outline-none focus:border-brand"
                  />
                </div>
              </div>

              {/* Caixa da URL de Webhook para colar no Gateway */}
              <div className="p-4 rounded-2xl bg-stone-50 border border-line space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-ink flex items-center gap-1.5">
                    <Server className="w-3.5 h-3.5 text-brand" />
                    URL do Webhook para Baixa Automática de Faturas
                  </span>
                  <span className="text-[11px] text-ink-soft">Cole no painel do seu gateway</span>
                </div>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    readOnly
                    value={webhookUrl}
                    className="w-full text-xs font-mono bg-white text-ink-soft px-3.5 py-2.5 pr-28 rounded-xl border border-line select-all"
                  />
                  <button
                    type="button"
                    onClick={handleCopyWebhook}
                    className={`absolute right-1 top-1 bottom-1 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                      copiedWebhook
                        ? 'bg-emerald-600 text-white'
                        : 'bg-brand hover:bg-brand-hover text-white'
                    }`}
                  >
                    {copiedWebhook ? (
                      <>
                        <Check className="w-3 h-3" />
                        <span>Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copiar URL</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={savingGateway}
                  className="px-6 py-2.5 rounded-full bg-brand hover:bg-brand-hover text-white text-xs font-semibold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>{savingGateway ? 'Salvando...' : 'Salvar Configurações de Cobrança'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Card 2: Segurança & Conta Master (2FA e Senha) */}
          <div className="rounded-[22px] border border-line bg-white shadow-xs p-6 sm:p-7 space-y-5">
            <div className="flex items-center gap-3 pb-4 border-b border-line/60">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-700">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display font-bold text-xl text-ink">
                  Segurança & Conta Master
                </h3>
                <p className="text-xs text-ink-soft">
                  Governança da credencial suprema do SaaS e proteção por Segundo Fator (2FA TOTP).
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="p-4 rounded-2xl bg-stone-50 border border-line space-y-1">
                <span className="text-[11px] uppercase tracking-wider text-ink-soft font-semibold">
                  E-mail do Administrador Master
                </span>
                <p className="text-sm font-bold text-ink">admin@sistema.com</p>
                <p className="text-xs text-ink-soft pt-1">
                  Identificador raiz com permissão para gerenciar planos, faturas e auditoria de todos os salões.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-stone-50 border border-line space-y-2 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] uppercase tracking-wider text-ink-soft font-semibold">
                      Segundo Fator (2FA TOTP)
                    </span>
                    <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                      Protegido (C13)
                    </span>
                  </div>
                  <p className="text-xs text-ink-soft mt-1 leading-relaxed">
                    Exige código de 6 dígitos via Google Authenticator / Authy no momento do login.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Encerramento de Sessão */}
          <div className="rounded-[22px] border border-rose-200/80 bg-rose-50/40 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 flex items-center justify-center text-rose-700 shrink-0">
                <LogOut className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-rose-950">
                  Encerrar Sessão Mestre
                </h4>
                <p className="text-xs text-rose-800 mt-0.5 leading-relaxed">
                  Finalize seu acesso ao Painel de Controle SaaS para garantir que nenhum terminal permaneça logado.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="px-5 py-2.5 rounded-full border border-rose-300 bg-white hover:bg-rose-50 text-rose-700 text-xs font-semibold transition-colors shadow-2xs shrink-0 cursor-pointer"
            >
              Sair do Sistema Agora
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsAdmin;
