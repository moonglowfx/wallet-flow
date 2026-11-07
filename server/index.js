import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { db, initDatabase, seedUserData, clearDatabase } from './db.js';

export const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '15mb' }));

// Ensure SQLite database is initialized before handling any API request
app.use(async (_req, _res, next) => {
  try {
    await initDatabase();
    next();
  } catch (err) {
    next(err);
  }
});

// Helper to format rows from SQLite
function formatAccountRow(row) {
  return {
    ...row,
    balance: Number(row.balance || 0),
    creditLimit: row.creditLimit !== null && row.creditLimit !== undefined ? Number(row.creditLimit) : undefined,
    cutOffDay: row.cutOffDay !== null && row.cutOffDay !== undefined ? Number(row.cutOffDay) : undefined,
    paymentDueDay: row.paymentDueDay !== null && row.paymentDueDay !== undefined ? Number(row.paymentDueDay) : undefined,
    yieldRate: row.yieldRate !== null && row.yieldRate !== undefined ? Number(row.yieldRate) : undefined,
  };
}

function formatTransactionRow(row) {
  return {
    ...row,
    amount: Number(row.amount || 0),
    isAntExpense: Boolean(row.isAntExpense),
  };
}

function formatSubscriptionRow(row) {
  return {
    ...row,
    amount: Number(row.amount || 0),
    billingDay: Number(row.billingDay || 1),
    active: Boolean(row.active),
    essential: Boolean(row.essential),
  };
}

async function fetchUserDebts(userId) {
  const [debtsResult, paymentsResult] = await Promise.all([
    db.execute({
      sql: 'SELECT * FROM debts WHERE userId = ? ORDER BY created_at ASC',
      args: [userId],
    }),
    db.execute({
      sql: 'SELECT * FROM debt_payments WHERE userId = ? ORDER BY date DESC',
      args: [userId],
    }),
  ]);

  const paymentsByDebt = {};
  for (const p of paymentsResult.rows) {
    if (!paymentsByDebt[p.debtId]) paymentsByDebt[p.debtId] = [];
    paymentsByDebt[p.debtId].push({
      ...p,
      amount: Number(p.amount || 0),
    });
  }

  return debtsResult.rows.map((row) => ({
    ...row,
    totalAmount: Number(row.totalAmount || 0),
    paidAmount: Number(row.paidAmount || 0),
    interestRate: Number(row.interestRate || 0),
    minimumMonthlyPayment: Number(row.minimumMonthlyPayment || 0),
    payments: paymentsByDebt[row.id] || [],
  }));
}

// ----------------- FULL STATE SNAPSHOT (SQLite) -----------------
app.get('/api/state', async (req, res) => {
  try {
    const [usersRes, stateRes] = await Promise.all([
      db.execute('SELECT * FROM users ORDER BY id ASC'),
      db.execute("SELECT value FROM app_state WHERE key = 'active_user_id'"),
    ]);

    const activeUserId = req.query.userId || stateRes.rows[0]?.value || 'munboi';

    const [accsRes, txsRes, subsRes, debts] = await Promise.all([
      db.execute({
        sql: 'SELECT * FROM accounts WHERE userId = ? ORDER BY created_at ASC',
        args: [activeUserId],
      }),
      db.execute({
        sql: 'SELECT * FROM transactions WHERE userId = ? ORDER BY date DESC, created_at DESC',
        args: [activeUserId],
      }),
      db.execute({
        sql: 'SELECT * FROM subscriptions WHERE userId = ? ORDER BY billingDay ASC',
        args: [activeUserId],
      }),
      fetchUserDebts(activeUserId),
    ]);

    const users = usersRes.rows.map((u) => ({
      ...u,
      defaultPin: u.pin,
      exchangeRate: Number(u.exchangeRate || 4150),
    }));

    const currentUser = users.find((u) => u.id === activeUserId) || users[0];

    res.json({
      activeUserId: currentUser.id,
      users,
      user: currentUser,
      accounts: accsRes.rows.map(formatAccountRow),
      transactions: txsRes.rows.map(formatTransactionRow),
      subscriptions: subsRes.rows.map(formatSubscriptionRow),
      debts,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ----------------- USERS & SESSION -----------------
app.get('/api/users', async (_req, res) => {
  try {
    const [usersRes, stateRes] = await Promise.all([
      db.execute('SELECT * FROM users ORDER BY id ASC'),
      db.execute("SELECT value FROM app_state WHERE key = 'active_user_id'"),
    ]);
    const users = usersRes.rows.map((u) => ({
      ...u,
      defaultPin: u.pin,
      exchangeRate: Number(u.exchangeRate || 4150),
    }));
    res.json({
      activeUserId: stateRes.rows[0]?.value || 'munboi',
      users,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { displayName, role, pin, currency, exchangeRate } = req.body;

    const existingRes = await db.execute({
      sql: 'SELECT * FROM users WHERE id = ?',
      args: [id],
    });
    const existing = existingRes.rows[0];
    if (!existing) {
      return res.status(404).json({ error: 'Usuario no encontrado en SQLite' });
    }

    const nextDisplayName = displayName !== undefined ? displayName : existing.displayName;
    const nextRole = role !== undefined ? role : existing.role;
    const nextPin = pin !== undefined ? pin : existing.pin;
    const nextCurrency = currency !== undefined ? currency : existing.currency;
    const nextRate = exchangeRate !== undefined ? Number(exchangeRate) : Number(existing.exchangeRate || 4150);

    await db.execute({
      sql: `UPDATE users
            SET displayName = ?, role = ?, pin = ?, currency = ?, exchangeRate = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
      args: [nextDisplayName, nextRole, nextPin, nextCurrency, nextRate, id],
    });

    const updatedRes = await db.execute({
      sql: 'SELECT * FROM users WHERE id = ?',
      args: [id],
    });
    res.json({
      ...updatedRes.rows[0],
      defaultPin: updatedRes.rows[0].pin,
      exchangeRate: Number(updatedRes.rows[0].exchangeRate || 4150),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/session', async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId requerido' });

    await db.execute({
      sql: `INSERT OR REPLACE INTO app_state (key, value, updated_at) VALUES ('active_user_id', ?, CURRENT_TIMESTAMP)`,
      args: [userId],
    });
    res.json({ activeUserId: userId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ----------------- ACCOUNTS -----------------
app.get('/api/accounts', async (req, res) => {
  try {
    const userId = req.query.userId || 'munboi';
    const result = await db.execute({
      sql: 'SELECT * FROM accounts WHERE userId = ? ORDER BY created_at ASC',
      args: [userId],
    });
    res.json(result.rows.map(formatAccountRow));
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
        acc.creditLimit ?? null,
        acc.cutOffDay ?? null,
        acc.paymentDueDay ?? null,
        acc.accountNumber,
        acc.accentGradient ?? null,
        acc.yieldRate ?? null,
        userId,
      ],
    });
    res.status(201).json(acc);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/accounts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const acc = req.body;
    const userId = acc.userId || 'munboi';
    await db.execute({
      sql: `UPDATE accounts
            SET name = ?, institution = ?, type = ?, balance = ?, creditLimit = ?, cutOffDay = ?, paymentDueDay = ?, accountNumber = ?, accentGradient = ?, yieldRate = ?
            WHERE id = ? AND userId = ?`,
      args: [
        acc.name,
        acc.institution,
        acc.type,
        acc.balance,
        acc.creditLimit ?? null,
        acc.cutOffDay ?? null,
        acc.paymentDueDay ?? null,
        acc.accountNumber,
        acc.accentGradient ?? null,
        acc.yieldRate ?? null,
        id,
        userId,
      ],
    });
    res.json(acc);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/accounts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.query.userId || 'munboi';
    await db.execute({
      sql: 'DELETE FROM accounts WHERE id = ? AND userId = ?',
      args: [id, userId],
    });
    res.json({ deleted: id });
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
    res.json(result.rows.map(formatTransactionRow));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/transactions', async (req, res) => {
  try {
    const tx = req.body;
    const userId = tx.userId || 'munboi';

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
    const delta = tx.type === 'income' ? Number(tx.amount) : -Number(tx.amount);
    await db.execute({
      sql: 'UPDATE accounts SET balance = ROUND((balance + ?) * 100) / 100 WHERE id = ?',
      args: [delta, tx.accountId],
    });

    res.status(201).json(tx);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/transactions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.query.userId || 'munboi';
    await db.execute({
      sql: 'DELETE FROM transactions WHERE id = ? AND userId = ?',
      args: [id, userId],
    });
    res.json({ deleted: id });
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
    res.json(result.rows.map(formatSubscriptionRow));
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

app.put('/api/subscriptions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const sub = req.body;
    const userId = sub.userId || 'munboi';
    await db.execute({
      sql: `UPDATE subscriptions
            SET name = ?, category = ?, amount = ?, billingDay = ?, accountId = ?, active = ?, essential = ?, badgeColor = ?
            WHERE id = ? AND userId = ?`,
      args: [
        sub.name,
        sub.category,
        sub.amount,
        sub.billingDay,
        sub.accountId || '',
        sub.active ? 1 : 0,
        sub.essential ? 1 : 0,
        sub.badgeColor || '#A855F7',
        id,
        userId,
      ],
    });
    res.json(sub);
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
    res.json(updated.rows[0] ? formatSubscriptionRow(updated.rows[0]) : null);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/subscriptions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.query.userId || 'munboi';
    await db.execute({
      sql: 'DELETE FROM subscriptions WHERE id = ? AND userId = ?',
      args: [id, userId],
    });
    res.json({ deleted: id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ----------------- DEBTS -----------------
app.get('/api/debts', async (req, res) => {
  try {
    const userId = req.query.userId || 'munboi';
    const debts = await fetchUserDebts(userId);
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
    res.status(201).json({ ...debt, payments: debt.payments || [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/debts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const debt = req.body;
    const userId = debt.userId || 'munboi';
    await db.execute({
      sql: `UPDATE debts
            SET title = ?, counterparty = ?, category = ?, totalAmount = ?, paidAmount = ?, interestRate = ?, minimumMonthlyPayment = ?, dueDate = ?
            WHERE id = ? AND userId = ?`,
      args: [
        debt.title,
        debt.counterparty,
        debt.category || 'Préstamo',
        debt.totalAmount,
        debt.paidAmount || 0,
        debt.interestRate || 0,
        debt.minimumMonthlyPayment || 0,
        debt.dueDate,
        id,
        userId,
      ],
    });
    res.json(debt);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/debts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.query.userId || 'munboi';
    await db.batch([
      { sql: 'DELETE FROM debt_payments WHERE debtId = ? AND userId = ?', args: [id, userId] },
      { sql: 'DELETE FROM debts WHERE id = ? AND userId = ?', args: [id, userId] },
    ]);
    res.json({ deleted: id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/debts/:id/payment', async (req, res) => {
  try {
    const { id } = req.params;
    const { payment, userId = 'munboi' } = req.body;

    await db.batch([
      {
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
      },
      {
        sql: 'UPDATE debts SET paidAmount = MIN(totalAmount, ROUND((paidAmount + ?) * 100) / 100) WHERE id = ?',
        args: [payment.amount, id],
      },
    ]);

    res.status(201).json(payment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ----------------- BULK IMPORT / SYNC (Batch SQLite Transaction) -----------------
app.post('/api/import', async (req, res) => {
  try {
    const {
      userId = 'munboi',
      accounts = [],
      transactions = [],
      subscriptions = [],
      debts = [],
      mode = 'replace',
    } = req.body;

    const statements = [];

    if (mode === 'replace') {
      statements.push(
        { sql: 'DELETE FROM debt_payments WHERE userId = ?', args: [userId] },
        { sql: 'DELETE FROM debts WHERE userId = ?', args: [userId] },
        { sql: 'DELETE FROM subscriptions WHERE userId = ?', args: [userId] },
        { sql: 'DELETE FROM transactions WHERE userId = ?', args: [userId] },
        { sql: 'DELETE FROM accounts WHERE userId = ?', args: [userId] }
      );
    }

    for (const acc of accounts) {
      statements.push({
        sql: `INSERT OR REPLACE INTO accounts (id, name, institution, type, balance, creditLimit, cutOffDay, paymentDueDay, accountNumber, accentGradient, yieldRate, userId)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          acc.id,
          acc.name,
          acc.institution || 'Entidad Financiera',
          acc.type || 'bank',
          acc.balance || 0,
          acc.creditLimit ?? null,
          acc.cutOffDay ?? null,
          acc.paymentDueDay ?? null,
          acc.accountNumber || '•••• 0000',
          acc.accentGradient ?? null,
          acc.yieldRate ?? null,
          userId,
        ],
      });
    }

    for (const tx of transactions) {
      statements.push({
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

    for (const sub of subscriptions) {
      statements.push({
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

    for (const debt of debts) {
      statements.push({
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
          statements.push({
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

    if (statements.length > 0) {
      await db.batch(statements);
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

// ----------------- CLEAR & RESET USER IN SQLITE -----------------
app.post('/api/clear', async (req, res) => {
  try {
    const userId = req.body?.userId || req.query?.userId;
    await clearDatabase(userId || null);
    res.json({ message: 'Base de datos SQLite limpiada' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/reset-demo', async (req, res) => {
  try {
    const userId = req.body?.userId || req.query?.userId || 'munboi';
    await seedUserData(userId);
    res.json({ message: `Datos SQLite restaurados para ${userId}` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start standalone HTTP server only when executed directly
const isDirectRun =
  process.argv[1] && fileURLToPath(import.meta.url).toLowerCase() === process.argv[1].toLowerCase();

if (isDirectRun) {
  initDatabase().then(() => {
    app.listen(PORT, () => {
      console.log(`⚡ SQLite REST API Server activo en http://localhost:${PORT}`);
    });
  });
}
