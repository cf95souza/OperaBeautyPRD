-- ==============================================================================
-- FASE 44 - ITEM D4 (P1): VÁRIOS SERVIÇOS POR VISITA (CARRINHO, ESTOQUE & COMISSÃO)
-- ==============================================================================

-- 1. Descrição Curta no Catálogo de Serviços (D4)
ALTER TABLE public.cap_services 
    ADD COLUMN IF NOT EXISTS short_description TEXT;

-- 2. Tabela de Múltiplos Serviços por Agendamento / Visita (D4)
CREATE TABLE IF NOT EXISTS public.cap_appointment_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID NOT NULL REFERENCES public.cap_appointments(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES public.cap_services(id) ON DELETE RESTRICT,
    tenant_id UUID NOT NULL REFERENCES public.cap_tenants(id) ON DELETE CASCADE,
    price NUMERIC(10,2) NOT NULL,
    duration_minutes INTEGER NOT NULL,
    commission_percentage NUMERIC(5,2) DEFAULT 0,
    commission_amount NUMERIC(10,2) DEFAULT 0,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices de Performance
CREATE INDEX IF NOT EXISTS idx_appointment_services_appt ON public.cap_appointment_services(appointment_id);
CREATE INDEX IF NOT EXISTS idx_appointment_services_svc ON public.cap_appointment_services(service_id);
CREATE INDEX IF NOT EXISTS idx_appointment_services_tenant ON public.cap_appointment_services(tenant_id);

-- Habilitação de RLS (Row Level Security)
ALTER TABLE public.cap_appointment_services ENABLE ROW LEVEL SECURITY;

-- Políticas de Isolamento Multi-Tenant
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'cap_appointment_services' AND policyname = 'tenant_isolation_appointment_services'
    ) THEN
        CREATE POLICY tenant_isolation_appointment_services ON public.cap_appointment_services
            FOR ALL USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID);
    END IF;
END $$;

-- Permissões para o papel opera_app
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'opera_app') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.cap_appointment_services TO opera_app;
    END IF;
END $$;
