// Suscripciones / gastos fijos y deudas con su historial de abonos.
import { Router } from 'express';
import { db, withTransaction } from '../db.js';
import { badRequest, conflict, notFound } from '../http.js';
import {
  debtPaymentRow,
  debtRow,
  insertStmt,
  subscriptionRow,
  toDebt,
  toDebtPayment,
  toSubscription,
  updateOwnStmt,
} from '../models.js';

export async function listSubscriptions(userId) {
  const { rows } = await db.execute({
    sql: 'SELECT * FROM subscriptions WHERE userId = ? ORDER BY billingDay ASC',
    args: [userId],
  });
  return rows.map(toSubscription);
}

export async function listDebts(userId) {
  const [debts, payments] = await Promise.all([
    db.execute({ sql: 'SELECT * FROM debts WHERE userId = ? ORDER BY created_at ASC', args: [userId] }),
    db.execute({ sql: 'SELECT * FROM debt_payments WHERE userId = ? ORDER BY date DESC', args: [userId] }),
  ]);
  const byDebt = new Map();
  for (const p of payments.rows) {
    if (!byDebt.has(p.debtId)) byDebt.set(p.debtId, []);
    byDebt.get(p.debtId).push(toDebtPayment(p));
  }
  return debts.rows.map((row) => toDebt(row, byDebt.get(row.id) || []));
}

async function upsertOwn(table, row, takenMessage) {
  const result = await db.execute(insertStmt(table, row, 'upsertOwn'));
  if (result.rowsAffected === 0) throw conflict(takenMessage);
}

async function updateOwn(table, row, missingMessage) {
  const result = await db.execute(updateOwnStmt(table, row));
  if (result.rowsAffected === 0) throw notFound(missingMessage);
}

export const commitmentsRouter = Router();

// ----------------- SUSCRIPCIONES -----------------
commitmentsRouter.get('/subscriptions', async (req, res) => {
  res.json(await listSubscriptions(req.user.id));
});

commitmentsRouter.post('/subscriptions', async (req, res) => {
  const row = subscriptionRow(req.body, req.user.id);
  await upsertOwn('subscriptions', row, 'El identificador de la suscripción ya está en uso.');
  res.status(201).json(toSubscription(row));
});

commitmentsRouter.put('/subscriptions/:id', async (req, res) => {
  const row = subscriptionRow({ ...req.body, id: req.params.id }, req.user.id);
  await updateOwn('subscriptions', row, 'La suscripción no existe.');
  res.json(toSubscription(row));
});

commitmentsRouter.patch('/subscriptions/:id/toggle', async (req, res) => {
  const { rows } = await db.execute({
    sql: `UPDATE subscriptions SET active = CASE WHEN active = 1 THEN 0 ELSE 1 END
          WHERE id = ? AND userId = ? RETURNING *`,
    args: [req.params.id, req.user.id],
  });
  if (!rows[0]) throw notFound('La suscripción no existe.');
  res.json(toSubscription(rows[0]));
});

commitmentsRouter.delete('/subscriptions/:id', async (req, res) => {
  await db.execute({ sql: 'DELETE FROM subscriptions WHERE id = ? AND userId = ?', args: [req.params.id, req.user.id] });
  res.json({ deleted: req.params.id });
});

// ----------------- DEUDAS -----------------
commitmentsRouter.get('/debts', async (req, res) => {
  res.json(await listDebts(req.user.id));
});

commitmentsRouter.post('/debts', async (req, res) => {
  const row = debtRow(req.body, req.user.id);
  await upsertOwn('debts', row, 'El identificador de la deuda ya está en uso.');
  res.status(201).json(toDebt(row, []));
});

commitmentsRouter.put('/debts/:id', async (req, res) => {
  const row = debtRow({ ...req.body, id: req.params.id }, req.user.id);
  await updateOwn('debts', row, 'La deuda no existe.');
  res.json(toDebt(row, Array.isArray(req.body?.payments) ? req.body.payments : []));
});

commitmentsRouter.delete('/debts/:id', async (req, res) => {
  const args = [req.params.id, req.user.id];
  await db.batch([
    { sql: 'DELETE FROM debt_payments WHERE debtId = ? AND userId = ?', args },
    { sql: 'DELETE FROM debts WHERE id = ? AND userId = ?', args },
  ]);
  res.json({ deleted: req.params.id });
});

/** Abono idempotente: reintentar el mismo id de pago no vuelve a sumar al monto pagado. */
commitmentsRouter.post('/debts/:id/payment', async (req, res) => {
  const userId = req.user.id;
  const input = req.body?.payment;
  if (!input || !(Number(input.amount) > 0)) throw badRequest('El abono debe ser mayor a 0.');

  const payment = await withTransaction(async (tx) => {
    const debt = await tx.execute({
      sql: 'SELECT id, currency FROM debts WHERE id = ? AND userId = ?',
      args: [req.params.id, userId],
    });
    if (!debt.rows[0]) throw notFound('La deuda no existe.');

    const row = debtPaymentRow(input, debt.rows[0].id, userId, debt.rows[0].currency);
    const inserted = await tx.execute(insertStmt('debt_payments', row, 'ignore'));
    if (inserted.rowsAffected > 0) {
      await tx.execute({
        sql: 'UPDATE debts SET paidAmount = MIN(totalAmount, ROUND((paidAmount + ?) * 100) / 100) WHERE id = ? AND userId = ?',
        args: [row.amount, row.debtId, userId],
      });
    }
    return row;
  });

  res.status(201).json(toDebtPayment(payment));
});
