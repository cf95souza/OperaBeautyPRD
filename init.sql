-- Arquivo auto-gerado a partir do database.md para inicialização da VPS

-- ==========================================
-- 0. CLEANUP (CUIDADO: APAGA TUDO!)
-- ==========================================
DROP TABLE IF EXISTS public.cap_audit_logs CASCADE;
DROP TABLE IF EXISTS public.cap_timeline_notes CASCADE;
DROP TABLE IF EXISTS public.cap_appointment_services CASCADE;
DROP TABLE IF EXISTS public.cap_appointments CASCADE;
DROP TABLE IF EXISTS public.cap_service_inventory CASCADE;
DROP TABLE IF EXISTS public.cap_inventory CASCADE;
DROP TABLE IF EXISTS public.cap_services CASCADE;
DROP TABLE IF EXISTS public.cap_clients CASCADE;
DROP TABLE IF EXISTS public.cap_staff CASCADE;
DROP TABLE IF EXISTS public.cap_profiles CASCADE;
DROP TABLE IF EXISTS public.cap_business_hours CASCADE;
DROP TABLE IF EXISTS public.cap_date_exceptions CASCADE;
DROP TABLE IF EXISTS public.cap_blocked_dates CASCADE;
DROP TABLE IF EXISTS public.cap_vouchers CASCADE;
DROP TABLE IF EXISTS public.cap_settings CASCADE;
DROP TABLE IF EXISTS public.cap_coupons CASCADE;
DROP TABLE IF EXISTS public.cap_invoices CASCADE;
DROP TABLE IF EXISTS public.cap_platform_admins CASCADE;
DROP TABLE IF EXISTS public.cap_platform_announcements CASCADE;
DROP TABLE IF EXISTS public.cap_plans CASCADE;
DROP TABLE IF EXISTS public.cap_platform_settings CASCADE;
DROP TABLE IF EXISTS public.cap_tenants CASCADE;
DROP TABLE IF EXISTS public.cap_refresh_tokens CASCADE;
DROP TABLE IF EXISTS public.cap_crm_images CASCADE;
DROP TABLE IF EXISTS public.cap_push_subscriptions CASCADE;
DROP TABLE IF EXISTS public.cap_notifications CASCADE;
DROP TABLE IF EXISTS public.cap_feature_flags CASCADE;
DROP TABLE IF EXISTS public.cap_tenant_feature_flags CASCADE;
DROP TABLE IF EXISTS public.cap_salon_memberships CASCADE;
DROP TABLE IF EXISTS public.cap_client_memberships CASCADE;
DROP TABLE IF EXISTS public.cap_product_sales CASCADE;
DROP TABLE IF EXISTS public.cap_product_sale_items CASCADE;
DROP TABLE IF EXISTS public.cap_client_wallets CASCADE;
DROP TABLE IF EXISTS public.cap_wallet_transactions CASCADE;
DROP TABLE IF EXISTS public.cap_lookbook CASCADE;
DROP TABLE IF EXISTS public.cap_giftcards CASCADE;
DROP TABLE IF EXISTS public.cap_leads CASCADE;
DROP TABLE IF EXISTS public.cap_reviews CASCADE;

-- ==========================================
-- 1. EXTENSÕES NECESSÁRIAS E FUSO HORÁRIO (C11)
-- ==========================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Fuso horário padrão canônico (Brasília / America/Sao_Paulo)
SET timezone TO 'America/Sao_Paulo';
ALTER DATABASE operabeauty SET timezone TO 'America/Sao_Paulo';

-- ==========================================
-- 2. CRIAÇÃO DAS TABELAS (MULTI-TENANT & SAAS)
-- ==========================================

-- 2.1 Tabela de Planos de Assinatura (SaaS)
CREATE TABLE public.cap_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug VARCHAR(50) UNIQUE,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL,
    yearly_price NUMERIC(10, 2),
    sort_order INT DEFAULT 0,
    interval TEXT DEFAULT 'month',
    max_professionals INT, -- NULL ou 0 significa ilimitado
    max_banners INT DEFAULT 1, -- Limite de banners promocionais
    max_whatsapp_messages INT DEFAULT 0,
    is_featured BOOLEAN DEFAULT FALSE,
    badge_label VARCHAR(50),
    features JSONB DEFAULT '[]'::jsonb,
    marketing_features JSONB DEFAULT '[]'::jsonb,
    extra_professional_price NUMERIC(10, 2) DEFAULT 15.00,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.1.1 Tabela de Tokens de Atualização (Sessão Móvel e Web / C3)
CREATE TABLE public.cap_refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked BOOLEAN DEFAULT FALSE,
    replaced_by_token TEXT,
    ip_address TEXT,
    user_agent TEXT,
    family_id UUID NOT NULL,
    device_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cap_refresh_tokens_device ON public.cap_refresh_tokens(device_id);


-- 2.2 Tabela de Configurações Globais da Plataforma
CREATE TABLE public.cap_platform_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_gateway TEXT DEFAULT 'mercadopago', -- abacatepay, mercadopago, stripe
    gateway_api_key TEXT,
    gateway_public_key TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.3 Tabela Master de Salões (Tenants)
CREATE TABLE public.cap_tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug TEXT UNIQUE NOT NULL, -- Ex: 'studiomaria'
    name TEXT NOT NULL,
    status TEXT DEFAULT 'active', -- active, suspended
    plan_price NUMERIC DEFAULT 59.99,
    plan_id UUID REFERENCES public.cap_plans(id) ON DELETE SET NULL, -- Plano de assinatura ativo
    
    -- Customização Visual (Branding)
    logo_url TEXT,
    primary_color TEXT DEFAULT '#7c5357',
    secondary_color TEXT DEFAULT '#eeb9bd',
    tertiary_color TEXT DEFAULT '#f9f9f9',
    banners JSONB DEFAULT '[]'::jsonb, -- Array de múltiplos banners (url, title, subtitle)
    banner_url TEXT, -- Legado/Compatibilidade
    banner_title TEXT, -- Legado/Compatibilidade
    banner_subtitle TEXT, -- Legado/Compatibilidade
    welcome_message TEXT,
    
    -- Experiência do Cliente
    waiting_menu_enabled BOOLEAN DEFAULT FALSE,
    waiting_menu_items JSONB DEFAULT '["Água", "Café", "Espumante"]'::jsonb,
    
    -- Contato e Localização
    address TEXT,
    social_instagram TEXT,
    social_facebook TEXT,
    social_whatsapp TEXT,

    -- Cashback
    cashback_percentage DECIMAL(5, 2) DEFAULT 0.00,
    cashback_expiration_days INTEGER DEFAULT 30,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.4 Tabela de Super Admins da Plataforma (SaaS Mestre)
CREATE TABLE public.cap_platform_admins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    totp_secret TEXT,
    totp_enabled BOOLEAN DEFAULT FALSE,
    totp_temp_secret TEXT,
    last_login_at TIMESTAMPTZ,
    last_login_ip TEXT,
    last_login_user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.4.1 Tabela de Mural de Avisos da Plataforma (Broadcast System)
CREATE TABLE public.cap_platform_announcements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    type TEXT DEFAULT 'info', -- 'info', 'warning', 'success', 'error'
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

-- 2.5 Tabela de Profissionais e Gestores (Isolados por Salão)
CREATE TABLE public.cap_staff (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.cap_tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('professional', 'manager')),
    commission_rate NUMERIC DEFAULT 0.00,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, email)
);

-- 2.6 Tabela de Clientes (Isolados por Salão)
CREATE TABLE public.cap_clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.cap_tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    birth_date DATE,
    password_hash TEXT NOT NULL,
    anamnese_data JSONB DEFAULT '{}'::jsonb,
    vip_tier TEXT DEFAULT 'Prata' CHECK (vip_tier IN ('Prata', 'Ouro', 'VIP', 'Black')),
    referral_code VARCHAR(20) UNIQUE, -- Código próprio do cliente para Indique e Ganhe
    referred_by UUID REFERENCES public.cap_clients(id) ON DELETE SET NULL, -- Quem o indicou
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, phone)
);
CREATE INDEX IF NOT EXISTS idx_cap_clients_referral_code ON public.cap_clients(referral_code);
CREATE INDEX IF NOT EXISTS idx_cap_clients_referred_by ON public.cap_clients(referred_by);

-- 2.7 Serviços
CREATE TABLE public.cap_services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.cap_tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    duration_minutes INT NOT NULL,
    price NUMERIC NOT NULL,
    reduces_stock BOOLEAN DEFAULT FALSE, -- Flag se exige baixa de estoque
    maintenance_days INT DEFAULT 0, -- Dias para retorno (0 se não houver)
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.8 Horários de Funcionamento Padrão
CREATE TABLE public.cap_business_hours (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.cap_tenants(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL,
    open_time TIME NOT NULL,
    close_time TIME NOT NULL,
    is_closed BOOLEAN DEFAULT FALSE,
    UNIQUE(tenant_id, day_of_week)
);

-- 2.9 Exceções de Datas e Bloqueios
CREATE TABLE public.cap_date_exceptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.cap_tenants(id) ON DELETE CASCADE,
    exception_date DATE NOT NULL,
    is_closed BOOLEAN DEFAULT FALSE,
    open_time TIME,
    close_time TIME,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, exception_date)
);

-- 2.10 Estoque
CREATE TABLE public.cap_inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.cap_tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    quantity NUMERIC NOT NULL DEFAULT 0,
    unit TEXT NOT NULL, -- ml, un, gr
    min_quantity NUMERIC NOT NULL DEFAULT 0,
    type TEXT DEFAULT 'professional', -- 'sale' ou 'professional'
    price NUMERIC DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT chk_inventory_quantity_non_negative CHECK (quantity >= 0)
);

-- 2.11 Relação Serviço x Estoque (Quantos itens o serviço gasta)
CREATE TABLE public.cap_service_inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.cap_tenants(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES public.cap_services(id) ON DELETE CASCADE,
    inventory_id UUID NOT NULL REFERENCES public.cap_inventory(id) ON DELETE CASCADE,
    quantity_consumed NUMERIC NOT NULL -- Ex: 30 (ml)
);

-- 2.12 Agendamentos
CREATE TABLE public.cap_appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.cap_tenants(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.cap_clients(id),
    staff_id UUID NOT NULL REFERENCES public.cap_staff(id),
    service_id UUID NOT NULL REFERENCES public.cap_services(id),
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'scheduled', -- scheduled, in-progress, completed, cancelled
    total_price NUMERIC NOT NULL,
    staff_commission_value NUMERIC DEFAULT 0, -- Calculado automaticamente ao concluir
    commission_status TEXT DEFAULT 'pending', -- pending, paid
    commission_paid_at TIMESTAMPTZ,
    client_membership_id UUID, -- Referência ao plano do clube (caso use créditos de assinatura)
    checkin_status TEXT DEFAULT 'pending', -- pending, checked_in
    checkin_request TEXT, -- Ex: Café sem açúcar
    cashback_redeemed DECIMAL(10, 2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT no_overlapping_appointments EXCLUDE USING gist (
        tenant_id WITH =,
        staff_id WITH =,
        tstzrange(start_time, end_time) WITH &&
    ) WHERE (status <> 'cancelled')
);

-- 2.13 Prontuários e Histórico (Timeline)
CREATE TABLE public.cap_timeline_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.cap_tenants(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.cap_clients(id),
    appointment_id UUID REFERENCES public.cap_appointments(id),
    staff_id UUID REFERENCES public.cap_staff(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    image_path VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.14 Faturas da Plataforma (Assinaturas SaaS do Salão)
CREATE TABLE public.cap_invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.cap_tenants(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    status TEXT DEFAULT 'pending', -- 'pending', 'paid', 'overdue', 'cancelled'
    due_date DATE NOT NULL,
    paid_at TIMESTAMPTZ,
    payment_method TEXT,
    reference_month TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.15 Cupons de Desconto
CREATE TABLE public.cap_coupons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.cap_tenants(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value NUMERIC(10, 2) NOT NULL,
    max_uses INT,
    current_uses INT DEFAULT 0,
    expires_at TIMESTAMPTZ,
    service_id UUID REFERENCES public.cap_services(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, code),
    CONSTRAINT chk_coupon_uses CHECK (max_uses IS NULL OR current_uses <= max_uses),
    CONSTRAINT chk_coupon_current_uses_non_negative CHECK (current_uses >= 0)
);

-- 2.16 Leads da Landing Page
CREATE TABLE public.cap_leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    salon_name TEXT,
    status TEXT DEFAULT 'new', -- 'new', 'contacted', 'converted'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.17 Refresh Tokens (Autenticação Segura)
CREATE TABLE public.cap_refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL, -- Pode ser client_id, staff_id ou superadmin_id
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    family_id UUID, -- Usado para vincular o token ao Device Fingerprint (FINDING-07)
    is_revoked BOOLEAN DEFAULT FALSE,
    ip_address TEXT,
    user_agent TEXT,
    device_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_cap_refresh_tokens_device ON public.cap_refresh_tokens(device_id);

-- 2.18 Logs de Auditoria (Audit Trail)
CREATE TABLE public.cap_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES public.cap_tenants(id) ON DELETE CASCADE,
    user_id UUID,
    user_role TEXT,
    action TEXT NOT NULL,
    entity_name TEXT NOT NULL,
    entity_id UUID,
    old_data JSONB,
    new_data JSONB,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.18.1 Tabela de Imagens de CRM (Armazenamento por Tenant)
CREATE TABLE public.cap_crm_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.cap_tenants(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.cap_clients(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    size_bytes BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.19 Assinaturas Web Push (Para notificações no celular/PWA)
CREATE TABLE public.cap_push_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.cap_tenants(id) ON DELETE CASCADE,
    staff_id UUID REFERENCES public.cap_staff(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.cap_clients(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.20 Notificações In-App (Histórico do Sininho)
CREATE TABLE public.cap_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.cap_tenants(id) ON DELETE CASCADE,
    staff_id UUID REFERENCES public.cap_staff(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.cap_clients(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_tenant ON public.cap_audit_logs(tenant_id);
CREATE INDEX idx_audit_entity ON public.cap_audit_logs(entity_name, entity_id);
CREATE INDEX idx_audit_created_at ON public.cap_audit_logs(created_at);

-- ==========================================
-- 8. Tabelas de Feature Flags
-- ==========================================
CREATE TABLE IF NOT EXISTS public.cap_feature_flags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    is_active_global BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.cap_tenant_feature_flags (
    tenant_id UUID NOT NULL REFERENCES public.cap_tenants(id) ON DELETE CASCADE,
    feature_flag_id UUID NOT NULL REFERENCES public.cap_feature_flags(id) ON DELETE CASCADE,
    is_enabled BOOLEAN DEFAULT TRUE,
    PRIMARY KEY (tenant_id, feature_flag_id)
);

-- ==========================================
-- 9. Tabelas de Assinaturas e Fidelidade (Clube do Salão)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.cap_salon_memberships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.cap_tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('monthly', 'yearly')),
    service_ids JSONB DEFAULT '[]'::jsonb,
    usage_limit INTEGER NOT NULL DEFAULT 4 CHECK (usage_limit >= 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_salon_memberships_tenant ON public.cap_salon_memberships(tenant_id);

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
    CONSTRAINT unique_client_active_membership UNIQUE (client_id, membership_id)
);

CREATE INDEX IF NOT EXISTS idx_client_memberships_client ON public.cap_client_memberships(client_id);
CREATE INDEX IF NOT EXISTS idx_client_memberships_tenant ON public.cap_client_memberships(tenant_id);

-- ==========================================
-- 10. Tabelas do Caixa Rápido / PDV
-- ==========================================
CREATE TABLE IF NOT EXISTS public.cap_product_sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.cap_tenants(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.cap_clients(id) ON DELETE SET NULL,
    total_price DECIMAL(10, 2) NOT NULL,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('credit_card', 'debit_card', 'cash', 'pix')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_sales_tenant ON public.cap_product_sales(tenant_id);

CREATE TABLE IF NOT EXISTS public.cap_product_sale_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_id UUID NOT NULL REFERENCES public.cap_product_sales(id) ON DELETE CASCADE,
    inventory_id UUID NOT NULL REFERENCES public.cap_inventory(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10, 2) NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_product_sale_items_sale ON public.cap_product_sale_items(sale_id);

-- ==========================================
-- 11. Carteira Digital e Cashback
-- ==========================================
CREATE TABLE IF NOT EXISTS public.cap_client_wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.cap_tenants(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.cap_clients(id) ON DELETE CASCADE,
    balance DECIMAL(10, 2) NOT NULL DEFAULT 0.00 CHECK (balance >= 0.00),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_tenant_client_wallet UNIQUE (tenant_id, client_id)
);

CREATE INDEX IF NOT EXISTS idx_client_wallets_tenant_client ON public.cap_client_wallets(tenant_id, client_id);

CREATE TABLE IF NOT EXISTS public.cap_wallet_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.cap_tenants(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.cap_clients(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('credit', 'debit')),
    description TEXT NOT NULL,
    expires_at TIMESTAMPTZ,
    is_expired BOOLEAN NOT NULL DEFAULT FALSE,
    idempotency_key VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_wallet_idempotency UNIQUE (tenant_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_client ON public.cap_wallet_transactions(client_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_tenant_client ON public.cap_wallet_transactions(tenant_id, client_id);

-- ==========================================
-- 12. Tabelas de Experiência do Cliente (Lookbook)
-- ==========================================
CREATE TABLE public.cap_lookbook (
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

-- ==========================================
-- 13. Vales-Presente (Gift Cards)
-- ==========================================
CREATE TABLE public.cap_giftcards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.cap_tenants(id) ON DELETE CASCADE,
    purchaser_id UUID REFERENCES public.cap_clients(id) ON DELETE SET NULL,
    service_id UUID REFERENCES public.cap_services(id) ON DELETE CASCADE,
    request_id VARCHAR(50) UNIQUE,
    redemption_code VARCHAR(50) UNIQUE,
    recipient_name TEXT,
    recipient_phone VARCHAR(50),
    message TEXT,
    original_value NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (original_value >= 0),
    available_balance NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CONSTRAINT chk_giftcard_balance_non_negative CHECK (available_balance >= 0),
    payment_status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    status TEXT NOT NULL DEFAULT 'PENDING_PAYMENT' CHECK (status IN ('PENDING_PAYMENT', 'ACTIVE', 'PARTIALLY_REDEEMED', 'REDEEMED', 'EXPIRED', 'CANCELLED')),
    idempotency_key VARCHAR(100),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_giftcard_idempotency UNIQUE (tenant_id, idempotency_key)
);
CREATE INDEX IF NOT EXISTS idx_cap_giftcards_tenant ON public.cap_giftcards(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cap_giftcards_code ON public.cap_giftcards(redemption_code);

-- 13.1 Livro-Razão Imutável de Resgates de Vale-Presente (C10)
CREATE TABLE IF NOT EXISTS public.cap_giftcard_redemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.cap_tenants(id) ON DELETE CASCADE,
    giftcard_id UUID NOT NULL REFERENCES public.cap_giftcards(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES public.cap_appointments(id) ON DELETE SET NULL,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
    idempotency_key VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_giftcard_redemption_idempotency UNIQUE (tenant_id, idempotency_key)
);
CREATE INDEX IF NOT EXISTS idx_giftcard_redemptions_giftcard ON public.cap_giftcard_redemptions(giftcard_id);
CREATE INDEX IF NOT EXISTS idx_giftcard_redemptions_tenant ON public.cap_giftcard_redemptions(tenant_id);


-- ==========================================
-- SEGURANÇA E ACESSO (RLS)
-- ==========================================
ALTER TABLE public.cap_tenants DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.cap_clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.cap_staff DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.cap_services DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.cap_inventory DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.cap_service_inventory DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.cap_appointments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.cap_timeline_notes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.cap_invoices DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.cap_plans DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.cap_coupons DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.cap_audit_logs DISABLE ROW LEVEL SECURITY;

-- ==========================================
-- FUNÇÕES DE AUTENTICAÇÃO E REGISTRO
-- ==========================================
CREATE OR REPLACE FUNCTION cap_register_client(p_tenant_id UUID, p_name TEXT, p_phone TEXT, p_password TEXT)
RETURNS UUID AS $$
DECLARE
    new_id UUID;
BEGIN
    INSERT INTO public.cap_clients (tenant_id, name, phone, password_hash)
    VALUES (p_tenant_id, p_name, p_phone, crypt(p_password, gen_salt('bf')))
    RETURNING id INTO new_id;
    RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION cap_login_client(p_tenant_slug TEXT, p_phone TEXT, p_password TEXT)
RETURNS jsonb AS $$
DECLARE
    v_tenant_id UUID;
    v_client RECORD;
BEGIN
    SELECT id INTO v_tenant_id FROM public.cap_tenants WHERE slug = p_tenant_slug AND status = 'active';
    IF NOT FOUND THEN RETURN NULL; END IF;

    SELECT id, name, phone INTO v_client
    FROM public.cap_clients 
    WHERE tenant_id = v_tenant_id 
      AND phone = p_phone 
      AND password_hash = crypt(p_password, password_hash);
      
    IF NOT FOUND THEN RETURN NULL; END IF;

    RETURN jsonb_build_object('id', v_client.id, 'name', v_client.name, 'tenant_id', v_tenant_id, 'role', 'client');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION cap_login_staff(p_tenant_slug TEXT, p_email TEXT, p_password TEXT)
RETURNS jsonb AS $$
DECLARE
    v_tenant_id UUID;
    v_staff RECORD;
BEGIN
    SELECT id INTO v_tenant_id FROM public.cap_tenants WHERE slug = p_tenant_slug AND status = 'active';
    IF NOT FOUND THEN RETURN NULL; END IF;

    SELECT id, name, email, role INTO v_staff
    FROM public.cap_staff 
    WHERE tenant_id = v_tenant_id 
      AND email = p_email 
      AND password_hash = crypt(p_password, password_hash)
      AND is_active = true;
      
    IF NOT FOUND THEN RETURN NULL; END IF;

    RETURN jsonb_build_object('id', v_staff.id, 'name', v_staff.name, 'tenant_id', v_tenant_id, 'role', v_staff.role);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION cap_register_staff(
    p_tenant_id UUID, 
    p_name TEXT, 
    p_phone TEXT, 
    p_email TEXT,
    p_password TEXT, 
    p_role TEXT DEFAULT 'professional'
)
RETURNS UUID AS $$
DECLARE
    new_id UUID;
BEGIN
    INSERT INTO public.cap_staff (tenant_id, name, phone, email, password_hash, role, is_active)
    VALUES (
        p_tenant_id, 
        p_name, 
        p_phone, 
        p_email,
        crypt(p_password, gen_salt('bf')),
        p_role,
        true
    )
    RETURNING id INTO new_id;
    RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION cap_update_staff(
    p_staff_id UUID, 
    p_tenant_id UUID,
    p_name TEXT, 
    p_phone TEXT, 
    p_email TEXT,
    p_password TEXT, 
    p_role TEXT,
    p_is_active BOOLEAN
)
RETURNS void AS $$
BEGIN
    IF p_password IS NOT NULL AND p_password != '' THEN
        UPDATE public.cap_staff 
        SET name = p_name, phone = p_phone, email = p_email, role = p_role, is_active = p_is_active, password_hash = crypt(p_password, gen_salt('bf'))
        WHERE id = p_staff_id AND tenant_id = p_tenant_id;
    ELSE
        UPDATE public.cap_staff 
        SET name = p_name, phone = p_phone, email = p_email, role = p_role, is_active = p_is_active
        WHERE id = p_staff_id AND tenant_id = p_tenant_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION cap_update_client_password(
    p_client_id UUID, 
    p_tenant_id UUID,
    p_password TEXT
)
RETURNS void AS $$
BEGIN
    UPDATE public.cap_clients 
    SET password_hash = crypt(p_password, gen_salt('bf'))
    WHERE id = p_client_id AND tenant_id = p_tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- SUPER ADMIN INICIAL
-- ==========================================
INSERT INTO public.cap_platform_admins (email, password_hash, name)
VALUES (
    'cf95.souza@gmail.com',
    crypt('Mudar_senha_mestre_123', gen_salt('bf')),
    'Caio Admin'
),
(
    'thais98sn@gmail.com',
    crypt('Thais_Mestre@2026', gen_salt('bf')),
    'Thais Admin'
)
ON CONFLICT (email) DO NOTHING;

-- ==========================================
-- PLANOS DE ASSINATURA SAAS INICIAIS
-- ==========================================
INSERT INTO public.cap_plans (id, name, slug, description, price, yearly_price, sort_order, interval, max_professionals, max_banners, max_whatsapp_messages, is_featured, badge_label, features, marketing_features, extra_professional_price, is_active)
VALUES 
(
    '82efb0c4-7b6e-4519-b758-ca834579d1c3',
    'Básico',
    'basico',
    'Solução completa para o seu salão de beleza.',
    69.90,
    699.00,
    1,
    'month',
    2,
    1,
    0,
    FALSE,
    NULL,
    '["dashboard", "agenda", "clientes", "servicos", "push_notifications", "coupons", "minisite", "estoque", "caixa"]'::jsonb,
    '["Profissionais ilimitados", "Agenda online com link exclusivo", "App com a sua marca e cores", "WhatsApp ilimitado", "Suporte via WhatsApp"]'::jsonb,
    15.00,
    TRUE
),
(
    'e7575321-7884-4246-97c1-0f8247bee41d',
    'Essencial',
    'essencial',
    'Para salões e estúdios em crescimento que precisam de controle operacional e financeiro.',
    79.90,
    799.00,
    2,
    'month',
    3,
    2,
    0,
    FALSE,
    NULL,
    '["dashboard", "agenda", "clientes", "servicos", "push_notifications", "coupons", "minisite", "estoque", "financeiro", "comissoes", "caixa"]'::jsonb,
    '["Até 3 profissionais", "Tudo do plano Básico", "Controle de estoque de produtos & insumos", "Controle de caixa & fluxo financeiro", "Cálculo automático de comissões", "Relatórios gerenciais essenciais", "Suporte por WhatsApp em horário comercial"]'::jsonb,
    15.00,
    TRUE
),
(
    'ef2a03e2-a6ca-41eb-b091-c2b9bd990c98',
    'Premium',
    'premium',
    'O pacote completo de retenção, fidelidade e automação de agendamentos.',
    129.90,
    1299.00,
    3,
    'month',
    6,
    3,
    200,
    TRUE,
    'Mais Escolhido',
    '["dashboard", "agenda", "clientes", "servicos", "push_notifications", "coupons", "minisite", "estoque", "financeiro", "comissoes", "caixa", "clube", "cashback", "packages", "anamnesis", "reviews", "waitlist", "campaigns", "referrals"]'::jsonb,
    '["Até 6 profissionais", "Tudo do plano Essencial", "Clube de fidelidade & cashback automático", "Pacotes de sessões pré-pagos", "Anamnese digital & termos com assinatura", "Avaliações & impulsionador Google Reviews", "Lista de espera inteligente", "Campanhas automáticas (aniversário & retorno)", "Indique e Ganhe (programa de embaixadoras)", "200 mensagens WhatsApp/mês incluídas", "3 banners promocionais no app", "Suporte prioritário por WhatsApp"]'::jsonb,
    15.00,
    TRUE
),
(
    '532158cd-2624-464e-ad27-6598a1ddb4df',
    'Signature',
    'signature',
    'Experiência exclusiva para grandes salões, redes e clínicas que exigem o máximo de controle.',
    199.90,
    1999.00,
    4,
    'month',
    12,
    5,
    500,
    FALSE,
    'Alta Performance',
    '["dashboard", "agenda", "clientes", "servicos", "push_notifications", "coupons", "minisite", "estoque", "financeiro", "comissoes", "caixa", "clube", "cashback", "packages", "anamnesis", "reviews", "waitlist", "campaigns", "referrals", "pdv", "vales", "giftcards", "whatsapp_gateway", "bi_reports", "custom_domain", "priority_support"]'::jsonb,
    '["Até 12 profissionais (R$ 15/adicional)", "Tudo do plano Premium", "PDV unificado com conferência cega de caixa", "Vales-presente digitais (Gift Cards)", "Gateway nativo de WhatsApp conectado", "Relatórios analíticos avançados & BI", "500 mensagens WhatsApp/mês incluídas", "5 banners promocionais simultâneos", "Importação assistida de dados", "Gerente de conta dedicado"]'::jsonb,
    15.00,
    TRUE
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    slug = EXCLUDED.slug,
    description = EXCLUDED.description,
    price = EXCLUDED.price,
    yearly_price = EXCLUDED.yearly_price,
    sort_order = EXCLUDED.sort_order,
    max_professionals = EXCLUDED.max_professionals,
    max_banners = EXCLUDED.max_banners,
    max_whatsapp_messages = EXCLUDED.max_whatsapp_messages,
    is_featured = EXCLUDED.is_featured,
    badge_label = EXCLUDED.badge_label,
    features = EXCLUDED.features,
    marketing_features = EXCLUDED.marketing_features,
    extra_professional_price = EXCLUDED.extra_professional_price,
    is_active = EXCLUDED.is_active;

-- ==========================================
-- ÍNDICES DE PERFORMANCE
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_appointments_tenant_time ON public.cap_appointments(tenant_id, start_time);
CREATE INDEX IF NOT EXISTS idx_clients_tenant_phone ON public.cap_clients(tenant_id, phone);
CREATE INDEX IF NOT EXISTS idx_staff_tenant_email ON public.cap_staff(tenant_id, email);

-- ==========================================
-- 6.5 AVALIAÇÕES (REVIEWS)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.cap_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES public.cap_tenants(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.cap_clients(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES public.cap_appointments(id) ON DELETE SET NULL,
    professional_id UUID REFERENCES public.cap_staff(id) ON DELETE SET NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 6.6 LISTA DE ESPERA
-- ==========================================
CREATE TABLE IF NOT EXISTS public.cap_waitlist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES public.cap_tenants(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.cap_clients(id) ON DELETE CASCADE,
    service_id UUID REFERENCES public.cap_services(id) ON DELETE SET NULL,
    professional_id UUID REFERENCES public.cap_staff(id) ON DELETE SET NULL,
    desired_date DATE NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 6.7 TERMOS E LGPD
-- ==========================================
CREATE TABLE IF NOT EXISTS public.cap_terms_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES public.cap_tenants(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.cap_consents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES public.cap_tenants(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.cap_clients(id) ON DELETE CASCADE,
    staff_id UUID REFERENCES public.cap_staff(id) ON DELETE SET NULL,
    term_template_id UUID REFERENCES public.cap_terms_templates(id) ON DELETE SET NULL,
    content_snapshot TEXT NOT NULL,
    client_ip TEXT,
    user_agent TEXT,
    digital_hash TEXT,
    status TEXT DEFAULT 'pending',
    signed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 7. USUÁRIO COM PRIVILÉGIO MÍNIMO (C5 - P1)
-- ==========================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'opera_app') THEN
        CREATE ROLE opera_app WITH LOGIN PASSWORD 'opera_app_secure_pass';
    END IF;
END
$$;

ALTER ROLE opera_app WITH NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT CONNECT ON DATABASE operabeauty TO opera_app;
GRANT USAGE ON SCHEMA public TO opera_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO opera_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO opera_app;
GRANT EXECUTE ON ALL ROUTINES IN SCHEMA public TO opera_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO opera_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO opera_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON ROUTINES TO opera_app;

-- ==========================================
-- 8. ISOLAMENTO POR TENANT EM PROFUNDIDADE (RLS - C6 P1)
-- ==========================================
DO $$
DECLARE
    tbl_rec RECORD;
BEGIN
    FOR tbl_rec IN 
        SELECT DISTINCT table_name 
        FROM information_schema.columns 
        WHERE column_name = 'tenant_id' 
          AND table_schema = 'public'
        ORDER BY table_name
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl_rec.table_name);
        EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_policy ON public.%I;', tbl_rec.table_name);
        EXECUTE format('
            CREATE POLICY tenant_isolation_policy ON public.%I
            AS PERMISSIVE
            FOR ALL
            TO opera_app, postgres
            USING (
                current_setting(''app.current_tenant_id'', true) = tenant_id::text
                OR current_setting(''app.is_superadmin'', true) = ''true''
                OR current_setting(''app.bypass_rls'', true) = ''true''
            )
            WITH CHECK (
                current_setting(''app.current_tenant_id'', true) = tenant_id::text
                OR current_setting(''app.is_superadmin'', true) = ''true''
                OR current_setting(''app.bypass_rls'', true) = ''true''
            );
        ', tbl_rec.table_name);
    END LOOP;
END
$$;
-- ==============================================================================
-- FASE 44 - ITEM D2 (P1): OPERABEAUTY WHATSAPP GATEWAY NATIVO (BAILEYS V7)
-- ==============================================================================

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

CREATE INDEX IF NOT EXISTS idx_wa_instances_tenant ON public.cap_whatsapp_instances(tenant_id);
CREATE INDEX IF NOT EXISTS idx_wa_auth_keys_tenant_key ON public.cap_whatsapp_auth_keys(tenant_id, key_name);
CREATE INDEX IF NOT EXISTS idx_wa_messages_tenant ON public.cap_whatsapp_messages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_wa_messages_appointment ON public.cap_whatsapp_messages(appointment_id);
CREATE INDEX IF NOT EXISTS idx_wa_messages_status ON public.cap_whatsapp_messages(status);

ALTER TABLE public.cap_whatsapp_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cap_whatsapp_auth_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cap_whatsapp_messages ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'opera_app') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.cap_whatsapp_instances TO opera_app;
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.cap_whatsapp_auth_keys TO opera_app;
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.cap_whatsapp_messages TO opera_app;
    END IF;
END $$;

-- ==========================================
-- 16. Tabelas de Anamnese Dinâmica (CRM / LGPD)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.cap_anamnesis_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.cap_tenants(id) ON DELETE CASCADE,
    fields_schema JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_anamnesis_template_tenant UNIQUE (tenant_id)
);

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

CREATE INDEX IF NOT EXISTS idx_anamnesis_templates_tenant ON public.cap_anamnesis_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_client_anamnesis_tenant ON public.cap_client_anamnesis(tenant_id);
CREATE INDEX IF NOT EXISTS idx_client_anamnesis_client ON public.cap_client_anamnesis(client_id);
CREATE INDEX IF NOT EXISTS idx_client_anamnesis_expires ON public.cap_client_anamnesis(expires_at);

ALTER TABLE public.cap_anamnesis_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cap_client_anamnesis ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'opera_app') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.cap_anamnesis_templates TO opera_app;
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.cap_client_anamnesis TO opera_app;
    END IF;
END $$;

