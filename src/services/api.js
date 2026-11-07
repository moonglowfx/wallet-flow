// API Client with SQLite Server Integration & Resilient LocalStorage Fallback
import { getUserInitialData } from '../data/users.js';

const API_BASE = '/api';

export const api = {
  // Accounts
  async getAccounts(userId = 'munboi') {
    try {
      const res = await fetch(`${API_BASE}/accounts?userId=${userId}`);
      const ct = res.headers.get('content-type');
      if (res.ok && ct && ct.includes('application/json')) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) return data;
      }
    } catch (_) {}

    if (userId === 'tiago') {
      const saved = localStorage.getItem('wf_user_tiago_accounts');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && !parsed.some((a) => a.id?.startsWith('acc-tiago-'))) {
            return parsed;
          }
        } catch (_) {}
      }
      return [];
    }

    const saved = localStorage.getItem(`wf_user_${userId}_accounts`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.some((a) => a.id === 'acc-bofa-checking')) {
          return parsed;
        }
      } catch (_) {}
    }
    const fresh = getUserInitialData(userId).accounts;
    localStorage.setItem(`wf_user_${userId}_accounts`, JSON.stringify(fresh));
    return fresh;
  },

  async createAccount(account, userId = 'munboi') {
    try {
      const res = await fetch(`${API_BASE}/accounts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...account, userId }),
      });
      const ct = res.headers.get('content-type');
      if (res.ok && ct && ct.includes('application/json')) return await res.json();
    } catch (_) {}
    return account;
  },

  // Transactions
  async getTransactions(userId = 'munboi') {
    try {
      const res = await fetch(`${API_BASE}/transactions?userId=${userId}`);
      const ct = res.headers.get('content-type');
      if (res.ok && ct && ct.includes('application/json')) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) return data;
      }
    } catch (_) {}

    if (userId === 'tiago') {
      const saved = localStorage.getItem('wf_user_tiago_transactions');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && !parsed.some((t) => t.id?.startsWith('tx-tg-') || t.id === 'tx-01')) {
            return parsed;
          }
        } catch (_) {}
      }
      return [];
    }

    const saved = localStorage.getItem(`wf_user_${userId}_transactions`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= 700 && !parsed.some((t) => t.id === 'tx-01' || t.id === 'tx-02')) {
          return parsed;
        }
      } catch (_) {}
    }
    const fresh = getUserInitialData(userId).transactions;
    localStorage.setItem(`wf_user_${userId}_transactions`, JSON.stringify(fresh));
    return fresh;
  },

  async createTransaction(transaction, userId = 'munboi') {
    try {
      const res = await fetch(`${API_BASE}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...transaction, userId }),
      });
      const ct = res.headers.get('content-type');
      if (res.ok && ct && ct.includes('application/json')) return await res.json();
    } catch (_) {}
    return transaction;
  },

  // Subscriptions
  async getSubscriptions(userId = 'munboi') {
    try {
      const res = await fetch(`${API_BASE}/subscriptions?userId=${userId}`);
      const ct = res.headers.get('content-type');
      if (res.ok && ct && ct.includes('application/json')) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) return data;
      }
    } catch (_) {}

    if (userId === 'tiago') {
      const saved = localStorage.getItem('wf_user_tiago_subscriptions');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && !parsed.some((s) => s.id?.startsWith('sub-tg-'))) {
            return parsed;
          }
        } catch (_) {}
      }
      return [];
    }

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
      const ct = res.headers.get('content-type');
      if (res.ok && ct && ct.includes('application/json')) return await res.json();
    } catch (_) {}
    return subscription;
  },

  async toggleSubscription(id, userId = 'munboi') {
    try {
      const res = await fetch(`${API_BASE}/subscriptions/${id}/toggle`, {
        method: 'PATCH',
      });
      const ct = res.headers.get('content-type');
      if (res.ok && ct && ct.includes('application/json')) return await res.json();
    } catch (_) {}
    return null;
  },

  // Debts
  async getDebts(userId = 'munboi') {
    try {
      const res = await fetch(`${API_BASE}/debts?userId=${userId}`);
      const ct = res.headers.get('content-type');
      if (res.ok && ct && ct.includes('application/json')) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) return data;
      }
    } catch (_) {}

    if (userId === 'tiago') {
      const saved = localStorage.getItem('wf_user_tiago_debts');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && !parsed.some((d) => d.id?.startsWith('debt-tg-'))) {
            return parsed;
          }
        } catch (_) {}
      }
      return [];
    }

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
      const ct = res.headers.get('content-type');
      if (res.ok && ct && ct.includes('application/json')) return await res.json();
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
      const ct = res.headers.get('content-type');
      if (res.ok && ct && ct.includes('application/json')) return await res.json();
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
      const ct = res.headers.get('content-type');
      if (res.ok && ct && ct.includes('application/json')) return await res.json();
    } catch (_) {}
    return null;
  },
};
