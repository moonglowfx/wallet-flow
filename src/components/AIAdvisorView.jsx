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
} from 'lucide-react';
import {
  formatCurrency,
  DEFAULT_USD_COP_RATE,
  TIMEFRAME_CONFIG,
  filterTransactionsByPeriod,
} from '../data/mockData.js';

export const AIAdvisorView = ({
  accounts = [],
  transactions = [],
  subscriptions = [],
  debts = [],
  timeframe = 'monthly',
  selectedYear = '2026',
  currency = 'USD',
  exchangeRate = DEFAULT_USD_COP_RATE,
  onOpenNewTransaction,
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

  const targetTxs = activePeriodTxs.length > 0 ? activePeriodTxs : transactions;

  const totalIncomes = targetTxs
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const totalExpenses = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  // Micro-expenses / Ant expenses (flagged or amount <= $15)
  const antTransactions = transactions.filter(
    (t) => t.type === 'expense' && (t.isAntExpense || (t.amount > 0 && t.amount <= 15))
  );
  const antExpenses = antTransactions.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const antRatio = totalExpenses > 0 ? Math.round((antExpenses / totalExpenses) * 100) : 0;

  // Liquid positive capital vs Credit debts
  const liquidCash = accounts
    .filter((a) => a.type === 'cash' || a.type === 'bank')
    .reduce((sum, a) => sum + Math.max(0, Number(a.balance) || 0), 0);

  const creditAccounts = accounts.filter((a) => a.type === 'credit');
  const totalCreditLimit = creditAccounts.reduce((sum, a) => sum + (Number(a.creditLimit) || 0), 0);
  const totalCreditDebt = Math.abs(
    creditAccounts.reduce((sum, a) => sum + Math.min(0, Number(a.balance) || 0), 0)
  );
  const creditUtilization =
    totalCreditLimit > 0 ? Math.round((totalCreditDebt / totalCreditLimit) * 100) : 0;

  // Subscriptions impact
  const activeSubs = subscriptions.filter((s) => s.active);
  const totalMonthlySubs = activeSubs.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
  const essentialSubs = activeSubs
    .filter((s) => s.essential)
    .reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
  const optionalSubs = totalMonthlySubs - essentialSubs;
  const fixedRatio = totalIncomes > 0 ? Math.round((totalMonthlySubs / totalIncomes) * 100) : 0;

  // Burn rate calculations
  // Estimate monthly expense baseline: average of last transactions or totalExpenses / period
  const estimatedMonthlyExpense = Math.max(1, totalExpenses > 0 ? (totalExpenses / Math.max(1, transactions.length > 50 ? 12 : 1)) : 1);
  const dailyBurnRate = estimatedMonthlyExpense / 30;
  const runwayDays = dailyBurnRate > 0 ? Math.round(liquidCash / dailyBurnRate) : 999;
  const runwayMonths = Math.round((runwayDays / 30) * 10) / 10;

  // Aura Financial Health Score (0 - 100)
  let healthScore = 70;
  if (transactions.length > 0) {
    let score = 50;
    // Cash flow ratio: (+25 if income exceeds expense)
    if (totalIncomes > totalExpenses) score += 20;
    else score -= 15;

    // Runway bonus (+15 if > 2 months runway)
    if (runwayMonths >= 3) score += 15;
    else if (runwayMonths >= 1) score += 8;
    else score -= 10;

    // Ant expense penalty
    if (antRatio <= 12) score += 15;
    else if (antRatio <= 25) score += 5;
    else score -= 15;

    // Credit utilization penalty
    if (creditUtilization === 0) score += 10;
    else if (creditUtilization <= 30) score += 5;
    else score -= 15;

    healthScore = Math.max(10, Math.min(98, score));
  }

  const getHealthBadge = (score) => {
    if (score >= 85) return { label: 'Excelente Salud', color: 'text-emerald-300 border-emerald-500/40 bg-emerald-500/20' };
    if (score >= 70) return { label: 'Saludable', color: 'text-purple-300 border-purple-500/40 bg-purple-500/20' };
    if (score >= 50) return { label: 'En Observación', color: 'text-amber-300 border-amber-500/40 bg-amber-500/20' };
    return { label: 'Alerta Financiera', color: 'text-rose-300 border-rose-500/40 bg-rose-500/20' };
  };

  const healthBadge = getHealthBadge(healthScore);

  // 50 / 30 / 20 Dynamic Rule Breakdown
  // Needs: Food, Transports, Health, Subscriptions essential
  // Wants: Other, Travel, Gaming, Apparel, Dining out
  // Savings: Inversión, Trading, Debt Payments
  let calculatedNeeds = 0;
  let calculatedWants = 0;
  let calculatedSavings = 0;

  transactions.forEach((tx) => {
    const amt = Number(tx.amount) || 0;
    if (tx.type === 'expense') {
      const cat = (tx.category || '').toLowerCase();
      if (cat.includes('food') || cat.includes('alimentación') || cat.includes('health') || cat.includes('transport') || cat.includes('household')) {
        calculatedNeeds += amt;
      } else if (cat.includes('inversión') || cat.includes('trading') || cat.includes('transfer')) {
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

  // Top Expense Categories
  const categoryMap = {};
  transactions
    .filter((t) => t.type === 'expense')
    .forEach((t) => {
      const cat = t.category || 'Otros';
      categoryMap[cat] = (categoryMap[cat] || 0) + (Number(t.amount) || 0);
    });
  const topCategories = Object.entries(categoryMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([category, amount]) => ({
      category,
      amount,
      percent: totalExpenses > 0 ? Math.round((amount / totalExpenses) * 100) : 0,
    }));

  // Interactive Simulator math:
  const monthlyAntSavings = Math.round(antExpenses * (antReductionPercent / 100));
  const annualAntSavings = monthlyAntSavings * 12;
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

          {/* Quick Rescan & Aura Score Pill */}
          <div className="flex items-center justify-between sm:justify-end gap-3 w-full lg:w-auto">
            <div className="p-2.5 sm:p-3 rounded-2xl bg-black/40 border border-white/10 flex items-center gap-3 flex-1 sm:flex-initial justify-between sm:justify-start">
              <div className="text-left sm:text-right">
                <span className="text-[10px] uppercase tracking-wider text-zinc-400 block font-semibold">
                  Score de Salud
                </span>
                <span className="text-xl sm:text-2xl font-black text-white font-mono">
                  {transactions.length > 0 ? healthScore : '--'}
                  <span className="text-xs text-zinc-400 font-normal">/100</span>
                </span>
              </div>
              <span className={`text-[10px] font-bold px-2 py-1 rounded-full border ${healthBadge.color}`}>
                {healthBadge.label}
              </span>
            </div>

            <button
              onClick={triggerRescan}
              disabled={isScanning}
              className="liquid-pill px-3.5 py-3 text-xs font-semibold text-purple-200 hover:text-white flex items-center gap-1.5 border-purple-500/40 cursor-pointer shrink-0"
              title="Re-ejecutar auditoría en base a tus movimientos"
            >
              <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin text-fuchsia-400' : ''}`} />
              <span className="hidden sm:inline">{isScanning ? 'Escaneando...' : 'Reescanear'}</span>
            </button>
          </div>
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
                    <span className="text-xs text-zinc-400 font-medium">Carga en Fijos Mensuales</span>
                    <Zap className="w-4 h-4 text-purple-400" />
                  </div>
                  <p className="text-2xl font-black text-purple-300">
                    {formatCurrency(totalMonthlySubs, currency, exchangeRate)}
                  </p>
                  <p className="text-[11px] text-zinc-400">
                    {activeSubs.length} suscripciones ({fixedRatio}% de ingresos)
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Finding 1: Gastos Hormiga */}
                <div className="liquid-glass p-6 space-y-4 border-rose-500/30 relative overflow-hidden">
                  <div className="flex items-start justify-between">
                    <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-300 shrink-0">
                      <Flame className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      {antRatio > 20 ? 'Fuga Alta' : 'Controlable'}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-base font-bold text-white tracking-tight">
                      Microconsumos ({antTransactions.length} transacciones)
                    </h4>
                    <p className="text-2xl font-black text-rose-400 mt-1">
                      {formatCurrency(antExpenses, currency, exchangeRate)}
                    </p>
                  </div>

                  <div className="space-y-2 text-xs text-zinc-300 leading-relaxed border-t border-white/10 pt-3">
                    <p>
                      <strong className="text-white">Patrón detectado:</strong> Pagos menores o iguales a $15 USD (cafés, snacks, delivery, viajes cortos).
                    </p>
                    <p className="text-rose-300/90 font-medium">
                      Impacto anualizado: {formatCurrency(antExpenses * 12, currency, exchangeRate)} que se escapan sin capitalizar.
                    </p>
                  </div>
                </div>

                {/* Finding 2: Uso de Crédito */}
                <div className="liquid-glass p-6 space-y-4 border-amber-500/30 relative overflow-hidden">
                  <div className="flex items-start justify-between">
                    <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-300 shrink-0">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      {creditUtilization > 30 ? 'Atención Requerida' : 'Nivel Óptimo'}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-base font-bold text-white tracking-tight">
                      Líneas de Tarjetas ({creditUtilization}%)
                    </h4>
                    <p className="text-2xl font-black text-amber-300 mt-1">
                      {formatCurrency(totalCreditDebt, currency, exchangeRate)}
                    </p>
                  </div>

                  <div className="space-y-2 text-xs text-zinc-300 leading-relaxed border-t border-white/10 pt-3">
                    <p>
                      <strong className="text-white">Regla de oro:</strong> Mantener el crédito utilizado por debajo del 30% protege tu historial crediticio.
                    </p>
                    <p className="text-amber-300/90 font-medium">
                      Límite total disponible: {formatCurrency(Math.max(0, totalCreditLimit - totalCreditDebt), currency, exchangeRate)}.
                    </p>
                  </div>
                </div>

                {/* Finding 3: Runway de Liquidez */}
                <div className="liquid-glass p-6 space-y-4 border-purple-500/30 relative overflow-hidden">
                  <div className="flex items-start justify-between">
                    <div className="w-10 h-10 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300 shrink-0">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-400/30">
                      Colchón
                    </span>
                  </div>

                  <div>
                    <h4 className="text-base font-bold text-white tracking-tight">
                      Liquidez Inmediata ({runwayDays} días)
                    </h4>
                    <p className="text-2xl font-black text-purple-300 mt-1">
                      {formatCurrency(liquidCash, currency, exchangeRate)}
                    </p>
                  </div>

                  <div className="space-y-2 text-xs text-zinc-300 leading-relaxed border-t border-white/10 pt-3">
                    <p>
                      <strong className="text-white">Fondo de Emergencia:</strong> Tu saldo líquido actual cubre aproximadamente {runwayMonths} meses de tu ritmo de egresos.
                    </p>
                    <p className="text-purple-300/90 font-medium">
                      Recomendación: Ampliar a 3-6 meses para blindaje financiero absoluto.
                    </p>
                  </div>
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
                      Auditoría Matemática Regla 50 / 30 / 20 Dinámica
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Distribución real calculada sobre tus egresos totales ({formatCurrency(totalExpenses, currency, exchangeRate)})
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  {/* Needs 50% */}
                  <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white">Necesidades (Objetivo 50%)</span>
                      <span className={`font-mono font-bold ${needsPercent <= 50 ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {needsPercent}% Actual
                      </span>
                    </div>
                    <p className="text-xl font-bold text-zinc-200">
                      {formatCurrency(calculatedNeeds, currency, exchangeRate)}
                    </p>
                    <p className="text-[11px] text-zinc-400">
                      Alimentación, transporte esencial, servicios básicos y salud
                    </p>
                    <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden">
                      <div className="h-full bg-purple-500 rounded-full" style={{ width: `${Math.min(100, needsPercent)}%` }} />
                    </div>
                  </div>

                  {/* Wants 30% */}
                  <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white">Estilo & Deseos (Objetivo 30%)</span>
                      <span className={`font-mono font-bold ${wantsPercent <= 30 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {wantsPercent}% Actual
                      </span>
                    </div>
                    <p className="text-xl font-bold text-zinc-200">
                      {formatCurrency(calculatedWants, currency, exchangeRate)}
                    </p>
                    <p className="text-[11px] text-zinc-400">
                      Restaurantes, compras personales, gaming, salidas y viajes
                    </p>
                    <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden">
                      <div className="h-full bg-fuchsia-500 rounded-full" style={{ width: `${Math.min(100, wantsPercent)}%` }} />
                    </div>
                  </div>

                  {/* Savings / Investments 20% */}
                  <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white">Ahorro / Inversión (Objetivo 20%)</span>
                      <span className={`font-mono font-bold ${savingsPercent >= 20 ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {savingsPercent}% Actual
                      </span>
                    </div>
                    <p className="text-xl font-bold text-emerald-300">
                      {formatCurrency(calculatedSavings, currency, exchangeRate)}
                    </p>
                    <p className="text-[11px] text-zinc-400">
                      Inversiones de capital, trading, amortización y fondos líquidos
                    </p>
                    <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${Math.min(100, savingsPercent)}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Top 5 Categories of Expenditure */}
              <div className="liquid-glass p-6 sm:p-7 space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-purple-400" />
                      Top 5 Categorías con Mayor Concentración de Egreso
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Identifica en qué se concentra tu capital saliente
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {topCategories.map((item, idx) => (
                    <div key={idx} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-white flex items-center gap-2">
                          <span className="w-5 h-5 rounded-md bg-white/5 border border-white/10 flex items-center justify-center text-[10px] text-purple-300 font-mono">
                            {idx + 1}
                          </span>
                          {item.category}
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="text-zinc-300 font-bold">
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
                  <div className="liquid-pill p-4 space-y-1">
                    <span className="text-zinc-400 text-xs block">Liquidez Mensual Recuperada</span>
                    <p className="text-2xl font-black text-emerald-400">
                      +{formatCurrency(monthlyAntSavings, currency, exchangeRate)}
                    </p>
                    <span className="text-[11px] text-zinc-400">
                      disponibles de inmediato en tu cuenta líquida
                    </span>
                  </div>

                  <div className="liquid-pill p-4 space-y-1">
                    <span className="text-zinc-400 text-xs block">Ahorro Neto Anual (12 Meses)</span>
                    <p className="text-2xl font-black text-purple-300">
                      +{formatCurrency(annualAntSavings, currency, exchangeRate)}
                    </p>
                    <span className="text-[11px] text-zinc-400">
                      capital libre para inversión o amortización
                    </span>
                  </div>

                  <div className="liquid-pill p-4 space-y-1 border-fuchsia-500/30 bg-fuchsia-950/20">
                    <span className="text-fuchsia-200 text-xs block font-medium">
                      Proyección 5 Años Compuesto (10% E.A.)
                    </span>
                    <p className="text-2xl font-black text-white">
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
                    {
                      step: 'Paso 1: Blindaje del Fondo de Reserva',
                      description: `Consolida al menos ${formatCurrency(Math.round(estimatedMonthlyExpense * 2), currency, exchangeRate)} en tu cuenta de débito/ahorros líquida como colchón de emergencia antes de comprometer capital en inversiones de riesgo.`,
                      badge: 'Prioridad 1',
                      color: 'border-emerald-500/30 text-emerald-300',
                    },
                    {
                      step: 'Paso 2: Contención de Microconsumos Diarios',
                      description: `Implementa la regla de espera de 48 horas en compras impulsivas menores a $15 USD. Aplicando un recorte del ${antReductionPercent}%, retendrás ${formatCurrency(annualAntSavings, currency, exchangeRate)} al año.`,
                      badge: 'Prioridad 2',
                      color: 'border-rose-500/30 text-rose-300',
                    },
                    {
                      step: 'Paso 3: Depuración de Cargos Recurrentes',
                      description: `Tienes ${activeSubs.length} suscripciones activas sumando ${formatCurrency(totalMonthlySubs, currency, exchangeRate)} al mes. Revisa si utilizas todas semanalmente o pausa temporalmente las de menor frecuencia.`,
                      badge: 'Prioridad 3',
                      color: 'border-purple-500/30 text-purple-300',
                    },
                  ].map((item, idx) => (
                    <div
                      key={idx}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-white/[0.03] border border-white/5 hover:border-purple-500/30 transition-all text-xs"
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
