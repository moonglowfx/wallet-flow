import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  PieChart as PieIcon,
  Activity,
  ArrowDownRight,
} from 'lucide-react';
import {
  formatCurrency,
  TIMEFRAME_CONFIG,
  CATEGORY_COLORS,
  DEFAULT_USD_COP_RATE,
} from '../data/mockData.js';

export const FluidLineChart = ({
  timeframe = 'monthly',
  transactions = [],
  currency = 'USD',
  exchangeRate = DEFAULT_USD_COP_RATE,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState(null);

  // Dynamic series computed from actual transactions or guaranteed fallback
  const data = useMemo(() => {
    const fallbackSeries = {
      weekly: [
        { label: 'Lun', income: 0, expense: 45 },
        { label: 'Mar', income: 150, expense: 80 },
        { label: 'Mié', income: 0, expense: 60 },
        { label: 'Jue', income: 300, expense: 120 },
        { label: 'Vie', income: 50, expense: 95 },
        { label: 'Sáb', income: 0, expense: 140 },
        { label: 'Dom', income: 0, expense: 30 },
      ],
      monthly: [
        { label: 'Sem 1', income: 650, expense: 320 },
        { label: 'Sem 2', income: 900, expense: 480 },
        { label: 'Sem 3', income: 450, expense: 390 },
        { label: 'Sem 4', income: 1200, expense: 560 },
      ],
      quarterly: [
        { label: 'Mes 1', income: 2400, expense: 1800 },
        { label: 'Mes 2', income: 2900, expense: 1650 },
        { label: 'Mes 3', income: 3200, expense: 2100 },
      ],
      yearly: [
        { label: 'Q1', income: 8400, expense: 6200 },
        { label: 'Q2', income: 7800, expense: 5900 },
        { label: 'Q3', income: 9100, expense: 7100 },
        { label: 'Q4', income: 8900, expense: 6800 },
      ],
    };

    if (!transactions || transactions.length === 0) {
      return fallbackSeries[timeframe] || fallbackSeries.monthly;
    }

    try {
      // Aggregate real transactions based on timeframe
      if (timeframe === 'weekly') {
        const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        const dayBuckets = days.map((label) => ({ label, income: 0, expense: 0 }));
        
        // Take last 7 days of txs
        const recentTxs = [...transactions]
          .sort((a, b) => new Date(b.date) - new Date(a.date))
          .slice(0, 40);

        recentTxs.forEach((t) => {
          const d = new Date(t.date);
          if (!isNaN(d.getTime())) {
            const dayIdx = d.getDay();
            if (t.type === 'income') dayBuckets[dayIdx].income += t.amount;
            else dayBuckets[dayIdx].expense += t.amount;
          }
        });
        return dayBuckets;
      }

      if (timeframe === 'monthly') {
        const weeks = [
          { label: 'Sem 1', income: 0, expense: 0 },
          { label: 'Sem 2', income: 0, expense: 0 },
          { label: 'Sem 3', income: 0, expense: 0 },
          { label: 'Sem 4', income: 0, expense: 0 },
        ];

        transactions.slice(0, 100).forEach((t) => {
          const d = new Date(t.date);
          if (!isNaN(d.getTime())) {
            const day = d.getDate();
            const weekIdx = Math.min(3, Math.floor((day - 1) / 7));
            if (t.type === 'income') weeks[weekIdx].income += t.amount;
            else weeks[weekIdx].expense += t.amount;
          }
        });
        return weeks;
      }

      if (timeframe === 'quarterly') {
        const months = [
          { label: 'Mes -2', income: 0, expense: 0 },
          { label: 'Mes -1', income: 0, expense: 0 },
          { label: 'Mes Actual', income: 0, expense: 0 },
        ];

        transactions.slice(0, 200).forEach((t) => {
          const d = new Date(t.date);
          if (!isNaN(d.getTime())) {
            const m = d.getMonth() % 3;
            if (t.type === 'income') months[m].income += t.amount;
            else months[m].expense += t.amount;
          }
        });
        return months;
      }

      if (timeframe === 'yearly') {
        const quarters = [
          { label: 'Q1', income: 0, expense: 0 },
          { label: 'Q2', income: 0, expense: 0 },
          { label: 'Q3', income: 0, expense: 0 },
          { label: 'Q4', income: 0, expense: 0 },
        ];

        transactions.forEach((t) => {
          const d = new Date(t.date);
          if (!isNaN(d.getTime())) {
            const q = Math.min(3, Math.floor(d.getMonth() / 3));
            if (t.type === 'income') quarters[q].income += t.amount;
            else quarters[q].expense += t.amount;
          }
        });
        return quarters;
      }
    } catch (_) {}

    return fallbackSeries[timeframe] || fallbackSeries.monthly;
  }, [timeframe, transactions]);

  const maxVal = Math.max(
    ...data.map((d) => Math.max(d.income || 0, d.expense || 0)),
    500
  );

  const width = 640;
  const height = 240;
  const paddingX = 40;
  const paddingY = 30;
  const chartW = width - paddingX * 2;
  const chartH = height - paddingY * 2;

  // Convert points to SVG coordinates
  const pointsIncome = data.map((d, i) => {
    const x = paddingX + (i / Math.max(1, data.length - 1)) * chartW;
    const y = height - paddingY - ((d.income || 0) / maxVal) * chartH;
    return { x, y, ...d };
  });

  const pointsExpense = data.map((d, i) => {
    const x = paddingX + (i / Math.max(1, data.length - 1)) * chartW;
    const y = height - paddingY - ((d.expense || 0) / maxVal) * chartH;
    return { x, y, ...d };
  });

  // Create smooth Bezier curve SVG paths
  const createSmoothPath = (pts) => {
    if (pts.length < 2) return '';
    let path = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i === 0 ? 0 : i - 1];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2] || p2;

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }
    return path;
  };

  const incomePath = createSmoothPath(pointsIncome);
  const expensePath = createSmoothPath(pointsExpense);

  const incomeArea = pointsIncome.length > 0
    ? `${incomePath} L ${pointsIncome[pointsIncome.length - 1].x} ${height - paddingY} L ${pointsIncome[0].x} ${height - paddingY} Z`
    : '';

  const expenseArea = pointsExpense.length > 0
    ? `${expensePath} L ${pointsExpense[pointsExpense.length - 1].x} ${height - paddingY} L ${pointsExpense[0].x} ${height - paddingY} Z`
    : '';

  const activePoint = hoveredIndex !== null && data[hoveredIndex]
    ? data[hoveredIndex]
    : data[data.length - 1] || { label: 'Hoy', income: 0, expense: 0 };

  return (
    <div className="liquid-glass p-6 space-y-4 relative overflow-hidden">
      {/* Background glow */}
      <div className="pointer-events-none absolute -top-16 -right-16 w-52 h-52 rounded-full bg-purple-600/15 blur-3xl" />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">
              Flujo Comparativo: Ingresos vs. Gastos
            </h3>
            <p className="text-xs text-zinc-400">
              Tendencia temporal ({TIMEFRAME_CONFIG[timeframe]?.label || 'Este Periodo'})
            </p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-fuchsia-400 shadow-[0_0_8px_#e879f9]" />
            <span className="text-zinc-300 font-medium">Ingresos</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-400 shadow-[0_0_8px_#fb7185]" />
            <span className="text-zinc-300 font-medium">Gastos</span>
          </div>
        </div>
      </div>

      {/* Hover preview tooltip pill */}
      {activePoint && (
        <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-xs">
          <span className="font-semibold text-purple-200">
            Periodo: {activePoint.label}
          </span>
          <div className="flex items-center gap-4">
            <span className="text-emerald-300 font-medium">
              +{formatCurrency(activePoint.income, currency, exchangeRate)}
            </span>
            <span className="text-rose-300 font-medium">
              -{formatCurrency(activePoint.expense, currency, exchangeRate)}
            </span>
            <span className="text-purple-300 font-bold">
              Neto: {formatCurrency((activePoint.income || 0) - (activePoint.expense || 0), currency, exchangeRate)}
            </span>
          </div>
        </div>
      )}

      {/* Chart SVG */}
      <div className="w-full relative aspect-[16/7] sm:aspect-[16/6]">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full overflow-visible"
        >
          <defs>
            <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#C084FC" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#A855F7" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FB7185" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#F43F5E" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="lineIncomeGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#C084FC" />
              <stop offset="100%" stopColor="#F472B6" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = height - paddingY - ratio * chartH;
            return (
              <g key={ratio}>
                <line
                  x1={paddingX}
                  y1={y}
                  x2={width - paddingX}
                  y2={y}
                  stroke="rgba(255, 255, 255, 0.07)"
                  strokeDasharray="4 4"
                />
                <text
                  x={paddingX - 8}
                  y={y + 3}
                  textAnchor="end"
                  fill="rgba(255, 255, 255, 0.3)"
                  fontSize="9"
                  fontFamily="sans-serif"
                >
                  ${Math.round((maxVal * ratio) / 1000)}k
                </text>
              </g>
            );
          })}

          {/* Area Fills */}
          {incomeArea && <path d={incomeArea} fill="url(#incomeGrad)" />}
          {expenseArea && <path d={expenseArea} fill="url(#expenseGrad)" />}

          {/* Lines */}
          {incomePath && (
            <path
              d={incomePath}
              fill="none"
              stroke="url(#lineIncomeGrad)"
              strokeWidth="3"
              strokeLinecap="round"
            />
          )}
          {expensePath && (
            <path
              d={expensePath}
              fill="none"
              stroke="#FB7185"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          )}

          {/* Interactive dots and vertical lines */}
          {pointsIncome.map((pt, i) => {
            const expPt = pointsExpense[i] || pt;
            const isHovered = hoveredIndex === i;

            return (
              <g
                key={i}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
                className="cursor-pointer"
              >
                {/* Invisible hover trigger column */}
                <rect
                  x={pt.x - 20}
                  y={0}
                  width="40"
                  height={height}
                  fill="transparent"
                />

                {isHovered && (
                  <line
                    x1={pt.x}
                    y1={paddingY}
                    x2={pt.x}
                    y2={height - paddingY}
                    stroke="rgba(168, 85, 247, 0.5)"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                  />
                )}

                {/* Income point */}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isHovered ? 6 : 4}
                  fill="#E879F9"
                  stroke="#0F0F13"
                  strokeWidth="2"
                  className="transition-all duration-150"
                />

                {/* Expense point */}
                <circle
                  cx={expPt.x}
                  cy={expPt.y}
                  r={isHovered ? 5 : 3.5}
                  fill="#FB7185"
                  stroke="#0F0F13"
                  strokeWidth="2"
                  className="transition-all duration-150"
                />

                {/* X axis labels */}
                <text
                  x={pt.x}
                  y={height - 10}
                  textAnchor="middle"
                  fill={isHovered ? '#C084FC' : 'rgba(255, 255, 255, 0.45)'}
                  fontSize="10"
                  fontWeight={isHovered ? 'bold' : 'normal'}
                >
                  {pt.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};

export const CategoryRingChart = ({
  transactions = [],
  currency = 'USD',
  exchangeRate = DEFAULT_USD_COP_RATE,
}) => {
  const [selectedCategory, setSelectedCategory] = useState(null);

  // Filter only expenses and aggregate by category
  const expenseTransactions = transactions.filter((t) => t.type === 'expense');
  const totalExpense = expenseTransactions.reduce((acc, t) => acc + (t.amount || 0), 0) || 1;

  const categoryTotals = {};
  expenseTransactions.forEach((t) => {
    categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
  });

  const categoriesData = Object.entries(categoryTotals)
    .map(([cat, amount]) => ({
      category: cat,
      amount,
      percentage: Math.round((amount / totalExpense) * 100),
      color: CATEGORY_COLORS[cat] || '#A855F7',
    }))
    .sort((a, b) => b.amount - a.amount);

  // SVG Donut calculation
  const size = 200;
  const strokeWidth = 26;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let accumulatedPercent = 0;

  const segments = categoriesData.map((item) => {
    const strokeDasharray = `${(item.percentage / 100) * circumference} ${circumference}`;
    const strokeDashoffset = -((accumulatedPercent / 100) * circumference);
    accumulatedPercent += item.percentage;
    return {
      ...item,
      strokeDasharray,
      strokeDashoffset,
    };
  });

  const activeCategory = selectedCategory
    ? categoriesData.find((c) => c.category === selectedCategory)
    : categoriesData[0];

  return (
    <div className="liquid-glass p-6 space-y-5 relative overflow-hidden">
      {/* Background glow */}
      <div className="pointer-events-none absolute -bottom-16 -left-16 w-52 h-52 rounded-full bg-fuchsia-600/15 blur-3xl" />

      {/* Header */}
      <div className="flex items-center justify-between relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30">
            <PieIcon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">
              Distribución por Categorías
            </h3>
            <p className="text-xs text-zinc-400">Anillo Liquid Glass de egresos</p>
          </div>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-200 border border-purple-400/30">
          {formatCurrency(totalExpense, currency, exchangeRate)}
        </span>
      </div>

      {/* Donut and Legend Grid */}
      {categoriesData.length === 0 ? (
        <div className="py-12 text-center space-y-2 relative z-10">
          <PieIcon className="w-8 h-8 text-purple-400 mx-auto" />
          <p className="text-sm font-semibold text-white">Sin gastos en este periodo</p>
          <p className="text-xs text-zinc-400 max-w-xs mx-auto">
            Registra egresos para visualizar la distribución porcentual en el anillo interactivo Liquid Glass.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center relative z-10">
          {/* SVG Donut Ring */}
          <div className="md:col-span-5 flex flex-col items-center justify-center relative">
            <div className="relative w-48 h-48 flex items-center justify-center">
              <svg
                className="w-full h-full -rotate-90 transform"
                viewBox={`0 0 ${size} ${size}`}
              >
                {/* Background circle track */}
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  stroke="rgba(255, 255, 255, 0.05)"
                  strokeWidth={strokeWidth}
                  fill="transparent"
                />

                {/* Category Segments */}
                {segments.map((seg) => {
                  const isSelected = selectedCategory === seg.category;
                  return (
                    <circle
                      key={seg.category}
                      cx={size / 2}
                      cy={size / 2}
                      r={radius}
                      stroke={seg.color}
                      strokeWidth={isSelected ? strokeWidth + 4 : strokeWidth}
                      strokeDasharray={seg.strokeDasharray}
                      strokeDashoffset={seg.strokeDashoffset}
                      strokeLinecap="round"
                      fill="transparent"
                      onMouseEnter={() => setSelectedCategory(seg.category)}
                      onMouseLeave={() => setSelectedCategory(null)}
                      className="transition-all duration-300 cursor-pointer opacity-90 hover:opacity-100"
                      style={{
                        filter: isSelected ? `drop-shadow(0 0 8px ${seg.color})` : 'none',
                      }}
                    />
                  );
                })}
              </svg>

              {/* Inner Center Label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-3 pointer-events-none">
                <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">
                  {activeCategory ? activeCategory.category : 'Total'}
                </span>
                <span className="text-lg font-black text-white">
                  {activeCategory ? `${activeCategory.percentage}%` : '100%'}
                </span>
                <span className="text-[11px] text-purple-200 font-semibold">
                  {activeCategory
                    ? formatCurrency(activeCategory.amount, currency, exchangeRate)
                    : formatCurrency(totalExpense, currency, exchangeRate)}
                </span>
              </div>
            </div>
          </div>

          {/* Categories List with Progress and Badges */}
          <div className="md:col-span-7 space-y-2 max-h-56 overflow-y-auto pr-1">
            {categoriesData.map((item) => {
              const isHovered = selectedCategory === item.category;
              return (
                <div
                  key={item.category}
                  onMouseEnter={() => setSelectedCategory(item.category)}
                  onMouseLeave={() => setSelectedCategory(null)}
                  className={`p-2 rounded-xl transition-all duration-200 cursor-pointer flex flex-col gap-1 border ${
                    isHovered
                      ? 'bg-white/[0.08] border-purple-400/40 shadow-sm'
                      : 'bg-white/[0.02] border-transparent hover:bg-white/[0.05]'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-zinc-200 font-medium truncate">
                        {item.category}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-semibold text-white">
                        {formatCurrency(item.amount, currency, exchangeRate)}
                      </span>
                      <span className="text-[11px] font-bold text-purple-300 w-8 text-right">
                        {item.percentage}%
                      </span>
                    </div>
                  </div>

                  {/* Mini progress bar */}
                  <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${item.percentage}%`,
                        backgroundColor: item.color,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
