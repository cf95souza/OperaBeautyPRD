-- ==============================================================================
-- Migração: Phase 48 - Imagem de Capa/Fachada dedicada (cover_url) para cap_tenants
-- ==============================================================================
-- >>> UP >>>
ALTER TABLE public.cap_tenants
  ADD COLUMN IF NOT EXISTS cover_url TEXT;

-- >>> DOWN >>>
ALTER TABLE public.cap_tenants DROP COLUMN IF EXISTS cover_url;

