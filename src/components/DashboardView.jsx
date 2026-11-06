import React, { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Percent,
  AlertTriangle,
  ArrowRight,
  Filter,
  Sparkles,
  Calendar,
  Layers,
} from 'lucide-react';
import { HeroCard } from './HeroCard.jsx';
import { FluidLineChart, CategoryRingChart } from './Charts.jsx';
import { formatCurrency, TIMEFRAME_CONFIG, DEFAULT_USD_COP_RATE } from '../data/mockData.js';

export const DashboardView = ({
  accounts = [],
  transactions = [],
  timeframe = 'monthly',
  currency = 'USD',
  exchangeRate = DEFAULT_USD_COP_RATE,
  onOpenNewTransaction,
  onOpenNewAccount,
  onSelectAccount,
  onNavigateTab,
}) => {
  const [filterType, setFilterType] = useState('all');

  const tfData = TIMEFRAME_CONFIG[timeframe] || TIMEFRAME_CONFIG.monthly;
  const multiplier = tfData.multiplier || 1;

  // Compute incomes and expenses scaled or summed
  const totalIncomes = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const totalExpenses = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const antExpenses = transactions
    .filter((t) => t.isAntExpense)
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const netSavings = totalIncomes - totalExpenses;
  const savingsRate = totalIncomes > 0 ? Math.round((netSavings / totalIncomes) * 100) : 0;
  const antPercentageOfExpenses = totalExpenses > 0 ? Math.round((antExpenses / totalExpenses) * 100) : 0;

  // Filtered transactions for quick list
  const filteredTransactions = transactions.filter((tx) => {
    if (filterType === 'income') return tx.type === 'income';
    if (filterType === 'expense') return tx.type === 'expense';
    if (filterType === 'ant') return tx.isAntExpense;
    return true;
  });

  return (
    <div className="space-y-6 sm:space-y-8 pb-12">
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Incomes Card */}
        <div className="liquid-glass p-5 space-y-3 relative overflow-hidden group hover:border-emerald-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400">Ingresos Totales</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-300">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white tracking-tight">
            {formatCurrency(totalIncomes * (multiplier === 0.25 ? 0.4 : multiplier === 1 ? 1 : multiplier * 0.9), currency, exchangeRate)}
          </p>
          <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1 border-t border-white/10">
            <span>Periodo {tfData.label}</span>
            <span className="text-emerald-400 font-medium">+15.4% vs prev.</span>
          </div>
        </div>

        {/* Expenses Card */}
        <div className="liquid-glass p-5 space-y-3 relative overflow-hidden group hover:border-rose-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400">Gastos Consolidados</span>
            <div className="w-8 h-8 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-300">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white tracking-tight">
            {formatCurrency(totalExpenses * (multiplier === 0.25 ? 0.35 : multiplier === 1 ? 1 : multiplier * 0.88), currency, exchangeRate)}
          </p>
          <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1 border-t border-white/10">
            <span>Periodo {tfData.label}</span>
            <span className="text-rose-400 font-medium">+3.8% controlado</span>
          </div>
        </div>

        {/* Savings Rate Card */}
        <div className="liquid-glass p-5 space-y-3 relative overflow-hidden group hover:border-purple-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400">Tasa de Ahorro / Inversión</span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold text-white tracking-tight">{savingsRate}%</p>
            <span className="text-xs text-purple-300 font-medium">del ingreso neto</span>
          </div>
          <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-fuchsia-500 rounded-full"
              style={{ width: `${Math.min(100, Math.max(0, savingsRate))}%` }}
            />
          </div>
        </div>

        {/* Ant Expenses Alert Card (Diagnóstico Rápido) */}
        <div
          onClick={() => onNavigateTab('ai-advisor')}
          className="liquid-glass-purple p-5 space-y-3 relative overflow-hidden group hover:border-fuchsia-400/60 transition-all cursor-pointer shadow-liquid-purple"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-purple-200">Fuga Gastos Hormiga</span>
            <div className="w-8 h-8 rounded-xl bg-fuchsia-500/25 border border-fuchsia-400/40 flex items-center justify-center text-fuchsia-300 animate-pulse">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white tracking-tight">
            {formatCurrency(antExpenses, currency, exchangeRate)}
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
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7">
          <FluidLineChart timeframe={timeframe} />
        </div>
        <div className="lg:col-span-5">
          <CategoryRingChart transactions={transactions} />
        </div>
      </div>

      {/* 4. RECENT TRANSACTIONS FEED (Liquid Glass Table with Interactive Filters) */}
      <div className="liquid-glass p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Movimientos Recientes del Periodo
              </h3>
              <p className="text-xs text-zinc-400">
                Auditoría detallada con asignación de cuenta y categoría
              </p>
            </div>
          </div>

          {/* Quick Segment Filter */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/40 border border-white/10 text-xs">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                filterType === 'all'
                  ? 'bg-purple-600/40 text-purple-200 border border-purple-400/30 font-semibold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setFilterType('income')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                filterType === 'income'
                  ? 'bg-emerald-600/30 text-emerald-200 border border-emerald-400/30 font-semibold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Ingresos
            </button>
            <button
              onClick={() => setFilterType('expense')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                filterType === 'expense'
                  ? 'bg-rose-600/30 text-rose-200 border border-rose-400/30 font-semibold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Gastos
            </button>
            <button
              onClick={() => setFilterType('ant')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
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
            <div className="p-8 text-center text-zinc-400 space-y-2">
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
                  className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-purple-500/30 transition-all duration-200"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                        isIncome
                          ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300'
                          : tx.isAntExpense
                          ? 'bg-fuchsia-500/20 border-fuchsia-500/30 text-fuchsia-300'
                          : 'bg-purple-500/20 border-purple-500/30 text-purple-300'
                      }`}
                    >
                      {isIncome ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-white truncate group-hover:text-purple-200 transition-colors">
                          {tx.title}
                        </p>
                        {tx.isAntExpense && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            Gasto Hormiga
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-zinc-400 mt-0.5 flex-wrap">
                        <span className="text-purple-300 font-medium">{tx.category}</span>
                        <span>•</span>
                        <span>{acc ? `${acc.name} (${acc.institution})` : 'Cuenta Principal'}</span>
                        <span>•</span>
                        <span>{tx.date}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-0 border-white/5">
                    <div className="text-right">
                      <p
                        className={`text-base font-bold tracking-tight ${
                          isIncome ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {isIncome
                          ? `+${formatCurrency(tx.amount, currency, exchangeRate)}`
                          : `-${formatCurrency(tx.amount, currency, exchangeRate)}`}
                      </p>
                      {tx.notes && (
                        <p className="text-[11px] text-zinc-500 truncate max-w-[200px]">
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
        <div className="pt-2 flex justify-between items-center text-xs">
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
