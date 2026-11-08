import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Lock,
  Unlock,
  ShieldCheck,
  User,
  ArrowRight,
  Sparkles,
  KeyRound,
  CheckCircle,
  AlertCircle,
  Delete,
  Settings,
  RefreshCw,
} from 'lucide-react';
import { USERS, getUserPin, setUserPin } from '../data/users.js';
import { api } from '../services/api.js';

export const LoginModal = ({ isOpen, onLoginSuccess, currentUserId }) => {
  const [selectedUser, setSelectedUser] = useState(
    () => USERS.find((u) => u.id === currentUserId) || USERS[0]
  );
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const inputRef = useRef(null);
  const pinRef = useRef('');

  // Keep pinRef synchronously in sync with pin state
  useEffect(() => {
    pinRef.current = pin;
  }, [pin]);

  // Lock background scroll when login modal is open
  useEffect(() => {
    if (isOpen) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [isOpen]);

  // In-modal PIN change mode state
  const [isChangePinMode, setIsChangePinMode] = useState(false);
  const [changeStep, setChangeStep] = useState('current'); // 'current', 'new', 'confirm'
  const [currentPinInput, setCurrentPinInput] = useState('');
  const [newPinInput, setNewPinInput] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');
  const [changeSuccessMessage, setChangeSuccessMessage] = useState('');

  // Reset and auto-focus whenever modal opens or user switches
  useEffect(() => {
    if (isOpen) {
      setPin('');
      pinRef.current = '';
      setError('');
      setIsSuccess(false);
      setIsChangePinMode(false);
      setChangeStep('current');
      setCurrentPinInput('');
      setNewPinInput('');
      setConfirmPinInput('');
      setChangeSuccessMessage('');
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen, selectedUser]);

  // Immediate fast verification
  const verifyPin = useCallback((pinToTest) => {
    const activePin = getUserPin(selectedUser.id);
    if (pinToTest === activePin) {
      setIsSuccess(true);
      setError('');
      // Snappy unlocking transition: 120ms
      setTimeout(() => {
        onLoginSuccess(selectedUser);
      }, 120);
    } else {
      setIsSuccess(false);
      setError('PIN incorrecto. Intenta de nuevo.');
      // Rapid reset so user can immediately retype without feeling stuck
      setTimeout(() => {
        setPin('');
        pinRef.current = '';
        inputRef.current?.focus();
      }, 320);
    }
  }, [selectedUser, onLoginSuccess]);

  // Fast digit press with functional state update to prevent race conditions
  const handleDigitPress = useCallback((digit) => {
    setPin((prev) => {
      if (prev.length >= 4) return prev;
      const next = (prev + digit).slice(0, 4);
      pinRef.current = next;
      if (next.length === 4) {
        verifyPin(next);
      }
      return next;
    });
    setError('');
  }, [verifyPin]);

  const handleBackspace = useCallback(() => {
    setPin((prev) => {
      const next = prev.slice(0, -1);
      pinRef.current = next;
      return next;
    });
    setError('');
  }, []);

  const handleClear = useCallback(() => {
    setPin('');
    pinRef.current = '';
    setError('');
    inputRef.current?.focus();
  }, []);

  const handlePaste = useCallback((e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    if (!pasted) return;
    setPin(pasted);
    pinRef.current = pasted;
    setError('');
    if (pasted.length === 4) {
      verifyPin(pasted);
    }
  }, [verifyPin]);

  // Support direct physical keyboard & numpad input without interfering with native input
  useEffect(() => {
    if (!isOpen || isChangePinMode) return;

    const handleKeyDown = (e) => {
      // If the input itself is focused, let native input onChange handle it to avoid duplicate keystrokes
      if (e.target === inputRef.current) {
        if (e.key === 'Enter') {
          e.preventDefault();
          if (pinRef.current.length === 4) {
            verifyPin(pinRef.current);
          }
        }
        return;
      }

      // Check standard number keys or numpad keys
      let digit = null;
      if (e.key >= '0' && e.key <= '9') {
        digit = e.key;
      } else if (e.code && e.code.startsWith('Numpad') && e.code.length === 7) {
        const num = e.code.slice(6);
        if (num >= '0' && num <= '9') digit = num;
      }

      if (digit !== null) {
        e.preventDefault();
        handleDigitPress(digit);
        inputRef.current?.focus();
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
        inputRef.current?.focus();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (pinRef.current.length === 4) {
          verifyPin(pinRef.current);
        }
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        setSelectedUser((prev) => (prev.id === 'munboi' ? USERS[1] : USERS[0]));
        setPin('');
        pinRef.current = '';
        setError('');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isChangePinMode, handleDigitPress, handleBackspace, verifyPin]);

  if (!isOpen) return null;

  // PIN Change handlers
  const handleProcessPinChange = (e) => {
    e.preventDefault();
    setError('');

    const currentActualPin = getUserPin(selectedUser.id);

    if (currentPinInput !== currentActualPin) {
      setError('El PIN actual no coincide.');
      return;
    }

    if (!/^\d{4}$/.test(newPinInput)) {
      setError('El nuevo PIN debe ser exactamente de 4 dígitos numéricos.');
      return;
    }

    if (newPinInput !== confirmPinInput) {
      setError('La confirmación del nuevo PIN no coincide.');
      return;
    }

    // Save customized PIN in runtime cache + SQLite
    setUserPin(selectedUser.id, newPinInput);
    api
      .updateUser(selectedUser.id, { pin: newPinInput })
      .catch((err) => console.error('Error SQLite updateUser pin:', err));
    setChangeSuccessMessage(`¡PIN de ${selectedUser.username} actualizado correctamente!`);

    setTimeout(() => {
      setIsChangePinMode(false);
      setChangeStep('current');
      setCurrentPinInput('');
      setNewPinInput('');
      setConfirmPinInput('');
      setChangeSuccessMessage('');
      setPin('');
      pinRef.current = '';
      setError('');
    }, 1200);
  };

  return typeof document !== 'undefined' && createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-xl overflow-y-auto animate-fadeIn"
    >
      {/* Background ambient lighting */}
      <div className="pointer-events-none absolute w-96 h-96 rounded-full bg-purple-600/20 blur-[130px] -top-20 -left-20" />
      <div className="pointer-events-none absolute w-96 h-96 rounded-full bg-fuchsia-600/15 blur-[140px] -bottom-20 -right-20" />

      <div className="w-full max-w-md max-h-[94dvh] sm:max-h-[90dvh] overflow-y-auto overscroll-contain rounded-t-3xl sm:rounded-3xl bg-[#14121E] sm:bg-[#14121E]/95 backdrop-blur-2xl border-t sm:border border-purple-500/35 p-4 sm:p-8 shadow-[0_30px_70px_rgba(0,0,0,0.85),inset_0_1px_0_0_rgba(255,255,255,0.2)] relative text-center space-y-4 sm:space-y-6 pt-[max(1.25rem,calc(env(safe-area-inset-top,0px)+0.75rem))] pb-[max(1.25rem,env(safe-area-inset-bottom,0px))] custom-scrollbar">
        {/* Glow */}
        <div className="pointer-events-none absolute -top-16 -right-16 w-44 h-44 rounded-full bg-violet-600/20 blur-3xl" />

        {/* Brand Lock Header */}
        <div className="space-y-2 relative z-10">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 via-fuchsia-600 to-indigo-600 flex items-center justify-center text-white shadow-neon-purple border border-white/30">
            {isSuccess ? (
              <Unlock className="w-6 h-6 text-emerald-300 animate-bounce" />
            ) : (
              <Lock className="w-6 h-6" />
            )}
          </div>
          <h2 className="text-xl font-black text-white tracking-tight">
            Wallet Flow Security
          </h2>
          <p className="text-xs text-zinc-400">
            {isChangePinMode
              ? `Cambiar PIN de 4 dígitos para ${selectedUser.username}`
              : 'Selecciona tu usuario e ingresa tu PIN de 4 dígitos'}
          </p>
        </div>

        {/* User Selection Cards (shows only user identity) */}
        {!isChangePinMode && (
          <div className="grid grid-cols-2 gap-3 relative z-10">
            {USERS.map((u) => {
              const isSelected = selectedUser.id === u.id;
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => {
                    setSelectedUser(u);
                    setPin('');
                    pinRef.current = '';
                    setError('');
                    inputRef.current?.focus();
                  }}
                  className={`p-3.5 rounded-2xl border transition-all duration-300 flex flex-col items-center gap-2 cursor-pointer touch-manipulation ${
                    isSelected
                      ? 'bg-gradient-to-b from-purple-600/30 via-violet-600/20 to-transparent border-purple-400 text-white shadow-liquid-purple scale-[1.02]'
                      : 'bg-white/[0.03] border-white/10 text-zinc-400 hover:text-white hover:bg-white/[0.06]'
                  }`}
                >
                  <div
                    className={`w-11 h-11 rounded-2xl bg-gradient-to-tr ${u.avatarGradient} flex items-center justify-center text-white font-black text-base shadow-md border border-white/20`}
                  >
                    {u.avatarInitials}
                  </div>
                  <div>
                    <span className="font-bold text-xs text-white block">
                      {u.username}
                    </span>
                    <span className="text-[10px] text-zinc-400">
                      {u.roleLabel}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Mode 1: In-Modal PIN Change Flow */}
        {isChangePinMode ? (
          <form
            onSubmit={handleProcessPinChange}
            className="space-y-3.5 text-left relative z-10 pt-2"
          >
            {error && (
              <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {changeSuccessMessage && (
              <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>{changeSuccessMessage}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                PIN Actual de {selectedUser.username}
              </label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                required
                placeholder="4 dígitos"
                value={currentPinInput}
                onChange={(e) => setCurrentPinInput(e.target.value.replace(/\D/g, ''))}
                className="liquid-input text-base sm:text-sm text-center font-mono tracking-widest min-h-[46px]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Nuevo PIN de 4 Dígitos
              </label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                required
                placeholder="Nuevo PIN"
                value={newPinInput}
                onChange={(e) => setNewPinInput(e.target.value.replace(/\D/g, ''))}
                className="liquid-input text-base sm:text-sm text-center font-mono tracking-widest min-h-[46px]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Confirmar Nuevo PIN
              </label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                required
                placeholder="Confirmar PIN"
                value={confirmPinInput}
                onChange={(e) => setConfirmPinInput(e.target.value.replace(/\D/g, ''))}
                className="liquid-input text-base sm:text-sm text-center font-mono tracking-widest min-h-[46px]"
              />
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsChangePinMode(false);
                  setError('');
                }}
                className="liquid-pill px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white cursor-pointer min-h-[44px] flex items-center justify-center"
              >
                Volver al Login
              </button>

              <button
                type="submit"
                className="liquid-button-primary px-5 py-2 text-xs font-bold cursor-pointer min-h-[44px] flex items-center justify-center shadow-neon-purple active:scale-95"
              >
                Guardar Nuevo PIN
              </button>
            </div>
          </form>
        ) : (
          <>
            {/* Transparent native input directly over the boxes for instant mobile numeric keyboard & desktop typing */}
            <div
              onClick={() => inputRef.current?.focus()}
              className="relative py-2 cursor-pointer touch-manipulation select-none"
              title="Toca para escribir tu PIN con el teclado numérico"
            >
              <input
                ref={inputRef}
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="one-time-code"
                maxLength={4}
                value={pin}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                  setPin(val);
                  pinRef.current = val;
                  setError('');
                  if (val.length === 4) {
                    verifyPin(val);
                  }
                }}
                onPaste={handlePaste}
                autoFocus
                className="absolute inset-0 w-full h-full opacity-0 z-20 cursor-pointer caret-transparent text-transparent"
                aria-label="Ingresa tu PIN de 4 dígitos"
              />

              {/* Fast Interactive 4-Digit Glass Boxes */}
              <div className="flex items-center justify-center gap-2.5 sm:gap-3.5 relative z-10 pointer-events-none select-none">
                {[0, 1, 2, 3].map((idx) => {
                  const isFilled = pin.length > idx;
                  const isActive = pin.length === idx;
                  return (
                    <div
                      key={idx}
                      className={`w-12 h-14 sm:w-14 sm:h-16 rounded-2xl flex items-center justify-center transition-all duration-100 border font-mono text-xl sm:text-2xl font-black ${
                        isSuccess
                          ? 'bg-emerald-500/25 border-emerald-400 text-emerald-300 shadow-[0_0_20px_rgba(52,211,153,0.5)] scale-105'
                          : error
                          ? 'bg-rose-500/20 border-rose-500 text-rose-300 animate-shake'
                          : isFilled
                          ? 'bg-gradient-to-tr from-purple-600/40 via-violet-600/30 to-fuchsia-600/30 border-purple-400/80 text-white shadow-liquid-purple scale-105 ring-1 ring-purple-400/50'
                          : isActive
                          ? 'bg-white/[0.08] border-purple-400 text-purple-300 ring-2 ring-purple-400/50 shadow-[0_0_15px_rgba(168,85,247,0.4)]'
                          : 'bg-white/[0.03] border-white/15 text-zinc-600'
                      }`}
                    >
                      {isFilled ? '●' : isActive ? <span className="w-1.5 h-5 bg-purple-400 animate-pulse rounded-full" /> : '·'}
                    </div>
                  );
                })}
              </div>

              {error ? (
                <p className="text-xs text-rose-400 font-medium flex items-center justify-center gap-1.5 pt-2 animate-shake">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{error}</span>
                </p>
              ) : (
                <p className="text-[11px] text-zinc-400 flex items-center justify-center gap-1 pt-2">
                  <span>Escribe con teclado físico o pantalla</span>
                  <span className="text-purple-300 font-mono font-bold">({selectedUser.username})</span>
                </p>
              )}
            </div>

            {/* Liquid Glass Numeric Keypad (iOS / Fintech Style) */}
            <div className="grid grid-cols-3 gap-2 sm:gap-2.5 max-w-xs mx-auto relative z-10 touch-manipulation select-none">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => handleDigitPress(digit.toString())}
                  className="h-12 sm:h-14 rounded-2xl bg-white/[0.05] hover:bg-white/[0.12] active:bg-purple-600/40 border border-white/10 hover:border-purple-500/40 text-lg sm:text-xl font-bold text-white transition-all duration-100 flex items-center justify-center cursor-pointer shadow-sm active:scale-95 touch-manipulation"
                >
                  {digit}
                </button>
              ))}

              {/* Bottom row: Clear, 0, Backspace */}
              <button
                type="button"
                onClick={handleClear}
                className="h-12 sm:h-14 rounded-2xl bg-white/[0.02] hover:bg-white/[0.08] text-xs font-semibold text-zinc-400 hover:text-white transition-all flex items-center justify-center cursor-pointer active:scale-95 touch-manipulation"
              >
                Limpiar
              </button>

              <button
                type="button"
                onClick={() => handleDigitPress('0')}
                className="h-12 sm:h-14 rounded-2xl bg-white/[0.05] hover:bg-white/[0.12] active:bg-purple-600/40 border border-white/10 hover:border-purple-500/40 text-lg sm:text-xl font-bold text-white transition-all duration-100 flex items-center justify-center cursor-pointer shadow-sm active:scale-95 touch-manipulation"
              >
                0
              </button>

              <button
                type="button"
                onClick={handleBackspace}
                aria-label="Borrar dígito"
                className="h-12 sm:h-14 rounded-2xl bg-white/[0.02] hover:bg-white/[0.08] active:bg-rose-500/20 text-zinc-400 hover:text-white transition-all flex items-center justify-center cursor-pointer active:scale-95 touch-manipulation"
              >
                <Delete className="w-5 h-5" />
              </button>
            </div>

            {/* Action footer: Option to change PIN */}
            <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs text-zinc-400 relative z-10">
              <span className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Dispositivo recordado</span>
              </span>

              <button
                type="button"
                onClick={() => {
                  setIsChangePinMode(true);
                  setError('');
                }}
                className="text-[11px] text-purple-300 hover:text-purple-200 underline underline-offset-4 cursor-pointer transition-colors"
              >
                ¿Cambiar mi PIN?
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
};
