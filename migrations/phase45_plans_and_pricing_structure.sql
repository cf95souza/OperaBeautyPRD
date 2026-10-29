-- ==============================================================================
-- FASE 45 - REESTRUTURAÇÃO DE PLANOS, PREÇOS E COLUNAS SAAS (E1 / H5)
-- ==============================================================================

-- >>> UP >>>
ALTER TABLE public.cap_plans ADD COLUMN IF NOT EXISTS slug VARCHAR(50);
ALTER TABLE public.cap_plans ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.cap_plans ADD COLUMN IF NOT EXISTS yearly_price NUMERIC(10,2);
ALTER TABLE public.cap_plans ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 0;
ALTER TABLE public.cap_plans ADD COLUMN IF NOT EXISTS max_whatsapp_messages INT DEFAULT 0;
ALTER TABLE public.cap_plans ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE;
ALTER TABLE public.cap_plans ADD COLUMN IF NOT EXISTS badge_label VARCHAR(50);
ALTER TABLE public.cap_plans ADD COLUMN IF NOT EXISTS features JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.cap_plans ADD COLUMN IF NOT EXISTS marketing_features JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.cap_plans ADD COLUMN IF NOT EXISTS extra_professional_price NUMERIC(10,2) DEFAULT 15.00;
ALTER TABLE public.cap_plans ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cap_plans_slug_key') THEN
        ALTER TABLE public.cap_plans ADD CONSTRAINT cap_plans_slug_key UNIQUE (slug);
    END IF;
END $$;

ALTER TABLE public.cap_tenants ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES public.cap_plans(id) ON DELETE SET NULL;
ALTER TABLE public.cap_tenants ADD COLUMN IF NOT EXISTS plan_price NUMERIC DEFAULT 59.99;
ALTER TABLE public.cap_tenants ADD COLUMN IF NOT EXISTS is_founder BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.cap_tenants ADD COLUMN IF NOT EXISTS frozen_price NUMERIC(10,2);
ALTER TABLE public.cap_tenants ADD COLUMN IF NOT EXISTS price_frozen_until TIMESTAMPTZ;
ALTER TABLE public.cap_tenants ADD COLUMN IF NOT EXISTS founder_badge_label VARCHAR(50);

CREATE TABLE IF NOT EXISTS public.cap_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.cap_tenants(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    status TEXT DEFAULT 'pending',
    due_date DATE NOT NULL,
    paid_at TIMESTAMPTZ,
    payment_method TEXT,
    reference_month TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.cap_plans (id, name, slug, description, price, yearly_price, sort_order, interval, max_professionals, max_banners, max_whatsapp_messages, is_featured, badge_label, features, marketing_features, extra_professional_price, is_active)
VALUES 
(
    '1fa6d4ff-3317-41e5-a7b5-faee14bf65a2',
    'Solo',
    'solo',
    'Ideal para quem trabalha por conta própria (manicure, esteticista, lash designer).',
    49.90,
    499.00,
    0,
    'month',
    1,
    1,
    0,
    FALSE,
    NULL,
    '["dashboard", "agenda", "clientes", "servicos", "push_notifications", "coupons", "minisite"]'::jsonb,
    '["1 profissional", "Agenda digital inteligente", "App com a marca do salão (White-Label)", "Lembretes automáticos por push", "Gestão de clientes & histórico", "Cupons de desconto", "Mini-site público com SEO"]'::jsonb,
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
    1,
    'month',
    3,
    2,
    0,
    FALSE,
    NULL,
    '["dashboard", "agenda", "clientes", "servicos", "push_notifications", "coupons", "minisite", "estoque", "financeiro", "comissoes", "caixa"]'::jsonb,
    '["Até 3 profissionais", "Tudo do plano Solo", "Controle de estoque de produtos & insumos", "Controle de caixa & fluxo financeiro", "Cálculo automático de comissões", "Relatórios gerenciais essenciais", "Suporte por WhatsApp em horário comercial"]'::jsonb,
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
    2,
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
    3,
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

-- >>> DOWN >>>
-- No rollback needed for additive columns in production
