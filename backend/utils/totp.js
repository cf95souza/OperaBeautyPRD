import crypto from 'crypto';

// Alfabeto Base32 padrão RFC 4648
const RFC4648_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Converte um Buffer em uma string Base32
 */
export function bufferToBase32(buffer) {
  let bits = 0;
  let value = 0;
  let output = '';

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;

    while (bits >= 5) {
      output += RFC4648_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += RFC4648_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

/**
 * Converte uma string Base32 de volta para Buffer binário
 */
export function base32ToBuffer(base32String) {
  const clean = base32String.toUpperCase().replace(/=+$/, '').replace(/\s+/g, '');
  let bits = 0;
  let value = 0;
  const bytes = [];

  for (let i = 0; i < clean.length; i++) {
    const idx = RFC4648_ALPHABET.indexOf(clean[i]);
    if (idx === -1) {
      throw new Error(`Caractere Base32 inválido: ${clean[i]}`);
    }

    value = (value << 5) | idx;
    bits += 5;

    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

/**
 * Gera um segredo Base32 criptograficamente seguro (20 bytes = 160 bits)
 */
export function generateTotpSecret(bytesLength = 20) {
  const randomBytes = crypto.randomBytes(bytesLength);
  return bufferToBase32(randomBytes);
}

/**
 * Calcula o código TOTP de 6 dígitos para um dado contador/time-step (RFC 4226 / RFC 6238)
 */
export function calculateHotp(secretBuffer, counter) {
  const counterBuffer = Buffer.alloc(8);
  // Escreve uint64 Big-Endian
  counterBuffer.writeBigUInt64BE(BigInt(counter), 0);

  const hmac = crypto.createHmac('sha1', secretBuffer);
  hmac.update(counterBuffer);
  const digest = hmac.digest();

  // Truncamento dinâmico
  const offset = digest[digest.length - 1] & 0xf;
  const codeInt =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);

  const otp = codeInt % 1000000;
  return otp.toString().padStart(6, '0');
}

/**
 * Gera o código TOTP atual para um segredo Base32
 */
export function generateTotp(base32Secret, timestampMs = Date.now(), stepSeconds = 30) {
  const secretBuffer = base32ToBuffer(base32Secret);
  const timeStep = Math.floor(timestampMs / 1000 / stepSeconds);
  return calculateHotp(secretBuffer, timeStep);
}

/**
 * Valida um código TOTP com tolerância de clock drift de ±1 janela (RFC 6238)
 */
export function verifyTotp(inputCode, base32Secret, window = 1, timestampMs = Date.now(), stepSeconds = 30) {
  if (!inputCode || !base32Secret) return false;
  const cleanCode = inputCode.toString().replace(/\D/g, '').trim();
  if (cleanCode.length !== 6) return false;

  let secretBuffer;
  try {
    secretBuffer = base32ToBuffer(base32Secret);
  } catch (err) {
    return false;
  }

  const currentTimeStep = Math.floor(timestampMs / 1000 / stepSeconds);

  for (let offset = -window; offset <= window; offset++) {
    const candidateStep = currentTimeStep + offset;
    const expectedOtp = calculateHotp(secretBuffer, candidateStep);
    // Comparação em tempo constante para mitigar timing attacks
    if (crypto.timingSafeEqual(Buffer.from(cleanCode), Buffer.from(expectedOtp))) {
      return true;
    }
  }

  return false;
}

/**
 * Constrói a URI padrão otpauth:// para clientes móveis (Google Authenticator, Authy, etc)
 */
export function generateOtpAuthUri(label, issuer, base32Secret) {
  const encodedIssuer = encodeURIComponent(issuer);
  const encodedLabel = encodeURIComponent(label);
  return `otpauth://totp/${encodedIssuer}:${encodedLabel}?secret=${base32Secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`;
}
