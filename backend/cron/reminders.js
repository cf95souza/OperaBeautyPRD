import cron from 'node-cron';
import pool from '../config/db.js';
import { notifyClient } from '../services/notificationService.js';

export const initCronJobs = () => {
  // Lembretes Diários: Roda todos os dias às 08:00 da manhã
  cron.schedule('0 8 * * *', async () => {
    console.log('⏳ [CRON] Iniciando rotinas diárias (Lembretes, Aniversários, Manutenção)...');
    
    try {
      // 1. Lembretes de 24h (Agendamentos marcados para amanhã - Fallback safety net)
      const appts24h = await pool.query(`
        SELECT a.id, a.tenant_id, a.client_id, a.start_time, c.name as client_name, s.name as service_name
        FROM public.cap_appointments a
        JOIN public.cap_clients c ON a.client_id = c.id
        JOIN public.cap_services s ON a.service_id = s.id
        WHERE (a.start_time AT TIME ZONE 'America/Sao_Paulo')::date = (CURRENT_DATE + INTERVAL '1 day')
        AND a.status IN ('scheduled', 'confirmed')
      `);

      for (const appt of appts24h.rows) {
        const time = new Date(appt.start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
        await notifyClient(
          appt.tenant_id, 
          appt.client_id, 
          'Seu horário é amanhã!', 
          `Olá ${appt.client_name.split(' ')[0]}, seu horário para ${appt.service_name} está confirmado para amanhã às ${time}.`,
          '/agenda'
        );
      }
      
      // 2. Campanhas Automáticas Parametrizadas (D15: Aniversário, Manutenção e Reativação 60d)
      try {
        const { runCampaignScan } = await import('../services/campaignService.js');
        const campaignResults = await runCampaignScan();
        console.log('📢 [CRON] Campanhas Automáticas executadas:', campaignResults);
      } catch (campErr) {
        console.error('❌ [CRON] Erro ao executar campanhas automáticas:', campErr);
      }

      // 3. Verificação do Clube de Assinaturas (vencimento do ciclo de 30 dias)
      // [SEGURANÇA REGRA DE NEGÓCIO / FALHA 05]: Bloqueio de renovação gratuita infinita.
      // Assinaturas cujo ciclo venceu entram em 'past_due' até que o pagamento recorrente seja confirmado.
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

  // Lembretes de 2h: Roda a cada hora no minuto 0 (Ex: 09:00, 10:00, etc)
  cron.schedule('0 * * * *', async () => {
    console.log('⏳ [CRON] Checando lembretes de 2h...');
    
    try {
      const appts2h = await pool.query(`
        SELECT a.id, a.tenant_id, a.client_id, a.start_time, 
               c.name as client_name, c.phone as client_phone, 
               s.name as service_name, t.name as tenant_name,
               st.name as staff_name
        FROM public.cap_appointments a
        JOIN public.cap_clients c ON a.client_id = c.id
        JOIN public.cap_services s ON a.service_id = s.id
        JOIN public.cap_tenants t ON a.tenant_id = t.id
        LEFT JOIN public.cap_staff st ON a.staff_id = st.id
        WHERE (a.start_time AT TIME ZONE 'America/Sao_Paulo')::date = CURRENT_DATE
        AND a.status IN ('scheduled', 'confirmed')
        AND EXTRACT(HOUR FROM (a.start_time AT TIME ZONE 'America/Sao_Paulo')) = EXTRACT(HOUR FROM (CURRENT_TIME AT TIME ZONE 'America/Sao_Paulo')) + 2
      `);

      for (const appt of appts2h.rows) {
        const time = new Date(appt.start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
        await notifyClient(
          appt.tenant_id, 
          appt.client_id, 
          'Faltam 2 horas! ⏰', 
          `Estamos te esperando às ${time} para seu ${appt.service_name}.`,
          '/agenda'
        );

        // Fallback WhatsApp
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
                scheduledTimeFormatted: `Hoje às ${time}`,
                messageType: 'REMINDER_2H'
              });
            }
          }
        } catch (waCronErr) {
          console.warn(`[CRON] Falha não-fatal no envio de WhatsApp do agendamento ${appt.id}:`, waCronErr.message);
        }
      }
    } catch (err) {
      console.error('❌ [CRON] Erro nos lembretes de 2h:', err);
    }
  });

  // Expiração de Ofertas da Lista de Espera (D6 P1): Roda a cada 2 minutos
  cron.schedule('*/2 * * * *', async () => {
    try {
      const { expireOffersAndAdvance } = await import('../services/waitlistService.js');
      await expireOffersAndAdvance();
    } catch (err) {
      console.error('❌ [CRON] Erro ao expirar ofertas da lista de espera:', err);
    }
  });

  // Notificação do Relatório Mensal "Impacto OperaBeauty" (D9 P1): Roda todo dia 1º às 08:00
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
