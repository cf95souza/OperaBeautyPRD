#!/usr/bin/env node
import crypto from 'crypto';

/**
 * OperaBeauty — Utilitário de Geração de Segredos Criptográficos (C4 - P0)
 * Gera chaves de alta entropia para ambientes de homologação e produção.
 */

function generateSecret(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

console.log('================================================================');
console.log('  OperaBeauty — Gerador de Segredos Criptográficos Fortes (C4)  ');
console.log('================================================================\n');

const jwtSecret = generateSecret(32);
const encryptionKey = generateSecret(32);
const backupKey = generateSecret(32);
const dbPassword = generateSecret(24);

console.log('# Copie as variáveis abaixo para o seu arquivo .env em produção:');
console.log(`JWT_SECRET=${jwtSecret}`);
console.log(`ENCRYPTION_KEY=${encryptionKey}`);
console.log(`BACKUP_ENCRYPTION_KEY=${backupKey}`);
console.log(`DB_PASSWORD=${dbPassword}`);
console.log('\n# Lembre-se de restringir a permissão do arquivo no Linux:');
console.log('chmod 600 .env\n');
console.log('================================================================');
