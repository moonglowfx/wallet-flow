// Constantes y utilidades financieras compartidas (formato, conversión de divisas y filtros por período).
export const TIMEFRAME_CONFIG = {
  weekly: {
    label: 'Esta Semana',
    shortLabel: 'Semanal',
    days: 7,
    series: [
      { label: 'Lun', income: 0, expense: 45 },
      { label: 'Mar', income: 150, expense: 80 },
      { label: 'Mié', income: 0, expense: 60 },
      { label: 'Jue', income: 300, expense: 120 },
      { label: 'Vie', income: 50, expense: 95 },
      { label: 'Sáb', income: 0, expense: 140 },
      { label: 'Dom', income: 0, expense: 30 },
    ],
  },
  monthly: {
    label: 'Este Mes',
    shortLabel: 'Mensual',
    days: 30,
    series: [
      { label: 'Día 1-7', income: 280, expense: 118 },
      { label: 'Día 8-14', income: 0, expense: 0 },
      { label: 'Día 15-21', income: 0, expense: 0 },
      { label: 'Día 22+', income: 0, expense: 0 },
    ],
  },
  quarterly: {
    label: 'Último Trimestre',
    shortLabel: 'Trimestral',
    days: 90,
    series: [
      { label: 'Sep', income: 420, expense: 580 },
      { label: 'Oct', income: 912, expense: 1232 },
      { label: 'Nov', income: 280, expense: 118 },
    ],
  },
  yearly: {
    label: 'Año en Curso',
    shortLabel: 'Anual',
    days: 365,
    series: [
      { label: 'Q1 (Ene-Mar)', income: 3649, expense: 2151 },
      { label: 'Q2 (Abr-Jun)', income: 10116, expense: 11136 },
      { label: 'Q3 (Jul-Sep)', income: 2924, expense: 2614 },
      { label: 'Q4 (Oct-Nov)', income: 920, expense: 779 },
    ],
  },
};

export const CATEGORY_COLORS = {
  'Alimentación': '#A855F7',
  'Suscripciones': '#EC4899',
  'Transporte': '#06B6D4',
  'Inversión & Educación': '#10B981',
  'Salario / Clientes': '#34D399',
  'Viajes & Ocio': '#F59E0B',
  'Mascotas': '#8B5CF6',
  'Estilo de Vida': '#F43F5E',
  'Salud & Cuidado': '#14B8A6',
  'Entretenimiento & Gaming': '#6366F1',
  'Compras & Envíos': '#EAB308',
  'Regalos & Familia': '#FB7185',
  'Ropa & Calzado': '#38BDF8',
  'Herramientas de Trabajo': '#64748B',
  'Hogar & Alojamiento': '#D946EF',
  'Transferencias': '#94A3B8',
  'Otros': '#71717A',
};

export const INCOME_CATEGORIES = [
  'Salario / Clientes',
  'Trading & Inversiones',
  'Devoluciones / Reembolsos',
  'Cobro de Deudas',
  'Transferencias & Cambio',
  'Otros Ingresos',
];

export const EXPENSE_CATEGORIES = [
  'Alimentación',
  'Suscripciones',
  'Transporte',
  'Inversión & Educación',
  'Viajes & Ocio',
  'Mascotas',
  'Estilo de Vida',
  'Salud & Cuidado',
  'Entretenimiento & Gaming',
  'Compras & Envíos',
  'Regalos & Familia',
  'Ropa & Calzado',
  'Herramientas de Trabajo',
  'Hogar & Alojamiento',
  'Transferencias & Cambio',
  'Otros',
];

export const DEFAULT_USD_COP_RATE = 3200; // Tasa de cambio base predeterminada: 1 USD = 3,200 COP

/**
 * Formatea un monto que ya está expresado en su moneda nativa (USD o COP)
 * SIN hacer doble cambio de moneda para evitar variaciones por redondeo.
 */
export const formatNativeCurrency = (value, currency = 'USD', showCode = true) => {
  const num = Number(value) || 0;
  const isNegative = num < 0;
  const absVal = Math.abs(num);
  const cur = (currency || 'USD').toUpperCase();

  if (cur === 'COP') {
    const copVal = Math.round(absVal);
    const formatted = new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(copVal);
    const result = isNegative ? `-${formatted}` : formatted;
    return showCode ? `${result} COP` : result;
  }

  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: Math.abs(num % 1) > 0 ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(absVal);
  const result = isNegative ? `-${formatted}` : formatted;
  return showCode ? `${result} USD` : result;
};

/**
 * Convierte un monto desde su moneda de origen (fromCurrency) hacia la moneda destino (toCurrency)
 * aplicando una única operación limpia cuando las monedas son distintas, y cero conversión si son iguales.
 */
export const convertAmount = (amount, fromCurrency = 'USD', toCurrency = 'USD', rate = DEFAULT_USD_COP_RATE) => {
  const num = Number(amount) || 0;
  const from = (fromCurrency || 'USD').toUpperCase();
  const to = (toCurrency || 'USD').toUpperCase();
  const safeRate = Number(rate) > 0 ? Number(rate) : DEFAULT_USD_COP_RATE;

  if (from === to) return num;
  if (from === 'USD' && to === 'COP') return Math.round(num * safeRate);
  if (from === 'COP' && to === 'USD') return Math.round((num / safeRate) * 100) / 100;
  return num;
};

/**
 * Formatea una cuenta o movimiento respetando su moneda nativa si coincide con la vista,
 * o evitando el doble cambio de moneda (nunca hace COP -> USD -> COP).
 */
export const formatAccountBalance = (
  balance,
  accountCurrency = 'USD',
  displayCurrency = null,
  rate = DEFAULT_USD_COP_RATE,
  showCode = true
) => {
  const nativeCur = (accountCurrency || 'USD').toUpperCase();
  // Si no se fuerza moneda de visualización, mostramos en la moneda nativa de la cuenta (Pesos o Dólares separados)
  if (!displayCurrency || displayCurrency.toUpperCase() === nativeCur) {
    return formatNativeCurrency(balance, nativeCur, showCode);
  }
  const converted = convertAmount(balance, nativeCur, displayCurrency, rate);
  return formatNativeCurrency(converted, displayCurrency, showCode);
};

export const formatCurrency = (
  valueInUSD,
  currency = 'USD',
  rate = DEFAULT_USD_COP_RATE,
  showCode = true,
  sourceCurrency = 'USD'
) => {
  const srcCur = (sourceCurrency || 'USD').toUpperCase();
  const targetCur = (currency || 'USD').toUpperCase();

  // Si la fuente ya está en la misma moneda que se desea mostrar, NO hacemos ningún cambio de moneda
  if (srcCur === targetCur) {
    return formatNativeCurrency(valueInUSD, targetCur, showCode);
  }

  const converted = convertAmount(valueInUSD, srcCur, targetCur, rate);
  return formatNativeCurrency(converted, targetCur, showCode);
};

export const formatSecondaryCurrency = (
  value,
  activeCurrency = 'USD',
  rate = DEFAULT_USD_COP_RATE,
  sourceCurrency = null
) => {
  const srcCur = (sourceCurrency || activeCurrency || 'USD').toUpperCase();
  const targetCurrency = activeCurrency === 'USD' ? 'COP' : 'USD';
  return formatCurrency(value, targetCurrency, rate, true, srcCur);
};

/**
 * Filtro universal y ultra-rápido de movimientos por período y año.
 * Se aplica en tiempo real de forma sincronizada en todas las secciones de la app.
 */
export function filterTransactionsByPeriod(transactions = [], timeframe = 'monthly', selectedYear = '2026') {
  if (!transactions || transactions.length === 0) return [];

  // Filtrado base por año (o todos los años si es 'all')
  let baseTxs = transactions;
  if (selectedYear && selectedYear !== 'all') {
    const yrStr = String(selectedYear);
    baseTxs = transactions.filter((t) => t.date && t.date.startsWith(yrStr));
  }

  if (baseTxs.length === 0) return [];

  if (timeframe === 'yearly') {
    return baseTxs;
  }

  // Hallar fecha más reciente en este lote sin crear arrays ni objetos pesados
  let latestDateStr = baseTxs[0]?.date || '';
  for (let i = 1; i < baseTxs.length; i++) {
    if (baseTxs[i].date && baseTxs[i].date > latestDateStr) {
      latestDateStr = baseTxs[i].date;
    }
  }

  if (!latestDateStr) return baseTxs;

  const [yStr, mStr, dStr] = latestDateStr.split('-');
  const y = parseInt(yStr, 10);
  const m = parseInt(mStr, 10);
  const d = parseInt(dStr, 10);
  const refDate = new Date(y, m - 1, d);

  if (timeframe === 'monthly') {
    const refMonthPrefix = `${yStr}-${mStr}`;
    return baseTxs.filter((t) => t.date && t.date.startsWith(refMonthPrefix));
  }

  if (timeframe === 'weekly') {
    const day = refDate.getDay();
    const diffToMonday = day === 0 ? 6 : day - 1;
    const monday = new Date(refDate);
    monday.setDate(refDate.getDate() - diffToMonday);
    const monthStart = new Date(y, m - 1, 1);
    const effectiveStart = monday < monthStart ? monthStart : monday;
    const pad = (n) => String(n).padStart(2, '0');
    const wStartStr = `${effectiveStart.getFullYear()}-${pad(effectiveStart.getMonth() + 1)}-${pad(effectiveStart.getDate())}`;
    return baseTxs.filter((t) => t.date && t.date >= wStartStr && t.date <= latestDateStr);
  }

  if (timeframe === 'quarterly') {
    const qStart = new Date(refDate);
    qStart.setDate(qStart.getDate() - 90);
    const qStartStr = `${qStart.getFullYear()}-${String(qStart.getMonth() + 1).padStart(2, '0')}-${String(qStart.getDate()).padStart(2, '0')}`;
    return baseTxs.filter((t) => t.date && t.date >= qStartStr && t.date <= latestDateStr);
  }

  return baseTxs;
}

/**
 * Validador bidireccional y robusto de cobros de suscripciones en un mes dado.
 * Evita falsos positivos con títulos cortos o emojis y garantiza detección exacta.
 */
export function isSubscriptionChargedInMonth(sub, transactions = [], monthPrefix) {
  if (!sub || !transactions || transactions.length === 0) return false;
  const targetPrefix = monthPrefix || new Date().toISOString().slice(0, 7);
  const cleanSubName = (sub.name || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .trim();

  return transactions.some((tx) => {
    if (!tx.date || !tx.date.startsWith(targetPrefix)) return false;
    if (tx.subscriptionId && tx.subscriptionId === sub.id) return true;
    if (tx.id === `auto-sub-${sub.id}-${targetPrefix}`) return true;

    const cleanTxTitle = (tx.title || '')
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, '')
      .trim();

    if (cleanTxTitle.length < 3 || cleanSubName.length < 3) return false;

    if (cleanTxTitle === cleanSubName) return true;
    if (cleanTxTitle.includes(cleanSubName) || cleanSubName.includes(cleanTxTitle)) return true;

    return false;
  });
}

/** Identificador único e impredecible para entidades creadas en el cliente (evita colisiones entre dispositivos). */
export function createId(prefix) {
  const unique =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
  return `${prefix}-${unique}`;
}

/** Fecha local de hoy en formato YYYY-MM-DD (toISOString usa UTC y adelanta el día por la noche en América). */
export function todayLocalISO(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
