import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
import {
  INITIAL_ACCOUNTS,
  INITIAL_TRANSACTIONS,
  INITIAL_SUBSCRIPTIONS,
  INITIAL_DEBTS,
  DEFAULT_USD_COP_RATE,
} from '../src/data/mockData.js';

dotenv.config();

const defaultLocalUrl = process.env.VERCEL ? 'file:/tmp/wallet_flow.db' : 'file:wallet_flow.db';
const rawUrl =
  process.env.TURSO_DATABASE_URL ||
  process.env.DATABASE_URL ||
  process.env.LIBSQL_CLIENT_URL;

const authToken =
  process.env.TURSO_AUTH_TOKEN ||
  process.env.DATABASE_AUTH_TOKEN ||
  process.env.LIBSQL_CLIENT_AUTH_TOKEN ||
  undefined;

// Determine connection strategy: Turso Cloud, Embedded Replica (local SQLite + Turso sync), or Local SQLite
const isRemoteTurso = Boolean(
  rawUrl && (rawUrl.startsWith('libsql://') || rawUrl.startsWith('https://'))
);

let clientConfig = {};
if (isRemoteTurso) {
  if (process.env.TURSO_EMBEDDED_REPLICA === 'true') {
    clientConfig = {
      url: 'file:wallet_flow.db',
      syncUrl: rawUrl,
      authToken,
      syncInterval: 60000,
    };
    console.log('🔗 Turso: Conectado en modo réplica embebida (SQLite local + Turso Cloud sync)');
  } else {
    clientConfig = {
      url: rawUrl,
      authToken,
    };
    console.log(`🔗 Turso: Conectado directamente a base de datos en la nube (${rawUrl})`);
  }
} else {
  const localUrl = rawUrl || defaultLocalUrl;
  clientConfig = {
    url: localUrl,
    authToken,
  };
  console.log(`💾 SQLite: Conectado a archivo persistente (${localUrl})`);
}

export const db = createClient(clientConfig);

const DEFAULT_USERS = [
  {
    id: 'munboi',
    username: 'Munboi',
    displayName: 'Munboi Master',
    pin: '0800',
    role: 'Portafolio Principal',
    avatarGradient: 'from-purple-600 via-indigo-600 to-fuchsia-600',
    description: 'Historial completo 2024-2026 (726 transacciones reales)',
    currency: 'USD',
    exchangeRate: DEFAULT_USD_COP_RATE,
  },
  {
    id: 'tiago',
    username: 'Tiago',
    displayName: 'Tiago',
    pin: '5678',
    role: 'Cuenta Personal',
    avatarGradient: 'from-fuchsia-600 via-pink-600 to-rose-600',
    description: 'Cuenta limpia sin datos iniciales',
    currency: 'USD',
    exchangeRate: DEFAULT_USD_COP_RATE,
  },
];

let initPromise = null;

/**
 * Inicializador estrictamente no destructivo e idempotente de la base de datos.
 * Crea tablas e índices si no existen y PRESERVA el 100% de los datos preexistentes.
 * NUNCA elimina ni sobreescribe registros de usuarios en reinicios o despliegues.
 */
export async function initDatabase() {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    // 0. Si se usa réplica embebida de Turso, sincronizar antes de consultar
    if (typeof db.sync === 'function' && clientConfig.syncUrl) {
      try {
        await db.sync();
        console.log('🔄 Turso: Réplica local sincronizada con la nube.');
      } catch (syncErr) {
        console.warn('⚠️ Turso sync warning (offline o primer inicio):', syncErr.message);
      }
    }

    // 1. Users & Session State tables
    await db.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL,
        displayName TEXT NOT NULL,
        pin TEXT NOT NULL,
        role TEXT NOT NULL,
        avatarGradient TEXT,
        description TEXT,
        currency TEXT DEFAULT 'USD',
        exchangeRate REAL DEFAULT 3200,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS app_state (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Core Financial Tables with userId and native currency columns
    await db.execute(`
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
    `);

    await db.execute(`
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
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (accountId) REFERENCES accounts(id)
      );
    `);

    await db.execute(`
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
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (accountId) REFERENCES accounts(id)
      );
    `);

    await db.execute(`
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
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS debt_payments (
        id TEXT PRIMARY KEY,
        debtId TEXT NOT NULL,
        amount REAL NOT NULL,
        currency TEXT DEFAULT 'USD',
        date TEXT NOT NULL,
        note TEXT,
        accountId TEXT,
        userId TEXT DEFAULT 'munboi',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (debtId) REFERENCES debts(id)
      );
    `);

    // 3. Garantizar columnas no disruptivas de compatibilidad
    const tables = ['accounts', 'transactions', 'subscriptions', 'debts', 'debt_payments'];
    for (const t of tables) {
      try {
        await db.execute(`ALTER TABLE ${t} ADD COLUMN userId TEXT DEFAULT 'munboi'`);
      } catch (_) {}
      try {
        await db.execute(`ALTER TABLE ${t} ADD COLUMN currency TEXT DEFAULT 'USD'`);
      } catch (_) {}
    }
    try {
      await db.execute(`ALTER TABLE transactions ADD COLUMN originalAmount REAL`);
    } catch (_) {}
    try {
      await db.execute(`ALTER TABLE subscriptions ADD COLUMN autoCharge INTEGER DEFAULT 1`);
    } catch (_) {}

    // 4. Crear índices para rendimiento
    await db.execute('CREATE INDEX IF NOT EXISTS idx_accounts_user ON accounts(userId)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(userId, date DESC)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(userId)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_debts_user ON debts(userId)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_debt_payments_user ON debt_payments(userId)');

    // 5. Garantizar active_user_id en app_state
    await db.execute({
      sql: `INSERT OR IGNORE INTO app_state (key, value) VALUES ('active_user_id', 'munboi')`,
      args: [],
    });

    // 6. Verificar si ya existen datos en la base de datos
    const [initStateRes, accountsCountRes] = await Promise.all([
      db.execute("SELECT value FROM app_state WHERE key = 'db_initialized'"),
      db.execute("SELECT COUNT(*) as c FROM accounts"),
    ]);

    const isInitialized = initStateRes.rows[0]?.value === 'true';
    const totalAccounts = Number(accountsCountRes.rows[0]?.c || 0);

    // REGLA DE ORO DE PERSISTENCIA: Si ya hay cuentas o el estado marca inicializado,
    // NO ELIMINAR NINGÚN DATO, NO SOBREESCRIBIR Y NO RE-SEMBRAR.
    if (isInitialized || totalAccounts > 0) {
      // Registrar usuarios por defecto si faltaran, pero sin tocar nada preexistente
      for (const u of DEFAULT_USERS) {
        await db.execute({
          sql: `INSERT OR IGNORE INTO users (id, username, displayName, pin, role, avatarGradient, description, currency, exchangeRate)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            u.id,
            u.username,
            u.displayName,
            u.pin,
            u.role,
            u.avatarGradient,
            u.description,
            u.currency,
            u.exchangeRate,
          ],
        });
      }

      await db.execute(
        "INSERT OR REPLACE INTO app_state (key, value) VALUES ('db_initialized', 'true')"
      );

      console.log(
        `✅ Base de datos persistente verificada: ${totalAccounts} cuentas preservadas intactas en ${
          isRemoteTurso ? 'Turso Cloud' : 'SQLite local'
        }.`
      );
      return;
    }

    // 7. Únicamente si la base de datos está 100% vacía (primera vez absoluta):
    console.log('🌱 Primera ejecución: sembrando base de datos limpia por única vez...');
    for (const u of DEFAULT_USERS) {
      await db.execute({
        sql: `INSERT OR IGNORE INTO users (id, username, displayName, pin, role, avatarGradient, description, currency, exchangeRate)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          u.id,
          u.username,
          u.displayName,
          u.pin,
          u.role,
          u.avatarGradient,
          u.description,
          u.currency,
          u.exchangeRate,
        ],
      });
    }

    await seedUserData('munboi');
    await db.execute(
      "INSERT OR REPLACE INTO app_state (key, value) VALUES ('db_initialized', 'true')"
    );
    console.log('✅ Siembra inicial completada exitosamente.');
  })();

  return initPromise;
}

export async function clearDatabase(userId = null) {
  if (userId) {
    await db.batch([
      { sql: 'DELETE FROM debt_payments WHERE userId = ?', args: [userId] },
      { sql: 'DELETE FROM debts WHERE userId = ?', args: [userId] },
      { sql: 'DELETE FROM subscriptions WHERE userId = ?', args: [userId] },
      { sql: 'DELETE FROM transactions WHERE userId = ?', args: [userId] },
      { sql: 'DELETE FROM accounts WHERE userId = ?', args: [userId] },
    ]);
    console.log(`🧹 SQLite/Turso: Datos del usuario '${userId}' limpiados.`);
  } else {
    await db.batch([
      'DELETE FROM debt_payments',
      'DELETE FROM debts',
      'DELETE FROM subscriptions',
      'DELETE FROM transactions',
      'DELETE FROM accounts',
    ]);
    console.log('🧹 SQLite/Turso: Base de datos limpiada por completo.');
  }
}

export async function seedUserData(userId = 'munboi') {
  await clearDatabase(userId);

  if (userId === 'tiago') {
    return;
  }

  const statements = [];

  for (const acc of INITIAL_ACCOUNTS) {
    statements.push({
      sql: `INSERT OR REPLACE INTO accounts (id, name, institution, type, currency, balance, creditLimit, cutOffDay, paymentDueDay, accountNumber, accentGradient, yieldRate, userId)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        acc.id,
        acc.name,
        acc.institution,
        acc.type,
        acc.currency || 'USD',
        acc.balance ?? 0,
        acc.creditLimit ?? null,
        acc.cutOffDay ?? null,
        acc.paymentDueDay ?? null,
        acc.accountNumber,
        acc.accentGradient ?? null,
        acc.yieldRate ?? null,
        userId,
      ],
    });
  }

  for (const tx of INITIAL_TRANSACTIONS) {
    statements.push({
      sql: `INSERT OR REPLACE INTO transactions (id, title, amount, currency, originalAmount, type, category, accountId, date, notes, isAntExpense, userId)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        tx.id,
        tx.title,
        tx.amount,
        tx.currency || 'USD',
        tx.originalAmount ?? tx.amount,
        tx.type,
        tx.category,
        tx.accountId,
        tx.date,
        tx.notes ?? null,
        tx.isAntExpense ? 1 : 0,
        userId,
      ],
    });
  }

  for (const sub of INITIAL_SUBSCRIPTIONS) {
    statements.push({
      sql: `INSERT OR REPLACE INTO subscriptions (id, name, category, amount, currency, billingDay, accountId, active, essential, badgeColor, autoCharge, userId)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        sub.id,
        sub.name,
        sub.category,
        sub.amount,
        sub.currency || 'USD',
        sub.billingDay,
        sub.accountId,
        sub.active ? 1 : 0,
        sub.essential ? 1 : 0,
        sub.badgeColor || '#A855F7',
        sub.autoCharge !== 0 ? 1 : 0,
        userId,
      ],
    });
  }

  for (const debt of INITIAL_DEBTS) {
    statements.push({
      sql: `INSERT OR REPLACE INTO debts (id, title, counterparty, category, currency, totalAmount, paidAmount, interestRate, minimumMonthlyPayment, dueDate, userId)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        debt.id,
        debt.title,
        debt.counterparty,
        debt.category,
        debt.currency || 'USD',
        debt.totalAmount,
        debt.paidAmount || 0,
        debt.interestRate || 0,
        debt.minimumMonthlyPayment || 0,
        debt.dueDate,
        userId,
      ],
    });

    if (Array.isArray(debt.payments)) {
      for (const p of debt.payments) {
        statements.push({
          sql: `INSERT OR REPLACE INTO debt_payments (id, debtId, amount, currency, date, note, accountId, userId)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            p.id,
            debt.id,
            p.amount,
            p.currency || 'USD',
            p.date,
            p.note || 'Abono',
            p.accountId || null,
            userId,
          ],
        });
      }
    }
  }

  // Ejecución en lotes seguros
  const CHUNK_SIZE = 100;
  for (let i = 0; i < statements.length; i += CHUNK_SIZE) {
    const chunk = statements.slice(i, i + CHUNK_SIZE);
    await db.batch(chunk);
  }
}

export async function seedDemoData() {
  await seedUserData('munboi');
}

export function getDatabaseConnectionInfo() {
  return {
    isRemoteTurso,
    clientUrl: clientConfig.url,
    syncUrl: clientConfig.syncUrl || null,
    hasAuthToken: Boolean(clientConfig.authToken),
  };
}
