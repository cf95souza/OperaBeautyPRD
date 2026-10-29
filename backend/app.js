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
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger.js';

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
import membershipRoutes from './routes/memberships.js';
import productSaleRoutes from './routes/productSales.js';
import walletRoutes from './routes/wallets.js';
import lookbookRoutes from './routes/lookbook.js';
import giftcardRoutes from './routes/giftcards.js';
import referralRoutes from './routes/referral.js';
// import aiRoutes from './routes/ai.js';
import reportsRoutes from './routes/reports.js';
import reviewsRoutes from './routes/reviews.js';
import waitlistRoutes from './routes/waitlist.js';
import termsRoutes from './routes/terms.js';
import consentsRoutes from './routes/consents.js';
import anamnesisRoutes from './routes/anamnesis.js';
import manifestRoutes from './routes/manifest.js';
import uploadRoutes from './routes/upload.js';
import privateUploadRoutes from './routes/privateUploads.js';
import whatsappRoutes from './routes/whatsappRoutes.js';
import paymentRoutes from './routes/payments.js';
import onboardingRoutes from './routes/onboarding.js';
import packageRoutes from './routes/packages.js';
import evolutionRoutes from './routes/evolutions.js';
import campaignRoutes from './routes/campaigns.js';
import cashRegisterRoutes from './routes/cashRegister.js';
import orderRoutes from './routes/orders.js';
import minisiteRoutes from './routes/minisite.js';
import seoRoutes from './routes/seo.js';
import resellerRoutes from './routes/reseller.js';
import privacyRoutes from './routes/privacy.js';
import addonRoutes from './routes/addons.js';
import { initCronJobs } from './cron/reminders.js';

import './workers/notificationWorker.js';

dotenv.config();

const app = express();

// Trust reverse proxy (Caddy/Nginx) for correct IP rate limiting
app.set('trust proxy', 1);

// Middlewares
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"]
    }
  },
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

const isDev = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV || process.env.NODE_ENV === 'test';

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 100000 : 200, // Aumenta o limite para desenvolvimento local
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas requisições. Tente novamente mais tarde.' }
});
app.use('/api/', globalLimiter);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Bloqueio estrito de acesso direto a fotos confidenciais de prontuário e CRM
app.use('/uploads/crm', (req, res) => {
  res.status(403).json({ error: 'Acesso negado: fotos de prontuário e CRM exigem rota autenticada.' });
});

app.use(express.static(path.join(__dirname, 'public')));

// Rota do Swagger UI
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { explorer: true }));

// Rota de Health Check Básica (Liveness Probe)
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Servidor Express OperaBeauty ativo e saudável.' });
});

// Health Check Completo (com DB - Readiness Probe)
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

// Health Check Detalhado de Infraestrutura e Observabilidade (Item G3 - P1)
app.get('/health/system', async (req, res) => {
  const mem = process.memoryUsage();
  const systemInfo = {
    status: 'HEALTHY',
    timestamp: new Date().toISOString(),
    uptime_seconds: Math.floor(process.uptime()),
    node_version: process.version,
    environment: process.env.NODE_ENV || 'development',
    memory: {
      heap_used_mb: Math.round(mem.heapUsed / 1024 / 1024),
      heap_total_mb: Math.round(mem.heapTotal / 1024 / 1024),
      rss_mb: Math.round(mem.rss / 1024 / 1024)
    },
    services: {
      database: { status: 'UNKNOWN', latency_ms: null },
      redis: { status: 'UNKNOWN', latency_ms: null }
    }
  };

  // Testa conexão com PostgreSQL com timeout de 1500ms (Fail-Fast)
  try {
    const dbStart = Date.now();
    await Promise.race([
      pool.query('SELECT 1'),
      new Promise((_, reject) => setTimeout(() => reject(new Error('DB Timeout (1500ms)')), 1500))
    ]);
    systemInfo.services.database.status = 'UP';
    systemInfo.services.database.latency_ms = Date.now() - dbStart;
  } catch (err) {
    systemInfo.status = 'DEGRADED';
    systemInfo.services.database.status = 'DOWN';
    systemInfo.services.database.error = err.message;
  }

  // Testa conexão com Redis (se configurado) com timeout de 1000ms
  try {
    const { getRedisClient } = await import('./config/redis.js').catch(() => ({ getRedisClient: null }));
    if (getRedisClient) {
      const redis = getRedisClient();
      if (redis && redis.status === 'ready') {
        const rStart = Date.now();
        await Promise.race([
          redis.ping(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Redis Timeout (1000ms)')), 1000))
        ]);
        systemInfo.services.redis.status = 'UP';
        systemInfo.services.redis.latency_ms = Date.now() - rStart;
      } else {
        systemInfo.services.redis.status = redis ? redis.status : 'NOT_INITIALIZED';
      }
    }
  } catch (err) {
    systemInfo.services.redis.status = 'DOWN';
    systemInfo.services.redis.error = err.message;
  }

  const statusCode = systemInfo.status === 'HEALTHY' ? 200 : 503;
  res.status(statusCode).json(systemInfo);
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
app.use('/api/memberships', membershipRoutes);
app.use('/api/product-sales', productSaleRoutes);
app.use('/api/wallets', walletRoutes);
app.use('/api/lookbook', lookbookRoutes);
app.use('/api/giftcards', giftcardRoutes);
app.use('/api/referral', referralRoutes);
// app.use('/api/ai', aiRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/reviews', reviewsRoutes);
app.use('/api/waitlist', waitlistRoutes);
app.use('/api/terms', termsRoutes);
app.use('/api/consents', consentsRoutes);
app.use('/api/anamnesis', anamnesisRoutes);
app.use('/api/manifest', manifestRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/uploads', privateUploadRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/packages', packageRoutes);
app.use('/api/evolutions', evolutionRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/cash-register', cashRegisterRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/minisite', minisiteRoutes);
app.use('/api/seo', seoRoutes);
app.use('/api/resellers', resellerRoutes);
app.use('/api/privacy', privacyRoutes);
app.use('/api/addons', addonRoutes);

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

  const isDev = process.env.NODE_ENV !== 'production';
  res.status(500).json({ 
    error: 'Ocorreu um erro interno de servidor. Por favor, tente novamente mais tarde.'
  });
});

export default app;
