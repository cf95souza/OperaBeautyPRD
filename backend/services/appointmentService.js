import pool from '../config/db.js';
import { applyMembershipSession, refundMembershipSession } from './membershipService.js';
import { consumePackageSession, refundPackageSession } from './packageService.js';
import { processCashbackEarnings, processCashbackRedemption, processCashbackRefund } from './walletService.js';
import { validateGiftCardCode, redeemGiftCard } from './giftcardService.js';
import { notifyStaff, scheduleAppointmentReminders, cancelAppointmentReminders } from './notificationService.js';
import { completeReferralOnAppointmentCompleted } from './referralService.js';

export const listAppointments = async ({ role, id, userTenantId, targetTenantId, start_date, end_date, staff_id, client_id, limit, offset }) => {
  let queryText = '';
  let queryParams = [];

  if (role === 'client') {
    queryText = `
      SELECT a.id, a.service_id, a.staff_id, a.start_time, a.end_time, a.status, a.total_price, a.discount_applied, a.gift_card_redeemed, a.payment_method,
             s.name as service_name, s.duration_minutes,
             st.name as staff_name,
             t.name as tenant_name, t.slug as tenant_slug,
             COALESCE((
               SELECT json_agg(json_build_object(
                 'service_id', cas.service_id,
                 'name', cs.name,
                 'price', cas.price,
                 'duration_minutes', cas.duration_minutes,
                 'variation_id', cas.variation_id,
                 'variation_name', cas.variation_name,
                 'selected_extras', cas.selected_extras
               ) ORDER BY cas.order_index ASC)
               FROM public.cap_appointment_services cas
               JOIN public.cap_services cs ON cas.service_id = cs.id
               WHERE cas.appointment_id = a.id
             ), '[]'::json) as services
      FROM public.cap_appointments a
      JOIN public.cap_services s ON a.service_id = s.id
      JOIN public.cap_staff st ON a.staff_id = st.id
      JOIN public.cap_tenants t ON a.tenant_id = t.id
      WHERE a.client_id = $1 AND a.tenant_id = $2
      ORDER BY a.start_time DESC LIMIT $3 OFFSET $4
    `;
    queryParams = [id, targetTenantId, limit, offset];
  } else {
    queryText = `
      SELECT a.id, a.start_time, a.end_time, a.status, a.total_price, a.discount_applied, a.staff_commission_value, a.commission_status, a.commission_paid_at, a.gift_card_redeemed, a.payment_method,
             s.name as service_name, s.duration_minutes, s.id as service_id, s.maintenance_days,
             st.name as staff_name, st.id as staff_id,
             c.name as client_name, c.phone as client_phone, c.id as client_id,
             COALESCE((
               SELECT json_agg(json_build_object(
                 'service_id', cas.service_id,
                 'name', cs.name,
                 'price', cas.price,
                 'duration_minutes', cas.duration_minutes,
                 'variation_id', cas.variation_id,
                 'variation_name', cas.variation_name,
                 'selected_extras', cas.selected_extras
               ) ORDER BY cas.order_index ASC)
               FROM public.cap_appointment_services cas
               JOIN public.cap_services cs ON cas.service_id = cs.id
               WHERE cas.appointment_id = a.id
             ), '[]'::json) as services
      FROM public.cap_appointments a
      JOIN public.cap_services s ON a.service_id = s.id
      JOIN public.cap_staff st ON a.staff_id = st.id
      JOIN public.cap_clients c ON a.client_id = c.id
      WHERE a.tenant_id = $1
    `;
    queryParams = [targetTenantId];
    let paramIndex = 2;

    if (start_date && end_date) {
      queryText += ` AND a.start_time >= $${paramIndex} AND a.start_time <= $${paramIndex + 1}`;
      queryParams.push(new Date(start_date));
      queryParams.push(new Date(end_date));
      paramIndex += 2;
    }

    if (staff_id) {
      queryText += ` AND a.staff_id = $${paramIndex}`;
      queryParams.push(staff_id);
      paramIndex += 1;
    }

    if (client_id) {
      queryText += ` AND a.client_id = $${paramIndex}`;
      queryParams.push(client_id);
      paramIndex += 1;
    }

    queryParams.push(limit, offset);
    queryText += ` ORDER BY a.start_time ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
  }

  const result = await pool.query(queryText, queryParams);
  return result.rows;
};

// Helper: Obter profissionais ativos elegíveis para os serviços solicitados (D5 P1)
export const getEligibleStaff = async ({ tenantId, serviceIds = [] }) => {
  const staffRes = await pool.query(
    `SELECT s.id, s.name, s.role, s.commission_rate,
            COALESCE(json_agg(ss.service_id) FILTER (WHERE ss.service_id IS NOT NULL), '[]') AS service_ids
     FROM public.cap_staff s
     LEFT JOIN public.cap_staff_services ss ON s.id = ss.staff_id
     WHERE s.tenant_id = $1 AND s.is_active = true
     GROUP BY s.id
     ORDER BY s.name ASC`,
    [tenantId]
  );

  if (!serviceIds || serviceIds.length === 0) {
    return staffRes.rows;
  }

  return staffRes.rows.filter(st => {
    const assigned = Array.isArray(st.service_ids) ? st.service_ids : [];
    if (assigned.length === 0) return true;
    return serviceIds.every(sId => assigned.includes(sId));
  });
};

export const getOccupiedSlots = async ({ tenant_id, date, staff_id, service_id, service_ids }) => {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  // Se um profissional específico foi indicado (e não é 'any')
  if (staff_id && staff_id !== 'any') {
    const queryText = `
      SELECT start_time, end_time, staff_id 
      FROM public.cap_appointments 
      WHERE tenant_id = $1 
        AND staff_id = $4
        AND start_time >= $2 
        AND start_time <= $3 
        AND status != 'cancelled'
    `;
    const result = await pool.query(queryText, [tenant_id, startOfDay, endOfDay, staff_id]);
    return result.rows;
  }

  // Caso "Qualquer profissional" (ou staff_id não informado):
  // 1. Identificar quais profissionais atendem os serviços solicitados
  let resolvedServiceIds = [];
  if (service_ids) {
    resolvedServiceIds = Array.isArray(service_ids) ? service_ids : [service_ids];
  } else if (service_id) {
    resolvedServiceIds = [service_id];
  }

  const eligibleStaff = await getEligibleStaff({ tenantId: tenant_id, serviceIds: resolvedServiceIds });

  if (eligibleStaff.length === 0) {
    return [];
  }

  const staffIds = eligibleStaff.map(s => s.id);

  // Buscar todos os agendamentos dos profissionais elegíveis na data
  const apptsRes = await pool.query(
    `SELECT start_time, end_time, staff_id 
     FROM public.cap_appointments 
     WHERE tenant_id = $1 
       AND staff_id = ANY($2::uuid[])
       AND start_time >= $3 
       AND start_time <= $4 
       AND status != 'cancelled'`,
    [tenant_id, staffIds, startOfDay, endOfDay]
  );

  // Agrupar agendamentos por horário de início
  const slotBusyStaffMap = new Map();

  apptsRes.rows.forEach(app => {
    const dt = new Date(app.start_time);
    const timeKey = dt.toISOString();
    if (!slotBusyStaffMap.has(timeKey)) {
      slotBusyStaffMap.set(timeKey, {
        start_time: app.start_time,
        end_time: app.end_time,
        busyStaffSet: new Set()
      });
    }
    slotBusyStaffMap.get(timeKey).busyStaffSet.add(app.staff_id);
  });

  // Um slot só é considerado ocupado para "Qualquer profissional" se TODOS os profissionais elegíveis estiverem ocupados
  const fullyOccupiedSlots = [];
  for (const [, slotData] of slotBusyStaffMap.entries()) {
    if (slotData.busyStaffSet.size >= eligibleStaff.length) {
      fullyOccupiedSlots.push({
        start_time: slotData.start_time,
        end_time: slotData.end_time,
        staff_id: null
      });
    }
  }

  return fullyOccupiedSlots;
};

// Obter Próximo Horário Livre (D5 P1)
export const getNextAvailableSlot = async ({ tenant_id, date, staff_id, service_id, services }) => {
  let serviceItems = [];
  if (services && Array.isArray(services) && services.length > 0) {
    serviceItems = services
      .filter(s => s !== null && s !== undefined && s !== 'null' && s !== 'undefined')
      .map(s => typeof s === 'string' ? { service_id: s } : s)
      .filter(s => s && s.service_id);
  } else if (service_id) {
    serviceItems = [{ service_id }];
  }

  let totalDuration = 30;
  let serviceIds = [];
  if (serviceItems.length > 0) {
    serviceIds = serviceItems.map(s => s.service_id).filter(Boolean);
    const dbServices = await pool.query(
      `SELECT id, duration_minutes FROM public.cap_services WHERE id = ANY($1::uuid[]) AND tenant_id = $2`,
      [serviceIds, tenant_id]
    );
    if (dbServices.rows.length > 0) {
      totalDuration = dbServices.rows.reduce((sum, s) => sum + (parseInt(s.duration_minutes, 10) || 30), 0);
    }
  }

  let eligibleStaff = [];
  if (staff_id && staff_id !== 'any') {
    const singleRes = await pool.query(
      `SELECT id, name FROM public.cap_staff WHERE id = $1 AND tenant_id = $2 AND is_active = true`,
      [staff_id, tenant_id]
    );
    eligibleStaff = singleRes.rows;
  } else {
    eligibleStaff = await getEligibleStaff({ tenantId: tenant_id, serviceIds });
  }

  if (eligibleStaff.length === 0) {
    return null;
  }

  const [bhRes, exRes] = await Promise.all([
    pool.query(`SELECT day_of_week, open_time, close_time, is_closed FROM public.cap_business_hours WHERE tenant_id = $1`, [tenant_id]),
    pool.query(`SELECT exception_date, open_time, close_time, is_closed FROM public.cap_date_exceptions WHERE tenant_id = $1`, [tenant_id])
  ]);

  const businessHours = bhRes.rows;
  const exceptions = exRes.rows;

  const now = new Date();
  const nowSpStr = now.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
  const nowHours = parseInt(now.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', hour12: false }), 10);
  const nowMinutes = parseInt(now.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', minute: '2-digit', hour12: false }), 10);
  const nowTotalMinutes = nowHours * 60 + nowMinutes;

  const startDateStr = date || nowSpStr;

  for (let d = 0; d < 14; d++) {
    const checkDate = new Date(`${startDateStr}T12:00:00Z`);
    checkDate.setUTCDate(checkDate.getUTCDate() + d);
    const dayStr = checkDate.toISOString().split('T')[0];
    const dayOfWeek = checkDate.getUTCDay();

    const exception = exceptions.find(e => e.exception_date && String(e.exception_date).startsWith(dayStr));
    let isClosed = false;
    let openTimeStr = '08:00';
    let closeTimeStr = '19:00';

    if (exception) {
      isClosed = Boolean(exception.is_closed);
      if (exception.open_time && exception.close_time) {
        openTimeStr = exception.open_time;
        closeTimeStr = exception.close_time;
      }
    } else {
      const bh = businessHours.find(b => b.day_of_week === dayOfWeek);
      if (bh) {
        isClosed = Boolean(bh.is_closed);
        if (bh.open_time && bh.close_time) {
          openTimeStr = bh.open_time;
          closeTimeStr = bh.close_time;
        }
      }
    }

    if (isClosed) continue;

    const [openH, openM] = openTimeStr.split(':').map(Number);
    const [closeH, closeM] = closeTimeStr.split(':').map(Number);
    const openTotalMin = openH * 60 + openM;
    const closeTotalMin = closeH * 60 + closeM;

    const startOfDay = new Date(`${dayStr}T00:00:00`);
    const endOfDay = new Date(`${dayStr}T23:59:59.999`);
    const staffIds = eligibleStaff.map(s => s.id);

    const apptsRes = await pool.query(
      `SELECT staff_id, start_time, end_time 
       FROM public.cap_appointments 
       WHERE tenant_id = $1 
         AND staff_id = ANY($2::uuid[])
         AND start_time >= $3 
         AND start_time <= $4 
         AND status != 'cancelled'`,
      [tenant_id, staffIds, startOfDay, endOfDay]
    );

    const appts = apptsRes.rows;
    const isToday = dayStr === nowSpStr;

    for (let slotMin = openTotalMin; slotMin + totalDuration <= closeTotalMin; slotMin += 30) {
      if (isToday && slotMin <= nowTotalMinutes + 15) {
        continue;
      }

      const slotH = Math.floor(slotMin / 60);
      const slotM = slotMin % 60;
      const slotTimeStr = `${String(slotH).padStart(2, '0')}:${String(slotM).padStart(2, '0')}`;
      
      const slotStart = new Date(`${dayStr}T${slotTimeStr}:00`);
      const slotEnd = new Date(slotStart.getTime() + totalDuration * 60 * 1000);

      const freeStaff = eligibleStaff.find(st => {
        const hasConflict = appts.some(app => 
          app.staff_id === st.id && 
          new Date(app.start_time) < slotEnd && 
          new Date(app.end_time) > slotStart
        );
        return !hasConflict;
      });

      if (freeStaff) {
        let label = '';
        if (isToday) {
          label = `Hoje às ${slotTimeStr}`;
        } else {
          const tomorrowCheck = new Date(now);
          tomorrowCheck.setDate(tomorrowCheck.getDate() + 1);
          const tomorrowSpStr = tomorrowCheck.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
          if (dayStr === tomorrowSpStr) {
            label = `Amanhã às ${slotTimeStr}`;
          } else {
            const diasSem = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
            const [, m, dayNum] = dayStr.split('-');
            label = `${diasSem[dayOfWeek]}, ${dayNum}/${m} às ${slotTimeStr}`;
          }
        }

        return {
          date: dayStr,
          time: slotTimeStr,
          start_time: slotStart.toISOString(),
          end_time: slotEnd.toISOString(),
          staff_id: freeStaff.id,
          staff_name: freeStaff.name,
          duration_minutes: totalDuration,
          label
        };
      }
    }
  }

  return null;
};

export const getAppointmentById = async ({ id, tenant_id, role, userId }) => {
  const queryText = `
    SELECT a.id, a.start_time, a.end_time, a.status, a.total_price, a.discount_applied, a.staff_commission_value, a.commission_status, a.commission_paid_at, a.gift_card_redeemed,
           s.name as service_name, s.duration_minutes, s.id as service_id,
           st.name as staff_name, st.id as staff_id,
           c.name as client_name, c.phone as client_phone, c.id as client_id
    FROM public.cap_appointments a
    JOIN public.cap_services s ON a.service_id = s.id
    JOIN public.cap_staff st ON a.staff_id = st.id
    JOIN public.cap_clients c ON a.client_id = c.id
    WHERE a.id = $1 AND a.tenant_id = $2
  `;

  const result = await pool.query(queryText, [id, tenant_id]);

  if (result.rows.length === 0) {
    const error = new Error('Agendamento não encontrado.');
    error.statusCode = 404;
    throw error;
  }

  const appointment = result.rows[0];

  if (role === 'client' && appointment.client_id !== userId) {
    const error = new Error('Acesso negado.');
    error.statusCode = 403;
    throw error;
  }

  if (role === 'professional' && appointment.staff_id !== userId) {
    const error = new Error('Acesso negado. Você só pode visualizar seus próprios agendamentos.');
    error.statusCode = 403;
    throw error;
  }

  // Buscar serviços detalhados da visita (Item D4 P1 & D12 P2)
  const servicesRes = await pool.query(
    `SELECT cas.id, cas.service_id, s.name, cas.price, cas.duration_minutes, cas.commission_amount, cas.order_index,
            cas.variation_id, cas.variation_name, cas.selected_extras
     FROM public.cap_appointment_services cas
     JOIN public.cap_services s ON cas.service_id = s.id
     WHERE cas.appointment_id = $1 AND cas.tenant_id = $2
     ORDER BY cas.order_index ASC`,
    [id, tenant_id]
  );

  appointment.services = servicesRes.rows;
  if (servicesRes.rows.length > 0) {
    appointment.service_name = servicesRes.rows.map(s => s.name).join(' + ');
  }

  return appointment;
};

export const createAppointment = async ({ finalClientId, staff_id, service_id, services, start_time, total_price, tenantId, client_membership_id, client_package_id, use_package, cashback_redeemed, gift_card_code }) => {
  const clientConnection = await pool.connect();
  
  try {
    await clientConnection.query('BEGIN');

    // 0.0 Verificar se o salão está bloqueado por inadimplência SaaS (D18 P1)
    const tenantBillingCheck = await clientConnection.query(
      'SELECT status, suspension_reason, billing_locked_at FROM public.cap_tenants WHERE id = $1',
      [tenantId]
    );
    if (tenantBillingCheck.rows.length > 0) {
      const tData = tenantBillingCheck.rows[0];
      if (tData.billing_locked_at || tData.status === 'overdue' || tData.status === 'suspended') {
        const saasErr = new Error(`Agendamentos online temporariamente indisponíveis para este salão (${tData.suspension_reason || 'Regularização de assinatura pendente'}). Por favor, entre em contato diretamente com a nossa recepção.`);
        saasErr.statusCode = 402;
        saasErr.code = 'TENANT_OVERDUE';
        throw saasErr;
      }
    }

    // 0. Verificar se o cliente está bloqueado para agendamentos online (D8 P1)
    const clientCheck = await clientConnection.query(
      'SELECT name, is_blocked, blocked_reason, no_show_count FROM public.cap_clients WHERE id = $1 AND tenant_id = $2',
      [finalClientId, tenantId]
    );
    if (clientCheck.rows.length > 0) {
      const cData = clientCheck.rows[0];
      if (cData.is_blocked) {
        const blockErr = new Error(`Seu cadastro está temporariamente bloqueado para agendamentos online (${cData.blocked_reason || 'Consulte o salão'}). Por favor, entre em contato diretamente com a nossa recepção.`);
        blockErr.statusCode = 403;
        blockErr.code = 'CLIENT_BLOCKED';
        throw blockErr;
      }
    }

    // 1. Normalizar e resolver lista de serviços da visita (D4: Suporte a 1 ou N serviços)
    let serviceItems = [];
    if (services && Array.isArray(services) && services.length > 0) {
      serviceItems = services.map(s => typeof s === 'string' ? { service_id: s } : s);
    } else if (service_id) {
      serviceItems = [{ service_id }];
    }

    if (serviceItems.length === 0) {
      const error = new Error('É obrigatório informar ao menos um serviço.');
      error.statusCode = 400;
      throw error;
    }

    const serviceIds = serviceItems.map(s => s.service_id);
    const dbServicesRes = await clientConnection.query(
      'SELECT id, name, price, duration_minutes, reduces_stock FROM public.cap_services WHERE id = ANY($1::uuid[]) AND tenant_id = $2',
      [serviceIds, tenantId]
    );

    const dbServicesMap = new Map();
    dbServicesRes.rows.forEach(s => dbServicesMap.set(s.id, s));

    const resolvedServices = [];
    let calculatedDuration = 0;
    let calculatedTotalPrice = 0;

    for (let i = 0; i < serviceItems.length; i++) {
      const item = serviceItems[i];
      const dbSvc = dbServicesMap.get(item.service_id);
      if (!dbSvc) {
        const error = new Error(`Serviço ${item.service_id} não encontrado.`);
        error.statusCode = 404;
        throw error;
      }

      // Validação de variação se informada (Item D12 P2)
      let selectedVariation = null;
      if (item.variation_id) {
        const varRes = await clientConnection.query(
          'SELECT id, name, price, duration_minutes FROM public.cap_service_variations WHERE id = $1 AND service_id = $2 AND tenant_id = $3',
          [item.variation_id, item.service_id, tenantId]
        );
        if (varRes.rows.length > 0) {
          selectedVariation = varRes.rows[0];
        }
      }

      // Validação de extras/adicionais se informados (Item D12 P2)
      let resolvedExtras = [];
      if (item.extras && Array.isArray(item.extras) && item.extras.length > 0) {
        const extraIds = item.extras
          .map(e => typeof e === 'string' ? e : e?.id)
          .filter(id => Boolean(id) && typeof id === 'string' && id.includes('-'));

        if (extraIds.length > 0) {
          const extrasRes = await clientConnection.query(
            'SELECT id, name, price, duration_minutes FROM public.cap_service_extras WHERE id = ANY($1::uuid[]) AND service_id = $2 AND tenant_id = $3',
            [extraIds, item.service_id, tenantId]
          );
          resolvedExtras = extrasRes.rows.map(e => ({
            id: e.id,
            name: e.name,
            price: parseFloat(e.price),
            duration_minutes: parseInt(e.duration_minutes || 0, 10)
          }));
        } else {
          resolvedExtras = item.extras.map(e => ({
            id: e.id || null,
            name: e.name || 'Adicional',
            price: parseFloat(e.price || 0),
            duration_minutes: parseInt(e.duration_minutes || 0, 10)
          }));
        }
      }

      // Preço e Duração do item (Variação base + Soma dos extras)
      const basePrice = selectedVariation ? parseFloat(selectedVariation.price) : (item.price !== undefined ? parseFloat(item.price) : parseFloat(dbSvc.price));
      const baseDuration = selectedVariation ? parseInt(selectedVariation.duration_minutes, 10) : (item.duration_minutes !== undefined ? parseInt(item.duration_minutes, 10) : parseInt(dbSvc.duration_minutes, 10));

      const extrasPriceSum = resolvedExtras.reduce((sum, ext) => sum + parseFloat(ext.price || 0), 0);
      const extrasDurationSum = resolvedExtras.reduce((sum, ext) => sum + parseInt(ext.duration_minutes || 0, 10), 0);

      const finalItemPrice = basePrice + extrasPriceSum;
      const finalItemDuration = baseDuration + extrasDurationSum;

      calculatedDuration += finalItemDuration;
      calculatedTotalPrice += finalItemPrice;

      resolvedServices.push({
        service_id: dbSvc.id,
        name: dbSvc.name,
        price: finalItemPrice,
        duration_minutes: finalItemDuration,
        reduces_stock: dbSvc.reduces_stock,
        variation_id: selectedVariation?.id || item.variation_id || null,
        variation_name: selectedVariation?.name || item.variation_name || null,
        selected_extras: resolvedExtras,
        order_index: i
      });
    }

    const primaryServiceId = resolvedServices[0].service_id;
    const consolidatedServiceName = resolvedServices.map(s => s.name).join(' + ');

    const startTime = new Date(start_time);
    const endTime = new Date(startTime.getTime() + calculatedDuration * 60 * 1000);
    const effectiveTotalPrice = total_price !== undefined ? parseFloat(total_price) : calculatedTotalPrice;

    // 2. Resolver profissional: específico vs "Qualquer profissional" (D5 P1)
    let targetStaffId = staff_id;
    if (!targetStaffId || targetStaffId === 'any') {
      const eligibleStaff = await getEligibleStaff({ tenantId, serviceIds });
      if (eligibleStaff.length === 0) {
        const error = new Error('Nenhum profissional disponível para realizar os serviços selecionados.');
        error.statusCode = 404;
        throw error;
      }

      const eligibleIds = eligibleStaff.map(s => s.id);

      // Identificar quem NÃO possui agendamento conflitante no intervalo [startTime, endTime]
      const conflictsRes = await clientConnection.query(
        `SELECT DISTINCT staff_id FROM public.cap_appointments
         WHERE tenant_id = $1
           AND staff_id = ANY($2::uuid[])
           AND status <> 'cancelled'
           AND start_time < $4
           AND end_time > $3`,
        [tenantId, eligibleIds, startTime, endTime]
      );
      const busyStaffIds = new Set(conflictsRes.rows.map(r => r.staff_id));
      const freeStaffList = eligibleStaff.filter(st => !busyStaffIds.has(st.id));

      if (freeStaffList.length === 0) {
        const error = new Error('Esse horário acabou de ser ocupado. Por favor, escolha outro horário.');
        error.statusCode = 409;
        throw error;
      }

      // Distribuição justa: selecionar o profissional com menor carga de atendimentos agendados no dia
      const startOfDay = new Date(startTime);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(startTime);
      endOfDay.setHours(23, 59, 59, 999);

      const freeIds = freeStaffList.map(s => s.id);
      const loadRes = await clientConnection.query(
        `SELECT staff_id, COUNT(*) as appt_count
         FROM public.cap_appointments
         WHERE tenant_id = $1
           AND staff_id = ANY($2::uuid[])
           AND start_time >= $3
           AND start_time <= $4
           AND status <> 'cancelled'
         GROUP BY staff_id`,
        [tenantId, freeIds, startOfDay, endOfDay]
      );
      const loadMap = new Map();
      loadRes.rows.forEach(r => loadMap.set(r.staff_id, parseInt(r.appt_count, 10)));

      freeStaffList.sort((a, b) => {
        const countA = loadMap.get(a.id) || 0;
        const countB = loadMap.get(b.id) || 0;
        return countA - countB;
      });

      targetStaffId = freeStaffList[0].id;
    }

    // 3. Bloqueio transacional pessimista (FOR UPDATE) no profissional determinado
    const staffRes = await clientConnection.query(
      'SELECT id, name, commission_rate FROM public.cap_staff WHERE id = $1 AND tenant_id = $2 FOR UPDATE',
      [targetStaffId, tenantId]
    );
    if (staffRes.rows.length === 0) {
      const error = new Error('Profissional não encontrado.');
      error.statusCode = 404;
      throw error;
    }
    const staffName = staffRes.rows[0].name;
    const staffCommissionRate = parseFloat(staffRes.rows[0]?.commission_rate || '0');

    // 4. Verificação atômica de sobreposição de horário para o bloco contínuo
    const conflictRes = await clientConnection.query(
      `SELECT id FROM public.cap_appointments
       WHERE tenant_id = $1
         AND staff_id = $2
         AND status <> 'cancelled'
         AND start_time < $4
         AND end_time > $3
       LIMIT 1`,
      [tenantId, targetStaffId, startTime, endTime]
    );
    if (conflictRes.rows.length > 0) {
      const error = new Error('Esse horário acabou de ser ocupado. Por favor, escolha outro horário.');
      error.statusCode = 409;
      throw error;
    }

    // Validação de Vale-Presente (se houver)
    let giftCardAmountRedeemed = 0;
    if (gift_card_code) {
      const giftCard = await validateGiftCardCode(tenantId, gift_card_code);
      if (giftCard.service_id && !serviceIds.includes(giftCard.service_id)) {
         const error = new Error('Este Vale-Presente não é válido para os serviços selecionados.');
         error.statusCode = 400;
         throw error;
      }
      giftCardAmountRedeemed = parseFloat(giftCard.available_balance);
      if (giftCardAmountRedeemed > effectiveTotalPrice) {
         giftCardAmountRedeemed = effectiveTotalPrice;
      }
      
      // Dá a baixa no vale-presente
      await redeemGiftCard(tenantId, gift_card_code, giftCardAmountRedeemed);
    }

    // Aplica e consome a sessão do clube automaticamente no agendamento (se houver e não usar vale)
    let appliedMembershipId = client_membership_id || null;
    if (!appliedMembershipId && !gift_card_code) {
      const memResult = await applyMembershipSession(finalClientId, tenantId, primaryServiceId);
      if (memResult) {
        appliedMembershipId = memResult.id;
      }
    }

    // Aplica pacote de sessões (Item D13 P2)
    let appliedPackageId = client_package_id || null;
    let isPackageSession = false;

    if (use_package || appliedPackageId) {
      let pkgCheckQuery = `
        SELECT cp.id, cp.remaining_sessions, cp.expires_at, cp.last_session_at, p.name AS package_name, p.min_interval_days
        FROM public.cap_client_packages cp
        JOIN public.cap_packages p ON p.id = cp.package_id
        WHERE cp.tenant_id = $1 AND cp.client_id = $2 AND cp.service_id = $3
          AND cp.status = 'active' AND cp.remaining_sessions > 0 AND cp.expires_at >= NOW()
      `;
      let pkgParams = [tenantId, finalClientId, primaryServiceId];
      if (appliedPackageId) {
        pkgCheckQuery += ` AND cp.id = $4`;
        pkgParams.push(appliedPackageId);
      }
      pkgCheckQuery += ` ORDER BY cp.expires_at ASC LIMIT 1`;

      const pkgRes = await clientConnection.query(pkgCheckQuery, pkgParams);
      if (pkgRes.rowCount > 0) {
        const pkgData = pkgRes.rows[0];

        // Validar intervalo mínimo entre sessões (min_interval_days)
        if (pkgData.min_interval_days > 0 && pkgData.last_session_at) {
          const lastSessionTime = new Date(pkgData.last_session_at).getTime();
          const scheduledTime = startTime.getTime();
          const diffDays = (scheduledTime - lastSessionTime) / (1000 * 60 * 60 * 24);
          if (diffDays < pkgData.min_interval_days) {
            const err = new Error(`Este pacote requer um intervalo mínimo de ${pkgData.min_interval_days} dias entre cada sessão (última sessão realizada em ${new Date(pkgData.last_session_at).toLocaleDateString('pt-BR')}).`);
            err.statusCode = 400;
            throw err;
          }
        }

        appliedPackageId = pkgData.id;
        isPackageSession = true;
      } else if (appliedPackageId) {
        const err = new Error('Pacote de sessões selecionado não está disponível, expirou ou o saldo acabou.');
        err.statusCode = 400;
        throw err;
      }
    }

    let final_price = (appliedMembershipId || isPackageSession) ? 0 : effectiveTotalPrice;
    if (gift_card_code) {
       final_price = Math.max(0, final_price - giftCardAmountRedeemed);
    }

    // 4. Inserção mestre em cap_appointments
    const result = await clientConnection.query(
      `INSERT INTO public.cap_appointments (tenant_id, client_id, staff_id, service_id, start_time, end_time, status, total_price, client_membership_id, client_package_id, is_package_session, cashback_redeemed, gift_card_redeemed, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'scheduled', $7, $8, $9, $10, $11, $12, NOW())
       RETURNING id, tenant_id, client_id, staff_id, service_id, start_time, end_time, status, total_price, client_membership_id, client_package_id, is_package_session, cashback_redeemed, gift_card_redeemed, staff_commission_value, created_at`,
      [tenantId, finalClientId, targetStaffId, primaryServiceId, startTime, endTime, final_price, appliedMembershipId, appliedPackageId, isPackageSession, cashback_redeemed || 0, giftCardAmountRedeemed]
    );
    
    const appointment = result.rows[0];
    appointment.staff_name = staffName;

    // 5. Inserir itens detalhados em cap_appointment_services (Item D4 P1 & D12 P2)
    for (const svc of resolvedServices) {
      const svcComm = (svc.price * staffCommissionRate) / 100;
      await clientConnection.query(
        `INSERT INTO public.cap_appointment_services 
         (appointment_id, service_id, tenant_id, price, duration_minutes, commission_percentage, commission_amount, order_index, variation_id, variation_name, selected_extras, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())`,
        [appointment.id, svc.service_id, tenantId, svc.price, svc.duration_minutes, staffCommissionRate, svcComm, svc.order_index, svc.variation_id, svc.variation_name, JSON.stringify(svc.selected_extras || [])]
      );
    }

    appointment.services = resolvedServices;

    // Deduzir o cashback imediatamente no momento do agendamento
    if (cashback_redeemed && parseFloat(cashback_redeemed) > 0) {
      await processCashbackRedemption(clientConnection, tenantId, finalClientId, appointment.id, parseFloat(cashback_redeemed));
    }

    await clientConnection.query('COMMIT');

    const clientRes = await pool.query('SELECT name FROM public.cap_clients WHERE id = $1 AND tenant_id = $2', [finalClientId, tenantId]);
    const clientName = clientRes.rows[0]?.name || 'Um cliente';

    const formattedTime = startTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const formattedDate = startTime.toLocaleDateString('pt-BR');

    // Disparar Push/In-App (não travar o processo principal)
    notifyStaff(
      tenantId, 
      targetStaffId, 
      'Novo Agendamento 📅', 
      `${clientName} agendou ${consolidatedServiceName} para ${formattedDate} às ${formattedTime}.`
    ).catch(err => console.error('Falha ao disparar push notification:', err));

    // Agendar lembretes push no Redis (24h e 2h antes) — D1 (P1)
    scheduleAppointmentReminders(appointment.id).catch(err => console.error('Falha ao agendar lembretes push:', err));

    return appointment;
  } catch (error) {
    await clientConnection.query('ROLLBACK');
    if (error.code === '23P01' || error.constraint === 'no_overlapping_appointments') {
      const conflictErr = new Error('Esse horário acabou de ser ocupado. Por favor, escolha outro horário.');
      conflictErr.statusCode = 409;
      throw conflictErr;
    }
    throw error;
  } finally {
    clientConnection.release();
  }
};

export const updateAppointment = async ({ id, tenantId, userRole, userId, staff_id, service_id, start_time, status, total_price, discount_applied, client_membership_id, cashback_redeemed, checkin_status, checkin_request, cancellation_reason }) => {
  const clientConnection = await pool.connect();

  try {
    await clientConnection.query('BEGIN');

    const appQuery = await clientConnection.query(
      'SELECT id, tenant_id, client_id, staff_id, service_id, start_time, end_time, status, total_price, discount_applied, client_membership_id, client_package_id, is_package_session, cashback_redeemed, gift_card_redeemed, staff_commission_value, checkin_status, created_at FROM public.cap_appointments WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    );

    if (appQuery.rows.length === 0) {
      const error = new Error('Agendamento não encontrado.');
      error.statusCode = 404;
      throw error;
    }

    const currentApp = appQuery.rows[0];

    if (userRole === 'client') {
      if (currentApp.client_id !== userId) {
        const error = new Error('Acesso negado. Você só gerencia seus próprios agendamentos.');
        error.statusCode = 403;
        throw error;
      }
      if (status && status !== 'cancelled') {
        const error = new Error('Clientes só podem alterar o status do agendamento para cancelado.');
        error.statusCode = 403;
        throw error;
      }
    }

    // Política de Cancelamento (D8 P1): verificar antecedência mínima se o cliente está cancelando
    if (status === 'cancelled' && currentApp.status !== 'cancelled' && userRole === 'client') {
      const tenantCheck = await clientConnection.query(
        'SELECT min_cancellation_hours, social_whatsapp FROM public.cap_tenants WHERE id = $1',
        [tenantId]
      );
      const minHours = tenantCheck.rows[0]?.min_cancellation_hours ?? 2;
      const diffHours = (new Date(currentApp.start_time).getTime() - Date.now()) / (1000 * 60 * 60);

      if (diffHours < minHours) {
        const cancelErr = new Error(`Cancelamento online indisponível com menos de ${minHours}h de antecedência. Por favor, entre em contato diretamente com o salão pelo WhatsApp.`);
        cancelErr.statusCode = 400;
        cancelErr.code = 'CANCELLATION_WINDOW_EXPIRED';
        cancelErr.min_cancellation_hours = minHours;
        cancelErr.salon_phone = tenantCheck.rows[0]?.social_whatsapp || null;
        throw cancelErr;
      }
    }

    let finalStaffId = staff_id || currentApp.staff_id;
    let finalServiceId = service_id || currentApp.service_id;
    let finalStartTime = start_time ? new Date(start_time) : currentApp.start_time;
    let finalEndTime = currentApp.end_time;
    let finalStatus = status || currentApp.status;
    let finalTotalPrice = total_price !== undefined ? total_price : currentApp.total_price;
    let finalDiscountApplied = discount_applied !== undefined ? discount_applied : currentApp.discount_applied;
    let finalCommissionVal = currentApp.staff_commission_value;
    let finalMembershipId = client_membership_id !== undefined ? client_membership_id : currentApp.client_membership_id;
    let finalCashbackRedeemed = cashback_redeemed !== undefined ? cashback_redeemed : currentApp.cashback_redeemed;
    let finalCheckinStatus = checkin_status !== undefined ? checkin_status : currentApp.checkin_status;
    let finalCheckinRequest = checkin_request !== undefined ? checkin_request : currentApp.checkin_request;

    if (service_id || start_time) {
      const serviceRes = await clientConnection.query('SELECT duration_minutes FROM public.cap_services WHERE id = $1 AND tenant_id = $2', [finalServiceId, tenantId]);
      const duration = serviceRes.rows[0].duration_minutes;
      finalEndTime = new Date(new Date(finalStartTime).getTime() + duration * 60 * 1000);
    }

    // Se houve alteração de profissional, horário ou serviço e o agendamento não está sendo cancelado
    if (finalStatus !== 'cancelled' && (service_id || start_time || staff_id)) {
      await clientConnection.query(
        'SELECT id FROM public.cap_staff WHERE id = $1 AND tenant_id = $2 FOR UPDATE',
        [finalStaffId, tenantId]
      );

      const conflictRes = await clientConnection.query(
        `SELECT id FROM public.cap_appointments
         WHERE tenant_id = $1
           AND staff_id = $2
           AND id <> $5
           AND status <> 'cancelled'
           AND start_time < $4
           AND end_time > $3
         LIMIT 1`,
        [tenantId, finalStaffId, finalStartTime, finalEndTime, id]
      );
      if (conflictRes.rows.length > 0) {
        const error = new Error('Esse horário acabou de ser ocupado. Por favor, escolha outro horário.');
        error.statusCode = 409;
        throw error;
      }
    }

    if (finalStatus === 'completed' && currentApp.status !== 'completed') {
      const staffRes = await clientConnection.query('SELECT commission_rate FROM public.cap_staff WHERE id = $1 AND tenant_id = $2', [finalStaffId, tenantId]);
      const commissionRate = parseFloat(staffRes.rows[0]?.commission_rate || '0');

      // Buscar serviços do agendamento (suporte a múltiplos serviços - D4)
      const appServicesRes = await clientConnection.query(
        'SELECT id, service_id, price FROM public.cap_appointment_services WHERE appointment_id = $1 AND tenant_id = $2',
        [id, tenantId]
      );

      if (appServicesRes.rows.length > 0) {
        let totalCommission = 0;
        for (const item of appServicesRes.rows) {
          const itemPrice = parseFloat(item.price || 0);
          const svcCommission = (itemPrice * commissionRate) / 100;
          totalCommission += svcCommission;

          await clientConnection.query(
            'UPDATE public.cap_appointment_services SET commission_amount = $1 WHERE id = $2',
            [svcCommission, item.id]
          );

          // Baixa de estoque individual de cada serviço
          const serviceDetail = await clientConnection.query(
            'SELECT reduces_stock FROM public.cap_services WHERE id = $1 AND tenant_id = $2',
            [item.service_id, tenantId]
          );

          if (serviceDetail.rows[0]?.reduces_stock) {
            const inputsRes = await clientConnection.query(
              'SELECT inventory_id, quantity_consumed FROM public.cap_service_inventory WHERE service_id = $1 AND tenant_id = $2',
              [item.service_id, tenantId]
            );

            for (const input of inputsRes.rows) {
              const qty = parseFloat(input.quantity_consumed);
              if (qty > 0) {
                await clientConnection.query(
                  `UPDATE public.cap_inventory 
                   SET quantity = GREATEST(0.00, quantity - $1)
                   WHERE id = $2 AND tenant_id = $3`,
                  [qty, input.inventory_id, tenantId]
                );
              }
            }
          }
        }
        finalCommissionVal = totalCommission;
      } else {
        // Fallback para agendamentos de serviço único ou legados
        finalCommissionVal = (finalTotalPrice * commissionRate) / 100;

        const serviceDetail = await clientConnection.query('SELECT reduces_stock FROM public.cap_services WHERE id = $1 AND tenant_id = $2', [finalServiceId, tenantId]);
        
        if (serviceDetail.rows[0]?.reduces_stock) {
          const inputsRes = await clientConnection.query(
            'SELECT inventory_id, quantity_consumed FROM public.cap_service_inventory WHERE service_id = $1 AND tenant_id = $2',
            [finalServiceId, tenantId]
          );

          for (const input of inputsRes.rows) {
            const qty = parseFloat(input.quantity_consumed);
            if (qty > 0) {
              await clientConnection.query(
                `UPDATE public.cap_inventory 
                 SET quantity = GREATEST(0.00, quantity - $1)
                 WHERE id = $2 AND tenant_id = $3`,
                [qty, input.inventory_id, tenantId]
              );
            }
          }
        }
      }

      // Processar ganho de cashback (crédito)
      await processCashbackEarnings(clientConnection, tenantId, currentApp.client_id, id, finalTotalPrice);

      // Baixa em pacote de sessões se aplicável (Item D13 P2)
      if (currentApp.is_package_session && currentApp.client_package_id) {
        await consumePackageSession({
          clientPackageId: currentApp.client_package_id,
          appointmentId: id,
          staffId: finalStaffId,
          notes: 'Sessão concluída com sucesso.'
        });
      }

      // Conclusão automática de Indique e Ganhe se for o 1º procedimento concluído (Item D19 P2)
      await completeReferralOnAppointmentCompleted(clientConnection, tenantId, id, currentApp.client_id);
    }

    const updateResult = await clientConnection.query(
      `UPDATE public.cap_appointments 
       SET staff_id = $1,
           service_id = $2,
           start_time = $3,
           end_time = $4,
           status = $5,
           total_price = $6,
           staff_commission_value = $7,
           client_membership_id = $8,
           cashback_redeemed = $9,
           checkin_status = $10,
           checkin_request = $11,
           discount_applied = $12,
           cancellation_reason = CASE WHEN $5 = 'cancelled' THEN COALESCE($13, cancellation_reason) ELSE cancellation_reason END
       WHERE id = $14 AND tenant_id = $15
       RETURNING id, tenant_id, client_id, staff_id, service_id, start_time, end_time, status, total_price, discount_applied, client_membership_id, client_package_id, is_package_session, cashback_redeemed, staff_commission_value, checkin_status, checkin_request, commission_status, commission_paid_at, cancellation_reason, created_at`,
      [finalStaffId, finalServiceId, finalStartTime, finalEndTime, finalStatus, finalTotalPrice, finalCommissionVal, finalMembershipId || null, finalCashbackRedeemed || 0, finalCheckinStatus || null, finalCheckinRequest || null, finalDiscountApplied || 0, cancellation_reason || null, id, tenantId]
    );

    // Se mudou para check-in, disparar notificação
    if (finalCheckinStatus === 'checked_in' && currentApp.checkin_status !== 'checked_in') {
      const clientRes = await clientConnection.query('SELECT name FROM public.cap_clients WHERE id = $1 AND tenant_id = $2', [currentApp.client_id, tenantId]);
      const clientName = clientRes.rows[0]?.name || 'Um cliente';
      
      notifyStaff(
        tenantId, 
        finalStaffId, 
        '🔔 Novo Check-in!', 
        `${clientName} fez check-in e solicitou: ${finalCheckinRequest || 'Nenhum mimo'}.`
      ).catch(err => console.error('Falha ao disparar push notification de check-in:', err));
    }

    // Se mudou para cancelado, checar fila de espera e reembolsar sessão / cashback
    if (finalStatus === 'cancelled' && currentApp.status !== 'cancelled') {
      if (currentApp.client_membership_id) {
        await refundMembershipSession(currentApp.client_membership_id);
      }

      // Estornar sessão de pacote de sessões (Item D13 P2)
      if (currentApp.is_package_session && currentApp.client_package_id) {
        await refundPackageSession({
          clientPackageId: currentApp.client_package_id,
          appointmentId: id,
          notes: 'Sessão estornada ao saldo da cliente devido ao cancelamento do agendamento.'
        });
      }
      
      // Estornar cashback (se foi usado no agendamento)
      if (parseFloat(finalCashbackRedeemed) > 0) {
        await processCashbackRefund(clientConnection, tenantId, currentApp.client_id, id, parseFloat(finalCashbackRedeemed));
      }

      // Registrar cancelamento na timeline do CRM
      const cancelAuthor = userRole === 'client' ? 'pela cliente' : 'pela administração';
      const reasonText = cancellation_reason ? ` Motivo: ${cancellation_reason}` : '';
      
      let staffIdForTimeline = null;
      if (userRole !== 'client' && userId) {
        const staffExists = await clientConnection.query(
          'SELECT id FROM public.cap_staff WHERE id = $1 AND tenant_id = $2',
          [userId, tenantId]
        );
        if (staffExists.rows.length > 0) {
          staffIdForTimeline = userId;
        }
      }

      await clientConnection.query(
        `INSERT INTO public.cap_timeline_notes (tenant_id, client_id, staff_id, appointment_id, content, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [tenantId, currentApp.client_id, staffIdForTimeline, id, `Agendamento cancelado ${cancelAuthor}.${reasonText}`]
      );
    }

    await clientConnection.query('COMMIT');

    // Lembretes Push no Redis: cancelar se agendamento cancelado, ou reagendar se horário remarcado — D1 (P1)
    if (finalStatus === 'cancelled' && currentApp.status !== 'cancelled') {
      cancelAppointmentReminders(id).catch(err => console.error('Falha ao cancelar lembretes push:', err));

      // Checar fila de espera e ofertar vaga ao primeiro da fila (D6)
      import('./waitlistService.js').then(({ offerNextInWaitlist }) => {
        offerNextInWaitlist({
          tenantId,
          date: finalStartTime,
          serviceId: finalServiceId,
          staffId: finalStaffId
        }).catch(err => console.error('Falha ao acionar lista de espera no cancelamento (update):', err));
      }).catch(err => console.error('Falha ao importar waitlistService no cancelamento (update):', err));
    } else if (start_time && new Date(start_time).getTime() !== new Date(currentApp.start_time).getTime() && finalStatus !== 'cancelled') {
      cancelAppointmentReminders(id).catch(err => console.error('Falha ao cancelar lembretes push prévios:', err));
      scheduleAppointmentReminders(id).catch(err => console.error('Falha ao reagendar lembretes push:', err));
    }

    return updateResult.rows[0];
  } catch (error) {
    await clientConnection.query('ROLLBACK');
    if (error.code === '23P01' || error.constraint === 'no_overlapping_appointments') {
      const conflictErr = new Error('Esse horário acabou de ser ocupado. Por favor, escolha outro horário.');
      conflictErr.statusCode = 409;
      throw conflictErr;
    }
    throw error;
  } finally {
    clientConnection.release();
  }
};

export const deleteAppointment = async ({ id, tenantId, userId, userRole, cancellation_reason }) => {
  const checkQuery = await pool.query(
    'SELECT client_id, start_time, status, service_id, staff_id, client_package_id, is_package_session FROM public.cap_appointments WHERE id = $1 AND tenant_id = $2',
    [id, tenantId]
  );

  if (checkQuery.rows.length === 0) {
    const error = new Error('Agendamento não encontrado.');
    error.statusCode = 404;
    throw error;
  }

  const currentApp = checkQuery.rows[0];

  if (userRole === 'client' && currentApp.client_id !== userId) {
    const error = new Error('Acesso negado. Você só pode cancelar seus próprios agendamentos.');
    error.statusCode = 403;
    throw error;
  }

  // Política de Cancelamento (D8 P1): verificar antecedência mínima
  if (userRole === 'client') {
    const tenantRes = await pool.query(
      'SELECT min_cancellation_hours, social_whatsapp FROM public.cap_tenants WHERE id = $1',
      [tenantId]
    );
    const minHours = tenantRes.rows[0]?.min_cancellation_hours ?? 2;
    const diffHours = (new Date(currentApp.start_time).getTime() - Date.now()) / (1000 * 60 * 60);

    if (diffHours < minHours) {
      const cancelErr = new Error(`Cancelamento online indisponível com menos de ${minHours}h de antecedência. Por favor, entre em contato diretamente com o salão pelo WhatsApp.`);
      cancelErr.statusCode = 400;
      cancelErr.code = 'CANCELLATION_WINDOW_EXPIRED';
      cancelErr.min_cancellation_hours = minHours;
      cancelErr.salon_phone = tenantRes.rows[0]?.social_whatsapp || null;
      throw cancelErr;
    }
  }

  const result = await pool.query(
    `UPDATE public.cap_appointments 
     SET status = 'cancelled',
         cancellation_reason = COALESCE($3, cancellation_reason)
     WHERE id = $1 AND tenant_id = $2 
     RETURNING id, tenant_id, client_id, staff_id, service_id, start_time, end_time, status, total_price, staff_commission_value, client_membership_id, client_package_id, is_package_session, cancellation_reason, created_at`,
    [id, tenantId, cancellation_reason || null]
  );

  // Estornar sessão de pacote de sessões se aplicável (Item D13 P2)
  if (currentApp.is_package_session && currentApp.client_package_id) {
    await refundPackageSession({
      clientPackageId: currentApp.client_package_id,
      appointmentId: id,
      notes: 'Sessão estornada por cancelamento de agendamento.'
    });
  }

  // Registrar cancelamento na timeline do CRM
  const cancelAuthor = userRole === 'client' ? 'pela cliente' : 'pela administração';
  const reasonText = cancellation_reason ? ` Motivo: ${cancellation_reason}` : '';

  let staffIdForTimeline = null;
  if (userRole !== 'client' && userId) {
    const staffExists = await pool.query(
      'SELECT id FROM public.cap_staff WHERE id = $1 AND tenant_id = $2',
      [userId, tenantId]
    );
    if (staffExists.rows.length > 0) {
      staffIdForTimeline = userId;
    }
  }

  await pool.query(
    `INSERT INTO public.cap_timeline_notes (tenant_id, client_id, staff_id, appointment_id, content, created_at)
     VALUES ($1, $2, $3, $4, $5, NOW())`,
    [tenantId, currentApp.client_id, staffIdForTimeline, id, `Agendamento cancelado ${cancelAuthor}.${reasonText}`]
  );

  // Devolver sessão do clube se aplicável
  if (result.rows[0].client_membership_id) {
    await refundMembershipSession(result.rows[0].client_membership_id);
  }

  // Checar fila de espera e ofertar vaga ao primeiro da fila (D6)
  import('./waitlistService.js').then(({ offerNextInWaitlist }) => {
    offerNextInWaitlist({
      tenantId,
      date: result.rows[0].start_time,
      serviceId: result.rows[0].service_id,
      staffId: result.rows[0].staff_id
    }).catch(err => console.error('Falha ao acionar lista de espera no cancelamento:', err));
  }).catch(err => console.error('Falha ao importar waitlistService no cancelamento:', err));

  // Cancelar lembretes push agendados no Redis — D1 (P1)
  cancelAppointmentReminders(id).catch(err => console.error('Falha ao cancelar lembretes push no cancelamento:', err));

  return result.rows[0];
};

/**
 * Remarcar agendamento em 1 toque (D6 P1)
 * Atualiza horário e profissional, preserva histórico, reagenda lembretes e libera vaga antiga para a fila de espera
 */
export const rescheduleAppointment = async ({
  id,
  tenantId,
  userId,
  userRole,
  newStartTime,
  newStaffId
}) => {
  const clientConnection = await pool.connect();
  try {
    await clientConnection.query('BEGIN');

    // 1. Buscar agendamento atual com lock FOR UPDATE
    const currentRes = await clientConnection.query(
      `SELECT a.id, a.tenant_id, a.client_id, a.staff_id, a.service_id, a.start_time, a.end_time, a.status,
              s.name as service_name, s.duration_minutes
       FROM public.cap_appointments a
       JOIN public.cap_services s ON a.service_id = s.id
       WHERE a.id = $1 AND a.tenant_id = $2
       FOR UPDATE`,
      [id, tenantId]
    );

    if (currentRes.rows.length === 0) {
      const error = new Error('Agendamento não encontrado.');
      error.statusCode = 404;
      throw error;
    }

    const currentAppt = currentRes.rows[0];

    // Validação de acesso
    if (userRole === 'client' && currentAppt.client_id !== userId) {
      const error = new Error('Acesso negado. Você só pode remarcar seus próprios agendamentos.');
      error.statusCode = 403;
      throw error;
    }

    if (currentAppt.status === 'completed' || currentAppt.status === 'cancelled') {
      const error = new Error('Agendamentos cancelados ou já concluídos não podem ser remarcados.');
      error.statusCode = 400;
      throw error;
    }

    // Política de Cancelamento / Remarcação (D8 P1): verificar antecedência mínima
    if (userRole === 'client') {
      const tenantCheck = await clientConnection.query(
        'SELECT min_cancellation_hours, social_whatsapp FROM public.cap_tenants WHERE id = $1',
        [tenantId]
      );
      const minHours = tenantCheck.rows[0]?.min_cancellation_hours ?? 2;
      const diffHours = (new Date(currentAppt.start_time).getTime() - Date.now()) / (1000 * 60 * 60);

      if (diffHours < minHours) {
        const reschedErr = new Error(`Remarcação online indisponível com menos de ${minHours}h de antecedência. Por favor, entre em contato diretamente com o salão pelo WhatsApp.`);
        reschedErr.statusCode = 400;
        reschedErr.code = 'CANCELLATION_WINDOW_EXPIRED';
        reschedErr.min_cancellation_hours = minHours;
        reschedErr.salon_phone = tenantCheck.rows[0]?.social_whatsapp || null;
        throw reschedErr;
      }
    }

    const oldStartTime = currentAppt.start_time;
    const oldStaffId = currentAppt.staff_id;

    // 2. Calcular duração total somada dos serviços da visita
    const servicesRes = await clientConnection.query(
      `SELECT duration_minutes FROM public.cap_appointment_services WHERE appointment_id = $1`,
      [id]
    );
    let totalDuration = currentAppt.duration_minutes || 30;
    if (servicesRes.rows.length > 0) {
      totalDuration = servicesRes.rows.reduce((sum, r) => sum + parseInt(r.duration_minutes || 30, 10), 0);
    }

    const startDateTime = new Date(newStartTime);
    const endDateTime = new Date(startDateTime.getTime() + totalDuration * 60 * 1000);
    const targetStaffId = (newStaffId && newStaffId !== 'any') ? newStaffId : currentAppt.staff_id;

    // 3. Validar se o novo horário para o profissional está livre (excluindo este próprio agendamento)
    const conflictRes = await clientConnection.query(
      `SELECT id FROM public.cap_appointments
       WHERE tenant_id = $1
         AND staff_id = $2
         AND id <> $3
         AND status <> 'cancelled'
         AND start_time < $5
         AND end_time > $4`,
      [tenantId, targetStaffId, id, startDateTime, endDateTime]
    );

    if (conflictRes.rows.length > 0) {
      const error = new Error('Esse novo horário acabou de ser ocupado. Por favor, escolha outro horário.');
      error.statusCode = 409;
      throw error;
    }

    // 4. Atualizar o agendamento
    const updateRes = await clientConnection.query(
      `UPDATE public.cap_appointments
       SET start_time = $1, end_time = $2, staff_id = $3, status = 'scheduled'
       WHERE id = $4 AND tenant_id = $5
       RETURNING id, tenant_id, client_id, staff_id, service_id, start_time, end_time, status, total_price`,
      [startDateTime, endDateTime, targetStaffId, id, tenantId]
    );

    // 5. Registrar nota na timeline do CRM
    const oldDateFormatted = new Date(oldStartTime).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    const newDateFormatted = startDateTime.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    await clientConnection.query(
      `INSERT INTO public.cap_timeline_notes (tenant_id, client_id, appointment_id, staff_id, content)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        tenantId,
        currentAppt.client_id,
        id,
        targetStaffId,
        `Agendamento remarcado de ${oldDateFormatted} para ${newDateFormatted}.`
      ]
    );

    await clientConnection.query('COMMIT');

    // 6. Atualizar lembretes no Redis
    cancelAppointmentReminders(id).catch(err => console.error('Erro ao cancelar lembretes no reagendamento:', err));
    scheduleAppointmentReminders(id).catch(err => console.error('Erro ao agendar novos lembretes no reagendamento:', err));

    // 7. Liberar a vaga antiga para a lista de espera
    import('./waitlistService.js').then(({ offerNextInWaitlist }) => {
      offerNextInWaitlist({
        tenantId,
        date: oldStartTime,
        serviceId: currentAppt.service_id,
        staffId: oldStaffId
      }).catch(err => console.error('Falha ao oferecer vaga liberada da remarcação:', err));
    }).catch(err => console.error('Falha ao importar waitlistService:', err));

    return updateRes.rows[0];
  } catch (error) {
    await clientConnection.query('ROLLBACK');
    throw error;
  } finally {
    clientConnection.release();
  }
};

export const payCommissions = async ({ tenantId, userRole, staff_id }) => {
  if (userRole !== 'manager' && userRole !== 'superadmin') {
    const error = new Error('Acesso negado. Apenas gestores podem fechar comissões.');
    error.statusCode = 403;
    throw error;
  }

  const result = await pool.query(
    `UPDATE public.cap_appointments 
     SET commission_status = 'paid', commission_paid_at = NOW() 
     WHERE tenant_id = $1 AND staff_id = $2 AND commission_status = 'pending' AND status = 'completed'
     RETURNING id`,
    [tenantId, staff_id]
  );

  return { paidCount: result.rowCount };
};

/**
 * Marcar agendamento como Falta / No-Show (D8 P1)
 * Atualiza status para 'no_show', incrementa no_show_count do cliente,
 * verifica tolerância do salão (bloqueio ou exigência de sinal)
 * e registra nota na timeline do CRM.
 */
export const markAppointmentNoShow = async ({ id, tenantId, staffId, userRole }) => {
  if (userRole !== 'manager' && userRole !== 'professional' && userRole !== 'superadmin') {
    const error = new Error('Apenas profissionais ou gestores podem registrar faltas.');
    error.statusCode = 403;
    throw error;
  }

  const clientConnection = await pool.connect();
  try {
    await clientConnection.query('BEGIN');

    const apptRes = await clientConnection.query(
      `SELECT id, tenant_id, client_id, staff_id, service_id, start_time, end_time, status
       FROM public.cap_appointments
       WHERE id = $1 AND tenant_id = $2
       FOR UPDATE`,
      [id, tenantId]
    );

    if (apptRes.rows.length === 0) {
      const error = new Error('Agendamento não encontrado.');
      error.statusCode = 404;
      throw error;
    }

    const appt = apptRes.rows[0];

    if (appt.status === 'completed') {
      const error = new Error('Não é possível marcar falta em um atendimento já concluído.');
      error.statusCode = 400;
      throw error;
    }

    if (appt.status === 'cancelled') {
      const error = new Error('Não é possível marcar falta em um agendamento cancelado.');
      error.statusCode = 400;
      throw error;
    }

    if (appt.status === 'no_show') {
      const error = new Error('Este agendamento já está marcado como falta.');
      error.statusCode = 400;
      throw error;
    }

    // 1. Atualizar agendamento para no_show
    const updatedApptRes = await clientConnection.query(
      `UPDATE public.cap_appointments
       SET status = 'no_show',
           no_show_marked_at = NOW(),
           no_show_marked_by = $1
       WHERE id = $2 AND tenant_id = $3
       RETURNING id, tenant_id, client_id, staff_id, service_id, start_time, end_time, status, no_show_marked_at, no_show_marked_by`,
      [staffId, id, tenantId]
    );

    // 2. Incrementar contador de faltas do cliente
    const incClientRes = await clientConnection.query(
      `UPDATE public.cap_clients
       SET no_show_count = no_show_count + 1
       WHERE id = $1 AND tenant_id = $2
       RETURNING id, name, phone, no_show_count, is_blocked`,
      [appt.client_id, tenantId]
    );
    const clientData = incClientRes.rows[0];
    const newCount = clientData ? clientData.no_show_count : 1;

    // 3. Consultar tolerância e ação do salão
    const tenantConfigRes = await clientConnection.query(
      `SELECT no_show_tolerance_count, no_show_penalty_action
       FROM public.cap_tenants
       WHERE id = $1`,
      [tenantId]
    );
    const tenantConfig = tenantConfigRes.rows[0] || { no_show_tolerance_count: 2, no_show_penalty_action: 'warn' };
    const tolerance = tenantConfig.no_show_tolerance_count ?? 2;
    const penaltyAction = tenantConfig.no_show_penalty_action || 'warn';

    let penaltyApplied = 'none';
    if (newCount >= tolerance) {
      if (penaltyAction === 'block') {
        await clientConnection.query(
          `UPDATE public.cap_clients
           SET is_blocked = TRUE,
               blocked_reason = $1
           WHERE id = $2 AND tenant_id = $3`,
          [`Bloqueado automaticamente por atingir o limite de ${tolerance} falta(s) sem aviso prévio.`, appt.client_id, tenantId]
        );
        penaltyApplied = 'blocked';
      } else if (penaltyAction === 'require_deposit') {
        penaltyApplied = 'deposit_required';
      }
    }

    // 4. Inserir nota na timeline do CRM
    const noteText = penaltyApplied === 'blocked'
      ? `Falta registrada pelo salão. O cliente atingiu ${newCount} falta(s) (tolerância de ${tolerance}) e foi bloqueado para novos agendamentos online.`
      : (penaltyApplied === 'deposit_required'
          ? `Falta registrada pelo salão. Total de ${newCount} falta(s). Próximos agendamentos exigirão pagamento de sinal PIX antecipado.`
          : `Falta registrada pelo salão. Total acumulado: ${newCount} falta(s).`);

    await clientConnection.query(
      `INSERT INTO public.cap_timeline_notes (tenant_id, client_id, staff_id, appointment_id, content, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [tenantId, appt.client_id, staffId, id, noteText]
    );

    await clientConnection.query('COMMIT');

    // Cancelar lembretes push pendentes no Redis se houver
    cancelAppointmentReminders(id).catch(err => console.error('Falha ao cancelar lembretes push no no-show:', err));

    return {
      appointment: updatedApptRes.rows[0],
      client: {
        id: clientData?.id,
        name: clientData?.name,
        no_show_count: newCount,
        is_blocked: penaltyApplied === 'blocked'
      },
      penalty_applied: penaltyApplied,
      tolerance_count: tolerance
    };
  } catch (error) {
    await clientConnection.query('ROLLBACK');
    throw error;
  } finally {
    clientConnection.release();
  }
};

/**
 * Desfazer marcação de Falta / No-Show (D8 P1)
 * Reverte o agendamento para 'scheduled', decrementa no_show_count e remove bloqueio se aplicável
 */
export const undoAppointmentNoShow = async ({ id, tenantId, staffId, userRole }) => {
  if (userRole !== 'manager' && userRole !== 'professional' && userRole !== 'superadmin') {
    const error = new Error('Apenas profissionais ou gestores podem reverter faltas.');
    error.statusCode = 403;
    throw error;
  }

  const clientConnection = await pool.connect();
  try {
    await clientConnection.query('BEGIN');

    const apptRes = await clientConnection.query(
      `SELECT id, tenant_id, client_id, status FROM public.cap_appointments WHERE id = $1 AND tenant_id = $2 FOR UPDATE`,
      [id, tenantId]
    );

    if (apptRes.rows.length === 0) {
      const error = new Error('Agendamento não encontrado.');
      error.statusCode = 404;
      throw error;
    }

    const appt = apptRes.rows[0];
    if (appt.status !== 'no_show') {
      const error = new Error('Este agendamento não está marcado como falta.');
      error.statusCode = 400;
      throw error;
    }

    // 1. Reverter agendamento para scheduled
    const updatedApptRes = await clientConnection.query(
      `UPDATE public.cap_appointments
       SET status = 'scheduled',
           no_show_marked_at = NULL,
           no_show_marked_by = NULL
       WHERE id = $1 AND tenant_id = $2
       RETURNING id, tenant_id, client_id, staff_id, service_id, start_time, end_time, status`,
      [id, tenantId]
    );

    // 2. Decrementar contador de faltas
    const decClientRes = await clientConnection.query(
      `UPDATE public.cap_clients
       SET no_show_count = GREATEST(0, no_show_count - 1)
       WHERE id = $1 AND tenant_id = $2
       RETURNING id, name, no_show_count, is_blocked, blocked_reason`,
      [appt.client_id, tenantId]
    );
    const clientData = decClientRes.rows[0];

    // Se estava bloqueado por faltas e contagem caiu, remove bloqueio
    if (clientData?.is_blocked && clientData?.blocked_reason && clientData.blocked_reason.includes('falta')) {
      const tenantRes = await clientConnection.query(
        'SELECT no_show_tolerance_count FROM public.cap_tenants WHERE id = $1',
        [tenantId]
      );
      const tol = tenantRes.rows[0]?.no_show_tolerance_count ?? 2;
      if (clientData.no_show_count < tol) {
        await clientConnection.query(
          `UPDATE public.cap_clients SET is_blocked = FALSE, blocked_reason = NULL WHERE id = $1`,
          [appt.client_id]
        );
        clientData.is_blocked = false;
        clientData.blocked_reason = null;
      }
    }

    // 3. Nota na timeline
    await clientConnection.query(
      `INSERT INTO public.cap_timeline_notes (tenant_id, client_id, staff_id, appointment_id, content, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [tenantId, appt.client_id, staffId, id, 'Registro de falta desfeito pelo gestor/profissional.']
    );

    await clientConnection.query('COMMIT');

    return {
      appointment: updatedApptRes.rows[0],
      client: clientData
    };
  } catch (error) {
    await clientConnection.query('ROLLBACK');
    throw error;
  } finally {
    clientConnection.release();
  }
};
