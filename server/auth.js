// Sesiones por cookie HttpOnly firmada (TTL 30 días) y middlewares de autorización.
import crypto from 'node:crypto';
import { db } from './db.js';
import { HttpError } from './http.js';
import { SESSION_TTL_SECONDS, signSessionToken, verifySessionToken } from './security.js';

const SESSION_COOKIE = 'wf_session';
const LEGACY_COOKIE = 'wf_account_id'; // cookie insegura de versiones anteriores: se elimina activamente

let secretPromise = null;

/**
 * Secreto de firma: SESSION_SECRET del entorno o, en su defecto, uno aleatorio persistido en la base
 * de datos (INSERT OR IGNORE + SELECT garantiza que todas las instancias serverless converjan al mismo).
 */
function getSessionSecret() {
  secretPromise ||= (async () => {
    const fromEnv = String(process.env.SESSION_SECRET || '').trim();
    if (fromEnv.length >= 32) return fromEnv;
    if (fromEnv) console.warn('⚠️ SESSION_SECRET demasiado corto (mínimo 32 caracteres): se ignora.');

    await db.execute({
      sql: "INSERT OR IGNORE INTO app_state (key, value) VALUES ('session_secret', ?)",
      args: [crypto.randomBytes(48).toString('base64url')],
    });
    const { rows } = await db.execute("SELECT value FROM app_state WHERE key = 'session_secret'");
    return rows[0].value;
  })().catch((err) => {
    secretPromise = null;
    throw err;
  });
  return secretPromise;
}

function readCookie(req, name) {
  const header = req.headers?.cookie;
  if (!header) return null;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    if (part.slice(0, idx).trim() === name) {
      try {
        return decodeURIComponent(part.slice(idx + 1).trim());
      } catch {
        return null;
      }
    }
  }
  return null;
}

function cookieAttributes(req, maxAge) {
  const isHttps = req.secure || String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim() === 'https';
  return `Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${isHttps ? '; Secure' : ''}`;
}

export async function startSession(req, res, user) {
  const token = signSessionToken(
    { userId: user.id, sessionVersion: Number(user.sessionVersion || 1) },
    await getSessionSecret()
  );
  res.setHeader('Set-Cookie', [
    `${SESSION_COOKIE}=${token}; ${cookieAttributes(req, SESSION_TTL_SECONDS)}`,
    `${LEGACY_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`,
  ]);
}

export function endSession(req, res) {
  res.setHeader('Set-Cookie', [
    `${SESSION_COOKIE}=; ${cookieAttributes(req, 0)}`,
    `${LEGACY_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`,
  ]);
}

/**
 * Exige una sesión válida y carga el usuario en `req.user`.
 * La identidad proviene EXCLUSIVAMENTE del token firmado: cualquier `userId` enviado por el cliente se ignora.
 * `sessionVersion` permite invalidar todas las sesiones al cambiar el PIN.
 */
export async function requireAuth(req, res, next) {
  const claims = verifySessionToken(readCookie(req, SESSION_COOKIE), await getSessionSecret());
  if (claims) {
    const { rows } = await db.execute({ sql: 'SELECT * FROM users WHERE id = ?', args: [claims.uid] });
    const user = rows[0];
    if (user && Number(user.sessionVersion || 1) === Number(claims.sv)) {
      req.user = user;
      return next();
    }
  }
  endSession(req, res);
  throw new HttpError(401, 'Tu sesión expiró. Inicia sesión de nuevo.');
}

export function requireAdmin(req, _res, next) {
  if (!req.user?.isAdmin) throw new HttpError(403, 'Esta acción requiere permisos de administrador.');
  next();
}
