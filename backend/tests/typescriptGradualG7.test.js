// ==============================================================================
// OperaBeauty SaaS - Testes de Tipagem Gradual TypeScript (Item G7 - P2)
// ==============================================================================

import { describe, it, expect } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

describe('G7 (P2) — Tipagem Gradual TypeScript e Contratos de Resposta', () => {

  it('1. Arquivo de contratos centrais src/types/apiContracts.d.ts deve existir com interfaces essenciais', () => {
    const contractsPath = path.join(rootDir, 'src/types/apiContracts.d.ts');
    expect(fs.existsSync(contractsPath)).toBe(true);

    const content = fs.readFileSync(contractsPath, 'utf8');
    expect(content).toContain('export interface User');
    expect(content).toContain('export interface Tenant');
    expect(content).toContain('export interface Appointment');
    expect(content).toContain('export interface Order');
    expect(content).toContain('export interface OrderItem');
    expect(content).toContain('export interface OrderPayment');
    expect(content).toContain('export interface Coupon');
    expect(content).toContain('export interface GiftCard');
    expect(content).toContain('export interface CashRegister');
    expect(content).toContain('export interface Invoice');
  });

  it('2. Arquivo de definição do cliente HTTP src/lib/api.d.ts deve existir com submódulos tipados', () => {
    const apiDefPath = path.join(rootDir, 'src/lib/api.d.ts');
    expect(fs.existsSync(apiDefPath)).toBe(true);

    const content = fs.readFileSync(apiDefPath, 'utf8');
    expect(content).toContain('export interface ApiClient');
    expect(content).toContain('auth:');
    expect(content).toContain('appointments:');
    expect(content).toContain('orders:');
    expect(content).toContain('cashRegister:');
    expect(content).toContain('coupons:');
    expect(content).toContain('giftcards:');
    expect(content).toContain('export declare const api: ApiClient;');
  });

  it('3. Arquivo backend/types/contracts.d.ts deve existir com tipos de sistema', () => {
    const backendContractsPath = path.join(rootDir, 'backend/types/contracts.d.ts');
    expect(fs.existsSync(backendContractsPath)).toBe(true);

    const content = fs.readFileSync(backendContractsPath, 'utf8');
    expect(content).toContain('export interface SystemHealthReport');
    expect(content).toContain('export interface BaseAuditLog');
  });

  it('4. src/lib/api.js deve conter anotações JSDoc referenciando os contratos de TypeScript', () => {
    const apiJsPath = path.join(rootDir, 'src/lib/api.js');
    const content = fs.readFileSync(apiJsPath, 'utf8');

    expect(content).toContain('@typedef {import(\'../types/apiContracts\').User}');
    expect(content).toContain('@typedef {import(\'../types/apiContracts\').Order}');
    expect(content).toContain('@typedef {import(\'../types/apiContracts\').Appointment}');
  });
});
