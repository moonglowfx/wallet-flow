// Ultra-fast API Client with SQLite Server Integration & Resilient Instant LocalStorage Fallback
import { getUserInitialData } from '../data/users.js';

const API_BASE = '/api';

// Detect whether a backend server is running (only on localhost or explicit VITE_API_URL)
const isBackendConfigured = () => {
  if (typeof window === 'undefined') return false;
  if (import.meta.env?.VITE_API_URL) return true;
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1';
};

// Fast fetch helper with 350ms timeout to prevent network lag on static deployments like Vercel
async function safeApiFetch(url, options = {}) {
  if (!isBackendConfigured()) return null;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 350);
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
  // Accounts
  async getAccounts(userId = 'munboi') {
    const data = await safeApiFetch(`${API_BASE}/accounts?userId=${userId}`);
    if (Array.isArray(data) && data.length > 0) return data;

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
    const data = await safeApiFetch(`${API_BASE}/accounts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...account, userId }),
    });
    return data || account;
  },

  // Transactions
  async getTransactions(userId = 'munboi') {
    const data = await safeApiFetch(`${API_BASE}/transactions?userId=${userId}`);
    if (Array.isArray(data) && data.length > 0) return data;

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
    const data = await safeApiFetch(`${API_BASE}/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...transaction, userId }),
    });
    return data || transaction;
  },

  // Subscriptions
  async getSubscriptions(userId = 'munboi') {
    const data = await safeApiFetch(`${API_BASE}/subscriptions?userId=${userId}`);
    if (Array.isArray(data) && data.length > 0) return data;

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
    const data = await safeApiFetch(`${API_BASE}/subscriptions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...subscription, userId }),
    });
    return data || subscription;
  },

  async toggleSubscription(id, userId = 'munboi') {
    const data = await safeApiFetch(`${API_BASE}/subscriptions/${id}/toggle`, {
      method: 'PATCH',
    });
    return data || null;
  },

  // Debts
  async getDebts(userId = 'munboi') {
    const data = await safeApiFetch(`${API_BASE}/debts?userId=${userId}`);
    if (Array.isArray(data) && data.length > 0) return data;

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
    const data = await safeApiFetch(`${API_BASE}/debts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...debt, userId }),
    });
    return data || debt;
  },

  async addDebtPayment(debtId, payment, userId = 'munboi') {
    const data = await safeApiFetch(`${API_BASE}/debts/${debtId}/payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payment, userId }),
    });
    return data || payment;
  },

  // Bulk Import / Sync
  async bulkImport(data, mode = 'replace', userId = 'munboi') {
    const res = await safeApiFetch(`${API_BASE}/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, mode, userId }),
    });
    return res || null;
  },
};
