import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { db, initDatabase, seedUserData, clearDatabase, getDatabaseConnectionInfo } from './db.js';
import { createDatabaseBackup } from '../scripts/backup_db.js';
import { restoreDatabase } from '../scripts/restore_db.js';

export const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '15mb' }));

// URL prefix normalization middleware for serverless (Vercel) & direct API routing compatibility
app.use((req, _res, next) => {
  if (req.url && !req.url.startsWith('/api') && !req.url.startsWith('/assets') && !req.url.startsWith('/vite') && !req.url.includes('.')) {
    req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
  }
  next();
});

// Ensure SQLite / Turso database is initialized before handling any API request
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
    autoCharge: row.autoCharge === undefined || row.autoCharge === null ? true : Boolean(row.autoCharge),
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

// Helper to get user's ordered account IDs from app_state
async function getOrderedAccounts(userId) {
  const [accsRes, orderRes] = await Promise.all([
    db.execute({
      sql: 'SELECT * FROM accounts WHERE userId = ? ORDER BY created_at ASC',
      args: [userId],
    }),
    db.execute({
      sql: 'SELECT value FROM app_state WHERE key = ?',
      args: [`account_order_${userId}`],
    }),
  ]);
  const rows = accsRes.rows.map(formatAccountRow);
  const rawOrder = orderRes.rows[0]?.value;
  if (!rawOrder) return rows;
  try {
    const orderIds = JSON.parse(rawOrder);
    if (!Array.isArray(orderIds) || orderIds.length === 0) return rows;
    const orderMap = new Map(orderIds.map((id, idx) => [id, idx]));
    return [...rows].sort((a, b) => {
      const idxA = orderMap.has(a.id) ? orderMap.get(a.id) : 9999;
      const idxB = orderMap.has(b.id) ? orderMap.get(b.id) : 9999;
      return idxA - idxB;
    });
  } catch (_) {
    return rows;
  }
}

// Helper to compute exact balance delta in the target account's native currency (USD or COP)
async function getAccountDelta(accountId, txAmount, txCurrency, userId, type) {
  const [accRes, userRes] = await Promise.all([
    db.execute({ sql: 'SELECT currency FROM accounts WHERE id = ? AND userId = ?', args: [accountId, userId] }),
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

    const [orderedAccounts, txsRes, subsRes, debts] = await Promise.all([
      getOrderedAccounts(activeUserId),
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
      accounts: orderedAccounts,
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
    const userId = normalizeUserId(req.query.userId || 'munboi');
    const ordered = await getOrderedAccounts(userId);
    res.json(ordered);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/accounts/reorder', async (req, res) => {
  try {
    const { userId: rawUserId = 'munboi', accountIds = [] } = req.body;
    const userId = normalizeUserId(rawUserId);
    if (!Array.isArray(accountIds)) {
      return res.status(400).json({ error: 'accountIds debe ser un arreglo' });
    }
    await db.execute({
      sql: 'INSERT OR REPLACE INTO app_state (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
      args: [`account_order_${userId}`, JSON.stringify(accountIds)],
    });
    res.json({ success: true, userId, accountIds });
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
    const userId = normalizeUserId(req.query.userId || 'munboi');
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
    const userId = normalizeUserId(req.query.userId || 'munboi');
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
      sql: 'UPDATE accounts SET balance = ROUND((balance + ?) * 100) / 100 WHERE id = ? AND userId = ?',
      args: [delta, tx.accountId, userId],
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
          sql: 'UPDATE accounts SET balance = ROUND((balance + ?) * 100) / 100 WHERE id = ? AND userId = ?',
          args: [diff, tx.accountId, userId],
        });
      } else {
        await Promise.all([
          db.execute({
            sql: 'UPDATE accounts SET balance = ROUND((balance - ?) * 100) / 100 WHERE id = ? AND userId = ?',
            args: [oldSigned, prevTx.accountId, userId],
          }),
          db.execute({
            sql: 'UPDATE accounts SET balance = ROUND((balance + ?) * 100) / 100 WHERE id = ? AND userId = ?',
            args: [newSigned, tx.accountId, userId],
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
        sql: 'UPDATE accounts SET balance = ROUND((balance - ?) * 100) / 100 WHERE id = ? AND userId = ?',
        args: [oldSigned, prevTx.accountId, userId],
      });
    }

    res.json({ deleted: id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ----------------- TRANSFERS BETWEEN ACCOUNTS -----------------
app.post('/api/transfers', async (req, res) => {
  try {
    const {
      fromAccountId,
      toAccountId,
      amount,
      currency: rawCur = 'USD',
      date = new Date().toISOString().split('T')[0],
      notes = '',
      userId: rawUserId = 'munboi',
    } = req.body;

    const userId = normalizeUserId(rawUserId);
    const numAmt = Number(amount);

    if (!fromAccountId || !toAccountId || fromAccountId === toAccountId) {
      return res.status(400).json({ error: 'Debes seleccionar cuentas de origen y destino distintas.' });
    }
    if (!Number.isFinite(numAmt) || numAmt <= 0) {
      return res.status(400).json({ error: 'El monto a transferir debe ser mayor a 0.' });
    }

    const [accsRes, userRes] = await Promise.all([
      db.execute({
        sql: 'SELECT * FROM accounts WHERE userId = ? AND id IN (?, ?)',
        args: [userId, fromAccountId, toAccountId],
      }),
      db.execute({
        sql: 'SELECT exchangeRate FROM users WHERE id = ?',
        args: [userId],
      }),
    ]);

    const fromAcc = accsRes.rows.find((r) => r.id === fromAccountId);
    const toAcc = accsRes.rows.find((r) => r.id === toAccountId);
    if (!fromAcc || !toAcc) {
      return res.status(404).json({ error: 'Una de las cuentas seleccionadas no existe.' });
    }

    const rate = Number(userRes.rows[0]?.exchangeRate || 3200);
    const txCur = (rawCur || 'USD').toUpperCase();
    const usdAmount = txCur === 'COP' ? Math.round((numAmt / rate) * 100) / 100 : Math.round(numAmt * 100) / 100;

    const fromDelta = await getAccountDelta(fromAccountId, numAmt, txCur, userId, 'expense');
    const toDelta = await getAccountDelta(toAccountId, numAmt, txCur, userId, 'income');

    const nowTs = Date.now();
    const outTx = {
      id: `tx-trf-out-${nowTs}`,
      title: `Transferencia a ${toAcc.name}`,
      amount: usdAmount,
      currency: txCur,
      originalAmount: numAmt,
      type: 'expense',
      category: 'Transferencias & Cambio',
      accountId: fromAccountId,
      date,
      notes: notes || `Transferencia enviada hacia ${toAcc.name}`,
      isAntExpense: false,
      userId,
    };

    const inTx = {
      id: `tx-trf-in-${nowTs + 1}`,
      title: `Transferencia desde ${fromAcc.name}`,
      amount: usdAmount,
      currency: txCur,
      originalAmount: numAmt,
      type: 'income',
      category: 'Transferencias & Cambio',
      accountId: toAccountId,
      date,
      notes: notes || `Transferencia recibida desde ${fromAcc.name}`,
      isAntExpense: false,
      userId,
    };

    await db.batch([
      {
        sql: `INSERT OR REPLACE INTO transactions (id, title, amount, currency, originalAmount, type, category, accountId, date, notes, isAntExpense, userId)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          outTx.id,
          outTx.title,
          outTx.amount,
          outTx.currency,
          outTx.originalAmount,
          outTx.type,
          outTx.category,
          outTx.accountId,
          outTx.date,
          outTx.notes,
          0,
          userId,
        ],
      },
      {
        sql: `INSERT OR REPLACE INTO transactions (id, title, amount, currency, originalAmount, type, category, accountId, date, notes, isAntExpense, userId)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          inTx.id,
          inTx.title,
          inTx.amount,
          inTx.currency,
          inTx.originalAmount,
          inTx.type,
          inTx.category,
          inTx.accountId,
          inTx.date,
          inTx.notes,
          0,
          userId,
        ],
      },
      {
        sql: 'UPDATE accounts SET balance = ROUND((balance + ?) * 100) / 100 WHERE id = ? AND userId = ?',
        args: [fromDelta, fromAccountId, userId],
      },
      {
        sql: 'UPDATE accounts SET balance = ROUND((balance + ?) * 100) / 100 WHERE id = ? AND userId = ?',
        args: [toDelta, toAccountId, userId],
      },
    ]);

    res.status(201).json({
      success: true,
      outTransaction: outTx,
      inTransaction: inTx,
      fromDelta,
      toDelta,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ----------------- SUBSCRIPTIONS -----------------
app.get('/api/subscriptions', async (req, res) => {
  try {
    const userId = normalizeUserId(req.query.userId || 'munboi');
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
      sql: `INSERT OR REPLACE INTO subscriptions (id, name, category, amount, currency, billingDay, accountId, active, essential, badgeColor, userId, autoCharge)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        sub.autoCharge !== false ? 1 : 0,
      ],
    });
    res.status(201).json({ ...sub, currency: subCur, userId, autoCharge: sub.autoCharge !== false });
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
            SET name = ?, category = ?, amount = ?, currency = ?, billingDay = ?, accountId = ?, active = ?, essential = ?, badgeColor = ?, autoCharge = ?
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
        sub.autoCharge !== false ? 1 : 0,
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
    const rawUserId = req.body?.userId || req.query?.userId;
    if (rawUserId) {
      const userId = normalizeUserId(rawUserId);
      await db.execute({
        sql: 'UPDATE subscriptions SET active = CASE WHEN active = 1 THEN 0 ELSE 1 END WHERE id = ? AND userId = ?',
        args: [id, userId],
      });
    } else {
      await db.execute({
        sql: 'UPDATE subscriptions SET active = CASE WHEN active = 1 THEN 0 ELSE 1 END WHERE id = ?',
        args: [id],
      });
    }
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
    const userId = normalizeUserId(req.query.userId || 'munboi');
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
    const userId = normalizeUserId(req.query.userId || 'munboi');
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
        sql: 'UPDATE debts SET paidAmount = MIN(totalAmount, ROUND((paidAmount + ?) * 100) / 100) WHERE id = ? AND userId = ?',
        args: [payment.amount, id, userId],
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
      currency,
      exchangeRate,
    } = req.body;
    const userId = normalizeUserId(rawUserId);

    const statements = [];

    if (currency || exchangeRate) {
      statements.push({
        sql: `UPDATE users
              SET currency = COALESCE(?, currency),
                  exchangeRate = COALESCE(?, exchangeRate),
                  updated_at = CURRENT_TIMESTAMP
              WHERE id = ?`,
        args: [currency || null, exchangeRate ? Number(exchangeRate) : null, userId],
      });
    }

    if (mode === 'replace') {
      statements.push(
        { sql: 'DELETE FROM debt_payments WHERE userId = ?', args: [userId] },
        { sql: 'DELETE FROM debts WHERE userId = ?', args: [userId] },
        { sql: 'DELETE FROM subscriptions WHERE userId = ?', args: [userId] },
        { sql: 'DELETE FROM transactions WHERE userId = ?', args: [userId] },
        { sql: 'DELETE FROM accounts WHERE userId = ?', args: [userId] }
      );
    }

    if (Array.isArray(accounts) && accounts.length > 0) {
      const orderIds = accounts.map((a) => a.id).filter(Boolean);
      statements.push({
        sql: 'INSERT OR REPLACE INTO app_state (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
        args: [`account_order_${userId}`, JSON.stringify(orderIds)],
      });
    }

    for (const acc of accounts) {
      const accCur = (acc.currency || 'USD').toUpperCase();
      const numBal = Number(acc.balance);
      const finalBal = Number.isFinite(numBal) ? numBal : 0;
      const numLimit = Number(acc.creditLimit);
      const finalLimit = Number.isFinite(numLimit) ? numLimit : null;
      const numCutOff = Number(acc.cutOffDay);
      const finalCutOff = Number.isFinite(numCutOff) ? numCutOff : null;
      const numDueDay = Number(acc.paymentDueDay);
      const finalDueDay = Number.isFinite(numDueDay) ? numDueDay : null;
      const numYield = Number(acc.yieldRate);
      const finalYield = Number.isFinite(numYield) ? numYield : null;

      statements.push({
        sql: `INSERT OR REPLACE INTO accounts (id, name, institution, type, balance, currency, creditLimit, cutOffDay, paymentDueDay, accountNumber, accentGradient, yieldRate, userId)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          acc.id || 'acc_' + Math.random().toString(36).substring(2, 9),
          acc.name || 'Cuenta',
          acc.institution || 'Entidad Financiera',
          acc.type || 'bank',
          finalBal,
          accCur,
          finalLimit,
          finalCutOff,
          finalDueDay,
          acc.accountNumber || '•••• 0000',
          acc.accentGradient ?? null,
          finalYield,
          userId,
        ],
      });
    }

    const firstAccId = accounts[0]?.id || 'acc_1';

    for (const tx of transactions) {
      const txCur = (tx.currency || 'USD').toUpperCase();
      const numTxAmt = Number(tx.amount);
      const finalTxAmt = Number.isFinite(numTxAmt) ? numTxAmt : 0;
      const rawOrig = tx.originalAmount !== undefined && tx.originalAmount !== null ? Number(tx.originalAmount) : numTxAmt;
      const finalOrigAmt = Number.isFinite(rawOrig) ? rawOrig : finalTxAmt;

      statements.push({
        sql: `INSERT OR REPLACE INTO transactions (id, title, amount, originalAmount, currency, type, category, accountId, date, notes, isAntExpense, userId)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          tx.id || 'tx_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          tx.title || 'Movimiento',
          finalTxAmt,
          finalOrigAmt,
          txCur,
          tx.type || 'expense',
          tx.category || 'Otros',
          tx.accountId || firstAccId,
          tx.date || new Date().toISOString().split('T')[0],
          tx.notes || null,
          tx.isAntExpense ? 1 : 0,
          userId,
        ],
      });
    }

    for (const sub of subscriptions) {
      const subCur = (sub.currency || 'USD').toUpperCase();
      const numSubAmt = Number(sub.amount);
      const finalSubAmt = Number.isFinite(numSubAmt) ? numSubAmt : 0;
      const numBillingDay = Number(sub.billingDay);
      const finalBillingDay = Number.isFinite(numBillingDay) ? numBillingDay : 1;

      statements.push({
        sql: `INSERT OR REPLACE INTO subscriptions (id, name, category, amount, currency, billingDay, accountId, active, essential, badgeColor, userId, autoCharge)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          sub.id || 'sub_' + Math.random().toString(36).substring(2, 9),
          sub.name || 'Suscripción',
          sub.category || 'Servicios',
          finalSubAmt,
          subCur,
          finalBillingDay,
          sub.accountId || firstAccId,
          sub.active ? 1 : 0,
          sub.essential ? 1 : 0,
          sub.badgeColor || '#A855F7',
          userId,
          sub.autoCharge !== false ? 1 : 0,
        ],
      });
    }

    for (const debt of debts) {
      const debtCur = (debt.currency || 'USD').toUpperCase();
      const numTotal = Number(debt.totalAmount);
      const finalTotal = Number.isFinite(numTotal) ? numTotal : 0;
      const numPaid = Number(debt.paidAmount);
      const finalPaid = Number.isFinite(numPaid) ? numPaid : 0;
      const numRate = Number(debt.interestRate);
      const finalRate = Number.isFinite(numRate) ? numRate : 0;
      const numMin = Number(debt.minimumMonthlyPayment);
      const finalMin = Number.isFinite(numMin) ? numMin : 0;

      statements.push({
        sql: `INSERT OR REPLACE INTO debts (id, title, counterparty, category, totalAmount, paidAmount, currency, interestRate, minimumMonthlyPayment, dueDate, userId)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          debt.id || 'debt_' + Math.random().toString(36).substring(2, 9),
          debt.title || 'Deuda',
          debt.counterparty || 'Entidad',
          debt.category || 'Préstamo',
          finalTotal,
          finalPaid,
          debtCur,
          finalRate,
          finalMin,
          debt.dueDate || '2027-12-31',
          userId,
        ],
      });

      if (debt.payments && Array.isArray(debt.payments)) {
        for (const p of debt.payments) {
          const payCur = (p.currency || debtCur || 'USD').toUpperCase();
          const numPay = Number(p.amount);
          const finalPay = Number.isFinite(numPay) ? numPay : 0;

          statements.push({
            sql: `INSERT OR REPLACE INTO debt_payments (id, debtId, amount, currency, date, note, accountId, userId)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
              p.id || 'pay_' + Math.random().toString(36).substring(2, 9),
              debt.id,
              finalPay,
              payCur,
              p.date || new Date().toISOString().split('T')[0],
              p.note || 'Abono',
              p.accountId || null,
              userId,
            ],
          });
        }
      }
    }

    // Execute in safe batch chunks of 75 to avoid payload or statement limits
    if (statements.length > 0) {
      const CHUNK_SIZE = 75;
      for (let i = 0; i < statements.length; i += CHUNK_SIZE) {
        const chunk = statements.slice(i, i + CHUNK_SIZE);
        await db.batch(chunk);
      }
    }

    await db.execute({
      sql: "INSERT OR REPLACE INTO app_state (key, value, updated_at) VALUES ('db_initialized', 'true', CURRENT_TIMESTAMP)",
      args: [],
    });

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
    await createDatabaseBackup(); // Safety backup before any intentional reset
    await seedUserData(userId);
    res.json({ message: `Datos SQLite restaurados para ${userId}` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ----------------- DATABASE BACKUP & PERSISTENCE INFO -----------------
app.post('/api/database/backup', async (_req, res) => {
  try {
    const backupRes = await createDatabaseBackup();
    res.json(backupRes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/database/info', async (_req, res) => {
  try {
    const info = getDatabaseConnectionInfo();
    const [accsRes, txsRes, usersRes] = await Promise.all([
      db.execute('SELECT COUNT(*) as c FROM accounts'),
      db.execute('SELECT COUNT(*) as c FROM transactions'),
      db.execute('SELECT COUNT(*) as c FROM users'),
    ]);
    res.json({
      ...info,
      records: {
        accounts: accsRes.rows[0]?.c || 0,
        transactions: txsRes.rows[0]?.c || 0,
        users: usersRes.rows[0]?.c || 0,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/database/snapshot/latest', async (_req, res) => {
  try {
    const snapshotPath = path.resolve(__dirname, '../backups/wallet_flow_snapshot_latest.json');
    if (fs.existsSync(snapshotPath)) {
      const raw = fs.readFileSync(snapshotPath, 'utf-8');
      res.json(JSON.parse(raw));
    } else {
      res.status(404).json({ error: 'No se encontró un snapshot previo en el servidor.' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/database/restore', async (req, res) => {
  try {
    const { snapshot, useLatest } = req.body || {};
    if (useLatest) {
      const result = await restoreDatabase();
      return res.json(result);
    }
    if (snapshot) {
      const result = await restoreDatabase(snapshot);
      return res.json(result);
    }
    const result = await restoreDatabase();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- PRISMA OS SETTINGS & BUCKETS ENDPOINTS ---
app.get('/api/prisma', async (req, res) => {
  try {
    const cookieAccountId = getAccountCookie(req);
    const userId = normalizeUserId(req.query.userId || cookieAccountId || 'munboi');

    let result = await db.execute({
      sql: 'SELECT * FROM prisma_settings WHERE userId = ?',
      args: [userId],
    });

    if (result.rows.length === 0) {
      const defaultAlloc = {
        emer: 12,
        deuda: 8,
        fiscal: 8,
        fija: 12,
        cripto: 12,
        refugio: 5,
        lp: 8,
        trade: 12,
        opp: 8,
        life: 15,
      };
      const defaultYields = {
        emer: 4.5,
        deuda: 0,
        fiscal: 4.0,
        fija: 6.5,
        cripto: 14.0,
        refugio: 5.5,
        lp: 10.0,
        trade: 18.0,
        opp: 8.0,
        life: 0,
      };

      await db.execute({
        sql: `INSERT OR REPLACE INTO prisma_settings (userId, income, fixed, goal, emerStock, profileKey, alloc, locks, disabled, yieldRates, updated_at)
              VALUES (?, 7504, 200, 4000, 4000, 'mid', ?, '{}', '{}', ?, CURRENT_TIMESTAMP)`,
        args: [userId, JSON.stringify(defaultAlloc), JSON.stringify(defaultYields)],
      });

      return res.json({
        userId,
        income: 7504,
        fixed: 200,
        goal: 4000,
        emerStock: 4000,
        profileKey: 'mid',
        alloc: defaultAlloc,
        locks: {},
        disabled: {},
        yieldRates: defaultYields,
        updated_at: new Date().toISOString(),
      });
    }

    const row = result.rows[0];
    let alloc = {};
    let locks = {};
    let disabled = {};
    let yieldRates = {};
    try { alloc = JSON.parse(row.alloc || '{}'); } catch (_) {}
    try { locks = JSON.parse(row.locks || '{}'); } catch (_) {}
    try { disabled = JSON.parse(row.disabled || '{}'); } catch (_) {}
    try { yieldRates = JSON.parse(row.yieldRates || '{}'); } catch (_) {}

    res.json({
      userId: row.userId,
      income: Number(row.income || 7504),
      fixed: Number(row.fixed || 200),
      goal: Number(row.goal || 4000),
      emerStock: Number(row.emerStock || 4000),
      profileKey: row.profileKey || 'mid',
      alloc,
      locks,
      disabled,
      yieldRates,
      updated_at: row.updated_at,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/prisma', async (req, res) => {
  try {
    const cookieAccountId = getAccountCookie(req);
    const userId = normalizeUserId(req.body.userId || req.query.userId || cookieAccountId || 'munboi');

    const existingRes = await db.execute({
      sql: 'SELECT * FROM prisma_settings WHERE userId = ?',
      args: [userId],
    });
    const existing = existingRes.rows[0];

    const body = req.body || {};
    const nextIncome = body.income !== undefined ? Number(body.income) : Number(existing?.income ?? 7504);
    const nextFixed = body.fixed !== undefined ? Number(body.fixed) : Number(existing?.fixed ?? 200);
    const nextGoal = body.goal !== undefined ? Number(body.goal) : Number(existing?.goal ?? 4000);
    const nextEmerStock = body.emerStock !== undefined ? Number(body.emerStock) : Number(existing?.emerStock ?? 4000);
    const nextProfileKey = body.profileKey !== undefined ? String(body.profileKey) : String(existing?.profileKey || 'mid');

    let parsedExistingAlloc = {};
    let parsedExistingLocks = {};
    let parsedExistingDisabled = {};
    let parsedExistingYieldRates = {};
    if (existing) {
      try { parsedExistingAlloc = JSON.parse(existing.alloc || '{}'); } catch (_) {}
      try { parsedExistingLocks = JSON.parse(existing.locks || '{}'); } catch (_) {}
      try { parsedExistingDisabled = JSON.parse(existing.disabled || '{}'); } catch (_) {}
      try { parsedExistingYieldRates = JSON.parse(existing.yieldRates || '{}'); } catch (_) {}
    }

    const nextAlloc = body.alloc !== undefined && Object.keys(body.alloc || {}).length > 0 ? body.alloc : parsedExistingAlloc;
    const nextLocks = body.locks !== undefined ? body.locks : parsedExistingLocks;
    const nextDisabled = body.disabled !== undefined ? body.disabled : parsedExistingDisabled;
    const nextYieldRates = body.yieldRates !== undefined && Object.keys(body.yieldRates || {}).length > 0 ? body.yieldRates : parsedExistingYieldRates;

    const allocStr = typeof nextAlloc === 'string' ? nextAlloc : JSON.stringify(nextAlloc || {});
    const locksStr = typeof nextLocks === 'string' ? nextLocks : JSON.stringify(nextLocks || {});
    const disabledStr = typeof nextDisabled === 'string' ? nextDisabled : JSON.stringify(nextDisabled || {});
    const yieldRatesStr = typeof nextYieldRates === 'string' ? nextYieldRates : JSON.stringify(nextYieldRates || {});

    await db.execute({
      sql: `INSERT OR REPLACE INTO prisma_settings 
            (userId, income, fixed, goal, emerStock, profileKey, alloc, locks, disabled, yieldRates, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      args: [
        userId,
        nextIncome,
        nextFixed,
        nextGoal,
        nextEmerStock,
        nextProfileKey,
        allocStr,
        locksStr,
        disabledStr,
        yieldRatesStr,
      ],
    });

    // Auto-sync binary backup if present (entorno local Node)
    if (!process.env.VERCEL) {
      const sourceDb = path.resolve('wallet_flow.db');
      if (fs.existsSync(sourceDb)) {
        try {
          fs.copyFileSync(sourceDb, path.resolve('wallet_flow.db.bak'));
        } catch (_) {}
      }
    }

    res.json({
      success: true,
      userId,
      income: nextIncome,
      fixed: nextFixed,
      goal: nextGoal,
      emerStock: nextEmerStock,
      profileKey: nextProfileKey,
      alloc: typeof nextAlloc === 'string' ? JSON.parse(nextAlloc) : nextAlloc,
      locks: typeof nextLocks === 'string' ? JSON.parse(nextLocks) : nextLocks,
      disabled: typeof nextDisabled === 'string' ? JSON.parse(nextDisabled) : nextDisabled,
      yieldRates: typeof nextYieldRates === 'string' ? JSON.parse(nextYieldRates) : nextYieldRates,
      updated_at: new Date().toISOString(),
    });
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
