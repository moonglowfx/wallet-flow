// Multi-user Profiles & Isolated Personal Finance Data
import {
  INITIAL_ACCOUNTS as MUNBOI_ACCOUNTS,
  INITIAL_TRANSACTIONS as MUNBOI_TRANSACTIONS,
  INITIAL_SUBSCRIPTIONS as MUNBOI_SUBSCRIPTIONS,
  INITIAL_DEBTS as MUNBOI_DEBTS,
} from './mockData.js';

export const USERS = [
  {
    id: 'munboi',
    username: 'Munboi',
    displayName: 'Munboi Master',
    defaultPin: '0800',
    role: 'Portafolio Principal',
    avatarGradient: 'from-purple-600 via-indigo-600 to-fuchsia-600',
    description: 'Historial completo 2024-2026 (726 transacciones reales)',
  },
  {
    id: 'tiago',
    username: 'Tiago',
    displayName: 'Tiago',
    defaultPin: '5678',
    role: 'Cuenta Personal',
    avatarGradient: 'from-fuchsia-600 via-pink-600 to-rose-600',
    description: 'Cuenta limpia sin datos iniciales',
  },
];

// In-memory PIN store fallback (also syncs with localStorage when in browser)
const memoryPins = {};

// Helper to get active PIN for a user (respects customized PIN in localStorage)
export function getUserPin(userId) {
  if (typeof window !== 'undefined' && window.localStorage) {
    const customPin = localStorage.getItem(`wf_user_pin_${userId}`);
    // Auto-migrate Munboi from old 1234 to new 0800
    if (userId === 'munboi' && (!customPin || customPin === '1234')) {
      localStorage.setItem('wf_user_pin_munboi', '0800');
      return '0800';
    }
    if (customPin && customPin.length === 4) {
      return customPin;
    }
  }
  if (memoryPins[userId]) {
    return memoryPins[userId];
  }
  const user = USERS.find((u) => u.id === userId);
  return user?.defaultPin || (userId === 'munboi' ? '0800' : '5678');
}

// Helper to save customized PIN for a user
export function setUserPin(userId, newPin) {
  memoryPins[userId] = newPin;
  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.setItem(`wf_user_pin_${userId}`, newPin);
  }
}

// Tiago starts completely clean with 0 data so he can create everything from scratch
export const TIAGO_ACCOUNTS = [];
export const TIAGO_SUBSCRIPTIONS = [];
export const TIAGO_DEBTS = [];
export const TIAGO_TRANSACTIONS = [];

// Helper to get initial data per user
export function getUserInitialData(userId) {
  if (userId === 'tiago') {
    return {
      accounts: [],
      transactions: [],
      subscriptions: [],
      debts: [],
    };
  }
  return {
    accounts: MUNBOI_ACCOUNTS,
    transactions: MUNBOI_TRANSACTIONS,
    subscriptions: MUNBOI_SUBSCRIPTIONS,
    debts: MUNBOI_DEBTS,
  };
}
