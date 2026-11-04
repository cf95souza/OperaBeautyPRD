import { describe, it, expect } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

describe('Fix/Backend & Frontend: Inativação e Atualização de Serviços (HTTP 400 - Zod Coerce)', () => {
  const routesPath = path.join(rootDir, 'backend/routes/services.js');
  const servicePath = path.join(rootDir, 'backend/services/catalogService.js');
  const frontPath = path.join(rootDir, 'src/pages/admin/GestaoServicos.jsx');

  it('backend/routes/services.js deve utilizar z.coerce.number() e campos opcionais em updateServiceSchema', () => {
    const content = fs.readFileSync(routesPath, 'utf8');

    // Schema deve aceitar strings monetárias e numéricas retornadas pelo PostgreSQL
    expect(content).toContain('duration_minutes: z.coerce.number().int().positive');
    expect(content).toContain('price: z.coerce.number().positive');
    expect(content).toContain('deposit_amount: z.coerce.number().nonnegative');
    expect(content).toContain('maintenance_days: z.coerce.number().int().nonnegative');
    
    // name, duration e price devem ser opcionais no updateServiceSchema para suportar updates parciais (ex: apenas is_active)
    expect(content).toMatch(/name:\s*z\.string\(\)\.min\(1[^\)]*\)\.optional\(\)/);
  });

  it('backend/services/catalogService.js deve suportar atualizações parciais sem sobrescrever com null', () => {
    const content = fs.readFileSync(servicePath, 'utf8');

    expect(content).toContain('finalName = name !== undefined ? name : oldService.name');
    expect(content).toContain('finalDuration = duration_minutes !== undefined ? duration_minutes : oldService.duration_minutes');
    expect(content).toContain('finalPrice = price !== undefined ? price : oldService.price');
    expect(content).toContain('finalIsActive = is_active !== undefined ? is_active : oldService.is_active');
    expect(content).toContain('if (inputs !== undefined && Array.isArray(inputs))');
  });

  it('src/pages/admin/GestaoServicos.jsx deve sanitizar e converter valores numéricos em handleToggleActive', () => {
    const content = fs.readFileSync(frontPath, 'utf8');

    expect(content).toContain('handleToggleActive');
    expect(content).toContain('parseInt(service.duration_minutes, 10)');
    expect(content).toContain('parseFloat(service.price)');
    expect(content).toContain('is_active: newStatus');
  });
});

