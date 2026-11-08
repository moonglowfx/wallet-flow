// ==============================================================================
// PRISMA v4 - Capital Distribution OS: Configuración y Datos Maestros
// 10 Buckets patrimoniales organizados en 5 capas estratégicas
// Texto corregido 100% en UTF-8 (sin caracteres corruptos ni mojibake)
// ==============================================================================

export const C = {
  bg: "#0a0908",
  bg2: "#100e0c",
  panel: "rgba(21, 18, 15, 0.75)",
  panelSolid: "#15120f",
  card: "rgba(26, 23, 20, 0.65)",
  cardHi: "rgba(31, 28, 25, 0.85)",
  border: "rgba(255, 255, 255, 0.08)",
  borderHi: "rgba(255, 255, 255, 0.16)",
  text: "#f5f1ea",
  textMu: "#a8a098",
  textDim: "#6b645d",
  textFa: "#4a443e",
  accent: "#d4a574",
  accentHi: "#e8c39e",
  green: "#7fb069",
  greenHi: "#a8d690",
  amber: "#e09f3e",
  red: "#c1666b",
  blue: "#669bbc"
};

export const scoreColor = (s) =>
  s >= 85 ? C.green : s >= 70 ? C.greenHi : s >= 50 ? C.amber : C.red;

export const LAYERS = [
  { id: "Defensa", label: "Defensa", desc: "Preservación • liquidez • estructura", color: "#0891b2" },
  { id: "Acumulación", label: "Acumulación", desc: "Crecimiento patrimonial diversificado", color: "#16a34a" },
  { id: "Operativo", label: "Operativo", desc: "Reinversión en el negocio del trading", color: "#7c3aed" },
  { id: "Estratégico", label: "Estratégico", desc: "Capital semilla • oportunidades selectas", color: "#db2777" },
  { id: "Vida", label: "Vida", desc: "Disfrute presente • pareja • ocio", color: "#d97706" }
];

export const BUCKETS = [
  // --- CAPA 1: DEFENSA ---
  {
    id: "emer",
    label: "Fondo de emergencia",
    sub: "Liquidez inmediata • cobertura de gastos",
    color: "#0891b2",
    accent: "#67e8f9",
    layer: "Defensa",
    target: (fixed) => (Number(fixed) || 0) * 12,
    targetLabel: (fixed) => `12 meses de gastos • $${((Number(fixed) || 0) * 12).toLocaleString()}`,
    where: "Distribuir en 3 ubicaciones para mitigar riesgo país y bancario.",
    distribution: [
      { name: "Bank of America • cuenta de ahorro", pct: 50, why: "Acceso digital inmediato, dólares regulados, FDIC hasta $250K." },
      { name: "USD físico en casa • caja fuerte", pct: 30, why: "Liquidez sin intermediarios. Crítico ante crisis bancaria o cambiaria en VE." },
      { name: "USDC en exchange tier-1 (Binance)", pct: 20, why: "Liquidez digital con yield de 3-5% APY. Convertible a USD físico en horas." }
    ],
    thisMonth: [
      "Transferir el % asignado a BoFA antes del día 5 del mes siguiente",
      "Apartar la parte de efectivo físico en sobre etiquetado por mes",
      "Comprar USDC con la tercera fracción • activar Earn flexible"
    ],
    rules: [
      "Solo se toca ante emergencia real: médica, pérdida total de ingresos por 30+ días, evento familiar grave",
      "Si baja del 80% del target, recomposición tiene prioridad sobre cualquier otro bucket",
      "Nunca se invierte • su única función es estar disponible"
    ],
    pitfalls: [
      "Concentrar todo en BoFA • si la cuenta cierra por residencia VE pierdes acceso instantáneo",
      "Confundirla con el fondo de oportunidades • son funciones distintas",
      "Usarla para suplir un mal mes de trading • eso destruye el sistema"
    ],
    success: "12 meses de gastos cubiertos • distribuido en mínimo 3 ubicaciones • sin tocar en 90 días"
  },
  {
    id: "deuda",
    label: "Liquidación de deuda",
    sub: "Pago de deuda con tu papá • $2,500",
    color: "#a16207",
    accent: "#fcd34d",
    layer: "Defensa",
    target: () => 2500,
    targetLabel: () => "Liquidar deuda con papá • $2,500",
    where: "Pago directo a tu papá hasta liquidar. Una vez liquidado, este bucket desaparece y su % se redistribuye a Inversiones líquidas + Renta fija.",
    distribution: [
      { name: "Pago mensual a tu papá", pct: 100, why: "Aunque sea sin intereses, es deuda activa y tu padre te prestó capital. Liquidarla es una forma de respeto y libera espacio mental." }
    ],
    thisMonth: [
      "Calcular meses restantes al ritmo actual de aporte",
      "Hacer el pago el mismo día que recibes ingresos del trading • no postergues",
      "Llevar registro físico (cuaderno, app) de cada pago con fecha y saldo restante"
    ],
    rules: [
      "Deuda con familia se paga primero aunque no tenga intereses • es deuda emocional y de palabra",
      "Si tienes mes negativo, este bucket pausa pero nunca disminuye • informas a tu papá y reanudas el siguiente mes",
      "Una vez liquidada, redistribuir su % a Renta fija (60%) + Inversiones líquidas (40%)"
    ],
    pitfalls: [
      "Asumir que sin intereses no hay urgencia • la urgencia es ética",
      "Liquidar de un golpe vaciando emergencia • el método correcto es flujo mensual disciplinado",
      "Esconder el progreso • transparencia con tu papá refuerza la relación"
    ],
    success: "Deuda en cero • agradecimiento entregado en persona • capítulo cerrado"
  },
  {
    id: "fiscal",
    label: "Reserva fiscal y legal",
    sub: "Contador • cédula CO • regularización futura",
    color: "#dc2626",
    accent: "#fca5a5",
    layer: "Defensa",
    target: () => 5000,
    targetLabel: () => "Buffer estructura legal • $5,000",
    where: "Cuenta separada o subcuenta en BoFA, etiquetada y nunca tocada para gastos. Acumula hasta tener capacidad de ejecutar cambio de residencia fiscal.",
    distribution: [
      { name: "USDC dedicado • etiquetado", pct: 70, why: "Liquidez con yield mientras esperas momento de ejecución. No se mezcla con emergencia." },
      { name: "USD físico reservado", pct: 30, why: "Para gastos de trámites en persona en Colombia (notaría, viajes, gestores)." }
    ],
    thisMonth: [
      "Si no has activado cédula colombiana, esta es la prioridad este mes • cuesta poco pero abre todo",
      "Investigar contador colombiano especializado en residentes con ingresos USD • primera consulta $50-150",
      "Documentar contratos MFF/Bulenox y capturas de retiros en carpeta cifrada (Google Drive con 2FA)"
    ],
    rules: [
      "Este bucket no es para gastar este mes • es estructura para los próximos 12-24 meses",
      "Mínimo 5% del ingreso aunque hoy no haya gastos fiscales • el momento de tenerlo es antes de necesitarlo",
      "Una vez activada residencia CO, parte se vuelve reserva activa para impuestos trimestrales"
    ],
    pitfalls: [
      "Postergar la cédula colombiana • es la llave que desbloquea bancos, brokers y régimen fiscal estable",
      "Operar 5 años en VE sin documentar nada • cuando regularices, tendrás que justificar origen",
      "Asumir que el SENIAT nunca fiscalizará • planificar como si lo hiciera es disciplina, no paranoia"
    ],
    success: "Cédula CO activa • cuenta bancaria CO operativa • contador asesor de confianza • documentación completa"
  },

  // --- CAPA 2: ACUMULACIÓN ---
  {
    id: "fija",
    label: "Renta fija y conservadoras",
    sub: "CDTs • stablecoins yield • productos defensivos",
    color: "#2563eb",
    accent: "#93c5fd",
    layer: "Acumulación",
    target: () => 15000,
    targetLabel: () => "Base patrimonial conservadora • $15,000",
    where: "Hoy: USDC con yield en exchange regulado. Cuando llegue cédula CO: 50/50 entre USDC y CDT en Bancolombia/Davivienda (3-7% anual COP o USD).",
    distribution: [
      { name: "USDC en Earn flexible • Binance/Coinbase", pct: 60, why: "Yield 3-5% APY • liquidez total • sin riesgo de tipo de cambio frente al dólar." },
      { name: "USDT diversificado • segundo exchange", pct: 20, why: "Diversificación de contraparte • si un exchange tiene problema, no pierdes todo." },
      { name: "Reserva para CDT colombiano (cuando active CO)", pct: 20, why: "Mientras llega, mantener en USDC. Cuando esté lista la cuenta CO, mover a CDT a 6-12 meses." }
    ],
    thisMonth: [
      "Si no usas yield en USDC, activar Earn flexible • 5 minutos de configuración",
      "Diversificar entre 2 exchanges • nunca todo en uno solo (lección Celsius/FTX)",
      "Llevar registro de balance + yield generado mes a mes en una hoja"
    ],
    rules: [
      "Solo stablecoins de tier-1 reguladas • USDC, USDT (con cuidado), nunca algorítmicas como UST",
      "Yield esperado: 3-7% anual • si te ofrecen 15%+ es señal de riesgo elevado",
      "Rebalanceo trimestral • si una stablecoin se desvía, rotar al 50/50"
    ],
    pitfalls: [
      "Caer en yield farming exótico • 20%+ APY siempre tiene riesgo oculto",
      "Concentrar todo en un exchange • ya quebraron Celsius, FTX, Voyager",
      "No documentar saldos • cuando regularices necesitas histórico de origen"
    ],
    success: "$15K acumulados • 5%+ APY promedio • diversificado en 2+ plataformas • trazabilidad completa"
  },
  {
    id: "cripto",
    label: "Crecimiento — Cripto principal",
    sub: "Bitcoin • Ethereum • activos descorrelacionados",
    color: "#f59e0b",
    accent: "#fcd34d",
    layer: "Acumulación",
    target: () => 25000,
    targetLabel: () => "Posición core cripto • $25,000",
    where: "Wallet propia (Ledger/Trezor) para holdings de largo plazo + parte en exchange para liquidez. Dollar Cost Averaging mensual, no timing del mercado.",
    distribution: [
      { name: "Bitcoin • BTC", pct: 60, why: "Activo más líquido, mayor adopción institucional, hedge contra inflación. Posición core." },
      { name: "Ethereum • ETH", pct: 30, why: "Plataforma con yield potencial (staking 3-5%), exposición a Web3 y DeFi." },
      { name: "Reserva para alta convicción • BTC adicional en caídas", pct: 10, why: "Munición para comprar en caídas de 30%+ • regla de re-entrada disciplinada." }
    ],
    thisMonth: [
      "DCA fijo • misma fecha cada mes • sin importar precio. La disciplina supera al timing.",
      "Mover el 70%+ de holdings a wallet fría (Ledger Nano X • ~$150) • si tienes >$5K en exchange, es momento",
      "Activar staking de ETH si tu plataforma lo permite • yield adicional 3-5%"
    ],
    rules: [
      "Compra mensual sin excepciones • DCA es la única estrategia que funciona a largo plazo",
      "Self-custody desde $5K acumulado • 'not your keys, not your coins'",
      "Solo BTC + ETH como core • altcoins en máximo 10% del bucket y solo si conoces el proyecto",
      "No se vende salvo: rebalanceo programado anual o emergencia real"
    ],
    pitfalls: [
      "Tradear cripto • ya tienes edge en NQ, no compitas con bots en cripto 24/7",
      "Persuadirte de altcoins exóticas • 90% mueren en menos de 5 años",
      "Pánico vender en caídas de 50%+ • históricamente BTC se recuperó de cada una",
      "Ignorar self-custody • cada año hay un exchange que cae"
    ],
    success: "Posición core 60/30/10 • 90%+ en cold wallet • DCA sin interrupciones 12 meses consecutivos"
  },
  {
    id: "refugio",
    label: "Activos refugio",
    sub: "Oro • plata • cobertura inflación y crisis",
    color: "#ca8a04",
    accent: "#fde68a",
    layer: "Acumulación",
    target: () => 8000,
    targetLabel: () => "Cobertura crisis • $8,000",
    where: "Oro físico (monedas reconocidas) o tokenizado (PAXG en exchange) según acceso. Función: hedge contra inflación venezolana, devaluación regional, eventos sistémicos.",
    distribution: [
      { name: "PAXG • oro tokenizado en exchange", pct: 60, why: "1 PAXG = 1 onza de oro real custodiada. Liquidez digital, sin riesgo de robo físico." },
      { name: "Monedas de oro físico (Krugerrand, Maple Leaf)", pct: 30, why: "Activo soberano portátil. Reconocido globalmente. Útil para preservar valor en crisis." },
      { name: "Plata física como reserva chica", pct: 10, why: "Más asequible para ir acumulando • útil para transacciones en escenarios extremos." }
    ],
    thisMonth: [
      "Si nunca has comprado oro, empezar con $200-500 en PAXG • familiarizarse antes de comprar físico",
      "Investigar joyería de confianza en Caracas o Bogotá para oro físico de inversión • pedir certificado",
      "Acumular durante 6-12 meses antes de hacer la primera compra física grande"
    ],
    rules: [
      "Oro no es para hacer dinero • es para preservar dinero • expectativa: igualar inflación + 1-2%",
      "Solo oro y plata • nada de paladio o platino sin estudio profundo",
      "Si compras físico, almacenamiento separado de la casa • caja de seguridad o ubicación discreta"
    ],
    pitfalls: [
      "Comprar oro a sobreprecio en joyerías • siempre comprar en peso y por valor de mercado",
      "Confundir bisutería con inversión • solo oro 22-24K certificado es inversión",
      "Tener 30%+ del patrimonio en oro • es seguro, no es crecimiento"
    ],
    success: "Posición de oro establecida • física + tokenizada • cobertura ~10% del patrimonio total"
  },
  {
    id: "lp",
    label: "Crecimiento largo plazo",
    sub: "ETFs futuros • acciones • vehículos institucionales",
    color: "#16a34a",
    accent: "#86efac",
    layer: "Acumulación",
    target: () => 30000,
    targetLabel: () => "Posición LP institucional • $30,000",
    where: "Hoy se acumula como USD en USDC reservado • etiquetado para LP. Cuando se active cuenta CO + IBKR LATAM (o Trii, Tyba, alpaca via CO): mover a portafolio diversificado.",
    distribution: [
      { name: "Reservado en USDC (hoy) • futuro VT (ETF mundo)", pct: 50, why: "Exposición a 9,000+ empresas globales con un solo ticker. Diversificación máxima." },
      { name: "Reservado en USDC • futuro VTI (USA total market)", pct: 30, why: "Mercado más profundo del mundo. Crecimiento histórico ~10% anual." },
      { name: "Reservado en USDC • futuro BND (bonos USA)", pct: 20, why: "Estabilidad para reducir volatilidad del portafolio. Income recurrente." }
    ],
    thisMonth: [
      "Mantener acumulando en USDC etiquetado • 'LP-future-ETFs'",
      "Avanzar trámite cédula CO • sin esto este bucket queda inmovilizado",
      "Estudiar Bogleheads en español (libros, podcasts) • entender qué comprarás cuando puedas"
    ],
    rules: [
      "Aporte mensual constante aunque no puedas invertir aún • entrenar el músculo del aporte",
      "Cuando se desbloquee acceso, transferir todo lo acumulado y empezar DCA mensual a ETFs",
      "Holding mínimo 10 años • este bucket no se toca para nada que no sea retiro a los 50+ años"
    ],
    pitfalls: [
      "Esperar el momento perfecto para empezar • el mejor momento fue hace 3 años, el segundo es hoy",
      "Stock picking • 95% de inversores activos pierden contra el índice • indexa y olvida",
      "Cambiar de estrategia cada vez que el mercado cae • disciplina supera análisis"
    ],
    success: "Cuenta CO activa • IBKR/Trii operativa • ETFs comprados • DCA mensual sostenido 24 meses"
  },

  // --- CAPA 3: OPERATIVO ---
  {
    id: "trade",
    label: "Reinversión en trading",
    sub: "Cuentas nuevas • datos • herramientas",
    color: "#7c3aed",
    accent: "#c4b5fd",
    layer: "Operativo",
    target: () => 5000,
    targetLabel: () => "Buffer escalado trading • $5,000",
    where: "USDC etiquetado • gasto solo cuando se acumula suficiente para una decisión estratégica completa (no compras impulsivas mes a mes).",
    distribution: [
      { name: "Cuentas nuevas de fondeo (Apex, Topstep, Earn2Trade)", pct: 50, why: "Diversificar firmas reduce riesgo de quiebra de una sola. Apex actualmente es la más recomendada después de MFF." },
      { name: "Datos, software, suscripciones", pct: 30, why: "NinjaTrader licencia, datos CME, herramientas de análisis. Costos recurrentes." },
      { name: "Hardware, ergonomía, espacio de trabajo", pct: 20, why: "Monitor adicional, silla, escritorio. Inversión que paga dividendos en horas operadas con foco." }
    ],
    thisMonth: [
      "No gastar este bucket si no se ha acumulado mínimo $1,500 • acumular para decisiones grandes",
      "Si hay $1,500+: evaluar abrir 1 cuenta Apex 100K para diversificar fuera de MFF/Bulenox",
      "Renovar suscripciones críticas (datos CME, NinjaTrader) sin demoras • son costos del negocio"
    ],
    rules: [
      "Una firma nueva entra solo después de 60 días en sim sin pérdidas",
      "Máximo 30% del PnL mensual a este bucket • más de eso es concentración de riesgo",
      "Hardware solo cuando el actual limite la operación • no por gusto"
    ],
    pitfalls: [
      "Comprar cursos de trading caros • ya tienes sistema rentable, no necesitas más teoría",
      "Acumular cuentas que no operas • 12 cuentas de fondeo sin disciplina es peor que 5 disciplinadas",
      "Gastar en señales/bots/copy trading • si tu sistema funciona, no diluyas con ruido externo"
    ],
    success: "Diversificación entre 3+ firmas • costos recurrentes cubiertos • setup ergonómico completo"
  },

  // --- CAPA 4: ESTRATÉGICO ---
  {
    id: "opp",
    label: "Fondo de oportunidades",
    sub: "Finca • negocios • capital semilla",
    color: "#db2777",
    accent: "#f9a8d4",
    layer: "Estratégico",
    target: () => 15000,
    targetLabel: () => "Capital semilla estratégico • $15,000",
    where: "USDC stablecoin con yield • etiquetado 'OPP'. Solo se moviliza ante oportunidades estratégicas reales, no caprichos.",
    distribution: [
      { name: "Reserva finca Mautes (papá)", pct: 40, why: "Aporte planificado a la finca familiar. Requiere validar primero: títulos limpios, plan de producción, retorno." },
      { name: "Capital semilla negocio diversificación", pct: 40, why: "Empezar fuente de ingreso fuera del trading: ecommerce, software, real estate digital, etc." },
      { name: "Reserva oportunista pura", pct: 20, why: "Para situaciones imprevistas: comprar activo en crisis, oportunidad familiar, etc." }
    ],
    thisMonth: [
      "Antes de aportar a la finca: pedirle a tu papá títulos, plan productivo, costos, expectativa de retorno • si no hay números, no hay inversión",
      "Investigar 2-3 modelos de negocio que podrían diversificar tu ingreso • sin compromiso aún",
      "Mantener este bucket invertido en USDC con yield mientras espera"
    ],
    rules: [
      "Decisión de gasto requiere 'thesis' escrita • qué es, retorno esperado, tiempo, plan de salida",
      "Mínimo 24 horas entre identificar oportunidad y comprometer capital • regla anti-impulso",
      "Nunca toda la cuenta en una sola oportunidad • máximo 50% en un solo deal"
    ],
    pitfalls: [
      "Aportar a finca por presión emocional sin números • es regalo, no inversión, y debe salir de Vida no de aquí",
      "Confundir oportunidad con FOMO • si hay urgencia artificial, casi siempre es señal de evitar",
      "Empezar 5 negocios a la vez • enfocar en uno y ejecutarlo bien"
    ],
    success: "Thesis escrita por cada despliegue • 1-2 oportunidades evaluadas y ejecutadas con retorno medible"
  },

  // --- CAPA 5: VIDA ---
  {
    id: "life",
    label: "Vida y estilo",
    sub: "Personal • pareja • gastos fijos • ocio",
    color: "#d97706",
    accent: "#fcd34d",
    layer: "Vida",
    target: null,
    targetLabel: () => "Sin target • gasto mensual",
    where: "Cuenta operativa diaria. Si sobra al final del mes (>10% del bucket), rotar el remanente automáticamente al Fondo de oportunidades.",
    distribution: [
      { name: "Gastos fijos (servicios, alimentación, transporte)", pct: 40, why: "Lo necesario para vivir • no se negocia." },
      { name: "Pareja y vida social", pct: 30, why: "Salidas, regalos, viajes pequeños • invertir en relación es invertir en bienestar." },
      { name: "Cuidado personal y disfrute", pct: 20, why: "Ropa, cortes, actividades, hobbies • evita el agotamiento de vivir solo para acumular." },
      { name: "Buffer mensual", pct: 10, why: "Imprevistos del mes • si no se gasta, va a Oportunidades el día último del mes." }
    ],
    thisMonth: [
      "Llevar registro simple de gastos • no necesitas app sofisticada, una hoja con totales semanales basta",
      "Definir 1 actividad de pareja al mes que valga la pena • presupuestada en este bucket",
      "Día 30: revisar buffer • si quedó >$100, transferirlo a Oportunidades"
    ],
    rules: [
      "Lifestyle creep es la trampa más común del trader rentable • congelar este % aunque suba el ingreso",
      "El éxito se mide en vida bien vivida, no en ahorrarlo todo • este bucket es legítimo",
      "Si se reduce, mantener al menos 30% para pareja • proteger lo que importa"
    ],
    pitfalls: [
      "Subir el % cada vez que sube el ingreso • ahí muere el patrimonio futuro",
      "Reducirlo a casi cero • vives infeliz, eventualmente colapsas y haces gasto impulsivo grande",
      "Comparar con otros traders en redes • 90% mienten o están en ciclo no sostenible"
    ],
    success: "Vida disfrutada sin culpa • pareja contenta • gastos fijos siempre cubiertos • buffer rotado mensualmente"
  }
];

export const PROFILES = {
  low: {
    label: "Conservador",
    range: "<$3,000/mes",
    desc: "Liquidez y deuda primero. Acumulación mínima. Se prioriza supervivencia y estructura básica antes que crecimiento.",
    pct: { emer: 25, deuda: 12, fiscal: 5, fija: 5, cripto: 5, refugio: 0, lp: 0, trade: 13, opp: 5, life: 30 }
  },
  mid: {
    label: "Equilibrado",
    range: "$3,000 – $10,000/mes",
    desc: "Distribución completa con todas las capas activas. Zona del trader consolidando patrimonio sin descuidar defensa ni vida.",
    pct: { emer: 12, deuda: 8, fiscal: 8, fija: 12, cripto: 12, refugio: 5, lp: 8, trade: 12, opp: 8, life: 15 }
  },
  high: {
    label: "Patrimonial",
    range: ">$10,000/mes",
    desc: "Maximiza acumulación a largo plazo. Lifestyle controlado, defensa optimizada, capital semilla activo para diversificación.",
    pct: { emer: 5, deuda: 5, fiscal: 10, fija: 15, cripto: 15, refugio: 10, lp: 12, trade: 8, opp: 12, life: 8 }
  }
};

/**
 * Tasas de Retorno y Rendimiento Anual por Defecto (% APY / CAGR)
 * Personalizables por el usuario en tiempo real dentro de Prisma
 */
export const DEFAULT_YIELD_RATES = {
  emer: 4.5,    // 4.5% APY (USDC Earn flexible / Cuentas de alto rendimiento)
  deuda: 0.0,   // 0.0% (Liquidación de deuda pasiva)
  fiscal: 4.0,  // 4.0% APY (Buffer líquido con yield conservador)
  fija: 6.5,    // 6.5% APY (CDTs colombianos / bonos / stable yields)
  cripto: 14.0, // 14.0% APY (CAGR histórico / Staking BTC + ETH)
  refugio: 5.5, // 5.5% APY (Apreciación histórica oro / PAXG)
  lp: 10.0,     // 10.0% APY (ETFs indexados VT / VTI / S&P 500)
  trade: 18.0,  // 18.0% APY (Retorno operacional sobre capital fondeado)
  opp: 8.0,     // 8.0% APY (Rendimiento esperado de oportunidades y capital semilla)
  life: 0.0     // 0.0% (Flujo operativo de vida)
};
