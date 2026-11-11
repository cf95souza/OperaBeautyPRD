import { describe, it, expect } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

describe('Fase G36 - Recuperação de Senha por E-mail via Resend & Perfil do Cliente', () => {
  const migrationPath = path.join(rootDir, 'migrations/phase47_client_email_resend_recovery.sql');
  const emailServicePath = path.join(rootDir, 'backend/services/emailService.js');
  const authServicePath = path.join(rootDir, 'backend/services/authService.js');
  const authRoutesPath = path.join(rootDir, 'backend/routes/auth.js');
  const clientsRoutesPath = path.join(rootDir, 'backend/routes/clients.js');
  const clientServicePath = path.join(rootDir, 'backend/services/clientService.js');
  const modalRecoveryPath = path.join(rootDir, 'src/components/auth/ModalRecuperacaoSenha.jsx');
  const modalSolicitarEmailPath = path.join(rootDir, 'src/components/cliente/ModalSolicitarEmail.jsx');
  const perfilClientePath = path.join(rootDir, 'src/pages/PerfilCliente.jsx');
  const homeClientePath = path.join(rootDir, 'src/pages/HomeCliente.jsx');
  const acessoSenhaPath = path.join(rootDir, 'src/pages/AcessoSenha.jsx');
  const dockerComposePath = path.join(rootDir, 'docker-compose.yml');
  const apiPath = path.join(rootDir, 'src/lib/api.js');

  const migrationContent = fs.readFileSync(migrationPath, 'utf8');
  const emailServiceContent = fs.readFileSync(emailServicePath, 'utf8');
  const authServiceContent = fs.readFileSync(authServicePath, 'utf8');
  const authRoutesContent = fs.readFileSync(authRoutesPath, 'utf8');
  const clientsRoutesContent = fs.readFileSync(clientsRoutesPath, 'utf8');
  const clientServiceContent = fs.readFileSync(clientServicePath, 'utf8');
  const modalRecoveryContent = fs.readFileSync(modalRecoveryPath, 'utf8');
  const modalSolicitarEmailContent = fs.readFileSync(modalSolicitarEmailPath, 'utf8');
  const perfilClienteContent = fs.readFileSync(perfilClientePath, 'utf8');
  const homeClienteContent = fs.readFileSync(homeClientePath, 'utf8');
  const acessoSenhaContent = fs.readFileSync(acessoSenhaPath, 'utf8');
  const dockerComposeContent = fs.readFileSync(dockerComposePath, 'utf8');
  const apiContent = fs.readFileSync(apiPath, 'utf8');

  it('1. Migration Phase47 deve adicionar a coluna email e índice em cap_clients', () => {
    expect(migrationContent).toContain('ADD COLUMN IF NOT EXISTS email VARCHAR(255);');
    expect(migrationContent).toContain('CREATE INDEX IF NOT EXISTS idx_cap_clients_email');
  });

  it('2. emailService.js deve integrar com Resend API usando remetente oficial', () => {
    expect(emailServiceContent).toContain('https://api.resend.com/emails');
    expect(emailServiceContent).toContain('recuperacao@operabeauty.tech');
    expect(emailServiceContent).toContain('sendClientPasswordResetOtpEmail');
  });

  it('3. authService.js deve validar data de nascimento para clientes sem e-mail prévio e persistir e-mail após reset', () => {
    expect(authServiceContent).toContain('requestClientEmailOtp');
    expect(authServiceContent).toContain('verifyClientEmailOtpAndResetPassword');
    expect(authServiceContent).toContain('Data de nascimento não confere com o cadastro deste salão.');
    expect(authServiceContent).toContain('UPDATE public.cap_clients');
    expect(authServiceContent).toContain('WHERE id = $2 AND tenant_id = $3');
  });

  it('4. Rotas de auth devem expor endpoints para solicitação e verificação de código por e-mail', () => {
    expect(authRoutesContent).toContain('/client/request-reset-email');
    expect(authRoutesContent).toContain('/client/verify-reset-email');
    expect(authRoutesContent).toContain('requestResetEmailSchema');
    expect(authRoutesContent).toContain('verifyResetEmailSchema');
  });

  it('5. Rotas de clients e clientService devem suportar campo email em getMe, getById e updateMe', () => {
    expect(clientsRoutesContent).toContain("router.get('/me'");
    expect(clientsRoutesContent).toContain("router.put('/me'");
    expect(clientsRoutesContent).toContain('email: z.string().email');
    expect(clientServiceContent).toContain('SELECT id, name, phone, email, birth_date');
    expect(clientServiceContent).toContain('SET name = COALESCE($1, name)');
  });

  it('6. ModalRecuperacaoSenha deve conter fluxos diretos para envio por e-mail sem WhatsApp', () => {
    expect(modalRecoveryContent).toContain('handleSendEmailOtp');
    expect(modalRecoveryContent).toContain('handleVerifyEmailOtp');
    expect(modalRecoveryContent).toContain('handleSaveNewPassword');
    expect(modalRecoveryContent).toContain('Recuperar por E-mail');
  });

  it('7. ModalSolicitarEmail e HomeCliente devem convidar clientes sem e-mail com botão X e OK para perfil', () => {
    expect(modalSolicitarEmailContent).toContain('ModalSolicitarEmail');
    expect(modalSolicitarEmailContent).toContain('operabeauty_dismiss_email_modal');
    expect(modalSolicitarEmailContent).toContain('OK, Cadastrar E-mail');
    expect(homeClienteContent).toContain('<ModalSolicitarEmail');
  });

  it('8. PerfilCliente deve exibir input de e-mail opcional e salvar via updateMe', () => {
    expect(perfilClienteContent).toContain('email-cliente');
    expect(perfilClienteContent).toContain('E-mail para Recuperação de Senha');
    expect(perfilClienteContent).toContain('api.clients.updateMe');
  });

  it('9. Validação Zod de e-mail deve aceitar e-mails válidos e rejeitar formatos inválidos', () => {
    const emailSchema = z.string().email('E-mail inválido.');
    expect(emailSchema.safeParse('cliente@gmail.com').success).toBe(true);
    expect(emailSchema.safeParse('teste.beauty@operabeauty.tech').success).toBe(true);
    expect(emailSchema.safeParse('invalido').success).toBe(false);
    expect(emailSchema.safeParse('@semusuario.com').success).toBe(false);
  });

  it('10. AcessoSenha deve disponibilizar botão Entrar com código por E-mail em substituição ao WhatsApp', () => {
    expect(acessoSenhaContent).toContain('Entrar com código por E-mail');
    expect(acessoSenhaContent).not.toContain('Entrar com código via WhatsApp');
  });

  it('11. docker-compose.yml deve injetar RESEND_API_KEY no container da API', () => {
    expect(dockerComposeContent).toContain('RESEND_API_KEY: ${RESEND_API_KEY}');
  });
});
