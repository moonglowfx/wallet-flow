// Multi-user Profiles & Isolated Personal Finance Data (Backed by SQLite)
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
    description: 'Historial completo 2024-2026 (728 transacciones reales)',
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

// Active runtime PIN cache synced from SQLite database
const userPinsCache = {
  munboi: '0800',
  tiago: '5678',
};

// Helper to get active PIN for a user
export function getUserPin(userId) {
  if (userPinsCache[userId] && userPinsCache[userId].length === 4) {
    return userPinsCache[userId];
  }
  const user = USERS.find((u) => u.id === userId);
  return user?.defaultPin || (userId === 'munboi' ? '0800' : '5678');
}

// Helper to update active PIN in memory and sync to SQLite
export function setUserPin(userId, newPin) {
  if (newPin && newPin.length === 4) {
    userPinsCache[userId] = newPin;
    const userObj = USERS.find((u) => u.id === userId);
    if (userObj) {
      userObj.defaultPin = newPin;
    }
  }
}

// Helper to update profile fields in memory
export function setUserProfile(userId, { displayName, role }) {
  const userObj = USERS.find((u) => u.id === userId);
  if (userObj) {
    if (displayName) userObj.displayName = displayName;
    if (role) userObj.role = role;
  }
}

// Sync user profiles & PINs loaded from SQLite
export function syncUsersFromDatabase(dbUsers = []) {
  if (!Array.isArray(dbUsers)) return;
  dbUsers.forEach((dbUser) => {
    if (dbUser.id && dbUser.pin && dbUser.pin.length === 4) {
      userPinsCache[dbUser.id] = dbUser.pin;
    }
    const target = USERS.find((u) => u.id === dbUser.id);
    if (target) {
      if (dbUser.displayName) target.displayName = dbUser.displayName;
      if (dbUser.role) target.role = dbUser.role;
      if (dbUser.pin) target.defaultPin = dbUser.pin;
    }
  });
}

// Tiago starts completely clean with 0 data so he can create everything from scratch
export const TIAGO_ACCOUNTS = [];
export const TIAGO_SUBSCRIPTIONS = [];
export const TIAGO_DEBTS = [];
export const TIAGO_TRANSACTIONS = [];

// Helper to get initial seed data per user
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
