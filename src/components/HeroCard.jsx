import React, { useState } from 'react';
import {
  TrendingUp,
  CreditCard,
  Banknote,
  Building2,
  Eye,
  EyeOff,
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
} from 'lucide-react';
import {
  formatCurrency,
  formatSecondaryCurrency,
  TIMEFRAME_CONFIG,
  DEFAULT_USD_COP_RATE,
} from '../data/mockData.js';

export const HeroCard = ({
  accounts = [],
  timeframe = 'monthly',
  currency = 'USD',
  exchangeRate = DEFAULT_USD_COP_RATE,
  onSelectAccount,
  onOpenNewTransaction,
  onOpenNewAccount,
}) => {
  const [showValues, setShowValues] = useState(true);

  // Compute total positive liquidity (banks + cash) and total credit liabilities in USD
  const liquidCash = accounts
    .filter((a) => a.type === 'cash')
    .reduce((sum, a) => sum + (a.balance || 0), 0);

  const bankDeposits = accounts
    .filter((a) => a.type === 'bank')
    .reduce((sum, a) => sum + (a.balance || 0), 0);

  const creditDebt = accounts
    .filter((a) => a.type === 'credit')
    .reduce((sum, a) => sum + (a.balance || 0), 0); // negative number

  const netCapital = liquidCash + bankDeposits + creditDebt;
  const grossAssets = liquidCash + bankDeposits;
  const debtAbs = Math.abs(creditDebt);
  const leveragePercent = grossAssets > 0 ? Math.round((debtAbs / grossAssets) * 100) : 0;

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

  const getTypeLabel = (type) => {
    switch (type) {
      case 'cash':
        return 'Efectivo';
      case 'credit':
        return 'Tarjeta de Crédito';
      default:
        return 'Cuenta Bancaria';
    }
  };

  return (
    <div className="relative rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-purple-950/40 via-[#181326]/60 to-[#0F0F13]/90 backdrop-blur-2xl border border-purple-500/30 shadow-[0_25px_60px_rgba(76,29,149,0.35),inset_0_1px_0_0_rgba(255,255,255,0.2)] overflow-hidden">
      {/* Dynamic Liquid Glow Orbs */}
      <div className="pointer-events-none absolute -top-32 -right-32 w-80 h-80 rounded-full bg-gradient-to-br from-purple-500/25 to-fuchsia-600/20 blur-3xl animate-pulse" />
      <div className="pointer-events-none absolute -bottom-28 -left-28 w-72 h-72 rounded-full bg-indigo-600/15 blur-3xl" />

      {/* Top Banner Row */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-200 border border-purple-400/30 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-fuchsia-400" />
            Capital Neto Consolidado
          </span>
          <span className="text-xs text-zinc-400 hidden sm:inline">
            {TIMEFRAME_CONFIG[timeframe]?.subtitle}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowValues(!showValues)}
            className="liquid-pill px-3 py-1.5 text-xs text-zinc-300 hover:text-white flex items-center gap-1.5 cursor-pointer"
            title={showValues ? 'Ocultar balances' : 'Mostrar balances'}
          >
            {showValues ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{showValues ? 'Ocultar' : 'Ver'}</span>
          </button>
          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-400/30">
            <TrendingUp className="w-3 h-3" />
            <span>{currency === 'USD' ? 'USD Principal' : 'COP Secundaria'}</span>
          </div>
        </div>
      </div>

      {/* Central Big Metric: Balance Total Neto */}
      <div className="relative z-10 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-4">
          <div>
            <p className="text-xs sm:text-sm font-medium uppercase tracking-wider text-purple-200/80 mb-1">
              Patrimonio Neto Líquido (Activos − Pasivos)
            </p>
            <div className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white flex items-baseline gap-2">
              <span>{showValues ? formatCurrency(netCapital, currency, exchangeRate) : '••••••••'}</span>
            </div>
            {showValues && (
              <p className="text-xs sm:text-sm font-semibold text-emerald-300/90 mt-1 flex items-center gap-1.5">
                <span className="text-zinc-400 font-normal">Equivalente:</span>
                <span className="font-mono">
                  {formatSecondaryCurrency(netCapital, currency, exchangeRate)}
                </span>
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenNewTransaction}
              className="liquid-button-primary px-4 py-2.5 text-xs font-semibold flex items-center gap-2 cursor-pointer"
            >
              <span>+ Registrar Movimiento</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Mini stats pill-row */}
        <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="liquid-pill p-2.5">
            <span className="text-zinc-400 block text-[11px]">Bancos & Ahorro</span>
            <span className="text-sm font-semibold text-purple-200">
              {showValues ? formatCurrency(bankDeposits, currency, exchangeRate) : '••••'}
            </span>
          </div>
          <div className="liquid-pill p-2.5">
            <span className="text-zinc-400 block text-[11px]">Efectivo Líquido</span>
            <span className="text-sm font-semibold text-emerald-300">
              {showValues ? formatCurrency(liquidCash, currency, exchangeRate) : '••••'}
            </span>
          </div>
          <div className="liquid-pill p-2.5">
            <span className="text-zinc-400 block text-[11px]">Deuda en TDC</span>
            <span className="text-sm font-semibold text-rose-300">
              {showValues ? formatCurrency(creditDebt, currency, exchangeRate) : '••••'}
            </span>
          </div>
          <div className="liquid-pill p-2.5">
            <span className="text-zinc-400 block text-[11px]">Apalancamiento</span>
            <span className="text-sm font-semibold text-amber-300">{leveragePercent}% del activo</span>
          </div>
        </div>
      </div>

      {/* DESGLOSE VISUAL SECCIONADO POR CUENTAS */}
      <div className="relative z-10 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-purple-200/90 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
            Desglose Seccionado por Cuentas Activas
          </h2>
          <span className="text-[11px] text-zinc-400">
            {accounts.length} Cuentas conectadas
          </span>
        </div>

        {accounts.length === 0 ? (
          <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 text-center space-y-3">
            <Building2 className="w-8 h-8 text-purple-400 mx-auto" />
            <div>
              <p className="text-sm font-bold text-white">Aún no tienes cuentas registradas</p>
              <p className="text-xs text-zinc-400 mt-1 max-w-md mx-auto">
                Comienza agregando tu primera cuenta de Efectivo, Cuenta Bancaria o Tarjeta de Crédito para activar el desglose patrimonial.
              </p>
            </div>
            <button
              onClick={onOpenNewAccount}
              className="liquid-button-primary px-5 py-2.5 text-xs font-semibold inline-flex items-center gap-2 cursor-pointer shadow-neon-purple"
            >
              <span>+ Crear Mi Primera Cuenta</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {accounts.map((acc) => {
              const Icon = getAccountIcon(acc.type);
              const isNegative = (acc.balance || 0) < 0;

              return (
                <div
                  key={acc.id}
                  onClick={() => onSelectAccount && onSelectAccount(acc.id)}
                  className="group relative p-3.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] backdrop-blur-xl border border-white/10 hover:border-purple-400/40 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-liquid-purple"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                          acc.type === 'credit'
                            ? 'bg-rose-500/20 border-rose-500/30 text-rose-300'
                            : acc.type === 'cash'
                            ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300'
                            : 'bg-purple-500/20 border-purple-500/30 text-purple-200'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-white truncate group-hover:text-purple-200 transition-colors">
                          {acc.name}
                        </p>
                        <p className="text-[10px] text-zinc-400 truncate">
                          {acc.institution} • {acc.accountNumber}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${
                        acc.type === 'credit'
                          ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                          : acc.type === 'cash'
                          ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                          : 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                      }`}
                    >
                      {getTypeLabel(acc.type)}
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between pt-2 border-t border-white/[0.06]">
                    <span className="text-[11px] text-zinc-400">Balance</span>
                    <span
                      className={`text-sm font-bold tracking-tight ${
                        isNegative ? 'text-rose-400' : 'text-purple-100'
                      }`}
                    >
                      {showValues ? formatCurrency(acc.balance, currency, exchangeRate) : '••••••••'}
                    </span>
                  </div>

                  {acc.type === 'credit' && acc.creditLimit && (
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-zinc-400">
                        <span>Límite {formatCurrency(acc.creditLimit, currency, exchangeRate)}</span>
                        <span className="text-rose-300 font-medium">
                          {Math.round((Math.abs(acc.balance) / acc.creditLimit) * 100)}% Usado
                        </span>
                      </div>
                      <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
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
                    </div>
                  )}

                  {acc.type === 'bank' && acc.yieldRate && (
                    <div className="mt-1.5 flex items-center justify-between text-[10px] text-emerald-300">
                      <span>Rendimiento anual</span>
                      <span className="font-semibold">+{acc.yieldRate}% Anual</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
