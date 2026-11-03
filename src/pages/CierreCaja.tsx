import { useState, useMemo } from 'react';
import {
  Wallet,
  TrendingUp,
  Receipt,
  Users,
  Download,
  Share2,
  Check,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Banknote,
  Save,
  Clock,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { Card, Button, Badge, Input, EmptyState } from '@/components/ui';
import { PageHeader } from '@/layout/PageHeader';
import { formatCurrency, formatCurrencyWithSymbol } from '@/utils/format';
import { mockVentas, mockGastos, mockCierres, mockPagosFiados, mockUsuarios, mockPuntosDeVenta } from '@/mockData';
import type { Venta } from '@/types';

const DENOMINACIONES = [
  { valor: 20000, label: '$20,000' },
  { valor: 10000, label: '$10,000' },
  { valor: 5000, label: '$5,000' },
  { valor: 2000, label: '$2,000' },
  { valor: 1000, label: '$1,000' },
  { valor: 500, label: '$500' },
  { valor: 200, label: '$200' },
  { valor: 100, label: '$100' },
  { valor: 50, label: '$50' },
  { valor: 20, label: '$20' },
  { valor: 10, label: '$10' },
  { valor: 5, label: '$5' },
  { valor: 1, label: '$1' },
];

export function CierreCaja() {
  const hoy = '2026-11-03';
  const [denominaciones, setDenominaciones] = useState<Record<number, string>>(
    Object.fromEntries(DENOMINACIONES.map((d) => [d.valor, '']))
  );
  const [fondoInicial, setFondoInicial] = useState('1000');
  const [retiros, setRetiros] = useState('0');
  const [cierreGuardado, setCierreGuardado] = useState(false);

  const pdv = mockPuntosDeVenta[0];

  // Ventas de hoy
  const ventasHoy = useMemo(
    () =>
      mockVentas.filter(
        (v) => v.estado === 'completada' && v.fecha.startsWith(hoy)
      ),
    [hoy]
  );

  const totalVentas = ventasHoy.reduce((s, v) => s + v.total, 0);
  const totalGanancia = ventasHoy.reduce((s, v) => {
    const costo = v.items.reduce((c, item) => {
      const prod = mockProductos.find((p) => p.id === item.productoId);
      return c + (prod?.precioCompra ?? 0) * item.cantidad;
    }, 0);
    return s + v.total - costo - v.impuesto;
  }, 0);
  const totalGastos = mockGastos
    .filter((g) => g.fecha === hoy)
    .reduce((s, g) => s + g.monto, 0);
  const totalFiados = ventasHoy
    .filter((v) => v.esFiado)
    .reduce((s, v) => s + v.total, 0);
  const pagosFiadosHoy = mockPagosFiados
    .filter((p) => p.fecha === hoy)
    .reduce((s, p) => s + p.monto, 0);

  // Ventas en efectivo
  const ventasEfectivo = ventasHoy
    .filter((v) => v.metodosPago.some((p) => p.metodo === 'efectivo'))
    .reduce((s, v) => {
      const efectivo = v.metodosPago
        .filter((p) => p.metodo === 'efectivo')
        .reduce((sum, p) => sum + p.monto, 0);
      return s + efectivo;
    }, 0);

  // Desglose por vendedor
  const porVendedor = useMemo(() => {
    const grupos: Record<string, { nombre: string; ventas: number; cantidad: number }> = {};
    ventasHoy.forEach((v) => {
      if (!grupos[v.vendedorId]) {
        grupos[v.vendedorId] = { nombre: v.vendedorNombre, ventas: 0, cantidad: 0 };
      }
      grupos[v.vendedorId].ventas += v.total;
      grupos[v.vendedorId].cantidad += 1;
    });
    return Object.values(grupos);
  }, [ventasHoy]);

  // Desglose por metodo de pago
  const porMetodo = useMemo(() => {
    const metodos = { efectivo: 0, tarjeta: 0, transferencia: 0 };
    ventasHoy.forEach((v) => {
      v.metodosPago.forEach((p) => {
        metodos[p.metodo] += p.monto;
      });
    });
    return metodos;
  }, [ventasHoy]);

  // Arqueo
  const montoContado = DENOMINACIONES.reduce(
    (s, d) => s + (parseInt(denominaciones[d.valor]) || 0) * d.valor,
    0
  );
  const fondoInicialNum = parseInt(fondoInicial) || 0;
  const retirosNum = parseInt(retiros) || 0;
  const efectivoEsperado = fondoInicialNum + ventasEfectivo - retirosNum + pagosFiadosHoy;
  const diferencia = montoContado - efectivoEsperado;

  const handleDenominacionChange = (valor: number, cantidad: string) => {
    setDenominaciones((prev) => ({ ...prev, [valor]: cantidad }));
  };

  const guardarCierre = () => {
    setCierreGuardado(true);
    setTimeout(() => setCierreGuardado(false), 3000);
  };

  const cierresAnteriores = mockCierres.slice(0, 5);

  const resumenItems = [
    {
      label: 'Total ventas',
      value: totalVentas,
      icon: TrendingUp,
      color: 'text-white',
    },
    {
      label: 'Ganancia',
      value: totalGanancia,
      icon: Wallet,
      color: 'text-emerald-400',
    },
    {
      label: 'Gastos',
      value: totalGastos,
      icon: Receipt,
      color: 'text-red-400',
    },
    {
      label: 'Fiados',
      value: totalFiados,
      icon: Users,
      color: 'text-amber-400',
    },
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Cierre de Caja"
        subtitle={`Resumen del día — ${new Date(hoy).toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })}`}
        icon={<Wallet className="w-5 h-5" />}
        actions={
          <>
            <Button variant="secondary" size="sm" leftIcon={<Download className="w-4 h-4" />}>
              PDF
            </Button>
            <Button variant="secondary" size="sm" leftIcon={<Share2 className="w-4 h-4" />}>
              Compartir
            </Button>
          </>
        }
      />

      {/* KPIs del día */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
        {resumenItems.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.label}>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-lg bg-slate-800 border border-white/10 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-slate-400" />
                </div>
                <span className="text-xs text-slate-400">{item.label}</span>
              </div>
              <p className={cn('text-xl font-semibold tabular-nums tracking-tight', item.color)}>
                {formatCurrency(item.value)}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">CUP</p>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        {/* Desglose por vendedor */}
        <Card>
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-400" />
            Desglose por vendedor
          </h3>
          <div className="space-y-3">
            {porVendedor.map((v, i) => (
              <div
                key={i}
                className="flex items-center justify-between py-2 border-b border-white/5 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-xs font-semibold text-slate-300">
                    {v.nombre.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-100">{v.nombre}</p>
                    <p className="text-xs text-slate-500">{v.cantidad} ventas</p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-white tabular-nums">
                  {formatCurrency(v.ventas)}
                </span>
              </div>
            ))}
            {porVendedor.length === 0 && (
              <p className="text-sm text-slate-500 text-center py-4">No hay ventas hoy</p>
            )}
          </div>
        </Card>

        {/* Desglose por metodo de pago + fiados */}
        <Card>
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Banknote className="w-4 h-4 text-slate-400" />
            Métodos de pago
          </h3>
          <div className="space-y-3">
            {[
              { label: 'Efectivo', valor: porMetodo.efectivo, variant: 'info' as const },
              { label: 'Tarjeta', valor: porMetodo.tarjeta, variant: 'success' as const },
              { label: 'Transferencia', valor: porMetodo.transferencia, variant: 'warning' as const },
            ].map((m) => (
              <div key={m.label} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <Badge variant={m.variant} dot>{m.label}</Badge>
                <span className="text-sm font-semibold text-white tabular-nums">
                  {formatCurrency(m.valor)}
                </span>
              </div>
            ))}
            <div className="pt-2 mt-2 border-t border-white/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-amber-400" />
                  <span className="text-sm text-slate-300">Pagos de fiados recibidos</span>
                </div>
                <span className="text-sm font-semibold text-emerald-400 tabular-nums">
                  +{formatCurrency(pagosFiadosHoy)}
                </span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Arqueo físico */}
      <Card className="mt-4">
        <h3 className="text-sm font-semibold text-white mb-1">Arqueo de efectivo</h3>
        <p className="text-xs text-slate-500 mb-4">
          Cuenta los billetes y monedas físicos para verificar la caja
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Denominaciones */}
          <div className="lg:col-span-2">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {DENOMINACIONES.map((d) => {
                const cantidad = parseInt(denominaciones[d.valor]) || 0;
                const subtotal = cantidad * d.valor;
                return (
                  <div
                    key={d.valor}
                    className="flex items-center gap-2 bg-slate-800/50 border border-white/5 rounded-lg p-2"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-300 tabular-nums">{d.label}</p>
                      {cantidad > 0 && (
                        <p className="text-xs text-slate-500 tabular-nums">= {formatCurrency(subtotal)}</p>
                      )}
                    </div>
                    <input
                      type="number"
                      value={denominaciones[d.valor]}
                      onChange={(e) => handleDenominacionChange(d.valor, e.target.value)}
                      placeholder="0"
                      className="w-14 h-8 rounded-md bg-slate-900 border border-white/10 text-sm text-slate-100 text-center tabular-nums focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors duration-150"
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Resumen arqueo */}
          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Fondo inicial</label>
              <Input
                type="number"
                value={fondoInicial}
                onChange={(e) => setFondoInicial(e.target.value)}
                className="tabular-nums"
                leftIcon={<Wallet className="w-4 h-4" />}
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Retiros del día</label>
              <Input
                type="number"
                value={retiros}
                onChange={(e) => setRetiros(e.target.value)}
                className="tabular-nums"
              />
            </div>

            <div className="space-y-2 pt-2 border-t border-white/10">
              <Row label="Ventas en efectivo" value={ventasEfectivo} />
              <Row label="Pagos de fiados" value={pagosFiadosHoy} />
              <Row label="Retiros" value={-retirosNum} negative />
              <Row label="Fondo inicial" value={fondoInicialNum} />
              <div className="pt-2 border-t border-white/10">
                <Row label="Esperado en caja" value={efectivoEsperado} bold />
              </div>
              <Row label="Contado (arqueo)" value={montoContado} bold />

              {/* Diferencia */}
              <div
                className={cn(
                  'rounded-lg p-3 mt-2 border',
                  diferencia === 0
                    ? 'bg-slate-800/50 border-white/10'
                    : diferencia > 0
                    ? 'bg-emerald-500/10 border-emerald-500/20'
                    : 'bg-red-500/10 border-red-500/20'
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {diferencia === 0 ? (
                      <Check className="w-4 h-4 text-slate-400" />
                    ) : diferencia > 0 ? (
                      <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <ArrowDownRight className="w-4 h-4 text-red-400" />
                    )}
                    <span className="text-sm font-medium text-slate-200">Diferencia</span>
                  </div>
                  <span
                    className={cn(
                      'text-lg font-semibold tabular-nums',
                      diferencia === 0
                        ? 'text-slate-100'
                        : diferencia > 0
                        ? 'text-emerald-400'
                        : 'text-red-400'
                    )}
                  >
                    {diferencia > 0 ? '+' : ''}{formatCurrency(diferencia)}
                  </span>
                </div>
                {diferencia !== 0 && (
                  <p className="text-xs text-slate-400 mt-1.5">
                    {diferencia > 0
                      ? `Sobran ${formatCurrency(Math.abs(diferencia))} CUP en caja`
                      : `Faltan ${formatCurrency(Math.abs(diferencia))} CUP en caja`}
                  </p>
                )}
              </div>
            </div>

            <Button
              fullWidth
              size="lg"
              onClick={guardarCierre}
              leftIcon={cierreGuardado ? <Check className="w-5 h-5" /> : <Save className="w-5 h-5" />}
              variant={cierreGuardado ? 'secondary' : 'primary'}
            >
              {cierreGuardado ? 'Cierre guardado' : 'Guardar cierre'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Cierres anteriores */}
      <Card className="mt-4">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-400" />
          Cierres anteriores
        </h3>
        {cierresAnteriores.length > 0 ? (
          <div className="space-y-2">
            {cierresAnteriores.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between py-3 px-3 rounded-lg bg-slate-800/30 border border-white/5 hover:border-white/10 transition-colors duration-150"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-slate-800 border border-white/10 flex items-center justify-center">
                    <Wallet className="w-4 h-4 text-slate-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-100">
                      {new Date(c.fecha).toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </p>
                    <p className="text-xs text-slate-500">{c.vendedorNombre}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-xs text-slate-500">Ventas</p>
                    <p className="text-sm font-medium text-slate-100 tabular-nums">{formatCurrency(c.totalVentas)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500">Contado</p>
                    <p className="text-sm font-medium text-slate-100 tabular-nums">{formatCurrency(c.montoReal)}</p>
                  </div>
                  <div className="text-right min-w-[70px]">
                    <p className="text-xs text-slate-500">Diferencia</p>
                    <p
                      className={cn(
                        'text-sm font-semibold tabular-nums',
                        c.diferencia === 0
                          ? 'text-slate-300'
                          : c.diferencia > 0
                          ? 'text-emerald-400'
                          : 'text-red-400'
                      )}
                    >
                      {c.diferencia > 0 ? '+' : ''}{formatCurrency(c.diferencia)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Wallet className="w-6 h-6" />}
            title="No hay cierres anteriores"
            description="Los cierres que guardes aparecerán aquí"
          />
        )}
      </Card>
    </div>
  );
}

function Row({
  label,
  value,
  bold,
  negative,
}: {
  label: string;
  value: number;
  bold?: boolean;
  negative?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-slate-400">{label}</span>
      <span
        className={cn(
          'tabular-nums',
          bold ? 'text-sm font-semibold text-white' : 'text-sm text-slate-200',
          negative && value !== 0 && 'text-red-400'
        )}
      >
        {value < 0 ? '-' : ''}{formatCurrency(Math.abs(value))}
      </span>
    </div>
  );
}

// Need to import mockProductos for ganancia calc
import { mockProductos } from '@/mockData';
