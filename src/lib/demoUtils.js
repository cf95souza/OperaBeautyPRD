/**
 * Utilitários e helpers para identificação e controle do Salão de Demonstração
 * Governança: Fase 45 (Item F2 P1)
 */

export const isDemoTenantSlug = (slug) => {
  if (!slug) return false;
  const lower = String(slug).trim().toLowerCase();
  return ['demo', 'studiodemo', 'studiothais', 'studiodatha'].includes(lower);
};

export const getDemoUrl = (origin = 'https://operabeauty.com.br') => {
  return `${origin}/demo`;
};
