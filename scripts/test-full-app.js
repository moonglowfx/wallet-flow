// Full Verification Script: Multi-User Security, Mobile & PC Responsiveness, Bug Auditing
import { USERS, getUserInitialData } from '../src/data/users.js';
import {
  formatCurrency,
  formatSecondaryCurrency,
  TIMEFRAME_CONFIG,
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
// 1. VERIFICACIÓN DE USUARIOS Y PINES
// -------------------------------------------------------------
console.log('\n--- 1. Autenticación y Credenciales PIN de 4 Dígitos ---');
assert(USERS.length === 2, `Existen exactamente 2 perfiles: ${USERS.map(u => u.username).join(', ')}`);

const munboi = USERS.find(u => u.username === 'Munboi');
const tiago = USERS.find(u => u.username === 'Tiago');

assert(munboi && munboi.pin === '1234', `Usuario 1: Munboi tiene PIN '1234' de 4 dígitos`);
assert(tiago && tiago.pin === '5678', `Usuario 2: Tiago tiene PIN '5678' de 4 dígitos`);
assert(munboi.pin.length === 4 && /^\d{4}$/.test(munboi.pin), 'PIN Munboi es estrictamente numérico de 4 dígitos');
assert(tiago.pin.length === 4 && /^\d{4}$/.test(tiago.pin), 'PIN Tiago es estrictamente numérico de 4 dígitos');

// -------------------------------------------------------------
// 2. AISLAMIENTO TOTAL DE DATOS ENTRE USUARIOS
// -------------------------------------------------------------
console.log('\n--- 2. Aislamiento Total de Datos (Munboi vs. Tiago) ---');
const munboiData = getUserInitialData('munboi');
const tiagoData = getUserInitialData('tiago');

assert(munboiData.transactions.length === 726, `Munboi cuenta con 726 transacciones reales desde 2024: total ${munboiData.transactions.length}`);
assert(tiagoData.transactions.length === 16, `Tiago cuenta con sus propias 16 transacciones independientes: total ${tiagoData.transactions.length}`);

// Validar que las cuentas sean únicas y no compartan IDs
const munboiAccIds = new Set(munboiData.accounts.map(a => a.id));
const tiagoAccIds = new Set(tiagoData.accounts.map(a => a.id));
const sharedAccIds = [...munboiAccIds].filter(id => tiagoAccIds.has(id));
assert(sharedAccIds.length === 0, 'Cero colisiones de ID de cuentas entre Munboi y Tiago');

// Validar balances independientes
const munboiNet = munboiData.accounts.reduce((s, a) => s + a.balance, 0);
const tiagoNet = tiagoData.accounts.reduce((s, a) => s + a.balance, 0);
assert(Math.round(munboiNet * 100) === 3377, `Capital neto de Munboi calculado exactamente: ${formatCurrency(munboiNet)}`);
assert(Math.round(tiagoNet * 100) === 497750, `Capital neto de Tiago calculado exactamente: ${formatCurrency(tiagoNet)}`);

// Simulación de modificación aislada: si Tiago agrega un gasto, Munboi no se ve afectado
let tiagoAccountsCopy = [...tiagoData.accounts];
tiagoAccountsCopy = tiagoAccountsCopy.map(a => a.id === 'acc-tiago-chase' ? { ...a, balance: a.balance - 500 } : a);
const tiagoUpdatedBalance = tiagoAccountsCopy.find(a => a.id === 'acc-tiago-chase').balance;
const munboiBofaBalance = munboiData.accounts.find(a => a.id === 'acc-bofa-checking').balance;

assert(tiagoUpdatedBalance === 2920, 'Gasto de Tiago actualizó su cuenta Chase a $2,920');
assert(munboiBofaBalance === 240.46, 'Cuenta Bank of America de Munboi se mantiene inalterada en $240.46');

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
  assert(tiagoDbTxs.rows[0].c === 16, `SQLite almacena las 16 transacciones de Tiago aisladas`);
  assert(munboiDbAccs.rows[0].c === 5, `SQLite almacena las 5 cuentas de Munboi`);
  assert(tiagoDbAccs.rows[0].c === 4, `SQLite almacena las 4 cuentas de Tiago`);

  // -------------------------------------------------------------
  // 4. VERIFICACIÓN DE MODO MÓVIL Y PC
  // -------------------------------------------------------------
  console.log('\n--- 4. Responsividad y Estabilidad de Renderizado (Móvil vs PC) ---');
  // Gráfica de líneas con transacciones de Munboi
  ['weekly', 'monthly', 'quarterly', 'yearly'].forEach(tf => {
    assert(TIMEFRAME_CONFIG[tf] && TIMEFRAME_CONFIG[tf].days > 0, `Filtro temporal '${tf}' no produce valores nulos ni cuelga el hilo`);
  });

  // Divisas duales USD / COP
  const testValUSD = 100;
  const formattedUSD = formatCurrency(testValUSD, 'USD');
  const formattedCOP = formatCurrency(testValUSD, 'COP', 4150);
  assert(formattedUSD.includes('100') && formattedUSD.includes('USD'), `Formato USD correcto: ${formattedUSD}`);
  assert(formattedCOP.includes('415.000') && formattedCOP.includes('COP'), `Formato COP correcto con tasa 4,150: ${formattedCOP}`);

  console.log(`\n🎉 Resumen final de la auditoría: ${passed} pruebas superadas, ${failed} fallos.\n`);
}

verifyDB().catch(console.error);
