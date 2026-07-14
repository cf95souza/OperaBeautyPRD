import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import helmet from 'helmet';
import pino from 'pino-http';
import rateLimit from 'express-rate-limit';
import pool from './config/db.js'; // Adicionado para uso no healthcheck
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Importar as rotas
import authRoutes from './routes/auth.js';
import tenantRoutes from './routes/tenants.js';
import leadsRoutes from './routes/leads.js';
import serviceRoutes from './routes/services.js';
import inventoryRoutes from './routes/inventory.js';
import staffRoutes from './routes/staff.js';
import clientRoutes from './routes/clients.js';
import appointmentRoutes from './routes/appointments.js';
import settingsRoutes from './routes/settings.js';
import planRoutes from './routes/plans.js';
import invoiceRoutes from './routes/invoices.js';
import superadminRoutes from './routes/superadmin.js';
import couponRoutes from './routes/coupons.js';
import notificationRoutes from './routes/notifications.js';

dotenv.config();

const app = express();

// Middlewares
app.use(helmet({
  contentSecurityPolicy: false,
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));

app.use((req, res, next) => {
  res.setHeader('Permissions-Policy', 'geolocation=(), camera=(), microphone=()');
  next();
});
app.use(cookieParser());
const logTargets = [];
if (process.env.NODE_ENV !== 'production') {
  logTargets.push({ target: 'pino-pretty', options: { colorize: true } });
}
logTargets.push({
  target: 'pino-roll',
  options: { file: 'logs/operabeauty-', extension: '.log', frequency: 'daily', size: '10m', mkdir: true }
});

app.use(pino({
  transport: { targets: logTargets },
  autoLogging: false,
  serializers: {
    req: (req) => ({ method: req.method, url: req.url }),
    res: (res) => ({ statusCode: res.statusCode })
  }
}));

const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173').split(',');

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas requisições. Tente novamente mais tarde.' }
});
app.use('/api/', globalLimiter);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// Rota de Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Servidor Express OperaBeauty ativo e saudável.' });
});

// Health Check Completo (com DB - FINDING-25)
app.get('/health/complete', async (req, res) => {
  try {
    const start = Date.now();
    await pool.query('SELECT 1');
    const duration = Date.now() - start;
    res.json({ status: 'OK', message: 'Servidor e Banco de Dados estão saudáveis.', db_latency_ms: duration });
  } catch (error) {
    req.log.error(error, 'Health check falhou na verificação do banco de dados');
    res.status(503).json({ status: 'ERROR', message: 'Falha na conexão com o Banco de Dados.', error: error.message });
  }
});

// Registrar rotas
app.use('/api/auth', authRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api/leads', leadsRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/superadmin', superadminRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/notifications', notificationRoutes);
// Middleware de tratamento global de erros
app.use((err, req, res, next) => {
  req.log.error({ err }, '❌ Erro não tratado');
  
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL || process.env.TELEGRAM_WEBHOOK_URL;
  if (webhookUrl) {
    fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: `🚨 **OperaBeauty 500 Error**\nRoute: ${req.url}\nMethod: ${req.method}\nError: ${err.message}` })
    }).catch(e => req.log.error(e, 'Falha ao enviar webhook de erro'));
  }

  res.status(500).json({ error: 'Ocorreu um erro interno de servidor. Por favor, tente novamente mais tarde.', detail: err.message, stack: err.stack });
});

export default app;
