import { useState, useMemo } from 'react';
import {
  FileBarChart,
  Download,
  Share2,
  FileText,
  FileSpreadsheet,
  Package,
  Wallet,
  TrendingUp,
  Users,
  DollarSign,
  AlertTriangle,
  Check,
  Printer,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { Card, Button, Badge, EmptyState } from '@/components/ui';
import { PageHeader } from '@/layout/PageHeader';
import { formatCurrency } from '@/utils/format';
import { mockProductos, mockVentas, mockCierres, mockClientes } from '@/mockData';

export function Reportes() {
  const [generando, setGenerando] = useState<string | null>(null);
  const [generado, setGenerado] = useState<string | null>(null);

  // Resumen
  const valorInventario = mockProductos.reduce(
    (s, p) => s + p.precioVenta * p.stockActual,
    0
  );
  const valorVenta = mockVentas
    .filter((v) => v.estado === 'completada')
    .reduce((s, v) => s + v.total, 0);
  const gananciaPotencial = mockVentas
    .filter((v) => v.estado === 'completada')
    .reduce((s, v) => {
      const costo = v.items.reduce((c, item) => {
        const prod = mockProductos.find((p) => p.id === item.productoId);
        return c + (prod?.precioCompra ?? 0) * item.cantidad;
      }, 0);
      return s + v.total - costo - v.impuesto;
    }, 0);
  const totalFiado = mockClientes.reduce((s, c) => s + c.saldoPendiente, 0);
  const productosStockBajo = mockProductos.filter(
    (p) => p.stockActual <= p.stockMinimo
  ).length;

  const generar = (tipo: string) => {
    setGenerando(tipo);
    setTimeout(() => {
      setGenerando(null);
      setGenerado(tipo);
      setTimeout(() => setGenerado(null), 2500);
    }, 1200);
  };

  const resumenCards = [
    {
      label: 'Valor de inventario',
      value: formatCurrency(valorInventario),
      icon: Package,
      color: 'text-white',
      sub: `${mockProductos.length} productos`,
    },
    {
      label: 'Valor de ventas',
      value: formatCurrency(valorVenta),
      icon: TrendingUp,
      color: 'text-emerald-400',
      sub: `${mockVentas.filter((v) => v.estado === 'completada').length} ventas`,
    },
    {
      label: 'Ganancia potencial',
      value: formatCurrency(gananciaPotencial),
      icon: DollarSign,
      color: 'text-blue-400',
      sub: 'Después de costo',
    },
    {
      label: 'Total fiado',
      value: formatCurrency(totalFiado),
      icon: Users,
      color: 'text-amber-400',
      sub: `${mockClientes.filter((c) => c.saldoPendiente > 0).length} clientes`,
    },
  ];

  const reportesPDF = [
    {
      id: 'pdf-inventario',
      title: 'Inventario completo',
      description: 'Listado de todos los productos con stock, precios y valor',
      icon: Package,
    },
    {
      id: 'pdf-cuentas',
      title: 'Cuentas por cobrar',
      description: 'Clientes con saldo pendiente y detalles de fiados',
      icon: Users,
    },
  ];

  const reportesCSV = [
    {
      id: 'csv-inventario',
      title: 'Inventario (CSV)',
      description: 'Exporta todos los productos para Excel o Google Sheets',
      icon: FileSpreadsheet,
    },
    {
      id: 'csv-cierres',
      title: 'Cierres de caja (CSV)',
      description: 'Historial de cierres con totales y diferencias',
      icon: Wallet,
    },
    {
      id: 'csv-clientes',
      title: 'Clientes (CSV)',
      description: 'Listado completo con saldos pendientes',
      icon: Users,
    },
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Reportes"
        subtitle="Genera y exporta reportes del negocio"
        icon={<FileBarChart className="w-5 h-5" />}
      />

      {/* Resumen */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
        {resumenCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label}>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-lg bg-slate-800 border border-white/10 flex items-center justify-center">
                  <Icon className={cn('w-5 h-5', card.color)} />
                </div>
                <span className="text-xs text-slate-400">{card.label}</span>
              </div>
              <p className={cn('text-xl font-semibold tabular-nums tracking-tight', card.color)}>
                {card.value}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">{card.sub}</p>
            </Card>
          );
        })}
      </div>

      {/* Alertas */}
      {productosStockBajo > 0 && (
        <Card className="mt-4 border-amber-500/20">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-100">
                {productosStockBajo} producto{productosStockBajo !== 1 ? 's' : ''} con stock bajo
              </p>
              <p className="text-xs text-slate-400">
                Considera reponer inventario antes de que se agote
              </p>
            </div>
            <Badge variant="warning" dot>
              Atención
            </Badge>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        {/* Reportes PDF */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-red-400" />
            <h3 className="text-sm font-semibold text-white">Reportes PDF</h3>
            <Badge variant="default">Con logo y firma</Badge>
          </div>
          <div className="space-y-3">
            {reportesPDF.map((r) => {
              const Icon = r.icon;
              const isGenerating = generando === r.id;
              const isDone = generado === r.id;
              return (
                <div
                  key={r.id}
                  className="flex items-center justify-between py-3 px-3 rounded-lg bg-slate-800/30 border border-white/5"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-slate-800 border border-white/10 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-slate-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-100">{r.title}</p>
                      <p className="text-xs text-slate-500 truncate">{r.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => generar(r.id)}
                      loading={isGenerating}
                      leftIcon={!isGenerating && !isDone ? <Download className="w-3.5 h-3.5" /> : undefined}
                    >
                      {isDone ? <Check className="w-3.5 h-3.5" /> : isGenerating ? '' : 'PDF'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => generar(r.id + '-print')}
                      loading={generando === r.id + '-print'}
                    >
                      <Printer className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Reportes CSV */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-semibold text-white">Reportes CSV</h3>
            <Badge variant="default">Para Excel/Sheets</Badge>
          </div>
          <div className="space-y-3">
            {reportesCSV.map((r) => {
              const Icon = r.icon;
              const isGenerating = generando === r.id;
              const isDone = generado === r.id;
              return (
                <div
                  key={r.id}
                  className="flex items-center justify-between py-3 px-3 rounded-lg bg-slate-800/30 border border-white/5"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-slate-800 border border-white/10 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-slate-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-100">{r.title}</p>
                      <p className="text-xs text-slate-500 truncate">{r.description}</p>
                    </div>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => generar(r.id)}
                    loading={isGenerating}
                    leftIcon={!isGenerating && !isDone ? <Download className="w-3.5 h-3.5" /> : undefined}
                  >
                    {isDone ? <Check className="w-3.5 h-3.5" /> : isGenerating ? '' : 'CSV'}
                  </Button>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Vista previa de datos */}
      <Card className="mt-4">
        <h3 className="text-sm font-semibold text-white mb-4">Vista previa: Inventario</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider py-3 px-3">Producto</th>
                <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wider py-3 px-3">P. Compra</th>
                <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wider py-3 px-3">P. Venta</th>
                <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wider py-3 px-3">Stock</th>
                <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wider py-3 px-3">Valor</th>
                <th className="text-center text-xs font-medium text-slate-500 uppercase tracking-wider py-3 px-3">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {mockProductos.slice(0, 8).map((p) => {
                const valor = p.precioVenta * p.stockActual;
                const sinStock = p.stockActual <= 0;
                const stockBajo = p.stockActual <= p.stockMinimo;
                return (
                  <tr key={p.id} className="hover:bg-white/5 transition-colors duration-100">
                    <td className="py-3 px-3 text-sm font-medium text-slate-100">{p.nombre}</td>
                    <td className="py-3 px-3 text-right text-sm text-slate-400 tabular-nums">
                      {formatCurrency(p.precioCompra)}
                    </td>
                    <td className="py-3 px-3 text-right text-sm text-slate-100 tabular-nums">
                      {formatCurrency(p.precioVenta)}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span className={cn(
                        'text-sm tabular-nums',
                        sinStock ? 'text-red-400' : stockBajo ? 'text-amber-400' : 'text-slate-100'
                      )}>
                        {p.stockActual}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right text-sm font-medium text-white tabular-nums">
                      {formatCurrency(valor)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {sinStock ? (
                        <Badge variant="danger">Sin stock</Badge>
                      ) : stockBajo ? (
                        <Badge variant="warning" dot>Bajo</Badge>
                      ) : (
                        <Badge variant="success" dot>OK</Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-slate-500 mt-3 text-center">
          Mostrando 8 de {mockProductos.length} productos
        </p>
      </Card>
    </div>
  );
}
