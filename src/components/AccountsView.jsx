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
} from 'lucide-react';
import { formatCurrency } from '../data/mockData.js';

export const AccountsView = ({
  accounts = [],
  transactions = [],
  onOpenNewAccount,
  onOpenNewTransaction,
  selectedAccountId,
  setSelectedAccountId,
}) => {
  const [activeAccountType, setActiveAccountType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter accounts by type tab
  const filteredAccounts = accounts.filter((acc) => {
    if (activeAccountType === 'all') return true;
    return acc.type === activeAccountType;
  });

  // Filter transactions by selected account, search, etc.
  const ledgerTransactions = transactions.filter((tx) => {
    const matchesAccount = selectedAccountId ? tx.accountId === selectedAccountId : true;
    const matchesSearch =
      tx.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (tx.notes && tx.notes.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesAccount && matchesSearch;
  });

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
    <div className="space-y-8 pb-12">
      {/* Header with CTA buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Wallet className="w-5 h-5 text-purple-400" />
            Bóveda de Cuentas y Liquidez
          </h2>
          <p className="text-xs text-zinc-400">
            Administración de Efectivo, Cuentas Bancarias y Tarjetas de Crédito
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={onOpenNewAccount}
            className="liquid-pill px-4 py-2.5 text-xs font-semibold text-purple-200 hover:text-white flex items-center gap-2 border-purple-500/40 hover:bg-purple-600/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 text-purple-400" />
            <span>Crear Nueva Cuenta</span>
          </button>
          <button
            onClick={onOpenNewTransaction}
            className="liquid-button-primary px-4 py-2.5 text-xs font-semibold flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar Movimiento</span>
          </button>
        </div>
      </div>

      {/* Account Type Filter Pills */}
      <div className="flex flex-wrap items-center gap-2">
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
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
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

                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${badge.color}`}
                >
                  {badge.label}
                </span>
              </div>

              {/* Main Balance Display */}
              <div className="space-y-1 mb-4 relative z-10">
                <span className="text-[11px] uppercase tracking-wider text-zinc-400 font-medium">
                  {acc.type === 'credit' ? 'Saldo Deudor Actual' : 'Saldo Disponible'}
                </span>
                <p
                  className={`text-2xl font-black tracking-tight ${
                    isNegative ? 'text-rose-400' : 'text-white'
                  }`}
                >
                  {formatCurrency(acc.balance)}
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
                      <span className="text-zinc-400">
                        Límite {formatCurrency(acc.creditLimit)}
                      </span>
                      <span className="text-rose-300 font-semibold">
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

      {/* Transactions Ledger Panel */}
      <div className="liquid-glass p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white tracking-tight">
                Libro Mayor de Movimientos
              </h3>
              {currentSelectedAccount && (
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-400/30">
                  {currentSelectedAccount.name}
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400">
              {ledgerTransactions.length} transacciones vinculadas obligatoriamente a una cuenta y categoría
            </p>
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:w-72">
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
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-purple-500/30 transition-all duration-150"
                >
                  <div className="flex items-center gap-3 min-w-0">
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

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-white truncate">
                          {tx.title}
                        </span>
                        {tx.isAntExpense && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            Hormiga
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-zinc-400 mt-0.5 flex-wrap">
                        <span className="text-purple-300 font-medium">{tx.category}</span>
                        <span>•</span>
                        <span className="text-zinc-300">{acc?.name || 'Cuenta'}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-zinc-500" />
                          {tx.date}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p
                      className={`text-base font-bold tracking-tight ${
                        isIncome ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {isIncome ? `+${formatCurrency(tx.amount)}` : `-${formatCurrency(tx.amount)}`}
                    </p>
                    {tx.notes && (
                      <p className="text-[11px] text-zinc-500 max-w-[240px] truncate">
                        {tx.notes}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
