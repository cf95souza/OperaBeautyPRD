import cron from 'node-cron';
import pool from '../config/db.js';
import { notifyClient } from '../services/notificationService.js';

export const initCronJobs = () => {
  // Lembretes Diários: Roda todos os dias às 08:00 da manhã
  cron.schedule('0 8 * * *', async () => {
    console.log('⏳ [CRON] Iniciando rotinas diárias (Lembretes, Aniversários, Manutenção)...');
    
    try {
      // 1. Lembretes de 24h (Agendamentos marcados para amanhã)
      const appts24h = await pool.query(`
        SELECT a.id, a.tenant_id, a.client_id, a.appointment_time, c.name as client_name, s.name as service_name
        FROM public.cap_appointments a
        JOIN public.cap_clients c ON a.client_id = c.id
        JOIN public.cap_services s ON a.service_id = s.id
        WHERE a.appointment_date = CURRENT_DATE + INTERVAL '1 day'
        AND a.status = 'confirmed'
      `);

      for (const appt of appts24h.rows) {
        const time = appt.appointment_time.substring(0, 5); // HH:MM
        await notifyClient(
          appt.tenant_id, 
          appt.client_id, 
          'Seu horário é amanhã!', 
          `Olá ${appt.client_name.split(' ')[0]}, seu horário para ${appt.service_name} está confirmado para amanhã às ${time}.`,
          '/agenda'
        );
      }
      
      // 2. Aniversariantes do dia
      const bdays = await pool.query(`
        SELECT c.id, c.tenant_id, c.name
        FROM public.cap_clients c
        WHERE EXTRACT(MONTH FROM c.birth_date) = EXTRACT(MONTH FROM CURRENT_DATE)
        AND EXTRACT(DAY FROM c.birth_date) = EXTRACT(DAY FROM CURRENT_DATE)
      `);

      for (const client of bdays.rows) {
        await notifyClient(
          client.tenant_id,
          client.id,
          'Feliz Aniversário! 🎂',
          `Parabéns ${client.name.split(' ')[0]}! O salão deseja que seu dia seja repleto de beleza e alegrias. Que tal comemorar agendando um horário com a gente?`,
          '/agendar/servicos'
        );
      }

      // 3. Manutenção (Retorno Automático)
      const maintenance = await pool.query(`
        SELECT a.tenant_id, a.client_id, c.name as client_name, s.name as service_name
        FROM public.cap_appointments a
        JOIN public.cap_clients c ON a.client_id = c.id
        JOIN public.cap_services s ON a.service_id = s.id
        WHERE a.status = 'completed'
        AND s.maintenance_days > 0
        AND a.appointment_date = CURRENT_DATE - (s.maintenance_days * INTERVAL '1 day')
      `);

      for (const item of maintenance.rows) {
        await notifyClient(
          item.tenant_id,
          item.client_id,
          'Hora do seu Retoque! ✨',
          `Olá ${item.client_name.split(' ')[0]}, já faz um tempo que você fez ${item.service_name}. Que tal agendar seu retorno?`,
          '/agendamento'
        );
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
        SELECT a.id, a.tenant_id, a.client_id, a.appointment_time, c.name as client_name, s.name as service_name
        FROM public.cap_appointments a
        JOIN public.cap_clients c ON a.client_id = c.id
        JOIN public.cap_services s ON a.service_id = s.id
        WHERE a.appointment_date = CURRENT_DATE
        AND a.status = 'confirmed'
        AND EXTRACT(HOUR FROM a.appointment_time) = EXTRACT(HOUR FROM CURRENT_TIME) + 2
      `);

      for (const appt of appts2h.rows) {
        const time = appt.appointment_time.substring(0, 5);
        await notifyClient(
          appt.tenant_id, 
          appt.client_id, 
          'Faltam 2 horas! ⏰', 
          `Estamos te esperando às ${time} para seu ${appt.service_name}.`,
          '/agenda'
        );
      }
    } catch (err) {
      console.error('❌ [CRON] Erro nos lembretes de 2h:', err);
    }
  });
};
