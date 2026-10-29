-- ==============================================================================
-- FASE 44 - ITEM D14 (P2): ANAMNESE DINÂMICA, TERMO DE CONSENTIMENTO E EVOLUÇÃO
-- Conformidade LGPD (Art. 11 - Dados Sensíveis de Saúde), Criptografia e Auditoria
-- ==============================================================================

-- 1. Evolução da Tabela de Templates de Anamnese (cap_anamnesis_templates)
ALTER TABLE public.cap_anamnesis_templates
    ADD COLUMN IF NOT EXISTS terms_text TEXT NOT NULL DEFAULT 'Declaro para os devidos fins que as informações acima prestadas são verdadeiras e completas. Autorizo a realização dos procedimentos estéticos e capilares indicados e estou ciente das orientações e cuidados pós-atendimento.',
    ADD COLUMN IF NOT EXISTS terms_version INTEGER NOT NULL DEFAULT 1 CHECK (terms_version > 0),
    ADD COLUMN IF NOT EXISTS require_terms BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS require_signature BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Evolução da Tabela de Respostas de Anamnese do Cliente (cap_client_anamnesis)
ALTER TABLE public.cap_client_anamnesis
    ADD COLUMN IF NOT EXISTS answers_encrypted TEXT,
    ADD COLUMN IF NOT EXISTS terms_accepted BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS terms_version INTEGER DEFAULT 1,
    ADD COLUMN IF NOT EXISTS consented_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS consent_ip_address VARCHAR(45),
    ADD COLUMN IF NOT EXISTS consent_user_agent TEXT,
    ADD COLUMN IF NOT EXISTS consent_hash VARCHAR(64),
    ADD COLUMN IF NOT EXISTS signature_data TEXT;

-- 3. Criação da Tabela de Evolução Clínica e Procedimentos por Sessão (cap_client_evolutions)
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

-- Habilitação de RLS (Row Level Security) Multi-Tenant
ALTER TABLE public.cap_client_evolutions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'cap_client_evolutions' AND policyname = 'tenant_isolation_client_evolutions'
    ) THEN
        CREATE POLICY tenant_isolation_client_evolutions ON public.cap_client_evolutions
            FOR ALL USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID);
    END IF;
END $$;

-- Concessão de Privilégios ao papel de menor privilégio opera_app (Princípio C5)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'opera_app') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.cap_client_evolutions TO opera_app;
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.cap_client_anamnesis TO opera_app;
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.cap_anamnesis_templates TO opera_app;
    END IF;
END $$;
