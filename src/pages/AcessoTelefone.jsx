import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTenant } from '../context/TenantContext';
import { api } from '../lib/api';
import { Botao } from '../components/ui/Botao';
import { CampoTelefone } from '../components/ui/CampoTelefone';
import { Chip } from '../components/ui/Chip';
import { TelaCliente } from '../components/ui/TelaCliente';
import { ArrowRight, MapPin, Clock, X, ExternalLink, Copy, Check } from 'lucide-react';

const InstagramIcon = ({ size = 15, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

const AcessoTelefone = () => {
  const { tenant_slug } = useParams();
  const navigate = useNavigate();
  const { tenant } = useTenant();

  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [businessHours, setBusinessHours] = useState([]);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isHoursModalOpen, setIsHoursModalOpen] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);

  useEffect(() => {
    if (tenant?.id) {
      api.settings
        .getBusinessHours(tenant.id)
        .then((data) => {
          if (data && Array.isArray(data)) {
            setBusinessHours(data.sort((a, b) => a.day_of_week - b.day_of_week));
          }
        })
        .catch((err) => console.error('Erro ao carregar horários:', err));
    }
  }, [tenant]);

  const handlePhoneChange = (e) => {
    setPhone(e.target.value);
    if (error) setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!tenant) {
      setError('Salão não configurado ou inativo. Contate o administrador.');
      return;
    }

    const digitsOnly = phone.replace(/\D/g, '');
    if (digitsOnly.length < 10) {
      setError('Digite seu telefone completo com DDD.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { action } = await api.auth.checkClientExists(tenant.id, phone);
      if (action === 'login') {
        navigate(`/${tenant_slug}/acesso-senha`, { state: { phone } });
      } else if (action === 'register') {
        navigate(`/${tenant_slug}/cadastro`, { state: { phone } });
      } else {
        // Fallback para senha
        navigate(`/${tenant_slug}/acesso-senha`, { state: { phone } });
      }
    } catch (err) {
      console.error(err);
      if (err.status === 429) {
        setError('Muitas tentativas em pouco tempo. Aguarde alguns instantes.');
      } else {
        setError('Não foi possível verificar seu telefone. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCopyAddress = () => {
    if (tenant?.address) {
      navigator.clipboard.writeText(tenant.address);
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    }
  };

  // Inicial do salão para monograma elegante quando sem logo
  const initialLetter = tenant?.name ? tenant.name.trim().charAt(0).toUpperCase() : 'T';

  // Configurações de redes e localização
  const hasAddress = Boolean(tenant?.address && tenant.address.trim());
  const hasHours = Boolean(businessHours && businessHours.length > 0);
  const hasInstagram = Boolean(tenant?.social_instagram && tenant.social_instagram.trim());

  const diasSemana = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

  return (
    <TelaCliente className="selection:bg-brand-tint selection:text-brand">
      {/* Container Principal Mobile Centralizado */}
      <main className="w-full max-w-[420px] mx-auto px-6 pt-6 pb-6 flex-grow flex flex-col items-center text-center">
        {/* 1. Logo Circular com Borda Dourada */}
        <div className="w-[72px] h-[72px] rounded-full bg-ink border-2 border-gold flex items-center justify-center shadow-sm mb-3 overflow-hidden select-none">
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
            <span className="font-display italic text-gold text-[34px] leading-none select-none">
              {initialLetter}
            </span>
          )}
        </div>

        {/* 2. Nome do Salão */}
        <h2 className="font-display text-[22px] font-semibold text-brand tracking-tight mb-6">
          {tenant?.name || 'Studio Thais'}
        </h2>

        {/* 3. Imagem de Capa (Nítida / Fallback com formas orgânicas) */}
        <div className="w-full h-[176px] rounded-[28px] overflow-hidden shadow-sm relative mb-7 bg-brand-tint select-none">
          {tenant?.cover_url || tenant?.banner_url ? (
            <img
              src={tenant.cover_url || tenant.banner_url}
              alt={tenant?.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full relative overflow-hidden flex items-center justify-center">
              {/* Formas orgânicas circulares suaves de fundo (fiel ao layout) */}
              <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-[#EFD2D4] opacity-80 pointer-events-none" />
              <div className="absolute -bottom-16 -left-8 w-44 h-44 rounded-full bg-bg opacity-90 pointer-events-none" />
              <span className="absolute top-4 left-5 text-[11px] font-sans font-medium tracking-wider text-ink-soft/75 uppercase pointer-events-none">
                [Foto nítida do salão]
              </span>
            </div>
          )}
        </div>

        {/* 4. Título & Slogan */}
        <div className="mb-6 space-y-1.5">
          <h1 className="font-display text-[28px] font-semibold text-ink leading-tight">
            Que bom ter você aqui
          </h1>
          <p className="font-sans text-[15px] text-ink-soft leading-relaxed max-w-xs mx-auto">
            {tenant?.slogan || 'Sua jornada de autocuidado e luxo começa aqui.'}
          </p>
        </div>

        {/* 5. Formulário de Telefone */}
        <form onSubmit={handleSubmit} className="w-full space-y-4">
          <CampoTelefone
            id="phone"
            label="Seu telefone"
            value={phone}
            onChange={handlePhoneChange}
            error={error}
            textoAjuda="Continuar para digitar sua senha."
            autoFocus
          />

          {/* Botão de Ação Primária "Continuar →" */}
          <div className="pt-2">
            <Botao
              tipo="submit"
              variante="primario"
              tamanho="lg"
              className="w-full"
              isLoading={loading}
              iconeFim={<ArrowRight size={18} strokeWidth={2.2} />}
            >
              Continuar
            </Botao>
          </div>
        </form>

        {/* 6. Pílulas de Ações Rápidas (Chips informativos) */}
        {(hasAddress || hasHours || hasInstagram) && (
          <div className="pt-6 flex items-center justify-center gap-2.5 flex-wrap">
            {hasAddress && (
              <Chip
                onClick={() => setIsLocationModalOpen(true)}
                icone={<MapPin size={15} strokeWidth={2} />}
              >
                Endereço
              </Chip>
            )}

            {hasHours && (
              <Chip
                onClick={() => setIsHoursModalOpen(true)}
                icone={<Clock size={15} strokeWidth={2} />}
              >
                Horários
              </Chip>
            )}

            {hasInstagram && (
              <Chip
                as="a"
                href={
                  tenant.social_instagram.startsWith('http')
                    ? tenant.social_instagram
                    : `https://instagram.com/${tenant.social_instagram.replace('@', '')}`
                }
                target="_blank"
                rel="noopener noreferrer"
                icone={<InstagramIcon size={15} />}
              >
                Instagram
              </Chip>
            )}
          </div>
        )}

        {/* 7. Link Rodapé: Sou funcionário / gestor */}
        <div className="pt-8 pb-2">
          <button
            type="button"
            onClick={() => navigate(`/${tenant_slug}/staff/login`)}
            className="text-[13px] font-sans text-ink-soft hover:text-ink hover:underline transition-colors cursor-pointer select-none"
          >
            Sou funcionário / gestor
          </button>
        </div>
      </main>

      {/* Modal: Endereço & Localização */}
      {isLocationModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm animate-fade-in"
        >
          <div className="bg-surface rounded-card p-6 shadow-card max-w-sm w-full border border-line relative animate-scale-up text-left">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-brand">
                <MapPin size={20} strokeWidth={2.2} />
                <h3 className="font-display text-[20px] font-semibold">Endereço</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsLocationModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-ink-soft hover:text-ink hover:bg-brand-tint/50 transition-colors"
                aria-label="Fechar"
              >
                <X size={18} />
              </button>
            </div>

            <p className="font-sans text-[15px] text-ink leading-relaxed mb-5">
              {tenant?.address}
            </p>

            <div className="flex flex-col gap-2.5">
              <a
                href={`https://maps.google.com/?q=${encodeURIComponent(tenant?.address || '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 h-11 px-4 rounded-full bg-brand text-white font-sans text-[14px] font-semibold hover:opacity-95 transition-all shadow-sm"
              >
                <span>Abrir no Google Maps</span>
                <ExternalLink size={15} />
              </a>

              <button
                type="button"
                onClick={handleCopyAddress}
                className="inline-flex items-center justify-center gap-2 h-11 px-4 rounded-full border border-line bg-surface text-ink font-sans text-[14px] font-medium hover:bg-brand-tint/30 transition-all"
              >
                {copiedAddress ? (
                  <>
                    <Check size={16} className="text-success" />
                    <span>Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy size={16} />
                    <span>Copiar endereço</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Horários de Funcionamento */}
      {isHoursModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm animate-fade-in"
        >
          <div className="bg-surface rounded-card p-6 shadow-card max-w-sm w-full border border-line relative animate-scale-up text-left">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-brand">
                <Clock size={20} strokeWidth={2.2} />
                <h3 className="font-display text-[20px] font-semibold">Horários</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsHoursModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-ink-soft hover:text-ink hover:bg-brand-tint/50 transition-colors"
                aria-label="Fechar"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2 mb-6">
              {businessHours.map((h) => {
                const diaNome = diasSemana[h.day_of_week] || `Dia ${h.day_of_week}`;
                const fechado = h.is_closed;
                const horarioFormatado = fechado
                  ? 'Fechado'
                  : `${h.open_time?.slice(0, 5)} às ${h.close_time?.slice(0, 5)}`;

                return (
                  <div
                    key={h.day_of_week}
                    className="flex justify-between items-center py-1.5 border-b border-line/60 last:border-none text-[14px]"
                  >
                    <span className="font-medium text-ink">{diaNome}</span>
                    <span
                      className={
                        fechado
                          ? 'text-ink-soft font-normal italic'
                          : 'text-brand font-semibold'
                      }
                    >
                      {horarioFormatado}
                    </span>
                  </div>
                );
              })}
            </div>

            <Botao
              variante="contorno"
              tamanho="md"
              className="w-full"
              onClick={() => setIsHoursModalOpen(false)}
            >
              Fechar
            </Botao>
          </div>
        </div>
      )}
    </TelaCliente>
  );
};

export default AcessoTelefone;
