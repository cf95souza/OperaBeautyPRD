import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, X, ShieldCheck, ArrowRight } from 'lucide-react';
import { Botao } from '../ui/Botao';

export const ModalSolicitarEmail = ({
  isOpen,
  onClose,
  tenantSlug,
  clientName = ''
}) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleGoToProfile = () => {
    sessionStorage.setItem('operabeauty_dismiss_email_modal', 'true');
    onClose();
    navigate(`/${tenantSlug}/perfil`);
  };

  const handleClose = () => {
    sessionStorage.setItem('operabeauty_dismiss_email_modal', 'true');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-[400px] bg-white rounded-[26px] shadow-2xl border border-line p-6 flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
        
        {/* Botão Fechar X */}
        <button
          type="button"
          onClick={handleClose}
          aria-label="Fechar"
          className="absolute top-4 right-4 w-8 h-8 rounded-full border border-line text-ink-soft hover:text-ink flex items-center justify-center hover:bg-stone-100 transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>

        {/* Ícone de Destaque */}
        <div className="w-14 h-14 rounded-2xl bg-brand-tint flex items-center justify-center text-brand mb-4 shadow-xs">
          <Mail size={26} strokeWidth={2} />
        </div>

        {/* Título */}
        <h3 className="font-display text-[21px] font-semibold text-ink leading-tight mb-2">
          Cadastre seu E-mail de Recuperação
        </h3>

        {/* Mensagem */}
        <p className="text-[13px] font-sans text-ink-soft leading-relaxed mb-5">
          {clientName ? `Olá, ${clientName}! ` : ''}
          Adicione um e-mail ao seu perfil para nunca perder o acesso aos seus agendamentos e poder redefinir sua senha com 1 clique sempre que precisar.
        </p>

        {/* Card explicativo */}
        <div className="w-full bg-brand-tint/40 border border-brand/15 rounded-2xl p-3.5 text-left mb-6 flex items-start gap-3">
          <ShieldCheck size={20} className="text-brand shrink-0 mt-0.5" />
          <div className="text-xs text-ink-soft leading-snug">
            <span className="font-semibold text-ink block mb-0.5">Recuperação rápida e gratuita</span>
            Caso esqueça sua senha, enviaremos um código seguro direto na sua caixa de entrada.
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="w-full space-y-2.5">
          <Botao
            tipo="button"
            variante="primario"
            tamanho="lg"
            className="w-full shadow-md"
            aoClicar={handleGoToProfile}
            iconeFim={<ArrowRight size={18} />}
          >
            OK, Cadastrar E-mail
          </Botao>

          <button
            type="button"
            onClick={handleClose}
            className="w-full py-2 text-xs font-semibold text-ink-soft hover:text-ink transition-colors cursor-pointer"
          >
            Lembrar mais tarde
          </button>
        </div>

      </div>
    </div>
  );
};

export default ModalSolicitarEmail;

