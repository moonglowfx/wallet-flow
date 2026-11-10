import React from 'react';
import {
  LayoutDashboard,
  Wallet,
  Sparkles,
  Plus,
  ShieldCheck,
  LogOut,
  Settings,
  CalendarDays,
  Layers,
} from 'lucide-react';
import { formatCurrency, DEFAULT_USD_COP_RATE } from '../data/finance.js';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Visión General', shortLabel: 'Inicio', icon: LayoutDashboard },
  { id: 'accounts', label: 'Cuentas & Flujo', shortLabel: 'Cuentas', icon: Wallet },
  { id: 'monthly-expenses', label: 'Movimientos por Mes', shortLabel: 'Por Mes', icon: CalendarDays },
  { id: 'commitments', label: 'Gastos Fijos & Deudas', shortLabel: 'Fijos', icon: Layers },
  { id: 'ai-advisor', label: 'Aura AI Advisor', shortLabel: 'IA', icon: Sparkles },
  { id: 'settings', label: 'Ajustes', shortLabel: 'Ajustes', icon: Settings },
];

export const Navbar = ({
  activeTab,
  setActiveTab,
  onOpenNewTransaction,
  netWorth,
  antExpenseAlertCount = 0,
  currency = 'USD',
  exchangeRate = DEFAULT_USD_COP_RATE,
  currentUser,
  onLogout,
}) => {
  const initial = (currentUser?.username || 'U').charAt(0).toUpperCase();

  return (
    <>
      {/* SIDEBAR DE ESCRITORIO (Liquid Glass) */}
      <aside className="hidden lg:flex lg:flex-col lg:w-80 lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 p-4">
        <div className="liquid-glass h-full flex flex-col justify-between gap-4 p-5 relative overflow-hidden">
          <div className="pointer-events-none absolute -top-24 -left-24 w-56 h-56 rounded-full bg-purple-600/20 blur-3xl" />
          <div className="pointer-events-none absolute bottom-10 -right-20 w-48 h-48 rounded-full bg-fuchsia-600/15 blur-3xl" />

          <div className="space-y-6 relative z-10 min-h-0 overflow-y-auto no-scrollbar">
            {/* Marca */}
            <div className="flex items-center gap-3 px-2 pt-1">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500 via-violet-600 to-fuchsia-600 flex items-center justify-center shadow-neon-purple border border-white/25 shrink-0">
                <Wallet className="w-5 h-5 text-white" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold tracking-tight text-lg text-white whitespace-nowrap">Wallet Flow</span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-400/30 whitespace-nowrap">
                    Liquid Glass
                  </span>
                </div>
                <p className="text-xs text-zinc-400 truncate">Enterprise Wealth Management</p>
              </div>
            </div>

            <button
              type="button"
              onClick={onOpenNewTransaction}
              className="w-full liquid-button-primary py-3 px-4 flex items-center justify-center gap-2.5 text-sm font-semibold group cursor-pointer"
            >
              <span className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center group-hover:rotate-90 transition-transform duration-300">
                <Plus className="w-4 h-4 text-white" aria-hidden="true" />
              </span>
              <span>Registrar Movimiento</span>
            </button>

            <nav className="space-y-1.5" aria-label="Navegación principal">
              <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-2">
                Arquitectura Financiera
              </p>
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveTab(item.id)}
                    aria-current={isActive ? 'page' : undefined}
                    className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-medium transition-all duration-200 relative group cursor-pointer ${
                      isActive
                        ? 'bg-gradient-to-r from-purple-600/35 via-violet-600/25 to-transparent text-white border border-purple-500/40 shadow-liquid-purple'
                        : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.04] border border-transparent'
                    }`}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-2.5 bottom-2.5 w-1 rounded-r-full bg-gradient-to-b from-purple-400 to-fuchsia-500 shadow-[0_0_12px_#a855f7]" />
                    )}
                    <span className="flex items-center gap-3 min-w-0">
                      <span
                        className={`p-2 rounded-lg transition-colors shrink-0 ${
                          isActive
                            ? 'bg-purple-500/30 text-purple-200 border border-purple-400/30'
                            : 'bg-white/[0.03] text-zinc-400 group-hover:text-purple-300'
                        }`}
                      >
                        <Icon className="w-4 h-4" aria-hidden="true" />
                      </span>
                      <span className="truncate">{item.label}</span>
                    </span>

                    {item.id === 'ai-advisor' && antExpenseAlertCount > 0 && (
                      <span
                        className="flex items-center gap-1 text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-gradient-to-r from-purple-500/30 to-fuchsia-500/30 text-purple-200 border border-purple-400/40 shrink-0"
                        title="Gastos hormiga detectados"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-400 animate-pulse" />
                        {antExpenseAlertCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="space-y-3 relative z-10 shrink-0">
            {/* Usuario activo y cierre de sesión */}
            <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${
                    currentUser?.avatarGradient || 'from-purple-600 to-indigo-600'
                  } flex items-center justify-center text-white font-black text-sm shadow-md shrink-0 border border-white/20`}
                >
                  {initial}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-bold text-white truncate">{currentUser?.username || 'Usuario'}</p>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                  </div>
                  <span className="text-[10px] text-zinc-400 block truncate">{currentUser?.role || 'Personal'}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={onLogout}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/15 text-purple-300 hover:text-white transition-all cursor-pointer border border-white/5 hover:border-purple-400/40 shrink-0"
                title="Cerrar sesión"
                aria-label="Cerrar sesión"
              >
                <LogOut className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            <div className="liquid-glass-purple p-4 space-y-2.5">
              <span className="text-xs text-purple-200/80 font-medium">Capital Neto Real</span>
              <p className="text-xl font-bold tracking-tight text-white truncate font-tabular">
                {formatCurrency(netWorth, currency, exchangeRate)}
              </p>
              <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 pt-1 border-t border-white/10">
                <ShieldCheck className="w-3.5 h-3.5 text-purple-400 shrink-0" aria-hidden="true" />
                <span>Sesión protegida · datos sincronizados</span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* BOTÓN FLOTANTE MÓVIL (56px, por encima de la barra inferior y del safe-area) */}
      <button
        type="button"
        onClick={onOpenNewTransaction}
        aria-label="Registrar movimiento"
        className="lg:hidden fixed right-3.5 bottom-[calc(5.25rem+env(safe-area-inset-bottom,0px))] z-40 liquid-button-primary w-14 h-14 !rounded-2xl flex items-center justify-center shadow-neon-purple border border-purple-300/40 cursor-pointer"
      >
        <Plus className="w-6 h-6 text-white" aria-hidden="true" />
      </button>

      {/* BARRA INFERIOR MÓVIL (6 columnas iguales, objetivos táctiles ≥ 48px, sin desbordes a 320px) */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 px-2 pb-safe" aria-label="Navegación principal">
        <div className="bg-[#110E1B]/90 backdrop-blur-3xl border border-white/20 rounded-3xl p-1 shadow-[0_24px_60px_rgba(0,0,0,0.9),inset_0_1px_0_0_rgba(255,255,255,0.28)] grid grid-cols-6 gap-0.5 items-stretch">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                aria-current={isActive ? 'page' : undefined}
                aria-label={item.label}
                className={`relative flex flex-col items-center justify-center gap-1 min-h-[52px] px-0.5 rounded-[1.15rem] transition-all duration-200 cursor-pointer min-w-0 touch-manipulation active:scale-95 ${
                  isActive
                    ? 'bg-gradient-to-b from-purple-500/35 to-fuchsia-600/20 text-white border border-purple-400/45 shadow-[0_4px_16px_rgba(168,85,247,0.35),inset_0_1px_0_0_rgba(255,255,255,0.25)]'
                    : 'text-zinc-400 border border-transparent'
                }`}
              >
                <span className="relative">
                  <Icon
                    className={`w-5 h-5 transition-transform duration-200 ${isActive ? 'scale-110 text-purple-200' : ''}`}
                    aria-hidden="true"
                  />
                  {item.id === 'ai-advisor' && antExpenseAlertCount > 0 && (
                    <span className="absolute -top-0.5 -right-1 w-2 h-2 rounded-full bg-fuchsia-400 ring-2 ring-[#110E1B]" />
                  )}
                </span>
                <span className="text-[10px] font-semibold tracking-tight truncate w-full text-center leading-none">
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
