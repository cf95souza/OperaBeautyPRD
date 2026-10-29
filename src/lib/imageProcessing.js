/**
 * Utilitários de Processamento, Análise e Recorte de Imagens (Item A6)
 * Conversão WebP e Detecção de Fundo Sólido para Logos
 */

/**
 * Analisa os 4 cantos de um canvas para detectar se a imagem possui fundo sólido (sem transparência)
 */
export function detectSolidBackground(canvas) {
  if (!canvas) return { isSolid: false };
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return { isSolid: false };

  const w = canvas.width;
  const h = canvas.height;
  if (w < 4 || h < 4) return { isSolid: false };

  // Amostras dos 4 cantos e bordas médias
  const points = [
    [2, 2],
    [w - 3, 2],
    [2, h - 3],
    [w - 3, h - 3],
    [Math.floor(w / 2), 2],
    [Math.floor(w / 2), h - 3]
  ];

  let solidCount = 0;
  const colors = [];

  for (const [x, y] of points) {
    try {
      const pixel = ctx.getImageData(x, y, 1, 1).data;
      const alpha = pixel[3];
      // Se tiver transparência (alpha < 240), não é fundo sólido
      if (alpha < 240) {
        return { isSolid: false };
      }
      solidCount++;
      colors.push({ r: pixel[0], g: pixel[1], b: pixel[2] });
    } catch (e) {
      return { isSolid: false };
    }
  }

  // Verifica se as cores dos cantos são homogêneas (diferença pequena)
  if (solidCount === points.length && colors.length > 0) {
    const first = colors[0];
    const isUniform = colors.every(c => 
      Math.abs(c.r - first.r) < 25 &&
      Math.abs(c.g - first.g) < 25 &&
      Math.abs(c.b - first.b) < 25
    );

    if (isUniform) {
      const isWhite = first.r > 235 && first.g > 235 && first.b > 235;
      const hex = `#${((1 << 24) + (first.r << 16) + (first.g << 8) + first.b).toString(16).slice(1)}`;
      return {
        isSolid: true,
        isWhite,
        hexColor: hex.toUpperCase()
      };
    }
  }

  return { isSolid: false };
}

/**
 * Converte um Canvas em Blob WebP otimizado
 */
export function canvasToWebpBlob(canvas, quality = 0.88) {
  return new Promise((resolve, reject) => {
    if (!canvas) {
      reject(new Error('Canvas inválido.'));
      return;
    }

    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        // Fallback para PNG se o navegador rejeitar WebP
        canvas.toBlob((pngBlob) => {
          if (pngBlob) resolve(pngBlob);
          else reject(new Error('Falha ao exportar imagem recortada.'));
        }, 'image/png');
      }
    }, 'image/webp', quality);
  });
}
