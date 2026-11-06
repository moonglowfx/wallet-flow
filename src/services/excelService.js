import * as XLSX from 'xlsx';
import { DEFAULT_USD_COP_RATE } from '../data/mockData.js';

/**
 * Downloads a complete pre-formatted .xlsx template workbook
 * for the user to populate accounts, transactions, subscriptions, and debts in USD and COP.
 */
export function downloadExcelTemplate() {
  const wb = XLSX.utils.book_new();

  // 1. Cuentas Sheet Sample
  const accountsData = [
    {
      ID: 'acc-banco-01',
      Nombre: 'Chase / Bancolombia Checking',
      Institución: 'Bancolombia / Chase',
      Tipo: 'bank', // 'cash', 'bank', 'credit'
      Balance: 3500.0,
      Moneda: 'USD', // 'USD' o 'COP'
      Límite_Crédito: 0,
      Tasa_Rendimiento_Anual: 4.5,
      Número_Cuenta: '•••• 1234',
    },
    {
      ID: 'acc-efectivo-01',
      Nombre: 'Billetera Efectivo',
      Institución: 'Caja Personal',
      Tipo: 'cash',
      Balance: 500000,
      Moneda: 'COP',
      Límite_Crédito: 0,
      Tasa_Rendimiento_Anual: 0,
      Número_Cuenta: 'CASH-01',
    },
    {
      ID: 'acc-tdc-01',
      Nombre: 'Visa Signature',
      Institución: 'Banco Principal',
      Tipo: 'credit',
      Balance: -450.0,
      Moneda: 'USD',
      Límite_Crédito: 3000.0,
      Tasa_Rendimiento_Anual: 0,
      Número_Cuenta: '•••• 8821',
    },
  ];

  // 2. Transacciones Sheet Sample
  const transactionsData = [
    {
      Fecha: '2026-11-01',
      Concepto: 'Nómina / Pago Quincenal',
      Monto: 2800.0,
      Moneda: 'USD',
      Tipo: 'income', // 'income' o 'expense'
      Categoría: 'Salario / Nómina',
      Cuenta_ID: 'acc-banco-01',
      Gasto_Hormiga: 'NO', // 'SI' o 'NO'
      Notas: 'Depósito directo por transferencia',
    },
    {
      Fecha: '2026-11-02',
      Concepto: 'Supermercado & Despensa Semanal',
      Monto: 320000,
      Moneda: 'COP',
      Tipo: 'expense',
      Categoría: 'Supermercado & Despensa',
      Cuenta_ID: 'acc-banco-01',
      Gasto_Hormiga: 'NO',
      Notas: 'Compras semanales en Éxito / Carulla',
    },
    {
      Fecha: '2026-11-03',
      Concepto: 'Cafetería Especialidad & Snack',
      Monto: 25000,
      Moneda: 'COP',
      Tipo: 'expense',
      Categoría: 'Restaurantes & Café (Hormiga)',
      Cuenta_ID: 'acc-efectivo-01',
      Gasto_Hormiga: 'SI',
      Notas: 'Café matutino',
    },
  ];

  // 3. Suscripciones Sheet Sample
  const subscriptionsData = [
    {
      Nombre: 'Renta Apartamento Loft',
      Categoría: 'Vivienda & Servicios',
      Monto_Mensual: 1800000,
      Moneda: 'COP',
      Día_Cobro: 5,
      Cuenta_ID: 'acc-banco-01',
      Es_Esencial: 'SI', // 'SI' o 'NO'
    },
    {
      Nombre: 'OpenAI ChatGPT Plus',
      Categoría: 'Software & IA',
      Monto_Mensual: 20.0,
      Moneda: 'USD',
      Día_Cobro: 12,
      Cuenta_ID: 'acc-tdc-01',
      Es_Esencial: 'SI',
    },
    {
      Nombre: 'Spotify Premium Duo',
      Categoría: 'Streaming & Media',
      Monto_Mensual: 24900,
      Moneda: 'COP',
      Día_Cobro: 18,
      Cuenta_ID: 'acc-banco-01',
      Es_Esencial: 'NO',
    },
  ];

  // 4. Deudas Sheet Sample
  const debtsData = [
    {
      Título: 'Crédito Vehículo o Préstamo',
      Acreedor: 'Banco Davivienda / Santander',
      Categoría: 'Crédito Automotriz',
      Monto_Total: 12000.0,
      Monto_Pagado: 4500.0,
      Moneda: 'USD',
      Tasa_Interés_Anual: 11.5,
      Pago_Mínimo_Mensual: 350.0,
      Fecha_Vencimiento: '2028-06-30',
    },
  ];

  // Convert to sheets
  const wsAccounts = XLSX.utils.json_to_sheet(accountsData);
  const wsTransactions = XLSX.utils.json_to_sheet(transactionsData);
  const wsSubscriptions = XLSX.utils.json_to_sheet(subscriptionsData);
  const wsDebts = XLSX.utils.json_to_sheet(debtsData);

  // Append sheets
  XLSX.utils.book_append_sheet(wb, wsAccounts, 'Cuentas');
  XLSX.utils.book_append_sheet(wb, wsTransactions, 'Transacciones');
  XLSX.utils.book_append_sheet(wb, wsSubscriptions, 'Suscripciones');
  XLSX.utils.book_append_sheet(wb, wsDebts, 'Deudas');

  // Trigger download in browser
  XLSX.writeFile(wb, 'plantilla_finanzas_wallet_flow.xlsx');
}

/**
 * Parses an uploaded .xlsx file and converts it into structured Wallet Flow data.
 * Base internal amounts are converted to USD (primary currency).
 */
export async function parseExcelFile(file, exchangeRate = DEFAULT_USD_COP_RATE) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });

        const result = {
          accounts: [],
          transactions: [],
          subscriptions: [],
          debts: [],
          summary: {
            accountsCount: 0,
            transactionsCount: 0,
            subscriptionsCount: 0,
            debtsCount: 0,
          },
        };

        const sheetNames = workbook.SheetNames.map((s) => s.toLowerCase());

        // 1. Parse Cuentas / Accounts
        const accountsSheetName = workbook.SheetNames.find(
          (name) => name.toLowerCase().includes('cuenta') || name.toLowerCase().includes('account')
        );

        if (accountsSheetName) {
          const rawAccounts = XLSX.utils.sheet_to_json(workbook.Sheets[accountsSheetName]);
          result.accounts = rawAccounts.map((row, idx) => {
            const currency = (row['Moneda'] || row['Currency'] || 'USD').toString().toUpperCase();
            let rawBalance = parseFloat(row['Balance'] || row['Saldo'] || 0);

            // Convert to base USD if currency is COP
            if (currency === 'COP') {
              rawBalance = rawBalance / exchangeRate;
            }

            const rawType = (row['Tipo'] || row['Type'] || 'bank').toString().toLowerCase();
            const type = rawType.includes('credit') || rawType.includes('credito')
              ? 'credit'
              : rawType.includes('cash') || rawType.includes('efectivo')
              ? 'cash'
              : 'bank';

            const balance = type === 'credit' ? -Math.abs(rawBalance) : rawBalance;

            let creditLimit = parseFloat(row['Límite_Crédito'] || row['Limite'] || row['CreditLimit'] || 0);
            if (currency === 'COP' && creditLimit > 0) creditLimit = creditLimit / exchangeRate;

            return {
              id: (row['ID'] || `acc-${Date.now()}-${idx}`).toString(),
              name: (row['Nombre'] || row['Name'] || `Cuenta ${idx + 1}`).toString(),
              institution: (row['Institución'] || row['Institucion'] || row['Bank'] || 'Entidad Financiera').toString(),
              type,
              balance: Math.round(balance * 100) / 100,
              creditLimit: creditLimit > 0 ? Math.round(creditLimit * 100) / 100 : undefined,
              yieldRate: parseFloat(row['Tasa_Rendimiento_Anual'] || row['Rendimiento'] || 0) || undefined,
              accountNumber: (row['Número_Cuenta'] || row['Numero_Cuenta'] || `•••• ${1000 + idx}`).toString(),
              accentGradient:
                type === 'credit'
                  ? 'from-rose-700/40 via-purple-900/40 to-black/75'
                  : type === 'cash'
                  ? 'from-emerald-600/35 via-purple-900/25 to-zinc-950/70'
                  : 'from-purple-600/40 via-indigo-700/30 to-slate-900/60',
            };
          });
        }

        // 2. Parse Transacciones / Transactions / Movimientos
        const txSheetName = workbook.SheetNames.find(
          (name) =>
            name.toLowerCase().includes('transacc') ||
            name.toLowerCase().includes('movimiento') ||
            name.toLowerCase().includes('tx')
        );

        if (txSheetName) {
          const rawTx = XLSX.utils.sheet_to_json(workbook.Sheets[txSheetName]);
          result.transactions = rawTx.map((row, idx) => {
            const currency = (row['Moneda'] || row['Currency'] || 'USD').toString().toUpperCase();
            let amount = parseFloat(row['Monto'] || row['Amount'] || row['Valor'] || 0);

            if (currency === 'COP') {
              amount = amount / exchangeRate;
            }

            const rawType = (row['Tipo'] || row['Type'] || 'expense').toString().toLowerCase();
            const type = rawType.includes('in') || rawType.includes('ingreso') ? 'income' : 'expense';

            const antStr = (row['Gasto_Hormiga'] || row['Hormiga'] || row['Ant'] || 'NO').toString().toUpperCase();
            const isAntExpense = antStr.includes('SI') || antStr.includes('YES') || antStr === '1' || antStr === 'TRUE';

            let dateVal = row['Fecha'] || row['Date'] || new Date().toISOString().split('T')[0];
            // Format Excel serial date if present
            if (typeof dateVal === 'number') {
              const excelDate = new Date(Math.round((dateVal - 25569) * 86400 * 1000));
              dateVal = excelDate.toISOString().split('T')[0];
            }

            return {
              id: (row['ID'] || `tx-${Date.now()}-${idx}`).toString(),
              title: (row['Concepto'] || row['Descripcion'] || row['Title'] || `Movimiento ${idx + 1}`).toString(),
              amount: Math.round(amount * 100) / 100,
              type,
              category: (row['Categoría'] || row['Categoria'] || (type === 'income' ? 'Salario / Nómina' : 'Supermercado & Despensa')).toString(),
              accountId: (row['Cuenta_ID'] || row['AccountId'] || result.accounts[0]?.id || 'acc-general').toString(),
              date: dateVal.toString(),
              notes: (row['Notas'] || row['Notes'] || '').toString(),
              isAntExpense,
            };
          });
        }

        // 3. Parse Suscripciones / Subscriptions
        const subSheetName = workbook.SheetNames.find(
          (name) => name.toLowerCase().includes('suscrip') || name.toLowerCase().includes('fijo')
        );

        if (subSheetName) {
          const rawSubs = XLSX.utils.sheet_to_json(workbook.Sheets[subSheetName]);
          result.subscriptions = rawSubs.map((row, idx) => {
            const currency = (row['Moneda'] || row['Currency'] || 'USD').toString().toUpperCase();
            let amount = parseFloat(row['Monto_Mensual'] || row['Monto'] || row['Amount'] || 0);

            if (currency === 'COP') {
              amount = amount / exchangeRate;
            }

            const essentialStr = (row['Es_Esencial'] || row['Esencial'] || 'NO').toString().toUpperCase();
            const essential = essentialStr.includes('SI') || essentialStr.includes('YES') || essentialStr === 'TRUE';

            return {
              id: (row['ID'] || `sub-${Date.now()}-${idx}`).toString(),
              name: (row['Nombre'] || row['Name'] || `Suscripción ${idx + 1}`).toString(),
              category: (row['Categoría'] || row['Categoria'] || 'Streaming & Media').toString(),
              amount: Math.round(amount * 100) / 100,
              billingDay: parseInt(row['Día_Cobro'] || row['Dia_Cobro'] || row['Day'] || 5, 10),
              accountId: (row['Cuenta_ID'] || result.accounts[0]?.id || 'acc-general').toString(),
              active: true,
              essential,
              badgeColor: '#A855F7',
            };
          });
        }

        // 4. Parse Deudas / Debts
        const debtSheetName = workbook.SheetNames.find(
          (name) => name.toLowerCase().includes('deuda') || name.toLowerCase().includes('debt')
        );

        if (debtSheetName) {
          const rawDebts = XLSX.utils.sheet_to_json(workbook.Sheets[debtSheetName]);
          result.debts = rawDebts.map((row, idx) => {
            const currency = (row['Moneda'] || row['Currency'] || 'USD').toString().toUpperCase();
            let totalAmount = parseFloat(row['Monto_Total'] || row['Total'] || row['Amount'] || 0);
            let paidAmount = parseFloat(row['Monto_Pagado'] || row['Pagado'] || 0);
            let minPayment = parseFloat(row['Pago_Mínimo_Mensual'] || row['Pago_Minimo'] || 0);

            if (currency === 'COP') {
              totalAmount = totalAmount / exchangeRate;
              paidAmount = paidAmount / exchangeRate;
              minPayment = minPayment / exchangeRate;
            }

            let dueDate = row['Fecha_Vencimiento'] || row['Vencimiento'] || '2028-12-31';
            if (typeof dueDate === 'number') {
              const excelDate = new Date(Math.round((dueDate - 25569) * 86400 * 1000));
              dueDate = excelDate.toISOString().split('T')[0];
            }

            return {
              id: (row['ID'] || `debt-${Date.now()}-${idx}`).toString(),
              title: (row['Título'] || row['Titulo'] || row['Title'] || `Deuda ${idx + 1}`).toString(),
              counterparty: (row['Acreedor'] || row['Institucion'] || 'Entidad Financiera').toString(),
              category: (row['Categoría'] || row['Categoria'] || 'Préstamo Personal').toString(),
              totalAmount: Math.round(totalAmount * 100) / 100,
              paidAmount: Math.round(paidAmount * 100) / 100,
              interestRate: parseFloat(row['Tasa_Interés_Anual'] || row['Tasa'] || 0),
              minimumMonthlyPayment: Math.round(minPayment * 100) / 100,
              dueDate: dueDate.toString(),
              payments: [],
            };
          });
        }

        // Summary counts
        result.summary = {
          accountsCount: result.accounts.length,
          transactionsCount: result.transactions.length,
          subscriptionsCount: result.subscriptions.length,
          debtsCount: result.debts.length,
        };

        resolve(result);
      } catch (err) {
        reject(new Error(`Error al procesar el archivo Excel: ${err.message}`));
      }
    };

    reader.onerror = () => reject(new Error('No se pudo leer el archivo seleccionado'));
    reader.readAsArrayBuffer(file);
  });
}
