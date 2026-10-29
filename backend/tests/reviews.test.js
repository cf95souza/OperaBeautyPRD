import { describe, it, expect } from '@jest/globals';

describe('MÓDULO DE AVALIAÇÕES (REVIEWS): Fluxo de Avaliação de Serviços', () => {

  describe('1. Validação de Parâmetros de Entrada', () => {
    function validateReviewInput(appointmentId, rating, comment) {
      if (!appointmentId || !rating || rating < 1 || rating > 5) {
        const error = new Error('Dados inválidos para avaliação.');
        error.statusCode = 400;
        throw error;
      }
      return {
        appointmentId,
        rating: Number(rating),
        comment: comment ? String(comment).trim() : null
      };
    }

    it('deve aceitar dados válidos com nota entre 1 e 5', () => {
      const valid = validateReviewInput('11111111-1111-4111-a111-111111111111', 5, 'Atendimento maravilhoso!');
      expect(valid.rating).toBe(5);
      expect(valid.comment).toBe('Atendimento maravilhoso!');
    });

    it('deve rejeitar se appointment_id for ausente, vazio ou nulo (Causa Raiz do Erro 400)', () => {
      expect(() => validateReviewInput(undefined, 5, 'Comentário')).toThrow('Dados inválidos para avaliação.');
      expect(() => validateReviewInput(null, 5, 'Comentário')).toThrow('Dados inválidos para avaliação.');
      expect(() => validateReviewInput('', 5, 'Comentário')).toThrow('Dados inválidos para avaliação.');
    });

    it('deve rejeitar notas fora da escala de 1 a 5', () => {
      expect(() => validateReviewInput('uuid-123', 0, '')).toThrow('Dados inválidos para avaliação.');
      expect(() => validateReviewInput('uuid-123', 6, '')).toThrow('Dados inválidos para avaliação.');
      expect(() => validateReviewInput('uuid-123', -1, '')).toThrow('Dados inválidos para avaliação.');
    });
  });

  describe('2. Normalização do Payload de Avaliação no Frontend', () => {
    function extractReviewTarget(reviewData) {
      if (!reviewData) return null;
      const item = Array.isArray(reviewData) ? reviewData[0] : reviewData;
      if (!item) return null;

      const appointmentId = item.appointment_id || item.id;
      if (!appointmentId) return null;

      return {
        appointment_id: appointmentId,
        professional_name: item.professional_name || 'sua profissional',
        service_name: item.service_name || 'seu atendimento'
      };
    }

    it('deve extrair appointment_id com sucesso quando o backend retorna array [{ appointment_id }]', () => {
      const backendArrayResponse = [
        {
          appointment_id: 'app-999',
          professional_name: 'Thais Rodrigues',
          service_name: 'Corte + Escova'
        }
      ];

      const target = extractReviewTarget(backendArrayResponse);
      expect(target).not.toBeNull();
      expect(target.appointment_id).toBe('app-999');
      expect(target.professional_name).toBe('Thais Rodrigues');
      expect(target.service_name).toBe('Corte + Escova');
    });

    it('deve extrair appointment_id com sucesso quando o backend retorna objeto direto { appointment_id }', () => {
      const backendObjectResponse = {
        appointment_id: 'app-888',
        professional_name: 'Thais Rodrigues',
        service_name: 'Manicure'
      };

      const target = extractReviewTarget(backendObjectResponse);
      expect(target).not.toBeNull();
      expect(target.appointment_id).toBe('app-888');
    });

    it('deve retornar null se a resposta for array vazio [] (não abrindo modal indevidamente)', () => {
      const target = extractReviewTarget([]);
      expect(target).toBeNull();
    });
  });

  describe('3. Enriquecimento de Múltiplos Serviços na Mensagem do Modal', () => {
    function formatReviewPrompt(professionalName, serviceName) {
      return `Como foi sua experiência com ${professionalName} em ${serviceName}?`;
    }

    it('deve formatar o texto acolhedor considerando serviço único ou composto', () => {
      const singleText = formatReviewPrompt('Thais', 'Corte Feminino');
      expect(singleText).toBe('Como foi sua experiência com Thais em Corte Feminino?');

      const multiText = formatReviewPrompt('Thais', 'Corte Feminino + Escova Modelada');
      expect(multiText).toBe('Como foi sua experiência com Thais em Corte Feminino + Escova Modelada?');
    });
  });

});
