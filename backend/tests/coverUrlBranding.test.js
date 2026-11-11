import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

describe('Fase G37 - Foto de Capa / Fachada (Tela de Entrada) e Enquadramento com Zoom-out', () => {
  test('1. Migration Phase48 deve adicionar a coluna cover_url em cap_tenants', () => {
    const migrationPath = path.join(rootDir, 'migrations', 'phase48_add_cover_url_to_tenants.sql');
    expect(fs.existsSync(migrationPath)).toBe(true);
    const sql = fs.readFileSync(migrationPath, 'utf8');
    expect(sql).toMatch(/ALTER\s+TABLE\s+public\.cap_tenants/i);
    expect(sql).toMatch(/ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS\s+cover_url\s+TEXT/i);
  });

  test('2. backend/services/tenantService.js deve selecionar e persistir cover_url em getTenantBySlug e updateBranding', () => {
    const servicePath = path.join(rootDir, 'backend', 'services', 'tenantService.js');
    const content = fs.readFileSync(servicePath, 'utf8');
    expect(content).toContain('t.cover_url');
    expect(content).toContain('cover_url = COALESCE($6, cover_url)');
    expect(content).toMatch(/RETURNING.*cover_url/);
  });

  test('3. backend/routes/tenants.js deve validar e aceitar cover_url no schema de branding', () => {
    const routePath = path.join(rootDir, 'backend', 'routes', 'tenants.js');
    const content = fs.readFileSync(routePath, 'utf8');
    expect(content).toMatch(/cover_url:\s*z\.string\(\)\.nullable\(\)\.optional\(\)/);
    expect(content).toContain('cover_url,');
  });

  test('4. ModalRecorteImagem.jsx deve suportar zoom-out (< 100%) e enquadramento de fotos verticais/grandes', () => {
    const modalPath = path.join(rootDir, 'src', 'components', 'ui', 'ModalRecorteImagem.jsx');
    const content = fs.readFileSync(modalPath, 'utf8');
    expect(content).toMatch(/min="0\.4"/);
    expect(content).toMatch(/max="3"/);
    expect(content).toMatch(/zoom_out/);
    expect(content).toMatch(/zoom_in/);
    expect(content).toContain('center_focus_strong');
    expect(content).toMatch(/maxWidth:\s*'100%'/);
    expect(content).toMatch(/maxHeight:\s*'100%'/);
  });

  test('5. BrandingCustomizacao.jsx deve conter seção dedicada para Foto de Capa / Fachada separada de Banners', () => {
    const brandingPath = path.join(rootDir, 'src', 'pages', 'admin', 'BrandingCustomizacao.jsx');
    const content = fs.readFileSync(brandingPath, 'utf8');
    expect(content).toContain('Foto de Capa / Fachada (Tela de Entrada)');
    expect(content).toContain('handleTriggerCoverUpload');
    expect(content).toContain('handleCoverFileChange');
    expect(content).toContain("cropTarget === 'cover'");
    expect(content).toContain('cover_url: branding.cover_url');
  });

  test('6. AcessoTelefone.jsx e AcessoSenha.jsx devem exibir tenant.cover_url com fallback para banner_url', () => {
    const acessoTelPath = path.join(rootDir, 'src', 'pages', 'AcessoTelefone.jsx');
    const acessoSenhaPath = path.join(rootDir, 'src', 'pages', 'AcessoSenha.jsx');
    const telContent = fs.readFileSync(acessoTelPath, 'utf8');
    const senhaContent = fs.readFileSync(acessoSenhaPath, 'utf8');
    expect(telContent).toContain('tenant?.cover_url || tenant?.banner_url');
    expect(senhaContent).toContain('tenant?.cover_url || tenant?.banner_url');
  });
});
