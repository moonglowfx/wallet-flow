// ==============================================================================
// PRISMA v4 - Componentes UI Encapsulados (Liquid Glass & Responsive)
// Subcomponentes modulares sin contaminación de CSS global
// ==============================================================================

import React, { useState } from "react";
import {
  Lock,
  Unlock,
  X,
  ChevronDown,
  CheckCircle2,
  AlertTriangle,
  Info,
  ShieldAlert,
  Sparkles
} from "lucide-react";
import { C, scoreColor } from "./prismaConfig.js";
import { fmt, fmtUSD, fmtUSDk } from "./prismaEngine.js";

/**
 * Contenedor de Sección con Kicker estilizado
 */
export const Section = ({ children, kicker, className = "" }) => (
  <div className={`mb-8 ${className}`}>
    {kicker && (
      <div className="flex items-center gap-2 mb-3 font-mono text-[10px] tracking-[0.18em] uppercase text-zinc-400">
        <span className="w-4 h-[1px] bg-amber-400/60" />
        <span>{kicker}</span>
      </div>
    )}
    {children}
  </div>
);

/**
 * Input Numérico Financiero con prefijo estilizado
 */
export const NumInput = ({ label, value, onChange, placeholder, prefix = "$", optional }) => (
  <label className="block w-full">
    <div className="flex justify-between items-center mb-1.5 font-mono text-[10px] tracking-wider uppercase text-zinc-400">
      <span>{label}</span>
      {optional && <span className="text-[9px] text-zinc-600 font-normal">opcional</span>}
    </div>
    <div className="relative">
      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 font-serif text-lg pointer-events-none">
        {prefix}
      </span>
      <input
        type="number"
        inputMode="decimal"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full pl-8 pr-3 py-2.5 sm:py-3 bg-black/40 border border-white/10 rounded-xl text-zinc-100 font-serif text-xl sm:text-2xl outline-none transition-all duration-200 focus:border-amber-400/60 focus:bg-black/60 focus:ring-1 focus:ring-amber-400/30"
      />
    </div>
  </label>
);

/**
 * Chip Selector de Perfil Patrimonial
 */
export const ProfileChip = ({ profile, active, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex-1 p-3.5 sm:p-4 text-left rounded-xl transition-all duration-200 cursor-pointer border ${
      active
        ? "bg-amber-500/10 border-amber-400/50 shadow-[0_0_15px_rgba(212,165,116,0.15)]"
        : "bg-white/[0.02] border-white/10 hover:border-white/20 hover:bg-white/[0.04]"
    }`}
  >
    <div className="flex justify-between items-baseline gap-2 mb-1">
      <span className={`font-serif text-base sm:text-lg italic ${active ? "text-amber-200" : "text-zinc-200"}`}>
        {profile.label}
      </span>
      <span className="font-mono text-[9px] tracking-wider text-amber-400/80">
        {profile.range}
      </span>
    </div>
    <div className="text-[11px] text-zinc-400 leading-relaxed">
      {profile.desc}
    </div>
  </button>
);

/**
 * Medidor Circular SVG de Salud Patrimonial
 */
export const HealthGauge = ({ score = 0, grade = "" }) => {
  const angle = (Math.max(0, Math.min(100, score)) / 100) * 180;
  const color = scoreColor(score);
  const cx = 110;
  const cy = 110;
  const r = 80;

  const start = {
    x: cx - r,
    y: cy
  };
  const endRad = (180 - angle) * (Math.PI / 180);
  const end = {
    x: cx + r * Math.cos(endRad),
    y: cy - r * Math.sin(endRad)
  };
  const bgArcEnd = {
    x: cx + r,
    y: cy
  };

  const largeArc = angle > 180 ? 1 : 0;
  const arcPath = `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
  const bgPath = `M ${start.x} ${start.y} A ${r} ${r} 0 0 1 ${bgArcEnd.x} ${bgArcEnd.y}`;

  const ticks = [0, 25, 50, 75, 100];

  return (
    <div className="flex flex-col items-center justify-center p-3 sm:p-4">
      <svg viewBox="0 0 220 135" className="w-48 sm:w-56 overflow-visible">
        {/* Arco de Fondo */}
        <path d={bgPath} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" strokeLinecap="round" />

        {/* Arco Activo con Gradiente */}
        {score > 0 && (
          <path
            d={arcPath}
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeLinecap="round"
            style={{
              transition: "stroke-dashoffset 0.6s ease, stroke 0.4s ease",
              filter: `drop-shadow(0 0 8px ${color}66)`
            }}
          />
        )}

        {/* Ticks */}
        {ticks.map((t) => {
          const a = ((180 - (t / 100) * 180) * Math.PI) / 180;
          const x1 = cx + (r - 18) * Math.cos(a);
          const y1 = cy - (r - 18) * Math.sin(a);
          const x2 = cx + (r - 10) * Math.cos(a);
          const y2 = cy - (r - 10) * Math.sin(a);
          return (
            <line
              key={t}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="rgba(255,255,255,0.2)"
              strokeWidth="1.5"
            />
          );
        })}

        {/* Valor Central */}
        <text
          x={cx}
          y={cy - 12}
          textAnchor="middle"
          className="font-serif italic font-medium"
          style={{ fontSize: "40px", fill: color }}
        >
          {score}
        </text>
        <text
          x={cx}
          y={cy + 8}
          textAnchor="middle"
          className="font-mono tracking-[0.2em] uppercase font-semibold"
          style={{ fontSize: "9px", fill: "rgba(255,255,255,0.4)" }}
        >
          / 100 PTS
        </text>
      </svg>

      {/* Badge de Grado */}
      <div
        className="mt-1 px-3 py-1 rounded-full border text-[10px] font-mono tracking-widest uppercase font-semibold flex items-center gap-1.5"
        style={{
          borderColor: `${color}44`,
          backgroundColor: `${color}15`,
          color: color
        }}
      >
        <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: color }} />
        Salud {grade}
      </div>
    </div>
  );
};

/**
 * Fila de Control y Slider de Asignación por Bucket (Totalmente Responsive)
 */
export const BucketRow = ({
  bucket,
  pct = 0,
  amount = 0,
  onChange,
  onLock,
  onRemove,
  locked = false,
  total = 100,
  canRemove = true
}) => {
  const isOff = total !== 100;

  return (
    <div
      className={`relative p-3 sm:p-3.5 mb-2 rounded-xl border transition-all duration-200 bg-white/[0.02] backdrop-blur-md ${
        locked ? "border-amber-400/40 bg-amber-400/[0.02]" : "border-white/10 hover:border-white/20"
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Identificador & Nombre */}
        <div className="flex items-center gap-2.5 sm:w-1/3 min-w-0">
          <div
            className="w-2 sm:w-2.5 h-7 rounded-sm flex-shrink-0"
            style={{ backgroundColor: bucket.color }}
          />
          <div className="min-w-0">
            <div className="font-serif text-sm sm:text-base text-zinc-100 truncate">
              {bucket.label}
            </div>
            <div className="text-[10px] text-zinc-400 truncate">
              {bucket.sub}
            </div>
          </div>
        </div>

        {/* Slider & Porcentaje */}
        <div className="flex-1 flex items-center gap-3 w-full sm:w-auto">
          <div className="font-mono font-semibold text-xs sm:text-sm text-right w-11 tabular-nums" style={{ color: bucket.accent }}>
            {pct}%
          </div>
          <div className="flex-1 relative flex flex-col justify-center">
            <input
              type="range"
              min={0}
              max={100}
              value={pct}
              onChange={onChange}
              disabled={locked}
              className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-amber-400 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ accentColor: bucket.color }}
            />
            {/* Barra de progreso de fondo */}
            <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden mt-1">
              <div
                className="h-full rounded-full transition-all duration-150"
                style={{
                  width: `${pct}%`,
                  background: `linear-gradient(90deg, ${bucket.color}, ${bucket.accent})`
                }}
              />
            </div>
          </div>
        </div>

        {/* Monto & Acciones Rápidas */}
        <div className="flex items-center justify-between sm:justify-end gap-3 sm:w-1/4">
          <div
            className={`font-serif italic text-base sm:text-lg tabular-nums ${
              isOff ? "text-zinc-500" : "text-zinc-100"
            }`}
          >
            ${fmt(amount)}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onLock}
              title={locked ? "Desbloquear asignación" : "Bloquear asignación"}
              className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                locked
                  ? "border-amber-400/60 bg-amber-400/20 text-amber-300"
                  : "border-white/10 text-zinc-400 hover:text-zinc-200 hover:border-white/20"
              }`}
            >
              {locked ? <Lock size={13} /> : <Unlock size={13} />}
            </button>

            <button
              type="button"
              onClick={onRemove}
              disabled={!canRemove}
              title={canRemove ? "Desactivar bucket" : "No se puede desactivar el último bucket"}
              className={`p-1.5 rounded-lg border transition-all ${
                canRemove
                  ? "border-white/10 text-zinc-400 hover:text-red-400 hover:border-red-400/40 cursor-pointer"
                  : "border-white/5 text-zinc-600 opacity-40 cursor-not-allowed"
              }`}
            >
              <X size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Tarjeta de Detalle Estratégico Expandible por Bucket
 */
export const BucketDetailCard = ({
  bucket,
  pct = 0,
  amount = 0,
  fixed = 0,
  emerStock = 0
}) => {
  const [open, setOpen] = useState(false);
  const acumulado6 = amount * 6;
  const acumulado12 = amount * 12;
  const acumulado24 = amount * 24;
  const target = bucket.target ? bucket.target(fixed) : null;
  const currentBalance = bucket.id === "emer" ? emerStock : 0;
  const monthsToTarget =
    target && amount > 0 ? Math.ceil((target - currentBalance) / amount) : null;
  const reached = target ? currentBalance >= target : false;

  return (
    <div
      className={`rounded-2xl border transition-all duration-300 mb-3 overflow-hidden backdrop-blur-md ${
        open
          ? "bg-black/60 border-amber-400/40 shadow-[0_4px_25px_rgba(0,0,0,0.4)]"
          : "bg-white/[0.02] border-white/10 hover:border-white/20"
      }`}
    >
      {/* Header Interactivo */}
      <div
        onClick={() => setOpen(!open)}
        className="p-3.5 sm:p-5 flex items-center justify-between gap-3 cursor-pointer select-none"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-2.5 h-10 rounded-sm flex-shrink-0"
            style={{ backgroundColor: bucket.color }}
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-serif text-base sm:text-xl text-zinc-100">
                {bucket.label}
              </span>
              <span
                className="font-mono text-[8px] sm:text-[9px] tracking-wider uppercase px-2 py-0.5 rounded border"
                style={{
                  borderColor: `${bucket.color}44`,
                  backgroundColor: `${bucket.color}15`,
                  color: bucket.accent
                }}
              >
                {bucket.layer}
              </span>
            </div>
            <div className="font-mono text-[10px] text-zinc-400 mt-0.5 truncate">
              {pct}% del ingreso • {bucket.targetLabel ? bucket.targetLabel(fixed) : "Sin meta fija"}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-5 flex-shrink-0">
          <div className="text-right">
            <div className="font-serif italic text-xl sm:text-2xl text-zinc-100 tabular-nums">
              ${fmt(amount)}
            </div>
            <div className="font-mono text-[9px] text-zinc-500 uppercase">este mes</div>
          </div>
          <div
            className={`p-1 text-zinc-400 transition-transform duration-300 ${
              open ? "rotate-180 text-amber-300" : ""
            }`}
          >
            <ChevronDown size={18} />
          </div>
        </div>
      </div>

      {/* Cuerpo Expandible */}
      {open && (
        <div className="p-4 sm:p-6 border-t border-white/10 bg-black/40 space-y-6">
          {/* Mini KPIs de Proyección */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {[
              { lb: "Acum. 6 meses", val: "$" + fmt(acumulado6), color: "text-zinc-200" },
              { lb: "Acum. 12 meses", val: "$" + fmt(acumulado12), color: "text-emerald-400" },
              { lb: "Acum. 24 meses", val: "$" + fmt(acumulado24), color: "text-emerald-300" },
              {
                lb: "Próximo Hito",
                val: !target
                  ? "—"
                  : reached
                  ? "Logrado"
                  : amount === 0
                  ? "Sin aporte"
                  : `${monthsToTarget}m`,
                color: reached ? "text-emerald-400" : amount > 0 ? "text-amber-300" : "text-zinc-500"
              }
            ].map((k, i) => (
              <div key={i} className="p-3 bg-white/[0.02] border border-white/10 rounded-xl">
                <div className="font-mono text-[9px] tracking-wider uppercase text-zinc-500">
                  {k.lb}
                </div>
                <div className={`font-serif italic text-lg mt-1 tabular-nums ${k.color}`}>
                  {k.val}
                </div>
              </div>
            ))}
          </div>

          {/* Dónde Guardarlo & Distribución Interna */}
          <div>
            <div
              className="font-mono text-[10px] tracking-wider uppercase font-semibold mb-2"
              style={{ color: bucket.accent }}
            >
              Dónde Guardarlo y Custodia
            </div>
            <div
              className="p-3 sm:p-4 rounded-xl border text-xs sm:text-sm text-zinc-300 leading-relaxed bg-white/[0.02]"
              style={{ borderLeftColor: bucket.color, borderLeftWidth: 3 }}
            >
              {bucket.where}
            </div>

            {/* Barra interna apilada */}
            {bucket.distribution && bucket.distribution.length > 0 && (
              <div className="mt-4 space-y-3">
                <div className="h-2 w-full rounded-full overflow-hidden flex bg-white/5">
                  {bucket.distribution.map((d, i) => (
                    <div
                      key={i}
                      style={{
                        width: `${d.pct}%`,
                        backgroundColor: i === 0 ? bucket.color : i === 1 ? bucket.accent : "#a8a098",
                        opacity: 1 - i * 0.15
                      }}
                    />
                  ))}
                </div>

                <div className="divide-y divide-white/5">
                  {bucket.distribution.map((d, i) => (
                    <div key={i} className="py-2.5 flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-4 text-xs">
                      <div className="flex items-center gap-2 sm:w-44 flex-shrink-0">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{
                            backgroundColor: i === 0 ? bucket.color : i === 1 ? bucket.accent : "#a8a098"
                          }}
                        />
                        <span className="font-mono font-semibold" style={{ color: bucket.accent }}>
                          {d.pct}%
                        </span>
                        <span className="text-zinc-200 font-medium">{d.name}</span>
                      </div>
                      <div className="flex-1 text-zinc-400 text-[11px] leading-relaxed">
                        {d.why}
                      </div>
                      <div className="font-mono text-[11px] text-zinc-400 self-end sm:self-auto">
                        ${fmt((amount * d.pct) / 100)}/mes
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Grid de Reglas, Acciones y Trampas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Acciones de este mes */}
            {bucket.thisMonth && bucket.thisMonth.length > 0 && (
              <div className="p-4 bg-white/[0.02] border border-white/10 rounded-xl space-y-2">
                <div
                  className="font-mono text-[10px] tracking-wider uppercase font-semibold flex items-center gap-1.5"
                  style={{ color: bucket.accent }}
                >
                  <Sparkles size={12} />
                  Acciones Concretas Este Mes
                </div>
                <div className="space-y-1.5">
                  {bucket.thisMonth.map((a, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-zinc-300">
                      <span className="text-amber-400 font-bold">•</span>
                      <span>{a}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reglas Operativas */}
            {bucket.rules && bucket.rules.length > 0 && (
              <div className="p-4 bg-white/[0.02] border border-white/10 rounded-xl space-y-2">
                <div className="font-mono text-[10px] tracking-wider uppercase font-semibold text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 size={12} />
                  Reglas Operativas
                </div>
                <div className="space-y-1.5">
                  {bucket.rules.map((r, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-zinc-300">
                      <span className="text-emerald-400 font-bold">✓</span>
                      <span>{r}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Trampas y Criterio de Éxito */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {bucket.pitfalls && bucket.pitfalls.length > 0 && (
              <div className="p-4 bg-red-500/[0.03] border border-red-500/20 rounded-xl space-y-2">
                <div className="font-mono text-[10px] tracking-wider uppercase font-semibold text-red-400 flex items-center gap-1.5">
                  <AlertTriangle size={12} />
                  Trampas a Evitar
                </div>
                <div className="space-y-1.5">
                  {bucket.pitfalls.map((p, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-red-200/80">
                      <span className="text-red-400">⚠</span>
                      <span>{p}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {bucket.success && (
              <div className="p-4 bg-amber-500/[0.03] border border-amber-500/20 rounded-xl space-y-2">
                <div className="font-mono text-[10px] tracking-wider uppercase font-semibold text-amber-300 flex items-center gap-1.5">
                  <ShieldAlert size={12} />
                  Criterio de Éxito
                </div>
                <p className="text-xs text-amber-100/90 leading-relaxed">
                  {bucket.success}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
