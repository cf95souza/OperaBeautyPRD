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
  Camera,
  Loader2
} from 'lucide-react';
import QRCode from 'qrcode';
import { api } from '../../lib/api';
import { useNotification } from '../../context/NotificationProvider';

/**
 * Desenha a arte completa do Display de Balcão em alta resolução em um HTML5 Canvas
 */
async function drawDisplayToCanvas(tenant, qrDataUrl) {
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 1750;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Não foi possível inicializar o contexto 2D do Canvas.');

  const brandColor = tenant?.primary_color || tenant?.brand_hex || '#8E3B4E';
  const salonName = tenant?.name || 'Nosso Espaço';
  const slug = tenant?.slug || 'salao';
  const publicUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/${slug}`
    : `https://operabeauty.tech/${slug}`;
  const displayUrl = publicUrl.replace(/^https?:\/\//, '');

  const roundRect = (x, y, w, h, r) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  };

  // 1. Fundo Branco Geral
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 2. Card Principal com Margem e Cantos Arredondados
  const cardX = 60;
  const cardY = 60;
  const cardW = canvas.width - 120;
  const cardH = canvas.height - 120;
  const cardRadius = 46;

  ctx.save();
  roundRect(cardX, cardY, cardW, cardH, cardRadius);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = brandColor;
  ctx.stroke();
  ctx.clip();

  // Topo decorativo com gradiente
  const grad = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY);
  grad.addColorStop(0, brandColor);
  grad.addColorStop(0.5, '#b5586d');
  grad.addColorStop(1, brandColor);
  ctx.fillStyle = grad;
  ctx.fillRect(cardX, cardY, cardW, 18);
  ctx.restore();

  // 3. Logo ou Monograma
  let logoDrawn = false;
  if (tenant?.logo_url) {
    try {
      const logoImg = new Image();
      logoImg.crossOrigin = 'anonymous';
      await new Promise((resolve, reject) => {
        logoImg.onload = resolve;
        logoImg.onerror = reject;
        logoImg.src = tenant.logo_url;
      });

      const logoSize = 136;
      const logoX = (canvas.width - logoSize) / 2;
      const logoY = 125;

      ctx.save();
      roundRect(logoX, logoY, logoSize, logoSize, 30);
      ctx.clip();
      ctx.drawImage(logoImg, logoX, logoY, logoSize, logoSize);
      ctx.restore();

      ctx.save();
      roundRect(logoX, logoY, logoSize, logoSize, 30);
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(142, 59, 78, 0.25)';
      ctx.stroke();
      ctx.restore();

      logoDrawn = true;
    } catch (e) {
      console.warn('Fallback para monograma elegante no canvas:', e);
    }
  }

  if (!logoDrawn) {
    const logoSize = 136;
    const logoX = (canvas.width - logoSize) / 2;
    const logoY = 125;
    const initials = salonName.split(' ').filter(Boolean).map(n => n[0]).slice(0, 2).join('').toUpperCase() || 'OB';

    ctx.save();
    roundRect(logoX, logoY, logoSize, logoSize, 30);
    const monoGrad = ctx.createLinearGradient(logoX, logoY, logoX + logoSize, logoY + logoSize);
    monoGrad.addColorStop(0, brandColor);
    monoGrad.addColorStop(1, '#a34b5f');
    ctx.fillStyle = monoGrad;
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 54px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(initials, canvas.width / 2, logoY + (logoSize / 2));
    ctx.restore();
  }

  // 4. Nome do Salão
  ctx.fillStyle = '#1c1917';
  ctx.font = 'bold 50px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(salonName, canvas.width / 2, 330);

  // 5. Linha Divisória
  ctx.fillStyle = brandColor;
  ctx.globalAlpha = 0.45;
  roundRect((canvas.width - 70) / 2, 355, 70, 5, 2.5);
  ctx.fill();
  ctx.globalAlpha = 1.0;

  // 6. Chamada Principal
  ctx.fillStyle = brandColor;
  ctx.font = 'bold 36px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Agende seu horário pelo celular', canvas.width / 2, 420);

  // 7. Subtítulo Explicativo
  ctx.fillStyle = '#78716c';
  ctx.font = '22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Aponte a câmera para o código abaixo para escolher seu', canvas.width / 2, 470);
  ctx.fillText('procedimento e horário sem esperas.', canvas.width / 2, 502);

  // 8. Moldura do QR Code
  const qrFrameSize = 510;
  const qrFrameX = (canvas.width - qrFrameSize) / 2;
  const qrFrameY = 540;

  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.08)';
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 12;
  roundRect(qrFrameX, qrFrameY, qrFrameSize, qrFrameSize, 36);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.restore();

  ctx.save();
  roundRect(qrFrameX, qrFrameY, qrFrameSize, qrFrameSize, 36);
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#e7e5e4';
  ctx.stroke();
  ctx.restore();

  // 9. Imagem do QR Code
  if (qrDataUrl) {
    const qrImg = new Image();
    await new Promise((resolve, reject) => {
      qrImg.onload = resolve;
      qrImg.onerror = reject;
      qrImg.src = qrDataUrl;
    });

    const qrSize = 430;
    const qrX = (canvas.width - qrSize) / 2;
    const qrY = qrFrameY + (qrFrameSize - qrSize) / 2;
    ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
  }

  // 10. 3 Passos Ilustrados
  const stepsY = 1130;
  const stepColWidth = 320;
  const stepsStartX = (canvas.width - (3 * stepColWidth)) / 2;

  ctx.beginPath();
  ctx.moveTo(cardX + 80, stepsY - 30);
  ctx.lineTo(cardX + cardW - 80, stepsY - 30);
  ctx.strokeStyle = '#f5f5f4';
  ctx.lineWidth = 2;
  ctx.stroke();

  const stepsData = [
    { num: '1', title: 'Abra a câmera' },
    { num: '2', title: 'Aponte pro código' },
    { num: '3', title: 'Escolha o horário' }
  ];

  stepsData.forEach((st, idx) => {
    const colX = stepsStartX + (idx * stepColWidth) + (stepColWidth / 2);

    ctx.save();
    ctx.beginPath();
    ctx.arc(colX, stepsY + 20, 24, 0, Math.PI * 2);
    ctx.fillStyle = '#fdf2f4';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(142, 59, 78, 0.2)';
    ctx.stroke();

    ctx.fillStyle = brandColor;
    ctx.font = 'bold 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(st.num, colX, stepsY + 21);
    ctx.restore();

    ctx.fillStyle = '#44403c';
    ctx.font = '600 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(st.title, colX, stepsY + 75);
  });

  // 11. Badge da URL
  const badgeY = 1270;
  const badgeText = displayUrl;
  ctx.font = 'bold 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  const textWidth = ctx.measureText(badgeText).width;
  const badgeW = textWidth + 70;
  const badgeH = 54;
  const badgeX = (canvas.width - badgeW) / 2;

  ctx.save();
  roundRect(badgeX, badgeY, badgeW, badgeH, 27);
  ctx.fillStyle = '#f5f5f4';
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#e7e5e4';
  ctx.stroke();

  ctx.fillStyle = '#57534e';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(badgeText, canvas.width / 2, badgeY + (badgeH / 2));
  ctx.restore();

  // 12. Rodapé
  ctx.fillStyle = '#a8a29e';
  ctx.font = '600 17px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('OPERA BEAUTY • EXPERIÊNCIA DIGITAL', canvas.width / 2, 1400);

  return canvas.toDataURL('image/png');
}

export default function ModalDisplayMesaQRCode({ isOpen, onClose, tenant, onQrGenerated }) {
  const { showSuccess, showError } = useNotification();
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [gerando, setGerando] = useState(true);
  const [baixando, setBaixando] = useState(false);
  const displayRef = useRef(null);
  const hasRegisteredRef = useRef(false);

  const publicUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/${tenant?.slug || ''}`
    : `https://operabeauty.tech/${tenant?.slug || ''}`;

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
        : `https://operabeauty.tech/${tenant?.slug || ''}`;

      let url = '';
      try {
        if (QRCode && typeof QRCode.toDataURL === 'function') {
          url = await QRCode.toDataURL(urlToEncode, {
            width: 800,
            margin: 2,
            color: {
              dark: '#1c1917',
              light: '#ffffff'
            },
            errorCorrectionLevel: 'H'
          });
        }
      } catch (qrErr) {
        console.warn('Aviso: falha na geração local do QRCode, usando gerador nativo alternativo:', qrErr);
      }

      if (!url) {
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

  /**
   * Impressão isolada e perfeita via Iframe temporário (elimina páginas em branco)
   */
  const handleImprimir = () => {
    if (!qrDataUrl) return;

    try {
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.top = '-9999px';
      iframe.style.left = '-9999px';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);

      const brandColor = tenant?.primary_color || tenant?.brand_hex || '#8E3B4E';
      const salonName = tenant?.name || 'Nosso Espaço';
      const logoUrl = tenant?.logo_url;
      const initials = salonName.split(' ').filter(Boolean).map(n => n[0]).slice(0, 2).join('').toUpperCase() || 'OB';

      const printHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Display de Balcão - ${salonName}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 10mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    html, body {
      width: 100%;
      height: 100%;
      background: #ffffff;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .display-card {
      width: 140mm;
      min-height: 200mm;
      border: 3mm solid ${brandColor};
      border-radius: 16mm;
      padding: 10mm 9mm;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      background: #ffffff;
      position: relative;
    }
    .accent-bar {
      width: 100%;
      height: 5px;
      background: ${brandColor};
      border-radius: 3px;
      margin-bottom: 6mm;
    }
    .logo-box {
      width: 22mm;
      height: 22mm;
      border-radius: 5mm;
      margin-bottom: 4mm;
      display: flex;
      align-items: center;
      justify-content: center;
      background: ${brandColor};
      color: #ffffff;
      font-size: 24pt;
      font-weight: bold;
      overflow: hidden;
      border: 1px solid #e7e5e4;
    }
    .logo-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .salon-title {
      font-size: 20pt;
      font-weight: 800;
      color: #1c1917;
      margin-bottom: 2mm;
      letter-spacing: -0.5px;
      line-height: 1.15;
    }
    .divider {
      width: 34px;
      height: 2.5px;
      background: ${brandColor};
      opacity: 0.45;
      border-radius: 2px;
      margin: 2mm auto 3mm;
    }
    .callout {
      font-size: 13.5pt;
      font-weight: 700;
      color: ${brandColor};
      margin-bottom: 1.5mm;
    }
    .instruction {
      font-size: 9.5pt;
      color: #78716c;
      max-width: 95mm;
      line-height: 1.35;
      margin-bottom: 5mm;
    }
    .qr-container {
      padding: 3.5mm;
      background: #ffffff;
      border: 1.5px solid #e7e5e4;
      border-radius: 5.5mm;
      margin-bottom: 5mm;
      box-shadow: 0 4px 10px rgba(0,0,0,0.06);
    }
    .qr-code {
      width: 55mm;
      height: 55mm;
      display: block;
    }
    .steps-container {
      display: flex;
      justify-content: space-between;
      width: 100%;
      max-width: 105mm;
      padding-top: 3.5mm;
      border-top: 1px solid #f5f5f4;
      margin-bottom: 4mm;
    }
    .step-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      font-size: 8pt;
      font-weight: 600;
      color: #44403c;
    }
    .step-badge {
      width: 5.5mm;
      height: 5.5mm;
      border-radius: 50%;
      background: #fdf2f4;
      color: ${brandColor};
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 7.5pt;
      font-weight: bold;
      margin-bottom: 1mm;
      border: 1px solid rgba(142, 59, 78, 0.2);
    }
    .url-pill {
      font-size: 8.5pt;
      font-weight: 600;
      color: #57534e;
      background: #f5f5f4;
      padding: 1.8mm 5mm;
      border-radius: 12px;
      border: 1px solid #e7e5e4;
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .powered {
      margin-top: 3mm;
      font-size: 6.5pt;
      color: #a8a29e;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
  </style>
</head>
<body>
  <div class="display-card">
    <div class="accent-bar"></div>
    <div class="logo-box">
      ${logoUrl ? `<img src="${logoUrl}" class="logo-img" alt="${salonName}" />` : initials}
    </div>
    <h1 class="salon-title">${salonName}</h1>
    <div class="divider"></div>
    <h2 class="callout">Agende seu horário pelo celular</h2>
    <p class="instruction">Aponte a câmera para o código abaixo para escolher seu procedimento e horário sem esperas.</p>
    <div class="qr-container">
      <img src="${qrDataUrl}" class="qr-code" alt="QR Code de agendamento" />
    </div>
    <div class="steps-container">
      <div class="step-item">
        <div class="step-badge">1</div>
        <span>Abra a câmera</span>
      </div>
      <div class="step-item">
        <div class="step-badge">2</div>
        <span>Aponte pro código</span>
      </div>
      <div class="step-item">
        <div class="step-badge">3</div>
        <span>Escolha o horário</span>
      </div>
    </div>
    <div class="url-pill">${displayUrl}</div>
    <div class="powered">OperaBeauty • Experiência Digital</div>
  </div>
</body>
</html>`;

      const doc = iframe.contentWindow.document;
      doc.open();
      doc.write(printHtml);
      doc.close();

      setTimeout(() => {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 3000);
      }, 400);
    } catch (err) {
      console.error('Erro na impressão isolada:', err);
      window.print();
    }
  };

  /**
   * Baixa a arte completa do Display de Balcão em Alta Resolução (PNG 1200x1750)
   */
  const handleBaixarDisplayCompleto = async () => {
    if (!qrDataUrl) return;

    try {
      setBaixando(true);
      const dataUrl = await drawDisplayToCanvas(tenant, qrDataUrl);

      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `display-balcao-${tenant?.slug || 'salao'}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showSuccess('Display de Balcão completo baixado em alta resolução!');
    } catch (err) {
      console.error('Erro ao gerar imagem completa do display:', err);
      // Fallback gracioso
      const link = document.createElement('a');
      link.href = qrDataUrl;
      link.download = `qrcode-agendamento-${tenant?.slug || 'salao'}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showSuccess('QR Code baixado com sucesso!');
    } finally {
      setBaixando(false);
    }
  };

  /**
   * Baixa apenas a imagem do QR Code avulsa
   */
  const handleBaixarApenasQrCode = (e) => {
    e.preventDefault();
    if (!qrDataUrl) return;

    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `qrcode-matriz-${tenant?.slug || 'salao'}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showSuccess('QR Code avulso baixado com sucesso!');
  };

  if (!isOpen) return null;

  const iniciaisSalão = tenant?.name 
    ? tenant.name.split(' ').filter(Boolean).map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : 'OB';

  return (
    <>
      {/* Estilos dedicados de impressão de contingência */}
      <style>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            background: #ffffff !important;
          }
        }
      `}</style>

      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-fade-in">
        <div 
          className="relative w-full max-w-2xl max-h-[92vh] bg-white rounded-[26px] border border-line shadow-2xl flex flex-col overflow-hidden animate-scale-up"
          onClick={e => e.stopPropagation()}
        >
          {/* Topo do Modal */}
          <div className="px-6 py-4 border-b border-line/60 flex items-center justify-between bg-stone-50/70 no-print">
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
          <div className="px-6 py-4 border-t border-line/60 bg-white flex flex-col sm:flex-row items-center justify-between gap-4 no-print">
            <div className="flex flex-col items-start gap-1">
              <a
                href={publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold text-brand hover:underline flex items-center gap-1.5"
              >
                <span>Abrir link de agendamento em nova aba</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button
                type="button"
                onClick={handleBaixarApenasQrCode}
                className="text-[11px] text-stone-400 hover:text-stone-700 hover:underline cursor-pointer flex items-center gap-1"
              >
                <QrCode className="w-3 h-3" />
                <span>Baixar apenas o QR Code avulso (.png)</span>
              </button>
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleBaixarDisplayCompleto}
                disabled={gerando || !qrDataUrl || baixando}
                className="flex-1 sm:flex-initial px-4 py-2.5 rounded-full border border-stone-300 text-stone-700 hover:bg-stone-100 text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {baixando ? (
                  <Loader2 className="w-4 h-4 animate-spin text-brand" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                <span>{baixando ? 'Gerando Imagem...' : 'Baixar Imagem do Display'}</span>
              </button>

              <button
                type="button"
                onClick={handleImprimir}
                disabled={gerando || !qrDataUrl}
                className="flex-1 sm:flex-initial px-5 py-2.5 rounded-full bg-brand text-white hover:brightness-110 text-xs font-semibold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
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
