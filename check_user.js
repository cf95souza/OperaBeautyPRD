
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  "https://tgqbhgdvhprgifeskaev.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRncWJoZ2R2aHByZ2lmZXNrYWV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMTMzNjMsImV4cCI6MjA4OTU4OTM2M30.5PwSeTH5KQyooanRBXpmPXwWeL-SexkucYdGpXBVPhs"
);

async function checkUser() {
  console.log('--- DIAGNÓSTICO DE USUÁRIO ---');
  const { data, error } = await supabase
    .from('cap_profiles')
    .select('id, full_name, role, is_active, access_email, access_password')
    .eq('access_email', 'caiofranca@profissional.com')
    .single();

  if (error) {
    console.error('Erro ao buscar usuário:', error.message);
    return;
  }

  console.log('Usuário encontrado:');
  console.log('ID:', data.id);
  console.log('Nome:', data.full_name);
  console.log('Role:', data.role);
  console.log('Ativo:', data.is_active);
  console.log('Email:', data.access_email);
  console.log('Possui senha cadastrada:', !!data.access_password);

  console.log('\n--- TESTANDO LOGIN VIA RPC ---');
  const { data: loginData, error: loginError } = await supabase.rpc('cap_verify_login', {
    p_email: 'caiofranca@profissional.com',
    p_password: '140415'
  });

  if (loginError) {
    console.error('Erro no RPC de Login:', loginError.message);
  } else {
    console.log('Resultado do Login (cap_verify_login):', loginData);
    if (!loginData || loginData.length === 0) {
      console.log('⚠️ O LOGIN FALHOU: Credenciais incorretas ou usuário inativo.');
    } else {
      console.log('✅ LOGIN BEM-SUCEDIDO NO BANCO!');
    }
  }
}

checkUser();
