-- Migration Phase 9.2: Salon Memberships (Assinaturas do Salão)

-- 1. Tabela de Planos de Assinatura do Salão
CREATE TABLE IF NOT EXISTS public.cap_salon_memberships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.cap_tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('monthly', 'yearly')),
    service_id UUID NOT NULL REFERENCES public.cap_services(id) ON DELETE CASCADE,
    usage_limit INTEGER NOT NULL DEFAULT 4 CHECK (usage_limit >= 0), -- 0 para ilimitado
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexadores para agilizar a busca de planos por Tenant
CREATE INDEX IF NOT EXISTS idx_salon_memberships_tenant ON public.cap_salon_memberships(tenant_id);

-- 2. Tabela de Inscrições de Clientes nas Assinaturas
CREATE TABLE IF NOT EXISTS public.cap_client_memberships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.cap_tenants(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.cap_clients(id) ON DELETE CASCADE,
    membership_id UUID NOT NULL REFERENCES public.cap_salon_memberships(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('active', 'paused', 'cancelled', 'past_due')),
    current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    current_period_end TIMESTAMPTZ NOT NULL,
    remaining_sessions INTEGER NOT NULL CHECK (remaining_sessions >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Impedir mais de uma assinatura ativa por cliente para o mesmo plano no mesmo salão
    CONSTRAINT unique_client_active_membership UNIQUE (client_id, membership_id)
);

CREATE INDEX IF NOT EXISTS idx_client_memberships_client ON public.cap_client_memberships(client_id);
CREATE INDEX IF NOT EXISTS idx_client_memberships_tenant ON public.cap_client_memberships(tenant_id);

-- 3. Adicionar coluna de referência ao agendamento para controle de débito de créditos do clube
ALTER TABLE public.cap_appointments 
ADD COLUMN IF NOT EXISTS client_membership_id UUID REFERENCES public.cap_client_memberships(id) ON DELETE SET NULL;
