// ==============================================================================
// OperaBeauty SaaS - Validação de Rebrand do Lookbook Admin
// ==============================================================================

import { describe, it, expect } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

describe('Rebrand do Lookbook Admin (Design System Rosé Editorial)', () => {
  const lookbookPath = path.join(rootDir, 'src/pages/admin/LookbookAdmin.jsx');

  it('1. Arquivo LookbookAdmin.jsx deve existir e conter componentes do Design System', () => {
    expect(fs.existsSync(lookbookPath)).toBe(true);

    const content = fs.readFileSync(lookbookPath, 'utf8');
    expect(content).toContain('EstadoVazio');
    expect(content).toContain('formatCurrency');
    expect(content).toContain('lucide-react');
  });

  it('2. Não deve conter classes legadas obsoletas nem material-symbols-outlined', () => {
    const content = fs.readFileSync(lookbookPath, 'utf8');

    expect(content).not.toContain('material-symbols-outlined');
    expect(content).not.toContain('bg-surface-container-lowest');
    expect(content).not.toContain('font-headline-lg-mobile');
  });

  it('3. Deve suportar tanto upload de arquivos locais quanto link por URL', () => {
    const content = fs.readFileSync(lookbookPath, 'utf8');

    expect(content).toContain('uploadMode');
    expect(content).toContain('api.upload.image');
    expect(content).toContain('handleFileChange');
  });
});
