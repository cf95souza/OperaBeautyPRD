-- ==============================================================================
-- Migração: phase37_privacy_dpo_governance.sql
-- Fase 45: F5 (P1) — Formalização e Termos (LGPD, DPO e Canal do Titular)
-- ==============================================================================

-- 1. Tabela de Protocolos e Requisições de Titulares de Dados (Canal DPO)
CREATE TABLE IF NOT EXISTS public.cap_privacy_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    protocol VARCHAR(40) UNIQUE NOT NULL, -- Ex: LGPD-20261028-AB12
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

-- 2. Índices de Busca e Auditoria
CREATE INDEX IF NOT EXISTS idx_privacy_requests_protocol ON public.cap_privacy_requests(protocol);
CREATE INDEX IF NOT EXISTS idx_privacy_requests_status ON public.cap_privacy_requests(status);
CREATE INDEX IF NOT EXISTS idx_privacy_requests_email ON public.cap_privacy_requests(requester_email);
CREATE INDEX IF NOT EXISTS idx_privacy_requests_created ON public.cap_privacy_requests(created_at DESC);

-- 3. Concessões de Menor Privilégio ao papel da aplicação (C5)
GRANT SELECT, INSERT, UPDATE ON public.cap_privacy_requests TO opera_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO opera_app;
