import cron from 'node-cron';
import pool from '../config/db.js';
import { notifyClient } from '../services/notificationService.js';

/**
 * Motor de Varredura e Disparo Contínuo de Lembretes (2h e 24h antes)
 * Pode ser executado pelo Cron a cada 5 minutos ou acionado sob demanda pela API
 */
export const processPendingReminders = async (filterTenantId = null) => {
  const results = {
    executedAt: new Date().toISOString(),
    reminders2h: [],
    reminders24h: [],
    errors: []
  };

  // 1. LEMBRETES DE 2 HORAS (Agendamentos futuros nos próximos 2h15m que ainda não receberam REMINDER_2H)
  try {
    let query2h = `
      SELECT a.id, a.tenant_id, a.client_id, a.start_time, 
             c.name as client_name, c.phone as client_phone, 
             s.name as service_name, t.name as tenant_name,
             st.name as staff_name
      FROM public.cap_appointments a
      JOIN public.cap_clients c ON a.client_id = c.id
      JOIN public.cap_services s ON a.service_id = s.id
      JOIN public.cap_tenants t ON a.tenant_id = t.id
      LEFT JOIN public.cap_staff st ON a.staff_id = st.id
      WHERE a.start_time > NOW()
        AND a.start_time <= NOW() + INTERVAL '2 hours 15 minutes'
        AND a.status IN ('scheduled', 'confirmed')
        AND NOT EXISTS (
          SELECT 1 FROM public.cap_whatsapp_messages m
          WHERE m.appointment_id = a.id
            AND m.message_type = 'REMINDER_2H'
            AND m.status IN ('SENT', 'CONFIRMED', 'DELIVERED')
        )
    `;
    const params2h = [];
    if (filterTenantId) {
      params2h.push(filterTenantId);
      query2h += ` AND a.tenant_id = $1`;
    }

    const appts2h = await pool.query(query2h, params2h);

    for (const appt of appts2h.rows) {
      const time = new Date(appt.start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
      const date = new Date(appt.start_time).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' });

      // Dispara Web Push (isolado, falhas não interrompem o WhatsApp)
      try {
        await notifyClient(
          appt.tenant_id, 
          appt.client_id, 
          'Faltam 2 horas! ⏰', 
          `Estamos te esperando às ${time} para seu ${appt.service_name}.`,
          '/agenda'
        );
      } catch (pushErr) {
        console.warn(`[CRON] Falha não-fatal no Web Push 2h do agendamento ${appt.id}:`, pushErr.message);
      }

      // Dispara WhatsApp
      try {
        if (appt.client_phone) {
          const waRes = await pool.query(
            "SELECT id FROM public.cap_whatsapp_instances WHERE tenant_id = $1 AND status = 'CONNECTED'",
            [appt.tenant_id]
          );
          if (waRes.rows.length > 0) {
            const { whatsappService } = await import('../services/whatsappService.js');
            await whatsappService.sendReminder({
              tenantId: appt.tenant_id,
              appointmentId: appt.id,
              recipientPhone: appt.client_phone,
              clientName: (appt.client_name || 'Cliente').split(' ')[0],
              salonName: appt.tenant_name,
              serviceName: appt.service_name,
              professionalName: appt.staff_name || 'Profissional',
              scheduledTimeFormatted: `${date} às ${time}`,
              messageType: 'REMINDER_2H'
            });
            results.reminders2h.push({
              appointmentId: appt.id,
              client: appt.client_name,
              phone: appt.client_phone,
              time: `${date} às ${time}`,
              status: 'SENT'
            });
          } else {
            results.reminders2h.push({
              appointmentId: appt.id,
              client: appt.client_name,
              status: 'SKIPPED_NO_CONNECTED_LINE'
            });
          }
        }
      } catch (waErr) {
        console.error(`[CRON] Falha no WhatsApp 2h do agendamento ${appt.id}:`, waErr.message);
        results.errors.push({ appointmentId: appt.id, error: waErr.message });
      }
    }
  } catch (err2h) {
    console.error('❌ [CRON] Erro nos lembretes de 2h:', err2h);
    results.errors.push({ step: '2h_scan', error: err2h.message });
  }

  // 2. LEMBRETES DE 24 HORAS (Agendamentos entre 2h15m e 26h que ainda não receberam REMINDER_24H)
  try {
    let query24h = `
      SELECT a.id, a.tenant_id, a.client_id, a.start_time, 
             c.name as client_name, c.phone as client_phone, 
             s.name as service_name, t.name as tenant_name,
             st.name as staff_name
      FROM public.cap_appointments a
      JOIN public.cap_clients c ON a.client_id = c.id
      JOIN public.cap_services s ON a.service_id = s.id
      JOIN public.cap_tenants t ON a.tenant_id = t.id
      LEFT JOIN public.cap_staff st ON a.staff_id = st.id
      WHERE a.start_time > NOW() + INTERVAL '2 hours 15 minutes'
        AND a.start_time <= NOW() + INTERVAL '26 hours'
        AND a.status IN ('scheduled', 'confirmed')
        AND NOT EXISTS (
          SELECT 1 FROM public.cap_whatsapp_messages m
          WHERE m.appointment_id = a.id
            AND m.message_type = 'REMINDER_24H'
            AND m.status IN ('SENT', 'CONFIRMED', 'DELIVERED')
        )
    `;
    const params24h = [];
    if (filterTenantId) {
      params24h.push(filterTenantId);
      query24h += ` AND a.tenant_id = $1`;
    }

    const appts24h = await pool.query(query24h, params24h);

    for (const appt of appts24h.rows) {
      const time = new Date(appt.start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
      const date = new Date(appt.start_time).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' });

      // Dispara Web Push
      try {
        await notifyClient(
          appt.tenant_id, 
          appt.client_id, 
          'Seu horário é amanhã!', 
          `Olá ${appt.client_name.split(' ')[0]}, seu horário para ${appt.service_name} está confirmado para ${date} às ${time}.`,
          '/agenda'
        );
      } catch (pushErr) {
        console.warn(`[CRON] Falha não-fatal no Web Push 24h do agendamento ${appt.id}:`, pushErr.message);
      }

      // Dispara WhatsApp
      try {
        if (appt.client_phone) {
          const waRes = await pool.query(
            "SELECT id FROM public.cap_whatsapp_instances WHERE tenant_id = $1 AND status = 'CONNECTED'",
            [appt.tenant_id]
          );
          if (waRes.rows.length > 0) {
            const { whatsappService } = await import('../services/whatsappService.js');
            await whatsappService.sendReminder({
              tenantId: appt.tenant_id,
              appointmentId: appt.id,
              recipientPhone: appt.client_phone,
              clientName: (appt.client_name || 'Cliente').split(' ')[0],
              salonName: appt.tenant_name,
              serviceName: appt.service_name,
              professionalName: appt.staff_name || 'Profissional',
              scheduledTimeFormatted: `${date} às ${time}`,
              messageType: 'REMINDER_24H'
            });
            results.reminders24h.push({
              appointmentId: appt.id,
              client: appt.client_name,
              phone: appt.client_phone,
              time: `${date} às ${time}`,
              status: 'SENT'
            });
          } else {
            results.reminders24h.push({
              appointmentId: appt.id,
              client: appt.client_name,
              status: 'SKIPPED_NO_CONNECTED_LINE'
            });
          }
        }
      } catch (waErr) {
        console.error(`[CRON] Falha no WhatsApp 24h do agendamento ${appt.id}:`, waErr.message);
        results.errors.push({ appointmentId: appt.id, error: waErr.message });
      }
    }
  } catch (err24h) {
    console.error('❌ [CRON] Erro nos lembretes de 24h:', err24h);
    results.errors.push({ step: '24h_scan', error: err24h.message });
  }

  return results;
};

export const initCronJobs = () => {
  // 1. Lembretes Contínuos e Inteligentes (2h e 24h antes): Roda a cada 5 minutos
  cron.schedule('*/5 * * * *', async () => {
    console.log('⏳ [CRON] Executando varredura contínua de lembretes (2h e 24h)...');
    try {
      await processPendingReminders();
    } catch (err) {
      console.error('❌ [CRON] Erro na varredura periódica de lembretes:', err);
    }
  });

  // 2. Rotinas Diárias: Roda todos os dias às 08:00 da manhã
  cron.schedule('0 8 * * *', async () => {
    console.log('⏳ [CRON] Iniciando rotinas diárias (Campanhas, Aniversários, Manutenção)...');
    
    try {
      // Disparo de segurança de lembretes diários
      await processPendingReminders();

      // Campanhas Automáticas Parametrizadas (D15: Aniversário, Manutenção e Reativação 60d)
      try {
        const { runCampaignScan } = await import('../services/campaignService.js');
        const campaignResults = await runCampaignScan();
        console.log('📢 [CRON] Campanhas Automáticas executadas:', campaignResults);
      } catch (campErr) {
        console.error('❌ [CRON] Erro ao executar campanhas automáticas:', campErr);
      }

      // Verificação do Clube de Assinaturas (vencimento do ciclo de 30 dias)
      const expiredMemberships = await pool.query(`
        SELECT cm.id, cm.current_period_end, sm.name as plan_name
        FROM public.cap_client_memberships cm
        JOIN public.cap_salon_memberships sm ON cm.membership_id = sm.id
        WHERE cm.status = 'active'
        AND cm.current_period_end <= CURRENT_TIMESTAMP
      `);

      for (const mem of expiredMemberships.rows) {
        await pool.query(`
          UPDATE public.cap_client_memberships
          SET status = 'past_due'
          WHERE id = $1
        `, [mem.id]);
        console.log(`[CRON] Assinatura ${mem.id} (${mem.plan_name}) expirou o ciclo e foi atualizada para 'past_due'.`);
      }

      console.log('✅ [CRON] Rotinas diárias concluídas.');
    } catch (err) {
      console.error('❌ [CRON] Erro nas rotinas diárias:', err);
    }
  }, {
    scheduled: true,
    timezone: "America/Sao_Paulo"
  });

  // 3. Expiração de Ofertas da Lista de Espera (D6 P1): Roda a cada 2 minutos
  cron.schedule('*/2 * * * *', async () => {
    try {
      const { expireOffersAndAdvance } = await import('../services/waitlistService.js');
      await expireOffersAndAdvance();
    } catch (err) {
      console.error('❌ [CRON] Erro ao expirar ofertas da lista de espera:', err);
    }
  });

  // 4. Notificação do Relatório Mensal "Impacto OperaBeauty" (D9 P1): Roda todo dia 1º às 08:00
  cron.schedule('0 8 1 * *', async () => {
    console.log('📊 [CRON] Notificando gestores sobre o Relatório Mensal de Impacto...');
    try {
      const activeTenants = await pool.query(`
        SELECT id, name, slug FROM public.cap_tenants WHERE is_active = true
      `);
      for (const t of activeTenants.rows) {
        const managers = await pool.query(`
          SELECT id FROM public.cap_staff WHERE tenant_id = $1 AND role IN ('manager', 'superadmin') AND is_active = true
        `, [t.id]);
        
        for (const m of managers.rows) {
          await pool.query(`
            INSERT INTO public.cap_notifications (tenant_id, recipient_id, recipient_type, title, message, link, is_read, created_at)
            VALUES ($1, $2, 'staff', 'Relatório Mensal de Impacto Disponível! 📊', 
                    'O relatório consolidado do mês anterior já está pronto. Confira as horas economizadas e faturamento protegido pelo OperaBeauty.',
                    '/' || $3 || '/staff/admin/relatorios-bi', false, NOW())
          `, [t.id, m.id, t.slug]);
        }
      }
      console.log('✅ [CRON] Notificações do Relatório Mensal disparadas com sucesso.');
    } catch (err) {
      console.error('❌ [CRON] Erro ao disparar notificações de relatório mensal:', err);
    }
  }, {
    scheduled: true,
    timezone: "America/Sao_Paulo"
  });
};
