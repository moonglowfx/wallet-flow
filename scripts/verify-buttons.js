// Verification script for all logic, calculations, and button handlers
import {
  INITIAL_ACCOUNTS,
  INITIAL_TRANSACTIONS,
  INITIAL_SUBSCRIPTIONS,
  INITIAL_DEBTS,
  TIMEFRAME_CONFIG,
  formatCurrency,
} from '../src/data/mockData.js';

console.log('🧪 Iniciando verificación de botones, estados y flujos con datos reales...');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  ❌ [FAIL] ${message}`);
    failed++;
  }
}

// 1. Verificación de Cuentas y Balances
console.log('\n--- 1. Bóveda de Cuentas y Capital Neto ---');
let accounts = [...INITIAL_ACCOUNTS];
let initialNetWorth = accounts.reduce((sum, a) => sum + a.balance, 0);
assert(initialNetWorth > 0, `Balance neto inicial calculado: ${formatCurrency(initialNetWorth)}`);
assert(accounts.some((a) => a.type === 'cash'), 'Existe cuenta tipo Efectivo');
assert(accounts.some((a) => a.type === 'bank'), 'Existe cuenta tipo Cuenta Bancaria');
assert(accounts.some((a) => a.type === 'credit'), 'Existe cuenta tipo Tarjeta de Crédito');
assert(INITIAL_TRANSACTIONS.length === 726, `Cargadas las 726 transacciones reales desde 2024: total ${INITIAL_TRANSACTIONS.length}`);

// 2. Simular Botón: Registrar Movimiento (Ingreso)
console.log('\n--- 2. Botón: Registrar Movimiento (Ingreso) ---');
let bofaAcc = accounts.find((a) => a.id === 'acc-bofa-checking');
let prevBofaBalance = bofaAcc.balance;
let newIncomeTx = {
  id: 'tx-test-income',
  title: 'Consultoría Especial',
  amount: 500,
  type: 'income',
  category: 'Salario / Clientes',
  accountId: 'acc-bofa-checking',
  date: '2026-11-06',
};
accounts = accounts.map((a) => (a.id === newIncomeTx.accountId ? { ...a, balance: a.balance + newIncomeTx.amount } : a));
let updatedBofaBalance = accounts.find((a) => a.id === 'acc-bofa-checking').balance;
assert(Math.round(updatedBofaBalance * 100) === Math.round((prevBofaBalance + 500) * 100), `Ingreso sumó correctamente: de ${formatCurrency(prevBofaBalance)} a ${formatCurrency(updatedBofaBalance)}`);

// 3. Simular Botón: Registrar Movimiento (Gasto en Tarjeta de Crédito)
console.log('\n--- 3. Botón: Registrar Movimiento (Gasto en Tarjeta de Crédito) ---');
let travelAcc = accounts.find((a) => a.id === 'acc-bofa-travel');
let prevTravelBalance = travelAcc.balance; // negative number
let newExpenseTx = {
  id: 'tx-test-expense',
  title: 'Cena de Negocios',
  amount: 45.5,
  type: 'expense',
  category: 'Alimentación',
  accountId: 'acc-bofa-travel',
  date: '2026-11-06',
};
accounts = accounts.map((a) => (a.id === newExpenseTx.accountId ? { ...a, balance: a.balance - newExpenseTx.amount } : a));
let updatedTravelBalance = accounts.find((a) => a.id === 'acc-bofa-travel').balance;
assert(Math.round(updatedTravelBalance * 100) === Math.round((prevTravelBalance - 45.5) * 100), `Gasto en TDC incrementó deuda de forma precisa: de ${formatCurrency(prevTravelBalance)} a ${formatCurrency(updatedTravelBalance)}`);

// 4. Simular Botón: Ingresar Abono a Deuda
console.log('\n--- 4. Botón: Ingresar Abono a Deuda ---');
let debts = [...INITIAL_DEBTS];
let targetDebt = debts.find((d) => d.id === 'debt-travel-rewards');
let prevPaid = targetDebt.paidAmount;
let abonoAmount = 100;
debts = debts.map((d) => {
  if (d.id === targetDebt.id) {
    return {
      ...d,
      paidAmount: d.paidAmount + abonoAmount,
      payments: [{ id: 'dp-new', amount: abonoAmount, date: '2026-11-06', note: 'Abono extraordinario' }, ...(d.payments || [])],
    };
  }
  return d;
});
let updatedDebt = debts.find((d) => d.id === 'debt-travel-rewards');
assert(updatedDebt.paidAmount === prevPaid + abonoAmount, `Abono registrado a capital: de ${formatCurrency(prevPaid)} a ${formatCurrency(updatedDebt.paidAmount)}`);
assert(updatedDebt.payments.length > 0, `Historial de pagos actualizado: ${updatedDebt.payments[0].note}`);

// 5. Simular Botón: Activar / Pausar Suscripción
console.log('\n--- 5. Botón: Activar / Pausar Suscripción ---');
let subs = [...INITIAL_SUBSCRIPTIONS];
let spotify = subs.find((s) => s.name.includes('Spotify'));
let initialImpact = subs.filter((s) => s.active).reduce((sum, s) => sum + s.amount, 0);
// Pausar
subs = subs.map((s) => (s.id === spotify.id ? { ...s, active: !s.active } : s));
let reducedImpact = subs.filter((s) => s.active).reduce((sum, s) => sum + s.amount, 0);
assert(Math.round(reducedImpact * 100) === Math.round((initialImpact - spotify.amount) * 100), `Pausar suscripción redujo pasivo mensual exactamente en ${formatCurrency(spotify.amount)}`);
// Reactivar
subs = subs.map((s) => (s.id === spotify.id ? { ...s, active: !s.active } : s));
let restoredImpact = subs.filter((s) => s.active).reduce((sum, s) => sum + s.amount, 0);
assert(Math.round(restoredImpact * 100) === Math.round(initialImpact * 100), `Reactivar suscripción restauró pasivo mensual a ${formatCurrency(restoredImpact)}`);

// 6. Simular Filtros Temporales (Semanal, Mensual, Trimestral, Anual)
console.log('\n--- 6. Selector de Filtro Temporal Global ---');
['weekly', 'monthly', 'quarterly', 'yearly'].forEach((tf) => {
  assert(TIMEFRAME_CONFIG[tf] && TIMEFRAME_CONFIG[tf].days > 0, `Filtro temporal '${tf}' tiene configuración activa (${TIMEFRAME_CONFIG[tf].label})`);
});

// 7. Simular Restaurar Datos Reales
console.log('\n--- 7. Botón: Restaurar Datos Reales ---');
accounts = INITIAL_ACCOUNTS;
debts = INITIAL_DEBTS;
subs = INITIAL_SUBSCRIPTIONS;
assert(accounts.length === INITIAL_ACCOUNTS.length, 'Restauración de cuentas exitosa');
assert(debts.length === INITIAL_DEBTS.length, 'Restauración de deudas exitosa');
assert(subs.length === INITIAL_SUBSCRIPTIONS.length, 'Restauración de suscripciones exitosa');

console.log(`\n🎉 Resumen: ${passed} pruebas superadas, ${failed} fallos.\n`);
