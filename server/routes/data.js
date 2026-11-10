// Estado consolidado, importación masiva, limpieza/restablecimiento y administración de respaldos.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Router } from 'express';
import {
  SEED_OWNER_ID,
  clearUserData,
  clearUserStatements,
  db,
  getDatabaseConnectionInfo,
  runBatched,
  seedUserData,
  withTransaction,
} from '../db.js';
import { requireAdmin } from '../auth.js';
import { badRequest, notFound } from '../http.js';
import {
  accountRow,
  currencyCode,
  debtPaymentRow,
  debtRow,
  entityId,
  insertStmt,
  subscriptionRow,
  toPublicUser,
  toTransaction,
  transactionRow,
} from '../models.js';
import { randomId } from '../security.js';
import { accountOrderKey, listAccounts } from './accounts.js';
import { listDebts, listSubscriptions } from './commitments.js';
import { createDatabaseBackup } from '../../scripts/backup_db.js';
import { restoreDatabase } from '../../scripts/restore_db.js';

const SNAPSHOT_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../backups/wallet_flow_snapshot_latest.json'
);
const IMPORT_LIMITS = { accounts: 500, transactions: 50000, subscriptions: 2000, debts: 2000 };
const ID_LOOKUP_CHUNK = 200;

/** Ids del lote que ya pertenecen a OTRO usuario (los ids son clave primaria global). */
async function findForeignIds(table, ids, userId) {
  const foreign = new Set();
  for (let i = 0; i < ids.length; i += ID_LOOKUP_CHUNK) {
    const chunk = ids.slice(i, i + ID_LOOKUP_CHUNK);
    const { rows } = await db.execute({
      sql: `SELECT id FROM ${table} WHERE (userId IS NULL OR userId != ?) AND id IN (${chunk.map(() => '?').join(', ')})`,
      args: [userId, ...chunk],
    });
    for (const row of rows) foreign.add(row.id);
  }
  return foreign;
}

/**
 * Normaliza un lote y reasigna los ids que colisionan con datos ajenos, de modo que importar un respaldo
 * de otra cuenta jamás sobrescriba ni "robe" filas de su propietario. Devuelve el mapa idOriginal -> idFinal.
 */
async function prepareRows(table, prefix, inputs, toRow, userId) {
  const byId = new Map();
  for (const input of inputs) {
    const row = toRow(input);
    byId.set(row.id, row); // un id repetido dentro del lote: prevalece el último
  }
  const foreign = await findForeignIds(table, [...byId.keys()], userId);
  const idMap = new Map();
  const rows = [];
  for (const [originalId, row] of byId) {
    const id = foreign.has(originalId) ? randomId(prefix) : originalId;
    idMap.set(originalId, id);
    rows.push({ ...row, id });
  }
  return { rows, idMap };
}

const asList = (value, limit, label) => {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw badRequest(`${label} debe ser un arreglo.`);
  if (value.length > limit) throw badRequest(`${label} excede el máximo permitido (${limit}).`);
  return value.filter((item) => item && typeof item === 'object');
};

export const dataRouter = Router();

// ----------------- ESTADO COMPLETO DEL USUARIO -----------------
dataRouter.get('/state', async (req, res) => {
  const userId = req.user.id;
  const [accounts, transactions, subscriptions, debts] = await Promise.all([
    listAccounts(userId),
    db.execute({
      sql: 'SELECT * FROM transactions WHERE userId = ? ORDER BY date DESC, created_at DESC',
      args: [userId],
    }),
    listSubscriptions(userId),
    listDebts(userId),
  ]);
  res.json({
    user: toPublicUser(req.user),
    accounts,
    transactions: transactions.rows.map(toTransaction),
    subscriptions,
    debts,
  });
});

// ----------------- IMPORTACIÓN MASIVA (transacción única: todo o nada) -----------------
dataRouter.post('/import', async (req, res) => {
  const userId = req.user.id;
  const body = req.body || {};
  const mode = body.mode === 'merge' ? 'merge' : 'replace';

  const inAccounts = asList(body.accounts, IMPORT_LIMITS.accounts, 'accounts');
  const inTransactions = asList(body.transactions, IMPORT_LIMITS.transactions, 'transactions');
  const inSubscriptions = asList(body.subscriptions, IMPORT_LIMITS.subscriptions, 'subscriptions');
  // Se fija el id de cada deuda desde ya para que sus abonos la referencien de forma estable.
  const inDebts = asList(body.debts, IMPORT_LIMITS.debts, 'debts').map((d) => ({ ...d, id: entityId(d.id, 'debt') }));

  const accounts = await prepareRows('accounts', 'acc', inAccounts, (a) => accountRow(a, userId), userId);
  const fallbackAccountId = accounts.rows[0]?.id || '';
  const mapAccount = (id) => accounts.idMap.get(id) ?? (id || fallbackAccountId);

  const transactions = await prepareRows(
    'transactions',
    'tx',
    inTransactions,
    (t) => {
      const row = transactionRow(t, userId);
      return { ...row, accountId: mapAccount(row.accountId) };
    },
    userId
  );
  const subscriptions = await prepareRows(
    'subscriptions',
    'sub',
    inSubscriptions,
    (s) => {
      const row = subscriptionRow(s, userId);
      return { ...row, accountId: mapAccount(row.accountId) };
    },
    userId
  );
  const debts = await prepareRows('debts', 'debt', inDebts, (d) => debtRow(d, userId), userId);

  const paymentInputs = [];
  for (const debt of inDebts) {
    const row = debtRow(debt, userId);
    const debtId = debts.idMap.get(row.id);
    for (const p of Array.isArray(debt.payments) ? debt.payments : []) {
      if (p && typeof p === 'object') paymentInputs.push({ payment: p, debtId, currency: row.currency });
    }
  }
  const payments = await prepareRows(
    'debt_payments',
    'pay',
    paymentInputs,
    ({ payment, debtId, currency }) => {
      const row = debtPaymentRow(payment, debtId, userId, currency);
      return { ...row, accountId: row.accountId ? mapAccount(row.accountId) : null };
    },
    userId
  );

  const statements = [];
  if (mode === 'replace') statements.push(...clearUserStatements(userId));

  if (body.currency || body.exchangeRate) {
    const rate = Number(body.exchangeRate);
    statements.push({
      sql: `UPDATE users
            SET currency = COALESCE(?, currency), exchangeRate = COALESCE(?, exchangeRate), updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
      args: [
        body.currency ? currencyCode(body.currency) : null,
        Number.isFinite(rate) && rate > 0 && rate <= 1_000_000 ? rate : null,
        userId,
      ],
    });
  }
  if (accounts.rows.length > 0) {
    statements.push({
      sql: 'INSERT OR REPLACE INTO app_state (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
      args: [accountOrderKey(userId), JSON.stringify(accounts.rows.map((a) => a.id))],
    });
  }
  // Tras `prepareRows`, cualquier id en conflicto es del propio usuario: REPLACE es seguro.
  for (const [table, batch] of [
    ['accounts', accounts],
    ['transactions', transactions],
    ['subscriptions', subscriptions],
    ['debts', debts],
    ['debt_payments', payments],
  ]) {
    for (const row of batch.rows) statements.push(insertStmt(table, row, 'replace'));
  }

  await withTransaction((tx) => runBatched(tx, statements));

  res.json({
    success: true,
    counts: {
      accounts: accounts.rows.length,
      transactions: transactions.rows.length,
      subscriptions: subscriptions.rows.length,
      debts: debts.rows.length,
    },
  });
});

// ----------------- LIMPIEZA Y RESTABLECIMIENTO (solo datos del usuario autenticado) -----------------
dataRouter.post('/clear', async (req, res) => {
  await clearUserData(req.user.id);
  res.json({ message: 'Datos del usuario eliminados.' });
});

dataRouter.post('/reset-demo', async (req, res) => {
  const isSeedOwner = req.user.id === SEED_OWNER_ID;
  if (isSeedOwner) await createDatabaseBackup(); // respaldo de seguridad antes de un restablecimiento intencional
  await seedUserData(req.user.id);
  res.json({ message: isSeedOwner ? 'Portafolio demo restablecido.' : 'Datos del usuario eliminados.' });
});

// ----------------- BASE DE DATOS: INFORMACIÓN Y RESPALDOS -----------------
dataRouter.get('/database/info', async (req, res) => {
  const count = (table) =>
    db
      .execute({ sql: `SELECT COUNT(*) AS c FROM ${table} WHERE userId = ?`, args: [req.user.id] })
      .then((r) => Number(r.rows[0]?.c || 0));
  const [accounts, transactions] = await Promise.all([count('accounts'), count('transactions')]);
  res.json({ ...getDatabaseConnectionInfo(), records: { accounts, transactions } });
});

// Los respaldos contienen datos de TODOS los usuarios: exclusivos del administrador.
dataRouter.post('/database/backup', requireAdmin, async (_req, res) => {
  res.json(await createDatabaseBackup());
});

dataRouter.get('/database/snapshot/latest', requireAdmin, (_req, res) => {
  if (!fs.existsSync(SNAPSHOT_PATH)) throw notFound('No se encontró un snapshot previo en el servidor.');
  res.json(JSON.parse(fs.readFileSync(SNAPSHOT_PATH, 'utf-8')));
});

dataRouter.post('/database/restore', requireAdmin, async (req, res) => {
  const snapshot = req.body?.snapshot;
  res.json(await restoreDatabase(snapshot && typeof snapshot === 'object' ? snapshot : null));
});
