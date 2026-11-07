import React, { useState } from 'react';
import {
  Brain,
  ShieldAlert,
  Flame,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Sparkles,
  RefreshCw,
  Sliders,
  DollarSign,
  Target,
  ArrowRight,
  ShieldCheck,
  CheckCircle,
  Lightbulb,
  Zap,
  Clock,
  PieChart,
  BarChart3,
  Layers,
  Award,
  Wallet,
  Activity,
  AlertOctagon,
  Percent,
  Calendar,
  Pencil,
} from 'lucide-react';
import {
  formatCurrency,
  DEFAULT_USD_COP_RATE,
  TIMEFRAME_CONFIG,
  filterTransactionsByPeriod,
} from '../data/mockData.js';

const TIMEFRAMES = ['weekly', 'monthly', 'quarterly', 'yearly'];

export const AIAdvisorView = ({
  accounts = [],
  transactions = [],
  subscriptions = [],
  debts = [],
  timeframe = 'monthly',
  setTimeframe,
  selectedYear = '2026',
  setSelectedYear,
  availableYears = ['2026', '2025', '2024', 'all'],
  currency = 'USD',
  exchangeRate = DEFAULT_USD_COP_RATE,
  onOpenNewTransaction,
  onEditTransaction,
}) => {
  const [antReductionPercent, setAntReductionPercent] = useState(40);
  const [isScanning, setIsScanning] = useState(false);
  const [activeTab, setActiveTab] = useState('diagnostico'); // diagnostico, presupuesto, plan

  const triggerRescan = () => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
    }, 800);
  };

  // ----------------- DYNAMIC CALCULATIONS FILTERED BY ACTIVE TIMEFRAME & YEAR -----------------
  const activePeriodTxs = React.useMemo(() => {
    return filterTransactionsByPeriod(transactions, timeframe, selectedYear);
  }, [transactions, timeframe, selectedYear]);

  const targetTxs = activePeriodTxs;
  const periodDays =
    timeframe === 'weekly' ? 7 : timeframe === 'monthly' ? 30 : timeframe === 'quarterly' ? 90 : 365;
  const periodFactor =
    timeframe === 'weekly' ? 7 / 30 : timeframe === 'monthly' ? 1 : timeframe === 'quarterly' ? 3 : 12;
  const periodLabel = TIMEFRAME_CONFIG[timeframe]?.label || 'Este Mes';
  const periodShortLabel = TIMEFRAME_CONFIG[timeframe]?.shortLabel || 'Mensual';
  const yearLabel = selectedYear === 'all' ? 'Histórico Completo' : `Año ${selectedYear}`;

  const dateRangeLabel = React.useMemo(() => {
    if (targetTxs.length === 0) return 'Sin movimientos en este período';
    let minD = targetTxs[0].date;
    let maxD = targetTxs[0].date;
    targetTxs.forEach((t) => {
      if (t.date && t.date < minD) minD = t.date;
      if (t.date && t.date > maxD) maxD = t.date;
    });
    return `${minD} al ${maxD}`;
  }, [targetTxs]);

  const totalIncomes = targetTxs
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const totalExpenses = targetTxs
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const netPeriodFlow = totalIncomes - totalExpenses;
  const savingsRate = totalIncomes > 0 ? Math.round((netPeriodFlow / totalIncomes) * 100) : 0;

  // Micro-expenses / Ant expenses in the selected period
  const antTransactions = targetTxs.filter(
    (t) => t.type === 'expense' && (t.isAntExpense || (t.amount > 0 && t.amount <= 15))
  );
  const antExpenses = antTransactions.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const antRatio = totalExpenses > 0 ? Math.round((antExpenses / totalExpenses) * 100) : 0;

  // Helper to normalize any balance/amount to USD base without drift
  const toUSD = (val, itemCur) => {
    const num = Number(val) || 0;
    return itemCur === 'COP' ? num / (exchangeRate || DEFAULT_USD_COP_RATE) : num;
  };

  // Liquid positive capital normalized to USD
  const liquidCash = accounts
    .filter((a) => a.type === 'cash' || a.type === 'bank')
    .reduce((sum, a) => sum + Math.max(0, toUSD(a.balance, a.currency)), 0);

  const creditAccounts = accounts.filter((a) => a.type === 'credit');
  const totalCreditLimit = creditAccounts.reduce(
    (sum, a) => sum + Math.max(0, toUSD(a.creditLimit, a.currency)),
    0
  );
  const totalCreditDebt = Math.abs(
    creditAccounts.reduce(
      (sum, a) => sum + Math.min(0, toUSD(a.balance, a.currency)),
      0
    )
  );
  const creditUtilization =
    totalCreditLimit > 0 ? Math.round((totalCreditDebt / totalCreditLimit) * 100) : 0;

  // Debts normalized to USD
  const totalDebtsRemaining = debts.reduce(
    (sum, d) => sum + Math.max(0, toUSD((d.totalAmount || 0) - (d.paidAmount || 0), d.currency)),
    0
  );

  // Subscriptions impact scaled to selected period normalized to USD
  const activeSubs = subscriptions.filter((s) => s.active);
  const totalMonthlySubs = activeSubs.reduce(
    (sum, s) => sum + toUSD(s.amount, s.currency),
    0
  );
  const periodSubsImpact = Math.round(totalMonthlySubs * periodFactor * 100) / 100;
  const essentialSubs = activeSubs
    .filter((s) => s.essential)
    .reduce((sum, s) => sum + toUSD(s.amount, s.currency), 0);
  const optionalSubs = totalMonthlySubs - essentialSubs;
  const fixedRatio = totalIncomes > 0 ? Math.round((periodSubsImpact / totalIncomes) * 100) : 0;

  // Realistic Burn Rate calculations based on active period
  const dailyBurnRate = totalExpenses > 0 ? totalExpenses / periodDays : 0;
  const estimatedMonthlyExpense = dailyBurnRate > 0 ? dailyBurnRate * 30 : Math.max(1, totalMonthlySubs);
  const runwayDays = dailyBurnRate > 0 ? Math.min(999, Math.round(liquidCash / dailyBurnRate)) : (liquidCash > 0 ? 180 : 0);
  const runwayMonths = Math.round((runwayDays / 30) * 10) / 10;

  // Largest single expense & top income source in the selected period
  const periodExpenseList = targetTxs.filter((t) => t.type === 'expense');
  const largestExpense = periodExpenseList.reduce(
    (max, t) => ((Number(t.amount) || 0) > (Number(max?.amount) || 0) ? t : max),
    null
  );
  const avgTicketExpense =
    periodExpenseList.length > 0 ? totalExpenses / periodExpenseList.length : 0;

  // Aura Financial Health Score (0 - 100) dynamically computed for the active period
  let healthScore = 70;
  if (targetTxs.length > 0) {
    let score = 50;
    if (totalIncomes > totalExpenses) score += 22;
    else if (totalIncomes > 0 && totalExpenses <= totalIncomes * 1.1) score += 5;
    else score -= 15;

    if (runwayMonths >= 3) score += 14;
    else if (runwayMonths >= 1) score += 8;
    else score -= 8;

    if (antRatio <= 12) score += 12;
    else if (antRatio <= 25) score += 4;
    else score -= 12;

    if (creditUtilization === 0) score += 10;
    else if (creditUtilization <= 30) score += 5;
    else score -= 12;

    healthScore = Math.max(12, Math.min(99, score));
  }

  const getHealthBadge = (score) => {
    if (score >= 85) return { label: 'Excelente Salud', color: 'text-emerald-300 border-emerald-500/40 bg-emerald-500/20' };
    if (score >= 70) return { label: 'Saludable', color: 'text-purple-300 border-purple-500/40 bg-purple-500/20' };
    if (score >= 50) return { label: 'En Observación', color: 'text-amber-300 border-amber-500/40 bg-amber-500/20' };
    return { label: 'Alerta Financiera', color: 'text-rose-300 border-rose-500/40 bg-rose-500/20' };
  };

  const healthBadge = getHealthBadge(healthScore);

  // 50 / 30 / 20 Dynamic Rule Breakdown strictly for the selected period
  let calculatedNeeds = 0;
  let calculatedWants = 0;
  let calculatedSavings = 0;

  targetTxs.forEach((tx) => {
    const amt = Number(tx.amount) || 0;
    if (tx.type === 'expense') {
      const rawCat = (tx.category || '').toLowerCase();
      const cat = rawCat.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (
        cat.includes('alimen') ||
        cat.includes('food') ||
        cat.includes('salud') ||
        cat.includes('health') ||
        cat.includes('transp') ||
        cat.includes('hogar') ||
        cat.includes('vivienda') ||
        cat.includes('servici')
      ) {
        calculatedNeeds += amt;
      } else if (
        cat.includes('invers') ||
        cat.includes('educa') ||
        cat.includes('trading') ||
        cat.includes('ahorro') ||
        cat.includes('deuda') ||
        cat.includes('amortiz')
      ) {
        calculatedSavings += amt;
      } else {
        calculatedWants += amt;
      }
    }
  });

  const totalCategorized = calculatedNeeds + calculatedWants + calculatedSavings || 1;
  const needsPercent = Math.round((calculatedNeeds / totalCategorized) * 100);
  const wantsPercent = Math.round((calculatedWants / totalCategorized) * 100);
  const savingsPercent = Math.round((calculatedSavings / totalCategorized) * 100);

  // Top Expense Categories in the selected period
  const categoryMap = {};
  const categoryCountMap = {};
  targetTxs
    .filter((t) => t.type === 'expense')
    .forEach((t) => {
      const cat = t.category || 'Otros';
      categoryMap[cat] = (categoryMap[cat] || 0) + (Number(t.amount) || 0);
      categoryCountMap[cat] = (categoryCountMap[cat] || 0) + 1;
    });
  const topCategories = Object.entries(categoryMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([category, amount]) => ({
      category,
      amount,
      count: categoryCountMap[category] || 1,
      percent: totalExpenses > 0 ? Math.round((amount / totalExpenses) * 100) : 0,
    }));

  // Interactive Simulator math normalized to monthly & annual from the selected period
  const periodAntSavings = Math.round(antExpenses * (antReductionPercent / 100) * 100) / 100;
  const monthlyAntSavings = Math.round((periodAntSavings / Math.max(0.23, periodFactor)) * 100) / 100;
  const annualAntSavings = Math.round(monthlyAntSavings * 12);
  // Compound interest at 10% annual over 3 and 5 years
  const threeYearCompound = Math.round(
    monthlyAntSavings * ((Math.pow(1 + 0.10 / 12, 36) - 1) / (0.10 / 12))
  );
  const fiveYearCompound = Math.round(
    monthlyAntSavings * ((Math.pow(1 + 0.10 / 12, 60) - 1) / (0.10 / 12))
  );

  return (
    <div className="space-y-8 pb-12">
      {/* AI Advisor Hero Banner with Health Score */}
      <div className="liquid-glass-purple p-4 sm:p-6 lg:p-8 space-y-5 sm:space-y-6 relative overflow-hidden">
        {/* Glow Effects */}
        <div className="pointer-events-none absolute -top-24 -right-24 w-80 h-80 rounded-full bg-gradient-to-br from-fuchsia-500/25 to-purple-600/30 blur-3xl animate-pulse" />
        <div className="pointer-events-none absolute bottom-0 left-10 w-56 h-56 rounded-full bg-violet-600/20 blur-3xl" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-6 relative z-10">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-purple-600 via-fuchsia-600 to-indigo-600 flex items-center justify-center text-white shadow-neon-purple border border-white/30 shrink-0">
              <Brain className="w-6 h-6 sm:w-7 sm:h-7 animate-pulse" />
            </div>
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-2xl font-black text-white tracking-tight">
                  Aura AI — Smart Financial Intelligence
                </h2>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-fuchsia-500/20 text-fuchsia-200 border border-fuchsia-400/40">
                  Algoritmo Predictivo v5.0
                </span>
              </div>
              <p className="text-xs text-zinc-300 max-w-xl">
                Auditoría algorítmica continua de flujos, detección de sesgos y optimización matemática en tiempo real
              </p>
            </div>
          </div>

          {/* Quick Rescan & Aura Score Pill with Radial Progress Ring */}
          <div className="flex items-center justify-between sm:justify-end gap-3 w-full lg:w-auto">
            <div className="p-2 sm:p-2.5 rounded-2xl bg-black/50 border border-purple-500/30 flex items-center gap-3 flex-1 sm:flex-initial shadow-liquid">
              <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
                <svg className="w-12 h-12 -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-white/10"
                    strokeWidth="3.5"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-fuchsia-400 transition-all duration-700"
                    strokeDasharray={`${healthScore}, 100`}
                    strokeLinecap="round"
                    strokeWidth="3.5"
                    stroke="url(#auraGrad)"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <defs>
                    <linearGradient id="auraGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#A855F7" />
                      <stop offset="100%" stopColor="#EC4899" />
                    </linearGradient>
                  </defs>
                </svg>
                <span className="absolute font-black text-xs font-mono text-white">
                  {transactions.length > 0 ? healthScore : '--'}
                </span>
              </div>
              <div className="min-w-0">
                <span className="text-[10px] uppercase tracking-wider text-zinc-400 block font-semibold">
                  Score de Salud
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${healthBadge.color} inline-block mt-0.5`}>
                  {healthBadge.label}
                </span>
              </div>
            </div>

            <button
              onClick={triggerRescan}
              disabled={isScanning}
              className="liquid-button-primary px-3.5 py-3 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shrink-0 shadow-neon-purple active:scale-95 transition-all"
              title="Re-ejecutar auditoría en base a tus movimientos"
            >
              <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin text-white' : ''}`} />
              <span className="hidden sm:inline">{isScanning ? 'Escaneando...' : 'Reescanear'}</span>
            </button>
          </div>
        </div>

        {/* Synchronized Temporal & Year Selector Strip inside Aura AI */}
        <div className="pt-3 border-t border-white/10 relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold text-purple-200 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-fuchsia-400" />
              <span>Analizando Período:</span>
            </span>
            <span className="text-xs font-extrabold text-white px-2.5 py-1 rounded-lg bg-white/10 border border-white/15">
              {periodLabel} • {yearLabel}
            </span>
            <span className="text-[11px] text-zinc-300 font-mono">
              ({targetTxs.length} movs • {dateRangeLabel})
            </span>
          </div>

          {setTimeframe && (
            <div className="grid grid-cols-4 sm:flex items-center gap-1 bg-black/45 p-1 rounded-xl border border-white/10">
              {TIMEFRAMES.map((tf) => {
                const isTfActive = timeframe === tf;
                return (
                  <button
                    key={tf}
                    type="button"
                    onClick={() => setTimeframe(tf)}
                    className={`px-2 sm:px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer text-center truncate ${
                      isTfActive
                        ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-sm'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    {TIMEFRAME_CONFIG[tf]?.shortLabel || tf}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Tab Navigation Switcher */}
        <div className="grid grid-cols-1 sm:flex sm:flex-wrap items-center gap-2 pt-3 border-t border-white/10 relative z-10 text-xs font-bold">
          <button
            onClick={() => setActiveTab('diagnostico')}
            className={`px-3.5 py-2 sm:px-4 rounded-xl transition-all cursor-pointer text-left sm:text-center ${
              activeTab === 'diagnostico'
                ? 'bg-purple-600/40 text-purple-200 border border-purple-400/40 shadow-liquid-purple'
                : 'text-zinc-400 hover:text-white bg-white/[0.02] sm:bg-transparent'
            }`}
          >
            1. Diagnóstico & Fugas de Capital
          </button>
          <button
            onClick={() => setActiveTab('presupuesto')}
            className={`px-3.5 py-2 sm:px-4 rounded-xl transition-all cursor-pointer text-left sm:text-center ${
              activeTab === 'presupuesto'
                ? 'bg-purple-600/40 text-purple-200 border border-purple-400/40 shadow-liquid-purple'
                : 'text-zinc-400 hover:text-white bg-white/[0.02] sm:bg-transparent'
            }`}
          >
            2. Presupuesto 50/30/20 & Concentración
          </button>
          <button
            onClick={() => setActiveTab('plan')}
            className={`px-3.5 py-2 sm:px-4 rounded-xl transition-all cursor-pointer text-left sm:text-center ${
              activeTab === 'plan'
                ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white border border-purple-300/40 shadow-liquid-purple'
                : 'text-zinc-400 hover:text-white bg-white/[0.02] sm:bg-transparent'
            }`}
          >
            3. Simulador Predictivo & Plan de Acción
          </button>
        </div>
      </div>

      {/* ZERO DATA ONBOARDING */}
      {transactions.length === 0 ? (
        <div className="liquid-glass p-10 text-center space-y-4 max-w-lg mx-auto">
          <Sparkles className="w-12 h-12 text-fuchsia-400 mx-auto animate-pulse" />
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white">Aura AI Lista para Analizar</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Tu cuenta está completamente limpia. Comienza agregando tus cuentas y tus primeros movimientos para activar la auditoría algorítmica de salud financiera, detección de fugas hormiga y proyecciones de interés compuesto.
            </p>
          </div>
          <button
            onClick={onOpenNewTransaction}
            className="liquid-button-primary px-5 py-2.5 text-xs font-semibold inline-flex items-center gap-2 cursor-pointer shadow-neon-purple"
          >
            <span>+ Registrar Primer Movimiento</span>
          </button>
        </div>
      ) : (
        <>
          {/* TAB 1: DIAGNÓSTICO & FUGAS DE CAPITAL */}
          {activeTab === 'diagnostico' && (
            <div className="space-y-6">
              {/* Executive Period Cashflow Summary Banner */}
              <div className="liquid-glass p-4 sm:p-6 space-y-4 border-purple-500/30">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                      <Activity className="w-4 h-4 text-purple-400" />
                      Radiografía Financiera de {periodLabel} ({yearLabel})
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Cálculo sincronizado en tiempo real sobre {targetTxs.length} movimientos del período ({dateRangeLabel})
                    </p>
                  </div>
                  <span
                    className={`self-start sm:self-auto text-[11px] font-bold px-3 py-1 rounded-full border ${
                      netPeriodFlow >= 0
                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                        : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                    }`}
                  >
                    {netPeriodFlow >= 0 ? `Superávit (+${savingsRate}% ahorro)` : 'Déficit en el período'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/25 space-y-1">
                    <span className="text-[11px] text-emerald-300/90 font-semibold block">
                      Ingresos ({periodShortLabel})
                    </span>
                    <p className="text-xl sm:text-2xl font-black text-emerald-400 font-tabular">
                      {formatCurrency(totalIncomes, currency, exchangeRate)}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-rose-950/20 border border-rose-500/25 space-y-1">
                    <span className="text-[11px] text-rose-300/90 font-semibold block">
                      Gastos ({periodShortLabel})
                    </span>
                    <p className="text-xl sm:text-2xl font-black text-rose-400 font-tabular">
                      {formatCurrency(totalExpenses, currency, exchangeRate)}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-purple-950/25 border border-purple-500/30 space-y-1">
                    <span className="text-[11px] text-purple-200 font-semibold block">
                      Balance Neto ({periodShortLabel})
                    </span>
                    <p
                      className={`text-xl sm:text-2xl font-black font-tabular ${
                        netPeriodFlow >= 0 ? 'text-emerald-300' : 'text-rose-300'
                      }`}
                    >
                      {netPeriodFlow >= 0 ? '+' : ''}
                      {formatCurrency(netPeriodFlow, currency, exchangeRate)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Top 4 KPI Metrics Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1: Gastos Hormiga */}
                <div className="liquid-glass p-5 space-y-2 border-rose-500/30 hover:border-rose-400/50 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-400 font-medium">Fuga Gastos Hormiga</span>
                    <Flame className="w-4 h-4 text-rose-400" />
                  </div>
                  <p className="text-2xl font-black text-rose-400">
                    {formatCurrency(antExpenses, currency, exchangeRate)}
                  </p>
                  <p className="text-[11px] text-zinc-400">
                    Representa el <strong className="text-white">{antRatio}%</strong> de tus egresos totales
                  </p>
                </div>

                {/* 2: Velocidad de Gasto / Burn Rate */}
                <div className="liquid-glass p-5 space-y-2 border-amber-500/30 hover:border-amber-400/50 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-400 font-medium">Burn Rate Diario</span>
                    <Clock className="w-4 h-4 text-amber-400" />
                  </div>
                  <p className="text-2xl font-black text-amber-300">
                    {formatCurrency(dailyBurnRate, currency, exchangeRate)}
                    <span className="text-xs text-zinc-400 font-normal"> / día</span>
                  </p>
                  <p className="text-[11px] text-zinc-400">
                    Runway de liquidez estimada: <strong className="text-white">{runwayDays} días</strong>
                  </p>
                </div>

                {/* 3: Compromiso de Pasivos Fijos */}
                <div className="liquid-glass p-5 space-y-2 border-purple-500/30 hover:border-purple-400/50 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-400 font-medium">Carga Fija ({periodShortLabel})</span>
                    <Zap className="w-4 h-4 text-purple-400" />
                  </div>
                  <p className="text-2xl font-black text-purple-300">
                    {formatCurrency(periodSubsImpact, currency, exchangeRate)}
                  </p>
                  <p className="text-[11px] text-zinc-400">
                    {activeSubs.length} suscripciones ({fixedRatio}% de ingresos del período)
                  </p>
                </div>

                {/* 4: Deuda en Crédito Revolvente */}
                <div className="liquid-glass p-5 space-y-2 border-cyan-500/30 hover:border-cyan-400/50 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-400 font-medium">Uso de Líneas de Crédito</span>
                    <Percent className="w-4 h-4 text-cyan-400" />
                  </div>
                  <p className="text-2xl font-black text-cyan-300">
                    {creditUtilization}%
                  </p>
                  <p className="text-[11px] text-zinc-400">
                    Adeudo: <strong className="text-white">{formatCurrency(totalCreditDebt, currency, exchangeRate)}</strong>
                  </p>
                </div>
              </div>

              {/* Detailed Diagnostic Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Finding 1: Gastos Hormiga */}
                <div className="liquid-glass hover-lift p-5 space-y-3 border-rose-500/30 relative overflow-hidden transition-all duration-300">
                  <div className="flex items-start justify-between">
                    <div className="w-9 h-9 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-300 shrink-0">
                      <Flame className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      {antRatio > 20 ? 'Fuga Alta' : 'Controlable'}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-white tracking-tight">
                      Microconsumos ({antTransactions.length} movs)
                    </h4>
                    <p className="text-xl font-black text-rose-400 mt-1">
                      {formatCurrency(antExpenses, currency, exchangeRate)}
                    </p>
                  </div>

                  <div className="space-y-1 text-[11px] text-zinc-300 leading-snug border-t border-white/10 pt-2.5">
                    <p className="text-zinc-400">
                      Pagos menores a $15 USD.
                    </p>
                    <p className="text-rose-300/90 font-semibold">
                      Ritmo anual: {formatCurrency((antExpenses / Math.max(0.23, periodFactor)) * 12, currency, exchangeRate)}.
                    </p>
                  </div>
                </div>

                {/* Finding 2: Uso de Crédito */}
                <div className="liquid-glass hover-lift p-5 space-y-3 border-amber-500/30 relative overflow-hidden transition-all duration-300">
                  <div className="flex items-start justify-between">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-300 shrink-0">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      {creditUtilization > 30 ? 'Atención' : 'Nivel Óptimo'}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-white tracking-tight">
                      Líneas de Crédito ({creditUtilization}%)
                    </h4>
                    <p className="text-xl font-black text-amber-300 mt-1">
                      {formatCurrency(totalCreditDebt, currency, exchangeRate)}
                    </p>
                  </div>

                  <div className="space-y-1 text-[11px] text-zinc-300 leading-snug border-t border-white/10 pt-2.5">
                    <p className="text-zinc-400">
                      Regla ideal: bajo el 30%.
                    </p>
                    <p className="text-amber-300/90 font-semibold">
                      Límite libre: {formatCurrency(Math.max(0, totalCreditLimit - totalCreditDebt), currency, exchangeRate)}.
                    </p>
                  </div>
                </div>

                {/* Finding 3: Runway de Liquidez */}
                <div className="liquid-glass hover-lift p-5 space-y-3 border-purple-500/30 relative overflow-hidden transition-all duration-300">
                  <div className="flex items-start justify-between">
                    <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300 shrink-0">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-400/30">
                      Colchón
                    </span>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-white tracking-tight">
                      Fondo Inmediato ({runwayDays} días)
                    </h4>
                    <p className="text-xl font-black text-purple-300 mt-1">
                      {formatCurrency(liquidCash, currency, exchangeRate)}
                    </p>
                  </div>

                  <div className="space-y-1 text-[11px] text-zinc-300 leading-snug border-t border-white/10 pt-2.5">
                    <p className="text-zinc-400">
                      Cubre {runwayMonths} meses de egresos.
                    </p>
                    <p className="text-purple-300/90 font-semibold">
                      Meta: 3-6 meses de reserva.
                    </p>
                  </div>
                </div>

                {/* Finding 4: Deudas & Compromisos de Capital */}
                <div className="liquid-glass hover-lift p-5 space-y-3 border-emerald-500/30 relative overflow-hidden transition-all duration-300">
                  <div className="flex items-start justify-between">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-300 shrink-0">
                      <Target className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      {totalDebtsRemaining > 0 ? 'En Proceso' : 'Libre de Deuda'}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-white tracking-tight">
                      Pasivos / Créditos ({debts.length})
                    </h4>
                    <p className="text-xl font-black text-emerald-400 mt-1">
                      {formatCurrency(totalDebtsRemaining, currency, exchangeRate)}
                    </p>
                  </div>

                  <div className="space-y-1 text-[11px] text-zinc-300 leading-snug border-t border-white/10 pt-2.5">
                    <p className="text-zinc-400">
                      {debts.length > 0 ? `${debts.length} créditos registrados.` : 'Sin pasivos bancarios.'}
                    </p>
                    <p className="text-emerald-300/90 font-semibold">
                      Estrategia: Método Bola de Nieve.
                    </p>
                  </div>
                </div>
              </div>

              {/* Period Anomalies & Top Ant Expenses Audit */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Mayor Egreso & Ticket Promedio del Período */}
                <div className="liquid-glass p-5 sm:p-6 space-y-4 border-purple-500/30">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                      <AlertOctagon className="w-4 h-4 text-fuchsia-400" />
                      Pico de Gasto & Ticket Promedio ({periodShortLabel})
                    </h4>
                    <span className="text-[10px] font-mono text-purple-300 px-2 py-0.5 rounded-md bg-purple-900/30 border border-purple-500/30">
                      {periodExpenseList.length} egresos
                    </span>
                  </div>

                  {largestExpense ? (
                    <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <span className="text-[10px] uppercase tracking-wider text-fuchsia-300 font-bold block">
                          Mayor Salida de Capital en {periodShortLabel}
                        </span>
                        <p className="text-sm font-bold text-white truncate">{largestExpense.title}</p>
                        <span className="text-[11px] text-zinc-400">
                          {largestExpense.category} • {largestExpense.date}
                        </span>
                      </div>
                      <div className="text-right shrink-0 flex items-center gap-2">
                        <div>
                          <p className="text-base sm:text-lg font-black text-rose-400 font-tabular">
                            -{formatCurrency(largestExpense.amount, currency, exchangeRate)}
                          </p>
                          <span className="text-[10px] text-zinc-400">
                            Ticket prom: {formatCurrency(avgTicketExpense, currency, exchangeRate)}
                          </span>
                        </div>
                        {onEditTransaction && (
                          <button
                            type="button"
                            onClick={() => onEditTransaction(largestExpense)}
                            className="p-2 rounded-lg bg-purple-500/20 hover:bg-purple-500/35 text-purple-200 border border-purple-400/30 cursor-pointer"
                            title="Editar este movimiento"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-400">No hay egresos registrados en este período.</p>
                  )}
                </div>

                {/* Lista de Gastos Hormiga Detectados en el Período */}
                <div className="liquid-glass p-5 sm:p-6 space-y-3 border-rose-500/30">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                      <Flame className="w-4 h-4 text-rose-400" />
                      Gastos Hormiga Detectados ({antTransactions.length})
                    </h4>
                    <span className="text-xs font-bold text-rose-300">
                      {formatCurrency(antExpenses, currency, exchangeRate)}
                    </span>
                  </div>

                  {antTransactions.length === 0 ? (
                    <p className="text-xs text-emerald-300 py-2">
                      ¡Excelente! Cero gastos hormiga detectados en {periodLabel.toLowerCase()}.
                    </p>
                  ) : (
                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                      {antTransactions.slice(0, 8).map((tx) => (
                        <div
                          key={tx.id}
                          onClick={() => onEditTransaction && onEditTransaction(tx)}
                          className="flex items-center justify-between p-2 rounded-xl bg-white/[0.03] hover:bg-purple-500/15 border border-white/5 text-xs cursor-pointer transition-colors"
                        >
                          <div className="min-w-0 pr-2">
                            <p className="font-semibold text-white truncate">{tx.title}</p>
                            <span className="text-[10px] text-zinc-400">
                              {tx.category} • {tx.date}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="font-bold text-rose-300 font-tabular">
                              -{formatCurrency(tx.amount, currency, exchangeRate)}
                            </span>
                            {onEditTransaction && <Pencil className="w-3 h-3 text-purple-300" />}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PRESUPUESTO 50/30/20 & CONCENTRACIÓN DE GASTO */}
          {activeTab === 'presupuesto' && (
            <div className="space-y-6">
              {/* 50 / 30 / 20 Dynamic Rule Breakdown */}
              <div className="liquid-glass p-6 sm:p-7 space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Target className="w-4 h-4 text-purple-400" />
                      Auditoría Matemática Regla 50 / 30 / 20 ({periodLabel} • {yearLabel})
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Distribución real calculada sobre los egresos del período ({formatCurrency(totalExpenses, currency, exchangeRate)})
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  {/* Needs 50% */}
                  <div className="liquid-pill hover-lift p-4 space-y-2 transition-all duration-300">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white">Necesidades (Objetivo 50%)</span>
                      <span className={`font-mono font-bold ${needsPercent <= 50 ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {needsPercent}% Actual
                      </span>
                    </div>
                    <p className="text-xl font-black text-zinc-100 font-mono">
                      {formatCurrency(calculatedNeeds, currency, exchangeRate)}
                    </p>
                    <p className="text-[11px] text-zinc-400">
                      Alimentación, transporte esencial, servicios básicos y salud
                    </p>
                    <div className="w-full h-2 bg-black/40 rounded-full overflow-hidden p-0.5 border border-white/5">
                      <div className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, needsPercent)}%` }} />
                    </div>
                  </div>

                  {/* Wants 30% */}
                  <div className="liquid-pill hover-lift p-4 space-y-2 transition-all duration-300">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white">Estilo & Deseos (Objetivo 30%)</span>
                      <span className={`font-mono font-bold ${wantsPercent <= 30 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {wantsPercent}% Actual
                      </span>
                    </div>
                    <p className="text-xl font-black text-zinc-100 font-mono">
                      {formatCurrency(calculatedWants, currency, exchangeRate)}
                    </p>
                    <p className="text-[11px] text-zinc-400">
                      Restaurantes, compras personales, gaming, salidas y viajes
                    </p>
                    <div className="w-full h-2 bg-black/40 rounded-full overflow-hidden p-0.5 border border-white/5">
                      <div className="h-full bg-gradient-to-r from-fuchsia-500 to-pink-500 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, wantsPercent)}%` }} />
                    </div>
                  </div>

                  {/* Savings / Investments 20% */}
                  <div className="liquid-pill hover-lift p-4 space-y-2 transition-all duration-300">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white">Ahorro / Inversión (Objetivo 20%)</span>
                      <span className={`font-mono font-bold ${savingsPercent >= 20 ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {savingsPercent}% Actual
                      </span>
                    </div>
                    <p className="text-xl font-black text-emerald-300 font-mono">
                      {formatCurrency(calculatedSavings, currency, exchangeRate)}
                    </p>
                    <p className="text-[11px] text-zinc-400">
                      Inversiones de capital, trading, amortización y fondos líquidos
                    </p>
                    <div className="w-full h-2 bg-black/40 rounded-full overflow-hidden p-0.5 border border-white/5">
                      <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, savingsPercent)}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Top Categories of Expenditure */}
              <div className="liquid-glass p-6 sm:p-7 space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-purple-400" />
                      Categorías con Mayor Concentración de Egreso ({periodShortLabel})
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Identifica en qué rubros se concentró tu salida de capital durante {periodLabel.toLowerCase()}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {topCategories.map((item, idx) => (
                    <div key={idx} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs gap-2">
                        <span className="font-semibold text-white flex items-center gap-2 min-w-0 truncate">
                          <span className="w-5 h-5 rounded-md bg-white/5 border border-white/10 flex items-center justify-center text-[10px] text-purple-300 font-mono shrink-0">
                            {idx + 1}
                          </span>
                          <span className="truncate">{item.category}</span>
                          <span className="text-[10px] text-zinc-500 shrink-0">({item.count} movs)</span>
                        </span>
                        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                          <span className="text-zinc-300 font-bold font-tabular">
                            {formatCurrency(item.amount, currency, exchangeRate)}
                          </span>
                          <span className="text-[11px] font-mono text-purple-300 px-2 py-0.5 rounded-md bg-purple-900/30 border border-purple-500/30">
                            {item.percent}%
                          </span>
                        </div>
                      </div>
                      <div className="w-full h-2 bg-black/40 rounded-full overflow-hidden p-0.5 border border-white/5">
                        <div
                          className="h-full bg-gradient-to-r from-purple-500 to-fuchsia-500 rounded-full"
                          style={{ width: `${Math.min(100, item.percent)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SIMULADOR PREDICTIVO & PLAN DE ACCIÓN */}
          {activeTab === 'plan' && (
            <div className="space-y-6">
              {/* Interactive Predictive Simulator */}
              <div className="liquid-glass p-6 sm:p-8 space-y-6 relative overflow-hidden border-purple-500/40">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-fuchsia-400" />
                      Simulador de Eficiencia Matemática & Interés Compuesto
                    </span>
                    <h3 className="text-lg font-black text-white">
                      ¿Cuánto capital liberas si recortas gastos hormiga hoy?
                    </h3>
                  </div>

                  <div className="p-2.5 rounded-xl bg-purple-500/20 border border-purple-400/30 text-right">
                    <span className="text-[10px] text-zinc-400 block">Objetivo de Reducción</span>
                    <span className="text-xl font-black text-fuchsia-300">
                      {antReductionPercent}% de ahorro
                    </span>
                  </div>
                </div>

                {/* Slider */}
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] sm:text-xs text-zinc-400 font-medium">
                    <span>10% (Moderado)</span>
                    <span className="text-purple-200 font-bold">Ajuste actual: {antReductionPercent}%</span>
                    <span>80% (Disciplina Extrema)</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="80"
                    step="5"
                    value={antReductionPercent}
                    onChange={(e) => setAntReductionPercent(parseInt(e.target.value, 10))}
                    className="w-full accent-purple-500 h-2 bg-black/40 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Simulator Output Metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                  <div className="liquid-pill hover-lift p-4 space-y-1 transition-all duration-300">
                    <span className="text-zinc-400 text-xs block">Liquidez Mensual Recuperada</span>
                    <p className="text-2xl font-black text-emerald-400 font-mono">
                      +{formatCurrency(monthlyAntSavings, currency, exchangeRate)}
                    </p>
                    <span className="text-[11px] text-zinc-400">
                      disponibles de inmediato en tu cuenta líquida
                    </span>
                  </div>

                  <div className="liquid-pill hover-lift p-4 space-y-1 transition-all duration-300">
                    <span className="text-zinc-400 text-xs block">Ahorro Neto Anual (12 Meses)</span>
                    <p className="text-2xl font-black text-purple-300 font-mono">
                      +{formatCurrency(annualAntSavings, currency, exchangeRate)}
                    </p>
                    <span className="text-[11px] text-zinc-400">
                      capital libre para inversión o amortización
                    </span>
                  </div>

                  <div className="liquid-pill hover-lift p-4 space-y-1 border-fuchsia-500/30 bg-fuchsia-950/20 transition-all duration-300">
                    <span className="text-fuchsia-200 text-xs block font-medium">
                      Proyección 5 Años Compuesto (10% E.A.)
                    </span>
                    <p className="text-2xl font-black text-white font-mono">
                      {formatCurrency(fiveYearCompound, currency, exchangeRate)}
                    </p>
                    <span className="text-[11px] text-zinc-400">
                      crecimiento exponencial con reinversión
                    </span>
                  </div>
                </div>
              </div>

              {/* Dynamic Action Plan */}
              <div className="liquid-glass p-6 sm:p-7 space-y-4">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-purple-400" />
                  Ruta Algorítmica Estratégica (Acciones Personalizadas)
                </h3>

                <div className="space-y-3">
                  {[
                    ...(totalDebtsRemaining > 0
                      ? [
                          {
                            step: 'Paso 1: Amortización Acelerada de Créditos',
                            description: `Tienes ${formatCurrency(totalDebtsRemaining, currency, exchangeRate)} en deuda pendiente. Prioriza abonos extra utilizando el capital recuperado para anular intereses pasivos.`,
                            badge: 'Prioridad Inmediata',
                            color: 'border-emerald-500/40 text-emerald-300 bg-emerald-500/10',
                          },
                        ]
                      : []),
                    {
                      step: `${totalDebtsRemaining > 0 ? 'Paso 2' : 'Paso 1'}: Blindaje del Fondo de Reserva`,
                      description: `Consolida al menos ${formatCurrency(Math.round(estimatedMonthlyExpense * 2), currency, exchangeRate)} en tu cuenta de débito/ahorros líquida como colchón de emergencia antes de comprometer capital en inversiones de riesgo.`,
                      badge: 'Prioridad Alta',
                      color: 'border-purple-500/30 text-purple-300',
                    },
                    {
                      step: `${totalDebtsRemaining > 0 ? 'Paso 3' : 'Paso 2'}: Contención de Microconsumos Diarios`,
                      description: `Implementa la regla de espera de 48 horas en compras impulsivas menores a $15 USD. Aplicando un recorte del ${antReductionPercent}%, retendrás ${formatCurrency(annualAntSavings, currency, exchangeRate)} al año.`,
                      badge: 'Optimización',
                      color: 'border-rose-500/30 text-rose-300',
                    },
                    {
                      step: `${totalDebtsRemaining > 0 ? 'Paso 4' : 'Paso 3'}: Depuración de Cargos Recurrentes`,
                      description: `Tienes ${activeSubs.length} suscripciones activas sumando ${formatCurrency(totalMonthlySubs, currency, exchangeRate)} al mes. Revisa si utilizas todas semanalmente o pausa temporalmente las de menor frecuencia.`,
                      badge: 'Optimización',
                      color: 'border-fuchsia-500/30 text-fuchsia-300',
                    },
                  ].map((item, idx) => (
                    <div
                      key={idx}
                      className="liquid-glass hover-lift flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-white/5 hover:border-purple-500/40 transition-all text-xs"
                    >
                      <div className="space-y-1 max-w-2xl">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm">{item.step}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${item.color}`}>
                            {item.badge}
                          </span>
                        </div>
                        <p className="text-zinc-400 leading-relaxed">{item.description}</p>
                      </div>

                      <button
                        onClick={onOpenNewTransaction}
                        className="liquid-pill px-3 py-1.5 text-purple-200 hover:text-white flex items-center gap-1.5 shrink-0 self-start sm:self-auto cursor-pointer"
                      >
                        <span>Registrar</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
