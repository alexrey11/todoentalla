import { useMemo, useState } from 'react';
import {
  ArrowLeftRight,
  Search,
  ArrowDownToLine,
  ArrowUpFromLine,
  SlidersHorizontal,
  AlertTriangle,
  ClipboardCheck,
  Calendar,
} from 'lucide-react';
import { PageHeader } from '@/layout/PageHeader';
import { Card, Badge, Input, Select, EmptyState } from '@/components/ui';
import { cn } from '@/utils/cn';
import { mockMovimientos } from '@/mockData';
import type { TipoMovimiento } from '@/types';

type BadgeVariant = 'default' | 'success' | 'danger' | 'warning' | 'info';

const tipoConfig: Record<
  TipoMovimiento,
  { label: string; variant: BadgeVariant; icon: typeof ArrowDownToLine }
> = {
  entrada: { label: 'Entrada', variant: 'success', icon: ArrowDownToLine },
  salida: { label: 'Salida', variant: 'danger', icon: ArrowUpFromLine },
  ajuste: { label: 'Ajuste', variant: 'info', icon: SlidersHorizontal },
  perdida: { label: 'Pérdida', variant: 'danger', icon: AlertTriangle },
  transferencia: {
    label: 'Transferencia',
    variant: 'info',
    icon: ArrowLeftRight,
  },
  conteo: { label: 'Conteo', variant: 'warning', icon: ClipboardCheck },
};

const filtroOpciones: { value: string; label: string }[] = [
  { value: 'todos', label: 'Todos los tipos' },
  { value: 'entrada', label: 'Entrada' },
  { value: 'salida', label: 'Salida' },
  { value: 'ajuste', label: 'Ajuste' },
  { value: 'perdida', label: 'Pérdida' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'conteo', label: 'Conteo' },
];

function formatDate(fecha: string) {
  const d = new Date(fecha);
  return d.toLocaleDateString('es-CU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function MovimientosInventario() {
  const [search, setSearch] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState('todos');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return mockMovimientos.filter((m) => {
      const matchTipo =
        tipoFiltro === 'todos' || m.tipo === tipoFiltro;
      const matchSearch =
        !q ||
        m.productoNombre.toLowerCase().includes(q) ||
        m.motivo.toLowerCase().includes(q);
      return matchTipo && matchSearch;
    });
  }, [search, tipoFiltro]);

  const totalPorTipo = useMemo(() => {
    const counts: Record<string, number> = {};
    mockMovimientos.forEach((m) => {
      counts[m.tipo] = (counts[m.tipo] || 0) + 1;
    });
    return counts;
  }, []);

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Movimientos de inventario"
        subtitle="Historial de entradas, salidas y ajustes de stock"
        icon={<ArrowLeftRight className="w-5 h-5" />}
      />

      {/* KPIs por tipo */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6">
        {(Object.keys(tipoConfig) as TipoMovimiento[]).map((tipo) => {
          const cfg = tipoConfig[tipo];
          const Icon = cfg.icon;
          return (
            <Card key={tipo} padding="sm">
              <div className="flex flex-col gap-2">
                <div
                  className={cn(
                    'w-8 h-8 rounded-lg border flex items-center justify-center',
                    cfg.variant === 'success' &&
                      'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
                    cfg.variant === 'danger' &&
                      'bg-red-500/10 border-red-500/20 text-red-400',
                    cfg.variant === 'warning' &&
                      'bg-amber-500/10 border-amber-500/20 text-amber-400',
                    cfg.variant === 'info' &&
                      'bg-blue-500/10 border-blue-500/20 text-blue-400',
                    cfg.variant === 'default' &&
                      'bg-slate-800 border-white/10 text-slate-300'
                  )}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-white">
                    {totalPorTipo[tipo] || 0}
                  </p>
                  <p className="text-xs text-slate-500 font-medium">
                    {cfg.label}
                  </p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mt-6">
        <div className="flex-1 max-w-md">
          <Input
            placeholder="Buscar por producto o motivo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>
        <div className="sm:w-56">
          <Select
            value={tipoFiltro}
            onChange={(e) => setTipoFiltro(e.target.value)}
          >
            {filtroOpciones.map((op) => (
              <option key={op.value} value={op.value}>
                {op.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {/* Table */}
      <Card padding="sm" className="mt-4 overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState
            icon={<ArrowLeftRight className="w-6 h-6" />}
            title="Sin movimientos"
            description="No se encontraron movimientos con los filtros aplicados."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left">
                  <th className="py-3 px-3 text-xs font-semibold text-slate-400">
                    Tipo
                  </th>
                  <th className="py-3 px-3 text-xs font-semibold text-slate-400">
                    Producto
                  </th>
                  <th className="py-3 px-3 text-xs font-semibold text-slate-400 text-right">
                    Cantidad
                  </th>
                  <th className="py-3 px-3 text-xs font-semibold text-slate-400">
                    Motivo
                  </th>
                  <th className="py-3 px-3 text-xs font-semibold text-slate-400 text-right">
                    Fecha
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {filtered.map((mov) => {
                  const cfg = tipoConfig[mov.tipo];
                  const Icon = cfg.icon;
                  return (
                    <tr
                      key={mov.id}
                      className="hover:bg-white/5 transition-colors duration-150"
                    >
                      <td className="py-3 px-3">
                        <Badge variant={cfg.variant}>
                          <Icon className="w-3 h-3" />
                          {cfg.label}
                        </Badge>
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-sm font-medium text-slate-100">
                          {mov.productoNombre}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span
                          className={cn(
                            'text-sm font-semibold',
                            mov.cantidad > 0
                              ? 'text-emerald-400'
                              : 'text-red-400'
                          )}
                        >
                          {mov.cantidad > 0 ? '+' : ''}
                          {mov.cantidad}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-xs text-slate-400">
                          {mov.motivo}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center gap-1.5 justify-end text-xs text-slate-400">
                          <Calendar className="w-3.5 h-3.5 text-slate-500" />
                          <span>{formatDate(mov.fecha)}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
