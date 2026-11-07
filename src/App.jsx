import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar.jsx';
import { Header } from './components/Header.jsx';
import { DashboardView } from './components/DashboardView.jsx';
import { AccountsView } from './components/AccountsView.jsx';
import { CommitmentsView } from './components/CommitmentsView.jsx';
import { MonthlyExpensesView } from './components/MonthlyExpensesView.jsx';
import { SubscriptionsView } from './components/SubscriptionsView.jsx';
import { DebtsView } from './components/DebtsView.jsx';
import { AIAdvisorView } from './components/AIAdvisorView.jsx';
import { SettingsView } from './components/SettingsView.jsx';
import { TransactionModal } from './components/TransactionModal.jsx';
import { AccountModal } from './components/AccountModal.jsx';
import { ExcelImportModal } from './components/ExcelImportModal.jsx';
import { LoginModal } from './components/LoginModal.jsx';
import { USERS, getUserInitialData } from './data/users.js';
import { DEFAULT_USD_COP_RATE } from './data/mockData.js';
import { api } from './services/api.js';

export const APP_BUILD_VERSION = 'v2026.11.06-r5';

// Self-healing migration for browser localStorage: guarantees immediate sync on Vercel deploys
if (typeof window !== 'undefined' && window.localStorage) {
  try {
    const storedBuild = localStorage.getItem('wf_data_build');

    // 1. Munboi Data Verification: must have 726 transactions and real BofA accounts
    const rawMunboiTxs = localStorage.getItem('wf_user_munboi_transactions');
    const rawMunboiAccs = localStorage.getItem('wf_user_munboi_accounts');
    let munboiStale = false;

    if (!rawMunboiTxs || !rawMunboiAccs || storedBuild !== APP_BUILD_VERSION) {
      if (!rawMunboiTxs || !rawMunboiAccs) {
        munboiStale = true;
      } else {
        const pTxs = JSON.parse(rawMunboiTxs);
        const pAccs = JSON.parse(rawMunboiAccs);
        if (!Array.isArray(pTxs) || pTxs.length < 700 || pTxs.some((t) => t.id === 'tx-01' || t.id === 'tx-02')) {
          munboiStale = true;
        }
        if (!Array.isArray(pAccs) || !pAccs.some((a) => a.id === 'acc-bofa-checking')) {
          munboiStale = true;
        }
      }
    }

    if (munboiStale) {
      const munboiInit = getUserInitialData('munboi');
      localStorage.setItem('wf_user_munboi_accounts', JSON.stringify(munboiInit.accounts));
      localStorage.setItem('wf_user_munboi_transactions', JSON.stringify(munboiInit.transactions));
      localStorage.setItem('wf_user_munboi_subscriptions', JSON.stringify(munboiInit.subscriptions));
      localStorage.setItem('wf_user_munboi_debts', JSON.stringify(munboiInit.debts));
    }

    // 2. Tiago Data Verification: strictly 0 data (no legacy dummy items)
    const rawTiagoAccs = localStorage.getItem('wf_user_tiago_accounts');
    const rawTiagoTxs = localStorage.getItem('wf_user_tiago_transactions');
    let tiagoStale = false;
    if (rawTiagoAccs && (rawTiagoAccs.includes('acc-tiago-') || rawTiagoAccs.includes('Chase') || rawTiagoAccs.includes('Wells Fargo'))) {
      tiagoStale = true;
    }
    if (rawTiagoTxs && (rawTiagoTxs.includes('tx-tg-') || rawTiagoTxs.includes('tx-01'))) {
      tiagoStale = true;
    }
    if (tiagoStale || !rawTiagoAccs) {
      localStorage.setItem('wf_user_tiago_accounts', JSON.stringify([]));
      localStorage.setItem('wf_user_tiago_transactions', JSON.stringify([]));
      localStorage.setItem('wf_user_tiago_subscriptions', JSON.stringify([]));
      localStorage.setItem('wf_user_tiago_debts', JSON.stringify([]));
    }

    localStorage.setItem('wf_data_build', APP_BUILD_VERSION);
  } catch (err) {
    console.error('Error auto-syncing storage version:', err);
  }
}

export function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [timeframe, setTimeframe] = useState('monthly');

  // Multi-user authentication state: Munboi (PIN: 1234) | Tiago (PIN: 5678)
  const [currentUser, setCurrentUser] = useState(() => {
    const savedUserId = localStorage.getItem('wf_active_user_id');
    return USERS.find((u) => u.id === savedUserId) || USERS[0];
  });
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // Currency State: USD as primary, COP as secondary
  const [currency, setCurrency] = useState(() => {
    return localStorage.getItem(`wf_user_${currentUser.id}_currency`) || 'USD';
  });
  const [exchangeRate, setExchangeRate] = useState(DEFAULT_USD_COP_RATE);

  // Isolated Application Data State per User
  const [accounts, setAccounts] = useState(() => {
    if (currentUser.id === 'tiago') {
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
    const saved = localStorage.getItem(`wf_user_${currentUser.id}_accounts`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.some((a) => a.id === 'acc-bofa-checking')) return parsed;
      } catch (_) {}
    }
    return getUserInitialData(currentUser.id).accounts;
  });

  const [transactions, setTransactions] = useState(() => {
    if (currentUser.id === 'tiago') {
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
    const saved = localStorage.getItem(`wf_user_${currentUser.id}_transactions`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= 700 && !parsed.some((t) => t.id === 'tx-01' || t.id === 'tx-02')) {
          return parsed;
        }
      } catch (_) {}
    }
    return getUserInitialData(currentUser.id).transactions;
  });

  const [subscriptions, setSubscriptions] = useState(() => {
    if (currentUser.id === 'tiago') {
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
    const saved = localStorage.getItem(`wf_user_${currentUser.id}_subscriptions`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (_) {}
    }
    return getUserInitialData(currentUser.id).subscriptions;
  });

  const [debts, setDebts] = useState(() => {
    if (currentUser.id === 'tiago') {
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
    const saved = localStorage.getItem(`wf_user_${currentUser.id}_debts`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (_) {}
    }
    return getUserInitialData(currentUser.id).debts;
  });

  const [selectedAccountId, setSelectedAccountId] = useState(null);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = useCallback((msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  }, []);

  // When active user switches, reload their isolated personal data
  const switchUserData = useCallback((user) => {
    const userId = user.id;
    const initial = getUserInitialData(userId);

    // Load Currency
    const savedCurr = localStorage.getItem(`wf_user_${userId}_currency`) || 'USD';
    setCurrency(savedCurr);

    // Load Accounts
    const savedAccs = localStorage.getItem(`wf_user_${userId}_accounts`);
    let loadedAccs = initial.accounts;
    if (savedAccs) {
      try {
        const p = JSON.parse(savedAccs);
        if (Array.isArray(p)) loadedAccs = p;
      } catch (_) {}
    }
    setAccounts(loadedAccs);

    // Load Transactions
    const savedTxs = localStorage.getItem(`wf_user_${userId}_transactions`);
    let loadedTxs = initial.transactions;
    if (savedTxs) {
      try {
        const p = JSON.parse(savedTxs);
        if (Array.isArray(p)) loadedTxs = p;
      } catch (_) {}
    }
    setTransactions(loadedTxs);

    // Load Subscriptions
    const savedSubs = localStorage.getItem(`wf_user_${userId}_subscriptions`);
    let loadedSubs = initial.subscriptions;
    if (savedSubs) {
      try {
        const p = JSON.parse(savedSubs);
        if (Array.isArray(p)) loadedSubs = p;
      } catch (_) {}
    }
    setSubscriptions(loadedSubs);

    // Load Debts
    const savedDebts = localStorage.getItem(`wf_user_${userId}_debts`);
    let loadedDebts = initial.debts;
    if (savedDebts) {
      try {
        const p = JSON.parse(savedDebts);
        if (Array.isArray(p)) loadedDebts = p;
      } catch (_) {}
    }

    // Strict guarantee for Munboi: ensure real Excel dataset
    if (userId === 'munboi') {
      if (!loadedAccs || !loadedAccs.some((a) => a.id === 'acc-bofa-checking')) {
        loadedAccs = initial.accounts;
        localStorage.setItem('wf_user_munboi_accounts', JSON.stringify(loadedAccs));
      }
      if (!loadedTxs || loadedTxs.length < 700 || loadedTxs.some((t) => t.id === 'tx-01' || t.id === 'tx-02')) {
        loadedTxs = initial.transactions;
        localStorage.setItem('wf_user_munboi_transactions', JSON.stringify(loadedTxs));
      }
    }

    // Strict guarantee for Tiago: purge any legacy mock data
    if (userId === 'tiago') {
      const isOld = (items) =>
        Array.isArray(items) &&
        items.some(
          (x) =>
            x.id?.startsWith('acc-tiago-') ||
            x.id?.startsWith('tx-tg-') ||
            x.id?.startsWith('sub-tg-') ||
            x.id?.startsWith('debt-tg-')
        );
      if (isOld(loadedAccs)) loadedAccs = [];
      if (isOld(loadedTxs)) loadedTxs = [];
      if (isOld(loadedSubs)) loadedSubs = [];
      if (isOld(loadedDebts)) loadedDebts = [];
      localStorage.setItem('wf_user_tiago_accounts', JSON.stringify(loadedAccs));
      localStorage.setItem('wf_user_tiago_transactions', JSON.stringify(loadedTxs));
      localStorage.setItem('wf_user_tiago_subscriptions', JSON.stringify(loadedSubs));
      localStorage.setItem('wf_user_tiago_debts', JSON.stringify(loadedDebts));
    }

    setAccounts(loadedAccs);
    setTransactions(loadedTxs);
    setSubscriptions(loadedSubs);
    setDebts(loadedDebts);

    setSelectedAccountId(null);
    showToast(`Sesión activa: ${user.username} (${user.role})`);
  }, [showToast]);

  // Initial load from SQLite Database for active user
  useEffect(() => {
    async function loadData() {
      try {
        const [accs, txs, subs, dts] = await Promise.all([
          api.getAccounts(currentUser.id),
          api.getTransactions(currentUser.id),
          api.getSubscriptions(currentUser.id),
          api.getDebts(currentUser.id),
        ]);
        if (currentUser.id === 'tiago') {
          // Tiago only loads whatever is explicitly in SQLite (starts at 0)
          setAccounts(accs || []);
          setTransactions(txs || []);
          setSubscriptions(subs || []);
          setDebts(dts || []);
        } else {
          if (accs && accs.length > 0 && accs.some((a) => a.id === 'acc-bofa-checking')) {
            setAccounts(accs);
          }
          if (txs && txs.length >= 700 && !txs.some((t) => t.id === 'tx-01')) {
            setTransactions(txs);
          }
          if (subs && subs.length > 0) setSubscriptions(subs);
          if (dts && dts.length > 0) setDebts(dts);
        }
      } catch (_) {}
    }
    loadData();
  }, [currentUser.id]);

  // Sync isolated user state to localStorage
  useEffect(() => {
    localStorage.setItem(`wf_user_${currentUser.id}_currency`, currency);
  }, [currentUser.id, currency]);

  useEffect(() => {
    localStorage.setItem(`wf_user_${currentUser.id}_accounts`, JSON.stringify(accounts));
  }, [currentUser.id, accounts]);

  useEffect(() => {
    localStorage.setItem(`wf_user_${currentUser.id}_transactions`, JSON.stringify(transactions));
  }, [currentUser.id, transactions]);

  useEffect(() => {
    localStorage.setItem(`wf_user_${currentUser.id}_subscriptions`, JSON.stringify(subscriptions));
  }, [currentUser.id, subscriptions]);

  useEffect(() => {
    localStorage.setItem(`wf_user_${currentUser.id}_debts`, JSON.stringify(debts));
  }, [currentUser.id, debts]);

  // Handle successful login
  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    localStorage.setItem('wf_active_user_id', user.id);
    setIsLoginModalOpen(false);
    switchUserData(user);
  };

  // Reset clean data only for current user
  const handleResetDemoData = async () => {
    const initial = getUserInitialData(currentUser.id);
    setAccounts(initial.accounts);
    setTransactions(initial.transactions);
    setSubscriptions(initial.subscriptions);
    setDebts(initial.debts);
    setSelectedAccountId(null);
    localStorage.setItem(`wf_user_${currentUser.id}_accounts`, JSON.stringify(initial.accounts));
    localStorage.setItem(`wf_user_${currentUser.id}_transactions`, JSON.stringify(initial.transactions));
    localStorage.setItem(`wf_user_${currentUser.id}_subscriptions`, JSON.stringify(initial.subscriptions));
    localStorage.setItem(`wf_user_${currentUser.id}_debts`, JSON.stringify(initial.debts));
    try {
      await fetch('/api/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id }),
      });
    } catch (_) {}
    showToast(`Datos de ${currentUser.username} restablecidos`);
  };

  // Handle adding a new transaction and update linked account balance
  const handleSaveTransaction = async (newTxData) => {
    const newTx = {
      id: `tx-${Date.now()}`,
      userId: currentUser.id,
      ...newTxData,
    };

    setTransactions([newTx, ...transactions]);

    // Live update account balance
    setAccounts((prevAccounts) =>
      prevAccounts.map((acc) => {
        if (acc.id === newTx.accountId) {
          const delta = newTx.type === 'income' ? newTx.amount : -newTx.amount;
          return {
            ...acc,
            balance: Math.round((acc.balance + delta) * 100) / 100,
          };
        }
        return acc;
      })
    );

    await api.createTransaction(newTx, currentUser.id);
    showToast(`Movimiento registrado: ${newTx.title}`);
  };

  // Handle adding a new account
  const handleSaveAccount = async (newAcc) => {
    const userAccount = {
      ...newAcc,
      userId: currentUser.id,
    };
    setAccounts([userAccount, ...accounts]);
    await api.createAccount(userAccount, currentUser.id);
    showToast(`Cuenta creada: ${userAccount.name}`);
  };

  // Handle importing Excel data for the active user
  const handleImportData = async (parsedData, mode = 'replace') => {
    let nextAccounts = [];
    let nextTransactions = [];
    let nextSubscriptions = [];
    let nextDebts = [];

    if (mode === 'replace') {
      nextAccounts = parsedData.accounts || [];
      nextTransactions = parsedData.transactions || [];
      nextSubscriptions = parsedData.subscriptions || [];
      nextDebts = parsedData.debts || [];
    } else {
      // Merge mode
      const existingAccIds = new Set(accounts.map((a) => a.id));
      const newAccs = (parsedData.accounts || []).filter((a) => !existingAccIds.has(a.id));
      nextAccounts = [...accounts, ...newAccs];

      const existingTxIds = new Set(transactions.map((t) => t.id));
      const newTxs = (parsedData.transactions || []).filter((t) => !existingTxIds.has(t.id));
      nextTransactions = [...newTxs, ...transactions];

      const existingSubIds = new Set(subscriptions.map((s) => s.id));
      const newSubs = (parsedData.subscriptions || []).filter((s) => !existingSubIds.has(s.id));
      nextSubscriptions = [...subscriptions, ...newSubs];

      const existingDebtIds = new Set(debts.map((d) => d.id));
      const newDebts = (parsedData.debts || []).filter((d) => !existingDebtIds.has(d.id));
      nextDebts = [...debts, ...newDebts];
    }

    setAccounts(nextAccounts);
    setTransactions(nextTransactions);
    setSubscriptions(nextSubscriptions);
    setDebts(nextDebts);

    // Save to user scoped localStorage
    localStorage.setItem(`wf_user_${currentUser.id}_accounts`, JSON.stringify(nextAccounts));
    localStorage.setItem(`wf_user_${currentUser.id}_transactions`, JSON.stringify(nextTransactions));
    localStorage.setItem(`wf_user_${currentUser.id}_subscriptions`, JSON.stringify(nextSubscriptions));
    localStorage.setItem(`wf_user_${currentUser.id}_debts`, JSON.stringify(nextDebts));

    // Save to SQLite
    await api.bulkImport({
      accounts: nextAccounts,
      transactions: nextTransactions,
      subscriptions: nextSubscriptions,
      debts: nextDebts,
    }, mode, currentUser.id);

    showToast(
      `Excel importado para ${currentUser.username}: ${nextAccounts.length} cuentas, ${nextTransactions.length} movimientos`
    );
  };

  // Calculate Net Worth: sum of all account balances in USD base
  const netWorth = accounts.reduce((sum, a) => sum + (a.balance || 0), 0);

  // Ant expenses count for alert badges
  const antAlertCount = transactions.filter((t) => t.isAntExpense).length;

  return (
    <div className="min-h-screen bg-[#0F0F13] text-white flex flex-col font-sans selection:bg-purple-500/30 selection:text-purple-200">
      {/* Background Liquid Glass Ambient Glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-purple-700/15 blur-[120px]" />
        <div className="absolute top-1/3 -right-40 w-96 h-96 rounded-full bg-fuchsia-600/10 blur-[130px]" />
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 rounded-full bg-indigo-900/15 blur-[140px]" />
      </div>

      {/* Main Navigation (Desktop Sidebar & Mobile iOS Tab Bar) */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenNewTransaction={() => setIsTransactionModalOpen(true)}
        netWorth={netWorth}
        antExpenseAlertCount={antAlertCount}
        currency={currency}
        exchangeRate={exchangeRate}
        currentUser={currentUser}
        onOpenSwitchUser={() => setIsLoginModalOpen(true)}
      />

      {/* Main Content Area (offset by desktop sidebar) */}
      <div className="lg:pl-72 flex-1 flex flex-col relative z-10">
        <Header
          activeTab={activeTab}
          timeframe={timeframe}
          setTimeframe={setTimeframe}
          currency={currency}
          setCurrency={setCurrency}
          exchangeRate={exchangeRate}
          currentUser={currentUser}
          onOpenSwitchUser={() => setIsLoginModalOpen(true)}
          onOpenNewTransaction={() => setIsTransactionModalOpen(true)}
          onOpenImportModal={() => setIsImportModalOpen(true)}
          onResetDemoData={handleResetDemoData}
          onNavigateAI={() => setActiveTab('ai-advisor')}
        />

        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
          {activeTab === 'dashboard' && (
            <DashboardView
              accounts={accounts}
              transactions={transactions}
              timeframe={timeframe}
              currency={currency}
              exchangeRate={exchangeRate}
              onOpenNewTransaction={() => setIsTransactionModalOpen(true)}
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
              accounts={accounts}
              transactions={transactions}
              currency={currency}
              exchangeRate={exchangeRate}
              onOpenNewAccount={() => setIsAccountModalOpen(true)}
              onOpenNewTransaction={() => setIsTransactionModalOpen(true)}
              onOpenImportModal={() => setIsImportModalOpen(true)}
              selectedAccountId={selectedAccountId}
              setSelectedAccountId={setSelectedAccountId}
            />
          )}

          {activeTab === 'monthly-expenses' && (
            <MonthlyExpensesView
              transactions={transactions}
              accounts={accounts}
              currency={currency}
              exchangeRate={exchangeRate}
              onOpenNewTransaction={() => setIsTransactionModalOpen(true)}
            />
          )}

          {(activeTab === 'commitments' || activeTab === 'subscriptions' || activeTab === 'debts') && (
            <CommitmentsView
              subscriptions={subscriptions}
              setSubscriptions={setSubscriptions}
              debts={debts}
              setDebts={setDebts}
              accounts={accounts}
              currency={currency}
              exchangeRate={exchangeRate}
              onLogPaymentTransaction={handleSaveTransaction}
              onOpenNewTransaction={() => setIsTransactionModalOpen(true)}
            />
          )}

          {activeTab === 'ai-advisor' && (
            <AIAdvisorView
              accounts={accounts}
              transactions={transactions}
              subscriptions={subscriptions}
              debts={debts}
              currency={currency}
              exchangeRate={exchangeRate}
              onOpenNewTransaction={() => setIsTransactionModalOpen(true)}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              currentUser={currentUser}
              currency={currency}
              setCurrency={setCurrency}
              exchangeRate={exchangeRate}
              setExchangeRate={setExchangeRate}
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
          )}
        </main>
      </div>

      {/* Quick Movement Registration Modal */}
      <TransactionModal
        isOpen={isTransactionModalOpen}
        onClose={() => setIsTransactionModalOpen(false)}
        accounts={accounts}
        currency={currency}
        exchangeRate={exchangeRate}
        onSaveTransaction={handleSaveTransaction}
      />

      {/* Create Account Modal */}
      <AccountModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        currency={currency}
        exchangeRate={exchangeRate}
        onSaveAccount={handleSaveAccount}
      />

      {/* Excel (.xlsx) Import / Export Modal */}
      <ExcelImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportData={handleImportData}
        activeCurrency={currency}
        exchangeRate={exchangeRate}
      />

      {/* Multi-User Security PIN Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onLoginSuccess={handleLoginSuccess}
        currentUserId={currentUser?.id}
      />

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-[#161324]/90 backdrop-blur-xl border border-purple-500/40 text-purple-200 px-4 py-2.5 rounded-2xl shadow-liquid-purple text-xs font-semibold flex items-center gap-2 animate-bounce">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}

export default App;
