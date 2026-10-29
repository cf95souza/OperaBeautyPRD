import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useTenant } from '../context/TenantContext';
import { api } from '../lib/api';
import { Botao } from '../components/ui/Botao';
import { CampoTexto } from '../components/ui/CampoTexto';
import { TelaCliente } from '../components/ui/TelaCliente';
import { ArrowLeft, User, Phone, Calendar, Lock, CheckCircle2, Circle, Gift } from 'lucide-react';

const CadastroCliente = () => {
  const { tenant_slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { tenant, login } = useTenant();

  const [phone] = useState(location.state?.phone || '');
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [password, setPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [referralInfo, setReferralInfo] = useState(null);

  const queryParams = new URLSearchParams(location.search);
  const refCode = queryParams.get('ref') || 
    sessionStorage.getItem(`opera_referral_code:${tenant_slug}`) || 
    localStorage.getItem(`opera_referral_code:${tenant_slug}`);

  useEffect(() => {
    if (!phone) {
      navigate(`/${tenant_slug}/login`);
      return;
    }

    if (refCode && tenant_slug) {
      api.referral.validate(refCode, tenant_slug)
        .then((data) => {
          if (data && data.valid) {
            setReferralInfo(data);
          }
        })
        .catch(() => {});
    }
  }, [phone, navigate, tenant_slug, refCode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Por favor, informe seu nome.');
      return;
    }
    if (!birthDate) {
      setError('Por favor, informe sua data de nascimento.');
      return;
    }
    if (password.length < 6 || !/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
      setError('A senha deve atender a todos os requisitos de segurança.');
      return;
    }
    if (!termsAccepted) {
      setError('Você precisa concordar com os termos para continuar.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { token, user } = await api.auth.registerClient(
        tenant.id,
        name,
        phone,
        password,
        birthDate || null,
        refCode
      );
      login(user, token);
      if (tenant_slug) {
        sessionStorage.removeItem(`opera_referral_code:${tenant_slug}`);
        localStorage.removeItem(`opera_referral_code:${tenant_slug}`);
      }
      navigate(`/${tenant_slug}/home`);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Erro ao realizar cadastro. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const initialLetter = tenant?.name ? tenant.name.trim().charAt(0).toUpperCase() : 'T';

  // Validações da senha
  const hasMinLength = password.length >= 6;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const isFormValid =
    name.trim().length >= 3 &&
    birthDate &&
    hasMinLength &&
    hasLetter &&
    hasNumber &&
    termsAccepted;

  return (
    <TelaCliente className="selection:bg-brand-tint selection:text-brand">
      <main className="w-full max-w-[420px] mx-auto px-6 pt-6 pb-8 flex-grow flex flex-col items-center">
        {/* Barra Superior com Botão Voltar */}
        <div className="w-full flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Voltar"
            className="w-10 h-10 rounded-full border border-line bg-surface text-ink flex items-center justify-center hover:bg-brand-tint/40 transition-colors active:scale-95 shadow-sm"
          >
            <ArrowLeft size={18} />
          </button>

          <span className="font-display text-[17px] font-semibold text-brand tracking-tight">
            {tenant?.name || 'Studio Thais'}
          </span>

          <div className="w-10" />
        </div>

        {/* Logo Circular */}
        <div className="w-[56px] h-[56px] rounded-full bg-ink border-2 border-gold flex items-center justify-center shadow-sm mb-3 overflow-hidden select-none">
          {tenant?.logo_url ? (
            <img
              src={tenant.logo_url}
              alt={tenant?.name || 'Logo'}
              className="w-full h-full object-cover p-1 rounded-full"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          ) : (
            <span className="font-display italic text-gold text-[26px] leading-none select-none">
              {initialLetter}
            </span>
          )}
        </div>

        {/* Título de Boas-Vindas ou Banner de Convite */}
        <div className="text-center mb-6">
          {refCode ? (
            <div className="bg-brand-tint/60 border border-brand/20 p-4 rounded-[20px] mb-4 text-center animate-fade-in">
              <Gift size={28} className="text-brand mx-auto mb-1.5" />
              <h2 className="font-display text-[18px] font-semibold text-brand">
                {referralInfo?.referrerName 
                  ? `Convite especial de ${referralInfo.referrerName}!` 
                  : 'Você recebeu um convite especial!'}
              </h2>
              <p className="text-[13px] text-ink-soft mt-1 leading-snug">
                {referralInfo?.rewardAmount 
                  ? `Finalize seu cadastro e garanta R$ ${Number(referralInfo.rewardAmount).toFixed(2).replace('.', ',')} de bônus no seu primeiro procedimento!` 
                  : 'Finalize seu cadastro para garantir seu presente de boas-vindas na primeira visita.'}
              </p>
            </div>
          ) : (
            <>
              <h1 className="font-display text-[26px] font-semibold text-ink leading-tight mb-1">
                Quase lá!
              </h1>
              <p className="font-sans text-[14px] text-ink-soft">
                Crie seu perfil para agendar e acompanhar seus atendimentos.
              </p>
            </>
          )}
        </div>

        {/* Cartão de Cadastro */}
        <div className="w-full bg-surface rounded-card p-6 shadow-card border border-line text-left">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-[14px] bg-danger/10 border border-danger/20 text-danger text-[13px] font-medium leading-snug">
                {error}
              </div>
            )}

            {/* Nome Completo */}
            <CampoTexto
              id="name"
              label="Nome completo"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Como quer ser chamada(o)?"
              required
              autoFocus
              iconeEsquerda={<User size={20} strokeWidth={1.8} />}
            />

            {/* Telefone (Somente Leitura) */}
            <CampoTexto
              id="phone_readonly"
              label="Telefone verificado"
              type="text"
              value={phone}
              disabled
              textoAjuda="Número verificado na etapa anterior."
              iconeEsquerda={<Phone size={20} strokeWidth={1.8} />}
            />

            {/* Data de Nascimento */}
            <CampoTexto
              id="birthDate"
              label="Data de nascimento"
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              required
              iconeEsquerda={<Calendar size={20} strokeWidth={1.8} />}
            />

            {/* Senha */}
            <CampoTexto
              id="password"
              label="Crie sua senha"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              required
              iconeEsquerda={<Lock size={20} strokeWidth={1.8} />}
            />

            {/* Requisitos da Senha */}
            <div className="p-3.5 rounded-[16px] bg-bg border border-line space-y-2 text-[12px]">
              <span className="font-semibold text-ink-soft block mb-1">
                Sua senha deve conter:
              </span>
              <div className="flex items-center gap-2">
                {hasMinLength ? (
                  <CheckCircle2 size={15} className="text-success shrink-0" />
                ) : (
                  <Circle size={15} className="text-ink-soft/40 shrink-0" />
                )}
                <span className={hasMinLength ? 'text-success font-medium' : 'text-ink-soft'}>
                  Mínimo de 6 caracteres
                </span>
              </div>
              <div className="flex items-center gap-2">
                {hasLetter ? (
                  <CheckCircle2 size={15} className="text-success shrink-0" />
                ) : (
                  <Circle size={15} className="text-ink-soft/40 shrink-0" />
                )}
                <span className={hasLetter ? 'text-success font-medium' : 'text-ink-soft'}>
                  Pelo menos 1 letra
                </span>
              </div>
              <div className="flex items-center gap-2">
                {hasNumber ? (
                  <CheckCircle2 size={15} className="text-success shrink-0" />
                ) : (
                  <Circle size={15} className="text-ink-soft/40 shrink-0" />
                )}
                <span className={hasNumber ? 'text-success font-medium' : 'text-ink-soft'}>
                  Pelo menos 1 número
                </span>
              </div>
            </div>

            {/* Termos de Uso / LGPD */}
            <div className="flex items-start gap-2.5 pt-1">
              <input
                type="checkbox"
                id="terms"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-line text-brand focus:ring-brand accent-brand cursor-pointer"
              />
              <label htmlFor="terms" className="text-[12px] text-ink-soft leading-snug cursor-pointer select-none">
                Li e concordo com os termos de uso e a política de privacidade (LGPD), consentindo com o tratamento dos meus dados cadastrais.
              </label>
            </div>

            {/* Botão de Finalizar */}
            <div className="pt-3">
              <Botao
                tipo="submit"
                variante="primario"
                tamanho="lg"
                className="w-full"
                disabled={!isFormValid || loading}
                isLoading={loading}
              >
                Concluir Cadastro
              </Botao>
            </div>
          </form>
        </div>
      </main>
    </TelaCliente>
  );
};

export default CadastroCliente;
