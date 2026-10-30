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

-- 12. LISTA DE ESPERA INTELIGENTE (cap_waitlist)
CREATE TABLE IF NOT EXISTS public.cap_waitlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.cap_tenants(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.cap_clients(id) ON DELETE CASCADE,
    service_id UUID REFERENCES public.cap_services(id) ON DELETE SET NULL,
    professional_id UUID REFERENCES public.cap_staff(id) ON DELETE SET NULL,
    desired_date DATE NOT NULL,
    status TEXT DEFAULT 'pending',
    preferred_time_range TEXT DEFAULT 'any',
    offered_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    notified_at TIMESTAMPTZ,
    appointment_id UUID REFERENCES public.cap_appointments(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cap_waitlist_pending_order ON public.cap_waitlist(tenant_id, desired_date, status, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_cap_waitlist_expired_offers ON public.cap_waitlist(status, expires_at) WHERE status = 'offered';

-- 13. COMANDA UNIFICADA E SESSÕES DE CAIXA PDV (cap_cash_registers, cap_cash_movements, cap_orders, cap_order_items, cap_order_payments)
CREATE TABLE IF NOT EXISTS public.cap_cash_registers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.cap_tenants(id) ON DELETE CASCADE,
    opened_by UUID NOT NULL REFERENCES public.cap_staff(id) ON DELETE RESTRICT,
    closed_by UUID REFERENCES public.cap_staff(id) ON DELETE SET NULL,
    opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    closed_at TIMESTAMPTZ,
    status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
    initial_balance NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (initial_balance >= 0),
    expected_cash NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    expected_pix NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    expected_credit NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    expected_debit NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    expected_wallet NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    expected_giftcard NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    expected_total NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    actual_cash NUMERIC(10, 2),
    actual_pix NUMERIC(10, 2),
    actual_credit NUMERIC(10, 2),
    actual_debit NUMERIC(10, 2),
    actual_total NUMERIC(10, 2),
    cash_difference NUMERIC(10, 2) DEFAULT 0.00,
    total_difference NUMERIC(10, 2) DEFAULT 0.00,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cash_registers_tenant_status ON public.cap_cash_registers (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_cash_registers_opened_at ON public.cap_cash_registers (tenant_id, opened_at DESC);

CREATE TABLE IF NOT EXISTS public.cap_cash_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.cap_tenants(id) ON DELETE CASCADE,
    cash_register_id UUID NOT NULL REFERENCES public.cap_cash_registers(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES public.cap_staff(id) ON DELETE RESTRICT,
    type VARCHAR(20) NOT NULL CHECK (type IN ('supply', 'bleed')),
    amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
    reason TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cash_movements_register ON public.cap_cash_movements (cash_register_id);

CREATE TABLE IF NOT EXISTS public.cap_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.cap_tenants(id) ON DELETE CASCADE,
    cash_register_id UUID REFERENCES public.cap_cash_registers(id) ON DELETE SET NULL,
    client_id UUID REFERENCES public.cap_clients(id) ON DELETE SET NULL,
    appointment_id UUID REFERENCES public.cap_appointments(id) ON DELETE SET NULL,
    staff_id UUID REFERENCES public.cap_staff(id) ON DELETE SET NULL,
    order_number VARCHAR(40) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'paid', 'cancelled')),
    subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (subtotal >= 0),
    discount_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (discount_amount >= 0),
    coupon_id UUID REFERENCES public.cap_coupons(id) ON DELETE SET NULL,
    coupon_code TEXT,
    tip_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (tip_amount >= 0),
    tip_staff_id UUID REFERENCES public.cap_staff(id) ON DELETE SET NULL,
    total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (total_amount >= 0),
    paid_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (paid_amount >= 0),
    change_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (change_amount >= 0),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    paid_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_orders_tenant_status ON public.cap_orders (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_appointment ON public.cap_orders (appointment_id);
CREATE INDEX IF NOT EXISTS idx_orders_client ON public.cap_orders (client_id);

CREATE TABLE IF NOT EXISTS public.cap_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.cap_tenants(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES public.cap_orders(id) ON DELETE CASCADE,
    item_type VARCHAR(20) NOT NULL CHECK (item_type IN ('service', 'product')),
    service_id UUID REFERENCES public.cap_services(id) ON DELETE SET NULL,
    inventory_id UUID REFERENCES public.cap_inventory(id) ON DELETE SET NULL,
    staff_id UUID REFERENCES public.cap_staff(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit_price NUMERIC(10, 2) NOT NULL CHECK (unit_price >= 0),
    total_price NUMERIC(10, 2) NOT NULL CHECK (total_price >= 0),
    commission_rate NUMERIC(5, 2) DEFAULT 0.00,
    commission_amount NUMERIC(10, 2) DEFAULT 0.00,
    variation_name TEXT,
    selected_extras JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.cap_order_items (order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_staff ON public.cap_order_items (staff_id);

CREATE TABLE IF NOT EXISTS public.cap_order_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.cap_tenants(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES public.cap_orders(id) ON DELETE CASCADE,
    payment_method VARCHAR(30) NOT NULL CHECK (payment_method IN ('cash', 'pix', 'credit_card', 'debit_card', 'wallet', 'giftcard')),
    amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
    installments INT DEFAULT 1 CHECK (installments >= 1),
    giftcard_id UUID REFERENCES public.cap_giftcards(id) ON DELETE SET NULL,
    giftcard_code TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_order_payments_order ON public.cap_order_payments (order_id);

-- 14. ANAMNESE DINÂMICA, TERMOS DE CONSENTIMENTO E EVOLUÇÃO CLÍNICA
CREATE TABLE IF NOT EXISTS public.cap_anamnesis_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.cap_tenants(id) ON DELETE CASCADE,
    fields_schema JSONB NOT NULL DEFAULT '[]'::jsonb,
    terms_text TEXT NOT NULL DEFAULT 'Declaro para os devidos fins que as informações acima prestadas são verdadeiras e completas. Autorizo a realização dos procedimentos estéticos e capilares indicados e estou ciente das orientações e cuidados pós-atendimento.',
    terms_version INTEGER NOT NULL DEFAULT 1 CHECK (terms_version > 0),
    require_terms BOOLEAN NOT NULL DEFAULT TRUE,
    require_signature BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_anamnesis_template_tenant UNIQUE (tenant_id)
);
ALTER TABLE public.cap_anamnesis_templates
    ADD COLUMN IF NOT EXISTS terms_text TEXT NOT NULL DEFAULT 'Declaro para os devidos fins que as informações acima prestadas são verdadeiras e completas. Autorizo a realização dos procedimentos estéticos e capilares indicados e estou ciente das orientações e cuidados pós-atendimento.',
    ADD COLUMN IF NOT EXISTS terms_version INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS require_terms BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS require_signature BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS public.cap_client_anamnesis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.cap_tenants(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.cap_clients(id) ON DELETE CASCADE,
    answers JSONB NOT NULL DEFAULT '{}'::jsonb,
    answers_encrypted TEXT,
    terms_accepted BOOLEAN NOT NULL DEFAULT FALSE,
    terms_version INTEGER DEFAULT 1,
    consented_at TIMESTAMPTZ,
    consent_ip_address VARCHAR(45),
    consent_user_agent TEXT,
    consent_hash VARCHAR(64),
    signature_data TEXT,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_client_anamnesis UNIQUE (tenant_id, client_id)
);
ALTER TABLE public.cap_client_anamnesis
    ADD COLUMN IF NOT EXISTS answers_encrypted TEXT,
    ADD COLUMN IF NOT EXISTS terms_accepted BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS terms_version INTEGER DEFAULT 1,
    ADD COLUMN IF NOT EXISTS consented_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS consent_ip_address VARCHAR(45),
    ADD COLUMN IF NOT EXISTS consent_user_agent TEXT,
    ADD COLUMN IF NOT EXISTS consent_hash VARCHAR(64),
    ADD COLUMN IF NOT EXISTS signature_data TEXT;

CREATE TABLE IF NOT EXISTS public.cap_client_evolutions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.cap_tenants(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.cap_clients(id) ON DELETE CASCADE,
    staff_id UUID REFERENCES public.cap_staff(id) ON DELETE SET NULL,
    appointment_id UUID REFERENCES public.cap_appointments(id) ON DELETE SET NULL,
    session_date DATE NOT NULL DEFAULT CURRENT_DATE,
    procedure_name TEXT NOT NULL,
    notes TEXT,
    measurements JSONB NOT NULL DEFAULT '{}'::jsonb,
    before_photos JSONB NOT NULL DEFAULT '[]'::jsonb,
    after_photos JSONB NOT NULL DEFAULT '[]'::jsonb,
    photo_consent_level VARCHAR(30) NOT NULL DEFAULT 'internal_only' CHECK (photo_consent_level IN ('none', 'internal_only', 'social_media_anonymous', 'social_media_full')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_client_evolutions_tenant_client ON public.cap_client_evolutions(tenant_id, client_id);
CREATE INDEX IF NOT EXISTS idx_client_evolutions_appointment ON public.cap_client_evolutions(appointment_id);

-- 15. CAMPANHAS AUTOMÁTICAS DE RETENÇÃO (cap_marketing_campaigns, cap_campaign_logs)
ALTER TABLE public.cap_clients
    ADD COLUMN IF NOT EXISTS marketing_opt_out BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS opt_out_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_cap_clients_opt_out ON public.cap_clients(tenant_id, marketing_opt_out);

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
CREATE INDEX IF NOT EXISTS idx_campaign_logs_tenant_cooldown ON public.cap_campaign_logs(tenant_id, campaign_type, client_id, sent_at);
CREATE INDEX IF NOT EXISTS idx_campaign_logs_sent_at ON public.cap_campaign_logs(sent_at);

-- 16. AVALIAÇÕES E REVIEWS DO GOOGLE (cap_reviews)
CREATE TABLE IF NOT EXISTS public.cap_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.cap_tenants(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES public.cap_appointments(id) ON DELETE SET NULL,
    client_id UUID NOT NULL REFERENCES public.cap_clients(id) ON DELETE CASCADE,
    professional_id UUID REFERENCES public.cap_staff(id) ON DELETE SET NULL,
    service_id UUID REFERENCES public.cap_services(id) ON DELETE SET NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    is_public BOOLEAN NOT NULL DEFAULT TRUE,
    staff_reply TEXT,
    replied_at TIMESTAMPTZ,
    replied_by UUID REFERENCES public.cap_staff(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.cap_reviews
    ADD COLUMN IF NOT EXISTS service_id UUID REFERENCES public.cap_services(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS staff_reply TEXT,
    ADD COLUMN IF NOT EXISTS replied_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS replied_by UUID REFERENCES public.cap_staff(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_reviews_tenant_public ON public.cap_reviews (tenant_id, is_public, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_tenant_professional ON public.cap_reviews (tenant_id, professional_id, rating);

-- 17. LOOKBOOK E VITRINE VISUAL (cap_lookbook)
CREATE TABLE IF NOT EXISTS public.cap_lookbook (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.cap_tenants(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    title TEXT,
    description TEXT,
    service_id UUID REFERENCES public.cap_services(id) ON DELETE SET NULL,
    staff_id UUID REFERENCES public.cap_staff(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cap_lookbook_tenant ON public.cap_lookbook(tenant_id);

-- 18. WHATSAPP GATEWAY NATIVO
CREATE TABLE IF NOT EXISTS public.cap_whatsapp_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.cap_tenants(id) ON DELETE CASCADE,
    instance_name VARCHAR(100) NOT NULL DEFAULT 'default',
    phone_number VARCHAR(30),
    status VARCHAR(30) NOT NULL DEFAULT 'DISCONNECTED',
    qr_code TEXT,
    pairing_code VARCHAR(20),
    connected_at TIMESTAMPTZ,
    last_activity_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_whatsapp_instance_tenant UNIQUE (tenant_id)
);

CREATE TABLE IF NOT EXISTS public.cap_whatsapp_auth_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.cap_tenants(id) ON DELETE CASCADE,
    key_name VARCHAR(150) NOT NULL,
    encrypted_value TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_whatsapp_auth_key UNIQUE (tenant_id, key_name)
);

CREATE TABLE IF NOT EXISTS public.cap_whatsapp_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.cap_tenants(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES public.cap_appointments(id) ON DELETE SET NULL,
    recipient_phone VARCHAR(30) NOT NULL,
    message_type VARCHAR(30) NOT NULL DEFAULT 'REMINDER',
    content TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    error_message TEXT,
    idempotency_key VARCHAR(100),
    interactive_button_payload JSONB,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_whatsapp_idempotency UNIQUE (tenant_id, idempotency_key)
);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_tenant_status ON public.cap_whatsapp_messages(tenant_id, status);

-- 19. GOVERNANÇA DE PRIVACIDADE E DPO LGPD
CREATE TABLE IF NOT EXISTS public.cap_privacy_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.cap_tenants(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.cap_clients(id) ON DELETE SET NULL,
    request_type VARCHAR(30) NOT NULL CHECK (request_type IN ('export', 'deletion', 'revocation')),
    status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'rejected')),
    details JSONB DEFAULT '{}'::jsonb,
    ip_address VARCHAR(45),
    user_agent TEXT,
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_privacy_requests_tenant ON public.cap_privacy_requests(tenant_id);

-- 20. RLS E PERMISSÕES (MENOR PRIVILÉGIO C5 / ISOLAMENTO C6)
ALTER TABLE public.cap_service_variations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cap_service_extras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cap_appointment_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cap_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cap_tenant_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cap_tenant_gateway_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cap_waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cap_cash_registers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cap_cash_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cap_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cap_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cap_order_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cap_client_evolutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cap_marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cap_campaign_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cap_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cap_lookbook ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cap_whatsapp_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cap_whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cap_privacy_requests ENABLE ROW LEVEL SECURITY;

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

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cap_waitlist' AND policyname = 'tenant_isolation_waitlist') THEN
        CREATE POLICY tenant_isolation_waitlist ON public.cap_waitlist
            FOR ALL USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cap_cash_registers' AND policyname = 'tenant_isolation_cash_registers') THEN
        CREATE POLICY tenant_isolation_cash_registers ON public.cap_cash_registers
            FOR ALL USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cap_cash_movements' AND policyname = 'tenant_isolation_cash_movements') THEN
        CREATE POLICY tenant_isolation_cash_movements ON public.cap_cash_movements
            FOR ALL USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cap_orders' AND policyname = 'tenant_isolation_orders') THEN
        CREATE POLICY tenant_isolation_orders ON public.cap_orders
            FOR ALL USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cap_order_items' AND policyname = 'tenant_isolation_order_items') THEN
        CREATE POLICY tenant_isolation_order_items ON public.cap_order_items
            FOR ALL USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cap_order_payments' AND policyname = 'tenant_isolation_order_payments') THEN
        CREATE POLICY tenant_isolation_order_payments ON public.cap_order_payments
            FOR ALL USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cap_client_evolutions' AND policyname = 'tenant_isolation_client_evolutions') THEN
        CREATE POLICY tenant_isolation_client_evolutions ON public.cap_client_evolutions
            FOR ALL USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cap_marketing_campaigns' AND policyname = 'tenant_isolation_campaigns') THEN
        CREATE POLICY tenant_isolation_campaigns ON public.cap_marketing_campaigns
            FOR ALL USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cap_campaign_logs' AND policyname = 'tenant_isolation_campaign_logs') THEN
        CREATE POLICY tenant_isolation_campaign_logs ON public.cap_campaign_logs
            FOR ALL USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cap_reviews' AND policyname = 'tenant_isolation_reviews') THEN
        CREATE POLICY tenant_isolation_reviews ON public.cap_reviews
            FOR ALL USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cap_lookbook' AND policyname = 'tenant_isolation_lookbook') THEN
        CREATE POLICY tenant_isolation_lookbook ON public.cap_lookbook
            FOR ALL USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cap_whatsapp_instances' AND policyname = 'tenant_isolation_wa_instances') THEN
        CREATE POLICY tenant_isolation_wa_instances ON public.cap_whatsapp_instances
            FOR ALL USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cap_whatsapp_messages' AND policyname = 'tenant_isolation_wa_messages') THEN
        CREATE POLICY tenant_isolation_wa_messages ON public.cap_whatsapp_messages
            FOR ALL USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cap_privacy_requests' AND policyname = 'tenant_isolation_privacy') THEN
        CREATE POLICY tenant_isolation_privacy ON public.cap_privacy_requests
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
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.cap_waitlist TO opera_app;
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.cap_cash_registers TO opera_app;
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.cap_cash_movements TO opera_app;
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.cap_orders TO opera_app;
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.cap_order_items TO opera_app;
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.cap_order_payments TO opera_app;
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.cap_anamnesis_templates TO opera_app;
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.cap_client_anamnesis TO opera_app;
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.cap_client_evolutions TO opera_app;
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.cap_marketing_campaigns TO opera_app;
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.cap_campaign_logs TO opera_app;
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.cap_reviews TO opera_app;
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.cap_lookbook TO opera_app;
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.cap_whatsapp_instances TO opera_app;
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.cap_whatsapp_auth_keys TO opera_app;
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.cap_whatsapp_messages TO opera_app;
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.cap_privacy_requests TO opera_app;
    END IF;
END $$;

-- <<< UP <<<

-- >>> DOWN >>>
-- Migração consolidada de reparo não requer rollback destrutivo de colunas.
-- <<< DOWN <<<
