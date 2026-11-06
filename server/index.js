import express from 'express';
import cors from 'cors';
import { db, initDatabase, seedDemoData, clearDatabase } from './db.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Initialize SQLite database on startup
await initDatabase();

// ----------------- ACCOUNTS -----------------
app.get('/api/accounts', async (req, res) => {
  try {
    const userId = req.query.userId || 'munboi';
    const result = await db.execute({
      sql: 'SELECT * FROM accounts WHERE userId = ? ORDER BY created_at ASC',
      args: [userId],
    });
    const accounts = result.rows.map((row) => ({
      ...row,
      balance: Number(row.balance),
      creditLimit: row.creditLimit ? Number(row.creditLimit) : undefined,
      yieldRate: row.yieldRate ? Number(row.yieldRate) : undefined,
    }));
    res.json(accounts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/accounts', async (req, res) => {
  try {
    const acc = req.body;
    const userId = acc.userId || 'munboi';
    await db.execute({
      sql: `INSERT OR REPLACE INTO accounts (id, name, institution, type, balance, creditLimit, cutOffDay, paymentDueDay, accountNumber, accentGradient, yieldRate, userId)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        userId,
      ],
    });
    res.status(201).json(acc);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ----------------- TRANSACTIONS -----------------
app.get('/api/transactions', async (req, res) => {
  try {
    const userId = req.query.userId || 'munboi';
    const result = await db.execute({
      sql: 'SELECT * FROM transactions WHERE userId = ? ORDER BY date DESC, created_at DESC',
      args: [userId],
    });
    const transactions = result.rows.map((row) => ({
      ...row,
      amount: Number(row.amount),
      isAntExpense: Boolean(row.isAntExpense),
    }));
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/transactions', async (req, res) => {
  try {
    const tx = req.body;
    const userId = tx.userId || 'munboi';

    // Insert transaction
    await db.execute({
      sql: `INSERT OR REPLACE INTO transactions (id, title, amount, type, category, accountId, date, notes, isAntExpense, userId)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        userId,
      ],
    });

    // Atomically update account balance in SQLite
    const delta = tx.type === 'income' ? tx.amount : -tx.amount;
    await db.execute({
      sql: 'UPDATE accounts SET balance = balance + ? WHERE id = ?',
      args: [delta, tx.accountId],
    });

    res.status(201).json(tx);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ----------------- SUBSCRIPTIONS -----------------
app.get('/api/subscriptions', async (req, res) => {
  try {
    const userId = req.query.userId || 'munboi';
    const result = await db.execute({
      sql: 'SELECT * FROM subscriptions WHERE userId = ? ORDER BY billingDay ASC',
      args: [userId],
    });
    const subscriptions = result.rows.map((row) => ({
      ...row,
      amount: Number(row.amount),
      billingDay: Number(row.billingDay),
      active: Boolean(row.active),
      essential: Boolean(row.essential),
    }));
    res.json(subscriptions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/subscriptions', async (req, res) => {
  try {
    const sub = req.body;
    const userId = sub.userId || 'munboi';
    await db.execute({
      sql: `INSERT OR REPLACE INTO subscriptions (id, name, category, amount, billingDay, accountId, active, essential, badgeColor, userId)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        userId,
      ],
    });
    res.status(201).json(sub);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/subscriptions/:id/toggle', async (req, res) => {
  try {
    const { id } = req.params;
    await db.execute({
      sql: 'UPDATE subscriptions SET active = CASE WHEN active = 1 THEN 0 ELSE 1 END WHERE id = ?',
      args: [id],
    });
    const updated = await db.execute({
      sql: 'SELECT * FROM subscriptions WHERE id = ?',
      args: [id],
    });
    res.json(updated.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ----------------- DEBTS -----------------
app.get('/api/debts', async (req, res) => {
  try {
    const userId = req.query.userId || 'munboi';
    const debtsResult = await db.execute({
      sql: 'SELECT * FROM debts WHERE userId = ? ORDER BY created_at ASC',
      args: [userId],
    });
    const paymentsResult = await db.execute({
      sql: 'SELECT * FROM debt_payments WHERE userId = ? ORDER BY date DESC',
      args: [userId],
    });

    const paymentsByDebt = {};
    for (const p of paymentsResult.rows) {
      if (!paymentsByDebt[p.debtId]) paymentsByDebt[p.debtId] = [];
      paymentsByDebt[p.debtId].push({
        ...p,
        amount: Number(p.amount),
      });
    }

    const debts = debtsResult.rows.map((row) => ({
      ...row,
      totalAmount: Number(row.totalAmount),
      paidAmount: Number(row.paidAmount),
      interestRate: Number(row.interestRate),
      minimumMonthlyPayment: Number(row.minimumMonthlyPayment),
      payments: paymentsByDebt[row.id] || [],
    }));

    res.json(debts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/debts', async (req, res) => {
  try {
    const debt = req.body;
    const userId = debt.userId || 'munboi';
    await db.execute({
      sql: `INSERT OR REPLACE INTO debts (id, title, counterparty, category, totalAmount, paidAmount, interestRate, minimumMonthlyPayment, dueDate, userId)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        debt.id,
        debt.title,
        debt.counterparty,
        debt.category,
        debt.totalAmount,
        debt.paidAmount || 0,
        debt.interestRate || 0,
        debt.minimumMonthlyPayment || 0,
        debt.dueDate,
        userId,
      ],
    });
    res.status(201).json({ ...debt, payments: [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/debts/:id/payment', async (req, res) => {
  try {
    const { id } = req.params;
    const { payment, userId = 'munboi' } = req.body;

    // Insert payment record
    await db.execute({
      sql: `INSERT OR REPLACE INTO debt_payments (id, debtId, amount, date, note, accountId, userId)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [
        payment.id,
        id,
        payment.amount,
        payment.date,
        payment.note || 'Abono a capital',
        payment.accountId || null,
        userId,
      ],
    });

    // Update paidAmount on debt
    await db.execute({
      sql: 'UPDATE debts SET paidAmount = paidAmount + ? WHERE id = ?',
      args: [payment.amount, id],
    });

    res.status(201).json(payment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ----------------- BULK IMPORT / SYNC -----------------
app.post('/api/import', async (req, res) => {
  try {
    const { userId = 'munboi', accounts = [], transactions = [], subscriptions = [], debts = [], mode = 'replace' } = req.body;

    if (mode === 'replace') {
      await db.execute({ sql: 'DELETE FROM debt_payments WHERE userId = ?', args: [userId] });
      await db.execute({ sql: 'DELETE FROM debts WHERE userId = ?', args: [userId] });
      await db.execute({ sql: 'DELETE FROM subscriptions WHERE userId = ?', args: [userId] });
      await db.execute({ sql: 'DELETE FROM transactions WHERE userId = ?', args: [userId] });
      await db.execute({ sql: 'DELETE FROM accounts WHERE userId = ?', args: [userId] });
    }

    // Insert accounts
    for (const acc of accounts) {
      await db.execute({
        sql: `INSERT OR REPLACE INTO accounts (id, name, institution, type, balance, creditLimit, cutOffDay, paymentDueDay, accountNumber, accentGradient, yieldRate, userId)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          acc.id,
          acc.name,
          acc.institution || 'Entidad Financiera',
          acc.type || 'bank',
          acc.balance || 0,
          acc.creditLimit || null,
          acc.cutOffDay || null,
          acc.paymentDueDay || null,
          acc.accountNumber || '•••• 0000',
          acc.accentGradient || null,
          acc.yieldRate || null,
          userId,
        ],
      });
    }

    // Insert transactions
    for (const tx of transactions) {
      await db.execute({
        sql: `INSERT OR REPLACE INTO transactions (id, title, amount, type, category, accountId, date, notes, isAntExpense, userId)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          tx.id,
          tx.title,
          tx.amount,
          tx.type || 'expense',
          tx.category || 'Otros',
          tx.accountId,
          tx.date || new Date().toISOString().split('T')[0],
          tx.notes || null,
          tx.isAntExpense ? 1 : 0,
          userId,
        ],
      });
    }

    // Insert subscriptions
    for (const sub of subscriptions) {
      await db.execute({
        sql: `INSERT OR REPLACE INTO subscriptions (id, name, category, amount, billingDay, accountId, active, essential, badgeColor, userId)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          sub.id,
          sub.name,
          sub.category || 'Servicios',
          sub.amount,
          sub.billingDay || 1,
          sub.accountId,
          sub.active ? 1 : 0,
          sub.essential ? 1 : 0,
          sub.badgeColor || '#A855F7',
          userId,
        ],
      });
    }

    // Insert debts
    for (const debt of debts) {
      await db.execute({
        sql: `INSERT OR REPLACE INTO debts (id, title, counterparty, category, totalAmount, paidAmount, interestRate, minimumMonthlyPayment, dueDate, userId)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          debt.id,
          debt.title,
          debt.counterparty || 'Entidad',
          debt.category || 'Préstamo',
          debt.totalAmount,
          debt.paidAmount || 0,
          debt.interestRate || 0,
          debt.minimumMonthlyPayment || 0,
          debt.dueDate || '2027-12-31',
          userId,
        ],
      });

      if (debt.payments && Array.isArray(debt.payments)) {
        for (const p of debt.payments) {
          await db.execute({
            sql: `INSERT OR REPLACE INTO debt_payments (id, debtId, amount, date, note, accountId, userId)
                  VALUES (?, ?, ?, ?, ?, ?, ?)`,
            args: [
              p.id,
              debt.id,
              p.amount,
              p.date,
              p.note || 'Abono',
              p.accountId || null,
              userId,
            ],
          });
        }
      }
    }

    res.json({
      success: true,
      counts: {
        accounts: accounts.length,
        transactions: transactions.length,
        subscriptions: subscriptions.length,
        debts: debts.length,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ----------------- CLEAR & RESET DEMO -----------------
app.post('/api/clear', async (req, res) => {
  try {
    const userId = req.body.userId || req.query.userId;
    if (userId) {
      await db.execute({ sql: 'DELETE FROM debt_payments WHERE userId = ?', args: [userId] });
      await db.execute({ sql: 'DELETE FROM debts WHERE userId = ?', args: [userId] });
      await db.execute({ sql: 'DELETE FROM subscriptions WHERE userId = ?', args: [userId] });
      await db.execute({ sql: 'DELETE FROM transactions WHERE userId = ?', args: [userId] });
      await db.execute({ sql: 'DELETE FROM accounts WHERE userId = ?', args: [userId] });
    } else {
      await clearDatabase();
    }
    res.json({ message: 'Base de datos SQLite limpiada' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/reset-demo', async (req, res) => {
  try {
    await seedDemoData();
    res.json({ message: 'Base de datos SQLite cargada con datos demo' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`⚡ SQLite REST API Server activo en http://localhost:${PORT}`);
});
