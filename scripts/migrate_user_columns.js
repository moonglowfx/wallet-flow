import { createClient } from '@libsql/client';
import {
  TIAGO_ACCOUNTS,
  TIAGO_TRANSACTIONS,
  TIAGO_SUBSCRIPTIONS,
  TIAGO_DEBTS,
} from '../src/data/users.js';

const client = createClient({ url: 'file:wallet_flow.db' });

async function migrate() {
  const tables = ['accounts', 'transactions', 'subscriptions', 'debts', 'debt_payments'];
  for (const t of tables) {
    try {
      await client.execute(`ALTER TABLE ${t} ADD COLUMN userId TEXT DEFAULT 'munboi'`);
      console.log(`✅ Added userId to ${t}`);
    } catch (e) {
      console.log(`ℹ️ Column userId in ${t}: ${e.message}`);
    }
  }

  // Update all existing records to Munboi
  await client.execute("UPDATE accounts SET userId = 'munboi' WHERE userId IS NULL");
  await client.execute("UPDATE transactions SET userId = 'munboi' WHERE userId IS NULL");
  await client.execute("UPDATE subscriptions SET userId = 'munboi' WHERE userId IS NULL");
  await client.execute("UPDATE debts SET userId = 'munboi' WHERE userId IS NULL");
  await client.execute("UPDATE debt_payments SET userId = 'munboi' WHERE userId IS NULL");

  // Insert Tiago's accounts
  for (const acc of TIAGO_ACCOUNTS) {
    await client.execute({
      sql: `INSERT OR REPLACE INTO accounts (id, name, institution, type, balance, creditLimit, cutOffDay, paymentDueDay, accountNumber, accentGradient, yieldRate, userId)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'tiago')`,
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

  // Insert Tiago's transactions
  for (const tx of TIAGO_TRANSACTIONS) {
    await client.execute({
      sql: `INSERT OR REPLACE INTO transactions (id, title, amount, type, category, accountId, date, notes, isAntExpense, userId)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'tiago')`,
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

  // Insert Tiago's subscriptions
  for (const sub of TIAGO_SUBSCRIPTIONS) {
    await client.execute({
      sql: `INSERT OR REPLACE INTO subscriptions (id, name, category, amount, billingDay, accountId, active, essential, badgeColor, userId)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'tiago')`,
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

  // Insert Tiago's debts
  for (const debt of TIAGO_DEBTS) {
    await client.execute({
      sql: `INSERT OR REPLACE INTO debts (id, title, counterparty, category, totalAmount, paidAmount, interestRate, minimumMonthlyPayment, dueDate, userId)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'tiago')`,
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

    if (debt.payments) {
      for (const p of debt.payments) {
        await client.execute({
          sql: `INSERT OR REPLACE INTO debt_payments (id, debtId, amount, date, note, accountId, userId)
                VALUES (?, ?, ?, ?, ?, ?, 'tiago')`,
          args: [
            p.id,
            debt.id,
            p.amount,
            p.date,
            p.note || 'Abono',
            p.accountId || null,
          ],
        });
      }
    }
  }

  console.log('🎉 Migrated multi-user support with isolated data for Munboi and Tiago in SQLite!');
}

migrate().catch(console.error);
