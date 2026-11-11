-- ==============================================================================
-- FASE 49: Estabilidade de Sessão e Prevenção de Desconexões Espúrias
-- 1. Coluna revoked_at para suportar Grace Period (30s) em concorrência de rede
-- 2. Índice otimizado para recuperação rápida da família de refresh tokens
-- ==============================================================================

ALTER TABLE public.cap_refresh_tokens
  ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_cap_refresh_tokens_family_active 
ON public.cap_refresh_tokens(family_id, is_revoked, created_at DESC);
