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
DROP TABLE IF EXISTS public.cap_plans CASCADE;
DROP TABLE IF EXISTS public.cap_platform_settings CASCADE;
DROP TABLE IF EXISTS public.cap_tenants CASCADE;

-- ==========================================
-- 1. EXTENSÕES NECESSÁRIAS
-- ==========================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 2. CRIAÇÃO DAS TABELAS (MULTI-TENANT & SAAS)
-- ==========================================

-- 2.1 Tabela de Planos de Assinatura (SaaS)
CREATE TABLE public.cap_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    interval TEXT DEFAULT 'month',
    max_professionals INT, -- NULL ou 0 significa ilimitado
    max_banners INT DEFAULT 1, -- Limite de banners promocionais
    features JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

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
    
    -- Contato e Localização
    address TEXT,
    social_instagram TEXT,
    social_facebook TEXT,
    social_whatsapp TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.4 Tabela de Super Admins da Plataforma (SaaS Mestre)
CREATE TABLE public.cap_platform_admins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
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
    anamnese_data JSONB DEFAULT '{}'::jsonb, -- 100% Dinâmico e Aberto para o Gestor customizar
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, phone)
);

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
    created_at TIMESTAMPTZ DEFAULT NOW()
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
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.13 Prontuários e Histórico (Timeline)
CREATE TABLE public.cap_timeline_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.cap_tenants(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.cap_clients(id),
    appointment_id UUID REFERENCES public.cap_appointments(id),
    staff_id UUID REFERENCES public.cap_staff(id),
    content TEXT NOT NULL,
    image_path TEXT,
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
    UNIQUE(tenant_id, code)
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
    user_agent TEXT
);

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

CREATE INDEX idx_audit_tenant ON public.cap_audit_logs(tenant_id);
CREATE INDEX idx_audit_entity ON public.cap_audit_logs(entity_name, entity_id);
CREATE INDEX idx_audit_created_at ON public.cap_audit_logs(created_at);


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


-- 4.1 Criar Cliente com Senha Segura
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

-- 4.2 Login de Cliente
CREATE OR REPLACE FUNCTION cap_login_client(p_tenant_slug TEXT, p_phone TEXT, p_password TEXT)
RETURNS jsonb AS $$
DECLARE
    v_tenant_id UUID;
    v_client RECORD;
BEGIN
    -- 1. Achar o tenant pelo slug
    SELECT id INTO v_tenant_id FROM public.cap_tenants WHERE slug = p_tenant_slug AND status = 'active';
    IF NOT FOUND THEN RETURN NULL; END IF;

    -- 2. Achar cliente e validar senha usando pgcrypto
    SELECT id, name, phone INTO v_client
    FROM public.cap_clients 
    WHERE tenant_id = v_tenant_id 
      AND phone = p_phone 
      AND password_hash = crypt(p_password, password_hash);
      
    IF NOT FOUND THEN RETURN NULL; END IF;

    -- 3. Retornar os dados não sensíveis
    RETURN jsonb_build_object('id', v_client.id, 'name', v_client.name, 'tenant_id', v_tenant_id, 'role', 'client');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4.3 Login de Membro da Equipe (Staff)
CREATE OR REPLACE FUNCTION cap_login_staff(p_tenant_slug TEXT, p_email TEXT, p_password TEXT)
RETURNS jsonb AS $$
DECLARE
    v_tenant_id UUID;
    v_staff RECORD;
BEGIN
    -- 1. Achar o tenant pelo slug
    SELECT id INTO v_tenant_id FROM public.cap_tenants WHERE slug = p_tenant_slug AND status = 'active';
    IF NOT FOUND THEN RETURN NULL; END IF;

    -- 2. Achar staff e validar senha usando pgcrypto
    SELECT id, name, email, role INTO v_staff
    FROM public.cap_staff 
    WHERE tenant_id = v_tenant_id 
      AND email = p_email 
      AND password_hash = crypt(p_password, password_hash)
      AND is_active = true;
      
    IF NOT FOUND THEN RETURN NULL; END IF;

    -- 3. Retornar os dados não sensíveis
    RETURN jsonb_build_object('id', v_staff.id, 'name', v_staff.name, 'tenant_id', v_tenant_id, 'role', v_staff.role);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4.4 Criar Staff com Senha Segura
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

-- 4.5 Atualizar Staff (com senha opcional)
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

-- 4.6 Atualizar Senha de Cliente pelo Gestor
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


INSERT INTO public.cap_platform_admins (email, password_hash, name)
VALUES (
    'cf95.souza@gmail.com',
    crypt('mudar_senha_mestre_123', gen_salt('bf')),
    'Super Admin'
)
ON CONFLICT (email) DO NOTHING;


CREATE INDEX IF NOT EXISTS idx_appointments_tenant_time ON public.cap_appointments(tenant_id, start_time);
CREATE INDEX IF NOT EXISTS idx_clients_tenant_phone ON public.cap_clients(tenant_id, phone);
CREATE INDEX IF NOT EXISTS idx_staff_tenant_email ON public.cap_staff(tenant_id, email);


CREATE TABLE IF NOT EXISTS public.cap_refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Binding e Rotação
    family_id UUID, -- Identifica a família de tokens (rotação)
    is_revoked BOOLEAN DEFAULT FALSE, -- Flag de invalidação
    ip_address TEXT, -- IP associado ao token original
    user_agent TEXT -- Dispositivo associado
);


