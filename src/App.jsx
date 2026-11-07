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
import { DEFAULT_USD_COP_RATE } from './data/mockData.js';
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
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

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
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

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

    // Fallback if running without Node server
    const uid = targetUserId || 'munboi';
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
    setCurrentUser(user);
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

  // Handle adding a new transaction and update linked account balance in SQLite
  const handleSaveTransaction = async (newTxData) => {
    const newTx = {
      id: `tx-${Date.now()}`,
      userId: currentUser.id,
      ...newTxData,
    };

    setTransactions((prev) => [newTx, ...prev]);

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
    showToast(`Movimiento guardado en SQLite: ${newTx.title}`);
  };

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

  // Calculate Net Worth: sum of all account balances in USD base
  const netWorth = accounts.reduce((sum, a) => sum + (a.balance || 0), 0);

  // Ant expenses count for alert badges
  const antAlertCount = transactions.filter((t) => t.isAntExpense).length;

  return (
    <div className="min-h-screen bg-[#09080E] text-white flex flex-col font-sans selection:bg-purple-500/30 selection:text-purple-200 overflow-x-clip">
      {/* Background Liquid Glass Ambient Glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-36 -left-36 w-[28rem] h-[28rem] rounded-full bg-purple-600/20 blur-[130px]" />
        <div className="absolute top-1/4 -right-36 w-[26rem] h-[26rem] rounded-full bg-fuchsia-600/15 blur-[140px]" />
        <div className="absolute -bottom-36 left-1/4 w-[30rem] h-[30rem] rounded-full bg-indigo-700/18 blur-[150px]" />
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

      {/* Main Content Area (offset by desktop sidebar and mobile bottom tab bar) */}
      <div className="lg:pl-72 flex-1 flex flex-col relative z-10 min-w-0">
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
          onOpenSwitchUser={() => setIsLoginModalOpen(true)}
          onOpenNewTransaction={() => setIsTransactionModalOpen(true)}
          onResetDemoData={handleResetDemoData}
          onNavigateAI={() => setActiveTab('ai-advisor')}
        />

        <main className="flex-1 max-w-7xl w-full mx-auto p-3.5 sm:p-6 lg:p-8 pb-28 lg:pb-8 min-w-0">
          {activeTab === 'dashboard' && (
            <DashboardView
              accounts={accounts}
              transactions={transactions}
              timeframe={timeframe}
              selectedYear={selectedYear}
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
              timeframe={timeframe}
              selectedYear={selectedYear}
              currency={currency}
              exchangeRate={exchangeRate}
              onOpenNewAccount={() => setIsAccountModalOpen(true)}
              onOpenNewTransaction={() => setIsTransactionModalOpen(true)}
              selectedAccountId={selectedAccountId}
              setSelectedAccountId={setSelectedAccountId}
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
              onOpenNewTransaction={() => setIsTransactionModalOpen(true)}
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
              onLogPaymentTransaction={handleSaveTransaction}
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
                selectedYear={selectedYear}
                currency={currency}
                exchangeRate={exchangeRate}
                onOpenNewTransaction={() => setIsTransactionModalOpen(true)}
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

      {/* Multi-User Security PIN Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onLoginSuccess={handleLoginSuccess}
        currentUserId={currentUser?.id}
      />

      {/* Floating Toast Notification (Responsive on Mobile & Desktop) */}
      {toastMessage && (
        <div className="fixed top-3 inset-x-3 sm:inset-x-auto sm:top-5 sm:right-5 z-50 bg-[#161324]/95 backdrop-blur-xl border border-purple-500/40 text-purple-200 px-4 py-2.5 rounded-2xl shadow-liquid-purple text-xs font-semibold flex items-center justify-center sm:justify-start gap-2 animate-bounce max-w-md mx-auto sm:mx-0">
          <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
          <span className="truncate">{toastMessage}</span>
        </div>
      )}
    </div>
  );
}

export default App;
