import { tenantQuery } from '../utils/tenantQuery.js';
import whatsappService from './whatsappService.js';
import pool from '../config/db.js';

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

/**
 * Retorna os limites UTC no fuso de São Paulo (America/Sao_Paulo) para um determinado ano e mês
 */
function getMonthRange(year, month) {
  const m = String(month).padStart(2, '0');
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const d = String(lastDay).padStart(2, '0');

  const startDate = `${year}-${m}-01T00:00:00-03:00`;
  const endDate = `${year}-${m}-${d}T23:59:59.999-03:00`;

  return { startDate, endDate, lastDay };
}

/**
 * 1. Relatório Mensal "Impacto OperaBeauty" (Item D9 P1)
 * Consolida economia de tempo, faturamento protegido, retenção de clientes, clube e top serviços
 */
export const getMonthlyImpactReport = async (tenantId, requestedYear = null, requestedMonth = null) => {
  // 1. Resolver ano e mês no fuso oficial de São Paulo
  const now = new Date();
  const spFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: 'numeric'
  });
  const parts = spFormatter.formatToParts(now);
  const currentYear = parseInt(parts.find((p) => p.type === 'year').value, 10);
  const currentMonth = parseInt(parts.find((p) => p.type === 'month').value, 10);

  const year = requestedYear ? parseInt(requestedYear, 10) : currentYear;
  const month = requestedMonth ? parseInt(requestedMonth, 10) : currentMonth;

  const { startDate, endDate } = getMonthRange(year, month);

  // Mês anterior para cálculo comparativo
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const { startDate: prevStartDate, endDate: prevEndDate } = getMonthRange(prevYear, prevMonth);

  // 2. Consulta de Agendamentos e Faturamento do Mês
  const apptsRes = await tenantQuery(
    tenantId,
    `SELECT 
        COUNT(*) as total_appointments,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_count,
        COUNT(CASE WHEN status = 'no_show' THEN 1 END) as no_show_count,
        COUNT(CASE WHEN status IN ('scheduled', 'in-progress') THEN 1 END) as pending_count,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN total_price ELSE 0 END), 0) as total_revenue,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN discount_applied ELSE 0 END), 0) as total_discounts,
        COUNT(DISTINCT client_id) as total_unique_clients
     FROM public.cap_appointments
     WHERE tenant_id = $1 
       AND start_time >= $2 
       AND start_time <= $3`,
    [tenantId, startDate, endDate]
  );
  const mData = apptsRes.rows[0] || {};
  const completedCount = parseInt(mData.completed_count || 0, 10);
  const totalRevenue = parseFloat(mData.total_revenue || 0);
  const noShowCount = parseInt(mData.no_show_count || 0, 10);
  const cancelledCount = parseInt(mData.cancelled_count || 0, 10);
  const totalUniqueClients = parseInt(mData.total_unique_clients || 0, 10);

  // 3. Faturamento do Mês Anterior (Comparativo)
  const prevApptsRes = await tenantQuery(
    tenantId,
    `SELECT 
        COALESCE(SUM(CASE WHEN status = 'completed' THEN total_price ELSE 0 END), 0) as prev_revenue,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as prev_completed
     FROM public.cap_appointments
     WHERE tenant_id = $1 
       AND start_time >= $2 
       AND start_time <= $3`,
    [tenantId, prevStartDate, prevEndDate]
  );
  const prevRevenue = parseFloat(prevApptsRes.rows[0]?.prev_revenue || 0);
  let growthPercent = 0;
  if (prevRevenue > 0) {
    growthPercent = Math.round(((totalRevenue - prevRevenue) / prevRevenue) * 100);
  } else if (totalRevenue > 0) {
    growthPercent = 100;
  }

  // 4. Economia de Tempo da Equipe / Recepção
  // Cada agendamento online economiza aproximadamente 10 minutos de trocas manuais de mensagem no WhatsApp
  const onlineBookingsCount = completedCount + parseInt(mData.pending_count || 0, 10);
  const minutesSaved = onlineBookingsCount * 10;
  const hoursSaved = Math.round((minutesSaved / 60) * 10) / 10;
  const equivalentWorkDays = Math.round((hoursSaved / 8) * 10) / 10; // Jornada de 8h

  // 5. Faltas Evitadas e Faturamento Protegido
  // Agendamentos concluídos ou pendentes que tiveram lembretes automáticos e receita preservada
  const protectedRevenue = totalRevenue;
  const totalAppointmentsHandled = completedCount + noShowCount;
  const noShowRate = totalAppointmentsHandled > 0 
    ? Math.round((noShowCount / totalAppointmentsHandled) * 100) 
    : 0;

  // 6. Retenção de Clientes (Recorrência)
  // Clientes atendidos no mês que já haviam feito agendamento antes do início do mês
  const retentionRes = await tenantQuery(
    tenantId,
    `SELECT COUNT(DISTINCT a.client_id) as returning_count
     FROM public.cap_appointments a
     WHERE a.tenant_id = $1
       AND a.start_time >= $2 AND a.start_time <= $3
       AND a.status = 'completed'
       AND EXISTS (
         SELECT 1 FROM public.cap_appointments prev
         WHERE prev.tenant_id = a.tenant_id
           AND prev.client_id = a.client_id
           AND prev.start_time < $2
           AND prev.status = 'completed'
       )`,
    [tenantId, startDate, endDate]
  );
  const returningClients = parseInt(retentionRes.rows[0]?.returning_count || 0, 10);
  const newClients = Math.max(0, totalUniqueClients - returningClients);
  const retentionRate = totalUniqueClients > 0
    ? Math.round((returningClients / totalUniqueClients) * 100)
    : 0;

  // 7. Impacto do Clube e Benefícios (Cashback e Carteira)
  const walletRes = await tenantQuery(
    tenantId,
    `SELECT 
        COALESCE(SUM(CASE WHEN type = 'credit' THEN amount ELSE 0 END), 0) as cashback_distributed,
        COALESCE(SUM(CASE WHEN type = 'debit' THEN amount ELSE 0 END), 0) as cashback_redeemed
     FROM public.cap_wallet_transactions
     WHERE tenant_id = $1 
       AND created_at >= $2 AND created_at <= $3`,
    [tenantId, startDate, endDate]
  );
  const cashbackDistributed = parseFloat(walletRes.rows[0]?.cashback_distributed || 0);
  const cashbackRedeemed = parseFloat(walletRes.rows[0]?.cashback_redeemed || 0);

  // Membros ativos no clube de fidelidade
  const clubRes = await tenantQuery(
    tenantId,
    `SELECT COUNT(*) as active_members
     FROM public.cap_client_memberships
     WHERE tenant_id = $1 AND status = 'active'`,
    [tenantId]
  );
  const activeClubMembers = parseInt(clubRes.rows[0]?.active_members || 0, 10);

  // 8. Top 5 Serviços Mais Procurados
  const topServicesRes = await tenantQuery(
    tenantId,
    `SELECT 
        s.name,
        COUNT(a.id) as count,
        COALESCE(SUM(a.total_price), 0) as revenue
     FROM public.cap_appointments a
     JOIN public.cap_services s ON a.service_id = s.id
     WHERE a.tenant_id = $1
       AND a.start_time >= $2 AND a.start_time <= $3
       AND a.status = 'completed'
     GROUP BY s.name
     ORDER BY count DESC, revenue DESC
     LIMIT 5`,
    [tenantId, startDate, endDate]
  );
  const topServices = topServicesRes.rows.map((r) => ({
    name: r.name,
    count: parseInt(r.count, 10),
    revenue: parseFloat(r.revenue)
  }));

  // 9. Profissional Destaque do Mês
  const topStaffRes = await tenantQuery(
    tenantId,
    `SELECT 
        st.id,
        st.name,
        COUNT(a.id) as completed_count,
        COALESCE(SUM(a.total_price), 0) as total_revenue
     FROM public.cap_appointments a
     JOIN public.cap_staff st ON a.staff_id = st.id
     WHERE a.tenant_id = $1
       AND a.start_time >= $2 AND a.start_time <= $3
       AND a.status = 'completed'
     GROUP BY st.id, st.name
     ORDER BY completed_count DESC, total_revenue DESC
     LIMIT 1`,
    [tenantId, startDate, endDate]
  );
  const topStaff = topStaffRes.rows[0]
    ? {
        name: topStaffRes.rows[0].name,
        completed_count: parseInt(topStaffRes.rows[0].completed_count, 10),
        total_revenue: parseFloat(topStaffRes.rows[0].total_revenue)
      }
    : null;

  // 10. Dados do Salão (Nome, Logo)
  const tenantRes = await tenantQuery(
    tenantId,
    'SELECT name, slug, logo_url, social_whatsapp FROM public.cap_tenants WHERE id = $1',
    [tenantId]
  );
  const tenantInfo = tenantRes.rows[0] || {};

  // 11. Lista dos Últimos 6 Meses para Navegação Histórica
  const availableMonths = [];
  for (let i = 0; i < 6; i++) {
    let m = currentMonth - i;
    let y = currentYear;
    while (m <= 0) {
      m += 12;
      y -= 1;
    }
    availableMonths.push({
      year: y,
      month: m,
      label: `${MONTH_NAMES[m - 1]} de ${y}`,
      shortLabel: `${MONTH_NAMES[m - 1].slice(0, 3)}/${String(y).slice(2)}`,
      is_current: y === currentYear && m === currentMonth
    });
  }

  // 12. Resumo Executivo Dinâmico
  const monthName = MONTH_NAMES[month - 1];
  const averageTicket = completedCount > 0 ? totalRevenue / completedCount : 0;
  
  let executiveSummary = '';
  if (completedCount === 0 && onlineBookingsCount === 0) {
    executiveSummary = `Em ${monthName} de ${year}, o OperaBeauty esteve ativo e pronto para acelerar os agendamentos do seu espaço.`;
  } else {
    executiveSummary = `Em ${monthName} de ${year}, o OperaBeauty economizou aproximadamente ${hoursSaved}h de atendimento da sua equipe, protegeu R$ ${totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} em receita com lembretes automáticos e registrou ${retentionRate}% de taxa de retorno das suas clientes.`;
  }

  return {
    period: {
      year,
      month,
      month_name: monthName,
      label: `${monthName} de ${year}`,
      start_date: startDate,
      end_date: endDate,
      is_current_month: year === currentYear && month === currentMonth
    },
    tenant: {
      name: tenantInfo.name || 'Seu Salão',
      slug: tenantInfo.slug,
      logo_url: tenantInfo.logo_url,
      phone: tenantInfo.social_whatsapp
    },
    executive_summary: executiveSummary,
    metrics: {
      time_saved: {
        hours: hoursSaved,
        minutes: minutesSaved,
        equivalent_work_days: equivalentWorkDays,
        online_bookings: onlineBookingsCount
      },
      revenue: {
        total_revenue: totalRevenue,
        previous_month_revenue: prevRevenue,
        growth_percent: growthPercent,
        average_ticket: averageTicket,
        completed_appointments: completedCount
      },
      no_shows_prevented: {
        protected_revenue: protectedRevenue,
        no_show_count: noShowCount,
        no_show_rate: noShowRate,
        cancelled_count: cancelledCount
      },
      client_retention: {
        total_unique_clients: totalUniqueClients,
        returning_clients: returningClients,
        new_clients: newClients,
        retention_rate: retentionRate
      },
      loyalty_impact: {
        cashback_distributed: cashbackDistributed,
        cashback_redeemed: cashbackRedeemed,
        active_club_members: activeClubMembers
      }
    },
    impact: {
      time_saved: {
        hours_saved: hoursSaved,
        online_appointments_count: onlineBookingsCount
      },
      no_shows_prevented: {
        estimated_prevented_no_shows: Math.round(completedCount * 0.2),
        prevented_loss_revenue: protectedRevenue
      },
      financials: {
        total_revenue: totalRevenue,
        average_ticket: averageTicket,
        growth_rate_vs_last_month: growthPercent,
        completed_count: completedCount
      },
      clients: {
        total_unique_clients: totalUniqueClients,
        new_clients_count: newClients,
        returning_clients_count: returningClients,
        retention_rate: retentionRate
      },
      club: {
        active_subscriptions_count: activeClubMembers,
        recurring_monthly_revenue: 0
      },
      cashback: {
        total_cashback_generated: cashbackDistributed,
        total_cashback_redeemed: cashbackRedeemed,
        redemption_rate: cashbackDistributed > 0 ? Math.round((cashbackRedeemed / cashbackDistributed) * 100) : 0
      },
      top_services: topServices,
      star_staff: topStaff
    },
    top_services: topServices,
    top_staff: topStaff,
    available_months: availableMonths
  };
};

/**
 * 2. Envio do Resumo do Relatório de Impacto por WhatsApp para o Gestor
 */
export const sendImpactReportWhatsApp = async (tenantId, year, month, targetPhone = null) => {
  const report = await getMonthlyImpactReport(tenantId, year, month);
  const tenantRes = await tenantQuery(
    tenantId,
    'SELECT name, social_whatsapp FROM public.cap_tenants WHERE id = $1',
    [tenantId]
  );
  const tenant = tenantRes.rows[0];
  const destinationPhone = targetPhone || tenant?.social_whatsapp;

  if (!destinationPhone) {
    const error = new Error('Nenhum número de WhatsApp cadastrado para envio do relatório.');
    error.statusCode = 400;
    throw error;
  }

  const cleanPhone = destinationPhone.replace(/\D/g, '');
  const finalPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;

  const message = [
    `✨ *Relatório Mensal: Impacto OperaBeauty* ✨`,
    `Salão: *${tenant?.name || report.tenant.name}*`,
    `Período: *${report.period.label}*\n`,
    `⏱️ *Economia de Tempo:* ~${report.metrics.time_saved.hours}h economizadas da sua recepção`,
    `💰 *Receita Protegida:* R$ ${report.metrics.revenue.total_revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
    `📅 *Atendimentos Concluídos:* ${report.metrics.revenue.completed_appointments}`,
    `🔄 *Taxa de Retorno:* ${report.metrics.client_retention.retention_rate}% das clientes retornaram`,
    `👥 *Clientes Atendidas:* ${report.metrics.client_retention.total_unique_clients} (${report.metrics.client_retention.returning_clients} recorrentes)`,
    `💎 *Membros no Clube:* ${report.metrics.loyalty_impact.active_club_members} assinantes ativos\n`,
    `💡 _"Sua recepção focada no atendimento presencial enquanto o OperaBeauty cuida da sua agenda!"_\n`,
    `Acesse o painel para ver o relatório completo e exportar em PDF.`
  ].join('\n');

  try {
    await whatsappService.sendMessage(tenantId, finalPhone, message);
    return { success: true, message: 'Relatório de impacto enviado por WhatsApp com sucesso.' };
  } catch (err) {
    console.error('[ImpactReport] Falha ao despachar WhatsApp:', err.message);
    const error = new Error(`Não foi possível enviar via WhatsApp: ${err.message}`);
    error.statusCode = 502;
    throw error;
  }
};

/**
 * Funções Legadas de BI mantidas com campos de fuso e start_time corrigidos
 */
export const getRetentionReport = async (tenantId) => {
  const currentMonthClients = await tenantQuery(
    tenantId,
    `SELECT DISTINCT client_id 
     FROM public.cap_appointments 
     WHERE tenant_id = $1 
       AND start_time >= CURRENT_DATE - INTERVAL '30 days'
       AND status IN ('completed', 'confirmed')`,
    [tenantId]
  );

  const activeClients = currentMonthClients.rows.map((row) => row.client_id);
  const totalActive = activeClients.length;

  if (totalActive === 0) {
    return { retained: 0, new: 0, total: 0, retainedPercentage: 0 };
  }

  const retainedQuery = await tenantQuery(
    tenantId,
    `SELECT COUNT(DISTINCT client_id) as retained_count
     FROM public.cap_appointments
     WHERE tenant_id = $1
       AND client_id = ANY($2::uuid[])
       AND start_time < CURRENT_DATE - INTERVAL '30 days'
       AND status IN ('completed', 'confirmed')`,
    [tenantId, activeClients]
  );

  const retainedCount = parseInt(retainedQuery.rows[0].retained_count, 10);
  const newCount = totalActive - retainedCount;
  const retainedPercentage = Math.round((retainedCount / totalActive) * 100);

  return {
    retained: retainedCount,
    new: newCount,
    total: totalActive,
    retainedPercentage
  };
};

export const getStaffRankingReport = async (tenantId) => {
  const result = await tenantQuery(
    tenantId,
    `SELECT 
        s.id,
        s.id as staff_id,
        s.name,
        s.name as staff_name,
        COALESCE(SUM(CASE WHEN a.status = 'completed' THEN a.total_price ELSE 0 END), 0) as revenue,
        COALESCE(SUM(CASE WHEN a.status = 'completed' THEN a.total_price ELSE 0 END), 0) as total_revenue,
        COUNT(CASE WHEN a.status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN a.status = 'completed' THEN 1 END) as completed_appointments,
        COUNT(CASE WHEN a.status = 'cancelled' THEN 1 END) as cancelled_appointments,
        CASE 
          WHEN COUNT(a.id) > 0 THEN ROUND((COUNT(CASE WHEN a.status = 'cancelled' THEN 1 END)::numeric / COUNT(a.id)) * 100) 
          ELSE 0 
        END as cancellation_rate
     FROM public.cap_staff s
     LEFT JOIN public.cap_appointments a ON s.id = a.staff_id 
        AND a.tenant_id = $1 
        AND a.start_time >= CURRENT_DATE - INTERVAL '30 days'
     WHERE s.tenant_id = $1 AND s.is_active = true
     GROUP BY s.id, s.name
     ORDER BY revenue DESC`,
    [tenantId]
  );

  return result.rows;
};

export const getServicesRankingReport = async (tenantId) => {
  const result = await tenantQuery(
    tenantId,
    `SELECT 
        srv.id as service_id,
        srv.name as service_name,
        COUNT(a.id) as times_booked,
        COALESCE(SUM(a.total_price), 0) as total_revenue
     FROM public.cap_services srv
     LEFT JOIN public.cap_appointments a ON srv.id = a.service_id 
        AND a.tenant_id = $1 
        AND a.status = 'completed'
        AND a.start_time >= CURRENT_DATE - INTERVAL '30 days'
     WHERE srv.tenant_id = $1 AND srv.is_active = true
     GROUP BY srv.id, srv.name
     ORDER BY times_booked DESC, total_revenue DESC
     LIMIT 10`,
    [tenantId]
  );

  return result.rows;
};

export const getHeatmapReport = async (tenantId) => {
  const result = await tenantQuery(
    tenantId,
    `SELECT 
        EXTRACT(ISODOW FROM (a.start_time AT TIME ZONE 'America/Sao_Paulo'))::int as day,
        EXTRACT(HOUR FROM (a.start_time AT TIME ZONE 'America/Sao_Paulo'))::int as hour,
        COUNT(a.id)::int as count
     FROM public.cap_appointments a
     WHERE a.tenant_id = $1
       AND a.start_time >= CURRENT_DATE - INTERVAL '30 days'
       AND a.status IN ('scheduled', 'confirmed', 'completed')
     GROUP BY day, hour
     ORDER BY day, hour`,
    [tenantId]
  );

  return result.rows;
};

