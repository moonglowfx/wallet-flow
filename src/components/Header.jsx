import React from 'react';
import {
  Calendar,
  Plus,
  RotateCcw,
  Sparkles,
  Wallet,
  FileSpreadsheet,
  Coins,
  LogOut,
  UserCheck,
} from 'lucide-react';
import { TIMEFRAME_CONFIG, DEFAULT_USD_COP_RATE } from '../data/mockData.js';

const TAB_TITLES = {
  dashboard: {
    title: 'Visión General Patrimonial',
    subtitle: 'Balance consolidado, liquidez por cuenta y analítica de flujo',
  },
  accounts: {
    title: 'Bóveda de Cuentas & Movimientos',
    subtitle: 'Efectivo, Cuentas Bancarias (Débito/Ahorro) y Tarjetas de Crédito',
  },
  subscriptions: {
    title: 'Gastos Fijos & Suscripciones',
    subtitle: 'Control de cargos recurrentes mensuales y pasivos automáticos',
  },
  debts: {
    title: 'Gestor de Deudas & Abonos',
    subtitle: 'Seguimiento de amortización, liquidación progresiva e historial',
  },
  'ai-advisor': {
    title: 'Aura AI — Smart Financial Advisor',
    subtitle: 'Diagnóstico algorítmico de fugas de capital y plan predictivo',
  },
};

const TIMEFRAMES = ['weekly', 'monthly', 'quarterly', 'yearly'];

export const Header = ({
  activeTab,
  timeframe,
  setTimeframe,
  currency = 'USD',
  setCurrency,
  exchangeRate = DEFAULT_USD_COP_RATE,
  currentUser,
  onOpenSwitchUser,
  onOpenNewTransaction,
  onOpenImportModal,
  onResetDemoData,
  onNavigateAI,
}) => {
  const info = TAB_TITLES[activeTab] || TAB_TITLES.dashboard;

  return (
    <header className="sticky top-0 z-20 pt-3 pb-4 px-4 sm:px-6 lg:px-8 bg-[#0F0F13]/75 backdrop-blur-2xl border-b border-white/[0.07]">
      <div className="max-w-7xl mx-auto flex flex-col gap-3.5 md:flex-row md:items-center md:justify-between">
        {/* Left: Mobile Brand + Current View Title + User Badge */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="lg:hidden w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-fuchsia-600 flex items-center justify-center shadow-neon-purple border border-white/20 shrink-0">
              <Wallet className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-white">
                  {info.title}
                </h1>

                {/* Active user badge button */}
                <button
                  onClick={onOpenSwitchUser}
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-900/35 border border-purple-400/40 hover:border-purple-300 text-purple-200 text-xs font-bold transition-all cursor-pointer shadow-sm hover:scale-105"
                  title="Cambiar de usuario o bloquear sesión"
                >
                  <span className={`w-2 h-2 rounded-full bg-gradient-to-r ${currentUser?.avatarGradient || 'from-purple-400 to-fuchsia-400'} animate-pulse`} />
                  <span>{currentUser?.username || 'Usuario'}</span>
                  <span className="text-[10px] text-zinc-400 font-mono">(PIN: {currentUser?.pin})</span>
                </button>

                <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-purple-900/30 border border-purple-500/30 text-purple-300">
                  <Calendar className="w-3 h-3" />
                  {TIMEFRAME_CONFIG[timeframe]?.shortLabel || 'Mensual'}
                </span>
                <span className="hidden md:inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-300">
                  <Coins className="w-3 h-3" />
                  1 USD = ${exchangeRate.toLocaleString('es-CO')} COP
                </span>
              </div>
              <p className="text-xs text-zinc-400 hidden sm:block">
                {info.subtitle}
              </p>
            </div>
          </div>

          {/* Mobile Quick AI, User Switch & Reset buttons */}
          <div className="flex lg:hidden items-center gap-1.5">
            <button
              onClick={onOpenSwitchUser}
              className="liquid-pill p-1.5 text-purple-300 hover:text-white cursor-pointer"
              title="Cambiar Usuario"
            >
              <LogOut className="w-4 h-4" />
            </button>
            <button
              onClick={onOpenImportModal}
              className="liquid-pill p-1.5 text-emerald-300 hover:text-white cursor-pointer"
              title="Importar Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-4 h-4" />
            </button>
            <button
              onClick={onNavigateAI}
              className="liquid-pill px-2.5 py-1.5 text-xs font-medium text-purple-200 flex items-center gap-1 border-purple-500/40 cursor-pointer"
              title="Diagnóstico IA"
            >
              <Sparkles className="w-3.5 h-3.5 text-fuchsia-400" />
              <span>IA</span>
            </button>
          </div>
        </div>

        {/* Right: Currency Toggle + Global Timeframe Selector + Action Buttons */}
        <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2.5">
          {/* Dual Currency Switcher: USD (Principal) vs COP (Secundaria) */}
          <div className="bg-black/50 backdrop-blur-xl p-1 rounded-2xl border border-white/10 flex items-center shadow-inner">
            <button
              onClick={() => setCurrency('USD')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                currency === 'USD'
                  ? 'bg-gradient-to-r from-purple-600 to-violet-600 text-white shadow-liquid-purple border border-purple-400/40'
                  : 'text-zinc-400 hover:text-white'
              }`}
              title="Dólar Estadounidense (Moneda Principal)"
            >
              USD $
            </button>
            <button
              onClick={() => setCurrency('COP')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                currency === 'COP'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-[0_2px_12px_rgba(16,185,129,0.4)] border border-emerald-400/40'
                  : 'text-zinc-400 hover:text-white'
              }`}
              title="Peso Colombiano (Moneda Secundaria)"
            >
              COP $
            </button>
          </div>

          {/* Global Temporal Filter */}
          <div
            role="tablist"
            aria-label="Filtro Temporal Global"
            className="w-full sm:w-auto bg-black/50 backdrop-blur-xl p-1 rounded-2xl border border-white/10 flex items-center justify-between sm:justify-start shadow-inner"
          >
            {TIMEFRAMES.map((tf) => {
              const active = timeframe === tf;
              return (
                <button
                  key={tf}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setTimeframe(tf)}
                  className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer ${
                    active
                      ? 'bg-gradient-to-r from-purple-600 to-violet-600 text-white shadow-[0_2px_15px_rgba(168,85,247,0.5)] border border-purple-400/40'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {TIMEFRAME_CONFIG[tf]?.label || tf}
                </button>
              );
            })}
          </div>

          {/* Desktop Action Buttons */}
          <div className="hidden lg:flex items-center gap-2">
            <button
              onClick={onOpenImportModal}
              className="liquid-pill px-3 py-2 text-xs font-semibold text-emerald-300 hover:text-white border-emerald-500/30 hover:border-emerald-400 hover:bg-emerald-500/10 flex items-center gap-1.5 cursor-pointer transition-all"
              title="Importar archivo Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Importar Excel</span>
            </button>

            <button
              onClick={onOpenNewTransaction}
              className="liquid-button-primary px-3.5 py-2 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Entrada / Salida</span>
            </button>

            <button
              onClick={onOpenSwitchUser}
              title="Cambiar Usuario / Bloquear Sesión"
              className="liquid-pill p-2 text-zinc-400 hover:text-purple-200 hover:border-purple-500/40 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
