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
  EyeOff
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
  const [step, setStep] = useState('LOADING'); // 'LOADING' | 'MANUAL' | 'OTP' | 'NEW_PASSWORD' | 'SUCCESS'
  const [purpose, setPurpose] = useState(initialPurpose);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [otpCode, setOtpCode] = useState('');
  const [resetToken, setResetToken] = useState(null);
  
  // Timer e reenvio
  const [timeLeft, setTimeLeft] = useState(300); // 5 min
  const [canResend, setCanResend] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(60);

  // Campos de nova senha
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Dados do salão obtidos do backend
  const [manualData, setManualData] = useState({
    salonName: tenantName,
    salonPhone: tenantPhone,
  });

  // Inicializa a requisição ao abrir o modal
  useEffect(() => {
    if (isOpen) {
      setStep('LOADING');
      setError(null);
      setOtpCode('');
      setNewPassword('');
      setConfirmPassword('');
      setResetToken(null);
      setTimeLeft(300);
      setCanResend(false);
      setResendCooldown(60);
      iniciarSolicitacao(initialPurpose);
    }
  }, [isOpen, phone, tenantSlug, initialPurpose]);

  // Contagem regressiva do OTP (5 minutos)
  useEffect(() => {
    if (step !== 'OTP' || timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [step, timeLeft]);

  // Cooldown de reenvio (60 segundos)
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

  const iniciarSolicitacao = async (actionPurpose) => {
    setLoading(true);
    setError(null);
    setPurpose(actionPurpose);

    try {
      const response = await api.auth.requestClientCode(tenantSlug, phone, actionPurpose);
      
      if (response.method === 'whatsapp' && response.automated) {
        setStep('OTP');
        setTimeLeft(response.expires_in || 300);
        setCanResend(false);
        setResendCooldown(60);
      } else {
        // Modo manual: Salão sem WhatsApp conectado ou plano básico
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
      <div className="relative w-full max-w-[420px] bg-white rounded-[24px] shadow-xl border border-line p-6 flex flex-col items-center text-center">
        
        {/* Botão Fechar */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="absolute top-4 right-4 w-8 h-8 rounded-full border border-line text-ink-soft hover:text-ink flex items-center justify-center hover:bg-brand-tint/30 transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>

        {/* 1. ESTADO DE CARREGAMENTO INICIAL */}
        {step === 'LOADING' && (
          <div className="py-12 flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-full border-3 border-brand/20 border-t-brand animate-spin" />
            <p className="text-sm font-sans text-ink-soft">
              Verificando canal de recuperação do salão...
            </p>
          </div>
        )}

        {/* 2. ESTADO MANUAL: Salão sem automação (Plano Básico ou WhatsApp desconectado) */}
        {step === 'MANUAL' && (
          <div className="w-full flex flex-col items-center">
            <div className="w-14 h-14 rounded-full bg-brand-tint flex items-center justify-center text-brand mb-3 shadow-2xs">
              <KeyRound size={26} strokeWidth={1.8} />
            </div>

            <h2 className="font-display text-[22px] font-semibold text-ink leading-tight mb-2">
              Redefinição de Senha
            </h2>

            <p className="text-[13px] font-sans text-ink-soft leading-relaxed mb-4">
              Para a sua segurança, a redefinição de acesso é realizada diretamente com a recepção do <strong className="text-ink font-semibold">{manualData.salonName}</strong>.
            </p>

            <div className="w-full bg-brand-tint/40 border border-brand/10 rounded-[18px] p-4 text-left mb-6 space-y-1.5">
              <div className="text-[11px] font-semibold text-brand uppercase tracking-wider">
                Como funciona
              </div>
              <p className="text-[12px] font-sans text-ink-soft leading-relaxed">
                Nossa equipe localiza seu cadastro <span className="font-medium text-ink">({phone})</span> e gera uma nova senha provisória em segundos.
              </p>
            </div>

            <div className="w-full space-y-2.5">
              {whatsAppHref ? (
                <a
                  href={whatsAppHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full min-h-[48px] px-5 py-3 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                >
                  <MessageCircle size={18} />
                  <span>Falar com o Salão no WhatsApp</span>
                </a>
              ) : (
                <div className="text-xs text-amber-800 bg-amber-50 p-3 rounded-xl border border-amber-200">
                  Por favor, entre em contato presencialmente ou por telefone com o salão para redefinir sua senha.
                </div>
              )}

              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 text-xs font-semibold text-ink-soft hover:text-ink transition-colors cursor-pointer"
              >
                Voltar para digitar senha
              </button>
            </div>
          </div>
        )}

        {/* 3. ESTADO OTP: Salão com WhatsApp Conectado (Código de 6 dígitos) */}
        {step === 'OTP' && (
          <div className="w-full flex flex-col items-center">
            <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 mb-3 shadow-2xs">
              <MessageCircle size={26} strokeWidth={1.8} />
            </div>

            <h2 className="font-display text-[22px] font-semibold text-ink leading-tight mb-1">
              {purpose === 'login' ? 'Entrar com Código' : 'Código de Verificação'}
            </h2>

            <p className="text-[13px] font-sans text-ink-soft mb-5">
              Enviamos um código de 6 dígitos pelo WhatsApp do salão para <strong>{phone}</strong>
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
              className="w-full"
              isLoading={loading}
              disabled={otpCode.length < 6}
              aoClicar={() => handleVerifyOtp()}
              iconeFim={<ArrowRight size={18} strokeWidth={2.2} />}
            >
              {purpose === 'login' ? 'Confirmar e Entrar' : 'Confirmar Código'}
            </Botao>
          </div>
        )}

        {/* 4. ESTADO NOVA SENHA: Após validação do OTP */}
        {step === 'NEW_PASSWORD' && (
          <form onSubmit={handleSaveNewPassword} className="w-full flex flex-col items-center">
            <div className="w-14 h-14 rounded-full bg-brand-tint flex items-center justify-center text-brand mb-3 shadow-2xs">
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

        {/* 5. ESTADO SUCESSO: Concluído com feedback */}
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

        {/* 6. ESTADO ERRO GENÉRICO */}
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
