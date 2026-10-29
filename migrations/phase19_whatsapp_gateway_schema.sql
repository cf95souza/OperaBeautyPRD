-- ==============================================================================
-- FASE 44 - ITEM D2 (P1): OPERABEAUTY WHATSAPP GATEWAY NATIVO (BAILEYS V7)
-- ==============================================================================

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
    encrypted_value TEXT NOT NULL,  -- enc:v1:<iv>:<tag>:<ciphertext>
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

-- Habilitação de RLS (Row Level Security)
ALTER TABLE public.cap_whatsapp_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cap_whatsapp_auth_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cap_whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- Políticas de Isolamento Multi-Tenant
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'cap_whatsapp_instances' AND policyname = 'tenant_isolation_whatsapp_instances'
    ) THEN
        CREATE POLICY tenant_isolation_whatsapp_instances ON public.cap_whatsapp_instances
            FOR ALL USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'cap_whatsapp_auth_keys' AND policyname = 'tenant_isolation_whatsapp_auth_keys'
    ) THEN
        CREATE POLICY tenant_isolation_whatsapp_auth_keys ON public.cap_whatsapp_auth_keys
            FOR ALL USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'cap_whatsapp_messages' AND policyname = 'tenant_isolation_whatsapp_messages'
    ) THEN
        CREATE POLICY tenant_isolation_whatsapp_messages ON public.cap_whatsapp_messages
            FOR ALL USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID);
    END IF;
END $$;

-- Concessão de Privilégios ao papel opera_app (se existir)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'opera_app') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.cap_whatsapp_instances TO opera_app;
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.cap_whatsapp_auth_keys TO opera_app;
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.cap_whatsapp_messages TO opera_app;
    END IF;
END $$;
