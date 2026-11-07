import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
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
    currency: (row.currency || 'USD').toUpperCase(),
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
    currency: (row.currency || 'USD').toUpperCase(),
    originalAmount: row.originalAmount !== null && row.originalAmount !== undefined ? Number(row.originalAmount) : Number(row.amount || 0),
    isAntExpense: Boolean(row.isAntExpense),
  };
}

function formatSubscriptionRow(row) {
  return {
    ...row,
    amount: Number(row.amount || 0),
    currency: (row.currency || 'USD').toUpperCase(),
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
      currency: (p.currency || 'USD').toUpperCase(),
    });
  }

  return debtsResult.rows.map((row) => ({
    ...row,
    currency: (row.currency || 'USD').toUpperCase(),
    totalAmount: Number(row.totalAmount || 0),
    paidAmount: Number(row.paidAmount || 0),
    interestRate: Number(row.interestRate || 0),
    minimumMonthlyPayment: Number(row.minimumMonthlyPayment || 0),
    payments: paymentsByDebt[row.id] || [],
  }));
}

function getAccountCookie(req) {
  const rawCookie = req.headers?.cookie || '';
  const match = rawCookie.match(/(?:^|;\s*)wf_account_id=([^;]+)/);
  if (!match) return null;
  const val = decodeURIComponent(match[1]);
  return val === 'tiago' || val === 'munboi' ? val : null;
}

function normalizeUserId(uid) {
  return uid === 'tiago' ? 'tiago' : 'munboi';
}

// Helper to compute exact balance delta in the target account's native currency (USD or COP)
async function getAccountDelta(accountId, txAmount, txCurrency, userId, type) {
  const [accRes, userRes] = await Promise.all([
    db.execute({ sql: 'SELECT currency FROM accounts WHERE id = ?', args: [accountId] }),
    db.execute({ sql: 'SELECT exchangeRate FROM users WHERE id = ?', args: [userId] }),
  ]);
  const accCur = (accRes.rows[0]?.currency || 'USD').toUpperCase();
  const txCur = (txCurrency || accCur || 'USD').toUpperCase();
  const rate = Number(userRes.rows[0]?.exchangeRate || 3200);
  const rawAmt = Number(txAmount || 0);

  let nativeAmt = rawAmt;
  if (txCur !== accCur) {
    if (txCur === 'COP' && accCur === 'USD') {
      nativeAmt = Math.round((rawAmt / rate) * 100) / 100;
    } else if (txCur === 'USD' && accCur === 'COP') {
      nativeAmt = Math.round(rawAmt * rate);
    }
  } else {
    nativeAmt = accCur === 'COP' ? Math.round(rawAmt) : Math.round(rawAmt * 100) / 100;
  }

  return type === 'income' ? nativeAmt : -nativeAmt;
}

// ----------------- FULL STATE SNAPSHOT (SQLite) -----------------
app.get('/api/state', async (req, res) => {
  try {
    const cookieAccountId = getAccountCookie(req);
    const [usersRes, stateRes] = await Promise.all([
      db.execute("SELECT * FROM users WHERE id IN ('munboi', 'tiago') ORDER BY id ASC"),
      db.execute("SELECT value FROM app_state WHERE key = 'active_user_id'"),
    ]);

    const requestedUserId = req.query.userId ? normalizeUserId(req.query.userId) : null;
    const activeUserId = requestedUserId || cookieAccountId || normalizeUserId(stateRes.rows[0]?.value);

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
      exchangeRate: Number(u.exchangeRate || 3200),
    }));

    const currentUser = users.find((u) => u.id === activeUserId) || users[0];

    res.json({
      activeUserId: currentUser.id,
      authenticatedAccount: Boolean(cookieAccountId || requestedUserId),
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

// ----------------- USERS & SESSION (Strictly 2 Accounts: munboi & tiago) -----------------
app.get('/api/users', async (_req, res) => {
  try {
    const [usersRes, stateRes] = await Promise.all([
      db.execute("SELECT * FROM users WHERE id IN ('munboi', 'tiago') ORDER BY id ASC"),
      db.execute("SELECT value FROM app_state WHERE key = 'active_user_id'"),
    ]);
    const users = usersRes.rows.map((u) => ({
      ...u,
      defaultPin: u.pin,
      exchangeRate: Number(u.exchangeRate || 3200),
    }));
    res.json({
      activeUserId: normalizeUserId(stateRes.rows[0]?.value),
      users,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/users/:id', async (req, res) => {
  try {
    const id = normalizeUserId(req.params.id);
    const { displayName, role, pin, currency, exchangeRate } = req.body;

    const existingRes = await db.execute({
      sql: 'SELECT * FROM users WHERE id = ?',
      args: [id],
    });
    const existing = existingRes.rows[0];
    if (!existing) {
      return res.status(404).json({ error: 'Cuenta de usuario no encontrada en SQLite' });
    }

    const nextDisplayName = displayName !== undefined ? displayName : existing.displayName;
    const nextRole = role !== undefined ? role : existing.role;
    const nextPin = pin !== undefined ? pin : existing.pin;
    const nextCurrency = currency !== undefined ? currency : existing.currency;
    const nextRate = exchangeRate !== undefined ? Number(exchangeRate) : Number(existing.exchangeRate || 3200);

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
      exchangeRate: Number(updatedRes.rows[0].exchangeRate || 3200),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/session', async (req, res) => {
  try {
    const rawUserId = req.body?.userId;
    if (!rawUserId) return res.status(400).json({ error: 'userId requerido' });
    const userId = normalizeUserId(rawUserId);

    // Account-based session only (never creates new users or device-specific records)
    await db.execute({
      sql: `INSERT OR REPLACE INTO app_state (key, value, updated_at) VALUES ('active_user_id', ?, CURRENT_TIMESTAMP)`,
      args: [userId],
    });

    res.setHeader(
      'Set-Cookie',
      `wf_account_id=${encodeURIComponent(userId)}; Path=/; Max-Age=315360000; SameSite=Lax`
    );

    res.json({ activeUserId: userId, authenticatedAccount: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/session/device', async (_req, res) => {
  try {
    res.setHeader('Set-Cookie', 'wf_account_id=; Path=/; Max-Age=0; SameSite=Lax');
    res.json({ authenticatedAccount: false });
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
    const userId = normalizeUserId(acc.userId);
    const accCur = (acc.currency || 'USD').toUpperCase();
    const rawBalance = acc.balance !== undefined && acc.balance !== '' && acc.balance !== null ? Number(acc.balance) : 0;
    const finalBalance = isNaN(rawBalance) ? 0 : rawBalance;

    await db.execute({
      sql: `INSERT OR REPLACE INTO accounts (id, name, institution, type, currency, balance, creditLimit, cutOffDay, paymentDueDay, accountNumber, accentGradient, yieldRate, userId)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        acc.id,
        acc.name,
        acc.institution || 'Entidad Financiera',
        acc.type || 'bank',
        accCur,
        finalBalance,
        acc.creditLimit ?? null,
        acc.cutOffDay ?? null,
        acc.paymentDueDay ?? null,
        acc.accountNumber || '•••• 0000',
        acc.accentGradient ?? null,
        acc.yieldRate ?? null,
        userId,
      ],
    });
    res.status(201).json({ ...acc, currency: accCur, balance: finalBalance, userId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/accounts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const acc = req.body;
    const userId = normalizeUserId(acc.userId);
    const accCur = (acc.currency || 'USD').toUpperCase();
    const rawBalance = acc.balance !== undefined && acc.balance !== '' && acc.balance !== null ? Number(acc.balance) : 0;
    const finalBalance = isNaN(rawBalance) ? 0 : rawBalance;

    await db.execute({
      sql: `UPDATE accounts
            SET name = ?, institution = ?, type = ?, currency = ?, balance = ?, creditLimit = ?, cutOffDay = ?, paymentDueDay = ?, accountNumber = ?, accentGradient = ?, yieldRate = ?
            WHERE id = ? AND userId = ?`,
      args: [
        acc.name,
        acc.institution,
        acc.type,
        accCur,
        finalBalance,
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
    res.json({ ...acc, currency: accCur, balance: finalBalance, userId });
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
    const userId = normalizeUserId(tx.userId);
    const txCur = (tx.currency || 'USD').toUpperCase();
    const origAmt = tx.originalAmount !== undefined ? Number(tx.originalAmount) : Number(tx.amount);

    await db.execute({
      sql: `INSERT OR REPLACE INTO transactions (id, title, amount, currency, originalAmount, type, category, accountId, date, notes, isAntExpense, userId)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        tx.id,
        tx.title,
        Number(tx.amount),
        txCur,
        origAmt,
        tx.type,
        tx.category,
        tx.accountId,
        tx.date,
        tx.notes || null,
        tx.isAntExpense ? 1 : 0,
        userId,
      ],
    });

    const delta = await getAccountDelta(tx.accountId, origAmt, txCur, userId, tx.type);
    await db.execute({
      sql: 'UPDATE accounts SET balance = ROUND((balance + ?) * 100) / 100 WHERE id = ?',
      args: [delta, tx.accountId],
    });

    res.status(201).json({ ...tx, currency: txCur, originalAmount: origAmt, userId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/transactions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const tx = req.body;
    const userId = normalizeUserId(tx.userId);
    const txCur = (tx.currency || 'USD').toUpperCase();
    const origAmt = tx.originalAmount !== undefined ? Number(tx.originalAmount) : Number(tx.amount);

    const prevRes = await db.execute({
      sql: 'SELECT * FROM transactions WHERE id = ? AND userId = ?',
      args: [id, userId],
    });
    const prevTx = prevRes.rows[0];

    await db.execute({
      sql: `UPDATE transactions
            SET title = ?, amount = ?, currency = ?, originalAmount = ?, type = ?, category = ?, accountId = ?, date = ?, notes = ?, isAntExpense = ?
            WHERE id = ? AND userId = ?`,
      args: [
        tx.title,
        Number(tx.amount),
        txCur,
        origAmt,
        tx.type,
        tx.category,
        tx.accountId,
        tx.date,
        tx.notes || null,
        tx.isAntExpense ? 1 : 0,
        id,
        userId,
      ],
    });

    if (prevTx) {
      const prevOrigAmt = prevTx.originalAmount !== null && prevTx.originalAmount !== undefined ? Number(prevTx.originalAmount) : Number(prevTx.amount);
      const prevCur = prevTx.currency || 'USD';
      const oldSigned = await getAccountDelta(prevTx.accountId, prevOrigAmt, prevCur, userId, prevTx.type);
      const newSigned = await getAccountDelta(tx.accountId, origAmt, txCur, userId, tx.type);

      if (prevTx.accountId === tx.accountId) {
        const diff = newSigned - oldSigned;
        await db.execute({
          sql: 'UPDATE accounts SET balance = ROUND((balance + ?) * 100) / 100 WHERE id = ?',
          args: [diff, tx.accountId],
        });
      } else {
        await Promise.all([
          db.execute({
            sql: 'UPDATE accounts SET balance = ROUND((balance - ?) * 100) / 100 WHERE id = ?',
            args: [oldSigned, prevTx.accountId],
          }),
          db.execute({
            sql: 'UPDATE accounts SET balance = ROUND((balance + ?) * 100) / 100 WHERE id = ?',
            args: [newSigned, tx.accountId],
          }),
        ]);
      }
    }

    res.json({ ...tx, currency: txCur, originalAmount: origAmt, userId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/transactions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = normalizeUserId(req.query.userId);

    const prevRes = await db.execute({
      sql: 'SELECT * FROM transactions WHERE id = ? AND userId = ?',
      args: [id, userId],
    });
    const prevTx = prevRes.rows[0];

    await db.execute({
      sql: 'DELETE FROM transactions WHERE id = ? AND userId = ?',
      args: [id, userId],
    });

    if (prevTx) {
      const prevOrigAmt = prevTx.originalAmount !== null && prevTx.originalAmount !== undefined ? Number(prevTx.originalAmount) : Number(prevTx.amount);
      const prevCur = prevTx.currency || 'USD';
      const oldSigned = await getAccountDelta(prevTx.accountId, prevOrigAmt, prevCur, userId, prevTx.type);
      await db.execute({
        sql: 'UPDATE accounts SET balance = ROUND((balance - ?) * 100) / 100 WHERE id = ?',
        args: [oldSigned, prevTx.accountId],
      });
    }

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
    const userId = normalizeUserId(sub.userId);
    const subCur = (sub.currency || 'USD').toUpperCase();
    await db.execute({
      sql: `INSERT OR REPLACE INTO subscriptions (id, name, category, amount, currency, billingDay, accountId, active, essential, badgeColor, userId)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        sub.id,
        sub.name,
        sub.category,
        Number(sub.amount || 0),
        subCur,
        Number(sub.billingDay || 1),
        sub.accountId || '',
        sub.active ? 1 : 0,
        sub.essential ? 1 : 0,
        sub.badgeColor || '#A855F7',
        userId,
      ],
    });
    res.status(201).json({ ...sub, currency: subCur, userId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/subscriptions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const sub = req.body;
    const userId = normalizeUserId(sub.userId);
    const subCur = (sub.currency || 'USD').toUpperCase();
    await db.execute({
      sql: `UPDATE subscriptions
            SET name = ?, category = ?, amount = ?, currency = ?, billingDay = ?, accountId = ?, active = ?, essential = ?, badgeColor = ?
            WHERE id = ? AND userId = ?`,
      args: [
        sub.name,
        sub.category,
        Number(sub.amount || 0),
        subCur,
        Number(sub.billingDay || 1),
        sub.accountId || '',
        sub.active ? 1 : 0,
        sub.essential ? 1 : 0,
        sub.badgeColor || '#A855F7',
        id,
        userId,
      ],
    });
    res.json({ ...sub, currency: subCur, userId });
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
    const userId = normalizeUserId(debt.userId);
    const debtCur = (debt.currency || 'USD').toUpperCase();
    await db.execute({
      sql: `INSERT OR REPLACE INTO debts (id, title, counterparty, category, currency, totalAmount, paidAmount, interestRate, minimumMonthlyPayment, dueDate, userId)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        debt.id,
        debt.title,
        debt.counterparty,
        debt.category,
        debtCur,
        Number(debt.totalAmount || 0),
        Number(debt.paidAmount || 0),
        Number(debt.interestRate || 0),
        Number(debt.minimumMonthlyPayment || 0),
        debt.dueDate,
        userId,
      ],
    });
    res.status(201).json({ ...debt, currency: debtCur, userId, payments: debt.payments || [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/debts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const debt = req.body;
    const userId = normalizeUserId(debt.userId);
    const debtCur = (debt.currency || 'USD').toUpperCase();
    await db.execute({
      sql: `UPDATE debts
            SET title = ?, counterparty = ?, category = ?, currency = ?, totalAmount = ?, paidAmount = ?, interestRate = ?, minimumMonthlyPayment = ?, dueDate = ?
            WHERE id = ? AND userId = ?`,
      args: [
        debt.title,
        debt.counterparty,
        debt.category || 'Préstamo',
        debtCur,
        Number(debt.totalAmount || 0),
        Number(debt.paidAmount || 0),
        Number(debt.interestRate || 0),
        Number(debt.minimumMonthlyPayment || 0),
        debt.dueDate,
        id,
        userId,
      ],
    });
    res.json({ ...debt, currency: debtCur, userId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/debts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = normalizeUserId(req.query.userId || 'munboi');
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
    const { payment, userId: rawUserId = 'munboi' } = req.body;
    const userId = normalizeUserId(rawUserId);
    const payCur = payment.currency === 'COP' ? 'COP' : 'USD';

    await db.batch([
      {
        sql: `INSERT OR REPLACE INTO debt_payments (id, debtId, amount, currency, date, note, accountId, userId)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          payment.id,
          id,
          payment.amount,
          payCur,
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

    res.status(201).json({ ...payment, currency: payCur });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ----------------- BULK IMPORT / SYNC (Batch SQLite Transaction) -----------------
app.post('/api/import', async (req, res) => {
  try {
    const {
      userId: rawUserId = 'munboi',
      accounts = [],
      transactions = [],
      subscriptions = [],
      debts = [],
      mode = 'replace',
    } = req.body;
    const userId = normalizeUserId(rawUserId);

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
      const accCur = acc.currency === 'COP' ? 'COP' : 'USD';
      const numBal = Number(acc.balance);
      statements.push({
        sql: `INSERT OR REPLACE INTO accounts (id, name, institution, type, balance, currency, creditLimit, cutOffDay, paymentDueDay, accountNumber, accentGradient, yieldRate, userId)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          acc.id,
          acc.name,
          acc.institution || 'Entidad Financiera',
          acc.type || 'bank',
          Number.isFinite(numBal) ? numBal : 0,
          accCur,
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
      const txCur = tx.currency === 'COP' ? 'COP' : 'USD';
      const origAmt = Number.isFinite(Number(tx.originalAmount)) ? Number(tx.originalAmount) : Number(tx.amount);
      statements.push({
        sql: `INSERT OR REPLACE INTO transactions (id, title, amount, originalAmount, currency, type, category, accountId, date, notes, isAntExpense, userId)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          tx.id,
          tx.title,
          tx.amount,
          origAmt,
          txCur,
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
      const subCur = sub.currency === 'COP' ? 'COP' : 'USD';
      statements.push({
        sql: `INSERT OR REPLACE INTO subscriptions (id, name, category, amount, currency, billingDay, accountId, active, essential, badgeColor, userId)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          sub.id,
          sub.name,
          sub.category || 'Servicios',
          sub.amount,
          subCur,
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
      const debtCur = debt.currency === 'COP' ? 'COP' : 'USD';
      statements.push({
        sql: `INSERT OR REPLACE INTO debts (id, title, counterparty, category, totalAmount, paidAmount, currency, interestRate, minimumMonthlyPayment, dueDate, userId)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          debt.id,
          debt.title,
          debt.counterparty || 'Entidad',
          debt.category || 'Préstamo',
          debt.totalAmount,
          debt.paidAmount || 0,
          debtCur,
          debt.interestRate || 0,
          debt.minimumMonthlyPayment || 0,
          debt.dueDate || '2027-12-31',
          userId,
        ],
      });

      if (debt.payments && Array.isArray(debt.payments)) {
        for (const p of debt.payments) {
          const payCur = p.currency === 'COP' ? 'COP' : 'USD';
          statements.push({
            sql: `INSERT OR REPLACE INTO debt_payments (id, debtId, amount, currency, date, note, accountId, userId)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
              p.id,
              debt.id,
              p.amount,
              payCur,
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
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, '../dist');
const isDirectRun =
  process.argv[1] && fileURLToPath(import.meta.url).toLowerCase() === process.argv[1].toLowerCase();

if (isDirectRun) {
  if (fs.existsSync(distDir)) {
    app.use(express.static(distDir));
    app.get(/^(?!\/api).*/, (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  initDatabase().then(() => {
    app.listen(PORT, () => {
      console.log(`⚡ SQLite Full-Stack Server activo en http://localhost:${PORT}`);
    });
  });
}
