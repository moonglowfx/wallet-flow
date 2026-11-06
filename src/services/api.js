// API Client with SQLite Server Integration & Resilient LocalStorage Fallback
import {
  INITIAL_ACCOUNTS,
  INITIAL_TRANSACTIONS,
  INITIAL_SUBSCRIPTIONS,
  INITIAL_DEBTS,
} from '../data/mockData.js';

const API_BASE = '/api';

export const api = {
  // Accounts
  async getAccounts() {
    try {
      const res = await fetch(`${API_BASE}/accounts`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) return data;
      }
    } catch (_) {}
    const saved = localStorage.getItem('wf_accounts');
    return saved ? JSON.parse(saved) : INITIAL_ACCOUNTS;
  },

  async createAccount(account) {
    try {
      const res = await fetch(`${API_BASE}/accounts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(account),
      });
      if (res.ok) return await res.json();
    } catch (_) {}
    return account;
  },

  // Transactions
  async getTransactions() {
    try {
      const res = await fetch(`${API_BASE}/transactions`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) return data;
      }
    } catch (_) {}
    const saved = localStorage.getItem('wf_transactions');
    return saved ? JSON.parse(saved) : INITIAL_TRANSACTIONS;
  },

  async createTransaction(transaction) {
    try {
      const res = await fetch(`${API_BASE}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transaction),
      });
      if (res.ok) return await res.json();
    } catch (_) {}
    return transaction;
  },

  // Subscriptions
  async getSubscriptions() {
    try {
      const res = await fetch(`${API_BASE}/subscriptions`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) return data;
      }
    } catch (_) {}
    const saved = localStorage.getItem('wf_subscriptions');
    return saved ? JSON.parse(saved) : INITIAL_SUBSCRIPTIONS;
  },

  async createSubscription(subscription) {
    try {
      const res = await fetch(`${API_BASE}/subscriptions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription),
      });
      if (res.ok) return await res.json();
    } catch (_) {}
    return subscription;
  },

  async toggleSubscription(id) {
    try {
      const res = await fetch(`${API_BASE}/subscriptions/${id}/toggle`, {
        method: 'PATCH',
      });
      if (res.ok) return await res.json();
    } catch (_) {}
    return null;
  },

  // Debts
  async getDebts() {
    try {
      const res = await fetch(`${API_BASE}/debts`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) return data;
      }
    } catch (_) {}
    const saved = localStorage.getItem('wf_debts');
    return saved ? JSON.parse(saved) : INITIAL_DEBTS;
  },

  async createDebt(debt) {
    try {
      const res = await fetch(`${API_BASE}/debts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(debt),
      });
      if (res.ok) return await res.json();
    } catch (_) {}
    return debt;
  },

  async addDebtPayment(debtId, payment) {
    try {
      const res = await fetch(`${API_BASE}/debts/${debtId}/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment }),
      });
      if (res.ok) return await res.json();
    } catch (_) {}
    return payment;
  },

  // Bulk Import / Sync
  async bulkImport(data, mode = 'replace') {
    try {
      const res = await fetch(`${API_BASE}/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, mode }),
      });
      if (res.ok) return await res.json();
    } catch (_) {}
    return null;
  },

  // Reset Demo
  async resetDemo() {
    try {
      await fetch(`${API_BASE}/reset-demo`, { method: 'POST' });
    } catch (_) {}
  },
};
