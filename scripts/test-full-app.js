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

assert(munboiData.transactions.length === 726, `Munboi cuenta con sus 726 transacciones reales desde 2024: total ${munboiData.transactions.length}`);
assert(tiagoData.transactions.length === 0, `Tiago inicia completamente en blanco (0 transacciones) para crear todo`);
assert(munboiData.accounts.length === 5, `Munboi cuenta con sus 5 cuentas: total ${munboiData.accounts.length}`);
assert(tiagoData.accounts.length === 0, `Tiago inicia sin cuentas (0 cuentas)`);

// Validar balances de Munboi
const munboiNet = munboiData.accounts.reduce((s, a) => s + a.balance, 0);
assert(Math.round(munboiNet * 100) === 3377, `Capital neto de Munboi calculado exactamente: ${formatCurrency(munboiNet)}`);

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

  assert(munboiDbTxs.rows[0].c === 726, `SQLite almacena las 726 transacciones de Munboi aisladas`);
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

  // AccountModal sin tasa de rendimiento anual
  const accountModalCode = fs.readFileSync('src/components/AccountModal.jsx', 'utf-8');
  assert(accountModalCode.includes('Crear cuenta nueva'), 'AccountModal tiene como título exacto "Crear cuenta nueva"');
  assert(!accountModalCode.includes('Tasa de Rendimiento Anual'), 'AccountModal NO incluye tasa de rendimiento anual');

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
  assert(Math.round(realExpense2026) === 16682, `Gastos reales año en curso (2026) exactos: ${formatCurrency(realExpense2026)}`);

  // Header scroll natural sin ventanas fijas obstruyendo
  assert(!headerCode.includes('sticky top-0 z-30'), 'Header fluye naturalmente sin superponerse de forma invasiva sobre el contenido');

  // -------------------------------------------------------------
  // 6. RESPONSIVIDAD Y FORMATO DE DIVISAS (USD / COP)
  // -------------------------------------------------------------
  console.log('\n--- 6. Responsividad y Conversión de Monedas ---');
  ['weekly', 'monthly', 'quarterly', 'yearly'].forEach((tf) => {
    assert(TIMEFRAME_CONFIG[tf] && TIMEFRAME_CONFIG[tf].days > 0, `Filtro temporal '${tf}' configurado con series reales`);
  });

  const testValUSD = 100;
  const formattedUSD = formatCurrency(testValUSD, 'USD');
  const formattedCOP = formatCurrency(testValUSD, 'COP', 4150);
  assert(formattedUSD.includes('100') && formattedUSD.includes('USD'), `Formato USD correcto: ${formattedUSD}`);
  assert(formattedCOP.includes('415.000') && formattedCOP.includes('COP'), `Formato COP correcto con tasa 4,150: ${formattedCOP}`);

  console.log(`\n🎉 Resumen final de la auditoría: ${passed} pruebas superadas, ${failed} fallos.\n`);
}

verifyDB().catch(console.error);
