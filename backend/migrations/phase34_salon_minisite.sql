-- Phase 34: Mini-site do Salão & SEO Social Dinâmico (D20 P2)
ALTER TABLE public.cap_tenants
  ADD COLUMN IF NOT EXISTS headline TEXT,
  ADD COLUMN IF NOT EXISTS about_text TEXT,
  ADD COLUMN IF NOT EXISTS minisite_gallery JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS google_maps_url TEXT,
  ADD COLUMN IF NOT EXISTS meta_title TEXT,
  ADD COLUMN IF NOT EXISTS meta_description TEXT,
  ADD COLUMN IF NOT EXISTS meta_image_url TEXT,
  ADD COLUMN IF NOT EXISTS minisite_enabled BOOLEAN DEFAULT TRUE;

GRANT SELECT, UPDATE ON public.cap_tenants TO opera_app;
