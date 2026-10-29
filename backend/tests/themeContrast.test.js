import { 
  WHITE_LABEL_THEMES, 
  getContrastRatio, 
  checkWcagAA, 
  generateCustomPalette 
} from '../utils/themeTokens.js';

describe('Temas White-Label e Acessibilidade WCAG 2.1 (Item A5)', () => {

  test('Todos os 6 temas oficiais devem ter contraste >= 4.5:1 para texto com on_brand ou fundo', () => {
    const themeKeys = Object.keys(WHITE_LABEL_THEMES);
    expect(themeKeys).toEqual(['rose', 'nude', 'lavender', 'sage', 'noir', 'bordeaux']);

    themeKeys.forEach((key) => {
      const theme = WHITE_LABEL_THEMES[key];
      
      // Contraste do texto do botão (on_brand) sobre a cor brand
      const brandContrast = getContrastRatio(theme.brand, theme.on_brand);
      expect(brandContrast).toBeGreaterThanOrEqual(4.5);

      // Contraste do texto de leitura ink (#2B2327) sobre o fundo bg
      const bgTextContrast = getContrastRatio(theme.ink, theme.bg);
      expect(bgTextContrast).toBeGreaterThanOrEqual(4.5);

      // Contraste de ícones / destaque (>= 3:1)
      const accentContrast = getContrastRatio(theme.brand, theme.tint);
      expect(accentContrast).toBeGreaterThanOrEqual(3.0);
    });
  });

  test('Geração de paleta personalizada para cor escura válida deve passar no WCAG AA', () => {
    // Azul marinho escuro
    const palette = generateCustomPalette('#1E3A8A');
    expect(palette.passesWcagAA).toBe(true);
    expect(palette.contrastRatio).toBeGreaterThanOrEqual(4.5);
    expect(palette.on_brand).toBe('#FFFFFF');
    expect(palette.tint).toBeDefined();
    expect(palette.bg).toBeDefined();
  });

  test('Cor personalizada com baixo contraste (ex: amarelo claro) deve ser detectada e ajustada', () => {
    // Amarelo claro sem contraste suficiente com branco nem com fundo
    const palette = generateCustomPalette('#FEF08A');
    expect(palette.passesWcagAA).toBe(false);
    expect(palette.suggestedBrandHex).not.toBe('#FEF08A');
    
    // O ajuste sugerido deve atingir o contraste mínimo de 4.5:1
    const adjustedContrast = getContrastRatio(palette.suggestedBrandHex, '#FFFFFF');
    expect(adjustedContrast).toBeGreaterThanOrEqual(4.5);
  });

  test('checkWcagAA deve avaliar corretamente contraste para texto e ícones', () => {
    // Preto sobre branco
    const highContrast = checkWcagAA('#000000', '#FFFFFF');
    expect(highContrast.passes).toBe(true);
    expect(highContrast.ratio).toBeGreaterThan(15);

    // Cinza claro sobre branco (baixo contraste)
    const lowContrast = checkWcagAA('#D1D5DB', '#FFFFFF');
    expect(lowContrast.passes).toBe(false);
  });

});
