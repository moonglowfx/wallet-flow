import fs from 'fs';
import XLSX from 'xlsx';
import { createClient } from '@libsql/client';

const workbook = XLSX.readFile('2026-11-06.xlsx');
const sheet = workbook.Sheets['Sheet1'];
const rows = XLSX.utils.sheet_to_json(sheet);

function formatDate(val) {
  if (!val) return new Date().toISOString().split('T')[0];
  if (typeof val === 'number') {
    const d = new Date(Math.round((val - 25569) * 86400 * 1000));
    return d.toISOString().split('T')[0];
  }
  const str = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(str)) {
    const parts = str.split('/');
    const month = parts[0].padStart(2, '0');
    const day = parts[1].padStart(2, '0');
    const year = parts[2];
    return `${year}-${month}-${day}`;
  }
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) return parsed.toISOString().split('T')[0];
  return new Date().toISOString().split('T')[0];
}

const CATEGORY_MAP = {
  '🍜 Food': 'Alimentación',
  '🪪 Membresy': 'Suscripciones',
  '🚖 Transport': 'Transporte',
  '📈 Inversión': 'Inversión & Educación',
  '💰 Salary': 'Salario / Clientes',
  '💵 Exchange': 'Transferencias & Cambio',
  '✈️ Travel': 'Viajes & Ocio',
  '🐶 Pets': 'Mascotas',
  '🚬 Fume ': 'Estilo de Vida',
  '🧘🏼 Health': 'Salud & Cuidado',
  '🎮 Gaming': 'Entretenimiento & Gaming',
  '🛒 Amazon': 'Compras & Envíos',
  '🎁 Gift': 'Regalos & Familia',
  '🧥 Apparel': 'Ropa & Calzado',
  '🧳 Work': 'Herramientas de Trabajo',
  '🤑 Trading': 'Trading & Inversiones',
  '✝️ Papa Dios': 'Diezmo / Donaciones',
  '💈Hair Cut': 'Cuidado Personal',
  '👬🏻 Social Life': 'Vida Social',
  '🪑 Household': 'Hogar & Alojamiento',
  'Modified Bal.': 'Ajuste de Saldo',
  'Other': 'Otros',
};

const ACCOUNT_ID_MAP = {
  'Bank Of America': 'acc-bofa-checking',
  'Travel Rewards BOFA': 'acc-bofa-travel',
  'Bancolombia': 'acc-bancolombia',
  'Advantage Savings': 'acc-bofa-savings',
  'Cash': 'acc-cash-wallet',
};

const antKeywords = [
  'nestea', 'monster', 'gatorade', 'café', 'cafe', 'juguito', 'chucherias',
  'churros', 'arepa', 'snack', 'perros', 'burguir', 'churro', 'jugo', 'chocolate'
];

const transactions = rows.map((r, idx) => {
  const usd = Math.round((parseFloat(r.USD) || 0) * 100) / 100;
  const rawType = r['Income/Expense'] || 'Exp.';
  let type = 'expense';
  if (rawType === 'Income' || rawType === 'Income Balance' || rawType === 'Transfer-In') {
    type = 'income';
  }

  const accountId = ACCOUNT_ID_MAP[r.Accounts] || 'acc-bofa-checking';
  let category = CATEGORY_MAP[r.Category] || r.Category || 'Otros';
  if (rawType.includes('Transfer')) category = 'Transferencias';

  let title = r.Note || r.Category || 'Movimiento';
  if (rawType === 'Transfer-In') title = `Transferencia Recibida (${r.Category})`;
  if (rawType === 'Transfer-Out') title = `Transferencia a ${r.Category}`;
  if (rawType.includes('Balance')) title = `Ajuste de Balance (${r.Note || 'Difference'})`;

  const noteLower = (r.Note || '').toLowerCase();
  const isAnt = type === 'expense' && (
    (category === 'Alimentación' && usd <= 15) ||
    (category === 'Transporte' && usd <= 10) ||
    antKeywords.some((kw) => noteLower.includes(kw))
  );

  return {
    id: `tx-${String(rows.length - idx).padStart(3, '0')}`,
    title: title.trim(),
    amount: usd,
    type,
    category,
    accountId,
    date: formatDate(r.Period),
    notes: r.Description ? `${r.Note} - ${r.Description}` : r.Note || '',
    isAntExpense: Boolean(isAnt),
  };
});

const accounts = [
  {
    id: 'acc-bofa-checking',
    name: 'Bank of America Checking',
    institution: 'Bank of America',
    type: 'bank',
    balance: 229.46,
    accountNumber: '•••• 4821',
    accentGradient: 'from-blue-600/40 via-indigo-900/40 to-slate-900/70',
    yieldRate: 0.01,
  },
  {
    id: 'acc-bofa-travel',
    name: 'BOFA Travel Rewards',
    institution: 'Bank of America',
    type: 'credit',
    balance: -239.42,
    creditLimit: 1000.0,
    cutOffDay: 15,
    paymentDueDay: 2,
    accountNumber: '•••• 9024',
    accentGradient: 'from-rose-600/40 via-purple-900/40 to-black/75',
  },
  {
    id: 'acc-bancolombia',
    name: 'Bancolombia Ahorros',
    institution: 'Bancolombia',
    type: 'bank',
    balance: 7.98,
    accountNumber: '•••• 3310',
    accentGradient: 'from-amber-500/40 via-yellow-600/30 to-zinc-950/70',
    yieldRate: 10.5,
  },
  {
    id: 'acc-bofa-savings',
    name: 'BOFA Advantage Savings',
    institution: 'Bank of America',
    type: 'bank',
    balance: 24.75,
    accountNumber: '•••• 5590',
    accentGradient: 'from-purple-600/40 via-indigo-700/30 to-slate-900/60',
    yieldRate: 4.5,
  },
  {
    id: 'acc-cash-wallet',
    name: 'Efectivo / Billetera Líquida',
    institution: 'Efectivo Personal',
    type: 'cash',
    balance: 0.0,
    accountNumber: 'CASH',
    accentGradient: 'from-emerald-600/35 via-purple-900/25 to-zinc-950/70',
  },
];

const subscriptions = [
  {
    id: 'sub-google',
    name: 'Google Plus 💻',
    category: 'Cloud & Almacenamiento',
    amount: 8.99,
    billingDay: 5,
    accountId: 'acc-bofa-checking',
    active: true,
    essential: true,
    badgeColor: '#3B82F6',
  },
  {
    id: 'sub-chatgpt',
    name: 'ChatGPT Plus',
    category: 'IA & Productividad',
    amount: 20.0,
    billingDay: 5,
    accountId: 'acc-bofa-checking',
    active: true,
    essential: true,
    badgeColor: '#10B981',
  },
  {
    id: 'sub-claude',
    name: 'Claude Pro 🤖',
    category: 'IA & Productividad',
    amount: 20.0,
    billingDay: 7,
    accountId: 'acc-bofa-checking',
    active: true,
    essential: true,
    badgeColor: '#D97706',
  },
  {
    id: 'sub-spotify',
    name: 'Spotify Premium',
    category: 'Streaming & Música',
    amount: 7.91,
    billingDay: 28,
    accountId: 'acc-bofa-checking',
    active: true,
    essential: false,
    badgeColor: '#22C55E',
  },
  {
    id: 'sub-skool',
    name: 'Skool Community',
    category: 'Educación & Comunidad',
    amount: 27.0,
    billingDay: 26,
    accountId: 'acc-bofa-checking',
    active: true,
    essential: true,
    badgeColor: '#F59E0B',
  },
  {
    id: 'sub-uppbeat',
    name: 'UppBeat Music',
    category: 'Herramientas de Creador',
    amount: 6.99,
    billingDay: 25,
    accountId: 'acc-bofa-checking',
    active: true,
    essential: true,
    badgeColor: '#A855F7',
  },
  {
    id: 'sub-nordvpn',
    name: 'Nord VPN',
    category: 'Seguridad & Redes',
    amount: 24.28,
    billingDay: 18,
    accountId: 'acc-bofa-checking',
    active: true,
    essential: true,
    badgeColor: '#6366F1',
  },
  {
    id: 'sub-yose-capcut',
    name: 'Yose Capcut Pro',
    category: 'Software & Edición',
    amount: 11.98,
    billingDay: 14,
    accountId: 'acc-bofa-checking',
    active: true,
    essential: true,
    badgeColor: '#EC4899',
  },
  {
    id: 'sub-ps-plus',
    name: 'Playstation Plus 💙💛',
    category: 'Gaming & Entretenimiento',
    amount: 16.99,
    billingDay: 13,
    accountId: 'acc-bofa-checking',
    active: true,
    essential: false,
    badgeColor: '#0284C7',
  },
  {
    id: 'sub-apify',
    name: 'Apify Web Scraping',
    category: 'Herramientas Tech',
    amount: 26.0,
    billingDay: 10,
    accountId: 'acc-bofa-checking',
    active: true,
    essential: true,
    badgeColor: '#14B8A6',
  },
  {
    id: 'sub-contabo',
    name: 'Contabo VPS Hosting',
    category: 'Cloud & Servidores',
    amount: 14.25,
    billingDay: 30,
    accountId: 'acc-bofa-checking',
    active: true,
    essential: true,
    badgeColor: '#8B5CF6',
  },
  {
    id: 'sub-gym',
    name: 'Gimnasio & Fitness',
    category: 'Salud & Deporte',
    amount: 40.0,
    billingDay: 7,
    accountId: 'acc-bofa-checking',
    active: true,
    essential: true,
    badgeColor: '#EF4444',
  },
];

const debts = [
  {
    id: 'debt-travel-rewards',
    title: 'BOFA Travel Rewards (Tarjeta Crédito)',
    counterparty: 'Bank of America',
    category: 'Tarjeta / MSI',
    totalAmount: 1000.0,
    paidAmount: 760.58,
    interestRate: 21.99,
    minimumMonthlyPayment: 50.0,
    dueDate: '2026-11-20',
    payments: [
      { id: 'dp-01', amount: 50.0, date: '2026-11-02', note: 'Pago ordinario desde Bank of America', accountId: 'acc-bofa-checking' },
      { id: 'dp-02', amount: 60.75, date: '2026-09-20', note: 'Abono mensual a capital', accountId: 'acc-bofa-checking' },
      { id: 'dp-03', amount: 61.37, date: '2026-08-14', note: 'Pago mensualidad', accountId: 'acc-bofa-checking' },
      { id: 'dp-04', amount: 62.29, date: '2026-08-05', note: 'Abono a capital inicial', accountId: 'acc-bofa-checking' },
    ],
  },
  {
    id: 'debt-andrea',
    title: 'Préstamo Andrea',
    counterparty: 'Andrea',
    category: 'Préstamo Personal',
    totalAmount: 74.25,
    paidAmount: 0.0,
    interestRate: 0,
    minimumMonthlyPayment: 25.0,
    dueDate: '2026-12-15',
    payments: [],
  },
  {
    id: 'debt-camara',
    title: 'Equipo & Cámara Audiovisual',
    counterparty: 'Financiamiento Audiovisual',
    category: 'Crédito Educativo / Tech',
    totalAmount: 500.0,
    paidAmount: 100.0,
    interestRate: 0,
    minimumMonthlyPayment: 100.0,
    dueDate: '2026-12-31',
    payments: [
      { id: 'dp-cam-01', amount: 100.0, date: '2026-03-25', note: 'Abono Deuda Cámara', accountId: 'acc-bofa-checking' },
    ],
  },
  {
    id: 'debt-negro',
    title: 'Préstamo Otorgado - Negro',
    counterparty: 'Negro',
    category: 'Préstamo Otorgado',
    totalAmount: 200.0,
    paidAmount: 200.0,
    interestRate: 0,
    minimumMonthlyPayment: 0,
    dueDate: '2026-11-03',
    payments: [
      { id: 'dp-negro-01', amount: 200.0, date: '2026-11-03', note: 'Liquidación completa recibida', accountId: 'acc-bofa-checking' },
    ],
  },
];

// Write to server/seedData.js (solo servidor: los datos reales no deben viajar en el bundle del cliente)
const mockDataContent = `// Real Personal Finance Data generated from 2026-11-06.xlsx (2024 - 2026)

export const INITIAL_ACCOUNTS = ${JSON.stringify(accounts, null, 2)};

export const INITIAL_TRANSACTIONS = ${JSON.stringify(transactions, null, 2)};

export const INITIAL_SUBSCRIPTIONS = ${JSON.stringify(subscriptions, null, 2)};

export const INITIAL_DEBTS = ${JSON.stringify(debts, null, 2)};
`;

fs.writeFileSync('server/seedData.js', mockDataContent, 'utf8');
console.log('✅ Generated server/seedData.js successfully with all 726 transactions!');

// Also populate SQLite database
async function updateSQLite() {
  const client = createClient({ url: 'file:wallet_flow.db' });

  await client.execute('DELETE FROM debt_payments');
  await client.execute('DELETE FROM debts');
  await client.execute('DELETE FROM subscriptions');
  await client.execute('DELETE FROM transactions');
  await client.execute('DELETE FROM accounts');

  for (const acc of accounts) {
    await client.execute({
      sql: `INSERT INTO accounts (id, name, institution, type, balance, creditLimit, cutOffDay, paymentDueDay, accountNumber, accentGradient, yieldRate)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        acc.id,
        acc.name,
        acc.institution,
        acc.type,
        acc.balance,
        acc.creditLimit || null,
        acc.cutOffDay || null,
        acc.paymentDueDay || null,
        acc.accountNumber,
        acc.accentGradient || null,
        acc.yieldRate || null,
      ],
    });
  }

  for (const tx of transactions) {
    await client.execute({
      sql: `INSERT INTO transactions (id, title, amount, type, category, accountId, date, notes, isAntExpense)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        tx.id,
        tx.title,
        tx.amount,
        tx.type,
        tx.category,
        tx.accountId,
        tx.date,
        tx.notes || null,
        tx.isAntExpense ? 1 : 0,
      ],
    });
  }

  for (const sub of subscriptions) {
    await client.execute({
      sql: `INSERT INTO subscriptions (id, name, category, amount, billingDay, accountId, active, essential, badgeColor)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        sub.id,
        sub.name,
        sub.category,
        sub.amount,
        sub.billingDay,
        sub.accountId,
        sub.active ? 1 : 0,
        sub.essential ? 1 : 0,
        sub.badgeColor || '#A855F7',
      ],
    });
  }

  for (const debt of debts) {
    await client.execute({
      sql: `INSERT INTO debts (id, title, counterparty, category, totalAmount, paidAmount, interestRate, minimumMonthlyPayment, dueDate)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        debt.id,
        debt.title,
        debt.counterparty,
        debt.category,
        debt.totalAmount,
        debt.paidAmount,
        debt.interestRate,
        debt.minimumMonthlyPayment,
        debt.dueDate,
      ],
    });

    if (debt.payments) {
      for (const p of debt.payments) {
        await client.execute({
          sql: `INSERT INTO debt_payments (id, debtId, amount, date, note, accountId)
                VALUES (?, ?, ?, ?, ?, ?)`,
          args: [
            p.id,
            debt.id,
            p.amount,
            p.date,
            p.note || 'Abono',
            p.accountId || null,
          ],
        });
      }
    }
  }

  console.log('✅ SQLite wallet_flow.db populated with 726 transactions, 5 accounts, subscriptions & debts!');
}

updateSQLite().catch(console.error);
