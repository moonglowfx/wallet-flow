import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar.jsx';
import { Header } from './components/Header.jsx';
import { DashboardView } from './components/DashboardView.jsx';
import { AccountsView } from './components/AccountsView.jsx';
import { CommitmentsView } from './components/CommitmentsView.jsx';
import { MonthlyExpensesView } from './components/MonthlyExpensesView.jsx';
import { TransactionModal } from './components/TransactionModal.jsx';
import { AccountModal } from './components/AccountModal.jsx';
import { LoginModal } from './components/LoginModal.jsx';
import { USERS, getUserInitialData } from './data/users.js';
import { DEFAULT_USD_COP_RATE, isSubscriptionChargedInMonth } from './data/mockData.js';
import { api } from './services/api.js';

// Lazy-load heavier auxiliary views to make initial app load instantaneous
const AIAdvisorView = React.lazy(() =>
  import('./components/AIAdvisorView.jsx').then((m) => ({ default: m.AIAdvisorView }))
);
const SettingsView = React.lazy(() =>
  import('./components/SettingsView.jsx').then((m) => ({ default: m.SettingsView }))
);

export const APP_BUILD_VERSION = 'v2026.11.07-liquid-glass';

export function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [timeframe, setTimeframe] = useState('monthly');
  const [selectedYear, setSelectedYear] = useState('2026');

  // Multi-user authentication state backed by SQLite: Munboi (PIN: 0800) | Tiago (PIN: 5678)
  const [currentUser, setCurrentUser] = useState(() => USERS[0]);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.sessionStorage?.getItem('wf_session_unlocked') !== 'true';
  });

  // Currency State persisted in SQLite per user: USD as primary, COP as secondary
  const [currency, setCurrency] = useState('USD');
  const [exchangeRate, setExchangeRate] = useState(DEFAULT_USD_COP_RATE);

  // Isolated Application Data State per User (seeded immediately and synced with SQLite)
  const [accounts, setAccounts] = useState(() => getUserInitialData(USERS[0].id).accounts);
  const [transactions, setTransactions] = useState(() => getUserInitialData(USERS[0].id).transactions);
  const [subscriptions, setSubscriptions] = useState(() => getUserInitialData(USERS[0].id).subscriptions);
  const [debts, setDebts] = useState(() => getUserInitialData(USERS[0].id).debts);

  // Dynamically compute available fiscal years from transactions (newest to oldest)
  const availableYears = React.useMemo(() => {
    const yrSet = new Set();
    transactions.forEach((t) => {
      if (t.date && t.date.length >= 4) {
        yrSet.add(t.date.slice(0, 4));
      }
    });
    const sorted = Array.from(yrSet).sort((a, b) => b.localeCompare(a));
    if (sorted.length === 0) return ['2026', 'all'];
    return [...sorted, 'all'];
  }, [transactions]);

  const [selectedAccountId, setSelectedAccountId] = useState(null);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [modalInitialType, setModalInitialType] = useState(null);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const activeUserRef = React.useRef(currentUser.id);
  const isSwitchingUserRef = React.useRef(false);

  const showToast = useCallback((msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  }, []);

  // Load user data directly from SQLite database
  const loadUserFromSQLite = useCallback(async (targetUserId) => {
    const state = await api.getState(targetUserId);
    if (state) {
      if (!targetUserId) {
        const isSessionUnlocked =
          typeof window !== 'undefined' &&
          window.sessionStorage?.getItem('wf_session_unlocked') === 'true';
        setIsLoginModalOpen(!isSessionUnlocked);
      }
      if (state.user) {
        setCurrentUser((prev) => ({
          ...prev,
          ...state.user,
        }));
        if (state.user.currency) setCurrency(state.user.currency);
        if (state.user.exchangeRate) setExchangeRate(Number(state.user.exchangeRate));
      }
      if (Array.isArray(state.accounts)) setAccounts(state.accounts);
      if (Array.isArray(state.transactions)) setTransactions(state.transactions);
      if (Array.isArray(state.subscriptions)) setSubscriptions(state.subscriptions);
      if (Array.isArray(state.debts)) setDebts(state.debts);
      return;
    }

    // Resilient fallback: restore saved manual changes from offline backup before mock
    const uid = targetUserId || 'munboi';
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(`wf_saved_state_${uid}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed.accounts)) setAccounts(parsed.accounts);
          if (Array.isArray(parsed.transactions)) setTransactions(parsed.transactions);
          if (Array.isArray(parsed.subscriptions)) setSubscriptions(parsed.subscriptions);
          if (Array.isArray(parsed.debts)) setDebts(parsed.debts);
          return;
        }
      } catch (_) {}
    }

    const initial = getUserInitialData(uid);
    setAccounts(initial.accounts);
    setTransactions(initial.transactions);
    setSubscriptions(initial.subscriptions);
    setDebts(initial.debts);
  }, []);

  // Initial load from SQLite on mount
  useEffect(() => {
    loadUserFromSQLite();
  }, [loadUserFromSQLite]);

  // Persist currency change in SQLite
  const handleSetCurrency = useCallback(
    (nextCurrency) => {
      setCurrency(nextCurrency);
      api.updateUser(currentUser.id, { currency: nextCurrency });
    },
    [currentUser.id]
  );

  // Persist exchange rate change in SQLite
  const handleSetExchangeRate = useCallback(
    (nextRate) => {
      setExchangeRate(nextRate);
      api.updateUser(currentUser.id, { exchangeRate: nextRate });
    },
    [currentUser.id]
  );

  // When active user switches, persist session in SQLite and load their isolated data
  const handleLoginSuccess = async (user) => {
    isSwitchingUserRef.current = true;
    setCurrentUser(user);
    if (typeof window !== 'undefined') {
      window.sessionStorage?.setItem('wf_session_unlocked', 'true');
    }
    setIsLoginModalOpen(false);
    setSelectedAccountId(null);

    // Load immediate baseline while SQLite responds
    const initial = getUserInitialData(user.id);
    setAccounts(initial.accounts);
    setTransactions(initial.transactions);
    setSubscriptions(initial.subscriptions);
    setDebts(initial.debts);

    await api.setActiveSession(user.id);
    await loadUserFromSQLite(user.id);
    activeUserRef.current = user.id;
    isSwitchingUserRef.current = false;
    showToast(`Sesión activa en SQLite: ${user.username} (${user.role})`);
  };

  // Reset clean data only for current user in SQLite
  const handleResetDemoData = async () => {
    const initial = getUserInitialData(currentUser.id);
    setAccounts(initial.accounts);
    setTransactions(initial.transactions);
    setSubscriptions(initial.subscriptions);
    setDebts(initial.debts);
    setSelectedAccountId(null);

    await api.resetUserData(currentUser.id);
    await loadUserFromSQLite(currentUser.id);
    showToast(`Datos SQLite de ${currentUser.username} restablecidos`);
  };

  const calcDelta = (acc, tx) => {
    if (!acc || !tx) return 0;
    const isInc = tx.type === 'income';
    const txCur = tx.currency || 'USD';
    const accCur = acc.currency || 'USD';
    const orig = Number.isFinite(Number(tx.originalAmount)) ? Number(tx.originalAmount) : Number(tx.amount) || 0;
    const usd = Number(tx.amount) || 0;
    let mag = 0;
    if (accCur === 'COP') {
      mag = txCur === 'COP' ? orig : usd * (exchangeRate || DEFAULT_USD_COP_RATE);
    } else {
      mag = usd;
    }
    return isInc ? mag : -mag;
  };

  // Handle adding or editing a transaction and updating linked account balances in SQLite
  const handleSaveTransaction = async (txData) => {
    if (txData.id) {
      const prevTx = transactions.find((t) => t.id === txData.id);
      const updatedTx = {
        ...prevTx,
        ...txData,
        userId: currentUser.id,
      };

      setTransactions((prev) => prev.map((t) => (t.id === updatedTx.id ? updatedTx : t)));

      if (prevTx) {
        setAccounts((prevAccs) =>
          prevAccs.map((acc) => {
            const oldDelta = calcDelta(acc, prevTx);
            const newDelta = calcDelta(acc, updatedTx);
            if (prevTx.accountId === updatedTx.accountId && acc.id === updatedTx.accountId) {
              const diff = newDelta - oldDelta;
              const nextBal = acc.balance + diff;
              return { ...acc, balance: acc.currency === 'COP' ? Math.round(nextBal) : Math.round(nextBal * 100) / 100 };
            }
            if (acc.id === prevTx.accountId) {
              const nextBal = acc.balance - oldDelta;
              return { ...acc, balance: acc.currency === 'COP' ? Math.round(nextBal) : Math.round(nextBal * 100) / 100 };
            }
            if (acc.id === updatedTx.accountId) {
              const nextBal = acc.balance + newDelta;
              return { ...acc, balance: acc.currency === 'COP' ? Math.round(nextBal) : Math.round(nextBal * 100) / 100 };
            }
            return acc;
          })
        );
      }

      setEditingTransaction(null);
      await api.updateTransaction(updatedTx.id, updatedTx, currentUser.id);
      showToast(`Movimiento actualizado: ${updatedTx.title}`);
      return;
    }

    const newTx = {
      id: `tx-${Date.now()}`,
      userId: currentUser.id,
      ...txData,
    };

    setTransactions((prev) => [newTx, ...prev]);

    setAccounts((prevAccounts) =>
      prevAccounts.map((acc) => {
        if (acc.id === newTx.accountId) {
          const delta = calcDelta(acc, newTx);
          const nextBal = acc.balance + delta;
          return {
            ...acc,
            balance: acc.currency === 'COP' ? Math.round(nextBal) : Math.round(nextBal * 100) / 100,
          };
        }
        return acc;
      })
    );

    await api.createTransaction(newTx, currentUser.id);
    showToast(`Movimiento guardado en SQLite: ${newTx.title}`);
  };

  const handleDeleteTransaction = async (txId) => {
    const prevTx = transactions.find((t) => t.id === txId);
    setTransactions((prev) => prev.filter((t) => t.id !== txId));

    if (prevTx) {
      setAccounts((prevAccs) =>
        prevAccs.map((acc) => {
          if (acc.id === prevTx.accountId) {
            const delta = calcDelta(acc, prevTx);
            const nextBal = acc.balance - delta;
            return { ...acc, balance: acc.currency === 'COP' ? Math.round(nextBal) : Math.round(nextBal * 100) / 100 };
          }
          return acc;
        })
      );
    }

    setEditingTransaction(null);
    await api.deleteTransaction(txId, currentUser.id);
    showToast('Movimiento eliminado de SQLite');
  };

  const handleSaveTransfer = async ({ fromAccountId, toAccountId, amount, currency: trfCur, date, notes }) => {
    const fromAcc = accounts.find((a) => a.id === fromAccountId);
    const toAcc = accounts.find((a) => a.id === toAccountId);
    if (!fromAcc || !toAcc) return;

    const rate = exchangeRate || DEFAULT_USD_COP_RATE;
    const numAmt = Number(amount) || 0;
    const usdAmount = trfCur === 'COP' ? Math.round((numAmt / rate) * 100) / 100 : Math.round(numAmt * 100) / 100;
    const txDate = date || new Date().toISOString().split('T')[0];

    const nowTs = Date.now();
    const outTx = {
      id: `tx-trf-out-${nowTs}`,
      title: `Transferencia a ${toAcc.name}`,
      amount: usdAmount,
      originalAmount: numAmt,
      currency: trfCur,
      type: 'expense',
      category: 'Transferencias & Cambio',
      accountId: fromAccountId,
      date: txDate,
      notes: notes || `Transferencia enviada hacia ${toAcc.name}`,
      userId: currentUser.id,
      isAntExpense: false,
    };

    const inTx = {
      id: `tx-trf-in-${nowTs + 1}`,
      title: `Transferencia desde ${fromAcc.name}`,
      amount: usdAmount,
      originalAmount: numAmt,
      currency: trfCur,
      type: 'income',
      category: 'Transferencias & Cambio',
      accountId: toAccountId,
      date: txDate,
      notes: notes || `Transferencia recibida desde ${fromAcc.name}`,
      userId: currentUser.id,
      isAntExpense: false,
    };

    setTransactions((prev) => [outTx, inTx, ...prev]);

    setAccounts((prevAccs) =>
      prevAccs.map((acc) => {
        if (acc.id === fromAccountId) {
          const delta = calcDelta(acc, outTx);
          const nextBal = acc.balance + delta;
          return { ...acc, balance: acc.currency === 'COP' ? Math.round(nextBal) : Math.round(nextBal * 100) / 100 };
        }
        if (acc.id === toAccountId) {
          const delta = calcDelta(acc, inTx);
          const nextBal = acc.balance + delta;
          return { ...acc, balance: acc.currency === 'COP' ? Math.round(nextBal) : Math.round(nextBal * 100) / 100 };
        }
        return acc;
      })
    );

    await api.createTransfer({
      fromAccountId,
      toAccountId,
      amount: numAmt,
      currency: trfCur,
      date: txDate,
      notes,
      userId: currentUser.id,
    });

    showToast(`Transferencia realizada: ${fromAcc.name} ➔ ${toAcc.name}`);
  };

  // Automatic execution of active subscriptions / fixed expenses on billing dates
  const handleExecuteDueSubscriptions = useCallback(
    async (subsToProcess, accsToProcess, txsToProcess, forceManual = false) => {
      if (!forceManual && typeof window !== 'undefined') {
        const stored = localStorage.getItem(`wf_autocharge_enabled_${currentUser.id}`);
        if (stored === 'false') return { executed: 0, reason: 'global_paused' };
      }

      const activeSubs = (subsToProcess || subscriptions || []).filter((s) => s.active);
      if (activeSubs.length === 0) return { executed: 0 };

      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;
      const currentDay = now.getDate();
      const monthPrefix = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
      const currentTxs = txsToProcess || transactions || [];

      const dueSubs = activeSubs.filter((sub) => {
        if (sub.autoCharge === false) return false;
        const billingDay = Number(sub.billingDay) || 1;
        if (currentDay < billingDay) return false;
        return !isSubscriptionChargedInMonth(sub, currentTxs, monthPrefix);
      });

      if (dueSubs.length === 0) return { executed: 0 };

      const newTxs = [];
      let updatedAccs = [...(accsToProcess || accounts || [])];

      for (const sub of dueSubs) {
        const billingDay = Number(sub.billingDay) || 1;
        const safeDay = String(Math.min(28, billingDay)).padStart(2, '0');
        const targetAcc = updatedAccs.find((a) => a.id === sub.accountId) || updatedAccs[0];

        const autoTx = {
          id: `auto-sub-${sub.id}-${monthPrefix}`,
          subscriptionId: sub.id,
          title: `${sub.name} (Gasto Fijo)`,
          amount: Number(sub.amount) || 0,
          originalAmount: Number(sub.amount) || 0,
          currency: 'USD',
          type: 'expense',
          category: sub.category || 'Suscripciones & Fijos',
          accountId: targetAcc?.id || 'acc-bofa-checking',
          date: `${monthPrefix}-${safeDay}`,
          userId: currentUser.id,
          isRecurringAuto: true,
          notes: `Cobro automático recurrente ejecutado el día ${billingDay}`,
        };

        newTxs.push(autoTx);

        if (targetAcc) {
          const delta = calcDelta(targetAcc, autoTx);
          const nextBal = targetAcc.balance + delta;
          const formattedBal = targetAcc.currency === 'COP' ? Math.round(nextBal) : Math.round(nextBal * 100) / 100;
          updatedAccs = updatedAccs.map((a) => (a.id === targetAcc.id ? { ...a, balance: formattedBal } : a));
        }

        await api.createTransaction(autoTx, currentUser.id);
        if (targetAcc) {
          const updatedTarget = updatedAccs.find((a) => a.id === targetAcc.id);
          await api.updateAccount(targetAcc.id, { balance: updatedTarget.balance }, currentUser.id);
        }
      }

      setTransactions((prev) => [...newTxs, ...prev]);
      setAccounts(updatedAccs);
      showToast(`⚡ ${newTxs.length} gasto(s) fijo(s) ejecutado(s) automáticamente según fecha de cobro`);
      return { executed: newTxs.length };
    },
    [subscriptions, accounts, transactions, currentUser.id, exchangeRate, showToast]
  );



  const handleOpenSwitchUser = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.sessionStorage?.removeItem('wf_session_unlocked');
    }
    setIsLoginModalOpen(true);
  }, []);

  // Resilient Local Snapshot: Keep offline manual changes synchronized in localStorage
  useEffect(() => {
    if (isSwitchingUserRef.current || activeUserRef.current !== currentUser.id) {
      return;
    }

    const timer = setTimeout(() => {
      try {
        if (typeof window !== 'undefined' && (accounts.length > 0 || transactions.length > 0)) {
          localStorage.setItem(
            `wf_saved_state_${currentUser.id}`,
            JSON.stringify({
              user: currentUser,
              accounts,
              transactions,
              subscriptions,
              debts,
              currency,
              exchangeRate,
              updatedAt: Date.now(),
            })
          );
        }
      } catch (_) {}
    }, 1000);

    return () => clearTimeout(timer);
  }, [accounts, transactions, subscriptions, debts, currency, exchangeRate, currentUser]);

  const handleOpenEditTransaction = useCallback((tx) => {
    setEditingTransaction(tx);
    setModalInitialType(null);
    setIsTransactionModalOpen(true);
  }, []);

  const handleOpenNewTransaction = useCallback(() => {
    setEditingTransaction(null);
    setModalInitialType(null);
    setIsTransactionModalOpen(true);
  }, []);

  const handleOpenTransfer = useCallback(() => {
    setEditingTransaction(null);
    setModalInitialType('transfer');
    setIsTransactionModalOpen(true);
  }, []);

  // Handle adding a new account in SQLite
  const handleSaveAccount = async (newAcc) => {
    const userAccount = {
      ...newAcc,
      userId: currentUser.id,
    };
    setAccounts((prev) => [userAccount, ...prev]);
    await api.createAccount(userAccount, currentUser.id);
    showToast(`Cuenta guardada en SQLite: ${userAccount.name}`);
  };

  // Calculate Net Worth: sum of all account balances normalized to USD without double-conversion
  const netWorth = accounts.reduce((sum, a) => {
    const b = Number(a.balance) || 0;
    return sum + (a.currency === 'COP' ? b / (exchangeRate || DEFAULT_USD_COP_RATE) : b);
  }, 0);

  // Ant expenses count for alert badges
  const antAlertCount = transactions.filter((t) => t.isAntExpense).length;

  return (
    <div className="min-h-screen bg-[#09080E] text-white flex flex-col font-sans selection:bg-purple-500/30 selection:text-purple-200 overflow-x-clip">
      {/* Background Liquid Glass Ambient Glows with Organic Floating Movement */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-36 -left-36 w-[32rem] h-[32rem] rounded-full bg-gradient-to-br from-purple-600/25 to-indigo-600/15 blur-[130px] animate-float-orb-1" />
        <div className="absolute top-1/4 -right-36 w-[30rem] h-[30rem] rounded-full bg-gradient-to-br from-fuchsia-600/20 to-purple-800/15 blur-[140px] animate-float-orb-2" />
        <div className="absolute -bottom-36 left-1/4 w-[34rem] h-[34rem] rounded-full bg-gradient-to-tr from-indigo-700/22 to-fuchsia-900/18 blur-[150px] animate-float-orb-1" />
      </div>

      {/* Main Navigation (Desktop Sidebar & Mobile iOS Tab Bar) */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenNewTransaction={handleOpenNewTransaction}
        netWorth={netWorth}
        antExpenseAlertCount={antAlertCount}
        currency={currency}
        exchangeRate={exchangeRate}
        currentUser={currentUser}
        onOpenSwitchUser={handleOpenSwitchUser}
      />

      {/* Main Content Area (offset by desktop sidebar and mobile bottom tab bar) */}
      <div className="lg:pl-80 flex-1 flex flex-col relative z-10 min-w-0">
        <Header
          activeTab={activeTab}
          timeframe={timeframe}
          setTimeframe={setTimeframe}
          selectedYear={selectedYear}
          setSelectedYear={setSelectedYear}
          availableYears={availableYears}
          currency={currency}
          setCurrency={handleSetCurrency}
          exchangeRate={exchangeRate}
          currentUser={currentUser}
          onOpenSwitchUser={handleOpenSwitchUser}
          onOpenNewTransaction={handleOpenNewTransaction}
          onResetDemoData={handleResetDemoData}
          onNavigateAI={() => setActiveTab('ai-advisor')}
        />

        <main className="flex-1 max-w-7xl w-full mx-auto p-3.5 sm:p-6 lg:p-8 pb-28 lg:pb-8 min-w-0">
          {activeTab === 'dashboard' && (
            <DashboardView
              accounts={accounts}
              transactions={transactions}
              timeframe={timeframe}
              setTimeframe={setTimeframe}
              selectedYear={selectedYear}
              currency={currency}
              exchangeRate={exchangeRate}
              onOpenNewTransaction={handleOpenNewTransaction}
              onEditTransaction={handleOpenEditTransaction}
              onDeleteTransaction={handleDeleteTransaction}
              onOpenNewAccount={() => setIsAccountModalOpen(true)}
              onSelectAccount={(accId) => {
                setSelectedAccountId(accId);
                setActiveTab('accounts');
              }}
              onNavigateTab={(tab) => setActiveTab(tab)}
            />
          )}

          {activeTab === 'accounts' && (
            <AccountsView
              currentUser={currentUser}
              accounts={accounts}
              setAccounts={setAccounts}
              transactions={transactions}
              timeframe={timeframe}
              setTimeframe={setTimeframe}
              selectedYear={selectedYear}
              currency={currency}
              exchangeRate={exchangeRate}
              onOpenNewAccount={() => setIsAccountModalOpen(true)}
              onOpenNewTransaction={handleOpenNewTransaction}
              onOpenTransfer={handleOpenTransfer}
              onEditTransaction={handleOpenEditTransaction}
              onDeleteTransaction={handleDeleteTransaction}
              selectedAccountId={selectedAccountId}
              setSelectedAccountId={setSelectedAccountId}
              showToast={showToast}
            />
          )}

          {activeTab === 'monthly-expenses' && (
            <MonthlyExpensesView
              transactions={transactions}
              accounts={accounts}
              timeframe={timeframe}
              selectedYear={selectedYear}
              setSelectedYear={setSelectedYear}
              availableYears={availableYears}
              currency={currency}
              exchangeRate={exchangeRate}
              onOpenNewTransaction={handleOpenNewTransaction}
              onEditTransaction={handleOpenEditTransaction}
              onDeleteTransaction={handleDeleteTransaction}
            />
          )}

          {(activeTab === 'commitments' || activeTab === 'subscriptions' || activeTab === 'debts') && (
            <CommitmentsView
              currentUser={currentUser}
              subscriptions={subscriptions}
              setSubscriptions={setSubscriptions}
              debts={debts}
              setDebts={setDebts}
              accounts={accounts}
              timeframe={timeframe}
              selectedYear={selectedYear}
              currency={currency}
              exchangeRate={exchangeRate}
              transactions={transactions}
              onLogPaymentTransaction={handleSaveTransaction}
              onExecuteDueSubscriptions={handleExecuteDueSubscriptions}
              onOpenNewTransaction={() => setIsTransactionModalOpen(true)}
            />
          )}

          {activeTab === 'ai-advisor' && (
            <React.Suspense
              fallback={
                <div className="liquid-glass p-8 text-center text-purple-300 animate-pulse text-xs">
                  Cargando Smart AI Advisor...
                </div>
              }
            >
              <AIAdvisorView
                accounts={accounts}
                transactions={transactions}
                subscriptions={subscriptions}
                debts={debts}
                timeframe={timeframe}
                setTimeframe={setTimeframe}
                selectedYear={selectedYear}
                setSelectedYear={setSelectedYear}
                availableYears={availableYears}
                currency={currency}
                exchangeRate={exchangeRate}
                onOpenNewTransaction={handleOpenNewTransaction}
                onEditTransaction={handleOpenEditTransaction}
              />
            </React.Suspense>
          )}

          {activeTab === 'settings' && (
            <React.Suspense
              fallback={
                <div className="liquid-glass p-8 text-center text-purple-300 animate-pulse text-xs">
                  Cargando Panel de Ajustes...
                </div>
              }
            >
              <SettingsView
                currentUser={currentUser}
                setCurrentUser={setCurrentUser}
                currency={currency}
                setCurrency={handleSetCurrency}
                exchangeRate={exchangeRate}
                setExchangeRate={handleSetExchangeRate}
                accounts={accounts}
                setAccounts={setAccounts}
                transactions={transactions}
                setTransactions={setTransactions}
                subscriptions={subscriptions}
                setSubscriptions={setSubscriptions}
                debts={debts}
                setDebts={setDebts}
                onOpenNewAccount={() => setIsAccountModalOpen(true)}
                onResetUserData={handleResetDemoData}
                showToast={showToast}
              />
            </React.Suspense>
          )}
        </main>
      </div>

      {/* Quick Movement Registration & Edit Modal */}
      <TransactionModal
        isOpen={isTransactionModalOpen}
        onClose={() => {
          setIsTransactionModalOpen(false);
          setEditingTransaction(null);
          setModalInitialType(null);
        }}
        accounts={accounts}
        currency={currency}
        exchangeRate={exchangeRate}
        onSaveTransaction={handleSaveTransaction}
        onSaveTransfer={handleSaveTransfer}
        onDeleteTransaction={handleDeleteTransaction}
        editingTransaction={editingTransaction}
        initialType={modalInitialType}
      />

      {/* Create Account Modal */}
      <AccountModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        currency={currency}
        exchangeRate={exchangeRate}
        onSaveAccount={handleSaveAccount}
      />

      {/* Multi-User Security PIN Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onLoginSuccess={handleLoginSuccess}
        currentUserId={currentUser?.id}
      />

      {/* Floating Toast Notification (Responsive on Mobile & Desktop with Safe-Area) */}
      {toastMessage && (
        <div className="fixed top-[max(1.2rem,calc(env(safe-area-inset-top,0px)+0.85rem))] inset-x-3 sm:inset-x-auto sm:top-5 sm:right-5 z-50 bg-[#161324]/98 border border-purple-500/40 text-purple-200 px-4 py-2.5 rounded-2xl shadow-liquid-purple text-xs font-semibold flex items-center justify-center sm:justify-start gap-2 animate-fade-in max-w-md mx-auto sm:mx-0">
          <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 animate-ping" />
          <span className="truncate">{toastMessage}</span>
        </div>
      )}
    </div>
  );
}

export default App;
