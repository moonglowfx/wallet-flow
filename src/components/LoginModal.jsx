import React, { useState, useEffect, useRef } from 'react';
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

  // In-modal PIN change mode state
  const [isChangePinMode, setIsChangePinMode] = useState(false);
  const [changeStep, setChangeStep] = useState('current'); // 'current', 'new', 'confirm'
  const [currentPinInput, setCurrentPinInput] = useState('');
  const [newPinInput, setNewPinInput] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');
  const [changeSuccessMessage, setChangeSuccessMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      setPin('');
      setError('');
      setIsSuccess(false);
      setIsChangePinMode(false);
      setChangeStep('current');
      setCurrentPinInput('');
      setNewPinInput('');
      setConfirmPinInput('');
      setChangeSuccessMessage('');
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [isOpen, selectedUser]);

  const verifyPin = (pinToTest) => {
    const activePin = getUserPin(selectedUser.id);
    if (pinToTest === activePin) {
      setIsSuccess(true);
      setError('');
      setTimeout(() => {
        onLoginSuccess(selectedUser);
      }, 220);
    } else {
      setError('PIN incorrecto. Intenta de nuevo.');
      setTimeout(() => {
        setPin('');
        inputRef.current?.focus();
      }, 420);
    }
  };

  const handleDigitPress = (digit) => {
    if (pin.length >= 4) return;
    const newPin = pin + digit;
    setPin(newPin);
    setError('');

    if (newPin.length === 4) {
      verifyPin(newPin);
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
    setError('');
  };

  const handleClear = () => {
    setPin('');
    setError('');
    inputRef.current?.focus();
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    if (!pasted) return;
    setPin(pasted);
    setError('');
    if (pasted.length === 4) {
      verifyPin(pasted);
    }
  };

  // Support direct physical keyboard input & fast arrow navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (isChangePinMode) return;
      if (e.key >= '0' && e.key <= '9') {
        if (pin.length < 4) {
          handleDigitPress(e.key);
        }
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Enter' && pin.length === 4) {
        verifyPin(pin);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        setSelectedUser((prev) => (prev.id === 'munboi' ? USERS[1] : USERS[0]));
        setPin('');
        setError('');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, pin, selectedUser, isChangePinMode]);

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
      setError('');
    }, 1400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-xl overflow-y-auto animate-fadeIn">
      {/* Background ambient lighting */}
      <div className="pointer-events-none absolute w-96 h-96 rounded-full bg-purple-600/20 blur-[130px] -top-20 -left-20" />
      <div className="pointer-events-none absolute w-96 h-96 rounded-full bg-fuchsia-600/15 blur-[140px] -bottom-20 -right-20" />

      <div className="w-full max-w-md max-h-[100dvh] sm:max-h-[92dvh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-[#14121E] sm:bg-[#14121E]/95 backdrop-blur-2xl border-t sm:border border-purple-500/35 p-4 sm:p-8 shadow-[0_30px_70px_rgba(0,0,0,0.85),inset_0_1px_0_0_rgba(255,255,255,0.2)] relative text-center space-y-4 sm:space-y-6 pb-[max(1.2rem,env(safe-area-inset-bottom))] custom-scrollbar">
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
                    setError('');
                  }}
                  className={`p-3.5 rounded-2xl border transition-all duration-300 flex flex-col items-center gap-2 cursor-pointer ${
                    isSelected
                      ? 'bg-gradient-to-b from-purple-600/30 via-violet-600/20 to-transparent border-purple-400 text-white shadow-liquid-purple scale-[1.02]'
                      : 'bg-white/[0.03] border-white/10 text-zinc-400 hover:text-white hover:bg-white/[0.06]'
                  }`}
                >
                  <div
                    className={`w-11 h-11 rounded-2xl bg-gradient-to-tr ${u.avatarGradient} flex items-center justify-center text-white font-black text-base shadow-md border border-white/20`}
                  >
                    {u.username[0]}
                  </div>
                  <div className="text-center min-w-0 w-full">
                    <p className="font-bold text-xs truncate text-white">
                      {u.username}
                    </p>
                    <span className="text-[10px] text-zinc-400 block truncate">
                      {u.role}
                    </span>
                  </div>
                  {isSelected && (
                    <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-400 shadow-[0_0_8px_#e879f9]" />
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Change PIN Mode Sub-view */}
        {isChangePinMode ? (
          <form onSubmit={handleProcessPinChange} className="space-y-4 text-left relative z-10">
            {changeSuccessMessage && (
              <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>{changeSuccessMessage}</span>
              </div>
            )}

            {error && (
              <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
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
                className="liquid-input text-sm text-center font-mono tracking-widest"
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
                className="liquid-input text-sm text-center font-mono tracking-widest"
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
                className="liquid-input text-sm text-center font-mono tracking-widest"
              />
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsChangePinMode(false);
                  setError('');
                }}
                className="liquid-pill px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white cursor-pointer"
              >
                Volver al Login
              </button>

              <button
                type="submit"
                className="liquid-button-primary px-5 py-2 text-xs font-bold cursor-pointer"
              >
                Guardar Nuevo PIN
              </button>
            </div>
          </form>
        ) : (
          <>
            {/* Hidden Input for Instant Keyboard & Paste Capture */}
            <input
              ref={inputRef}
              type="tel"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              value={pin}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                setPin(val);
                setError('');
                if (val.length === 4) verifyPin(val);
              }}
              onPaste={handlePaste}
              autoFocus
              className="absolute opacity-0 pointer-events-none w-0 h-0"
              aria-label="Ingresa tu PIN de 4 dígitos"
            />

            {/* Fast Interactive 4-Digit Glass Boxes */}
            <div className="space-y-2 relative z-10">
              <div
                onClick={() => inputRef.current?.focus()}
                className="flex items-center justify-center gap-2.5 sm:gap-3.5 py-2 cursor-pointer"
                title="Toca para escribir tu PIN"
              >
                {[0, 1, 2, 3].map((idx) => {
                  const isFilled = pin.length > idx;
                  const isActive = pin.length === idx;
                  return (
                    <div
                      key={idx}
                      className={`w-12 h-14 sm:w-14 sm:h-16 rounded-2xl flex items-center justify-center transition-all duration-200 border font-mono text-xl sm:text-2xl font-black ${
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
                <p className="text-xs text-rose-400 font-medium flex items-center justify-center gap-1.5 animate-shake">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{error}</span>
                </p>
              ) : (
                <p className="text-[11px] text-zinc-400 flex items-center justify-center gap-1">
                  <span>Escribe con teclado físico o en pantalla</span>
                  <span className="text-purple-300 font-mono font-bold">({selectedUser.username})</span>
                </p>
              )}
            </div>

            {/* Liquid Glass Numeric Keypad (iOS Style) */}
            <div className="grid grid-cols-3 gap-2 sm:gap-2.5 max-w-xs mx-auto relative z-10">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => handleDigitPress(digit.toString())}
                  className="h-12 sm:h-14 rounded-2xl bg-white/[0.05] hover:bg-white/[0.12] active:bg-purple-600/40 border border-white/10 hover:border-purple-500/40 text-lg sm:text-xl font-bold text-white transition-all duration-150 flex items-center justify-center cursor-pointer shadow-sm active:scale-95"
                >
                  {digit}
                </button>
              ))}

              {/* Bottom row: Clear, 0, Backspace */}
              <button
                type="button"
                onClick={handleClear}
                className="h-12 sm:h-14 rounded-2xl bg-white/[0.02] hover:bg-white/[0.08] text-xs font-semibold text-zinc-400 hover:text-white transition-all flex items-center justify-center cursor-pointer active:scale-95"
              >
                Limpiar
              </button>

              <button
                type="button"
                onClick={() => handleDigitPress('0')}
                className="h-12 sm:h-14 rounded-2xl bg-white/[0.05] hover:bg-white/[0.12] active:bg-purple-600/40 border border-white/10 hover:border-purple-500/40 text-lg sm:text-xl font-bold text-white transition-all duration-150 flex items-center justify-center cursor-pointer shadow-sm active:scale-95"
              >
                0
              </button>

              <button
                type="button"
                onClick={handleBackspace}
                aria-label="Borrar dígito"
                className="h-12 sm:h-14 rounded-2xl bg-white/[0.02] hover:bg-white/[0.08] active:bg-rose-500/20 text-zinc-400 hover:text-white transition-all flex items-center justify-center cursor-pointer active:scale-95"
              >
                <Delete className="w-5 h-5" />
              </button>
            </div>

            {/* Action footer: Option to change PIN */}
            <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs text-zinc-400 relative z-10">
              <span className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Este dispositivo se recordará permanentemente</span>
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
    </div>
  );
};
