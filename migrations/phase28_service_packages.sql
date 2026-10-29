-- ==============================================================================
-- FASE 44 - ITEM D13 (P2): PACOTES DE SESSÕES (DRENAGEM, MASSAGEM, ESTÉTICA, ETC.)
-- ==============================================================================

-- 1. Tabela de Modelos de Pacotes ofertados pelo salão
CREATE TABLE IF NOT EXISTS public.cap_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.cap_tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    service_id UUID NOT NULL REFERENCES public.cap_services(id) ON DELETE CASCADE,
    total_sessions INTEGER NOT NULL CHECK (total_sessions > 0),
    price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
    validity_days INTEGER NOT NULL DEFAULT 90 CHECK (validity_days > 0),
    min_interval_days INTEGER NOT NULL DEFAULT 0 CHECK (min_interval_days >= 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para cap_packages
CREATE INDEX IF NOT EXISTS idx_cap_packages_tenant ON public.cap_packages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cap_packages_service ON public.cap_packages(service_id);

-- RLS para cap_packages
ALTER TABLE public.cap_packages ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'cap_packages' AND policyname = 'tenant_isolation_packages'
    ) THEN
        CREATE POLICY tenant_isolation_packages ON public.cap_packages
            FOR ALL USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID);
    END IF;
END $$;

-- 2. Tabela de Pacotes Adquiridos por Clientes (Saldo de Sessões)
CREATE TABLE IF NOT EXISTS public.cap_client_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.cap_tenants(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.cap_clients(id) ON DELETE CASCADE,
    package_id UUID NOT NULL REFERENCES public.cap_packages(id) ON DELETE RESTRICT,
    service_id UUID NOT NULL REFERENCES public.cap_services(id) ON DELETE RESTRICT,
    total_sessions INTEGER NOT NULL CHECK (total_sessions > 0),
    used_sessions INTEGER NOT NULL DEFAULT 0 CHECK (used_sessions >= 0),
    remaining_sessions INTEGER NOT NULL CHECK (remaining_sessions >= 0),
    price_paid NUMERIC(10,2) NOT NULL CHECK (price_paid >= 0),
    payment_method TEXT NOT NULL DEFAULT 'pix',
    installments INTEGER NOT NULL DEFAULT 1 CHECK (installments >= 1),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'expired', 'cancelled')),
    purchased_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    last_session_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para cap_client_packages
CREATE INDEX IF NOT EXISTS idx_cap_client_packages_tenant ON public.cap_client_packages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cap_client_packages_client ON public.cap_client_packages(client_id);
CREATE INDEX IF NOT EXISTS idx_cap_client_packages_service ON public.cap_client_packages(service_id);
CREATE INDEX IF NOT EXISTS idx_cap_client_packages_status ON public.cap_client_packages(status);

-- RLS para cap_client_packages
ALTER TABLE public.cap_client_packages ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'cap_client_packages' AND policyname = 'tenant_isolation_client_packages'
    ) THEN
        CREATE POLICY tenant_isolation_client_packages ON public.cap_client_packages
            FOR ALL USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID);
    END IF;
END $$;

-- 3. Tabela de Histórico de Consumo / Estorno de Sessões
CREATE TABLE IF NOT EXISTS public.cap_package_usages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.cap_tenants(id) ON DELETE CASCADE,
    client_package_id UUID NOT NULL REFERENCES public.cap_client_packages(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES public.cap_appointments(id) ON DELETE SET NULL,
    session_number INTEGER NOT NULL,
    action TEXT NOT NULL DEFAULT 'consume' CHECK (action IN ('consume', 'refund', 'adjustment')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para cap_package_usages
CREATE INDEX IF NOT EXISTS idx_cap_package_usages_tenant ON public.cap_package_usages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cap_package_usages_pkg ON public.cap_package_usages(client_package_id);
CREATE INDEX IF NOT EXISTS idx_cap_package_usages_appt ON public.cap_package_usages(appointment_id);

-- RLS para cap_package_usages
ALTER TABLE public.cap_package_usages ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'cap_package_usages' AND policyname = 'tenant_isolation_package_usages'
    ) THEN
        CREATE POLICY tenant_isolation_package_usages ON public.cap_package_usages
            FOR ALL USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID);
    END IF;
END $$;

-- 4. Extensão de cap_appointments para vincular pacote utilizado
ALTER TABLE public.cap_appointments
    ADD COLUMN IF NOT EXISTS client_package_id UUID REFERENCES public.cap_client_packages(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS is_package_session BOOLEAN NOT NULL DEFAULT FALSE;

-- 5. Cadastro da Feature Flag 'packages' e Habilitação nos Planos Premium e Enterprise
INSERT INTO public.cap_feature_flags (name, description, is_active_global)
VALUES ('packages', 'Gestão de pacotes de sessões pré-pagos e controle de saldo', TRUE)
ON CONFLICT (name) DO UPDATE SET is_active_global = TRUE;

-- Adiciona 'packages' no JSONB features dos planos elegíveis
UPDATE public.cap_plans
SET features = CASE 
    WHEN features ? 'packages' THEN features
    ELSE features || '["packages"]'::jsonb
END
WHERE name IN ('Premium', 'Enterprise');

-- 6. Concessão de Privilégios ao papel opera_app (Princípio de Menor Privilégio C5)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'opera_app') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.cap_packages TO opera_app;
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.cap_client_packages TO opera_app;
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.cap_package_usages TO opera_app;
        GRANT SELECT, UPDATE ON public.cap_appointments TO opera_app;
    END IF;
END $$;
