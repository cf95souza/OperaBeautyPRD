import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { CampoCodigo } from '../ui/CampoCodigo';
import { CampoTexto } from '../ui/CampoTexto';
import { Botao } from '../ui/Botao';
import { 
  X, 
  KeyRound, 
  MessageCircle, 
  ArrowRight, 
  Lock, 
  CheckCircle2, 
  ShieldCheck, 
  RotateCcw,
  Eye,
  EyeOff,
  Mail,
  Calendar,
  ChevronLeft
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
  // 'LOADING' | 'MANUAL' | 'OTP' | 'NEW_PASSWORD' | 'EMAIL_FORM' | 'EMAIL_OTP' | 'EMAIL_NEW_PASSWORD' | 'SUCCESS' | 'ERROR'
  const [step, setStep] = useState('LOADING');
  const [purpose, setPurpose] = useState(initialPurpose);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // WhatsApp OTP
  const [otpCode, setOtpCode] = useState('');
  const [resetToken, setResetToken] = useState(null);
  const [timeLeft, setTimeLeft] = useState(300);
  const [canResend, setCanResend] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(60);

  // E-mail OTP (Resend)
  const [clientRecoveryInfo, setClientRecoveryInfo] = useState({
    hasEmail: false,
    emailMasked: '',
    canUseEmail: true
  });
  const [emailInput, setEmailInput] = useState('');
  const [birthDateInput, setBirthDateInput] = useState('');
  const [emailOtpCode, setEmailOtpCode] = useState('');
  const [emailTimeLeft, setEmailTimeLeft] = useState(900);
  const [emailCanResend, setEmailCanResend] = useState(false);
  const [emailResendCooldown, setEmailResendCooldown] = useState(60);

  // Campos de nova senha
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Dados do salão
  const [manualData, setManualData] = useState({
    salonName: tenantName,
    salonPhone: tenantPhone,
  });

  // Inicializa ao abrir
  useEffect(() => {
    if (isOpen) {
      setStep('LOADING');
      setError(null);
      setOtpCode('');
      setEmailOtpCode('');
      setEmailInput('');
      setBirthDateInput('');
      setNewPassword('');
      setConfirmPassword('');
      setResetToken(null);
      setTimeLeft(300);
      setCanResend(false);
      setResendCooldown(60);
      setEmailTimeLeft(900);
      setEmailCanResend(false);
      setEmailResendCooldown(60);
      iniciarSolicitacao(initialPurpose);
    }
  }, [isOpen, phone, tenantSlug, initialPurpose]);

  // Contagem regressiva WhatsApp OTP
  useEffect(() => {
    if (step !== 'OTP' || timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [step, timeLeft]);

  // Cooldown WhatsApp
  useEffect(() => {
    if (step !== 'OTP' || canResend) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [step, canResend]);

  // Contagem regressiva E-mail OTP (15 min)
  useEffect(() => {
    if (step !== 'EMAIL_OTP' || emailTimeLeft <= 0) return;
    const interval = setInterval(() => {
      setEmailTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [step, emailTimeLeft]);

  // Cooldown E-mail
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
      const response = await api.auth.requestClientCode(tenantSlug, phone, actionPurpose);
      
      setClientRecoveryInfo({
        hasEmail: Boolean(response.has_email),
        emailMasked: response.email_masked || '',
        canUseEmail: true
      });

      if (response.method === 'whatsapp' && response.automated) {
        setStep('OTP');
        setTimeLeft(response.expires_in || 300);
        setCanResend(false);
        setResendCooldown(60);
      } else {
        // Salão sem WhatsApp conectado ou plano básico
        setManualData({
          salonName: response.salon_name || tenantName,
          salonPhone: response.salon_phone || tenantPhone,
        });
        setStep('MANUAL');
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Erro ao processar solicitação. Tente novamente.');
      setStep('ERROR');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (codeToVerify) => {
    const finalCode = codeToVerify || otpCode;
    if (!finalCode || finalCode.length !== 6) {
      setError('Digite o código de 6 dígitos enviado pelo WhatsApp.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.auth.verifyClientCode(tenantSlug, phone, finalCode);

      if (res.purpose === 'login' && res.verified) {
        if (onLoginSuccess) {
          onLoginSuccess(res.user, res.token);
        }
        setStep('SUCCESS');
        setTimeout(() => onClose(), 1200);
        return;
      }

      if (res.purpose === 'reset_password' && res.reset_token) {
        setResetToken(res.reset_token);
        setStep('NEW_PASSWORD');
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Código inválido ou expirado.');
    } finally {
      setLoading(false);
    }
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
      await api.auth.resetClientPassword(resetToken, newPassword);
      setStep('SUCCESS');
    } catch (err) {
      console.error(err);
      setError(err.message || 'Erro ao salvar nova senha. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // ----------------------------------------------------
  // FLUXO DE RECUPERAÇÃO POR E-MAIL (RESEND)
  // ----------------------------------------------------

  const handleGoToEmailForm = () => {
    setError(null);
    setStep('EMAIL_FORM');
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
        setError('Por favor, confirme sua data de nascimento cadastrada no salão.');
        return;
      }
    }

    setLoading(true);
    try {
      const res = await api.auth.requestClientResetEmail(
        tenantSlug,
        phone,
        clientRecoveryInfo.hasEmail ? undefined : emailInput.trim(),
        clientRecoveryInfo.hasEmail ? undefined : birthDateInput
      );

      setStep('EMAIL_OTP');
      setEmailTimeLeft(res.expires_in || 900);
      setEmailCanResend(false);
      setEmailResendCooldown(60);
      if (res.email_masked) {
        setClientRecoveryInfo((prev) => ({ ...prev, emailMasked: res.email_masked }));
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Erro ao enviar código por e-mail.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmailOtp = (codeToVerify) => {
    const finalCode = codeToVerify || emailOtpCode;
    if (!finalCode || finalCode.length !== 6) {
      setError('Digite o código de 6 dígitos recebido por e-mail.');
      return;
    }
    setError(null);
    setEmailOtpCode(finalCode);
    setStep('EMAIL_NEW_PASSWORD');
  };

  const handleSaveNewPasswordEmail = async (e) => {
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
      await api.auth.verifyClientResetEmail(tenantSlug, phone, emailOtpCode, newPassword);
      setStep('SUCCESS');
    } catch (err) {
      console.error(err);
      setError(err.message || 'Código inválido ou expirado.');
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

  const cleanSalonPhone = (manualData.salonPhone || '').replace(/\D/g, '');
  const whatsAppHref = cleanSalonPhone
    ? `https://wa.me/55${cleanSalonPhone}?text=${encodeURIComponent(
        `Olá! Sou cliente do ${manualData.salonName} (${phone}) e gostaria de redefinir minha senha de acesso ao agendamento.`
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

        {/* 2. ESTADO MANUAL: Opção de E-mail destacada + WhatsApp da Recepção */}
        {step === 'MANUAL' && (
          <div className="w-full flex flex-col items-center">
            <div className="w-14 h-14 rounded-2xl bg-brand-tint flex items-center justify-center text-brand mb-3 shadow-2xs">
              <KeyRound size={26} strokeWidth={1.8} />
            </div>

            <h2 className="font-display text-[22px] font-semibold text-ink leading-tight mb-2">
              Redefinição de Senha
            </h2>

            <p className="text-[13px] font-sans text-ink-soft leading-relaxed mb-4">
              Escolha como prefere recuperar o acesso à sua conta no <strong className="text-ink font-semibold">{manualData.salonName}</strong>.
            </p>

            {/* Opção Principal: Recuperar por E-mail */}
            <button
              type="button"
              onClick={handleGoToEmailForm}
              className="w-full p-4 rounded-2xl border border-brand/30 bg-brand-tint/40 hover:bg-brand-tint/70 transition-all text-left mb-3 flex items-start gap-3.5 shadow-2xs group cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-brand text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                <Mail size={20} />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-ink">Recuperar por E-mail</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-brand bg-brand/10 px-2 py-0.5 rounded-full">Automático</span>
                </div>
                <p className="text-xs text-ink-soft mt-0.5 leading-snug">
                  {clientRecoveryInfo.hasEmail 
                    ? `Enviar código para ${clientRecoveryInfo.emailMasked}`
                    : 'Receba um código de 6 dígitos e crie sua nova senha em segundos'}
                </p>
              </div>
            </button>

            {/* Opção Alternativa: WhatsApp da Recepção */}
            {whatsAppHref && (
              <a
                href={whatsAppHref}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full p-3.5 rounded-2xl border border-line hover:border-emerald-200 bg-stone-50/60 hover:bg-emerald-50/40 transition-all text-left mb-4 flex items-center gap-3 text-ink cursor-pointer"
              >
                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <MessageCircle size={18} />
                </div>
                <div className="flex-1">
                  <span className="text-xs font-semibold text-ink block">Falar com a recepção</span>
                  <span className="text-[11px] text-ink-soft">Atendimento direto pelo WhatsApp</span>
                </div>
              </a>
            )}

            <button
              type="button"
              onClick={onClose}
              className="w-full py-2 text-xs font-semibold text-ink-soft hover:text-ink transition-colors cursor-pointer"
            >
              Voltar para digitar senha
            </button>
          </div>
        )}

        {/* 3. FLUXO EMAIL: FORMULÁRIO (E-mail e Data de Nascimento se novo) */}
        {step === 'EMAIL_FORM' && (
          <form onSubmit={handleSendEmailOtp} className="w-full flex flex-col items-center">
            <div className="w-14 h-14 rounded-2xl bg-brand-tint flex items-center justify-center text-brand mb-3 shadow-2xs">
              <Mail size={26} strokeWidth={1.8} />
            </div>

            <h2 className="font-display text-[22px] font-semibold text-ink leading-tight mb-1">
              Recuperação por E-mail
            </h2>

            <p className="text-[13px] font-sans text-ink-soft leading-relaxed mb-4">
              {clientRecoveryInfo.hasEmail
                ? 'Clique no botão abaixo para receber o código no seu e-mail cadastrado:'
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
                    Data de Nascimento (para validação)
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

            <div className="w-full space-y-2">
              <Botao
                tipo="submit"
                variante="primario"
                tamanho="lg"
                className="w-full"
                isLoading={loading}
                iconeFim={<ArrowRight size={18} strokeWidth={2.2} />}
              >
                Enviar Código de Recuperação
              </Botao>

              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setStep('MANUAL');
                }}
                className="w-full py-2 text-xs font-semibold text-ink-soft hover:text-ink transition-colors flex items-center justify-center gap-1 cursor-pointer"
              >
                <ChevronLeft size={14} />
                Voltar
              </button>
            </div>
          </form>
        )}

        {/* 4. FLUXO EMAIL: DIGITAÇÃO DO CÓDIGO DE 6 DÍGITOS */}
        {step === 'EMAIL_OTP' && (
          <div className="w-full flex flex-col items-center">
            <div className="w-14 h-14 rounded-2xl bg-brand-tint flex items-center justify-center text-brand mb-3 shadow-2xs">
              <Mail size={26} strokeWidth={1.8} />
            </div>

            <h2 className="font-display text-[22px] font-semibold text-ink leading-tight mb-1">
              Código de Verificação
            </h2>

            <p className="text-[13px] font-sans text-ink-soft mb-5">
              Enviamos um código de 6 dígitos para o seu e-mail. Verifique também sua caixa de spam.
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
              className="w-full"
              isLoading={loading}
              disabled={emailOtpCode.length < 6}
              aoClicar={() => handleVerifyEmailOtp()}
              iconeFim={<ArrowRight size={18} strokeWidth={2.2} />}
            >
              Confirmar Código
            </Botao>
          </div>
        )}

        {/* 5. FLUXO EMAIL: NOVA SENHA */}
        {step === 'EMAIL_NEW_PASSWORD' && (
          <form onSubmit={handleSaveNewPasswordEmail} className="w-full flex flex-col items-center">
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

        {/* 6. WHATSAPP OTP */}
        {step === 'OTP' && (
          <div className="w-full flex flex-col items-center">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 mb-3 shadow-2xs">
              <MessageCircle size={26} strokeWidth={1.8} />
            </div>

            <h2 className="font-display text-[22px] font-semibold text-ink leading-tight mb-1">
              {purpose === 'login' ? 'Entrar com Código' : 'Código de Verificação'}
            </h2>

            <p className="text-[13px] font-sans text-ink-soft mb-5">
              Enviamos um código de 6 dígitos pelo WhatsApp para <strong>{phone}</strong>
            </p>

            <div className="w-full mb-4">
              <CampoCodigo
                qtdDigitos={6}
                valor={otpCode}
                aoMudar={(val) => {
                  setOtpCode(val);
                  if (error) setError(null);
                }}
                aoCompletar={(code) => handleVerifyOtp(code)}
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
                Expira em: <strong className="text-brand font-semibold tabular-nums">{formatTimer(timeLeft)}</strong>
              </span>

              {canResend ? (
                <button
                  type="button"
                  onClick={() => iniciarSolicitacao(purpose)}
                  className="text-brand font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw size={12} />
                  <span>Reenviar código</span>
                </button>
              ) : (
                <span className="text-stone-400">
                  Reenviar em {resendCooldown}s
                </span>
              )}
            </div>

            <Botao
              tipo="button"
              variante="primario"
              tamanho="lg"
              className="w-full mb-3"
              isLoading={loading}
              disabled={otpCode.length < 6}
              aoClicar={() => handleVerifyOtp()}
              iconeFim={<ArrowRight size={18} strokeWidth={2.2} />}
            >
              {purpose === 'login' ? 'Confirmar e Entrar' : 'Confirmar Código'}
            </Botao>

            {/* Alternativa para E-mail se não tiver acesso ao WhatsApp */}
            <button
              type="button"
              onClick={handleGoToEmailForm}
              className="text-xs text-ink-soft hover:text-brand font-medium transition-colors cursor-pointer"
            >
              Sem acesso a este WhatsApp? <span className="underline font-semibold">Recuperar por e-mail</span>
            </button>
          </div>
        )}

        {/* 7. WHATSAPP: NOVA SENHA */}
        {step === 'NEW_PASSWORD' && (
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
                id="new-password"
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
              />

              <CampoTexto
                id="confirm-password"
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

        {/* 8. SUCESSO */}
        {step === 'SUCCESS' && (
          <div className="py-8 flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4 animate-in zoom-in duration-300">
              <CheckCircle2 size={36} strokeWidth={2.2} />
            </div>

            <h3 className="font-display text-[22px] font-semibold text-ink mb-1">
              Tudo pronto!
            </h3>

            <p className="text-sm font-sans text-ink-soft mb-6">
              Sua senha foi redefinida com sucesso. Você já pode acessar sua conta.
            </p>

            <Botao
              tipo="button"
              variante="primario"
              tamanho="md"
              aoClicar={onClose}
              className="px-8"
            >
              Fazer Login
            </Botao>
          </div>
        )}

        {/* 9. ERRO GENÉRICO */}
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
