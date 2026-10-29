import assert from 'assert';
import pool from './config/db.js';
import {
  saveTenantGatewayConfig,
  getTenantGatewayConfig,
  createDepositCharge,
  confirmDepositPayment
} from './services/paymentGatewayService.js';
import { decrypt } from './utils/crypto.js';

async function runE2E() {
  console.log('🚀 Iniciando Teste de Integração E2E do Sinal PIX (Item D3)...');

  let testTenantId;
  let testClientId;
  let testServiceId;
  let testStaffId;
  let testAppointmentId;

  try {
    // 1. Criar Tenant de Teste
    const tenantRes = await pool.query(
      `INSERT INTO public.cap_tenants (name, slug) 
       VALUES ('Studio E2E PIX', 'studio-e2e-pix-' || floor(random()*10000)) 
       RETURNING id`
    );
    testTenantId = tenantRes.rows[0].id;
    console.log('  ✓ 1. Tenant de Teste criado:', testTenantId);

    // 2. Criar Cliente de Teste
    const clientRes = await pool.query(
      `INSERT INTO public.cap_clients (tenant_id, name, phone, password_hash)
       VALUES ($1, 'Cliente E2E PIX', '11999998888', 'hash123')
       RETURNING id`,
      [testTenantId]
    );
    testClientId = clientRes.rows[0].id;
    console.log('  ✓ 2. Cliente de Teste criado:', testClientId);

    // 3. Criar Profissional de Teste
    const staffRes = await pool.query(
      `INSERT INTO public.cap_staff (tenant_id, name, phone, email, password_hash, role)
       VALUES ($1, 'Profissional E2E', '11988887777', 'staff-e2e@teste.com', 'hash123', 'professional')
       RETURNING id`,
      [testTenantId]
    );
    testStaffId = staffRes.rows[0].id;
    console.log('  ✓ 3. Profissional criado:', testStaffId);

    // 4. Criar Serviço com Sinal Exigido de 30%
    const serviceRes = await pool.query(
      `INSERT INTO public.cap_services (tenant_id, name, duration_minutes, price, requires_deposit, deposit_type, deposit_amount)
       VALUES ($1, 'Mechas & Luzes E2E', 120, 200.00, true, 'percentage', 30.00)
       RETURNING id`,
      [testTenantId]
    );
    testServiceId = serviceRes.rows[0].id;
    console.log('  ✓ 4. Serviço com 30% de sinal criado:', testServiceId);

    // 5. Criar Agendamento de Teste
    const startTime = new Date(Date.now() + 24 * 3600 * 1000);
    const endTime = new Date(startTime.getTime() + 2 * 3600 * 1000);
    const apptRes = await pool.query(
      `INSERT INTO public.cap_appointments (tenant_id, client_id, staff_id, service_id, start_time, end_time, total_price, status)
       VALUES ($1, $2, $3, $4, $5, $6, 200.00, 'scheduled')
       RETURNING id`,
      [testTenantId, testClientId, testStaffId, testServiceId, startTime, endTime]
    );
    testAppointmentId = apptRes.rows[0].id;
    console.log('  ✓ 5. Agendamento criado:', testAppointmentId);

    // TESTE 1: Salvar configuração com credenciais criptografadas em AES-256-GCM
    const configData = {
      provider: 'mercadopago',
      is_active: true,
      sandbox_mode: true,
      deposit_expiration_minutes: 20,
      credentials: {
        accessToken: 'TEST-SECRET-TOKEN-123456',
        publicKey: 'TEST-PUBLIC-KEY-ABCDEF'
      },
      holder_name: 'Studio Teste Ltda',
      instructions: 'Pague o sinal em até 20 minutos para garantir o horário.'
    };

    const saved = await saveTenantGatewayConfig(testTenantId, configData);
    assert.strictEqual(saved.provider, 'mercadopago');
    assert.strictEqual(saved.deposit_expiration_minutes, 20);

    const rawDbRes = await pool.query(
      'SELECT encrypted_credentials FROM public.cap_tenant_gateway_configs WHERE tenant_id = $1',
      [testTenantId]
    );
    const rawCredentials = rawDbRes.rows[0].encrypted_credentials;
    assert.ok(!rawCredentials.includes('TEST-SECRET-TOKEN-123456'), 'Credenciais não podem estar em texto plano');
    assert.strictEqual(rawCredentials.split(':').length, 3, 'Formato IV:Tag:Ciphertext');

    const decryptedJson = JSON.parse(decrypt(rawCredentials));
    assert.strictEqual(decryptedJson.accessToken, 'TEST-SECRET-TOKEN-123456');
    console.log('  ✅ TESTE 1 APROVADO: Gateway híbrido salvo e credenciais criptografadas em AES-256-GCM.');

    // TESTE 2: Alterar para outro provedor (Asaas)
    const asaasConfig = {
      provider: 'asaas',
      is_active: true,
      sandbox_mode: false,
      deposit_expiration_minutes: 15,
      credentials: { apiKey: 'asaas_key_privada_987654' },
      pix_key: 'contato@studioteste.com',
      pix_key_type: 'email'
    };
    await saveTenantGatewayConfig(testTenantId, asaasConfig);
    const loaded = await getTenantGatewayConfig(testTenantId);
    assert.strictEqual(loaded.provider, 'asaas');
    assert.strictEqual(loaded.credentials.apiKey, 'asaas_key_privada_987654');
    console.log('  ✅ TESTE 2 APROVADO: Troca dinâmica de provedor validada com sucesso.');

    // TESTE 3: Gerar cobrança de sinal PIX (Modo Sandbox / Simulador)
    await saveTenantGatewayConfig(testTenantId, {
      provider: 'simulator',
      is_active: true,
      sandbox_mode: true,
      deposit_expiration_minutes: 15
    });

    const charge = await createDepositCharge({
      tenantId: testTenantId,
      appointmentId: testAppointmentId,
      amount: 60.00,
      client: { name: 'Cliente E2E PIX', phone: '11999998888' },
      serviceName: 'Mechas & Luzes E2E'
    });

    assert.ok(charge.pixCode.includes('00020126580014br.gov.bcb.pix'));
    assert.ok(charge.paymentId);

    const apptDb = await pool.query(
      'SELECT deposit_status, deposit_amount, deposit_payment_id FROM public.cap_appointments WHERE id = $1',
      [testAppointmentId]
    );
    assert.strictEqual(apptDb.rows[0].deposit_status, 'pending');
    assert.strictEqual(Number(apptDb.rows[0].deposit_amount), 60.00);
    assert.strictEqual(apptDb.rows[0].deposit_payment_id, charge.paymentId);
    console.log('  ✅ TESTE 3 APROVADO: Cobrança PIX gerada e agendamento atualizado para status pending.');

    // TESTE 4: Confirmar pagamento de forma atômica e idempotente
    const paymentId = apptDb.rows[0].deposit_payment_id;
    const firstConfirm = await confirmDepositPayment(testTenantId, paymentId, 'simulator');
    assert.strictEqual(firstConfirm.success, true);
    assert.strictEqual(firstConfirm.alreadyPaid, false);

    const updatedAppt = await pool.query(
      'SELECT deposit_status, status, deposit_paid_at FROM public.cap_appointments WHERE id = $1',
      [testAppointmentId]
    );
    assert.strictEqual(updatedAppt.rows[0].deposit_status, 'paid');
    assert.strictEqual(updatedAppt.rows[0].status, 'confirmed');
    assert.ok(updatedAppt.rows[0].deposit_paid_at);

    const noteRes = await pool.query(
      'SELECT content FROM public.cap_timeline_notes WHERE appointment_id = $1',
      [testAppointmentId]
    );
    assert.ok(noteRes.rows.length > 0);
    assert.ok(noteRes.rows[0].content.includes('Sinal de R$ 60.00 pago com sucesso via PIX'));

    // Idempotência
    const secondConfirm = await confirmDepositPayment(testTenantId, paymentId, 'simulator');
    assert.strictEqual(secondConfirm.success, true);
    assert.strictEqual(secondConfirm.alreadyPaid, true);
    console.log('  ✅ TESTE 4 APROVADO: Confirmação atômica, idempotente e nota no CRM geradas com sucesso.');

    console.log('\n🎉 TODOS OS 4 TESTES E2E DO SINAL PIX (ITEM D3) FORAM HOMOLOGADOS COM 100% DE SUCESSO NO DOCKER!');
  } finally {
    if (testTenantId) {
      await pool.query('DELETE FROM public.cap_tenants WHERE id = $1', [testTenantId]);
      console.log('🧹 Limpeza dos dados de teste concluída.');
    }
    await pool.end();
  }
}

runE2E().catch((err) => {
  console.error('❌ ERRO NO TESTE E2E:', err);
  process.exit(1);
});
