import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  ArrowRightLeft,
  X,
  Calendar,
  Building2,
  Tag,
  DollarSign,
  FileText,
  AlertCircle,
  Trash2,
  ArrowRight,
} from 'lucide-react';
import {
  INCOME_CATEGORIES,
  EXPENSE_CATEGORIES,
  formatNativeCurrency,
  DEFAULT_USD_COP_RATE,
} from '../data/mockData.js';

export const TransactionModal = ({
  isOpen,
  onClose,
  accounts = [],
  currency = 'USD',
  exchangeRate = DEFAULT_USD_COP_RATE,
  onSaveTransaction,
  onSaveTransfer,
  onDeleteTransaction,
  editingTransaction = null,
  initialType = null,
}) => {
  const [type, setType] = useState('expense'); // 'income', 'expense', or 'transfer'
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [inputCurrency, setInputCurrency] = useState(currency || 'USD');
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [toAccountId, setToAccountId] = useState(accounts[1]?.id || accounts[0]?.id || '');
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [isAntExpense, setIsAntExpense] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (editingTransaction) {
        setType(editingTransaction.type || 'expense');
        setTitle(editingTransaction.title || '');
        const txCur = editingTransaction.currency || 'USD';
        setInputCurrency(txCur);
        const origAmt = Number.isFinite(Number(editingTransaction.originalAmount))
          ? Number(editingTransaction.originalAmount)
          : Number(editingTransaction.amount) || 0;
        setAmount(
          txCur === 'COP'
            ? String(Math.round(origAmt))
            : String(Math.round(origAmt * 100) / 100)
        );
        setAccountId(editingTransaction.accountId || accounts[0]?.id || '');
        setCategory(
          editingTransaction.category ||
            (editingTransaction.type === 'income' ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0])
        );
        setDate(editingTransaction.date || new Date().toISOString().split('T')[0]);
        setNotes(editingTransaction.notes || '');
        setIsAntExpense(Boolean(editingTransaction.isAntExpense));
      } else {
        const defaultType = initialType === 'transfer' ? 'transfer' : 'expense';
        setType(defaultType);
        setTitle('');
        setAmount('');
        const targetAcc = accounts.find((a) => a.id === accountId) || accounts[0];
        if (targetAcc) {
          setAccountId(targetAcc.id);
          setInputCurrency(targetAcc.currency || currency || 'USD');
          const otherAcc = accounts.find((a) => a.id !== targetAcc.id) || accounts[0];
          setToAccountId(otherAcc?.id || '');
        } else {
          setInputCurrency(currency || 'USD');
        }
        setCategory(EXPENSE_CATEGORIES[0]);
        setDate(new Date().toISOString().split('T')[0]);
        setNotes('');
        setIsAntExpense(false);
      }
      setError('');
    }
  }, [isOpen, editingTransaction, initialType, accounts, currency, exchangeRate]);

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
    if (newType === 'transfer') {
      setIsAntExpense(false);
      setCategory('Transferencias & Cambio');
      if (!toAccountId || toAccountId === accountId) {
        const otherAcc = accounts.find((a) => a.id !== accountId) || accounts[0];
        if (otherAcc) setToAccountId(otherAcc.id);
      }
    } else {
      setCategory(newType === 'income' ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0]);
      if (newType === 'income') {
        setIsAntExpense(false);
      }
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

    if (type === 'transfer') {
      if (!toAccountId || toAccountId === accountId) {
        setError('Debes seleccionar una cuenta de destino diferente a la de origen');
        return;
      }

      if (onSaveTransfer) {
        onSaveTransfer({
          fromAccountId: accountId,
          toAccountId,
          amount: numericAmount,
          currency: inputCurrency,
          date,
          notes: notes.trim(),
        });
      }

      setTitle('');
      setAmount('');
      setNotes('');
      onClose();
      return;
    }

    if (!title.trim()) {
      setError('Ingresa una descripción o concepto para el movimiento');
      return;
    }

    // Convert to USD base if entered in COP
    const amountInUSD =
      inputCurrency === 'COP'
        ? Math.round((numericAmount / exchangeRate) * 100) / 100
        : Math.round(numericAmount * 100) / 100;

    onSaveTransaction({
      ...(editingTransaction ? { id: editingTransaction.id } : {}),
      title: title.trim(),
      amount: amountInUSD,
      originalAmount: numericAmount,
      currency: inputCurrency,
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

  const handleDelete = () => {
    if (!editingTransaction || !onDeleteTransaction) return;
    if (window.confirm(`¿Eliminar el movimiento "${editingTransaction.title}"?`)) {
      onDeleteTransaction(editingTransaction.id);
      onClose();
    }
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
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-[#14121E]/95 backdrop-blur-2xl border border-purple-500/35 p-5 sm:p-7 shadow-[0_25px_60px_rgba(0,0,0,0.8),inset_0_1px_0_0_rgba(255,255,255,0.2)] relative"
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
                  : type === 'transfer'
                  ? 'bg-purple-500/20 border-purple-500/30 text-purple-300'
                  : 'bg-rose-500/20 border-rose-500/30 text-rose-300'
              }`}
            >
              {type === 'income' ? (
                <TrendingUp className="w-5 h-5" />
              ) : type === 'transfer' ? (
                <ArrowRightLeft className="w-5 h-5" />
              ) : (
                <TrendingDown className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                {editingTransaction
                  ? 'Editar Movimiento'
                  : type === 'transfer'
                  ? 'Transferencia entre Cuentas'
                  : 'Registrar Movimiento'}
              </h3>
              <p className="text-xs text-zinc-400">
                {editingTransaction
                  ? 'Actualiza importe, concepto, cuenta, fecha o categoría'
                  : type === 'transfer'
                  ? 'Mueve saldo entre tus cuentas con conversión automática'
                  : 'Entrada de capital o salida de recursos'}
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

        {accounts.length === 0 ? (
          <div className="py-8 text-center space-y-3 relative z-10">
            <Building2 className="w-8 h-8 text-purple-400 mx-auto" />
            <p className="text-sm font-bold text-white">No tienes cuentas disponibles</p>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto">
              Todo movimiento financiero debe vincularse obligatoriamente a una cuenta (Efectivo, Banco o Tarjeta). Por favor crea una cuenta primero.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="liquid-button-primary px-5 py-2 text-xs font-semibold cursor-pointer"
            >
              Cerrar y Crear Cuenta
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-5 space-y-4 text-xs relative z-10">
          {/* Segmented Type Toggle (Salida / Entrada / Transferencia) */}
          {!editingTransaction && (
            <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-black/50 border border-white/10">
              <button
                type="button"
                onClick={() => handleTypeChange('expense')}
                className={`py-2 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  type === 'expense'
                    ? 'bg-rose-500/30 text-rose-200 border border-rose-500/40 shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <TrendingDown className="w-3.5 h-3.5" />
                <span className="truncate">Gasto</span>
              </button>

              <button
                type="button"
                onClick={() => handleTypeChange('income')}
                className={`py-2 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  type === 'income'
                    ? 'bg-emerald-500/30 text-emerald-200 border border-emerald-500/40 shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span className="truncate">Ingreso</span>
              </button>

              <button
                type="button"
                onClick={() => handleTypeChange('transfer')}
                className={`py-2 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  type === 'transfer'
                    ? 'bg-purple-600/40 text-purple-200 border border-purple-400/50 shadow-liquid-purple'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <ArrowRightLeft className="w-3.5 h-3.5 text-purple-300" />
                <span className="truncate">Transferir</span>
              </button>
            </div>
          )}

          {/* Amount input prominent */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-zinc-300 font-semibold">
                {type === 'transfer' ? 'Monto a Transferir *' : 'Monto del Movimiento *'}
              </label>
              <div className="flex items-center gap-1 bg-white/5 p-0.5 rounded-lg border border-white/10">
                <button
                  type="button"
                  onClick={() => setInputCurrency('USD')}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                    inputCurrency === 'USD'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  USD $
                </button>
                <button
                  type="button"
                  onClick={() => setInputCurrency('COP')}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                    inputCurrency === 'COP'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  COP $
                </button>
              </div>
            </div>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-purple-400">
                {inputCurrency === 'COP' ? 'COP $' : '$'}
              </span>
              <input
                type="tel"
                inputMode="decimal"
                required
                autoFocus
                placeholder={inputCurrency === 'COP' ? '50000' : '25.00'}
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                className={`w-full bg-black/60 backdrop-blur-md border border-white/15 focus:border-purple-500/70 focus:ring-2 focus:ring-purple-500/20 rounded-2xl ${inputCurrency === 'COP' ? 'pl-16' : 'pl-9'} pr-4 py-3 text-xl font-black text-white placeholder-zinc-600 outline-none transition-all font-mono`}
              />
            </div>
          </div>

          {/* Account Selection */}
          {type === 'transfer' ? (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                <div>
                  <label className="block text-zinc-300 font-medium mb-1 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-purple-400" />
                    <span>Cuenta de Origen (Sale) *</span>
                  </label>
                  <select
                    value={accountId}
                    onChange={(e) => {
                      const newOriginId = e.target.value;
                      setAccountId(newOriginId);
                      const originAcc = accounts.find((a) => a.id === newOriginId);
                      if (originAcc?.currency) setInputCurrency(originAcc.currency);
                      if (toAccountId === newOriginId) {
                        const nextDest = accounts.find((a) => a.id !== newOriginId);
                        if (nextDest) setToAccountId(nextDest.id);
                      }
                    }}
                    required
                    className="liquid-input text-xs bg-[#161324]"
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({acc.currency || 'USD'} {Number(acc.balance || 0).toLocaleString('es-CO')})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-300 font-medium mb-1 flex items-center gap-1.5">
                    <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Cuenta Destino (Entra) *</span>
                  </label>
                  <select
                    value={toAccountId}
                    onChange={(e) => setToAccountId(e.target.value)}
                    required
                    className="liquid-input text-xs bg-[#161324]"
                  >
                    {accounts
                      .filter((a) => a.id !== accountId)
                      .map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name} ({acc.currency || 'USD'} {Number(acc.balance || 0).toLocaleString('es-CO')})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Conversion Preview if currencies differ */}
              {(() => {
                const fromAcc = accounts.find((a) => a.id === accountId);
                const toAcc = accounts.find((a) => a.id === toAccountId);
                const fromCur = (fromAcc?.currency || 'USD').toUpperCase();
                const toCur = (toAcc?.currency || 'USD').toUpperCase();
                const num = parseFloat(amount);

                if (fromCur !== toCur && Number.isFinite(num) && num > 0) {
                  const estToAmount =
                    inputCurrency === 'USD' && toCur === 'COP'
                      ? Math.round(num * exchangeRate)
                      : inputCurrency === 'COP' && toCur === 'USD'
                      ? Math.round((num / exchangeRate) * 100) / 100
                      : num;

                  return (
                    <div className="p-2.5 rounded-xl bg-purple-950/40 border border-purple-500/30 flex items-center justify-between text-[11px] text-purple-200">
                      <span>Conversión multi-divisa ({fromCur} ➔ {toCur}):</span>
                      <span className="font-bold font-mono text-emerald-300">
                        {toCur === 'COP'
                          ? `≈ $${estToAmount.toLocaleString('es-CO')} COP`
                          : `≈ $${estToAmount.toFixed(2)} USD`}
                      </span>
                    </div>
                  );
                }
                return null;
              })()}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-zinc-300 font-medium mb-1 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-purple-400" />
                  <span>Cuenta Vinculada *</span>
                </label>
                <select
                  value={accountId}
                  onChange={(e) => {
                    const newAccId = e.target.value;
                    setAccountId(newAccId);
                    if (!editingTransaction) {
                      const selAcc = accounts.find((a) => a.id === newAccId);
                      if (selAcc?.currency) {
                        setInputCurrency(selAcc.currency);
                      }
                    }
                  }}
                  required
                  className="liquid-input text-xs bg-[#161324]"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.currency === 'COP' ? 'COP' : 'USD'} {Number(acc.balance || 0).toLocaleString('es-CO')})
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
          )}

          {/* Concept / Title (Only required for income/expense) */}
          {type !== 'transfer' && (
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
          )}

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
              <div className="pt-1 sm:pt-5 flex items-center gap-2">
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
          <div className="flex flex-wrap items-center justify-between gap-2 pt-4 border-t border-white/10">
            {editingTransaction && onDeleteTransaction ? (
              <button
                type="button"
                onClick={handleDelete}
                className="liquid-pill px-3.5 py-2.5 text-rose-300 hover:text-white hover:bg-rose-500/20 border-rose-500/35 flex items-center gap-1.5 cursor-pointer font-semibold"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Eliminar</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2.5 ml-auto">
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
                {editingTransaction
                  ? 'Guardar Cambios'
                  : type === 'transfer'
                  ? 'Confirmar Transferencia'
                  : 'Guardar Movimiento'}
              </button>
            </div>
          </div>
        </form>
        )}
      </div>
    </div>
  );
};
