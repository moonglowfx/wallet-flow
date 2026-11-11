import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { initDatabase } from './db.js';
import { requireAuth, warmSessionSecret } from './auth.js';
import { errorHandler, notFoundHandler } from './http.js';
import { authRouter } from './routes/auth.js';
import { accountsRouter } from './routes/accounts.js';
import { transactionsRouter } from './routes/transactions.js';
import { commitmentsRouter } from './routes/commitments.js';
import { dataRouter } from './routes/data.js';
import { prismaRouter } from './routes/prisma.js';

export const app = express();
app.disable('x-powered-by');

// La API es same-origin: no se habilita CORS. Las respuestas con datos financieros nunca se cachean.
app.use('/api', (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'same-origin');
  next();
});

app.use('/api', express.json({ limit: '15mb' }));

// Garantiza el esquema antes de atender cualquier petición (1 consulta por arranque en frío).
app.use('/api', async (_req, _res, next) => {
  const ready = initDatabase();
  warmSessionSecret();
  await ready;
  next();
});

// Rutas públicas de autenticación; todo lo demás exige sesión válida.
app.use('/api', authRouter);
app.use('/api', requireAuth, accountsRouter, transactionsRouter, commitmentsRouter, dataRouter, prismaRouter);
app.use('/api', notFoundHandler);
app.use(errorHandler);

// Servidor HTTP independiente solo cuando se ejecuta directamente (node server/index.js)
const currentFile = fileURLToPath(import.meta.url);
const isDirectRun = Boolean(process.argv[1]) && path.resolve(process.argv[1]).toLowerCase() === currentFile.toLowerCase();

if (isDirectRun) {
  const PORT = process.env.PORT || 3001;
  const distDir = path.resolve(path.dirname(currentFile), '../dist');

  if (fs.existsSync(distDir)) {
    app.use(express.static(distDir));
    app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(path.join(distDir, 'index.html')));
  }

  initDatabase()
    .then(() => app.listen(PORT, () => console.log(`⚡ Wallet Flow API activa en http://localhost:${PORT}`)))
    .catch(() => process.exit(1));
}
