// Prisma Capital OS: configuración de asignación por cubetas, aislada por usuario.
import { Router } from 'express';
import { db } from '../db.js';
import { badRequest } from '../http.js';
import { num, text } from '../models.js';

const DEFAULTS = {
  income: 7504,
  fixed: 200,
  goal: 4000,
  emerStock: 4000,
  profileKey: 'mid',
  alloc: { emer: 12, deuda: 8, fiscal: 8, fija: 12, cripto: 12, refugio: 5, lp: 8, trade: 12, opp: 8, life: 15 },
  locks: {},
  disabled: {},
  yieldRates: { emer: 4.5, deuda: 0, fiscal: 4.0, fija: 6.5, cripto: 14.0, refugio: 5.5, lp: 10.0, trade: 18.0, opp: 8.0, life: 0 },
};
const NUMERIC_FIELDS = ['income', 'fixed', 'goal', 'emerStock'];
const JSON_FIELDS = ['alloc', 'locks', 'disabled', 'yieldRates'];
const MAX_JSON_LENGTH = 8000;

const parseObject = (raw, fallback = {}) => {
  try {
    const value = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return value && typeof value === 'object' && !Array.isArray(value) ? value : fallback;
  } catch {
    return fallback;
  }
};

function fromRow(row) {
  if (!row) return { ...DEFAULTS, updated_at: new Date().toISOString() };
  const settings = { profileKey: row.profileKey || DEFAULTS.profileKey, updated_at: row.updated_at };
  for (const field of NUMERIC_FIELDS) settings[field] = num(row[field], DEFAULTS[field]);
  for (const field of JSON_FIELDS) settings[field] = parseObject(row[field]);
  return settings;
}

async function loadSettings(userId) {
  const { rows } = await db.execute({ sql: 'SELECT * FROM prisma_settings WHERE userId = ?', args: [userId] });
  return rows[0] || null;
}

export const prismaRouter = Router();

prismaRouter.get('/prisma', async (req, res) => {
  res.json({ userId: req.user.id, ...fromRow(await loadSettings(req.user.id)) });
});

prismaRouter.post('/prisma', async (req, res) => {
  const userId = req.user.id;
  const body = req.body || {};
  const next = fromRow(await loadSettings(userId));

  for (const field of NUMERIC_FIELDS) {
    if (body[field] !== undefined) next[field] = num(body[field], next[field]);
  }
  if (body.profileKey !== undefined) next.profileKey = text(body.profileKey, next.profileKey, 40);
  for (const field of JSON_FIELDS) {
    if (body[field] === undefined) continue;
    const value = parseObject(body[field], null);
    if (!value) throw badRequest(`${field} debe ser un objeto.`);
    // alloc y yieldRates vacíos se ignoran para no borrar la configuración por una carga incompleta.
    const keepExisting = (field === 'alloc' || field === 'yieldRates') && Object.keys(value).length === 0;
    if (!keepExisting) next[field] = value;
  }

  const json = Object.fromEntries(JSON_FIELDS.map((field) => [field, JSON.stringify(next[field])]));
  if (Object.values(json).some((s) => s.length > MAX_JSON_LENGTH)) throw badRequest('Configuración demasiado grande.');

  await db.execute({
    sql: `INSERT OR REPLACE INTO prisma_settings
            (userId, income, fixed, goal, emerStock, profileKey, alloc, locks, disabled, yieldRates, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
    args: [userId, next.income, next.fixed, next.goal, next.emerStock, next.profileKey, json.alloc, json.locks, json.disabled, json.yieldRates],
  });

  res.json({ success: true, userId, ...next, updated_at: new Date().toISOString() });
});
