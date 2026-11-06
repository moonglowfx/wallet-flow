import React, { useState, useEffect } from 'react';
import {
  Wallet,
  X,
  CreditCard,
  Banknote,
  Building2,
  DollarSign,
  AlertCircle,
} from 'lucide-react';
import { DEFAULT_USD_COP_RATE } from '../data/mockData.js';

export const AccountModal = ({
  isOpen,
  onClose,
  currency = 'USD',
  exchangeRate = DEFAULT_USD_COP_RATE,
  onSaveAccount,
}) => {
  const [name, setName] = useState('');
  const [institution, setInstitution] = useState('');
  const [type, setType] = useState('bank'); // 'cash', 'bank', 'credit'
  const [balance, setBalance] = useState('');
  const [accountCurrency, setAccountCurrency] = useState(currency || 'USD');
  const [creditLimit, setCreditLimit] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setAccountCurrency(currency || 'USD');
    }
  }, [isOpen, currency]);

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

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Por favor indica un nombre para la cuenta');
      return;
    }

    let rawBalance = parseFloat(balance) || 0;
    let rawCreditLimit = parseFloat(creditLimit) || 15000;

    if (accountCurrency === 'COP') {
      rawBalance = rawBalance / exchangeRate;
      rawCreditLimit = rawCreditLimit / exchangeRate;
    }

    // For credit accounts, user usually inputs positive debt, but system tracks as negative balance
    const finalBalance = type === 'credit' ? -Math.abs(rawBalance) : Math.abs(rawBalance);

    const newAccount = {
      id: `acc-${type}-${Date.now()}`,
      name: name.trim(),
      institution: institution.trim() || (type === 'cash' ? 'Billetera Líquida' : 'Entidad Financiera'),
      type,
      balance: Math.round(finalBalance * 100) / 100,
      creditLimit: type === 'credit' ? Math.round(rawCreditLimit * 100) / 100 : undefined,
      accountNumber: accountNumber.trim() || (type === 'cash' ? 'CASH' : `•••• ${Math.floor(1000 + Math.random() * 9000)}`),
      accentGradient:
        type === 'credit'
          ? 'from-rose-700/40 via-purple-900/40 to-black/75'
          : type === 'cash'
          ? 'from-emerald-600/35 via-purple-900/25 to-zinc-950/70'
          : 'from-purple-600/40 via-indigo-700/30 to-slate-900/60',
    };

    onSaveAccount(newAccount);
    setName('');
    setInstitution('');
    setBalance('');
    setCreditLimit('');
    setAccountNumber('');
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
        {/* Glow */}
        <div className="pointer-events-none absolute -top-20 -left-20 w-52 h-52 rounded-full bg-violet-600/25 blur-3xl" />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Crear cuenta nueva
              </h3>
              <p className="text-xs text-zinc-400">
                Efectivo, Cuentas Bancarias o Tarjetas de Crédito
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

        <form onSubmit={handleSubmit} className="mt-5 space-y-4 text-xs relative z-10">
          {/* Account Type Selector (3 options) */}
          <div>
            <label className="block text-zinc-300 font-semibold mb-2">
              Tipo de Cuenta Obligatorio *
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setType('bank')}
                className={`p-3 rounded-2xl flex flex-col items-center gap-1.5 border transition-all cursor-pointer ${
                  type === 'bank'
                    ? 'bg-purple-600/30 border-purple-400 text-white shadow-liquid-purple'
                    : 'bg-white/[0.03] border-white/10 text-zinc-400 hover:text-white'
                }`}
              >
                <Building2 className="w-5 h-5 text-purple-300" />
                <span className="font-semibold text-[11px] text-center">Cuenta Bancaria</span>
              </button>

              <button
                type="button"
                onClick={() => setType('cash')}
                className={`p-3 rounded-2xl flex flex-col items-center gap-1.5 border transition-all cursor-pointer ${
                  type === 'cash'
                    ? 'bg-emerald-600/30 border-emerald-400 text-white shadow-sm'
                    : 'bg-white/[0.03] border-white/10 text-zinc-400 hover:text-white'
                }`}
              >
                <Banknote className="w-5 h-5 text-emerald-300" />
                <span className="font-semibold text-[11px] text-center">Efectivo</span>
              </button>

              <button
                type="button"
                onClick={() => setType('credit')}
                className={`p-3 rounded-2xl flex flex-col items-center gap-1.5 border transition-all cursor-pointer ${
                  type === 'credit'
                    ? 'bg-rose-600/30 border-rose-400 text-white shadow-sm'
                    : 'bg-white/[0.03] border-white/10 text-zinc-400 hover:text-white'
                }`}
              >
                <CreditCard className="w-5 h-5 text-rose-300" />
                <span className="font-semibold text-[11px] text-center">Tarjeta Crédito</span>
              </button>
            </div>
          </div>

          {/* Name & Institution */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-zinc-300 font-medium mb-1">
                Nombre de la Cuenta *
              </label>
              <input
                type="text"
                required
                placeholder={
                  type === 'credit'
                    ? 'ej. Platinum Credit Card'
                    : type === 'cash'
                    ? 'ej. Billetera Personal'
                    : 'ej. Nómina BBVA / Ahorro'
                }
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="liquid-input text-xs"
              />
            </div>

            <div>
              <label className="block text-zinc-300 font-medium mb-1">
                Entidad o Banco
              </label>
              <input
                type="text"
                placeholder="ej. BBVA, Nu, Amex, Caja Fuerte"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                className="liquid-input text-xs"
              />
            </div>
          </div>

          {/* Balance & Limits */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-zinc-300 font-medium">
                  {type === 'credit' ? 'Saldo Deudor Actual' : 'Saldo Inicial *'}
                </label>
                <div className="flex items-center gap-1 bg-white/5 p-0.5 rounded-lg border border-white/10">
                  <button
                    type="button"
                    onClick={() => setAccountCurrency('USD')}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                      accountCurrency === 'USD'
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    USD $
                  </button>
                  <button
                    type="button"
                    onClick={() => setAccountCurrency('COP')}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                      accountCurrency === 'COP'
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
                placeholder={accountCurrency === 'COP' ? 'ej. 5,000,000' : '0.00'}
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
                className="liquid-input text-xs font-bold"
              />
              {type === 'credit' && (
                <p className="text-[10px] text-zinc-400 mt-1">
                  Ingresa lo que adeudas actualmente ({accountCurrency})
                </p>
              )}
            </div>

            {type === 'credit' ? (
              <div>
                <label className="block text-zinc-300 font-medium mb-1">
                  Límite de Crédito ({accountCurrency})
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder={accountCurrency === 'COP' ? 'ej. 15,000,000' : 'ej. 3,500'}
                  value={creditLimit}
                  onChange={(e) => setCreditLimit(e.target.value)}
                  className="liquid-input text-xs font-bold"
                />
              </div>
            ) : type === 'cash' ? (
              <div>
                <label className="block text-zinc-300 font-medium mb-1">
                  Identificador / Etiqueta
                </label>
                <input
                  type="text"
                  placeholder="ej. Bóveda Casa / Bolsillo"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className="liquid-input text-xs"
                />
              </div>
            ) : (
              <div>
                <label className="block text-zinc-300 font-medium mb-1">
                  Últimos 4 dígitos o referencia
                </label>
                <input
                  type="text"
                  maxLength={10}
                  placeholder="ej. •••• 4821"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className="liquid-input text-xs font-mono"
                />
              </div>
            )}
          </div>

          {/* Action buttons */}
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
              Guardar Cuenta
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
