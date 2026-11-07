import React, { useState, useEffect } from 'react';
import {
  HandCoins,
  Plus,
  TrendingDown,
  CheckCircle,
  Percent,
  Calendar,
  DollarSign,
  ArrowRight,
  ShieldAlert,
  Clock,
} from 'lucide-react';
import { formatCurrency, DEFAULT_USD_COP_RATE } from '../data/mockData.js';
import { api } from '../services/api.js';

export const DebtsView = ({
  debts = [],
  setDebts,
  accounts = [],
  currency = 'USD',
  exchangeRate = DEFAULT_USD_COP_RATE,
  onLogPaymentTransaction,
  currentUser,
}) => {
  const [selectedDebtForPayment, setSelectedDebtForPayment] = useState(null);
  const [showNewDebtModal, setShowNewDebtModal] = useState(false);

  const defaultLiquidAcc = accounts.find((a) => a.type !== 'credit')?.id || accounts[0]?.id || '';

  // Payment modal state
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentCurrency, setPaymentCurrency] = useState('USD');
  const [paymentNote, setPaymentNote] = useState('');
  const [paymentAccount, setPaymentAccount] = useState(defaultLiquidAcc);

  // New debt modal state
  const [newTitle, setNewTitle] = useState('');
  const [newCounterparty, setNewCounterparty] = useState('');
  const [newCategory, setNewCategory] = useState('Préstamo Personal');
  const [newTotal, setNewTotal] = useState('');
  const [newDebtCurrency, setNewDebtCurrency] = useState('USD');
  const [newPaid, setNewPaid] = useState('0');
  const [newRate, setNewRate] = useState('12.5');
  const [newMinMonthly, setNewMinMonthly] = useState('');
  const [newDueDate, setNewDueDate] = useState('2027-12-31');

  useEffect(() => {
    if (selectedDebtForPayment && (!paymentAccount || !accounts.some((a) => a.id === paymentAccount))) {
      setPaymentAccount(defaultLiquidAcc);
    }
  }, [selectedDebtForPayment, accounts, defaultLiquidAcc]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setSelectedDebtForPayment(null);
        setShowNewDebtModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Compute overall debt statistics
  const totalPrincipal = debts.reduce((sum, d) => sum + (d.totalAmount || 0), 0);
  const totalAmortized = debts.reduce((sum, d) => sum + (d.paidAmount || 0), 0);
  const totalRemaining = totalPrincipal - totalAmortized;
  const overallProgress = totalPrincipal > 0 ? Math.round((totalAmortized / totalPrincipal) * 100) : 0;

  // Handle logging an "abono" to a debt
  const handleAddPayment = (e) => {
    e.preventDefault();
    if (!selectedDebtForPayment || !paymentAmount) return;

    const rawNum = parseFloat(paymentAmount);
    if (isNaN(rawNum) || rawNum <= 0) return;

    const amountNum = paymentCurrency === 'COP' ? rawNum / exchangeRate : rawNum;
    const finalAmountUSD = Math.round(amountNum * 100) / 100;

    const newPayment = {
      id: `dp-${Date.now()}`,
      amount: finalAmountUSD,
      date: new Date().toISOString().split('T')[0],
      note: paymentNote.trim() || 'Abono a capital ordinario',
      accountId: paymentAccount,
    };

    setDebts((prevDebts) =>
      prevDebts.map((d) => {
        if (d.id === selectedDebtForPayment.id) {
          const updatedPaid = Math.min(d.totalAmount, (d.paidAmount || 0) + finalAmountUSD);
          return {
            ...d,
            paidAmount: updatedPaid,
            payments: [newPayment, ...(d.payments || [])],
          };
        }
        return d;
      })
    );

    api
      .addDebtPayment(selectedDebtForPayment.id, newPayment, currentUser?.id || 'munboi')
      .catch((err) => console.error('Error SQLite addDebtPayment:', err));

    // Also trigger global transaction hook to keep accounts updated
    if (onLogPaymentTransaction) {
      onLogPaymentTransaction({
        title: `Abono a: ${selectedDebtForPayment.title}`,
        amount: finalAmountUSD,
        type: 'expense',
        category: 'Abono a Deuda / TDC',
        accountId: paymentAccount,
        date: new Date().toISOString().split('T')[0],
        notes: paymentNote || `Abono registrado a ${selectedDebtForPayment.counterparty}`,
      });
    }

    setPaymentAmount('');
    setPaymentNote('');
    setSelectedDebtForPayment(null);
  };

  // Handle adding a brand new debt item
  const handleCreateDebt = (e) => {
    e.preventDefault();
    if (!newTitle.trim() || !newTotal) return;

    let totalNum = parseFloat(newTotal);
    let paidNum = parseFloat(newPaid) || 0;
    let minMonthlyNum = parseFloat(newMinMonthly) || Math.round(totalNum * 0.05);

    if (newDebtCurrency === 'COP') {
      totalNum = totalNum / exchangeRate;
      paidNum = paidNum / exchangeRate;
      minMonthlyNum = minMonthlyNum / exchangeRate;
    }

    const createdDebt = {
      id: `debt-${Date.now()}`,
      title: newTitle.trim(),
      counterparty: newCounterparty.trim() || 'Entidad Financiera',
      category: newCategory,
      totalAmount: Math.round(totalNum * 100) / 100,
      paidAmount: Math.round(paidNum * 100) / 100,
      interestRate: parseFloat(newRate) || 0,
      minimumMonthlyPayment: Math.round(minMonthlyNum * 100) / 100,
      dueDate: newDueDate,
      payments: [],
    };

    setDebts([createdDebt, ...debts]);
    api
      .createDebt(createdDebt, currentUser?.id || 'munboi')
      .catch((err) => console.error('Error SQLite createDebt:', err));
    setNewTitle('');
    setNewCounterparty('');
    setNewTotal('');
    setShowNewDebtModal(false);
  };

  return (
    <div className="space-y-8 pb-12">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <HandCoins className="w-5 h-5 text-purple-400" />
            Gestor de Pasivos, Deudas y Abonos a Capital
          </h2>
          <p className="text-xs text-zinc-400">
            Seguimiento de amortización progresiva, tasas de interés y liquidación total
          </p>
        </div>

        <button
          onClick={() => setShowNewDebtModal(true)}
          className="liquid-button-primary px-4 py-2.5 text-xs font-semibold flex items-center gap-2 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Registrar Nueva Deuda / Crédito</span>
        </button>
      </div>

      {/* Amortization Progress Banner (Liquid Glass) */}
      <div className="liquid-glass-purple p-4 sm:p-6 lg:p-7 space-y-4 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="min-w-0">
            <span className="text-xs font-semibold text-purple-200 uppercase tracking-wider block mb-1">
              Estado Consolidado de Amortización
            </span>
            <div className="flex flex-wrap items-baseline gap-2 sm:gap-3">
              <span className="text-2xl sm:text-4xl font-black text-white">
                {formatCurrency(totalRemaining, currency, exchangeRate)}
              </span>
              <span className="text-xs text-rose-300 font-medium">saldo insoluto pendiente</span>
            </div>
          </div>

          <div className="text-left sm:text-right border-t border-white/10 pt-3 sm:border-t-0 sm:pt-0 sm:border-l sm:pl-6">
            <span className="text-xs text-zinc-400 block">Total Liquidado a la fecha</span>
            <span className="text-xl sm:text-2xl font-bold text-emerald-300">
              {formatCurrency(totalAmortized, currency, exchangeRate)}
            </span>
            <span className="text-[11px] text-zinc-400 block">
              de {formatCurrency(totalPrincipal, currency, exchangeRate)} iniciales
            </span>
          </div>
        </div>

        {/* Global Progress Bar */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-300 font-medium">Progreso Global de Liquidación</span>
            <span className="text-sm font-black text-purple-300">{overallProgress}% completado</span>
          </div>
          <div className="w-full h-3 bg-black/50 rounded-full overflow-hidden p-0.5 border border-white/10">
            <div
              className="h-full bg-gradient-to-r from-purple-500 via-violet-500 to-emerald-400 rounded-full transition-all duration-700 shadow-[0_0_15px_rgba(168,85,247,0.6)]"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Debts Grid */}
      {debts.length === 0 ? (
        <div className="liquid-glass p-8 text-center space-y-4 max-w-lg mx-auto">
          <HandCoins className="w-10 h-10 text-purple-400 mx-auto" />
          <div>
            <h3 className="text-base font-bold text-white">Sin deudas ni pasivos registrados</h3>
            <p className="text-xs text-zinc-400 mt-1">
              ¡Excelente salud financiera! Puedes registrar créditos automotrices, hipotecas o compras a MSI para monitorear tu amortización.
            </p>
          </div>
          <button
            onClick={() => setShowNewDebtModal(true)}
            className="liquid-button-primary px-5 py-2.5 text-xs font-semibold inline-flex items-center gap-2 cursor-pointer shadow-neon-purple"
          >
            <Plus className="w-4 h-4" />
            <span>+ Registrar Crédito o Deuda</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {debts.map((debt) => {
            const remaining = Math.max(0, debt.totalAmount - debt.paidAmount);
            const progress = Math.min(100, Math.round((debt.paidAmount / debt.totalAmount) * 100));
            const isLiquidated = remaining === 0;

            return (
              <div
                key={debt.id}
                className={`liquid-glass p-6 space-y-5 relative transition-all duration-300 ${
                  isLiquidated
                    ? 'border-emerald-500/40 bg-emerald-950/10'
                    : 'hover:border-purple-400/50'
                }`}
              >
                {/* Header Row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-white text-base tracking-tight">
                        {debt.title}
                      </h3>
                      {isLiquidated && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          Liquidada al 100%
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-400">
                      Acreedor: <span className="text-purple-300 font-medium">{debt.counterparty}</span> • {debt.category}
                    </p>
                  </div>

                  <button
                    onClick={() => setSelectedDebtForPayment(debt)}
                    disabled={isLiquidated}
                    className={`liquid-button-primary px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
                      isLiquidated ? 'opacity-40 cursor-not-allowed' : ''
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Ingresar Abono</span>
                  </button>
                </div>

                {/* Balances and Progress Bar */}
                <div className="space-y-2">
                  <div className="flex items-baseline justify-between text-xs">
                    <div>
                      <span className="text-zinc-400 block text-[11px]">Resta por pagar</span>
                      <span className="text-2xl font-black text-rose-300">
                        {formatCurrency(remaining, currency, exchangeRate)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-zinc-400 block text-[11px]">Pagado</span>
                      <span className="text-sm font-semibold text-emerald-300">
                        {formatCurrency(debt.paidAmount, currency, exchangeRate)} / {formatCurrency(debt.totalAmount, currency, exchangeRate)}
                      </span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-2.5 bg-black/40 rounded-full overflow-hidden p-0.5 border border-white/10">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-fuchsia-500 rounded-full transition-all duration-500 shadow-sm"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-zinc-400">
                    <span>{progress}% amortizado</span>
                    <span>Meta: Liquidación total</span>
                  </div>
                </div>

                {/* Debt Metadata Grid */}
                <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-white/[0.02] border border-white/5 text-xs">
                  <div className="min-w-0">
                    <span className="text-zinc-400 block text-[10px] truncate">Tasa Anual</span>
                    <span className="font-semibold text-purple-200 block truncate">
                      {debt.interestRate > 0 ? `${debt.interestRate}%` : '0% MSI'}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <span className="text-zinc-400 block text-[10px] truncate">Pago Mínimo</span>
                    <span className="font-semibold text-white block truncate">
                      {formatCurrency(debt.minimumMonthlyPayment, currency, exchangeRate)}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <span className="text-zinc-400 block text-[10px] truncate">Vencimiento</span>
                    <span className="font-semibold text-zinc-300 block truncate">{debt.dueDate}</span>
                  </div>
                </div>

                {/* Payments History Timeline */}
                <div className="space-y-2 pt-2 border-t border-white/10">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-zinc-300 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-purple-400" />
                      Historial de Abonos Registrados ({debt.payments?.length || 0})
                    </span>
                  </div>

                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {(!debt.payments || debt.payments.length === 0) ? (
                      <p className="text-[11px] text-zinc-500 italic py-1">
                        Aún no hay abonos registrados para esta deuda
                      </p>
                    ) : (
                      debt.payments.map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02] text-xs"
                        >
                          <div>
                            <span className="font-semibold text-emerald-300">
                              +{formatCurrency(p.amount, currency, exchangeRate)}
                            </span>
                            <span className="text-zinc-400 text-[11px] block truncate max-w-[200px]">
                              {p.note}
                            </span>
                          </div>
                          <span className="text-[10px] text-zinc-500 font-mono">{p.date}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Ingresar Abono a Deuda */}
      {selectedDebtForPayment && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedDebtForPayment(null);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md max-h-[90vh] overflow-y-auto liquid-glass p-5 sm:p-6 space-y-5 border-purple-500/40 shadow-2xl relative"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">
                  Ingresar Abono a Deuda
                </h3>
                <p className="text-xs text-purple-300 font-medium">
                  {selectedDebtForPayment.title}
                </p>
              </div>
              <button
                onClick={() => setSelectedDebtForPayment(null)}
                className="text-zinc-400 hover:text-white p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-3 rounded-xl bg-purple-900/20 border border-purple-500/20 text-xs text-purple-200">
              Saldo actual pendiente:{' '}
              <span className="font-bold text-white">
                {formatCurrency(
                  selectedDebtForPayment.totalAmount - selectedDebtForPayment.paidAmount,
                  currency,
                  exchangeRate
                )}
              </span>
            </div>

            <form onSubmit={handleAddPayment} className="space-y-4 text-xs">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-zinc-300 font-medium">
                    Monto del Abono
                  </label>
                  <div className="flex items-center gap-1 bg-white/5 p-0.5 rounded-lg border border-white/10">
                    <button
                      type="button"
                      onClick={() => setPaymentCurrency('USD')}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                        paymentCurrency === 'USD'
                          ? 'bg-purple-600 text-white shadow-sm'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      USD $
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentCurrency('COP')}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                        paymentCurrency === 'COP'
                          ? 'bg-purple-600 text-white shadow-sm'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      COP $
                    </button>
                  </div>
                </div>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder={
                    paymentCurrency === 'COP'
                      ? `ej. ${Math.round((selectedDebtForPayment.minimumMonthlyPayment || 100) * exchangeRate)}`
                      : `ej. ${selectedDebtForPayment.minimumMonthlyPayment || 100}`
                  }
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="liquid-input text-xs text-lg font-bold"
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-medium mb-1">
                  Cuenta de Origen de los Fondos
                </label>
                <select
                  value={paymentAccount}
                  onChange={(e) => setPaymentAccount(e.target.value)}
                  className="liquid-input text-xs bg-[#13111C]"
                >
                  {accounts
                    .filter((a) => a.type !== 'credit')
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} — Saldo: {formatCurrency(a.balance, currency, exchangeRate)}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-zinc-300 font-medium mb-1">
                  Nota / Concepto del Abono
                </label>
                <input
                  type="text"
                  placeholder="ej. Pago mensualidad ordinaria + abono a capital"
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  className="liquid-input text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setSelectedDebtForPayment(null)}
                  className="liquid-pill px-4 py-2 text-zinc-400 hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="liquid-button-primary px-5 py-2 font-semibold cursor-pointer"
                >
                  Confirmar Abono
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Registrar Nueva Deuda */}
      {showNewDebtModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowNewDebtModal(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md max-h-[90vh] overflow-y-auto liquid-glass p-5 sm:p-6 space-y-4 border-purple-500/40 shadow-2xl relative"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">
                Registrar Deuda o Préstamo
              </h3>
              <button
                onClick={() => setShowNewDebtModal(false)}
                className="text-zinc-400 hover:text-white p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateDebt} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-zinc-300 font-medium mb-1">
                  Concepto / Título de la Deuda
                </label>
                <input
                  type="text"
                  required
                  placeholder="ej. Crédito Automotriz, Préstamo Familiar"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="liquid-input text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-300 font-medium mb-1">
                    Acreedor / Institución
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ej. Santander, Amex"
                    value={newCounterparty}
                    onChange={(e) => setNewCounterparty(e.target.value)}
                    className="liquid-input text-xs"
                  />
                </div>
                <div>
                  <label className="block text-zinc-300 font-medium mb-1">
                    Categoría
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="liquid-input text-xs bg-[#13111C]"
                  >
                    <option value="Crédito Automotriz">Crédito Automotriz</option>
                    <option value="Tarjeta / MSI">Tarjeta / MSI</option>
                    <option value="Préstamo Personal">Préstamo Personal</option>
                    <option value="Crédito Educativo / Tech">Crédito Educativo / Tech</option>
                    <option value="Préstamo Otorgado">Préstamo Otorgado</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-zinc-300 font-medium">
                      Monto Original
                    </label>
                    <div className="flex items-center gap-1 bg-white/5 p-0.5 rounded-lg border border-white/10">
                      <button
                        type="button"
                        onClick={() => setNewDebtCurrency('USD')}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                          newDebtCurrency === 'USD'
                            ? 'bg-purple-600 text-white shadow-sm'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        USD $
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewDebtCurrency('COP')}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                          newDebtCurrency === 'COP'
                            ? 'bg-purple-600 text-white shadow-sm'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        COP $
                      </button>
                    </div>
                  </div>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder={newDebtCurrency === 'COP' ? 'ej. 20000000' : 'ej. 5000'}
                    value={newTotal}
                    onChange={(e) => setNewTotal(e.target.value)}
                    className="liquid-input text-xs"
                  />
                </div>
                <div>
                  <label className="block text-zinc-300 font-medium mb-1">
                    Ya Amortizado ({newDebtCurrency})
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0 si es nueva"
                    value={newPaid}
                    onChange={(e) => setNewPaid(e.target.value)}
                    className="liquid-input text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-zinc-300 font-medium mb-1">
                    Tasa Anual (%)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={newRate}
                    onChange={(e) => setNewRate(e.target.value)}
                    className="liquid-input text-xs"
                  />
                </div>
                <div>
                  <label className="block text-zinc-300 font-medium mb-1">
                    Pago Mínimo ({newDebtCurrency})
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder={newDebtCurrency === 'COP' ? 'ej. 500000' : 'ej. 150'}
                    value={newMinMonthly}
                    onChange={(e) => setNewMinMonthly(e.target.value)}
                    className="liquid-input text-xs"
                  />
                </div>
                <div>
                  <label className="block text-zinc-300 font-medium mb-1">
                    Fecha Límite
                  </label>
                  <input
                    type="date"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="liquid-input text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowNewDebtModal(false)}
                  className="liquid-pill px-4 py-2 text-zinc-400 hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="liquid-button-primary px-5 py-2 font-semibold cursor-pointer"
                >
                  Guardar Deuda
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
