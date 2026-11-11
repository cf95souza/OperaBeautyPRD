-- ==============================================================================
-- Migração: Phase 47 - E-mail opcional em cap_clients para recuperação com Resend
-- ==============================================================================

-- >>> UP >>>
ALTER TABLE public.cap_clients
  ADD COLUMN IF NOT EXISTS email VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_cap_clients_email ON public.cap_clients(tenant_id, email);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'opera_app') THEN
    GRANT SELECT, INSERT, UPDATE ON public.cap_clients TO opera_app;
  END IF;
END $$;

-- >>> DOWN >>>
DROP INDEX IF EXISTS idx_cap_clients_email;
ALTER TABLE public.cap_clients DROP COLUMN IF EXISTS email;

