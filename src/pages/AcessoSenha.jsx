import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useTenant } from '../context/TenantContext';
import { Botao } from '../components/ui/Botao';
import { CampoTexto } from '../components/ui/CampoTexto';
import { TelaCliente } from '../components/ui/TelaCliente';
import { ModalRecuperacaoSenha } from '../components/auth/ModalRecuperacaoSenha';
import { ArrowLeft, ArrowRight, Lock, Eye, EyeOff, Mail } from 'lucide-react';

const AcessoSenha = () => {
  const { tenant_slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { tenant, loginClient } = useTenant();

  const [phone] = useState(location.state?.phone || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showResetModal, setShowResetModal] = useState(false);
  const [modalPurpose, setModalPurpose] = useState('reset_password');

  useEffect(() => {
    if (!phone) {
      navigate(`/${tenant_slug}/login`);
    }
  }, [phone, navigate, tenant_slug]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('Digite sua senha para continuar.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await loginClient(phone, password);
      if (data) {
        navigate(`/${tenant_slug}/home`);
      } else {
        setError('Senha incorreta.');
      }
    } catch (err) {
      console.error(err);
      if (err.status === 401) {
        setError('Senha incorreta. Verifique e tente novamente.');
      } else if (err.status === 429) {
        setError('Muitas tentativas. Aguarde alguns instantes.');
      } else {
        setError(err.message || 'Erro ao realizar login. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  const initialLetter = tenant?.name ? tenant.name.trim().charAt(0).toUpperCase() : 'T';

  return (
    <TelaCliente className="selection:bg-brand-tint selection:text-brand">
      {/* Container Principal Mobile Centralizado */}
      <main className="w-full max-w-[420px] mx-auto px-6 pt-6 pb-6 flex-grow flex flex-col items-center text-center">
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
            {tenant?.name || (tenant_slug ? tenant_slug.toUpperCase() : 'OperaBeauty')}
          </span>

          <div className="w-10" />
        </div>

        {/* 1. Logo Circular com Borda Dourada */}
        <div className="w-[64px] h-[64px] rounded-full bg-ink border-2 border-gold flex items-center justify-center shadow-sm mb-3 overflow-hidden select-none">
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
            <span className="font-display italic text-gold text-[30px] leading-none select-none">
              {initialLetter}
            </span>
          )}
        </div>

        {/* 2. Imagem de Capa ou Fallback */}
        <div className="w-full h-[140px] rounded-[24px] overflow-hidden shadow-sm relative mb-6 bg-brand-tint select-none">
          {tenant?.cover_url || tenant?.banner_url ? (
            <img
              src={tenant.cover_url || tenant.banner_url}
              alt={tenant?.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full relative overflow-hidden flex items-center justify-center">
              <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-[#EFD2D4] opacity-80 pointer-events-none" />
              <div className="absolute -bottom-12 -left-6 w-36 h-36 rounded-full bg-bg opacity-90 pointer-events-none" />
              <span className="absolute top-3 left-4 text-[11px] font-sans font-medium tracking-wider text-ink-soft/75 uppercase pointer-events-none">
                [Foto nítida do salão]
              </span>
            </div>
          )}
        </div>

        {/* 3. Identificação do Usuário e Título */}
        <div className="mb-6 space-y-1 text-center w-full">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-tint text-brand text-[13px] font-semibold mb-2">
            <span>{phone}</span>
          </div>

          <h1 className="font-display text-[26px] font-semibold text-ink leading-tight">
            Digite sua senha
          </h1>
          <p className="font-sans text-[14px] text-ink-soft">
            Para continuar para sua conta no salão
          </p>
        </div>

        {/* 4. Formulário de Senha */}
        <form onSubmit={handleSubmit} className="w-full space-y-4">
          <CampoTexto
            id="password"
            label="Sua senha"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (error) setError(null);
            }}
            placeholder="••••••••"
            error={error}
            required
            autoFocus
            autoComplete="current-password"
            iconeEsquerda={<Lock size={20} strokeWidth={1.8} />}
            iconeDireita={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-ink-soft hover:text-ink transition-colors p-1"
                aria-label={showPassword ? 'Ocultar senha' : 'Ver senha'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            }
          />

          {/* Link Esqueceu a Senha */}
          <div className="flex items-center justify-end -mt-1">
            <button
              type="button"
              onClick={() => {
                setModalPurpose('reset_password');
                setShowResetModal(true);
              }}
              className="text-[13px] font-sans text-brand hover:underline font-semibold transition-colors cursor-pointer"
            >
              Esqueceu sua senha?
            </button>
          </div>

          <div className="pt-2 space-y-3">
            <Botao
              tipo="submit"
              variante="primario"
              tamanho="lg"
              className="w-full"
              isLoading={loading}
              iconeFim={<ArrowRight size={18} strokeWidth={2.2} />}
            >
              Entrar
            </Botao>

            {/* Divisor ou */}
            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-line"></div>
              <span className="flex-shrink mx-3 text-[11px] text-ink-soft/70 uppercase tracking-wider font-sans font-semibold">
                ou
              </span>
              <div className="flex-grow border-t border-line"></div>
            </div>

            {/* Botão Acesso Rápido por Código de E-mail */}
            <button
              type="button"
              onClick={() => {
                setModalPurpose('login');
                setShowResetModal(true);
              }}
              className="w-full min-h-[46px] px-4 rounded-full border border-line bg-surface text-ink hover:bg-brand-tint/30 text-[13px] font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs active:scale-98"
            >
              <Mail size={16} className="text-brand" />
              <span>Entrar com código por E-mail</span>
            </button>
          </div>
        </form>

        {/* 5. Ações Secundárias */}
        <div className="pt-6 pb-2 space-y-2 flex flex-col items-center">
          <button
            type="button"
            onClick={() => navigate(`/${tenant_slug}/login`)}
            className="text-[13px] font-sans text-brand hover:underline font-semibold transition-colors cursor-pointer select-none"
          >
            Acessar com outro número
          </button>
        </div>
      </main>

      {/* Modal de Recuperação de Senha / Login via WhatsApp do Salão */}
      <ModalRecuperacaoSenha
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        phone={phone}
        tenantSlug={tenant_slug}
        tenantName={tenant?.name}
        tenantPhone={tenant?.social_whatsapp || tenant?.phone}
        initialPurpose={modalPurpose}
        onLoginSuccess={() => {
          navigate(`/${tenant_slug}/home`);
        }}
      />
    </TelaCliente>
  );
};

export default AcessoSenha;
