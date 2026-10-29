import React, { useState, useEffect } from 'react';
import { useTenant } from '../../context/TenantContext';
import { api } from '../../lib/api';
import { formatCurrency } from '../../utils/formatters';
import { 
  Users, 
  Gift, 
  Share2, 
  Copy, 
  Check, 
  X, 
  Sparkles, 
  Wallet, 
  ArrowRight,
  HeartHandshake
} from 'lucide-react';

export const ModalIndicarAmiga = ({ isOpen, onClose }) => {
  const { tenant, tenant_slug } = useTenant();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setLoading(true);

    api.referral.getProfile()
      .then((data) => {
        if (isMounted) {
          setProfile(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Erro ao carregar perfil de indicação:', err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const referrerReward = profile?.referrerReward || 15.0;
  const refereeReward = profile?.refereeReward || 15.0;
  const referralCode = profile?.referralCode || 'AMIGA';
  const shareUrl = profile?.shareUrl || `${window.location.origin}/${tenant_slug}?ref=${referralCode}`;
  const whatsappMsg = profile?.whatsappMessage || 
    `Olá! Estou usando o aplicativo do ${tenant?.name || 'salão'} para agendar meus procedimentos. Acesse pelo meu link exclusivo e ganhe presente de boas-vindas: ${shareUrl}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2200);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(referralCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2200);
  };

  const stats = profile?.stats || {
    totalFriends: 0,
    completedFriends: 0,
    pendingFriends: 0,
    totalBonusEarned: 0
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-indicar-titulo"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm animate-fade-in"
    >
      <div 
        className="bg-surface rounded-card p-6 shadow-card max-w-sm w-full border border-line relative animate-scale-up text-center space-y-4 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Botão Fechar no canto superior */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="absolute top-4 right-4 w-8 h-8 rounded-full border border-line bg-surface text-ink-soft hover:text-ink hover:bg-brand-tint/30 flex items-center justify-center transition-colors"
        >
          <X size={16} />
        </button>

        {/* Ícone e Selo Rosé Editorial */}
        <div className="w-14 h-14 rounded-full bg-[#F6E4E4] text-brand border border-line/60 flex items-center justify-center mx-auto shadow-xs relative">
          <HeartHandshake size={28} strokeWidth={2.2} />
          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-gold text-surface flex items-center justify-center shadow-xs">
            <Sparkles size={11} strokeWidth={2.5} />
          </div>
        </div>

        {/* Título e Chamada */}
        <div className="space-y-1">
          <h3 id="modal-indicar-titulo" className="font-display text-[22px] font-semibold text-ink tracking-tight">
            Indique uma Amiga
          </h3>
          <p className="font-sans text-[13px] text-ink-soft leading-relaxed px-2">
            Compartilhe seu carinho com quem você ama. Vocês duas ganham benefícios exclusivos!
          </p>
        </div>

        {loading ? (
          <div className="py-8 space-y-3">
            <div className="h-16 bg-line/30 rounded-[18px] animate-pulse" />
            <div className="h-10 bg-line/20 rounded-full animate-pulse" />
            <div className="h-10 bg-line/20 rounded-full animate-pulse" />
          </div>
        ) : (
          <>
            {/* Card de Benefício Duplo */}
            <div className="bg-brand-tint/60 border border-brand/20 p-3.5 rounded-[18px] text-center space-y-1 select-none">
              <span className="text-[11px] font-bold font-sans uppercase tracking-wider text-brand block">
                Benefício Especial
              </span>
              <p className="font-sans text-[14px] font-semibold text-ink leading-snug">
                Sua amiga ganha <span className="text-brand font-bold">{formatCurrency(refereeReward)}</span> e você recebe <span className="text-brand font-bold">{formatCurrency(referrerReward)}</span> direto na sua carteira!
              </p>
            </div>

            {/* Código Exclusivo da Cliente */}
            <div className="bg-surface-soft border border-line rounded-[16px] p-3 flex items-center justify-between gap-2">
              <div className="text-left">
                <span className="text-[10px] font-bold uppercase tracking-wider text-ink-soft block">
                  Seu código exclusivo
                </span>
                <span className="font-mono text-[16px] font-bold text-ink tracking-wider block mt-0.5 select-all">
                  {referralCode}
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyCode}
                className="h-8 px-3 rounded-full border border-line bg-surface text-ink font-sans text-[12px] font-medium hover:bg-brand-tint/40 flex items-center gap-1.5 transition-all shrink-0 active:scale-95"
              >
                {copiedCode ? (
                  <>
                    <Check size={13} className="text-success" />
                    <span>Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy size={13} />
                    <span>Copiar</span>
                  </>
                )}
              </button>
            </div>

            {/* Ações de Compartilhamento */}
            <div className="pt-1 flex flex-col gap-2.5">
              <a
                href={`https://api.whatsapp.com/send?text=${encodeURIComponent(whatsappMsg)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="h-11 px-4 rounded-full bg-[#25D366] hover:bg-[#20ba59] text-white font-sans text-[14px] font-semibold flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.98]"
              >
                <Share2 size={16} />
                <span>Enviar pelo WhatsApp</span>
              </a>

              <button
                type="button"
                onClick={handleCopyLink}
                className="h-11 px-4 rounded-full border border-line bg-surface text-ink font-sans text-[14px] font-medium hover:bg-brand-tint/30 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              >
                {copiedLink ? (
                  <>
                    <Check size={16} className="text-success" />
                    <span>Link Completo Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy size={16} />
                    <span>Copiar link de convite</span>
                  </>
                )}
              </button>
            </div>

            {/* Minipainel de Estatísticas da Cliente */}
            <div className="pt-2 border-t border-line/60">
              <span className="text-[11px] font-bold uppercase tracking-wider text-ink-soft block mb-2 text-left">
                Suas Indicações
              </span>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-surface-soft border border-line/60 rounded-[14px] p-2 text-center">
                  <span className="font-display text-[17px] font-bold text-ink block leading-tight">
                    {stats.totalFriends}
                  </span>
                  <span className="text-[10px] text-ink-soft block mt-0.5 leading-tight">
                    Amigas
                  </span>
                </div>

                <div className="bg-surface-soft border border-line/60 rounded-[14px] p-2 text-center">
                  <span className="font-display text-[17px] font-bold text-success block leading-tight">
                    {stats.completedFriends}
                  </span>
                  <span className="text-[10px] text-ink-soft block mt-0.5 leading-tight">
                    Atendidas
                  </span>
                </div>

                <div className="bg-surface-soft border border-line/60 rounded-[14px] p-2 text-center">
                  <span className="font-display text-[17px] font-bold text-brand block leading-tight">
                    {formatCurrency(stats.totalBonusEarned)}
                  </span>
                  <span className="text-[10px] text-ink-soft block mt-0.5 leading-tight">
                    Ganhos
                  </span>
                </div>
              </div>
            </div>

            {/* Link Secundário para Carteira */}
            <div className="pt-1">
              <a
                href={`/${tenant_slug}/carteira`}
                className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-brand hover:underline"
              >
                <Wallet size={14} />
                <span>Ver meu saldo e extrato na Carteira</span>
                <ArrowRight size={12} />
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
