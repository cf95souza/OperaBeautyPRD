-- ==============================================================================
-- MIGRAÇÃO PHASE 11: Limpeza de Dados e Textos (J9 / Regra 9.1 itens 7 a 9)
-- ==============================================================================

-- 1. Sanitização de acentuação e textos nos Planos de Assinatura (cap_plans)
UPDATE cap_plans
SET features = jsonb_build_array(
  'Agendamentos ilimitados',
  'Serviços ilimitados',
  'Controle de estoque',
  'Controle de caixa',
  'Suporte por WhatsApp'
)
WHERE name = 'Básico';

UPDATE cap_plans
SET features = jsonb_build_array(
  'Agendamentos ilimitados',
  'Serviços ilimitados',
  'Controle de estoque',
  'Controle de caixa',
  'Suporte por WhatsApp',
  'Clube de fidelidade'
)
WHERE name = 'Premium';

UPDATE cap_plans
SET features = jsonb_build_array(
  'Agendamentos ilimitados',
  'Serviços ilimitados',
  'Controle de estoque',
  'Controle de caixa',
  'Suporte por WhatsApp',
  'Clube de fidelidade',
  'PDV',
  'Vales-presente'
)
WHERE name = 'Enterprise';

UPDATE cap_plans
SET features = jsonb_build_array(
  '1 profissional',
  'Agenda digital',
  'Suporte por WhatsApp'
)
WHERE name = 'Solo';

UPDATE cap_plans
SET features = jsonb_build_array(
  'Até 5 profissionais',
  'Controle de estoque',
  'Suporte por WhatsApp'
)
WHERE name = 'Essencial';

-- 2. Correção de dados de teste na tabela de Clientes (cap_clients)
-- Transforma "Cliente Teste" em cliente real e refinada para o salão de demonstração
UPDATE cap_clients
SET name = 'Beatriz Alcantara',
    phone = '(11) 99888-2020',
    birth_date = '1992-05-14',
    vip_tier = 'VIP'
WHERE name ILIKE '%Cliente Teste%' OR phone = '(11) 99999-0000';

-- 3. Correção de nome genérico na equipe gestora (cap_staff)
UPDATE cap_staff
SET name = 'Thais Rodrigues'
WHERE name = 'Gestor' AND email = 'thais@studiodatha.com';

-- 4. Limpeza de anotações "teste" e imagens quebradas da timeline (cap_timeline_notes)
-- Elimina notas puramente de teste com 'teste' e fotos não existentes
DELETE FROM cap_timeline_notes 
WHERE content ILIKE 'teste' OR (content = '' AND image_path IS NOT NULL);

-- Insere notas profissionais e condizentes com um salão de alto padrão para a cliente Beatriz Alcantara
DO $$
DECLARE
  v_tenant_id uuid;
  v_client_id uuid;
  v_staff_id uuid;
BEGIN
  SELECT id INTO v_tenant_id FROM cap_tenants WHERE slug = 'studiothais' LIMIT 1;
  SELECT id INTO v_client_id FROM cap_clients WHERE name = 'Beatriz Alcantara' LIMIT 1;
  SELECT id INTO v_staff_id FROM cap_staff WHERE email = 'thais@studiodatha.com' LIMIT 1;

  IF v_tenant_id IS NOT NULL AND v_client_id IS NOT NULL THEN
    INSERT INTO cap_timeline_notes (tenant_id, client_id, staff_id, content, created_at)
    VALUES 
      (v_tenant_id, v_client_id, v_staff_id, 'Cliente solicitou teste de mechas prévio para tonalização suave. Fios com excelente elasticidade e resistência.', NOW() - INTERVAL '15 days'),
      (v_tenant_id, v_client_id, v_staff_id, 'Preferência declarada por tons de esmalte nude e cutículas apenas hidratadas.', NOW() - INTERVAL '5 days');
  END IF;
END $$;
