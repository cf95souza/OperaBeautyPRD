-- ==============================================================================
-- FASE 44 - ITEM D12 (P2): VARIAÇÕES DE PREÇO E EXTRAS NO SERVIÇO
-- ==============================================================================

-- 1. Tabela de Variações de Serviço (ex: Unha Curta, Média, Longa / Cabelo Curto, Médio, Longo)
CREATE TABLE IF NOT EXISTS public.cap_service_variations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id UUID NOT NULL REFERENCES public.cap_services(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES public.cap_tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    price NUMERIC(10,2) NOT NULL,
    duration_minutes INTEGER NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para cap_service_variations
CREATE INDEX IF NOT EXISTS idx_cap_service_variations_service ON public.cap_service_variations(service_id);
CREATE INDEX IF NOT EXISTS idx_cap_service_variations_tenant ON public.cap_service_variations(tenant_id);

-- RLS para cap_service_variations
ALTER TABLE public.cap_service_variations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'cap_service_variations' AND policyname = 'tenant_isolation_service_variations'
    ) THEN
        CREATE POLICY tenant_isolation_service_variations ON public.cap_service_variations
            FOR ALL USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID);
    END IF;
END $$;

-- 2. Tabela de Extras / Adicionais do Serviço (ex: Nail Art, Esmaltação em Gel, Spa dos Pés)
CREATE TABLE IF NOT EXISTS public.cap_service_extras (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id UUID NOT NULL REFERENCES public.cap_services(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES public.cap_tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    price NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    duration_minutes INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para cap_service_extras
CREATE INDEX IF NOT EXISTS idx_cap_service_extras_service ON public.cap_service_extras(service_id);
CREATE INDEX IF NOT EXISTS idx_cap_service_extras_tenant ON public.cap_service_extras(tenant_id);

-- RLS para cap_service_extras
ALTER TABLE public.cap_service_extras ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'cap_service_extras' AND policyname = 'tenant_isolation_service_extras'
    ) THEN
        CREATE POLICY tenant_isolation_service_extras ON public.cap_service_extras
            FOR ALL USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID);
    END IF;
END $$;

-- 3. Adicionar colunas de Variação e Extras no registro da visita (cap_appointment_services)
ALTER TABLE public.cap_appointment_services 
    ADD COLUMN IF NOT EXISTS variation_id UUID REFERENCES public.cap_service_variations(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS variation_name TEXT,
    ADD COLUMN IF NOT EXISTS selected_extras JSONB DEFAULT '[]'::jsonb;

-- 4. Adicionar colunas em cap_appointments para compatibilidade direta de histórico
ALTER TABLE public.cap_appointments
    ADD COLUMN IF NOT EXISTS variation_id UUID REFERENCES public.cap_service_variations(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS variation_name TEXT,
    ADD COLUMN IF NOT EXISTS selected_extras JSONB DEFAULT '[]'::jsonb;

-- 5. Concessão de Privilégios ao papel opera_app (Princípio de Menor Privilégio C5)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'opera_app') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.cap_service_variations TO opera_app;
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.cap_service_extras TO opera_app;
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.cap_appointment_services TO opera_app;
        GRANT SELECT, INSERT, UPDATE ON public.cap_appointments TO opera_app;
    END IF;
END $$;
