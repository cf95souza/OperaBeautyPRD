-- 2.19 Assinaturas Web Push (Para notificações no celular/PWA)
CREATE TABLE IF NOT EXISTS public.cap_push_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.cap_tenants(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES public.cap_staff(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.20 Notificações In-App (Histórico do Sininho)
CREATE TABLE IF NOT EXISTS public.cap_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.cap_tenants(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES public.cap_staff(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
