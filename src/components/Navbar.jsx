import React from 'react';
import {
  LayoutDashboard,
  Wallet,
  Sparkles,
  Plus,
  ShieldCheck,
  TrendingUp,
  LogOut,
  Settings,
  CalendarDays,
  Layers,
} from 'lucide-react';
import { formatCurrency, DEFAULT_USD_COP_RATE } from '../data/mockData.js';

const NAV_ITEMS = [
  {
    id: 'dashboard',
    label: 'Visión General',
    shortLabel: 'Inicio',
    icon: LayoutDashboard,
  },
  {
    id: 'accounts',
    label: 'Cuentas & Flujo',
    shortLabel: 'Cuentas',
    icon: Wallet,
  },
  {
    id: 'monthly-expenses',
    label: 'Movimientos por Mes',
    shortLabel: 'Por Mes',
    icon: CalendarDays,
  },
  {
    id: 'commitments',
    label: 'Fijos, Suscripciones & Deudas',
    shortLabel: 'Fijos',
    icon: Layers,
  },
  {
    id: 'ai-advisor',
    label: 'Smart AI Advisor',
    shortLabel: 'IA',
    icon: Sparkles,
    badge: 'IA',
  },
  {
    id: 'settings',
    label: 'Ajustes',
    shortLabel: 'Ajustes',
    icon: Settings,
  },
];

export const Navbar = ({
  activeTab,
  setActiveTab,
  onOpenNewTransaction,
  netWorth,
  antExpenseAlertCount,
  currency = 'USD',
  exchangeRate = DEFAULT_USD_COP_RATE,
  currentUser,
  onOpenSwitchUser,
}) => {
  return (
    <>
      {/* DESKTOP SIDEBAR (Liquid Glass Left Navigation) */}
      <aside className="hidden lg:flex lg:flex-col lg:w-72 lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 p-4">
        <div className="liquid-glass h-full flex flex-col justify-between p-5 relative overflow-hidden">
          {/* Subtle purple ambient glows */}
          <div className="pointer-events-none absolute -top-24 -left-24 w-56 h-56 rounded-full bg-purple-600/20 blur-3xl" />
          <div className="pointer-events-none absolute bottom-10 -right-20 w-48 h-48 rounded-full bg-fuchsia-600/15 blur-3xl" />

          <div className="space-y-6 relative z-10">
            {/* Brand Header */}
            <div className="flex items-center justify-between px-2 pt-1">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500 via-violet-600 to-fuchsia-600 flex items-center justify-center shadow-neon-purple border border-white/25">
                  <Wallet className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold tracking-tight text-lg text-white">
                      Wallet Flow
                    </span>
                    <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-400/30">
                      Liquid Glass
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400">
                    Enterprise Wealth Management
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Action Button: Registrar Entrada/Salida */}
            <button
              onClick={onOpenNewTransaction}
              className="w-full liquid-button-primary py-3 px-4 flex items-center justify-center gap-2.5 text-sm font-semibold group cursor-pointer"
            >
              <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center group-hover:rotate-90 transition-transform duration-300">
                <Plus className="w-4 h-4 text-white" />
              </div>
              <span>Registrar Movimiento</span>
            </button>

            {/* Navigation Menu */}
            <nav className="space-y-1.5">
              <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-2">
                Arquitectura Financiera
              </p>
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-medium transition-all duration-200 relative group cursor-pointer ${
                      isActive
                        ? 'bg-gradient-to-r from-purple-600/35 via-violet-600/25 to-transparent text-white border border-purple-500/40 shadow-liquid-purple'
                        : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.04] border border-transparent'
                    }`}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-2.5 bottom-2.5 w-1 rounded-r-full bg-gradient-to-b from-purple-400 to-fuchsia-500 shadow-[0_0_12px_#a855f7]" />
                    )}
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`p-2 rounded-lg transition-colors shrink-0 ${
                          isActive
                            ? 'bg-purple-500/30 text-purple-200 border border-purple-400/30'
                            : 'bg-white/[0.03] text-zinc-400 group-hover:text-purple-300'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="truncate">{item.label}</span>
                    </div>

                    {item.id === 'ai-advisor' && (
                      <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r from-purple-500/30 to-fuchsia-500/30 text-purple-200 border border-purple-400/40 shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-400 animate-pulse" />
                        {antExpenseAlertCount} alertas
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Bottom Net Worth Quick Card inside Sidebar */}
          <div className="space-y-3 relative z-10">
            {/* Active User Card & Switch button */}
            <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${
                    currentUser?.avatarGradient || 'from-purple-600 to-indigo-600'
                  } flex items-center justify-center text-white font-black text-sm shadow-md shrink-0 border border-white/20`}
                >
                  {currentUser?.username?.[0] || 'U'}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-bold text-white truncate">
                      {currentUser?.username || 'Usuario'}
                    </p>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  </div>
                  <span className="text-[10px] text-zinc-400 block truncate">
                    {currentUser?.role || 'Personal'}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={onOpenSwitchUser}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-zinc-400 hover:text-white transition-all cursor-pointer border border-white/5 hover:border-purple-400/40"
                title="Cambiar de usuario o bloquear sesión"
              >
                <LogOut className="w-4 h-4 text-purple-300" />
              </button>
            </div>

            <div className="liquid-glass-purple p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-purple-200/80 font-medium">
                  Capital Neto Real
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-300 bg-emerald-500/15 border border-emerald-400/30 px-2 py-0.5 rounded-full">
                  <TrendingUp className="w-3 h-3" />
                  +12.8%
                </span>
              </div>
              <p className="text-xl font-bold tracking-tight text-white truncate">
                {formatCurrency(netWorth, currency, exchangeRate)}
              </p>
              <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 pt-1 border-t border-white/10">
                <ShieldCheck className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                <span>Base de datos SQLite activa</span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* MOBILE FLOATING ACTION BUTTON */}
      <button
        onClick={onOpenNewTransaction}
        aria-label="Registrar Entrada o Salida"
        className="lg:hidden fixed right-3.5 bottom-[5.25rem] z-40 liquid-button-primary w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shadow-neon-purple border border-purple-300/40 cursor-pointer"
      >
        <Plus className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
      </button>

      {/* MOBILE iOS FLOATING LIQUID GLASS BOTTOM TAB BAR (6 Equal Columns — Zero Overflow) */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 px-2 pb-safe">
        <div className="bg-[#110E1B]/85 backdrop-blur-3xl border border-white/20 rounded-3xl px-1.5 py-1.5 shadow-[0_24px_60px_rgba(0,0,0,0.9),inset_0_1px_0_0_rgba(255,255,255,0.28)] grid grid-cols-6 gap-0.5 items-center">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`relative flex flex-col items-center justify-center py-1.5 px-0.5 rounded-2xl transition-all duration-200 cursor-pointer min-w-0 w-full ${
                  isActive
                    ? 'bg-gradient-to-b from-purple-500/35 to-fuchsia-600/20 text-white border border-purple-400/45 shadow-[0_4px_16px_rgba(168,85,247,0.35),inset_0_1px_0_0_rgba(255,255,255,0.25)]'
                    : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
                }`}
              >
                <div className="relative">
                  <Icon
                    className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-200 ${
                      isActive ? 'scale-110 text-purple-200' : ''
                    }`}
                  />
                  {item.id === 'ai-advisor' && (
                    <span className="absolute -top-0.5 -right-1 w-2 h-2 rounded-full bg-fuchsia-400 ring-2 ring-[#110E1B]" />
                  )}
                </div>
                <span className="text-[9.5px] sm:text-[10px] font-semibold mt-1 tracking-tight truncate w-full text-center leading-tight">
                  {item.shortLabel}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};
