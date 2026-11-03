import { useState, useMemo, useEffect } from 'react';
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
  Users,
} from 'lucide-react';
import { Card, Badge } from '@/components/ui';
import { cn } from '@/utils/cn';
import { formatCurrency, formatCurrencyWithSymbol } from '@/utils/format';
import { PageHeader } from '@/layout/PageHeader';
import { db, stockTotalProducto } from '@/db';
import type { Venta, Producto, Gasto } from '@/db';
import { usePDV } from '@/contexts/PuntoDeVentaContext';

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
  const { pdvActivo, modoTodos } = usePDV();
  const [periodo, setPeriodo] = useState<Periodo>('mes');
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);

  // Cargar datos de Dexie
  useEffect(() => {
    (async () => {
      try {
        const [v, p, g, c] = await Promise.all([
          db.ventas.toArray(),
          db.productos.toArray(),
          db.gastos.toArray(),
          db.clientes.toArray(),
        ]);
        setVentas(v);
        setProductos(p);
        setGastos(g);
        setClientes(c);
      } catch (e) {
        console.error('[dashboard] Error cargando:', e);
      } finally {
        setCargando(false);
      }
    })();
  }, []);

  // Filtrar por PDV activo
  const ventasPDV = useMemo(() => {
    if (modoTodos || !pdvActivo?.id) return ventas;
    return ventas.filter((v) => v.puntoDeVentaId === pdvActivo.id);
  }, [ventas, pdvActivo, modoTodos]);

  const productosPDV = useMemo(() => {
    if (modoTodos || !pdvActivo?.id) return productos;
    return productos.filter((p) => p.puntoDeVentaId === pdvActivo.id);
  }, [productos, pdvActivo, modoTodos]);

  const gastosPDV = useMemo(() => {
    if (modoTodos || !pdvActivo?.id) return gastos;
    return gastos.filter((g) => g.puntoDeVentaId === pdvActivo.id);
  }, [gastos, pdvActivo, modoTodos]);

  // Filtrar por período
  const filteredVentas = useMemo(() => {
    const now = new Date();
    return ventasPDV.filter((v) => {
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
  }, [ventasPDV, periodo]);

  const filteredGastos = useMemo(() => {
    const now = new Date();
    return gastosPDV.filter((g) => {
      const fecha = new Date(g.fecha);
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
  }, [gastosPDV, periodo]);

  // KPIs
  const totalVendido = filteredVentas.reduce((sum, v) => sum + v.total, 0);
  const totalGanancia = filteredVentas.reduce((sum, v) => {
    const items = v.items ?? [];
    if (items.length === 0) return sum;
    return sum + items.reduce((si, item) => {
      const prod = productosPDV.find((p) => p.id === item.productoId);
      const costo = (prod?.precioCompra ?? item.precioCompra ?? 0) * item.cantidad;
      return si + (item.subtotal - costo);
    }, 0);
  }, 0);
  const ticketPromedio =
    filteredVentas.length > 0 ? totalVendido / filteredVentas.length : 0;
  const totalGastos = filteredGastos.reduce((s, g) => s + g.monto, 0);

  // Comparativa con período anterior
  const prevVentas = useMemo(() => {
    const now = new Date();
    const prevStart = new Date(now);
    const prevEnd = new Date(now);

    switch (periodo) {
      case 'hoy':
        prevStart.setDate(prevStart.getDate() - 1);
        prevEnd.setDate(prevEnd.getDate() - 1);
        break;
      case 'semana':
        prevStart.setDate(prevStart.getDate() - 14);
        prevEnd.setDate(prevEnd.getDate() - 7);
        break;
      case 'mes':
        prevStart.setDate(prevStart.getDate() - 60);
        prevEnd.setDate(prevEnd.getDate() - 30);
        break;
      default:
        prevStart.setFullYear(prevStart.getFullYear() - 1);
    }

    return ventasPDV.filter((v) => {
      if (v.estado !== 'completada') return false;
      const fecha = new Date(v.fecha);
      return fecha >= prevStart && fecha <= prevEnd;
    });
  }, [ventasPDV, periodo]);

  const prevTotalVendido = prevVentas.reduce((sum, v) => sum + v.total, 0);
  const ventasChange =
    prevTotalVendido > 0
      ? ((totalVendido - prevTotalVendido) / prevTotalVendido) * 100
      : 0;

  // Ventas por día (últimos 7)
  const ventasPorDia = useMemo(() => {
    const days = 7;
    const labels: string[] = [];
    const data: number[] = [];
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      labels.push(
        d.toLocaleDateString('es', { weekday: 'short', day: 'numeric' })
      );
      const total = ventasPDV
        .filter(
          (v) =>
            v.estado === 'completada' &&
            new Date(v.fecha).toDateString() === d.toDateString()
        )
        .reduce((s, v) => s + v.total, 0);
      data.push(total);
    }
    return { labels, data };
  }, [ventasPDV]);

  // Top 5 productos
  const topProductos = useMemo(() => {
    const counts: Record<string, { nombre: string; cantidad: number; total: number }> = {};
    filteredVentas.forEach((v) => {
      (v.items ?? []).forEach((item) => {
        const key = String(item.productoId);
        if (!counts[key]) {
          counts[key] = { nombre: item.productoNombre, cantidad: 0, total: 0 };
        }
        counts[key].cantidad += item.cantidad;
        counts[key].total += item.subtotal;
      });
    });
    return Object.values(counts)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [filteredVentas]);

  // Métodos de pago
  const metodosPago = useMemo(() => {
    const counts = { efectivo: 0, tarjeta: 0, transferencia: 0, fiado: 0 };
    filteredVentas.forEach((v) => {
      (v.metodosPago ?? []).forEach((p) => {
        if (p.tipo in counts) counts[p.tipo as keyof typeof counts] += p.montoEnCUP;
      });
    });
    return counts;
  }, [filteredVentas]);

  // Alertas
  const stockBajo = productosPDV.filter(
    (p) => !p.esCompuesto && stockTotalProducto(p) <= p.stockMinimo
  );
  const vencimientos = productosPDV.filter((p) => {
    if (!p.fechaVencimiento) return false;
    const dias = (new Date(p.fechaVencimiento).getTime() - Date.now()) / 86400000;
    return dias <= 14 && dias >= 0;
  });
  const totalFiado = clientes.reduce((s, c) => s + (c.saldoPendiente ?? 0), 0);
  const clientesConDeuda = clientes.filter((c) => (c.saldoPendiente ?? 0) > 0).length;

  const kpis = [
    {
      label: 'Vendido',
      value: formatCurrencyWithSymbol(totalVendido),
      icon: DollarSign,
      change: prevTotalVendido > 0 ? ventasChange : null,
      changeLabel: 'vs período anterior',
    },
    {
      label: 'Ganancia',
      value: formatCurrencyWithSymbol(totalGanancia - totalGastos),
      icon: TrendingUp,
      change: null,
      changeLabel: 'neta (ganancia - gastos)',
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
      value: String(productosPDV.length),
      icon: Package,
      change: null,
      changeLabel: `${stockBajo.length} con stock bajo`,
    },
  ];

  if (cargando) {
    return (
      <div className="animate-fade-in">
        <PageHeader title="Dashboard" subtitle="Cargando datos…" />
        <Card className="mt-4">
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 animate-spin rounded-full border-2 border-blue-500/30 border-t-blue-500" />
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Dashboard"
        subtitle={
          modoTodos || !pdvActivo
            ? 'Todos los puntos de venta'
            : pdvActivo.nombre.replace(/^[^\s]+\s/, '')
        }
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

      {/* KPIs */}
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
                labels: ['Efectivo', 'Tarjeta', 'Transferencia', 'Fiado'],
                datasets: [
                  {
                    data: [
                      metodosPago.efectivo,
                      metodosPago.tarjeta,
                      metodosPago.transferencia,
                      metodosPago.fiado,
                    ],
                    backgroundColor: ['#2563eb', '#10b981', '#f59e0b', '#ef4444'],
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
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-white">Top 5 productos</h3>
              <p className="text-xs text-slate-500 mt-0.5">Por ingresos del período</p>
            </div>
          </div>
          <div className="h-64">
            {topProductos.length > 0 ? (
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
            ) : (
              <div className="h-full flex items-center justify-center text-center">
                <div>
                  <Package className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-sm text-slate-400">Sin ventas en este período</p>
                </div>
              </div>
            )}
          </div>
        </Card>

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
                        {stockTotalProducto(p)}/{p.stockMinimo}
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
                  {vencimientos.slice(0, 4).map((p) => (
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
            {clientesConDeuda > 0 && (
              <div className="pt-3 border-t border-white/10">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="info" dot>
                    Fiados
                  </Badge>
                </div>
                <div className="flex items-start gap-2">
                  <Users className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-400">
                    <strong className="text-slate-200">{clientesConDeuda}</strong> clientes deben{' '}
                    <strong className="text-slate-200">{formatCurrency(totalFiado)}</strong> en total.
                  </p>
                </div>
              </div>
            )}
            {stockBajo.length === 0 && vencimientos.length === 0 && clientesConDeuda === 0 && (
              <p className="text-sm text-slate-400 text-center py-4">
                ✅ Todo en orden. Sin alertas pendientes.
              </p>
            )}
            <div className="pt-3 border-t border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="info" dot>
                  Recordatorio
                </Badge>
              </div>
              <div className="flex items-start gap-2">
                <Database className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <p className="text-xs text-slate-400">
                  Haz backup regularmente desde <strong className="text-slate-200">Configuración → Backup</strong>.
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Comparativa */}
      <Card className="mt-4">
        <h3 className="text-base font-semibold text-white mb-4">Comparativa con período anterior</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <ComparisonItem
            label="Ventas"
            current={totalVendido}
            previous={prevTotalVendido}
          />
          <ComparisonItem
            label="Gastos"
            current={totalGastos}
            previous={0}
          />
          <ComparisonItem
            label="Fiados otorgados"
            current={filteredVentas.filter((v) => v.esFiado).reduce((s, v) => s + v.total, 0)}
            previous={0}
          />
          <ComparisonItem
            label="Ganancia neta"
            current={totalGanancia - totalGastos}
            previous={0}
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
      {previous > 0 && (
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
      )}
    </div>
  );
}