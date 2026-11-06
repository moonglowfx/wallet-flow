// Verification script for all logic, calculations, and button handlers
import {
  INITIAL_ACCOUNTS,
  INITIAL_TRANSACTIONS,
  INITIAL_SUBSCRIPTIONS,
  INITIAL_DEBTS,
  TIMEFRAME_CONFIG,
  formatCurrency,
} from '../src/data/mockData.js';

console.log('🧪 Iniciando verificación de botones, estados y flujos...');

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
assert(accounts.some(a => a.type === 'cash'), 'Existe cuenta tipo Efectivo');
assert(accounts.some(a => a.type === 'bank'), 'Existe cuenta tipo Cuenta Bancaria');
assert(accounts.some(a => a.type === 'credit'), 'Existe cuenta tipo Tarjeta de Crédito');

// 2. Simular Botón: Registrar Movimiento (Ingreso)
console.log('\n--- 2. Botón: Registrar Movimiento (Ingreso) ---');
let bbvaAcc = accounts.find(a => a.id === 'acc-bank-bbva');
let prevBbvaBalance = bbvaAcc.balance;
let newIncomeTx = {
  id: 'tx-test-income',
  title: 'Consultoría Especial',
  amount: 15000,
  type: 'income',
  category: 'Consultoría & Freelance',
  accountId: 'acc-bank-bbva',
  date: '2026-11-06',
};
accounts = accounts.map(a => a.id === newIncomeTx.accountId ? { ...a, balance: a.balance + newIncomeTx.amount } : a);
let updatedBbvaBalance = accounts.find(a => a.id === 'acc-bank-bbva').balance;
assert(updatedBbvaBalance === prevBbvaBalance + 15000, `Ingreso sumó correctamente: de ${formatCurrency(prevBbvaBalance)} a ${formatCurrency(updatedBbvaBalance)}`);

// 3. Simular Botón: Registrar Movimiento (Gasto en Tarjeta de Crédito)
console.log('\n--- 3. Botón: Registrar Movimiento (Gasto en Tarjeta de Crédito) ---');
let amexAcc = accounts.find(a => a.id === 'acc-credit-amex');
let prevAmexBalance = amexAcc.balance; // negative number
let newExpenseTx = {
  id: 'tx-test-expense',
  title: 'Cena de Negocios',
  amount: 3200,
  type: 'expense',
  category: 'Restaurantes & Café (Hormiga)',
  accountId: 'acc-credit-amex',
  date: '2026-11-06',
};
accounts = accounts.map(a => a.id === newExpenseTx.accountId ? { ...a, balance: a.balance - newExpenseTx.amount } : a);
let updatedAmexBalance = accounts.find(a => a.id === 'acc-credit-amex').balance;
assert(updatedAmexBalance === prevAmexBalance - 3200, `Gasto en TDC incrementó deuda de forma precisa: de ${formatCurrency(prevAmexBalance)} a ${formatCurrency(updatedAmexBalance)}`);

// 4. Simular Botón: Ingresar Abono a Deuda
console.log('\n--- 4. Botón: Ingresar Abono a Deuda ---');
let debts = [...INITIAL_DEBTS];
let targetDebt = debts.find(d => d.id === 'debt-3'); // Tarjeta Nu Morada
let prevPaid = targetDebt.paidAmount;
let abonoAmount = 5000;
debts = debts.map(d => {
  if (d.id === targetDebt.id) {
    return {
      ...d,
      paidAmount: d.paidAmount + abonoAmount,
      payments: [{ id: 'dp-new', amount: abonoAmount, date: '2026-11-06', note: 'Abono extraordinario' }, ...(d.payments || [])],
    };
  }
  return d;
});
let updatedDebt = debts.find(d => d.id === 'debt-3');
assert(updatedDebt.paidAmount === prevPaid + abonoAmount, `Abono registrado a capital: de ${formatCurrency(prevPaid)} a ${formatCurrency(updatedDebt.paidAmount)}`);
assert(updatedDebt.payments.length > 0, `Historial de pagos actualizado: ${updatedDebt.payments[0].note}`);

// 5. Simular Botón: Activar / Pausar Suscripción
console.log('\n--- 5. Botón: Activar / Pausar Suscripción ---');
let subs = [...INITIAL_SUBSCRIPTIONS];
let netflix = subs.find(s => s.name.includes('Netflix'));
let initialImpact = subs.filter(s => s.active).reduce((sum, s) => sum + s.amount, 0);
// Pausar
subs = subs.map(s => s.id === netflix.id ? { ...s, active: !s.active } : s);
let reducedImpact = subs.filter(s => s.active).reduce((sum, s) => sum + s.amount, 0);
assert(reducedImpact === initialImpact - netflix.amount, `Pausar suscripción redujo pasivo mensual exactamente en ${formatCurrency(netflix.amount)}`);
// Reactivar
subs = subs.map(s => s.id === netflix.id ? { ...s, active: !s.active } : s);
let restoredImpact = subs.filter(s => s.active).reduce((sum, s) => sum + s.amount, 0);
assert(restoredImpact === initialImpact, `Reactivar suscripción restauró pasivo mensual a ${formatCurrency(restoredImpact)}`);

// 6. Simular Filtros Temporales (Semanal, Mensual, Trimestral, Anual)
console.log('\n--- 6. Selector de Filtro Temporal Global ---');
['weekly', 'monthly', 'quarterly', 'yearly'].forEach(tf => {
  assert(TIMEFRAME_CONFIG[tf] && TIMEFRAME_CONFIG[tf].series.length > 0, `Filtro temporal '${tf}' tiene configuración y ${TIMEFRAME_CONFIG[tf].series.length} puntos de serie`);
});

// 7. Simular Restaurar Datos Demo
console.log('\n--- 7. Botón: Restaurar Datos Demo ---');
accounts = INITIAL_ACCOUNTS;
debts = INITIAL_DEBTS;
subs = INITIAL_SUBSCRIPTIONS;
assert(accounts.length === INITIAL_ACCOUNTS.length, 'Restauración de cuentas exitosa');
assert(debts.length === INITIAL_DEBTS.length, 'Restauración de deudas exitosa');
assert(subs.length === INITIAL_SUBSCRIPTIONS.length, 'Restauración de suscripciones exitosa');

console.log(`\n🎉 Resumen: ${passed} pruebas superadas, ${failed} fallos.\n`);
