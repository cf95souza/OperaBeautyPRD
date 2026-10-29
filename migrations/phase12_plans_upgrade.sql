-- Migração para atualização da tabela cap_plans (Fase 42 / H5)
ALTER TABLE cap_plans ADD COLUMN IF NOT EXISTS yearly_price numeric;
ALTER TABLE cap_plans ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;

-- Atualizar planos existentes com os recursos oficiais e preços anuais
UPDATE cap_plans SET 
  yearly_price = 699.00,
  sort_order = 1,
  features = '["Agendamentos ilimitados", "Serviços ilimitados", "Controle de estoque", "Controle de caixa", "Suporte por WhatsApp"]'::jsonb
WHERE price = 69.90;

UPDATE cap_plans SET 
  yearly_price = 799.00,
  sort_order = 2,
  features = '["Agendamentos ilimitados", "Serviços ilimitados", "Controle de estoque", "Controle de caixa", "Suporte por WhatsApp", "Clube de fidelidade"]'::jsonb
WHERE name = 'Premium';

UPDATE cap_plans SET 
  yearly_price = 999.00,
  sort_order = 3,
  features = '["Agendamentos ilimitados", "Serviços ilimitados", "Controle de estoque", "Controle de caixa", "Suporte por WhatsApp", "Clube de fidelidade", "PDV", "Vales-presente"]'::jsonb
WHERE name = 'Enterprise';

UPDATE cap_plans SET 
  yearly_price = 499.00,
  sort_order = 0,
  features = '["1 profissional", "Agenda digital", "Suporte por WhatsApp"]'::jsonb
WHERE name = 'Solo';

UPDATE cap_plans SET 
  yearly_price = 899.00,
  sort_order = 4,
  features = '["Até 5 profissionais", "Controle de estoque", "Suporte por WhatsApp"]'::jsonb
WHERE name = 'Essencial';
