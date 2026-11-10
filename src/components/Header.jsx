import React from 'react';
import { Calendar, Plus, Sparkles, Wallet, Coins, LogOut } from 'lucide-react';
import { TIMEFRAME_CONFIG, DEFAULT_USD_COP_RATE } from '../data/finance.js';

const COMMITMENTS_TITLE = {
  title: 'Gastos Fijos, Suscripciones & Deudas',
  subtitle: 'Gestión unificada de compromisos recurrentes, suscripciones y créditos',
};

const TAB_TITLES = {
  dashboard: {
    title: 'Visión General Patrimonial',
    subtitle: 'Balance consolidado, liquidez por cuenta y analítica de flujo',
  },
  accounts: {
    title: 'Bóveda de Cuentas & Movimientos',
    subtitle: 'Efectivo, Cuentas Bancarias (Débito/Ahorro) y Tarjetas de Crédito',
  },
  'monthly-expenses': {
    title: 'Movimientos por Mes (Ingresos & Gastos)',
    subtitle: 'Desglose mensual en orden cronológico con concepto, cantidad, categoría y cuenta',
  },
  commitments: COMMITMENTS_TITLE,
  subscriptions: COMMITMENTS_TITLE,
  debts: COMMITMENTS_TITLE,
  'ai-advisor': {
    title: 'Aura AI — Smart Financial Advisor',
    subtitle: 'Diagnóstico algorítmico de fugas de capital y plan predictivo',
  },
  settings: {
    title: 'Ajustes del Sistema & Personalización',
    subtitle: 'Edición total de PIN, perfil, divisas, cuentas, deudas y copias de seguridad',
  },
};

const TIMEFRAMES = ['weekly', 'monthly', 'quarterly', 'yearly'];

const CURRENCIES = [
  {
    code: 'USD',
    title: 'Dólar Estadounidense (Moneda Principal)',
    active: 'bg-gradient-to-r from-purple-600 to-violet-600 text-white shadow-liquid-purple border-purple-400/40',
  },
  {
    code: 'COP',
    title: 'Peso Colombiano (Moneda Secundaria)',
    active:
      'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-[0_2px_12px_rgba(16,185,129,0.4)] border-emerald-400/40',
  },
];

// Contenedor segmentado común: 44px de alto total en móvil para un objetivo táctil cómodo.
const SEGMENT_GROUP = 'bg-black/50 backdrop-blur-xl p-1 rounded-2xl border border-white/10 flex items-center shadow-inner';

export const Header = ({
  activeTab,
  timeframe,
  setTimeframe,
  selectedYear,
  setSelectedYear,
  availableYears = [],
  currency = 'USD',
  setCurrency,
  exchangeRate = DEFAULT_USD_COP_RATE,
  currentUser,
  onLogout,
  onOpenNewTransaction,
  onNavigateAI,
}) => {
  const info = TAB_TITLES[activeTab] || TAB_TITLES.dashboard;

  return (
    <header className="pt-safe-top pb-3 px-3 sm:px-6 lg:px-8 ios-crisp-header border-b border-white/[0.1] relative z-20">
      <div className="max-w-7xl mx-auto flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        {/* Izquierda: marca móvil + título de la vista + usuario */}
        <div className="flex items-center justify-between gap-2 min-w-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
            <div className="lg:hidden w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-fuchsia-600 flex items-center justify-center shadow-neon-purple border border-white/20 shrink-0">
              <Wallet className="w-5 h-5 text-white" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-[15px] sm:text-lg leading-tight font-bold tracking-tight text-white truncate">
                {info.title}
              </h1>

              <div className="mt-0.5 flex items-center gap-1.5 sm:gap-2 min-w-0">
                <span className="inline-flex items-center gap-1.5 min-w-0 text-[11px] sm:text-xs font-semibold text-purple-200">
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 bg-gradient-to-r ${
                      currentUser?.avatarGradient || 'from-purple-400 to-fuchsia-400'
                    }`}
                  />
                  <span className="truncate">{currentUser?.username || 'Usuario'}</span>
                </span>

                <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-purple-900/30 border border-purple-500/30 text-purple-300 shrink-0">
                  <Calendar className="w-3 h-3 text-purple-400" aria-hidden="true" />
                  <span>{TIMEFRAME_CONFIG[timeframe]?.shortLabel || 'Mensual'}</span>
                  <span className="text-zinc-500">•</span>
                  <span className="font-bold text-white">{selectedYear === 'all' ? 'Histórico' : selectedYear}</span>
                </span>
                <span className="hidden md:inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 shrink-0">
                  <Coins className="w-3 h-3" aria-hidden="true" />1 USD = ${Number(exchangeRate).toLocaleString('es-CO')} COP
                </span>
                <p className="hidden xl:block text-xs text-zinc-400 truncate min-w-0">{info.subtitle}</p>
              </div>
            </div>
          </div>

          {/* Acciones rápidas en móvil / tablet */}
          <div className="flex lg:hidden items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={onNavigateAI}
              className="liquid-pill min-h-[44px] px-3 text-xs font-semibold text-purple-200 flex items-center gap-1.5 cursor-pointer active:scale-95"
              aria-label="Abrir diagnóstico con IA"
            >
              <Sparkles className="w-4 h-4 text-fuchsia-400" aria-hidden="true" />
              <span>IA</span>
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="liquid-pill w-11 h-11 flex items-center justify-center text-purple-300 hover:text-white cursor-pointer active:scale-95"
              aria-label="Cerrar sesión"
              title="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Derecha: divisa + año + filtro temporal + acciones */}
        <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2">
          <div className="w-full sm:w-auto flex items-center justify-between sm:justify-start gap-2">
            <div className={SEGMENT_GROUP} role="group" aria-label="Moneda de visualización">
              {CURRENCIES.map(({ code, title, active }) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setCurrency(code)}
                  aria-pressed={currency === code}
                  title={title}
                  className={`min-h-[40px] px-3.5 rounded-xl text-xs font-bold border transition-all cursor-pointer touch-manipulation ${
                    currency === code ? active : 'text-zinc-400 hover:text-white border-transparent'
                  }`}
                >
                  {code} $
                </button>
              ))}
            </div>

            <label className={`${SEGMENT_GROUP} cursor-pointer`}>
              <span className="text-[11px] font-bold text-purple-300 pl-2 pr-0.5 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-purple-400" aria-hidden="true" />
                <span>Año</span>
              </span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear?.(e.target.value)}
                className="bg-transparent text-xs font-bold text-white min-h-[40px] pl-1.5 pr-1 cursor-pointer focus:outline-none border-none"
                title="Año de análisis para todas las secciones"
              >
                {availableYears.map((yr) => (
                  <option key={yr} value={yr} className="bg-[#14121E] text-white font-medium">
                    {yr === 'all' ? 'Todos' : yr}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {/* Filtro temporal global: solo en la visión general */}
          {activeTab === 'dashboard' && (
            <div
              role="tablist"
              aria-label="Filtro temporal global"
              className="w-full sm:w-auto bg-black/50 backdrop-blur-xl p-1 rounded-2xl border border-white/10 grid grid-cols-4 sm:flex items-center gap-1 shadow-inner"
            >
              {TIMEFRAMES.map((tf) => {
                const active = timeframe === tf;
                return (
                  <button
                    key={tf}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setTimeframe(tf)}
                    className={`min-h-[40px] px-1 sm:px-3 rounded-xl text-[11px] sm:text-xs font-semibold border transition-all duration-200 cursor-pointer text-center whitespace-nowrap truncate touch-manipulation ${
                      active
                        ? 'bg-gradient-to-r from-purple-600 to-violet-600 text-white shadow-[0_2px_15px_rgba(168,85,247,0.5)] border-purple-400/40'
                        : 'text-zinc-400 hover:text-zinc-200 border-transparent'
                    }`}
                  >
                    <span className="sm:hidden">{TIMEFRAME_CONFIG[tf]?.shortLabel || tf}</span>
                    <span className="hidden sm:inline">{TIMEFRAME_CONFIG[tf]?.label || tf}</span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="hidden lg:flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenNewTransaction}
              className="liquid-button-primary px-4 py-2 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Entrada / Salida</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
