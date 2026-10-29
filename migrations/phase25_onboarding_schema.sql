-- ==============================================================================
-- FASE 44 - ITEM D11 (P1): ONBOARDING GUIADO DO SALÃO & DISPLAY COM QR CODE
-- ==============================================================================

-- >>> UP >>>

-- 1. Extensão de colunas de onboarding na tabela de salões (cap_tenants)
ALTER TABLE public.cap_tenants 
    ADD COLUMN IF NOT EXISTS onboarding_dismissed BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS qr_code_generated_at TIMESTAMPTZ;

-- 2. Índice para consultas de performance de onboarding
CREATE INDEX IF NOT EXISTS idx_cap_tenants_onboarding_status 
    ON public.cap_tenants(id, onboarding_dismissed);

-- 3. Concessão de Privilégios ao papel opera_app (Princípio de Menor Privilégio C5)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'opera_app') THEN
        GRANT SELECT, UPDATE ON public.cap_tenants TO opera_app;
    END IF;
END $$;

-- <<< UP <<<

-- >>> DOWN >>>
-- Rollback seguro (não destrutivo)
-- <<< DOWN <<<
