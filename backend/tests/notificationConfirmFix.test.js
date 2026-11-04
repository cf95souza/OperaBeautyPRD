import { describe, it, expect } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

describe('NotificationProvider — Suporte a confirm({ title, message }) e strings', () => {
  const providerPath = path.join(rootDir, 'src/context/NotificationProvider.jsx');
  const content = fs.readFileSync(providerPath, 'utf8');

  it('deve desempacotar options como objeto e como string para evitar React Error #31', () => {
    expect(content).toContain("typeof messageOrOptions === 'object'");
    expect(content).toContain("message = messageOrOptions.message");
    expect(content).toContain("title = messageOrOptions.title");
  });
});

