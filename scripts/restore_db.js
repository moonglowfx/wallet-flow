import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db, initDatabase, runBatched, withTransaction } from '../server/db.js';
import {
  DEFAULT_EXCHANGE_RATE,
  accountRow,
  currencyCode,
  debtPaymentRow,
  debtRow,
  insertStmt,
  safeRate,
  subscriptionRow,
  text,
  transactionRow,
} from '../server/models.js';
import { hashPin, usernameKey } from '../server/security.js';

const __filename = fileURLToPath(import.meta.url);
const backupsDir = path.resolve(path.dirname(__filename), '..', 'backups');

// Claves de app_state que pertenecen a la instalación y nunca se restauran desde un snapshot.
const PROTECTED_STATE_KEYS = new Set(['session_secret', 'schema_version']);

/** Fila de usuario compatible con snapshots antiguos (PIN en claro) y actuales (pinHash). */
async function userStatement(u) {
  const pinHash = u.pinHash || (u.pin ? await hashPin(String(u.pin)) : null);
  return insertStmt(
    'users',
    {
      id: String(u.id),
      username: text(u.username, String(u.id), 40),
      usernameKey: u.usernameKey || usernameKey(u.username) || String(u.id).toLowerCase(),
      displayName: text(u.displayName, text(u.username, String(u.id), 40), 40),
      pin: '',
      pinHash,
      role: text(u.role, 'Cuenta Personal', 40),
      avatarGradient: u.avatarGradient ?? null,
      description: u.description ?? null,
      currency: currencyCode(u.currency),
      exchangeRate: safeRate(u.exchangeRate ?? DEFAULT_EXCHANGE_RATE),
      isAdmin: u.isAdmin ? 1 : 0,
      sessionVersion: Number(u.sessionVersion) || 1,
    },
    'replace'
  );
}

export async function restoreDatabase(snapshotOrPath = null) {
  let snapshot;
  let source;

  if (snapshotOrPath && typeof snapshotOrPath === 'object') {
    snapshot = snapshotOrPath;
    source = 'objeto JSON en memoria';
  } else {
    source = snapshotOrPath || path.join(backupsDir, 'wallet_flow_snapshot_latest.json');
    if (!fs.existsSync(source)) throw new Error(`No se encontró el archivo de snapshot para restaurar: ${source}`);
    snapshot = JSON.parse(fs.readFileSync(source, 'utf-8'));
  }

  // Admite { data: { accounts, ... } } y { accounts, ... }
  const data = snapshot.data || snapshot;
  if (!data || (!Array.isArray(data.accounts) && !Array.isArray(data.transactions))) {
    throw new Error('El archivo de snapshot no contiene una estructura válida de datos.');
  }

  console.log(`⏳ Restaurando datos desde: ${source}`);
  await initDatabase();

  const owner = (row) => row.userId || 'munboi';
  const statements = [];

  for (const u of data.users || []) {
    if (u?.id) statements.push(await userStatement(u));
  }
  for (const a of data.accounts || []) statements.push(insertStmt('accounts', accountRow(a, owner(a)), 'replace'));
  for (const t of data.transactions || []) statements.push(insertStmt('transactions', transactionRow(t, owner(t)), 'replace'));
  for (const s of data.subscriptions || []) statements.push(insertStmt('subscriptions', subscriptionRow(s, owner(s)), 'replace'));
  for (const d of data.debts || []) statements.push(insertStmt('debts', debtRow(d, owner(d)), 'replace'));
  for (const p of data.debt_payments || []) {
    if (p?.debtId) statements.push(insertStmt('debt_payments', debtPaymentRow(p, p.debtId, owner(p)), 'replace'));
  }
  for (const st of data.app_state || []) {
    if (!st?.key || PROTECTED_STATE_KEYS.has(st.key)) continue;
    statements.push({ sql: 'INSERT OR REPLACE INTO app_state (key, value) VALUES (?, ?)', args: [st.key, String(st.value)] });
  }
  const asJson = (value) => (typeof value === 'string' ? value : JSON.stringify(value || {}));
  for (const pr of data.prisma_settings || []) {
    statements.push({
      sql: `INSERT OR REPLACE INTO prisma_settings (userId, income, fixed, goal, emerStock, profileKey, alloc, locks, disabled, yieldRates, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        pr.userId || 'munboi',
        pr.income ?? 7504,
        pr.fixed ?? 200,
        pr.goal ?? 4000,
        pr.emerStock ?? 4000,
        pr.profileKey || 'mid',
        asJson(pr.alloc),
        asJson(pr.locks),
        asJson(pr.disabled),
        asJson(pr.yieldRates),
        pr.updated_at || new Date().toISOString(),
      ],
    });
  }

  // Todo o nada: un fallo a mitad de camino no deja la base de datos a medio restaurar.
  await withTransaction((tx) => runBatched(tx, statements));
  await db.execute("INSERT OR REPLACE INTO app_state (key, value) VALUES ('db_initialized', 'true')");

  console.log(`✅ Base de datos restaurada con éxito: ${statements.length} registros cargados.`);
  return { success: true, count: statements.length };
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  restoreDatabase(process.argv[2] || null)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Error restaurando la base de datos:', err);
      process.exit(1);
    });
}
