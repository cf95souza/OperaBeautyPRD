-- ==============================================================================
-- FASE 49: Estabilidade de Sessão e Prevenção de Desconexões Espúrias
-- 1. Garante todas as colunas de segurança e revogação em cap_refresh_tokens
-- 2. Suporta Grace Period (30s) em concorrência de rede com revoked_at
-- 3. Criação de índices otimizados
-- ==============================================================================

ALTER TABLE public.cap_refresh_tokens
  ADD COLUMN IF NOT EXISTS is_revoked BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS revoked BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS family_id UUID,
  ADD COLUMN IF NOT EXISTS device_id TEXT,
  ADD COLUMN IF NOT EXISTS ip_address TEXT,
  ADD COLUMN IF NOT EXISTS user_agent TEXT,
  ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ;

-- Sincronizar is_revoked a partir de revoked existente
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'cap_refresh_tokens' 
      AND column_name = 'revoked'
  ) THEN
    UPDATE public.cap_refresh_tokens 
    SET is_revoked = TRUE 
    WHERE revoked = TRUE AND is_revoked = FALSE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_cap_refresh_tokens_family_active 
ON public.cap_refresh_tokens(family_id, is_revoked, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cap_refresh_tokens_device 
ON public.cap_refresh_tokens(device_id);
