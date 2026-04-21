import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Carregar variáveis de ambiente manualmente ou usar strings pass-through
const envPath = path.resolve('.env');
let supabaseUrl = '';
let supabaseKey = '';

try {
  const envFile = fs.readFileSync(envPath, 'utf8');
  envFile.split('\n').forEach(line => {
    if (line.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].replace(/"/g, '').trim();
    if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) supabaseKey = line.split('=')[1].replace(/"/g, '').trim();
  });
} catch (e) {
  console.log("Erro ao ler .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runE2E() {
  console.log("==========================================");
  console.log("🚀 INICIANDO TESTE E2E (BACKEND WORKFLOW)  ");
  console.log("==========================================\n");

  // 1. Auth Admin
  console.log("-> 1. Efetuando Login (Admin)");
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'cf95.souza@gmail.com',
    password: '140415'
  });
  if (authErr) { console.error("Falha no login:", authErr); return; }
  console.log("✅ Admin Logado");

  // 2. Criar Profissional
  console.log("\n-> 2. Criando Novo Profissional (Simulado)");
  // Fake ID to create user profile logic bypasses auth real user if needed
  // We will just insert into profiles
  const professionalId = 'a1b2c3d4-0000-0000-0000-professional01';
  const { error: profErr } = await supabase.from('cap_profiles').upsert({
    id: authData.user.id, // we'll use admin's ID just to reuse auth for testing, or better, we create a fake professional record
  });

  // Because creating auth users usually needs admin api, let's just create a raw professional reference 
  // Wait, RLS on profiles might forbid arbitrary inserts. Let's try upserting another record using admin bypass if it fails we just use admin's profile for the appointment test.
  
  // Let's create an Inventory Item
  console.log("\n-> 3. Criando Item no Estoque");
  const { data: invData, error: invErr } = await supabase.from('cap_inventory').insert({
    name: 'Shampoo E2E Script Test',
    quantity: 100,
    unit: 'ml',
    min_quantity: 10
  }).select().single();
  
  if (invErr) { console.error("Falha ao criar item de estoque:", invErr.message); }
  else { console.log(`✅ Produto Criado: ${invData.name} | Qtd: ${invData.quantity}`); }

  // Create Service
  console.log("\n-> 4. Criando Serviço e Vinculando Insumo");
  const { data: srvData, error: srvErr } = await supabase.from('cap_services').insert({
    name: 'Tratamento E2E Test',
    duration_minutes: 60,
    price: 120.00
  }).select().single();

  if (srvErr) console.error("Falha serviço:", srvErr.message);
  else console.log(`✅ Serviço Criado: ${srvData.name}`);

  if (invData && srvData) {
    const { error: linkErr } = await supabase.from('cap_service_inventory').insert({
      service_id: srvData.id,
      inventory_id: invData.id,
      quantity_consumed: 10
    });
    if (!linkErr) console.log(`✅ Insumo Vínculado: Usará 10ml por procedimento`);
    else console.error("Falha no vínculo", linkErr);
  }

  // Create Client
  console.log("\n-> 5. Garantindo existência de um cliente");
  // Try finding one
  let clientId = null;
  const { data: clients } = await supabase.from('cap_clients').select('id').limit(1);
  if (clients && clients.length > 0) {
    clientId = clients[0].id;
    console.log("✅ Cliente existente utilizado");
  } else {
    const { data: newCli } = await supabase.from('cap_clients').insert({ name: 'Cliente Teste Script', phone: '11999999999' }).select().single();
    clientId = newCli.id;
  }

  // Create Appointment
  let appId = null;
  if (srvData && clientId) {
    console.log("\n-> 6. Simulando Agendamento (Visão Cliente/Admin)");
    const now = new Date();
    const end = new Date(now.getTime() + 60*60000);
    const { data: appData, error: appErr } = await supabase.from('cap_appointments').insert({
      client_id: clientId,
      professional_id: authData.user.id,
      start_time: now.toISOString(),
      end_time: end.toISOString(),
      status: 'scheduled',
      total_price: 120.00
    }).select().single();

    if (appErr) console.error("Falha no agendamento:", appErr);
    else {
      appId = appData.id;
      console.log(`✅ Agendado ID: ${appId}`);
      
      // Link service to appointment
      await supabase.from('cap_appointment_services').insert({
        appointment_id: appId,
        service_id: srvData.id,
        price_at_time: 120.00
      });
      console.log(`✅ Serviço atrelado ao Agendamento`);
    }
  }

  // Execute job (Professional View)
  if (appId) {
    console.log("\n-> 7. Simulando Execução (Portal Profissional) e Trigger de CRM/Estoque");
    // Change status to completed
    const { error: finErr } = await supabase.from('cap_appointments').update({
       status: 'completed'
    }).eq('id', appId);
    
    if (finErr) console.error("Erro finalizando:", finErr.message);
    else console.log(`✅ Procedimento Finalizado com Sucesso!`);
  }

  // Verification 
  console.log("\n==========================================");
  console.log("🔍 VALIDAÇÃO DOS IMPACTOS NO SISTEMA");
  console.log("==========================================");
  
  if (invData) {
    const { data: checkInv } = await supabase.from('cap_inventory').select('quantity').eq('id', invData.id).single();
    const wasDeducted = checkInv.quantity === (invData.quantity - 10);
    console.log(`-> Estoque Atual do Insumo: ${checkInv?.quantity}`);
    console.log(`-> A Regra de Baixa Funcionou? ${wasDeducted ? 'SIM ✅' : 'NÃO ❌'}`);
  }

  if (clientId) {
    const { data: notes } = await supabase.from('cap_timeline_notes').select('*').eq('client_id', clientId).order('created_at', { ascending: false }).limit(1);
    if (notes && notes.length > 0) {
      console.log(`-> Registro no CRM do Cliente Visto? SIM ✅`);
      console.log(`   [Nota Encontrada]: "${notes[0].content}"`);
    } else {
      console.log(`-> Registro no CRM do Cliente Visto? NÃO ❌`);
    }
  }

  console.log("\n==========================================");
  console.log("🧹 LIMPANDO DADOS DE TESTE E2E SCRIPT");
  // Clenaup (we only clean up the service and inventory, appointments cascading)
  if (srvData) await supabase.from('cap_services').delete().eq('id', srvData.id);
  if (invData) await supabase.from('cap_inventory').delete().eq('id', invData.id);
  // It should cascade delete appointment links and notes? No, timeline notes might persist if no cascading. We'll leave them as evidence.
  console.log("✅ Fim da rotina de teste E2E!");
}

runE2E();
