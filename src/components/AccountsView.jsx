import React, { useState } from 'react';
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
} from 'lucide-react';
import {
  formatCurrency,
  formatNativeCurrency,
  DEFAULT_USD_COP_RATE,
  TIMEFRAME_CONFIG,
  filterTransactionsByPeriod,
} from '../data/mockData.js';
import { api } from '../services/api.js';

export const AccountsView = ({
  currentUser,
  accounts = [],
  setAccounts,
  transactions = [],
  timeframe = 'monthly',
  selectedYear = '2026',
  currency = 'USD',
  exchangeRate = DEFAULT_USD_COP_RATE,
  onOpenNewAccount,
  onOpenNewTransaction,
  onEditTransaction,
  onDeleteTransaction,
  selectedAccountId,
  setSelectedAccountId,
  showToast,
}) => {
  const [activeAccountType, setActiveAccountType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [scopeFilter, setScopeFilter] = useState('period'); // 'period' (respects global timeframe) or 'all'
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
      const matchesAccount = selectedAccountId ? tx.accountId === selectedAccountId : true;
      const matchesSearch =
        searchQuery === '' ||
        tx.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (tx.notes && tx.notes.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesAccount && matchesSearch;
    });
  }, [targetTxs, selectedAccountId, searchQuery]);

  // Aggregated totals in active timeframe for the accounts view
  const periodIncomeTotal = React.useMemo(() => {
    return periodTxs
      .filter((t) => (selectedAccountId ? t.accountId === selectedAccountId : true) && t.type === 'income')
      .reduce((s, t) => s + (Number(t.amount) || 0), 0);
  }, [periodTxs, selectedAccountId]);

  const periodExpenseTotal = React.useMemo(() => {
    return periodTxs
      .filter((t) => (selectedAccountId ? t.accountId === selectedAccountId : true) && t.type === 'expense')
      .reduce((s, t) => s + (Number(t.amount) || 0), 0);
  }, [periodTxs, selectedAccountId]);

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

  const currentSelectedAccount = accounts.find((a) => a.id === selectedAccountId);

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

      {/* Accounts Grid (Cards) */}
      {filteredAccounts.length === 0 ? (
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAccounts.map((acc) => {
            const Icon = getAccountIcon(acc.type);
            const badge = getAccountBadge(acc.type);
            const isSelected = selectedAccountId === acc.id;
            const isNegative = acc.balance < 0;

            return (
              <div
                key={acc.id}
                onClick={() => setSelectedAccountId(isSelected ? null : acc.id)}
                className={`relative p-5 rounded-2xl backdrop-blur-xl border transition-all duration-300 cursor-pointer overflow-hidden ${
                  isSelected
                    ? 'bg-purple-900/30 border-purple-400/60 shadow-liquid-purple ring-1 ring-purple-400/40'
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

                <div className="flex items-start justify-between gap-3 mb-4 relative z-10">
                  <div className="flex items-center gap-3 min-w-0">
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
                    <div className="min-w-0">
                      <h3 className="font-bold text-white text-sm tracking-tight truncate">
                        {acc.name}
                      </h3>
                      <p className="text-xs text-zinc-400 truncate">{acc.institution}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${badge.color}`}
                    >
                      {badge.label}
                    </span>
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
                    {formatNativeCurrency(acc.balance, acc.currency || 'USD')}
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
                  <div className="mt-3 pt-2 text-center text-[11px] font-semibold text-purple-300 bg-purple-500/10 rounded-lg py-1 border border-purple-400/20">
                    Filtrando historial de esta cuenta (clic para limpiar)
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
              <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                Libro Mayor de Movimientos
              </h3>
              {currentSelectedAccount && (
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-400/30 truncate max-w-[180px]">
                  {currentSelectedAccount.name}
                </span>
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

          {/* Scope Selector (Period vs All) & Search Bar */}
          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
            <div className="w-full sm:w-auto bg-black/40 p-1 rounded-xl border border-white/10 grid grid-cols-2 sm:flex items-center text-xs">
              <button
                type="button"
                onClick={() => setScopeFilter('period')}
                className={`px-2.5 py-1.5 sm:py-1 rounded-lg font-bold transition-all cursor-pointer text-center ${
                  scopeFilter === 'period'
                    ? 'bg-purple-600/50 text-white shadow-sm border border-purple-400/40'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {TIMEFRAME_CONFIG[timeframe]?.shortLabel || 'Período'} ({periodTxs.length})
              </button>
              <button
                type="button"
                onClick={() => setScopeFilter('all')}
                className={`px-2.5 py-1.5 sm:py-1 rounded-lg font-bold transition-all cursor-pointer text-center ${
                  scopeFilter === 'all'
                    ? 'bg-purple-600/50 text-white shadow-sm border border-purple-400/40'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Todo ({transactions.length})
              </button>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por concepto o categoría..."
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

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-0 border-white/5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditTransaction && onEditTransaction(tx);
                      }}
                      className="liquid-pill px-2.5 py-1 text-[11px] font-semibold text-purple-200 hover:text-white flex items-center gap-1 border-purple-500/30 hover:border-purple-400 cursor-pointer"
                      title="Editar movimiento"
                    >
                      <Edit2 className="w-3 h-3 text-purple-400" />
                      <span>Editar</span>
                    </button>
                    <div className="text-right">
                      <p
                        className={`text-sm sm:text-base font-bold tracking-tight ${
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
      {editingAccount && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditingAccount(null);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl bg-[#14121E]/95 backdrop-blur-2xl border border-purple-500/40 p-5 sm:p-6 space-y-4 text-xs shadow-2xl"
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-base font-bold text-white">Editar Cuenta</h3>
              <button
                type="button"
                onClick={() => setEditingAccount(null)}
                className="p-1 rounded-full text-zinc-400 hover:text-white cursor-pointer"
              >
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
                <div className="flex items-center justify-between mb-1">
                  <label className="text-zinc-300">Saldo ({accCurrency})</label>
                  <div className="flex items-center gap-1 bg-white/5 p-0.5 rounded-lg border border-white/10">
                    <button
                      type="button"
                      onClick={() => setAccCurrency('USD')}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${accCurrency === 'USD' ? 'bg-purple-600 text-white' : 'text-zinc-400'}`}
                    >
                      USD
                    </button>
                    <button
                      type="button"
                      onClick={() => setAccCurrency('COP')}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${accCurrency === 'COP' ? 'bg-purple-600 text-white' : 'text-zinc-400'}`}
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
                  className="liquid-input text-xs font-bold font-mono"
                />
              </div>

              {editingAccount.type === 'credit' && (
                <div>
                  <label className="block text-zinc-300 mb-1">Límite de Crédito ({accCurrency})</label>
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
    </div>
  );
};
