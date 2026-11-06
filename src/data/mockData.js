// Empty initial state ready for real personal finance data

export const INITIAL_ACCOUNTS = [];
export const INITIAL_TRANSACTIONS = [];
export const INITIAL_SUBSCRIPTIONS = [];
export const INITIAL_DEBTS = [];

// Demo data available on-demand if the user wants to test with samples
export const DEMO_ACCOUNTS = [
  {
    id: 'acc-bank-bbva',
    name: 'BBVA Nómina Premier',
    institution: 'BBVA Private Banking',
    type: 'bank',
    balance: 48650.0,
    accountNumber: '•••• 4821',
    accentGradient: 'from-purple-600/40 via-indigo-700/30 to-slate-900/60',
    yieldRate: 3.5,
  },
  {
    id: 'acc-bank-nu',
    name: 'Bóveda Cajita Turbo',
    institution: 'Nu México Financiera',
    type: 'bank',
    balance: 92400.0,
    accountNumber: '•••• 9104',
    accentGradient: 'from-fuchsia-600/45 via-purple-700/35 to-violet-950/60',
    yieldRate: 14.25,
  },
  {
    id: 'acc-cash-main',
    name: 'Efectivo & Billetera Líquida',
    institution: 'Liquidez Física / Caja Chica',
    type: 'cash',
    balance: 8450.0,
    accountNumber: 'CASH-01',
    accentGradient: 'from-violet-500/35 via-purple-800/25 to-zinc-900/60',
  },
  {
    id: 'acc-credit-amex',
    name: 'Amex Platinum Credit',
    institution: 'American Express',
    type: 'credit',
    balance: -24890.0,
    creditLimit: 75000.0,
    cutOffDay: 18,
    paymentDueDay: 8,
    accountNumber: '•••• 3009',
    accentGradient: 'from-fuchsia-700/40 via-purple-900/45 to-black/75',
  },
];

export const DEMO_TRANSACTIONS = [
  {
    id: 'tx-101',
    title: 'Nómina Quincenal',
    amount: 42500,
    type: 'income',
    category: 'Salario / Nómina',
    accountId: 'acc-bank-bbva',
    date: '2026-11-01',
    notes: 'Depósito directo corporativo',
  },
  {
    id: 'tx-102',
    title: 'Renta Loft Residencial',
    amount: 14500,
    type: 'expense',
    category: 'Vivienda & Renta',
    accountId: 'acc-bank-bbva',
    date: '2026-11-03',
    notes: 'Transferencia mensual',
  },
];

export const DEMO_SUBSCRIPTIONS = [
  {
    id: 'sub-1',
    name: 'Renta Loft Residencial',
    category: 'Vivienda & Servicios',
    amount: 14500,
    billingDay: 3,
    accountId: 'acc-bank-bbva',
    active: true,
    essential: true,
    badgeColor: '#A855F7',
  },
];

export const DEMO_DEBTS = [
  {
    id: 'debt-1',
    title: 'Crédito Automotriz',
    counterparty: 'Financiera Automotriz',
    category: 'Crédito Automotriz',
    totalAmount: 185000,
    paidAmount: 118400,
    interestRate: 11.9,
    minimumMonthlyPayment: 6400,
    dueDate: '2027-08-15',
    payments: [],
  },
];

export const TIMEFRAME_CONFIG = {
  weekly: {
    label: 'Semanal',
    shortLabel: '7 Días',
    subtitle: 'Flujo de los últimos 7 días operativos',
    multiplier: 0.25,
    growthDelta: '+0.0%',
    series: [
      { label: 'Lun', income: 0, expense: 0, savings: 0 },
      { label: 'Mar', income: 0, expense: 0, savings: 0 },
      { label: 'Mié', income: 0, expense: 0, savings: 0 },
      { label: 'Jue', income: 0, expense: 0, savings: 0 },
      { label: 'Vie', income: 0, expense: 0, savings: 0 },
      { label: 'Sáb', income: 0, expense: 0, savings: 0 },
      { label: 'Dom', income: 0, expense: 0, savings: 0 },
    ],
  },
  monthly: {
    label: 'Mensual',
    shortLabel: 'Este Mes',
    subtitle: 'Consolidado del ciclo mensual',
    multiplier: 1,
    growthDelta: '+0.0%',
    series: [
      { label: 'Sem 1', income: 0, expense: 0, savings: 0 },
      { label: 'Sem 2', income: 0, expense: 0, savings: 0 },
      { label: 'Sem 3', income: 0, expense: 0, savings: 0 },
      { label: 'Sem 4', income: 0, expense: 0, savings: 0 },
    ],
  },
  quarterly: {
    label: 'Trimestral',
    shortLabel: 'Trimestre',
    subtitle: 'Consolidado trimestral operativo',
    multiplier: 3,
    growthDelta: '+0.0%',
    series: [
      { label: 'Mes 1', income: 0, expense: 0, savings: 0 },
      { label: 'Mes 2', income: 0, expense: 0, savings: 0 },
      { label: 'Mes 3', income: 0, expense: 0, savings: 0 },
    ],
  },
  yearly: {
    label: 'Anual',
    shortLabel: 'Anual',
    subtitle: 'Ejercicio fiscal anual',
    multiplier: 12,
    growthDelta: '+0.0%',
    series: [
      { label: 'Ene', income: 0, expense: 0, savings: 0 },
      { label: 'Feb', income: 0, expense: 0, savings: 0 },
      { label: 'Mar', income: 0, expense: 0, savings: 0 },
      { label: 'Abr', income: 0, expense: 0, savings: 0 },
      { label: 'May', income: 0, expense: 0, savings: 0 },
      { label: 'Jun', income: 0, expense: 0, savings: 0 },
      { label: 'Jul', income: 0, expense: 0, savings: 0 },
      { label: 'Ago', income: 0, expense: 0, savings: 0 },
      { label: 'Sep', income: 0, expense: 0, savings: 0 },
      { label: 'Oct', income: 0, expense: 0, savings: 0 },
      { label: 'Nov', income: 0, expense: 0, savings: 0 },
      { label: 'Dic', income: 0, expense: 0, savings: 0 },
    ],
  },
};

export const CATEGORY_COLORS = {
  'Salario / Nómina': '#A855F7',
  'Consultoría & Freelance': '#C084FC',
  'Rendimientos & Dividendos': '#34D399',
  'Vivienda & Renta': '#9333EA',
  'Supermercado & Despensa': '#A855F7',
  'Restaurantes & Café (Hormiga)': '#F43F5E',
  'Transporte & Movilidad': '#D946EF',
  'Suscripciones Digitales': '#8B5CF6',
  'Salud & Fitness': '#C084FC',
  'Entretenimiento & Ocio': '#EC4899',
  'Compras & Tecnología': '#6366F1',
  'Abono a Deuda / TDC': '#38BDF8',
};

export const INCOME_CATEGORIES = [
  'Salario / Nómina',
  'Consultoría & Freelance',
  'Rendimientos & Dividendos',
];

export const EXPENSE_CATEGORIES = [
  'Vivienda & Renta',
  'Supermercado & Despensa',
  'Restaurantes & Café (Hormiga)',
  'Transporte & Movilidad',
  'Suscripciones Digitales',
  'Salud & Fitness',
  'Entretenimiento & Ocio',
  'Compras & Tecnología',
  'Abono a Deuda / TDC',
];

export const DEFAULT_USD_COP_RATE = 4150; // Tasa de cambio base: 1 USD = 4,150 COP

export const formatCurrency = (
  valueInUSD,
  currency = 'USD',
  rate = DEFAULT_USD_COP_RATE,
  showCode = true
) => {
  const num = Number(valueInUSD) || 0;
  const isNegative = num < 0;
  const absVal = Math.abs(num);

  if (currency === 'COP') {
    const copVal = Math.round(absVal * rate);
    const formatted = new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(copVal);
    const result = isNegative ? `-${formatted}` : formatted;
    return showCode ? `${result} COP` : result;
  }

  // Moneda Principal: USD
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: Math.abs(num % 1) > 0 ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(absVal);
  const result = isNegative ? `-${formatted}` : formatted;
  return showCode ? `${result} USD` : result;
};

export const formatSecondaryCurrency = (
  valueInUSD,
  activeCurrency = 'USD',
  rate = DEFAULT_USD_COP_RATE
) => {
  const targetCurrency = activeCurrency === 'USD' ? 'COP' : 'USD';
  return formatCurrency(valueInUSD, targetCurrency, rate, true);
};
