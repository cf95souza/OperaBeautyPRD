-- ==============================================================================
-- FASE 23 - LISTA DE ESPERA INTELIGENTE E REMARCAÇÃO (D6)
-- ==============================================================================

-- >>> UP >>>
CREATE TABLE IF NOT EXISTS public.cap_waitlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.cap_tenants(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.cap_clients(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES public.cap_services(id) ON DELETE CASCADE,
    staff_id UUID REFERENCES public.cap_staff(id) ON DELETE SET NULL,
    desired_date DATE NOT NULL,
    time_preference VARCHAR(20) DEFAULT 'any',
    status VARCHAR(20) DEFAULT 'waiting',
    offered_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    appointment_id UUID REFERENCES public.cap_appointments(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cap_waitlist_pending_order ON public.cap_waitlist(tenant_id, desired_date, status, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_cap_waitlist_expired_offers ON public.cap_waitlist(status, expires_at) WHERE status = 'offered';

ALTER TABLE public.cap_waitlist ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cap_waitlist' AND policyname = 'tenant_isolation_waitlist') THEN
        CREATE POLICY tenant_isolation_waitlist ON public.cap_waitlist
            FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'opera_app') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.cap_waitlist TO opera_app;
    END IF;
END $$;

-- >>> DOWN >>>
-- DROP TABLE IF EXISTS public.cap_waitlist CASCADE;

