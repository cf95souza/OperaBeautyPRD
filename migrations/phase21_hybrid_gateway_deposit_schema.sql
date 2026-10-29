-- ==============================================================================
-- FASE 44 - ITEM D3 (P1): ARQUITETURA HÍBRIDA DE SINAL POR PIX NO AGENDAMENTO
-- Multi-Gateway: Mercado Pago, Asaas, AbacatePay, PIX Manual e Simulador Sandbox
-- ==============================================================================

-- 1. Tabela de Configurações de Gateway Próprio do Salão (100% dos fundos para o salão)
CREATE TABLE IF NOT EXISTS public.cap_tenant_gateway_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.cap_tenants(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL DEFAULT 'manual_pix', -- mercadopago, asaas, abacatepay, manual_pix, simulator
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    sandbox_mode BOOLEAN NOT NULL DEFAULT FALSE,
    deposit_expiration_minutes INTEGER NOT NULL DEFAULT 15,
    encrypted_credentials TEXT, -- AES-256-GCM: enc:v1:<iv>:<tag>:<ciphertext> (tokens privados)
    public_key TEXT,            -- Chave pública segura para inicialização de frontend se aplicável
    pix_key VARCHAR(150),       -- Chave PIX direta do salão
    pix_key_type VARCHAR(30),   -- cpf, cnpj, email, phone, random
    holder_name VARCHAR(150),   -- Nome do titular da conta
    instructions TEXT,          -- Instruções personalizadas do salão para a cliente
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_tenant_gateway_config UNIQUE (tenant_id)
);

-- 2. Configurações de Exigência de Sinal no Catálogo de Serviços
ALTER TABLE public.cap_services 
    ADD COLUMN IF NOT EXISTS requires_deposit BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS deposit_type VARCHAR(20) NOT NULL DEFAULT 'percentage', -- 'percentage' ou 'fixed'
    ADD COLUMN IF NOT EXISTS deposit_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00;

-- 3. Campos de Controle Financeiro de Sinal no Agendamento
ALTER TABLE public.cap_appointments 
    ADD COLUMN IF NOT EXISTS deposit_status VARCHAR(30) NOT NULL DEFAULT 'none', -- none, pending, paid, expired, refunded
    ADD COLUMN IF NOT EXISTS deposit_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS deposit_provider VARCHAR(50),
    ADD COLUMN IF NOT EXISTS deposit_payment_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS deposit_pix_code TEXT,
    ADD COLUMN IF NOT EXISTS deposit_pix_qr TEXT,
    ADD COLUMN IF NOT EXISTS deposit_expires_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS deposit_paid_at TIMESTAMPTZ;

-- Índices de Otimização e Performance
CREATE INDEX IF NOT EXISTS idx_tenant_gateway_configs_tenant ON public.cap_tenant_gateway_configs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_appointments_deposit_status ON public.cap_appointments(deposit_status);
CREATE INDEX IF NOT EXISTS idx_appointments_deposit_expires ON public.cap_appointments(deposit_expires_at);
CREATE INDEX IF NOT EXISTS idx_appointments_deposit_payment_id ON public.cap_appointments(deposit_payment_id);

-- Habilitação de RLS (Row Level Security)
ALTER TABLE public.cap_tenant_gateway_configs ENABLE ROW LEVEL SECURITY;

-- Políticas de Isolamento Multi-Tenant
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'cap_tenant_gateway_configs' AND policyname = 'tenant_isolation_gateway_configs'
    ) THEN
        CREATE POLICY tenant_isolation_gateway_configs ON public.cap_tenant_gateway_configs
            FOR ALL USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID);
    END IF;
END $$;

-- Concessão de Privilégios ao papel opera_app (usuário da API)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'opera_app') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.cap_tenant_gateway_configs TO opera_app;
    END IF;
END $$;
