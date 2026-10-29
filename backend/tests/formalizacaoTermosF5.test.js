import express from 'express';
import request from 'supertest';
import { jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

// Mock isolado do pool do PostgreSQL
const mockDbQuery = jest.fn();
jest.unstable_mockModule('../config/db.js', () => ({
  default: {
    query: mockDbQuery
  }
}));

const {
  generateProtocolNumber,
  createPrivacyRequest,
  getPrivacyRequestStatus,
  listPrivacyRequests,
  updatePrivacyRequestStatus
} = await import('../services/privacyService.js');

const privacyRoutes = (await import('../routes/privacy.js')).default;

const testApp = express();
testApp.use(express.json());
testApp.use('/api/privacy', privacyRoutes);

describe('Fase 45: F5 (P1) — Formalização, Termos e Governança LGPD / DPO', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('1. Validação de Estrutura de Arquivos e Conteúdo Jurídico', () => {
    test('a migração phase37_privacy_dpo_governance.sql deve existir e conter a tabela cap_privacy_requests', () => {
      const sqlPath = path.join(rootDir, 'migrations/phase37_privacy_dpo_governance.sql');
      expect(fs.existsSync(sqlPath)).toBe(true);

      const content = fs.readFileSync(sqlPath, 'utf-8');
      expect(content).toContain('cap_privacy_requests');
      expect(content).toContain('protocol VARCHAR');
      expect(content).toContain('request_type VARCHAR');
      expect(content).toContain('GRANT SELECT, INSERT, UPDATE ON public.cap_privacy_requests TO opera_app');
    });

    test('TermsOfService.jsx deve conter distinção entre Controlador e Operadora e os 4 planos', () => {
      const pagePath = path.join(rootDir, 'src/pages/TermsOfService.jsx');
      expect(fs.existsSync(pagePath)).toBe(true);

      const content = fs.readFileSync(pagePath, 'utf-8');
      expect(content).toContain('O Salão é o Controlador dos seus dados; a OperaBeauty é a Operadora da tecnologia');
      expect(content).toContain('Plano Solo');
      expect(content).toContain('Plano Essencial');
      expect(content).toContain('Plano Premium');
      expect(content).toContain('Plano Signature');
      expect(content).toContain('5 (cinco) dias úteis');
      expect(content).toContain('60 (sessenta) dias');
      expect(content).toContain('99,5%');
    });

    test('PrivacyPolicy.jsx deve conter bases legais da LGPD e canal do encarregado', () => {
      const pagePath = path.join(rootDir, 'src/pages/PrivacyPolicy.jsx');
      expect(fs.existsSync(pagePath)).toBe(true);

      const content = fs.readFileSync(pagePath, 'utf-8');
      expect(content).toContain('Política de Privacidade e Proteção de Dados');
      expect(content).toContain('Controlador dos Dados dos Clientes');
      expect(content).toContain('Operadora Tecnológica dos Dados');
      expect(content).toContain('Art. 18 da LGPD');
      expect(content).toContain('privacidade@operabeauty.com.br');
      expect(content).toContain('TLS 1.3');
    });

    test('CanalPrivacidadeDPO.jsx deve existir e conter formulário de direitos e consulta de protocolo', () => {
      const pagePath = path.join(rootDir, 'src/pages/CanalPrivacidadeDPO.jsx');
      expect(fs.existsSync(pagePath)).toBe(true);

      const content = fs.readFileSync(pagePath, 'utf-8');
      expect(content).toContain('Canal do Encarregado pelo Tratamento de Dados (DPO)');
      expect(content).toContain('Exercer Direitos LGPD');
      expect(content).toContain('Consultar Protocolo');
      expect(content).toContain('LGPD-');
      expect(content).toContain('15 dias');
    });

    test('ContratoOperadoraDPA.jsx deve conter o aditivo formal de operadora de dados', () => {
      const pagePath = path.join(rootDir, 'src/pages/ContratoOperadoraDPA.jsx');
      expect(fs.existsSync(pagePath)).toBe(true);

      const content = fs.readFileSync(pagePath, 'utf-8');
      expect(content).toContain('Contrato de Operadora de Dados Pessoais');
      expect(content).toContain('Data Processing Agreement');
      expect(content).toContain('Art. 39 da Lei Federal nº 13.709/2018');
      expect(content).toContain('48 (quarenta e oito) horas');
    });
  });

  describe('2. Serviço de Privacidade (privacyService.js)', () => {
    test('generateProtocolNumber deve gerar protocolo válido no formato LGPD-AAAAMMDD-XXXX', () => {
      const protocol = generateProtocolNumber();
      expect(protocol).toMatch(/^LGPD-\d{8}-[A-F0-9]{4}$/);
    });

    test('createPrivacyRequest deve validar campos obrigatórios', async () => {
      await expect(createPrivacyRequest({})).rejects.toThrow('obrigatórios');
    });

    test('createPrivacyRequest deve rejeitar tipo de requisição inválido', async () => {
      await expect(createPrivacyRequest({
        name: 'Ana',
        email: 'ana@teste.com',
        request_type: 'tipo_invalido',
        details: 'Gostaria de ver meus dados'
      })).rejects.toThrow('Tipo de solicitação LGPD inválido');
    });

    test('createPrivacyRequest deve salvar requisição e retornar protocolo', async () => {
      mockDbQuery.mockResolvedValueOnce({
        rows: [{
          id: 'request-uuid-1',
          protocol: 'LGPD-20261028-12AB',
          requester_name: 'Camila Cliente',
          requester_email: 'camila@teste.com',
          request_type: 'access',
          status: 'received',
          created_at: new Date()
        }]
      });

      const res = await createPrivacyRequest({
        name: 'Camila Cliente',
        email: 'camila@teste.com',
        request_type: 'access',
        details: 'Quero obter cópia dos meus agendamentos realizados no salão.'
      });

      expect(res.id).toBe('request-uuid-1');
      expect(res.protocol).toBe('LGPD-20261028-12AB');
      expect(res.status).toBe('received');
    });

    test('getPrivacyRequestStatus com protocolo existente retorna dados', async () => {
      mockDbQuery.mockResolvedValueOnce({
        rows: [{
          protocol: 'LGPD-20261028-12AB',
          request_type: 'access',
          status: 'received',
          resolution_notes: null,
          created_at: new Date(),
          resolved_at: null
        }]
      });

      const res = await getPrivacyRequestStatus('LGPD-20261028-12AB');
      expect(res.protocol).toBe('LGPD-20261028-12AB');
      expect(res.status).toBe('received');
    });

    test('getPrivacyRequestStatus com protocolo inexistente lança 404', async () => {
      mockDbQuery.mockResolvedValueOnce({ rows: [] });
      await expect(getPrivacyRequestStatus('LGPD-INEXISTENTE')).rejects.toThrow('não encontrado');
    });
  });

  describe('3. Rotas Express da API de Privacidade (/api/privacy)', () => {
    test('GET /api/privacy/dpo-info deve retornar dados institucionais do DPO', async () => {
      const res = await request(testApp).get('/api/privacy/dpo-info');
      expect(res.status).toBe(200);
      expect(res.body.dpo_email).toBe('privacidade@operabeauty.com.br');
      expect(res.body.operator_role).toContain('Operadora');
      expect(res.body.response_deadline_days).toBe(15);
    });

    test('POST /api/privacy/request com dados válidos retorna 201 Created', async () => {
      mockDbQuery.mockResolvedValueOnce({
        rows: [{
          id: 'req-123',
          protocol: 'LGPD-20261028-88CC',
          requester_name: 'Beatriz Santos',
          requester_email: 'beatriz@teste.com',
          request_type: 'deletion',
          status: 'received',
          created_at: new Date()
        }]
      });

      const res = await request(testApp)
        .post('/api/privacy/request')
        .send({
          name: 'Beatriz Santos',
          email: 'beatriz@teste.com',
          requester_type: 'client',
          request_type: 'deletion',
          details: 'Solicito a exclusão do meu telefone e fotos de procedimento da base.'
        });

      expect(res.status).toBe(201);
      expect(res.body.protocol).toBe('LGPD-20261028-88CC');
      expect(res.body.message).toContain('registrada com sucesso');
    });

    test('POST /api/privacy/request sem dados válidos retorna 400 Bad Request', async () => {
      const res = await request(testApp)
        .post('/api/privacy/request')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Erro de validação');
    });

    test('GET /api/privacy/status/:protocol com código válido retorna 200', async () => {
      mockDbQuery.mockResolvedValueOnce({
        rows: [{
          protocol: 'LGPD-20261028-88CC',
          request_type: 'deletion',
          status: 'under_review',
          resolution_notes: null,
          created_at: new Date()
        }]
      });

      const res = await request(testApp).get('/api/privacy/status/LGPD-20261028-88CC');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('under_review');
    });
  });

});
