import { tenantQuery } from '../utils/tenantQuery.js';

/**
 * Cria uma nova avaliação para um agendamento concluído.
 * Regra de Aceite Principal D16: Exatamente uma avaliação por atendimento (Unicidade).
 * Se nota for 4 ou 5, convida para avaliar no Google Reviews caso configurado.
 */
export const createReview = async (tenantId, clientId, appointmentId, rating, comment = null) => {
  const numRating = Number(rating);
  if (!appointmentId || !numRating || numRating < 1 || numRating > 5) {
    const error = new Error('A avaliação deve conter uma nota válida de 1 a 5 estrelas.');
    error.statusCode = 400;
    throw error;
  }

  // 1. Verificar se o agendamento pertence ao cliente e está concluído
  const apptQuery = await tenantQuery(
    tenantId,
    `SELECT staff_id as professional_id, service_id, status 
     FROM public.cap_appointments 
     WHERE id = $1 AND client_id = $2 AND tenant_id = $3`,
    [appointmentId, clientId, tenantId]
  );

  if (apptQuery.rows.length === 0) {
    const error = new Error('Agendamento não encontrado para este cliente.');
    error.statusCode = 404;
    throw error;
  }

  if (apptQuery.rows[0].status !== 'completed') {
    const error = new Error('Apenas agendamentos com atendimento concluído podem ser avaliados.');
    error.statusCode = 400;
    throw error;
  }

  // 2. Verificar se este agendamento já foi avaliado anteriormente (Regra de Unicidade D16)
  const existingReview = await tenantQuery(
    tenantId,
    `SELECT id FROM public.cap_reviews WHERE appointment_id = $1`,
    [appointmentId]
  );

  if (existingReview.rows.length > 0) {
    const error = new Error('Este atendimento já possui uma avaliação registrada.');
    error.statusCode = 409;
    throw error;
  }

  const { professional_id: professionalId, service_id: serviceId } = apptQuery.rows[0];

  // 3. Inserir a avaliação no banco de dados
  const insertResult = await tenantQuery(
    tenantId,
    `INSERT INTO public.cap_reviews (
       tenant_id, appointment_id, client_id, professional_id, service_id, rating, comment, is_public, created_at
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, true, NOW())
     RETURNING id, rating, comment, created_at`,
    [tenantId, appointmentId, clientId, professionalId, serviceId || null, numRating, comment ? comment.trim() : null]
  );

  const review = insertResult.rows[0];

  // 4. Buscar link do Google Reviews configurado no salão
  const tenantQueryRes = await tenantQuery(
    tenantId,
    `SELECT name, google_review_url FROM public.cap_tenants WHERE id = $1`,
    [tenantId]
  );

  const googleReviewUrl = tenantQueryRes.rows[0]?.google_review_url || null;
  const shouldInviteGoogle = numRating >= 4 && Boolean(googleReviewUrl);

  return {
    message: 'Avaliação enviada com sucesso! Agradecemos o seu feedback.',
    review,
    invite_google: shouldInviteGoogle,
    google_review_url: shouldInviteGoogle ? googleReviewUrl : null
  };
};

/**
 * Retorna o agendamento concluído mais recente pendente de avaliação para o cliente.
 */
export const getPendingReview = async (tenantId, clientId) => {
  const pendingQuery = await tenantQuery(
    tenantId,
    `SELECT a.id as appointment_id, a.start_time, s.name as professional_name,
            t.google_review_url,
            COALESCE(
              (SELECT string_agg(s2.name, ' + ' ORDER BY cas.order_index ASC)
               FROM public.cap_appointment_services cas
               JOIN public.cap_services s2 ON cas.service_id = s2.id
               WHERE cas.appointment_id = a.id),
              srv.name,
              'Procedimento'
            ) as service_name
     FROM public.cap_appointments a
     JOIN public.cap_tenants t ON a.tenant_id = t.id
     JOIN public.cap_staff s ON a.staff_id = s.id
     LEFT JOIN public.cap_services srv ON a.service_id = srv.id
     LEFT JOIN public.cap_reviews r ON a.id = r.appointment_id
     WHERE a.client_id = $1 AND a.tenant_id = $2 AND a.status = 'completed' AND r.id IS NULL
     ORDER BY a.start_time DESC
     LIMIT 1`,
    [clientId, tenantId]
  );

  return pendingQuery.rows[0] || null;
};

/**
 * Lista avaliações com suporte a filtros por profissional, nota, visibilidade e paginação.
 */
export const listReviews = async (tenantId, options = {}) => {
  const { professionalId = null, rating = null, isPublic = null, limit = 50, offset = 0 } = options;

  let query = `
    SELECT r.id, r.rating, r.comment, r.is_public, r.staff_reply, r.replied_at, r.created_at,
           c.name as client_name, c.phone as client_phone,
           s.name as professional_name,
           srv.name as service_name,
           replier.name as replied_by_name
    FROM public.cap_reviews r
    JOIN public.cap_clients c ON r.client_id = c.id
    LEFT JOIN public.cap_staff s ON r.professional_id = s.id
    LEFT JOIN public.cap_services srv ON r.service_id = srv.id
    LEFT JOIN public.cap_staff replier ON r.replied_by = replier.id
    WHERE r.tenant_id = $1
  `;
  const params = [tenantId];
  let paramIndex = 2;

  if (professionalId) {
    query += ` AND r.professional_id = $${paramIndex}`;
    params.push(professionalId);
    paramIndex++;
  }

  if (rating) {
    query += ` AND r.rating = $${paramIndex}`;
    params.push(Number(rating));
    paramIndex++;
  }

  if (isPublic !== null && isPublic !== undefined) {
    query += ` AND r.is_public = $${paramIndex}`;
    params.push(Boolean(isPublic));
    paramIndex++;
  }

  query += ` ORDER BY r.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
  params.push(parseInt(limit, 10) || 50);
  params.push(parseInt(offset, 10) || 0);

  const result = await tenantQuery(tenantId, query, params);
  return result.rows;
};

/**
 * Lista apenas avaliações públicas aprovadas (para vitrine pública, lookbook e home do salão).
 */
export const listPublicReviews = async (tenantId, limit = 10) => {
  const result = await tenantQuery(
    tenantId,
    `SELECT r.id, r.rating, r.comment, r.staff_reply, r.created_at,
            c.name as client_name, s.name as professional_name, srv.name as service_name
     FROM public.cap_reviews r
     JOIN public.cap_clients c ON r.client_id = c.id
     LEFT JOIN public.cap_staff s ON r.professional_id = s.id
     LEFT JOIN public.cap_services srv ON r.service_id = srv.id
     WHERE r.tenant_id = $1 AND r.is_public = true
     ORDER BY r.rating DESC, r.created_at DESC
     LIMIT $2`,
    [tenantId, parseInt(limit, 10) || 10]
  );
  return result.rows;
};

/**
 * Estatísticas consolidadas de avaliações, ranking de equipe e link do Google.
 */
export const getReviewsStats = async (tenantId) => {
  // 1. Dados gerais do salão e distribuição de estrelas
  const generalQuery = await tenantQuery(
    tenantId,
    `SELECT 
        ROUND(COALESCE(AVG(rating), 0), 1)::float as average,
        COUNT(id)::int as total_reviews,
        COUNT(CASE WHEN rating = 5 THEN 1 END)::int as count_5,
        COUNT(CASE WHEN rating = 4 THEN 1 END)::int as count_4,
        COUNT(CASE WHEN rating = 3 THEN 1 END)::int as count_3,
        COUNT(CASE WHEN rating = 2 THEN 1 END)::int as count_2,
        COUNT(CASE WHEN rating = 1 THEN 1 END)::int as count_1,
        COUNT(CASE WHEN rating >= 4 THEN 1 END)::int as positive_reviews
     FROM public.cap_reviews 
     WHERE tenant_id = $1`,
    [tenantId]
  );

  const row = generalQuery.rows[0] || {};
  const total = row.total_reviews || 0;
  const positive = row.positive_reviews || 0;
  const satisfactionRate = total > 0 ? Math.round((positive / total) * 100) : 100;

  // 2. Ranking e média por profissional
  const staffQuery = await tenantQuery(
    tenantId,
    `SELECT r.professional_id as id, 
            s.name, 
            ROUND(AVG(r.rating), 1)::float as average, 
            COUNT(r.id)::int as total_reviews,
            COUNT(CASE WHEN r.rating >= 4 THEN 1 END)::int as positive_reviews
     FROM public.cap_reviews r
     JOIN public.cap_staff s ON r.professional_id = s.id
     WHERE r.tenant_id = $1
     GROUP BY r.professional_id, s.name
     ORDER BY average DESC, total_reviews DESC`,
    [tenantId]
  );

  // 3. Link do Google Reviews no salão
  const tenantQueryRes = await tenantQuery(
    tenantId,
    `SELECT google_review_url FROM public.cap_tenants WHERE id = $1`,
    [tenantId]
  );

  return {
    average: parseFloat(row.average) || 0,
    total_reviews: total,
    satisfaction_rate: satisfactionRate,
    google_review_url: tenantQueryRes.rows[0]?.google_review_url || '',
    star_distribution: {
      5: row.count_5 || 0,
      4: row.count_4 || 0,
      3: row.count_3 || 0,
      2: row.count_2 || 0,
      1: row.count_1 || 0
    },
    staff: staffQuery.rows.map(s => ({
      id: s.id,
      name: s.name,
      average: parseFloat(s.average) || 0,
      total_reviews: s.total_reviews || 0,
      satisfaction_rate: s.total_reviews > 0 ? Math.round((s.positive_reviews / s.total_reviews) * 100) : 100
    }))
  };
};

/**
 * Moderação básica: Alterna visibilidade pública da avaliação na vitrine do salão.
 */
export const toggleReviewVisibility = async (tenantId, reviewId, isPublic) => {
  const result = await tenantQuery(
    tenantId,
    `UPDATE public.cap_reviews
     SET is_public = $1
     WHERE id = $2 AND tenant_id = $3
     RETURNING id, is_public`,
    [Boolean(isPublic), reviewId, tenantId]
  );

  if (result.rows.length === 0) {
    const error = new Error('Avaliação não encontrada.');
    error.statusCode = 404;
    throw error;
  }

  return result.rows[0];
};

/**
 * Moderação: Equipe/Gestor responde publicamente à avaliação.
 */
export const replyToReview = async (tenantId, reviewId, replyText, staffId) => {
  if (!replyText || !replyText.trim()) {
    const error = new Error('O texto da resposta não pode ser vazio.');
    error.statusCode = 400;
    throw error;
  }

  const result = await tenantQuery(
    tenantId,
    `UPDATE public.cap_reviews
     SET staff_reply = $1,
         replied_at = NOW(),
         replied_by = $2
     WHERE id = $3 AND tenant_id = $4
     RETURNING id, staff_reply, replied_at, replied_by`,
    [replyText.trim(), staffId || null, reviewId, tenantId]
  );

  if (result.rows.length === 0) {
    const error = new Error('Avaliação não encontrada.');
    error.statusCode = 404;
    throw error;
  }

  return result.rows[0];
};

/**
 * Atualiza o link do Google Meu Negócio / Google Reviews do salão.
 */
export const updateGoogleReviewUrl = async (tenantId, googleReviewUrl) => {
  const sanitizedUrl = googleReviewUrl ? googleReviewUrl.trim() : null;

  const result = await tenantQuery(
    tenantId,
    `UPDATE public.cap_tenants
     SET google_review_url = $1,
         updated_at = NOW()
     WHERE id = $2
     RETURNING id, name, google_review_url`,
    [sanitizedUrl, tenantId]
  );

  if (result.rows.length === 0) {
    const error = new Error('Salão não encontrado.');
    error.statusCode = 404;
    throw error;
  }

  return result.rows[0];
};
