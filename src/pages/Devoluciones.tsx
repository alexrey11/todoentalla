import { useState, useMemo } from 'react';
import {
  RotateCcw,
  Plus,
  Search,
  Calendar,
  Package,
  DollarSign,
  Check,
  Filter,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { Card, Button, Badge, Input, Select, Modal, EmptyState } from '@/components/ui';
import { PageHeader } from '@/layout/PageHeader';
import { formatCurrency } from '@/utils/format';
import { mockVentas, mockProductos } from '@/mockData';
import type { Venta, ItemVenta } from '@/types';

interface Devolucion {
  id: string;
  ventaId: string;
  fecha: string;
  productoNombre: string;
  cantidad: number;
  motivo: string;
  montoReembolsado: number;
}

const motivosDevolucion = [
  'Producto defectuoso',
  'Producto vencido',
  'Error de venta',
  'Cliente insatisfecho',
  'Producto incorrecto',
  'Otro',
];

const devolucionesIniciales: Devolucion[] = [
  {
    id: 'dev-1',
    ventaId: 'v-30-0',
    fecha: '2026-11-03T13:45:00Z',
    productoNombre: 'Coca-Cola 1.5L',
    cantidad: 2,
    motivo: 'Producto defectuoso',
    montoReembolsado: 440,
  },
  {
    id: 'dev-2',
    ventaId: 'v-29-1',
    fecha: '2026-11-02T16:20:00Z',
    productoNombre: 'Pan de Agua',
    cantidad: 3,
    motivo: 'Producto vencido',
    montoReembolsado: 231,
  },
  {
    id: 'dev-3',
    ventaId: 'v-28-0',
    fecha: '2026-11-02T11:10:00Z',
    productoNombre: 'Aceite Vegetal 1L',
    cantidad: 1,
    motivo: 'Error de venta',
    montoReembolsado: 352,
  },
  {
    id: 'dev-4',
    ventaId: 'v-27-2',
    fecha: '2026-11-01T18:30:00Z',
    productoNombre: 'Jugo Naranja 1L',
    cantidad: 2,
    motivo: 'Cliente insatisfecho',
    montoReembolsado: 484,
  },
];

export function Devoluciones() {
  const [devoluciones, setDevoluciones] = useState<Devolucion[]>(
    devolucionesIniciales
  );
  const [search, setSearch] = useState('');
  const [filtroMotivo, setFiltroMotivo] = useState<string>('todos');
  const [filtroFecha, setFiltroFecha] = useState<string>('todos');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    ventaId: '',
    itemIndex: '',
    cantidad: '',
    motivo: '',
  });

  const ventasDisponibles = useMemo(() => {
    const ventasConDevolucion = new Set(devoluciones.map((d) => d.ventaId));
    return mockVentas.filter(
      (v) => v.estado === 'completada' && !ventasConDevolucion.has(v.id)
    );
  }, [devoluciones]);

  const ventaSeleccionada = useMemo(
    () => mockVentas.find((v) => v.id === form.ventaId),
    [form.ventaId]
  );

  const itemSeleccionado = useMemo<ItemVenta | null>(() => {
    if (!ventaSeleccionada || !form.itemIndex) return null;
    return ventaSeleccionada.items[parseInt(form.itemIndex, 10)] ?? null;
  }, [ventaSeleccionada, form.itemIndex]);

  const formValido =
    form.ventaId &&
    form.itemIndex &&
    itemSeleccionado &&
    form.cantidad &&
    parseInt(form.cantidad, 10) > 0 &&
    parseInt(form.cantidad, 10) <= itemSeleccionado.cantidad &&
    form.motivo;

  const devolucionesFiltradas = useMemo(() => {
    let lista = devoluciones;
    if (filtroMotivo !== 'todos') {
      lista = lista.filter((d) => d.motivo === filtroMotivo);
    }
    if (filtroFecha !== 'todos') {
      lista = lista.filter((d) => d.fecha.startsWith(filtroFecha));
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      lista = lista.filter(
        (d) =>
          d.productoNombre.toLowerCase().includes(q) ||
          d.motivo.toLowerCase().includes(q) ||
          d.ventaId.toLowerCase().includes(q)
      );
    }
    return lista.sort((a, b) => b.fecha.localeCompare(a.fecha));
  }, [devoluciones, filtroMotivo, filtroFecha, search]);

  const totalReembolsado = devoluciones.reduce(
    (s, d) => s + d.montoReembolsado,
    0
  );
  const totalReembolsadoFiltrado = devolucionesFiltradas.reduce(
    (s, d) => s + d.montoReembolsado,
    0
  );

  const fechas = useMemo(() => {
    const set = new Set(devoluciones.map((d) => d.fecha.slice(0, 10)));
    return Array.from(set).sort().reverse();
  }, [devoluciones]);

  const abrirModal = () => {
    setForm({ ventaId: '', itemIndex: '', cantidad: '', motivo: '' });
    setModalOpen(true);
  };

  const registrarDevolucion = () => {
    if (!formValido || !ventaSeleccionada || !itemSeleccionado) return;
    const cantidad = parseInt(form.cantidad, 10);
    const montoReembolsado = itemSeleccionado.precioUnitario * cantidad;

    const nueva: Devolucion = {
      id: `dev-${Date.now()}`,
      ventaId: ventaSeleccionada.id,
      fecha: new Date().toISOString(),
      productoNombre: itemSeleccionado.nombre,
      cantidad,
      motivo: form.motivo,
      montoReembolsado,
    };
    setDevoluciones((prev) => [nueva, ...prev]);
    setModalOpen(false);
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Devoluciones"
        subtitle="Registra y controla las devoluciones de productos"
        icon={<RotateCcw className="w-5 h-5" />}
        actions={
          <Button
            size="sm"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={abrirModal}
          >
            Registrar devolucion
          </Button>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
        <Card>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg bg-slate-800 border border-white/10 flex items-center justify-center">
              <RotateCcw className="w-5 h-5 text-slate-400" />
            </div>
            <span className="text-xs text-slate-400">Total devoluciones</span>
          </div>
          <p className="text-xl font-semibold text-white tabular-nums">
            {devoluciones.length}
          </p>
        </Card>
        <Card>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg bg-slate-800 border border-white/10 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-red-400" />
            </div>
            <span className="text-xs text-slate-400">Total reembolsado</span>
          </div>
          <p className="text-xl font-semibold text-white tabular-nums">
            {formatCurrency(totalReembolsado)} CUP
          </p>
        </Card>
        <Card>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg bg-slate-800 border border-white/10 flex items-center justify-center">
              <Filter className="w-5 h-5 text-blue-400" />
            </div>
            <span className="text-xs text-slate-400">Reembolso filtrado</span>
          </div>
          <p className="text-xl font-semibold text-white tabular-nums">
            {formatCurrency(totalReembolsadoFiltrado)} CUP
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            {devolucionesFiltradas.length} devoluciones
          </p>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mt-4">
        <div className="flex-1">
          <Input
            type="text"
            placeholder="Buscar devolucion..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>
        <Select
          value={filtroMotivo}
          onChange={(e) => setFiltroMotivo(e.target.value)}
          className="sm:w-48"
        >
          <option value="todos">Todos los motivos</option>
          {motivosDevolucion.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </Select>
        <Select
          value={filtroFecha}
          onChange={(e) => setFiltroFecha(e.target.value)}
          className="sm:w-40"
        >
          <option value="todos">Todas las fechas</option>
          {fechas.map((f) => (
            <option key={f} value={f}>
              {new Date(f).toLocaleDateString('es', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </option>
          ))}
        </Select>
      </div>

      {/* Tabla de devoluciones */}
      <Card padding="sm" className="mt-4">
        {devolucionesFiltradas.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider py-3 px-3">
                    Fecha
                  </th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider py-3 px-3">
                    Producto
                  </th>
                  <th className="text-center text-xs font-medium text-slate-500 uppercase tracking-wider py-3 px-3">
                    Cantidad
                  </th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider py-3 px-3 hidden md:table-cell">
                    Motivo
                  </th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider py-3 px-3 hidden lg:table-cell">
                    Venta
                  </th>
                  <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wider py-3 px-3">
                    Reembolso
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {devolucionesFiltradas.map((d) => (
                  <tr
                    key={d.id}
                    className="hover:bg-white/5 transition-colors duration-100"
                  >
                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-slate-500" />
                        <span className="text-xs text-slate-400">
                          {new Date(d.fecha).toLocaleDateString('es', {
                            day: '2-digit',
                            month: 'short',
                          })}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-slate-800 border border-white/10 flex items-center justify-center shrink-0">
                          <Package className="w-4 h-4 text-slate-500" />
                        </div>
                        <span className="text-sm font-medium text-slate-100">
                          {d.productoNombre}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="text-sm font-medium text-slate-200 tabular-nums">
                        {d.cantidad}
                      </span>
                    </td>
                    <td className="py-3 px-3 hidden md:table-cell">
                      <Badge variant="warning">{d.motivo}</Badge>
                    </td>
                    <td className="py-3 px-3 hidden lg:table-cell">
                      <span className="text-xs text-slate-500 tabular-nums">
                        {d.ventaId}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <span className="text-sm font-semibold text-red-400 tabular-nums">
                        -{formatCurrency(d.montoReembolsado)} CUP
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={<RotateCcw className="w-6 h-6" />}
            title="No hay devoluciones"
            description="Registra una devolucion para verla aqui"
            action={
              <Button
                leftIcon={<Plus className="w-4 h-4" />}
                onClick={abrirModal}
              >
                Registrar devolucion
              </Button>
            }
          />
        )}
      </Card>

      {/* Modal registrar devolucion */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Registrar devolucion"
        description="Selecciona la venta y el producto a devolver"
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={registrarDevolucion}
              disabled={!formValido}
              leftIcon={<Check className="w-4 h-4" />}
            >
              Registrar
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {/* Seleccionar venta */}
          <div>
            <label className="text-xs text-slate-400 mb-1.5 block">
              Venta
            </label>
            <Select
              value={form.ventaId}
              onChange={(e) =>
                setForm({ ...form, ventaId: e.target.value, itemIndex: '', cantidad: '' })
              }
            >
              <option value="">Seleccionar venta</option>
              {ventasDisponibles.slice(0, 50).map((v) => (
                <option key={v.id} value={v.id}>
                  {v.id} — {new Date(v.fecha).toLocaleDateString('es', { day: '2-digit', month: 'short' })} — {formatCurrency(v.total)} CUP
                </option>
              ))}
            </Select>
          </div>

          {/* Items de la venta */}
          {ventaSeleccionada && (
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">
                Producto
              </label>
              <Select
                value={form.itemIndex}
                onChange={(e) =>
                  setForm({ ...form, itemIndex: e.target.value, cantidad: '' })
                }
              >
                <option value="">Seleccionar producto</option>
                {ventaSeleccionada.items.map((item, idx) => (
                  <option key={idx} value={String(idx)}>
                    {item.nombre} — {item.cantidad} u — {formatCurrency(item.precioUnitario)} CUP/u
                  </option>
                ))}
              </Select>
            </div>
          )}

          {/* Cantidad y motivo */}
          {itemSeleccionado && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">
                    Cantidad a devolver
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
                    max={itemSeleccionado.cantidad}
                    autoFocus
                  />
                  <p className="text-xs text-slate-500 mt-1.5">
                    Maximo: {itemSeleccionado.cantidad} unidades
                  </p>
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">
                    Motivo
                  </label>
                  <Select
                    value={form.motivo}
                    onChange={(e) =>
                      setForm({ ...form, motivo: e.target.value })
                    }
                  >
                    <option value="">Seleccionar motivo</option>
                    {motivosDevolucion.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              {/* Resumen */}
              <div className="rounded-lg bg-slate-800/50 border border-white/5 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">
                    Monto a reembolsar
                  </span>
                  <span className="text-lg font-semibold text-red-400 tabular-nums">
                    -{formatCurrency(
                      (parseInt(form.cantidad, 10) || 0) *
                        itemSeleccionado.precioUnitario
                    )}{' '}
                    CUP
                  </span>
                </div>
              </div>
            </>
          )}

          {ventasDisponibles.length === 0 && (
            <div className="rounded-lg bg-slate-800/50 border border-white/5 p-4 text-center">
              <p className="text-sm text-slate-400">
                No hay ventas disponibles para devolver
              </p>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
