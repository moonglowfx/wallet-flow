import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Settings,
  Shield,
  KeyRound,
  User,
  Coins,
  Wallet,
  CalendarClock,
  HandCoins,
  Trash2,
  Edit2,
  Plus,
  Download,
  Upload,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Save,
  Lock,
  Layers,
  Sparkles,
  CreditCard,
  Banknote,
  Building2,
  X,
  ShieldCheck,
  Eye,
  FileText,
  Check,
  Database,
  HelpCircle,
  ArrowUpRight,
  ArrowDownLeft,
  FolderOpen,
  HardDrive,
  Search,
} from 'lucide-react';
import { formatCurrency, DEFAULT_USD_COP_RATE } from '../data/finance.js';
import { api } from '../services/api.js';
import { APP_VERSION, APP_BUILD_DATE, APP_EDITION } from '../version.js';

export const SettingsView = ({
  currentUser,
  setCurrentUser,
  currency,
  setCurrency,
  exchangeRate,
  setExchangeRate,
  accounts = [],
  setAccounts,
  transactions = [],
  setTransactions,
  subscriptions = [],
  setSubscriptions,
  debts = [],
  setDebts,
  onOpenNewAccount,
  onLogout,
  showToast,
}) => {
  const [activeTab, setActiveTab] = useState('seguridad'); // seguridad, perfil, divisas, cuentas, suscripciones, deudas, datos
  const [isSyncing, setIsSyncing] = useState(false);

  // PIN Change State
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinSuccess, setPinSuccess] = useState('');
  const [isSavingPin, setIsSavingPin] = useState(false);

  // Profile Edit State
  const [profileName, setProfileName] = useState(currentUser?.displayName || currentUser?.username || '');
  const [profileRole, setProfileRole] = useState(currentUser?.role || '');

  // Currency Edit State
  const [customRate, setCustomRate] = useState(exchangeRate.toString());

  // Account Edit Modal State
  const [editingAccount, setEditingAccount] = useState(null);
  const [accName, setAccName] = useState('');
  const [accInstitution, setAccInstitution] = useState('');
  const [accBalance, setAccBalance] = useState('');
  const [accLimit, setAccLimit] = useState('');
  const [accNumber, setAccNumber] = useState('');

  // Subscription Edit Modal State
  const [editingSub, setEditingSub] = useState(null);
  const [subName, setSubName] = useState('');
  const [subCategory, setSubCategory] = useState('');
  const [subAmount, setSubAmount] = useState('');
  const [subBillingDay, setSubBillingDay] = useState('');

  // Debt Edit Modal State
  const [editingDebt, setEditingDebt] = useState(null);
  const [debtTitle, setDebtTitle] = useState('');
  const [debtCounterparty, setDebtCounterparty] = useState('');
  const [debtTotal, setDebtTotal] = useState('');
  const [debtPaid, setDebtPaid] = useState('');
  const [debtInterest, setDebtInterest] = useState('');
  const [debtDueDate, setDebtDueDate] = useState('');

  // Import Manual Changes & Persistence State
  const fileInputRef = useRef(null);
  const [isBreakdownModalOpen, setIsBreakdownModalOpen] = useState(false);
  const [pendingImportData, setPendingImportData] = useState(null);
  const [importMode, setImportMode] = useState('replace'); // 'replace' | 'merge'
  const [isApplyingImport, setIsApplyingImport] = useState(false);
  const [breakdownActiveTab, setBreakdownActiveTab] = useState('cuentas'); // 'cuentas', 'transacciones', 'suscripciones', 'deudas'
  const [txSearchTerm, setTxSearchTerm] = useState('');
  const [dbLiveInfo, setDbLiveInfo] = useState(null);
  const [isLoadingLiveInfo, setIsLoadingLiveInfo] = useState(false);

  // Prevent background body scroll when any modal in Settings is open on mobile
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const isAnyModalOpen = isBreakdownModalOpen || editingAccount || editingSub || editingDebt;
    if (isAnyModalOpen) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [isBreakdownModalOpen, editingAccount, editingSub, editingDebt]);

  // ----------------- PIN CHANGE HANDLER -----------------
  const handleUpdatePin = async (e) => {
    e.preventDefault();
    if (isSavingPin) return;
    setPinError('');
    setPinSuccess('');

    if (!/^\d{4}$/.test(newPin)) {
      setPinError('El nuevo PIN debe ser exactamente de 4 dígitos numéricos.');
      return;
    }
    if (newPin !== confirmPin) {
      setPinError('La confirmación del nuevo PIN no coincide.');
      return;
    }
    if (newPin === currentPin) {
      setPinError('El nuevo PIN debe ser distinto al actual.');
      return;
    }

    setIsSavingPin(true);
    try {
      // El servidor verifica el PIN actual, guarda solo el hash y cierra las demás sesiones abiertas.
      await api.changePin(currentPin, newPin);
      setPinSuccess('¡PIN actualizado! Se cerró la sesión en tus otros dispositivos.');
      setCurrentPin('');
      setNewPin('');
      setConfirmPin('');
      if (showToast) showToast('PIN de seguridad actualizado');
    } catch (err) {
      setPinError(err?.message || 'No se pudo actualizar el PIN.');
    } finally {
      setIsSavingPin(false);
    }
  };

  // ----------------- PROFILE HANDLER -----------------
  const handleSaveProfile = (e) => {
    e.preventDefault();
    const displayName = profileName.trim() || currentUser.username;
    const role = profileRole.trim() || currentUser.role;
    if (setCurrentUser) {
      setCurrentUser((prev) => ({ ...prev, displayName, role }));
    }
    api.updateProfile({ displayName, role });
    if (showToast) showToast('Perfil actualizado');
  };

  // ----------------- CURRENCY HANDLER -----------------
  const handleSaveCurrency = (e) => {
    e.preventDefault();
    const rateNum = parseFloat(customRate);
    if (rateNum && rateNum > 0) {
      setExchangeRate(rateNum);
      if (showToast) showToast(`Tipo de cambio guardado: 1 USD = $${rateNum.toLocaleString('es-CO')} COP`);
    }
  };

  // ----------------- ACCOUNT EDIT HANDLERS -----------------
  const openEditAccount = (acc) => {
    setEditingAccount(acc);
    setAccName(acc.name || '');
    setAccInstitution(acc.institution || '');
    setAccBalance((acc.balance || 0).toString());
    setAccLimit((acc.creditLimit || '').toString());
    setAccNumber(acc.accountNumber || '');
  };

  const handleSaveEditedAccount = (e) => {
    e.preventDefault();
    if (!editingAccount) return;

    let editedObj = null;
    const parsedBal = accBalance === '' ? 0 : parseFloat(accBalance);
    const validBal = Number.isFinite(parsedBal) ? parsedBal : 0;
    const parsedLim = parseFloat(accLimit);
    const validLim = Number.isFinite(parsedLim) ? parsedLim : editingAccount.creditLimit;

    const updated = accounts.map((a) => {
      if (a.id === editingAccount.id) {
        const cur = a.currency || 'USD';
        editedObj = {
          ...a,
          name: accName.trim() || a.name,
          institution: accInstitution.trim() || a.institution,
          balance: cur === 'COP' ? Math.round(validBal) : Math.round(validBal * 100) / 100,
          creditLimit: a.type === 'credit' ? validLim : undefined,
          accountNumber: accNumber.trim() || a.accountNumber,
        };
        return editedObj;
      }
      return a;
    });

    setAccounts(updated);
    if (editedObj) {
      api
        .updateAccount(editedObj)
        .catch((err) => console.error('Error SQLite updateAccount:', err));
    }
    setEditingAccount(null);
    if (showToast) showToast('Cuenta modificada correctamente');
  };

  const handleDeleteAccount = (accId) => {
    if (window.confirm('¿Estás seguro de eliminar esta cuenta?')) {
      const updated = accounts.filter((a) => a.id !== accId);
      setAccounts(updated);
      api
        .deleteAccount(accId)
        .catch((err) => console.error('Error SQLite deleteAccount:', err));
      if (showToast) showToast('Cuenta eliminada');
    }
  };

  // ----------------- SUBSCRIPTION EDIT HANDLERS -----------------
  const openEditSub = (sub) => {
    setEditingSub(sub);
    setSubName(sub.name || '');
    setSubCategory(sub.category || '');
    setSubAmount((sub.amount || 0).toString());
    setSubBillingDay((sub.billingDay || 1).toString());
  };

  const handleSaveEditedSub = (e) => {
    e.preventDefault();
    if (!editingSub) return;

    let editedSub = null;
    const updated = subscriptions.map((s) => {
      if (s.id === editingSub.id) {
        editedSub = {
          ...s,
          name: subName.trim() || s.name,
          category: subCategory.trim() || s.category,
          amount: parseFloat(subAmount) || 0,
          billingDay: parseInt(subBillingDay, 10) || s.billingDay,
        };
        return editedSub;
      }
      return s;
    });

    setSubscriptions(updated);
    if (editedSub) {
      api
        .updateSubscription(editedSub)
        .catch((err) => console.error('Error SQLite updateSub:', err));
    }
    setEditingSub(null);
    if (showToast) showToast('Suscripción actualizada');
  };

  const handleDeleteSub = (subId) => {
    if (window.confirm('¿Eliminar esta suscripción?')) {
      const updated = subscriptions.filter((s) => s.id !== subId);
      setSubscriptions(updated);
      api
        .deleteSubscription(subId)
        .catch((err) => console.error('Error SQLite deleteSub:', err));
      if (showToast) showToast('Suscripción eliminada');
    }
  };

  // ----------------- DEBT EDIT HANDLERS -----------------
  const openEditDebt = (debt) => {
    setEditingDebt(debt);
    setDebtTitle(debt.title || '');
    setDebtCounterparty(debt.counterparty || '');
    setDebtTotal((debt.totalAmount || 0).toString());
    setDebtPaid((debt.paidAmount || 0).toString());
    setDebtInterest((debt.interestRate || 0).toString());
    setDebtDueDate(debt.dueDate || '');
  };

  const handleSaveEditedDebt = (e) => {
    e.preventDefault();
    if (!editingDebt) return;

    let editedDebt = null;
    const updated = debts.map((d) => {
      if (d.id === editingDebt.id) {
        editedDebt = {
          ...d,
          title: debtTitle.trim() || d.title,
          counterparty: debtCounterparty.trim() || d.counterparty,
          totalAmount: parseFloat(debtTotal) || 0,
          paidAmount: parseFloat(debtPaid) || 0,
          interestRate: parseFloat(debtInterest) || 0,
          dueDate: debtDueDate || d.dueDate,
        };
        return editedDebt;
      }
      return d;
    });

    setDebts(updated);
    if (editedDebt) {
      api
        .updateDebt(editedDebt)
        .catch((err) => console.error('Error SQLite updateDebt:', err));
    }
    setEditingDebt(null);
    if (showToast) showToast('Deuda actualizada');
  };

  const handleDeleteDebt = (debtId) => {
    if (window.confirm('¿Eliminar este registro de deuda?')) {
      const updated = debts.filter((d) => d.id !== debtId);
      setDebts(updated);
      api
        .deleteDebt(debtId)
        .catch((err) => console.error('Error SQLite deleteDebt:', err));
      if (showToast) showToast('Deuda eliminada');
    }
  };

  // ----------------- MANUAL CHANGES PERSISTENCE TO DATABASE -----------------
  const handleSyncManualChanges = async () => {
    setIsSyncing(true);
    try {
      await api.bulkImport(
        {
          accounts,
          transactions,
          subscriptions,
          debts,
        },
        'replace'
      );

      if (typeof window !== 'undefined') {
        localStorage.setItem(
          `wf_saved_state_${currentUser.id}`,
          JSON.stringify({
            accounts,
            transactions,
            subscriptions,
            debts,
            updatedAt: Date.now(),
          })
        );
      }

      if (showToast) {
        showToast('✅ Cambios manuales guardados y sincronizados en la base de datos');
      }
    } catch (err) {
      console.error('Error al sincronizar a SQLite:', err);
      if (showToast) showToast('⚠️ Cambios respaldados localmente');
    } finally {
      setTimeout(() => setIsSyncing(false), 500);
    }
  };

  // ----------------- LIVE DATABASE INTEGRITY & INFO -----------------
  const fetchLiveDbInfo = async () => {
    setIsLoadingLiveInfo(true);
    try {
      const info = await api.getDatabaseInfo();
      if (info) setDbLiveInfo(info);
    } catch (_) {
    } finally {
      setIsLoadingLiveInfo(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'datos') {
      fetchLiveDbInfo();
    }
  }, [activeTab]);

  // ----------------- DATA BACKUP, BREAKDOWN & PERSISTENCE -----------------
  const handleExportBackup = () => {
    const backupData = {
      user: currentUser,
      exportDate: new Date().toISOString(),
      currency,
      exchangeRate,
      accounts,
      transactions,
      subscriptions,
      debts,
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wallet-flow-${currentUser.id}-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    if (showToast) showToast('Respaldo descargado exitosamente');
  };

  const prepareAndOpenBreakdown = (rawJson, sourceLabel) => {
    if (!rawJson || typeof rawJson !== 'object') {
      alert('El contenido no es un objeto JSON válido');
      return;
    }

    // Support both direct structure and server snapshot structure { timestamp, data: { ... } }
    const container =
      rawJson.data && typeof rawJson.data === 'object' && (rawJson.data.accounts || rawJson.data.transactions)
        ? rawJson.data
        : rawJson;

    let parsedAccounts = Array.isArray(container.accounts) ? [...container.accounts] : [];
    let parsedTxs = Array.isArray(container.transactions) ? [...container.transactions] : [];
    let parsedSubs = Array.isArray(container.subscriptions) ? [...container.subscriptions] : [];
    let parsedDebts = Array.isArray(container.debts) ? [...container.debts] : [];

    // Filter by user if multi-user snapshot
    if (currentUser?.id) {
      const userAccounts = parsedAccounts.filter((a) => !a.userId || a.userId === currentUser.id);
      if (userAccounts.length > 0) {
        parsedAccounts = userAccounts;
        parsedTxs = parsedTxs.filter((t) => !t.userId || t.userId === currentUser.id);
        parsedSubs = parsedSubs.filter((s) => !s.userId || s.userId === currentUser.id);
        parsedDebts = parsedDebts.filter((d) => !d.userId || d.userId === currentUser.id);
      }
    }

    if (
      parsedAccounts.length === 0 &&
      parsedTxs.length === 0 &&
      parsedSubs.length === 0 &&
      parsedDebts.length === 0
    ) {
      alert('El archivo o respaldo seleccionado no contiene cuentas, transacciones, suscripciones o deudas para importar.');
      return;
    }

    const detectedCurrency =
      container.currency ||
      rawJson.currency ||
      (container.user && container.user.currency) ||
      currentUser.currency ||
      currency ||
      'USD';

    const detectedRate = Number(
      container.exchangeRate ||
      rawJson.exchangeRate ||
      (container.user && container.user.exchangeRate) ||
      exchangeRate ||
      DEFAULT_USD_COP_RATE
    );

    const normalizedData = {
      sourceName: sourceLabel,
      rawUser: container.user || rawJson.user || null,
      timestamp: rawJson.timestamp || rawJson.exportDate || rawJson.updatedAt || new Date().toISOString(),
      accounts: parsedAccounts,
      transactions: parsedTxs,
      subscriptions: parsedSubs,
      debts: parsedDebts,
      currency: detectedCurrency,
      exchangeRate: detectedRate,
    };

    setPendingImportData(normalizedData);
    setTxSearchTerm('');
    setBreakdownActiveTab('cuentas');
    setIsBreakdownModalOpen(true);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const rawJson = JSON.parse(event.target.result);
        prepareAndOpenBreakdown(rawJson, `Archivo: ${file.name}`);
      } catch (err) {
        alert('Error al leer o procesar el archivo JSON: ' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleLoadFromLocalStorage = () => {
    try {
      const saved = localStorage.getItem(`wf_saved_state_${currentUser.id}`);
      if (!saved) {
        if (showToast) showToast('No se encontró un respaldo local guardado en este navegador.');
        else alert(`No se encontró un respaldo local guardado en este navegador para ${currentUser.username}.`);
        return;
      }
      const rawJson = JSON.parse(saved);
      prepareAndOpenBreakdown(rawJson, `Respaldo Local (${currentUser.username})`);
    } catch (err) {
      alert('Error al leer el respaldo local: ' + err.message);
    }
  };

  const handleLoadLatestServerSnapshot = async () => {
    try {
      const snapshot = await api.getLatestSnapshot();
      prepareAndOpenBreakdown(snapshot, 'Snapshot del Servidor (Turso / SQLite)');
    } catch (err) {
      alert('Error al cargar snapshot del servidor: ' + err.message);
    }
  };

  const handleConfirmImport = async () => {
    if (!pendingImportData) return;
    setIsApplyingImport(true);

    try {
      let finalAccounts = pendingImportData.accounts;
      let finalTransactions = pendingImportData.transactions;
      let finalSubscriptions = pendingImportData.subscriptions;
      let finalDebts = pendingImportData.debts;

      if (importMode === 'merge') {
        const existingAccMap = new Map(accounts.map((a) => [a.id, a]));
        pendingImportData.accounts.forEach((a) => existingAccMap.set(a.id, a));
        finalAccounts = Array.from(existingAccMap.values());

        const existingTxMap = new Map(transactions.map((t) => [t.id, t]));
        pendingImportData.transactions.forEach((t) => existingTxMap.set(t.id, t));
        finalTransactions = Array.from(existingTxMap.values());

        const existingSubMap = new Map(subscriptions.map((s) => [s.id, s]));
        pendingImportData.subscriptions.forEach((s) => existingSubMap.set(s.id, s));
        finalSubscriptions = Array.from(existingSubMap.values());

        const existingDebtMap = new Map(debts.map((d) => [d.id, d]));
        pendingImportData.debts.forEach((d) => existingDebtMap.set(d.id, d));
        finalDebts = Array.from(existingDebtMap.values());
      }

      await api.bulkImport(
        {
          accounts: finalAccounts,
          transactions: finalTransactions,
          subscriptions: finalSubscriptions,
          debts: finalDebts,
          currency: pendingImportData.currency,
          exchangeRate: pendingImportData.exchangeRate,
        },
        importMode
      );

      setAccounts(finalAccounts);
      setTransactions(finalTransactions);
      setSubscriptions(finalSubscriptions);
      setDebts(finalDebts);

      if (pendingImportData.currency && setCurrency) {
        setCurrency(pendingImportData.currency);
      }
      if (pendingImportData.exchangeRate && setExchangeRate) {
        setExchangeRate(pendingImportData.exchangeRate);
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem(
          `wf_saved_state_${currentUser.id}`,
          JSON.stringify({
            user: currentUser,
            accounts: finalAccounts,
            transactions: finalTransactions,
            subscriptions: finalSubscriptions,
            debts: finalDebts,
            currency: pendingImportData.currency,
            exchangeRate: pendingImportData.exchangeRate,
            updatedAt: Date.now(),
          })
        );
      }

      setIsBreakdownModalOpen(false);
      setPendingImportData(null);
      fetchLiveDbInfo();

      if (showToast) {
        showToast(
          `✅ Persistencia exitosa: ${finalAccounts.length} cuentas y ${finalTransactions.length} movimientos guardados`
        );
      }
    } catch (err) {
      console.error('Error importando cambios a SQLite:', err);
      alert('Error al persistir cambios manuales en la base de datos: ' + err.message);
    } finally {
      setIsApplyingImport(false);
    }
  };

  const handleClearAllUserData = async () => {
    if (
      !window.confirm(
        `¿Confirmas que deseas BORRAR TODOS los movimientos, cuentas, suscripciones y deudas de ${currentUser.username}? Esta acción no se puede deshacer.`
      )
    ) {
      return;
    }
    try {
      await api.clearUserData();
      setAccounts([]);
      setTransactions([]);
      setSubscriptions([]);
      setDebts([]);
      fetchLiveDbInfo();
      if (showToast) showToast(`Datos de ${currentUser.username} eliminados`);
    } catch (err) {
      if (showToast) showToast(`⚠️ No se pudieron borrar los datos: ${err?.message || 'error de conexión'}`);
    }
  };

  // Metrics for Breakdown Modal
  const breakdownMetrics = useMemo(() => {
    if (!pendingImportData) return null;
    const { accounts: bAccs, transactions: bTxs, subscriptions: bSubs, debts: bDebts, exchangeRate: bRate } = pendingImportData;

    const totalBalanceUSD = bAccs.reduce((sum, a) => {
      const bal = Number(a.balance) || 0;
      return sum + (a.currency === 'COP' ? bal / bRate : bal);
    }, 0);

    const totalIncomeUSD = bTxs
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => {
        const amt = Number(t.amount) || 0;
        return sum + (t.currency === 'COP' ? amt / bRate : amt);
      }, 0);

    const totalExpenseUSD = bTxs
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => {
        const amt = Number(t.amount) || 0;
        return sum + (t.currency === 'COP' ? amt / bRate : amt);
      }, 0);

    const antExpensesCount = bTxs.filter((t) => t.isAntExpense).length;

    const sortedDates = bTxs
      .map((t) => t.date)
      .filter(Boolean)
      .sort();
    const minDate = sortedDates[0] || 'N/A';
    const maxDate = sortedDates[sortedDates.length - 1] || 'N/A';

    const monthlySubsUSD = bSubs.reduce((sum, s) => {
      const amt = Number(s.amount) || 0;
      return sum + (s.currency === 'COP' ? amt / bRate : amt);
    }, 0);

    const activeSubsCount = bSubs.filter((s) => s.active !== 0 && s.active !== false).length;

    const totalDebtsUSD = bDebts.reduce((sum, d) => {
      const amt = Number(d.totalAmount) || 0;
      return sum + (d.currency === 'COP' ? amt / bRate : amt);
    }, 0);

    const remainingDebtsUSD = bDebts.reduce((sum, d) => {
      const tot = Number(d.totalAmount) || 0;
      const paid = Number(d.paidAmount) || 0;
      const rem = Math.max(0, tot - paid);
      return sum + (d.currency === 'COP' ? rem / bRate : rem);
    }, 0);

    return {
      totalBalanceUSD,
      totalIncomeUSD,
      totalExpenseUSD,
      antExpensesCount,
      minDate,
      maxDate,
      monthlySubsUSD,
      activeSubsCount,
      totalDebtsUSD,
      remainingDebtsUSD,
    };
  }, [pendingImportData]);

  // Filtered transactions for Modal search
  const filteredBreakdownTxs = useMemo(() => {
    if (!pendingImportData || !pendingImportData.transactions) return [];
    if (!txSearchTerm.trim()) return pendingImportData.transactions;
    const term = txSearchTerm.toLowerCase();
    return pendingImportData.transactions.filter(
      (t) =>
        (t.title && t.title.toLowerCase().includes(term)) ||
        (t.category && t.category.toLowerCase().includes(term)) ||
        (t.notes && t.notes.toLowerCase().includes(term)) ||
        (t.date && t.date.includes(term))
    );
  }, [pendingImportData, txSearchTerm]);

  return (
    <div className="space-y-8 pb-12">
      {/* Hidden file input for importing manual changes & JSON backups */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".json,application/json"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Header Banner */}
      <div className="liquid-glass-purple p-4 sm:p-6 lg:p-8 space-y-4 relative overflow-hidden">
        <div className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full bg-purple-600/20 blur-3xl" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-neon-purple border border-white/30 shrink-0">
              <Settings className="w-5 h-5 sm:w-6 sm:h-6 animate-spin-slow" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg sm:text-2xl font-black text-white tracking-tight">
                Ajustes & Panel de Control Total
              </h2>
              <p className="text-xs text-zinc-300">
                Personaliza y edita cada aspecto de tu sesión en SQLite: PIN, perfil, divisas, cuentas, deudas y respaldos
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-purple-900/40 border border-purple-500/40 text-purple-200">
              Usuario: <strong className="text-white">{currentUser.username}</strong>
            </span>

            {/* Version Label Badge */}
            <span
              className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-white/[0.05] border border-purple-400/30 text-purple-200 flex items-center gap-1.5 shadow-sm"
              title={`Wallet Flow ${APP_VERSION} • ${APP_EDITION} (${APP_BUILD_DATE})`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <span>Versión:</span>
              <strong className="text-white font-mono">{APP_VERSION}</strong>
            </span>

            <button
              type="button"
              onClick={() => {
                setActiveTab('datos');
                fileInputRef.current?.click();
              }}
              className="liquid-pill px-3 py-1.5 text-xs font-bold flex items-center gap-1.5 cursor-pointer border-purple-500/40 text-purple-200 hover:text-white hover:bg-purple-600/30 transition-all active:scale-95"
              title="Importar archivo JSON de cambios manuales o respaldo"
            >
              <Upload className="w-3.5 h-3.5 text-purple-400" />
              <span>Importar Cambios</span>
            </button>

            <button
              type="button"
              onClick={handleSyncManualChanges}
              disabled={isSyncing}
              className="liquid-button-primary px-3 py-1.5 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-neon-purple active:scale-95 transition-all"
              title="Guardar todos los cambios manuales directamente en la base de datos SQLite / Turso"
            >
              <Save className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Guardando...' : 'Sincronizar a BD'}</span>
            </button>
          </div>
        </div>

        {/* Settings Navigation Tabs */}
        <div className="flex sm:flex-wrap items-center gap-2 pt-3 border-t border-white/10 relative z-10 text-xs font-bold overflow-x-auto pb-1 no-scrollbar">
          {[
            { id: 'seguridad', label: 'Seguridad & PIN', icon: KeyRound },
            { id: 'perfil', label: 'Perfil & Cuenta', icon: User },
            { id: 'divisas', label: 'Divisas & Tasa', icon: Coins },
            { id: 'cuentas', label: `Cuentas (${accounts.length})`, icon: Wallet },
            { id: 'suscripciones', label: `Suscripciones (${subscriptions.length})`, icon: CalendarClock },
            { id: 'deudas', label: `Deudas (${debts.length})`, icon: HandCoins },
            { id: 'datos', label: 'Datos & Respaldo', icon: Layers },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap ${
                  isActive
                    ? 'bg-purple-600/40 text-purple-200 border border-purple-400/40 shadow-liquid-purple'
                    : 'text-zinc-400 hover:text-white bg-white/[0.03] border border-transparent'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ---------------- TAB 1: SEGURIDAD & CAMBIO DE PIN ---------------- */}
      {activeTab === 'seguridad' && (
        <div className="liquid-glass p-6 sm:p-8 space-y-6 max-w-xl mx-auto">
          <div className="flex items-center gap-3 pb-3 border-b border-white/10">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Cambiar PIN de Acceso</h3>
              <p className="text-xs text-zinc-400">
                Define un nuevo PIN de 4 dígitos para {currentUser.username}. Se cerrará la sesión en tus demás dispositivos.
              </p>
            </div>
          </div>

          {pinSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{pinSuccess}</span>
            </div>
          )}

          {pinError && (
            <div className="p-3.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{pinError}</span>
            </div>
          )}

          <form onSubmit={handleUpdatePin} className="space-y-4 text-xs">
            <div>
              <label className="block text-zinc-300 font-semibold mb-1">
                PIN Actual
              </label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                required
                pattern="[0-9]*"
                autoComplete="current-password"
                placeholder="Ingresa tu PIN actual"
                value={currentPin}
                onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ''))}
                className="liquid-input text-sm font-mono tracking-widest text-center"
              />
            </div>

            <div>
              <label className="block text-zinc-300 font-semibold mb-1">
                Nuevo PIN (4 dígitos numéricos)
              </label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                required
                pattern="[0-9]*"
                autoComplete="new-password"
                placeholder="Nuevo PIN de 4 dígitos"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                className="liquid-input text-sm font-mono tracking-widest text-center"
              />
            </div>

            <div>
              <label className="block text-zinc-300 font-semibold mb-1">
                Confirmar Nuevo PIN
              </label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                required
                pattern="[0-9]*"
                autoComplete="new-password"
                placeholder="Repite el nuevo PIN"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                className="liquid-input text-sm font-mono tracking-widest text-center"
              />
            </div>

            <button
              type="submit"
              disabled={isSavingPin}
              className="w-full liquid-button-primary min-h-[48px] py-3 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-neon-purple mt-2 disabled:opacity-70 disabled:cursor-wait"
            >
              <Lock className="w-4 h-4" />
              <span>{isSavingPin ? 'Guardando…' : 'Guardar Nuevo PIN'}</span>
            </button>
          </form>
        </div>
      )}

      {/* ---------------- TAB 2: PERFIL & DATOS DE USUARIO ---------------- */}
      {activeTab === 'perfil' && (
        <div className="liquid-glass p-6 sm:p-8 space-y-6 max-w-xl mx-auto">
          <div className="flex items-center gap-3 pb-3 border-b border-white/10">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Editar Perfil</h3>
              <p className="text-xs text-zinc-400">
                Personaliza el nombre para mostrar y el rol de tu cuenta
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
            <div>
              <label className="block text-zinc-300 font-semibold mb-1">
                Nombre de Usuario del Perfil
              </label>
              <input
                type="text"
                required
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                className="liquid-input text-xs font-bold"
              />
            </div>

            <div>
              <label className="block text-zinc-300 font-semibold mb-1">
                Etiqueta / Rol del Portafolio
              </label>
              <input
                type="text"
                value={profileRole}
                placeholder="ej. Portafolio Personal / Cuenta Principal"
                onChange={(e) => setProfileRole(e.target.value)}
                className="liquid-input text-xs"
              />
            </div>

            <button
              type="submit"
              className="w-full liquid-button-primary py-3 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-neon-purple mt-2"
            >
              <Save className="w-4 h-4" />
              <span>Guardar Cambios de Perfil</span>
            </button>
          </form>
        </div>
      )}

      {/* ---------------- TAB 3: DIVISAS & TASA DE CAMBIO ---------------- */}
      {activeTab === 'divisas' && (
        <div className="liquid-glass p-6 sm:p-8 space-y-6 max-w-xl mx-auto">
          <div className="flex items-center gap-3 pb-3 border-b border-white/10">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Divisas y Tipo de Cambio</h3>
              <p className="text-xs text-zinc-400">
                USD como moneda principal y COP como moneda secundaria
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveCurrency} className="space-y-5 text-xs">
            <div>
              <label className="block text-zinc-300 font-semibold mb-2">
                Moneda Activa de Visualización
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setCurrency('USD');
                  }}
                  className={`p-3.5 rounded-2xl border text-center transition-all cursor-pointer ${
                    currency === 'USD'
                      ? 'bg-purple-600/35 border-purple-400 text-white shadow-liquid-purple font-bold'
                      : 'bg-white/[0.03] border-white/10 text-zinc-400'
                  }`}
                >
                  <span className="text-lg block">USD ($)</span>
                  <span className="text-[10px] text-zinc-400">Dólar Estadounidense (Principal)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCurrency('COP');
                  }}
                  className={`p-3.5 rounded-2xl border text-center transition-all cursor-pointer ${
                    currency === 'COP'
                      ? 'bg-purple-600/35 border-purple-400 text-white shadow-liquid-purple font-bold'
                      : 'bg-white/[0.03] border-white/10 text-zinc-400'
                  }`}
                >
                  <span className="text-lg block">COP ($)</span>
                  <span className="text-[10px] text-zinc-400">Peso Colombiano (Secundaria)</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-zinc-300 font-semibold mb-1">
                Tasa de Conversión (1 USD = X COP)
              </label>
              <input
                type="tel"
                inputMode="decimal"
                required
                value={customRate}
                onChange={(e) => setCustomRate(e.target.value.replace(/[^0-9.]/g, ''))}
                className="liquid-input text-xs font-mono font-bold"
              />
              <p className="text-[11px] text-zinc-400 mt-1">
                Valor predeterminado del sistema: 3,200 COP por dólar
              </p>
            </div>

            <button
              type="submit"
              className="w-full liquid-button-primary py-3 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-neon-purple"
            >
              <Save className="w-4 h-4" />
              <span>Guardar Configuración de Divisas</span>
            </button>
          </form>
        </div>
      )}

      {/* ---------------- TAB 4: GESTIÓN TOTAL DE CUENTAS ---------------- */}
      {activeTab === 'cuentas' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-white">Cuentas Registradas en la Bóveda</h3>
              <p className="text-xs text-zinc-400">
                Edita saldos, nombres, límites de crédito o elimina cuentas
              </p>
            </div>
            <button
              onClick={onOpenNewAccount}
              className="liquid-button-primary px-4 py-2 text-xs font-semibold flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Crear cuenta nueva</span>
            </button>
          </div>

          {accounts.length === 0 ? (
            <div className="liquid-glass p-8 text-center space-y-3">
              <Wallet className="w-8 h-8 text-purple-400 mx-auto" />
              <p className="text-sm font-bold text-white">No hay cuentas registradas</p>
              <button
                onClick={onOpenNewAccount}
                className="liquid-button-primary px-4 py-2 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <span>+ Crear cuenta nueva</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {accounts.map((acc) => (
                <div
                  key={acc.id}
                  className="liquid-glass p-5 space-y-3 border border-white/10 hover:border-purple-500/40 transition-all relative"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-white">{acc.name}</h4>
                      <span className="text-[11px] text-zinc-400 block">{acc.institution}</span>
                    </div>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-purple-300">
                      {acc.type === 'credit' ? 'Crédito' : acc.type === 'cash' ? 'Efectivo' : 'Banco'}
                    </span>
                  </div>

                  <div className="border-t border-white/10 pt-2 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-zinc-400 block">Balance Actual</span>
                      <p className={`text-base font-black ${acc.balance < 0 ? 'text-rose-400' : 'text-white'}`}>
                        {formatCurrency(acc.balance, currency, exchangeRate)}
                      </p>
                    </div>
                    {acc.type === 'credit' && (
                      <div className="text-right">
                        <span className="text-[10px] text-zinc-400 block">Límite</span>
                        <p className="text-xs font-bold text-zinc-300">
                          {formatCurrency(acc.creditLimit || 0, currency, exchangeRate)}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                    <button
                      onClick={() => openEditAccount(acc)}
                      className="liquid-pill px-3 py-1.5 text-xs text-purple-200 hover:text-white flex items-center gap-1 cursor-pointer"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Editar</span>
                    </button>
                    <button
                      onClick={() => handleDeleteAccount(acc.id)}
                      className="liquid-pill px-2.5 py-1.5 text-xs text-rose-300 hover:text-white hover:bg-rose-500/20 border-rose-500/30 flex items-center gap-1 cursor-pointer"
                      title="Eliminar cuenta"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ---------------- TAB 5: GESTIÓN DE SUSCRIPCIONES ---------------- */}
      {activeTab === 'suscripciones' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-white">Suscripciones y Gastos Fijos</h3>
              <p className="text-xs text-zinc-400">
                Edita montos, días de corte o elimina suscripciones
              </p>
            </div>
          </div>

          {subscriptions.length === 0 ? (
            <div className="liquid-glass p-8 text-center space-y-3">
              <CalendarClock className="w-8 h-8 text-purple-400 mx-auto" />
              <p className="text-sm font-bold text-white">No tienes suscripciones registradas</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {subscriptions.map((sub) => (
                <div
                  key={sub.id}
                  className="liquid-glass p-5 space-y-3 border border-white/10 hover:border-purple-500/40 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-white">{sub.name}</h4>
                      <span className="text-[11px] text-zinc-400 block">{sub.category}</span>
                    </div>
                    <span className="text-xs font-black text-purple-300">
                      {formatCurrency(sub.amount, currency, exchangeRate)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-zinc-400 border-t border-white/10 pt-2">
                    <span>Cobro día {sub.billingDay} de cada mes</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${sub.active ? 'bg-emerald-500/20 text-emerald-300' : 'bg-zinc-500/20 text-zinc-400'}`}>
                      {sub.active ? 'Activa' : 'Pausada'}
                    </span>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                    <button
                      onClick={() => openEditSub(sub)}
                      className="liquid-pill px-3 py-1.5 text-xs text-purple-200 hover:text-white flex items-center gap-1 cursor-pointer"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Editar</span>
                    </button>
                    <button
                      onClick={() => handleDeleteSub(sub.id)}
                      className="liquid-pill px-2.5 py-1.5 text-xs text-rose-300 hover:text-white hover:bg-rose-500/20 border-rose-500/30 flex items-center gap-1 cursor-pointer"
                      title="Eliminar suscripción"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ---------------- TAB 6: GESTIÓN DE DEUDAS ---------------- */}
      {activeTab === 'deudas' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-white">Créditos y Pasivos Registrados</h3>
              <p className="text-xs text-zinc-400">
                Edita montos adeudados, contrapartes o elimina deudas
              </p>
            </div>
          </div>

          {debts.length === 0 ? (
            <div className="liquid-glass p-8 text-center space-y-3">
              <HandCoins className="w-8 h-8 text-purple-400 mx-auto" />
              <p className="text-sm font-bold text-white">No tienes deudas registradas</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {debts.map((d) => (
                <div
                  key={d.id}
                  className="liquid-glass p-5 space-y-3 border border-white/10 hover:border-purple-500/40 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-white">{d.title}</h4>
                      <span className="text-[11px] text-zinc-400 block">{d.counterparty}</span>
                    </div>
                    <span className="text-sm font-black text-rose-400">
                      Saldo: {formatCurrency(Math.max(0, d.totalAmount - d.paidAmount), currency, exchangeRate)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-zinc-400 border-t border-white/10 pt-2">
                    <span>Total: {formatCurrency(d.totalAmount, currency, exchangeRate)}</span>
                    <span>Pagado: {formatCurrency(d.paidAmount, currency, exchangeRate)}</span>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                    <button
                      onClick={() => openEditDebt(d)}
                      className="liquid-pill px-3 py-1.5 text-xs text-purple-200 hover:text-white flex items-center gap-1 cursor-pointer"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Editar</span>
                    </button>
                    <button
                      onClick={() => handleDeleteDebt(d.id)}
                      className="liquid-pill px-2.5 py-1.5 text-xs text-rose-300 hover:text-white hover:bg-rose-500/20 border-rose-500/30 flex items-center gap-1 cursor-pointer"
                      title="Eliminar deuda"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ---------------- TAB 7: DATOS, RESPALDO Y PERSISTENCIA SQLITE / TURSO ---------------- */}
      {activeTab === 'datos' && (
        <div className="space-y-6 max-w-3xl mx-auto">
          {/* Card 1: Importar Cambios Manuales & Respaldos con Desglose */}
          <div className="liquid-glass-purple p-6 sm:p-7 space-y-4 border border-purple-500/40 relative overflow-hidden">
            <div className="pointer-events-none absolute -top-16 -right-16 w-48 h-48 rounded-full bg-purple-500/20 blur-2xl" />
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-600/30 border border-purple-400/40 flex items-center justify-center text-purple-300 shrink-0">
                  <Upload className="w-5 h-5 text-purple-300" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    Importar Cambios Manuales & Respaldos
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-purple-500/30 text-purple-200 border border-purple-400/30">
                      Desglose Completo
                    </span>
                  </h3>
                  <p className="text-xs text-zinc-300">
                    Carga un archivo JSON de cambios, restaura desde el navegador o recupera el último snapshot del servidor
                  </p>
                </div>
              </div>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed relative z-10">
              Al seleccionar una fuente, se abrirá el <strong>Modal de Desglose Completo</strong> para revisar cada cuenta, transacción, suscripción y deuda antes de persistirla en la base de datos de <strong>{currentUser.username}</strong>.
            </p>

            <div className={`grid grid-cols-1 ${currentUser.isAdmin ? 'sm:grid-cols-3' : 'sm:grid-cols-2'} gap-3 pt-2 relative z-10`}>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="liquid-button-primary p-3 rounded-2xl flex flex-col items-center justify-center gap-1.5 text-center cursor-pointer shadow-neon-purple active:scale-95 transition-all"
              >
                <FolderOpen className="w-5 h-5 text-white" />
                <span className="text-xs font-bold text-white">Subir Archivo JSON</span>
                <span className="text-[10px] text-purple-200 opacity-80">Respaldos externos o manuales</span>
              </button>

              <button
                type="button"
                onClick={handleLoadFromLocalStorage}
                className="liquid-glass p-3 rounded-2xl flex flex-col items-center justify-center gap-1.5 text-center cursor-pointer border-purple-500/30 hover:border-purple-400/60 active:scale-95 transition-all text-purple-200 hover:text-white"
              >
                <HardDrive className="w-5 h-5 text-indigo-400" />
                <span className="text-xs font-bold text-white">Respaldo Local</span>
                <span className="text-[10px] text-zinc-400">Guardado en este navegador</span>
              </button>

              {currentUser.isAdmin && (
                <button
                  type="button"
                  onClick={handleLoadLatestServerSnapshot}
                  className="liquid-glass p-3 rounded-2xl flex flex-col items-center justify-center gap-1.5 text-center cursor-pointer border-purple-500/30 hover:border-purple-400/60 active:scale-95 transition-all text-purple-200 hover:text-white"
                >
                  <Database className="w-5 h-5 text-emerald-400" />
                  <span className="text-xs font-bold text-white">Snapshot Servidor</span>
                  <span className="text-[10px] text-zinc-400">Turso Cloud / SQLite</span>
                </button>
              )}
            </div>
          </div>

          {/* Card 2: Exportar Respaldos y Snapshots */}
          <div className="liquid-glass p-6 sm:p-7 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Download className="w-4 h-4 text-purple-400" />
              Exportar Copia de Seguridad & Snapshots
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Descarga una copia completa de tus registros bancarios en formato JSON para guardar en tu disco o genera un snapshot binario seguro en el backend.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={handleExportBackup}
                className="liquid-button-primary px-4 py-2.5 text-xs font-bold flex items-center gap-2 cursor-pointer shadow-neon-purple active:scale-95"
              >
                <Download className="w-4 h-4" />
                <span>Descargar Respaldo JSON ({currentUser.username})</span>
              </button>

              {currentUser.isAdmin && (
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const res = await api.backupDatabase();
                      if (res?.success) {
                        if (showToast) showToast('Snapshot completo de la base de datos creado');
                        fetchLiveDbInfo();
                      } else if (showToast) {
                        showToast('⚠️ No se pudo generar el snapshot del servidor');
                      }
                    } catch (err) {
                      if (showToast) showToast(`⚠️ No se pudo generar el snapshot: ${err?.message || 'error de conexión'}`);
                    }
                  }}
                  className="liquid-pill min-h-[44px] px-4 py-2.5 text-xs font-bold text-purple-200 hover:text-white flex items-center gap-2 cursor-pointer border-purple-500/40 active:scale-95"
                >
                  <ShieldCheck className="w-4 h-4 text-purple-400" />
                  <span>Generar Snapshot del Servidor</span>
                </button>
              )}
            </div>
          </div>

          {/* Card 3: Estado de Persistencia e Integridad en Tiempo Real */}
          <div className="liquid-glass p-6 sm:p-7 space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                Persistencia Garantizada & Estado de Base de Datos
              </h3>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={fetchLiveDbInfo}
                  disabled={isLoadingLiveInfo}
                  className="liquid-pill p-1.5 text-xs text-zinc-400 hover:text-white cursor-pointer"
                  title="Actualizar estado de conexión"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingLiveInfo ? 'animate-spin text-purple-400' : ''}`} />
                </button>
                <button
                  type="button"
                  onClick={handleSyncManualChanges}
                  disabled={isSyncing}
                  className="liquid-button-primary px-3 py-1.5 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-neon-purple active:scale-95"
                >
                  <Save className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'Guardando...' : 'Sincronizar a BD Ahora'}</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              <div className="bg-black/20 rounded-xl p-3 border border-white/5">
                <span className="text-[10px] text-zinc-400 block font-semibold">Cuentas Registradas</span>
                <span className="text-lg font-black text-white">{accounts.length}</span>
              </div>
              <div className="bg-black/20 rounded-xl p-3 border border-white/5">
                <span className="text-[10px] text-zinc-400 block font-semibold">Transacciones Reales</span>
                <span className="text-lg font-black text-emerald-400">{transactions.length}</span>
              </div>
              <div className="bg-black/20 rounded-xl p-3 border border-white/5">
                <span className="text-[10px] text-zinc-400 block font-semibold">Suscripciones Fijas</span>
                <span className="text-lg font-black text-purple-300">{subscriptions.length}</span>
              </div>
              <div className="bg-black/20 rounded-xl p-3 border border-white/5">
                <span className="text-[10px] text-zinc-400 block font-semibold">Deudas Activas</span>
                <span className="text-lg font-black text-amber-300">{debts.length}</span>
              </div>
            </div>

            <div className="text-[11px] text-zinc-400 border-t border-white/10 pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>
                  Conexión activa:{' '}
                  <strong className="text-white">
                    {dbLiveInfo?.isRemoteTurso ? 'Turso Cloud (libSQL)' : 'SQLite Persistente Local'}
                  </strong>
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-zinc-400">
                  Versión App: <strong className="text-purple-300 font-mono">{APP_VERSION}</strong>
                </span>
                <span className="text-zinc-500 font-mono text-[10px]">
                  {dbLiveInfo?.clientUrl || 'wallet_flow.db'}
                </span>
              </div>
            </div>
          </div>

          {/* Card 4: Zona de Mantenimiento / Limpieza */}
          <div className="liquid-glass p-6 border border-rose-500/20 space-y-3">
            <h3 className="text-xs font-bold text-rose-300 uppercase tracking-wider flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400" />
              Zona de Mantenimiento & Sesión
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Puedes vaciar por completo los datos de <strong>{currentUser.username}</strong> para comenzar de cero (los datos de otros usuarios permanecen intactos) o cerrar la sesión en este dispositivo.
            </p>
            <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
              <button
                type="button"
                onClick={handleClearAllUserData}
                className="liquid-pill min-h-[44px] px-4 py-2 text-xs font-bold text-rose-300 hover:text-white hover:bg-rose-500/20 border-rose-500/40 cursor-pointer transition-all"
              >
                Borrar todos los datos de {currentUser.username}
              </button>
              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  className="liquid-pill min-h-[44px] px-4 py-2 text-xs font-bold text-zinc-200 hover:text-white cursor-pointer transition-all"
                >
                  Cerrar sesión
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ---------------- VERSION & SYSTEM METADATA FOOTER ---------------- */}
      <div className="pt-8 pb-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-white/10 text-zinc-500 text-xs mt-8">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-400" />
          <span className="text-zinc-300 font-semibold">Wallet Flow</span>
          <span className="text-zinc-600">•</span>
          <span className="text-zinc-400 font-medium">{APP_EDITION}</span>
          <span className="px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/35 text-purple-300 font-mono font-bold text-[11px]">
            {APP_VERSION}
          </span>
        </div>
        <div className="text-[11px] text-zinc-400 flex items-center gap-2">
          <span>Compilación: <strong className="font-mono text-zinc-300">{APP_BUILD_DATE}</strong></span>
          <span className="text-zinc-600">•</span>
          <span className="text-emerald-400 font-medium flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Turso Cloud + SQLite Engine
          </span>
        </div>
      </div>

      {/* ---------------- EDIT ACCOUNT MODAL ---------------- */}
      {editingAccount && typeof document !== 'undefined' && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditingAccount(null);
          }}
          className="fixed inset-0 z-[99999] flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4 bg-black/85 backdrop-blur-md overflow-hidden animate-fadeIn"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md h-[92dvh] sm:h-auto sm:max-h-[88dvh] flex flex-col rounded-t-3xl sm:rounded-3xl bg-[#14121E] sm:bg-[#14121E]/95 backdrop-blur-2xl border-t sm:border border-purple-500/40 shadow-neon-purple overflow-hidden text-xs relative"
          >
            <div className="pt-[max(1.25rem,calc(env(safe-area-inset-top,0px)+0.75rem))] pb-3 sm:py-4 px-4 sm:px-6 border-b border-white/10 flex items-center justify-between shrink-0 bg-gradient-to-r from-purple-900/30 to-indigo-900/30">
              <h3 className="text-base font-bold text-white">Editar Cuenta</h3>
              <button
                type="button"
                onClick={() => setEditingAccount(null)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditedAccount} className="flex-1 min-h-0 flex flex-col overflow-hidden">
              <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-3.5 custom-scrollbar overscroll-contain">
                <div>
                  <label className="block text-zinc-300 font-medium mb-1.5 text-xs">Nombre de la Cuenta</label>
                  <input
                    type="text"
                    required
                    value={accName}
                    onChange={(e) => setAccName(e.target.value)}
                    className="liquid-input text-base sm:text-xs min-h-[46px]"
                  />
                </div>

                <div>
                  <label className="block text-zinc-300 font-medium mb-1.5 text-xs">Institución</label>
                  <input
                    type="text"
                    value={accInstitution}
                    onChange={(e) => setAccInstitution(e.target.value)}
                    className="liquid-input text-base sm:text-xs min-h-[46px]"
                  />
                </div>

                <div>
                  <label className="block text-zinc-300 font-medium mb-1.5 text-xs">Saldo</label>
                  <input
                    type="tel"
                    inputMode="decimal"
                    placeholder="0"
                    value={accBalance}
                    onChange={(e) => setAccBalance(e.target.value.replace(/[^0-9.-]/g, ''))}
                    className="liquid-input text-base sm:text-xs font-bold font-mono min-h-[46px]"
                  />
                </div>

                {editingAccount.type === 'credit' && (
                  <div>
                    <label className="block text-zinc-300 font-medium mb-1.5 text-xs">Límite de Crédito</label>
                    <input
                      type="tel"
                      inputMode="decimal"
                      value={accLimit}
                      onChange={(e) => setAccLimit(e.target.value.replace(/[^0-9.]/g, ''))}
                      className="liquid-input text-base sm:text-xs font-bold font-mono min-h-[46px]"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-zinc-300 font-medium mb-1.5 text-xs">Número de Cuenta / Referencia</label>
                  <input
                    type="text"
                    value={accNumber}
                    onChange={(e) => setAccNumber(e.target.value)}
                    className="liquid-input text-base sm:text-xs min-h-[46px]"
                  />
                </div>
              </div>

              <div className="p-3.5 sm:p-5 border-t border-white/10 shrink-0 bg-[#0F0D18]/95 backdrop-blur-xl pb-[max(1rem,env(safe-area-inset-bottom,0px))]">
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setEditingAccount(null)}
                    className="liquid-pill py-2.5 px-4 text-zinc-400 hover:text-white cursor-pointer text-center min-h-[46px] flex items-center justify-center font-semibold text-xs"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="liquid-button-primary py-2.5 px-4 font-bold cursor-pointer text-center min-h-[46px] flex items-center justify-center shadow-neon-purple active:scale-95 text-xs"
                  >
                    Guardar
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ---------------- EDIT SUBSCRIPTION MODAL ---------------- */}
      {editingSub && typeof document !== 'undefined' && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditingSub(null);
          }}
          className="fixed inset-0 z-[99999] flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4 bg-black/85 backdrop-blur-md overflow-hidden animate-fadeIn"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md h-[92dvh] sm:h-auto sm:max-h-[88dvh] flex flex-col rounded-t-3xl sm:rounded-3xl bg-[#14121E] sm:bg-[#14121E]/95 backdrop-blur-2xl border-t sm:border border-purple-500/40 shadow-neon-purple overflow-hidden text-xs relative"
          >
            <div className="pt-[max(1.25rem,calc(env(safe-area-inset-top,0px)+0.75rem))] pb-3 sm:py-4 px-4 sm:px-6 border-b border-white/10 flex items-center justify-between shrink-0 bg-gradient-to-r from-purple-900/30 to-indigo-900/30">
              <h3 className="text-base font-bold text-white">Editar Suscripción</h3>
              <button
                type="button"
                onClick={() => setEditingSub(null)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditedSub} className="flex-1 min-h-0 flex flex-col overflow-hidden">
              <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-3.5 custom-scrollbar overscroll-contain">
                <div>
                  <label className="block text-zinc-300 font-medium mb-1.5 text-xs">Nombre</label>
                  <input
                    type="text"
                    required
                    value={subName}
                    onChange={(e) => setSubName(e.target.value)}
                    className="liquid-input text-base sm:text-xs min-h-[46px]"
                  />
                </div>

                <div>
                  <label className="block text-zinc-300 font-medium mb-1.5 text-xs">Categoría</label>
                  <input
                    type="text"
                    value={subCategory}
                    onChange={(e) => setSubCategory(e.target.value)}
                    className="liquid-input text-base sm:text-xs min-h-[46px]"
                  />
                </div>

                <div>
                  <label className="block text-zinc-300 font-medium mb-1.5 text-xs">Monto Mensual</label>
                  <input
                    type="tel"
                    inputMode="decimal"
                    required
                    value={subAmount}
                    onChange={(e) => setSubAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                    className="liquid-input text-base sm:text-xs font-bold font-mono min-h-[46px]"
                  />
                </div>

                <div>
                  <label className="block text-zinc-300 font-medium mb-1.5 text-xs">Día de Cobro (1-31)</label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    required
                    value={subBillingDay}
                    onChange={(e) => setSubBillingDay(e.target.value.replace(/[^0-9]/g, ''))}
                    className="liquid-input text-base sm:text-xs font-mono min-h-[46px]"
                  />
                </div>
              </div>

              <div className="p-3.5 sm:p-5 border-t border-white/10 shrink-0 bg-[#0F0D18]/95 backdrop-blur-xl pb-[max(1rem,env(safe-area-inset-bottom,0px))]">
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setEditingSub(null)}
                    className="liquid-pill py-2.5 px-4 text-zinc-400 hover:text-white cursor-pointer text-center min-h-[46px] flex items-center justify-center font-semibold text-xs"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="liquid-button-primary py-2.5 px-4 font-bold cursor-pointer text-center min-h-[46px] flex items-center justify-center shadow-neon-purple active:scale-95 text-xs"
                  >
                    Guardar
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ---------------- EDIT DEBT MODAL ---------------- */}
      {editingDebt && typeof document !== 'undefined' && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditingDebt(null);
          }}
          className="fixed inset-0 z-[99999] flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4 bg-black/85 backdrop-blur-md overflow-hidden animate-fadeIn"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md h-[92dvh] sm:h-auto sm:max-h-[88dvh] flex flex-col rounded-t-3xl sm:rounded-3xl bg-[#14121E] sm:bg-[#14121E]/95 backdrop-blur-2xl border-t sm:border border-purple-500/40 shadow-neon-purple overflow-hidden text-xs relative"
          >
            <div className="pt-[max(1.25rem,calc(env(safe-area-inset-top,0px)+0.75rem))] pb-3 sm:py-4 px-4 sm:px-6 border-b border-white/10 flex items-center justify-between shrink-0 bg-gradient-to-r from-purple-900/30 to-indigo-900/30">
              <h3 className="text-base font-bold text-white">Editar Deuda</h3>
              <button
                type="button"
                onClick={() => setEditingDebt(null)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditedDebt} className="flex-1 min-h-0 flex flex-col overflow-hidden">
              <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-3.5 custom-scrollbar overscroll-contain">
                <div>
                  <label className="block text-zinc-300 font-medium mb-1.5 text-xs">Título de la Deuda</label>
                  <input
                    type="text"
                    required
                    value={debtTitle}
                    onChange={(e) => setDebtTitle(e.target.value)}
                    className="liquid-input text-base sm:text-xs min-h-[46px]"
                  />
                </div>

                <div>
                  <label className="block text-zinc-300 font-medium mb-1.5 text-xs">Contraparte / Entidad</label>
                  <input
                    type="text"
                    value={debtCounterparty}
                    onChange={(e) => setDebtCounterparty(e.target.value)}
                    className="liquid-input text-base sm:text-xs min-h-[46px]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-300 font-medium mb-1.5 text-xs">Monto Total</label>
                    <input
                      type="tel"
                      inputMode="decimal"
                      required
                      value={debtTotal}
                      onChange={(e) => setDebtTotal(e.target.value.replace(/[^0-9.]/g, ''))}
                      className="liquid-input text-base sm:text-xs font-bold font-mono min-h-[46px]"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-300 font-medium mb-1.5 text-xs">Monto Pagado</label>
                    <input
                      type="tel"
                      inputMode="decimal"
                      required
                      value={debtPaid}
                      onChange={(e) => setDebtPaid(e.target.value.replace(/[^0-9.]/g, ''))}
                      className="liquid-input text-base sm:text-xs font-bold font-mono min-h-[46px]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-300 font-medium mb-1.5 text-xs">Fecha Límite</label>
                  <input
                    type="date"
                    value={debtDueDate}
                    onChange={(e) => setDebtDueDate(e.target.value)}
                    className="liquid-input text-base sm:text-xs min-h-[46px]"
                  />
                </div>
              </div>

              <div className="p-3.5 sm:p-5 border-t border-white/10 shrink-0 bg-[#0F0D18]/95 backdrop-blur-xl pb-[max(1rem,env(safe-area-inset-bottom,0px))]">
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setEditingDebt(null)}
                    className="liquid-pill py-2.5 px-4 text-zinc-400 hover:text-white cursor-pointer text-center min-h-[46px] flex items-center justify-center font-semibold text-xs"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="liquid-button-primary py-2.5 px-4 font-bold cursor-pointer text-center min-h-[46px] flex items-center justify-center shadow-neon-purple active:scale-95 text-xs"
                  >
                    Guardar
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ---------------- MODAL DE DESGLOSE COMPLETO DE CAMBIOS MANUALES ---------------- */}
      {isBreakdownModalOpen && pendingImportData && typeof document !== 'undefined' && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[99999] flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4 md:p-6 bg-black/90 backdrop-blur-md overflow-hidden animate-fadeIn"
        >
          <div className="w-full max-w-4xl h-[100dvh] sm:h-auto sm:max-h-[88dvh] flex flex-col rounded-t-3xl sm:rounded-3xl bg-[#12101C] sm:bg-[#12101C]/95 backdrop-blur-2xl border-t sm:border border-purple-500/40 shadow-neon-purple overflow-hidden text-xs">
            {/* Modal Header with Dynamic Island & Notch Safe Area */}
            <div className="pt-[max(1.25rem,calc(env(safe-area-inset-top,0px)+0.75rem))] pb-3.5 sm:py-5 px-4 sm:px-6 border-b border-white/10 flex items-center justify-between shrink-0 bg-gradient-to-r from-purple-900/30 to-indigo-900/30">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-purple-600/40 border border-purple-400/40 flex items-center justify-center text-purple-300 shrink-0">
                  <Layers className="w-5 h-5 text-purple-200" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-black text-white truncate flex items-center gap-2">
                    Desglose Completo de Cambios Manuales & Respaldo
                  </h3>
                  <span className="text-[10px] sm:text-[11px] text-zinc-300 block truncate max-w-xs sm:max-w-md">
                    Origen: <strong className="text-purple-300">{pendingImportData.sourceName}</strong>
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsBreakdownModalOpen(false);
                  setPendingImportData(null);
                }}
                className="p-2 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 cursor-pointer transition-all shrink-0 ml-2"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 custom-scrollbar">
              {/* Metadata Banner */}
              <div className="bg-black/30 border border-white/10 rounded-2xl p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3 text-[11px]">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-purple-600/30 text-purple-200 border border-purple-500/30 font-semibold">
                    Destino: <strong className="text-white">{currentUser.username}</strong>
                  </span>
                  {pendingImportData.rawUser?.username && (
                    <span className="px-2.5 py-1 rounded-lg bg-white/5 text-zinc-300 border border-white/10">
                      Usuario en archivo: <strong className="text-white">{pendingImportData.rawUser.username}</strong>
                    </span>
                  )}
                  <span className="px-2.5 py-1 rounded-lg bg-white/5 text-zinc-300 border border-white/10">
                    Moneda:{' '}
                    <strong className="text-white">
                      {pendingImportData.currency} (1 USD = ${pendingImportData.exchangeRate.toLocaleString('es-CO')}{' '}
                      COP)
                    </strong>
                  </span>
                </div>

                <span className="text-zinc-400">
                  Fecha: {new Date(pendingImportData.timestamp).toLocaleString('es-CO')}
                </span>
              </div>

              {/* KPI Summary Grid */}
              {breakdownMetrics && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="liquid-glass p-3 sm:p-4 space-y-1 border-purple-500/30">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-zinc-400 font-semibold uppercase">Cuentas</span>
                      <Wallet className="w-3.5 h-3.5 text-purple-400" />
                    </div>
                    <span className="text-lg font-black text-white block">
                      {pendingImportData.accounts.length}
                    </span>
                    <span className="text-[10px] text-zinc-400 block truncate">
                      Bal:{' '}
                      <strong className="text-purple-200">
                        {formatCurrency(
                          breakdownMetrics.totalBalanceUSD,
                          pendingImportData.currency,
                          pendingImportData.exchangeRate
                        )}
                      </strong>
                    </span>
                  </div>

                  <div className="liquid-glass p-3 sm:p-4 space-y-1 border-emerald-500/30">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-zinc-400 font-semibold uppercase">Transacciones</span>
                      <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                    </div>
                    <span className="text-lg font-black text-emerald-400 block">
                      {pendingImportData.transactions.length}
                    </span>
                    <span className="text-[10px] text-zinc-400 block truncate">
                      +{formatCurrency(breakdownMetrics.totalIncomeUSD, pendingImportData.currency, pendingImportData.exchangeRate)} / -{formatCurrency(breakdownMetrics.totalExpenseUSD, pendingImportData.currency, pendingImportData.exchangeRate)}
                    </span>
                  </div>

                  <div className="liquid-glass p-3 sm:p-4 space-y-1 border-indigo-500/30">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-zinc-400 font-semibold uppercase">Suscripciones</span>
                      <CalendarClock className="w-3.5 h-3.5 text-indigo-400" />
                    </div>
                    <span className="text-lg font-black text-indigo-300 block">
                      {pendingImportData.subscriptions.length}
                    </span>
                    <span className="text-[10px] text-zinc-400 block truncate">
                      {formatCurrency(breakdownMetrics.monthlySubsUSD, pendingImportData.currency, pendingImportData.exchangeRate)}/mes ({breakdownMetrics.activeSubsCount} activas)
                    </span>
                  </div>

                  <div className="liquid-glass p-3 sm:p-4 space-y-1 border-amber-500/30">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-zinc-400 font-semibold uppercase">Deudas</span>
                      <HandCoins className="w-3.5 h-3.5 text-amber-400" />
                    </div>
                    <span className="text-lg font-black text-amber-300 block">
                      {pendingImportData.debts.length}
                    </span>
                    <span className="text-[10px] text-zinc-400 block truncate">
                      Pendiente: {formatCurrency(breakdownMetrics.remainingDebtsUSD, pendingImportData.currency, pendingImportData.exchangeRate)}
                    </span>
                  </div>
                </div>
              )}

              {/* Sub-Tabs for Deep Inspection */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 border-b border-white/10 pb-2 overflow-x-auto no-scrollbar">
                  {[
                    { id: 'cuentas', label: `Cuentas (${pendingImportData.accounts.length})`, icon: Wallet },
                    { id: 'transacciones', label: `Transacciones (${pendingImportData.transactions.length})`, icon: ArrowUpRight },
                    { id: 'suscripciones', label: `Suscripciones (${pendingImportData.subscriptions.length})`, icon: CalendarClock },
                    { id: 'deudas', label: `Deudas (${pendingImportData.debts.length})`, icon: HandCoins },
                  ].map((tab) => {
                    const Icon = tab.icon;
                    const isActive = breakdownActiveTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setBreakdownActiveTab(tab.id)}
                        className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer shrink-0 transition-all ${
                          isActive
                            ? 'bg-purple-600/40 text-purple-200 border border-purple-400/40 shadow-liquid-purple'
                            : 'text-zinc-400 hover:text-white bg-white/[0.03] border border-transparent'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Sub-Tab 1: Detalle de Cuentas */}
                {breakdownActiveTab === 'cuentas' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-72 overflow-y-auto custom-scrollbar pr-1">
                    {pendingImportData.accounts.length === 0 ? (
                      <p className="text-xs text-zinc-400 p-4 text-center col-span-2">No hay cuentas en este respaldo.</p>
                    ) : (
                      pendingImportData.accounts.map((acc, idx) => (
                        <div
                          key={acc.id || idx}
                          className="bg-black/30 border border-white/10 rounded-2xl p-3.5 space-y-2 hover:border-purple-500/40 transition-all"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h4 className="text-xs font-bold text-white">{acc.name}</h4>
                              <span className="text-[10px] text-zinc-400 block">{acc.institution || 'Entidad'}</span>
                            </div>
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-purple-500/20 text-purple-300 border border-purple-500/30">
                              {acc.type || 'bank'}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-[11px] pt-1 border-t border-white/5">
                            <span className="text-zinc-500 font-mono text-[10px]">{acc.accountNumber || '•••• 0000'}</span>
                            <span className="font-mono font-bold text-emerald-400">
                              {formatCurrency(
                                acc.balance || 0,
                                acc.currency || pendingImportData.currency,
                                pendingImportData.exchangeRate
                              )}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Sub-Tab 2: Detalle de Transacciones con Buscador */}
                {breakdownActiveTab === 'transacciones' && (
                  <div className="space-y-3">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        placeholder="Buscar por título, categoría o notas en este respaldo..."
                        value={txSearchTerm}
                        onChange={(e) => setTxSearchTerm(e.target.value)}
                        className="liquid-input pl-9 text-xs py-1.5"
                      />
                    </div>

                    <div className="max-h-72 overflow-y-auto custom-scrollbar space-y-2 pr-1">
                      {filteredBreakdownTxs.length === 0 ? (
                        <p className="text-xs text-zinc-400 p-4 text-center">No se encontraron movimientos coincidentes.</p>
                      ) : (
                        filteredBreakdownTxs.map((tx, idx) => {
                          const isIncome = tx.type === 'income';
                          return (
                            <div
                              key={tx.id || idx}
                              className="bg-black/25 border border-white/5 hover:border-white/15 rounded-xl p-2.5 flex items-center justify-between gap-3 transition-all"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span
                                  className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${
                                    isIncome ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                                  }`}
                                >
                                  {isIncome ? '+' : '-'}
                                </span>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <h5 className="text-xs font-semibold text-white truncate">{tx.title}</h5>
                                    {tx.isAntExpense ? (
                                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold">
                                        🐜 Hormiga
                                      </span>
                                    ) : null}
                                  </div>
                                  <span className="text-[10px] text-zinc-400 block truncate">
                                    {tx.date} • {tx.category || 'Varios'}
                                  </span>
                                </div>
                              </div>

                              <span
                                className={`font-mono text-xs font-bold shrink-0 ${
                                  isIncome ? 'text-emerald-400' : 'text-rose-400'
                                }`}
                              >
                                {isIncome ? '+' : '-'}
                                {formatCurrency(
                                  tx.amount || 0,
                                  tx.currency || pendingImportData.currency,
                                  pendingImportData.exchangeRate
                                )}
                              </span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}

                {/* Sub-Tab 3: Detalle de Suscripciones */}
                {breakdownActiveTab === 'suscripciones' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-72 overflow-y-auto custom-scrollbar pr-1">
                    {pendingImportData.subscriptions.length === 0 ? (
                      <p className="text-xs text-zinc-400 p-4 text-center col-span-2">No hay suscripciones en este respaldo.</p>
                    ) : (
                      pendingImportData.subscriptions.map((sub, idx) => (
                        <div
                          key={sub.id || idx}
                          className="bg-black/30 border border-white/10 rounded-2xl p-3.5 space-y-2 hover:border-purple-500/40 transition-all"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h4 className="text-xs font-bold text-white">{sub.name}</h4>
                              <span className="text-[10px] text-zinc-400 block">{sub.category || 'Servicios'}</span>
                            </div>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                sub.active !== 0 && sub.active !== false
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : 'bg-zinc-700 text-zinc-400'
                              }`}
                            >
                              {sub.active !== 0 && sub.active !== false ? 'Activa' : 'Pausada'}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-[11px] pt-1 border-t border-white/5">
                            <span className="text-zinc-400 text-[10px]">Día {sub.billingDay || 1} de cada mes</span>
                            <span className="font-mono font-bold text-purple-300">
                              {formatCurrency(
                                sub.amount || 0,
                                sub.currency || pendingImportData.currency,
                                pendingImportData.exchangeRate
                              )}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Sub-Tab 4: Detalle de Deudas */}
                {breakdownActiveTab === 'deudas' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-[11px] text-zinc-400 px-1">
                      <span>Deudas detectadas: <strong className="text-white">{pendingImportData.debts.length}</strong></span>
                      <span className="font-mono text-purple-300 font-bold">
                        Total Adeudado: {formatCurrency(breakdownMetrics.remainingDebtsUSD, pendingImportData.currency, pendingImportData.exchangeRate)}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[46dvh] sm:max-h-80 overflow-y-auto custom-scrollbar overscroll-contain pr-1">
                      {pendingImportData.debts.length === 0 ? (
                        <p className="text-xs text-zinc-400 p-6 text-center col-span-2 bg-white/[0.02] rounded-2xl border border-white/5">
                          No hay deudas en este respaldo.
                        </p>
                      ) : (
                        pendingImportData.debts.map((d, idx) => {
                          const tot = Number(d.totalAmount) || 0;
                          const paid = Number(d.paidAmount) || 0;
                          const rem = Math.max(0, tot - paid);
                          const progressPct = tot > 0 ? Math.min(100, Math.round((paid / tot) * 100)) : 0;
                          return (
                            <div
                              key={d.id || idx}
                              className="bg-black/40 border border-white/10 hover:border-purple-500/40 rounded-2xl p-3.5 space-y-2.5 transition-all shadow-sm"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <h4 className="text-xs font-bold text-white truncate">{d.title}</h4>
                                  <span className="text-[10px] text-zinc-400 block truncate">{d.counterparty || 'Entidad'}</span>
                                </div>
                                <div className="text-right shrink-0">
                                  <span className="text-[10px] block text-zinc-400">Saldo Pendiente</span>
                                  <span className="font-mono text-xs font-bold text-amber-300">
                                    {formatCurrency(rem, d.currency || pendingImportData.currency, pendingImportData.exchangeRate)}
                                  </span>
                                </div>
                              </div>

                              {/* Progress bar */}
                              <div className="space-y-1">
                                <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                                  <div
                                    className="h-full rounded-full bg-gradient-to-r from-purple-500 to-emerald-400 transition-all duration-300"
                                    style={{ width: `${progressPct}%` }}
                                  />
                                </div>
                                <div className="flex items-center justify-between text-[10px] text-zinc-400">
                                  <span>Amortizado: {progressPct}% ({formatCurrency(paid, d.currency || pendingImportData.currency, pendingImportData.exchangeRate)})</span>
                                  <span>Total: {formatCurrency(tot, d.currency || pendingImportData.currency, pendingImportData.exchangeRate)}</span>
                                </div>
                              </div>

                              <div className="flex items-center justify-between text-[10px] text-zinc-400 pt-1.5 border-t border-white/5">
                                <span>{d.category || 'Crédito'}</span>
                                <span>Vence: <strong className="text-zinc-300">{d.dueDate || 'N/A'}</strong></span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Mode Selector */}
              <div className="bg-black/40 border border-purple-500/30 rounded-2xl p-4 space-y-3">
                <span className="text-xs font-bold text-white block">Selecciona el Modo de Persistencia:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label
                    className={`p-3 rounded-xl border cursor-pointer flex items-start gap-2.5 transition-all ${
                      importMode === 'replace'
                        ? 'bg-purple-600/25 border-purple-400 text-white shadow-liquid-purple'
                        : 'bg-white/[0.02] border-white/10 text-zinc-300 hover:border-white/20'
                    }`}
                  >
                    <input
                      type="radio"
                      name="importMode"
                      value="replace"
                      checked={importMode === 'replace'}
                      onChange={() => setImportMode('replace')}
                      className="mt-0.5"
                    />
                    <div>
                      <strong className="text-xs font-bold block text-purple-200">
                        Reemplazo Total (Recomendado)
                      </strong>
                      <span className="text-[10px] text-zinc-400 block leading-tight mt-0.5">
                        Sustituye completamente la sesión de {currentUser.username} en SQLite/Turso. Garantiza que no
                        queden registros obsoletos o huérfanos.
                      </span>
                    </div>
                  </label>

                  <label
                    className={`p-3 rounded-xl border cursor-pointer flex items-start gap-2.5 transition-all ${
                      importMode === 'merge'
                        ? 'bg-purple-600/25 border-purple-400 text-white shadow-liquid-purple'
                        : 'bg-white/[0.02] border-white/10 text-zinc-300 hover:border-white/20'
                    }`}
                  >
                    <input
                      type="radio"
                      name="importMode"
                      value="merge"
                      checked={importMode === 'merge'}
                      onChange={() => setImportMode('merge')}
                      className="mt-0.5"
                    />
                    <div>
                      <strong className="text-xs font-bold block text-purple-200">
                        Fusión Progresiva (Merge)
                      </strong>
                      <span className="text-[10px] text-zinc-400 block leading-tight mt-0.5">
                        Combina las cuentas y movimientos entrantes con los que ya tienes guardados en la base de datos
                        sin duplicar identificadores.
                      </span>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Modal Footer - Always Sticky & 100% Touchable on Mobile */}
            <div className="p-3.5 sm:p-5 border-t border-white/10 shrink-0 bg-[#0E0C18]/[0.98] backdrop-blur-2xl pb-[max(1.5rem,calc(env(safe-area-inset-bottom,0px)+0.85rem))] space-y-2.5 sm:space-y-0 sm:flex sm:items-center sm:justify-between sm:gap-3 relative z-20">
              <span className="text-[11px] text-zinc-400 block text-center sm:text-left">
                <span className="hidden sm:inline">Se persistirán en SQLite/Turso: </span>
                <strong className="text-white">
                  {pendingImportData.accounts.length} cuentas, {pendingImportData.transactions.length} movimientos
                </strong>
              </span>

              <div className="grid grid-cols-2 sm:flex sm:items-center sm:justify-end gap-2.5 w-full sm:w-auto">
                <button
                  type="button"
                  disabled={isApplyingImport}
                  onClick={() => {
                    setIsBreakdownModalOpen(false);
                    setPendingImportData(null);
                  }}
                  className="liquid-pill py-3 px-4 text-xs font-bold text-zinc-300 hover:text-white cursor-pointer text-center flex items-center justify-center min-h-[48px] active:scale-95"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  disabled={isApplyingImport}
                  onClick={handleConfirmImport}
                  className="liquid-button-primary py-3 px-5 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-neon-purple active:scale-95 text-center min-h-[48px]"
                >
                  {isApplyingImport ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-white shrink-0" />
                      <span className="truncate">Persistiendo...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 text-white shrink-0" />
                      <span className="truncate">Confirmar e Importar</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
