import express from 'express';
import { z } from 'zod';
import { validate } from '../middlewares/validate.js';
import { authMiddleware } from '../middlewares/auth.js';
import { getTemplate, updateTemplate, getClientAnamnesis, submitClientAnamnesis } from '../services/anamnesisService.js';
import { getTenantById } from '../services/tenantService.js'; // Needed to get tenantId from slug if necessary

const router = express.Router();

// Esquemas de validação
const updateTemplateSchema = z.object({
  body: z.object({
    fields_schema: z.array(z.object({
      id: z.string(),
      type: z.enum(['text', 'textarea', 'radio', 'checkbox', 'select']),
      label: z.string(),
      options: z.array(z.string()).optional(),
      required: z.boolean().optional()
    }))
  })
});

const submitAnamnesisSchema = z.object({
  body: z.object({
    answers: z.record(z.any())
  })
});

// 1. Obter template do salão (Público/Cliente precisa ver via tenant_id)
router.get('/template/:tenantId', async (req, res) => {
  const { tenantId } = req.params;
  try {
    const template = await getTemplate(tenantId);
    return res.json(template);
  } catch (error) {
    req.log.error(error, 'Erro ao obter template de anamnese');
    return res.status(500).json({ error: 'Erro ao carregar template.' });
  }
});

// 2. Atualizar template do salão (Apenas Gestor/Admin)
router.put('/template', authMiddleware, validate(updateTemplateSchema), async (req, res) => {
  const { tenant_id, role } = req.user;
  const { fields_schema } = req.body;
  
  if (role !== 'admin' && role !== 'manager' && role !== 'superadmin') {
    return res.status(403).json({ error: 'Acesso negado. Apenas gestores podem editar a ficha.' });
  }

  try {
    const updated = await updateTemplate(tenant_id, fields_schema);
    return res.json(updated);
  } catch (error) {
    req.log.error(error, 'Erro ao atualizar template de anamnese');
    return res.status(500).json({ error: 'Erro ao salvar template.' });
  }
});

// 3. Obter a ficha de um cliente específico (Gestor/Profissional/Cliente)
router.get('/client/:clientId', authMiddleware, async (req, res) => {
  const { tenant_id, role, id: loggedUserId } = req.user;
  const { clientId } = req.params;

  if (role === 'client' && loggedUserId !== clientId) {
    return res.status(403).json({ error: 'Você só pode ver sua própria ficha.' });
  }

  try {
    const anamnesis = await getClientAnamnesis(tenant_id, clientId);
    return res.json(anamnesis);
  } catch (error) {
    req.log.error(error, 'Erro ao carregar ficha do cliente');
    return res.status(500).json({ error: 'Erro ao buscar ficha de anamnese.' });
  }
});

// 4. Submeter/Atualizar as respostas da ficha (Apenas o próprio cliente)
router.post('/client', authMiddleware, validate(submitAnamnesisSchema), async (req, res) => {
  const { tenant_id, role, id: clientId } = req.user;
  const { answers } = req.body;

  if (role !== 'client') {
    return res.status(403).json({ error: 'Apenas clientes podem preencher a ficha de anamnese.' });
  }

  try {
    const updated = await submitClientAnamnesis(tenant_id, clientId, answers);
    return res.json({ message: 'Ficha salva com sucesso.', ...updated });
  } catch (error) {
    req.log.error(error, 'Erro ao salvar respostas da anamnese');
    return res.status(500).json({ error: 'Erro ao processar as respostas.' });
  }
});

export default router;
