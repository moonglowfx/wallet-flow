import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Percent,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Layers,
  Edit2,
} from 'lucide-react';
import { HeroCard } from './HeroCard.jsx';
import { FluidLineChart, CategoryRingChart } from './Charts.jsx';
import { AnimatedCounter } from './AnimatedCounter.jsx';
import {
  formatCurrency,
  TIMEFRAME_CONFIG,
  DEFAULT_USD_COP_RATE,
  filterTransactionsByPeriod,
  formatTxAmount,
} from '../data/finance.js';

export const DashboardView = ({
  accounts = [],
  transactions = [],
  timeframe = 'monthly',
  selectedYear = '2026',
  currency = 'USD',
  exchangeRate = DEFAULT_USD_COP_RATE,
  onOpenNewTransaction,
  onEditTransaction,
  onDeleteTransaction,
  onOpenNewAccount,
  onSelectAccount,
  onNavigateTab,
}) => {
  const [filterType, setFilterType] = useState('all');

  const tfData = TIMEFRAME_CONFIG[timeframe] || TIMEFRAME_CONFIG.monthly;

  // Real filtered transactions strictly according to the active timeframe & selected year
  const activePeriodTxs = useMemo(() => {
    return filterTransactionsByPeriod(transactions, timeframe, selectedYear);
  }, [transactions, timeframe, selectedYear]);

  // Exact real income and expense sums without artificial multipliers
  const periodIncomes = activePeriodTxs
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const periodExpenses = activePeriodTxs
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const periodAntExpenses = activePeriodTxs
    .filter((t) => t.isAntExpense || (t.type === 'expense' && Number(t.amount) <= 15))
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const netSavings = periodIncomes - periodExpenses;
  const savingsRate = periodIncomes > 0 ? Math.round((netSavings / periodIncomes) * 100) : 0;
  const antPercentageOfExpenses =
    periodExpenses > 0 ? Math.round((periodAntExpenses / periodExpenses) * 100) : 0;

  // Filtered transactions for quick list
  const filteredTransactions = activePeriodTxs.filter((tx) => {
    if (filterType === 'income') return tx.type === 'income';
    if (filterType === 'expense') return tx.type === 'expense';
    if (filterType === 'ant') return tx.isAntExpense || Number(tx.amount) <= 15;
    return true;
  });

  return (
    <div className="space-y-5 sm:space-y-8 pb-6">
      {/* 1. HERO CARD (Capital Actual + Desglose Seccionado por Cuentas) */}
      <HeroCard
        accounts={accounts}
        timeframe={timeframe}
        currency={currency}
        exchangeRate={exchangeRate}
        onSelectAccount={onSelectAccount}
        onOpenNewTransaction={onOpenNewTransaction}
        onOpenNewAccount={onOpenNewAccount}
      />

      {/* 2. SUMMARY METRIC CARDS (4 Glass Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Incomes Card */}
        <div className="liquid-glass hover-lift p-4 sm:p-5 space-y-2.5 sm:space-y-3 relative overflow-hidden group hover:border-emerald-500/40 transition-all min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-zinc-400 truncate">Ingresos Totales</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-300 shrink-0">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-white tracking-tight truncate font-mono">
            <AnimatedCounter
              value={periodIncomes}
              formatter={(v) => formatCurrency(v, currency, exchangeRate)}
            />
          </p>
          <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1 border-t border-white/10">
            <span>Periodo {tfData.label}</span>
            <span className="text-emerald-400 font-medium">Flujo Real</span>
          </div>
        </div>

        {/* Expenses Card */}
        <div className="liquid-glass hover-lift p-4 sm:p-5 space-y-2.5 sm:space-y-3 relative overflow-hidden group hover:border-rose-500/40 transition-all min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-zinc-400 truncate">Gastos Consolidados</span>
            <div className="w-8 h-8 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-300 shrink-0">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-white tracking-tight truncate font-mono">
            <AnimatedCounter
              value={periodExpenses}
              formatter={(v) => formatCurrency(v, currency, exchangeRate)}
            />
          </p>
          <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1 border-t border-white/10">
            <span>Periodo {tfData.label}</span>
            <span className="text-rose-400 font-medium">
              {activePeriodTxs.filter((t) => t.type === 'expense').length} movimientos
            </span>
          </div>
        </div>

        {/* Savings Rate Card */}
        <div className="liquid-glass hover-lift p-4 sm:p-5 space-y-2.5 sm:space-y-3 relative overflow-hidden group hover:border-purple-500/40 transition-all min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-zinc-400 truncate">
              Tasa de Ahorro / Inversión
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300 shrink-0">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-xl sm:text-2xl font-bold text-white tracking-tight font-mono">
              <AnimatedCounter value={savingsRate} formatter={(v) => `${Math.round(v)}%`} />
            </p>
            <span className="text-xs text-purple-300 font-medium">del ingreso neto</span>
          </div>
          <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-fuchsia-500 rounded-full transition-all duration-700"
              style={{ width: `${Math.min(100, Math.max(0, savingsRate))}%` }}
            />
          </div>
        </div>

        {/* Ant Expenses Alert Card (Diagnóstico Rápido) */}
        <div
          onClick={() => onNavigateTab('ai-advisor')}
          className="liquid-glass-purple hover-lift p-4 sm:p-5 space-y-2.5 sm:space-y-3 relative overflow-hidden group hover:border-fuchsia-400/60 transition-all cursor-pointer shadow-liquid-purple min-w-0"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-purple-200 truncate">
              Fuga Gastos Hormiga
            </span>
            <div className="w-8 h-8 rounded-xl bg-fuchsia-500/25 border border-fuchsia-400/40 flex items-center justify-center text-fuchsia-300 animate-pulse shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-white tracking-tight truncate font-mono">
            <AnimatedCounter
              value={periodAntExpenses}
              formatter={(v) => formatCurrency(v, currency, exchangeRate)}
            />
          </p>
          <div className="flex items-center justify-between text-[11px] text-fuchsia-200 pt-1 border-t border-purple-400/20">
            <span>{antPercentageOfExpenses}% de egresos</span>
            <span className="flex items-center gap-1 font-semibold underline text-white">
              Ver IA <Sparkles className="w-3 h-3 text-fuchsia-400" />
            </span>
          </div>
        </div>
      </div>

      {/* 3. VISUAL CHARTS (Fluid Line + Ring Donut) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
        <div className="lg:col-span-7 min-w-0">
          <FluidLineChart
            timeframe={timeframe}
            selectedYear={selectedYear}
            transactions={transactions}
            currency={currency}
            exchangeRate={exchangeRate}
          />
        </div>
        <div className="lg:col-span-5 min-w-0">
          <CategoryRingChart
            transactions={activePeriodTxs}
            currency={currency}
            exchangeRate={exchangeRate}
          />
        </div>
      </div>

      {/* 4. RECENT TRANSACTIONS FEED (Liquid Glass Table with Interactive Filters) */}
      <div className="liquid-glass p-4 sm:p-6 space-y-4 sm:space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 shrink-0">
              <Layers className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-white tracking-tight truncate">
                Movimientos Recientes del Periodo
              </h3>
              <p className="text-xs text-zinc-400 truncate">
                Auditoría detallada con asignación de cuenta y categoría
              </p>
            </div>
          </div>

          {/* Quick Segment Filter */}
          <div className="w-full sm:w-auto grid grid-cols-4 sm:flex items-center gap-1 p-1 rounded-xl bg-black/40 border border-white/10 text-[11px] sm:text-xs">
            <button
              onClick={() => setFilterType('all')}
              className={`px-2 sm:px-3 py-1.5 rounded-lg transition-colors cursor-pointer text-center truncate ${
                filterType === 'all'
                  ? 'bg-purple-600/40 text-purple-200 border border-purple-400/30 font-semibold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setFilterType('income')}
              className={`px-2 sm:px-3 py-1.5 rounded-lg transition-colors cursor-pointer text-center truncate ${
                filterType === 'income'
                  ? 'bg-emerald-600/30 text-emerald-200 border border-emerald-400/30 font-semibold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Ingresos
            </button>
            <button
              onClick={() => setFilterType('expense')}
              className={`px-2 sm:px-3 py-1.5 rounded-lg transition-colors cursor-pointer text-center truncate ${
                filterType === 'expense'
                  ? 'bg-rose-600/30 text-rose-200 border border-rose-400/30 font-semibold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Gastos
            </button>
            <button
              onClick={() => setFilterType('ant')}
              className={`px-1.5 sm:px-3 py-1.5 rounded-lg transition-colors cursor-pointer text-center truncate ${
                filterType === 'ant'
                  ? 'bg-fuchsia-600/30 text-fuchsia-200 border border-fuchsia-400/30 font-semibold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Hormiga 🐜
            </button>
          </div>
        </div>

        {/* Transaction items list */}
        <div className="space-y-2.5">
          {filteredTransactions.length === 0 ? (
            <div className="p-6 sm:p-8 text-center text-zinc-400 space-y-2">
              <Layers className="w-8 h-8 text-purple-400 mx-auto" />
              <p className="text-sm font-semibold text-white">No hay movimientos registrados</p>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                Registra tus ingresos o gastos para que el sistema audite tu flujo y alimente las estadísticas.
              </p>
              <button
                onClick={onOpenNewTransaction}
                className="liquid-button-primary px-4 py-2 text-xs font-semibold mt-2 cursor-pointer inline-flex items-center gap-1.5"
              >
                <span>+ Registrar Primer Movimiento</span>
              </button>
            </div>
          ) : (
            filteredTransactions.slice(0, 8).map((tx) => {
              const acc = accounts.find((a) => a.id === tx.accountId);
              const isIncome = tx.type === 'income';

              return (
                <div
                  key={tx.id}
                  onClick={() => onEditTransaction && onEditTransaction(tx)}
                  className="group flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 p-3 sm:p-3.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-purple-500/30 transition-all duration-200 cursor-pointer"
                >
                  <div className="flex items-start sm:items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                        isIncome
                          ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300'
                          : tx.isAntExpense
                          ? 'bg-fuchsia-500/20 border-fuchsia-500/30 text-fuchsia-300'
                          : 'bg-purple-500/20 border-purple-500/30 text-purple-300'
                      }`}
                    >
                      {isIncome ? (
                        <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
                      ) : (
                        <TrendingDown className="w-4 h-4 sm:w-5 sm:h-5" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-white truncate group-hover:text-purple-200 transition-colors">
                          {tx.title}
                        </p>
                        {tx.isAntExpense && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 shrink-0">
                            Gasto Hormiga
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs text-zinc-400 mt-0.5 flex-wrap">
                        <span className="text-purple-300 font-medium">{tx.category}</span>
                        <span>•</span>
                        <span className="truncate max-w-[180px] sm:max-w-none">
                          {acc ? `${acc.name}` : 'Cuenta Principal'}
                        </span>
                        <span>•</span>
                        <span>{tx.date}</span>
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
                        {isIncome ? '+' : '-'}
                        {formatTxAmount(tx)}
                      </p>
                      {tx.notes && (
                        <p className="text-[11px] text-zinc-500 truncate max-w-[200px] hidden sm:block">
                          {tx.notes}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* View all footer CTA */}
        <div className="pt-2 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs">
          <span className="text-zinc-500">
            Mostrando {Math.min(8, filteredTransactions.length)} de {transactions.length} registros
          </span>
          <button
            onClick={() => onNavigateTab('accounts')}
            className="text-purple-300 hover:text-purple-100 flex items-center gap-1 font-semibold group cursor-pointer"
          >
            <span>Ver Bóveda y Libro Completo</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
};
