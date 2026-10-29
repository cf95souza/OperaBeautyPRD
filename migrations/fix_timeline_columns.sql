-- Adiciona colunas ausentes de imagem e staff na tabela cap_timeline_notes
ALTER TABLE public.cap_timeline_notes
ADD COLUMN IF NOT EXISTS staff_id UUID REFERENCES public.cap_staff(id),
ADD COLUMN IF NOT EXISTS image_path TEXT;
