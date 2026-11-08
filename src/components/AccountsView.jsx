import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Wallet,
  Plus,
  CreditCard,
  Banknote,
  Building2,
  Search,
  Filter,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  Percent,
  Calendar,
  AlertCircle,
  CalendarDays,
  Clock,
  Edit2,
  Trash2,
  X,
  ArrowLeft,
  ArrowRightLeft,
  ChevronLeft,
  ChevronRight,
  GripVertical,
} from 'lucide-react';
import {
  formatCurrency,
  formatNativeCurrency,
  DEFAULT_USD_COP_RATE,
  TIMEFRAME_CONFIG,
  filterTransactionsByPeriod,
} from '../data/mockData.js';
import { api } from '../services/api.js';
import { AnimatedCounter } from './AnimatedCounter.jsx';

const TIMEFRAMES = ['weekly', 'monthly', 'quarterly', 'yearly'];

export const AccountsView = ({
  currentUser,
  accounts = [],
  setAccounts,
  transactions = [],
  timeframe = 'monthly',
  setTimeframe,
  selectedYear = '2026',
  currency = 'USD',
  exchangeRate = DEFAULT_USD_COP_RATE,
  onOpenNewAccount,
  onOpenNewTransaction,
  onOpenTransfer,
  onEditTransaction,
  onDeleteTransaction,
  selectedAccountId,
  setSelectedAccountId,
  showToast,
}) => {
  const [internalSelectedAccountId, setInternalSelectedAccountId] = useState(null);
  const activeAccountId = selectedAccountId !== undefined ? selectedAccountId : internalSelectedAccountId;
  const setActiveAccountId = setSelectedAccountId || setInternalSelectedAccountId;

  const [activeAccountType, setActiveAccountType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [scopeFilter, setScopeFilter] = useState('period'); // 'period' (respects timeframe) or 'all'
  const [editingAccount, setEditingAccount] = useState(null);
  const [accName, setAccName] = useState('');
  const [accInstitution, setAccInstitution] = useState('');
  const [accCurrency, setAccCurrency] = useState('USD');
  const [accBalance, setAccBalance] = useState('');
  const [accLimit, setAccLimit] = useState('');
  const [accNumber, setAccNumber] = useState('');

  const openEditAccountModal = (acc, e) => {
    if (e) e.stopPropagation();
    setEditingAccount(acc);
    setAccName(acc.name || '');
    setAccInstitution(acc.institution || '');
    setAccCurrency(acc.currency || 'USD');
    setAccBalance((acc.balance || 0).toString());
    setAccLimit((acc.creditLimit || '').toString());
    setAccNumber(acc.accountNumber || '');
  };

  // Lock body scroll when editing account
  useEffect(() => {
    if (editingAccount) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [editingAccount]);

  const handleSaveEditedAccount = (e) => {
    e.preventDefault();
    if (!editingAccount || !setAccounts) return;
    let editedObj = null;
    const parsedBal = accBalance === '' ? 0 : parseFloat(accBalance);
    const validBal = Number.isFinite(parsedBal) ? parsedBal : 0;
    const parsedLim = parseFloat(accLimit);
    const validLim = Number.isFinite(parsedLim) ? parsedLim : undefined;

    const updated = accounts.map((a) => {
      if (a.id === editingAccount.id) {
        editedObj = {
          ...a,
          name: accName.trim() || a.name,
          institution: accInstitution.trim() || a.institution,
          currency: accCurrency,
          balance: accCurrency === 'COP' ? Math.round(validBal) : Math.round(validBal * 100) / 100,
          creditLimit: a.type === 'credit' ? validLim : undefined,
          accountNumber: accNumber.trim() || a.accountNumber,
        };
        return editedObj;
      }
      return a;
    });
    setAccounts(updated);
    if (editedObj) {
      api.updateAccount(editedObj.id, editedObj, currentUser?.id || 'munboi');
    }
    setEditingAccount(null);
    if (showToast) showToast('Cuenta actualizada en SQLite');
  };

  const [draggedAccountId, setDraggedAccountId] = useState(null);

  const persistAccountOrder = async (newAccs) => {
    if (!setAccounts) return;
    setAccounts(newAccs);
    const orderIds = newAccs.map((a) => a.id);
    await api.reorderAccounts(orderIds, currentUser?.id || 'munboi');
    if (showToast) showToast('Orden de cuentas guardado');
  };

  const handleMoveAccount = (accountId, direction, e) => {
    if (e) e.stopPropagation();
    const currentIndex = accounts.findIndex((a) => a.id === accountId);
    if (currentIndex === -1) return;
    const targetIndex = currentIndex + direction;
    if (targetIndex < 0 || targetIndex >= accounts.length) return;

    const newAccounts = [...accounts];
    const [moved] = newAccounts.splice(currentIndex, 1);
    newAccounts.splice(targetIndex, 0, moved);

    persistAccountOrder(newAccounts);
  };

  const handleDragStart = (e, accountId) => {
    setDraggedAccountId(accountId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', accountId);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, targetAccountId) => {
    e.preventDefault();
    if (!draggedAccountId || draggedAccountId === targetAccountId) return;

    const fromIndex = accounts.findIndex((a) => a.id === draggedAccountId);
    const toIndex = accounts.findIndex((a) => a.id === targetAccountId);
    if (fromIndex === -1 || toIndex === -1) return;

    const newAccounts = [...accounts];
    const [moved] = newAccounts.splice(fromIndex, 1);
    newAccounts.splice(toIndex, 0, moved);

    setDraggedAccountId(null);
    persistAccountOrder(newAccounts);
  };

  // Dynamic transactions filtered in real time by the active global timeframe and year
  const periodTxs = React.useMemo(() => {
    return filterTransactionsByPeriod(transactions, timeframe, selectedYear);
  }, [transactions, timeframe, selectedYear]);

  const targetTxs = scopeFilter === 'period' ? periodTxs : transactions;

  // Filter accounts by type tab
  const filteredAccounts = accounts.filter((acc) => {
    if (activeAccountType === 'all') return true;
    return acc.type === activeAccountType;
  });

  // Filter transactions by selected account, search, and global scope
  const ledgerTransactions = React.useMemo(() => {
    return targetTxs.filter((tx) => {
      const matchesAccount = activeAccountId ? tx.accountId === activeAccountId : true;
      const matchesSearch =
        searchQuery === '' ||
        tx.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (tx.notes && tx.notes.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesAccount && matchesSearch;
    });
  }, [targetTxs, activeAccountId, searchQuery]);

  // Aggregated totals in active timeframe for the accounts view
  const periodIncomeTotal = React.useMemo(() => {
    return periodTxs
      .filter((t) => (activeAccountId ? t.accountId === activeAccountId : true) && t.type === 'income')
      .reduce((s, t) => s + (Number(t.amount) || 0), 0);
  }, [periodTxs, activeAccountId]);

  const periodExpenseTotal = React.useMemo(() => {
    return periodTxs
      .filter((t) => (activeAccountId ? t.accountId === activeAccountId : true) && t.type === 'expense')
      .reduce((s, t) => s + (Number(t.amount) || 0), 0);
  }, [periodTxs, activeAccountId]);

  const getAccountIcon = (type) => {
    switch (type) {
      case 'cash':
        return Banknote;
      case 'credit':
        return CreditCard;
      default:
        return Building2;
    }
  };

  const getAccountBadge = (type) => {
    switch (type) {
      case 'cash':
        return { label: 'Efectivo', color: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' };
      case 'credit':
        return { label: 'Tarjeta de Crédito', color: 'bg-rose-500/15 text-rose-300 border-rose-500/30' };
      default:
        return { label: 'Cuenta Bancaria', color: 'bg-purple-500/15 text-purple-300 border-purple-500/30' };
    }
  };

  const displayedAccounts = React.useMemo(() => {
    if (activeAccountId) {
      const match = accounts.find((a) => a.id === activeAccountId);
      return match ? [match] : filteredAccounts;
    }
    return filteredAccounts;
  }, [accounts, filteredAccounts, activeAccountId]);

  const currentSelectedAccount = accounts.find((a) => a.id === activeAccountId);

  return (
    <div className="space-y-6 sm:space-y-8 pb-6">
      {/* Header with CTA buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 sm:gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Wallet className="w-5 h-5 text-purple-400 shrink-0" />
            <span>Bóveda de Cuentas y Liquidez</span>
          </h2>
          <p className="text-xs text-zinc-400">
            Administración de Efectivo, Cuentas Bancarias y Tarjetas de Crédito
          </p>
        </div>

        <div className="grid grid-cols-1 sm:flex sm:flex-wrap items-center gap-2 w-full sm:w-auto">
          {onOpenTransfer && (
            <button
              onClick={onOpenTransfer}
              className="liquid-pill px-4 py-2.5 text-xs font-semibold text-purple-200 hover:text-white flex items-center justify-center gap-2 border-purple-500/40 hover:bg-purple-600/20 transition-all cursor-pointer"
              title="Transferir fondos entre cuentas con conversión de divisa"
            >
              <ArrowRightLeft className="w-4 h-4 text-purple-400 shrink-0" />
              <span>Transferir Fondos</span>
            </button>
          )}
          <button
            onClick={onOpenNewAccount}
            className="liquid-pill px-4 py-2.5 text-xs font-semibold text-purple-200 hover:text-white flex items-center justify-center gap-2 border-purple-500/40 hover:bg-purple-600/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 text-purple-400 shrink-0" />
            <span className="truncate">Nueva Cuenta</span>
          </button>
          <button
            onClick={onOpenNewTransaction}
            className="liquid-button-primary px-4 py-2.5 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>Registrar Movimiento</span>
          </button>
        </div>
      </div>

      {/* Account Type Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar">
        {[
          { id: 'all', label: 'Todas las Cuentas' },
          { id: 'bank', label: 'Cuentas Bancarias (Débito/Ahorro)' },
          { id: 'cash', label: 'Efectivo & Billetera' },
          { id: 'credit', label: 'Tarjetas de Crédito' },
        ].map((tab) => {
          const isActive = activeAccountType === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveAccountType(tab.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                isActive
                  ? 'bg-purple-600/35 text-purple-200 border border-purple-400/40 shadow-liquid-purple'
                  : 'bg-white/[0.04] text-zinc-400 hover:text-white border border-white/5'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Focused Account Notification Banner */}
      {activeAccountId && currentSelectedAccount && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-purple-950/70 via-indigo-950/50 to-purple-950/70 border border-purple-500/50 shadow-liquid-purple animate-fade-in backdrop-blur-xl">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-400 animate-pulse shrink-0" />
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-bold text-white truncate flex items-center gap-1.5">
                <span>Cuenta Seleccionada:</span>
                <span className="text-purple-300 font-extrabold">{currentSelectedAccount.name}</span>
              </p>
              <p className="text-[11px] text-zinc-400 truncate">
                Las demás cuentas se han ocultado. Mostrando su libro mayor de movimientos exclusivo abajo.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActiveAccountId(null)}
            className="liquid-button-primary px-3 sm:px-4 py-1.5 text-xs font-bold shrink-0 flex items-center justify-center gap-1.5 cursor-pointer shadow-neon-purple active:scale-95"
            title="Deseleccionar y ver todas las cuentas"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Ver todas las cuentas ({accounts.length})</span>
          </button>
        </div>
      )}

      {/* Accounts Grid (Cards) */}
      {displayedAccounts.length === 0 ? (
        <div className="liquid-glass p-8 text-center space-y-4 max-w-lg mx-auto">
          <Wallet className="w-10 h-10 text-purple-400 mx-auto" />
          <div>
            <h3 className="text-base font-bold text-white">No hay cuentas registradas</h3>
            <p className="text-xs text-zinc-400 mt-1">
              Crea tu primera cuenta para comenzar a registrar movimientos, asociar pagos y consultar balances.
            </p>
          </div>
          <button
            onClick={onOpenNewAccount}
            className="liquid-button-primary px-5 py-2.5 text-xs font-semibold inline-flex items-center gap-2 cursor-pointer shadow-neon-purple"
          >
            <Plus className="w-4 h-4" />
            <span>Crear Mi Primera Cuenta</span>
          </button>
        </div>
      ) : (
        <div className={activeAccountId ? 'max-w-xl mx-auto w-full' : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'}>
          {displayedAccounts.map((acc) => {
            const Icon = getAccountIcon(acc.type);
            const badge = getAccountBadge(acc.type);
            const isSelected = activeAccountId === acc.id;
            const isNegative = acc.balance < 0;

            return (
              <div
                key={acc.id}
                draggable={!activeAccountId}
                onDragStart={(e) => handleDragStart(e, acc.id)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, acc.id)}
                onClick={() => setActiveAccountId(isSelected ? null : acc.id)}
                className={`relative p-5 rounded-2xl backdrop-blur-xl border hover-lift animate-card-sheen transition-all duration-300 cursor-pointer overflow-hidden ${
                  draggedAccountId === acc.id ? 'opacity-40 border-purple-400 border-dashed scale-95' : ''
                } ${
                  isSelected
                    ? 'bg-purple-900/35 border-purple-400/70 shadow-liquid-purple ring-2 ring-purple-400/50 scale-[1.01]'
                    : 'bg-white/[0.04] hover:bg-white/[0.07] border-white/10 hover:border-purple-500/40 shadow-liquid'
                }`}
              >
                {/* Top ambient glow */}
                <div
                  className={`pointer-events-none absolute -top-12 -right-12 w-32 h-32 rounded-full blur-2xl ${
                    acc.type === 'credit'
                      ? 'bg-rose-600/15'
                      : acc.type === 'cash'
                      ? 'bg-emerald-600/15'
                      : 'bg-purple-600/20'
                  }`}
                />

                <div className="flex flex-wrap sm:flex-nowrap items-start justify-between gap-2.5 mb-3.5 relative z-10">
                  <div className="flex items-center gap-3 min-w-0 flex-1 pr-1">
                    <div
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border ${
                        acc.type === 'credit'
                          ? 'bg-rose-500/20 border-rose-500/30 text-rose-300'
                          : acc.type === 'cash'
                          ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300'
                          : 'bg-purple-500/20 border-purple-500/30 text-purple-300'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-white text-sm tracking-tight truncate">
                        {acc.name}
                      </h3>
                      <p className="text-xs text-zinc-400 truncate">{acc.institution}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${badge.color}`}
                    >
                      {badge.label}
                    </span>

                    {/* Reordering Controls (Desktop & Mobile) */}
                    {!activeAccountId && (
                      <div className="flex items-center gap-0.5 bg-white/5 rounded-lg border border-white/10 p-0.5">
                        <button
                          type="button"
                          disabled={accounts.findIndex((a) => a.id === acc.id) === 0}
                          onClick={(e) => handleMoveAccount(acc.id, -1, e)}
                          className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-white/10 disabled:opacity-25 disabled:pointer-events-none cursor-pointer transition-colors"
                          title="Mover cuenta hacia la izquierda / arriba"
                        >
                          <ChevronLeft className="w-3 h-3" />
                        </button>
                        <span
                          className="px-0.5 text-zinc-500 hover:text-zinc-300 cursor-grab active:cursor-grabbing"
                          title="Arrastrar para ordenar"
                        >
                          <GripVertical className="w-3 h-3" />
                        </span>
                        <button
                          type="button"
                          disabled={accounts.findIndex((a) => a.id === acc.id) === accounts.length - 1}
                          onClick={(e) => handleMoveAccount(acc.id, 1, e)}
                          className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-white/10 disabled:opacity-25 disabled:pointer-events-none cursor-pointer transition-colors"
                          title="Mover cuenta hacia la derecha / abajo"
                        >
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={(e) => openEditAccountModal(acc, e)}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-purple-500/20 text-zinc-400 hover:text-purple-200 border border-white/10 hover:border-purple-400/40 transition-colors cursor-pointer"
                      title="Editar cuenta"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Main Balance Display */}
                <div className="space-y-1 mb-4 relative z-10">
                  <span className="text-[11px] uppercase tracking-wider text-zinc-400 font-medium">
                    {acc.type === 'credit' ? `Saldo Deudor (${acc.currency || 'USD'})` : `Saldo Disponible (${acc.currency || 'USD'})`}
                  </span>
                  <p
                    className={`text-2xl font-black tracking-tight font-mono ${
                      isNegative ? 'text-rose-400' : 'text-white'
                    }`}
                  >
                    <AnimatedCounter
                      value={acc.balance}
                      formatter={(v) => formatNativeCurrency(v, acc.currency || 'USD')}
                    />
                  </p>
                </div>

                {/* Account Meta & Badges */}
                <div className="pt-3 border-t border-white/10 space-y-2 relative z-10 text-xs">
                  <div className="flex items-center justify-between text-zinc-400">
                    <span>Identificador</span>
                    <span className="font-mono text-zinc-200">{acc.accountNumber}</span>
                  </div>

                  {acc.type === 'credit' && acc.creditLimit && (
                    <div className="space-y-1 pt-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-zinc-400 font-mono">
                          Límite {formatNativeCurrency(acc.creditLimit, acc.currency || 'USD')}
                        </span>
                        <span className="text-rose-300 font-semibold font-mono">
                          {Math.round((Math.abs(acc.balance) / acc.creditLimit) * 100)}%
                          utilizado
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-rose-500 to-amber-500 rounded-full"
                          style={{
                            width: `${Math.min(
                              100,
                              Math.round((Math.abs(acc.balance) / acc.creditLimit) * 100)
                            )}%`,
                          }}
                        />
                      </div>
                      {acc.paymentDueDay && (
                        <p className="text-[10px] text-zinc-400 pt-0.5">
                          Corte día {acc.cutOffDay} • Pagar antes del día {acc.paymentDueDay}
                        </p>
                      )}
                    </div>
                  )}

                  {acc.type === 'bank' && acc.yieldRate && (
                    <div className="flex items-center justify-between text-[11px] text-emerald-300 pt-1">
                      <span>Tasa de Rendimiento</span>
                      <span className="font-semibold">+{acc.yieldRate}% Anual</span>
                    </div>
                  )}
                </div>

                {isSelected && (
                  <div className="mt-3.5 pt-2.5 border-t border-purple-400/30 flex items-center justify-between text-xs text-purple-200">
                    <span className="font-bold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      Cuenta Seleccionada
                    </span>
                    <span className="text-[11px] font-bold text-purple-300 hover:text-white flex items-center gap-1 bg-purple-500/20 px-2.5 py-1 rounded-lg border border-purple-400/30">
                      <X className="w-3 h-3" />
                      Deseleccionar
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Transactions Ledger Panel with Real-Time Period Synchronization */}
      <div className="liquid-glass p-4 sm:p-6 space-y-4 sm:space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center gap-1.5 flex-wrap">
                <span>Libro Mayor</span>
                {currentSelectedAccount ? (
                  <span className="text-purple-300 font-extrabold">• {currentSelectedAccount.name}</span>
                ) : (
                  <span className="text-zinc-400 font-normal">• Todas las Cuentas</span>
                )}
              </h3>
              {currentSelectedAccount && (
                <button
                  type="button"
                  onClick={() => setActiveAccountId(null)}
                  className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-200 hover:text-white border border-purple-400/30 flex items-center gap-1 cursor-pointer"
                  title="Deseleccionar y ver movimientos de todas las cuentas"
                >
                  <X className="w-3 h-3" />
                  <span>Ver todas</span>
                </button>
              )}
              {/* Active Period Synchronized Badge */}
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-purple-900/30 border border-purple-500/30 text-purple-200 flex items-center gap-1">
                <Clock className="w-3 h-3 text-purple-400" />
                <span>{TIMEFRAME_CONFIG[timeframe]?.label || 'Este Mes'}</span>
                <span>•</span>
                <span className="text-white font-bold">{selectedYear === 'all' ? 'Histórico' : selectedYear}</span>
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Mostrando {ledgerTransactions.length} movimientos {scopeFilter === 'period' ? 'en el período seleccionado' : 'en todo el historial'}
            </p>
          </div>

          {/* Timeframe Selector Pills directly inside Libro Mayor de Movimientos */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-wrap w-full lg:w-auto">
            {setTimeframe && (
              <div
                role="tablist"
                aria-label="Filtro Temporal del Libro Mayor"
                className="bg-black/50 backdrop-blur-xl p-1 rounded-2xl border border-white/10 grid grid-cols-4 sm:flex items-center gap-1 shadow-inner text-xs"
              >
                {TIMEFRAMES.map((tf) => {
                  const active = scopeFilter === 'period' && timeframe === tf;
                  return (
                    <button
                      key={tf}
                      type="button"
                      onClick={() => {
                        setScopeFilter('period');
                        setTimeframe(tf);
                      }}
                      className={`px-2 sm:px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-all duration-200 cursor-pointer text-center truncate ${
                        active
                          ? 'bg-gradient-to-r from-purple-600 to-violet-600 text-white shadow-liquid-purple border border-purple-400/40'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <span className="sm:hidden">{TIMEFRAME_CONFIG[tf]?.shortLabel || tf}</span>
                      <span className="hidden sm:inline">{TIMEFRAME_CONFIG[tf]?.label || tf}</span>
                    </button>
                  );
                })}
              </div>
            )}

            <button
              type="button"
              onClick={() => setScopeFilter(scopeFilter === 'all' ? 'period' : 'all')}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-all border cursor-pointer text-center ${
                scopeFilter === 'all'
                  ? 'bg-purple-600/40 text-purple-200 border-purple-400/40 shadow-sm'
                  : 'bg-black/40 text-zinc-400 hover:text-white border-white/10'
              }`}
            >
              Todo ({transactions.length})
            </button>

            <div className="relative flex-1 sm:w-56">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar movimiento..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="liquid-input pl-9 text-xs"
              />
            </div>
          </div>
        </div>

        {/* Period Summary Metric Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 pt-1 text-xs">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between gap-2 min-w-0">
            <span className="text-zinc-400 text-[11px] truncate">Entradas en este período:</span>
            <span className="font-bold text-emerald-400 font-mono shrink-0">
              +{formatCurrency(periodIncomeTotal, currency, exchangeRate)}
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-between gap-2 min-w-0">
            <span className="text-zinc-400 text-[11px] truncate">Salidas en este período:</span>
            <span className="font-bold text-rose-400 font-mono shrink-0">
              -{formatCurrency(periodExpenseTotal, currency, exchangeRate)}
            </span>
          </div>
        </div>

        {/* Ledger table items */}
        {ledgerTransactions.length === 0 ? (
          <div className="p-8 text-center text-zinc-400 space-y-2">
            <AlertCircle className="w-8 h-8 text-purple-400 mx-auto" />
            <p className="text-sm font-medium">No se encontraron movimientos con este filtro</p>
            <button
              onClick={() => {
                setSelectedAccountId(null);
                setSearchQuery('');
              }}
              className="text-xs text-purple-300 underline cursor-pointer"
            >
              Restablecer filtros
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {ledgerTransactions.map((tx) => {
              const acc = accounts.find((a) => a.id === tx.accountId);
              const isIncome = tx.type === 'income';

              return (
                <div
                  key={tx.id}
                  onClick={() => onEditTransaction && onEditTransaction(tx)}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 p-3 sm:p-3.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-purple-500/30 transition-all duration-150 cursor-pointer group"
                >
                  <div className="flex items-start sm:items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                        isIncome
                          ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300'
                          : 'bg-rose-500/20 border-rose-500/30 text-rose-300'
                      }`}
                    >
                      {isIncome ? (
                        <ArrowDownLeft className="w-4 h-4" />
                      ) : (
                        <ArrowUpRight className="w-4 h-4" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-white truncate group-hover:text-purple-200 transition-colors">
                          {tx.title}
                        </span>
                        {tx.isAntExpense && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 shrink-0">
                            Hormiga
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs text-zinc-400 mt-0.5 flex-wrap">
                        <span className="text-purple-300 font-medium">{tx.category}</span>
                        <span>•</span>
                        <span className="text-zinc-300 truncate max-w-[150px] sm:max-w-none">{acc?.name || 'Cuenta'}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-zinc-500" />
                          {tx.date}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-0 border-white/5">
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditTransaction && onEditTransaction(tx);
                        }}
                        className="p-1.5 rounded-lg bg-purple-500/15 hover:bg-purple-500/30 text-purple-300 hover:text-white border border-purple-500/30 hover:border-purple-400 transition-all cursor-pointer active:scale-95 shadow-sm"
                        title="Editar movimiento"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {onDeleteTransaction && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm ? window.confirm(`¿Eliminar movimiento "${tx.title}"?`) : true) {
                              onDeleteTransaction(tx.id);
                            }
                          }}
                          className="p-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/30 text-rose-400 hover:text-rose-200 border border-rose-500/30 hover:border-rose-400 transition-all cursor-pointer active:scale-95 shadow-sm"
                          title="Eliminar movimiento"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-sm sm:text-base font-bold tracking-tight font-mono ${
                          isIncome ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {isIncome
                          ? `+${formatCurrency(tx.amount, currency, exchangeRate)}`
                          : `-${formatCurrency(tx.amount, currency, exchangeRate)}`}
                      </p>
                      {tx.notes && (
                        <p className="text-[11px] text-zinc-500 max-w-[240px] truncate hidden sm:block">
                          {tx.notes}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Inline Account Edit Modal */}
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
            className="w-full max-w-md h-[92dvh] sm:h-auto sm:max-h-[88dvh] flex flex-col rounded-t-3xl sm:rounded-3xl bg-[#14121E] sm:bg-[#14121E]/95 backdrop-blur-2xl border-t sm:border border-purple-500/40 p-0 overflow-hidden text-xs shadow-neon-purple relative"
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
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-zinc-300 font-medium text-xs">Saldo ({accCurrency})</label>
                    <div className="flex items-center gap-1 bg-white/5 p-0.5 rounded-lg border border-white/10">
                      <button
                        type="button"
                        onClick={() => setAccCurrency('USD')}
                        className={`px-2.5 py-0.5 rounded text-[11px] font-bold transition-all ${
                          accCurrency === 'USD' ? 'bg-purple-600 text-white shadow-sm' : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        USD
                      </button>
                      <button
                        type="button"
                        onClick={() => setAccCurrency('COP')}
                        className={`px-2.5 py-0.5 rounded text-[11px] font-bold transition-all ${
                          accCurrency === 'COP' ? 'bg-purple-600 text-white shadow-sm' : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        COP
                      </button>
                    </div>
                  </div>
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
                    <label className="block text-zinc-300 font-medium mb-1.5 text-xs">Límite de Crédito ({accCurrency})</label>
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
    </div>
  );
};
