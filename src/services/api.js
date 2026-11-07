// SQLite REST API Client (100% Database-Backed — Zero localStorage)
import { getUserInitialData, syncUsersFromDatabase } from '../data/users.js';

const API_BASE = '/api';

async function sqliteFetch(url, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeoutId);
    const ct = res.headers.get('content-type');
    if (res.ok && ct && ct.includes('application/json')) {
      return await res.json();
    }
  } catch (_) {}
  clearTimeout(timeoutId);
  return null;
}

export const api = {
  // Full SQLite State Snapshot (Users, Active Session, Accounts, Transactions, Subscriptions, Debts)
  async getState(userId) {
    const query = userId ? `?userId=${encodeURIComponent(userId)}` : '';
    const data = await sqliteFetch(`${API_BASE}/state${query}`);
    if (data && Array.isArray(data.users)) {
      syncUsersFromDatabase(data.users);
    }
    return data;
  },

  // Users & Session in SQLite
  async getUsers() {
    const data = await sqliteFetch(`${API_BASE}/users`);
    if (data && Array.isArray(data.users)) {
      syncUsersFromDatabase(data.users);
    }
    return data;
  },

  async updateUser(userId, updates) {
    return await sqliteFetch(`${API_BASE}/users/${encodeURIComponent(userId)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
  },

  async setActiveSession(userId) {
    return await sqliteFetch(`${API_BASE}/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
  },

  async clearDeviceSession() {
    return await sqliteFetch(`${API_BASE}/session/device`, {
      method: 'DELETE',
    });
  },

  // Accounts
  async getAccounts(userId = 'munboi') {
    const data = await sqliteFetch(`${API_BASE}/accounts?userId=${encodeURIComponent(userId)}`);
    if (Array.isArray(data)) return data;
    return getUserInitialData(userId).accounts;
  },

  async createAccount(account, userId = 'munboi') {
    const data = await sqliteFetch(`${API_BASE}/accounts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...account, userId }),
    });
    return data || account;
  },

  async updateAccount(accountOrId, maybeAccount, userId = 'munboi') {
    const account = typeof accountOrId === 'string' ? { ...maybeAccount, id: accountOrId } : accountOrId;
    const uid = account?.userId || userId || 'munboi';
    const data = await sqliteFetch(`${API_BASE}/accounts/${encodeURIComponent(account.id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...account, userId: uid }),
    });
    return data || account;
  },

  async deleteAccount(accountId, userId = 'munboi') {
    return await sqliteFetch(
      `${API_BASE}/accounts/${encodeURIComponent(accountId)}?userId=${encodeURIComponent(userId)}`,
      { method: 'DELETE' }
    );
  },

  // Transactions
  async getTransactions(userId = 'munboi') {
    const data = await sqliteFetch(`${API_BASE}/transactions?userId=${encodeURIComponent(userId)}`);
    if (Array.isArray(data)) return data;
    return getUserInitialData(userId).transactions;
  },

  async createTransaction(transaction, userId = 'munboi') {
    const data = await sqliteFetch(`${API_BASE}/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...transaction, userId }),
    });
    return data || transaction;
  },

  async updateTransaction(transactionOrId, maybeTx, userId = 'munboi') {
    const tx = typeof transactionOrId === 'string' ? { ...maybeTx, id: transactionOrId } : transactionOrId;
    const uid = tx?.userId || userId || 'munboi';
    const data = await sqliteFetch(`${API_BASE}/transactions/${encodeURIComponent(tx.id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...tx, userId: uid }),
    });
    return data || tx;
  },

  async deleteTransaction(transactionId, userId = 'munboi') {
    return await sqliteFetch(
      `${API_BASE}/transactions/${encodeURIComponent(transactionId)}?userId=${encodeURIComponent(userId)}`,
      { method: 'DELETE' }
    );
  },

  // Subscriptions
  async getSubscriptions(userId = 'munboi') {
    const data = await sqliteFetch(`${API_BASE}/subscriptions?userId=${encodeURIComponent(userId)}`);
    if (Array.isArray(data)) return data;
    return getUserInitialData(userId).subscriptions;
  },

  async createSubscription(subscription, userId = 'munboi') {
    const data = await sqliteFetch(`${API_BASE}/subscriptions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...subscription, userId }),
    });
    return data || subscription;
  },

  async updateSubscription(subOrId, maybeSub, userId = 'munboi') {
    const subscription = typeof subOrId === 'string' ? { ...maybeSub, id: subOrId } : subOrId;
    const uid = subscription?.userId || userId || 'munboi';
    const data = await sqliteFetch(`${API_BASE}/subscriptions/${encodeURIComponent(subscription.id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...subscription, userId: uid }),
    });
    return data || subscription;
  },

  async toggleSubscription(id) {
    const data = await sqliteFetch(`${API_BASE}/subscriptions/${encodeURIComponent(id)}/toggle`, {
      method: 'PATCH',
    });
    return data || null;
  },

  async deleteSubscription(id, userId = 'munboi') {
    return await sqliteFetch(
      `${API_BASE}/subscriptions/${encodeURIComponent(id)}?userId=${encodeURIComponent(userId)}`,
      { method: 'DELETE' }
    );
  },

  // Debts
  async getDebts(userId = 'munboi') {
    const data = await sqliteFetch(`${API_BASE}/debts?userId=${encodeURIComponent(userId)}`);
    if (Array.isArray(data)) return data;
    return getUserInitialData(userId).debts;
  },

  async createDebt(debt, userId = 'munboi') {
    const data = await sqliteFetch(`${API_BASE}/debts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...debt, userId }),
    });
    return data || debt;
  },

  async updateDebt(debtOrId, maybeDebt, userId = 'munboi') {
    const debt = typeof debtOrId === 'string' ? { ...maybeDebt, id: debtOrId } : debtOrId;
    const uid = debt?.userId || userId || 'munboi';
    const data = await sqliteFetch(`${API_BASE}/debts/${encodeURIComponent(debt.id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...debt, userId: uid }),
    });
    return data || debt;
  },

  async deleteDebt(id, userId = 'munboi') {
    return await sqliteFetch(
      `${API_BASE}/debts/${encodeURIComponent(id)}?userId=${encodeURIComponent(userId)}`,
      { method: 'DELETE' }
    );
  },

  async addDebtPayment(debtId, payment, userId = 'munboi') {
    const data = await sqliteFetch(`${API_BASE}/debts/${encodeURIComponent(debtId)}/payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payment, userId }),
    });
    return data || payment;
  },

  // Bulk Import / Sync
  async bulkImport(data, mode = 'replace', userId = 'munboi') {
    return await sqliteFetch(`${API_BASE}/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, mode, userId }),
    });
  },

  // Clear or Reset User Data in SQLite
  async clearUserData(userId = 'munboi') {
    return await sqliteFetch(`${API_BASE}/clear`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
  },

  async resetUserData(userId = 'munboi') {
    return await sqliteFetch(`${API_BASE}/reset-demo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
  },
};
