// Primitivas criptográficas puras (sin acceso a base de datos): hash de PIN y tokens de sesión firmados.
import crypto from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(crypto.scrypt);

export const PIN_REGEX = /^\d{4}$/;
// 3–20 caracteres: letras/números (cualquier idioma), punto, guion y guion bajo. Debe iniciar con letra o número.
export const USERNAME_REGEX = /^[\p{L}\p{N}][\p{L}\p{N}._-]{2,19}$/u;

export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 días

export function normalizeUsername(value) {
  return String(value ?? '').normalize('NFKC').trim();
}

/** Clave canónica para unicidad e inicio de sesión sin distinguir mayúsculas. */
export function usernameKey(value) {
  return normalizeUsername(value).toLowerCase();
}

export async function hashPin(pin) {
  const salt = crypto.randomBytes(16);
  const key = await scrypt(String(pin), salt, 32);
  return `scrypt$${salt.toString('base64url')}$${key.toString('base64url')}`;
}

export async function verifyPin(pin, stored) {
  const [scheme, saltB64, keyB64] = String(stored || '').split('$');
  if (scheme !== 'scrypt' || !saltB64 || !keyB64) return false;
  const expected = Buffer.from(keyB64, 'base64url');
  const actual = await scrypt(String(pin), Buffer.from(saltB64, 'base64url'), expected.length);
  return crypto.timingSafeEqual(actual, expected);
}

// Hash señuelo para igualar el tiempo de respuesta cuando el usuario no existe (anti-enumeración).
let decoyHashPromise = null;
export function burnPinVerification(pin) {
  decoyHashPromise ||= hashPin('0000');
  return decoyHashPromise.then((hash) => verifyPin(pin, hash)).then(() => false);
}

function sign(data, secret) {
  return crypto.createHmac('sha256', secret).update(data).digest('base64url');
}

/** Token compacto firmado con HMAC-SHA256: base64url(payload).firma */
export function signSessionToken({ userId, sessionVersion }, secret, ttlSeconds = SESSION_TTL_SECONDS) {
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(
    JSON.stringify({ uid: userId, sv: sessionVersion, iat: now, exp: now + ttlSeconds })
  ).toString('base64url');
  return `${payload}.${sign(payload, secret)}`;
}

export function verifySessionToken(token, secret) {
  if (typeof token !== 'string' || token.length > 1024) return null;
  const [payload, signature, ...rest] = token.split('.');
  if (!payload || !signature || rest.length > 0) return null;

  const expected = Buffer.from(sign(payload, secret));
  const received = Buffer.from(signature);
  if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) return null;

  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (typeof data.uid !== 'string' || typeof data.exp !== 'number') return null;
    if (data.exp <= Math.floor(Date.now() / 1000)) return null;
    return data;
  } catch {
    return null;
  }
}

export function randomId(prefix) {
  return `${prefix}-${crypto.randomUUID()}`;
}
