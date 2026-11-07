import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Search,
  Filter,
  TrendingDown,
  ArrowDownLeft,
  Building2,
  Wallet,
  Clock,
  ChevronDown,
  ChevronRight,
  Flame,
  FileSpreadsheet,
  Plus,
  Coins,
  Layers,
} from 'lucide-react';
import { formatCurrency, DEFAULT_USD_COP_RATE } from '../data/mockData.js';

export const MonthlyExpensesView = ({
  transactions = [],
  accounts = [],
  currency = 'USD',
  exchangeRate = DEFAULT_USD_COP_RATE,
  onOpenNewTransaction,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedAccountId, setSelectedAccountId] = useState('all');

  // Filter only expenses
  const allExpenses = useMemo(() => {
    return transactions.filter((t) => t.type === 'expense');
  }, [transactions]);

  // Group all expenses by month (YYYY-MM) in reverse chronological order
  const monthGroups = useMemo(() => {
    const groups = {};

    allExpenses.forEach((t) => {
      if (!t.date) return;
      const monthKey = t.date.slice(0, 7); // e.g. "2026-11"
      if (!groups[monthKey]) {
        groups[monthKey] = {
          monthKey,
          transactions: [],
          total: 0,
          antTotal: 0,
        };
      }
      groups[monthKey].transactions.push(t);
      const amt = Number(t.amount) || 0;
      groups[monthKey].total += amt;
      if (t.isAntExpense || amt <= 15) {
        groups[monthKey].antTotal += amt;
      }
    });

    // Sort transactions within each month by date descending (newest first)
    Object.keys(groups).forEach((key) => {
      groups[key].transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
    });

    // Sort month keys descending (newest month first)
    const sortedKeys = Object.keys(groups).sort((a, b) => b.localeCompare(a));
    return sortedKeys.map((k) => groups[k]);
  }, [allExpenses]);

  // Active selected month tab (defaults to newest month available, e.g. 2026-11)
  const [activeMonthKey, setActiveMonthKey] = useState(() => {
    if (monthGroups.length > 0) return monthGroups[0].monthKey;
    return '2026-11';
  });

  const activeGroup = useMemo(() => {
    return monthGroups.find((g) => g.monthKey === activeMonthKey) || monthGroups[0] || null;
  }, [monthGroups, activeMonthKey]);

  // Format month name in Spanish (e.g. "Noviembre 2026")
  const formatMonthName = (monthKey) => {
    if (!monthKey) return '';
    const [year, month] = monthKey.split('-');
    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
    ];
    const mIdx = parseInt(month, 10) - 1;
    return `${monthNames[mIdx] || month} ${year}`;
  };

  // Filter transactions of active month by search, category, account
  const displayedTransactions = useMemo(() => {
    if (!activeGroup) return [];
    return activeGroup.transactions.filter((tx) => {
      const matchesSearch =
        searchQuery === '' ||
        tx.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (tx.notes && tx.notes.toLowerCase().includes(searchQuery.toLowerCase())) ||
        tx.category.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCat = selectedCategory === 'all' || tx.category === selectedCategory;
      const matchesAcc = selectedAccountId === 'all' || tx.accountId === selectedAccountId;

      return matchesSearch && matchesCat && matchesAcc;
    });
  }, [activeGroup, searchQuery, selectedCategory, selectedAccountId]);

  // Category breakdown for active month
  const categorySummary = useMemo(() => {
    if (!activeGroup) return [];
    const catMap = {};
    activeGroup.transactions.forEach((tx) => {
      catMap[tx.category] = (catMap[tx.category] || 0) + (Number(tx.amount) || 0);
    });
    return Object.entries(catMap)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, amount]) => ({
        category: cat,
        amount,
        percentage: activeGroup.total > 0 ? Math.round((amount / activeGroup.total) * 100) : 0,
      }));
  }, [activeGroup]);

  // Available categories in the current month for the filter dropdown
  const availableCategories = useMemo(() => {
    if (!activeGroup) return [];
    return Array.from(new Set(activeGroup.transactions.map((t) => t.category)));
  }, [activeGroup]);

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="liquid-glass-purple p-6 sm:p-8 space-y-4 relative overflow-hidden">
        <div className="pointer-events-none absolute -top-24 -right-24 w-80 h-80 rounded-full bg-purple-600/20 blur-3xl" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 via-rose-600 to-indigo-600 flex items-center justify-center text-white shadow-neon-purple border border-white/30 shrink-0">
              <Calendar className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Historial de Gastos por Mes
                </h2>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  {allExpenses.length} Gastos Registrados
                </span>
              </div>
              <p className="text-xs text-zinc-300 mt-1">
                Consulta tus gastos agrupados cronológicamente mes a mes con concepto, cantidad, categoría, cuenta y fecha
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenNewTransaction}
              className="liquid-button-primary px-4 py-2.5 text-xs font-semibold flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Registrar Gasto</span>
            </button>
          </div>
        </div>

        {/* Horizontal Scrollable Months Timeline Pills Bar */}
        <div className="pt-2 border-t border-white/10 relative z-10">
          <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">
            Selecciona el Mes a Consultar ({monthGroups.length} meses con historial):
          </p>
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
            {monthGroups.map((g) => {
              const isActive = activeMonthKey === g.monthKey;
              return (
                <button
                  key={g.monthKey}
                  onClick={() => {
                    setActiveMonthKey(g.monthKey);
                    setSelectedCategory('all');
                  }}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-2 ${
                    isActive
                      ? 'bg-gradient-to-r from-purple-600 to-rose-600 text-white shadow-liquid-purple border border-purple-400/50 scale-105'
                      : 'bg-white/[0.04] text-zinc-400 hover:text-white hover:bg-white/[0.08] border border-white/5'
                  }`}
                >
                  <span>{formatMonthName(g.monthKey)}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isActive ? 'bg-black/30 text-white font-mono' : 'bg-white/5 text-zinc-400'}`}>
                    {g.transactions.length}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {allExpenses.length === 0 ? (
        <div className="liquid-glass p-12 text-center space-y-4 max-w-lg mx-auto">
          <TrendingDown className="w-12 h-12 text-rose-400 mx-auto" />
          <h3 className="text-lg font-bold text-white">No hay gastos registrados</h3>
          <p className="text-xs text-zinc-400">
            Comienza registrando tus primeros egresos para visualizarlos ordenados por fecha y agrupados mensualmente.
          </p>
          <button
            onClick={onOpenNewTransaction}
            className="liquid-button-primary px-5 py-2.5 text-xs font-semibold inline-flex items-center gap-2 cursor-pointer shadow-neon-purple"
          >
            <span>+ Registrar Primer Gasto</span>
          </button>
        </div>
      ) : activeGroup ? (
        <div className="space-y-6">
          {/* Active Month Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="liquid-glass p-5 space-y-2 border-rose-500/30">
              <span className="text-xs text-zinc-400 font-medium">Total Gastado en {formatMonthName(activeGroup.monthKey)}</span>
              <p className="text-2xl font-black text-rose-400">
                {formatCurrency(activeGroup.total, currency, exchangeRate)}
              </p>
              <span className="text-[11px] text-zinc-400 block">
                {activeGroup.transactions.length} movimientos en el mes
              </span>
            </div>

            <div className="liquid-glass p-5 space-y-2 border-amber-500/30">
              <span className="text-xs text-zinc-400 font-medium">Promedio Diario del Mes</span>
              <p className="text-2xl font-black text-amber-300">
                {formatCurrency(activeGroup.total / 30, currency, exchangeRate)}
                <span className="text-xs text-zinc-400 font-normal"> / día</span>
              </p>
              <span className="text-[11px] text-zinc-400 block">
                Ritmo de consumo diario
              </span>
            </div>

            <div className="liquid-glass p-5 space-y-2 border-purple-500/30">
              <span className="text-xs text-zinc-400 font-medium">Fuga Gastos Hormiga (≤ $15)</span>
              <p className="text-2xl font-black text-purple-300">
                {formatCurrency(activeGroup.antTotal, currency, exchangeRate)}
              </p>
              <span className="text-[11px] text-zinc-400 block">
                {activeGroup.total > 0 ? Math.round((activeGroup.antTotal / activeGroup.total) * 100) : 0}% del gasto de este mes
              </span>
            </div>

            <div className="liquid-glass p-5 space-y-2 border-fuchsia-500/30">
              <span className="text-xs text-zinc-400 font-medium">Categoría Principal</span>
              <p className="text-xl font-bold text-white truncate">
                {categorySummary[0]?.category || 'N/A'}
              </p>
              <span className="text-[11px] text-fuchsia-300 block">
                {categorySummary[0] ? `${formatCurrency(categorySummary[0].amount, currency, exchangeRate)} (${categorySummary[0].percentage}%)` : ''}
              </span>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl liquid-glass">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={`Buscar en ${formatMonthName(activeGroup.monthKey)} (concepto, nota)...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="liquid-input pl-9 text-xs"
              />
            </div>

            {/* Category and Account filter dropdowns */}
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="liquid-input text-xs py-2 px-3 cursor-pointer w-auto"
              >
                <option value="all">Todas las Categorías ({availableCategories.length})</option>
                {availableCategories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="liquid-input text-xs py-2 px-3 cursor-pointer w-auto"
              >
                <option value="all">Todas las Cuentas</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Expenses List / Table strictly ordered by date */}
          <div className="liquid-glass rounded-2xl overflow-hidden border border-white/10">
            <div className="p-4 bg-white/[0.02] border-b border-white/10 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-purple-400" />
                <span>Gastos de {formatMonthName(activeGroup.monthKey)} en Orden Cronológico</span>
              </h3>
              <span className="text-xs text-zinc-400 font-mono">
                {displayedTransactions.length} de {activeGroup.transactions.length} movimientos
              </span>
            </div>

            {displayedTransactions.length === 0 ? (
              <div className="p-8 text-center text-zinc-400 space-y-2">
                <p className="text-sm font-semibold text-white">No hay gastos que coincidan con el filtro</p>
                <p className="text-xs text-zinc-400">Prueba ajustando el término de búsqueda o la categoría.</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {displayedTransactions.map((tx) => {
                  const acc = accounts.find((a) => a.id === tx.accountId);
                  const isAnt = tx.isAntExpense || Number(tx.amount) <= 15;

                  return (
                    <div
                      key={tx.id}
                      className="p-4 hover:bg-white/[0.04] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      {/* Left: Date + Concept + Tags */}
                      <div className="flex items-start sm:items-center gap-3 min-w-0">
                        {/* Date badge */}
                        <div className="px-2.5 py-1 rounded-xl bg-purple-900/30 border border-purple-500/30 text-purple-200 font-mono text-[11px] font-bold shrink-0">
                          {tx.date}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-white text-sm truncate">
                              {tx.title}
                            </span>
                            {isAnt && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1 shrink-0">
                                <Flame className="w-3 h-3" />
                                <span>Hormiga</span>
                              </span>
                            )}
                          </div>
                          {tx.notes && tx.notes !== tx.title && (
                            <p className="text-zinc-400 text-[11px] truncate mt-0.5">
                              {tx.notes}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Right: Category + Account + Amount */}
                      <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pl-11 sm:pl-0">
                        {/* Category */}
                        <span className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-zinc-300">
                          {tx.category}
                        </span>

                        {/* Account Name */}
                        <span className="text-[11px] text-zinc-400 hidden md:inline-flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-purple-400" />
                          <span>{acc ? acc.name : 'Cuenta Principal'}</span>
                        </span>

                        {/* Amount in active currency */}
                        <div className="text-right min-w-[90px]">
                          <span className="text-sm font-black text-rose-400 font-mono">
                            -{formatCurrency(tx.amount, currency, exchangeRate)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
};
