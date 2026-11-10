// Utilidades HTTP transversales: errores tipados, limitador en memoria y manejador de errores centralizado.

export class HttpError extends Error {
  constructor(status, message, extra = {}) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}

export const badRequest = (message) => new HttpError(400, message);
export const notFound = (message = 'Recurso no encontrado') => new HttpError(404, message);
export const conflict = (message) => new HttpError(409, message);

export function clientIp(req) {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return forwarded || req.socket?.remoteAddress || 'unknown';
}

/**
 * Limitador de ventana fija en memoria (defensa por instancia; el bloqueo por usuario persistido
 * en base de datos es la protección autoritativa contra fuerza bruta).
 */
export function createRateLimiter({ max, windowMs }) {
  const hits = new Map();
  return (key) => {
    const now = Date.now();
    if (hits.size > 5000) {
      for (const [k, entry] of hits) if (entry.resetAt <= now) hits.delete(k);
    }
    const entry = hits.get(key);
    if (!entry || entry.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      return;
    }
    entry.count += 1;
    if (entry.count > max) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      throw new HttpError(429, 'Demasiados intentos. Espera un momento e inténtalo de nuevo.', { retryAfter });
    }
  };
}

export function notFoundHandler(_req, res) {
  res.status(404).json({ error: 'Ruta no encontrada' });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  if (err instanceof HttpError) {
    if (err.extra?.retryAfter) res.setHeader('Retry-After', String(err.extra.retryAfter));
    return res.status(err.status).json({ error: err.message, ...err.extra });
  }
  if (err?.type === 'entity.too.large') return res.status(413).json({ error: 'El contenido enviado es demasiado grande.' });
  if (err?.type === 'entity.parse.failed') return res.status(400).json({ error: 'JSON inválido.' });

  // Los detalles internos (SQL, rutas, stack) nunca se exponen al cliente.
  console.error('❌ Error no controlado:', err);
  res.status(500).json({ error: 'Error interno del servidor. Inténtalo de nuevo.' });
}
