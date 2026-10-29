import { describe, it, expect } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

describe('J7 (P1) — Estados Vazios Padrão (Design System Rosé Editorial)', () => {
  it('deve ter o componente universal EstadoVazio.jsx com tokens Rosé Editorial', () => {
    const estadoVazioPath = path.join(rootDir, 'src/components/ui/EstadoVazio.jsx');
    expect(fs.existsSync(estadoVazioPath)).toBe(true);
    
    const content = fs.readFileSync(estadoVazioPath, 'utf8');
    // Deve conter classes de design Rosé Editorial e estrutura de ação
    expect(content).toContain('bg-[#F6E4E4]');
    expect(content).toContain('text-brand');
    expect(content).toContain('textoAcao');
    expect(content).toContain('aoClicarAcao');
  });

  it('GestaoEquipe.jsx deve integrar o componente EstadoVazio', () => {
    const filePath = path.join(rootDir, 'src/pages/admin/GestaoEquipe.jsx');
    const content = fs.readFileSync(filePath, 'utf8');
    expect(content).toContain("import { EstadoVazio } from '../../components/ui/EstadoVazio'");
    expect(content).toContain('<EstadoVazio');
    expect(content).toContain('Nenhum profissional cadastrado');
    expect(content).not.toContain('<div className="text-center p-xl text-secondary">Nenhum profissional cadastrado.</div>');
  });

  it('ControleEstoque.jsx deve integrar o componente EstadoVazio', () => {
    const filePath = path.join(rootDir, 'src/pages/admin/ControleEstoque.jsx');
    const content = fs.readFileSync(filePath, 'utf8');
    expect(content).toContain("import { EstadoVazio } from '../../components/ui/EstadoVazio'");
    expect(content).toContain('<EstadoVazio');
    expect(content).not.toContain('<div className="text-center p-xl text-secondary">Nenhum item encontrado no estoque.</div>');
  });

  it('GestaoServicos.jsx deve integrar o componente EstadoVazio', () => {
    const filePath = path.join(rootDir, 'src/pages/admin/GestaoServicos.jsx');
    const content = fs.readFileSync(filePath, 'utf8');
    expect(content).toContain("import { EstadoVazio } from '../../components/ui/EstadoVazio'");
    expect(content).toContain('<EstadoVazio');
    expect(content).not.toContain('<p>Nenhum serviço cadastrado ainda.</p>');
  });

  it('GestaoGiftCards.jsx deve integrar o componente EstadoVazio', () => {
    const filePath = path.join(rootDir, 'src/pages/admin/GestaoGiftCards.jsx');
    const content = fs.readFileSync(filePath, 'utf8');
    expect(content).toContain("import { EstadoVazio } from '../../components/ui/EstadoVazio'");
    expect(content).toContain('<EstadoVazio');
    expect(content).not.toContain('Nenhum vale-presente encontrado.');
  });

  it('GestaoAssinaturas.jsx deve integrar o componente EstadoVazio nas abas de planos e assinantes', () => {
    const filePath = path.join(rootDir, 'src/pages/admin/GestaoAssinaturas.jsx');
    const content = fs.readFileSync(filePath, 'utf8');
    expect(content).toContain("import { EstadoVazio } from '../../components/ui/EstadoVazio'");
    expect(content).toContain('<EstadoVazio');
    expect(content).toContain('titulo="Nenhum plano criado ainda"');
    expect(content).toContain('titulo="Nenhuma cliente assinante ainda"');
  });

  it('Telas do Super Admin (Equipe, Avisos, Feature Flags e Auditoria) devem usar EstadoVazio', () => {
    const equipePath = path.join(rootDir, 'src/pages/superadmin/EquipeAdmin.jsx');
    const avisosPath = path.join(rootDir, 'src/pages/superadmin/AvisosAdmin.jsx');
    const flagsPath = path.join(rootDir, 'src/pages/superadmin/FeatureFlagsAdmin.jsx');
    const auditoriaPath = path.join(rootDir, 'src/pages/superadmin/AuditoriaAdmin.jsx');

    expect(fs.readFileSync(equipePath, 'utf8')).toContain('<EstadoVazio');
    expect(fs.readFileSync(avisosPath, 'utf8')).toContain('<EstadoVazio');
    expect(fs.readFileSync(flagsPath, 'utf8')).toContain('<EstadoVazio');
    expect(fs.readFileSync(auditoriaPath, 'utf8')).toContain('<EstadoVazio');
  });
});
