/**
 * Utilitário Oficial para Geração e Validação de BR Code / PIX (Padrão BACEN / EMVCo)
 * OperaBeauty SaaS - Fase 44 & 45
 */

/**
 * Calcula o CRC16-CCITT (Polinômio 0x1021, Valor inicial 0xFFFF)
 * conforme a especificação oficial do Banco Central do Brasil para PIX.
 *
 * @param {string} payload - String completa do payload EMV incluindo o prefixo da Tag 63 ('6304')
 * @returns {string} Checksum hexadecimal de 4 dígitos em caixa alta (ex: 'B656')
 */
export function calculateCRC16(payload) {
  let crc = 0xFFFF;
  const polynomial = 0x1021;

  for (let i = 0; i < payload.length; i++) {
    crc ^= (payload.charCodeAt(i) << 8);
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ polynomial) & 0xFFFF;
      } else {
        crc = (crc << 1) & 0xFFFF;
      }
    }
  }

  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Formata um campo no padrão TLV (Tag-Length-Value) do padrão EMVCo
 *
 * @param {string} id - Identificador de 2 dígitos da Tag (ex: '00', '26', '54')
 * @param {string} value - Valor do campo
 * @returns {string} Campo formatado (ex: '000201')
 */
export function formatEMVField(id, value) {
  if (value === undefined || value === null) return '';
  const strVal = String(value);
  const len = strVal.length.toString().padStart(2, '0');
  return `${id}${len}${strVal}`;
}

/**
 * Remove acentos e caracteres especiais para compatibilidade com o padrão EMV
 *
 * @param {string} str - Texto de entrada
 * @param {number} maxLen - Tamanho máximo permitido
 * @returns {string} Texto sanitizado
 */
export function sanitizeEMVText(str, maxLen = 25) {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/[^a-zA-Z0-9\s-_]/g, '') // remove pontuação estranha
    .trim()
    .slice(0, maxLen);
}

/**
 * Monta o payload estático oficial do PIX (EMV BR Code) com CRC16 válido
 *
 * @param {Object} params
 * @param {string} params.pixKey - Chave PIX (E-mail, CPF, CNPJ, Telefone ou Chave Aleatória)
 * @param {string} params.merchantName - Nome do titular / recebedor (max 25 chars)
 * @param {string} params.merchantCity - Cidade do recebedor (max 15 chars)
 * @param {number|string} params.amount - Valor da cobrança (opcional, formatado com 2 decimais)
 * @param {string} params.txId - Identificador único da transação (opcional, até 25 chars, padrão '***')
 * @param {string} params.description - Descrição opcional (até 25 chars)
 * @returns {string} Código PIX Copia e Cola 100% válido
 */
export function buildPixStaticPayload({
  pixKey,
  merchantName = 'OPERA BEAUTY SAAS',
  merchantCity = 'SAO PAULO',
  amount = null,
  txId = '***',
  description = ''
}) {
  if (!pixKey) {
    throw new Error('Chave PIX é obrigatória para montar o payload EMV.');
  }

  // 1. Tag 00 - Payload Format Indicator (Fixo: 01)
  let payload = formatEMVField('00', '01');

  // 2. Tag 26 - Merchant Account Information (GUI br.gov.bcb.pix + Chave + Descrição)
  let tag26Content = formatEMVField('00', 'br.gov.bcb.pix');
  tag26Content += formatEMVField('01', pixKey.trim());
  if (description) {
    tag26Content += formatEMVField('02', sanitizeEMVText(description, 25));
  }
  payload += formatEMVField('26', tag26Content);

  // 3. Tag 52 - Merchant Category Code (Fixo: 0000 para MCC padrão)
  payload += formatEMVField('52', '0000');

  // 4. Tag 53 - Transaction Currency (Fixo: 986 para Real Brasileiro)
  payload += formatEMVField('53', '986');

  // 5. Tag 54 - Transaction Amount (Opcional, com 2 casas decimais)
  if (amount !== null && amount !== undefined && Number(amount) > 0) {
    const formattedAmount = Number(amount).toFixed(2);
    payload += formatEMVField('54', formattedAmount);
  }

  // 6. Tag 58 - Country Code (Fixo: BR)
  payload += formatEMVField('58', 'BR');

  // 7. Tag 59 - Merchant Name (Max 25 caracteres, sem acentos)
  payload += formatEMVField('59', sanitizeEMVText(merchantName, 25));

  // 8. Tag 60 - Merchant City (Max 15 caracteres, sem acentos)
  payload += formatEMVField('60', sanitizeEMVText(merchantCity, 15));

  // 9. Tag 62 - Additional Data Field Template (Subtag 05: txId / Reference Label)
  const cleanTxId = sanitizeEMVText(txId, 25) || '***';
  const tag62Content = formatEMVField('05', cleanTxId);
  payload += formatEMVField('62', tag62Content);

  // 10. Tag 63 - CRC16 (Calculado sobre toda a string incluindo '6304')
  const payloadWithTag63Prefix = `${payload}6304`;
  const crc16 = calculateCRC16(payloadWithTag63Prefix);

  return `${payloadWithTag63Prefix}${crc16}`;
}

