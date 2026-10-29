-- ==============================================================================
-- FASE 43 - ITEM C13 (P2): 2FA TOTP (RFC 6238) E AUDITORIA DO SUPER ADMIN
-- ==============================================================================

ALTER TABLE public.cap_platform_admins
  ADD COLUMN IF NOT EXISTS totp_secret TEXT,
  ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS totp_temp_secret TEXT,
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_login_ip TEXT,
  ADD COLUMN IF NOT EXISTS last_login_user_agent TEXT;

COMMENT ON COLUMN public.cap_platform_admins.totp_secret IS 'Segredo base32 criptográfico do 2FA TOTP (RFC 6238)';
COMMENT ON COLUMN public.cap_platform_admins.totp_enabled IS 'Indica se a verificação em duas etapas está ativada e obrigatória';
COMMENT ON COLUMN public.cap_platform_admins.totp_temp_secret IS 'Segredo temporário durante o fluxo de pareamento e ativação';
COMMENT ON COLUMN public.cap_platform_admins.last_login_at IS 'Data e hora do último login realizado com sucesso';
COMMENT ON COLUMN public.cap_platform_admins.last_login_ip IS 'Endereço IP do último login';
COMMENT ON COLUMN public.cap_platform_admins.last_login_user_agent IS 'Dispositivo/Navegador do último login';
