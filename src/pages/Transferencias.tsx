import { useState, useMemo } from 'react';
import {
  ArrowRightLeft,
  ArrowRight,
  Plus,
  Package,
  Check,
  Clock,
  Search,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { Card, Button, Badge, Input, Select, EmptyState } from '@/components/ui';
import { PageHeader } from '@/layout/PageHeader';
import { formatCurrency } from '@/utils/format';
import { mockProductos, mockPuntosDeVenta } from '@/mockData';
import type { Producto } from '@/types';

type EstadoTransferencia = 'completada' | 'pendiente';

interface Transferencia {
  id: string;
  productoId: string;
  productoNombre: string;
  cantidad: number;
  pdvOrigenId: string;
  pdvOrigenNombre: string;
  pdvDestinoId: string;
  pdvDestinoNombre: string;
  estado: EstadoTransferencia;
  fecha: string;
}

const transferenciasIniciales: Transferencia[] = [
  {
    id: 'tr-1',
    productoId: 'p-1',
    productoNombre: 'Coca-Cola 1.5L',
    cantidad: 12,
    pdvOrigenId: 'pdv-1',
    pdvOrigenNombre: 'Tienda Principal',
    pdvDestinoId: 'pdv-2',
    pdvDestinoNombre: 'Sucursal Centro',
    estado: 'completada',
    fecha: '2026-11-03T09:30:00Z',
  },
  {
    id: 'tr-2',
    productoId: 'p-4',
    productoNombre: 'Arroz 5kg',
    cantidad: 6,
    pdvOrigenId: 'pdv-2',
    pdvOrigenNombre: 'Sucursal Centro',
    pdvDestinoId: 'pdv-1',
    pdvDestinoNombre: 'Tienda Principal',
    estado: 'completada',
    fecha: '2026-11-02T14:15:00Z',
  },
  {
    id: 'tr-3',
    productoId: 'p-10',
    productoNombre: 'Pan de Agua',
    cantidad: 20,
    pdvOrigenId: 'pdv-1',
    pdvOrigenNombre: 'Tienda Principal',
    pdvDestinoId: 'pdv-2',
    pdvDestinoNombre: 'Sucursal Centro',
    estado: 'pendiente',
    fecha: '2026-11-03T11:00:00Z',
  },
  {
    id: 'tr-4',
    productoId: 'p-7',
    productoNombre: 'Detergente 1kg',
    cantidad: 8,
    pdvOrigenId: 'pdv-2',
    pdvOrigenNombre: 'Sucursal Centro',
    pdvDestinoId: 'pdv-1',
    pdvDestinoNombre: 'Tienda Principal',
    estado: 'completada',
    fecha: '2026-11-01T16:45:00Z',
  },
  {
    id: 'tr-5',
    productoId: 'p-15',
    productoNombre: 'Café Molido 250g',
    cantidad: 5,
    pdvOrigenId: 'pdv-1',
    pdvOrigenNombre: 'Tienda Principal',
    pdvDestinoId: 'pdv-2',
    pdvDestinoNombre: 'Sucursal Centro',
    estado: 'pendiente',
    fecha: '2026-11-03T15:20:00Z',
  },
];

export function Transferencias() {
  const [transferencias, setTransferencias] = useState<Transferencia[]>(
    transferenciasIniciales
  );
  const [search, setSearch] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');
  const [form, setForm] = useState({
    productoId: '',
    cantidad: '',
    pdvOrigenId: '',
    pdvDestinoId: '',
  });

  const productoSeleccionado = useMemo(
    () => mockProductos.find((p) => p.id === form.productoId),
    [form.productoId]
  );

  const formValido =
    form.productoId &&
    form.cantidad &&
    parseInt(form.cantidad, 10) > 0 &&
    form.pdvOrigenId &&
    form.pdvDestinoId &&
    form.pdvOrigenId !== form.pdvDestinoId;

  const crearTransferencia = () => {
    if (!formValido || !productoSeleccionado) return;
    const origen = mockPuntosDeVenta.find((p) => p.id === form.pdvOrigenId);
    const destino = mockPuntosDeVenta.find((p) => p.id === form.pdvDestinoId);
    if (!origen || !destino) return;

    const nueva: Transferencia = {
      id: `tr-${Date.now()}`,
      productoId: productoSeleccionado.id,
      productoNombre: productoSeleccionado.nombre,
      cantidad: parseInt(form.cantidad, 10),
      pdvOrigenId: origen.id,
      pdvOrigenNombre: origen.nombre,
      pdvDestinoId: destino.id,
      pdvDestinoNombre: destino.nombre,
      estado: 'pendiente',
      fecha: new Date().toISOString(),
    };
    setTransferencias((prev) => [nueva, ...prev]);
    setForm({ productoId: '', cantidad: '', pdvOrigenId: '', pdvDestinoId: '' });
  };

  const transferenciasFiltradas = useMemo(() => {
    let lista = transferencias;
    if (filtroEstado !== 'todos') {
      lista = lista.filter((t) => t.estado === filtroEstado);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      lista = lista.filter(
        (t) =>
          t.productoNombre.toLowerCase().includes(q) ||
          t.pdvOrigenNombre.toLowerCase().includes(q) ||
          t.pdvDestinoNombre.toLowerCase().includes(q)
      );
    }
    return lista.sort((a, b) => b.fecha.localeCompare(a.fecha));
  }, [transferencias, filtroEstado, search]);

  const pendientes = transferencias.filter((t) => t.estado === 'pendiente')
    .length;
  const completadas = transferencias.filter((t) => t.estado === 'completada')
    .length;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Transferencias"
        subtitle="Mueve productos entre puntos de venta"
        icon={<ArrowRightLeft className="w-5 h-5" />}
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
        <Card>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg bg-slate-800 border border-white/10 flex items-center justify-center">
              <ArrowRightLeft className="w-5 h-5 text-slate-400" />
            </div>
            <span className="text-xs text-slate-400">Total transferencias</span>
          </div>
          <p className="text-xl font-semibold text-white tabular-nums">
            {transferencias.length}
          </p>
        </Card>
        <Card>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg bg-slate-800 border border-white/10 flex items-center justify-center">
              <Check className="w-5 h-5 text-emerald-400" />
            </div>
            <span className="text-xs text-slate-400">Completadas</span>
          </div>
          <p className="text-xl font-semibold text-white tabular-nums">
            {completadas}
          </p>
        </Card>
        <Card>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg bg-slate-800 border border-white/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-400" />
            </div>
            <span className="text-xs text-slate-400">Pendientes</span>
          </div>
          <p className="text-xl font-semibold text-white tabular-nums">
            {pendientes}
          </p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
        {/* Formulario */}
        <div>
          <Card>
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <Plus className="w-4 h-4 text-blue-400" />
              Nueva transferencia
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">
                  Producto
                </label>
                <Select
                  value={form.productoId}
                  onChange={(e) =>
                    setForm({ ...form, productoId: e.target.value })
                  }
                >
                  <option value="">Seleccionar producto</option>
                  {mockProductos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} (Stock: {p.stockActual})
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">
                  Cantidad
                </label>
                <Input
                  type="number"
                  value={form.cantidad}
                  onChange={(e) =>
                    setForm({ ...form, cantidad: e.target.value })
                  }
                  placeholder="0"
                  className="tabular-nums"
                  min="1"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">
                  Punto de venta origen
                </label>
                <Select
                  value={form.pdvOrigenId}
                  onChange={(e) =>
                    setForm({ ...form, pdvOrigenId: e.target.value })
                  }
                >
                  <option value="">Seleccionar origen</option>
                  {mockPuntosDeVenta.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">
                  Punto de venta destino
                </label>
                <Select
                  value={form.pdvDestinoId}
                  onChange={(e) =>
                    setForm({ ...form, pdvDestinoId: e.target.value })
                  }
                  error={
                    !!form.pdvDestinoId &&
                    form.pdvDestinoId === form.pdvOrigenId
                  }
                >
                  <option value="">Seleccionar destino</option>
                  {mockPuntosDeVenta.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}
                    </option>
                  ))}
                </Select>
                {form.pdvDestinoId &&
                  form.pdvDestinoId === form.pdvOrigenId && (
                    <p className="text-xs text-red-400 mt-1.5">
                      El destino debe ser distinto al origen
                    </p>
                  )}
              </div>
              <Button
                fullWidth
                onClick={crearTransferencia}
                disabled={!formValido}
                leftIcon={<ArrowRightLeft className="w-4 h-4" />}
              >
                Crear transferencia
              </Button>
            </div>
          </Card>
        </div>

        {/* Lista de transferencias */}
        <div className="lg:col-span-2">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-4">
            <div className="flex-1">
              <Input
                type="text"
                placeholder="Buscar transferencia..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                leftIcon={<Search className="w-4 h-4" />}
              />
            </div>
            <Select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="sm:w-40"
            >
              <option value="todos">Todos los estados</option>
              <option value="completada">Completadas</option>
              <option value="pendiente">Pendientes</option>
            </Select>
          </div>

          <Card padding="sm">
            {transferenciasFiltradas.length > 0 ? (
              <div className="space-y-2">
                {transferenciasFiltradas.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-white/5 hover:border-white/10 hover:bg-white/5 transition-colors duration-150"
                  >
                    <div className="w-9 h-9 rounded-lg bg-slate-800 border border-white/10 flex items-center justify-center shrink-0">
                      <Package className="w-4 h-4 text-slate-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-100 truncate">
                        {t.productoNombre}
                      </p>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                        <span className="truncate">{t.pdvOrigenNombre}</span>
                        <ArrowRight className="w-3 h-3 shrink-0" />
                        <span className="truncate">{t.pdvDestinoNombre}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-sm font-semibold text-white tabular-nums">
                        {t.cantidad} u
                      </span>
                      <Badge
                        variant={
                          t.estado === 'completada' ? 'success' : 'warning'
                        }
                        dot
                      >
                        {t.estado}
                      </Badge>
                    </div>
                    <span className="text-xs text-slate-500 whitespace-nowrap shrink-0 hidden sm:block">
                      {new Date(t.fecha).toLocaleDateString('es', {
                        day: '2-digit',
                        month: 'short',
                      })}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<ArrowRightLeft className="w-6 h-6" />}
                title="No hay transferencias"
                description="Crea una nueva transferencia para mover stock entre PDVs"
              />
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
