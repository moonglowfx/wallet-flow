import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
import {
  INITIAL_ACCOUNTS,
  INITIAL_TRANSACTIONS,
  INITIAL_SUBSCRIPTIONS,
  INITIAL_DEBTS,
} from '../src/data/mockData.js';

dotenv.config();

// Connect to SQLite:
// If DATABASE_URL is set (e.g. Turso on Vercel), it connects to that SQLite instance.
// Otherwise, it creates/connects to a local SQLite database file: 'file:wallet_flow.db'.
const url = process.env.DATABASE_URL || 'file:wallet_flow.db';
const authToken = process.env.DATABASE_AUTH_TOKEN || undefined;

export const db = createClient({
  url,
  authToken,
});

export async function initDatabase() {
  // Create tables
  await db.execute(`
    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      institution TEXT NOT NULL,
      type TEXT NOT NULL,
      balance REAL NOT NULL,
      creditLimit REAL,
      cutOffDay INTEGER,
      paymentDueDay INTEGER,
      accountNumber TEXT NOT NULL,
      accentGradient TEXT,
      yieldRate REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      amount REAL NOT NULL,
      type TEXT NOT NULL,
      category TEXT NOT NULL,
      accountId TEXT NOT NULL,
      date TEXT NOT NULL,
      notes TEXT,
      isAntExpense INTEGER DEFAULT 0,
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
      billingDay INTEGER NOT NULL,
      accountId TEXT NOT NULL,
      active INTEGER DEFAULT 1,
      essential INTEGER DEFAULT 0,
      badgeColor TEXT,
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
      totalAmount REAL NOT NULL,
      paidAmount REAL NOT NULL,
      interestRate REAL DEFAULT 0,
      minimumMonthlyPayment REAL DEFAULT 0,
      dueDate TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS debt_payments (
      id TEXT PRIMARY KEY,
      debtId TEXT NOT NULL,
      amount REAL NOT NULL,
      date TEXT NOT NULL,
      note TEXT,
      accountId TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (debtId) REFERENCES debts(id)
    );
  `);

  // Check if accounts exist; if empty, seed with initial enterprise data
  const accountsCheck = await db.execute('SELECT COUNT(*) as count FROM accounts');
  const count = Number(accountsCheck.rows[0].count);

  if (count === 0) {
    console.log('🌱 SQLite: Poblando base de datos con datos empresariales iniciales...');
    await seedDatabase();
    console.log('✅ SQLite: Base de datos inicializada y poblada con éxito.');
  }
}

export async function seedDatabase() {
  // Clear existing
  await db.execute('DELETE FROM debt_payments');
  await db.execute('DELETE FROM debts');
  await db.execute('DELETE FROM subscriptions');
  await db.execute('DELETE FROM transactions');
  await db.execute('DELETE FROM accounts');

  // Insert Accounts
  for (const acc of INITIAL_ACCOUNTS) {
    await db.execute({
      sql: `INSERT INTO accounts (id, name, institution, type, balance, creditLimit, cutOffDay, paymentDueDay, accountNumber, accentGradient, yieldRate)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        acc.id,
        acc.name,
        acc.institution,
        acc.type,
        acc.balance,
        acc.creditLimit || null,
        acc.cutOffDay || null,
        acc.paymentDueDay || null,
        acc.accountNumber,
        acc.accentGradient || null,
        acc.yieldRate || null,
      ],
    });
  }

  // Insert Transactions
  for (const tx of INITIAL_TRANSACTIONS) {
    await db.execute({
      sql: `INSERT INTO transactions (id, title, amount, type, category, accountId, date, notes, isAntExpense)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        tx.id,
        tx.title,
        tx.amount,
        tx.type,
        tx.category,
        tx.accountId,
        tx.date,
        tx.notes || null,
        tx.isAntExpense ? 1 : 0,
      ],
    });
  }

  // Insert Subscriptions
  for (const sub of INITIAL_SUBSCRIPTIONS) {
    await db.execute({
      sql: `INSERT INTO subscriptions (id, name, category, amount, billingDay, accountId, active, essential, badgeColor)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        sub.id,
        sub.name,
        sub.category,
        sub.amount,
        sub.billingDay,
        sub.accountId,
        sub.active ? 1 : 0,
        sub.essential ? 1 : 0,
        sub.badgeColor || '#A855F7',
      ],
    });
  }

  // Insert Debts & Payments
  for (const debt of INITIAL_DEBTS) {
    await db.execute({
      sql: `INSERT INTO debts (id, title, counterparty, category, totalAmount, paidAmount, interestRate, minimumMonthlyPayment, dueDate)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        debt.id,
        debt.title,
        debt.counterparty,
        debt.category,
        debt.totalAmount,
        debt.paidAmount,
        debt.interestRate,
        debt.minimumMonthlyPayment,
        debt.dueDate,
      ],
    });

    if (debt.payments && debt.payments.length > 0) {
      for (const p of debt.payments) {
        await db.execute({
          sql: `INSERT INTO debt_payments (id, debtId, amount, date, note, accountId)
                VALUES (?, ?, ?, ?, ?, ?)`,
          args: [p.id, debt.id, p.amount, p.date, p.note, p.accountId || null],
        });
      }
    }
  }
}
