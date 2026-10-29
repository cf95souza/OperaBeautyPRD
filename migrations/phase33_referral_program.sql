-- ==============================================================================
-- FASE 44: D19 (P2) — PROGRAMA INDIQUE E GANHE (REFERRAL PROGRAM)
-- ==============================================================================

-- >>> UP >>>
-- Parametrização em cap_tenants
ALTER TABLE public.cap_tenants 
    ADD COLUMN IF NOT EXISTS referral_program_active BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS referral_reward_type VARCHAR(20) NOT NULL DEFAULT 'wallet',
    ADD COLUMN IF NOT EXISTS referral_referrer_reward NUMERIC(10,2) NOT NULL DEFAULT 15.00,
    ADD COLUMN IF NOT EXISTS referral_referee_reward NUMERIC(10,2) NOT NULL DEFAULT 15.00,
    ADD COLUMN IF NOT EXISTS referral_trigger VARCHAR(50) NOT NULL DEFAULT 'on_first_completed_appointment',
    ADD COLUMN IF NOT EXISTS referral_custom_message TEXT;

-- Tabela de Rastreamento de Indicações (cap_referrals)
CREATE TABLE IF NOT EXISTS public.cap_referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.cap_tenants(id) ON DELETE CASCADE,
    referrer_id UUID NOT NULL REFERENCES public.cap_clients(id) ON DELETE CASCADE,
    referee_id UUID NOT NULL REFERENCES public.cap_clients(id) ON DELETE CASCADE,
    referral_code VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
    trigger_type VARCHAR(50) NOT NULL DEFAULT 'on_first_completed_appointment',
    referrer_reward_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (referrer_reward_amount >= 0),
    referee_reward_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (referee_reward_amount >= 0),
    appointment_id UUID REFERENCES public.cap_appointments(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    CONSTRAINT uq_referral_tenant_referee UNIQUE (tenant_id, referee_id),
    CONSTRAINT chk_no_self_referral CHECK (referrer_id <> referee_id)
);

-- Índices de Otimização
CREATE INDEX IF NOT EXISTS idx_cap_referrals_tenant_referrer ON public.cap_referrals(tenant_id, referrer_id);
CREATE INDEX IF NOT EXISTS idx_cap_referrals_tenant_status ON public.cap_referrals(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_cap_referrals_code ON public.cap_referrals(tenant_id, referral_code);

-- Row Level Security (RLS) Multi-Tenant
ALTER TABLE public.cap_referrals ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'cap_referrals' AND policyname = 'tenant_isolation_referrals'
    ) THEN
        CREATE POLICY tenant_isolation_referrals ON public.cap_referrals
            FOR ALL
            USING (
                tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
                OR current_setting('app.is_superadmin', true) = 'true'
                OR current_setting('app.bypass_rls', true) = 'true'
            )
            WITH CHECK (
                tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
                OR current_setting('app.is_superadmin', true) = 'true'
                OR current_setting('app.bypass_rls', true) = 'true'
            );
    END IF;
END $$;

-- Concessões C5 (Menor Privilégio para opera_app)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'opera_app') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.cap_referrals TO opera_app;
        GRANT SELECT, UPDATE ON public.cap_tenants TO opera_app;
    END IF;
END $$;
-- <<< UP <<<

-- >>> DOWN >>>
DROP TABLE IF EXISTS public.cap_referrals CASCADE;
ALTER TABLE public.cap_tenants 
    DROP COLUMN IF EXISTS referral_program_active,
    DROP COLUMN IF EXISTS referral_reward_type,
    DROP COLUMN IF EXISTS referral_referrer_reward,
    DROP COLUMN IF EXISTS referral_referee_reward,
    DROP COLUMN IF EXISTS referral_trigger,
    DROP COLUMN IF EXISTS referral_custom_message;
-- <<< DOWN <<<
