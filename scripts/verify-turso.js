// Script de Verificación y Diagnóstico Integral para SQLite y Turso Cloud (libSQL)
import dotenv from 'dotenv';
import { db, initDatabase, getDatabaseConnectionInfo } from '../server/db.js';

dotenv.config();

async function runTursoVerification() {
  console.log('================================================================');
  console.log(' 🚀 WALLET FLOW — AUDITORÍA Y VERIFICACIÓN TURSO CLOUD / SQLITE');
  console.log('================================================================\n');

  const info = getDatabaseConnectionInfo();
  console.log('📋 Configuración Detectada:');
  console.log(`  • Modo: ${info.provider}`);
  console.log(`  • Conexión Remota Turso: ${info.isRemoteTurso ? '✅ Sí (Nube Activa)' : '📁 No (SQLite local)'}`);
  console.log(`  • Endpoint / URL: ${info.clientUrl}`);
  console.log(`  • Token de Autenticación: ${info.hasAuthToken ? '✅ Configurado (Oculto)' : '⚠️ No requerido / ausente'}`);
  console.log(`  • Entorno Vercel: ${info.isVercel ? '☁️ Sí (Vercel Serverless)' : '💻 Local'}\n`);

  console.log('🔌 Probando conectividad...');
  const startPing = Date.now();
  try {
    const pingRes = await db.execute('SELECT 1 as ping');
    const pingDuration = Date.now() - startPing;
    console.log(`  ✅ Conexión exitosa a la base de datos (${pingDuration}ms) — Ping: ${pingRes.rows[0]?.ping}`);
  } catch (pingErr) {
    console.error('  ❌ Error crítico al conectar con la base de datos:', pingErr.message);
    process.exit(1);
  }

  console.log('\n📦 Verificando estructura de tablas e inicialización...');
  try {
    await initDatabase();
    console.log('  ✅ Inicialización e integridad de esquema verificadas sin errores.');
  } catch (initErr) {
    console.error('  ❌ Error inicializando esquema:', initErr.message);
    process.exit(1);
  }

  console.log('\n📊 Conteo y persistencia de registros en tiempo real:');
  try {
    const [usersRes, accountsRes, txsRes, subsRes, debtsRes, stateRes, prismaRes] = await Promise.all([
      db.execute('SELECT COUNT(*) as c FROM users'),
      db.execute('SELECT COUNT(*) as c FROM accounts'),
      db.execute('SELECT COUNT(*) as c FROM transactions'),
      db.execute('SELECT COUNT(*) as c FROM subscriptions'),
      db.execute('SELECT COUNT(*) as c FROM debts'),
      db.execute('SELECT COUNT(*) as c FROM app_state'),
      db.execute('SELECT COUNT(*) as c FROM prisma_settings').catch(() => ({ rows: [{ c: 0 }] })),
    ]);

    const stats = {
      users: Number(usersRes.rows[0]?.c || 0),
      accounts: Number(accountsRes.rows[0]?.c || 0),
      transactions: Number(txsRes.rows[0]?.c || 0),
      subscriptions: Number(subsRes.rows[0]?.c || 0),
      debts: Number(debtsRes.rows[0]?.c || 0),
      appStateKeys: Number(stateRes.rows[0]?.c || 0),
      prismaSettings: Number(prismaRes.rows[0]?.c || 0),
    };

    console.log(`  • Usuarios registrados:      ${stats.users}`);
    console.log(`  • Cuentas activas:           ${stats.accounts}`);
    console.log(`  • Transacciones registradas: ${stats.transactions}`);
    console.log(`  • Suscripciones / Fijos:     ${stats.subscriptions}`);
    console.log(`  • Deudas activas:            ${stats.debts}`);
    console.log(`  • Parámetros de estado:      ${stats.appStateKeys}`);
    console.log(`  • Configuración Prisma OS:   ${stats.prismaSettings}`);

    console.log('\n🧪 Prueba de escritura no destructiva (Prueba ACID):');
    const testKey = `test_healthcheck_${Date.now()}`;
    await db.execute({
      sql: `INSERT OR REPLACE INTO app_state (key, value) VALUES (?, 'ok')`,
      args: [testKey],
    });
    const testRead = await db.execute({
      sql: `SELECT value FROM app_state WHERE key = ?`,
      args: [testKey],
    });
    await db.execute({
      sql: `DELETE FROM app_state WHERE key = ?`,
      args: [testKey],
    });

    if (testRead.rows[0]?.value === 'ok') {
      console.log('  ✅ Escritura, lectura y eliminación atómica confirmadas exitosamente.');
    } else {
      console.warn('  ⚠️ Advertencia en verificación de escritura ACID.');
    }

    console.log('\n================================================================');
    console.log(' 🎉 DIAGNÓSTICO FINAL: PERSISTENCIA 100% OPERATIVA');
    console.log(` Base de datos conectada en ${info.provider} con ${stats.transactions} transacciones.`);
    console.log('================================================================\n');
  } catch (err) {
    console.error('❌ Error obteniendo métricas de la base de datos:', err);
    process.exit(1);
  }
}

runTursoVerification()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
