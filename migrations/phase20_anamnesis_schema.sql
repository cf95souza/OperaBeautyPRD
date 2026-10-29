-- ==============================================================================
-- FASE 44 / CRM: ESTRUTURAÇÃO DE FICHA DE ANAMNESE DINÂMICA (MULTI-TENANT)
-- ==============================================================================

-- 1. Tabela de Templates de Anamnese por Salão (Form Builder Dinâmico)
CREATE TABLE IF NOT EXISTS public.cap_anamnesis_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.cap_tenants(id) ON DELETE CASCADE,
    fields_schema JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_anamnesis_template_tenant UNIQUE (tenant_id)
);

-- 2. Tabela de Respostas de Anamnese dos Clientes (Prontuário/Histórico)
CREATE TABLE IF NOT EXISTS public.cap_client_anamnesis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.cap_tenants(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.cap_clients(id) ON DELETE CASCADE,
    answers JSONB NOT NULL DEFAULT '{}'::jsonb,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_client_anamnesis UNIQUE (tenant_id, client_id)
);

-- Índices de Otimização e Performance
CREATE INDEX IF NOT EXISTS idx_anamnesis_templates_tenant ON public.cap_anamnesis_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_client_anamnesis_tenant ON public.cap_client_anamnesis(tenant_id);
CREATE INDEX IF NOT EXISTS idx_client_anamnesis_client ON public.cap_client_anamnesis(client_id);
CREATE INDEX IF NOT EXISTS idx_client_anamnesis_expires ON public.cap_client_anamnesis(expires_at);

-- Habilitação de RLS (Row Level Security)
ALTER TABLE public.cap_anamnesis_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cap_client_anamnesis ENABLE ROW LEVEL SECURITY;

-- Políticas de Isolamento Multi-Tenant
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'cap_anamnesis_templates' AND policyname = 'tenant_isolation_anamnesis_templates'
    ) THEN
        CREATE POLICY tenant_isolation_anamnesis_templates ON public.cap_anamnesis_templates
            FOR ALL USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'cap_client_anamnesis' AND policyname = 'tenant_isolation_client_anamnesis'
    ) THEN
        CREATE POLICY tenant_isolation_client_anamnesis ON public.cap_client_anamnesis
            FOR ALL USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID);
    END IF;
END $$;

-- Concessão de Privilégios ao papel opera_app (usuário da API)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'opera_app') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.cap_anamnesis_templates TO opera_app;
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.cap_client_anamnesis TO opera_app;
    END IF;
END $$;
