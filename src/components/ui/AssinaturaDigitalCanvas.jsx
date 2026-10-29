import React, { useRef, useState, useEffect } from 'react';
import { RotateCcw, PenTool, Check } from 'lucide-react';

export const AssinaturaDigitalCanvas = ({ value, onChange, disabled = false }) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(Boolean(value));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const ratio = Math.max(window.devicePixelRatio || 1, 1);

    // Ajusta a resolução física vs CSS
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    ctx.scale(ratio, ratio);

    ctx.strokeStyle = '#1c1917';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Se já havia uma assinatura anterior salva em imagem dataURL, carregar
    if (value && typeof value === 'string' && value.startsWith('data:image')) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, rect.width, rect.height);
        setHasSignature(true);
      };
      img.src = value;
    }
  }, []);

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if (e.touches && e.touches[0]) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const startDrawing = (e) => {
    if (disabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { x, y } = getCoordinates(e);

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing || disabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { x, y } = getCoordinates(e);

    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL('image/png');
    if (onChange) {
      onChange(dataUrl);
    }
  };

  const handleClear = () => {
    if (disabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();

    ctx.clearRect(0, 0, rect.width, rect.height);
    setHasSignature(false);
    if (onChange) {
      onChange(null);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="relative bg-white border-2 border-dashed border-line hover:border-brand/60 rounded-2xl overflow-hidden transition-colors shadow-2xs">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="w-full h-36 touch-none cursor-crosshair block"
        />

        {!hasSignature && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-secondary/50 gap-2">
            <PenTool className="w-4 h-4" />
            <span className="text-xs font-serif italic">Assine digitalmente neste espaço</span>
          </div>
        )}

        <div className="absolute bottom-2 right-2 flex items-center gap-1.5">
          {hasSignature && (
            <button
              type="button"
              onClick={handleClear}
              disabled={disabled}
              className="px-2.5 py-1 bg-stone-100/90 hover:bg-stone-200 text-stone-700 rounded-lg text-[11px] font-medium flex items-center gap-1 transition-colors backdrop-blur-xs cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Limpar</span>
            </button>
          )}
        </div>
      </div>
      <p className="text-[11px] text-secondary">
        Assinatura eletrônica com valor probatório nos termos da MP 2.200-2/2001 e Lei 14.063/2020.
      </p>
    </div>
  );
};

export default AssinaturaDigitalCanvas;
