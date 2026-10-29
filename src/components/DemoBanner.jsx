import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Sparkles, QrCode, X, Smartphone, ExternalLink, ShieldCheck } from 'lucide-react';
import QRCode from 'qrcode';
import { useTenant } from '../context/TenantContext';

import { isDemoTenantSlug } from '../lib/demoUtils';
export { isDemoTenantSlug };

export default function DemoBanner() {
  const { tenant_slug } = useParams();
  const { tenant } = useTenant();
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');

  const isDemo = isDemoTenantSlug(tenant_slug) || Boolean(tenant?.is_demo);

  // Gera o QR Code dinamicamente com base na URL do salão
  useEffect(() => {
    if (isDemo) {
      const demoUrl = typeof window !== 'undefined' 
        ? `${window.location.origin}/${tenant_slug || 'demo'}`
        : 'https://operabeauty.com.br/demo';

      QRCode.toDataURL(demoUrl, {
        width: 280,
        margin: 2,
        color: {
          dark: '#2A2127',
          light: '#FFFFFF'
        }
      })
      .then(url => setQrCodeDataUrl(url))
      .catch(err => console.error('Erro ao gerar QR code:', err));
    }
  }, [isDemo, tenant_slug]);

  if (!isDemo) return null;

  const currentUrl = typeof window !== 'undefined' ? `${window.location.origin}/${tenant_slug || 'demo'}` : '';

  return (
    <>
      {/* Barra Superior Fixa de Demonstração */}
      <div 
        id="demo-banner-topbar" 
        className="sticky top-0 z-50 bg-[#1F171C]/95 backdrop-blur-md text-white border-b border-[#D4AF37]/35 shadow-md px-3 sm:px-4 py-2 transition-all duration-300"
      >
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          
          {/* Lado Esquerdo: Tag e Mensagem */}
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-semibold tracking-wide uppercase bg-gradient-to-r from-[#D4AF37]/25 to-[#E6C665]/20 text-[#F5E6B3] border border-[#D4AF37]/40 shadow-xs shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-[#F5E6B3] animate-pulse" />
              Modo Demonstração
            </span>
            <p className="text-xs text-[#E5D7DE] hidden md:inline truncate">
              Você está testando o app real do salão como cliente. Agende, navegue e confira os serviços à vontade.
            </p>
          </div>

          {/* Lado Direito: Ações */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Botão QR Code (Testar no Celular) */}
            <button
              id="btn-demo-qrcode"
              onClick={() => setShowQrModal(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 sm:py-1.5 rounded-full text-xs font-medium text-[#E5D7DE] bg-white/10 hover:bg-white/20 hover:text-white border border-white/10 transition-colors cursor-pointer"
              title="Abrir no celular via QR Code"
            >
              <QrCode className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span className="hidden sm:inline">Testar no Celular</span>
            </button>

            {/* Botão Voltar para o Site Principal */}
            <Link
              id="btn-demo-back-to-landing"
              to="/"
              className="inline-flex items-center gap-1.5 px-3 py-1 sm:py-1.5 rounded-full text-xs font-medium text-white bg-white/15 hover:bg-white/25 border border-white/15 transition-all cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Voltar ao Site</span>
            </Link>

            {/* CTA Criar Meu Salão */}
            <Link
              id="btn-demo-create-salon"
              to="/planos"
              className="inline-flex items-center gap-1.5 px-3.5 py-1 sm:py-1.5 rounded-full text-xs font-bold text-[#1F171C] bg-gradient-to-r from-[#D4AF37] to-[#F3DB83] hover:brightness-110 shadow-xs transition-transform active:scale-95 cursor-pointer"
            >
              <span>Criar Meu Salão</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Modal Interativo com QR Code para Teste no Smartphone */}
      {showQrModal && (
        <div 
          id="demo-qrcode-modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in"
          onClick={() => setShowQrModal(false)}
        >
          <div 
            className="bg-[#1C161A] text-white border border-[#D4AF37]/30 rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl relative text-center space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Botão Fechar */}
            <button 
              onClick={() => setShowQrModal(false)}
              className="absolute top-4 right-4 text-[#C4B3BC] hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
              aria-label="Fechar"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Cabeçalho do Modal */}
            <div className="space-y-1">
              <div className="w-12 h-12 rounded-2xl bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center mx-auto text-[#D4AF37] mb-3">
                <Smartphone className="w-6 h-6" />
              </div>
              <h3 className="font-serif text-xl font-bold text-[#FBF7F4]">
                Experimente no Celular
              </h3>
              <p className="text-xs text-[#B5A5AE] leading-relaxed">
                Aponte a câmera do seu smartphone para o QR Code abaixo e navegue no PWA real como cliente do salão.
              </p>
            </div>

            {/* Imagem do QR Code */}
            <div className="bg-white p-4 rounded-2xl shadow-inner inline-block mx-auto border-4 border-[#D4AF37]/20">
              {qrCodeDataUrl ? (
                <img 
                  src={qrCodeDataUrl} 
                  alt="QR Code do Salão de Demonstração" 
                  className="w-48 h-48 sm:w-56 sm:h-56 mx-auto block"
                />
              ) : (
                <div className="w-48 h-48 sm:w-56 sm:h-56 flex items-center justify-center text-xs text-gray-500">
                  Gerando QR Code...
                </div>
              )}
            </div>

            {/* Link Direto */}
            <div className="space-y-2 pt-1">
              <p className="text-[11px] text-[#A3929C] truncate">
                Link da demonstração:
              </p>
              <a
                href={currentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-[#E6C665] hover:underline font-medium break-all"
              >
                <span>{currentUrl}</span>
                <ExternalLink className="w-3.5 h-3.5 shrink-0" />
              </a>
            </div>

            {/* Badge de Segurança */}
            <div className="pt-2 flex items-center justify-center gap-1.5 text-[11px] text-[#8E7E88]">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Ambiente seguro de testes sem cobranças reais.</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
