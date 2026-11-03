import { useState, useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  DollarSign,
  TrendingUp,
  Receipt,
  Package,
  AlertTriangle,
  Clock,
  Database,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
} from 'lucide-react';
import { Card, Badge } from '@/components/ui';
import { cn } from '@/utils/cn';
import { formatCurrency, formatCurrencyWithSymbol } from '@/utils/format';
import { mockVentas, mockProductos, mockGastos } from '@/mockData';
import { PageHeader } from '@/layout/PageHeader';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

type Periodo = 'hoy' | 'semana' | 'mes' | 'todo';

const periodLabels: Record<Periodo, string> = {
  hoy: 'Hoy',
  semana: 'Semana',
  mes: 'Mes',
  todo: 'Todo',
};

export function Dashboard() {
  const [periodo, setPeriodo] = useState<Periodo>('mes');

  const filteredVentas = useMemo(() => {
    const now = new Date('2026-11-03');
    return mockVentas.filter((v) => {
      if (v.estado !== 'completada') return false;
      const fecha = new Date(v.fecha);
      switch (periodo) {
        case 'hoy':
          return fecha.toDateString() === now.toDateString();
        case 'semana': {
          const weekAgo = new Date(now);
          weekAgo.setDate(weekAgo.getDate() - 7);
          return fecha >= weekAgo;
        }
        case 'mes': {
          const monthAgo = new Date(now);
          monthAgo.setDate(monthAgo.getDate() - 30);
          return fecha >= monthAgo;
        }
        default:
          return true;
      }
    });
  }, [periodo]);

  // KPIs
  const totalVendido = filteredVentas.reduce((sum, v) => sum + v.total, 0);
  const totalGanancia = filteredVentas.reduce((sum, v) => {
    const costo = v.items.reduce((s, item) => {
      const prod = mockProductos.find((p) => p.id === item.productoId);
      return s + (prod?.precioCompra ?? 0) * item.cantidad;
    }, 0);
    return sum + v.total - costo - v.impuesto;
  }, 0);
  const ticketPromedio =
    filteredVentas.length > 0 ? totalVendido / filteredVentas.length : 0;
  const totalProductos = mockProductos.length;

  // Comparison with previous period
  const now = new Date('2026-11-03');
  const prevPeriodStart = new Date(now);
  const prevPeriodEnd = new Date(now);
  switch (periodo) {
    case 'hoy':
      prevPeriodStart.setDate(prevPeriodStart.getDate() - 1);
      prevPeriodEnd.setDate(prevPeriodEnd.getDate() - 1);
      break;
    case 'semana':
      prevPeriodStart.setDate(prevPeriodStart.getDate() - 14);
      prevPeriodEnd.setDate(prevPeriodEnd.getDate() - 7);
      break;
    case 'mes':
      prevPeriodStart.setDate(prevPeriodStart.getDate() - 60);
      prevPeriodEnd.setDate(prevPeriodEnd.getDate() - 30);
      break;
    default:
      prevPeriodStart.setFullYear(prevPeriodStart.getFullYear() - 1);
  }

  const prevVentas = mockVentas.filter((v) => {
    if (v.estado !== 'completada') return false;
    const fecha = new Date(v.fecha);
    return fecha >= prevPeriodStart && fecha <= prevPeriodEnd;
  });
  const prevTotalVendido = prevVentas.reduce((sum, v) => sum + v.total, 0);
  const ventasChange =
    prevTotalVendido > 0
      ? ((totalVendido - prevTotalVendido) / prevTotalVendido) * 100
      : 0;

  // Sales by day chart
  const ventasPorDia = useMemo(() => {
    const days = 7;
    const labels: string[] = [];
    const data: number[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      labels.push(
        d.toLocaleDateString('es', { weekday: 'short', day: 'numeric' })
      );
      const total = mockVentas
        .filter(
          (v) =>
            v.estado === 'completada' &&
            new Date(v.fecha).toDateString() === d.toDateString()
        )
        .reduce((s, v) => s + v.total, 0);
      data.push(total);
    }
    return { labels, data };
  }, []);

  // Top 5 products
  const topProductos = useMemo(() => {
    const counts: Record<string, { nombre: string; cantidad: number; total: number }> = {};
    filteredVentas.forEach((v) => {
      v.items.forEach((item) => {
        if (!counts[item.productoId]) {
          counts[item.productoId] = { nombre: item.nombre, cantidad: 0, total: 0 };
        }
        counts[item.productoId].cantidad += item.cantidad;
        counts[item.productoId].total += item.subtotal;
      });
    });
    return Object.values(counts)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [filteredVentas]);

  // Payment methods
  const metodosPago = useMemo(() => {
    const counts = { efectivo: 0, tarjeta: 0, transferencia: 0 };
    filteredVentas.forEach((v) => {
      v.metodosPago.forEach((p) => {
        counts[p.metodo] += p.monto;
      });
    });
    return counts;
  }, [filteredVentas]);

  // Alerts
  const stockBajo = mockProductos.filter((p) => p.stockActual <= p.stockMinimo);
  const vencimientos = mockProductos.filter(
    (p) => p.fechaVencimiento && new Date(p.fechaVencimiento) <= new Date('2026-11-17')
  );

  const kpis = [
    {
      label: 'Vendido',
      value: formatCurrencyWithSymbol(totalVendido),
      icon: DollarSign,
      change: ventasChange,
      changeLabel: 'vs período anterior',
    },
    {
      label: 'Ganancia',
      value: formatCurrencyWithSymbol(totalGanancia),
      icon: TrendingUp,
      change: null,
      changeLabel: 'estimada',
    },
    {
      label: 'Ticket Promedio',
      value: formatCurrencyWithSymbol(Math.round(ticketPromedio)),
      icon: Receipt,
      change: null,
      changeLabel: `${filteredVentas.length} ventas`,
    },
    {
      label: 'Productos',
      value: String(totalProductos),
      icon: Package,
      change: null,
      changeLabel: `${stockBajo.length} con stock bajo`,
    },
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Dashboard"
        subtitle="Resumen general del negocio"
        actions={
          <div className="flex items-center gap-1 bg-slate-900 border border-white/10 rounded-lg p-0.5">
            {(Object.keys(periodLabels) as Periodo[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriodo(p)}
                className={cn(
                  'h-8 px-3 text-xs font-medium rounded-md transition-colors duration-150',
                  periodo === p
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-slate-100'
                )}
              >
                {periodLabels[p]}
              </button>
            ))}
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.label}>
              <div className="flex items-start justify-between mb-3">
                <div className="w-9 h-9 rounded-lg bg-slate-800 border border-white/10 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-slate-400" />
                </div>
                {kpi.change !== null && (
                  <span
                    className={cn(
                      'inline-flex items-center gap-0.5 text-xs font-medium',
                      kpi.change >= 0 ? 'text-emerald-400' : 'text-red-400'
                    )}
                  >
                    {kpi.change >= 0 ? (
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    ) : (
                      <ArrowDownRight className="w-3.5 h-3.5" />
                    )}
                    {Math.abs(kpi.change).toFixed(1)}%
                  </span>
                )}
              </div>
              <p className="text-2xl font-semibold text-white tabular-nums tracking-tight">
                {kpi.value}
              </p>
              <p className="text-sm text-slate-400 mt-1">{kpi.label}</p>
              <p className="text-xs text-slate-500 mt-0.5">{kpi.changeLabel}</p>
            </Card>
          );
        })}
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
        {/* Sales by day */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-white">Ventas por día</h3>
              <p className="text-xs text-slate-500 mt-0.5">Últimos 7 días</p>
            </div>
            <Calendar className="w-5 h-5 text-slate-500" />
          </div>
          <div className="h-64">
            <Line
              data={{
                labels: ventasPorDia.labels,
                datasets: [
                  {
                    label: 'Ventas',
                    data: ventasPorDia.data,
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    fill: true,
                    tension: 0.3,
                    pointBackgroundColor: '#3b82f6',
                    pointBorderColor: '#3b82f6',
                    pointRadius: 3,
                    pointHoverRadius: 5,
                    borderWidth: 2,
                  },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    backgroundColor: '#0f172a',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderWidth: 1,
                    titleColor: '#f8fafc',
                    bodyColor: '#94a3b8',
                    padding: 12,
                    cornerRadius: 8,
                    displayColors: false,
                    callbacks: {
                      label: (ctx) => `${formatCurrency(Number(ctx.raw))} CUP`,
                    },
                  },
                },
                scales: {
                  x: {
                    grid: { display: false },
                    ticks: { color: '#64748b', font: { size: 11 } },
                    border: { color: 'rgba(255,255,255,0.05)' },
                  },
                  y: {
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: {
                      color: '#64748b',
                      font: { size: 11 },
                      callback: (val) => formatCurrency(Number(val)),
                    },
                    border: { display: false },
                  },
                },
              }}
            />
          </div>
        </Card>

        {/* Payment methods doughnut */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-white">Métodos de pago</h3>
              <p className="text-xs text-slate-500 mt-0.5">Distribución</p>
            </div>
          </div>
          <div className="h-64 flex items-center justify-center">
            <Doughnut
              data={{
                labels: ['Efectivo', 'Tarjeta', 'Transferencia'],
                datasets: [
                  {
                    data: [metodosPago.efectivo, metodosPago.tarjeta, metodosPago.transferencia],
                    backgroundColor: ['#2563eb', '#10b981', '#f59e0b'],
                    borderColor: '#0f172a',
                    borderWidth: 2,
                    hoverOffset: 4,
                  },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                cutout: '65%',
                plugins: {
                  legend: {
                    position: 'bottom',
                    labels: {
                      color: '#94a3b8',
                      font: { size: 12 },
                      padding: 12,
                      usePointStyle: true,
                      pointStyle: 'circle',
                    },
                  },
                  tooltip: {
                    backgroundColor: '#0f172a',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderWidth: 1,
                    titleColor: '#f8fafc',
                    bodyColor: '#94a3b8',
                    padding: 12,
                    cornerRadius: 8,
                    callbacks: {
                      label: (ctx) => ` ${formatCurrency(Number(ctx.raw))} CUP`,
                    },
                  },
                },
              }}
            />
          </div>
        </Card>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
        {/* Top 5 products */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-white">Top 5 productos</h3>
              <p className="text-xs text-slate-500 mt-0.5">Por ingresos del período</p>
            </div>
          </div>
          <div className="h-64">
            <Bar
              data={{
                labels: topProductos.map((p) => p.nombre),
                datasets: [
                  {
                    label: 'Ingresos',
                    data: topProductos.map((p) => p.total),
                    backgroundColor: '#2563eb',
                    borderRadius: 6,
                    barThickness: 'flex',
                    maxBarThickness: 40,
                  },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y',
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    backgroundColor: '#0f172a',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderWidth: 1,
                    titleColor: '#f8fafc',
                    bodyColor: '#94a3b8',
                    padding: 12,
                    cornerRadius: 8,
                    displayColors: false,
                    callbacks: {
                      label: (ctx) => `${formatCurrency(Number(ctx.raw))} CUP`,
                    },
                  },
                },
                scales: {
                  x: {
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: {
                      color: '#64748b',
                      font: { size: 11 },
                      callback: (val) => formatCurrency(Number(val)),
                    },
                    border: { display: false },
                  },
                  y: {
                    grid: { display: false },
                    ticks: { color: '#94a3b8', font: { size: 12 } },
                    border: { color: 'rgba(255,255,255,0.05)' },
                  },
                },
              }}
            />
          </div>
        </Card>

        {/* Alerts */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-semibold text-white">Alertas</h3>
          </div>
          <div className="space-y-3">
            {stockBajo.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="warning" dot>
                    Stock bajo
                  </Badge>
                  <span className="text-xs text-slate-500">{stockBajo.length} productos</span>
                </div>
                <div className="space-y-1.5">
                  {stockBajo.slice(0, 4).map((p) => (
                    <div key={p.id} className="flex items-center justify-between text-sm">
                      <span className="text-slate-300 truncate">{p.nombre}</span>
                      <span className="text-amber-400 text-xs tabular-nums shrink-0 ml-2">
                        {p.stockActual}/{p.stockMinimo}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {vencimientos.length > 0 && (
              <div className="pt-3 border-t border-white/10">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="danger" dot>
                    Vencimientos próximos
                  </Badge>
                </div>
                <div className="space-y-1.5">
                  {vencimientos.map((p) => (
                    <div key={p.id} className="flex items-center justify-between text-sm">
                      <span className="text-slate-300 truncate">{p.nombre}</span>
                      <span className="text-red-400 text-xs shrink-0 ml-2 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(p.fechaVencimiento!).toLocaleDateString('es')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="pt-3 border-t border-white/10">
              <div className="flex items-center gap-2">
                <Badge variant="info" dot>
                  Recordatorio
                </Badge>
              </div>
              <div className="flex items-start gap-2 mt-2">
                <Database className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <p className="text-xs text-slate-400">
                  Último backup: hace 5 días. Exporta un respaldo para proteger tus datos.
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Monthly comparison */}
      <Card className="mt-4">
        <h3 className="text-base font-semibold text-white mb-4">Comparativa mensual</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <ComparisonItem
            label="Ventas del mes"
            current={totalVendido}
            previous={prevTotalVendido}
          />
          <ComparisonItem
            label="Gastos"
            current={mockGastos.reduce((s, g) => s + g.monto, 0)}
            previous={9700}
          />
          <ComparisonItem
            label="Fiados"
            current={filteredVentas.filter((v) => v.esFiado).reduce((s, v) => s + v.total, 0)}
            previous={1200}
          />
          <ComparisonItem
            label="Ganancia neta"
            current={totalGanancia - mockGastos.reduce((s, g) => s + g.monto, 0)}
            previous={8200}
          />
        </div>
      </Card>
    </div>
  );
}

function ComparisonItem({
  label,
  current,
  previous,
}: {
  label: string;
  current: number;
  previous: number;
}) {
  const diff = current - previous;
  const pct = previous > 0 ? (diff / previous) * 100 : 0;
  const isPositive = diff >= 0;

  return (
    <div>
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className="text-lg font-semibold text-white tabular-nums">
        {formatCurrency(current)}
      </p>
      <div className="flex items-center gap-1 mt-1">
        <span
          className={cn(
            'inline-flex items-center gap-0.5 text-xs font-medium',
            isPositive ? 'text-emerald-400' : 'text-red-400'
          )}
        >
          {isPositive ? (
            <ArrowUpRight className="w-3 h-3" />
          ) : (
            <ArrowDownRight className="w-3 h-3" />
          )}
          {Math.abs(pct).toFixed(1)}%
        </span>
        <span className="text-xs text-slate-500">vs anterior</span>
      </div>
    </div>
  );
}
