// Cliente REST de Wallet Flow.
// La identidad viaja en una cookie HttpOnly firmada: el cliente nunca envía ni decide el userId.

const API_BASE = '/api';
const DEFAULT_TIMEOUT_MS = 15000;

export class ApiError extends Error {
  constructor(message, status = 0, data = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status; // 0 = sin conexión / tiempo de espera agotado
    this.data = data;
  }

  get isNetwork() {
    return this.status === 0;
  }
}

const handlers = { unauthorized: null, writeError: null };
const activity = { pendingWrites: 0, writeEpoch: 0 };

async function request(path, { method = 'GET', body, timeout = DEFAULT_TIMEOUT_MS, isAuthFlow = false } = {}) {
  const isWrite = method !== 'GET';
  if (isWrite) {
    activity.pendingWrites += 1;
    activity.writeEpoch += 1;
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method,
      credentials: 'same-origin',
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new ApiError(data?.error || `Error ${res.status}`, res.status, data);
    return data;
  } catch (err) {
    const apiError =
      err instanceof ApiError
        ? err
        : new ApiError(
            err?.name === 'AbortError' ? 'El servidor tardó demasiado en responder.' : 'Sin conexión con el servidor.'
          );
    // Un 401 fuera del flujo de login significa que la sesión expiró o fue revocada.
    if (apiError.status === 401 && !isAuthFlow) handlers.unauthorized?.();
    throw apiError;
  } finally {
    clearTimeout(timer);
    if (isWrite) activity.pendingWrites -= 1;
  }
}

/**
 * Escritura optimista: la UI ya aplicó el cambio. Si el servidor lo rechaza se notifica al manejador global
 * (que avisa al usuario y resincroniza con la verdad del servidor) y se resuelve `null` en lugar de lanzar.
 */
async function write(path, method, body, options) {
  try {
    return await request(path, { ...options, method, body });
  } catch (err) {
    if (err.status !== 401) handlers.writeError?.(err);
    return null;
  }
}

const enc = encodeURIComponent;
const withId = (entityOrId, maybeEntity) =>
  typeof entityOrId === 'string' ? { ...maybeEntity, id: entityOrId } : entityOrId;

export const api = {
  // ----- Infraestructura -----
  onUnauthorized(fn) {
    handlers.unauthorized = fn;
  },
  onWriteError(fn) {
    handlers.writeError = fn;
  },
  /** Hay escrituras en vuelo: no es seguro reemplazar el estado local con una lectura del servidor. */
  get isWriting() {
    return activity.pendingWrites > 0;
  },
  /** Cambia con cada escritura: permite descartar lecturas iniciadas antes de una mutación. */
  get writeEpoch() {
    return activity.writeEpoch;
  },

  // ----- Autenticación y sesión (lanzan ApiError) -----
  login: (username, pin) => request('/auth/login', { method: 'POST', body: { username, pin }, isAuthFlow: true }),
  register: (username, pin) => request('/auth/register', { method: 'POST', body: { username, pin }, isAuthFlow: true }),
  logout: () => request('/auth/logout', { method: 'POST', isAuthFlow: true }).catch(() => null),
  changePin: (currentPin, newPin) => request('/auth/change-pin', { method: 'POST', body: { currentPin, newPin } }),
  updateProfile: (updates) => write('/users/me', 'PUT', updates),

  // ----- Estado completo del usuario autenticado (lanza ApiError) -----
  getState: () => request('/state'),

  // ----- Cuentas -----
  createAccount: (account) => write('/accounts', 'POST', account),
  updateAccount(accountOrId, maybeAccount) {
    const account = withId(accountOrId, maybeAccount);
    return write(`/accounts/${enc(account.id)}`, 'PUT', account);
  },
  deleteAccount: (id) => write(`/accounts/${enc(id)}`, 'DELETE'),
  reorderAccounts: (accountIds = []) => write('/accounts/reorder', 'PUT', { accountIds }),

  // ----- Movimientos y transferencias -----
  createTransaction: (transaction) => write('/transactions', 'POST', transaction),
  updateTransaction(txOrId, maybeTx) {
    const tx = withId(txOrId, maybeTx);
    return write(`/transactions/${enc(tx.id)}`, 'PUT', tx);
  },
  deleteTransaction: (id) => write(`/transactions/${enc(id)}`, 'DELETE'),
  createTransfer: (transfer) => write('/transfers', 'POST', transfer),

  // ----- Suscripciones -----
  createSubscription: (subscription) => write('/subscriptions', 'POST', subscription),
  updateSubscription(subOrId, maybeSub) {
    const sub = withId(subOrId, maybeSub);
    return write(`/subscriptions/${enc(sub.id)}`, 'PUT', sub);
  },
  toggleSubscription: (id) => write(`/subscriptions/${enc(id)}/toggle`, 'PATCH'),
  deleteSubscription: (id) => write(`/subscriptions/${enc(id)}`, 'DELETE'),

  // ----- Deudas -----
  createDebt: (debt) => write('/debts', 'POST', debt),
  updateDebt(debtOrId, maybeDebt) {
    const debt = withId(debtOrId, maybeDebt);
    return write(`/debts/${enc(debt.id)}`, 'PUT', debt);
  },
  deleteDebt: (id) => write(`/debts/${enc(id)}`, 'DELETE'),
  addDebtPayment: (debtId, payment) => write(`/debts/${enc(debtId)}/payment`, 'POST', { payment }),

  // ----- Operaciones masivas (lanzan ApiError: quien llama decide cómo informar) -----
  bulkImport: (data, mode = 'replace') =>
    request('/import', { method: 'POST', body: { ...data, mode }, timeout: 45000 }),
  clearUserData: () => request('/clear', { method: 'POST', timeout: 20000 }),
  resetUserData: () => request('/reset-demo', { method: 'POST', timeout: 30000 }),

  // ----- Base de datos (respaldo y snapshot: solo administrador) -----
  backupDatabase: () => request('/database/backup', { method: 'POST', timeout: 30000 }),
  getLatestSnapshot: () => request('/database/snapshot/latest'),
  getDatabaseInfo: () => request('/database/info').catch(() => null),

  // ----- Prisma Capital OS -----
  getPrismaSettings: () => request('/prisma').catch(() => null),
  savePrismaSettings: (settings) => request('/prisma', { method: 'POST', body: settings }).catch(() => null),
};
