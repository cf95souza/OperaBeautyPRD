import express from 'express';
import path from 'path';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import { fileURLToPath } from 'url';
import pool from '../config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Diretório base de arquivos privados do CRM
export const PRIVATE_UPLOADS_DIR = path.resolve(__dirname, '../private_uploads/crm');

// Assegura existência do diretório raiz de uploads privados
if (!fs.existsSync(PRIVATE_UPLOADS_DIR)) {
  fs.mkdirSync(PRIVATE_UPLOADS_DIR, { recursive: true });
}

/**
 * Extrai e valida o token JWT da requisição via Header, Cookie ou Query Param
 */
export const extractUserFromRequest = (req) => {
  let token = null;

  // 1. Authorization: Bearer <token>
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  // 2. Cookie de sessão autenticada
  if (!token && req.cookies) {
    token = req.cookies.token || req.cookies.access_token || req.cookies.operabeauty_token;
  }

  // 3. Query string (?token=...) para compatibilidade com tags <img> no navegador
  if (!token && req.query && req.query.token) {
    token = req.query.token;
  }

  if (!token) return null;

  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return null;
  }
};

/**
 * Middleware de controle de acesso estrito para fotos do CRM
 */
const requireCrmAccess = async (req, res, next) => {
  const user = extractUserFromRequest(req);

  if (!user) {
    return res.status(401).json({ 
      error: 'Acesso negado. Autenticação obrigatória para visualizar prontuários e fotos do CRM.' 
    });
  }

  req.user = user;
  const requestedTenantId = req.params.tenantId;

  // Superadmin tem permissão de suporte e auditoria técnica
  if (user.role === 'superadmin') {
    return next();
  }

  // Validação de isolamento de salão (Cross-Tenant Protection)
  if (requestedTenantId && requestedTenantId !== user.tenant_id) {
    return res.status(403).json({ 
      error: 'Acesso negado: você não tem permissão para acessar prontuários deste salão.' 
    });
  }

  // Validação por papel (Staff ou o próprio Cliente dono da nota)
  if (user.role === 'manager' || user.role === 'professional') {
    return next();
  }

  if (user.role === 'client') {
    // Cliente só pode ver foto se pertencer à sua própria timeline
    const filename = req.params.filename;
    try {
      const checkResult = await pool.query(
        `SELECT id FROM public.cap_timeline_notes 
         WHERE client_id = $1 AND tenant_id = $2 AND image_path LIKE $3 
         LIMIT 1`,
        [user.id, user.tenant_id, `%${filename}`]
      );

      if (checkResult.rows.length > 0) {
        return next();
      }
    } catch (dbErr) {
      req.log?.error(dbErr, 'Erro ao verificar permissão do cliente para foto do CRM');
    }

    return res.status(403).json({ 
      error: 'Acesso negado: prontuário restrito à equipe do salão.' 
    });
  }

  return res.status(403).json({ 
    error: 'Acesso negado: permissões insuficientes.' 
  });
};

/**
 * Rota Segura com isolamento por Tenant: GET /api/uploads/crm/:tenantId/:filename
 */
router.get('/crm/:tenantId/:filename', requireCrmAccess, (req, res) => {
  const { tenantId, filename } = req.params;

  // Proteção contra Directory Traversal
  const safeFilename = path.basename(filename);
  const safeTenantId = path.basename(tenantId);
  const filePath = path.join(PRIVATE_UPLOADS_DIR, safeTenantId, safeFilename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Arquivo do prontuário não encontrado.' });
  }

  // Cabeçalhos de segurança contra vazamento e cache compartilhado
  res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  return res.sendFile(filePath);
});

/**
 * Rota Retrocompatível: GET /api/uploads/crm/:filename
 * Descobre o tenant através do banco de dados e valida o acesso
 */
router.get('/crm/:filename', async (req, res) => {
  const user = extractUserFromRequest(req);
  if (!user) {
    return res.status(401).json({ 
      error: 'Acesso negado. Autenticação obrigatória para visualizar prontuários do CRM.' 
    });
  }

  const safeFilename = path.basename(req.params.filename);

  try {
    const noteQuery = await pool.query(
      `SELECT tenant_id, client_id FROM public.cap_timeline_notes 
       WHERE image_path LIKE $1 LIMIT 1`,
      [`%${safeFilename}`]
    );

    let tenantId = user.tenant_id;
    if (noteQuery.rows.length > 0) {
      tenantId = noteQuery.rows[0].tenant_id;
      if (user.role !== 'superadmin' && user.tenant_id !== tenantId) {
        return res.status(403).json({ 
          error: 'Acesso negado: prontuário pertencente a outro salão.' 
        });
      }
    }

    const filePath = path.join(PRIVATE_UPLOADS_DIR, tenantId, safeFilename);
    const fallbackPath = path.join(PRIVATE_UPLOADS_DIR, safeFilename);

    const targetPath = fs.existsSync(filePath) ? filePath : (fs.existsSync(fallbackPath) ? fallbackPath : null);

    if (!targetPath) {
      return res.status(404).json({ error: 'Arquivo do prontuário não encontrado.' });
    }

    res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    return res.sendFile(targetPath);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao carregar prontuário.' });
  }
});

export default router;
