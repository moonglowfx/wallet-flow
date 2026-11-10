import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { AlertCircle, ArrowRight, Eye, EyeOff, Loader2, Lock, ShieldCheck, Unlock, User, Wallet } from 'lucide-react';
import { api } from '../services/api.js';

const PIN_LENGTH = 4;
const LAST_USERNAME_KEY = 'wf_last_username';
// Debe coincidir con la validación del servidor (server/security.js).
const USERNAME_REGEX = /^[\p{L}\p{N}][\p{L}\p{N}._-]{2,19}$/u;

const MODES = {
  login: {
    tab: 'Iniciar sesión',
    title: 'Bienvenido de nuevo',
    subtitle: 'Escribe tu usuario y tu PIN para abrir tu bóveda',
    action: 'Entrar',
    pending: 'Verificando…',
    pinAutoComplete: 'current-password',
  },
  register: {
    tab: 'Registrar usuario',
    title: 'Crea tu usuario',
    subtitle: 'Solo necesitas un nombre de usuario y un PIN de 4 dígitos',
    action: 'Crear usuario',
    pending: 'Creando…',
    pinAutoComplete: 'new-password',
  },
};

const readLastUsername = () => {
  try {
    return localStorage.getItem(LAST_USERNAME_KEY) || '';
  } catch {
    return '';
  }
};

/**
 * Ajusta el contenedor al área realmente visible (visualViewport). En iOS el teclado virtual no
 * redimensiona el layout: sin esto, el formulario queda oculto detrás del teclado o descentrado.
 * Devuelve `compact = true` cuando la altura visible es escasa (teclado abierto en pantallas pequeñas).
 */
function useVisibleViewport(ref) {
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const viewport = window.visualViewport;
    const el = ref.current;
    if (!viewport || !el) return undefined;

    let frame = 0;
    const apply = () => {
      el.style.height = `${viewport.height}px`;
      el.style.transform = `translateY(${viewport.offsetTop}px)`;
      setCompact(viewport.height < 520);
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(apply);
    };

    apply();
    viewport.addEventListener('resize', schedule);
    viewport.addEventListener('scroll', schedule);
    return () => {
      cancelAnimationFrame(frame);
      viewport.removeEventListener('resize', schedule);
      viewport.removeEventListener('scroll', schedule);
    };
  }, [ref]);

  return compact;
}

export function AuthScreen({ onAuthenticated, notice = '' }) {
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState(readLastUsername);
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [pinFocused, setPinFocused] = useState(false);
  const [status, setStatus] = useState('idle'); // idle | submitting | success
  const [error, setError] = useState('');
  const [shakeKey, setShakeKey] = useState(0);

  const containerRef = useRef(null);
  const usernameRef = useRef(null);
  const pinRef = useRef(null);
  const submittingRef = useRef(false); // candado síncrono: evita doble envío (Enter + auto-envío del 4.º dígito)
  const mountedRef = useRef(true);
  const focusAfterIdleRef = useRef(null); // el input está deshabilitado mientras se envía: se enfoca al volver a idle
  const ids = { user: useId(), pin: useId(), error: useId(), hint: useId() };

  const compact = useVisibleViewport(containerRef);
  const copy = MODES[mode];
  const isBusy = status !== 'idle';
  const trimmedUsername = username.trim();

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Foco inicial: directo al PIN si el dispositivo ya recuerda al usuario.
  useEffect(() => {
    const target = readLastUsername() ? pinRef.current : usernameRef.current;
    const timer = setTimeout(() => target?.focus({ preventScroll: true }), 80);
    return () => clearTimeout(timer);
  }, []);

  const fail = useCallback((message, focusTarget = pinRef) => {
    focusAfterIdleRef.current = focusTarget;
    setError(message);
    setShakeKey((k) => k + 1);
    setPin('');
    setStatus('idle');
  }, []);

  useEffect(() => {
    if (status !== 'idle' || !focusAfterIdleRef.current) return;
    focusAfterIdleRef.current.current?.focus({ preventScroll: true });
    focusAfterIdleRef.current = null;
  }, [status, shakeKey]);

  const submit = useCallback(
    async (pinValue) => {
      if (submittingRef.current) return;

      const name = username.trim();
      if (!name) return fail('Escribe tu nombre de usuario.', usernameRef);
      if (mode === 'register' && !USERNAME_REGEX.test(name)) {
        return fail('El usuario debe tener de 3 a 20 caracteres: letras, números, punto o guion.', usernameRef);
      }
      if (pinValue.length !== PIN_LENGTH) return fail(`El PIN debe tener ${PIN_LENGTH} dígitos.`);

      submittingRef.current = true;
      setStatus('submitting');
      setError('');
      try {
        const { user } = await (mode === 'login' ? api.login(name, pinValue) : api.register(name, pinValue));
        try {
          localStorage.setItem(LAST_USERNAME_KEY, user.username);
        } catch {
          /* almacenamiento no disponible (modo privado) */
        }
        if (mountedRef.current) setStatus('success');
        onAuthenticated(user);
      } catch (err) {
        if (mountedRef.current) fail(err?.message || 'No se pudo completar la operación.');
      } finally {
        submittingRef.current = false;
      }
    },
    [fail, mode, onAuthenticated, username]
  );

  const handlePinChange = (e) => {
    const next = e.target.value.replace(/\D/g, '').slice(0, PIN_LENGTH);
    setPin(next);
    if (error) setError('');
    // En login el 4.º dígito envía solo; al registrar se exige confirmación explícita con el botón.
    if (mode === 'login' && next.length === PIN_LENGTH && username.trim()) submit(next);
  };

  const switchMode = (next) => {
    if (next === mode || isBusy) return;
    setMode(next);
    setPin('');
    setError('');
    setShowPin(false);
    (username.trim() ? pinRef : usernameRef).current?.focus({ preventScroll: true });
  };

  const boxState = (index) => {
    if (status === 'success') return 'success';
    if (error) return 'error';
    if (pin.length > index) return 'filled';
    if (pinFocused && pin.length === index) return 'active';
    return 'empty';
  };

  const BOX_STYLES = {
    success: 'bg-emerald-500/25 border-emerald-400 text-emerald-300 shadow-[0_0_20px_rgba(52,211,153,0.45)]',
    error: 'bg-rose-500/15 border-rose-500/70 text-rose-300',
    filled:
      'bg-gradient-to-tr from-purple-600/40 via-violet-600/30 to-fuchsia-600/30 border-purple-400/80 text-white shadow-liquid-purple',
    active: 'bg-white/[0.08] border-purple-400 text-purple-300 ring-2 ring-purple-400/40',
    empty: 'bg-white/[0.03] border-white/15 text-zinc-600',
  };

  return (
    <div
      ref={containerRef}
      className="fixed inset-x-0 top-0 h-[100dvh] z-50 overflow-y-auto overscroll-contain bg-[#09080E]"
    >
      {/* Luces ambientales Liquid Glass */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-32 -left-32 w-[26rem] h-[26rem] rounded-full bg-gradient-to-br from-purple-600/25 to-indigo-600/15 blur-[120px] animate-float-orb-1" />
        <div className="absolute -bottom-32 -right-32 w-[26rem] h-[26rem] rounded-full bg-gradient-to-br from-fuchsia-600/20 to-purple-800/15 blur-[130px] animate-float-orb-2" />
      </div>

      <div
        className={`relative min-h-full flex flex-col items-center justify-center px-3.5 min-[360px]:px-4 ${
          compact ? 'py-3' : 'py-8'
        } pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))]`}
      >
        <main className="w-full max-w-[25rem] animate-scale-in">
          {/* Marca: se oculta con el teclado abierto en pantallas pequeñas para priorizar el formulario */}
          {!compact && (
            <header className="flex flex-col items-center text-center mb-5 sm:mb-6 [@media(max-height:680px)]:mb-3">
              <div className="w-14 h-14 [@media(max-height:680px)]:w-11 [@media(max-height:680px)]:h-11 rounded-2xl bg-gradient-to-br from-purple-500 via-violet-600 to-fuchsia-600 flex items-center justify-center shadow-neon-purple border border-white/25 mb-3 [@media(max-height:680px)]:mb-2">
                <Wallet className="w-1/2 h-1/2 text-white" aria-hidden="true" />
              </div>
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-purple-300/90">Wallet Flow</p>
              <h1 className="mt-1 text-[1.4rem] leading-tight font-black tracking-tight text-white">{copy.title}</h1>
              <p className="mt-1.5 text-[13px] leading-snug text-zinc-400 max-w-[19rem] [@media(max-height:680px)]:hidden">
                {copy.subtitle}
              </p>
            </header>
          )}

          <section className="liquid-glass !rounded-3xl p-4 sm:p-6 space-y-4">
            {/* Selector de modo */}
            <div
              role="tablist"
              aria-label="Acceso a Wallet Flow"
              className="relative grid grid-cols-2 p-1 rounded-2xl bg-black/45 border border-white/10"
            >
              <span
                aria-hidden="true"
                className={`absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 border border-purple-400/40 shadow-[0_4px_18px_rgba(168,85,247,0.45)] transition-transform duration-300 ease-out ${
                  mode === 'register' ? 'translate-x-full' : 'translate-x-0'
                }`}
              />
              {Object.entries(MODES).map(([key, value]) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={mode === key}
                  disabled={isBusy}
                  onClick={() => switchMode(key)}
                  className={`relative z-10 min-h-[44px] px-1 rounded-xl text-xs min-[360px]:text-[13px] font-bold tracking-tight whitespace-nowrap transition-colors duration-200 cursor-pointer touch-manipulation ${
                    mode === key ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {value.tab}
                </button>
              ))}
            </div>

            {notice && !error && (
              <p className="px-3 py-2.5 rounded-xl bg-amber-500/10 border border-amber-400/30 text-xs text-amber-200 text-center">
                {notice}
              </p>
            )}

            <form
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                submit(pin);
              }}
              className="space-y-4"
            >
              {/* Usuario */}
              <div>
                <label htmlFor={ids.user} className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Usuario
                </label>
                <div className="relative">
                  <User
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-300/80 pointer-events-none"
                    aria-hidden="true"
                  />
                  <input
                    ref={usernameRef}
                    id={ids.user}
                    name="username"
                    type="text"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      if (error) setError('');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && pin.length < PIN_LENGTH) {
                        e.preventDefault();
                        pinRef.current?.focus();
                      }
                    }}
                    disabled={isBusy}
                    maxLength={20}
                    autoComplete="username"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    enterKeyHint="next"
                    placeholder="Tu nombre de usuario"
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? ids.error : undefined}
                    className="liquid-input !pl-10 !min-h-[48px] !text-base font-semibold"
                  />
                </div>
              </div>

              {/* PIN: un único input nativo invisible sobre las 4 casillas (teclado numérico y gestores de contraseñas) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor={ids.pin} className="text-xs font-semibold text-zinc-300">
                    PIN
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPin((v) => !v)}
                    aria-pressed={showPin}
                    className="-my-2 -mr-2 px-2 min-h-[40px] inline-flex items-center gap-1.5 text-[11px] font-semibold text-purple-300 hover:text-purple-200 cursor-pointer touch-manipulation"
                  >
                    {showPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{showPin ? 'Ocultar' : 'Mostrar'}</span>
                  </button>
                </div>

                <div key={shakeKey} className={`relative ${error ? 'animate-shake' : ''}`}>
                  <input
                    ref={pinRef}
                    id={ids.pin}
                    name="pin"
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={PIN_LENGTH}
                    value={pin}
                    onChange={handlePinChange}
                    onFocus={() => setPinFocused(true)}
                    onBlur={() => setPinFocused(false)}
                    disabled={isBusy}
                    autoComplete={copy.pinAutoComplete}
                    enterKeyHint="go"
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? ids.error : ids.hint}
                    className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer disabled:cursor-wait"
                  />
                  <div className="grid grid-cols-4 gap-2.5 sm:gap-3" aria-hidden="true">
                    {Array.from({ length: PIN_LENGTH }, (_, index) => {
                      const state = boxState(index);
                      return (
                        <div
                          key={index}
                          className={`h-14 rounded-2xl border flex items-center justify-center font-mono text-2xl font-black transition-all duration-150 ${BOX_STYLES[state]}`}
                        >
                          {pin.length > index ? (
                            showPin ? (
                              pin[index]
                            ) : (
                              <span className="w-2.5 h-2.5 rounded-full bg-current" />
                            )
                          ) : state === 'active' ? (
                            <span className="w-0.5 h-6 bg-purple-300 animate-pulse rounded-full" />
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="min-h-[2.25rem] pt-2" aria-live="polite">
                  {error ? (
                    <p id={ids.error} role="alert" className="flex items-start gap-1.5 text-xs font-medium text-rose-300">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-px" aria-hidden="true" />
                      <span>{error}</span>
                    </p>
                  ) : (
                    <p id={ids.hint} className="text-[11px] leading-snug text-zinc-500">
                      {mode === 'login'
                        ? 'Al escribir el 4.º dígito entrarás automáticamente.'
                        : 'Elige 4 dígitos que recuerdes: serán tu llave de acceso.'}
                    </p>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={isBusy}
                className="w-full liquid-button-primary min-h-[50px] px-4 text-sm font-bold flex items-center justify-center gap-2 cursor-pointer touch-manipulation disabled:opacity-80 disabled:cursor-wait"
              >
                {status === 'submitting' ? (
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                ) : status === 'success' ? (
                  <Unlock className="w-4 h-4" aria-hidden="true" />
                ) : (
                  <Lock className="w-4 h-4" aria-hidden="true" />
                )}
                <span>{status === 'submitting' ? copy.pending : status === 'success' ? 'Acceso concedido' : copy.action}</span>
                {status === 'idle' && <ArrowRight className="w-4 h-4" aria-hidden="true" />}
              </button>
            </form>

            {!compact && (
              <p className="flex items-center justify-center gap-1.5 text-[11px] text-zinc-400 border-t border-white/10 !mt-5 pt-3.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" aria-hidden="true" />
                <span>Tu sesión se mantiene 30 días en este dispositivo</span>
              </p>
            )}
          </section>

          {!compact && (
            <p className="mt-4 text-center text-xs text-zinc-500">
              {mode === 'login' ? '¿Primera vez aquí? ' : '¿Ya tienes usuario? '}
              <button
                type="button"
                onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
                className="font-bold text-purple-300 hover:text-purple-200 underline underline-offset-4 py-2 cursor-pointer touch-manipulation"
              >
                {mode === 'login' ? MODES.register.tab : MODES.login.tab}
              </button>
            </p>
          )}
        </main>
      </div>
    </div>
  );
}
