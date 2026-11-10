import { Router } from 'express';
import { db } from '../db.js';
import { badRequest, conflict, notFound } from '../http.js';
import { accountRow, insertStmt, toAccount, updateOwnStmt } from '../models.js';

export const accountOrderKey = (userId) => `account_order_${userId}`;

/** Cuentas del usuario respetando su orden manual persistido (las no listadas van al final). */
export async function listAccounts(userId) {
  const [accounts, order] = await Promise.all([
    db.execute({ sql: 'SELECT * FROM accounts WHERE userId = ? ORDER BY created_at ASC', args: [userId] }),
    db.execute({ sql: 'SELECT value FROM app_state WHERE key = ?', args: [accountOrderKey(userId)] }),
  ]);
  const rows = accounts.rows.map(toAccount);

  let orderIds = [];
  try {
    orderIds = JSON.parse(order.rows[0]?.value || '[]');
  } catch {
    orderIds = [];
  }
  if (!Array.isArray(orderIds) || orderIds.length === 0) return rows;

  const position = new Map(orderIds.map((id, index) => [id, index]));
  const rank = (acc) => position.get(acc.id) ?? Number.MAX_SAFE_INTEGER;
  return rows.sort((a, b) => rank(a) - rank(b));
}

export const accountsRouter = Router();

accountsRouter.get('/accounts', async (req, res) => {
  res.json(await listAccounts(req.user.id));
});

accountsRouter.put('/accounts/reorder', async (req, res) => {
  const { accountIds } = req.body || {};
  if (!Array.isArray(accountIds) || accountIds.length > 500) throw badRequest('accountIds debe ser un arreglo.');
  const ids = accountIds.filter((id) => typeof id === 'string').map((id) => id.slice(0, 128));
  await db.execute({
    sql: 'INSERT OR REPLACE INTO app_state (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
    args: [accountOrderKey(req.user.id), JSON.stringify(ids)],
  });
  res.json({ success: true, accountIds: ids });
});

accountsRouter.post('/accounts', async (req, res) => {
  const row = accountRow(req.body, req.user.id);
  const result = await db.execute(insertStmt('accounts', row, 'upsertOwn'));
  if (result.rowsAffected === 0) throw conflict('El identificador de la cuenta ya está en uso.');
  res.status(201).json(toAccount(row));
});

accountsRouter.put('/accounts/:id', async (req, res) => {
  const { rows } = await db.execute({
    sql: 'SELECT * FROM accounts WHERE id = ? AND userId = ?',
    args: [req.params.id, req.user.id],
  });
  if (!rows[0]) throw notFound('La cuenta no existe.');

  // Actualización parcial segura: los campos omitidos conservan su valor actual.
  const row = accountRow({ ...rows[0], ...req.body, id: rows[0].id }, req.user.id);
  await db.execute(updateOwnStmt('accounts', row));
  res.json(toAccount({ ...rows[0], ...row }));
});

accountsRouter.delete('/accounts/:id', async (req, res) => {
  try {
    await db.execute({ sql: 'DELETE FROM accounts WHERE id = ? AND userId = ?', args: [req.params.id, req.user.id] });
  } catch (err) {
    if (/FOREIGN KEY/i.test(String(err?.message))) {
      throw conflict('La cuenta tiene movimientos o suscripciones asociados. Elimínalos o reasígnalos primero.');
    }
    throw err;
  }
  res.json({ deleted: req.params.id });
});
