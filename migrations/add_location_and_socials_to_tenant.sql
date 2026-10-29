-- Migração: Adicionar campos de Localização e Redes Sociais na tabela de Tenants (cap_tenants)
ALTER TABLE public.cap_tenants 
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS social_instagram TEXT,
ADD COLUMN IF NOT EXISTS social_facebook TEXT,
ADD COLUMN IF NOT EXISTS social_whatsapp TEXT;
