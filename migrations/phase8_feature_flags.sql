-- Tabela para cadastrar as flags disponíveis na plataforma
CREATE TABLE IF NOT EXISTS public.cap_feature_flags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    is_active_global BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela para associar flags a tenants específicos
CREATE TABLE IF NOT EXISTS public.cap_tenant_feature_flags (
    tenant_id UUID NOT NULL REFERENCES public.cap_tenants(id) ON DELETE CASCADE,
    feature_flag_id UUID NOT NULL REFERENCES public.cap_feature_flags(id) ON DELETE CASCADE,
    is_enabled BOOLEAN DEFAULT TRUE,
    PRIMARY KEY (tenant_id, feature_flag_id)
);
