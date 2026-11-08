import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  Pencil,
  Trash2,
  Clock,
  X,
} from 'lucide-react';
import { formatCurrency, DEFAULT_USD_COP_RATE, isSubscriptionChargedInMonth } from '../data/mockData.js';
import { api } from '../services/api.js';

export const SubscriptionsView = ({
  subscriptions = [],
  setSubscriptions,
  accounts = [],
  transactions = [],
  onExecuteDueSubscriptions,
  currency = 'USD',
  exchangeRate = DEFAULT_USD_COP_RATE,
  currentUser,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSubId, setEditingSubId] = useState(null);
  const [filterMode, setFilterMode] = useState('all'); // all, essential, optional

  // New/Edit subscription form state
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Streaming & Media');
  const [amount, setAmount] = useState('');
  const [subCurrency, setSubCurrency] = useState('USD');
  const [billingDay, setBillingDay] = useState('5');
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [essential, setEssential] = useState(false);
  const [autoCharge, setAutoCharge] = useState(true);

  const openEditSub = (sub) => {
    setEditingSubId(sub.id);
    setName(sub.name);
    setCategory(sub.category || 'Streaming & Media');
    setSubCurrency(currency);
    const displayAmt = currency === 'COP' ? Math.round((sub.amount || 0) * exchangeRate) : sub.amount;
    setAmount(String(displayAmt ?? ''));
    setBillingDay(String(sub.billingDay || 5));
    setAccountId(sub.accountId || accounts[0]?.id || '');
    setEssential(Boolean(sub.essential));
    setAutoCharge(sub.autoCharge !== false);
    setShowAddModal(true);
  };

  // Lock background scroll when modal is open
  useEffect(() => {
    if (showAddModal) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [showAddModal]);

  const openNewSub = () => {
    setEditingSubId(null);
    setName('');
    setAmount('');
    setSubCurrency(currency);
    setBillingDay('5');
    setEssential(false);
    setAutoCharge(true);
    setShowAddModal(true);
  };

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
    api.toggleSubscription(id).catch((err) => console.error('Error SQLite toggleSubscription:', err));
  };

  // Toggle individual autoCharge configuration
  const toggleAutoCharge = (id) => {
    const sub = subscriptions.find((s) => s.id === id);
    if (!sub) return;
    const nextAutoCharge = sub.autoCharge === false ? true : false;
    const updated = { ...sub, autoCharge: nextAutoCharge };
    setSubscriptions((prev) => prev.map((s) => (s.id === id ? updated : s)));
    api.updateSubscription(updated, currentUser?.id || 'munboi').catch((err) =>
      console.error('Error SQLite toggleAutoCharge:', err)
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

    const numAmount = parseFloat(amount);
    const finalUSDAmount = subCurrency === 'COP' ? numAmount / exchangeRate : numAmount;
    const existing = editingSubId ? subscriptions.find((s) => s.id === editingSubId) : null;

    const subPayload = {
      id: editingSubId || `sub-${Date.now()}`,
      name: name.trim(),
      category,
      amount: Math.round(finalUSDAmount * 100) / 100,
      billingDay: parseInt(billingDay, 10) || 1,
      accountId: accountId || accounts[0]?.id || '',
      active: existing ? existing.active : true,
      essential,
      autoCharge: Boolean(autoCharge),
      badgeColor: existing?.badgeColor || '#A855F7',
    };

    if (editingSubId) {
      setSubscriptions((prev) => prev.map((s) => (s.id === editingSubId ? subPayload : s)));
      api.updateSubscription(subPayload, currentUser?.id || 'munboi').catch((err) =>
        console.error('Error SQLite updateSubscription:', err)
      );
    } else {
      setSubscriptions([subPayload, ...subscriptions]);
      api.createSubscription(subPayload, currentUser?.id || 'munboi').catch((err) =>
        console.error('Error SQLite createSubscription:', err)
      );
    }
    setName('');
    setAmount('');
    setEditingSubId(null);
    setShowAddModal(false);
  };

  const handleDeleteSub = (id) => {
    setSubscriptions((prev) => prev.filter((s) => s.id !== id));
    api
      .deleteSubscription(id, currentUser?.id || 'munboi')
      .catch((err) => console.error('Error SQLite deleteSubscription:', err));
    setEditingSubId(null);
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
          onClick={openNewSub}
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
            {formatCurrency(totalMonthlyImpact, currency, exchangeRate)}
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
            {formatCurrency(annualProjectedImpact, currency, exchangeRate)}
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
              <span className="font-semibold text-white">{formatCurrency(essentialAmount, currency, exchangeRate)}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400">Opcional (Streaming, Gym, Ocio)</span>
              <span className="font-semibold text-fuchsia-300">{formatCurrency(optionalAmount, currency, exchangeRate)}</span>
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
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        <button
          onClick={() => setFilterMode('all')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer shrink-0 whitespace-nowrap ${
            filterMode === 'all'
              ? 'bg-purple-600/35 text-purple-200 border border-purple-400/40 shadow-liquid-purple'
              : 'bg-white/[0.04] text-zinc-400 hover:text-white border border-white/5'
          }`}
        >
          Todas ({subscriptions.length})
        </button>
        <button
          onClick={() => setFilterMode('essential')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer shrink-0 whitespace-nowrap ${
            filterMode === 'essential'
              ? 'bg-purple-600/35 text-purple-200 border border-purple-400/40 shadow-liquid-purple'
              : 'bg-white/[0.04] text-zinc-400 hover:text-white border border-white/5'
          }`}
        >
          Esenciales
        </button>
        <button
          onClick={() => setFilterMode('optional')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer shrink-0 whitespace-nowrap ${
            filterMode === 'optional'
              ? 'bg-fuchsia-600/35 text-fuchsia-200 border border-fuchsia-400/40 shadow-liquid-purple'
              : 'bg-white/[0.04] text-zinc-400 hover:text-white border border-white/5'
          }`}
        >
          Optimizables / Opcionales
        </button>
      </div>

      {/* Subscriptions Grid */}
      {filteredSubs.length === 0 ? (
        <div className="liquid-glass p-8 text-center space-y-4 max-w-lg mx-auto">
          <CalendarClock className="w-10 h-10 text-purple-400 mx-auto" />
          <div>
            <h3 className="text-base font-bold text-white">No tienes pagos fijos registrados</h3>
            <p className="text-xs text-zinc-400 mt-1">
              Registra tu renta, internet, streaming o gimnasio para proyectar y controlar tu gasto fijo mensual.
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="liquid-button-primary px-5 py-2.5 text-xs font-semibold inline-flex items-center gap-2 cursor-pointer shadow-neon-purple"
          >
            <Plus className="w-4 h-4" />
            <span>+ Registrar Pago Fijo</span>
          </button>
        </div>
      ) : (
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

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => openEditSub(sub)}
                      title="Editar suscripción"
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-purple-500/20 text-zinc-400 hover:text-purple-200 border border-white/10 transition-all cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
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
                </div>

                {/* Price and billing day */}
                <div className="flex items-baseline justify-between pt-2 border-t border-white/10">
                  <div>
                    <span className="text-[11px] text-zinc-400 block">Cobro Mensual</span>
                    <span className="text-xl font-bold text-white">
                      {formatCurrency(sub.amount, currency, exchangeRate)}
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

                {/* Auto-execution status and configuration toggle */}
                {(() => {
                  const now = new Date();
                  const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                  const isExecuted = isSubscriptionChargedInMonth(sub, transactions, currentMonthPrefix);
                  const isAuto = sub.autoCharge !== false;

                  return (
                    <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px]">
                      <span className="text-zinc-400 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-purple-400" />
                        Día {sub.billingDay}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {isExecuted ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-400/30 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Cobrado
                          </span>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => toggleAutoCharge(sub.id)}
                          title={isAuto ? 'Auto-cobro programado activo. Clic para pasar a cobro manual' : 'Cobro manual. Clic para activar auto-cobro programado'}
                          className={`text-[10px] font-medium px-2 py-0.5 rounded-full border transition-all cursor-pointer flex items-center gap-1 ${
                            isAuto
                              ? 'bg-purple-500/15 text-purple-200 border-purple-400/30 hover:bg-purple-500/25'
                              : 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30 hover:bg-zinc-500/25'
                          }`}
                        >
                          <Zap className={`w-3 h-3 ${isAuto ? 'text-purple-400' : 'text-zinc-500'}`} />
                          {isAuto ? 'Auto-Cobro' : 'Manual'}
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Subscription Modal */}
      {showAddModal && typeof document !== 'undefined' && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAddModal(false);
          }}
          className="fixed inset-0 z-[99999] flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4 bg-black/85 backdrop-blur-md overflow-hidden animate-fadeIn"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md h-[92dvh] sm:h-auto sm:max-h-[88dvh] flex flex-col rounded-t-3xl sm:rounded-3xl bg-[#14121E] sm:bg-[#14121E]/95 backdrop-blur-2xl border-t sm:border border-purple-500/40 p-0 overflow-hidden shadow-neon-purple relative"
          >
            <div className="pt-[max(1.25rem,calc(env(safe-area-inset-top,0px)+0.75rem))] pb-3 sm:py-4 px-4 sm:px-6 border-b border-white/10 flex items-center justify-between shrink-0 bg-gradient-to-r from-purple-900/30 to-indigo-900/30">
              <h3 className="text-base font-bold text-white truncate pr-2">
                {editingSubId ? 'Editar Suscripción / Pago Fijo' : 'Registrar Gasto Fijo o Suscripción'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setEditingSubId(null);
                  setShowAddModal(false);
                }}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddSubscription} className="flex-1 min-h-0 flex flex-col overflow-hidden text-xs">
              <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-4 custom-scrollbar overscroll-contain">
                <div>
                  <label className="block text-zinc-300 font-medium mb-1.5 text-xs">
                    Nombre del Servicio o Pago
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ej. Netflix 4K, Renta Depto, Gimnasio"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="liquid-input text-base sm:text-xs min-h-[46px]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-zinc-300 font-medium text-xs">Monto Mensual</label>
                      <div className="flex items-center gap-1 bg-black/50 rounded-lg p-0.5 border border-white/10 text-[10px]">
                        <button
                          type="button"
                          onClick={() => setSubCurrency('USD')}
                          className={`px-2 py-0.5 rounded cursor-pointer ${
                            subCurrency === 'USD' ? 'bg-purple-600 text-white font-bold' : 'text-zinc-400'
                          }`}
                        >
                          USD
                        </button>
                        <button
                          type="button"
                          onClick={() => setSubCurrency('COP')}
                          className={`px-2 py-0.5 rounded cursor-pointer ${
                            subCurrency === 'COP' ? 'bg-emerald-600 text-white font-bold' : 'text-zinc-400'
                          }`}
                        >
                          COP
                        </button>
                      </div>
                    </div>
                    <input
                      type="tel"
                      inputMode="decimal"
                      required
                      placeholder={subCurrency === 'USD' ? 'ej. 19.99' : 'ej. 80000'}
                      value={amount}
                      onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                      className="liquid-input text-base sm:text-xs font-mono min-h-[46px]"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-300 font-medium mb-1.5 text-xs">
                      Día de Cobro (1 - 31)
                    </label>
                    <input
                      type="tel"
                      inputMode="numeric"
                      required
                      placeholder="1"
                      value={billingDay}
                      onChange={(e) => setBillingDay(e.target.value.replace(/[^0-9]/g, ''))}
                      className="liquid-input text-base sm:text-xs font-mono min-h-[46px]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-300 font-medium mb-1.5 text-xs">
                    Categoría
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="liquid-input text-base sm:text-xs bg-[#13111C] min-h-[46px]"
                  >
                    <option value="Vivienda & Servicios">Vivienda & Servicios</option>
                    <option value="Streaming & Media">Streaming & Media</option>
                    <option value="Software & IA">Software & IA</option>
                    <option value="Salud & Fitness">Salud & Fitness</option>
                    <option value="Seguros & Protección">Seguros & Protección</option>
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-300 font-medium mb-1.5 text-xs">
                    Cuenta de Débito / Tarjeta vinculada
                  </label>
                  <select
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    className="liquid-input text-base sm:text-xs bg-[#13111C] min-h-[46px]"
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
                    id="autoChargeCheck"
                    checked={autoCharge}
                    onChange={(e) => setAutoCharge(e.target.checked)}
                    className="rounded border-purple-500 text-purple-600 focus:ring-purple-500 cursor-pointer w-4 h-4"
                  />
                  <label htmlFor="autoChargeCheck" className="text-zinc-300 cursor-pointer font-medium text-xs">
                    Habilitar Cobro Automático en la fecha de pago
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="essentialCheck"
                    checked={essential}
                    onChange={(e) => setEssential(e.target.checked)}
                    className="rounded border-purple-500 text-purple-600 focus:ring-purple-500 cursor-pointer w-4 h-4"
                  />
                  <label htmlFor="essentialCheck" className="text-zinc-300 cursor-pointer text-xs">
                    Marcar como gasto esencial no negociable (ej. renta, seguro)
                  </label>
                </div>
              </div>

              <div className="p-3.5 sm:p-5 border-t border-white/10 shrink-0 bg-[#0F0D18]/95 backdrop-blur-xl pb-[max(1rem,env(safe-area-inset-bottom,0px))] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                {editingSubId ? (
                  <button
                    type="button"
                    onClick={() => handleDeleteSub(editingSubId)}
                    className="liquid-pill py-2.5 px-3.5 text-rose-400 hover:text-rose-200 border border-rose-500/30 flex items-center justify-center gap-1.5 cursor-pointer min-h-[46px] text-xs"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Eliminar</span>
                  </button>
                ) : null}

                <div className="grid grid-cols-2 gap-2.5 w-full sm:w-auto ml-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingSubId(null);
                      setShowAddModal(false);
                    }}
                    className="liquid-pill py-2.5 px-4 text-zinc-400 hover:text-white cursor-pointer text-center min-h-[46px] flex items-center justify-center font-semibold text-xs"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="liquid-button-primary py-2.5 px-5 font-semibold cursor-pointer text-center min-h-[46px] flex items-center justify-center shadow-neon-purple active:scale-95 text-xs"
                  >
                    {editingSubId ? 'Guardar' : 'Guardar'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
