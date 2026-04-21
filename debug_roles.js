import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

let envFile = fs.readFileSync('.env', 'utf8');
let supabaseUrl = '', supabaseKey = '';
envFile.split('\n').forEach(line => {
  if (line.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].replace(/"/g, '').trim();
  if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) supabaseKey = line.split('=')[1].replace(/"/g, '').trim();
});

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRoles() {
  const { data } = await supabase.from('cap_profiles').select('full_name, role, access_email');
  console.log(data);
}
checkRoles();
