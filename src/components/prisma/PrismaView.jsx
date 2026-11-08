// ==============================================================================
// PRISMA v4 - Capital Distribution OS: Vista Contenedor Modular
// Integración perfecta en la Sección IA de Wallet Flow (Liquid Glass UI)
// ==============================================================================

import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from "recharts";
import {
  RotateCcw,
  Sparkles,
  AlertTriangle,
  CheckCircle,
  Info,
  ShieldCheck,
  TrendingUp,
  Layers,
  Compass,
  Plus,
  Save,
  Check,
  Database
} from "lucide-react";
import { BUCKETS, PROFILES, LAYERS, C, scoreColor, DEFAULT_YIELD_RATES } from "./prismaConfig.js";
import { api } from "../../services/api.js";
import {
  fmt,
  fmtUSD,
  fmtUSDk,
  detectProfile,
  computeHealth,
  evaluateRules
} from "./prismaEngine.js";
import {
  Section,
  NumInput,
  ProfileChip,
  BucketRow,
  HealthGauge,
  BucketDetailCard
} from "./PrismaComponents.jsx";

export const PrismaView = ({
  userId = "munboi",
  initialIncome = 7504,
  initialFixed = 200,
  initialGoal = 4000,
  initialEmerStock = 4000,
  currency = "USD",
  exchangeRate = 1
}) => {
  // Estados Financieros Principales
  const [income, setIncome] = useState(initialIncome);
  const [fixed, setFixed] = useState(initialFixed);
  const [goal, setGoal] = useState(initialGoal);
  const [emerStock, setEmerStock] = useState(initialEmerStock);
  const [profileKey, setProfileKey] = useState("mid");

  // Estado de Asignaciones, Bloqueos y Rendimientos
  const [alloc, setAlloc] = useState({ ...PROFILES.mid.pct });
  const [locks, setLocks] = useState({});
  const [disabled, setDisabled] = useState({});
  const [yieldRates, setYieldRates] = useState({ ...DEFAULT_YIELD_RATES });
  const [touched, setTouched] = useState(false);

  // Estados de Sincronización con Base de Datos SQLite
  const [saveStatus, setSaveStatus] = useState("synced"); // 'synced' | 'saving' | 'error'
  const [lastSaved, setLastSaved] = useState(null);
  const [isLoadedFromDb, setIsLoadedFromDb] = useState(false);
  const autoSaveTimerRef = useRef(null);

  // Cargar configuración persistida desde SQLite al montar
  useEffect(() => {
    let isMounted = true;
    async function loadSettings() {
      try {
        const data = await api.getPrismaSettings(userId);
        if (isMounted && data && !data.error) {
          if (typeof data.income === "number") setIncome(data.income);
          if (typeof data.fixed === "number") setFixed(data.fixed);
          if (typeof data.goal === "number") setGoal(data.goal);
          if (typeof data.emerStock === "number") setEmerStock(data.emerStock);
          if (data.profileKey) setProfileKey(data.profileKey);
          if (data.alloc && Object.keys(data.alloc).length > 0) setAlloc(data.alloc);
          if (data.locks) setLocks(data.locks);
          if (data.disabled) setDisabled(data.disabled);
          if (data.yieldRates && Object.keys(data.yieldRates).length > 0) {
            setYieldRates((prev) => ({ ...prev, ...data.yieldRates }));
          }
          if (data.updated_at) setLastSaved(new Date(data.updated_at));
        }
      } catch (err) {
        console.warn("Prisma: Error cargando configuración desde BD:", err);
      } finally {
        if (isMounted) setIsLoadedFromDb(true);
      }
    }
    loadSettings();
    return () => {
      isMounted = false;
    };
  }, [userId]);

  // Función de Persistencia Inmediata en Base de Datos
  const persistToDatabase = useCallback(
    async (manual = false) => {
      setSaveStatus("saving");
      try {
        const payload = {
          userId,
          income,
          fixed,
          goal,
          emerStock,
          profileKey,
          alloc,
          locks,
          disabled,
          yieldRates
        };
        const res = await api.savePrismaSettings(payload, userId);
        if (res && res.success) {
          setSaveStatus("synced");
          setLastSaved(new Date());
        } else {
          setSaveStatus("error");
        }
      } catch (err) {
        console.error("Prisma: Error guardando en BD:", err);
        setSaveStatus("error");
      }
    },
    [userId, income, fixed, goal, emerStock, profileKey, alloc, locks, disabled, yieldRates]
  );

  // Auto-guardado inteligente (Debounce de 800ms)
  useEffect(() => {
    if (!isLoadedFromDb) return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);

    autoSaveTimerRef.current = setTimeout(() => {
      persistToDatabase(false);
    }, 800);

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [
    income,
    fixed,
    goal,
    emerStock,
    profileKey,
    alloc,
    locks,
    disabled,
    yieldRates,
    isLoadedFromDb,
    persistToDatabase
  ]);

  const handleYieldRateChange = useCallback((bucketId, newRate) => {
    setTouched(true);
    setYieldRates((prev) => ({ ...prev, [bucketId]: newRate }));
  }, []);

  // Cálculos Derivados Inmediatos
  const totalAlloc = useMemo(() => {
    return Object.values(alloc).reduce((a, v) => a + (Number(v) || 0), 0);
  }, [alloc]);

  const detectedProfileKey = useMemo(() => detectProfile(income), [income]);

  const activeBuckets = useMemo(() => {
    return BUCKETS.filter((b) => !disabled[b.id]);
  }, [disabled]);

  const inactiveBuckets = useMemo(() => {
    return BUCKETS.filter((b) => disabled[b.id]);
  }, [disabled]);

  // Aplicar Preset de Perfil redistribuyendo a buckets activos
  const applyProfile = useCallback(
    (key) => {
      const preset = PROFILES[key]?.pct;
      if (!preset) return;

      const newPct = { ...preset };
      let releasedPct = 0;

      // Resetear porcentaje de buckets desactivados
      Object.keys(newPct).forEach((id) => {
        if (disabled[id]) {
          releasedPct += newPct[id] || 0;
          newPct[id] = 0;
        }
      });

      // Redistribuir a activos
      if (releasedPct > 0) {
        const activeIds = BUCKETS.filter((b) => !disabled[b.id]).map((b) => b.id);
        if (activeIds.length > 0) {
          const activeSum = activeIds.reduce((s, id) => s + (newPct[id] || 0), 0);
          if (activeSum > 0) {
            activeIds.forEach((id) => {
              const ratio = (newPct[id] || 0) / activeSum;
              newPct[id] = Math.max(0, Math.round((newPct[id] || 0) + releasedPct * ratio));
            });
          } else {
            const each = releasedPct / activeIds.length;
            activeIds.forEach((id) => {
              newPct[id] = Math.round(each);
            });
          }
          const sum = activeIds.reduce((s, id) => s + (newPct[id] || 0), 0);
          const diff = 100 - sum;
          if (diff !== 0) {
            newPct[activeIds[0]] = Math.max(0, (newPct[activeIds[0]] || 0) + diff);
          }
        }
      }

      setAlloc(newPct);
      setLocks({});
      setProfileKey(key);
      setTouched(false);
    },
    [disabled]
  );

  // Actualización Dinámica de Slider con Rebalanceo Proporcional
  const updatePct = useCallback(
    (id, newVal) => {
      if (disabled[id]) return;
      setTouched(true);

      const v = Math.max(0, Math.min(100, Number(newVal) || 0));
      const others = BUCKETS.filter(
        (b) => b.id !== id && !locks[b.id] && !disabled[b.id]
      ).map((b) => b.id);

      const lockedSum = BUCKETS.filter(
        (b) => b.id !== id && locks[b.id] && !disabled[b.id]
      ).reduce((s, b) => s + (alloc[b.id] || 0), 0);

      const available = 100 - v - lockedSum;
      if (available < 0) return;

      const currentOthersSum = others.reduce((s, oid) => s + (alloc[oid] || 0), 0);
      const next = { ...alloc, [id]: v };

      if (others.length === 0) {
        setAlloc(next);
        return;
      }

      if (currentOthersSum === 0) {
        const each = available / others.length;
        others.forEach((oid) => {
          next[oid] = Math.round(each);
        });
      } else {
        others.forEach((oid) => {
          const ratio = (alloc[oid] || 0) / currentOthersSum;
          next[oid] = Math.max(0, Math.round(available * ratio));
        });
      }

      const sum = Object.values(next).reduce((a, x) => a + (Number(x) || 0), 0);
      const diff = 100 - sum;
      if (diff !== 0 && others.length > 0) {
        const pivot = others.find((oid) => next[oid] + diff >= 0) || others[0];
        next[pivot] = Math.max(0, next[pivot] + diff);
      }

      setAlloc(next);
    },
    [alloc, locks, disabled]
  );

  const toggleLock = useCallback((id) => {
    setLocks((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  // Desactivar un bucket y redistribuir su porcentaje
  const toggleDisable = useCallback(
    (id) => {
      if (activeBuckets.length <= 1) return; // Mínimo 1 bucket activo

      const currentPct = alloc[id] || 0;
      const candidates = BUCKETS.filter(
        (b) => b.id !== id && !disabled[b.id] && !locks[b.id]
      ).map((b) => b.id);

      const next = { ...alloc, [id]: 0 };

      if (currentPct > 0 && candidates.length > 0) {
        const candSum = candidates.reduce((s, c) => s + (alloc[c] || 0), 0);
        if (candSum > 0) {
          candidates.forEach((c) => {
            const ratio = (alloc[c] || 0) / candSum;
            next[c] = Math.max(0, Math.round((alloc[c] || 0) + currentPct * ratio));
          });
        } else {
          const each = currentPct / candidates.length;
          candidates.forEach((c) => {
            next[c] = Math.round(each);
          });
        }

        const activeIds = BUCKETS.filter((b) => !disabled[b.id] && b.id !== id).map(
          (b) => b.id
        );
        const sum = activeIds.reduce((s, i) => s + (next[i] || 0), 0);
        const diff = 100 - sum;
        if (diff !== 0) {
          const pivot = candidates.find((c) => next[c] + diff >= 0) || candidates[0];
          next[pivot] = Math.max(0, next[pivot] + diff);
        }
      }

      setAlloc(next);
      setDisabled((prev) => ({ ...prev, [id]: true }));
      setLocks((prev) => {
        const { [id]: _, ...rest } = prev;
        return rest;
      });
      setTouched(true);
    },
    [alloc, disabled, locks, activeBuckets]
  );

  // Reactivar un bucket
  const reenableBucket = useCallback(
    (id) => {
      if (!disabled[id]) return;
      const presetPct = PROFILES[profileKey]?.pct[id] || 5;
      const targetPct = Math.max(presetPct, 5);
      const candidates = BUCKETS.filter(
        (b) => b.id !== id && !disabled[b.id] && !locks[b.id]
      ).map((b) => b.id);

      const next = { ...alloc };
      if (candidates.length === 0) {
        next[id] = 0;
      } else {
        const candSum = candidates.reduce((s, c) => s + (alloc[c] || 0), 0);
        const realTarget = Math.min(targetPct, Math.max(candSum, 0));
        if (candSum > 0 && realTarget > 0) {
          candidates.forEach((c) => {
            const ratio = (alloc[c] || 0) / candSum;
            next[c] = Math.max(0, Math.round((alloc[c] || 0) - realTarget * ratio));
          });
        }
        next[id] = realTarget;
        const activeIds = [
          ...BUCKETS.filter((b) => !disabled[b.id] && b.id !== id).map((b) => b.id),
          id
        ];
        const sum = activeIds.reduce((s, i) => s + (next[i] || 0), 0);
        const diff = 100 - sum;
        if (diff !== 0) {
          const pivot = candidates.find((c) => next[c] + diff >= 0) || candidates[0];
          next[pivot] = Math.max(0, next[pivot] + diff);
        }
      }

      setAlloc(next);
      setDisabled((d) => {
        const { [id]: _, ...rest } = d;
        return rest;
      });
      setTouched(true);
    },
    [alloc, disabled, locks, profileKey]
  );

  // Montos distribuidos por cada bucket
  const allocAmounts = useMemo(() => {
    const res = {};
    BUCKETS.forEach((b) => {
      res[b.id] = disabled[b.id] ? 0 : Math.round((income * (alloc[b.id] || 0)) / 100);
    });
    return res;
  }, [income, alloc, disabled]);

  // Indicador de Salud y Reglas Heurísticas
  const health = useMemo(() => {
    return computeHealth({
      income,
      fixed,
      alloc,
      emerStock,
      total: totalAlloc,
      disabled
    });
  }, [income, fixed, alloc, emerStock, totalAlloc, disabled]);

  const alerts = useMemo(() => {
    return evaluateRules({
      income,
      fixed,
      goal,
      alloc,
      emerStock,
      disabled
    });
  }, [income, fixed, goal, alloc, emerStock, disabled]);

  // Datos para Recharts PieChart
  const pieData = useMemo(() => {
    return BUCKETS.map((b) => ({
      name: b.label,
      value: allocAmounts[b.id] || 0,
      color: b.color,
      pct: alloc[b.id] || 0
    })).filter((d) => d.value > 0);
  }, [allocAmounts, alloc]);

  // Proyecciones a 3, 6, 12, 24 y 36 meses
  const projections = useMemo(() => {
    const horizons = [3, 6, 12, 24, 36];
    return horizons.map((m) => {
      const defAdd =
        (allocAmounts.emer || 0) + (allocAmounts.deuda || 0) + (allocAmounts.fiscal || 0);
      const acumAdd =
        (allocAmounts.fija || 0) +
        (allocAmounts.cripto || 0) +
        (allocAmounts.refugio || 0) +
        (allocAmounts.lp || 0);
      const oppAdd = allocAmounts.opp || 0;

      return {
        months: `${m}m`,
        rawMonths: m,
        defensa: Math.round(emerStock + defAdd * m),
        acum: Math.round(acumAdd * m),
        opp: Math.round(oppAdd * m),
        patrimonio: Math.round(emerStock + (defAdd + acumAdd + oppAdd) * m)
      };
    });
  }, [allocAmounts, emerStock]);

  // Hitos Financieros Calculados
  const milestones = useMemo(() => {
    const fx = fixed > 0 ? fixed : 200;
    const monthsTo = (target, current, monthlyAdd) => {
      if (current >= target) return { reached: true, months: 0 };
      if (monthlyAdd <= 0) return { reached: false, months: Infinity };
      return { reached: false, months: Math.ceil((target - current) / monthlyAdd) };
    };

    const defAdd =
      (allocAmounts.emer || 0) + (allocAmounts.fiscal || 0) +
      (allocAmounts.fija || 0) + (allocAmounts.cripto || 0) +
      (allocAmounts.refugio || 0) + (allocAmounts.lp || 0) + (allocAmounts.opp || 0);

    const list = [
      { name: "Liquidar deuda familiar", target: 2500, current: 0, add: allocAmounts.deuda || 0, bucket: "deuda" },
      { name: "Emergencia • 3 meses de gastos", target: fx * 3, current: emerStock, add: allocAmounts.emer || 0, bucket: "emer" },
      { name: "Reserva fiscal • $2,000", target: 2000, current: 0, add: allocAmounts.fiscal || 0, bucket: "fiscal" },
      { name: "Emergencia • 12 meses de gastos", target: fx * 12, current: emerStock, add: allocAmounts.emer || 0, bucket: "emer" },
      { name: "Renta fija base • $5,000", target: 5000, current: 0, add: allocAmounts.fija || 0, bucket: "fija" },
      { name: "Cripto Core • $5,000", target: 5000, current: 0, add: allocAmounts.cripto || 0, bucket: "cripto" },
      { name: "Buffer trading • $5,000", target: 5000, current: 0, add: allocAmounts.trade || 0, bucket: "trade" },
      { name: "Activos refugio • $3,000", target: 3000, current: 0, add: allocAmounts.refugio || 0, bucket: "refugio" },
      { name: "Patrimonio total • $25,000", target: 25000, current: emerStock, add: defAdd, bucket: "total" },
      { name: "LP Crecimiento • $10,000", target: 10000, current: 0, add: allocAmounts.lp || 0, bucket: "lp" },
      { name: "Fondo Oportunidades • $10,000", target: 10000, current: 0, add: allocAmounts.opp || 0, bucket: "opp" },
      { name: "Patrimonio total • $50,000", target: 50000, current: emerStock, add: defAdd, bucket: "total" },
      { name: "Patrimonio total • $100,000", target: 100000, current: emerStock, add: defAdd, bucket: "total" }
    ];

    return list
      .filter((m) => m.bucket === "total" || !disabled[m.bucket])
      .map((m) => {
        const status = monthsTo(m.target, m.current, m.add);
        const progress = Math.min(100, (m.current / m.target) * 100);
        return { ...m, ...status, progress };
      });
  }, [fixed, emerStock, allocAmounts, disabled]);

  // Diagnóstico Narrativo Sintetizado
  const diagnosis = useMemo(() => {
    const lines = [];
    const proj12 = projections.find((p) => p.rawMonths === 12);
    const proj24 = projections.find((p) => p.rawMonths === 24);
    const isOff = (id) => !!disabled[id];

    const acumIds = ["fija", "cripto", "refugio", "lp"].filter((id) => !isOff(id));
    if (acumIds.length > 0) {
      const acumPct = acumIds.reduce((s, id) => s + (alloc[id] || 0), 0);
      const divCount = acumIds.filter((id) => (alloc[id] || 0) >= 3).length;
      lines.push(
        `Capa de Acumulación: ${acumPct}% del ingreso (${fmtUSD((income * acumPct) / 100)}/mes) distribuido en ${divCount} de ${acumIds.length} clases activas. La diversificación distingue al generador de capital del verdadero patrimonialista.`
      );
    }

    if (proj12 && proj24) {
      const ratio12 = fixed > 0 ? proj12.patrimonio / (fixed * 12) : 0;
      lines.push(
        `Proyección a ritmo actual: en 12 meses tu patrimonio fuera del flujo operativo será ${fmtUSD(
          proj12.patrimonio
        )}${fixed > 0 ? ` (${ratio12.toFixed(1)} años de tus gastos actuales)` : ""}. En 24 meses alcanzará ${fmtUSD(
          proj24.patrimonio
        )}. El interés compuesto se acelera drásticamente a partir del mes 18.`
      );
    }

    if (!isOff("trade")) {
      if ((alloc.trade || 0) > 25) {
        lines.push(
          `Reinversión en trading alta (${alloc.trade}%). Útil si estás escalando cuentas agresivamente, pero por encima de 25% el riesgo de concentración sistémica crece. Modera hacia 15-20%.`
        );
      } else if ((alloc.trade || 0) < 8) {
        lines.push(
          `Reinversión en trading conservadora (${alloc.trade}%). Si buscas fondear más cuentas o cubrir suscripciones profesionales (NinjaTrader, feeds CME), considera reservar al menos $300-$500/mes.`
        );
      }
    }

    const zeroActive = [];
    if (!isOff("refugio") && (alloc.refugio || 0) === 0) zeroActive.push("Activos refugio");
    if (!isOff("lp") && (alloc.lp || 0) === 0) zeroActive.push("Crecimiento largo plazo");
    if (zeroActive.length > 0) {
      lines.push(
        `Tienes buckets activos sin asignación: ${zeroActive.join(" • ")}. Son coberturas clave ante devaluaciones. Asigna al menos 3-5% o desactívalos si no forman parte de tu fase actual.`
      );
    }

    return lines;
  }, [income, fixed, alloc, projections, disabled]);

  return (
    <div className="space-y-8 text-zinc-100">
      {/* ================= HEADER PRISMA ================= */}
      <div className="liquid-glass p-6 sm:p-8 rounded-3xl border border-white/10 relative overflow-hidden bg-gradient-to-br from-amber-500/[0.04] via-black/40 to-purple-600/[0.04]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <span className="p-2 rounded-xl bg-amber-400/10 border border-amber-400/30 text-amber-300">
                <Compass size={20} />
              </span>
              <span className="font-mono text-xs tracking-[0.2em] uppercase text-amber-300/90 font-semibold">
                Prisma v4 • Capital Distribution OS
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[10px] font-mono">
                Live Engine
              </span>

              {/* Status de Sincronización en Base de Datos */}
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/50 border border-white/10 text-[10px] font-mono text-zinc-400">
                <Database size={11} className={saveStatus === "saving" ? "animate-spin text-amber-400" : "text-amber-400"} />
                {saveStatus === "saving" && <span className="text-amber-300 animate-pulse">Guardando en SQLite...</span>}
                {saveStatus === "synced" && (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <Check size={11} />
                    {lastSaved ? `Sincronizado ${lastSaved.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "Sincronizado"}
                  </span>
                )}
                {saveStatus === "error" && <span className="text-red-400">Error BD</span>}
              </div>
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl text-zinc-100 tracking-tight font-medium">
              Arquitectura de Distribución Patrimonial
            </h1>
            <p className="text-zinc-400 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
              10 buckets organizados en 5 capas estratégicas para blindar liquidez, acelerar acumulación y maximizar el compounding.
            </p>
          </div>

          {/* Selector de Presets de Perfil & Guardado Forzado */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
            <div className="flex flex-wrap sm:flex-nowrap gap-2 items-center">
              {Object.keys(PROFILES).map((key) => {
                const p = PROFILES[key];
                const active = profileKey === key && !touched;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => applyProfile(key)}
                    className={`px-3.5 py-2 rounded-xl border text-xs font-mono tracking-wider transition-all cursor-pointer ${
                      active
                        ? "bg-amber-400/20 border-amber-400/60 text-amber-200 shadow-[0_0_15px_rgba(212,165,116,0.2)] font-semibold"
                        : "bg-white/[0.02] border-white/10 text-zinc-400 hover:text-zinc-200 hover:border-white/20"
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}

              {touched && (
                <button
                  type="button"
                  onClick={() => applyProfile(profileKey)}
                  className="p-2 rounded-xl border border-white/10 text-zinc-400 hover:text-amber-300 hover:border-amber-400/30 transition-all cursor-pointer"
                  title="Restaurar preset del perfil"
                >
                  <RotateCcw size={14} />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => persistToDatabase(true)}
              className="px-3 py-2 rounded-xl border border-amber-400/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-200 text-xs font-mono flex items-center gap-1.5 transition-all cursor-pointer"
              title="Guardar y respaldar estado inmediatamente en la base de datos SQLite"
            >
              <Save size={13} />
              <span>Guardar en BD</span>
            </button>
          </div>
        </div>
      </div>

      {/* ================= INPUTS DE CONFIGURACIÓN FINANCIERA ================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 backdrop-blur-md">
          <NumInput
            label="Ingreso mensual neto"
            value={income}
            onChange={(e) => setIncome(Math.max(0, Number(e.target.value) || 0))}
            placeholder="7500"
          />
        </div>

        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 backdrop-blur-md">
          <NumInput
            label="Gastos fijos mensuales"
            value={fixed}
            onChange={(e) => setFixed(Math.max(0, Number(e.target.value) || 0))}
            placeholder="200"
          />
        </div>

        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 backdrop-blur-md">
          <NumInput
            label="Meta ahorro/inversión"
            value={goal}
            onChange={(e) => setGoal(Math.max(0, Number(e.target.value) || 0))}
            placeholder="4000"
            optional
          />
        </div>

        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 backdrop-blur-md">
          <NumInput
            label="Fondo emergencia actual"
            value={emerStock}
            onChange={(e) => setEmerStock(Math.max(0, Number(e.target.value) || 0))}
            placeholder="4000"
          />
        </div>
      </div>

      {/* ================= SALUD PATRIMONIAL & ALERTAS ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Gauge de Salud */}
        <div className="lg:col-span-4 liquid-glass p-5 rounded-3xl border border-white/10 flex flex-col justify-between items-center text-center">
          <div className="w-full text-left">
            <span className="font-mono text-[10px] tracking-widest uppercase text-zinc-400">
              Evaluación de Fortaleza
            </span>
            <div className="font-serif text-lg text-zinc-100">Score de Salud Prisma</div>
          </div>

          <HealthGauge score={health.score} grade={health.grade} />

          <div className="w-full grid grid-cols-2 gap-2 mt-2 pt-3 border-t border-white/10 text-left">
            {health.factors.slice(0, 4).map((f, i) => (
              <div key={i} className="text-xs">
                <span className="text-zinc-500 block text-[10px] truncate">{f.label}</span>
                <span className="font-mono text-zinc-200 font-medium">
                  {f.score}/{f.max} pts
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Panel de Alertas y Diagnóstico Inmediato */}
        <div className="lg:col-span-8 liquid-glass p-5 rounded-3xl border border-white/10 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="font-mono text-[10px] tracking-widest uppercase text-zinc-400">
                Auditoría Heurística de Riesgos
              </span>
              <span className="font-mono text-[10px] text-amber-300">
                {alerts.length} observaciones activas
              </span>
            </div>

            <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-2">
              {alerts.map((a, i) => {
                const isDanger = a.level === "danger";
                const isWarn = a.level === "warn";
                const isOk = a.level === "ok";

                return (
                  <div
                    key={i}
                    className={`p-3 rounded-xl border text-xs flex items-start gap-3 transition-all ${
                      isDanger
                        ? "bg-red-500/10 border-red-500/30 text-red-200"
                        : isWarn
                        ? "bg-amber-500/10 border-amber-500/30 text-amber-200"
                        : isOk
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-200"
                        : "bg-blue-500/10 border-blue-500/30 text-blue-200"
                    }`}
                  >
                    <div className="mt-0.5 flex-shrink-0">
                      {isDanger && <AlertTriangle size={14} className="text-red-400" />}
                      {isWarn && <AlertTriangle size={14} className="text-amber-400" />}
                      {isOk && <CheckCircle size={14} className="text-emerald-400" />}
                      {!isDanger && !isWarn && !isOk && <Info size={14} className="text-blue-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-zinc-100">{a.title}</div>
                      <div className="text-[11px] opacity-80 mt-0.5 leading-relaxed">{a.body}</div>
                      {a.action && (
                        <div className="mt-1 font-mono text-[10px] text-zinc-300 font-medium">
                          Acción: {a.action}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Barra de Distribución Total */}
          <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs">
            <span className="text-zinc-400">Asignación Total del Ingreso:</span>
            <span
              className={`font-mono font-bold text-sm px-2.5 py-0.5 rounded-lg border ${
                totalAlloc === 100
                  ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-300"
                  : "bg-red-500/10 border-red-500/40 text-red-300"
              }`}
            >
              {totalAlloc}% / 100%
            </span>
          </div>
        </div>
      </div>

      {/* ================= CONTROLES DE ASIGNACIÓN (SLIDERS) ================= */}
      <Section kicker="Distribución de Flujo Mensual (10 Buckets)">
        <div className="space-y-2">
          {activeBuckets.map((bucket) => (
            <BucketRow
              key={bucket.id}
              bucket={bucket}
              pct={alloc[bucket.id] || 0}
              amount={allocAmounts[bucket.id] || 0}
              onChange={(e) => updatePct(bucket.id, e.target.value)}
              onLock={() => toggleLock(bucket.id)}
              onRemove={() => toggleDisable(bucket.id)}
              locked={!!locks[bucket.id]}
              total={totalAlloc}
              canRemove={activeBuckets.length > 1}
            />
          ))}
        </div>

        {/* Buckets Inactivos para reactivación */}
        {inactiveBuckets.length > 0 && (
          <div className="mt-4 p-4 rounded-2xl bg-white/[0.01] border border-white/5">
            <div className="font-mono text-[10px] tracking-widest uppercase text-zinc-500 mb-2">
              Buckets Desactivados ({inactiveBuckets.length})
            </div>
            <div className="flex flex-wrap gap-2">
              {inactiveBuckets.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => reenableBucket(b.id)}
                  className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.02] hover:bg-white/[0.06] text-zinc-400 hover:text-zinc-200 text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Plus size={12} />
                  <span>Reactivar {b.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </Section>

      {/* ================= VISUALIZACIÓN GRÁFICA (RECHARTS) ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Gráfico Donut de Asignación */}
        <div className="lg:col-span-5 liquid-glass p-5 rounded-3xl border border-white/10">
          <div className="font-mono text-[10px] tracking-widest uppercase text-zinc-400 mb-3">
            Composición del Flujo Mensual
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="#0a0908" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-black/90 p-3 rounded-xl border border-white/20 shadow-2xl backdrop-blur-md">
                          <div className="font-serif text-sm text-zinc-100">{data.name}</div>
                          <div className="font-mono text-xs text-amber-300 font-bold mt-1">
                            ${fmt(data.value)} ({data.pct}%)
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico de Proyección de Crecimiento */}
        <div className="lg:col-span-7 liquid-glass p-5 rounded-3xl border border-white/10">
          <div className="font-mono text-[10px] tracking-widest uppercase text-zinc-400 mb-3">
            Crecimiento Patrimonial Proyectado (3 a 36 meses)
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={projections} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="months" stroke="#6b645d" tick={{ fontSize: 11 }} />
                <YAxis
                  stroke="#6b645d"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => fmtUSDk(v)}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-black/90 p-3 rounded-xl border border-white/20 shadow-2xl backdrop-blur-md space-y-1">
                          <div className="font-mono text-xs text-zinc-400">Horizonte {label}</div>
                          {payload.map((p, idx) => (
                            <div key={idx} className="flex justify-between gap-4 text-xs font-mono">
                              <span style={{ color: p.color }}>{p.name}:</span>
                              <span className="font-bold text-zinc-100">${fmt(p.value)}</span>
                            </div>
                          ))}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="defensa" name="Defensa" stackId="a" fill="#0891b2" radius={[0, 0, 0, 0]} />
                <Bar dataKey="acum" name="Acumulación" stackId="a" fill="#16a34a" radius={[0, 0, 0, 0]} />
                <Bar dataKey="opp" name="Oportunidades" stackId="a" fill="#db2777" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ================= DETALLE PROFUNDO POR BUCKET ================= */}
      <Section kicker="Desglose Estratégico y Reglas por Bucket">
        <div className="space-y-3">
          {activeBuckets.map((bucket) => (
            <BucketDetailCard
              key={bucket.id}
              bucket={bucket}
              pct={alloc[bucket.id] || 0}
              amount={allocAmounts[bucket.id] || 0}
              fixed={fixed}
              emerStock={emerStock}
              yieldRate={yieldRates[bucket.id]}
              onYieldRateChange={handleYieldRateChange}
            />
          ))}
        </div>
      </Section>

      {/* ================= DIAGNÓSTICO NARRATIVO ================= */}
      {diagnosis.length > 0 && (
        <Section kicker="Diagnóstico Narrativo Prisma">
          <div className="liquid-glass p-6 rounded-3xl border border-white/10 space-y-3 bg-gradient-to-r from-amber-500/[0.02] to-transparent">
            {diagnosis.map((line, i) => (
              <div key={i} className="flex items-start gap-3 text-xs sm:text-sm text-zinc-300 leading-relaxed">
                <span className="text-amber-400 font-bold mt-0.5">•</span>
                <span>{line}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ================= HITOS PATRIMONIALES ================= */}
      <Section kicker="Hitos y Metas Financieras">
        <div className="liquid-glass p-5 rounded-3xl border border-white/10 divide-y divide-white/5">
          {milestones.map((m, i) => {
            const bucket = BUCKETS.find((b) => b.id === m.bucket);
            const accent = bucket ? bucket.color : "#d4a574";
            const reached = m.reached;
            const blocked = !reached && !isFinite(m.months);

            return (
              <div
                key={i}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-2.5 sm:w-2/5">
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{
                      backgroundColor: reached ? "#7fb069" : blocked ? "#c1666b" : accent,
                      boxShadow: reached ? "0 0 8px rgba(127,176,105,0.6)" : "none"
                    }}
                  />
                  <div className="min-w-0">
                    <div className="font-serif text-sm text-zinc-100 truncate">{m.name}</div>
                    <div className="font-mono text-[9px] text-zinc-500 truncate">
                      Meta: {fmtUSD(m.target)} • Aporte: {fmtUSD(m.add)}/mes
                    </div>
                  </div>
                </div>

                <div className="flex-1 flex items-center gap-3">
                  <div className="font-serif italic text-zinc-300 w-24 text-right tabular-nums">
                    {fmtUSD(m.current)}
                    <span className="text-[10px] text-zinc-500"> / {fmtUSDk(m.target)}</span>
                  </div>
                  <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${m.progress}%`,
                        backgroundColor: reached ? "#7fb069" : accent
                      }}
                    />
                  </div>
                </div>

                <div className="sm:w-28 text-right flex-shrink-0">
                  {reached ? (
                    <span className="font-mono text-[10px] text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded border border-emerald-500/30 font-semibold">
                      LOGRADO
                    </span>
                  ) : blocked ? (
                    <span className="font-mono text-[10px] text-red-400 bg-red-500/10 px-2.5 py-0.5 rounded border border-red-500/30 font-semibold">
                      SIN APORTE
                    </span>
                  ) : (
                    <div>
                      <span className="font-serif italic text-base" style={{ color: accent }}>
                        {m.months}m
                      </span>
                      <span className="font-mono text-[9px] text-zinc-500 ml-1">
                        {m.months <= 12 ? "este año" : m.months <= 24 ? "2 años" : "+3 años"}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Section>
    </div>
  );
};

export default PrismaView;
