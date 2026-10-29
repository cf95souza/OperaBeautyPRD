-- ==============================================================================
-- FASE 46: REPARO CONSOLIDADO DE PARIDADE DE SCHEMA PARA PRODUÇÃO (VPS)
-- ==============================================================================
-- Esta migração garante 100% de integridade e idempotência nas colunas e tabelas
-- que estavam ausentes em bancos de dados de produção existentes.
-- Pode ser executada múltiplas vezes com total segurança (ADD COLUMN IF NOT EXISTS).
-- ==============================================================================

-- >>> UP >>>

-- 1. EXTENSÕES BÁSICAS
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 2. AJUSTES EM cap_tenants (Branding, White-Label, Tolerância, Módulos e Referral)
ALTER TABLE public.cap_tenants 
    ADD COLUMN IF NOT EXISTS theme_id VARCHAR(50) DEFAULT 'rose',
    ADD COLUMN IF NOT EXISTS brand_hex VARCHAR(7) DEFAULT '#8E3B4E',
    ADD COLUMN IF NOT EXISTS min_cancellation_hours INT DEFAULT 2,
    ADD COLUMN IF NOT EXISTS no_show_penalty_action VARCHAR(30) DEFAULT 'warn',
    ADD COLUMN IF NOT EXISTS no_show_tolerance_count INT DEFAULT 2,
    ADD COLUMN IF NOT EXISTS is_founder BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS frozen_price NUMERIC(10,2),
    ADD COLUMN IF NOT EXISTS price_frozen_until TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS founder_badge_label VARCHAR(50),
    ADD COLUMN IF NOT EXISTS onboarding_dismissed BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS qr_code_generated_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS custom_domain VARCHAR(255),
    ADD COLUMN IF NOT EXISTS custom_domain_verified BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS extra_whatsapp_messages INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS nfse_enabled BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS google_review_url TEXT,
    ADD COLUMN IF NOT EXISTS google_review_auto_invite BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS google_review_min_stars INT DEFAULT 4,
    ADD COLUMN IF NOT EXISTS google_maps_url TEXT,
    ADD COLUMN IF NOT EXISTS headline TEXT,
    ADD COLUMN IF NOT EXISTS about_text TEXT,
    ADD COLUMN IF NOT EXISTS minisite_gallery JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS meta_title TEXT,
    ADD COLUMN IF NOT EXISTS meta_description TEXT,
    ADD COLUMN IF NOT EXISTS meta_image_url TEXT,
    ADD COLUMN IF NOT EXISTS minisite_enabled BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS grace_period_days INT DEFAULT 5,
    ADD COLUMN IF NOT EXISTS overdue_since DATE,
    ADD COLUMN IF NOT EXISTS billing_locked_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS suspension_reason TEXT,
    ADD COLUMN IF NOT EXISTS referral_program_active BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS referral_reward_type VARCHAR(20) NOT NULL DEFAULT 'wallet',
    ADD COLUMN IF NOT EXISTS referral_referrer_reward NUMERIC(10,2) NOT NULL DEFAULT 15.00,
    ADD COLUMN IF NOT EXISTS referral_referee_reward NUMERIC(10,2) NOT NULL DEFAULT 15.00,
    ADD COLUMN IF NOT EXISTS referral_trigger VARCHAR(50) NOT NULL DEFAULT 'on_first_completed_appointment',
    ADD COLUMN IF NOT EXISTS referral_custom_message TEXT;

-- 3. AJUSTES EM cap_services (Descrição Curta, Sinal e Variações)
ALTER TABLE public.cap_services 
    ADD COLUMN IF NOT EXISTS short_description TEXT,
    ADD COLUMN IF NOT EXISTS is_starting_price BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS requires_deposit BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS deposit_type VARCHAR(20) DEFAULT 'percentage',
    ADD COLUMN IF NOT EXISTS deposit_amount NUMERIC(10,2) DEFAULT 0.00;

-- 4. TABELAS DE VARIAÇÕES E EXTRAS DO CATÁLOGO DE SERVIÇOS
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
CREATE INDEX IF NOT EXISTS idx_cap_service_variations_service ON public.cap_service_variations(service_id);
CREATE INDEX IF NOT EXISTS idx_cap_service_variations_tenant ON public.cap_service_variations(tenant_id);

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
CREATE INDEX IF NOT EXISTS idx_cap_service_extras_service ON public.cap_service_extras(service_id);
CREATE INDEX IF NOT EXISTS idx_cap_service_extras_tenant ON public.cap_service_extras(tenant_id);

-- 5. AJUSTES EM cap_clients
ALTER TABLE public.cap_clients 
    ADD COLUMN IF NOT EXISTS referral_code VARCHAR(50),
    ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES public.cap_clients(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS no_show_count INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS blocked_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_cap_clients_referral_code ON public.cap_clients(referral_code);
CREATE INDEX IF NOT EXISTS idx_cap_clients_referred_by ON public.cap_clients(referred_by);

-- 5.1 PACOTES DE SESSÕES E CRÉDITOS DE TRATAMENTO (cap_packages e cap_client_packages)
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
CREATE INDEX IF NOT EXISTS idx_cap_packages_tenant ON public.cap_packages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cap_packages_service ON public.cap_packages(service_id);

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
CREATE INDEX IF NOT EXISTS idx_cap_client_packages_tenant ON public.cap_client_packages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cap_client_packages_client ON public.cap_client_packages(client_id);
CREATE INDEX IF NOT EXISTS idx_cap_client_packages_service ON public.cap_client_packages(service_id);
CREATE INDEX IF NOT EXISTS idx_cap_client_packages_status ON public.cap_client_packages(status);

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
CREATE INDEX IF NOT EXISTS idx_cap_package_usages_tenant ON public.cap_package_usages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cap_package_usages_pkg ON public.cap_package_usages(client_package_id);
CREATE INDEX IF NOT EXISTS idx_cap_package_usages_appt ON public.cap_package_usages(appointment_id);

-- 6. AJUSTES EM cap_appointments (Descontos, Pagamento, Pacotes e Sinal)
ALTER TABLE public.cap_appointments 
    ADD COLUMN IF NOT EXISTS discount_applied NUMERIC(10, 2) DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'credit_card',
    ADD COLUMN IF NOT EXISTS gift_card_redeemed NUMERIC(10, 2) DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS client_package_id UUID REFERENCES public.cap_client_packages(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS is_package_session BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS deposit_status VARCHAR(30) NOT NULL DEFAULT 'none',
    ADD COLUMN IF NOT EXISTS deposit_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS deposit_provider VARCHAR(50),
    ADD COLUMN IF NOT EXISTS deposit_payment_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS deposit_pix_code TEXT,
    ADD COLUMN IF NOT EXISTS deposit_pix_qr TEXT,
    ADD COLUMN IF NOT EXISTS deposit_expires_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS deposit_paid_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS no_show_marked_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS no_show_marked_by UUID REFERENCES public.cap_staff(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
    ADD COLUMN IF NOT EXISTS variation_id UUID REFERENCES public.cap_service_variations(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS variation_name TEXT,
    ADD COLUMN IF NOT EXISTS selected_extras JSONB DEFAULT '[]'::jsonb;

-- 7. TABELA DE MÚLTIPLOS SERVIÇOS POR VISITA (cap_appointment_services)
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
    variation_id UUID REFERENCES public.cap_service_variations(id) ON DELETE SET NULL,
    variation_name TEXT,
    selected_extras JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_appointment_services_appt ON public.cap_appointment_services(appointment_id);
CREATE INDEX IF NOT EXISTS idx_appointment_services_svc ON public.cap_appointment_services(service_id);
CREATE INDEX IF NOT EXISTS idx_appointment_services_tenant ON public.cap_appointment_services(tenant_id);

-- 8. AJUSTES EM cap_invoices (PIX SaaS, Faturas e Carência)
ALTER TABLE public.cap_invoices 
    ADD COLUMN IF NOT EXISTS pix_copy_paste TEXT,
    ADD COLUMN IF NOT EXISTS pix_qr_code TEXT,
    ADD COLUMN IF NOT EXISTS gateway_transaction_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS gateway_invoice_url TEXT,
    ADD COLUMN IF NOT EXISTS grace_period_days INT DEFAULT 5,
    ADD COLUMN IF NOT EXISTS warnings_sent JSONB DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_cap_invoices_status_due ON public.cap_invoices(tenant_id, status, due_date);
CREATE INDEX IF NOT EXISTS idx_cap_invoices_gateway_tx ON public.cap_invoices(gateway_transaction_id);

-- 9. TABELA DE INDICAÇÕES (cap_referrals)
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
    completed_at TIMESTAMPTZ
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_referral_tenant_referee') THEN
        ALTER TABLE public.cap_referrals ADD CONSTRAINT uq_referral_tenant_referee UNIQUE (tenant_id, referee_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_no_self_referral') THEN
        ALTER TABLE public.cap_referrals ADD CONSTRAINT chk_no_self_referral CHECK (referrer_id <> referee_id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_cap_referrals_tenant_referrer ON public.cap_referrals(tenant_id, referrer_id);
CREATE INDEX IF NOT EXISTS idx_cap_referrals_tenant_status ON public.cap_referrals(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_cap_referrals_code ON public.cap_referrals(tenant_id, referral_code);

-- 10. COMPLEMENTOS DO SAAS (cap_addons e cap_tenant_addons)
CREATE TABLE IF NOT EXISTS public.cap_addons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug VARCHAR(50) UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    billing_cycle TEXT NOT NULL DEFAULT 'monthly',
    category VARCHAR(30) NOT NULL,
    features JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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
CREATE INDEX IF NOT EXISTS idx_cap_tenant_addons_tenant_status ON public.cap_tenant_addons(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_cap_tenant_addons_addon ON public.cap_tenant_addons(addon_id);

-- Seed de Complementos Oficiais
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

-- 11. GATEWAY E CONFIGURAÇÕES DE PAGAMENTO MULTI-TENANT
CREATE TABLE IF NOT EXISTS public.cap_tenant_gateway_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.cap_tenants(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL DEFAULT 'manual_pix',
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    sandbox_mode BOOLEAN NOT NULL DEFAULT FALSE,
    deposit_expiration_minutes INTEGER NOT NULL DEFAULT 15,
    encrypted_credentials TEXT,
    public_key TEXT,
    pix_key VARCHAR(150),
    pix_key_type VARCHAR(30),
    holder_name VARCHAR(150),
    instructions TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_tenant_gateway_config UNIQUE (tenant_id)
);

CREATE TABLE IF NOT EXISTS public.cap_platform_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gateway_provider VARCHAR(50) DEFAULT 'sandbox',
    sandbox_mode BOOLEAN DEFAULT TRUE,
    pix_key VARCHAR(150),
    pix_key_type VARCHAR(30),
    pix_holder_name VARCHAR(150),
    encrypted_gateway_credentials TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. RLS E PERMISSÕES (MENOR PRIVILÉGIO C5 / ISOLAMENTO C6)
ALTER TABLE public.cap_service_variations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cap_service_extras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cap_appointment_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cap_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cap_tenant_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cap_tenant_gateway_configs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cap_service_variations' AND policyname = 'tenant_isolation_service_variations') THEN
        CREATE POLICY tenant_isolation_service_variations ON public.cap_service_variations
            FOR ALL USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cap_service_extras' AND policyname = 'tenant_isolation_service_extras') THEN
        CREATE POLICY tenant_isolation_service_extras ON public.cap_service_extras
            FOR ALL USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cap_appointment_services' AND policyname = 'tenant_isolation_appointment_services') THEN
        CREATE POLICY tenant_isolation_appointment_services ON public.cap_appointment_services
            FOR ALL USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cap_referrals' AND policyname = 'tenant_isolation_referrals') THEN
        CREATE POLICY tenant_isolation_referrals ON public.cap_referrals
            FOR ALL USING (
                tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
                OR current_setting('app.is_superadmin', true) = 'true'
                OR current_setting('app.bypass_rls', true) = 'true'
            );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cap_tenant_addons' AND policyname = 'tenant_isolation_addons') THEN
        CREATE POLICY tenant_isolation_addons ON public.cap_tenant_addons
            FOR ALL USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cap_tenant_gateway_configs' AND policyname = 'tenant_isolation_gateway_configs') THEN
        CREATE POLICY tenant_isolation_gateway_configs ON public.cap_tenant_gateway_configs
            FOR ALL USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID);
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'opera_app') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.cap_services TO opera_app;
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.cap_service_variations TO opera_app;
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.cap_service_extras TO opera_app;
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.cap_packages TO opera_app;
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.cap_client_packages TO opera_app;
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.cap_package_usages TO opera_app;
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.cap_appointment_services TO opera_app;
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.cap_appointments TO opera_app;
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.cap_invoices TO opera_app;
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.cap_referrals TO opera_app;
        GRANT SELECT ON public.cap_addons TO opera_app;
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.cap_tenant_addons TO opera_app;
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.cap_tenant_gateway_configs TO opera_app;
        GRANT SELECT, UPDATE ON public.cap_tenants TO opera_app;
        GRANT SELECT, UPDATE ON public.cap_clients TO opera_app;
    END IF;
END $$;

-- <<< UP <<<

-- >>> DOWN >>>
-- Migração consolidada de reparo não requer rollback destrutivo de colunas.
-- <<< DOWN <<<
