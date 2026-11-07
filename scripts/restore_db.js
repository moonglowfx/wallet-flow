import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from '../server/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const backupsDir = path.join(rootDir, 'backups');

export async function restoreDatabase(jsonSnapshotPath = null) {
  const targetPath = jsonSnapshotPath || path.join(backupsDir, 'wallet_flow_snapshot_latest.json');

  if (!fs.existsSync(targetPath)) {
    throw new Error(`No se encontró el archivo de snapshot para restaurar: ${targetPath}`);
  }

  const raw = fs.readFileSync(targetPath, 'utf-8');
  const snapshot = JSON.parse(raw);
  const data = snapshot.data;

  if (!data || !Array.isArray(data.users) || !Array.isArray(data.accounts)) {
    throw new Error('El archivo de snapshot no contiene una estructura válida de datos.');
  }

  console.log(`⏳ Restaurando datos desde: ${targetPath}`);

  // Create tables IF NOT EXISTS first
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
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const statements = [];

  for (const u of data.users || []) {
    statements.push({
      sql: `INSERT OR REPLACE INTO users (id, username, displayName, pin, role, avatarGradient, description, currency, exchangeRate)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [u.id, u.username, u.displayName, u.pin, u.role, u.avatarGradient, u.description, u.currency || 'USD', u.exchangeRate || 3200],
    });
  }

  for (const a of data.accounts || []) {
    statements.push({
      sql: `INSERT OR REPLACE INTO accounts (id, name, institution, type, currency, balance, creditLimit, cutOffDay, paymentDueDay, accountNumber, accentGradient, yieldRate, userId)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [a.id, a.name, a.institution, a.type, a.currency || 'USD', a.balance || 0, a.creditLimit ?? null, a.cutOffDay ?? null, a.paymentDueDay ?? null, a.accountNumber, a.accentGradient ?? null, a.yieldRate ?? null, a.userId || 'munboi'],
    });
  }

  for (const t of data.transactions || []) {
    statements.push({
      sql: `INSERT OR REPLACE INTO transactions (id, title, amount, currency, originalAmount, type, category, accountId, date, notes, isAntExpense, userId)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [t.id, t.title, t.amount, t.currency || 'USD', t.originalAmount ?? t.amount, t.type, t.category, t.accountId, t.date, t.notes ?? null, t.isAntExpense ? 1 : 0, t.userId || 'munboi'],
    });
  }

  for (const s of data.subscriptions || []) {
    statements.push({
      sql: `INSERT OR REPLACE INTO subscriptions (id, name, category, amount, currency, billingDay, accountId, active, essential, badgeColor, autoCharge, userId)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [s.id, s.name, s.category, s.amount, s.currency || 'USD', s.billingDay, s.accountId, s.active ? 1 : 0, s.essential ? 1 : 0, s.badgeColor || '#A855F7', s.autoCharge !== 0 ? 1 : 0, s.userId || 'munboi'],
    });
  }

  for (const d of data.debts || []) {
    statements.push({
      sql: `INSERT OR REPLACE INTO debts (id, title, counterparty, category, currency, totalAmount, paidAmount, interestRate, minimumMonthlyPayment, dueDate, userId)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [d.id, d.title, d.counterparty, d.category, d.currency || 'USD', d.totalAmount, d.paidAmount || 0, d.interestRate || 0, d.minimumMonthlyPayment || 0, d.dueDate, d.userId || 'munboi'],
    });
  }

  for (const p of data.debt_payments || []) {
    statements.push({
      sql: `INSERT OR REPLACE INTO debt_payments (id, debtId, amount, currency, date, note, accountId, userId)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [p.id, p.debtId, p.amount, p.currency || 'USD', p.date, p.note || 'Abono', p.accountId || null, p.userId || 'munboi'],
    });
  }

  for (const st of data.app_state || []) {
    statements.push({
      sql: `INSERT OR REPLACE INTO app_state (key, value) VALUES (?, ?)`,
      args: [st.key, st.value],
    });
  }

  // Batch insert in chunks of 100 to prevent SQL limits
  const CHUNK_SIZE = 100;
  for (let i = 0; i < statements.length; i += CHUNK_SIZE) {
    const chunk = statements.slice(i, i + CHUNK_SIZE);
    await db.batch(chunk);
  }

  await db.execute("INSERT OR REPLACE INTO app_state (key, value) VALUES ('db_initialized', 'true')");

  console.log(`✅ Base de datos restaurada con éxito: ${statements.length} registros cargados.`);
  return { success: true, count: statements.length };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const customPath = process.argv[2] || null;
  restoreDatabase(customPath)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Error restaurando la base de datos:', err);
      process.exit(1);
    });
}
