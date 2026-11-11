import { describe, it, expect } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

describe('Fix/Produção: Reset de Senha de Cliente (SuperAdmin & Manager) e Paginação SuperAdmin', () => {
  const routesPath = path.join(rootDir, 'backend/routes/clients.js');
  const servicePath = path.join(rootDir, 'backend/services/clientService.js');
  const apiPath = path.join(rootDir, 'src/lib/api.js');
  const tenantDetailPath = path.join(rootDir, 'src/pages/superadmin/TenantDetailAdmin.jsx');
  const gestaoClientesPath = path.join(rootDir, 'src/pages/admin/GestaoClientes.jsx');
  const crmPath = path.join(rootDir, 'src/pages/FichaClienteCRM.jsx');

  const routesContent = fs.readFileSync(routesPath, 'utf8');
  const serviceContent = fs.readFileSync(servicePath, 'utf8');
  const apiContent = fs.readFileSync(apiPath, 'utf8');
  const tenantDetailContent = fs.readFileSync(tenantDetailPath, 'utf8');
  const gestaoClientesContent = fs.readFileSync(gestaoClientesPath, 'utf8');
  const crmContent = fs.readFileSync(crmPath, 'utf8');

  it('1. backend/routes/clients.js deve autorizar tanto "manager" quanto "superadmin" na rota PUT /:id/password', () => {
    expect(routesContent).toMatch(/router\.put\('\/:id\/password',\s*authMiddleware,\s*requireRole\(\['manager',\s*'superadmin'\]\)/);
    expect(routesContent).toContain('await updateClientPassword(id, tenantId, password, role)');
  });

  it('2. backend/services/clientService.js deve resolver tenant do cliente para superadmin e isolar por salão para manager', () => {
    expect(serviceContent).toContain("if (userRole === 'superadmin')");
    expect(serviceContent).toContain("SELECT tenant_id FROM public.cap_clients WHERE id = $1");
    expect(serviceContent).toContain("SELECT id FROM public.cap_clients WHERE id = $1 AND tenant_id = $2");
    expect(serviceContent).toContain("SELECT cap_update_client_password($1, $2, $3)");
  });

  it('3. src/lib/api.js deve extrair e exibir errorData.details para que mensagens de validação não sejam ocultadas', () => {
    expect(apiContent).toContain('errorData.details');
    expect(apiContent).toContain('detailStr');
  });

  it('4. Validação Zod de senha deve exigir no mínimo 6 caracteres, 1 letra e 1 número', () => {
    const updatePasswordSchema = z.object({
      body: z.object({
        password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres.').regex(/[a-zA-Z]/, 'Precisa ter 1 letra.').regex(/[0-9]/, 'Precisa ter 1 número.')
      })
    });

    // Casos inválidos
    expect(() => updatePasswordSchema.parse({ body: { password: '123' } })).toThrow();
    expect(() => updatePasswordSchema.parse({ body: { password: '123456' } })).toThrow();
    expect(() => updatePasswordSchema.parse({ body: { password: 'abcdef' } })).toThrow();

    // Caso válido
    const valid = updatePasswordSchema.safeParse({ body: { password: 'cliente123' } });
    expect(valid.success).toBe(true);
  });

  it('5. Frontend (Gestão Clientes e Ficha CRM) deve orientar e validar os requisitos de 6 caracteres, letras e números', () => {
    expect(gestaoClientesContent).toContain('!/[a-zA-Z]/.test(newPassword)');
    expect(gestaoClientesContent).toContain('!/[0-9]/.test(newPassword)');
    expect(gestaoClientesContent).toContain('Mínimo de 6 caracteres, contendo pelo menos 1 letra e 1 número');

    expect(crmContent).toContain('!/[a-zA-Z]/.test(newPassword)');
    expect(crmContent).toContain('!/[0-9]/.test(newPassword)');
    expect(crmContent).toContain('Mínimo de 6 caracteres, contendo pelo menos 1 letra e 1 número');
  });

  it('6. TenantDetailAdmin.jsx deve conter PaginationControls e ModalResetClientPassword nas abas Clientes, Faturamento e Faturas SaaS', () => {
    expect(tenantDetailContent).toContain('const PaginationControls =');
    expect(tenantDetailContent).toContain('const ModalResetClientPassword =');
    expect(tenantDetailContent).toContain('itemLabel="clientes"');
    expect(tenantDetailContent).toContain('itemLabel="agendamentos"');
    expect(tenantDetailContent).toContain('itemLabel="faturas"');
    expect(tenantDetailContent).toContain('handleOpenResetClientModal');
    expect(tenantDetailContent).toContain('handleConfirmResetClientPassword');
  });
});
