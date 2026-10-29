-- Adiciona a tabela cap_refresh_tokens caso não exista (não documentada no database.md original, mas usada no authService)
CREATE TABLE IF NOT EXISTS public.cap_refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    -- Novas colunas para FINDING-07 (Security & Binding):
    family_id UUID,
    is_revoked BOOLEAN DEFAULT FALSE,
    ip_address TEXT,
    user_agent TEXT
);

-- Caso a tabela já existisse, adicionamos as colunas faltantes para mitigar roubo de sessão:
ALTER TABLE public.cap_refresh_tokens 
ADD COLUMN IF NOT EXISTS family_id UUID,
ADD COLUMN IF NOT EXISTS is_revoked BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS ip_address TEXT,
ADD COLUMN IF NOT EXISTS user_agent TEXT;
