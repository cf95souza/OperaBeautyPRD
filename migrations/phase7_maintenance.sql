-- Migration Fase 7: Adicionando controle de manutenção e recorrência
-- Executar no SQL Editor do Supabase

-- 1. Adicionar coluna de dias de manutenção na tabela de serviços
ALTER TABLE cap_services 
ADD COLUMN IF NOT EXISTS maintenance_days INTEGER DEFAULT 30;

-- 2. Garantir que a tabela de timeline exista (caso não tenha sido criada)
CREATE TABLE IF NOT EXISTS cap_timeline_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES cap_clients(id) ON DELETE CASCADE,
    professional_id UUID REFERENCES cap_profiles(id),
    appointment_id UUID REFERENCES cap_appointments(id),
    content TEXT,
    image_path TEXT, -- Armazena o caminho no Storage Bucket
    type TEXT DEFAULT 'comment', -- 'comment', 'procedure', 'loyalty'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Instrução para o usuário: Criar Bucket "cap_timeline_images" no painel Storage.
-- (Não é possível criar buckets via SQL puro se as permissões de admin do storage não estiverem habilitadas para a role pública/anon)
