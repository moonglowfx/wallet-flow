import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Search,
  TrendingDown,
  TrendingUp,
  ArrowDownLeft,
  ArrowUpRight,
  Building2,
  Wallet,
  Clock,
  ChevronLeft,
  ChevronRight,
  Flame,
  Plus,
  Coins,
  Filter,
} from 'lucide-react';
import { formatCurrency, DEFAULT_USD_COP_RATE } from '../data/mockData.js';

export const MonthlyExpensesView = ({
  transactions = [],
  accounts = [],
  timeframe = 'monthly',
  selectedYear = '2026',
  setSelectedYear,
  availableYears = ['2026', '2025', '2024', 'all'],
  currency = 'USD',
  exchangeRate = DEFAULT_USD_COP_RATE,
  onOpenNewTransaction,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all', 'expense', 'income'
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedAccountId, setSelectedAccountId] = useState('all');

  // Transactions filtered by selectedYear (or all years)
  const scopedTransactions = useMemo(() => {
    if (selectedYear && selectedYear !== 'all') {
      return transactions.filter((t) => t.date && t.date.startsWith(String(selectedYear)));
    }
    return transactions;
  }, [transactions, selectedYear]);

  // Group movements (both expenses and incomes) by month (YYYY-MM) in reverse chronological order
  const monthGroups = useMemo(() => {
    const groups = {};

    scopedTransactions.forEach((t) => {
      if (!t.date) return;
      const monthKey = t.date.slice(0, 7); // e.g. "2026-11"
      if (!groups[monthKey]) {
        groups[monthKey] = {
          monthKey,
          transactions: [],
          totalIncome: 0,
          totalExpense: 0,
          antTotal: 0,
        };
      }
      groups[monthKey].transactions.push(t);
      const amt = Number(t.amount) || 0;
      if (t.type === 'income') {
        groups[monthKey].totalIncome += amt;
      } else if (t.type === 'expense') {
        groups[monthKey].totalExpense += amt;
        if (t.isAntExpense || amt <= 15) {
          groups[monthKey].antTotal += amt;
        }
      }
    });

    // Sort transactions within each month strictly by date descending (newest first)
    Object.keys(groups).forEach((key) => {
      groups[key].transactions.sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0));
      groups[key].netBalance = groups[key].totalIncome - groups[key].totalExpense;
    });

    // Sort month keys descending (newest month first)
    const sortedKeys = Object.keys(groups).sort((a, b) => b.localeCompare(a));
    return sortedKeys.map((k) => groups[k]);
  }, [scopedTransactions]);

  // Active selected month (defaults to newest month available in the active scope)
  const [activeMonthKey, setActiveMonthKey] = useState(() => {
    if (monthGroups.length > 0) return monthGroups[0].monthKey;
    return '2026-11';
  });

  // Keep activeMonthKey aligned whenever selectedYear or monthGroups change
  React.useEffect(() => {
    if (monthGroups.length > 0 && !monthGroups.some((g) => g.monthKey === activeMonthKey)) {
      setActiveMonthKey(monthGroups[0].monthKey);
    }
  }, [monthGroups, activeMonthKey]);

  const activeIndex = useMemo(() => {
    return monthGroups.findIndex((g) => g.monthKey === activeMonthKey);
  }, [monthGroups, activeMonthKey]);

  const activeGroup = useMemo(() => {
    return monthGroups[activeIndex] || monthGroups[0] || null;
  }, [monthGroups, activeIndex]);

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

  // Step to previous / next month
  const handlePrevMonth = () => {
    if (activeIndex < monthGroups.length - 1) {
      setActiveMonthKey(monthGroups[activeIndex + 1].monthKey);
      setSelectedCategory('all');
    }
  };

  const handleNextMonth = () => {
    if (activeIndex > 0) {
      setActiveMonthKey(monthGroups[activeIndex - 1].monthKey);
      setSelectedCategory('all');
    }
  };

  // Filter transactions of active month
  const displayedTransactions = useMemo(() => {
    if (!activeGroup) return [];
    return activeGroup.transactions.filter((tx) => {
      // Type filter
      if (filterType === 'expense' && tx.type !== 'expense') return false;
      if (filterType === 'income' && tx.type !== 'income') return false;

      // Category and Account filter
      if (selectedCategory !== 'all' && tx.category !== selectedCategory) return false;
      if (selectedAccountId !== 'all' && tx.accountId !== selectedAccountId) return false;

      // Text Search
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const matchesTitle = tx.title?.toLowerCase().includes(q);
        const matchesNotes = tx.notes?.toLowerCase().includes(q);
        const matchesCat = tx.category?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesNotes && !matchesCat) return false;
      }

      return true;
    });
  }, [activeGroup, filterType, selectedCategory, selectedAccountId, searchQuery]);

  // Available categories in the active month
  const availableCategories = useMemo(() => {
    if (!activeGroup) return [];
    return Array.from(new Set(activeGroup.transactions.map((t) => t.category)));
  }, [activeGroup]);

  // Counts for the filter pills in active month
  const counts = useMemo(() => {
    if (!activeGroup) return { all: 0, expenses: 0, incomes: 0 };
    const all = activeGroup.transactions.length;
    const expenses = activeGroup.transactions.filter((t) => t.type === 'expense').length;
    const incomes = activeGroup.transactions.filter((t) => t.type === 'income').length;
    return { all, expenses, incomes };
  }, [activeGroup]);

  return (
    <div className="space-y-6 pb-6">
      {/* Sleek, Non-intrusive Month Selector Toolbar (Flows naturally with the page, no huge overlay) */}
      <div className="liquid-glass p-4 sm:p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5 sm:gap-4">
          {/* Left: Compact Month Picker with Prev/Next Steppers */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full md:w-auto">
            <button
              onClick={handlePrevMonth}
              disabled={activeIndex >= monthGroups.length - 1}
              className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.1] disabled:opacity-30 disabled:pointer-events-none text-zinc-300 hover:text-white border border-white/10 transition-colors cursor-pointer shrink-0"
              title="Mes Anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Dropdown Selector */}
            <div className="relative flex-1 sm:flex-initial min-w-[140px]">
              <select
                value={activeGroup?.monthKey || ''}
                onChange={(e) => {
                  setActiveMonthKey(e.target.value);
                  setSelectedCategory('all');
                }}
                className="liquid-input font-bold text-xs sm:text-base py-2 pl-2.5 sm:pl-3 pr-7 cursor-pointer bg-[#14121E] border-purple-500/40 text-white w-full truncate"
              >
                {monthGroups.map((g) => (
                  <option key={g.monthKey} value={g.monthKey}>
                    {formatMonthName(g.monthKey)} ({g.transactions.length} movs)
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleNextMonth}
              disabled={activeIndex <= 0}
              className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.1] disabled:opacity-30 disabled:pointer-events-none text-zinc-300 hover:text-white border border-white/10 transition-colors cursor-pointer shrink-0"
              title="Mes Siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Direct Year Filter Dropdown */}
            <div className="relative shrink-0">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear && setSelectedYear(e.target.value)}
                className="liquid-input font-bold text-xs sm:text-sm py-2 pl-2.5 pr-6 cursor-pointer bg-[#14121E] border-purple-500/40 text-purple-200 w-auto"
                title="Filtrar Año Fiscal"
              >
                {availableYears.map((yr) => (
                  <option key={yr} value={yr}>
                    {yr === 'all' ? 'Todos' : yr}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Right: Movement Type Filter Pills: Todos, Gastos, Ingresos */}
          <div className="grid grid-cols-3 sm:flex items-center gap-1.5 w-full md:w-auto">
            <button
              onClick={() => setFilterType('all')}
              className={`px-2 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer text-center justify-center truncate ${
                filterType === 'all'
                  ? 'bg-purple-600/40 text-purple-200 border border-purple-400/50 shadow-liquid-purple'
                  : 'bg-white/[0.03] text-zinc-400 hover:text-white border border-white/5'
              }`}
            >
              Todos ({counts.all})
            </button>
            <button
              onClick={() => setFilterType('expense')}
              className={`px-2 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 truncate ${
                filterType === 'expense'
                  ? 'bg-rose-600/35 text-rose-200 border border-rose-400/50 shadow-sm'
                  : 'bg-white/[0.03] text-zinc-400 hover:text-white border border-white/5'
              }`}
            >
              <TrendingDown className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span className="truncate">Gastos ({counts.expenses})</span>
            </button>
            <button
              onClick={() => setFilterType('income')}
              className={`px-2 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 truncate ${
                filterType === 'income'
                  ? 'bg-emerald-600/35 text-emerald-200 border border-emerald-400/50 shadow-sm'
                  : 'bg-white/[0.03] text-zinc-400 hover:text-white border border-white/5'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="truncate">Ingresos ({counts.incomes})</span>
            </button>
          </div>
        </div>

        {/* 3 Metric Summary Cards for the Active Month */}
        {activeGroup && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-white/10 text-xs">
            {/* Ingresos */}
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 space-y-1">
              <span className="text-zinc-400 text-[11px] flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                Ingresos de {formatMonthName(activeGroup.monthKey)}
              </span>
              <p className="text-xl font-black text-emerald-400">
                +{formatCurrency(activeGroup.totalIncome, currency, exchangeRate)}
              </p>
            </div>

            {/* Gastos */}
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/25 space-y-1">
              <span className="text-zinc-400 text-[11px] flex items-center gap-1">
                <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
                Gastos de {formatMonthName(activeGroup.monthKey)}
              </span>
              <p className="text-xl font-black text-rose-400">
                -{formatCurrency(activeGroup.totalExpense, currency, exchangeRate)}
              </p>
            </div>

            {/* Balance Neto */}
            <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/25 space-y-1">
              <span className="text-zinc-400 text-[11px] flex items-center gap-1">
                <Coins className="w-3.5 h-3.5 text-purple-400" />
                Balance Neto del Mes
              </span>
              <p
                className={`text-xl font-black ${
                  activeGroup.netBalance >= 0 ? 'text-emerald-300' : 'text-rose-400'
                }`}
              >
                {activeGroup.netBalance >= 0 ? '+' : ''}
                {formatCurrency(activeGroup.netBalance, currency, exchangeRate)}
              </p>
            </div>
          </div>
        )}
      </div>

      {transactions.length === 0 ? (
        <div className="liquid-glass p-12 text-center space-y-4 max-w-lg mx-auto">
          <Clock className="w-12 h-12 text-purple-400 mx-auto" />
          <h3 className="text-lg font-bold text-white">No hay movimientos registrados</h3>
          <p className="text-xs text-zinc-400">
            Registra tus primeros ingresos o egresos para consultarlos agrupados mes por mes.
          </p>
          <button
            onClick={onOpenNewTransaction}
            className="liquid-button-primary px-5 py-2.5 text-xs font-semibold inline-flex items-center gap-2 cursor-pointer shadow-neon-purple"
          >
            <span>+ Registrar Movimiento</span>
          </button>
        </div>
      ) : activeGroup ? (
        <div className="space-y-4">
          {/* Search & Category Filter Sub-toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl liquid-glass">
            <div className="relative flex-1 max-w-md w-full">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={`Buscar en ${formatMonthName(activeGroup.monthKey)}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="liquid-input pl-9 text-xs py-2"
              />
            </div>

            <div className="grid grid-cols-1 sm:flex items-center gap-2 w-full sm:w-auto">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="liquid-input text-xs py-2 px-3 cursor-pointer w-full sm:w-auto truncate"
              >
                <option value="all">Todas las Categorías ({availableCategories.length})</option>
                {availableCategories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="liquid-input text-xs py-2 px-3 cursor-pointer w-full sm:w-auto truncate"
              >
                <option value="all">Todas las Cuentas</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Chronological List of Transactions for the Month */}
          <div className="liquid-glass rounded-2xl overflow-hidden border border-white/10">
            <div className="p-3.5 sm:p-4 bg-white/[0.02] border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
              <h3 className="font-bold text-white flex items-center gap-2 min-w-0">
                <Clock className="w-4 h-4 text-purple-400 shrink-0" />
                <span className="truncate">Movimientos de {formatMonthName(activeGroup.monthKey)}</span>
              </h3>
              <span className="text-zinc-400 font-mono text-[11px] sm:text-xs">
                {displayedTransactions.length} de {activeGroup.transactions.length} registrados
              </span>
            </div>

            {displayedTransactions.length === 0 ? (
              <div className="p-8 text-center text-zinc-400 space-y-2">
                <p className="text-sm font-semibold text-white">No hay movimientos que coincidan con el filtro</p>
                <p className="text-xs text-zinc-400">Prueba cambiando la búsqueda o los filtros de tipo y categoría.</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {displayedTransactions.map((tx) => {
                  const acc = accounts.find((a) => a.id === tx.accountId);
                  const isIncome = tx.type === 'income';
                  const isAnt = tx.isAntExpense || (!isIncome && Number(tx.amount) <= 15);

                  return (
                    <div
                      key={tx.id}
                      className="p-3.5 sm:p-4 hover:bg-white/[0.04] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      {/* Left: Date + Title + Notes */}
                      <div className="flex items-start sm:items-center gap-3 min-w-0">
                        {/* Date badge */}
                        <div className="px-2.5 py-1 rounded-xl bg-purple-900/30 border border-purple-500/30 text-purple-200 font-mono text-[11px] font-bold shrink-0">
                          {tx.date}
                        </div>

                        {/* Type Icon */}
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${
                            isIncome
                              ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300'
                              : 'bg-rose-500/20 border-rose-500/30 text-rose-300'
                          }`}
                        >
                          {isIncome ? <ArrowDownLeft className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
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
                      <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-0 border-white/5">
                        {/* Category badge */}
                        <span className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-zinc-300 truncate max-w-[140px] sm:max-w-none">
                          {tx.category}
                        </span>

                        {/* Account Name */}
                        <span className="text-[11px] text-zinc-400 hidden md:inline-flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-purple-400" />
                          <span>{acc ? acc.name : 'Cuenta Principal'}</span>
                        </span>

                        {/* Amount */}
                        <div className="text-right min-w-[95px]">
                          <span
                            className={`text-sm font-black font-mono ${
                              isIncome ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {isIncome ? '+' : '-'}
                            {formatCurrency(tx.amount, currency, exchangeRate)}
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
