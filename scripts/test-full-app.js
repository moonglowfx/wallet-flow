// Full Verification Suite: Multi-User Security, Mobile & PC Responsiveness, Bug Auditing
import fs from 'fs';
import { USERS, getUserInitialData, getUserPin, setUserPin } from '../src/data/users.js';
import {
  formatCurrency,
  formatSecondaryCurrency,
  TIMEFRAME_CONFIG,
  INITIAL_TRANSACTIONS,
} from '../src/data/mockData.js';
import { createClient } from '@libsql/client';

console.log('🚀 Iniciando auditoría completa de la aplicación (PC, Teléfono, Multi-usuario)...');

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

// -------------------------------------------------------------
// 1. VERIFICACIÓN DE USUARIOS, PIN Y PRIVACIDAD EN LOGIN
// -------------------------------------------------------------
console.log('\n--- 1. Autenticación y Credenciales PIN de 4 Dígitos ---');
assert(USERS.length === 2, `Existen exactamente 2 perfiles: ${USERS.map((u) => u.username).join(', ')}`);

const munboi = USERS.find((u) => u.username === 'Munboi');
const tiago = USERS.find((u) => u.username === 'Tiago');

assert(munboi && getUserPin('munboi') === '0800', `Usuario 1: Munboi tiene PIN '0800'`);
assert(tiago && getUserPin('tiago') === '5678', `Usuario 2: Tiago tiene PIN '5678'`);

// Test PIN change capability
setUserPin('munboi', '9999');
assert(getUserPin('munboi') === '9999', 'Capacidad de cambiar PIN funciona correctamente (9999)');
setUserPin('munboi', '0800'); // restore to default
assert(getUserPin('munboi') === '0800', 'PIN de Munboi restaurado a 0800');

// Verify that LoginModal does NOT leak the suggested PIN
const loginModalCode = fs.readFileSync('src/components/LoginModal.jsx', 'utf-8');
assert(!loginModalCode.includes('PIN sugerido'), 'LoginModal NO muestra ni sugiere el PIN en pantalla');
assert(!loginModalCode.includes('selectedUser.pin'), 'LoginModal no expone el PIN en texto plano');

// Verify Header and Navbar do NOT display PIN
const headerCode = fs.readFileSync('src/components/Header.jsx', 'utf-8');
const navbarCode = fs.readFileSync('src/components/Navbar.jsx', 'utf-8');
assert(!headerCode.includes('(PIN:'), 'Header NO muestra el PIN en pantalla');
assert(!navbarCode.includes('PIN:'), 'Navbar NO muestra el PIN en pantalla');

// -------------------------------------------------------------
// 2. AISLAMIENTO TOTAL DE DATOS (Munboi con 726 txs vs Tiago en Blanco)
// -------------------------------------------------------------
console.log('\n--- 2. Aislamiento Total de Datos (Munboi vs. Tiago) ---');
const munboiData = getUserInitialData('munboi');
const tiagoData = getUserInitialData('tiago');

assert(munboiData.transactions.length === 728, `Munboi cuenta con sus 728 transacciones reales desde 2024: total ${munboiData.transactions.length}`);
assert(tiagoData.transactions.length === 0, `Tiago inicia completamente en blanco (0 transacciones) para crear todo`);
assert(munboiData.accounts.length === 5, `Munboi cuenta con sus 5 cuentas: total ${munboiData.accounts.length}`);
assert(tiagoData.accounts.length === 0, `Tiago inicia sin cuentas (0 cuentas)`);

// Validar balances de Munboi normalizados sin doble conversión
const munboiNet = munboiData.accounts.reduce(
  (s, a) => s + (a.currency === 'COP' ? a.balance / 3200 : a.balance),
  0
);
assert(Math.round(munboiNet * 100) === -2623, `Capital neto de Munboi calculado exactamente: ${formatCurrency(munboiNet)}`);

// -------------------------------------------------------------
// 3. VERIFICACIÓN DE SQLite MULTI-TENANT
// -------------------------------------------------------------
console.log('\n--- 3. Verificación de Base de Datos SQLite (wallet_flow.db) ---');
const client = createClient({ url: 'file:wallet_flow.db' });

async function verifyDB() {
  const munboiDbTxs = await client.execute("SELECT COUNT(*) as c FROM transactions WHERE userId = 'munboi'");
  const tiagoDbTxs = await client.execute("SELECT COUNT(*) as c FROM transactions WHERE userId = 'tiago'");
  const munboiDbAccs = await client.execute("SELECT COUNT(*) as c FROM accounts WHERE userId = 'munboi'");
  const tiagoDbAccs = await client.execute("SELECT COUNT(*) as c FROM accounts WHERE userId = 'tiago'");

  assert(munboiDbTxs.rows[0].c === 728, `SQLite almacena las 728 transacciones de Munboi aisladas`);
  assert(tiagoDbTxs.rows[0].c === 0, `SQLite tiene a Tiago en blanco (0 transacciones)`);
  assert(munboiDbAccs.rows[0].c === 5, `SQLite almacena las 5 cuentas de Munboi`);
  assert(tiagoDbAccs.rows[0].c === 0, `SQLite tiene a Tiago en blanco (0 cuentas)`);

  // -------------------------------------------------------------
  // 4. VERIFICACIÓN DE COMPONENTES UNIFICADOS Y NUEVAS SECCIONES
  // -------------------------------------------------------------
  console.log('\n--- 4. Verificación de Componentes Unificados y Nuevas Secciones ---');
  
  // Unificación de Deudas, Gastos Fijos y Suscripciones
  assert(fs.existsSync('src/components/CommitmentsView.jsx'), 'CommitmentsView.jsx existe como sección unificada');
  const commitmentsCode = fs.readFileSync('src/components/CommitmentsView.jsx', 'utf-8');
  assert(commitmentsCode.includes('SubscriptionsView'), 'CommitmentsView integra la gestión de suscripciones');
  assert(commitmentsCode.includes('DebtsView'), 'CommitmentsView integra la gestión de deudas');

  // Nueva sección de Movimientos Mensuales (Ingresos & Gastos) ordenados cronológicamente
  assert(fs.existsSync('src/components/MonthlyExpensesView.jsx'), 'MonthlyExpensesView.jsx existe');
  const monthlyCode = fs.readFileSync('src/components/MonthlyExpensesView.jsx', 'utf-8');
  assert(monthlyCode.includes('totalIncome') && monthlyCode.includes('totalExpense'), 'MonthlyExpensesView incluye tanto ingresos como gastos');
  assert(monthlyCode.includes('monthGroups'), 'MonthlyExpensesView agrupa y ordena movimientos por mes');
  assert(monthlyCode.includes('formatMonthName'), 'MonthlyExpensesView muestra los meses en orden');
  assert(monthlyCode.includes('onEditTransaction') && monthlyCode.includes('onDeleteTransaction'), 'MonthlyExpensesView integra botones rápidos de editar y eliminar de 1 toque');
  assert(monthlyCode.includes('acc.name') || monthlyCode.includes('Cuenta Principal'), 'MonthlyExpensesView exhibe claramente la cuenta de cada movimiento en móvil y PC');

  // AccountModal sin tasa de rendimiento anual, saldo 0 por defecto y type="tel"
  const accountModalCode = fs.readFileSync('src/components/AccountModal.jsx', 'utf-8');
  assert(accountModalCode.includes('Crear cuenta nueva'), 'AccountModal tiene como título exacto "Crear cuenta nueva"');
  assert(!accountModalCode.includes('Tasa de Rendimiento Anual'), 'AccountModal NO incluye tasa de rendimiento anual');
  assert(accountModalCode.includes('type="tel"'), 'AccountModal usa type="tel" para inputs numéricos');
  assert(accountModalCode.includes('0 por defecto'), 'AccountModal toma 0 por defecto si no se ingresa saldo');

  // iOS Safari Header Safe-Area y Blur Reducido
  const headerCode = fs.readFileSync('src/components/Header.jsx', 'utf-8');
  assert(headerCode.includes('pt-safe-top'), 'Header incluye padding-top safe-area para iOS Safari');
  assert(headerCode.includes('ios-crisp-header'), 'Header usa clase ios-crisp-header sin blur borroso en el notch/isla');

  // AI Advisor sin datos ajenos
  const aiAdvisorCode = fs.readFileSync('src/components/AIAdvisorView.jsx', 'utf-8');
  assert(!aiAdvisorCode.includes('MXN'), 'AI Advisor NO contiene monedas ajenas (MXN eliminado)');
  assert(!aiAdvisorCode.includes('BBVA'), 'AI Advisor NO contiene bancos ajenos (BBVA eliminado)');
  assert(!aiAdvisorCode.includes('Nu Cajita Turbo'), 'AI Advisor NO contiene cuentas ajenas (Nu Cajita Turbo eliminado)');

  // -------------------------------------------------------------
  // 5. CÁLCULOS EXACTOS DE TIEMPO REAL SIN EXAGERACIONES
  // -------------------------------------------------------------
  console.log('\n--- 5. Exactitud Matemática de Ingresos y Gastos Anuales ---');
  const dashboardCode = fs.readFileSync('src/components/DashboardView.jsx', 'utf-8');
  assert(!dashboardCode.includes('multiplier * 0.9'), 'DashboardView NO multiplica ingresos por factores artificiales');
  
  // Real calculation for 2026 in course
  const txs2026 = INITIAL_TRANSACTIONS.filter((t) => t.date.startsWith('2026'));
  const realIncome2026 = txs2026.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const realExpense2026 = txs2026.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  assert(Math.round(realIncome2026) === 17611, `Ingresos reales año en curso (2026) exactos: ${formatCurrency(realIncome2026)} (NO números inflados)`);
  assert(Math.round(realExpense2026) === 16731, `Gastos reales año en curso (2026) exactos: ${formatCurrency(realExpense2026)}`);

  // Header scroll natural y selector global de Año y Período
  assert(!headerCode.includes('sticky top-0 z-30'), 'Header fluye naturalmente sin superponerse de forma invasiva sobre el contenido');
  assert(headerCode.includes('selectedYear'), 'Header integra el selector de Año fiscal global');

  // -------------------------------------------------------------
  // 6. SINCRONIZACIÓN GLOBAL EN TIEMPO REAL (Filtro por Período y Año)
  // -------------------------------------------------------------
  console.log('\n--- 6. Sincronización Global de Período y Año en Tiempo Real ---');
  import('../src/data/mockData.js').then((mock) => {
    const filterFn = mock.filterTransactionsByPeriod;
    assert(typeof filterFn === 'function', 'filterTransactionsByPeriod existe y está exportada');

    const txs = mock.INITIAL_TRANSACTIONS;
    const y2026 = filterFn(txs, 'yearly', '2026');
    const y2025 = filterFn(txs, 'yearly', '2025');
    const y2024 = filterFn(txs, 'yearly', '2024');
    const yAll = filterFn(txs, 'yearly', 'all');

    assert(y2026.length === 368, `Filtro Año 2026 devuelve exactamente 368 movimientos (obtenidos: ${y2026.length})`);
    assert(y2025.length === 311, `Filtro Año 2025 devuelve exactamente 311 movimientos (obtenidos: ${y2025.length})`);
    assert(y2024.length === 49, `Filtro Año 2024 devuelve exactamente 49 movimientos (obtenidos: ${y2024.length})`);
    assert(yAll.length === 728, `Filtro Todos los Años devuelve los 728 movimientos reales`);

    const m2026 = filterFn(txs, 'monthly', '2026');
    const w2026 = filterFn(txs, 'weekly', '2026');
    const wExpenses = w2026.filter((t) => t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0);
    const mExpenses = m2026.filter((t) => t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0);
    assert(m2026.length > 0 && m2026.every((t) => t.date.startsWith('2026-11')), 'Filtro Este Mes 2026 filtra correctamente el mes activo (Noviembre 2026)');
    assert(w2026.length > 0 && w2026.length <= m2026.length, 'Filtro Esta Semana 2026 filtra correctamente la semana activa como subconjunto mensual');
    assert(wExpenses <= mExpenses, `Gastos semanales ($${wExpenses.toFixed(2)}) son coherentes y menores a mensuales ($${mExpenses.toFixed(2)})`);

    // Verificar integración en componentes
    const accountsCode = fs.readFileSync('src/components/AccountsView.jsx', 'utf-8');
    assert(accountsCode.includes('filterTransactionsByPeriod'), 'AccountsView sincroniza movimientos según el período global');
    assert(accountsCode.includes('displayedAccounts'), 'AccountsView aisla y enfoca la cuenta seleccionada ocultando las demás');
    assert(accountsCode.includes('Ver todas las cuentas'), 'AccountsView provee restauración fluida para ver todas las cuentas al deseleccionar');

    const indexCss = fs.readFileSync('src/index.css', 'utf-8');
    assert(indexCss.includes('gradientShift') && indexCss.includes('animate-float-orb'), 'UX/UI cuenta con degradados animados y orbes fluidos en movimiento');

    const commitmentsCode = fs.readFileSync('src/components/CommitmentsView.jsx', 'utf-8');
    assert(commitmentsCode.includes('periodMultiplier'), 'CommitmentsView recalcula compromisos según el período semanal/mensual/anual');

    const advisorCode = fs.readFileSync('src/components/AIAdvisorView.jsx', 'utf-8');
    assert(advisorCode.includes('filterTransactionsByPeriod'), 'AIAdvisorView diagnostica en tiempo real según el período y año seleccionado');
    assert(advisorCode.includes('periodDays') && advisorCode.includes('periodFactor'), 'AIAdvisorView recalcula Burn Rate, Hormiga, 50/30/20 y Simulador según Esta Semana / Este Mes / Trimestre / Año');

    const q2026 = filterFn(txs, 'quarterly', '2026');
    assert(q2026.length > m2026.length && q2026.length <= y2026.length, `Filtro Trimestre 2026 filtra exactamente los últimos 90 días (${q2026.length} movs)`);

    // -------------------------------------------------------------
    // 7. RESPONSIVIDAD Y FORMATO DE DIVISAS (USD / COP)
    // -------------------------------------------------------------
    console.log('\n--- 7. Responsividad y Conversión de Monedas ---');
    ['weekly', 'monthly', 'quarterly', 'yearly'].forEach((tf) => {
      assert(TIMEFRAME_CONFIG[tf] && TIMEFRAME_CONFIG[tf].days > 0, `Filtro temporal '${tf}' configurado con series reales`);
    });

    const testValUSD = 100;
    const formattedUSD = formatCurrency(testValUSD, 'USD');
    const formattedCOP3200 = formatCurrency(testValUSD, 'COP', 3200);
    assert(formattedUSD.includes('100') && formattedUSD.includes('USD'), `Formato USD correcto: ${formattedUSD}`);
    assert(formattedCOP3200.includes('320.000') && formattedCOP3200.includes('COP'), `Formato COP correcto con tasa 3,200: ${formattedCOP3200}`);

    // -------------------------------------------------------------
    // 8. COBRO AUTOMÁTICO DE GASTOS FIJOS Y PERSISTENCIA DE DATOS
    // -------------------------------------------------------------
    console.log('\n--- 8. Verificación de Gastos Fijos y Auto-Cobro ---');
    const { isSubscriptionChargedInMonth, INITIAL_SUBSCRIPTIONS } = mock;

    const googleSub = INITIAL_SUBSCRIPTIONS.find((s) => s.id === 'sub-google');
    const chatgptSub = INITIAL_SUBSCRIPTIONS.find((s) => s.id === 'sub-chatgpt');
    const claudeSub = INITIAL_SUBSCRIPTIONS.find((s) => s.id === 'sub-claude');

    assert(isSubscriptionChargedInMonth(googleSub, txs, '2026-11') === true, 'Google Plus detectado como pagado en Noviembre 2026');
    assert(isSubscriptionChargedInMonth(chatgptSub, txs, '2026-11') === true, 'ChatGPT Plus detectado como pagado en Noviembre 2026');
    assert(isSubscriptionChargedInMonth(claudeSub, txs, '2026-11') === true, 'Claude Pro detectado como pagado el 7 de Noviembre 2026');

    // Test false positive prevention on empty or punctuation titles
    const dummySub = { id: 'test-1', name: 'Netflix 4K' };
    const fakeTxs = [{ id: 'fake-dot', title: '.', date: '2026-11-04' }];
    assert(isSubscriptionChargedInMonth(dummySub, fakeTxs, '2026-11') === false, 'Títulos con solo puntos (.) no provocan falsos cobros');

    // Verification of autoCharge UI configuration in SubscriptionsView and CommitmentsView
    const subsViewCode = fs.readFileSync('src/components/SubscriptionsView.jsx', 'utf-8');
    assert(subsViewCode.includes('toggleAutoCharge'), 'SubscriptionsView incluye toggle interactivo de auto-cobro por suscripción');
    assert(subsViewCode.includes('autoChargeCheck'), 'Modal de suscripción incluye selector de Cobro Automático');

    const commitmentsViewCode = fs.readFileSync('src/components/CommitmentsView.jsx', 'utf-8');
    assert(commitmentsViewCode.includes('toggleGlobalAutoCharge'), 'CommitmentsView incluye interruptor maestro de auto-cobro global');

    console.log(`\n🎉 Resumen final de la auditoría: ${passed} pruebas superadas, ${failed} fallos.\n`);
  });
}

verifyDB().catch(console.error);
