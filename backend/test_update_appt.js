import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

import pool from './config/db.js';
import { updateAppointment } from './services/appointmentService.js';

async function test() {
  try {
    const res = await pool.query('SELECT * FROM public.cap_appointments LIMIT 1');
    if (res.rows.length === 0) {
      console.log('No appointments found');
      return;
    }
    const appt = res.rows[0];
    console.log('Testing with appointment:', appt.id);

    const updated = await updateAppointment({
      id: appt.id,
      tenantId: appt.tenant_id,
      userRole: 'manager', // avoid client checks for testing
      userId: appt.client_id,
      status: 'cancelled'
    });
    console.log('Success:', updated);
  } catch (error) {
    console.error('Error during update:', error);
  } finally {
    pool.end();
  }
}

test();
