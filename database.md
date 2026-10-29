# Estrutura do Banco de Dados PostgreSQL (OperaBeauty)

Este arquivo descreve a estrutura oficial e definitiva do banco de dados PostgreSQL do OperaBeauty SaaS Multi-Tenant.
Ele é o documento oficial de referência para a implantação do banco de dados em homologação e produção (VPS).

---

## 1. DDL de Criação das Tabelas

O script abaixo cria todas as tabelas necessárias, os relacionamentos e as restrições de integridade.

```sql
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
CREATE EXTENSION IF NOT EXISTS btree_gist;

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

-- 2.1.1 Tabela de Tokens de Sessão e Atualização (C3)
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
    
    -- Governança do Programa de Revenda & Sustentabilidade Financeira (F4)
    reseller_program_enabled BOOLEAN NOT NULL DEFAULT FALSE, -- Inicia desligado para proteger o fluxo de caixa
    reseller_default_commission_rate NUMERIC(5, 2) NOT NULL DEFAULT 20.00, -- 20% sobre mensalidades ativas
    
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
    
    -- Customização Visual (Branding & Temas White-Label - Item A5)
    theme_id VARCHAR(50) DEFAULT 'rose', -- rose, nude, lavender, sage, noir, bordeaux, custom
    brand_hex VARCHAR(7) DEFAULT '#8E3B4E', -- Cor de marca livre (modo personalizado)
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
    
    -- Política de Cancelamento e Faltas (D8 P1)
    min_cancellation_hours INT DEFAULT 2, -- Prazo mínimo em horas para cancelar/remarcar online
    no_show_penalty_action VARCHAR(30) DEFAULT 'warn', -- warn, require_deposit, block
    no_show_tolerance_count INT DEFAULT 2, -- Tolerância de faltas antes da penalidade
    
    -- Onboarding Guiado e Display de Mesa QR Code (D11 P1)
    onboarding_dismissed BOOLEAN DEFAULT FALSE, -- Flag se o gestor dispensou/minimizou o guia inicial
    qr_code_generated_at TIMESTAMPTZ, -- Data/hora em que gerou ou imprimiu o display de balcão
    
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
    no_show_count INT DEFAULT 0, -- Contador de faltas acumuladas (D8 P1)
    is_blocked BOOLEAN DEFAULT FALSE, -- Trava de bloqueio para agendamentos online
    blocked_reason TEXT, -- Motivo do bloqueio do cliente
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, phone)
);
CREATE INDEX IF NOT EXISTS idx_cap_clients_is_blocked ON public.cap_clients(tenant_id, is_blocked);
CREATE INDEX IF NOT EXISTS idx_cap_clients_referral_code ON public.cap_clients(referral_code);
CREATE INDEX IF NOT EXISTS idx_cap_clients_referred_by ON public.cap_clients(referred_by);

-- 2.7 Serviços
CREATE TABLE public.cap_services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.cap_tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    short_description TEXT, -- Descrição curta para exibição no catálogo público (D4)
    duration_minutes INT NOT NULL,
    price NUMERIC NOT NULL,
    is_starting_price BOOLEAN DEFAULT FALSE,
    reduces_stock BOOLEAN DEFAULT FALSE, -- Flag se exige baixa de estoque
    maintenance_days INT DEFAULT 0, -- Dias para retorno (0 se não houver)
    requires_deposit BOOLEAN NOT NULL DEFAULT FALSE, -- Exige pagamento de sinal antecipado (D3)
    deposit_type VARCHAR(20) NOT NULL DEFAULT 'percentage', -- 'percentage' ou 'fixed'
    deposit_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00, -- Valor ou percentual do sinal
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.7.1 Relacionamento Profissional x Serviço (Limitação de Serviços)
CREATE TABLE public.cap_staff_services (
    staff_id UUID REFERENCES public.cap_staff(id) ON DELETE CASCADE,
    service_id UUID REFERENCES public.cap_services(id) ON DELETE CASCADE,
    PRIMARY KEY (staff_id, service_id)
);

-- 2.7.2 Variações de Preço e Tamanho do Serviço (Item D12 P2)
CREATE TABLE public.cap_service_variations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- 2.7.3 Extras e Adicionais Opcionais do Serviço (Item D12 P2)
CREATE TABLE public.cap_service_extras (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- 2.7.4 Modelos de Pacotes de Sessões do Salão (Item D13 P2)
CREATE TABLE public.cap_packages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- 2.7.5 Pacotes Adquiridos por Clientes / Saldo de Sessões (Item D13 P2)
CREATE TABLE public.cap_client_packages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- 2.7.6 Histórico de Consumo / Estorno de Sessões de Pacotes (Item D13 P2)
CREATE TABLE public.cap_package_usages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
    client_membership_id UUID, -- Referência ao plano do clube (caso use créditos de assinatura)
    checkin_status TEXT DEFAULT 'pending', -- pending, checked_in
    checkin_request TEXT, -- Ex: Café sem açúcar
    discount_applied NUMERIC(10, 2) DEFAULT 0.00,
    payment_method TEXT DEFAULT 'credit_card', -- credit_card, debit_card, cash, pix, gift_card, membership, package
    client_package_id UUID REFERENCES public.cap_client_packages(id) ON DELETE SET NULL, -- Referência ao pacote de sessões (D13)
    is_package_session BOOLEAN NOT NULL DEFAULT FALSE, -- Flag de abatimento de sessão de pacote (D13)
    deposit_status VARCHAR(30) NOT NULL DEFAULT 'none', -- none, pending, paid, expired, refunded (D3)
    deposit_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    deposit_provider VARCHAR(50), -- mercadopago, asaas, abacatepay, manual_pix, simulator
    deposit_payment_id VARCHAR(120),
    deposit_pix_code TEXT,
    deposit_pix_qr TEXT,
    deposit_expires_at TIMESTAMPTZ,
    deposit_paid_at TIMESTAMPTZ,
    
    -- Controle de Faltas e Cancelamento (D8 P1)
    no_show_marked_at TIMESTAMPTZ, -- Data/hora em que a falta foi registrada
    no_show_marked_by UUID REFERENCES public.cap_staff(id) ON DELETE SET NULL, -- Profissional/gestor que registrou
    cancellation_reason TEXT, -- Motivo do cancelamento (se cancelado)
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT no_overlapping_appointments EXCLUDE USING gist (
        tenant_id WITH =,
        staff_id WITH =,
        tstzrange(start_time, end_time) WITH &&
    ) WHERE (status <> 'cancelled')
);
CREATE INDEX IF NOT EXISTS idx_cap_appointments_status ON public.cap_appointments(tenant_id, status);

-- 2.12.1 Tabela de Múltiplos Serviços por Visita (Item D4 P1 & D12 P2)
CREATE TABLE public.cap_appointment_services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    appointment_id UUID NOT NULL REFERENCES public.cap_appointments(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES public.cap_services(id) ON DELETE RESTRICT,
    tenant_id UUID NOT NULL REFERENCES public.cap_tenants(id) ON DELETE CASCADE,
    price NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    duration_minutes INT NOT NULL DEFAULT 30,
    commission_percentage NUMERIC(5,2) DEFAULT 0,
    commission_amount NUMERIC(10,2) DEFAULT 0.00,
    order_index INT NOT NULL DEFAULT 0,
    variation_id UUID REFERENCES public.cap_service_variations(id) ON DELETE SET NULL, -- Variação de tamanho/preço (D12)
    variation_name TEXT, -- Snapshot do nome da variação (D12)
    selected_extras JSONB DEFAULT '[]'::jsonb, -- Array de extras adicionados [{ id, name, price, duration_minutes }] (D12)
    created_at TIMESTAMPTZ DEFAULT NOW()
);
-- 2.12.2 Lista de Espera e Ofertas de Vagas (D6)
CREATE TABLE public.cap_waitlist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES public.cap_tenants(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.cap_clients(id) ON DELETE CASCADE,
    service_id UUID REFERENCES public.cap_services(id) ON DELETE SET NULL,
    professional_id UUID REFERENCES public.cap_staff(id) ON DELETE SET NULL,
    desired_date DATE NOT NULL,
    status TEXT DEFAULT 'pending', -- pending, offered, converted, expired, cancelled
    preferred_time_range TEXT DEFAULT 'any', -- any, morning, afternoon, night
    offered_at TIMESTAMPTZ, -- Momento em que a vaga liberada foi oferecida ao cliente
    expires_at TIMESTAMPTZ, -- Prazo limite para o cliente garantir a vaga (ex: 30 minutos)
    notified_at TIMESTAMPTZ, -- Timestamp da notificacao enviada (Web Push / WhatsApp)
    appointment_id UUID REFERENCES public.cap_appointments(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cap_waitlist_pending_order ON public.cap_waitlist(tenant_id, desired_date, status, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_cap_waitlist_expired_offers ON public.cap_waitlist(status, expires_at) WHERE status = 'offered';

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

-- 2.14 Faturas da Plataforma (Assinaturas SaaS do Salão - D18 P1)
CREATE TABLE public.cap_invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.cap_tenants(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    status TEXT DEFAULT 'pending', -- 'pending', 'paid', 'overdue', 'cancelled'
    due_date DATE NOT NULL,
    paid_at TIMESTAMPTZ,
    payment_method TEXT,
    reference_month TEXT NOT NULL,
    pix_copy_paste TEXT, -- Código Copia e Cola PIX da fatura
    pix_qr_code TEXT, -- Imagem ou Base64 do QR Code PIX
    gateway_transaction_id VARCHAR(120), -- ID de transação no gateway
    gateway_invoice_url TEXT, -- Link de checkout externo (cartão/boleto)
    grace_period_days INT DEFAULT 5, -- Dias de tolerância pós-vencimento antes de bloquear
    warnings_sent JSONB DEFAULT '[]'::jsonb, -- Histórico dos avisos enviados (3 dias antes, vencimento, atraso)
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cap_invoices_status_due ON public.cap_invoices(tenant_id, status, due_date);
CREATE INDEX IF NOT EXISTS idx_cap_invoices_gateway_tx ON public.cap_invoices(gateway_transaction_id);

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

-- 2.21 Templates de Ficha de Anamnese (Form Builder Dinâmico por Salão)
CREATE TABLE public.cap_anamnesis_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.cap_tenants(id) ON DELETE CASCADE,
    fields_schema JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_anamnesis_template_tenant UNIQUE (tenant_id)
);

-- 2.22 Respostas de Anamnese dos Clientes (Prontuário & LGPD)
CREATE TABLE public.cap_client_anamnesis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.cap_tenants(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.cap_clients(id) ON DELETE CASCADE,
    answers JSONB NOT NULL DEFAULT '{}'::jsonb,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_client_anamnesis UNIQUE (tenant_id, client_id)
);

-- 2.23 Tabela de Configurações de Gateway Próprio & Sinal PIX (Multi-Gateway Híbrido - Item D3 P1)
CREATE TABLE public.cap_tenant_gateway_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.cap_tenants(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL DEFAULT 'manual_pix', -- mercadopago, asaas, abacatepay, manual_pix, simulator
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    sandbox_mode BOOLEAN NOT NULL DEFAULT FALSE,
    deposit_expiration_minutes INTEGER NOT NULL DEFAULT 15,
    encrypted_credentials TEXT, -- AES-256-GCM: enc:v1:<iv>:<tag>:<ciphertext> (tokens privados)
    public_key TEXT,            -- Chave pública segura para inicialização frontend
    pix_key VARCHAR(150),       -- Chave PIX direta do salão
    pix_key_type VARCHAR(30),   -- cpf, cnpj, email, phone, random
    holder_name VARCHAR(150),   -- Nome do titular da conta bancária
    instructions TEXT,          -- Instruções personalizadas do salão para a cliente
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_tenant_gateway_config UNIQUE (tenant_id)
);

CREATE INDEX idx_audit_tenant ON public.cap_audit_logs(tenant_id);
CREATE INDEX idx_audit_entity ON public.cap_audit_logs(entity_name, entity_id);
CREATE INDEX idx_audit_created_at ON public.cap_audit_logs(created_at);
CREATE INDEX idx_anamnesis_templates_tenant ON public.cap_anamnesis_templates(tenant_id);
CREATE INDEX idx_client_anamnesis_tenant ON public.cap_client_anamnesis(tenant_id);
CREATE INDEX idx_client_anamnesis_client ON public.cap_client_anamnesis(client_id);
CREATE INDEX idx_client_anamnesis_expires ON public.cap_client_anamnesis(expires_at);
CREATE INDEX idx_tenant_gateway_configs_tenant ON public.cap_tenant_gateway_configs(tenant_id);
CREATE INDEX idx_appointments_deposit_status ON public.cap_appointments(deposit_status);
CREATE INDEX idx_appointments_deposit_expires ON public.cap_appointments(deposit_expires_at);
CREATE INDEX idx_appointments_deposit_payment_id ON public.cap_appointments(deposit_payment_id);
```

---

## 3. Segurança e Acesso (RLS)

> [!NOTE]
> Durante a fase de desenvolvimento e testes locais, o Row Level Security (RLS) pode estar temporariamente desabilitado. Na implantação de produção (VPS), o controle lógico de tenant é feito no backend (Express) e reforçado no banco conforme necessário.

```sql
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
```

---

## 4. Funções e Procedures de Autenticação (pgcrypto)

Estas funções executam a criptografia de senhas no lado do banco utilizando `blowfish` (`bf`).

```sql
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
```

---

## 5. Seed de Inicialização (Super Admin Padrão)

Para criar o primeiro administrador mestre da plataforma SaaS:

```sql
INSERT INTO public.cap_platform_admins (email, password_hash, name)
VALUES (
    'cf95.souza@gmail.com',
    crypt('mudar_senha_mestre_123', gen_salt('bf')),
    'Super Admin'
)
ON CONFLICT (email) DO NOTHING;
```

---

## 6. Índices de Performance

Para otimizar consultas pesadas (como filtragem de agendamentos por data e logins por telefone/email), os seguintes índices foram criados:

```sql
CREATE INDEX IF NOT EXISTS idx_appointments_tenant_time ON public.cap_appointments(tenant_id, start_time);
CREATE INDEX IF NOT EXISTS idx_clients_tenant_phone ON public.cap_clients(tenant_id, phone);
CREATE INDEX IF NOT EXISTS idx_staff_tenant_email ON public.cap_staff(tenant_id, email);
```

---

## 7. Tabela de Controle de Sessões e Refresh Tokens

Esta tabela gerencia o tempo de vida das sessões (refresh tokens), prevenindo fixação de sessão e permitindo invalidação de dispositivos (FINDING-07).

```sql
CREATE TABLE IF NOT EXISTS public.cap_refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Binding e Rotação
    family_id UUID, -- Identifica a família de tokens (rotação)
    is_revoked BOOLEAN DEFAULT FALSE, -- Flag de invalidação
    ip_address TEXT, -- IP associado ao token original (sinal de auditoria)
    user_agent TEXT, -- Dispositivo associado
    device_id TEXT -- Identificador estável do dispositivo (C3 - P0)
);

CREATE INDEX IF NOT EXISTS idx_cap_refresh_tokens_device ON public.cap_refresh_tokens(device_id);
```

---

## 8. Tabelas de Feature Flags (Gestão de Módulos Beta)

Estas tabelas gerenciam quais funcionalidades experimentais ou premium estão ativas globalmente ou por tenant (salão).

```sql
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
```

---

## 9. Tabelas de Assinaturas e Fidelidade (Clube do Salão)

Estas tabelas gerenciam os planos de assinatura locais criados pelos salões e o saldo de créditos das clientes.

```sql
CREATE TABLE IF NOT EXISTS public.cap_salon_memberships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.cap_tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('monthly', 'yearly')),
    service_id UUID NOT NULL REFERENCES public.cap_services(id) ON DELETE CASCADE,
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
```

---

## 10. Tabelas do Caixa Rápido / PDV (Vendas Físicas)

Estas tabelas registram as vendas diretas de produtos em estoque realizadas na frente de caixa, dando a baixa automática de quantidade e vinculando a clientes de forma opcional.

```sql
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
```

---

## 11. Tabelas de Carteira Digital e Cashback

Estas tabelas controlam o saldo de cashback acumulado pelas clientes ao realizar serviços, bem como o extrato de movimentação financeira (crédito por serviço, débito por agendamento ou baixa por expiração).

```sql
-- Adicionar colunas de configuração à tabela de Tenants
ALTER TABLE public.cap_tenants
ADD COLUMN IF NOT EXISTS cashback_percentage DECIMAL(5, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS cashback_expiration_days INTEGER DEFAULT 30;

-- Adicionar coluna de controle de resgate ao agendamento
ALTER TABLE public.cap_appointments
ADD COLUMN IF NOT EXISTS cashback_redeemed DECIMAL(10, 2) DEFAULT 0.00;

-- Criar tabela de Carteiras
CREATE TABLE IF NOT EXISTS public.cap_client_wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.cap_tenants(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.cap_clients(id) ON DELETE CASCADE,
    balance DECIMAL(10, 2) NOT NULL DEFAULT 0.00 CHECK (balance >= 0.00),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_tenant_client_wallet UNIQUE (tenant_id, client_id)
);

CREATE INDEX IF NOT EXISTS idx_client_wallets_tenant_client ON public.cap_client_wallets(tenant_id, client_id);

-- Criar tabela de Transações de Carteira
CREATE TABLE IF NOT EXISTS public.cap_wallet_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.cap_tenants(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.cap_clients(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('credit', 'debit')),
    description TEXT NOT NULL,
    expires_at TIMESTAMPTZ,
    is_expired BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_client ON public.cap_wallet_transactions(client_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_tenant_client ON public.cap_wallet_transactions(tenant_id, client_id);
```

---

## 12. Tabelas de Experiência do Cliente (Lookbook)

Esta tabela armazena a galeria de resultados/inspirações do salão.

```sql
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

-- Índices
CREATE INDEX IF NOT EXISTS idx_cap_lookbook_tenant ON public.cap_lookbook(tenant_id);
```

---

## 13. Vales-Presente (Gift Cards) e Pagamentos

Estas tabelas gerenciam as solicitações de vale-presente e os métodos de pagamento (PIX) do salão.

```sql
-- 13.1 Métodos de Pagamento do Salão (PIX)
CREATE TABLE public.cap_tenant_payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.cap_tenants(id) ON DELETE CASCADE,
    type TEXT NOT NULL DEFAULT 'PIX',
    pix_key TEXT NOT NULL,
    pix_key_type TEXT NOT NULL, -- cpf, cnpj, email, phone, random
    holder_name TEXT NOT NULL,
    holder_document TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cap_tenant_payment_methods_tenant ON public.cap_tenant_payment_methods(tenant_id);

-- 13.2 Vales-Presente
CREATE TABLE public.cap_giftcards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.cap_tenants(id) ON DELETE CASCADE,
    purchaser_id UUID REFERENCES public.cap_clients(id) ON DELETE SET NULL,
    service_id UUID REFERENCES public.cap_services(id) ON DELETE CASCADE,
    
    -- Identificadores separados por segurança
    request_id VARCHAR(20) UNIQUE NOT NULL, -- ID público da solicitação para o comprador (VP-XXXX)
    redemption_code VARCHAR(20) UNIQUE,     -- Código secreto para o presenteado usar (VG-XXXX)

    -- Dados do Presenteado
    recipient_name TEXT,
    recipient_phone TEXT,
    message TEXT,
    
    -- Valores e Saldos
    original_value NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    available_balance NUMERIC(10,2) NOT NULL DEFAULT 0.00,

    -- Status de Pagamento e do Vale
    payment_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (payment_status IN ('PENDING', 'CONFIRMED', 'REJECTED')),
    status TEXT NOT NULL DEFAULT 'PENDING_PAYMENT' CHECK (status IN ('PENDING_PAYMENT', 'ACTIVE', 'PARTIALLY_REDEEMED', 'REDEEMED', 'EXPIRED', 'CANCELLED')),
    
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_cap_giftcards_tenant ON public.cap_giftcards(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cap_giftcards_request_id ON public.cap_giftcards(request_id);
CREATE INDEX IF NOT EXISTS idx_cap_giftcards_redemption_code ON public.cap_giftcards(redemption_code);
```

---

## 14. Limpeza de Dados e Textos (J9 / Regra 9.1 itens 7 a 9)

Migração versionada `migrations/phase11_cleanup_data_and_texts.sql` para sanitização de acentuação, nomes de teste e higienização da timeline:

```sql
-- Sanitização de features nos Planos de Assinatura (cap_plans)
UPDATE cap_plans SET features = jsonb_build_array('Agendamentos ilimitados', 'Serviços ilimitados', 'Controle de estoque', 'Controle de caixa', 'Suporte por WhatsApp') WHERE name = 'Básico';
UPDATE cap_plans SET features = jsonb_build_array('Agendamentos ilimitados', 'Serviços ilimitados', 'Controle de estoque', 'Controle de caixa', 'Suporte por WhatsApp', 'Clube de fidelidade') WHERE name = 'Premium';
UPDATE cap_plans SET features = jsonb_build_array('Agendamentos ilimitados', 'Serviços ilimitados', 'Controle de estoque', 'Controle de caixa', 'Suporte por WhatsApp', 'Clube de fidelidade', 'PDV', 'Vales-presente') WHERE name = 'Enterprise';
UPDATE cap_plans SET features = jsonb_build_array('1 profissional', 'Agenda digital', 'Suporte por WhatsApp') WHERE name = 'Solo';
UPDATE cap_plans SET features = jsonb_build_array('Até 5 profissionais', 'Controle de estoque', 'Suporte por WhatsApp') WHERE name = 'Essencial';

-- Higienização da base de clientes e equipe demonstrativa
UPDATE cap_clients SET name = 'Beatriz Alcantara', phone = '(11) 99888-2020', birth_date = '1992-05-14', vip_tier = 'VIP' WHERE name ILIKE '%Cliente Teste%' OR phone = '(11) 99999-0000';
UPDATE cap_staff SET name = 'Thais Rodrigues' WHERE name = 'Gestor' AND email = 'thais@studiodatha.com';

-- Remoção de notas de teste residuais na timeline (cap_timeline_notes)
DELETE FROM cap_timeline_notes WHERE content ILIKE 'teste' OR (content = '' AND image_path IS NOT NULL);
```

---

## 15. Governança e Usuário com Privilégio Mínimo (C5 - P1)

Seguindo o princípio constitucional de Menor Privilégio (*Least Privilege*) e defesa em profundidade, o sistema OperaBeauty adota uma rigorosa segregação de papéis no PostgreSQL:

### 15.1 Papéis e Responsabilidades

| Papel | Finalidade | Permissões Permitidas | Operações Bloqueadas |
| :--- | :--- | :--- | :--- |
| **`opera_app`** | Execução em tempo real da aplicação web/API Express | `SELECT`, `INSERT`, `UPDATE`, `DELETE` em tabelas do schema `public`, `USAGE`/`SELECT` em sequências e `EXECUTE` em rotinas | `CREATE TABLE`, `DROP TABLE`, `ALTER TABLE`, `TRUNCATE`, `DROP DATABASE`, `CREATE ROLE` |
| **`postgres`** | Superusuário do cluster / DBA / Pipelines de automação | Permissão irrestrita de DDL, administração e migrações | Uso desnecessário no runtime de produção da aplicação |

### 15.2 DDL de Criação do Papel e Grants Estritos

A migração versionada `migrations/phase14_least_privilege_user.sql` formaliza os privilégios mínimos:

```sql
-- 1. Criação idempotente do usuário da aplicação
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'opera_app') THEN
        CREATE ROLE opera_app WITH LOGIN PASSWORD 'opera_app_secure_pass';
    END IF;
END
$$;

-- 2. Restrições estritas de segurança (sem privilégios administrativos)
ALTER ROLE opera_app WITH 
    NOSUPERUSER 
    NOCREATEDB 
    NOCREATEROLE 
    NOREPLICATION 
    NOBYPASSRLS;

-- 3. Blindagem de schemas
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT CONNECT ON DATABASE operabeauty TO opera_app;
GRANT USAGE ON SCHEMA public TO opera_app;

-- 4. Acesso exclusivo a DML
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO opera_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO opera_app;
GRANT EXECUTE ON ALL ROUTINES IN SCHEMA public TO opera_app;

-- 5. Privilégios padrão para futuros objetos criados por migrações
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO opera_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO opera_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON ROUTINES TO opera_app;
```

---

## 16. Isolamento por Tenant em Profundidade (Row Level Security - C6 P1)

Para impedir vazamento cruzado de dados entre salões (*Cross-Tenant Data Leakage*) e mitigar vulnerabilidades de IDOR (*Insecure Direct Object References*), o OperaBeauty combina:
1. **Helper de Consulta Centralizado (`backend/utils/tenantQuery.js`)**: Valida obrigatoriamente a presença de `tenant_id` e executa `SET LOCAL app.current_tenant_id` na sessão.
2. **Desacoplamento Completo**: Nenhuma rota Express importa `pool` diretamente, passando 100% dos acessos por Services dedicados.
3. **Row Level Security (RLS) no Motor do PostgreSQL**: Ativado em todas as 28 tabelas multi-tenant via `migrations/phase15_enable_rls_tenant_isolation.sql`.

### 16.1 Política de Segurança RLS (`tenant_isolation_policy`)

Para cada tabela com a coluna `tenant_id`:
```sql
ALTER TABLE public.<table_name> ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON public.<table_name>
AS PERMISSIVE
FOR ALL
TO opera_app, postgres
USING (
    current_setting('app.current_tenant_id', true) = tenant_id::text
    OR current_setting('app.is_superadmin', true) = 'true'
    OR current_setting('app.bypass_rls', true) = 'true'
)
WITH CHECK (
    current_setting('app.current_tenant_id', true) = tenant_id::text
    OR current_setting('app.is_superadmin', true) = 'true'
    OR current_setting('app.bypass_rls', true) = 'true'
);
```

### 16.2 Comportamento Fail Closed / Default Deny

- **Sem Contexto de Tenant**: Consultas executadas pelo papel `opera_app` (que possui `NOBYPASSRLS`) sem definir `app.current_tenant_id` retornam **0 linhas**, protegendo o banco contra falhas acidentais de query builder ou ausência de cláusula `WHERE`.
- **Tentativas de IDOR**: Se um usuário do Salão A tentar ler ou modificar um ID de recurso (cliente, agendamento, estoque) pertencente ao Salão B, o PostgreSQL não retorna nem atualiza nenhuma linha, resultando em HTTP 404/403.
- **Super Admin**: Sessões com `SET LOCAL app.is_superadmin = 'true'` mantêm visibilidade agregada para relatórios consolidados da plataforma SaaS.

---

## 17. Operações Atômicas, Idempotência e Livro-Razão (C10 - P1)

Para prevenir condições de corrida (*Race Conditions* / TOCTOU), duplicidade de transações financeiras e saldos inconsistentes em ambientes de alta concorrência:

### 17.1 Integridade Estrutural de Estoque (Não-Negatividade)
Constraint em `cap_inventory` garantindo fisicamente que a quantidade de qualquer insumo ou produto para revenda nunca atinja valores negativos:
```sql
ALTER TABLE public.cap_inventory 
ADD CONSTRAINT chk_inventory_quantity_non_negative CHECK (quantity >= 0);
```
As baixas em vendas PDV utilizam ordenação estável de itens por `inventory_id` (prevenção de *deadlocks*), bloqueio pessimista `SELECT ... FOR UPDATE` e atualização atômica condicional:
```sql
UPDATE public.cap_inventory
SET quantity = quantity - $1
WHERE id = $2 AND tenant_id = $3 AND quantity >= $1
RETURNING id, quantity;
```

### 17.2 Cupons de Desconto Atômicos em Ponto Único
Constraints em `cap_coupons` que impedem extrapolação do limite de usos e contadores negativos:
```sql
ALTER TABLE public.cap_coupons 
ADD CONSTRAINT chk_coupon_uses CHECK (max_uses IS NULL OR current_uses <= max_uses);

ALTER TABLE public.cap_coupons 
ADD CONSTRAINT chk_coupon_current_uses_non_negative CHECK (current_uses >= 0);
```
O resgate é realizado num único comando atômico:
```sql
UPDATE public.cap_coupons
SET current_uses = current_uses + 1
WHERE tenant_id = $1 AND code = $2 AND is_active = true AND (max_uses IS NULL OR current_uses < max_uses)
RETURNING *;
```

### 17.3 Carteira Digital, Cashback e Livro-Razão com Idempotência
A tabela `cap_client_wallets` conta com restrição de saldo não-negativo:
```sql
ALTER TABLE public.cap_client_wallets 
ADD CONSTRAINT chk_wallet_balance_non_negative CHECK (balance >= 0.00);
```
E a tabela de transações `cap_wallet_transactions` possui controle estrito de idempotência por tenant:
```sql
ALTER TABLE public.cap_wallet_transactions 
ADD COLUMN idempotency_key VARCHAR(100);

ALTER TABLE public.cap_wallet_transactions 
ADD CONSTRAINT uq_wallet_idempotency UNIQUE (tenant_id, idempotency_key);
```
- **Ganhos de Cashback**: Chave de idempotência `cashback:earn:${appointmentId}` com `ON CONFLICT (tenant_id, idempotency_key) DO NOTHING`.
- **Resgates de Cashback**: Chave de idempotência `cashback:redeem:${appointmentId}` e dedução com `UPDATE ... WHERE balance >= $1`.
- **Estornos**: Chave de idempotência `cashback:refund:${appointmentId}`.

### 17.4 Vales-Presente e Tabela Imutável de Resgates (`cap_giftcard_redemptions`)
A tabela `cap_giftcards` inclui colunas completas de saldo, chave de idempotência e constraint `chk_giftcard_balance_non_negative CHECK (available_balance >= 0)`.
O livro-razão imutável de resgates registra cada débito individualmente com chave de idempotência única por tenant:
```sql
CREATE TABLE IF NOT EXISTS public.cap_giftcard_redemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.cap_tenants(id) ON DELETE CASCADE,
    giftcard_id UUID NOT NULL REFERENCES public.cap_giftcards(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES public.cap_appointments(id) ON DELETE SET NULL,
    amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
    idempotency_key VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_giftcard_redemption_idempotency UNIQUE (tenant_id, idempotency_key)
);
```
Todas as tabelas contam com grants para o papel `opera_app` e políticas de Row Level Security (RLS) ativas.

---

## 18. Governança de Datas, Fusos Horários e Parser Textual (C11 - P1)

Para prevenir desvios de data e hora (*Midnight Timezone Shift* / virada de dia), inconsistências em agendamentos e garantir uniformidade com o fuso oficial de Brasília:

### 18.1 Configuração Global de Fuso Horário (`America/Sao_Paulo`)
O PostgreSQL, os papéis de runtime e os contêineres Docker operam sincronizados em `America/Sao_Paulo`:
```sql
ALTER DATABASE operabeauty SET timezone TO 'America/Sao_Paulo';
ALTER ROLE postgres SET timezone TO 'America/Sao_Paulo';
ALTER ROLE opera_app SET timezone TO 'America/Sao_Paulo';
```
Nas conexões da API Node.js Express (`backend/config/db.js`), o processo define `process.env.TZ = 'America/Sao_Paulo'` e o pool executa `SET TIME ZONE 'America/Sao_Paulo'` em cada conexão de cliente. No `docker-compose.yml`, os serviços `db`, `api` e `caddy` possuem a variável de ambiente `TZ: America/Sao_Paulo`.

### 18.2 Segregação de Tipos Temporais: `TIMESTAMPTZ` vs `DATE`
- **Agendamentos e Instantes Exatos (`TIMESTAMPTZ`)**:
  As colunas de instantes no tempo (`cap_appointments.start_time`, `cap_appointments.end_time`, `cap_appointments.created_at`, `cap_refresh_tokens.expires_at`, etc.) utilizam o tipo `timestamp with time zone` (`TIMESTAMPTZ`), preservando o instante UTC canônico e permitindo conversão precisa para horários locais.
- **Datas de Calendário Puras (`DATE`)**:
  Colunas que representam dias civis inteiros independentes de fuso horário (`cap_clients.birth_date`, `cap_date_exceptions.exception_date`, `cap_invoices.due_date`) utilizam o tipo `DATE` estrito.

### 18.3 Parser Textual Imutável (Node.js pg driver)
Para eliminar o bug em que o driver converte datas `DATE` em instantes UTC meia-noite (`00:00:00Z`) que retroagem para o dia anterior (`21:00:00` do dia anterior) no fuso UTC-3:
```javascript
pg.types.setTypeParser(pg.types.builtins.DATE, (value) => value);
```
O driver retorna o texto literal `"YYYY-MM-DD"`, garantindo que um vencimento no dia 23 de outubro permaneça inalterado como 23 de outubro em todas as camadas.

### 18.4 Formatação Segura no Frontend (`src/utils/formatters.js`)
O frontend utiliza `DEFAULT_TIMEZONE = 'America/Sao_Paulo'` e as funções canônicas `formatDate()`, `formatTime()` e `formatDateTime()`, prevenindo parsing ingênuo com `new Date("YYYY-MM-DD")` e mantendo a data exata em qualquer localidade do navegador.

---

## 19. Autenticação em Duas Etapas (2FA TOTP) e Auditoria do Super Admin (C13 - P2)

Para proteger o acesso administrativo global da plataforma contra comprometimento de credenciais (*Credential Stuffing*, vazamentos ou interceptações), a tabela `cap_platform_admins` suporta autenticação de dois fatores via TOTP (RFC 6238 / RFC 4226) e trilha de auditoria de acessos:

```sql
ALTER TABLE public.cap_platform_admins
  ADD COLUMN IF NOT EXISTS totp_secret TEXT,
  ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS totp_temp_secret TEXT,
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_login_ip TEXT,
  ADD COLUMN IF NOT EXISTS last_login_user_agent TEXT;
```

### Regras de Negócio e Governança do 2FA
- **Chave Base32**: Gerada criptograficamente via `crypto.randomBytes(20)`, compatível com aplicativos autenticadores padrão (Google Authenticator, Microsoft Authenticator, 1Password, Authy).
- **Janela de Tolerância (Clock Drift)**: Aceita códigos do time-step atual (30s) e de ±1 step (passado e futuro imediato), mitigando pequenas divergências de relógio entre o dispositivo do operador e o servidor.
- **Auditoria de Login**: A cada login autenticado com 2FA, registram-se `last_login_at`, `last_login_ip` e `last_login_user_agent`, disparando alerta de segurança via webhook (Discord/Slack) ou log estruturado em caso de acesso em novo IP/dispositivo.

---

## 20. Infraestrutura de WhatsApp Gateway Nativo e Lembretes Interativos (Fase 44 - D2 P1)

Para suportar o envio autônomo e de custo zero de notificações e confirmações em 1 toque via WhatsApp para clientes do salão, o PostgreSQL gerencia as instâncias de conexão, as credenciais criptografadas de sessão e a trilha de auditoria e status de confirmação:

### 20.1 DDL das Tabelas de WhatsApp

```sql
-- 1. Instâncias de Conexão WhatsApp por Salão (Multi-Tenant)
CREATE TABLE IF NOT EXISTS public.cap_whatsapp_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.cap_tenants(id) ON DELETE CASCADE,
    instance_name VARCHAR(100) NOT NULL DEFAULT 'default',
    phone_number VARCHAR(30),
    status VARCHAR(30) NOT NULL DEFAULT 'DISCONNECTED', -- CONNECTED, SCAN_QR, PAIRING_CODE, DISCONNECTED, STOPPED
    qr_code TEXT,
    pairing_code VARCHAR(20),
    connected_at TIMESTAMPTZ,
    last_activity_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_whatsapp_instance_tenant UNIQUE (tenant_id)
);

-- 2. Chaves de Autenticação Criptografadas do Baileys (AES-256-GCM em repouso)
CREATE TABLE IF NOT EXISTS public.cap_whatsapp_auth_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.cap_tenants(id) ON DELETE CASCADE,
    key_name VARCHAR(150) NOT NULL, -- creds, app-state-sync-key, pre-key-*, etc.
    encrypted_value TEXT NOT NULL,  -- Formato: enc:v1:<iv_hex>:<tag_hex>:<ciphertext_hex>
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_whatsapp_auth_key UNIQUE (tenant_id, key_name)
);

-- 3. Mensagens, Lembretes e Auditoria de Interatividade (Confirmação em 1 toque)
CREATE TABLE IF NOT EXISTS public.cap_whatsapp_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.cap_tenants(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES public.cap_appointments(id) ON DELETE SET NULL,
    recipient_phone VARCHAR(30) NOT NULL,
    message_type VARCHAR(30) NOT NULL DEFAULT 'REMINDER', -- REMINDER_24H, REMINDER_2H, OTP, CONFIRMATION, NOTIFICATION
    content TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING', -- PENDING, SENT, DELIVERED, READ, CONFIRMED, RESCHEDULE_REQUESTED, FAILED
    error_message TEXT,
    idempotency_key VARCHAR(100),
    interactive_button_payload JSONB,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_whatsapp_idempotency UNIQUE (tenant_id, idempotency_key)
);

-- Índices de Otimização e Performance
CREATE INDEX IF NOT EXISTS idx_wa_instances_tenant ON public.cap_whatsapp_instances(tenant_id);
CREATE INDEX IF NOT EXISTS idx_wa_auth_keys_tenant_key ON public.cap_whatsapp_auth_keys(tenant_id, key_name);
CREATE INDEX IF NOT EXISTS idx_wa_messages_tenant ON public.cap_whatsapp_messages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_wa_messages_appointment ON public.cap_whatsapp_messages(appointment_id);
CREATE INDEX IF NOT EXISTS idx_wa_messages_status ON public.cap_whatsapp_messages(status);

-- Habilitação de RLS (Row Level Security) e Concessão de Privilégios
ALTER TABLE public.cap_whatsapp_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cap_whatsapp_auth_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cap_whatsapp_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_whatsapp_instances ON public.cap_whatsapp_instances
    FOR ALL USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID);

CREATE POLICY tenant_isolation_whatsapp_auth_keys ON public.cap_whatsapp_auth_keys
    FOR ALL USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID);

CREATE POLICY tenant_isolation_whatsapp_messages ON public.cap_whatsapp_messages
    FOR ALL USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cap_whatsapp_instances TO opera_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cap_whatsapp_auth_keys TO opera_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cap_whatsapp_messages TO opera_app;
```

### 20.2 Regras de Segurança e Criptografia em Repouso
- **Formato Criptográfico Autenticado (AES-256-GCM)**: As credenciais de sessão do WhatsApp nunca são armazenadas em texto plano. Cada chave é criptografada com IV único de 12 bytes gerado via CSPRNG e acompanhada de Authentication Tag de 16 bytes.
- **Isolamento Tenant-Level**: Um salão nunca tem acesso ou visibilidade das sessões ou mensagens de outro salão. A integridade é garantida pela combinação de RLS do PostgreSQL e middleware no Node.js.
- **Mensageria de Autenticação e OTP (Item D7)**: As mensagens do tipo `OTP` são registradas em `cap_whatsapp_messages` para auditoria estrita. Os códigos numéricos de uso único têm expiração de 300 segundos no Redis e comparação em tempo constante (`crypto.timingSafeEqual`). Em salões sem instância de WhatsApp conectada ou em planos básicos, a redefinição de acesso é realizada exclusivamente pelo gestor via RPC `cap_update_client_password`.

---

## 21. Fase 44: D11 (P1) — Onboarding Guiado do Salão & Display de Mesa com QR Code

### 21.1 Alterações Estruturais no Schema
```sql
ALTER TABLE public.cap_tenants 
ADD COLUMN IF NOT EXISTS onboarding_dismissed BOOLEAN DEFAULT FALSE;

ALTER TABLE public.cap_tenants 
ADD COLUMN IF NOT EXISTS qr_code_generated_at TIMESTAMPTZ;

GRANT SELECT, UPDATE ON public.cap_tenants TO opera_app;

CREATE INDEX IF NOT EXISTS idx_cap_tenants_onboarding_status 
ON public.cap_tenants(id, onboarding_dismissed, qr_code_generated_at);
```

### 21.2 Regras de Negócio e Governança do Onboarding
- **Checklist Operacional Dinâmico**: O cálculo de progresso é computado em tempo real sobre os registros reais do salão (`cap_services`, `cap_staff`, `cap_business_hours`, `cap_tenants`, `cap_appointments`), evitando inconsistências de estado armazenado.
- **Catálogos-Modelo por Segmento**: Inserção em lote no `cap_services` via transação atômica (`BEGIN ... COMMIT / ROLLBACK`) com isolamento multi-tenant compulsório (`SET LOCAL app.current_tenant_id`), com invalidação imediata de cache no Redis (`tenant:${tenantId}:services`) e log na trilha de auditoria (`cap_audit_logs`).
- **Geração de Display de Balcão e QR Code**: Registro de data/hora em `qr_code_generated_at` e geração offline de QR Code vetorial/alta definição para o link público do salão (`/${tenant.slug}`).

---

## 22. Fase 44: D18 (P1) — Cobrança Automática do SaaS, Tolerância e Bloqueio Gradual

### 22.1 Alterações Estruturais no Schema
```sql
ALTER TABLE public.cap_invoices 
ADD COLUMN IF NOT EXISTS pix_copy_paste TEXT,
ADD COLUMN IF NOT EXISTS pix_qr_code TEXT,
ADD COLUMN IF NOT EXISTS gateway_transaction_id VARCHAR(120),
ADD COLUMN IF NOT EXISTS gateway_invoice_url TEXT,
ADD COLUMN IF NOT EXISTS grace_period_days INT DEFAULT 5,
ADD COLUMN IF NOT EXISTS warnings_sent JSONB DEFAULT '[]'::jsonb;

ALTER TABLE public.cap_tenants 
ADD COLUMN IF NOT EXISTS grace_period_days INT DEFAULT 5,
ADD COLUMN IF NOT EXISTS overdue_since DATE,
ADD COLUMN IF NOT EXISTS billing_locked_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_cap_invoices_status_due ON public.cap_invoices(tenant_id, status, due_date);
CREATE INDEX IF NOT EXISTS idx_cap_invoices_gateway_tx ON public.cap_invoices(gateway_transaction_id);
CREATE INDEX IF NOT EXISTS idx_cap_tenants_status_billing ON public.cap_tenants(status, overdue_since, billing_locked_at);

GRANT SELECT, INSERT, UPDATE ON public.cap_invoices TO opera_app;
GRANT SELECT, UPDATE ON public.cap_tenants TO opera_app;
```

### 22.2 Regras de Negócio e Governança de Cobrança do SaaS
- **Geração Automática de Faturas**: Faturas mensais geradas com vencimento programado, código Copia e Cola PIX e QR Code dinâmico gerados pelo gateway de pagamento ou gerador nativo da plataforma.
- **Tolerância (*Grace Period*) de 5 Dias**:
  - *Vencimento (D+0 a D+5)*: Fatura com status `overdue`, salão permanece `status = 'active'` com avisos visuais no painel do gestor orientando a quitação da pendência.
  - *Tolerância Expirada (> D+5)*: Salão entra em bloqueio gradual (*read_only* / `status = 'overdue'`), impedindo novas marcações de agendamento online via API (HTTP 402 `TENANT_OVERDUE`), mas mantendo o acesso administrativo para consulta e acerto da fatura.
- **Baixa Automática por Webhook e Reativação Imediata (*Auto-Unblock*)**:
  - Ao receber a notificação do gateway de que a fatura foi quitada (`paid`), a fatura é atualizada atomicamente com `paid_at = NOW()` e `status = 'paid'`.
  - Se o salão estiver bloqueado por inadimplência, o sistema executa o desbloqueio automático imediato (`cap_tenants.status = 'active'`), remove restrições operacionais e grava auditoria completa em `cap_audit_logs`.
---

## 23. Fase 44: Super Admin — Configurações Globais da Plataforma e Gateway SaaS (`cap_platform_settings`)

### 23.1 Alterações Estruturais no Schema
```sql
CREATE TABLE IF NOT EXISTS public.cap_platform_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gateway_provider VARCHAR(50) DEFAULT 'sandbox',
    gateway_api_key TEXT,
    gateway_public_key TEXT,
    pix_key TEXT,
    pix_key_type VARCHAR(20) DEFAULT 'cnpj',
    environment VARCHAR(20) DEFAULT 'sandbox',
    grace_period_days INT DEFAULT 5,
    webhook_secret TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES public.cap_platform_admins(id)
);

ALTER TABLE public.cap_platform_settings 
ADD COLUMN IF NOT EXISTS pix_key TEXT,
ADD COLUMN IF NOT EXISTS pix_key_type VARCHAR(20) DEFAULT 'cnpj',
ADD COLUMN IF NOT EXISTS environment VARCHAR(20) DEFAULT 'sandbox',
ADD COLUMN IF NOT EXISTS grace_period_days INT DEFAULT 5,
ADD COLUMN IF NOT EXISTS webhook_secret TEXT;

GRANT SELECT, INSERT, UPDATE ON public.cap_platform_settings TO opera_app;
```

### 23.2 Regras de Negócio e Governança do Super Admin
- **Gateway Institucional do SaaS**: Centralização das credenciais do provedor de pagamentos oficial da OperaBeauty (Mercado Pago, Asaas, AbacatePay ou Sandbox) para faturamento das mensalidades dos salões clientes.
- **Proteção Criptográfica de Segredos**: Tokens de acesso e chaves de API confidenciais são armazenados criptografados em repouso e mascarados nas leituras para a interface web (`****`), prevenindo vazamento de credenciais mestre.
- **Parametrização de Tolerância de Carência**: Definição da quantidade padrão de dias de tolerância (*grace period*) concedidos aos salões antes do bloqueio gradual de agendamentos online.
- **Chave PIX Institucional**: Cadastro e validação da chave PIX oficial do SaaS (CNPJ, E-mail, Telefone ou Chave Aleatória) utilizada para composição dinâmica das faturas de assinatura.

---

## 24. Fase 44: D13 (P2) — Pacotes de Sessões (`cap_packages`, `cap_client_packages`, `cap_package_usages`)

### 24.1 Estrutura do Schema DDL

#### 2.7.4 `public.cap_packages` (Modelos de Pacotes)
Tabela de pacotes de serviços ofertados pelo salão com desconto progressivo, validade e intervalo mínimo fisiológico.

```sql
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
ALTER TABLE public.cap_packages ENABLE ROW LEVEL SECURITY;
```

#### 2.7.5 `public.cap_client_packages` (Pacotes Comprados e Saldo por Cliente)
Controle de saldo pré-pago por cliente. Possui constraint fundamental que impede saldo negativo.

```sql
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
ALTER TABLE public.cap_client_packages ENABLE ROW LEVEL SECURITY;
```

#### 2.7.6 `public.cap_package_usages` (Trilha de Auditoria de Consumo e Estorno)
Registra cada débito ou estorno de sessão atrelado a um agendamento.

```sql
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
ALTER TABLE public.cap_package_usages ENABLE ROW LEVEL SECURITY;
```

#### Alteração em 2.12 `public.cap_appointments`
Adição de colunas para vínculo transacional do pacote:
```sql
ALTER TABLE public.cap_appointments
    ADD COLUMN IF NOT EXISTS client_package_id UUID REFERENCES public.cap_client_packages(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS is_package_session BOOLEAN NOT NULL DEFAULT FALSE;
```

#### Permissões ao Papel `opera_app`
```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cap_packages TO opera_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cap_client_packages TO opera_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cap_package_usages TO opera_app;
GRANT SELECT, UPDATE ON public.cap_appointments TO opera_app;
```

### 24.2 Regras de Negócio e Governança de Pacotes
- **Garantia de Saldo Não-Negativo**: Constraint `CHECK (remaining_sessions >= 0)` associada a transações com locks pessimistas (`SELECT ... FOR UPDATE`) no Postgres. Qualquer concorrência sem saldo resulta em rejeição imediata da requisição.
- **Ciclo Atômico de Baixa e Devolução**:
  - Quando um agendamento com pacote é criado, ele valida a elegibilidade, saldo e intervalo mínimo.
  - Ao transicionar o agendamento para `completed`, consome 1 sessão (`remaining_sessions - 1`, `used_sessions + 1`).
  - Ao cancelar o agendamento (`status = 'cancelled'`), estorna atomicamente 1 sessão (`remaining_sessions + 1`, `used_sessions - 1`) com registro de trilha em `cap_package_usages`.
- **Intervalo Mínimo Fisiológico (`min_interval_days`)**: Impede que sessões estéticas que exigem repouso de tecido biológico (ex.: criolipólise, microagulhamento, peeling profundo) sejam agendadas com espaçamento inferior ao recomendado.

---

### 25. Modelagem de Anamnese Dinâmica, Termo de Consentimento e Evolução Clínica (Fase 44 — Item D14)

> Migração: `migrations/phase29_anamnesis_consent_and_evolution.sql`  
> Conformidade: **LGPD (Art. 11 — Tratamento de Dados Pessoais Sensíveis de Saúde)**, Criptografia em Repouso AES-256-GCM, Hash SHA-256 e Auditoria de Acessos.

#### 25.1 Alterações em `public.cap_anamnesis_templates`
```sql
ALTER TABLE public.cap_anamnesis_templates
    ADD COLUMN IF NOT EXISTS terms_text TEXT NOT NULL DEFAULT 'Declaro para os devidos fins que as informações acima prestadas são verdadeiras e completas. Autorizo a realização dos procedimentos estéticos e capilares indicados e estou ciente das orientações e cuidados pós-atendimento.',
    ADD COLUMN IF NOT EXISTS terms_version INTEGER NOT NULL DEFAULT 1 CHECK (terms_version > 0),
    ADD COLUMN IF NOT EXISTS require_terms BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS require_signature BOOLEAN NOT NULL DEFAULT FALSE;
```

#### 25.2 Alterações em `public.cap_client_anamnesis`
```sql
ALTER TABLE public.cap_client_anamnesis
    ADD COLUMN IF NOT EXISTS answers_encrypted TEXT,
    ADD COLUMN IF NOT EXISTS terms_accepted BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS terms_version INTEGER DEFAULT 1,
    ADD COLUMN IF NOT EXISTS consented_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS consent_ip_address VARCHAR(45),
    ADD COLUMN IF NOT EXISTS consent_user_agent TEXT,
    ADD COLUMN IF NOT EXISTS consent_hash VARCHAR(64),
    ADD COLUMN IF NOT EXISTS signature_data TEXT;
```

#### 25.3 Criação de `public.cap_client_evolutions` (Prontuário de Procedimentos, Medidas e Fotos)
```sql
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

-- Índices de Otimização e Performance
CREATE INDEX IF NOT EXISTS idx_client_evolutions_tenant_client ON public.cap_client_evolutions(tenant_id, client_id);
CREATE INDEX IF NOT EXISTS idx_client_evolutions_appointment ON public.cap_client_evolutions(appointment_id);
CREATE INDEX IF NOT EXISTS idx_client_evolutions_session_date ON public.cap_client_evolutions(session_date);
CREATE INDEX IF NOT EXISTS idx_client_evolutions_staff ON public.cap_client_evolutions(staff_id);

-- RLS Multi-Tenant
ALTER TABLE public.cap_client_evolutions ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_client_evolutions ON public.cap_client_evolutions
    FOR ALL USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID);

-- Menor Privilégio ao papel opera_app (C5)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cap_client_evolutions TO opera_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cap_client_anamnesis TO opera_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cap_anamnesis_templates TO opera_app;
```

#### 25.4 Regras de Segurança, Criptografia e Auditoria (LGPD)
- **Criptografia em Repouso**: As respostas que contenham dados médicos (alergias, cirurgias, gestação, medicamentos) são cifradas no backend usando AES-256-GCM (`iv:authTag:cipherText`) antes da persistência em `answers_encrypted`.
- **Integridade de Consentimento**: O aceite da cliente gera um hash SHA-256 inviolável (`consent_hash`) contendo o texto do termo, a versão, o identificador da cliente, IP, User-Agent e carimbo de tempo.
- **Controle de Acesso Estrito (Critério de Aceite D14)**:
  - Ficha visível apenas para: Gestor do salão, o próprio cliente ou o profissional (staff) que possua histórico de atendimento vinculado com a cliente (`hasAppointmentWithClient`). Profissionais sem vínculo são barrados com HTTP 403 Forbidden.
- **Trilha de Auditoria Obrigatória**: Toda leitura de dados de saúde registra evento `'ACCESS_HEALTH_DATA'` em `cap_audit_logs`.

---

## 26. Fase 44 (D15) - Campanhas Automáticas (Aniversário, Retorno e Reativação 60d)

Implementado na migração `migrations/phase30_automated_campaigns.sql` para suportar regras de marketing parametrizadas, prevenção contra spam (cooldown/carência), geração de cupons de uso único e respeito absoluto a opt-out.

#### 26.1 Extensão de `public.cap_clients` (Opt-Out de Marketing)
```sql
ALTER TABLE public.cap_clients
    ADD COLUMN IF NOT EXISTS marketing_opt_out BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS opt_out_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_cap_clients_opt_out ON public.cap_clients(tenant_id, marketing_opt_out);
```

#### 26.2 Criação de `public.cap_marketing_campaigns` (Configurações por Salão)
```sql
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
```

#### 26.3 Criação de `public.cap_campaign_logs` (Deduplicação, Disparos e Rastreamento de Cupons)
```sql
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

-- Índices de Deduplicação e Auditoria
CREATE INDEX IF NOT EXISTS idx_campaign_logs_tenant_cooldown 
    ON public.cap_campaign_logs(tenant_id, campaign_type, client_id, sent_at);
CREATE INDEX IF NOT EXISTS idx_campaign_logs_sent_at 
    ON public.cap_campaign_logs(sent_at);
CREATE INDEX IF NOT EXISTS idx_campaign_logs_client 
    ON public.cap_campaign_logs(client_id);
```

#### 26.4 Segurança Multi-Tenant (RLS) e Concessões do Usuário `opera_app` (Princípio C5)
```sql
ALTER TABLE public.cap_marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cap_campaign_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_marketing_campaigns ON public.cap_marketing_campaigns
    FOR ALL USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID);

CREATE POLICY tenant_isolation_campaign_logs ON public.cap_campaign_logs
    FOR ALL USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cap_marketing_campaigns TO opera_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cap_campaign_logs TO opera_app;
GRANT SELECT, UPDATE ON public.cap_clients TO opera_app;
GRANT SELECT, INSERT, UPDATE ON public.cap_coupons TO opera_app;
```

---

## 27. Fase 44: D16 (P2) — Avaliações e Google Reviews (`cap_reviews`, `cap_tenants`)

### 27.1 Evolução Estrutural do Schema DDL

#### 27.1.1 Extensão de `public.cap_tenants` (Configuração do Google Reviews)
Adiciona o link de avaliação pública do Google Meu Negócio / Google Reviews e timestamp de auditoria de atualização.
```sql
ALTER TABLE public.cap_tenants
    ADD COLUMN IF NOT EXISTS google_review_url TEXT,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
```

#### 27.1.2 Evolução de `public.cap_reviews` (Moderação e Resposta da Equipe)
Estende o modelo de avaliações com suporte a vínculo com serviço, visibilidade na vitrine e fluxo de respostas oficiais da equipe/gestor:
```sql
ALTER TABLE public.cap_reviews
    ADD COLUMN IF NOT EXISTS service_id UUID REFERENCES public.cap_services(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS staff_reply TEXT,
    ADD COLUMN IF NOT EXISTS replied_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS replied_by UUID REFERENCES public.cap_staff(id) ON DELETE SET NULL;
```

#### 27.1.3 Regra de Aceite Principal D16: Unicidade por Atendimento
Garante a integridade matemática da reputação, impedindo avaliações duplicadas ou manipulação de notas:
```sql
CREATE UNIQUE INDEX IF NOT EXISTS uq_idx_reviews_appointment 
    ON public.cap_reviews (appointment_id) 
    WHERE appointment_id IS NOT NULL;
```

#### 27.1.4 Índices para Otimização de Performance e Relatórios
```sql
CREATE INDEX IF NOT EXISTS idx_reviews_tenant_professional 
    ON public.cap_reviews (tenant_id, professional_id, rating);

CREATE INDEX IF NOT EXISTS idx_reviews_tenant_public 
    ON public.cap_reviews (tenant_id, is_public, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reviews_client 
    ON public.cap_reviews (client_id);
```

### 27.2 Segurança Multi-Tenant (RLS) e Concessões do Usuário `opera_app` (Princípio C5)
```sql
ALTER TABLE public.cap_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_reviews ON public.cap_reviews
    FOR ALL USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID);

GRANT SELECT, INSERT, UPDATE ON public.cap_reviews TO opera_app;
GRANT SELECT, UPDATE (google_review_url, updated_at) ON public.cap_tenants TO opera_app;
GRANT SELECT ON public.cap_staff TO opera_app;
GRANT SELECT ON public.cap_services TO opera_app;
GRANT SELECT ON public.cap_appointments TO opera_app;
```

### 27.3 Regras de Negócio e Comportamento Operacional
- **Avaliação Pós-Atendimento (1 a 5 Estrelas)**:
  - Liberada exclusivamente para agendamentos com status `completed`.
  - Exatamente 1 avaliação por agendamento (unicidade protegida no banco com erro HTTP 409 em tentativas duplicadas).
- **Impulsionador Google Reviews (Notas 4 e 5)**:
  - Quando o cliente atribui 4 ou 5 estrelas e o salão possui `google_review_url` cadastrado, a resposta da API sinaliza `google_invite_eligible: true`.
  - O frontend exibe modal festivo de agradecimento convidando a cliente a compartilhar sua experiência positiva no Google Meu Negócio, alavancando o SEO local sem risco de avaliações negativas externas.
- **Painel de Gestão e Moderação**:
  - Indicadores em tempo real: Média Geral, Taxa de Satisfação (%), Volume Total de Feedbacks e Status do Link do Google.
  - Ranking de média e feedbacks por profissional da equipe.
  - Moderação ativa: ocultar/exibir avaliações na vitrine pública (`is_public`) e registrar respostas oficiais da equipe (`staff_reply`).

---

## 28. Fase 44: D17 (P2) — Comanda Unificada e Fechamento de Caixa (`cap_cash_registers`, `cap_cash_movements`, `cap_orders`, `cap_order_items`, `cap_order_payments`)

### 28.1 Estrutura do Schema DDL

#### 28.1.1 Sessões Diárias de Caixa (`public.cap_cash_registers`)
```sql
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

CREATE INDEX IF NOT EXISTS idx_cash_registers_tenant_status 
    ON public.cap_cash_registers (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_cash_registers_opened_at 
    ON public.cap_cash_registers (tenant_id, opened_at DESC);
```

#### 28.1.2 Movimentações Avulsas de Caixa (`public.cap_cash_movements`)
```sql
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

CREATE INDEX IF NOT EXISTS idx_cash_movements_register 
    ON public.cap_cash_movements (cash_register_id);
```

#### 28.1.3 Comandas Unificadas (`public.cap_orders`)
```sql
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
```

#### 28.1.4 Itens da Comanda (`public.cap_order_items`)
```sql
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
```

#### 28.1.5 Pagamentos da Comanda / Split (`public.cap_order_payments`)
```sql
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
```

### 28.2 Segurança Multi-Tenant (RLS) e Concessões do Usuário `opera_app` (Princípio C5)
```sql
ALTER TABLE public.cap_cash_registers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cap_cash_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cap_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cap_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cap_order_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_cash_registers ON public.cap_cash_registers
    FOR ALL USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID);

CREATE POLICY tenant_isolation_cash_movements ON public.cap_cash_movements
    FOR ALL USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID);

CREATE POLICY tenant_isolation_orders ON public.cap_orders
    FOR ALL USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID);

CREATE POLICY tenant_isolation_order_items ON public.cap_order_items
    FOR ALL USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID);

CREATE POLICY tenant_isolation_order_payments ON public.cap_order_payments
    FOR ALL USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cap_cash_registers TO opera_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cap_cash_movements TO opera_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cap_orders TO opera_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cap_order_items TO opera_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cap_order_payments TO opera_app;
```

### 28.3 Regras de Negócio e Comportamento Operacional
- **Comanda Unificada**:
  - Permite agrupar procedimentos/serviços, produtos de pronta entrega e gorjetas em um único documento fiscal/recibo.
  - Baixa de estoque automática atômica (`UPDATE cap_inventory SET quantity = quantity - $1 WHERE quantity >= $1`) com bloqueio pessimista `FOR UPDATE` ordenado por ID para prevenir deadlocks.
  - Permite vincular a agendamentos do dia, atualizando o status do agendamento para `completed` e quitando comissões da equipe.
- **Split Payment (Pagamento Dividido)**:
  - Permite ratear o valor líquido da comanda entre PIX, Dinheiro, Cartões de Débito/Crédito, Saldo de Cashback da Carteira (`cap_client_wallets`) e Vales-Presente (`cap_giftcards`).
  - Cálculo automático de troco em dinheiro caso o valor pago em espécie exceda o saldo devido.
- **Fechamento Diário de Caixa**:
  - Apenas uma sessão de caixa aberta por salão por vez.
  - Abertura com registro de fundo de troco (`initial_balance`).
  - Registro de suprimentos e sangrias com trava de saldo em gaveta.
  - Fechamento com conferência dos valores físicos informados pelo operador, comparando com os valores esperados do sistema e apurando a diferença de quebra/sobra.

---

## 29. PROGRAMA INDIQUE E GANHE (ITEM D19 P2)

### 29.1 Descrição e Objetivos
Sistema de aquisição e retenção orgânica baseado em indicações de amigas. Cada cliente possui um código de indicação único gerado criptograficamente. O salão define as regras de recompensa (crédito em carteira ou cupom), os valores concedidos a quem indica e a quem é indicada, e o gatilho de concessão (imediato no cadastro ou após a realização do primeiro procedimento presencial).

### 29.2 Estrutura do Banco de Dados (DDL)

```sql
-- Parametrização em cap_tenants
ALTER TABLE public.cap_tenants 
ADD COLUMN IF NOT EXISTS referral_program_active BOOLEAN NOT NULL DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS referral_reward_type VARCHAR(20) NOT NULL DEFAULT 'wallet',
ADD COLUMN IF NOT EXISTS referral_referrer_reward NUMERIC(10,2) NOT NULL DEFAULT 15.00,
ADD COLUMN IF NOT EXISTS referral_referee_reward NUMERIC(10,2) NOT NULL DEFAULT 15.00,
ADD COLUMN IF NOT EXISTS referral_trigger VARCHAR(30) NOT NULL DEFAULT 'on_first_completed_appointment',
ADD COLUMN IF NOT EXISTS referral_custom_message TEXT;

-- Tabela de Rastreamento de Indicações (cap_referrals)
CREATE TABLE IF NOT EXISTS public.cap_referrals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.cap_tenants(id) ON DELETE CASCADE,
    referrer_id UUID NOT NULL REFERENCES public.cap_clients(id) ON DELETE CASCADE,
    referee_id UUID NOT NULL REFERENCES public.cap_clients(id) ON DELETE CASCADE,
    referral_code VARCHAR(30) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
    trigger_type VARCHAR(30) NOT NULL DEFAULT 'on_first_completed_appointment',
    referrer_reward_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (referrer_reward_amount >= 0),
    referee_reward_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (referee_reward_amount >= 0),
    appointment_id UUID REFERENCES public.cap_appointments(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    CONSTRAINT uq_referral_tenant_referee UNIQUE (tenant_id, referee_id),
    CONSTRAINT chk_no_self_referral CHECK (referrer_id <> referee_id)
);

-- Índices de Otimização
CREATE INDEX IF NOT EXISTS idx_cap_referrals_tenant_referrer ON public.cap_referrals(tenant_id, referrer_id);
CREATE INDEX IF NOT EXISTS idx_cap_referrals_tenant_status ON public.cap_referrals(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_cap_referrals_code ON public.cap_referrals(tenant_id, referral_code);

-- Row Level Security (RLS) Multi-Tenant
ALTER TABLE public.cap_referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_referrals ON public.cap_referrals
  FOR ALL TO opera_app, postgres
  USING (
    tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
    OR current_setting('app.is_superadmin', true) = 'true'
    OR current_setting('app.bypass_rls', true) = 'true'
  )
  WITH CHECK (
    tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
    OR current_setting('app.is_superadmin', true) = 'true'
    OR current_setting('app.bypass_rls', true) = 'true'
  );

-- Concessões C5 (Menor Privilégio para opera_app)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cap_referrals TO opera_app;
GRANT SELECT, UPDATE ON public.cap_tenants TO opera_app;
```

### 29.3 Regras de Negócio e Segurança
1. **Prevenção Anti-Fraude**:
   - `chk_no_self_referral`: impede no nível do banco que a cliente indique a si mesma.
   - `uq_referral_tenant_referee`: garante que cada cliente seja indicada apenas uma vez por salão.
2. **Idempotência de Bônus (C10)**:
   - Concessões de créditos na carteira (`cap_wallet_transactions`) usam chaves determinísticas de idempotência (`referral:referrer:${id}` e `referral:referee:${id}`).
3. **Preservação de Contexto**:
   - A captura do código na URL (`?ref=...`) é persistida em storage no cliente para não se perder durante a navegação pré-cadastro.

---

## 30. Mini-site do Salão & SEO Social Dinâmico (D20 / F3)

A Fase 44 (D20) introduziu o mini-site institucional público para cada salão (`/:tenant_slug/site`), permitindo apresentar a estrutura física, procedimentos em destaque, galeria de trabalhos com Lightbox, equipe, horários e depoimentos 5★ com link do Google Reviews, além de meta tags para compartilhamento em redes sociais (OpenGraph e Twitter Cards).

### 30.1 Schema e Alterações em `cap_tenants`

```sql
-- Migração phase34_salon_minisite.sql

ALTER TABLE public.cap_tenants
ADD COLUMN IF NOT EXISTS about_text TEXT,
ADD COLUMN IF NOT EXISTS headline TEXT,
ADD COLUMN IF NOT EXISTS minisite_gallery JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS google_maps_url TEXT,
ADD COLUMN IF NOT EXISTS meta_title TEXT,
ADD COLUMN IF NOT EXISTS meta_description TEXT,
ADD COLUMN IF NOT EXISTS meta_image_url TEXT,
ADD COLUMN IF NOT EXISTS minisite_enabled BOOLEAN DEFAULT TRUE;

-- Comentários descritivos
COMMENT ON COLUMN public.cap_tenants.about_text IS 'Texto institucional contando a história e diferenciais do espaço';
COMMENT ON COLUMN public.cap_tenants.headline IS 'Frase de impacto e posicionamento editorial exibida no Hero';
COMMENT ON COLUMN public.cap_tenants.minisite_gallery IS 'Array JSON de imagens da estrutura física e lounge [{url, caption}]';
COMMENT ON COLUMN public.cap_tenants.google_maps_url IS 'Link direto do Google Maps para rotas e navegação';
COMMENT ON COLUMN public.cap_tenants.meta_title IS 'Título personalizado para motores de busca e compartilhamento social';
COMMENT ON COLUMN public.cap_tenants.meta_description IS 'Descrição curta para busca e tags OpenGraph (WhatsApp/Instagram)';
COMMENT ON COLUMN public.cap_tenants.meta_image_url IS 'Imagem destacada de capa (1200x630) para compartilhamento';
COMMENT ON COLUMN public.cap_tenants.minisite_enabled IS 'Flag de ativação pública da página do mini-site';

-- Concessões C5 (Menor Privilégio para opera_app)
GRANT SELECT, UPDATE ON public.cap_tenants TO opera_app;
```

### 30.2 Regras de Negócio e Governança
1. **Cache com Invalidação Atômica (Redis)**:
   - A rota pública `GET /api/minisite/:slug` possui cache no Redis com TTL de 15 minutos (`minisite:${slug}`).
   - Ao salvar alterações no painel gestor (`PUT /api/minisite`), a chave de cache é invalidada imediatamente.
2. **Segurança e Isolamento Multi-Tenant**:
   - Modificações no mini-site exigem autenticação de operador com perfil `manager` ou `admin`.
   - Consulta pública é permitida apenas para salões com status `'active'` e `minisite_enabled = TRUE`.

---

## 31. Reestruturação de Planos, Preços e Selo Fundador (E1 - Fase 45)

A Fase 45 (E1) estabelece a matriz de precificação sustentável e escalável da plataforma SaaS OperaBeauty, consolidando os 4 planos oficiais (**Solo**, **Essencial**, **Premium** e **Signature**), governança por feature flags, limites operacionais e garantia contratual de preço congelado por 12 meses com selo comemorativo **Fundador** para inquilinos existentes.

### 31.1 Schema e Expansão de `cap_plans` e `cap_tenants`

```sql
-- Migração phase35_restructure_plans_e1.sql

-- 1. Expansão de cap_plans
ALTER TABLE public.cap_plans
ADD COLUMN IF NOT EXISTS slug VARCHAR(50) UNIQUE,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS max_whatsapp_messages INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS badge_label VARCHAR(50),
ADD COLUMN IF NOT EXISTS marketing_features JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS extra_professional_price NUMERIC(10,2) DEFAULT 15.00;

-- 2. Expansão de cap_tenants (Preço Congelado e Selo Fundador)
ALTER TABLE public.cap_tenants
ADD COLUMN IF NOT EXISTS is_founder BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS frozen_price NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS price_frozen_until TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS founder_badge_label VARCHAR(50) DEFAULT 'Fundador';

-- Concessões C5 (Menor Privilégio ao papel opera_app)
GRANT SELECT, UPDATE ON public.cap_plans TO opera_app;
GRANT SELECT, UPDATE ON public.cap_tenants TO opera_app;
```

### 31.2 Matriz Canônica dos Planos Oficiais

| Plano | Slug | Preço Mensal | Preço Anual (2 meses off) | Profissionais | Banners | WhatsApp Mensal | Destaque |
|---|---|---|---|---|---|---|---|
| **Solo** | `solo` | R$ 49,90 | R$ 499,00 | 1 | 1 | 0 (Push/Email) | Para autônomos e atendimentos solo |
| **Essencial** | `essencial` | R$ 79,90 | R$ 799,00 | Até 3 | 2 | 0 | Estoque, fluxo de caixa e comissões |
| **Premium** | `premium` | R$ 129,90 | R$ 1.299,00 | Até 6 | 3 | 200 msgs | **Mais Escolhido** (Clube, Cashback, Pacotes, Anamnese, Reviews Google, Waitlist, Campanhas) |
| **Signature** | `signature` | R$ 199,90 | R$ 1.999,00 | Até 12 (+R$ 15/prof) | 5 | 500 msgs | **Alta Performance** (PDV com conferência cega, Vales-presente, Gateway WhatsApp nativo, Relatórios BI) |

### 31.3 Regras de Negócio e Governança
1. **Preço Congelado (Grandfathering)**:
   - Inquilinos fundadores possuem `is_founder = true`, `price_frozen_until = NOW() + 12 months` e `frozen_price = 99.90`.
   - `saasBillingService.js` respeita o valor congelado ao emitir faturas e calcular o MRR individual.
2. **Feature Flags no Backend**:
   - `requireFeature(name)` verifica a matriz de permissões do plano em `cap_plans.features` e liberações específicas de salão em `cap_tenant_feature_flags`.
3. **Desativação de Legados**:
   - Planos antigos (como o plano Básico legado de R$ 69,90) são arquivados com `is_active = false`, não sendo exibidos no catálogo público nem em novas contratações.

---

## 32. Programa de Indicação e Revenda SaaS & Governança Super Admin (F4 - Fase 45)

A Fase 45 (F4) introduz a infraestrutura completa de afiliados, parceiros de negócio e revenda do OperaBeauty, permitindo que consultores, salões embaixadores e influenciadores indiquem salões para a plataforma em troca de **20% de comissão recorrente permanente** e **1 mês grátis mútuo** para quem indica e para o salão indicado.

Inclui controle de governança no **Painel do Super Admin** com desligamento público por padrão (`reseller_program_enabled = FALSE`) para proteger o fluxo de caixa inicial do SaaS contra despesas promocionais sem retorno prévio.

### 32.1 DDL Completo das 4 Tabelas de Revenda

```sql
-- Migrações phase35_saas_reseller_program.sql e phase36_reseller_governance_superadmin.sql

-- 1. Tabela Master de Revendedores / Parceiros
CREATE TABLE IF NOT EXISTS public.cap_saas_resellers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50) NOT NULL,
    referral_code VARCHAR(50) UNIQUE NOT NULL, -- Ex: 'PARCEIROVIP'
    commission_rate NUMERIC(5,2) NOT NULL DEFAULT 20.00, -- 20%
    pix_key_type VARCHAR(20) DEFAULT 'cpf', -- cpf, cnpj, email, phone, random
    pix_key VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'active', -- active, suspended, pending
    tenant_id UUID REFERENCES public.cap_tenants(id) ON DELETE SET NULL, -- Se o revendedor for dono de salão
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabela de Vinculação entre Parceiro e Salão Indicado (Referral)
CREATE TABLE IF NOT EXISTS public.cap_saas_referrals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reseller_id UUID NOT NULL REFERENCES public.cap_saas_resellers(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES public.cap_tenants(id) ON DELETE CASCADE,
    referral_code_used VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active', -- active, churned
    referrer_free_month_applied BOOLEAN DEFAULT FALSE,
    referee_free_month_applied BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_saas_referral_tenant UNIQUE (tenant_id) -- 1 salão só pode ser indicado 1 vez
);

-- 3. Extrato e Lançamento de Comissões por Fatura Paga
CREATE TABLE IF NOT EXISTS public.cap_saas_commissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reseller_id UUID NOT NULL REFERENCES public.cap_saas_resellers(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES public.cap_tenants(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES public.cap_invoices(id) ON DELETE SET NULL,
    invoice_amount NUMERIC(10,2) NOT NULL,
    commission_rate NUMERIC(5,2) NOT NULL,
    commission_amount NUMERIC(10,2) NOT NULL,
    reference_month VARCHAR(7) NOT NULL, -- '2026-10'
    status VARCHAR(20) NOT NULL DEFAULT 'available', -- available, paid, cancelled
    payout_id UUID, -- Chave estrangeira para cap_saas_payouts
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Histórico de Solicitações e Repasses PIX
CREATE TABLE IF NOT EXISTS public.cap_saas_payouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reseller_id UUID NOT NULL REFERENCES public.cap_saas_resellers(id) ON DELETE CASCADE,
    amount NUMERIC(10,2) NOT NULL CHECK (amount >= 50.00), -- Mínimo R$ 50,00
    pix_key_type VARCHAR(20) NOT NULL,
    pix_key VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, paid, rejected
    receipt_url TEXT, -- Comprovante da transferência PIX
    notes TEXT,
    processed_at TIMESTAMPTZ,
    processed_by UUID REFERENCES public.cap_platform_admins(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Foreign key para cap_saas_commissions
ALTER TABLE public.cap_saas_commissions
    ADD CONSTRAINT fk_commissions_payout
    FOREIGN KEY (payout_id) REFERENCES public.cap_saas_payouts(id) ON DELETE SET NULL;

-- Índices de Alta Performance
CREATE INDEX IF NOT EXISTS idx_resellers_code ON public.cap_saas_resellers(referral_code);
CREATE INDEX IF NOT EXISTS idx_referrals_reseller ON public.cap_saas_referrals(reseller_id);
CREATE INDEX IF NOT EXISTS idx_commissions_reseller_status ON public.cap_saas_commissions(reseller_id, status);
CREATE INDEX IF NOT EXISTS idx_payouts_reseller_status ON public.cap_saas_payouts(reseller_id, status);

-- Concessões C5 ao Papel opera_app
GRANT SELECT, INSERT, UPDATE ON public.cap_saas_resellers TO opera_app;
GRANT SELECT, INSERT, UPDATE ON public.cap_saas_referrals TO opera_app;
GRANT SELECT, INSERT, UPDATE ON public.cap_saas_commissions TO opera_app;
GRANT SELECT, INSERT, UPDATE ON public.cap_saas_payouts TO opera_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO opera_app;
```

### 32.2 Governança e Regras de Negócio
1. **Ativação Global Controlada**:
   - `cap_platform_settings.reseller_program_enabled = FALSE` por padrão.
   - Enquanto `FALSE`, a Landing Page e os Planos ocultam links e banners de indicação.
   - O endpoint público `POST /api/resellers/register` retorna `403 Forbidden` com aviso explicativo.
   - O Super Admin pode convidar parceiros VIP manualmente via `/superadmin/parceiros` com `is_superadmin: true`.
2. **Auditoria e Repasses PIX**:
   - As chaves PIX ficam visíveis para auditoria no painel do Super Admin com botão de cópia instantânea.
   - Cada solicitação de saque (mínimo de R$ 50,00) pode ser marcada como "Paga" com link do comprovante, ou "Recusada" com motivo detalhado e estorno automático das comissões de volta para `status = 'available'`.

---

## 33. Governança de Privacidade e Canal do Titular (DPO - F5)

A Fase 45 (F5) formaliza a infraestrutura de atendimento às exigências da Lei Geral de Proteção de Dados (Lei Federal nº 13.709/2018 - LGPD), implementando a tabela de protocolos de requisições de titulares e canal oficial do Encarregado de Dados (DPO).

### 33.1 DDL da Tabela de Requisições de Privacidade

```sql
-- Migração phase37_privacy_dpo_governance.sql

CREATE TABLE IF NOT EXISTS public.cap_privacy_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    protocol VARCHAR(40) UNIQUE NOT NULL, -- Ex: LGPD-20261028-51CE
    requester_name VARCHAR(255) NOT NULL,
    requester_email VARCHAR(255) NOT NULL,
    requester_document VARCHAR(50), -- CPF ou Documento de Identificação
    requester_type VARCHAR(30) NOT NULL DEFAULT 'client', -- 'client', 'tenant_admin', 'staff', 'partner', 'visitor'
    request_type VARCHAR(50) NOT NULL, -- 'access', 'correction', 'anonymization', 'deletion', 'portability', 'consent_revocation', 'information'
    tenant_id UUID REFERENCES public.cap_tenants(id) ON DELETE SET NULL, -- Salão associado (quando aplicável)
    details TEXT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'received', -- 'received', 'under_review', 'completed', 'rejected'
    resolution_notes TEXT,
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES public.cap_platform_admins(id) ON DELETE SET NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices de Alta Performance para Auditoria
CREATE INDEX IF NOT EXISTS idx_privacy_requests_protocol ON public.cap_privacy_requests(protocol);
CREATE INDEX IF NOT EXISTS idx_privacy_requests_status ON public.cap_privacy_requests(status);
CREATE INDEX IF NOT EXISTS idx_privacy_requests_email ON public.cap_privacy_requests(requester_email);
CREATE INDEX IF NOT EXISTS idx_privacy_requests_created ON public.cap_privacy_requests(created_at DESC);

-- Concessões C5 ao Papel opera_app
GRANT SELECT, INSERT, UPDATE ON public.cap_privacy_requests TO opera_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO opera_app;
```

### 33.2 Regras de Negócio e Direitos dos Titulares
1. **Geração Criptográfica de Protocolo**:
   - Cada requisição gera um identificador público determinístico (`LGPD-AAAAMMDD-XXXX`).
2. **Prazo Legal de Resposta**:
   - O Encarregado (DPO) possui prazo regulamentar de até 15 dias úteis (Art. 19 da LGPD) para fornecer parecer conclusivo ou atendimento integral.
3. **Consulta Pública e Transparente**:
   - O titular pode consultar a evolução do chamado em `/dpo` fornecendo apenas o protocolo, visualizando status e resposta do DPO.

---

## 34. Estrutura de Complementos e Add-ons do SaaS (Item E3)

Modelagem introduzida pela migração `phase38_saas_addons_e3.sql`, provendo catálogo oficial de complementos sob demanda para salões parceiros, incluindo pacotes extras de mensagens de WhatsApp, domínio próprio personalizado e módulo de emissão fiscal (NFS-e).

### 34.1 DDL dos Complementos e Contratos Multi-Tenant

```sql
-- Catálogo dos Complementos Disponíveis no SaaS
CREATE TABLE IF NOT EXISTS public.cap_addons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug VARCHAR(50) UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    billing_cycle TEXT NOT NULL DEFAULT 'monthly',
    category VARCHAR(30) NOT NULL, -- 'whatsapp', 'domain', 'fiscal'
    features JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Contratos de Complementos por Salão (Multi-Tenant)
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

-- Índices e Otimização
CREATE INDEX IF NOT EXISTS idx_cap_tenant_addons_tenant_status 
    ON public.cap_tenant_addons(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_cap_tenant_addons_addon 
    ON public.cap_tenant_addons(addon_id);

-- Extensão em cap_tenants
ALTER TABLE public.cap_tenants 
    ADD COLUMN IF NOT EXISTS custom_domain VARCHAR(255),
    ADD COLUMN IF NOT EXISTS custom_domain_verified BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS extra_whatsapp_messages INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS nfse_enabled BOOLEAN DEFAULT FALSE;

-- Row Level Security (RLS) - Princípio C6
ALTER TABLE public.cap_tenant_addons ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_addons ON public.cap_tenant_addons
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

-- Concessões C5 ao Papel opera_app
GRANT SELECT ON public.cap_addons TO opera_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cap_tenant_addons TO opera_app;
GRANT SELECT, UPDATE ON public.cap_tenants TO opera_app;

-- ==========================================
-- 18. PROGRAMA DE PARCEIROS E REVENDA SAAS (F4)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.cap_saas_resellers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT NOT NULL,
    password_hash TEXT,
    referral_code VARCHAR(30) UNIQUE NOT NULL,
    commission_rate NUMERIC(5,2) NOT NULL DEFAULT 20.00,
    pix_key_type VARCHAR(20) DEFAULT 'cpf',
    pix_key TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'active', -- 'active', 'suspended', 'pending'
    tenant_id UUID REFERENCES public.cap_tenants(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_commission_rate CHECK (commission_rate >= 0.00 AND commission_rate <= 100.00),
    CONSTRAINT chk_reseller_status CHECK (status IN ('active', 'suspended', 'pending'))
);

CREATE INDEX IF NOT EXISTS idx_saas_resellers_code ON public.cap_saas_resellers(referral_code);
CREATE INDEX IF NOT EXISTS idx_saas_resellers_email ON public.cap_saas_resellers(email);
CREATE INDEX IF NOT EXISTS idx_saas_resellers_tenant ON public.cap_saas_resellers(tenant_id);

CREATE TABLE IF NOT EXISTS public.cap_saas_referrals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reseller_id UUID NOT NULL REFERENCES public.cap_saas_resellers(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES public.cap_tenants(id) ON DELETE CASCADE,
    referral_code VARCHAR(30) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'active',
    referrer_free_month_applied BOOLEAN NOT NULL DEFAULT FALSE,
    referee_free_month_applied BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_saas_referral_tenant UNIQUE (tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_saas_referrals_reseller ON public.cap_saas_referrals(reseller_id);

CREATE TABLE IF NOT EXISTS public.cap_saas_commissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reseller_id UUID NOT NULL REFERENCES public.cap_saas_resellers(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES public.cap_tenants(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES public.cap_invoices(id) ON DELETE SET NULL,
    invoice_amount NUMERIC(10,2) NOT NULL,
    commission_rate NUMERIC(5,2) NOT NULL,
    commission_amount NUMERIC(10,2) NOT NULL,
    reference_month VARCHAR(7) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'available',
    payout_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_saas_commission_amount CHECK (commission_amount >= 0.00),
    CONSTRAINT chk_saas_commission_status CHECK (status IN ('available', 'paid', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS idx_saas_commissions_reseller ON public.cap_saas_commissions(reseller_id, status);
CREATE INDEX IF NOT EXISTS idx_saas_commissions_invoice ON public.cap_saas_commissions(invoice_id);

CREATE TABLE IF NOT EXISTS public.cap_saas_payouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reseller_id UUID NOT NULL REFERENCES public.cap_saas_resellers(id) ON DELETE CASCADE,
    amount NUMERIC(10,2) NOT NULL,
    pix_key_type VARCHAR(20) NOT NULL,
    pix_key TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    receipt_url TEXT,
    notes TEXT,
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    processed_by UUID REFERENCES public.cap_platform_admins(id) ON DELETE SET NULL,
    CONSTRAINT chk_saas_payout_amount CHECK (amount >= 10.00),
    CONSTRAINT chk_saas_payout_status CHECK (status IN ('pending', 'paid', 'rejected'))
);

CREATE INDEX IF NOT EXISTS idx_saas_payouts_reseller ON public.cap_saas_payouts(reseller_id, status);

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'opera_app') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.cap_saas_resellers TO opera_app;
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.cap_saas_referrals TO opera_app;
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.cap_saas_commissions TO opera_app;
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.cap_saas_payouts TO opera_app;
    END IF;
END $$;
```
