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

function cleanEnv(val) {
  if (!val) return undefined;
  const str = String(val).trim();
  const unquoted = str.replace(/^["']|["']$/g, '').trim();
  return unquoted || undefined;
}

const defaultLocalUrl = process.env.VERCEL ? 'file:/tmp/wallet_flow.db' : 'file:wallet_flow.db';

// Soporte universal para todas las variables de entorno de Turso y Vercel Integration
const rawUrl = cleanEnv(
  process.env.TURSO_DATABASE_URL ||
  process.env.TURSO_DB_URL ||
  process.env.TURSO_URL ||
  process.env.DATABASE_URL ||
  process.env.LIBSQL_URL ||
  process.env.LIBSQL_CLIENT_URL
);

const authToken = cleanEnv(
  process.env.TURSO_AUTH_TOKEN ||
  process.env.TURSO_DB_AUTH_TOKEN ||
  process.env.TURSO_TOKEN ||
  process.env.DATABASE_AUTH_TOKEN ||
  process.env.LIBSQL_AUTH_TOKEN ||
  process.env.LIBSQL_CLIENT_AUTH_TOKEN
);

// Normalizar URL: auto-prefijo libsql:// si se colocó un dominio de Turso sin protocolo
let normalizedUrl = rawUrl;
if (normalizedUrl && normalizedUrl.includes('.turso.io') && !normalizedUrl.includes('://')) {
  normalizedUrl = `libsql://${normalizedUrl}`;
}

// Determinar estrategia de conexion: Turso Cloud (libSQL), Replica Embebida, o SQLite local
const isRemoteTurso = Boolean(
  normalizedUrl && (
    normalizedUrl.startsWith('libsql://') ||
    normalizedUrl.startsWith('https://') ||
    normalizedUrl.startsWith('http://')
  )
);

let clientConfig = {};
if (isRemoteTurso) {
  // En Vercel Serverless NUNCA usar réplica embebida en disco local porque el filesystem es efímero/de solo lectura.
  // Siempre conectar directamente a la nube de Turso mediante libSQL HTTP.
  if (process.env.TURSO_EMBEDDED_REPLICA === 'true' && !process.env.VERCEL) {
    clientConfig = {
      url: 'file:wallet_flow.db',
      syncUrl: normalizedUrl,
      authToken,
      syncInterval: 60000,
    };
    console.log('🔗 Turso: Conectado en modo réplica embebida (SQLite local + Turso Cloud sync)');
  } else {
    clientConfig = {
      url: normalizedUrl,
      authToken,
    };
    console.log(`🔗 Turso Cloud: Conectado directamente a base de datos en la nube (${normalizedUrl})`);
  }
} else {
  const localUrl = normalizedUrl || defaultLocalUrl;
  clientConfig = {
    url: localUrl,
    authToken,
  };
  if (process.env.VERCEL) {
    console.warn('⚠️ [Vercel Warning]: No se detectó TURSO_DATABASE_URL ni DATABASE_URL en la nube. Usando /tmp/wallet_flow.db local (efímero). Agrega TURSO_DATABASE_URL y TURSO_AUTH_TOKEN en las variables de entorno de tu proyecto en Vercel para persistencia permanente.');
  } else {
    console.log(`💾 SQLite: Conectado a archivo persistente (${localUrl})`);
  }
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
    description: 'Historial completo 2024-2026 (728 transacciones reales)',
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
 * Optimizado para Serverless (Vercel) y conexiones remotas Turso Cloud:
 * 1. Fast-path: Si app_state.db_initialized ya es 'true', retorna de inmediato sin roundtrips DDL.
 * 2. Creación por lotes (executeMultiple): Ejecuta todas las tablas e índices en 1 único viaje de red.
 * 3. Preservación 100%: NUNCA borra ni sobreescribe datos preexistentes.
 * 4. Tolerancia a fallos: En caso de error de red transitorio, resetea la promesa para reintentar.
 */
export async function initDatabase() {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      // 0. Si se usa réplica embebida de Turso (solo local), sincronizar antes de consultar
      if (typeof db.sync === 'function' && clientConfig.syncUrl) {
        try {
          await db.sync();
          console.log('🔄 Turso: Réplica local sincronizada con la nube.');
        } catch (syncErr) {
          console.warn('⚠️ Turso sync warning (offline o primer inicio):', syncErr.message);
        }
      }

      // Fast check: verificar si la base de datos ya está completamente inicializada
      // Esto ahorra 25+ roundtrips de red en cada cold start en Vercel
      try {
        const [initStateRes, accountsCountRes] = await Promise.all([
          db.execute("SELECT value FROM app_state WHERE key = 'db_initialized'"),
          db.execute("SELECT COUNT(*) as c FROM accounts"),
        ]);
        const isInit = initStateRes.rows[0]?.value === 'true';
        const totalAccounts = Number(accountsCountRes.rows[0]?.c || 0);

        if (isInit || totalAccounts > 0) {
          return;
        }
      } catch (_) {
        // Las tablas aún no existen en Turso/SQLite, continuar con creación
      }

      // 1. Script DDL completo para creación en 1 solo viaje de red
      const ddlScript = `
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
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (accountId) REFERENCES accounts(id)
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
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (accountId) REFERENCES accounts(id)
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
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (debtId) REFERENCES debts(id)
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

      if (typeof db.executeMultiple === 'function') {
        await db.executeMultiple(ddlScript);
      } else {
        const statements = ddlScript
          .split(';')
          .map((s) => s.trim())
          .filter((s) => s.length > 0);
        for (const sql of statements) {
          await db.execute(sql);
        }
      }

      // Columnas retrocompatibles por si se conecta a un archivo SQLite anterior
      const tables = ['accounts', 'transactions', 'subscriptions', 'debts', 'debt_payments'];
      for (const t of tables) {
        try { await db.execute(`ALTER TABLE ${t} ADD COLUMN userId TEXT DEFAULT 'munboi'`); } catch (_) {}
        try { await db.execute(`ALTER TABLE ${t} ADD COLUMN currency TEXT DEFAULT 'USD'`); } catch (_) {}
      }
      try { await db.execute(`ALTER TABLE transactions ADD COLUMN originalAmount REAL`); } catch (_) {}
      try { await db.execute(`ALTER TABLE subscriptions ADD COLUMN autoCharge INTEGER DEFAULT 1`); } catch (_) {}

      // Garantizar active_user_id en app_state
      await db.execute({
        sql: `INSERT OR IGNORE INTO app_state (key, value) VALUES ('active_user_id', 'munboi')`,
        args: [],
      });

      // Verificar si ya existen datos en la base de datos
      const [initStateRes, accountsCountRes] = await Promise.all([
        db.execute("SELECT value FROM app_state WHERE key = 'db_initialized'"),
        db.execute("SELECT COUNT(*) as c FROM accounts"),
      ]);

      const isInitialized = initStateRes.rows[0]?.value === 'true';
      const totalAccounts = Number(accountsCountRes.rows[0]?.c || 0);

      // REGLA DE ORO: Si ya hay cuentas o el estado marca inicializado, PRESERVAR TODO
      if (isInitialized || totalAccounts > 0) {
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

      // Únicamente si la base de datos está 100% vacía (primera vez absoluta en Turso / SQLite):
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
    } catch (err) {
      initPromise = null; // Reiniciar en caso de error para permitir reintento en la próxima petición
      console.error('❌ Error inicializando base de datos:', err);
      throw err;
    }
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
  const url = clientConfig.url || '';
  let displayUrl = url;
  try {
    if (url.includes('://')) {
      const parsed = new URL(url.replace('libsql://', 'https://'));
      displayUrl = `libsql://${parsed.host}`;
    }
  } catch (_) {
    displayUrl = url;
  }

  return {
    isRemoteTurso,
    provider: isRemoteTurso ? 'Turso Cloud (libSQL)' : 'SQLite Local',
    clientUrl: displayUrl,
    syncUrl: clientConfig.syncUrl || null,
    hasAuthToken: Boolean(clientConfig.authToken),
    isVercel: Boolean(process.env.VERCEL),
    status: 'connected',
  };
}
