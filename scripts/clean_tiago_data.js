import { createClient } from '@libsql/client';

const db = createClient({
  url: 'file:wallet_flow.db',
});

async function main() {
  console.log('🧹 Limpiando registros de Tiago en SQLite para dejarlo en blanco...');
  
  await db.execute({
    sql: 'DELETE FROM debt_payments WHERE accountId IN (SELECT id FROM accounts WHERE userId = ?)',
    args: ['tiago'],
  });
  await db.execute({
    sql: 'DELETE FROM debts WHERE userId = ?',
    args: ['tiago'],
  });
  await db.execute({
    sql: 'DELETE FROM subscriptions WHERE userId = ?',
    args: ['tiago'],
  });
  await db.execute({
    sql: 'DELETE FROM transactions WHERE userId = ?',
    args: ['tiago'],
  });
  await db.execute({
    sql: 'DELETE FROM accounts WHERE userId = ?',
    args: ['tiago'],
  });

  const munboiAccounts = await db.execute({
    sql: 'SELECT count(*) as count FROM accounts WHERE userId = ?',
    args: ['munboi'],
  });
  const munboiTxs = await db.execute({
    sql: 'SELECT count(*) as count FROM transactions WHERE userId = ?',
    args: ['munboi'],
  });

  const tiagoAccounts = await db.execute({
    sql: 'SELECT count(*) as count FROM accounts WHERE userId = ?',
    args: ['tiago'],
  });
  const tiagoTxs = await db.execute({
    sql: 'SELECT count(*) as count FROM transactions WHERE userId = ?',
    args: ['tiago'],
  });

  console.log(`✅ Munboi: ${munboiAccounts.rows[0].count} cuentas, ${munboiTxs.rows[0].count} transacciones`);
  console.log(`✅ Tiago: ${tiagoAccounts.rows[0].count} cuentas, ${tiagoTxs.rows[0].count} transacciones (Completamente limpio)`);
}

main().catch(console.error);
