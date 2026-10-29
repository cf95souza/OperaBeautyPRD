-- ==============================================================================
-- FASE 45 / ITEM E3 — COMPLEMENTOS (ADD-ONS DO SAAS)
-- Pacotes extras de WhatsApp, Domínio Próprio e Módulo Fiscal NFS-e
-- ==============================================================================

-- 1. Tabela de Catálogo dos Complementos Disponíveis no SaaS
CREATE TABLE IF NOT EXISTS public.cap_addons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug VARCHAR(50) UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    billing_cycle TEXT NOT NULL DEFAULT 'monthly', -- 'monthly', 'yearly'
    category VARCHAR(30) NOT NULL, -- 'whatsapp', 'domain', 'fiscal'
    features JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Tabela de Contratos de Complementos por Salão (Multi-Tenant)
CREATE TABLE IF NOT EXISTS public.cap_tenant_addons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.cap_tenants(id) ON DELETE CASCADE,
    addon_id UUID NOT NULL REFERENCES public.cap_addons(id) ON DELETE RESTRICT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'pending')),
    price NUMERIC(10, 2) NOT NULL,
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    activated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    cancelled_at TIMESTAMPTZ,
    CONSTRAINT uq_tenant_addon UNIQUE (tenant_id, addon_id)
);

-- 3. Índices de Otimização
CREATE INDEX IF NOT EXISTS idx_cap_tenant_addons_tenant_status 
    ON public.cap_tenant_addons(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_cap_tenant_addons_addon 
    ON public.cap_tenant_addons(addon_id);

-- 4. Extensões de Colunas em cap_tenants
ALTER TABLE public.cap_tenants 
    ADD COLUMN IF NOT EXISTS custom_domain VARCHAR(255),
    ADD COLUMN IF NOT EXISTS custom_domain_verified BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS extra_whatsapp_messages INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS nfse_enabled BOOLEAN DEFAULT FALSE;

-- 5. Seed dos Complementos Oficiais
INSERT INTO public.cap_addons (slug, name, description, price, category, features, is_active)
VALUES
    ('whatsapp_500', 'Pacote +500 Mensagens WhatsApp', 'Adiciona 500 mensagens de WhatsApp mensais para lembretes e campanhas.', 29.90, 'whatsapp', '{"extra_messages": 500}'::jsonb, true),
    ('whatsapp_1000', 'Pacote +1.000 Mensagens WhatsApp', 'Adiciona 1.000 mensagens de WhatsApp mensais para alta demanda.', 49.90, 'whatsapp', '{"extra_messages": 1000}'::jsonb, true),
    ('custom_domain', 'Domínio Próprio Personalizado', 'Utilize o seu próprio domínio (ex: agendamento.seusalao.com.br) com certificado SSL automático.', 39.90, 'domain', '{"support_custom_domain": true}'::jsonb, true),
    ('nfse_module', 'Módulo de Emissão Fiscal (NFS-e)', 'Emissão automática de notas fiscais de serviço para procedimentos concluídos.', 49.90, 'fiscal', '{"nfse_enabled": true}'::jsonb, true)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    price = EXCLUDED.price,
    category = EXCLUDED.category,
    features = EXCLUDED.features,
    is_active = EXCLUDED.is_active;

-- 6. Row Level Security (RLS) - Princípio C6
ALTER TABLE public.cap_tenant_addons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_addons ON public.cap_tenant_addons;
CREATE POLICY tenant_isolation_addons ON public.cap_tenant_addons
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

-- 7. Concessões de Menor Privilégio ao papel opera_app - Princípio C5
GRANT SELECT ON public.cap_addons TO opera_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cap_tenant_addons TO opera_app;
GRANT SELECT, UPDATE ON public.cap_tenants TO opera_app;
