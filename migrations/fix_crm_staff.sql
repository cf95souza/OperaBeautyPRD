ALTER TABLE public.cap_timeline_notes ADD COLUMN IF NOT EXISTS staff_id UUID REFERENCES public.cap_staff(id) ON DELETE SET NULL;
