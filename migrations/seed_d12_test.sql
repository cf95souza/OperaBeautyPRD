DO $$
DECLARE
  v_tenant UUID := 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d';
  v_srv_id UUID;
BEGIN
  INSERT INTO public.cap_services (
    id, tenant_id, name, short_description, duration_minutes, price, is_starting_price, is_active
  ) VALUES (
    gen_random_uuid(), v_tenant, 'Alongamento em Fibra de Vidro', 'Alongamento resistente com acabamento natural e alta durabilidade.', 90, 100.00, true, true
  ) RETURNING id INTO v_srv_id;

  INSERT INTO public.cap_service_variations (
    id, service_id, tenant_id, name, price, duration_minutes, is_active, order_index
  ) VALUES
    (gen_random_uuid(), v_srv_id, v_tenant, 'Comprimento Curto', 80.00, 75, true, 1),
    (gen_random_uuid(), v_srv_id, v_tenant, 'Comprimento Médio', 100.00, 90, true, 2),
    (gen_random_uuid(), v_srv_id, v_tenant, 'Comprimento Longo', 130.00, 110, true, 3);

  INSERT INTO public.cap_service_extras (
    id, service_id, tenant_id, name, price, duration_minutes, is_active, order_index
  ) VALUES
    (gen_random_uuid(), v_srv_id, v_tenant, 'Nail Art por Unha', 15.00, 15, true, 1),
    (gen_random_uuid(), v_srv_id, v_tenant, 'Esmaltação em Gel', 35.00, 20, true, 2),
    (gen_random_uuid(), v_srv_id, v_tenant, 'Spa dos Pés Relaxante', 50.00, 30, true, 3);

  INSERT INTO public.cap_services (
    tenant_id, name, short_description, duration_minutes, price, is_starting_price, is_active
  ) VALUES (
    v_tenant, 'Design de Sobrancelhas', 'Alinhamento e simetria personalizados para o formato do seu rosto.', 30, 45.00, false, true
  );
END $$;
