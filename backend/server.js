import app from './app.js';

if (!process.env.JWT_SECRET) {
  console.error("CRITICAL ERROR: JWT_SECRET environment variable is missing.");
  console.error("The server will not start without a secure JWT_SECRET.");
  process.exit(1);
}

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Servidor Express rodando na porta ${PORT}`);
  console.log(`🔗 API Base: http://localhost:${PORT}/api`);
});
