// Normalización de entidades (entrada -> fila SQL), mapeo (fila SQL -> API) y constructores de sentencias.
// Única fuente de verdad para columnas: la usan rutas, importación masiva, siembra y restauración.
import { randomId } from './security.js';

export const DEFAULT_EXCHANGE_RATE = 3200;

// ---------- Coerción segura ----------
export const num = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

export const numOrNull = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const intInRange = (value, min, max, fallback) => {
  const n = Math.trunc(Number(value));
  return Number.isFinite(n) && n >= min && n <= max ? n : fallback;
};

export const text = (value, fallback = '', max = 200) => {
  const s = typeof value === 'string' ? value.trim() : value === null || value === undefined ? '' : String(value).trim();
  return (s || fallback).slice(0, max);
};

const textOrNull = (value, max = 500) => text(value, '', max) || null;
const bool = (value) => (value === true || value === 1 || value === '1' ? 1 : 0);

export const currencyCode = (value, fallback = 'USD') => {
  const c = String(value || '').toUpperCase();
  return c === 'USD' || c === 'COP' ? c : fallback;
};

export const roundMoney = (value, currency = 'USD') =>
  currency === 'COP' ? Math.round(num(value)) : Math.round(num(value) * 100) / 100;

export const todayISO = () => new Date().toISOString().slice(0, 10);
const isoDate = (value, fallback = todayISO()) =>
  typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : fallback;

export const entityId = (value, prefix) => {
  const s = typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
  return s && s.length <= 128 ? s : randomId(prefix);
};

export const safeRate = (value) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_EXCHANGE_RATE;
};

// ---------- Entrada -> fila SQL ----------
export function accountRow(input = {}, userId) {
  const currency = currencyCode(input.currency);
  return {
    id: entityId(input.id, 'acc'),
    name: text(input.name, 'Cuenta', 80),
    institution: text(input.institution, 'Entidad Financiera', 80),
    type: text(input.type, 'bank', 30),
    currency,
    balance: roundMoney(input.balance, currency),
    creditLimit: numOrNull(input.creditLimit),
    cutOffDay: numOrNull(input.cutOffDay),
    paymentDueDay: numOrNull(input.paymentDueDay),
    accountNumber: text(input.accountNumber, '•••• 0000', 40),
    accentGradient: textOrNull(input.accentGradient, 160),
    yieldRate: numOrNull(input.yieldRate),
    userId,
  };
}

export function transactionRow(input = {}, userId) {
  const amount = num(input.amount);
  return {
    id: entityId(input.id, 'tx'),
    title: text(input.title, 'Movimiento', 160),
    amount,
    currency: currencyCode(input.currency),
    originalAmount: num(input.originalAmount, amount),
    type: input.type === 'income' ? 'income' : 'expense',
    category: text(input.category, 'Otros', 80),
    accountId: text(input.accountId, '', 128),
    date: isoDate(input.date),
    notes: textOrNull(input.notes, 1000),
    isAntExpense: bool(input.isAntExpense),
    userId,
  };
}

export function subscriptionRow(input = {}, userId) {
  return {
    id: entityId(input.id, 'sub'),
    name: text(input.name, 'Suscripción', 80),
    category: text(input.category, 'Servicios', 80),
    amount: Math.max(0, num(input.amount)),
    currency: currencyCode(input.currency),
    billingDay: intInRange(input.billingDay, 1, 31, 1),
    accountId: text(input.accountId, '', 128),
    active: input.active === undefined ? 1 : bool(input.active),
    essential: bool(input.essential),
    badgeColor: text(input.badgeColor, '#A855F7', 32),
    autoCharge: input.autoCharge === false || input.autoCharge === 0 ? 0 : 1,
    userId,
  };
}

export function debtRow(input = {}, userId) {
  return {
    id: entityId(input.id, 'debt'),
    title: text(input.title, 'Deuda', 120),
    counterparty: text(input.counterparty, 'Entidad', 120),
    category: text(input.category, 'Préstamo', 80),
    currency: currencyCode(input.currency),
    totalAmount: Math.max(0, num(input.totalAmount)),
    paidAmount: Math.max(0, num(input.paidAmount)),
    interestRate: num(input.interestRate),
    minimumMonthlyPayment: Math.max(0, num(input.minimumMonthlyPayment)),
    dueDate: isoDate(input.dueDate, '2027-12-31'),
    userId,
  };
}

export function debtPaymentRow(input = {}, debtId, userId, fallbackCurrency = 'USD') {
  return {
    id: entityId(input.id, 'pay'),
    debtId,
    amount: Math.max(0, num(input.amount)),
    currency: currencyCode(input.currency, fallbackCurrency),
    date: isoDate(input.date),
    note: text(input.note, 'Abono', 300),
    accountId: textOrNull(input.accountId, 128),
    userId,
  };
}

// ---------- Fila SQL -> API ----------
const optionalNumber = (value) => (value === null || value === undefined ? undefined : Number(value));

export const toAccount = (row) => ({
  ...row,
  currency: currencyCode(row.currency),
  balance: num(row.balance),
  creditLimit: optionalNumber(row.creditLimit),
  cutOffDay: optionalNumber(row.cutOffDay),
  paymentDueDay: optionalNumber(row.paymentDueDay),
  yieldRate: optionalNumber(row.yieldRate),
});

export const toTransaction = (row) => ({
  ...row,
  amount: num(row.amount),
  currency: currencyCode(row.currency),
  originalAmount: num(row.originalAmount, num(row.amount)),
  isAntExpense: Boolean(row.isAntExpense),
});

export const toSubscription = (row) => ({
  ...row,
  amount: num(row.amount),
  currency: currencyCode(row.currency),
  billingDay: num(row.billingDay, 1),
  active: Boolean(row.active),
  essential: Boolean(row.essential),
  autoCharge: row.autoCharge === null || row.autoCharge === undefined ? true : Boolean(row.autoCharge),
});

export const toDebtPayment = (row) => ({
  ...row,
  amount: num(row.amount),
  currency: currencyCode(row.currency),
});

export const toDebt = (row, payments = []) => ({
  ...row,
  currency: currencyCode(row.currency),
  totalAmount: num(row.totalAmount),
  paidAmount: num(row.paidAmount),
  interestRate: num(row.interestRate),
  minimumMonthlyPayment: num(row.minimumMonthlyPayment),
  payments,
});

/** Proyección pública del usuario: jamás expone hash de PIN ni contadores de bloqueo. */
export const toPublicUser = (row) => ({
  id: row.id,
  username: row.username,
  displayName: row.displayName || row.username,
  role: row.role || 'Cuenta Personal',
  avatarGradient: row.avatarGradient || 'from-purple-600 via-indigo-600 to-fuchsia-600',
  currency: currencyCode(row.currency),
  exchangeRate: safeRate(row.exchangeRate),
  isAdmin: Boolean(row.isAdmin),
});

// ---------- Constructores de sentencias ----------
/**
 * mode:
 *  - 'insert'    INSERT simple (falla si el id existe)
 *  - 'ignore'    no hace nada si el id existe (idempotencia)
 *  - 'replace'   INSERT OR REPLACE (solo para datos ya validados como propios)
 *  - 'upsertOwn' actualiza si el id existe Y pertenece al mismo usuario; si es ajeno, no afecta filas
 */
export function insertStmt(table, row, mode = 'insert') {
  const cols = Object.keys(row);
  const verb = mode === 'replace' ? 'INSERT OR REPLACE' : 'INSERT';
  let tail = '';
  if (mode === 'ignore') tail = ' ON CONFLICT(id) DO NOTHING';
  if (mode === 'upsertOwn') {
    const sets = cols.filter((c) => c !== 'id' && c !== 'userId').map((c) => `${c} = excluded.${c}`);
    tail = ` ON CONFLICT(id) DO UPDATE SET ${sets.join(', ')} WHERE ${table}.userId = excluded.userId`;
  }
  return {
    sql: `${verb} INTO ${table} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})${tail}`,
    args: cols.map((c) => row[c]),
  };
}

export function updateOwnStmt(table, row) {
  const cols = Object.keys(row).filter((c) => c !== 'id' && c !== 'userId');
  return {
    sql: `UPDATE ${table} SET ${cols.map((c) => `${c} = ?`).join(', ')} WHERE id = ? AND userId = ?`,
    args: [...cols.map((c) => row[c]), row.id, row.userId],
  };
}

export const balanceDeltaStmt = (accountId, userId, delta) => ({
  sql: 'UPDATE accounts SET balance = ROUND((balance + ?) * 100) / 100 WHERE id = ? AND userId = ?',
  args: [delta, accountId, userId],
});

/**
 * Impacto con signo de un movimiento sobre el saldo de una cuenta, en la moneda nativa de la cuenta.
 * `amount` es siempre el valor en USD fijado al registrar; `originalAmount` está en `currency`.
 * Usar el USD almacenado hace que revertir un movimiento sea exacto aunque la tasa cambie después.
 */
export function signedAccountDelta(tx, accountCurrency, exchangeRate) {
  const accCur = currencyCode(accountCurrency);
  const usd = num(tx.amount);
  let magnitude = usd;
  if (accCur === 'COP') {
    magnitude =
      currencyCode(tx.currency) === 'COP' ? num(tx.originalAmount, usd * safeRate(exchangeRate)) : usd * safeRate(exchangeRate);
  }
  magnitude = roundMoney(magnitude, accCur);
  return tx.type === 'income' ? magnitude : -magnitude;
}
