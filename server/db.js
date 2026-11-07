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
const url =
  process.env.TURSO_DATABASE_URL ||
  process.env.DATABASE_URL ||
  process.env.LIBSQL_CLIENT_URL ||
  defaultLocalUrl;
const authToken =
  process.env.TURSO_AUTH_TOKEN ||
  process.env.DATABASE_AUTH_TOKEN ||
  process.env.LIBSQL_CLIENT_AUTH_TOKEN ||
  undefined;

export const db = createClient({
  url,
  authToken,
});

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

export async function initDatabase() {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    // 1. Users & Session State tables in SQLite
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

    // Ensure userId and currency columns exist for older DB files without losing data
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

    // Remove any obsolete extra users that are not 'munboi' or 'tiago'
    await db.execute("DELETE FROM users WHERE id NOT IN ('munboi', 'tiago')");
    // Update default exchangeRate to 3200 if it was still on old default 4150
    await db.execute("UPDATE users SET exchangeRate = 3200 WHERE exchangeRate = 4150 OR exchangeRate IS NULL");
    // Ensure Bancolombia account has native COP currency & exact COP balance if still on legacy USD 7.98
    await db.execute("UPDATE accounts SET currency = 'COP', balance = 25536 WHERE id = 'acc-bancolombia' AND balance = 7.98");

    // Create indexes for fast queries by userId and date
    await db.execute('CREATE INDEX IF NOT EXISTS idx_accounts_user ON accounts(userId)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(userId, date DESC)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(userId)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_debts_user ON debts(userId)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_debt_payments_user ON debt_payments(userId)');

    // Seed default users if not present
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

    // Ensure active_user_id exists in app_state
    await db.execute({
      sql: `INSERT OR IGNORE INTO app_state (key, value) VALUES ('active_user_id', 'munboi')`,
      args: [],
    });

    // Verify Munboi's real data in SQLite; auto-seed if empty or incomplete
    const munboiCountRes = await db.execute(
      "SELECT COUNT(*) as c FROM transactions WHERE userId = 'munboi'"
    );
    const munboiAccRes = await db.execute(
      "SELECT COUNT(*) as c FROM accounts WHERE userId = 'munboi' AND id = 'acc-bofa-checking'"
    );
    const munboiTxCount = Number(munboiCountRes.rows[0]?.c || 0);
    const hasBofa = Number(munboiAccRes.rows[0]?.c || 0) > 0;

    if (munboiTxCount < 700 || !hasBofa) {
      await seedUserData('munboi');
    }

    // Clean any legacy dummy Tiago records if present
    await db.execute(
      "DELETE FROM accounts WHERE userId = 'tiago' AND id LIKE 'acc-tiago-%'"
    );
    await db.execute(
      "DELETE FROM transactions WHERE userId = 'tiago' AND (id LIKE 'tx-tg-%' OR id = 'tx-01')"
    );
    await db.execute(
      "DELETE FROM subscriptions WHERE userId = 'tiago' AND id LIKE 'sub-tg-%'"
    );
    await db.execute(
      "DELETE FROM debts WHERE userId = 'tiago' AND id LIKE 'debt-tg-%'"
    );

    console.log('✅ SQLite: Base de datos verificada y sincronizada (wallet_flow.db).');
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
    console.log(`🧹 SQLite: Datos del usuario '${userId}' limpiados.`);
  } else {
    await db.batch([
      'DELETE FROM debt_payments',
      'DELETE FROM debts',
      'DELETE FROM subscriptions',
      'DELETE FROM transactions',
      'DELETE FROM accounts',
    ]);
    console.log('🧹 SQLite: Base de datos limpiada por completo.');
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
      sql: `INSERT OR REPLACE INTO subscriptions (id, name, category, amount, currency, billingDay, accountId, active, essential, badgeColor, userId)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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

  if (statements.length > 0) {
    await db.batch(statements);
  }
}

export async function seedDemoData() {
  await seedUserData('munboi');
}
