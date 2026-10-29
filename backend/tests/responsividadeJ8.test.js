import { describe, it, expect } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

describe('J8 (P2) — Responsividade do Painel do Gestor (Mobile, Tablet e Desktop)', () => {
  it('AdminLayout.jsx deve ter breakpoint da sidebar em lg: (1024px+), gaveta retrátil e botão hambúrguer mobile', () => {
    const layoutPath = path.join(rootDir, 'src/components/admin/AdminLayout.jsx');
    expect(fs.existsSync(layoutPath)).toBe(true);

    const content = fs.readFileSync(layoutPath, 'utf8');

    // Sidebar estática/fixa apenas a partir de lg (1024px)
    expect(content).toContain('lg:translate-x-0');
    expect(content).toContain('w-[264px]');
    expect(content).toContain('lg:ml-[264px]');

    // Botão hambúrguer ergonômico no topo para telas menores que lg
    expect(content).toContain('lg:hidden');
    expect(content).toContain('onClick={() => setIsMobileMenuOpen(true)}');

    // Backdrop overlay escurecido para fechar a gaveta mobile
    expect(content).toContain('isMobileMenuOpen');
    expect(content).toContain('bg-black/50 backdrop-blur-xs');

    // Padding adaptativo para telas compactas e grandes
    expect(content).toContain('p-4 sm:p-6 lg:p-8');
  });

  it('GestaoClientes.jsx deve renderizar tabela em desktop (md:block) e cartões ergonômicos no mobile (md:hidden)', () => {
    const clientesPath = path.join(rootDir, 'src/pages/admin/GestaoClientes.jsx');
    expect(fs.existsSync(clientesPath)).toBe(true);

    const content = fs.readFileSync(clientesPath, 'utf8');

    // Tabela oculta no mobile e visível a partir de md
    expect(content).toContain('hidden md:block overflow-x-auto');
    expect(content).toContain('<table');

    // Cartões dedicados para mobile
    expect(content).toContain('md:hidden divide-y divide-line/60');
    
    // Touch targets ergonômicos de no mínimo 44px
    expect(content).toContain('min-h-[44px]');
    
    // Chips de filtros horizontais roláveis sem quebra
    expect(content).toContain('overflow-x-auto');
    expect(content).toContain('scrollbar-none');
    expect(content).toContain('flex-nowrap');
  });

  it('GestaoServicos.jsx deve renderizar tabela em desktop (md:block) e cartões de procedimentos no mobile (md:hidden)', () => {
    const servicosPath = path.join(rootDir, 'src/pages/admin/GestaoServicos.jsx');
    expect(fs.existsSync(servicosPath)).toBe(true);

    const content = fs.readFileSync(servicosPath, 'utf8');

    // Tabela desktop
    expect(content).toContain('hidden md:block overflow-x-auto');
    expect(content).toContain('<table');

    // Cartões mobile
    expect(content.includes('md:hidden divide-y divide-line') || content.includes('md:hidden divide-y divide-surface-variant/60')).toBe(true);

    // Ações de procedimentos com touch targets de 44px
    expect(content).toContain('min-h-[44px]');
  });

  it('GestaoFinanceira.jsx deve ter seletor de período rolável sem quebra no mobile', () => {
    const financeiroPath = path.join(rootDir, 'src/pages/admin/GestaoFinanceira.jsx');
    expect(fs.existsSync(financeiroPath)).toBe(true);

    const content = fs.readFileSync(financeiroPath, 'utf8');

    expect(content).toContain('max-w-full overflow-x-auto scrollbar-none flex-nowrap shrink-0');
  });
});
