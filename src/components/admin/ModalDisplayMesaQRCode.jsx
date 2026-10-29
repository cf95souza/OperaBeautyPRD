import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Printer, 
  Download, 
  QrCode, 
  Sparkles, 
  ExternalLink,
  Check, 
  Smartphone, 
  Calendar,
  Camera
} from 'lucide-react';
import QRCode from 'qrcode';
import { api } from '../../lib/api';
import { useNotification } from '../../context/NotificationProvider';

export default function ModalDisplayMesaQRCode({ isOpen, onClose, tenant, onQrGenerated }) {
  const { showSuccess, showError } = useNotification();
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [gerando, setGerando] = useState(true);
  const displayRef = useRef(null);
  const hasRegisteredRef = useRef(false);

  const publicUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/${tenant?.slug || ''}`
    : `https://operabeauty.com/${tenant?.slug || ''}`;

  const displayUrl = publicUrl.replace(/^https?:\/\//, '');

  useEffect(() => {
    if (isOpen && tenant?.slug) {
      gerarQrCode();
      if (!hasRegisteredRef.current) {
        hasRegisteredRef.current = true;
        registrarGeracao();
      }
    } else if (!isOpen) {
      hasRegisteredRef.current = false;
    }
  }, [isOpen, tenant?.slug]);

  const gerarQrCode = async () => {
    try {
      setGerando(true);
      const urlToEncode = typeof window !== 'undefined' 
        ? `${window.location.origin}/${tenant?.slug || ''}`
        : `https://operabeauty.com/${tenant?.slug || ''}`;

      let url = '';
      try {
        if (QRCode && typeof QRCode.toDataURL === 'function') {
          url = await QRCode.toDataURL(urlToEncode, {
            width: 800,
            margin: 2,
            color: {
              dark: '#1c1917', // stone-900
              light: '#ffffff'
            },
            errorCorrectionLevel: 'H'
          });
        }
      } catch (qrErr) {
        console.warn('Aviso: falha na geração local do QRCode, usando gerador nativo alternativo:', qrErr);
      }

      if (!url) {
        // Fallback seguro de alta definição
        url = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(urlToEncode)}&margin=10`;
      }

      setQrDataUrl(url);
    } catch (err) {
      console.error('Erro ao gerar imagem de QR Code:', err);
      showError('Não foi possível gerar a imagem do QR Code.');
    } finally {
      setGerando(false);
    }
  };

  const registrarGeracao = async () => {
    try {
      await api.onboarding.markQrGenerated();
      if (onQrGenerated) {
        onQrGenerated();
      }
    } catch (err) {
      console.warn('Não foi possível registrar evento de QR Code no banco:', err);
    }
  };

  const handleImprimir = () => {
    window.print();
  };

  const handleBaixarImagem = () => {
    if (!qrDataUrl) return;

    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `qrcode-agendamento-${tenant?.slug || 'salao'}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showSuccess('QR Code baixado com sucesso!');
  };

  if (!isOpen) return null;

  const iniciaisSalão = tenant?.name 
    ? tenant.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : 'OB';

  return (
    <>
      {/* Estilos dedicados para impressão limpa em folha A4 / Display de Mesa */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-display-area, #printable-display-area * {
            visibility: visible !important;
          }
          #printable-display-area {
            position: fixed !important;
            left: 50% !important;
            top: 50% !important;
            transform: translate(-50%, -50%) !important;
            width: 148mm !important;
            height: 210mm !important;
            max-width: 100% !important;
            padding: 12mm !important;
            box-shadow: none !important;
            border: 1.5mm solid #8E3B4E !important;
            border-radius: 12mm !important;
            background: #ffffff !important;
            page-break-inside: avoid !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-fade-in no-print">
        <div 
          className="relative w-full max-w-2xl max-h-[92vh] bg-white rounded-[26px] border border-line shadow-2xl flex flex-col overflow-hidden animate-scale-up"
          onClick={e => e.stopPropagation()}
        >
          {/* Topo do Modal */}
          <div className="px-6 py-4 border-b border-line/60 flex items-center justify-between bg-stone-50/70">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-brand-tint text-brand flex items-center justify-center shrink-0">
                <QrCode className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-display text-lg font-bold text-stone-900 tracking-tight">
                  Display de Balcão & QR Code
                </h3>
                <p className="text-xs text-stone-500">
                  Pronto para imprimir e posicionar na recepção do seu salão
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
              aria-label="Fechar modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Área de Visualização com Scroll */}
          <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center bg-stone-100/60">
            
            {/* O Display de Balcão Físico (Arte Impressa) */}
            <div 
              ref={displayRef}
              id="printable-display-area"
              className="w-full max-w-md bg-white rounded-[28px] border-2 border-brand/20 shadow-xl p-8 flex flex-col items-center text-center relative overflow-hidden transition-transform duration-300 hover:shadow-2xl"
              style={{
                boxShadow: '0 20px 40px -15px rgba(142, 59, 78, 0.12)'
              }}
            >
              {/* Elementos Decorativos Sutis */}
              <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-brand via-brand-tint to-brand opacity-80" />
              <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-brand-tint/20 blur-2xl" />
              <div className="absolute -bottom-12 -left-12 w-32 h-32 rounded-full bg-brand-tint/20 blur-2xl" />

              {/* Logo / Monograma do Salão */}
              <div className="mb-4 relative">
                {tenant?.logo_url ? (
                  <img 
                    src={tenant.logo_url} 
                    alt={tenant.name} 
                    className="w-16 h-16 rounded-2xl object-cover border-2 border-brand/20 shadow-sm"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand via-[#a34b5f] to-brand text-white flex items-center justify-center font-display text-2xl font-bold shadow-md border-2 border-white">
                    {iniciaisSalão}
                  </div>
                )}
              </div>

              {/* Nome do Salão */}
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight mb-1">
                {tenant?.name || 'Nosso Espaço'}
              </h2>
              
              <div className="w-8 h-0.5 bg-brand/30 my-2 rounded-full" />

              {/* Chamada Principal de Agendamento */}
              <h3 className="font-display text-lg font-bold text-brand mt-1 mb-2">
                Agende seu horário pelo celular
              </h3>
              
              <p className="text-xs text-stone-500 max-w-xs leading-relaxed mb-5">
                Aponte a câmera para o código abaixo para escolher seu procedimento e horário sem esperas.
              </p>

              {/* Moldura Centralizada do QR Code */}
              <div className="p-3.5 bg-white rounded-3xl border border-stone-200 shadow-md mb-5 group relative">
                {gerando ? (
                  <div className="w-48 h-48 flex items-center justify-center bg-stone-50 rounded-2xl">
                    <div className="w-8 h-8 border-3 border-brand/20 border-t-brand rounded-full animate-spin" />
                  </div>
                ) : qrDataUrl ? (
                  <img 
                    src={qrDataUrl} 
                    alt={`QR Code de agendamento ${tenant?.name}`} 
                    className="w-48 h-48 rounded-xl object-contain"
                  />
                ) : (
                  <div className="w-48 h-48 flex items-center justify-center bg-stone-50 text-stone-400 text-xs">
                    Falha ao renderizar QR Code
                  </div>
                )}
              </div>

              {/* 3 Passos Rápidos Ilustrados */}
              <div className="grid grid-cols-3 gap-2 w-full pt-4 border-t border-stone-100 mb-5">
                <div className="flex flex-col items-center text-center">
                  <div className="w-7 h-7 rounded-full bg-brand-tint/60 text-brand flex items-center justify-center mb-1">
                    <Camera className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[10px] font-semibold text-stone-700">1. Abra a câmera</span>
                </div>
                
                <div className="flex flex-col items-center text-center">
                  <div className="w-7 h-7 rounded-full bg-brand-tint/60 text-brand flex items-center justify-center mb-1">
                    <QrCode className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[10px] font-semibold text-stone-700">2. Aponte pro código</span>
                </div>

                <div className="flex flex-col items-center text-center">
                  <div className="w-7 h-7 rounded-full bg-brand-tint/60 text-brand flex items-center justify-center mb-1">
                    <Calendar className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[10px] font-semibold text-stone-700">3. Escolha o horário</span>
                </div>
              </div>

              {/* Link Público Formatado */}
              <div className="text-[11px] font-medium text-stone-400 bg-stone-50 px-3 py-1.5 rounded-full border border-stone-200/60 max-w-full truncate">
                {displayUrl}
              </div>
            </div>

          </div>

          {/* Rodapé com Botões de Ação */}
          <div className="px-6 py-4 border-t border-line/60 bg-white flex flex-col sm:flex-row items-center justify-between gap-3">
            <a
              href={publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold text-brand hover:underline flex items-center gap-1.5"
            >
              <span>Abrir link de agendamento em nova aba</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleBaixarImagem}
                disabled={gerando || !qrDataUrl}
                className="flex-1 sm:flex-initial px-4 py-2.5 rounded-full border border-stone-300 text-stone-700 hover:bg-stone-100 text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Download className="w-4 h-4" />
                <span>Baixar Imagem</span>
              </button>

              <button
                type="button"
                onClick={handleImprimir}
                disabled={gerando || !qrDataUrl}
                className="flex-1 sm:flex-initial px-5 py-2.5 rounded-full bg-brand text-white hover:brightness-110 text-xs font-semibold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Display</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
