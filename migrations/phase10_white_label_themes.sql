-- Migração: phase10_white_label_themes.sql
-- Adiciona suporte a temas White-Label oficiais e cor de marca livre em cap_tenants

ALTER TABLE public.cap_tenants 
ADD COLUMN IF NOT EXISTS theme_id VARCHAR(50) DEFAULT 'rose',
ADD COLUMN IF NOT EXISTS brand_hex VARCHAR(7) DEFAULT '#8E3B4E';

-- Atualiza tenants existentes sem tema configurado para o padrão 'rose'
UPDATE public.cap_tenants 
SET theme_id = 'rose', brand_hex = '#8E3B4E' 
WHERE theme_id IS NULL;
