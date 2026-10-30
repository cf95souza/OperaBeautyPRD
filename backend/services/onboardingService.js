import pool from '../config/db.js';
import redisClient from '../config/redis.js';
import { logAudit } from './auditService.js';

/**
 * Catálogos-Modelo Oficiais por Segmento de Beleza e Estética (Fase 44 - D11 P1)
 * Estruturados com serviços, descrições comerciais de alto impacto, durações e preços de referência de mercado.
 */
export const CATALOG_TEMPLATES = {
  manicure: {
    key: 'manicure',
    name: 'Manicure & Nail Design',
    category: 'Unhas & Cuidados',
    description: 'Procedimentos completos para cuidados com mãos e pés, esmaltação e extensões de alta durabilidade.',
    icon: 'Sparkles',
    recommendedFor: 'Salões de unhas, nail designers e esmalterias',
    services: [
      {
        name: 'Manicure Tradicional',
        short_description: 'Cutilagem técnica combinada, alinhamento e esmaltação impecável.',
        duration_minutes: 45,
        price: 45.00,
        category: 'Manicure'
      },
      {
        name: 'Pedicure Completo',
        short_description: 'Higienização, esfoliação suave, cutilagem e hidratação nutritiva dos pés.',
        duration_minutes: 50,
        price: 55.00,
        category: 'Pedicure'
      },
      {
        name: 'Combo Manicure + Pedicure',
        short_description: 'Cuidado completo das mãos e pés com esfoliação e esmaltação coordenada.',
        duration_minutes: 80,
        price: 90.00,
        category: 'Combos'
      },
      {
        name: 'Alongamento em Gel / Fibra de Vidro',
        short_description: 'Extensão estruturada com curvatura C anatômica e acabamento natural.',
        duration_minutes: 120,
        price: 180.00,
        category: 'Alongamento'
      },
      {
        name: 'Manutenção de Alongamento',
        short_description: 'Nivelamento da raiz, reposição estrutural e nova esmaltação duradoura.',
        duration_minutes: 90,
        price: 120.00,
        category: 'Alongamento'
      },
      {
        name: 'Esmaltação em Gel',
        short_description: 'Secagem instantânea em cabine LED/UV com brilho espelhado de até 20 dias.',
        duration_minutes: 60,
        price: 80.00,
        category: 'Esmaltação'
      },
      {
        name: 'SPA dos Pés com Parafina e Massagem',
        short_description: 'Imersão morna, esfoliação com sais marinhos e massagem relaxante.',
        duration_minutes: 45,
        price: 75.00,
        category: 'SPA dos Pés'
      }
    ]
  },
  lash_brow: {
    key: 'lash_brow',
    name: 'Sobrancelhas & Cílios',
    category: 'Olhar & Visagismo',
    description: 'Design estratégico, micropigmentação suave, laminations e extensões de cílios delicadas.',
    icon: 'Eye',
    recommendedFor: 'Lash designers, brow artists e estúdios de olhar',
    services: [
      {
        name: 'Design de Sobrancelhas Personalizado',
        short_description: 'Mapeamento geométrico com visagismo facial e alinhamento do arco natural.',
        duration_minutes: 35,
        price: 50.00,
        category: 'Sobrancelhas'
      },
      {
        name: 'Design de Sobrancelhas com Henna',
        short_description: 'Preenchimento e definição de falhas com pigmento vegetal de alta fixação.',
        duration_minutes: 45,
        price: 70.00,
        category: 'Sobrancelhas'
      },
      {
        name: 'Brow Lamination + Nutrição',
        short_description: 'Alinhamento dos fios naturais para efeito volumoso, alinhado e moderno.',
        duration_minutes: 60,
        price: 130.00,
        category: 'Sobrancelhas'
      },
      {
        name: 'Extensão de Cílios Fio a Fio Clássico',
        short_description: 'Aplicação fio a fio suave com efeito rímel sofisticado e discreto.',
        duration_minutes: 120,
        price: 160.00,
        category: 'Cílios'
      },
      {
        name: 'Extensão de Cílios Volume Russo / Híbrido',
        short_description: 'Fans artesanais ultrafinos para densidade expressiva e textura aveludada.',
        duration_minutes: 150,
        price: 210.00,
        category: 'Cílios'
      },
      {
        name: 'Lash Lifting com Botox e Tintura',
        short_description: 'Curvatura e escurecimento dos cílios naturais com banho de vitaminas.',
        duration_minutes: 60,
        price: 140.00,
        category: 'Cílios'
      },
      {
        name: 'Manutenção de Extensão de Cílios',
        short_description: 'Higienização profunda e reposição estratégica de fios crescidos.',
        duration_minutes: 75,
        price: 110.00,
        category: 'Cílios'
      }
    ]
  },
  facial: {
    key: 'facial',
    name: 'Estética Facial',
    category: 'Pele & Rejuvenescimento',
    description: 'Protocolos de limpeza profunda, peelings, regeneração de viço e microagulhamento.',
    icon: 'Smile',
    recommendedFor: 'Clínicas de estética facial, biomédicas e esteticistas',
    services: [
      {
        name: 'Limpeza de Pele Profunda com Extração',
        short_description: 'Higienização ultrassônica, vapor de ozônio, extração indolor e máscara calmante.',
        duration_minutes: 80,
        price: 150.00,
        category: 'Limpeza de Pele'
      },
      {
        name: 'Peeling de Diamante + Revitalização',
        short_description: 'Microdermoabrasão física que remove células mortas e ativa luminosidade imediata.',
        duration_minutes: 60,
        price: 160.00,
        category: 'Peelings'
      },
      {
        name: 'Drenagem Linfática Facial e Pescoço',
        short_description: 'Descongestiona tecidos, atenua bolsas oculares e estimula a microcirculação.',
        duration_minutes: 40,
        price: 95.00,
        category: 'Drenagem'
      },
      {
        name: 'Hidratação Profunda com Ácido Hialurônico',
        short_description: 'Infusão hídrica biomimética para viço, elasticidade e textura sedosa.',
        duration_minutes: 50,
        price: 140.00,
        category: 'Hidratação'
      },
      {
        name: 'Microagulhamento com Drug Delivery',
        short_description: 'Indução percutânea de colágeno estéril para firmeza, poros e cicatrizes.',
        duration_minutes: 75,
        price: 260.00,
        category: 'Procedimentos Avançados'
      },
      {
        name: 'Revitalização Labial Hidragloss',
        short_description: 'Esfoliação suave e hidratação profunda que devolve o viço e tom natural dos lábios.',
        duration_minutes: 45,
        price: 120.00,
        category: 'Lábios'
      }
    ]
  },
  massage: {
    key: 'massage',
    name: 'Drenagem & Massagem Corporal',
    category: 'Bem-estar & Corporal',
    description: 'Terapias de relaxamento, alívio de tensões musculares, contorno corporal e pós-cirúrgico.',
    icon: 'Heart',
    recommendedFor: 'Massoterapeutas, fisioterapeutas dermatofuncionais e spas corporais',
    services: [
      {
        name: 'Drenagem Linfática Corporal Manual',
        short_description: 'Estímulo ganglionar suave e ritmado para redução de retenção e edemas.',
        duration_minutes: 60,
        price: 130.00,
        category: 'Drenagem'
      },
      {
        name: 'Drenagem Linfática Pós-Operatório',
        short_description: 'Atendimento especializado para recuperação cirúrgica segura e prevenção de fibroses.',
        duration_minutes: 60,
        price: 160.00,
        category: 'Pós-Operatório'
      },
      {
        name: 'Massagem Relaxante com Aromaterapia',
        short_description: 'Manobras fluidas e óleos essenciais terapêuticos que dissolvem o estresse físico.',
        duration_minutes: 60,
        price: 140.00,
        category: 'Relaxamento'
      },
      {
        name: 'Massagem Modeladora Redutora',
        short_description: 'Manobras vigorosas e profundas que ativam a circulação e remodelam o contorno.',
        duration_minutes: 50,
        price: 130.00,
        category: 'Corporal'
      },
      {
        name: 'Massagem com Pedras Quentes Vulcânicas',
        short_description: 'Termoterapia profunda que combina pedras basálticas aquecidas e massagem terapêutica.',
        duration_minutes: 75,
        price: 180.00,
        category: 'Terapias Especiais'
      },
      {
        name: 'SPA Corporal com Esfoliação e Manto Térmico',
        short_description: 'Renovação celular completa da pele com sais aromáticos e hidratação oclusiva morna.',
        duration_minutes: 70,
        price: 170.00,
        category: 'SPA'
      }
    ]
  },
  depilation: {
    key: 'depilation',
    name: 'Depilação',
    category: 'Pele Suave & Depilação',
    description: 'Protocolos de remoção de pelos com ceras especiais elásticas, linha egípcia e laser.',
    icon: 'Flame',
    recommendedFor: 'Depiladoras, estúdios de cera e clínicas de depilação a laser',
    services: [
      {
        name: 'Depilação Virilha Completa (Cera Hidrossolúvel)',
        short_description: 'Cera elástica suave com baixa temperatura e efeito calmante pós-depilatório.',
        duration_minutes: 40,
        price: 75.00,
        category: 'Virilha'
      },
      {
        name: 'Depilação Meia Perna',
        short_description: 'Remoção precisa até o joelho com loção pós-cera enriquecida com camomila.',
        duration_minutes: 30,
        price: 45.00,
        category: 'Pernas'
      },
      {
        name: 'Depilação Perna Inteira',
        short_description: 'Pele acetinada e livre de pelos com fórmula anti-irritante de alta tolerância.',
        duration_minutes: 50,
        price: 80.00,
        category: 'Pernas'
      },
      {
        name: 'Depilação de Axilas',
        short_description: 'Praticidade e rapidez com cera morna higiênica e descartável.',
        duration_minutes: 20,
        price: 35.00,
        category: 'Axilas'
      },
      {
        name: 'Depilação de Buço na Linha Egípcia',
        short_description: 'Remoção com fio 100% algodão orgânico sem agredir a pele delicada do rosto.',
        duration_minutes: 15,
        price: 25.00,
        category: 'Rosto'
      },
      {
        name: 'Combo Virilha Completa + Meia Perna + Axilas',
        short_description: 'Pacote promocional essencial para manter a rotina de cuidados em dia.',
        duration_minutes: 75,
        price: 135.00,
        category: 'Combos'
      }
    ]
  },
  hair: {
    key: 'hair',
    name: 'Cabelo & Terapia Capilar',
    category: 'Cabelo & Transformação',
    description: 'Cortes visagistas, escovas de alta fixação, coloração, tratamentos nutritivos e alinhamento.',
    icon: 'Scissors',
    recommendedFor: 'Cabeleireiros, hair stylists e salões de beleza completos',
    services: [
      {
        name: 'Corte Feminino com Lavagem Especial e Escova',
        short_description: 'Visagismo de pontas e camadas com massagem capilar no lavatório e modelagem.',
        duration_minutes: 60,
        price: 120.00,
        category: 'Cortes'
      },
      {
        name: 'Escova Modelada ou Lisa',
        short_description: 'Higienização profissional com secagem polida de longa durabilidade.',
        duration_minutes: 45,
        price: 65.00,
        category: 'Escovas'
      },
      {
        name: 'Hidratação e Nutrição Intensiva com Ampola',
        short_description: 'Reposição lipídica com máscara profissional de alta performance e brilho imediato.',
        duration_minutes: 60,
        price: 110.00,
        category: 'Tratamentos'
      },
      {
        name: 'Cronograma Capilar - Sessão Reconstrução',
        short_description: 'Aporte de queratina e aminoácidos para recuperação de fios porosos e danificados.',
        duration_minutes: 75,
        price: 150.00,
        category: 'Tratamentos'
      },
      {
        name: 'Mechas e Iluminação com Tonalização',
        short_description: 'Clareamento seguro com proteção plex, matização nobre e acabamento natural.',
        duration_minutes: 180,
        price: 350.00,
        category: 'Coloração'
      },
      {
        name: 'Botox Capilar e Alinhamento Térmico',
        short_description: 'Disciplina das cutículas, redução de frizz e brilho espelhado.',
        duration_minutes: 120,
        price: 220.00,
        category: 'Alinhamento'
      }
    ]
  }
};

/**
 * Consulta o status em tempo real do Onboarding Guiado do Salão
 */
export const getOnboardingStatus = async (tenantId) => {
  // 1. Dados estruturais do salão
  const tenantRes = await pool.query(
    `SELECT id, name, slug, logo_url, banner_url, theme_id, brand_hex, 
            primary_color, secondary_color, onboarding_dismissed, qr_code_generated_at,
            created_at
     FROM public.cap_tenants 
     WHERE id = $1`,
    [tenantId]
  );

  if (tenantRes.rows.length === 0) {
    const error = new Error('Salão não encontrado.');
    error.statusCode = 404;
    throw error;
  }

  const tenant = tenantRes.rows[0];

  // 2. Consultas concorrentes nos pilares do salão
  const [servicesRes, staffRes, hoursRes, appointmentsRes] = await Promise.all([
    pool.query('SELECT COUNT(*)::int AS total FROM public.cap_services WHERE tenant_id = $1 AND is_active = true', [tenantId]),
    pool.query("SELECT COUNT(*)::int AS total FROM public.cap_staff WHERE tenant_id = $1 AND is_active = true AND role = 'professional'", [tenantId]),
    pool.query('SELECT COUNT(*)::int AS total FROM public.cap_business_hours WHERE tenant_id = $1 AND is_closed = false', [tenantId]),
    pool.query('SELECT COUNT(*)::int AS total FROM public.cap_appointments WHERE tenant_id = $1', [tenantId])
  ]);

  const servicesCount = servicesRes.rows[0]?.total || 0;
  const staffCount = staffRes.rows[0]?.total || 0;
  const openDaysCount = hoursRes.rows[0]?.total || 0;
  const appointmentsCount = appointmentsRes.rows[0]?.total || 0;

  // 3. Avaliação de cada item do checklist
  const isServicesDone = servicesCount > 0;
  const isStaffDone = staffCount > 0;
  const isHoursDone = openDaysCount > 0;
  const isBrandingDone = Boolean(tenant.logo_url || tenant.theme_id !== 'rose' || (tenant.brand_hex && tenant.brand_hex !== '#8E3B4E'));
  const isQrCodeDone = Boolean(tenant.qr_code_generated_at);
  const isFirstAppointmentDone = appointmentsCount > 0;

  const steps = [
    {
      id: 'services',
      order: 1,
      title: 'Cadastrar Serviços do Catálogo',
      description: isServicesDone 
        ? `${servicesCount} ${servicesCount === 1 ? 'serviço cadastrado e ativo' : 'serviços cadastrados e ativos'}.`
        : 'Adicione seus serviços com preço e duração ou aplique um catálogo modelo pronto em 1 clique.',
      completed: isServicesDone,
      count: servicesCount,
      actionType: 'modal_catalog_template',
      actionLabel: isServicesDone ? 'Ver Serviços' : 'Usar Catálogo Pronto',
      actionUrl: `/${tenant.slug}/staff/admin/servicos`
    },
    {
      id: 'staff',
      order: 2,
      title: 'Cadastrar Equipe de Atendimento',
      description: isStaffDone
        ? `${staffCount} ${staffCount === 1 ? 'profissional ativa na equipe' : 'profissionais ativas na equipe'}.`
        : 'Cadastre ao menos uma profissional com comissão e horários para receber agendamentos.',
      completed: isStaffDone,
      count: staffCount,
      actionType: 'navigate',
      actionLabel: isStaffDone ? 'Ver Equipe' : 'Cadastrar Profissional',
      actionUrl: `/${tenant.slug}/staff/admin/equipe`
    },
    {
      id: 'business_hours',
      order: 3,
      title: 'Configurar Horários de Atendimento',
      description: isHoursDone
        ? `${openDaysCount} ${openDaysCount === 1 ? 'dia com expediente ativo' : 'dias com expediente ativo'}.`
        : 'Defina em quais dias da semana e horários o salão está aberto para receber clientes.',
      completed: isHoursDone,
      count: openDaysCount,
      actionType: 'navigate',
      actionLabel: isHoursDone ? 'Ver Horários' : 'Definir Expediente',
      actionUrl: `/${tenant.slug}/staff/admin/configuracoes?tab=hours`
    },
    {
      id: 'branding',
      order: 4,
      title: 'Personalizar Identidade Visual (Logo & Tema)',
      description: isBrandingDone
        ? 'Identidade visual do salão configurada.'
        : 'Envie o logotipo do salão e selecione uma paleta de cores acolhedora.',
      completed: isBrandingDone,
      actionType: 'navigate',
      actionLabel: isBrandingDone ? 'Editar Visual' : 'Configurar Logo & Cores',
      actionUrl: `/${tenant.slug}/staff/admin/configuracoes?tab=branding`
    },
    {
      id: 'qr_code',
      order: 5,
      title: 'Gerar Display de Balcão com QR Code',
      description: isQrCodeDone
        ? 'Display de mesa com QR Code gerado para o balcão.'
        : 'Gere a placa de recepção com QR Code para suas clientes agendarem pelo celular.',
      completed: isQrCodeDone,
      actionType: 'modal_qr_display',
      actionLabel: isQrCodeDone ? 'Reimprimir Display' : 'Gerar Display de Mesa',
      actionUrl: null
    },
    {
      id: 'first_appointment',
      order: 6,
      title: 'Realizar Primeiro Agendamento de Teste',
      description: isFirstAppointmentDone
        ? `${appointmentsCount} ${appointmentsCount === 1 ? 'agendamento registrado no sistema' : 'agendamentos registrados no sistema'}.`
        : 'Faça um agendamento rápido pelo link do salão para vivenciar a experiência da sua cliente.',
      completed: isFirstAppointmentDone,
      count: appointmentsCount,
      actionType: 'external_booking_link',
      actionLabel: isFirstAppointmentDone ? 'Ver Agenda' : 'Fazer Agendamento Teste',
      actionUrl: `/${tenant.slug}`
    }
  ];

  const totalSteps = steps.length;
  const completedSteps = steps.filter(s => s.completed).length;
  const progressPercent = Math.round((completedSteps / totalSteps) * 100);
  const isAllCompleted = completedSteps === totalSteps;

  return {
    tenant: {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      logo_url: tenant.logo_url,
      theme_id: tenant.theme_id,
      brand_hex: tenant.brand_hex,
      public_booking_url: `/${tenant.slug}`
    },
    summary: {
      total_steps: totalSteps,
      completed_steps: completedSteps,
      remaining_steps: totalSteps - completedSteps,
      progress_percent: progressPercent,
      is_all_completed: isAllCompleted,
      dismissed: Boolean(tenant.onboarding_dismissed),
      qr_code_generated_at: tenant.qr_code_generated_at
    },
    steps
  };
};

/**
 * Retorna todos os templates de catálogo modelo por segmento
 */
export const getCatalogTemplates = () => {
  return Object.values(CATALOG_TEMPLATES).map(cat => ({
    key: cat.key,
    name: cat.name,
    category: cat.category,
    description: cat.description,
    icon: cat.icon,
    recommendedFor: cat.recommendedFor,
    servicesCount: cat.services.length,
    services: cat.services
  }));
};

/**
 * Aplica um catálogo modelo pré-configurado ao salão com transação atômica
 */
export const applyCatalogTemplate = async (tenantId, segmentKey, customServicesList = null, userId = null) => {
  const template = CATALOG_TEMPLATES[segmentKey];
  if (!template) {
    const error = new Error(`Segmento de catálogo "${segmentKey}" não encontrado.`);
    error.statusCode = 400;
    throw error;
  }

  // Lista de serviços a importar (padrão do template ou selecionados pelo gestor)
  const servicesToInsert = Array.isArray(customServicesList) && customServicesList.length > 0
    ? customServicesList
    : template.services;

  if (servicesToInsert.length === 0) {
    const error = new Error('Nenhum serviço selecionado para importação.');
    error.statusCode = 400;
    throw error;
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Isolamento RLS compulsório (SET LOCAL app.current_tenant_id via set_config)
    await client.query('SELECT set_config($1, $2, true)', ['app.current_tenant_id', String(tenantId)]);

    // Verificar se tenant existe e está ativo
    const tenantCheck = await client.query(
      'SELECT id, name, status FROM public.cap_tenants WHERE id = $1',
      [tenantId]
    );

    if (tenantCheck.rows.length === 0) {
      throw new Error('Salão não encontrado.');
    }

    if (tenantCheck.rows[0].status === 'inactive' || tenantCheck.rows[0].status === 'suspended') {
      const err = new Error('Operação bloqueada para salões suspensos ou inativos.');
      err.statusCode = 403;
      throw err;
    }

    // Buscar nomes existentes para evitar duplicações involuntárias
    const existingRes = await client.query(
      'SELECT LOWER(TRIM(name)) AS name_lower FROM public.cap_services WHERE tenant_id = $1',
      [tenantId]
    );
    const existingNames = new Set(existingRes.rows.map(r => r.name_lower));

    const insertedServices = [];
    const skippedServices = [];

    for (const s of servicesToInsert) {
      const name = String(s.name || '').trim();
      if (!name) continue;

      const nameLower = name.toLowerCase();

      // Se já existe com o mesmo nome, ignora para não criar duplicatas
      if (existingNames.has(nameLower)) {
        skippedServices.push({ name, reason: 'Serviço já existente no catálogo' });
        continue;
      }

      const durationMinutes = Math.max(5, Math.min(720, parseInt(s.duration_minutes, 10) || 30));
      const price = Math.max(0, parseFloat(s.price) || 0);
      const shortDescription = s.short_description ? String(s.short_description).slice(0, 255) : null;

      const insertRes = await client.query(
        `INSERT INTO public.cap_services (
          tenant_id, name, short_description, duration_minutes, price, 
          is_starting_price, reduces_stock, maintenance_days, is_active,
          requires_deposit, deposit_type, deposit_amount
        ) VALUES (
          $1, $2, $3, $4, $5, 
          FALSE, FALSE, 0, TRUE,
          FALSE, 'percentage', 0.00
        ) RETURNING id, name, short_description, duration_minutes, price, is_active`,
        [tenantId, name, shortDescription, durationMinutes, price]
      );

      existingNames.add(nameLower);
      insertedServices.push(insertRes.rows[0]);
    }

    await client.query('COMMIT');

    // Invalidação do cache Redis do catálogo
    try {
      await redisClient.del(`tenant:${tenantId}:services`);
    } catch (cacheErr) {
      console.warn('Erro ao limpar cache de serviços no Redis:', cacheErr);
    }

    // Registro na trilha de auditoria
    await logAudit(
      tenantId,
      userId || null,
      'APPLY_CATALOG_TEMPLATE',
      'cap_services',
      null,
      null,
      {
        segment: segmentKey,
        segment_name: template.name,
        inserted_count: insertedServices.length,
        skipped_count: skippedServices.length
      }
    );

    return {
      success: true,
      segment: segmentKey,
      segment_name: template.name,
      inserted_count: insertedServices.length,
      skipped_count: skippedServices.length,
      inserted_services: insertedServices,
      skipped_services: skippedServices
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Alterna a visualização do Card de Onboarding (minimizar / restaurar)
 */
export const toggleDismissOnboarding = async (tenantId, dismissed = true, userId = null) => {
  const result = await pool.query(
    `UPDATE public.cap_tenants 
     SET onboarding_dismissed = $1 
     WHERE id = $2 
     RETURNING id, name, onboarding_dismissed`,
    [Boolean(dismissed), tenantId]
  );

  if (result.rows.length === 0) {
    const error = new Error('Salão não encontrado.');
    error.statusCode = 404;
    throw error;
  }

  await logAudit(
    tenantId,
    userId || null,
    dismissed ? 'DISMISS_ONBOARDING' : 'RESTORE_ONBOARDING',
    'cap_tenants',
    tenantId,
    null,
    { dismissed: Boolean(dismissed) }
  );

  return result.rows[0];
};

/**
 * Registra a geração e impressão do Display de Balcão com QR Code
 */
export const markQrCodeGenerated = async (tenantId, userId = null) => {
  const result = await pool.query(
    `UPDATE public.cap_tenants 
     SET qr_code_generated_at = NOW() 
     WHERE id = $1 
     RETURNING id, name, qr_code_generated_at`,
    [tenantId]
  );

  if (result.rows.length === 0) {
    const error = new Error('Salão não encontrado.');
    error.statusCode = 404;
    throw error;
  }

  await logAudit(
    tenantId,
    userId || null,
    'GENERATE_DISPLAY_QR_CODE',
    'cap_tenants',
    tenantId,
    null,
    { qr_code_generated_at: result.rows[0].qr_code_generated_at }
  );

  return result.rows[0];
};
