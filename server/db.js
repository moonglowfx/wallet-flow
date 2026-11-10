import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
import { hashPin, usernameKey } from './security.js';
import {
  DEFAULT_EXCHANGE_RATE,
  accountRow,
  transactionRow,
  subscriptionRow,
  debtRow,
  debtPaymentRow,
  insertStmt,
} from './models.js';

dotenv.config();

// Versión del esquema. Incrementar al añadir migraciones: el arranque solo ejecuta DDL cuando difiere.
const SCHEMA_VERSION = '3';
export const SEED_OWNER_ID = 'munboi';
const BATCH_CHUNK = 100;

const env = (...names) => {
  for (const name of names) {
    const value = String(process.env[name] ?? '').trim().replace(/^["']|["']$/g, '').trim();
    if (value) return value;
  }
  return undefined;
};

const isVercel = Boolean(process.env.VERCEL);

function resolveClientConfig() {
  let url = env('TURSO_DATABASE_URL', 'TURSO_DB_URL', 'TURSO_URL', 'DATABASE_URL', 'LIBSQL_URL', 'LIBSQL_CLIENT_URL');
  const authToken = env(
    'TURSO_AUTH_TOKEN',
    'TURSO_DB_AUTH_TOKEN',
    'TURSO_TOKEN',
    'DATABASE_AUTH_TOKEN',
    'LIBSQL_AUTH_TOKEN',
    'LIBSQL_CLIENT_AUTH_TOKEN'
  );

  // Dominio de Turso sin protocolo -> libsql://
  if (url && url.includes('.turso.io') && !url.includes('://')) url = `libsql://${url}`;

  const isRemote = Boolean(url && /^(libsql|https?|wss?):\/\//.test(url));

  if (isRemote) {
    // En serverless el disco es efímero: la réplica embebida solo aplica en servidores Node persistentes.
    if (env('TURSO_EMBEDDED_REPLICA') === 'true' && !isVercel) {
      console.log('🔗 Turso: réplica embebida (SQLite local + sincronización con Turso Cloud)');
      return { isRemote, config: { url: 'file:wallet_flow.db', syncUrl: url, authToken, syncInterval: 60000 } };
    }
    console.log('🔗 Turso Cloud: conexión directa');
    return { isRemote, config: { url, authToken } };
  }

  const localUrl = url || (isVercel ? 'file:/tmp/wallet_flow.db' : 'file:wallet_flow.db');
  if (isVercel) {
    console.warn(
      '⚠️ Vercel sin TURSO_DATABASE_URL: se usa /tmp/wallet_flow.db (efímero). Configura TURSO_DATABASE_URL y TURSO_AUTH_TOKEN.'
    );
  } else {
    console.log(`💾 SQLite local: ${localUrl}`);
  }
  return { isRemote, config: { url: localUrl, authToken } };
}

const { isRemote: isRemoteTurso, config: clientConfig } = resolveClientConfig();

export const db = createClient(clientConfig);

// ---------------------------------------------------------------------------
// Transacciones de escritura
// ---------------------------------------------------------------------------
let writeQueue = Promise.resolve();

/**
 * Ejecuta `fn(tx)` dentro de una transacción de escritura (BEGIN IMMEDIATE) con commit/rollback garantizado.
 * Las transacciones se serializan dentro del proceso para evitar SQLITE_BUSY en modo archivo local.
 */
export function withTransaction(fn) {
  const run = async () => {
    const tx = await db.transaction('write');
    try {
      const result = await fn(tx);
      await tx.commit();
      return result;
    } catch (err) {
      try {
        await tx.rollback();
      } catch {
        /* la transacción ya estaba cerrada */
      }
      throw err;
    } finally {
      tx.close();
    }
  };
  const result = writeQueue.then(run, run);
  writeQueue = result.catch(() => {});
  return result;
}

/** Ejecuta una lista de sentencias en lotes sobre un ejecutor (`db` o una transacción abierta). */
export async function runBatched(executor, statements) {
  for (let i = 0; i < statements.length; i += BATCH_CHUNK) {
    await executor.batch(statements.slice(i, i + BATCH_CHUNK));
  }
}

// ---------------------------------------------------------------------------
// Esquema
// ---------------------------------------------------------------------------
const DDL = `
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    usernameKey TEXT,
    displayName TEXT NOT NULL,
    pin TEXT NOT NULL DEFAULT '',
    pinHash TEXT,
    role TEXT NOT NULL,
    avatarGradient TEXT,
    description TEXT,
    currency TEXT DEFAULT 'USD',
    exchangeRate REAL DEFAULT ${DEFAULT_EXCHANGE_RATE},
    isAdmin INTEGER NOT NULL DEFAULT 0,
    sessionVersion INTEGER NOT NULL DEFAULT 1,
    failedAttempts INTEGER NOT NULL DEFAULT 0,
    lockedUntil INTEGER NOT NULL DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS app_state (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    institution TEXT NOT NULL,
    type TEXT NOT NULL,
    currency TEXT DEFAULT 'USD',
    balance REAL NOT NULL DEFAULT 0,
    creditLimit REAL,
    cutOffDay INTEGER,
    paymentDueDay INTEGER,
    accountNumber TEXT NOT NULL,
    accentGradient TEXT,
    yieldRate REAL,
    userId TEXT DEFAULT 'munboi',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    amount REAL NOT NULL,
    currency TEXT DEFAULT 'USD',
    originalAmount REAL,
    type TEXT NOT NULL,
    category TEXT NOT NULL,
    accountId TEXT NOT NULL,
    date TEXT NOT NULL,
    notes TEXT,
    isAntExpense INTEGER DEFAULT 0,
    userId TEXT DEFAULT 'munboi',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS subscriptions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    amount REAL NOT NULL,
    currency TEXT DEFAULT 'USD',
    billingDay INTEGER NOT NULL,
    accountId TEXT NOT NULL,
    active INTEGER DEFAULT 1,
    essential INTEGER DEFAULT 0,
    badgeColor TEXT,
    autoCharge INTEGER DEFAULT 1,
    userId TEXT DEFAULT 'munboi',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS debts (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    counterparty TEXT NOT NULL,
    category TEXT NOT NULL,
    currency TEXT DEFAULT 'USD',
    totalAmount REAL NOT NULL,
    paidAmount REAL NOT NULL,
    interestRate REAL DEFAULT 0,
    minimumMonthlyPayment REAL DEFAULT 0,
    dueDate TEXT NOT NULL,
    userId TEXT DEFAULT 'munboi',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS debt_payments (
    id TEXT PRIMARY KEY,
    debtId TEXT NOT NULL,
    amount REAL NOT NULL,
    currency TEXT DEFAULT 'USD',
    date TEXT NOT NULL,
    note TEXT,
    accountId TEXT,
    userId TEXT DEFAULT 'munboi',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS prisma_settings (
    userId TEXT PRIMARY KEY,
    income REAL NOT NULL DEFAULT 7504,
    fixed REAL NOT NULL DEFAULT 200,
    goal REAL NOT NULL DEFAULT 4000,
    emerStock REAL NOT NULL DEFAULT 4000,
    profileKey TEXT NOT NULL DEFAULT 'mid',
    alloc TEXT NOT NULL,
    locks TEXT NOT NULL,
    disabled TEXT NOT NULL,
    yieldRates TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_accounts_user ON accounts(userId);
  CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(userId, date DESC);
  CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(userId);
  CREATE INDEX IF NOT EXISTS idx_debts_user ON debts(userId);
  CREATE INDEX IF NOT EXISTS idx_debt_payments_user ON debt_payments(userId);
`;

// Columnas añadidas después de la v1: se agregan de forma aditiva a bases de datos preexistentes.
const ADDITIVE_COLUMNS = [
  ...['accounts', 'transactions', 'subscriptions', 'debts', 'debt_payments'].flatMap((table) => [
    [table, "userId TEXT DEFAULT 'munboi'"],
    [table, "currency TEXT DEFAULT 'USD'"],
  ]),
  ['transactions', 'originalAmount REAL'],
  ['subscriptions', 'autoCharge INTEGER DEFAULT 1'],
  ['users', 'usernameKey TEXT'],
  ['users', 'pinHash TEXT'],
  ['users', 'isAdmin INTEGER NOT NULL DEFAULT 0'],
  ['users', 'sessionVersion INTEGER NOT NULL DEFAULT 1'],
  ['users', 'failedAttempts INTEGER NOT NULL DEFAULT 0'],
  ['users', 'lockedUntil INTEGER NOT NULL DEFAULT 0'],
];

const DEFAULT_USERS = [
  {
    id: SEED_OWNER_ID,
    username: 'Munboi',
    displayName: 'Munboi Master',
    pin: '0800',
    role: 'Portafolio Principal',
    avatarGradient: 'from-purple-600 via-indigo-600 to-fuchsia-600',
    description: 'Portafolio demo con historial completo',
    isAdmin: 1,
  },
  {
    id: 'tiago',
    username: 'Tiago',
    displayName: 'Tiago',
    pin: '5678',
    role: 'Cuenta Personal',
    avatarGradient: 'from-fuchsia-600 via-pink-600 to-rose-600',
    description: 'Cuenta limpia sin datos iniciales',
    isAdmin: 0,
  },
];

async function addColumnIfMissing(table, definition) {
  try {
    await db.execute(`ALTER TABLE ${table} ADD COLUMN ${definition}`);
  } catch (err) {
    if (!/duplicate column/i.test(String(err?.message))) throw err;
  }
}

/** Convierte PINs heredados en texto plano a hash scrypt y asigna la clave canónica de usuario. */
async function migrateLegacyUsers() {
  const { rows } = await db.execute('SELECT id, username, usernameKey, pin, pinHash FROM users');
  const takenKeys = new Set(rows.map((r) => r.usernameKey).filter(Boolean));
  const statements = [];

  for (const row of rows) {
    let key = row.usernameKey;
    if (!key) {
      key = usernameKey(row.username) || String(row.id).toLowerCase();
      if (takenKeys.has(key)) key = `${key}-${String(row.id).toLowerCase()}`;
      takenKeys.add(key);
    }
    const needsHash = !row.pinHash && row.pin;
    if (!needsHash && key === row.usernameKey) continue;

    const pinHash = needsHash ? await hashPin(row.pin) : row.pinHash;
    statements.push({
      // El PIN en claro se elimina en cuanto existe su hash.
      sql: "UPDATE users SET usernameKey = ?, pinHash = ?, pin = CASE WHEN ? IS NOT NULL THEN '' ELSE pin END WHERE id = ?",
      args: [key, pinHash ?? null, pinHash ?? null, row.id],
    });
  }

  if (statements.length > 0) await db.batch(statements);
}

async function insertDefaultUsers() {
  const statements = [];
  for (const u of DEFAULT_USERS) {
    statements.push({
      sql: `INSERT OR IGNORE INTO users
              (id, username, usernameKey, displayName, pin, pinHash, role, avatarGradient, description, currency, exchangeRate, isAdmin)
            VALUES (?, ?, ?, ?, '', ?, ?, ?, ?, 'USD', ?, ?)`,
      args: [
        u.id,
        u.username,
        usernameKey(u.username),
        u.displayName,
        await hashPin(u.pin),
        u.role,
        u.avatarGradient,
        u.description,
        DEFAULT_EXCHANGE_RATE,
        u.isAdmin,
      ],
    });
  }
  await db.batch(statements);
}

async function migrate() {
  await db.executeMultiple(DDL);
  for (const [table, definition] of ADDITIVE_COLUMNS) await addColumnIfMissing(table, definition);

  const [usersCount, accountsCount] = await Promise.all([
    db.execute('SELECT COUNT(*) AS c FROM users'),
    db.execute('SELECT COUNT(*) AS c FROM accounts'),
  ]);
  const hasUsers = Number(usersCount.rows[0]?.c || 0) > 0;
  const hasAccounts = Number(accountsCount.rows[0]?.c || 0) > 0;

  // REGLA DE ORO: nunca se borra ni sobrescribe información existente.
  // Los usuarios demo (con PIN conocido) solo se crean fuera de producción o para adoptar datos heredados.
  const seedDemo = !hasUsers && !hasAccounts && !isVercel && env('SEED_DEMO_DATA') !== 'false';
  if (!hasUsers && (hasAccounts || seedDemo)) await insertDefaultUsers();

  await migrateLegacyUsers();
  await db.execute('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_key ON users(usernameKey)');

  // Debe existir siempre un administrador para operar respaldos/restauración globales.
  await db.execute({
    sql: `UPDATE users SET isAdmin = 1
          WHERE id = ? AND NOT EXISTS (SELECT 1 FROM users WHERE isAdmin = 1)`,
    args: [SEED_OWNER_ID],
  });

  if (seedDemo) {
    console.log('🌱 Primera ejecución local: sembrando portafolio demo...');
    await seedUserData(SEED_OWNER_ID);
  }

  await db.batch([
    {
      sql: "INSERT OR REPLACE INTO app_state (key, value, updated_at) VALUES ('schema_version', ?, CURRENT_TIMESTAMP)",
      args: [SCHEMA_VERSION],
    },
    "INSERT OR REPLACE INTO app_state (key, value, updated_at) VALUES ('db_initialized', 'true', CURRENT_TIMESTAMP)",
  ]);
  console.log(`✅ Esquema v${SCHEMA_VERSION} listo en ${isRemoteTurso ? 'Turso Cloud' : 'SQLite local'}.`);
}

let initPromise = null;

/**
 * Inicialización idempotente y no destructiva.
 * Ruta rápida: 1 sola consulta por arranque en frío cuando el esquema ya está en la versión actual.
 * Ante un fallo transitorio se descarta la promesa para reintentar en la siguiente petición.
 */
export function initDatabase() {
  initPromise ||= (async () => {
    try {
      if (clientConfig.syncUrl) {
        await db.sync().catch((err) => console.warn('⚠️ Turso sync (offline o primer inicio):', err.message));
      }
      const current = await db
        .execute("SELECT value FROM app_state WHERE key = 'schema_version'")
        .then((res) => res.rows[0]?.value)
        .catch(() => null); // las tablas aún no existen
      if (current !== SCHEMA_VERSION) await migrate();
    } catch (err) {
      initPromise = null;
      console.error('❌ Error inicializando base de datos:', err);
      throw err;
    }
  })();
  return initPromise;
}

// ---------------------------------------------------------------------------
// Mantenimiento por usuario
// ---------------------------------------------------------------------------
export const USER_DATA_TABLES = ['debt_payments', 'debts', 'subscriptions', 'transactions', 'accounts'];

export function clearUserStatements(userId) {
  return [
    ...USER_DATA_TABLES.map((table) => ({ sql: `DELETE FROM ${table} WHERE userId = ?`, args: [userId] })),
    { sql: 'DELETE FROM app_state WHERE key = ?', args: [`account_order_${userId}`] },
  ];
}

export async function clearUserData(userId) {
  if (!userId) throw new Error('clearUserData requiere un userId');
  await db.batch(clearUserStatements(userId));
}

/** Restablece el portafolio demo. Los ids de la semilla son fijos, por eso solo aplica a su propietario. */
export async function seedUserData(userId = SEED_OWNER_ID) {
  if (userId !== SEED_OWNER_ID) {
    await clearUserData(userId);
    return;
  }
  const seed = await import('./seedData.js');
  const statements = [
    ...clearUserStatements(userId),
    ...seed.INITIAL_ACCOUNTS.map((a) => insertStmt('accounts', accountRow(a, userId), 'replace')),
    ...seed.INITIAL_TRANSACTIONS.map((t) => insertStmt('transactions', transactionRow(t, userId), 'replace')),
    ...seed.INITIAL_SUBSCRIPTIONS.map((s) => insertStmt('subscriptions', subscriptionRow(s, userId), 'replace')),
  ];
  for (const debt of seed.INITIAL_DEBTS) {
    const row = debtRow(debt, userId);
    statements.push(insertStmt('debts', row, 'replace'));
    for (const p of debt.payments || []) {
      statements.push(insertStmt('debt_payments', debtPaymentRow(p, row.id, userId, row.currency), 'replace'));
    }
  }
  await withTransaction((tx) => runBatched(tx, statements));
}

export function getDatabaseConnectionInfo() {
  const url = clientConfig.url || '';
  let clientUrl = url;
  try {
    if (url.includes('://')) clientUrl = `libsql://${new URL(url.replace(/^libsql:/, 'https:')).host}`;
  } catch {
    clientUrl = isRemoteTurso ? 'libsql://…' : url;
  }
  return {
    isRemoteTurso,
    provider: isRemoteTurso ? 'Turso Cloud (libSQL)' : 'SQLite Local',
    clientUrl,
    isVercel,
    status: 'connected',
  };
}
