/**
 * Utilitário para rastreamento de afiliados e parceiros do SaaS OperaBeauty (Fase 45 - F4)
 * Permite capturar ?ref=CODIGO, validar no backend e armazenar no localStorage (30 dias).
 */

const STORAGE_KEY = 'operabeauty_saas_ref';
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export async function captureReferralFromUrl() {
  if (typeof window === 'undefined') return null;

  try {
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref');

    if (!refCode) {
      return getStoredReferral();
    }

    const cleanCode = refCode.trim().toUpperCase();

    // Validar com o backend
    const res = await fetch(`/api/resellers/validate/${cleanCode}`);
    if (res.ok) {
      const data = await res.json();
      if (data.valid) {
        const referralData = {
          code: cleanCode,
          reseller_id: data.reseller_id,
          reseller_name: data.reseller_name,
          benefit: data.benefit || '1 mês grátis para o seu salão',
          capturedAt: Date.now(),
          expiresAt: Date.now() + THIRTY_DAYS_MS
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(referralData));
        return referralData;
      }
    }
  } catch (err) {
    console.warn('[ReferralTracker] Falha ao capturar código de indicação:', err);
  }

  return getStoredReferral();
}

export function getStoredReferral() {
  if (typeof window === 'undefined') return null;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const data = JSON.parse(raw);
    if (data && data.expiresAt && data.expiresAt > Date.now()) {
      return data;
    }

    // Expirou
    localStorage.removeItem(STORAGE_KEY);
    return null;
  } catch {
    return null;
  }
}

export function clearStoredReferral() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
  }
}
