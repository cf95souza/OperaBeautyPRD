import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { CampoCodigo } from '../ui/CampoCodigo';
import { CampoTexto } from '../ui/CampoTexto';
import { Botao } from '../ui/Botao';
import { 
  X, 
  ArrowRight, 
  Lock, 
  CheckCircle2, 
  ShieldCheck, 
  RotateCcw,
  Eye,
  EyeOff,
  Mail,
  Calendar,
  MessageCircle,
  HelpCircle
} from 'lucide-react';

export const ModalRecuperacaoSenha = ({
  isOpen,
  onClose,
  phone,
  tenantSlug,
  tenantName = 'Salão',
  tenantPhone = '',
  onLoginSuccess = null,
  initialPurpose = 'reset_password' // 'reset_password' | 'login'
}) => {
  // 'LOADING' | 'EMAIL_FORM' | 'EMAIL_OTP' | 'EMAIL_NEW_PASSWORD' | 'SUCCESS' | 'ERROR'
  const [step, setStep] = useState('LOADING');
  const [purpose, setPurpose] = useState(initialPurpose);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // E-mail e Validação
  const [clientRecoveryInfo, setClientRecoveryInfo] = useState({
    hasEmail: false,
    emailMasked: '',
    clientName: ''
  });
  const [emailInput, setEmailInput] = useState('');
  const [birthDateInput, setBirthDateInput] = useState('');
  const [emailOtpCode, setEmailOtpCode] = useState('');
  const [emailTimeLeft, setEmailTimeLeft] = useState(900); // 15 min
  const [emailCanResend, setEmailCanResend] = useState(false);
  const [emailResendCooldown, setEmailResendCooldown] = useState(60);

  // Campos de nova senha
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Inicializa ao abrir
  useEffect(() => {
    if (isOpen) {
      setStep('LOADING');
      setError(null);
      setEmailOtpCode('');
      setEmailInput('');
      setBirthDateInput('');
      setNewPassword('');
      setConfirmPassword('');
      setEmailTimeLeft(900);
      setEmailCanResend(false);
      setEmailResendCooldown(60);
      iniciarSolicitacao(initialPurpose);
    }
  }, [isOpen, phone, tenantSlug, initialPurpose]);

  // Contagem regressiva E-mail OTP (15 min)
  useEffect(() => {
    if (step !== 'EMAIL_OTP' || emailTimeLeft <= 0) return;
    const interval = setInterval(() => {
      setEmailTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [step, emailTimeLeft]);

  // Cooldown de reenvio (60s)
  useEffect(() => {
    if (step !== 'EMAIL_OTP' || emailCanResend) return;
    const interval = setInterval(() => {
      setEmailResendCooldown((prev) => {
        if (prev <= 1) {
          setEmailCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [step, emailCanResend]);

  const iniciarSolicitacao = async (actionPurpose) => {
    setLoading(true);
    setError(null);
    setPurpose(actionPurpose);

    try {
      // 1. Tenta envio direto para cliente com e-mail cadastrado
      const response = await api.auth.requestClientResetEmail(tenantSlug, phone, undefined, undefined, actionPurpose);
      
      if (response.requires_email_and_birthdate) {
        setClientRecoveryInfo({
          hasEmail: false,
          emailMasked: '',
          clientName: response.client_name || ''
        });
        setStep('EMAIL_FORM');
      } else {
        // E-mail cadastrado encontrado: código enviado com sucesso
        setClientRecoveryInfo({
          hasEmail: true,
          emailMasked: response.destination_email || ''
        });
        setStep('EMAIL_OTP');
        setEmailTimeLeft(response.expires_in || 900);
        setEmailCanResend(false);
        setEmailResendCooldown(60);
      }
    } catch (err) {
      console.error(err);
      setError(err.message || null);
      setStep('EMAIL_FORM');
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmailOtp = async (e) => {
    if (e) e.preventDefault();
    setError(null);

    if (!clientRecoveryInfo.hasEmail) {
      if (!emailInput || !emailInput.includes('@')) {
        setError('Por favor, informe um endereço de e-mail válido.');
        return;
      }
      if (!birthDateInput) {
        setError('Por favor, confirme sua data de nascimento cadastrada.');
        return;
      }
    }

    setLoading(true);
    try {
      const res = await api.auth.requestClientResetEmail(
        tenantSlug,
        phone,
        clientRecoveryInfo.hasEmail ? undefined : emailInput.trim(),
        clientRecoveryInfo.hasEmail ? undefined : birthDateInput,
        purpose
      );

      setStep('EMAIL_OTP');
      setEmailTimeLeft(res.expires_in || 900);
      setEmailCanResend(false);
      setEmailResendCooldown(60);
      if (res.destination_email) {
        setClientRecoveryInfo((prev) => ({ 
          ...prev, 
          emailMasked: res.destination_email,
          hasEmail: true 
        }));
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Erro ao enviar código por e-mail.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmailOtp = async (codeToVerify) => {
    const finalCode = codeToVerify || emailOtpCode;
    if (!finalCode || finalCode.length !== 6) {
      setError('Digite o código de 6 dígitos recebido por e-mail.');
      return;
    }
    setError(null);
    setEmailOtpCode(finalCode);

    // Se for LOGIN, autentica imediatamente
    if (purpose === 'login') {
      setLoading(true);
      try {
        const res = await api.auth.verifyClientResetEmail(tenantSlug, phone, finalCode, undefined, 'login');
        if (res.verified && onLoginSuccess) {
          onLoginSuccess(res.user, res.token);
        }
        setStep('SUCCESS');
        setTimeout(() => onClose(), 1200);
      } catch (err) {
        console.error(err);
        setError(err.message || 'Código incorreto ou expirado.');
      } finally {
        setLoading(false);
      }
      return;
    }

    // Se for RESET DE SENHA, avança para tela de nova senha
    setStep('EMAIL_NEW_PASSWORD');
  };

  const handleSaveNewPassword = async (e) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 6 || !/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      setError('A senha deve ter no mínimo 6 caracteres, com pelo menos 1 letra e 1 número.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem. Digite a mesma senha nos dois campos.');
      return;
    }

    setLoading(true);
    try {
      await api.auth.verifyClientResetEmail(tenantSlug, phone, emailOtpCode, newPassword, 'reset_password');
      setStep('SUCCESS');
    } catch (err) {
      console.error(err);
      setError(err.message || 'Código incorreto ou expirado.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const formatTimer = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const cleanSalonPhone = (tenantPhone || '').replace(/\D/g, '');
  const whatsAppHref = cleanSalonPhone
    ? `https://wa.me/55${cleanSalonPhone}?text=${encodeURIComponent(
        `Olá! Sou cliente do ${tenantName} (${phone}) e preciso de ajuda para acessar minha conta no agendamento.`
      )}`
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-[420px] bg-white rounded-[26px] shadow-2xl border border-line p-6 flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
        
        {/* Botão Fechar */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="absolute top-4 right-4 w-8 h-8 rounded-full border border-line text-ink-soft hover:text-ink flex items-center justify-center hover:bg-stone-100 transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>

        {/* 1. CARREGAMENTO INICIAL */}
        {step === 'LOADING' && (
          <div className="py-12 flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-full border-3 border-brand/20 border-t-brand animate-spin" />
            <p className="text-sm font-sans text-ink-soft">
              Verificando canal de recuperação do salão...
            </p>
          </div>
        )}

        {/* 2. FORMULÁRIO DE E-MAIL E DATA DE NASCIMENTO (CLIENTE SEM E-MAIL) */}
        {step === 'EMAIL_FORM' && (
          <form onSubmit={handleSendEmailOtp} className="w-full flex flex-col items-center">
            <div className="w-14 h-14 rounded-2xl bg-brand-tint flex items-center justify-center text-brand mb-3 shadow-2xs">
              <Mail size={26} strokeWidth={1.8} />
            </div>

            <h2 className="font-display text-[22px] font-semibold text-ink leading-tight mb-1">
              {purpose === 'login' ? 'Acesso por E-mail' : 'Recuperar por E-mail'}
            </h2>

            <p className="text-[13px] font-sans text-ink-soft leading-relaxed mb-4">
              {clientRecoveryInfo.hasEmail
                ? `Enviaremos um código de 6 dígitos para:`
                : 'Para sua segurança, informe seu e-mail e confirme sua data de nascimento cadastrada no salão:'}
            </p>

            {clientRecoveryInfo.hasEmail ? (
              <div className="w-full bg-brand-tint/40 border border-brand/20 rounded-2xl p-4 text-center mb-5">
                <span className="text-xs text-ink-soft block mb-1">E-mail cadastrado:</span>
                <span className="font-mono text-sm font-bold text-ink">{clientRecoveryInfo.emailMasked}</span>
              </div>
            ) : (
              <div className="w-full space-y-3 mb-5 text-left">
                <CampoTexto
                  id="recovery-email"
                  label="Seu E-mail"
                  type="email"
                  placeholder="exemplo@gmail.com"
                  value={emailInput}
                  onChange={(e) => {
                    setEmailInput(e.target.value);
                    if (error) setError(null);
                  }}
                  iconeEsquerda={<Mail size={18} />}
                  required
                  autoFocus
                />

                <div>
                  <label htmlFor="recovery-birth" className="block text-xs font-semibold text-ink-soft mb-1.5 flex items-center gap-1.5">
                    <Calendar size={13} className="text-brand" />
                    Data de Nascimento (para validação de segurança)
                  </label>
                  <input
                    id="recovery-birth"
                    type="date"
                    value={birthDateInput}
                    onChange={(e) => {
                      setBirthDateInput(e.target.value);
                      if (error) setError(null);
                    }}
                    className="w-full h-12 bg-bg border border-line rounded-xl px-4 text-sm text-ink focus:outline-none focus:border-brand transition-colors font-medium"
                    required
                  />
                  <span className="text-[11px] text-ink-soft/70 mt-1 block">
                    Confirme a data cadastrada neste salão.
                  </span>
                </div>
              </div>
            )}

            {error && (
              <p className="text-xs text-rose-600 font-medium mb-3">
                {error}
              </p>
            )}

            <div className="w-full space-y-2.5">
              <Botao
                tipo="submit"
                variante="primario"
                tamanho="lg"
                className="w-full"
                isLoading={loading}
                iconeFim={<ArrowRight size={18} strokeWidth={2.2} />}
              >
                Enviar Código de Confirmação
              </Botao>

              {whatsAppHref && (
                <a
                  href={whatsAppHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2 text-xs font-semibold text-ink-soft hover:text-emerald-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <MessageCircle size={14} className="text-emerald-600" />
                  <span>Dúvidas? Falar com a recepção</span>
                </a>
              )}
            </div>
          </form>
        )}

        {/* 3. DIGITAÇÃO DO CÓDIGO DE 6 DÍGITOS */}
        {step === 'EMAIL_OTP' && (
          <div className="w-full flex flex-col items-center">
            <div className="w-14 h-14 rounded-2xl bg-brand-tint flex items-center justify-center text-brand mb-3 shadow-2xs">
              <Mail size={26} strokeWidth={1.8} />
            </div>

            <h2 className="font-display text-[22px] font-semibold text-ink leading-tight mb-1">
              Código de Verificação
            </h2>

            <p className="text-[13px] font-sans text-ink-soft mb-5">
              Enviamos um código de 6 dígitos para {clientRecoveryInfo.emailMasked ? <strong>{clientRecoveryInfo.emailMasked}</strong> : 'o seu e-mail'}.
            </p>

            <div className="w-full mb-4">
              <CampoCodigo
                qtdDigitos={6}
                valor={emailOtpCode}
                aoMudar={(val) => {
                  setEmailOtpCode(val);
                  if (error) setError(null);
                }}
                aoCompletar={(code) => handleVerifyEmailOtp(code)}
                autoFocus
                error={error}
              />
            </div>

            {error && (
              <p className="text-xs text-rose-600 font-medium mb-3">
                {error}
              </p>
            )}

            <div className="flex items-center justify-between w-full text-xs text-ink-soft mb-6 px-1">
              <span>
                Expira em: <strong className="text-brand font-semibold tabular-nums">{formatTimer(emailTimeLeft)}</strong>
              </span>

              {emailCanResend ? (
                <button
                  type="button"
                  onClick={handleSendEmailOtp}
                  className="text-brand font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw size={12} />
                  <span>Reenviar código</span>
                </button>
              ) : (
                <span className="text-stone-400">
                  Reenviar em {emailResendCooldown}s
                </span>
              )}
            </div>

            <Botao
              tipo="button"
              variante="primario"
              tamanho="lg"
              className="w-full mb-3"
              isLoading={loading}
              disabled={emailOtpCode.length < 6}
              aoClicar={() => handleVerifyEmailOtp()}
              iconeFim={<ArrowRight size={18} strokeWidth={2.2} />}
            >
              {purpose === 'login' ? 'Confirmar e Entrar' : 'Confirmar Código'}
            </Botao>

            <button
              type="button"
              onClick={() => {
                setError(null);
                setStep('EMAIL_FORM');
              }}
              className="text-xs text-ink-soft hover:text-ink transition-colors cursor-pointer"
            >
              Não recebeu? Alterar e-mail informado
            </button>
          </div>
        )}

        {/* 4. DEFINIR NOVA SENHA (APENAS RESET) */}
        {step === 'EMAIL_NEW_PASSWORD' && (
          <form onSubmit={handleSaveNewPassword} className="w-full flex flex-col items-center">
            <div className="w-14 h-14 rounded-2xl bg-brand-tint flex items-center justify-center text-brand mb-3 shadow-2xs">
              <ShieldCheck size={26} strokeWidth={1.8} />
            </div>

            <h2 className="font-display text-[22px] font-semibold text-ink leading-tight mb-1">
              Defina sua Nova Senha
            </h2>

            <p className="text-[13px] font-sans text-ink-soft mb-5">
              Escolha uma senha para seus próximos agendamentos.
            </p>

            <div className="w-full space-y-3.5 mb-5 text-left">
              <CampoTexto
                id="new-password-email"
                label="Nova Senha"
                type={showNewPassword ? 'text' : 'password'}
                placeholder="Mínimo de 6 caracteres"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  if (error) setError(null);
                }}
                iconeEsquerda={<Lock size={18} />}
                iconeDireita={
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="text-ink-soft hover:text-ink transition-colors p-1"
                  >
                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                }
                required
                autoFocus
                autoComplete="new-password"
              />

              <CampoTexto
                id="confirm-password-email"
                label="Confirmar Nova Senha"
                type={showNewPassword ? 'text' : 'password'}
                placeholder="Repita a senha digitada"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (error) setError(null);
                }}
                iconeEsquerda={<Lock size={18} />}
                required
                autoComplete="new-password"
              />

              {error && (
                <p className="text-xs text-rose-600 font-medium">
                  {error}
                </p>
              )}

              <div className="bg-stone-50 border border-line rounded-xl p-3 text-[11px] text-ink-soft space-y-1">
                <div className={`flex items-center gap-1.5 ${newPassword.length >= 6 ? 'text-emerald-700 font-semibold' : ''}`}>
                  <CheckCircle2 size={13} />
                  <span>Pelo menos 6 caracteres</span>
                </div>
                <div className={`flex items-center gap-1.5 ${/[a-zA-Z]/.test(newPassword) && /[0-9]/.test(newPassword) ? 'text-emerald-700 font-semibold' : ''}`}>
                  <CheckCircle2 size={13} />
                  <span>Contém letras e números</span>
                </div>
                <div className={`flex items-center gap-1.5 ${newPassword && newPassword === confirmPassword ? 'text-emerald-700 font-semibold' : ''}`}>
                  <CheckCircle2 size={13} />
                  <span>As senhas coincidem</span>
                </div>
              </div>
            </div>

            <Botao
              tipo="submit"
              variante="primario"
              tamanho="lg"
              className="w-full"
              isLoading={loading}
              disabled={newPassword.length < 6 || newPassword !== confirmPassword}
            >
              Salvar Nova Senha
            </Botao>
          </form>
        )}

        {/* 5. SUCESSO */}
        {step === 'SUCCESS' && (
          <div className="py-8 flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4 animate-in zoom-in duration-300">
              <CheckCircle2 size={36} strokeWidth={2.2} />
            </div>

            <h3 className="font-display text-[22px] font-semibold text-ink mb-1">
              Tudo pronto!
            </h3>

            <p className="text-sm font-sans text-ink-soft mb-6">
              {purpose === 'login'
                ? 'Acesso confirmado! Entrando no salão...'
                : 'Sua senha foi redefinida com sucesso. Você já pode acessar sua conta.'}
            </p>

            <Botao
              tipo="button"
              variante="primario"
              tamanho="md"
              aoClicar={onClose}
              className="px-8"
            >
              {purpose === 'login' ? 'Continuar' : 'Fazer Login'}
            </Botao>
          </div>
        )}

        {/* 6. ERRO */}
        {step === 'ERROR' && (
          <div className="py-6 flex flex-col items-center">
            <h3 className="font-display text-[18px] font-semibold text-ink mb-2">
              Não foi possível prosseguir
            </h3>
            <p className="text-xs font-sans text-rose-600 mb-6">
              {error}
            </p>
            <Botao
              tipo="button"
              variante="secundario"
              tamanho="md"
              aoClicar={onClose}
            >
              Fechar
            </Botao>
          </div>
        )}

      </div>
    </div>
  );
};

export default ModalRecuperacaoSenha;
