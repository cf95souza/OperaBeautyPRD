/**
 * Módulo de Temas White-Label e Cálculo de Contraste WCAG 2.1
 * Baseado na Seção 2.9 e 3.8 do Plano de Melhorias OperaBeauty
 */

export const WHITE_LABEL_THEMES = {
  rose: {
    id: 'rose',
    name: 'Rosé',
    bg: '#FBF7F5',
    brand: '#8E3B4E',
    tint: '#F6E4E4',
    accent: '#B76E79',
    on_brand: '#FFFFFF',
    ink: '#2B2327',
    ink_soft: '#6F6168',
    gold: '#C9A66B',
    line: '#EADFDC'
  },
  nude: {
    id: 'nude',
    name: 'Nude',
    bg: '#FAF6F0',
    brand: '#7A5C43',
    tint: '#EFE3D3',
    accent: '#B08968',
    on_brand: '#FFFFFF',
    ink: '#2B2327',
    ink_soft: '#6F6168',
    gold: '#C9A66B',
    line: '#E7DDD0'
  },
  lavender: {
    id: 'lavender',
    name: 'Lavanda',
    bg: '#F8F6FB',
    brand: '#5E4B8B',
    tint: '#E9E3F5',
    accent: '#8E7CC3',
    on_brand: '#FFFFFF',
    ink: '#2B2327',
    ink_soft: '#6F6168',
    gold: '#C9A66B',
    line: '#E2DBED'
  },
  sage: {
    id: 'sage',
    name: 'Sálvia',
    bg: '#F5F7F3',
    brand: '#3F6B55',
    tint: '#E2EBDF',
    accent: '#7FA38A',
    on_brand: '#FFFFFF',
    ink: '#2B2327',
    ink_soft: '#6F6168',
    gold: '#C9A66B',
    line: '#DAE3D7'
  },
  noir: {
    id: 'noir',
    name: 'Preto e Dourado',
    bg: '#F6F4F0',
    brand: '#1F1B1C',
    tint: '#E9E4DA',
    accent: '#C9A66B',
    on_brand: '#C9A66B',
    ink: '#2B2327',
    ink_soft: '#6F6168',
    gold: '#C9A66B',
    line: '#DFD8CC'
  },
  bordeaux: {
    id: 'bordeaux',
    name: 'Bordô',
    bg: '#FBF6F6',
    brand: '#6E1F34',
    tint: '#F1DDE0',
    accent: '#A63D5A',
    on_brand: '#FFFFFF',
    ink: '#2B2327',
    ink_soft: '#6F6168',
    gold: '#C9A66B',
    line: '#EBD4D8'
  }
};

/**
 * Converte hex (#RRGGBB ou #RGB) em objeto {r, g, b}
 */
export function hexToRgb(hex) {
  if (!hex || typeof hex !== 'string') return null;
  let cleanHex = hex.replace('#', '').trim();
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map(c => c + c).join('');
  }
  if (cleanHex.length !== 6) return null;
  const num = parseInt(cleanHex, 16);
  if (isNaN(num)) return null;
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
}

/**
 * Converte {r, g, b} em hex string #RRGGBB
 */
export function rgbToHex(r, g, b) {
  const clamp = v => Math.max(0, Math.min(255, Math.round(v)));
  const toHex = v => clamp(v).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

/**
 * Converte RGB para HSL
 */
export function rgbToHsl(r, g, b) {
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;
  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rNorm: h = (gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0); break;
      case gNorm: h = (bNorm - rNorm) / d + 2; break;
      case bNorm: h = (rNorm - gNorm) / d + 4; break;
    }
    h /= 6;
  }
  return { h: h * 360, s, l };
}

/**
 * Converte HSL para RGB
 */
export function hslToRgb(h, s, l) {
  let r, g, b;
  const hNorm = (h % 360) / 360;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p, q, t) => {
      let tAdj = t;
      if (tAdj < 0) tAdj += 1;
      if (tAdj > 1) tAdj -= 1;
      if (tAdj < 1 / 6) return p + (q - p) * 6 * tAdj;
      if (tAdj < 1 / 2) return q;
      if (tAdj < 2 / 3) return p + (q - p) * (2 / 3 - tAdj) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, hNorm + 1 / 3);
    g = hue2rgb(p, q, hNorm);
    b = hue2rgb(p, q, hNorm - 1 / 3);
  }
  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
}

/**
 * Calcula a luminância relativa (WCAG 2.1)
 */
export function getRelativeLuminance(r, g, b) {
  const a = [r, g, b].map(v => {
    const norm = v / 255;
    return norm <= 0.03928 ? norm / 12.92 : Math.pow((norm + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
}

/**
 * Calcula a razão de contraste entre duas cores hex (WCAG 2.1)
 * Retorna valor numérico ex: 4.5, 7.2, 1.2
 */
export function getContrastRatio(hex1, hex2) {
  const rgb1 = hexToRgb(hex1);
  const rgb2 = hexToRgb(hex2);
  if (!rgb1 || !rgb2) return 1;

  const lum1 = getRelativeLuminance(rgb1.r, rgb1.g, rgb1.b);
  const lum2 = getRelativeLuminance(rgb2.r, rgb2.g, rgb2.b);

  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);

  return (brightest + 0.05) / (darkest + 0.05);
}

/**
 * Avalia se o par de cores passa no critério WCAG AA (>= 4.5:1 para texto normal, >= 3:1 para ícones/títulos)
 */
export function checkWcagAA(hexForeground, hexBackground, isIconOrLarge = false) {
  const ratio = getContrastRatio(hexForeground, hexBackground);
  const minRatio = isIconOrLarge ? 3.0 : 4.5;
  return {
    ratio: Math.round(ratio * 10) / 10,
    passes: ratio >= minRatio,
    minRequired: minRatio
  };
}

/**
 * Gera paleta completa e acessível a partir de uma cor hexadecimal escolhida livremente
 * Conforme §2.9 do plano: a cor escolhida é escurecida até atingir contraste >= 4,5:1 com branco
 */
export function generateCustomPalette(chosenBrandHex) {
  const rgb = hexToRgb(chosenBrandHex);
  if (!rgb) {
    throw new Error('Código hexadecimal inválido para a cor da marca.');
  }

  const { h, s, l } = rgbToHsl(rgb.r, rgb.g, rgb.b);

  // 1. brand deve atingir contraste >= 4.5:1 com #FFFFFF (e on_brand branco)
  const contrastWithWhite = getContrastRatio(chosenBrandHex, '#FFFFFF');
  let isContrastOk = contrastWithWhite >= 4.5;

  let suggestedBrandHex = chosenBrandHex;
  let testL = l;

  // Se não atingir 4.5:1 com branco, escurece até atingir
  if (!isContrastOk) {
    while (testL > 0.05) {
      testL -= 0.02;
      const testRgb = hslToRgb(h, Math.min(s, 0.8), testL);
      const testHex = rgbToHex(testRgb.r, testRgb.g, testRgb.b);
      if (getContrastRatio(testHex, '#FFFFFF') >= 4.5) {
        suggestedBrandHex = testHex;
        break;
      }
    }
  }

  // 2. Tint: mesmo matiz, alta luminosidade (~0.93), saturação reduzida
  const tintRgb = hslToRgb(h, Math.min(s, 0.35), 0.93);
  const tint = rgbToHex(tintRgb.r, tintRgb.g, tintRgb.b);

  // 3. Bg: mesmo matiz, ultra suave (~0.975), saturação sutil (~0.1)
  const bgRgb = hslToRgb(h, Math.min(s, 0.15), 0.975);
  const bg = rgbToHex(bgRgb.r, bgRgb.g, bgRgb.b);

  // 4. Accent: brand com luminância ligeiramente mais clara (+0.12)
  const effectiveBrand = isContrastOk ? chosenBrandHex : suggestedBrandHex;
  const effectiveRgb = hexToRgb(effectiveBrand);
  const effectiveHsl = rgbToHsl(effectiveRgb.r, effectiveRgb.g, effectiveRgb.b);
  const accentRgb = hslToRgb(effectiveHsl.h, effectiveHsl.s, Math.min(0.85, effectiveHsl.l + 0.12));
  const accent = rgbToHex(accentRgb.r, accentRgb.g, accentRgb.b);

  // 5. Line: contornos suaves
  const lineRgb = hslToRgb(h, Math.min(s, 0.2), 0.88);
  const line = rgbToHex(lineRgb.r, lineRgb.g, lineRgb.b);

  return {
    id: 'custom',
    name: 'Personalizado',
    brand: chosenBrandHex,
    adjustedBrand: suggestedBrandHex,
    on_brand: '#FFFFFF',
    tint,
    bg,
    accent,
    line,
    ink: '#2B2327',
    ink_soft: '#6F6168',
    gold: '#C9A66B',
    contrastRatio: Math.round(contrastWithWhite * 10) / 10,
    passesWcagAA: isContrastOk,
    suggestedBrandHex
  };
}

/**
 * Retorna os tokens completos do tema informado (seja um dos 6 prontos ou custom)
 */
export function getThemeTokens(themeId, brandHex = null) {
  if (themeId && WHITE_LABEL_THEMES[themeId]) {
    return WHITE_LABEL_THEMES[themeId];
  }
  if (themeId === 'custom' && brandHex) {
    return generateCustomPalette(brandHex);
  }
  return WHITE_LABEL_THEMES.rose;
}
