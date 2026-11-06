// API Client with SQLite Server Integration & Resilient LocalStorage Fallback
import { getUserInitialData } from '../data/users.js';

const API_BASE = '/api';

export const api = {
  // Accounts
  async getAccounts(userId = 'munboi') {
    try {
      const res = await fetch(`${API_BASE}/accounts?userId=${userId}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) return data;
      }
    } catch (_) {}
    const saved = localStorage.getItem(`wf_user_${userId}_accounts`);
    return saved ? JSON.parse(saved) : getUserInitialData(userId).accounts;
  },

  async createAccount(account, userId = 'munboi') {
    try {
      const res = await fetch(`${API_BASE}/accounts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...account, userId }),
      });
      if (res.ok) return await res.json();
    } catch (_) {}
    return account;
  },

  // Transactions
  async getTransactions(userId = 'munboi') {
    try {
      const res = await fetch(`${API_BASE}/transactions?userId=${userId}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) return data;
      }
    } catch (_) {}
    const saved = localStorage.getItem(`wf_user_${userId}_transactions`);
    return saved ? JSON.parse(saved) : getUserInitialData(userId).transactions;
  },

  async createTransaction(transaction, userId = 'munboi') {
    try {
      const res = await fetch(`${API_BASE}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...transaction, userId }),
      });
      if (res.ok) return await res.json();
    } catch (_) {}
    return transaction;
  },

  // Subscriptions
  async getSubscriptions(userId = 'munboi') {
    try {
      const res = await fetch(`${API_BASE}/subscriptions?userId=${userId}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) return data;
      }
    } catch (_) {}
    const saved = localStorage.getItem(`wf_user_${userId}_subscriptions`);
    return saved ? JSON.parse(saved) : getUserInitialData(userId).subscriptions;
  },

  async createSubscription(subscription, userId = 'munboi') {
    try {
      const res = await fetch(`${API_BASE}/subscriptions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...subscription, userId }),
      });
      if (res.ok) return await res.json();
    } catch (_) {}
    return subscription;
  },

  async toggleSubscription(id, userId = 'munboi') {
    try {
      const res = await fetch(`${API_BASE}/subscriptions/${id}/toggle`, {
        method: 'PATCH',
      });
      if (res.ok) return await res.json();
    } catch (_) {}
    return null;
  },

  // Debts
  async getDebts(userId = 'munboi') {
    try {
      const res = await fetch(`${API_BASE}/debts?userId=${userId}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) return data;
      }
    } catch (_) {}
    const saved = localStorage.getItem(`wf_user_${userId}_debts`);
    return saved ? JSON.parse(saved) : getUserInitialData(userId).debts;
  },

  async createDebt(debt, userId = 'munboi') {
    try {
      const res = await fetch(`${API_BASE}/debts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...debt, userId }),
      });
      if (res.ok) return await res.json();
    } catch (_) {}
    return debt;
  },

  async addDebtPayment(debtId, payment, userId = 'munboi') {
    try {
      const res = await fetch(`${API_BASE}/debts/${debtId}/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment, userId }),
      });
      if (res.ok) return await res.json();
    } catch (_) {}
    return payment;
  },

  // Bulk Import / Sync
  async bulkImport(data, mode = 'replace', userId = 'munboi') {
    try {
      const res = await fetch(`${API_BASE}/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, mode, userId }),
      });
      if (res.ok) return await res.json();
    } catch (_) {}
    return null;
  },
};
