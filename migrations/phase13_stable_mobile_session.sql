-- ==============================================================================
-- Migração Fase 43: Sessão Persistente de Celular / Device Identifier (C3 - P0)
-- ==============================================================================
-- 1. Adiciona a coluna device_id à tabela cap_refresh_tokens
-- 2. Cria índice para otimização de consultas por device_id
-- ==============================================================================

ALTER TABLE public.cap_refresh_tokens 
ADD COLUMN IF NOT EXISTS device_id TEXT;

CREATE INDEX IF NOT EXISTS idx_cap_refresh_tokens_device 
ON public.cap_refresh_tokens(device_id);
