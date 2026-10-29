-- ==============================================================================
-- FASE 44 - ITEM D15 (P2): CAMPANHAS AUTOMÁTICAS (ANIVERSÁRIO, RETORNO, REATIVAÇÃO)
-- Regras de Aceite: Deduplicação por Carência, Opt-Out, Contagem e Cupons
-- ==============================================================================

-- 1. Extensão de cap_clients com campos de Opt-Out de Marketing
ALTER TABLE public.cap_clients
    ADD COLUMN IF NOT EXISTS marketing_opt_out BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS opt_out_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_cap_clients_opt_out ON public.cap_clients(tenant_id, marketing_opt_out);

-- 2. Tabela de Configuração de Campanhas Automáticas por Salão (cap_marketing_campaigns)
CREATE TABLE IF NOT EXISTS public.cap_marketing_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.cap_tenants(id) ON DELETE CASCADE,
    type VARCHAR(30) NOT NULL CHECK (type IN ('birthday', 'maintenance', 'reactivation_60d')),
    name TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    message_template TEXT NOT NULL,
    discount_type VARCHAR(20) DEFAULT 'percentage' CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value NUMERIC(10,2) DEFAULT 10.00 CHECK (discount_value >= 0),
    coupon_validity_days INT DEFAULT 15 CHECK (coupon_validity_days > 0),
    min_days_inactive INT DEFAULT 60 CHECK (min_days_inactive >= 15),
    send_channel VARCHAR(20) NOT NULL DEFAULT 'whatsapp' CHECK (send_channel IN ('whatsapp', 'push', 'both')),
    cooldown_days INT NOT NULL DEFAULT 60 CHECK (cooldown_days > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_campaign_tenant_type UNIQUE (tenant_id, type)
);

CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_tenant ON public.cap_marketing_campaigns(tenant_id);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_type ON public.cap_marketing_campaigns(tenant_id, type, is_active);

-- 3. Tabela de Histórico e Auditoria de Disparos de Campanhas (cap_campaign_logs)
CREATE TABLE IF NOT EXISTS public.cap_campaign_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.cap_tenants(id) ON DELETE CASCADE,
    campaign_id UUID NOT NULL REFERENCES public.cap_marketing_campaigns(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.cap_clients(id) ON DELETE CASCADE,
    campaign_type VARCHAR(30) NOT NULL,
    phone VARCHAR(30),
    message_content TEXT NOT NULL,
    coupon_id UUID REFERENCES public.cap_coupons(id) ON DELETE SET NULL,
    coupon_code TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'opt_out', 'skipped_cooldown')),
    error_message TEXT,
    channel VARCHAR(20) NOT NULL DEFAULT 'whatsapp',
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices de Performance e Deduplicação (Aceite D15)
CREATE INDEX IF NOT EXISTS idx_campaign_logs_tenant_cooldown 
    ON public.cap_campaign_logs(tenant_id, campaign_type, client_id, sent_at);
CREATE INDEX IF NOT EXISTS idx_campaign_logs_sent_at 
    ON public.cap_campaign_logs(sent_at);
CREATE INDEX IF NOT EXISTS idx_campaign_logs_client 
    ON public.cap_campaign_logs(client_id);

-- 4. Habilitação de RLS Multi-Tenant
ALTER TABLE public.cap_marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cap_campaign_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'cap_marketing_campaigns' AND policyname = 'tenant_isolation_marketing_campaigns'
    ) THEN
        CREATE POLICY tenant_isolation_marketing_campaigns ON public.cap_marketing_campaigns
            FOR ALL USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'cap_campaign_logs' AND policyname = 'tenant_isolation_campaign_logs'
    ) THEN
        CREATE POLICY tenant_isolation_campaign_logs ON public.cap_campaign_logs
            FOR ALL USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID);
    END IF;
END $$;

-- 5. Concessão de Privilégios DML ao Usuário opera_app (Princípio C5)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'opera_app') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.cap_marketing_campaigns TO opera_app;
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.cap_campaign_logs TO opera_app;
        GRANT SELECT, UPDATE ON public.cap_clients TO opera_app;
        GRANT SELECT, INSERT, UPDATE ON public.cap_coupons TO opera_app;
    END IF;
END $$;
