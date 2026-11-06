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
import {
  INITIAL_ACCOUNTS,
  INITIAL_TRANSACTIONS,
  INITIAL_SUBSCRIPTIONS,
  INITIAL_DEBTS,
} from './data/mockData.js';
import { api } from './services/api.js';

export function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [timeframe, setTimeframe] = useState('monthly');

  // Application State: Cleared of dummy data and ready for real accounts
  const [accounts, setAccounts] = useState(() => {
    const saved = localStorage.getItem('wf_accounts');
    if (!saved) return INITIAL_ACCOUNTS;
    try {
      const parsed = JSON.parse(saved);
      // Clean up legacy mock data automatically
      if (Array.isArray(parsed) && parsed.some((a) => a.id === 'acc-bank-bbva')) {
        localStorage.removeItem('wf_accounts');
        localStorage.removeItem('wf_transactions');
        localStorage.removeItem('wf_subscriptions');
        localStorage.removeItem('wf_debts');
        return [];
      }
      return parsed;
    } catch (_) {
      return INITIAL_ACCOUNTS;
    }
  });

  const [transactions, setTransactions] = useState(() => {
    const saved = localStorage.getItem('wf_transactions');
    if (!saved) return INITIAL_TRANSACTIONS;
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.some((t) => t.id === 'tx-101')) {
        return [];
      }
      return parsed;
    } catch (_) {
      return INITIAL_TRANSACTIONS;
    }
  });

  const [subscriptions, setSubscriptions] = useState(() => {
    const saved = localStorage.getItem('wf_subscriptions');
    if (!saved) return INITIAL_SUBSCRIPTIONS;
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.some((s) => s.id === 'sub-1')) {
        return [];
      }
      return parsed;
    } catch (_) {
      return INITIAL_SUBSCRIPTIONS;
    }
  });

  const [debts, setDebts] = useState(() => {
    const saved = localStorage.getItem('wf_debts');
    if (!saved) return INITIAL_DEBTS;
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.some((d) => d.id === 'debt-1')) {
        return [];
      }
      return parsed;
    } catch (_) {
      return INITIAL_DEBTS;
    }
  });

  const [selectedAccountId, setSelectedAccountId] = useState(null);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
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
        if (accs) setAccounts(accs);
        if (txs) setTransactions(txs);
        if (subs) setSubscriptions(subs);
        if (dts) setDebts(dts);
      } catch (_) {}
    }
    loadData();
  }, []);

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

  // Calculate Net Worth: sum of all account balances
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
      />

      {/* Main Content Area (offset by desktop sidebar) */}
      <div className="lg:pl-72 flex-1 flex flex-col relative z-10">
        <Header
          activeTab={activeTab}
          timeframe={timeframe}
          setTimeframe={setTimeframe}
          onOpenNewTransaction={() => setIsTransactionModalOpen(true)}
          onResetDemoData={handleResetDemoData}
          onNavigateAI={() => setActiveTab('ai-advisor')}
        />

        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
          {activeTab === 'dashboard' && (
            <DashboardView
              accounts={accounts}
              transactions={transactions}
              timeframe={timeframe}
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
              onOpenNewAccount={() => setIsAccountModalOpen(true)}
              onOpenNewTransaction={() => setIsTransactionModalOpen(true)}
              selectedAccountId={selectedAccountId}
              setSelectedAccountId={setSelectedAccountId}
            />
          )}

          {activeTab === 'subscriptions' && (
            <SubscriptionsView
              subscriptions={subscriptions}
              setSubscriptions={setSubscriptions}
              accounts={accounts}
            />
          )}

          {activeTab === 'debts' && (
            <DebtsView
              debts={debts}
              setDebts={setDebts}
              accounts={accounts}
              onLogPaymentTransaction={handleSaveTransaction}
            />
          )}

          {activeTab === 'ai-advisor' && (
            <AIAdvisorView
              accounts={accounts}
              transactions={transactions}
              subscriptions={subscriptions}
              debts={debts}
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
        onSaveTransaction={handleSaveTransaction}
      />

      {/* Create Account Modal */}
      <AccountModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        onSaveAccount={handleSaveAccount}
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
