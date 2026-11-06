import React, { useState, useEffect } from 'react';
import {
  CalendarClock,
  Plus,
  Tv,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Zap,
  DollarSign,
  TrendingUp,
} from 'lucide-react';
import { formatCurrency } from '../data/mockData.js';

export const SubscriptionsView = ({
  subscriptions = [],
  setSubscriptions,
  accounts = [],
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [filterMode, setFilterMode] = useState('all'); // all, essential, optional

  // New subscription form state
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Streaming & Media');
  const [amount, setAmount] = useState('');
  const [billingDay, setBillingDay] = useState('5');
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [essential, setEssential] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowAddModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Toggle active/inactive
  const toggleActive = (id) => {
    setSubscriptions((prev) =>
      prev.map((sub) => (sub.id === id ? { ...sub, active: !sub.active } : sub))
    );
  };

  // Compute metrics
  const activeSubs = subscriptions.filter((s) => s.active);
  const totalMonthlyImpact = activeSubs.reduce((acc, s) => acc + (s.amount || 0), 0);
  const annualProjectedImpact = totalMonthlyImpact * 12;

  const essentialAmount = activeSubs
    .filter((s) => s.essential)
    .reduce((acc, s) => acc + s.amount, 0);

  const optionalAmount = activeSubs
    .filter((s) => !s.essential)
    .reduce((acc, s) => acc + s.amount, 0);

  const handleAddSubscription = (e) => {
    e.preventDefault();
    if (!name.trim() || !amount) return;

    const newSub = {
      id: `sub-${Date.now()}`,
      name: name.trim(),
      category,
      amount: parseFloat(amount),
      billingDay: parseInt(billingDay, 10) || 1,
      accountId: accountId || accounts[0]?.id || '',
      active: true,
      essential,
      badgeColor: '#A855F7',
    };

    setSubscriptions([newSub, ...subscriptions]);
    setName('');
    setAmount('');
    setShowAddModal(false);
  };

  const filteredSubs = subscriptions.filter((sub) => {
    if (filterMode === 'essential') return sub.essential;
    if (filterMode === 'optional') return !sub.essential;
    return true;
  });

  return (
    <div className="space-y-8 pb-12">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-purple-400" />
            Gastos Fijos y Suscripciones Recurrentes
          </h2>
          <p className="text-xs text-zinc-400">
            Control de pasivos fijos mensuales, calendarización y optimización de costos
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="liquid-button-primary px-4 py-2.5 text-xs font-semibold flex items-center gap-2 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Nueva Suscripción / Pago Fijo</span>
        </button>
      </div>

      {/* Impact Metric Cards (Liquid Glass) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="liquid-glass-purple p-5 space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-purple-200">Impacto Mensual Total</span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/25 border border-purple-400/30 flex items-center justify-center text-purple-200">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-white tracking-tight">
            {formatCurrency(totalMonthlyImpact)}
          </p>
          <p className="text-[11px] text-zinc-400">
            Pasivo fijo recurrente que debes cubrir cada 30 días
          </p>
        </div>

        <div className="liquid-glass p-5 space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400">Proyección Anualizada</span>
            <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center text-zinc-300">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-purple-200 tracking-tight">
            {formatCurrency(annualProjectedImpact)}
          </p>
          <p className="text-[11px] text-zinc-400">
            Costo proyectado de mantener estos servicios durante 12 meses
          </p>
        </div>

        <div className="liquid-glass p-5 space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400">Esencial vs. Opcional</span>
            <span className="text-[11px] font-bold text-fuchsia-300">
              {Math.round((optionalAmount / (totalMonthlyImpact || 1)) * 100)}% Opcional
            </span>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400">Esencial (Renta, Salud, Fibra)</span>
              <span className="font-semibold text-white">{formatCurrency(essentialAmount)}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400">Opcional (Streaming, Gym, Ocio)</span>
              <span className="font-semibold text-fuchsia-300">{formatCurrency(optionalAmount)}</span>
            </div>
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden flex">
              <div
                className="h-full bg-purple-500"
                style={{ width: `${(essentialAmount / (totalMonthlyImpact || 1)) * 100}%` }}
              />
              <div
                className="h-full bg-fuchsia-500"
                style={{ width: `${(optionalAmount / (totalMonthlyImpact || 1)) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setFilterMode('all')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            filterMode === 'all'
              ? 'bg-purple-600/35 text-purple-200 border border-purple-400/40 shadow-liquid-purple'
              : 'bg-white/[0.04] text-zinc-400 hover:text-white border border-white/5'
          }`}
        >
          Todas ({subscriptions.length})
        </button>
        <button
          onClick={() => setFilterMode('essential')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            filterMode === 'essential'
              ? 'bg-purple-600/35 text-purple-200 border border-purple-400/40 shadow-liquid-purple'
              : 'bg-white/[0.04] text-zinc-400 hover:text-white border border-white/5'
          }`}
        >
          Esenciales
        </button>
        <button
          onClick={() => setFilterMode('optional')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            filterMode === 'optional'
              ? 'bg-fuchsia-600/35 text-fuchsia-200 border border-fuchsia-400/40 shadow-liquid-purple'
              : 'bg-white/[0.04] text-zinc-400 hover:text-white border border-white/5'
          }`}
        >
          Optimizables / Opcionales
        </button>
      </div>

      {/* Subscriptions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSubs.map((sub) => {
          const acc = accounts.find((a) => a.id === sub.accountId);

          return (
            <div
              key={sub.id}
              className={`liquid-glass p-5 space-y-4 relative transition-all duration-300 ${
                !sub.active ? 'opacity-50 grayscale-[40%]' : 'hover:border-purple-400/50'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300 shrink-0">
                    <Tv className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-white text-sm truncate">{sub.name}</h3>
                    <p className="text-xs text-zinc-400 truncate">{sub.category}</p>
                  </div>
                </div>

                <button
                  onClick={() => toggleActive(sub.id)}
                  title={sub.active ? 'Pausar cobro' : 'Reactivar cobro'}
                  className="cursor-pointer transition-transform active:scale-90"
                >
                  {sub.active ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <XCircle className="w-5 h-5 text-zinc-500" />
                  )}
                </button>
              </div>

              {/* Price and billing day */}
              <div className="flex items-baseline justify-between pt-2 border-t border-white/10">
                <div>
                  <span className="text-[11px] text-zinc-400 block">Cobro Mensual</span>
                  <span className="text-xl font-bold text-white">
                    {formatCurrency(sub.amount)}
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-[11px] text-zinc-400 block">Día de cobro</span>
                  <span className="text-xs font-semibold text-purple-300">
                    Día {sub.billingDay} de cada mes
                  </span>
                </div>
              </div>

              {/* Account and essential pill */}
              <div className="flex items-center justify-between text-xs pt-2 border-t border-white/5">
                <span className="text-zinc-400 truncate">
                  {acc ? acc.name : 'Tarjeta / Cuenta'}
                </span>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                    sub.essential
                      ? 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                      : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                  }`}
                >
                  {sub.essential ? 'Vital / Fijo' : 'Suscripción Cancelable'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Subscription Modal */}
      {showAddModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAddModal(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fadeIn"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md liquid-glass p-6 space-y-5 border-purple-500/40 shadow-2xl relative"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">
                Registrar Gasto Fijo o Suscripción
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-zinc-400 hover:text-white p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddSubscription} className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-300 font-medium mb-1">
                  Nombre del Servicio o Pago
                </label>
                <input
                  type="text"
                  required
                  placeholder="ej. Netflix 4K, Renta Depto, Gimnasio"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="liquid-input text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-300 font-medium mb-1">
                    Monto Mensual ($ MXN)
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="ej. 549"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="liquid-input text-xs"
                  />
                </div>
                <div>
                  <label className="block text-zinc-300 font-medium mb-1">
                    Día de Cobro (1 - 31)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    required
                    value={billingDay}
                    onChange={(e) => setBillingDay(e.target.value)}
                    className="liquid-input text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-300 font-medium mb-1">
                  Categoría
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="liquid-input text-xs bg-[#13111C]"
                >
                  <option value="Vivienda & Servicios">Vivienda & Servicios</option>
                  <option value="Streaming & Media">Streaming & Media</option>
                  <option value="Software & IA">Software & IA</option>
                  <option value="Salud & Fitness">Salud & Fitness</option>
                  <option value="Seguros & Protección">Seguros & Protección</option>
                </select>
              </div>

              <div>
                <label className="block text-zinc-300 font-medium mb-1">
                  Cuenta de Débito / Tarjeta vinculada
                </label>
                <select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="liquid-input text-xs bg-[#13111C]"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.institution})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="essentialCheck"
                  checked={essential}
                  onChange={(e) => setEssential(e.target.checked)}
                  className="rounded border-purple-500 text-purple-600 focus:ring-purple-500 cursor-pointer"
                />
                <label htmlFor="essentialCheck" className="text-zinc-300 cursor-pointer">
                  Marcar como gasto esencial no negociable (ej. renta, seguro)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="liquid-pill px-4 py-2 text-zinc-400 hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="liquid-button-primary px-5 py-2 font-semibold cursor-pointer"
                >
                  Guardar Suscripción
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
