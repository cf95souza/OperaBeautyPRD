import React, { useState, useRef, useEffect } from 'react';
import { detectSolidBackground, canvasToWebpBlob } from '../../lib/imageProcessing';

/**
 * Modal de Recorte Guiado de Imagens (Item A6)
 * Proporção fixa por uso, zoom/arraste e exportação WebP com detecção de fundo sólido
 */
export const ModalRecorteImagem = ({
  isOpen,
  onClose,
  file,
  aspectRatio = 1, // 1 para logo/avatar, 16/9 para banners, 4/3 para serviços
  isLogo = false,
  title = 'Ajustar Imagem',
  onCropComplete
}) => {
  const [imageSrc, setImageSrc] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [solidBgWarning, setSolidBgWarning] = useState(null);
  const [processing, setProcessing] = useState(false);

  const imageRef = useRef(null);
  const containerRef = useRef(null);

  // Carrega o arquivo selecionado
  useEffect(() => {
    if (!file) {
      setImageSrc(null);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setImageSrc(e.target.result);
      setZoom(1);
      setPosition({ x: 0, y: 0 });
      setSolidBgWarning(null);
    };
    reader.readAsDataURL(file);
  }, [file]);

  // Analisa se há fundo sólido na logo quando a imagem carrega
  const handleImageLoaded = () => {
    if (!isLogo || !imageRef.current) return;

    try {
      const tempCanvas = document.createElement('canvas');
      const img = imageRef.current;
      tempCanvas.width = 120;
      tempCanvas.height = 120;
      const ctx = tempCanvas.getContext('2d');
      ctx.drawImage(img, 0, 0, 120, 120);

      const check = detectSolidBackground(tempCanvas);
      if (check.isSolid) {
        setSolidBgWarning({
          isWhite: check.isWhite,
          hex: check.hexColor
        });
      } else {
        setSolidBgWarning(null);
      }
    } catch (e) {
      console.warn('Não foi possível verificar fundo sólido:', e);
    }
  };

  // Dragging / Pan
  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch support para mobile
  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      setIsDragging(true);
      setDragStart({ x: touch.clientX - position.x, y: touch.clientY - position.y });
    }
  };

  const handleTouchMove = (e) => {
    if (!isDragging || e.touches.length !== 1) return;
    const touch = e.touches[0];
    setPosition({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y
    });
  };

  const handleConfirmCrop = async () => {
    if (!imageRef.current || !containerRef.current) return;
    setProcessing(true);

    try {
      const img = imageRef.current;
      const container = containerRef.current;
      const containerRect = container.getBoundingClientRect();

      // Dimensões do alvo recortado em alta definição
      const targetWidth = isLogo ? 500 : 1200;
      const targetHeight = Math.round(targetWidth / aspectRatio);

      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');

      // Escala e coordenadas relativas
      const renderedImgWidth = img.width * zoom;
      const renderedImgHeight = img.height * zoom;

      const scaleX = img.naturalWidth / renderedImgWidth;
      const scaleY = img.naturalHeight / renderedImgHeight;

      // Centro do corte em relação à imagem renderizada
      const centerOffsetX = (containerRect.width / 2) - (position.x + (renderedImgWidth / 2));
      const centerOffsetY = (containerRect.height / 2) - (position.y + (renderedImgHeight / 2));

      const sourceWidth = (containerRect.width * scaleX);
      const sourceHeight = (containerRect.height * scaleY);

      const sourceX = (img.naturalWidth / 2) - (sourceWidth / 2) + (centerOffsetX * scaleX);
      const sourceY = (img.naturalHeight / 2) - (sourceHeight / 2) + (centerOffsetY * scaleY);

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      ctx.drawImage(
        img,
        Math.max(0, sourceX),
        Math.max(0, sourceY),
        Math.min(img.naturalWidth, sourceWidth),
        Math.min(img.naturalHeight, sourceHeight),
        0,
        0,
        targetWidth,
        targetHeight
      );

      // Converte para WebP Blob
      const webpBlob = await canvasToWebpBlob(canvas, 0.88);
      const previewUrl = URL.createObjectURL(webpBlob);

      onCropComplete({
        blob: webpBlob,
        previewUrl,
        filename: `${isLogo ? 'logo' : 'banner'}-${Date.now()}.webp`
      });

      onClose();
    } catch (err) {
      console.error('Erro ao recortar imagem:', err);
    } finally {
      setProcessing(false);
    }
  };

  if (!isOpen || !imageSrc) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 md:p-8 shadow-2xl border border-[#EADFDC] flex flex-col max-h-[90vh]">
        {/* Topo do Modal */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#EADFDC]">
          <div>
            <h3 className="font-serif text-xl font-semibold text-[#2B2327]">
              {title}
            </h3>
            <p className="text-xs text-[#6F6168] mt-0.5">
              Arraste e ajuste o zoom para enquadrar a imagem na proporção ideal.
            </p>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#6F6168] hover:bg-[#F6E4E4] hover:text-[#8E3B4E] transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Alerta de Fundo Sólido para Logos */}
        {isLogo && solidBgWarning && (
          <div className="mb-4 bg-[#FBF7F5] border border-[#C9A66B]/50 p-3.5 rounded-2xl flex items-start gap-3">
            <span className="material-symbols-outlined text-[#C9A66B] text-[20px] mt-0.5 shrink-0">
              lightbulb
            </span>
            <div className="text-xs text-[#2B2327]">
              <strong className="font-semibold block text-[#6E1F34]">Dica de Design Editorial:</strong>
              Sua imagem possui fundo sólido ({solidBgWarning.hex}). Para uma integração perfeita com o topo do aplicativo, recomendamos logos com fundo transparente em formato PNG ou WebP.
            </div>
          </div>
        )}

        {/* Área Interativa de Recorte (Viewport) */}
        <div 
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleMouseUp}
          style={{
            aspectRatio: aspectRatio === 1 ? '1 / 1' : `${aspectRatio}`,
            maxHeight: '360px'
          }}
          className="relative w-full mx-auto bg-[#1F1B1C] rounded-2xl overflow-hidden cursor-grab active:cursor-grabbing flex items-center justify-center select-none shadow-inner"
        >
          <img
            ref={imageRef}
            src={imageSrc}
            alt="Para recortar"
            onLoad={handleImageLoaded}
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
              transformOrigin: 'center center',
              transition: isDragging ? 'none' : 'transform 0.05s ease-out',
              maxWidth: 'none',
              maxHeight: 'none',
              pointerEvents: 'none'
            }}
            className="user-select-none"
          />

          {/* Máscara de Guia de Recorte */}
          <div className="absolute inset-0 pointer-events-none border-2 border-white/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]">
            {isLogo && (
              <div className="absolute inset-0 rounded-full border border-dashed border-white/80" />
            )}
          </div>
        </div>

        {/* Controles de Zoom */}
        <div className="mt-5 flex items-center gap-3 px-2">
          <span className="material-symbols-outlined text-[#6F6168] text-[18px]">zoom_out</span>
          <input 
            type="range"
            min="1"
            max="3"
            step="0.05"
            value={zoom}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
            className="flex-1 accent-[#8E3B4E] cursor-pointer"
          />
          <span className="material-symbols-outlined text-[#6F6168] text-[18px]">zoom_in</span>
          <span className="text-xs font-mono text-[#6F6168] w-12 text-right">
            {Math.round(zoom * 100)}%
          </span>
        </div>

        {/* Ações Inferiores */}
        <div className="mt-6 pt-4 border-t border-[#EADFDC] flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-full text-xs font-semibold text-[#6F6168] hover:bg-black/5 transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirmCrop}
            disabled={processing}
            className="px-6 py-2.5 rounded-full text-xs font-semibold bg-[#8E3B4E] text-white hover:opacity-95 shadow-sm transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[16px]">
              {processing ? 'sync' : 'crop'}
            </span>
            {processing ? 'Convertendo WebP...' : 'Confirmar e Aplicar'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalRecorteImagem;
