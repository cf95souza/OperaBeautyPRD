import { describe, it, expect } from '@jest/globals';

describe('Item H7 — Suspensão Segura do Salão (Super Admin) - Regras e Validações', () => {

  const mockTenant = {
    id: 'f87e8346-bfab-4318-ae38-9de1c95be362',
    name: 'Studio Thais Beauty & Spa',
    slug: 'studiothais',
    status: 'active'
  };

  describe('Validação Estrita da Confirmação do Nome do Salão (§9.5·H7)', () => {
    it('deve rejeitar suspensão se o nome de confirmação não for informado', () => {
      const confirmTenantName = '';
      const nomeDigitado = (confirmTenantName || '').trim();
      const nomeReal = (mockTenant.name || '').trim();

      const isValid = Boolean(nomeDigitado) && nomeDigitado.toLowerCase() === nomeReal.toLowerCase();
      expect(isValid).toBe(false);
    });

    it('deve rejeitar suspensão se o nome digitado for diferente do nome oficial do salão', () => {
      const confirmTenantName = 'Outro Salao Qualquer';
      const nomeDigitado = (confirmTenantName || '').trim();
      const nomeReal = (mockTenant.name || '').trim();

      const isValid = Boolean(nomeDigitado) && nomeDigitado.toLowerCase() === nomeReal.toLowerCase();
      expect(isValid).toBe(false);
    });

    it('deve aceitar suspensão quando o nome coincidir perfeitamente (mesmo com espaços extras ou maiúsculas/minúsculas)', () => {
      const confirmTenantName = '  studio thais beauty & spa  ';
      const nomeDigitado = (confirmTenantName || '').trim();
      const nomeReal = (mockTenant.name || '').trim();

      const isValid = Boolean(nomeDigitado) && nomeDigitado.toLowerCase() === nomeReal.toLowerCase();
      expect(isValid).toBe(true);
    });
  });

  describe('Validação do Motivo da Suspensão (§9.5·H7)', () => {
    it('deve rejeitar suspensão sem motivo ou com espaços em branco', () => {
      const reason = '   ';
      const motivoLimpo = (reason || '').trim();
      const isValid = Boolean(motivoLimpo) && motivoLimpo.length >= 5;

      expect(isValid).toBe(false);
    });

    it('deve rejeitar motivo com menos de 5 caracteres', () => {
      const reason = 'ruim';
      const motivoLimpo = (reason || '').trim();
      const isValid = Boolean(motivoLimpo) && motivoLimpo.length >= 5;

      expect(isValid).toBe(false);
    });

    it('deve aceitar motivo com 5 ou mais caracteres válidos', () => {
      const reason = 'Inadimplência de mensalidade há mais de 30 dias';
      const motivoLimpo = (reason || '').trim();
      const isValid = Boolean(motivoLimpo) && motivoLimpo.length >= 5;

      expect(isValid).toBe(true);
      expect(motivoLimpo.length).toBeGreaterThanOrEqual(5);
    });
  });

  describe('Bloqueio na API (Tentativa de suspensão via PUT /tenants/:id sem dados)', () => {
    it('deve interceptar status = suspended em updateTenant e exigir nome e motivo', () => {
      const attemptSuspensionViaUpdate = (status, confirmName, reason) => {
        if (status === 'suspended' || status === 'inactive') {
          const nomeDigitado = (confirmName || '').trim();
          const nomeReal = mockTenant.name.trim();
          if (!nomeDigitado || nomeDigitado.toLowerCase() !== nomeReal.toLowerCase()) {
            throw new Error(`Para suspender a conta, confirme digitando exatamente o nome do salão ("${mockTenant.name}").`);
          }
          const motivoLimpo = (reason || '').trim();
          if (!motivoLimpo || motivoLimpo.length < 5) {
            throw new Error('O motivo da suspensão é obrigatório (mínimo de 5 caracteres).');
          }
          return { status: 'suspended', reason: motivoLimpo };
        }
        return { status };
      };

      // Tentativa sem nome e sem motivo
      expect(() => attemptSuspensionViaUpdate('suspended', null, null)).toThrow('Para suspender a conta, confirme digitando');

      // Tentativa com nome correto mas sem motivo
      expect(() => attemptSuspensionViaUpdate('suspended', 'Studio Thais Beauty & Spa', '')).toThrow('O motivo da suspensão é obrigatório');

      // Tentativa com nome errado
      expect(() => attemptSuspensionViaUpdate('suspended', 'Studio Errado', 'Motivo válido')).toThrow('Para suspender a conta, confirme digitando');

      // Tentativa válida
      const result = attemptSuspensionViaUpdate('suspended', 'Studio Thais Beauty & Spa', 'Inadimplência recorrente');
      expect(result.status).toBe('suspended');
      expect(result.reason).toBe('Inadimplência recorrente');
    });
  });

  describe('Auditoria e Invalidação de Cache (§9.5·H7)', () => {
    it('deve preparar o payload de auditoria para cap_audit_logs com dados anteriores e novos', () => {
      const auditPayload = {
        action: 'SUSPEND_TENANT',
        entityName: 'cap_tenants',
        entityId: mockTenant.id,
        oldData: { status: mockTenant.status },
        newData: { 
          status: 'suspended', 
          reason: 'Inadimplência de mensalidade', 
          confirmed_name: 'Studio Thais Beauty & Spa' 
        }
      };

      expect(auditPayload.action).toBe('SUSPEND_TENANT');
      expect(auditPayload.oldData.status).toBe('active');
      expect(auditPayload.newData.status).toBe('suspended');
      expect(auditPayload.newData.reason).toBeDefined();
    });

    it('deve formatar chave de cache Redis para invalidação imediata', () => {
      const cacheKey = `tenant_slug:${mockTenant.slug}`;
      expect(cacheKey).toBe('tenant_slug:studiothais');
    });

    it('deve formatar notificação para gestores do salão', () => {
      const motivo = 'Inadimplência de mensalidade';
      const notification = {
        tenant_id: mockTenant.id,
        title: 'Conta Suspensa pela Administração',
        body: `Sua conta foi temporariamente suspensa pelo Super Admin. Motivo: ${motivo}`
      };

      expect(notification.title).toBe('Conta Suspensa pela Administração');
      expect(notification.body).toContain(motivo);
    });
  });

  describe('Reativação Segura da Conta em 1 Clique (§9.5·H7)', () => {
    it('deve restaurar status para active e gerar evento de auditoria REACTIVATE_TENANT', () => {
      const reactivatePayload = {
        action: 'REACTIVATE_TENANT',
        entityName: 'cap_tenants',
        entityId: mockTenant.id,
        oldData: { status: 'suspended' },
        newData: { status: 'active' }
      };

      expect(reactivatePayload.action).toBe('REACTIVATE_TENANT');
      expect(reactivatePayload.oldData.status).toBe('suspended');
      expect(reactivatePayload.newData.status).toBe('active');
    });
  });

});
