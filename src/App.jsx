import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RefreshCw, Wallet, WifiOff } from 'lucide-react';
import { Navbar } from './components/Navbar.jsx';
import { Header } from './components/Header.jsx';
import { DashboardView } from './components/DashboardView.jsx';
import { AccountsView } from './components/AccountsView.jsx';
import { CommitmentsView } from './components/CommitmentsView.jsx';
import { MonthlyExpensesView } from './components/MonthlyExpensesView.jsx';
import { TransactionModal } from './components/TransactionModal.jsx';
import { AccountModal } from './components/AccountModal.jsx';
import { AuthScreen } from './components/AuthScreen.jsx';
import {
  DEFAULT_USD_COP_RATE,
  createId,
  isSubscriptionChargedInMonth,
  todayLocalISO,
  txUsdValue,
} from './data/finance.js';
import { api } from './services/api.js';

// Vistas auxiliares pesadas: se cargan bajo demanda para acelerar el primer render
const AIAdvisorView = React.lazy(() =>
  import('./components/AIAdvisorView.jsx').then((m) => ({ default: m.AIAdvisorView }))
);
const SettingsView = React.lazy(() =>
  import('./components/SettingsView.jsx').then((m) => ({ default: m.SettingsView }))
);

import { APP_VERSION, APP_BUILD_VERSION, APP_EDITION } from './version.js';
export { APP_VERSION, APP_BUILD_VERSION, APP_EDITION };

// ---------------------------------------------------------------------------
// Caché local (solo acelera el arranque y permite consulta sin conexión; la fuente de verdad es el servidor)
// ---------------------------------------------------------------------------
const SESSION_USER_KEY = 'wf_session_user';
const snapshotKey = (userId) => `wf_saved_state_${userId}`;
const PRIVATE_KEY_PREFIXES = ['wf_saved_state_', 'wf_prisma_settings_'];
const FOCUS_SYNC_MIN_INTERVAL_MS = 10000;
const TOAST_DURATION_MS = 3200;

const asArray = (value) => (Array.isArray(value) ? value : []);

function readCachedSession() {
  try {
    const user = JSON.parse(localStorage.getItem(SESSION_USER_KEY) || 'null');
    if (!user?.id) return null;
    const snapshot = JSON.parse(localStorage.getItem(snapshotKey(user.id)) || 'null');
    return { user, snapshot: snapshot && typeof snapshot === 'object' ? snapshot : null };
  } catch {
    return null;
  }
}

/** Al cerrar sesión no debe quedar información financiera en el dispositivo. */
function clearLocalSession() {
  try {
    localStorage.removeItem(SESSION_USER_KEY);
    for (const key of Object.keys(localStorage)) {
      if (PRIVATE_KEY_PREFIXES.some((prefix) => key.startsWith(prefix))) localStorage.removeItem(key);
    }
    sessionStorage.removeItem('wf_session_unlocked'); // residuo de versiones anteriores
  } catch {
    /* almacenamiento no disponible */
  }
}

// ---------------------------------------------------------------------------
// Aritmética de saldos (idéntica a server/models.js -> signedAccountDelta)
// ---------------------------------------------------------------------------
const roundBalance = (value, currency) => (currency === 'COP' ? Math.round(value) : Math.round(value * 100) / 100);

function txDelta(account, tx, rate) {
  const usd = Number(tx.amount) || 0;
  let magnitude = usd;
  if (account.currency === 'COP') {
    const original = Number(tx.originalAmount);
    magnitude = tx.currency === 'COP' && Number.isFinite(original) ? original : usd * rate;
  }
  return tx.type === 'income' ? magnitude : -magnitude;
}

/** Aplica una lista de efectos `[transacción, signo]` sobre las cuentas (signo -1 revierte el movimiento). */
function applyTxEffects(accounts, effects, rate) {
  return accounts.map((account) => {
    let delta = 0;
    for (const [tx, sign] of effects) {
      if (tx && tx.accountId === account.id) delta += sign * txDelta(account, tx, rate);
    }
    return delta === 0 ? account : { ...account, balance: roundBalance(account.balance + delta, account.currency) };
  });
}

const SplashScreen = ({ message }) => (
  <div className="min-h-[100dvh] flex flex-col items-center justify-center gap-5 bg-[#09080E] px-6 text-center select-none">
    <div className="w-[60px] h-[60px] rounded-[20px] bg-gradient-to-br from-purple-600 to-fuchsia-600 flex items-center justify-center border border-white/20 shadow-neon-purple animate-glow-pulse">
      <Wallet className="w-[30px] h-[30px] text-white" aria-hidden="true" />
    </div>
    <div>
      <p className="font-extrabold text-[17px] tracking-tight text-white">WALLET FLOW</p>
      <p className="mt-1.5 text-xs text-zinc-400" role="status">
        {message}
      </p>
    </div>
  </div>
);

const OfflineScreen = ({ onRetry }) => (
  <div className="min-h-[100dvh] flex flex-col items-center justify-center gap-5 bg-[#09080E] px-6 text-center">
    <div className="w-14 h-14 rounded-2xl bg-white/[0.05] border border-white/15 flex items-center justify-center">
      <WifiOff className="w-6 h-6 text-purple-300" aria-hidden="true" />
    </div>
    <div className="max-w-xs">
      <h1 className="text-lg font-black text-white">No pudimos conectar</h1>
      <p className="mt-1.5 text-sm text-zinc-400">Revisa tu conexión a internet e inténtalo de nuevo.</p>
    </div>
    <button
      type="button"
      onClick={onRetry}
      className="liquid-button-primary min-h-[48px] px-6 text-sm font-bold flex items-center gap-2 cursor-pointer"
    >
      <RefreshCw className="w-4 h-4" aria-hidden="true" />
      <span>Reintentar</span>
    </button>
  </div>
);

const ViewFallback = ({ label }) => (
  <div className="liquid-glass p-8 text-center text-purple-300 animate-pulse text-xs">{label}</div>
);

export function App() {
  const [boot] = useState(readCachedSession);

  // Sesión: 'loading' | 'guest' | 'authed' | 'offline'
  const [authStatus, setAuthStatus] = useState(boot?.snapshot ? 'authed' : 'loading');
  const [authNotice, setAuthNotice] = useState('');
  const [currentUser, setCurrentUser] = useState(boot?.user ?? null);

  const [activeTab, setActiveTab] = useState('dashboard');
  const [timeframe, setTimeframe] = useState('monthly');
  const [selectedYear, setSelectedYear] = useState(() => String(new Date().getFullYear()));

  const [currency, setCurrency] = useState(boot?.user?.currency || 'USD');
  const [exchangeRate, setExchangeRate] = useState(Number(boot?.user?.exchangeRate) || DEFAULT_USD_COP_RATE);

  const [accounts, setAccounts] = useState(() => asArray(boot?.snapshot?.accounts));
  const [transactions, setTransactions] = useState(() => asArray(boot?.snapshot?.transactions));
  const [subscriptions, setSubscriptions] = useState(() => asArray(boot?.snapshot?.subscriptions));
  const [debts, setDebts] = useState(() => asArray(boot?.snapshot?.debts));

  const [selectedAccountId, setSelectedAccountId] = useState(null);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [modalInitialType, setModalInitialType] = useState(null);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const toastTimerRef = useRef(null);
  const syncSeqRef = useRef(0);
  const lastSyncAtRef = useRef(0);
  const resyncTimerRef = useRef(null);
  const isChargingRef = useRef(false);
  const userRef = useRef(currentUser);
  userRef.current = currentUser;

  const rate = exchangeRate || DEFAULT_USD_COP_RATE;

  const showToast = useCallback((message) => {
    clearTimeout(toastTimerRef.current);
    setToastMessage(message);
    toastTimerRef.current = setTimeout(() => setToastMessage(null), TOAST_DURATION_MS);
  }, []);

  // ----------------- SINCRONIZACIÓN CON EL SERVIDOR -----------------
  const applyState = useCallback((state) => {
    setCurrentUser(state.user);
    setCurrency(state.user.currency || 'USD');
    setExchangeRate(Number(state.user.exchangeRate) || DEFAULT_USD_COP_RATE);
    setAccounts(asArray(state.accounts));
    setTransactions(asArray(state.transactions));
    setSubscriptions(asArray(state.subscriptions));
    setDebts(asArray(state.debts));
    setAuthStatus('authed');
    setAuthNotice('');
    lastSyncAtRef.current = Date.now();
  }, []);

  /**
   * Descarga el estado del servidor y lo aplica solo si sigue siendo válido:
   *  - se descarta si hubo una lectura más reciente (respuestas fuera de orden), y
   *  - se descarta si hay o hubo escrituras desde que inició (no pisar cambios optimistas con datos viejos).
   * `force` se usa al hidratar tras el login, cuando aún no existe estado local que proteger.
   */
  const refresh = useCallback(
    async ({ force = false } = {}) => {
      if (!force && api.isWriting) return false;
      const seq = ++syncSeqRef.current;
      const epoch = api.writeEpoch;
      try {
        const state = await api.getState();
        if (seq !== syncSeqRef.current) return false;
        if (!force && (api.isWriting || epoch !== api.writeEpoch)) return false;
        applyState(state);
        return true;
      } catch (err) {
        if (err.status === 401) return false; // ya gestionado por onUnauthorized
        throw err;
      }
    },
    [applyState]
  );

  /** Resincroniza cuando no queden escrituras en vuelo (tras un guardado rechazado por el servidor). */
  const scheduleResync = useCallback(() => {
    clearTimeout(resyncTimerRef.current);
    resyncTimerRef.current = setTimeout(() => {
      if (api.isWriting) return scheduleResync();
      return refresh().catch(() => {});
    }, 400);
  }, [refresh]);

  const resetSession = useCallback((notice = '') => {
    clearLocalSession();
    clearTimeout(resyncTimerRef.current);
    syncSeqRef.current += 1; // invalida cualquier lectura en vuelo de la sesión anterior
    setCurrentUser(null);
    setAccounts([]);
    setTransactions([]);
    setSubscriptions([]);
    setDebts([]);
    setSelectedAccountId(null);
    setEditingTransaction(null);
    setIsTransactionModalOpen(false);
    setIsAccountModalOpen(false);
    setActiveTab('dashboard');
    setAuthNotice(notice);
    setAuthStatus('guest');
  }, []);

  // Manejadores globales del cliente API
  useEffect(() => {
    api.onUnauthorized(() => resetSession(userRef.current ? 'Tu sesión expiró. Inicia sesión de nuevo.' : ''));
    api.onWriteError((err) => {
      showToast(`⚠️ No se pudo guardar: ${err.message}`);
      scheduleResync();
    });
    return () => {
      api.onUnauthorized(null);
      api.onWriteError(null);
    };
  }, [resetSession, scheduleResync, showToast]);

  // Arranque: valida la cookie de sesión y carga los datos (la UI ya muestra la caché si existía)
  useEffect(() => {
    let cancelled = false;
    refresh({ force: true }).catch(() => {
      if (cancelled) return;
      if (boot?.snapshot) showToast('Sin conexión: mostrando tus últimos datos guardados');
      else setAuthStatus('offline');
    });
    return () => {
      cancelled = true;
      clearTimeout(toastTimerRef.current);
      clearTimeout(resyncTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sincronización al volver a la pestaña o recuperar la conexión (multi-dispositivo)
  useEffect(() => {
    if (authStatus !== 'authed') return undefined;

    const syncOnFocus = () => {
      if (document.visibilityState !== 'visible') return;
      if (Date.now() - lastSyncAtRef.current < FOCUS_SYNC_MIN_INTERVAL_MS) return;
      refresh().catch(() => {});
    };
    const syncOnOnline = () => {
      refresh()
        .then((applied) => applied && showToast('🌐 Conexión restablecida: datos sincronizados'))
        .catch(() => {});
    };

    document.addEventListener('visibilitychange', syncOnFocus);
    window.addEventListener('online', syncOnOnline);
    return () => {
      document.removeEventListener('visibilitychange', syncOnFocus);
      window.removeEventListener('online', syncOnOnline);
    };
  }, [authStatus, refresh, showToast]);

  // Instantánea local con debounce para arranque inmediato y consulta sin conexión
  useEffect(() => {
    if (authStatus !== 'authed' || !currentUser?.id) return undefined;
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(SESSION_USER_KEY, JSON.stringify(currentUser));
        localStorage.setItem(
          snapshotKey(currentUser.id),
          JSON.stringify({ accounts, transactions, subscriptions, debts, currency, exchangeRate, updatedAt: Date.now() })
        );
      } catch {
        /* cuota excedida o almacenamiento no disponible */
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [authStatus, accounts, transactions, subscriptions, debts, currency, exchangeRate, currentUser]);

  // ----------------- SESIÓN -----------------
  const hydrate = useCallback(async () => {
    setAuthStatus('loading');
    try {
      await refresh({ force: true });
      return true;
    } catch {
      setAuthStatus('offline');
      return false;
    }
  }, [refresh]);

  const handleAuthenticated = useCallback(
    async (user) => {
      setCurrentUser(user);
      if (await hydrate()) showToast(`Hola, ${user.displayName || user.username} 👋`);
    },
    [hydrate, showToast]
  );

  const handleLogout = useCallback(async () => {
    if (!window.confirm('¿Cerrar sesión en este dispositivo? Tendrás que ingresar tu usuario y PIN de nuevo.')) return;
    await api.logout();
    resetSession();
  }, [resetSession]);

  // ----------------- PREFERENCIAS DE DIVISA -----------------
  const handleSetCurrency = useCallback((nextCurrency) => {
    setCurrency(nextCurrency);
    setCurrentUser((prev) => (prev ? { ...prev, currency: nextCurrency } : prev));
    api.updateProfile({ currency: nextCurrency });
  }, []);

  const handleSetExchangeRate = useCallback((nextRate) => {
    setExchangeRate(nextRate);
    setCurrentUser((prev) => (prev ? { ...prev, exchangeRate: nextRate } : prev));
    api.updateProfile({ exchangeRate: nextRate });
  }, []);

  // ----------------- MOVIMIENTOS (actualización optimista + persistencia atómica en servidor) -----------------
  const handleSaveTransaction = (txData) => {
    if (txData.id) {
      const prevTx = transactions.find((t) => t.id === txData.id);
      if (!prevTx) return;
      const updatedTx = { ...prevTx, ...txData };

      setTransactions((prev) => prev.map((t) => (t.id === updatedTx.id ? updatedTx : t)));
      setAccounts((prev) => applyTxEffects(prev, [[prevTx, -1], [updatedTx, 1]], rate));
      setEditingTransaction(null);
      api.updateTransaction(updatedTx);
      showToast(`Movimiento actualizado: ${updatedTx.title}`);
      return;
    }

    const newTx = { ...txData, id: createId('tx') };
    setTransactions((prev) => [newTx, ...prev]);
    setAccounts((prev) => applyTxEffects(prev, [[newTx, 1]], rate));
    api.createTransaction(newTx);
    showToast(`Movimiento guardado: ${newTx.title}`);
  };

  const handleDeleteTransaction = (txId) => {
    const prevTx = transactions.find((t) => t.id === txId);
    if (!prevTx) return;

    setTransactions((prev) => prev.filter((t) => t.id !== txId));
    setAccounts((prev) => applyTxEffects(prev, [[prevTx, -1]], rate));
    setEditingTransaction(null);
    api.deleteTransaction(txId);
    showToast('Movimiento eliminado');
  };

  const handleSaveTransfer = ({ fromAccountId, toAccountId, amount, currency: trfCur, date, notes }) => {
    const fromAcc = accounts.find((a) => a.id === fromAccountId);
    const toAcc = accounts.find((a) => a.id === toAccountId);
    const numAmt = Number(amount) || 0;
    if (!fromAcc || !toAcc || fromAcc.id === toAcc.id || numAmt <= 0) return;

    const base = {
      amount: trfCur === 'COP' ? Math.round((numAmt / rate) * 100) / 100 : Math.round(numAmt * 100) / 100,
      originalAmount: numAmt,
      currency: trfCur,
      category: 'Transferencias & Cambio',
      date: date || todayLocalISO(),
      isAntExpense: false,
    };
    const outTx = {
      ...base,
      id: createId('tx-trf-out'),
      title: `Transferencia a ${toAcc.name}`,
      type: 'expense',
      accountId: fromAccountId,
      notes: notes || `Transferencia enviada hacia ${toAcc.name}`,
    };
    const inTx = {
      ...base,
      id: createId('tx-trf-in'),
      title: `Transferencia desde ${fromAcc.name}`,
      type: 'income',
      accountId: toAccountId,
      notes: notes || `Transferencia recibida desde ${fromAcc.name}`,
    };

    setTransactions((prev) => [outTx, inTx, ...prev]);
    setAccounts((prev) => applyTxEffects(prev, [[outTx, 1], [inTx, 1]], rate));
    // Los ids viajan al servidor para que el estado optimista y el persistido coincidan.
    api.createTransfer({
      fromAccountId,
      toAccountId,
      amount: numAmt,
      currency: trfCur,
      date: base.date,
      notes,
      outId: outTx.id,
      inId: inTx.id,
    });
    showToast(`Transferencia realizada: ${fromAcc.name} ➔ ${toAcc.name}`);
  };

  /**
   * Ejecuta los gastos fijos vencidos del mes. Es seguro ante doble disparo: un candado local evita la
   * reentrada y el id determinista `auto-sub-<sub>-<mes>` hace el alta idempotente en el servidor
   * (dos dispositivos cobrando a la vez generan un solo cargo).
   */
  const handleExecuteDueSubscriptions = useCallback(
    async (subsToProcess, accsToProcess, txsToProcess, forceManual = false) => {
      if (isChargingRef.current || !currentUser) return { executed: 0 };
      if (!forceManual && localStorage.getItem(`wf_autocharge_enabled_${currentUser.id}`) === 'false') {
        return { executed: 0, reason: 'global_paused' };
      }

      const now = new Date();
      const monthPrefix = todayLocalISO(now).slice(0, 7);
      const today = now.getDate();
      const knownTxs = txsToProcess || transactions;
      const knownAccounts = accsToProcess || accounts;

      const dueSubs = (subsToProcess || subscriptions).filter(
        (sub) =>
          sub.active &&
          sub.autoCharge !== false &&
          today >= (Number(sub.billingDay) || 1) &&
          !isSubscriptionChargedInMonth(sub, knownTxs, monthPrefix)
      );
      if (dueSubs.length === 0) return { executed: 0 };

      const newTxs = [];
      for (const sub of dueSubs) {
        const targetAcc = knownAccounts.find((a) => a.id === sub.accountId) || knownAccounts[0];
        if (!targetAcc) continue; // sin cuentas no hay dónde cargar el gasto
        const billingDay = Number(sub.billingDay) || 1;
        const amount = Number(sub.amount) || 0;
        if (amount <= 0) continue;
        newTxs.push({
          id: `auto-sub-${sub.id}-${monthPrefix}`,
          subscriptionId: sub.id,
          title: `${sub.name} (Gasto Fijo)`,
          amount,
          originalAmount: amount,
          currency: 'USD',
          type: 'expense',
          category: sub.category || 'Suscripciones & Fijos',
          accountId: targetAcc.id,
          date: `${monthPrefix}-${String(Math.min(28, billingDay)).padStart(2, '0')}`,
          isRecurringAuto: true,
          notes: `Cobro automático recurrente ejecutado el día ${billingDay}`,
        });
      }
      if (newTxs.length === 0) return { executed: 0 };

      isChargingRef.current = true;
      try {
        setTransactions((prev) => {
          const existing = new Set(prev.map((t) => t.id));
          return [...newTxs.filter((t) => !existing.has(t.id)), ...prev];
        });
        setAccounts((prev) => applyTxEffects(prev, newTxs.map((tx) => [tx, 1]), rate));
        // El servidor ajusta el saldo de forma atómica junto con cada movimiento.
        await Promise.all(newTxs.map((tx) => api.createTransaction(tx)));
      } finally {
        isChargingRef.current = false;
      }

      showToast(`⚡ ${newTxs.length} gasto(s) fijo(s) ejecutado(s) según su fecha de cobro`);
      return { executed: newTxs.length };
    },
    [subscriptions, accounts, transactions, currentUser, rate, showToast]
  );

  const handleSaveAccount = (newAcc) => {
    setAccounts((prev) => [newAcc, ...prev]);
    api.createAccount(newAcc);
    showToast(`Cuenta guardada: ${newAcc.name}`);
  };

  // ----------------- MODALES -----------------
  const openTransactionModal = useCallback((tx = null, initialType = null) => {
    setEditingTransaction(tx);
    setModalInitialType(initialType);
    setIsTransactionModalOpen(true);
  }, []);
  const handleOpenNewTransaction = useCallback(() => openTransactionModal(), [openTransactionModal]);
  const handleOpenEditTransaction = useCallback((tx) => openTransactionModal(tx), [openTransactionModal]);
  const handleOpenTransfer = useCallback(() => openTransactionModal(null, 'transfer'), [openTransactionModal]);
  const handleCloseTransactionModal = useCallback(() => {
    setIsTransactionModalOpen(false);
    setEditingTransaction(null);
    setModalInitialType(null);
  }, []);
  const handleOpenNewAccount = useCallback(() => setIsAccountModalOpen(true), []);

  // ----------------- DERIVADOS -----------------
  const availableYears = useMemo(() => {
    const years = new Set();
    for (const t of transactions) if (t.date?.length >= 4) years.add(t.date.slice(0, 4));
    if (years.size === 0) years.add(String(new Date().getFullYear()));
    return [...Array.from(years).sort((a, b) => b.localeCompare(a)), 'all'];
  }, [transactions]);

  // Si el año seleccionado deja de existir en los datos (p. ej. tras importar), se elige el más reciente
  useEffect(() => {
    if (!availableYears.includes(selectedYear)) setSelectedYear(availableYears[0]);
  }, [availableYears, selectedYear]);

  const netWorth = useMemo(
    () =>
      accounts.reduce((sum, a) => {
        const balance = Number(a.balance) || 0;
        return sum + (a.currency === 'COP' ? balance / rate : balance);
      }, 0),
    [accounts, rate]
  );

  /**
   * Vista de movimientos para analítica: el valor en USD de cada movimiento en pesos se deriva de su monto
   * original con la tasa fija vigente. Así todos los totales responden al cambiar la tasa en Ajustes y
   * USD <-> COP nunca acumula errores de redondeo. Los datos persistidos (`transactions`) no se alteran.
   */
  const viewTransactions = useMemo(
    () =>
      transactions.map((t) => {
        const usd = txUsdValue(t, rate);
        return usd === t.amount ? t : { ...t, amount: usd };
      }),
    [transactions, rate]
  );

  const antAlertCount = useMemo(() => transactions.filter((t) => t.isAntExpense).length, [transactions]);

  // ----------------- RENDER -----------------
  if (authStatus === 'guest') return <AuthScreen onAuthenticated={handleAuthenticated} notice={authNotice} />;
  if (authStatus === 'offline') return <OfflineScreen onRetry={hydrate} />;
  if (authStatus === 'loading' || !currentUser) {
    return <SplashScreen message={currentUser ? 'Abriendo tu bóveda financiera…' : 'Verificando tu sesión…'} />;
  }

  return (
    <div className="min-h-[100dvh] bg-[#09080E] text-white flex flex-col font-sans selection:bg-purple-500/30 selection:text-purple-200 overflow-x-clip">
      {/* Luces ambientales Liquid Glass */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
        <div className="absolute -top-36 -left-36 w-[32rem] h-[32rem] rounded-full bg-gradient-to-br from-purple-600/25 to-indigo-600/15 blur-[130px] animate-float-orb-1" />
        <div className="absolute top-1/4 -right-36 w-[30rem] h-[30rem] rounded-full bg-gradient-to-br from-fuchsia-600/20 to-purple-800/15 blur-[140px] animate-float-orb-2" />
        <div className="absolute -bottom-36 left-1/4 w-[34rem] h-[34rem] rounded-full bg-gradient-to-tr from-indigo-700/[0.22] to-fuchsia-900/[0.18] blur-[150px] animate-float-orb-1" />
      </div>

      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenNewTransaction={handleOpenNewTransaction}
        netWorth={netWorth}
        antExpenseAlertCount={antAlertCount}
        currency={currency}
        exchangeRate={exchangeRate}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

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
          onLogout={handleLogout}
          onOpenNewTransaction={handleOpenNewTransaction}
          onNavigateAI={() => setActiveTab('ai-advisor')}
        />

        <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 lg:p-8 pb-[calc(6.5rem+env(safe-area-inset-bottom,0px))] lg:pb-8 min-w-0">
          {activeTab === 'dashboard' && (
            <DashboardView
              accounts={accounts}
              transactions={viewTransactions}
              timeframe={timeframe}
              setTimeframe={setTimeframe}
              selectedYear={selectedYear}
              currency={currency}
              exchangeRate={exchangeRate}
              onOpenNewTransaction={handleOpenNewTransaction}
              onEditTransaction={handleOpenEditTransaction}
              onDeleteTransaction={handleDeleteTransaction}
              onOpenNewAccount={handleOpenNewAccount}
              onSelectAccount={(accId) => {
                setSelectedAccountId(accId);
                setActiveTab('accounts');
              }}
              onNavigateTab={setActiveTab}
            />
          )}

          {activeTab === 'accounts' && (
            <AccountsView
              currentUser={currentUser}
              accounts={accounts}
              setAccounts={setAccounts}
              transactions={viewTransactions}
              timeframe={timeframe}
              setTimeframe={setTimeframe}
              selectedYear={selectedYear}
              currency={currency}
              exchangeRate={exchangeRate}
              onOpenNewAccount={handleOpenNewAccount}
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
              transactions={viewTransactions}
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
              transactions={viewTransactions}
              onLogPaymentTransaction={handleSaveTransaction}
              onExecuteDueSubscriptions={handleExecuteDueSubscriptions}
              onOpenNewTransaction={handleOpenNewTransaction}
            />
          )}

          {activeTab === 'ai-advisor' && (
            <React.Suspense fallback={<ViewFallback label="Cargando Smart AI Advisor..." />}>
              <AIAdvisorView
                userId={currentUser.id}
                accounts={accounts}
                transactions={viewTransactions}
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
            <React.Suspense fallback={<ViewFallback label="Cargando Panel de Ajustes..." />}>
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
                onOpenNewAccount={handleOpenNewAccount}
                onLogout={handleLogout}
                showToast={showToast}
              />
            </React.Suspense>
          )}
        </main>
      </div>

      <TransactionModal
        isOpen={isTransactionModalOpen}
        onClose={handleCloseTransactionModal}
        accounts={accounts}
        currency={currency}
        exchangeRate={exchangeRate}
        onSaveTransaction={handleSaveTransaction}
        onSaveTransfer={handleSaveTransfer}
        onDeleteTransaction={handleDeleteTransaction}
        editingTransaction={editingTransaction}
        initialType={modalInitialType}
      />

      <AccountModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        currency={currency}
        exchangeRate={exchangeRate}
        onSaveAccount={handleSaveAccount}
      />

      {/* Notificación flotante accesible (respeta safe-area en móvil) */}
      <div aria-live="polite" role="status">
        {toastMessage && (
          <div className="fixed top-[max(1rem,calc(env(safe-area-inset-top,0px)+0.75rem))] inset-x-3 sm:inset-x-auto sm:right-5 z-[60] bg-[#161324]/[0.98] border border-purple-500/40 text-purple-100 px-4 py-3 rounded-2xl shadow-liquid-purple text-xs font-semibold flex items-center gap-2.5 animate-fade-in max-w-md mx-auto sm:mx-0">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" aria-hidden="true" />
            <span className="min-w-0 break-words leading-snug">{toastMessage}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
