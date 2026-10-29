-- Adiciona flag de 'A partir de' aos serviços
ALTER TABLE public.cap_services ADD COLUMN IF NOT EXISTS is_starting_price BOOLEAN DEFAULT FALSE;
