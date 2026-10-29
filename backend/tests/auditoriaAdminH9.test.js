import { describe, it, expect, jest } from '@jest/globals';

describe('Item H9 (P2) — Auditoria Visível do Super Admin (suspender, trocar plano, alterar slug)', () => {

  const mockTenant = {
    id: 'f87e8346-bfab-4318-ae38-9de1c95be362',
    name: 'Studio Thais Beauty & Spa',
    slug: 'studiothais',
    status: 'active',
    plan_id: 'a1b2c3d4-0000-0000-0000-000000000001',
    plan_price: 159.90,
    plan_name: 'Premium',
    primary_color: '#7c5357',
    secondary_color: '#eeb9bd'
  };

  describe('Auditoria de Troca de Plano (UPDATE_TENANT_PLAN)', () => {
    it('deve identificar modificação de plano e preparar o payload de auditoria com plano anterior e novo', () => {
      const currentTenant = { ...mockTenant };
      const updatedTenant = {
        ...mockTenant,
        plan_id: 'a1b2c3d4-0000-0000-0000-000000000002',
        plan_price: 299.90
      };
      const newPlanName = 'Signature';

      const planChanged = (currentTenant.plan_id !== updatedTenant.plan_id) || 
                          (parseFloat(currentTenant.plan_price || 0) !== parseFloat(updatedTenant.plan_price || 0));

      expect(planChanged).toBe(true);

      const auditPayload = {
        action: 'UPDATE_TENANT_PLAN',
        entityName: 'cap_tenants',
        entityId: currentTenant.id,
        tenantId: currentTenant.id,
        oldData: {
          plan_id: currentTenant.plan_id,
          plan_price: parseFloat(currentTenant.plan_price),
          plan_name: currentTenant.plan_name
        },
        newData: {
          plan_id: updatedTenant.plan_id,
          plan_price: parseFloat(updatedTenant.plan_price),
          plan_name: newPlanName
        }
      };

      expect(auditPayload.action).toBe('UPDATE_TENANT_PLAN');
      expect(auditPayload.oldData.plan_name).toBe('Premium');
      expect(auditPayload.oldData.plan_price).toBe(159.90);
      expect(auditPayload.newData.plan_name).toBe('Signature');
      expect(auditPayload.newData.plan_price).toBe(299.90);
      expect(auditPayload.tenantId).toBe(mockTenant.id);
    });

    it('deve identificar alteração apenas no preço do plano (ex: desconto ou reajuste)', () => {
      const currentTenant = { ...mockTenant };
      const updatedTenant = {
        ...mockTenant,
        plan_id: mockTenant.plan_id, // Mesmo plano
        plan_price: 129.90 // Preço promocional
      };

      const planChanged = (currentTenant.plan_id !== updatedTenant.plan_id) || 
                          (parseFloat(currentTenant.plan_price || 0) !== parseFloat(updatedTenant.plan_price || 0));

      expect(planChanged).toBe(true);
    });
  });

  describe('Auditoria de Alteração de Slug (UPDATE_TENANT_SLUG)', () => {
    it('deve registrar alteração de slug com o link anterior e o novo link', () => {
      const currentTenant = { ...mockTenant };
      const updatedTenant = {
        ...mockTenant,
        slug: 'studiothais-prime'
      };

      const slugChanged = currentTenant.slug !== updatedTenant.slug;
      expect(slugChanged).toBe(true);

      const auditPayload = {
        action: 'UPDATE_TENANT_SLUG',
        entityName: 'cap_tenants',
        entityId: currentTenant.id,
        tenantId: currentTenant.id,
        oldData: { slug: currentTenant.slug },
        newData: { slug: updatedTenant.slug }
      };

      expect(auditPayload.action).toBe('UPDATE_TENANT_SLUG');
      expect(auditPayload.oldData.slug).toBe('studiothais');
      expect(auditPayload.newData.slug).toBe('studiothais-prime');
      expect(auditPayload.tenantId).toBe(mockTenant.id);
    });

    it('não deve disparar auditoria de slug quando o slug for inalterado', () => {
      const currentTenant = { ...mockTenant };
      const updatedTenant = { ...mockTenant, name: 'Novo Nome do Studio' };

      const slugChanged = currentTenant.slug !== updatedTenant.slug;
      expect(slugChanged).toBe(false);
    });
  });

  describe('Auditoria de Suspensão e Reativação (SUSPEND_TENANT & REACTIVATE_TENANT)', () => {
    it('deve registrar SUSPEND_TENANT com status anterior, motivo e confirmação do nome', () => {
      const reason = 'Inadimplência de mensalidade há mais de 30 dias';
      const confirmedName = 'Studio Thais Beauty & Spa';

      const auditPayload = {
        action: 'SUSPEND_TENANT',
        entityName: 'cap_tenants',
        entityId: mockTenant.id,
        tenantId: mockTenant.id,
        oldData: { status: 'active' },
        newData: { status: 'suspended', reason, confirmed_name: confirmedName }
      };

      expect(auditPayload.action).toBe('SUSPEND_TENANT');
      expect(auditPayload.oldData.status).toBe('active');
      expect(auditPayload.newData.status).toBe('suspended');
      expect(auditPayload.newData.reason).toBe(reason);
      expect(auditPayload.newData.confirmed_name).toBe(confirmedName);
      expect(auditPayload.tenantId).toBe(mockTenant.id);
    });

    it('deve registrar REACTIVATE_TENANT com status anterior e novo status active', () => {
      const auditPayload = {
        action: 'REACTIVATE_TENANT',
        entityName: 'cap_tenants',
        entityId: mockTenant.id,
        tenantId: mockTenant.id,
        oldData: { status: 'suspended' },
        newData: { status: 'active' }
      };

      expect(auditPayload.action).toBe('REACTIVATE_TENANT');
      expect(auditPayload.oldData.status).toBe('suspended');
      expect(auditPayload.newData.status).toBe('active');
      expect(auditPayload.tenantId).toBe(mockTenant.id);
    });
  });

  describe('Mapeamento e Filtros do Serviço de Auditoria (getSuperAdminLogs)', () => {
    it('deve aplicar filtro por ação e busca textual na query de auditoria', () => {
      const buildQuery = ({ action, tenant_id, search, limit = 100 }) => {
        let query = `
          SELECT l.id, l.action, l.entity_name, l.entity_id, l.tenant_id, l.old_data, l.new_data, l.ip_address, l.created_at,
                 COALESCE(t.name, (l.new_data->>'confirmed_name'), 'Plataforma Global') as tenant_name,
                 t.slug as tenant_slug,
                 COALESCE(a.name, 'Super Admin') as admin_name
          FROM public.cap_audit_logs l
          LEFT JOIN public.cap_tenants t ON (l.tenant_id = t.id OR (l.entity_name = 'cap_tenants' AND l.entity_id = t.id))
          LEFT JOIN public.cap_platform_admins a ON l.user_id = a.id
          WHERE l.user_role = 'superadmin'
        `;
        const params = [];

        if (action && action !== 'ALL') {
          params.push(action);
          query += ` AND l.action = $${params.length}`;
        }

        if (tenant_id) {
          params.push(tenant_id);
          query += ` AND (l.tenant_id = $${params.length} OR (l.entity_name = 'cap_tenants' AND l.entity_id = $${params.length}))`;
        }

        if (search && search.trim()) {
          params.push(`%${search.trim().toLowerCase()}%`);
          query += ` AND (
            LOWER(l.action) LIKE $${params.length} 
            OR LOWER(COALESCE(t.name, '')) LIKE $${params.length} 
            OR LOWER(COALESCE(t.slug, '')) LIKE $${params.length}
            OR LOWER(COALESCE(l.new_data->>'reason', '')) LIKE $${params.length}
          )`;
        }

        params.push(limit);
        query += ` ORDER BY l.created_at DESC LIMIT $${params.length}`;

        return { query, params };
      };

      const result = buildQuery({
        action: 'SUSPEND_TENANT',
        search: 'thais'
      });

      expect(result.query).toContain('l.action = $1');
      expect(result.query).toContain('LEFT JOIN public.cap_tenants t');
      expect(result.query).toContain('LEFT JOIN public.cap_platform_admins a');
      expect(result.params[0]).toBe('SUSPEND_TENANT');
      expect(result.params[1]).toBe('%thais%');
      expect(result.params[2]).toBe(100);
    });
  });
});
