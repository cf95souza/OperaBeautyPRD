import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../app.js';
import { PRIVATE_UPLOADS_DIR } from '../routes/privateUploads.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

describe('C8 (P1) — Fotos do CRM Privadas e Protegidas (Plano §4·C8 & J6)', () => {
  const tenant1 = '69d1f386-17ef-490f-9c7c-8b276f27b6d2'; // Studio Thais
  const tenant2 = 'e1a3d902-8f1b-4b2a-9e12-345678901234'; // Outro salão
  const secret = process.env.JWT_SECRET || 'test-secret';

  const staffTokenTenant1 = jwt.sign(
    { id: 'staff-1', tenant_id: tenant1, role: 'manager' },
    secret,
    { expiresIn: '1h' }
  );

  const staffTokenTenant2 = jwt.sign(
    { id: 'staff-2', tenant_id: tenant2, role: 'manager' },
    secret,
    { expiresIn: '1h' }
  );

  const superAdminToken = jwt.sign(
    { id: 'admin-1', role: 'superadmin' },
    secret,
    { expiresIn: '1h' }
  );

  const testFileName = `test-crm-${Date.now()}.jpg`;
  const tenant1Dir = path.join(PRIVATE_UPLOADS_DIR, tenant1);
  const testFilePath = path.join(tenant1Dir, testFileName);

  beforeAll(() => {
    if (!fs.existsSync(tenant1Dir)) {
      fs.mkdirSync(tenant1Dir, { recursive: true });
    }
    // Cria arquivo de teste temporário no diretório privado do tenant 1
    fs.writeFileSync(testFilePath, 'DADOS_IMAGEM_CRM_TESTE');
  });

  afterAll(() => {
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
  });

  describe('1. Bloqueio de Acesso Anônimo e Direto', () => {
    test('Acesso anônimo a /api/uploads/crm/:tenantId/:filename deve ser recusado com 401', async () => {
      const res = await request(app).get(`/api/uploads/crm/${tenant1}/${testFileName}`);
      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/Autenticação obrigatória/i);
    });

    test('Tentativa de acesso direto a /uploads/crm/ deve ser bloqueada com 403', async () => {
      const res = await request(app).get(`/uploads/crm/${testFileName}`);
      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/Acesso negado.*rota autenticada/i);
    });
  });

  describe('2. Isolamento Multi-Tenant em Profundidade (Cross-Tenant Leakage)', () => {
    test('Usuário autenticado do Tenant 2 NÃO deve acessar fotos do CRM do Tenant 1 (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/api/uploads/crm/${tenant1}/${testFileName}`)
        .set('Authorization', `Bearer ${staffTokenTenant2}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/você não tem permissão para acessar prontuários deste salão/i);
    });
  });

  describe('3. Acesso Autorizado da Equipe e Superadmin', () => {
    test('Gestor/Profissional do mesmo tenant deve acessar a foto com sucesso (200 OK)', async () => {
      const res = await request(app)
        .get(`/api/uploads/crm/${tenant1}/${testFileName}`)
        .set('Authorization', `Bearer ${staffTokenTenant1}`);

      expect(res.status).toBe(200);
      const content = res.text || (Buffer.isBuffer(res.body) ? res.body.toString('utf8') : '');
      expect(content).toBe('DADOS_IMAGEM_CRM_TESTE');
      expect(res.headers['cache-control']).toMatch(/private/);
      expect(res.headers['x-content-type-options']).toBe('nosniff');
    });

    test('Deve permitir autenticação via Query Param (?token=...) para tags <img> no navegador', async () => {
      const res = await request(app)
        .get(`/api/uploads/crm/${tenant1}/${testFileName}?token=${staffTokenTenant1}`);

      expect(res.status).toBe(200);
      const content = res.text || (Buffer.isBuffer(res.body) ? res.body.toString('utf8') : '');
      expect(content).toBe('DADOS_IMAGEM_CRM_TESTE');
      expect(res.headers['cache-control']).toMatch(/private/);
    });

    test('Superadmin deve ter acesso de auditoria e suporte técnico (200 OK)', async () => {
      const res = await request(app)
        .get(`/api/uploads/crm/${tenant1}/${testFileName}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      const content = res.text || (Buffer.isBuffer(res.body) ? res.body.toString('utf8') : '');
      expect(content).toBe('DADOS_IMAGEM_CRM_TESTE');
    });

    test('Deve retornar 404 para arquivo que não existe fisicamente no prontuário', async () => {
      const res = await request(app)
        .get(`/api/uploads/crm/${tenant1}/arquivo-inexistente-${Date.now()}.jpg`)
        .set('Authorization', `Bearer ${staffTokenTenant1}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toMatch(/não encontrado/i);
    });
  });

  describe('4. Auditoria de Código e Componente Frontend (FichaClienteCRM.jsx)', () => {
    test('FichaClienteCRM.jsx deve injetar token em requisições de imagem de CRM', () => {
      const fichaPath = path.join(rootDir, 'src/pages/FichaClienteCRM.jsx');
      const content = fs.readFileSync(fichaPath, 'utf8');

      expect(content).toContain('ImagemAnexoTimeline');
      expect(content).toMatch(/base\.includes\('\/uploads\/crm'\)/);
      expect(content).toMatch(/token=\$\{encodeURIComponent\(token\)\}/);
      expect(content).toContain('Tentar de novo');
    });

    test('backend/routes/clients.js deve salvar fotos do CRM em diretório privado com nomes criptográficos', () => {
      const clientsRoutePath = path.join(rootDir, 'backend/routes/clients.js');
      const content = fs.readFileSync(clientsRoutePath, 'utf8');

      expect(content).toContain('PRIVATE_UPLOADS_DIR');
      expect(content).toContain('uploadCrmImage.single');
      expect(content).toMatch(/crypto\.randomBytes\(24\)\.toString\('hex'\)/);
      expect(content).toContain('/api/uploads/crm/');
    });
  });
});
