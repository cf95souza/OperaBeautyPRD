import { calculateCRC16, formatEMVField, sanitizeEMVText, buildPixStaticPayload } from '../utils/pixEmv.js';
import { testGatewayConnection } from '../services/superadminService.js';

describe('G23 (P1) — Validação de BR Code PIX (BACEN) e Diagnóstico de Gateway', () => {

  describe('1. Cálculo de CRC16-CCITT (Polinômio 0x1021)', () => {
    test('calculateCRC16 deve calcular o checksum oficial de 4 caracteres hexadecimais', () => {
      // Exemplo oficial do manual de padrões de iniciação do Pix (BACEN)
      const sample = '00020126360014BR.GOV.BCB.PIX0114+55119999999952040000530398654041.005802BR5913Fulano de Tal6008BRASILIA62070503***6304';
      const crc = calculateCRC16(sample);

      expect(crc).toBe('B656');
      expect(crc.length).toBe(4);
    });

    test('formatEMVField deve formatar corretamente Tag, Tamanho com 2 dígitos e Valor', () => {
      expect(formatEMVField('00', '01')).toBe('000201');
      expect(formatEMVField('53', '986')).toBe('5303986');
      expect(formatEMVField('58', 'BR')).toBe('5802BR');
      expect(formatEMVField('54', '1.00')).toBe('54041.00');
    });

    test('sanitizeEMVText deve remover acentos e caracteres incompatíveis', () => {
      expect(sanitizeEMVText('Ópera Beauty Salão', 25)).toBe('Opera Beauty Salao');
      expect(sanitizeEMVText('São Paulo - SP', 15)).toBe('Sao Paulo - SP');
    });
  });

  describe('2. Geração de Payload Estático Oficial do PIX', () => {
    test('buildPixStaticPayload deve montar código EMV BR Code válido com chave e valor', () => {
      const pixCode = buildPixStaticPayload({
        pixKey: 'financeiro@operabeauty.tech',
        merchantName: 'OPERA BEAUTY SAAS',
        merchantCity: 'SAO PAULO',
        amount: 1.00,
        txId: 'TESTE001'
      });

      expect(pixCode).toBeDefined();
      expect(pixCode.startsWith('000201')).toBe(true);
      expect(pixCode).toContain('br.gov.bcb.pix');
      expect(pixCode).toContain('financeiro@operabeauty.tech');
      expect(pixCode).toContain('54041.00'); // Tag 54 com valor 1.00
      expect(pixCode).toContain('OPERA BEAUTY SAAS');
      expect(pixCode).toContain('6304');

      // Validar que o CRC16 contido no código corresponde ao cálculo real
      const body = pixCode.slice(0, -4);
      const embeddedCrc = pixCode.slice(-4);
      const computedCrc = calculateCRC16(body);

      expect(embeddedCrc).toBe(computedCrc);
      expect(embeddedCrc).not.toBe('ABCD'); // NUNCA deve ser o placeholder falso
    });
  });

  describe('3. Diagnóstico de Gateway de Pagamento Super Admin', () => {
    test('testGatewayConnection deve rejeitar token com formato inválido', async () => {
      const result = await testGatewayConnection({
        payment_gateway: 'mercadopago',
        gateway_api_key: 'CHAVE_INVALIDA_SEM_PREFIXO'
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Formato de Access Token inválido');
    });

    test('testGatewayConnection deve reconhecer modo Sandbox nativo', async () => {
      const result = await testGatewayConnection({
        payment_gateway: 'sandbox'
      });

      expect(result.success).toBe(true);
      expect(result.is_sandbox).toBe(true);
    });
  });

});
