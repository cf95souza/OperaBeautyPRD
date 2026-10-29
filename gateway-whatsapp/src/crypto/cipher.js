import crypto from 'node:crypto';

/**
 * Módulo Criptográfico AES-256-GCM para Sessões do WhatsApp Gateway
 * Governança: 01-security-constitution & Fase 44 (D2)
 *
 * Características:
 * - Algoritmo: aes-256-gcm (Autenticação e Confidencialidade)
 * - IV: 12 bytes gerados por CSPRNG a cada cifragem
 * - AuthTag: 16 bytes para validação de integridade contra adulteração
 * - Formato serializado: enc:v1:<iv_hex>:<tag_hex>:<ciphertext_hex>
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // Recomendado para GCM
const PREFIX = 'enc:v1:';

/**
 * Deriva uma chave de 32 bytes (256 bits) a partir do segredo fornecido
 */
function getDerivedKey(customKey) {
  const secret = customKey || process.env.WHATSAPP_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY || 'operabeauty-wa-master-key-32chars-fallback-secure';
  return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Criptografa uma string em AES-256-GCM
 * @param {string} text - Texto em claro
 * @param {string} [customKey] - Chave opcional de override
 * @returns {string} Payload seguro formatado
 */
export function encrypt(text, customKey) {
  if (typeof text !== 'string') {
    text = JSON.stringify(text);
  }

  const key = getDerivedKey(customKey);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const tag = cipher.getAuthTag();

  return `${PREFIX}${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
}

/**
 * Decriptografa um payload seguro AES-256-GCM
 * @param {string} encryptedPayload - Formato enc:v1:<iv>:<tag>:<ciphertext>
 * @param {string} [customKey] - Chave opcional de override
 * @returns {string} Texto em claro original
 */
export function decrypt(encryptedPayload, customKey) {
  if (!encryptedPayload || typeof encryptedPayload !== 'string') {
    throw new Error('Payload criptografado inválido');
  }

  if (!encryptedPayload.startsWith(PREFIX)) {
    // Se não tiver o prefixo seguro enc:v1:, recusa decriptação para evitar parsing de dados corrompidos
    throw new Error('Formato criptográfico não reconhecido ou inseguro');
  }

  const payload = encryptedPayload.slice(PREFIX.length);
  const parts = payload.split(':');

  if (parts.length !== 3) {
    throw new Error('Estrutura de payload AES-256-GCM inválida');
  }

  const [ivHex, tagHex, cipherHex] = parts;
  const key = getDerivedKey(customKey);
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(cipherHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

export default {
  encrypt,
  decrypt,
};
