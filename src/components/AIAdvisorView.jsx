import React, { useState } from 'react';
import {
  Sparkles,
  AlertTriangle,
  Flame,
  TrendingUp,
  Brain,
  ShieldAlert,
  ArrowRight,
  Sliders,
  DollarSign,
  CheckCircle,
  Lightbulb,
  Zap,
  Target,
  RefreshCw,
} from 'lucide-react';
import { formatCurrency } from '../data/mockData.js';

export const AIAdvisorView = ({
  accounts = [],
  transactions = [],
  subscriptions = [],
  debts = [],
  onOpenNewTransaction,
}) => {
  const [antReductionPercent, setAntReductionPercent] = useState(40);
  const [isScanning, setIsScanning] = useState(false);
  const [activeTab, setActiveTab] = useState('diagnostico'); // diagnostico, plan

  const triggerRescan = () => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
    }, 900);
  };

  // Calculations for diagnostic
  const totalIncomes = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const totalExpenses = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const antExpenses = transactions
    .filter((t) => t.isAntExpense)
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const antRatio = totalExpenses > 0 ? Math.round((antExpenses / totalExpenses) * 100) : 0;

  // Credit utilization check
  const creditAccounts = accounts.filter((a) => a.type === 'credit');
  const totalCreditLimit = creditAccounts.reduce((sum, a) => sum + (a.creditLimit || 0), 0);
  const totalCreditDebt = Math.abs(
    creditAccounts.reduce((sum, a) => sum + (a.balance || 0), 0)
  );
  const creditUtilization =
    totalCreditLimit > 0 ? Math.round((totalCreditDebt / totalCreditLimit) * 100) : 0;

  // Fixed Subscriptions impact
  const activeSubs = subscriptions.filter((s) => s.active);
  const totalFixedExpenses = activeSubs.reduce((sum, s) => sum + (s.amount || 0), 0);
  const fixedRatio = totalIncomes > 0 ? Math.round((totalFixedExpenses / totalIncomes) * 100) : 0;

  // Simulator math:
  const monthlyAntSavings = Math.round(antExpenses * (antReductionPercent / 100));
  const annualAntSavings = monthlyAntSavings * 12;
  const fiveYearInvestmentValue = Math.round(
    monthlyAntSavings * ((Math.pow(1 + 0.1425 / 12, 60) - 1) / (0.1425 / 12))
  );

  // 50/30/20 Rule Analysis
  const needsExpense = totalFixedExpenses + 4850; // essentials
  const wantsExpense = Math.max(0, totalExpenses - needsExpense);
  const actualSavings = Math.max(0, totalIncomes - totalExpenses);

  const needsPercent = totalIncomes > 0 ? Math.round((needsExpense / totalIncomes) * 100) : 0;
  const wantsPercent = totalIncomes > 0 ? Math.round((wantsExpense / totalIncomes) * 100) : 0;
  const savingsPercent = totalIncomes > 0 ? Math.round((actualSavings / totalIncomes) * 100) : 0;

  return (
    <div className="space-y-8 pb-12">
      {/* AI Advisor Hero Banner */}
      <div className="liquid-glass-purple p-6 sm:p-8 space-y-4 relative overflow-hidden">
        {/* Glow Effects */}
        <div className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full bg-gradient-to-br from-fuchsia-500/25 to-purple-600/30 blur-3xl animate-pulse" />
        <div className="pointer-events-none absolute bottom-0 left-10 w-48 h-48 rounded-full bg-violet-600/20 blur-3xl" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 via-fuchsia-600 to-indigo-600 flex items-center justify-center text-white shadow-neon-purple border border-white/30 shrink-0">
              <Brain className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Aura AI — Smart Financial Advisor
                </h2>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-fuchsia-500/20 text-fuchsia-200 border border-fuchsia-400/40">
                  Modelo Predictivo v4.6
                </span>
              </div>
              <p className="text-xs text-zinc-300">
                Auditoría algorítmica continua de flujos, detección de sesgos y optimización matemática
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={triggerRescan}
              disabled={isScanning}
              className="liquid-pill px-3.5 py-2 text-xs font-semibold text-purple-200 hover:text-white flex items-center gap-1.5 border-purple-500/40 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin text-fuchsia-400' : ''}`} />
              <span>{isScanning ? 'Reanalizando...' : 'Reescanear Flujos'}</span>
            </button>
          </div>
        </div>

        {/* Diagnostic vs Action Plan Switcher */}
        <div className="flex items-center gap-2 pt-3 border-t border-white/10 relative z-10">
          <button
            onClick={() => setActiveTab('diagnostico')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'diagnostico'
                ? 'bg-purple-600/40 text-purple-200 border border-purple-400/40 shadow-liquid-purple'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            1. Diagnóstico: ¿Qué estás haciendo mal? (3 Hallazgos)
          </button>
          <button
            onClick={() => setActiveTab('plan')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'plan'
                ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white border border-purple-300/40 shadow-liquid-purple'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            2. Plan de Acción Predictivo & Simulador
          </button>
        </div>
      </div>

      {/* TAB 1: DIAGNÓSTICO (QUÉ ESTÁS HACIENDO MAL) */}
      {activeTab === 'diagnostico' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-purple-200/90 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-fuchsia-400" />
              Diagnóstico de Ineficiencias y Fugas de Capital
            </h3>
            <span className="text-xs text-zinc-400">
              Detectadas automáticamente analizando {transactions.length} transacciones
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Finding 1: Gastos Hormiga */}
            <div className="liquid-glass p-6 space-y-4 border-rose-500/30 hover:border-rose-400/50 transition-all relative overflow-hidden group">
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-300 shrink-0">
                  <Flame className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  Fuga Crítica
                </span>
              </div>

              <div>
                <h4 className="text-base font-bold text-white tracking-tight">
                  Gastos Hormiga al {antRatio}% de tus egresos
                </h4>
                <p className="text-2xl font-black text-rose-400 mt-1">
                  {formatCurrency(antExpenses)} al mes
                </p>
              </div>

              <div className="space-y-2 text-xs text-zinc-300 leading-relaxed border-t border-white/10 pt-3">
                <p>
                  <strong className="text-white">Problema detectado:</strong> Microconsumos diarios en cafeterías de especialidad ({formatCurrency(1110)}), Uber frecuentes ({formatCurrency(1680)}) y apps de delivery nocturno ({formatCurrency(1390)}).
                </p>
                <p className="text-rose-300/90 font-medium">
                  Impacto: Esta cifra drena {formatCurrency(antExpenses * 12)} anuales sin generar ningún activo duradero.
                </p>
              </div>
            </div>

            {/* Finding 2: Sobreutilización de Tarjetas de Crédito */}
            <div className="liquid-glass p-6 space-y-4 border-amber-500/30 hover:border-amber-400/50 transition-all relative overflow-hidden group">
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-300 shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Riesgo Alto
                </span>
              </div>

              <div>
                <h4 className="text-base font-bold text-white tracking-tight">
                  Sobreutilización de Crédito Revolvente ({creditUtilization}%)
                </h4>
                <p className="text-2xl font-black text-amber-300 mt-1">
                  {formatCurrency(totalCreditDebt)} en deuda
                </p>
              </div>

              <div className="space-y-2 text-xs text-zinc-300 leading-relaxed border-t border-white/10 pt-3">
                <p>
                  <strong className="text-white">Problema detectado:</strong> Tu tarjeta Nu Morada está al 66% de su límite con un CAT promedio del 48.5% anual.
                </p>
                <p className="text-amber-300/90 font-medium">
                  Impacto: Superar el 30% de uso de línea castiga tu score crediticio ante buró y genera intereses compuestos regresivos.
                </p>
              </div>
            </div>

            {/* Finding 3: Carga de Pasivos Fijos */}
            <div className="liquid-glass p-6 space-y-4 border-purple-500/30 hover:border-purple-400/50 transition-all relative overflow-hidden group">
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300 shrink-0">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-400/30">
                  Optimizable
                </span>
              </div>

              <div>
                <h4 className="text-base font-bold text-white tracking-tight">
                  {subscriptions.length} Suscripciones activas
                </h4>
                <p className="text-2xl font-black text-purple-300 mt-1">
                  {formatCurrency(totalFixedExpenses)} comprometidos
                </p>
              </div>

              <div className="space-y-2 text-xs text-zinc-300 leading-relaxed border-t border-white/10 pt-3">
                <p>
                  <strong className="text-white">Problema detectado:</strong> Cuentas con 3 servicios de streaming simultáneos (Netflix, Max, Spotify) sumando {formatCurrency(1576)} mensuales.
                </p>
                <p className="text-purple-300/90 font-medium">
                  Impacto: Representa el {fixedRatio}% de tu flujo libre antes de que inicie el mes calendario.
                </p>
              </div>
            </div>
          </div>

          {/* Quick jump to Action Plan CTA */}
          <div className="p-4 rounded-2xl liquid-glass-purple border-purple-400/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-purple-200">
              <Lightbulb className="w-4 h-4 text-fuchsia-400 shrink-0" />
              <span>
                <strong>Aura AI ha formulado una solución:</strong> Descubre cuánto capital liberas recortando gastos con el simulador matemático.
              </span>
            </div>
            <button
              onClick={() => setActiveTab('plan')}
              className="liquid-button-primary px-4 py-2 font-bold flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <span>Ver Plan de Acción y Simulador</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: PLAN DE ACCIÓN PREDICTIVO & SIMULADOR MATEMÁTICO */}
      {activeTab === 'plan' && (
        <div className="space-y-6">
          {/* Interactive Predictive Simulator: Reducción de Gastos Hormiga */}
          <div className="liquid-glass p-6 sm:p-8 space-y-6 relative overflow-hidden border-purple-500/40">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-fuchsia-400" />
                  Simulador de Eficiencia Matemática Predictiva
                </span>
                <h3 className="text-lg font-black text-white">
                  ¿Qué pasa si optimizas tus Gastos Hormiga hoy?
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
              <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
                <span>0% (Sin cambios)</span>
                <span className="text-purple-200 font-bold">Ajuste actual: {antReductionPercent}%</span>
                <span>80% (Modo monje / agresivo)</span>
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

            {/* Simulator Output Metrics (3 liquid glass pills) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="liquid-pill p-4 space-y-1">
                <span className="text-zinc-400 text-xs block">Liquidez Mensual Recuperada</span>
                <p className="text-2xl font-black text-emerald-400">
                  +{formatCurrency(monthlyAntSavings)}
                </p>
                <span className="text-[11px] text-zinc-400">
                  disponibles cada mes en tu cuenta líquida
                </span>
              </div>

              <div className="liquid-pill p-4 space-y-1">
                <span className="text-zinc-400 text-xs block">Ahorro Neto Anual (12 Meses)</span>
                <p className="text-2xl font-black text-purple-300">
                  +{formatCurrency(annualAntSavings)}
                </p>
                <span className="text-[11px] text-zinc-400">
                  suficiente para liquidar la TDC Nu Morada
                </span>
              </div>

              <div className="liquid-pill p-4 space-y-1 border-fuchsia-500/30 bg-fuchsia-950/20">
                <span className="text-fuchsia-200 text-xs block font-medium">
                  Proyección a 5 Años en Cajita Turbo (14.25%)
                </span>
                <p className="text-2xl font-black text-white">
                  {formatCurrency(fiveYearInvestmentValue)}
                </p>
                <span className="text-[11px] text-zinc-400">
                  capital acumulado con interés compuesto
                </span>
              </div>
            </div>
          </div>

          {/* 50 / 30 / 20 Mathematical Breakdown */}
          <div className="liquid-glass p-6 sm:p-7 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Target className="w-4 h-4 text-purple-400" />
                  Auditoría Matemática Regla 50 / 30 / 20
                </h3>
                <p className="text-xs text-zinc-400">
                  Ingreso total registrado: {formatCurrency(totalIncomes)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              {/* Needs 50% */}
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">Necesidades (Objetivo 50%)</span>
                  <span
                    className={`font-mono font-bold ${
                      needsPercent <= 50 ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                  >
                    {needsPercent}% Actual
                  </span>
                </div>
                <p className="text-xl font-bold text-zinc-200">{formatCurrency(needsExpense)}</p>
                <p className="text-[11px] text-zinc-400">
                  Renta, servicios, seguros y despensa esencial
                </p>
                <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-500 rounded-full"
                    style={{ width: `${Math.min(100, needsPercent)}%` }}
                  />
                </div>
              </div>

              {/* Wants 30% */}
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">Deseos & Estilo (Objetivo 30%)</span>
                  <span
                    className={`font-mono font-bold ${
                      wantsPercent <= 30 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {wantsPercent}% Actual
                  </span>
                </div>
                <p className="text-xl font-bold text-zinc-200">{formatCurrency(wantsExpense)}</p>
                <p className="text-[11px] text-zinc-400">
                  Restaurantes, compras tech, salidas y ocio
                </p>
                <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-fuchsia-500 rounded-full"
                    style={{ width: `${Math.min(100, wantsPercent)}%` }}
                  />
                </div>
              </div>

              {/* Savings 20% */}
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">Ahorro & Deuda (Objetivo 20%)</span>
                  <span
                    className={`font-mono font-bold ${
                      savingsPercent >= 20 ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                  >
                    {savingsPercent}% Actual
                  </span>
                </div>
                <p className="text-xl font-bold text-emerald-300">
                  {formatCurrency(actualSavings)}
                </p>
                <p className="text-[11px] text-zinc-400">
                  Excedente libre para amortización y fondos de alta tasa
                </p>
                <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-400 rounded-full"
                    style={{ width: `${Math.min(100, savingsPercent)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Strategic Action Plan: Pasos Ordenados de Ejecución */}
          <div className="liquid-glass p-6 sm:p-7 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-purple-400" />
              Ruta Algorítmica Recomendada (Siguientes 30 Días)
            </h3>

            <div className="space-y-3">
              {[
                {
                  step: 'Paso 1: Método Avalancha en Tarjeta Nu',
                  description:
                    'Destina los primeros $7,000 MXN del excedente libre a liquidar el saldo revolvente de la tarjeta Nu (tasa 48.5%). Esto ahorrará inmediatamente más de $700 mensuales en intereses puros.',
                  badge: 'Prioridad 1',
                  color: 'border-rose-500/30 text-rose-300',
                },
                {
                  step: 'Paso 2: Centralización en Bóveda Cajita Turbo (14.25%)',
                  description:
                    'Mantén únicamente $8,450 en efectivo de bolsillo y $15,000 en BBVA para débitos del mes. Mueve cualquier excedente a Nu Cajita Turbo para generar interés compuesto diario garantizado.',
                  badge: 'Prioridad 2',
                  color: 'border-purple-500/30 text-purple-300',
                },
                {
                  step: 'Paso 3: Depuración de Suscripciones Duplicadas',
                  description:
                    'Pausa temporalmente Netflix o Max durante los meses de menor uso. Ahorro automático de $548 mensuales con un solo clic.',
                  badge: 'Prioridad 3',
                  color: 'border-fuchsia-500/30 text-fuchsia-300',
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
                    <span>Ejecutar</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
