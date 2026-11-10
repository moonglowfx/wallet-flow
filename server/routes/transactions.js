import { Router } from 'express';
import { db, withTransaction } from '../db.js';
import { badRequest, conflict, notFound } from '../http.js';
import {
  balanceDeltaStmt,
  currencyCode,
  entityId,
  insertStmt,
  num,
  roundMoney,
  safeRate,
  signedAccountDelta,
  text,
  toTransaction,
  todayISO,
  transactionRow,
  updateOwnStmt,
} from '../models.js';

async function getOwnAccount(tx, accountId, userId) {
  const { rows } = await tx.execute({
    sql: 'SELECT id, name, currency FROM accounts WHERE id = ? AND userId = ?',
    args: [accountId, userId],
  });
  return rows[0] || null;
}

function validatedRow(body, userId) {
  const row = transactionRow(body, userId);
  if (!(row.amount > 0) || !(row.originalAmount > 0)) throw badRequest('El monto debe ser mayor a 0.');
  if (!row.accountId) throw badRequest('El movimiento debe estar vinculado a una cuenta.');
  return row;
}

export const transactionsRouter = Router();

transactionsRouter.get('/transactions', async (req, res) => {
  const { rows } = await db.execute({
    sql: 'SELECT * FROM transactions WHERE userId = ? ORDER BY date DESC, created_at DESC',
    args: [req.user.id],
  });
  res.json(rows.map(toTransaction));
});

/**
 * Alta idempotente y atómica: el movimiento y el ajuste de saldo se confirman juntos.
 * Reintentar con el mismo id (p. ej. cobro automático `auto-sub-…` desde dos dispositivos) no duplica el cargo.
 */
transactionsRouter.post('/transactions', async (req, res) => {
  const userId = req.user.id;
  const row = validatedRow(req.body, userId);

  const outcome = await withTransaction(async (tx) => {
    const account = await getOwnAccount(tx, row.accountId, userId);
    if (!account) throw badRequest('La cuenta seleccionada no existe.');

    const inserted = await tx.execute(insertStmt('transactions', row, 'ignore'));
    if (inserted.rowsAffected === 0) {
      const existing = await tx.execute({ sql: 'SELECT * FROM transactions WHERE id = ?', args: [row.id] });
      if (existing.rows[0]?.userId !== userId) throw conflict('El identificador del movimiento ya está en uso.');
      return { status: 200, body: toTransaction(existing.rows[0]) };
    }

    const delta = signedAccountDelta(row, account.currency, req.user.exchangeRate);
    await tx.execute(balanceDeltaStmt(account.id, userId, delta));
    return { status: 201, body: toTransaction(row) };
  });

  res.status(outcome.status).json(outcome.body);
});

transactionsRouter.put('/transactions/:id', async (req, res) => {
  const userId = req.user.id;
  const row = validatedRow({ ...req.body, id: req.params.id }, userId);
  const rate = req.user.exchangeRate;

  await withTransaction(async (tx) => {
    const prevRes = await tx.execute({
      sql: 'SELECT * FROM transactions WHERE id = ? AND userId = ?',
      args: [row.id, userId],
    });
    const prev = prevRes.rows[0];
    if (!prev) throw notFound('El movimiento no existe.');

    const prevAccount = await getOwnAccount(tx, prev.accountId, userId);
    const nextAccount = await getOwnAccount(tx, row.accountId, userId);
    if (!nextAccount) throw badRequest('La cuenta seleccionada no existe.');

    const statements = [updateOwnStmt('transactions', row)];
    // Revertir el efecto anterior y aplicar el nuevo (la cuenta original pudo haber sido eliminada).
    if (prevAccount) {
      statements.push(balanceDeltaStmt(prevAccount.id, userId, -signedAccountDelta(prev, prevAccount.currency, rate)));
    }
    statements.push(balanceDeltaStmt(nextAccount.id, userId, signedAccountDelta(row, nextAccount.currency, rate)));
    await tx.batch(statements);
  });

  res.json(toTransaction(row));
});

transactionsRouter.delete('/transactions/:id', async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;

  await withTransaction(async (tx) => {
    const deleted = await tx.execute({
      sql: 'DELETE FROM transactions WHERE id = ? AND userId = ? RETURNING *',
      args: [id, userId],
    });
    const prev = deleted.rows[0];
    if (!prev) return; // idempotente: ya no existía

    const account = await getOwnAccount(tx, prev.accountId, userId);
    if (account) {
      await tx.execute(
        balanceDeltaStmt(account.id, userId, -signedAccountDelta(prev, account.currency, req.user.exchangeRate))
      );
    }
  });

  res.json({ deleted: id });
});

// ----------------- TRANSFERENCIAS ENTRE CUENTAS -----------------
transactionsRouter.post('/transfers', async (req, res) => {
  const userId = req.user.id;
  const body = req.body || {};
  const amount = num(body.amount, NaN);
  const { fromAccountId, toAccountId } = body;

  if (!fromAccountId || !toAccountId || fromAccountId === toAccountId) {
    throw badRequest('Debes seleccionar cuentas de origen y destino distintas.');
  }
  if (!Number.isFinite(amount) || amount <= 0) throw badRequest('El monto a transferir debe ser mayor a 0.');

  const rate = safeRate(req.user.exchangeRate);
  const currency = currencyCode(body.currency);
  const usdAmount = currency === 'COP' ? roundMoney(amount / rate) : roundMoney(amount);
  const notes = text(body.notes, '', 1000);
  const date = typeof body.date === 'string' && /^\d{4}-\d{2}-\d{2}/.test(body.date) ? body.date.slice(0, 10) : todayISO();

  const result = await withTransaction(async (tx) => {
    const fromAcc = await getOwnAccount(tx, fromAccountId, userId);
    const toAcc = await getOwnAccount(tx, toAccountId, userId);
    if (!fromAcc || !toAcc) throw notFound('Una de las cuentas seleccionadas no existe.');

    const base = {
      amount: usdAmount,
      currency,
      originalAmount: amount,
      category: 'Transferencias & Cambio',
      date,
      isAntExpense: false,
    };
    // El cliente puede proponer los ids para que su estado optimista coincida con el servidor.
    const outTx = transactionRow(
      {
        ...base,
        id: entityId(body.outId, 'tx-trf-out'),
        title: `Transferencia a ${toAcc.name}`,
        type: 'expense',
        accountId: fromAcc.id,
        notes: notes || `Transferencia enviada hacia ${toAcc.name}`,
      },
      userId
    );
    const inTx = transactionRow(
      {
        ...base,
        id: entityId(body.inId, 'tx-trf-in'),
        title: `Transferencia desde ${fromAcc.name}`,
        type: 'income',
        accountId: toAcc.id,
        notes: notes || `Transferencia recibida desde ${fromAcc.name}`,
      },
      userId
    );
    if (outTx.id === inTx.id) throw badRequest('Identificadores de transferencia inválidos.');

    const fromDelta = signedAccountDelta(outTx, fromAcc.currency, rate);
    const toDelta = signedAccountDelta(inTx, toAcc.currency, rate);

    try {
      await tx.batch([
        insertStmt('transactions', outTx),
        insertStmt('transactions', inTx),
        balanceDeltaStmt(fromAcc.id, userId, fromDelta),
        balanceDeltaStmt(toAcc.id, userId, toDelta),
      ]);
    } catch (err) {
      if (/UNIQUE|PRIMARY KEY/i.test(String(err?.message))) throw conflict('La transferencia ya fue registrada.');
      throw err;
    }

    return {
      success: true,
      outTransaction: toTransaction(outTx),
      inTransaction: toTransaction(inTx),
      fromDelta,
      toDelta,
    };
  });

  res.status(201).json(result);
});
