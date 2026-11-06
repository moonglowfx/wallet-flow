import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar.jsx';
import { Header } from './components/Header.jsx';
import { DashboardView } from './components/DashboardView.jsx';
import { AccountsView } from './components/AccountsView.jsx';
import { SubscriptionsView } from './components/SubscriptionsView.jsx';
import { DebtsView } from './components/DebtsView.jsx';
import { AIAdvisorView } from './components/AIAdvisorView.jsx';
import { TransactionModal } from './components/TransactionModal.jsx';
import { AccountModal } from './components/AccountModal.jsx';
import { ExcelImportModal } from './components/ExcelImportModal.jsx';
import {
  INITIAL_ACCOUNTS,
  INITIAL_TRANSACTIONS,
  INITIAL_SUBSCRIPTIONS,
  INITIAL_DEBTS,
  DEFAULT_USD_COP_RATE,
} from './data/mockData.js';
import { api } from './services/api.js';

export function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [timeframe, setTimeframe] = useState('monthly');

  // Currency State: USD as primary, COP as secondary
  const [currency, setCurrency] = useState(() => {
    return localStorage.getItem('wf_currency') || 'USD';
  });
  const [exchangeRate, setExchangeRate] = useState(DEFAULT_USD_COP_RATE);

  const DATA_VERSION = '2026-11-real-data-v1';

  // Application State: Preloaded with user's real transactions from 2024 to 2026
  const [accounts, setAccounts] = useState(() => {
    const version = localStorage.getItem('wf_data_version');
    if (version !== DATA_VERSION) {
      localStorage.setItem('wf_data_version', DATA_VERSION);
      localStorage.setItem('wf_accounts', JSON.stringify(INITIAL_ACCOUNTS));
      localStorage.setItem('wf_transactions', JSON.stringify(INITIAL_TRANSACTIONS));
      localStorage.setItem('wf_subscriptions', JSON.stringify(INITIAL_SUBSCRIPTIONS));
      localStorage.setItem('wf_debts', JSON.stringify(INITIAL_DEBTS));
      return INITIAL_ACCOUNTS;
    }
    const saved = localStorage.getItem('wf_accounts');
    if (!saved) return INITIAL_ACCOUNTS;
    try {
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed) || parsed.length === 0 || parsed.some((a) => a.id === 'acc-bank-bbva')) {
        return INITIAL_ACCOUNTS;
      }
      return parsed;
    } catch (_) {
      return INITIAL_ACCOUNTS;
    }
  });

  const [transactions, setTransactions] = useState(() => {
    const version = localStorage.getItem('wf_data_version');
    if (version !== DATA_VERSION) return INITIAL_TRANSACTIONS;
    const saved = localStorage.getItem('wf_transactions');
    if (!saved) return INITIAL_TRANSACTIONS;
    try {
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed) || parsed.length === 0 || parsed.some((t) => t.id === 'tx-101')) {
        return INITIAL_TRANSACTIONS;
      }
      return parsed;
    } catch (_) {
      return INITIAL_TRANSACTIONS;
    }
  });

  const [subscriptions, setSubscriptions] = useState(() => {
    const version = localStorage.getItem('wf_data_version');
    if (version !== DATA_VERSION) return INITIAL_SUBSCRIPTIONS;
    const saved = localStorage.getItem('wf_subscriptions');
    if (!saved) return INITIAL_SUBSCRIPTIONS;
    try {
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed) || parsed.length === 0 || parsed.some((s) => s.id === 'sub-1')) {
        return INITIAL_SUBSCRIPTIONS;
      }
      return parsed;
    } catch (_) {
      return INITIAL_SUBSCRIPTIONS;
    }
  });

  const [debts, setDebts] = useState(() => {
    const version = localStorage.getItem('wf_data_version');
    if (version !== DATA_VERSION) return INITIAL_DEBTS;
    const saved = localStorage.getItem('wf_debts');
    if (!saved) return INITIAL_DEBTS;
    try {
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed) || parsed.length === 0 || parsed.some((d) => d.id === 'debt-1')) {
        return INITIAL_DEBTS;
      }
      return parsed;
    } catch (_) {
      return INITIAL_DEBTS;
    }
  });

  const [selectedAccountId, setSelectedAccountId] = useState(null);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Initial load from SQLite Database if server is running
  useEffect(() => {
    async function loadData() {
      try {
        const [accs, txs, subs, dts] = await Promise.all([
          api.getAccounts(),
          api.getTransactions(),
          api.getSubscriptions(),
          api.getDebts(),
        ]);
        if (accs && accs.length > 0) setAccounts(accs);
        if (txs && txs.length > 0) setTransactions(txs);
        if (subs && subs.length > 0) setSubscriptions(subs);
        if (dts && dts.length > 0) setDebts(dts);
      } catch (_) {}
    }
    loadData();
  }, []);

  // Sync currency to local storage
  useEffect(() => {
    localStorage.setItem('wf_currency', currency);
  }, [currency]);

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem('wf_accounts', JSON.stringify(accounts));
  }, [accounts]);

  useEffect(() => {
    localStorage.setItem('wf_transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('wf_subscriptions', JSON.stringify(subscriptions));
  }, [subscriptions]);

  useEffect(() => {
    localStorage.setItem('wf_debts', JSON.stringify(debts));
  }, [debts]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  };

  // Reset clean data
  const handleResetDemoData = async () => {
    setAccounts([]);
    setTransactions([]);
    setSubscriptions([]);
    setDebts([]);
    setSelectedAccountId(null);
    localStorage.removeItem('wf_accounts');
    localStorage.removeItem('wf_transactions');
    localStorage.removeItem('wf_subscriptions');
    localStorage.removeItem('wf_debts');
    try {
      await fetch('/api/clear', { method: 'POST' });
    } catch (_) {}
    showToast('Base de datos y almacenamiento limpiados a cero');
  };

  // Handle adding a new transaction and update linked account balance
  const handleSaveTransaction = async (newTxData) => {
    const newTx = {
      id: `tx-${Date.now()}`,
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
            balance: acc.balance + delta,
          };
        }
        return acc;
      })
    );

    await api.createTransaction(newTx);
    showToast(`Movimiento registrado: ${newTx.title}`);
  };

  // Handle adding a new account
  const handleSaveAccount = async (newAcc) => {
    setAccounts([newAcc, ...accounts]);
    await api.createAccount(newAcc);
    showToast(`Cuenta creada: ${newAcc.name}`);
  };

  // Handle importing Excel data
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

    // Save to localStorage
    localStorage.setItem('wf_accounts', JSON.stringify(nextAccounts));
    localStorage.setItem('wf_transactions', JSON.stringify(nextTransactions));
    localStorage.setItem('wf_subscriptions', JSON.stringify(nextSubscriptions));
    localStorage.setItem('wf_debts', JSON.stringify(nextDebts));

    // Save to SQLite
    await api.bulkImport({
      accounts: nextAccounts,
      transactions: nextTransactions,
      subscriptions: nextSubscriptions,
      debts: nextDebts,
    }, mode);

    showToast(
      `Excel importado con éxito: ${nextAccounts.length} cuentas, ${nextTransactions.length} movimientos`
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

          {activeTab === 'subscriptions' && (
            <SubscriptionsView
              subscriptions={subscriptions}
              setSubscriptions={setSubscriptions}
              accounts={accounts}
              currency={currency}
              exchangeRate={exchangeRate}
            />
          )}

          {activeTab === 'debts' && (
            <DebtsView
              debts={debts}
              setDebts={setDebts}
              accounts={accounts}
              currency={currency}
              exchangeRate={exchangeRate}
              onLogPaymentTransaction={handleSaveTransaction}
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
