/**
 * Utilitários de Formatação Numérica, Monetária e Temporal (PT-BR)
 * Garante conformidade com as regras H1 e C11 do Plano de Melhorias:
 * - Numerais alinhados e consistentes (Intl.NumberFormat pt-BR)
 * - Valores monetários canônicos (R$ 0,00)
 * - Fuso horário estrito America/Sao_Paulo sem desvios de timezone
 */

export const DEFAULT_TIMEZONE = 'America/Sao_Paulo';

/**
 * Formata um valor numérico para a moeda brasileira (BRL).
 * @param {number|string} value - Valor a ser formatado
 * @returns {string} - Exemplo: "R$ 0,00", "R$ 1.250,50"
 */
export const formatCurrency = (value) => {
  const num = Number(value);
  const safeVal = isNaN(num) ? 0 : num;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safeVal);
};

/**
 * Formata um número no padrão brasileiro com separador de milhar.
 * @param {number|string} value - Valor a ser formatado
 * @param {number} [decimals=0] - Casas decimais
 * @returns {string} - Exemplo: "1.250", "42,5"
 */
export const formatNumber = (value, decimals = 0) => {
  const num = Number(value);
  const safeVal = isNaN(num) ? 0 : num;
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(safeVal);
};

/**
 * Formata uma porcentagem no padrão brasileiro.
 * @param {number|string} value - Valor (ex: 0.15 para 15% ou 15 dependendo de isRawRatio)
 * @param {boolean} [isRawRatio=false] - Se true, 0.15 vira 15%
 * @returns {string} - Exemplo: "15%", "0%"
 */
export const formatPercent = (value, isRawRatio = false) => {
  const num = Number(value);
  const safeVal = isNaN(num) ? 0 : num;
  const ratio = isRawRatio ? safeVal : safeVal / 100;
  return new Intl.NumberFormat('pt-BR', {
    style: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(ratio);
};

/**
 * Converte de forma segura uma data string YYYY-MM-DD em Date sem deslocamento de fuso.
 * Se passada uma string pura YYYY-MM-DD, instancia no meio-dia local para nunca retroagir o dia.
 * @param {string|Date} dateInput 
 * @returns {Date|null}
 */
export const parseLocalDate = (dateInput) => {
  if (!dateInput) return null;
  if (dateInput instanceof Date) return dateInput;
  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
    const [year, month, day] = dateInput.split('-').map(Number);
    return new Date(year, month - 1, day, 12, 0, 0);
  }
  return new Date(dateInput);
};

/**
 * Formata data no padrão brasileiro com fuso estrito America/Sao_Paulo (C11).
 * Previne o bug de virada de dia (ex: 2026-10-23 virando 22/10).
 * @param {string|Date} dateInput 
 * @param {'short'|'long'|'weekday'} [style='short']
 * @returns {string} - Ex: "23/10/2026" ou "23 de outubro de 2026"
 */
export const formatDate = (dateInput, style = 'short') => {
  if (!dateInput) return '—';

  // Otimização para strings puras YYYY-MM-DD (DATE do Postgres)
  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
    const [year, month, day] = dateInput.split('-');
    if (style === 'short') {
      return `${day}/${month}/${year}`;
    }
  }

  const dateObj = parseLocalDate(dateInput);
  if (!dateObj || isNaN(dateObj.getTime())) return '—';

  if (style === 'long') {
    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: DEFAULT_TIMEZONE,
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    }).format(dateObj);
  }

  if (style === 'weekday') {
    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: DEFAULT_TIMEZONE,
      weekday: 'long',
      day: '2-digit',
      month: 'long'
    }).format(dateObj);
  }

  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: DEFAULT_TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(dateObj);
};

/**
 * Formata horário no padrão 24 horas no fuso America/Sao_Paulo (C11).
 * @param {string|Date} dateInput 
 * @returns {string} - Ex: "14:30"
 */
export const formatTime = (dateInput) => {
  if (!dateInput) return '—';
  const dateObj = typeof dateInput === 'string' && dateInput.includes(':') && !dateInput.includes('T')
    ? new Date(`1970-01-01T${dateInput.slice(0, 5)}:00Z`)
    : new Date(dateInput);

  if (isNaN(dateObj.getTime())) return '—';

  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: DEFAULT_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(dateObj);
};

/**
 * Formata data e horário combinados no fuso America/Sao_Paulo (C11).
 * @param {string|Date} dateInput 
 * @returns {string} - Ex: "23/10/2026 às 14:30"
 */
export const formatDateTime = (dateInput) => {
  if (!dateInput) return '—';
  const dateObj = new Date(dateInput);
  if (isNaN(dateObj.getTime())) return '—';

  const datePart = new Intl.DateTimeFormat('pt-BR', {
    timeZone: DEFAULT_TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(dateObj);

  const timePart = new Intl.DateTimeFormat('pt-BR', {
    timeZone: DEFAULT_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(dateObj);

  return `${datePart} às ${timePart}`;
};
