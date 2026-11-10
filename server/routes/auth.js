import { Router } from 'express';
import { db } from '../db.js';
import { startSession, endSession, requireAuth } from '../auth.js';
import { HttpError, badRequest, conflict, clientIp, createRateLimiter } from '../http.js';
import { DEFAULT_EXCHANGE_RATE, currencyCode, text, toPublicUser } from '../models.js';
import {
  PIN_REGEX,
  USERNAME_REGEX,
  burnPinVerification,
  hashPin,
  normalizeUsername,
  randomId,
  usernameKey,
  verifyPin,
} from '../security.js';

const MAX_FAILED_ATTEMPTS = 5;
const BASE_LOCK_MS = 15 * 60 * 1000;
const MAX_LOCK_MS = 24 * 60 * 60 * 1000;
const INVALID_CREDENTIALS = 'Usuario o PIN incorrectos.';

const AVATAR_GRADIENTS = [
  'from-purple-600 via-indigo-600 to-fuchsia-600',
  'from-fuchsia-600 via-pink-600 to-rose-600',
  'from-violet-600 via-purple-600 to-indigo-600',
  'from-indigo-600 via-violet-600 to-purple-600',
  'from-pink-600 via-fuchsia-600 to-purple-600',
];

const loginIpLimiter = createRateLimiter({ max: 30, windowMs: 15 * 60 * 1000 });
const registerIpLimiter = createRateLimiter({ max: 10, windowMs: 60 * 60 * 1000 });

function readCredentials(body) {
  const username = normalizeUsername(body?.username);
  const pin = typeof body?.pin === 'string' ? body.pin : '';
  return { username, pin };
}

function lockedError(lockedUntil) {
  const minutes = Math.max(1, Math.ceil((Number(lockedUntil) - Date.now()) / 60000));
  const wait = minutes >= 60 ? `${Math.ceil(minutes / 60)} h` : `${minutes} min`;
  return new HttpError(429, `Demasiados intentos fallidos. Inténtalo de nuevo en ${wait}.`, {
    retryAfter: minutes * 60,
  });
}

/**
 * Reserva un intento ANTES de verificar el PIN, en una sola sentencia atómica.
 * Así N peticiones paralelas no pueden probar más PINs que el máximo permitido: al alcanzar el límite
 * la misma sentencia fija `lockedUntil` (bloqueo exponencial: 15 min, 30 min, 1 h… hasta 24 h).
 * Devuelve false si la cuenta ya está bloqueada.
 */
async function reserveAttempt(userId) {
  const now = Date.now();
  const { rows } = await db.execute({
    sql: `UPDATE users
          SET failedAttempts = failedAttempts + 1,
              lockedUntil = CASE
                WHEN failedAttempts + 1 >= ?
                  THEN ? + MIN(?, ? * (1 << MIN(failedAttempts + 1 - ?, 10)))
                ELSE lockedUntil
              END
          WHERE id = ? AND lockedUntil <= ?
          RETURNING failedAttempts`,
    args: [MAX_FAILED_ATTEMPTS, now, MAX_LOCK_MS, BASE_LOCK_MS, MAX_FAILED_ATTEMPTS, userId, now],
  });
  return rows.length > 0;
}

export const authRouter = Router();

authRouter.post('/auth/register', async (req, res) => {
  if (process.env.ALLOW_REGISTRATION === 'false') {
    throw new HttpError(403, 'El registro de nuevos usuarios está deshabilitado.');
  }
  registerIpLimiter(clientIp(req));

  const { username, pin } = readCredentials(req.body);
  if (!USERNAME_REGEX.test(username)) {
    throw badRequest('El usuario debe tener de 3 a 20 caracteres: letras, números, punto, guion o guion bajo.');
  }
  if (!PIN_REGEX.test(pin)) throw badRequest('El PIN debe tener exactamente 4 dígitos.');

  const id = randomId('usr');
  const pinHash = await hashPin(pin);
  const gradient = AVATAR_GRADIENTS[Math.floor(Math.random() * AVATAR_GRADIENTS.length)];

  let created;
  try {
    // El primer usuario de una instalación vacía se convierte en administrador (subconsulta atómica).
    const result = await db.execute({
      sql: `INSERT INTO users
              (id, username, usernameKey, displayName, pin, pinHash, role, avatarGradient, description, currency, exchangeRate, isAdmin)
            VALUES (?, ?, ?, ?, '', ?, 'Cuenta Personal', ?, '', 'USD', ?,
                    CASE WHEN EXISTS (SELECT 1 FROM users) THEN 0 ELSE 1 END)
            RETURNING *`,
      args: [id, username, usernameKey(username), username, pinHash, gradient, DEFAULT_EXCHANGE_RATE],
    });
    created = result.rows[0];
  } catch (err) {
    if (/UNIQUE|constraint/i.test(String(err?.message))) throw conflict('Ese nombre de usuario ya está en uso.');
    throw err;
  }

  await startSession(req, res, created);
  res.status(201).json({ user: toPublicUser(created) });
});

authRouter.post('/auth/login', async (req, res) => {
  loginIpLimiter(clientIp(req));

  const { username, pin } = readCredentials(req.body);
  if (!username || !PIN_REGEX.test(pin)) throw new HttpError(401, INVALID_CREDENTIALS);

  const { rows } = await db.execute({
    sql: 'SELECT * FROM users WHERE usernameKey = ?',
    args: [usernameKey(username)],
  });
  const user = rows[0];

  if (!user || !user.pinHash) {
    await burnPinVerification(pin);
    throw new HttpError(401, INVALID_CREDENTIALS);
  }
  if (Number(user.lockedUntil) > Date.now()) throw lockedError(user.lockedUntil);
  if (!(await reserveAttempt(user.id))) {
    const fresh = await db.execute({ sql: 'SELECT lockedUntil FROM users WHERE id = ?', args: [user.id] });
    throw lockedError(fresh.rows[0]?.lockedUntil);
  }

  if (!(await verifyPin(pin, user.pinHash))) {
    const remaining = MAX_FAILED_ATTEMPTS - (Number(user.failedAttempts) + 1);
    throw new HttpError(
      401,
      remaining > 0 && remaining <= 2
        ? `${INVALID_CREDENTIALS} Te ${remaining === 1 ? 'queda 1 intento' : `quedan ${remaining} intentos`}.`
        : INVALID_CREDENTIALS
    );
  }

  await db.execute({ sql: 'UPDATE users SET failedAttempts = 0, lockedUntil = 0 WHERE id = ?', args: [user.id] });
  await startSession(req, res, user);
  res.json({ user: toPublicUser(user) });
});

authRouter.post('/auth/logout', (req, res) => {
  endSession(req, res);
  res.json({ ok: true });
});

authRouter.get('/auth/me', requireAuth, (req, res) => {
  res.json({ user: toPublicUser(req.user) });
});

authRouter.post('/auth/change-pin', requireAuth, async (req, res) => {
  const currentPin = typeof req.body?.currentPin === 'string' ? req.body.currentPin : '';
  const newPin = typeof req.body?.newPin === 'string' ? req.body.newPin : '';
  if (!PIN_REGEX.test(newPin)) throw badRequest('El nuevo PIN debe tener exactamente 4 dígitos.');

  if (Number(req.user.lockedUntil) > Date.now()) throw lockedError(req.user.lockedUntil);
  if (!(await reserveAttempt(req.user.id))) throw lockedError(Date.now() + BASE_LOCK_MS);
  if (!(await verifyPin(currentPin, req.user.pinHash))) throw badRequest('El PIN actual no es correcto.');

  // Incrementar sessionVersion cierra la sesión en todos los demás dispositivos.
  const { rows } = await db.execute({
    sql: `UPDATE users
          SET pinHash = ?, pin = '', sessionVersion = sessionVersion + 1, failedAttempts = 0, lockedUntil = 0,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
          RETURNING *`,
    args: [await hashPin(newPin), req.user.id],
  });
  await startSession(req, res, rows[0]);
  res.json({ ok: true });
});

authRouter.put('/users/me', requireAuth, async (req, res) => {
  const body = req.body || {};
  const current = req.user;

  const displayName = body.displayName !== undefined ? text(body.displayName, current.username, 40) : current.displayName;
  const role = body.role !== undefined ? text(body.role, 'Cuenta Personal', 40) : current.role;
  const currency = body.currency !== undefined ? currencyCode(body.currency, currencyCode(current.currency)) : current.currency;

  let exchangeRate = Number(current.exchangeRate || DEFAULT_EXCHANGE_RATE);
  if (body.exchangeRate !== undefined) {
    const rate = Number(body.exchangeRate);
    if (!Number.isFinite(rate) || rate <= 0 || rate > 1_000_000) throw badRequest('La tasa de cambio no es válida.');
    exchangeRate = rate;
  }

  const { rows } = await db.execute({
    sql: `UPDATE users
          SET displayName = ?, role = ?, currency = ?, exchangeRate = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
          RETURNING *`,
    args: [displayName, role, currency, exchangeRate, current.id],
  });
  res.json({ user: toPublicUser(rows[0]) });
});
