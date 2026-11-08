// ==============================================================================
// PRISMA v4 - Motor de Cálculo Financiero y Evaluación de Salud
// Funciones puras, memoizables y sin efectos secundarios (Zero memory-leaks)
// ==============================================================================

export const fmt = (v, dec = 0) => {
  const n = Number(v) || 0;
  return n.toLocaleString("en-US", {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec
  });
};

export const fmtUSD = (v) => "$" + fmt(v);

export const fmtUSDk = (v) => {
  const n = Number(v) || 0;
  return Math.abs(n) >= 1000 ? "$" + (n / 1000).toFixed(1) + "k" : "$" + fmt(n);
};

export const detectProfile = (income) => {
  const inc = Number(income) || 0;
  if (inc < 3000) return "low";
  if (inc < 10000) return "mid";
  return "high";
};

/**
 * Calcula el puntaje de salud patrimonial (0-100) y desglose por factores
 */
export const computeHealth = ({
  income = 0,
  fixed = 0,
  alloc = {},
  emerStock = 0,
  total = 100,
  disabled = {}
}) => {
  const inc = Number(income) || 0;
  const fxd = Number(fixed) || 0;
  const stock = Number(emerStock) || 0;
  const monthsCovered = fxd > 0 ? stock / fxd : 12;
  const factors = [];
  const isOff = (id) => !!disabled[id];

  // 1. Distribución Completa (12 pts)
  factors.push({
    label: "Distribución completa",
    score: total === 100 ? 12 : Math.max(0, 12 - Math.abs(total - 100)),
    max: 12
  });

  // 2. Capa de Defensa (18 pts)
  let def = 0;
  if (isOff("emer")) {
    def = 18; // Bucket desactivado manualmente
  } else if (monthsCovered >= 12) {
    def = 18;
  } else if (monthsCovered >= 6) {
    def = 14;
  } else if (monthsCovered >= 3) {
    def = 9;
  } else if ((alloc.emer || 0) >= 20) {
    def = 6;
  }
  factors.push({ label: "Defensa", score: def, max: 18 });

  // 3. Estructura Legal & Deuda (12 pts)
  let estr = 0;
  const fiscalActive = !isOff("fiscal");
  const deudaActive = !isOff("deuda");
  if (fiscalActive && deudaActive) {
    if ((alloc.fiscal || 0) >= 5 && (alloc.deuda || 0) >= 5) estr = 12;
    else if ((alloc.fiscal || 0) >= 5 || (alloc.deuda || 0) >= 5) estr = 8;
    else estr = 3;
  } else if (fiscalActive) {
    estr = (alloc.fiscal || 0) >= 5 ? 12 : 6;
  } else if (deudaActive) {
    estr = (alloc.deuda || 0) >= 5 ? 12 : 6;
  } else {
    estr = 12;
  }
  factors.push({ label: "Estructura legal", score: estr, max: 12 });

  // 4. Capa de Acumulación (22 pts)
  const acumActive = ["fija", "cripto", "refugio", "lp"].filter((id) => !isOff(id));
  const acum = acumActive.reduce((s, id) => s + (alloc[id] || 0), 0);
  let acumS = 0;
  if (acumActive.length === 0) acumS = 22;
  else if (acum >= 35) acumS = 22;
  else if (acum >= 25) acumS = 18;
  else if (acum >= 15) acumS = 12;
  else if (acum >= 5) acumS = 6;
  factors.push({ label: "Acumulación", score: acumS, max: 22 });

  // 5. Diversificación Real (12 pts)
  const divActive = acumActive.filter((id) => (alloc[id] || 0) >= 3).length;
  const divPossible = acumActive.length;
  let divS = 0;
  if (divPossible === 0) divS = 12;
  else if (divActive >= divPossible) divS = 12;
  else if (divActive >= Math.max(1, divPossible - 1)) divS = 9;
  else if (divActive >= Math.max(1, Math.floor(divPossible / 2))) divS = 5;
  else divS = 2;
  factors.push({ label: "Diversificación", score: divS, max: 12 });

  // 6. Reinversión en Trading (12 pts)
  let reinv = 0;
  if (isOff("trade")) reinv = 12;
  else if ((alloc.trade || 0) >= 8 && (alloc.trade || 0) <= 20) reinv = 12;
  else if ((alloc.trade || 0) > 20 && (alloc.trade || 0) <= 30) reinv = 8;
  else if ((alloc.trade || 0) > 30) reinv = 3;
  else reinv = 5;
  factors.push({ label: "Reinversión", score: reinv, max: 12 });

  // 7. Disciplina en Vida y Estilo (12 pts)
  let life = 0;
  if (isOff("life")) life = 12;
  else if ((alloc.life || 0) >= 10 && (alloc.life || 0) <= 20) life = 12;
  else if ((alloc.life || 0) <= 25) life = 9;
  else if ((alloc.life || 0) <= 30) life = 6;
  else life = 3;
  factors.push({ label: "Disciplina vida", score: life, max: 12 });

  let total_score = factors.reduce((a, f) => a + f.score, 0);
  const penalty = inc > 0 && fxd > 0 && inc < fxd ? 30 : 0;
  total_score = Math.max(0, total_score - penalty);

  return {
    score: Math.round(total_score),
    factors,
    penalty,
    grade:
      total_score >= 85
        ? "Óptimo"
        : total_score >= 70
        ? "Sólido"
        : total_score >= 50
        ? "Regular"
        : "Crítico"
  };
};

/**
 * Evalúa las reglas heurísticas de asignación patrimonial y emite alertas accionables
 */
export const evaluateRules = ({
  income = 0,
  fixed = 0,
  goal = 0,
  alloc = {},
  emerStock = 0,
  disabled = {}
}) => {
  const inc = Number(income) || 0;
  const fxd = Number(fixed) || 0;
  const gl = Number(goal) || 0;
  const stock = Number(emerStock) || 0;
  const alerts = [];
  const tip = (level, title, body, action) => alerts.push({ level, title, body, action });
  const isOff = (id) => !!disabled[id];

  if (fxd > 0 && inc > 0 && inc < fxd) {
    tip(
      "danger",
      "Ingreso menor que gastos fijos",
      `Ingreso ${fmtUSD(inc)} contra gastos ${fmtUSD(fxd)}. Plan no ejecutable este mes.`,
      "Usar fondo de emergencia • pausar inversiones • revisar costos"
    );
  }

  const monthsCov = fxd > 0 ? stock / fxd : 999;
  if (!isOff("emer") && fxd > 0 && monthsCov < 3) {
    tip(
      "warn",
      "Fondo de emergencia menor a 3 meses",
      `Cubre ${monthsCov.toFixed(1)} meses. Mínimo recomendado: 3 • Óptimo: 12.`,
      "Subir aporte a Emergencia hasta cubrir 12 meses de gastos"
    );
  } else if (!isOff("emer") && fxd > 0 && monthsCov < 12) {
    tip(
      "info",
      "Emergencia en zona segura mínima",
      `${monthsCov.toFixed(1)} meses cubiertos. Sobre el mínimo, por debajo del óptimo.`,
      "Mantener aporte hasta 12 meses, después rotar a Renta fija o LP"
    );
  }

  if (!isOff("deuda") && (alloc.deuda || 0) === 0) {
    tip(
      "info",
      "Sin aporte a liquidación de deuda",
      "La deuda familiar ($2,500 sin intereses) está activa. Liquidarla libera espacio mental y refuerza la disciplina.",
      "Asignar mínimo 5% al bucket de deuda hasta liquidar"
    );
  }

  if (!isOff("fiscal") && (alloc.fiscal || 0) < 5) {
    tip(
      "warn",
      "Reserva fiscal y legal subdotada",
      `${alloc.fiscal || 0}% no es suficiente. Regularización, trámites y asesoría contable requieren capital con tiempo.`,
      "Subir reserva fiscal a un rango de 5% a 10%"
    );
  }

  if (!isOff("cripto") && (alloc.cripto || 0) > 25) {
    tip(
      "warn",
      "Concentración alta en cripto",
      `${alloc.cripto}% en cripto excede la zona prudente. La volatilidad puede borrar 50%+ en meses.`,
      "Capear cripto en 20% • rotar exceso a Renta fija o LP"
    );
  }

  if (!isOff("trade") && (alloc.trade || 0) > 25) {
    tip(
      "warn",
      "Reinversión en trading muy alta",
      `${alloc.trade}% concentra riesgo en una sola fuente de ingresos. Sobre 25% genera fragilidad.`,
      "Ajustar entre 8% y 20% • rotar el exceso hacia Acumulación"
    );
  }

  const acumIds = ["fija", "cripto", "refugio", "lp"].filter((id) => !isOff(id));
  const acumTotal = acumIds.reduce((s, id) => s + (alloc[id] || 0), 0);
  if (inc >= 5000 && acumTotal < 25 && acumIds.length > 0) {
    tip(
      "info",
      "Capa de Acumulación subdimensionada",
      `Solo ${acumTotal}% en acumulación con un ingreso de ${fmtUSD(inc)}/mes.`,
      "Subir Acumulación a 30-40% moderando la capa de Vida si supera el 20%"
    );
  }

  if (!isOff("life") && inc >= 5000 && (alloc.life || 0) > 20) {
    tip(
      "info",
      "Lifestyle creep en zona de riesgo",
      `${alloc.life}% en vida con ingreso de ${fmtUSD(inc)}/mes. Sobre 20% absorbe patrimonio futuro.`,
      "Congelar este porcentaje y canalizar excedentes a inversión"
    );
  }

  if (!isOff("refugio") && (alloc.refugio || 0) === 0 && inc >= 5000) {
    tip(
      "info",
      "Sin cobertura de activos refugio",
      "Tener oro/refugio es cobertura mínima ante devaluaciones regionales y eventos sistémicos.",
      "Asignar 3-5% mínimo a Activos refugio (PAXG / físico)"
    );
  }

  if (!isOff("lp") && (alloc.lp || 0) === 0 && inc >= 5000) {
    tip(
      "info",
      "Sin asignación a largo plazo",
      "El patrimonio duradero se construye con horizonte 10+ años. Acumula hoy aunque ejecutes luego.",
      "Asignar 5-10% a Crecimiento LP"
    );
  }

  if (gl > 0) {
    const ahorroIds = ["emer", "fija", "cripto", "refugio", "lp", "opp"].filter((id) => !isOff(id));
    const ahorroPct = ahorroIds.reduce((s, id) => s + (alloc[id] || 0), 0);
    const ahorrado = (inc * ahorroPct) / 100;
    if (ahorrado < gl) {
      tip(
        "warn",
        "Meta de ahorro/inversión no cubierta",
        `Meta ${fmtUSD(gl)} • se ahorran ${fmtUSD(ahorrado)} este mes. Faltan ${fmtUSD(gl - ahorrado)}.`,
        "Recortar Vida y/o Reinversión hasta cubrir la meta proyectada"
      );
    } else {
      tip(
        "ok",
        "Meta cubierta con margen",
        `Destinas ${fmtUSD(ahorrado)} a acumulación + reservas (${fmtUSD(ahorrado - gl)} sobre la meta).`,
        null
      );
    }
  }

  return alerts;
};

/**
 * Calcula el plan de rendimiento e interés compuesto para un horizonte específico
 * FV = P*(1+r)^n + PMT * [((1+r)^n - 1) / r]
 */
export const calculateHorizonCompounding = ({
  initialCapital = 0,
  monthlyContribution = 0,
  annualRatePct = 0,
  years = 1
}) => {
  const p = Math.max(0, Number(initialCapital) || 0);
  const pmt = Math.max(0, Number(monthlyContribution) || 0);
  const rate = Math.max(0, Number(annualRatePct) || 0);
  const rAnnual = rate / 100;
  const rMonthly = rAnnual / 12;
  const n = Math.round(years * 12);

  let futureValue = p;
  const totalInvested = Math.round(p + pmt * n);

  if (rMonthly <= 0) {
    futureValue = totalInvested;
  } else {
    const factor = Math.pow(1 + rMonthly, n);
    const pGrowth = p * factor;
    const annuityGrowth = pmt * ((factor - 1) / rMonthly);
    futureValue = Math.round(pGrowth + annuityGrowth);
  }

  const interestEarned = Math.max(0, futureValue - totalInvested);
  const gainPct = totalInvested > 0 ? Math.round((interestEarned / totalInvested) * 100) : 0;
  const multiplier = totalInvested > 0 ? (futureValue / totalInvested).toFixed(2) : "1.00";

  return {
    years,
    months: n,
    totalInvested,
    interestEarned,
    futureValue,
    gainPct,
    multiplier
  };
};

/**
 * Genera el plan multi-horizonte (1, 3, 5 y 10 años) con interés compuesto
 */
export const generateCompoundPerformancePlan = ({
  initialCapital = 0,
  monthlyContribution = 0,
  annualRatePct = 0
}) => {
  const horizons = [1, 3, 5, 10];
  return horizons.map((yr) =>
    calculateHorizonCompounding({
      initialCapital,
      monthlyContribution,
      annualRatePct,
      years: yr
    })
  );
};
