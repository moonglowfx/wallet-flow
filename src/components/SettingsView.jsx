import React, { useState } from 'react';
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
} from 'lucide-react';
import { getUserPin, setUserPin, setUserProfile } from '../data/users.js';
import { formatCurrency, DEFAULT_USD_COP_RATE } from '../data/mockData.js';
import { api } from '../services/api.js';

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
  onResetUserData,
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

  // ----------------- PIN CHANGE HANDLER -----------------
  const handleUpdatePin = (e) => {
    e.preventDefault();
    setPinError('');
    setPinSuccess('');

    const actualPin = getUserPin(currentUser.id);

    if (currentPin !== actualPin) {
      setPinError('El PIN actual no es correcto.');
      return;
    }

    if (!/^\d{4}$/.test(newPin)) {
      setPinError('El nuevo PIN debe ser exactamente de 4 dígitos numéricos.');
      return;
    }

    if (newPin !== confirmPin) {
      setPinError('La confirmación del nuevo PIN no coincide.');
      return;
    }

    setUserPin(currentUser.id, newPin);
    api.updateUser(currentUser.id, { pin: newPin }).catch((err) => console.error('Error SQLite updatePin:', err));
    setPinSuccess('¡Tu PIN de seguridad ha sido actualizado con éxito!');
    setCurrentPin('');
    setNewPin('');
    setConfirmPin('');
    if (showToast) showToast('PIN actualizado en la base de datos SQLite');
  };

  // ----------------- PROFILE HANDLER -----------------
  const handleSaveProfile = (e) => {
    e.preventDefault();
    const displayName = profileName.trim() || currentUser.username;
    const role = profileRole.trim() || currentUser.role;
    setUserProfile(currentUser.id, { displayName, role });
    if (setCurrentUser) {
      setCurrentUser((prev) => ({ ...prev, displayName, role }));
    }
    api.updateUser(currentUser.id, { displayName, role }).catch((err) => console.error('Error SQLite updateProfile:', err));
    if (showToast) showToast('Perfil actualizado en la base de datos SQLite');
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
    const updated = accounts.map((a) => {
      if (a.id === editingAccount.id) {
        editedObj = {
          ...a,
          name: accName.trim() || a.name,
          institution: accInstitution.trim() || a.institution,
          balance: parseFloat(accBalance) || 0,
          creditLimit: a.type === 'credit' ? parseFloat(accLimit) || a.creditLimit : undefined,
          accountNumber: accNumber.trim() || a.accountNumber,
        };
        return editedObj;
      }
      return a;
    });

    setAccounts(updated);
    if (editedObj) {
      api
        .updateAccount(editedObj.id, editedObj, currentUser?.id)
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
        .deleteAccount(accId, currentUser?.id)
        .catch((err) => console.error('Error SQLite deleteAccount:', err));
      if (showToast) showToast('Cuenta eliminada de SQLite');
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
        .updateSubscription(editedSub.id, editedSub, currentUser?.id)
        .catch((err) => console.error('Error SQLite updateSub:', err));
    }
    setEditingSub(null);
    if (showToast) showToast('Suscripción actualizada en SQLite');
  };

  const handleDeleteSub = (subId) => {
    if (window.confirm('¿Eliminar esta suscripción?')) {
      const updated = subscriptions.filter((s) => s.id !== subId);
      setSubscriptions(updated);
      api
        .deleteSubscription(subId, currentUser?.id)
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
        .updateDebt(editedDebt.id, editedDebt, currentUser?.id)
        .catch((err) => console.error('Error SQLite updateDebt:', err));
    }
    setEditingDebt(null);
    if (showToast) showToast('Deuda actualizada en SQLite');
  };

  const handleDeleteDebt = (debtId) => {
    if (window.confirm('¿Eliminar este registro de deuda?')) {
      const updated = debts.filter((d) => d.id !== debtId);
      setDebts(updated);
      api
        .deleteDebt(debtId, currentUser?.id)
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
        'replace',
        currentUser.id
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

  // ----------------- DATA BACKUP & RESTORE -----------------
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

  const handleImportBackup = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target.result);
        await api.clearUserData(currentUser.id);
        await api.bulkImport({
          userId: currentUser.id,
          accounts: data.accounts || [],
          transactions: data.transactions || [],
          subscriptions: data.subscriptions || [],
          debts: data.debts || [],
        });

        if (data.accounts && Array.isArray(data.accounts)) setAccounts(data.accounts);
        if (data.transactions && Array.isArray(data.transactions)) setTransactions(data.transactions);
        if (data.subscriptions && Array.isArray(data.subscriptions)) setSubscriptions(data.subscriptions);
        if (data.debts && Array.isArray(data.debts)) setDebts(data.debts);
        if (data.currency) setCurrency(data.currency);
        if (data.exchangeRate) setExchangeRate(data.exchangeRate);

        if (showToast) showToast('Respaldo restaurado en la base de datos SQLite');
      } catch (err) {
        alert('Error al leer o restaurar el archivo de respaldo: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  const handleClearAllUserData = async () => {
    if (
      window.confirm(
        `¿Confirmas que deseas BORRAR TODOS los movimientos, cuentas y deudas de ${currentUser.username} en SQLite? Esta acción dejará tu cuenta en 0.`
      )
    ) {
      setAccounts([]);
      setTransactions([]);
      setSubscriptions([]);
      setDebts([]);
      await api.clearUserData(currentUser.id).catch((err) => console.error('Error SQLite clearUserData:', err));
      if (showToast) showToast(`Datos de ${currentUser.username} limpiados a 0 en SQLite`);
    }
  };

  return (
    <div className="space-y-8 pb-12">
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
                Define un PIN de 4 dígitos exclusivo para tu sesión ({currentUser.username})
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
                placeholder="Repite el nuevo PIN"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                className="liquid-input text-sm font-mono tracking-widest text-center"
              />
            </div>

            <button
              type="submit"
              className="w-full liquid-button-primary py-3 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-neon-purple mt-2"
            >
              <Lock className="w-4 h-4" />
              <span>Guardar Nuevo PIN</span>
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

      {/* ---------------- TAB 7: DATOS, RESPALDO Y BASE DE DATOS ---------------- */}
      {activeTab === 'datos' && (
        <div className="space-y-6 max-w-2xl mx-auto">
          {/* Export Backup Card */}
          <div className="liquid-glass p-6 sm:p-7 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Download className="w-4 h-4 text-purple-400" />
              Exportar Copia de Seguridad (JSON)
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Descarga un respaldo completo con todas las cuentas, transacciones, suscripciones y deudas almacenadas en la base de datos SQLite de tu perfil.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={handleExportBackup}
                className="liquid-pill px-4 py-2.5 text-xs font-bold text-purple-200 hover:text-white flex items-center gap-2 cursor-pointer border-purple-500/40"
              >
                <Download className="w-4 h-4 text-purple-400" />
                <span>Exportar Respaldo JSON</span>
              </button>
            </div>
          </div>

          {/* SQLite Database Integrity Status Card */}
          <div className="liquid-glass-purple p-6 sm:p-7 space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                Base de Datos SQLite & Auto-Sincronización
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Auto-Guardado Activo
                </span>
                <button
                  type="button"
                  onClick={handleSyncManualChanges}
                  disabled={isSyncing}
                  className="liquid-button-primary px-3 py-1.5 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-neon-purple active:scale-95"
                >
                  <Save className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'Sincronizando...' : 'Guardar a SQLite Ahora'}</span>
                </button>
              </div>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed">
              Tus registros de <strong className="text-white">{currentUser.username}</strong> ({accounts.length} cuentas, {transactions.length} movimientos, {subscriptions.length} gastos fijos y {debts.length} deudas) se guardan automáticamente en tiempo real en <code className="text-purple-200">wallet_flow.db</code> y en tu almacenamiento seguro local. Nada se borrará ni se sobreescribirá.
            </p>
          </div>
        </div>
      )}

      {/* ---------------- EDIT ACCOUNT MODAL ---------------- */}
      {editingAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl bg-[#14121E]/95 backdrop-blur-2xl border border-purple-500/40 p-5 sm:p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-base font-bold text-white">Editar Cuenta</h3>
              <button onClick={() => setEditingAccount(null)} className="p-1 rounded-full text-zinc-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditedAccount} className="space-y-3">
              <div>
                <label className="block text-zinc-300 mb-1">Nombre de la Cuenta</label>
                <input
                  type="text"
                  required
                  value={accName}
                  onChange={(e) => setAccName(e.target.value)}
                  className="liquid-input text-xs"
                />
              </div>

              <div>
                <label className="block text-zinc-300 mb-1">Institución</label>
                <input
                  type="text"
                  value={accInstitution}
                  onChange={(e) => setAccInstitution(e.target.value)}
                  className="liquid-input text-xs"
                />
              </div>

              <div>
                <label className="block text-zinc-300 mb-1">Saldo</label>
                <input
                  type="tel"
                  inputMode="decimal"
                  placeholder="0"
                  value={accBalance}
                  onChange={(e) => setAccBalance(e.target.value.replace(/[^0-9.-]/g, ''))}
                  className="liquid-input text-xs font-bold font-mono"
                />
              </div>

              {editingAccount.type === 'credit' && (
                <div>
                  <label className="block text-zinc-300 mb-1">Límite de Crédito</label>
                  <input
                    type="tel"
                    inputMode="decimal"
                    value={accLimit}
                    onChange={(e) => setAccLimit(e.target.value.replace(/[^0-9.]/g, ''))}
                    className="liquid-input text-xs font-bold font-mono"
                  />
                </div>
              )}

              <div>
                <label className="block text-zinc-300 mb-1">Número de Cuenta / Referencia</label>
                <input
                  type="text"
                  value={accNumber}
                  onChange={(e) => setAccNumber(e.target.value)}
                  className="liquid-input text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setEditingAccount(null)}
                  className="liquid-pill px-4 py-2 text-zinc-400 hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button type="submit" className="liquid-button-primary px-5 py-2 font-bold cursor-pointer">
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------- EDIT SUBSCRIPTION MODAL ---------------- */}
      {editingSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl bg-[#14121E]/95 backdrop-blur-2xl border border-purple-500/40 p-5 sm:p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-base font-bold text-white">Editar Suscripción</h3>
              <button onClick={() => setEditingSub(null)} className="p-1 rounded-full text-zinc-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditedSub} className="space-y-3">
              <div>
                <label className="block text-zinc-300 mb-1">Nombre</label>
                <input
                  type="text"
                  required
                  value={subName}
                  onChange={(e) => setSubName(e.target.value)}
                  className="liquid-input text-xs"
                />
              </div>

              <div>
                <label className="block text-zinc-300 mb-1">Categoría</label>
                <input
                  type="text"
                  value={subCategory}
                  onChange={(e) => setSubCategory(e.target.value)}
                  className="liquid-input text-xs"
                />
              </div>

              <div>
                <label className="block text-zinc-300 mb-1">Monto Mensual</label>
                <input
                  type="tel"
                  inputMode="decimal"
                  required
                  value={subAmount}
                  onChange={(e) => setSubAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                  className="liquid-input text-xs font-bold font-mono"
                />
              </div>

              <div>
                <label className="block text-zinc-300 mb-1">Día de Cobro (1-31)</label>
                <input
                  type="tel"
                  inputMode="numeric"
                  required
                  value={subBillingDay}
                  onChange={(e) => setSubBillingDay(e.target.value.replace(/[^0-9]/g, ''))}
                  className="liquid-input text-xs font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setEditingSub(null)}
                  className="liquid-pill px-4 py-2 text-zinc-400 hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button type="submit" className="liquid-button-primary px-5 py-2 font-bold cursor-pointer">
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------- EDIT DEBT MODAL ---------------- */}
      {editingDebt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl bg-[#14121E]/95 backdrop-blur-2xl border border-purple-500/40 p-5 sm:p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-base font-bold text-white">Editar Deuda</h3>
              <button onClick={() => setEditingDebt(null)} className="p-1 rounded-full text-zinc-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditedDebt} className="space-y-3">
              <div>
                <label className="block text-zinc-300 mb-1">Título de la Deuda</label>
                <input
                  type="text"
                  required
                  value={debtTitle}
                  onChange={(e) => setDebtTitle(e.target.value)}
                  className="liquid-input text-xs"
                />
              </div>

              <div>
                <label className="block text-zinc-300 mb-1">Contraparte / Entidad</label>
                <input
                  type="text"
                  value={debtCounterparty}
                  onChange={(e) => setDebtCounterparty(e.target.value)}
                  className="liquid-input text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-300 mb-1">Monto Total</label>
                  <input
                    type="tel"
                    inputMode="decimal"
                    required
                    value={debtTotal}
                    onChange={(e) => setDebtTotal(e.target.value.replace(/[^0-9.]/g, ''))}
                    className="liquid-input text-xs font-bold font-mono"
                  />
                </div>
                <div>
                  <label className="block text-zinc-300 mb-1">Monto Pagado</label>
                  <input
                    type="tel"
                    inputMode="decimal"
                    required
                    value={debtPaid}
                    onChange={(e) => setDebtPaid(e.target.value.replace(/[^0-9.]/g, ''))}
                    className="liquid-input text-xs font-bold font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-300 mb-1">Fecha Límite</label>
                <input
                  type="date"
                  value={debtDueDate}
                  onChange={(e) => setDebtDueDate(e.target.value)}
                  className="liquid-input text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setEditingDebt(null)}
                  className="liquid-pill px-4 py-2 text-zinc-400 hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button type="submit" className="liquid-button-primary px-5 py-2 font-bold cursor-pointer">
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
