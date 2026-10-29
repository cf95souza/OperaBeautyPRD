-- =========================================================================
-- Migração: Programa de Indicação e Revenda SaaS (Fase 45 - Item F4 P2)
-- Governança: 01-security-constitution & 07-database-architect
-- =========================================================================

-- 1. Tabela de Revendedores / Parceiros Afiliados do SaaS OperaBeauty
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
    tenant_id UUID REFERENCES public.cap_tenants(id) ON DELETE SET NULL, -- Se o parceiro for gestor de um salão parceiro
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_commission_rate CHECK (commission_rate >= 0.00 AND commission_rate <= 100.00),
    CONSTRAINT chk_reseller_status CHECK (status IN ('active', 'suspended', 'pending'))
);

CREATE INDEX IF NOT EXISTS idx_saas_resellers_code ON public.cap_saas_resellers(referral_code);
CREATE INDEX IF NOT EXISTS idx_saas_resellers_email ON public.cap_saas_resellers(email);
CREATE INDEX IF NOT EXISTS idx_saas_resellers_tenant ON public.cap_saas_resellers(tenant_id);

-- 2. Tabela de Salões Indicados através do Programa de Parceiros
CREATE TABLE IF NOT EXISTS public.cap_saas_referrals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reseller_id UUID NOT NULL REFERENCES public.cap_saas_resellers(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES public.cap_tenants(id) ON DELETE CASCADE,
    referral_code VARCHAR(30) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'active', -- 'trial', 'active', 'churned'
    referrer_free_month_applied BOOLEAN NOT NULL DEFAULT FALSE,
    referee_free_month_applied BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_saas_referral_tenant UNIQUE (tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_saas_referrals_reseller ON public.cap_saas_referrals(reseller_id);

-- 3. Tabela de Comissões Recorrentes dos Parceiros por Fatura SaaS
CREATE TABLE IF NOT EXISTS public.cap_saas_commissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reseller_id UUID NOT NULL REFERENCES public.cap_saas_resellers(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES public.cap_tenants(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES public.cap_invoices(id) ON DELETE SET NULL,
    invoice_amount NUMERIC(10,2) NOT NULL,
    commission_rate NUMERIC(5,2) NOT NULL,
    commission_amount NUMERIC(10,2) NOT NULL,
    reference_month VARCHAR(7) NOT NULL, -- 'YYYY-MM'
    status VARCHAR(20) NOT NULL DEFAULT 'available', -- 'available', 'paid', 'cancelled'
    payout_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_saas_commission_amount CHECK (commission_amount >= 0.00),
    CONSTRAINT chk_saas_commission_status CHECK (status IN ('available', 'paid', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS idx_saas_commissions_reseller ON public.cap_saas_commissions(reseller_id, status);
CREATE INDEX IF NOT EXISTS idx_saas_commissions_invoice ON public.cap_saas_commissions(invoice_id);

-- 4. Tabela de Saques / Pagamentos de Comissão para Revendedores
CREATE TABLE IF NOT EXISTS public.cap_saas_payouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reseller_id UUID NOT NULL REFERENCES public.cap_saas_resellers(id) ON DELETE CASCADE,
    amount NUMERIC(10,2) NOT NULL,
    pix_key_type VARCHAR(20) NOT NULL,
    pix_key TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'paid', 'rejected'
    receipt_url TEXT,
    notes TEXT,
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    processed_by UUID REFERENCES public.cap_platform_admins(id) ON DELETE SET NULL,
    CONSTRAINT chk_saas_payout_amount CHECK (amount >= 10.00),
    CONSTRAINT chk_saas_payout_status CHECK (status IN ('pending', 'paid', 'rejected'))
);

CREATE INDEX IF NOT EXISTS idx_saas_payouts_reseller ON public.cap_saas_payouts(reseller_id, status);

-- 5. Atualização da Tabela de Leads para Rastreamento de Afiliados
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'cap_leads' AND column_name = 'referral_code'
    ) THEN
        ALTER TABLE public.cap_leads ADD COLUMN referral_code VARCHAR(30);
    END IF;
END $$;

-- 6. Concessões de Acesso para o Papel opera_app (Princípio do Menor Privilégio - C5)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'opera_app') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.cap_saas_resellers TO opera_app;
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.cap_saas_referrals TO opera_app;
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.cap_saas_commissions TO opera_app;
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.cap_saas_payouts TO opera_app;
    END IF;
END $$;

-- 7. Parceiro de Demonstração / Teste Inicial (PARCEIROVIP)
INSERT INTO public.cap_saas_resellers (
    name, email, phone, referral_code, commission_rate, pix_key_type, pix_key, status, notes
) VALUES (
    'Thaís Consultora', 'parceiro@operabeauty.com.br', '(11) 98888-7777', 'PARCEIROVIP', 20.00, 'email', 'parceiro@operabeauty.com.br', 'active', 'Parceiro VIP inicial para testes e demonstrações'
) ON CONFLICT (email) DO NOTHING;

