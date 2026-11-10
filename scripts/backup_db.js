import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from '../server/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const backupsDir = path.join(rootDir, 'backups');

export async function createDatabaseBackup() {
  const isVercel = Boolean(process.env.VERCEL);
  if (!isVercel) {
    try {
      if (!fs.existsSync(backupsDir)) {
        fs.mkdirSync(backupsDir, { recursive: true });
      }
    } catch (_) {}
  }

  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;

  // 1. Copy SQLite binary database file if present and filesystem is writable
  const sourceDb = path.join(rootDir, 'wallet_flow.db');
  let binaryBackupPath = null;
  if (!isVercel && fs.existsSync(sourceDb)) {
    try {
      binaryBackupPath = path.join(backupsDir, `wallet_flow_backup_${timestamp}.db`);
      fs.copyFileSync(sourceDb, binaryBackupPath);
      fs.copyFileSync(sourceDb, path.join(rootDir, 'wallet_flow.db.bak'));
      console.log(`📦 Backup binario creado: ${binaryBackupPath}`);
    } catch (_) {}
  }

  // 2. Export full high-fidelity JSON snapshot from active libSQL/Turso connection
  try {
    const [usersRes, accountsRes, txsRes, subsRes, debtsRes, paymentsRes, stateRes, prismaRes] =
      await Promise.all([
        db.execute('SELECT * FROM users'),
        db.execute('SELECT * FROM accounts'),
        db.execute('SELECT * FROM transactions'),
        db.execute('SELECT * FROM subscriptions'),
        db.execute('SELECT * FROM debts'),
        db.execute('SELECT * FROM debt_payments'),
        // El secreto de firma de sesiones jamás se exporta a un respaldo.
        db.execute("SELECT * FROM app_state WHERE key != 'session_secret'"),
        db.execute('SELECT * FROM prisma_settings').catch(() => ({ rows: [] })),
      ]);

    const snapshot = {
      timestamp: now.toISOString(),
      metadata: {
        usersCount: usersRes.rows.length,
        accountsCount: accountsRes.rows.length,
        transactionsCount: txsRes.rows.length,
        subscriptionsCount: subsRes.rows.length,
        debtsCount: debtsRes.rows.length,
        debtPaymentsCount: paymentsRes.rows.length,
        prismaSettingsCount: (prismaRes.rows || []).length,
      },
      data: {
        users: usersRes.rows,
        accounts: accountsRes.rows,
        transactions: txsRes.rows,
        subscriptions: subsRes.rows,
        debts: debtsRes.rows,
        debt_payments: paymentsRes.rows,
        app_state: stateRes.rows,
        prisma_settings: prismaRes.rows || [],
      },
    };

    const jsonBackupPath = path.join(backupsDir, `wallet_flow_snapshot_${timestamp}.json`);
    const latestJsonPath = path.join(backupsDir, 'wallet_flow_snapshot_latest.json');
    const jsonStr = JSON.stringify(snapshot, null, 2);

    if (!isVercel) {
      try {
        fs.writeFileSync(jsonBackupPath, jsonStr, 'utf-8');
        fs.writeFileSync(latestJsonPath, jsonStr, 'utf-8');
        console.log(`📄 Snapshot JSON creado: ${jsonBackupPath}`);
      } catch (writeErr) {
        console.warn('⚠️ No se pudo escribir snapshot en disco (filesystem read-only):', writeErr.message);
      }
    }

    console.log(`✨ Backup completado exitosamente:`, snapshot.metadata);
    return {
      success: true,
      timestamp,
      binaryBackupPath,
      jsonBackupPath: isVercel ? null : jsonBackupPath,
      metadata: snapshot.metadata,
      snapshot: isVercel ? snapshot : undefined,
    };
  } catch (err) {
    console.error('Error generando snapshot JSON desde la base de datos:', err);
    return {
      success: Boolean(binaryBackupPath),
      binaryBackupPath,
      error: err.message,
    };
  }
}

// Run directly if invoked via CLI
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  createDatabaseBackup()
    .then((res) => {
      if (res.success) process.exit(0);
      else process.exit(1);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
