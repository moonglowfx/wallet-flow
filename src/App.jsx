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

export function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [timeframe, setTimeframe] = useState('monthly');

  // Application State
  const [accounts, setAccounts] = useState(() => {
    const saved = localStorage.getItem('wf_accounts');
    return saved ? JSON.parse(saved) : INITIAL_ACCOUNTS;
  });

  const [transactions, setTransactions] = useState(() => {
    const saved = localStorage.getItem('wf_transactions');
    return saved ? JSON.parse(saved) : INITIAL_TRANSACTIONS;
  });

  const [subscriptions, setSubscriptions] = useState(() => {
    const saved = localStorage.getItem('wf_subscriptions');
    return saved ? JSON.parse(saved) : INITIAL_SUBSCRIPTIONS;
  });

  const [debts, setDebts] = useState(() => {
    const saved = localStorage.getItem('wf_debts');
    return saved ? JSON.parse(saved) : INITIAL_DEBTS;
  });

  const [selectedAccountId, setSelectedAccountId] = useState(null);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

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

  // Reset demo data
  const handleResetDemoData = () => {
    setAccounts(INITIAL_ACCOUNTS);
    setTransactions(INITIAL_TRANSACTIONS);
    setSubscriptions(INITIAL_SUBSCRIPTIONS);
    setDebts(INITIAL_DEBTS);
    setSelectedAccountId(null);
    showToast('Datos demo restaurados exitosamente');
  };

  // Handle adding a new transaction and update linked account balance
  const handleSaveTransaction = (newTxData) => {
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

    showToast(`Movimiento registrado: ${newTx.title}`);
  };

  // Handle adding a new account
  const handleSaveAccount = (newAcc) => {
    setAccounts([newAcc, ...accounts]);
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
