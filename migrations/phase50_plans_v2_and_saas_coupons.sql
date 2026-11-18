-- ============================================================================
-- Migração Fase 50: Nova Grade de 3 Planos SaaS, Cupons SaaS & Travas Comerciais
-- ============================================================================

-- 1. Criação da Tabela de Cupons do SaaS (Super Admin -> Donas de Salão)
CREATE TABLE IF NOT EXISTS public.cap_saas_coupons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value NUMERIC(10, 2) NOT NULL CHECK (discount_value > 0),
    applies_to VARCHAR(30) NOT NULL DEFAULT 'first_month' CHECK (applies_to IN ('first_month', 'all_months', 'yearly')),
    plan_slugs JSONB DEFAULT '[]'::jsonb, -- Ex: '["essencial"]', se vazio aplica a todos
    max_uses INT DEFAULT NULL,            -- NULL significa ilimitado
    current_uses INT DEFAULT 0,
    expires_at TIMESTAMPTZ DEFAULT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cap_saas_coupons_code ON public.cap_saas_coupons(code);
CREATE INDEX IF NOT EXISTS idx_cap_saas_coupons_active ON public.cap_saas_coupons(is_active);

-- 2. Colunas de Desconto e Rastreio de Cupom nas Faturas SaaS
ALTER TABLE public.cap_invoices 
    ADD COLUMN IF NOT EXISTS original_amount NUMERIC(10, 2),
    ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10, 2) DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS applied_coupon_code VARCHAR(50);

-- Preencher original_amount retroativamente se nulo
UPDATE public.cap_invoices 
SET original_amount = amount 
WHERE original_amount IS NULL;

-- 3. Atualização da Grade de Planos: Redução para 3 Planos (Básico, Essencial, Premium)
-- Desativar o plano Signature
UPDATE public.cap_plans 
SET is_active = FALSE 
WHERE slug = 'signature' OR name ILIKE '%signature%';

-- Atualizar Plano Básico (antigo Solo)
-- Preço: R$ 39,90/mês | R$ 399,00/ano | Até 2 profissionais
-- Sem mini-site, sem anamnese, sem estoque, sem financeiro
UPDATE public.cap_plans 
SET 
    name = 'Básico',
    slug = 'basico',
    description = 'Custa menos que 1 serviço! O essencial para organizar seus agendamentos.',
    price = 39.90,
    yearly_price = 399.00,
    sort_order = 0,
    max_professionals = 2,
    max_banners = 1,
    max_whatsapp_messages = 0,
    is_featured = FALSE,
    badge_label = 'Entrada',
    features = '["dashboard", "agenda", "clientes", "servicos", "push_notifications", "coupons"]'::jsonb,
    marketing_features = '[
        "Até 2 profissionais",
        "Agendamentos & clientes ilimitados",
        "Agenda digital com link exclusivo",
        "App com sua marca e cores (White-Label)",
        "Lembretes automáticos por push",
        "Gestão de clientes & histórico",
        "Cupons de desconto para clientes",
        "Suporte por WhatsApp"
    ]'::jsonb,
    is_active = TRUE
WHERE slug = 'solo' OR slug = 'basico' OR name ILIKE '%solo%' OR name ILIKE '%básico%';

-- Caso o plano Básico não exista ainda com slug 'basico', inserir
INSERT INTO public.cap_plans (
    id, name, slug, description, price, yearly_price, sort_order, interval, 
    max_professionals, max_banners, max_whatsapp_messages, is_featured, badge_label, 
    features, marketing_features, extra_professional_price, is_active
)
SELECT 
    '1fa6d4ff-3317-41e5-a7b5-faee14bf65a2',
    'Básico',
    'basico',
    'Custa menos que 1 serviço! O essencial para organizar seus agendamentos.',
    39.90,
    399.00,
    0,
    'month',
    2,
    1,
    0,
    FALSE,
    'Entrada',
    '["dashboard", "agenda", "clientes", "servicos", "push_notifications", "coupons"]'::jsonb,
    '["Até 2 profissionais", "Agendamentos & clientes ilimitados", "Agenda digital com link exclusivo", "App com sua marca e cores (White-Label)", "Lembretes automáticos por push", "Gestão de clientes & histórico", "Cupons de desconto para clientes", "Suporte por WhatsApp"]'::jsonb,
    15.00,
    TRUE
WHERE NOT EXISTS (SELECT 1 FROM public.cap_plans WHERE slug = 'basico');

-- Atualizar Plano Essencial
-- Preço: R$ 59,90/mês | R$ 599,00/ano | Até 5 profissionais
-- Ganha mini-site público institucional, ficha de anamnese, estoque, financeiro, comissões
UPDATE public.cap_plans 
SET 
    name = 'Essencial',
    slug = 'essencial',
    description = 'Para salões e estúdios em crescimento que precisam de controle operacional e financeiro.',
    price = 59.90,
    yearly_price = 599.00,
    sort_order = 1,
    max_professionals = 5,
    max_banners = 2,
    max_whatsapp_messages = 0,
    is_featured = FALSE,
    badge_label = NULL,
    features = '["dashboard", "agenda", "clientes", "servicos", "push_notifications", "coupons", "minisite", "anamnesis", "estoque", "financeiro", "comissoes", "caixa"]'::jsonb,
    marketing_features = '[
        "Até 5 profissionais",
        "Tudo do plano Básico",
        "Mini-site público institucional (/[slug]/site) com SEO",
        "Ficha de anamnese digital & termos com assinatura",
        "Controle de estoque de produtos & insumos",
        "Controle de caixa & fluxo financeiro",
        "Cálculo automático de comissões da equipe",
        "Relatórios de faturamento e ticket médio",
        "Suporte por WhatsApp em horário comercial"
    ]'::jsonb,
    is_active = TRUE
WHERE slug = 'essencial' OR name ILIKE '%essencial%';

-- Atualizar Plano Premium
-- Preço: R$ 79,90/mês | R$ 799,00/ano | Até 15 profissionais
-- Mais Escolhido: Clube de fidelidade, pacotes de sessões, PDV, gift cards, reviews, bi
UPDATE public.cap_plans 
SET 
    name = 'Premium',
    slug = 'premium',
    description = 'O pacote completo de retenção, fidelidade, PDV e automação de agendamentos.',
    price = 79.90,
    yearly_price = 799.00,
    sort_order = 2,
    max_professionals = 15,
    max_banners = 5,
    max_whatsapp_messages = 200,
    is_featured = TRUE,
    badge_label = 'Mais Escolhido',
    features = '["dashboard", "agenda", "clientes", "servicos", "push_notifications", "coupons", "minisite", "anamnesis", "estoque", "financeiro", "comissoes", "caixa", "clube", "cashback", "packages", "reviews", "waitlist", "campaigns", "referrals", "pdv", "vales", "giftcards", "bi_reports"]'::jsonb,
    marketing_features = '[
        "Até 15 profissionais",
        "Tudo do plano Essencial",
        "Clube de fidelidade & cashback automático",
        "Pacotes de sessões pré-pagos",
        "PDV unificado com conferência cega de caixa",
        "Vales-presente digitais (Gift Cards)",
        "Avaliações & impulsionador Google Reviews",
        "Relatórios analíticos avançados & BI",
        "Lista de espera inteligente",
        "Campanhas automáticas (aniversário & retorno)",
        "Indique e Ganhe (programa de embaixadoras)",
        "Suporte prioritário por WhatsApp"
    ]'::jsonb,
    is_active = TRUE
WHERE slug = 'premium' OR name ILIKE '%premium%';

-- 4. Inserir Cupons Promocionais Semente da Estratégia de Aquisição
INSERT INTO public.cap_saas_coupons (code, description, discount_type, discount_value, applies_to, plan_slugs, max_uses, is_active)
VALUES 
(
    'ESSENCIAL30',
    '30% de desconto no 1º mês do plano Essencial (de R$ 59,90 por R$ 41,93)',
    'percentage',
    30.00,
    'first_month',
    '["essencial"]'::jsonb,
    500,
    TRUE
),
(
    'PREMIUM40',
    '40% de desconto no 1º mês do plano Premium (de R$ 79,90 por R$ 47,94)',
    'percentage',
    40.00,
    'first_month',
    '["premium"]'::jsonb,
    500,
    TRUE
)
ON CONFLICT (code) DO UPDATE SET
    description = EXCLUDED.description,
    discount_type = EXCLUDED.discount_type,
    discount_value = EXCLUDED.discount_value,
    plan_slugs = EXCLUDED.plan_slugs,
    is_active = TRUE;
