import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, 'backend/.env') });

import pool from './backend/config/db.js';
import { updateAppointment } from './backend/services/appointmentService.js';

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
