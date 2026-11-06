import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  X,
  Calendar,
  Building2,
  Tag,
  DollarSign,
  FileText,
  AlertCircle,
} from 'lucide-react';
import {
  INCOME_CATEGORIES,
  EXPENSE_CATEGORIES,
  formatCurrency,
} from '../data/mockData.js';

export const TransactionModal = ({
  isOpen,
  onClose,
  accounts = [],
  onSaveTransaction,
}) => {
  const [type, setType] = useState('expense'); // 'income' or 'expense'
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [isAntExpense, setIsAntExpense] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      if ((!accountId || !accounts.some((a) => a.id === accountId)) && accounts.length > 0) {
        setAccountId(accounts[0].id);
      }
      setError('');
    }
  }, [isOpen, accounts]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const currentCategories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const handleTypeChange = (newType) => {
    setType(newType);
    setCategory(newType === 'income' ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0]);
    if (newType === 'income') {
      setIsAntExpense(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setError('Por favor ingresa un monto válido mayor a 0');
      return;
    }

    if (!accountId) {
      setError('Es obligatorio vincular el movimiento a una de las cuentas');
      return;
    }

    if (!title.trim()) {
      setError('Ingresa una descripción o concepto para el movimiento');
      return;
    }

    onSaveTransaction({
      title: title.trim(),
      amount: numericAmount,
      type,
      category,
      accountId,
      date,
      notes: notes.trim(),
      isAntExpense: type === 'expense' ? isAntExpense : false,
    });

    setTitle('');
    setAmount('');
    setNotes('');
    setIsAntExpense(false);
    onClose();
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-3xl bg-[#14121E]/95 backdrop-blur-2xl border border-purple-500/35 p-6 sm:p-7 shadow-[0_25px_60px_rgba(0,0,0,0.8),inset_0_1px_0_0_rgba(255,255,255,0.2)] relative overflow-hidden"
      >
        {/* Glow orb */}
        <div className="pointer-events-none absolute -top-20 -right-20 w-52 h-52 rounded-full bg-purple-600/25 blur-3xl" />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 relative z-10">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center border ${
                type === 'income'
                  ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/20 border-rose-500/30 text-rose-300'
              }`}
            >
              {type === 'income' ? (
                <TrendingUp className="w-5 h-5" />
              ) : (
                <TrendingDown className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Registrar Movimiento
              </h3>
              <p className="text-xs text-zinc-400">
                Entrada de capital o salida de recursos
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center gap-2 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4 text-xs relative z-10">
          {/* Segmented Type Toggle (Entrada / Salida) */}
          <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-black/50 border border-white/10">
            <button
              type="button"
              onClick={() => handleTypeChange('expense')}
              className={`py-2 rounded-xl font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                type === 'expense'
                  ? 'bg-rose-500/30 text-rose-200 border border-rose-500/40 shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <TrendingDown className="w-4 h-4" />
              <span>Salida / Gasto</span>
            </button>

            <button
              type="button"
              onClick={() => handleTypeChange('income')}
              className={`py-2 rounded-xl font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                type === 'income'
                  ? 'bg-emerald-500/30 text-emerald-200 border border-emerald-500/40 shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              <span>Entrada / Ingreso</span>
            </button>
          </div>

          {/* Amount input prominent */}
          <div>
            <label className="block text-zinc-300 font-semibold mb-1.5">
              Monto del Movimiento ($ MXN) *
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-purple-400">
                $
              </span>
              <input
                type="number"
                step="any"
                required
                autoFocus
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-black/60 backdrop-blur-md border border-white/15 focus:border-purple-500/70 focus:ring-2 focus:ring-purple-500/20 rounded-2xl pl-9 pr-4 py-3 text-xl font-black text-white placeholder-zinc-600 outline-none transition-all"
              />
            </div>
          </div>

          {/* Concept / Title */}
          <div>
            <label className="block text-zinc-300 font-medium mb-1">
              Concepto / Descripción *
            </label>
            <input
              type="text"
              required
              placeholder="ej. Depósito consultoría, Supermercado, Starbucks"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="liquid-input text-xs"
            />
          </div>

          {/* Account Selection (OBLIGATORY) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-zinc-300 font-medium mb-1 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-purple-400" />
                <span>Cuenta Vinculada *</span>
              </label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                required
                className="liquid-input text-xs bg-[#161324]"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({formatCurrency(acc.balance)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-zinc-300 font-medium mb-1 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-purple-400" />
                <span>Categoría Específica *</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
                className="liquid-input text-xs bg-[#161324]"
              >
                {currentCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Date & Ant Expense Checkbox */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
            <div>
              <label className="block text-zinc-300 font-medium mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-purple-400" />
                <span>Fecha *</span>
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="liquid-input text-xs"
              />
            </div>

            {type === 'expense' && (
              <div className="pt-5 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="antCheck"
                  checked={isAntExpense}
                  onChange={(e) => setIsAntExpense(e.target.checked)}
                  className="rounded border-purple-500 text-purple-600 focus:ring-purple-500 cursor-pointer w-4 h-4"
                />
                <label htmlFor="antCheck" className="text-zinc-200 cursor-pointer font-medium">
                  Marcar como Gasto Hormiga 🐜
                </label>
              </div>
            )}
          </div>

          {/* Optional notes */}
          <div>
            <label className="block text-zinc-400 font-medium mb-1">
              Notas adicionales (opcional)
            </label>
            <input
              type="text"
              placeholder="Detalles sobre el ticket, referencia o comprobante"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="liquid-input text-xs"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="liquid-pill px-4 py-2.5 text-zinc-400 hover:text-white cursor-pointer font-semibold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="liquid-button-primary px-6 py-2.5 font-bold cursor-pointer"
            >
              Guardar Movimiento
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
