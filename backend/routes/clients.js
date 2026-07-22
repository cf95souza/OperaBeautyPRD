import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { authMiddleware, requireRole } from '../middlewares/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../public/uploads'))
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, uniqueSuffix + path.extname(file.originalname))
  }
});
const upload = multer({ storage: storage });
import { z } from 'zod';
import { validate } from '../middlewares/validate.js';
import {
  listClients,
  updateMe,
  updateClientPassword,
  getClientById,
  updateClient,
  updateAnamnese,
  getClientTimeline,
  createTimelineNote,
  deleteTimelineNote,
  exportClientData,
  anonymizeClient
} from '../services/clientService.js';

const router = express.Router();

const updateMeSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Nome é obrigatório.'),
    birth_date: z.string().nullable().optional()
  }),
  query: z.any(), params: z.any()
});

const updatePasswordSchema = z.object({
  body: z.object({
    password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres.').regex(/[a-zA-Z]/, 'Precisa ter 1 letra.').regex(/[0-9]/, 'Precisa ter 1 número.')
  }),
  query: z.any(), params: z.any()
});

const updateClientSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Nome é obrigatório.').optional(),
    phone: z.string().min(1, 'Telefone é obrigatório.').optional(),
    birth_date: z.string().nullable().optional(),
    vip_tier: z.enum(['Prata', 'Ouro', 'VIP', 'Black']).optional()
  }),
  query: z.any(), params: z.any()
});

const updateAnamneseSchema = z.object({
  body: z.object({
    anamnese_data: z.record(z.any(), { errorMap: () => ({ message: 'Dados de anamnese inválidos.' }) })
  }),
  query: z.any(), params: z.any()
});

const timelineNoteSchema = z.object({
  body: z.object({
    content: z.string().min(1, 'Conteúdo da nota não fornecido.'),
    appointment_id: z.string().uuid().nullable().optional()
  }),
  query: z.any(), params: z.any()
});


// Listar Clientes
router.get('/', authMiddleware, requireRole(['manager', 'professional', 'superadmin']), async (req, res) => {
  const tenantId = req.user.role === 'superadmin' ? req.query.tenant_id : req.user.tenant_id;
  const limit = parseInt(req.query.limit) || 1000;
  const offset = parseInt(req.query.offset) || 0;
  
  if (!tenantId) {
    return res.status(400).json({ error: 'tenant_id é obrigatório para listar clientes.' });
  }

  try {
    const clients = await listClients(tenantId, limit, offset);
    return res.json(clients);
  } catch (error) {
    req.log.error(error, 'Erro ao listar clientes');
    return res.status(500).json({ error: 'Erro interno ao obter clientes.' });
  }
});

// Atualizar próprio perfil
router.put('/me', authMiddleware, requireRole(['client']), validate(updateMeSchema), async (req, res) => {
  const { name, birth_date } = req.body;
  const userId = req.user.id;
  const tenantId = req.user.tenant_id;

  try {
    const client = await updateMe(userId, tenantId, name, birth_date);
    return res.json(client);
  } catch (error) {
    req.log.error(error, 'Erro ao atualizar perfil');
    return res.status(500).json({ error: 'Erro interno ao atualizar perfil.' });
  }
});

// Alterar própria senha
router.put('/me/password', authMiddleware, requireRole(['client']), validate(updatePasswordSchema), async (req, res) => {
  const { password } = req.body;
  const userId = req.user.id;
  const tenantId = req.user.tenant_id;

  try {
    await updateClientPassword(userId, tenantId, password);
    return res.json({ message: 'Senha atualizada com sucesso.' });
  } catch (error) {
    req.log.error(error, 'Erro ao atualizar senha');
    return res.status(500).json({ error: 'Erro interno ao atualizar senha.' });
  }
});

// Detalhes do Cliente
router.get('/:id', authMiddleware, requireRole(['manager', 'professional', 'client']), async (req, res) => {
  const { id } = req.params;
  const tenantId = req.user.tenant_id;
  const userId = req.user.id;
  const userRole = req.user.role;

  try {
    const client = await getClientById(id, tenantId, userId, userRole);
    return res.json(client);
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    req.log.error(error, 'Erro ao obter detalhes do cliente');
    return res.status(500).json({ error: 'Erro interno ao buscar cliente.' });
  }
});

// Atualizar dados do Cliente
router.put('/:id', authMiddleware, validate(updateClientSchema), async (req, res) => {
  const { id } = req.params;
  const { name, phone, birth_date, vip_tier } = req.body;
  const tenantId = req.user.tenant_id;
  const userId = req.user.id;
  const userRole = req.user.role;

  try {
    const client = await updateClient(id, tenantId, userId, userRole, name, phone, birth_date, vip_tier);
    return res.json(client);
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    req.log.error(error, 'Erro ao atualizar cliente');
    return res.status(500).json({ error: 'Erro interno ao salvar cliente.' });
  }
});

// Atualizar Anamnese Dinâmica
router.put('/:id/anamnese', authMiddleware, requireRole(['manager', 'professional']), validate(updateAnamneseSchema), async (req, res) => {
  const { id } = req.params;
  const { anamnese_data } = req.body;
  const tenantId = req.user.tenant_id;

  try {
    const client = await updateAnamnese(id, tenantId, anamnese_data);
    return res.json(client);
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    req.log.error(error, 'Erro ao atualizar anamnese');
    return res.status(500).json({ error: 'Erro interno ao salvar anamnese.' });
  }
});

// Alterar senha do cliente pelo Gerente
router.put('/:id/password', authMiddleware, requireRole(['manager']), validate(updatePasswordSchema), async (req, res) => {
  const { id } = req.params;
  const { password } = req.body;
  const tenantId = req.user.tenant_id;

  try {
    await updateClientPassword(id, tenantId, password);
    return res.json({ message: 'Senha do cliente redefinida com sucesso pelo gerente.' });
  } catch (error) {
    req.log.error(error, 'Erro ao atualizar senha do cliente');
    return res.status(500).json({ error: 'Erro interno ao redefinir senha do cliente.' });
  }
});

// Listar timeline / prontuário
router.get('/:id/timeline', authMiddleware, requireRole(['manager', 'professional']), async (req, res) => {
  const { id } = req.params;
  const tenantId = req.user.tenant_id;

  try {
    const timeline = await getClientTimeline(id, tenantId);
    return res.json(timeline);
  } catch (error) {
    req.log.error(error, 'Erro ao buscar prontuário do cliente');
    return res.status(500).json({ error: 'Erro interno ao obter timeline.' });
  }
});

// Adicionar nota ao prontuário
router.post('/:id/timeline', authMiddleware, requireRole(['manager', 'professional']), upload.single('image'), async (req, res) => {
  const { id } = req.params;
  const { content, appointment_id } = req.body;
  const tenantId = req.user.tenant_id;
  const staffId = req.user.id;
  const image_path = req.file ? `/uploads/${req.file.filename}` : null;

  if (!content && !image_path) {
    return res.status(400).json({ error: 'Conteúdo da nota ou imagem são obrigatórios.' });
  }

  try {
    const note = await createTimelineNote(id, tenantId, staffId, content || '', appointment_id, image_path);
    return res.status(201).json(note);
  } catch (error) {
    req.log.error(error, 'Erro ao criar nota no prontuário');
    return res.status(500).json({ error: 'Erro interno ao salvar nota.' });
  }
});

// Excluir nota do prontuário
router.delete('/:id/timeline/:noteId', authMiddleware, requireRole(['manager', 'professional']), async (req, res) => {
  const { noteId } = req.params;
  const tenantId = req.user.tenant_id;
  try {
    await deleteTimelineNote(noteId, tenantId);
    return res.json({ message: 'Nota excluída.' });
  } catch (error) {
    req.log.error(error, 'Erro ao excluir nota');
    return res.status(500).json({ error: 'Erro ao excluir nota.' });
  }
});

// LGPD: Exportar Dados (FINDING-27)
router.get('/me/export', authMiddleware, requireRole(['client']), async (req, res) => {
  try {
    const data = await exportClientData(req.user.id, req.user.tenant_id);
    return res.json(data);
  } catch (error) {
    req.log.error(error, 'Erro ao exportar dados LGPD');
    return res.status(500).json({ error: 'Erro ao exportar dados.' });
  }
});

// LGPD: Anonimizar Conta (FINDING-27)
router.delete('/me/anonymize', authMiddleware, requireRole(['client']), async (req, res) => {
  try {
    await anonymizeClient(req.user.id, req.user.tenant_id);
    return res.json({ message: 'Conta anonimizada com sucesso.' });
  } catch (error) {
    req.log.error(error, 'Erro ao anonimizar dados LGPD');
    return res.status(500).json({ error: 'Erro ao anonimizar conta.' });
  }
});

export default router;
