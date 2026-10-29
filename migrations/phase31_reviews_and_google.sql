-- ==============================================================================
-- FASE 44 - ITEM D16 (P2): AVALIAÇÕES E GOOGLE REVIEWS
-- Regras de Aceite: Avaliação 1 a 5 pós-atendimento, Média por Profissional,
-- Convite Google Reviews para notas 4-5, Unicidade por Atendimento e Moderação.
-- ==============================================================================

-- 1. Extensão de cap_tenants com URL do Google Meu Negócio / Google Reviews e timestamp
ALTER TABLE public.cap_tenants
    ADD COLUMN IF NOT EXISTS google_review_url TEXT,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Evolução de cap_reviews para moderação, respostas da equipe e serviço avaliado
ALTER TABLE public.cap_reviews
    ADD COLUMN IF NOT EXISTS service_id UUID REFERENCES public.cap_services(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS staff_reply TEXT,
    ADD COLUMN IF NOT EXISTS replied_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS replied_by UUID REFERENCES public.cap_staff(id) ON DELETE SET NULL;

-- 3. Regra de Aceite Principal D16: Exatamente uma avaliação por atendimento (Unicidade)
CREATE UNIQUE INDEX IF NOT EXISTS uq_idx_reviews_appointment 
    ON public.cap_reviews (appointment_id) 
    WHERE appointment_id IS NOT NULL;

-- 4. Índices para Otimização de Performance e Relatórios
CREATE INDEX IF NOT EXISTS idx_reviews_tenant_professional 
    ON public.cap_reviews (tenant_id, professional_id, rating);

CREATE INDEX IF NOT EXISTS idx_reviews_tenant_public 
    ON public.cap_reviews (tenant_id, is_public, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reviews_client 
    ON public.cap_reviews (client_id);

-- 5. RLS Multi-Tenant (Segurança em Profundidade)
ALTER TABLE public.cap_reviews ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'cap_reviews' AND policyname = 'tenant_isolation_reviews'
    ) THEN
        CREATE POLICY tenant_isolation_reviews ON public.cap_reviews
            FOR ALL USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID);
    END IF;
END $$;

-- 6. Concessão de Privilégios ao Usuário de Menor Privilégio opera_app (Princípio C5)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'opera_app') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.cap_reviews TO opera_app;
        GRANT SELECT, UPDATE ON public.cap_tenants TO opera_app;
    END IF;
END $$;
