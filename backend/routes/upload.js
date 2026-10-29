import express from 'express';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { authMiddleware } from '../middlewares/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Garante que o diretório public/uploads existe
const uploadDir = path.join(__dirname, '../public/uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configuração de armazenamento seguro
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const randomHex = crypto.randomBytes(16).toString('hex');
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${randomHex}${ext}`);
  }
});

// Filtro estrito de tipos MIME e limite de 5MB
const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      const error = new Error('Formato de arquivo não suportado. Por favor, envie imagens JPG, PNG ou WebP.');
      error.statusCode = 400;
      cb(error, false);
    }
  }
});

/**
 * @swagger
 * /api/upload/image:
 *   post:
 *     summary: Upload seguro de imagem com validação de tipo e tamanho
 *     tags:
 *       - Upload
 *     consumes:
 *       - multipart/form-data
 *     responses:
 *       200:
 *         description: Imagem enviada com sucesso
 */
router.post('/image', authMiddleware, (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'A imagem excede o limite máximo permitido de 5MB.' });
      }
      return res.status(400).json({ error: `Erro no upload: ${err.message}` });
    } else if (err) {
      return res.status(err.statusCode || 400).json({ error: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo de imagem foi enviado.' });
    }

    const relativeUrl = `/uploads/${req.file.filename}`;
    return res.json({
      success: true,
      url: relativeUrl,
      filename: req.file.filename,
      mimetype: req.file.mimetype,
      size: req.file.size
    });
  });
});

export default router;
