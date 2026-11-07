import React, { useState } from 'react';
import {
  CalendarClock,
  HandCoins,
  Plus,
  ShieldAlert,
  TrendingDown,
  Layers,
  CreditCard,
  Tv,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Zap,
  Calendar,
  Percent,
} from 'lucide-react';
import { SubscriptionsView } from './SubscriptionsView.jsx';
import { DebtsView } from './DebtsView.jsx';
import { formatCurrency, DEFAULT_USD_COP_RATE, TIMEFRAME_CONFIG } from '../data/mockData.js';

export const CommitmentsView = ({
  currentUser,
  subscriptions = [],
  setSubscriptions,
  debts = [],
  setDebts,
  accounts = [],
  timeframe = 'monthly',
  selectedYear = '2026',
  currency = 'USD',
  exchangeRate = DEFAULT_USD_COP_RATE,
  onLogPaymentTransaction,
  onOpenNewTransaction,
}) => {
  const [activeSubTab, setActiveSubTab] = useState('suscripciones'); // 'suscripciones', 'deudas', 'calendario'

  // Calculations for consolidated commitments
  const activeSubs = subscriptions.filter((s) => s.active);
  const totalMonthlySubs = activeSubs.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);

  const totalDebtBalance = debts.reduce(
    (sum, d) => sum + Math.max(0, (Number(d.totalAmount) || 0) - (Number(d.paidAmount) || 0)),
    0
  );

  const totalMonthlyDebtPayments = debts.reduce((sum, d) => {
    const remaining = Math.max(0, (Number(d.totalAmount) || 0) - (Number(d.paidAmount) || 0));
    if (remaining <= 0) return sum;
    return sum + (Number(d.minimumMonthlyPayment) || Math.round(remaining * 0.05));
  }, 0);

  const totalMonthlyCommitment = totalMonthlySubs + totalMonthlyDebtPayments;

  // Real-time synchronization with active global timeframe
  const periodMultiplier = React.useMemo(() => {
    switch (timeframe) {
      case 'weekly':
        return 1 / 4.33;
      case 'quarterly':
        return 3;
      case 'yearly':
        return 12;
      default:
        return 1;
    }
  }, [timeframe]);

  const periodCommitment = totalMonthlyCommitment * periodMultiplier;
  const periodLabel = timeframe === 'weekly' ? 'Semanal' : timeframe === 'quarterly' ? 'Trimestral' : timeframe === 'yearly' ? 'Anual' : 'Mensual';

  return (
    <div className="space-y-6 sm:space-y-8 pb-6">
      {/* Unified Banner */}
      <div className="liquid-glass-purple p-4 sm:p-6 lg:p-8 space-y-5 sm:space-y-6 relative overflow-hidden">
        <div className="pointer-events-none absolute -top-24 -right-24 w-80 h-80 rounded-full bg-purple-600/20 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-10 w-48 h-48 rounded-full bg-fuchsia-600/15 blur-3xl" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-6 relative z-10">
          <div className="flex items-start gap-3 sm:gap-4 min-w-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-purple-600 via-fuchsia-600 to-indigo-600 flex items-center justify-center text-white shadow-neon-purple border border-white/30 shrink-0">
              <Layers className="w-5 h-5 sm:w-6 sm:h-6 animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-2xl font-black text-white tracking-tight">
                  Compromisos: Fijos, Suscripciones & Deudas
                </h2>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-200 border border-purple-400/40">
                  Gestión Unificada
                </span>
              </div>
              <p className="text-xs text-zinc-300 mt-1 max-w-xl">
                Monitorea todos tus egresos comprometidos antes de iniciar el mes: pasivos recurrentes, membresías y amortización de créditos
              </p>
            </div>
          </div>

          {/* Quick Metrics Pill with Real-time Timeframe Synchronization */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="w-full sm:w-auto p-3 rounded-2xl bg-black/40 border border-white/10 text-left sm:text-right">
              <span className="text-[10px] uppercase tracking-wider text-purple-300 block font-semibold">
                Carga {periodLabel} ({TIMEFRAME_CONFIG[timeframe]?.label || 'Este Mes'})
              </span>
              <span className="text-lg sm:text-xl font-black text-rose-300 font-mono block truncate">
                {formatCurrency(periodCommitment, currency, exchangeRate)}
              </span>
              <span className="text-[10px] text-zinc-400 block font-normal truncate">
                Base: {formatCurrency(totalMonthlyCommitment, currency, exchangeRate)} / mes
              </span>
            </div>
          </div>
        </div>

        {/* Unified Metrics Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 relative z-10">
          <div className="liquid-pill p-3 space-y-1">
            <span className="text-zinc-400 text-xs block flex items-center gap-1.5">
              <CalendarClock className="w-3.5 h-3.5 text-purple-400" />
              Suscripciones Activas ({activeSubs.length})
            </span>
            <p className="text-lg font-bold text-white">
              {formatCurrency(totalMonthlySubs, currency, exchangeRate)}
              <span className="text-xs text-zinc-400 font-normal"> / mes</span>
            </p>
          </div>

          <div className="liquid-pill p-3 space-y-1">
            <span className="text-zinc-400 text-xs block flex items-center gap-1.5">
              <HandCoins className="w-3.5 h-3.5 text-rose-400" />
              Total Saldo en Deuda
            </span>
            <p className="text-lg font-bold text-rose-400">
              {formatCurrency(totalDebtBalance, currency, exchangeRate)}
            </p>
          </div>

          <div className="liquid-pill p-3 space-y-1 border-purple-500/30">
            <span className="text-zinc-400 text-xs block flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              Mensualidad Créditos Estimada
            </span>
            <p className="text-lg font-bold text-amber-300">
              {formatCurrency(totalMonthlyDebtPayments, currency, exchangeRate)}
              <span className="text-xs text-zinc-400 font-normal"> / mes</span>
            </p>
          </div>
        </div>

        {/* Sub-tab Navigation */}
        <div className="grid grid-cols-1 sm:flex sm:flex-wrap items-center gap-2 pt-3 border-t border-white/10 relative z-10 text-xs font-bold">
          <button
            onClick={() => setActiveSubTab('suscripciones')}
            className={`px-3.5 py-2.5 sm:px-4 sm:py-2 rounded-xl transition-all flex items-center justify-center sm:justify-start gap-1.5 cursor-pointer ${
              activeSubTab === 'suscripciones'
                ? 'bg-purple-600/40 text-purple-200 border border-purple-400/40 shadow-liquid-purple'
                : 'text-zinc-400 hover:text-white bg-white/[0.03]'
            }`}
          >
            <CalendarClock className="w-4 h-4 shrink-0" />
            <span className="truncate">1. Gastos Fijos & Suscripciones ({subscriptions.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('deudas')}
            className={`px-3.5 py-2.5 sm:px-4 sm:py-2 rounded-xl transition-all flex items-center justify-center sm:justify-start gap-1.5 cursor-pointer ${
              activeSubTab === 'deudas'
                ? 'bg-purple-600/40 text-purple-200 border border-purple-400/40 shadow-liquid-purple'
                : 'text-zinc-400 hover:text-white bg-white/[0.03]'
            }`}
          >
            <HandCoins className="w-4 h-4 shrink-0" />
            <span className="truncate">2. Deudas & Líneas de Crédito ({debts.length})</span>
          </button>
        </div>
      </div>

      {/* RENDER ACTIVE SUB-SECTION */}
      {activeSubTab === 'suscripciones' && (
        <SubscriptionsView
          subscriptions={subscriptions}
          setSubscriptions={setSubscriptions}
          accounts={accounts}
          currency={currency}
          exchangeRate={exchangeRate}
          currentUser={currentUser}
        />
      )}

      {activeSubTab === 'deudas' && (
        <DebtsView
          debts={debts}
          setDebts={setDebts}
          accounts={accounts}
          currency={currency}
          exchangeRate={exchangeRate}
          onLogPaymentTransaction={onLogPaymentTransaction}
          currentUser={currentUser}
        />
      )}
    </div>
  );
};
