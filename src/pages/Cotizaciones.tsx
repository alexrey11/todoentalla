import { useState, useMemo } from 'react';
import {
  FileText,
  Plus,
  Search,
  Trash2,
  Check,
  Download,
  ShoppingCart,
  Calendar,
  User,
  X,
  Package,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { Card, Button, Badge, Input, Select, Modal, EmptyState } from '@/components/ui';
import { PageHeader } from '@/layout/PageHeader';
import { formatCurrency, formatCurrencyWithSymbol } from '@/utils/format';
import { mockCotizaciones, mockProductos } from '@/mockData';
import type { Cotizacion, EstadoCotizacion, ItemVenta } from '@/types';

const estadoConfig: Record<
  EstadoCotizacion,
  { label: string; variant: 'default' | 'success' | 'danger' | 'warning' | 'info' }
> = {
  pendiente: { label: 'Pendiente', variant: 'warning' },
  aceptada: { label: 'Aceptada', variant: 'success' },
  rechazada: { label: 'Rechazada', variant: 'danger' },
  vencida: { label: 'Vencida', variant: 'default' },
  convertida: { label: 'Convertida', variant: 'info' },
};

interface ItemForm {
  productoId: string;
  nombre: string;
  precioUnitario: number;
  cantidad: number;
}

export function Cotizaciones() {
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>(mockCotizaciones);
  const [search, setSearch] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');
  const [modalOpen, setModalOpen] = useState(false);
  const [convertId, setConvertId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [clienteNombre, setClienteNombre] = useState('');
  const [items, setItems] = useState<ItemForm[]>([]);
  const [productoSeleccionado, setProductoSeleccionado] = useState<string>('');

  const cotizacionesFiltradas = useMemo(() => {
    let lista = cotizaciones;
    if (filtroEstado !== 'todos') lista = lista.filter((c) => c.estado === filtroEstado);
    if (search.trim()) {
      const q = search.toLowerCase();
      lista = lista.filter(
        (c) =>
          c.numero.toLowerCase().includes(q) ||
          c.clienteNombre.toLowerCase().includes(q)
      );
    }
    return lista;
  }, [cotizaciones, search, filtroEstado]);

  const totalNuevo = items.reduce((s, it) => s + it.precioUnitario * it.cantidad, 0);
  const totalConImpuesto = Math.round(totalNuevo * 1.1);

  const abrirNuevo = () => {
    setClienteNombre('');
    setItems([]);
    setProductoSeleccionado('');
    setModalOpen(true);
  };

  const agregarProducto = () => {
    if (!productoSeleccionado) return;
    const prod = mockProductos.find((p) => p.id === productoSeleccionado);
    if (!prod) return;
    if (items.some((it) => it.productoId === prod.id)) return;
    setItems((prev) => [
      ...prev,
      {
        productoId: prod.id,
        nombre: prod.nombre,
        precioUnitario: prod.precioVenta,
        cantidad: 1,
      },
    ]);
    setProductoSeleccionado('');
  };

  const actualizarCantidad = (productoId: string, cantidad: number) => {
    setItems((prev) =>
      prev.map((it) =>
        it.productoId === productoId
          ? { ...it, cantidad: Math.max(1, cantidad) }
          : it
      )
    );
  };

  const eliminarItem = (productoId: string) => {
    setItems((prev) => prev.filter((it) => it.productoId !== productoId));
  };

  const guardar = () => {
    if (!clienteNombre.trim() || items.length === 0) return;
    const year = new Date().getFullYear();
    const num = cotizaciones.length + 1;
    const numero = `COT-${year}-${String(num).padStart(4, '0')}`;
    const nuevosItems: ItemVenta[] = items.map((it) => ({
      productoId: it.productoId,
      nombre: it.nombre,
      cantidad: it.cantidad,
      precioUnitario: it.precioUnitario,
      descuento: 0,
      subtotal: it.precioUnitario * it.cantidad,
    }));
    const nueva: Cotizacion = {
      id: `cot-${Date.now()}`,
      numero,
      fecha: new Date().toISOString().slice(0, 10),
      estado: 'pendiente',
      items: nuevosItems,
      total: totalConImpuesto,
      clienteNombre: clienteNombre.trim(),
    };
    setCotizaciones((prev) => [nueva, ...prev]);
    setModalOpen(false);
  };

  const convertirVenta = () => {
    if (!convertId) return;
    setCotizaciones((prev) =>
      prev.map((c) => (c.id === convertId ? { ...c, estado: 'convertida' } : c))
    );
    setConvertId(null);
  };

  const eliminar = () => {
    if (!deleteId) return;
    setCotizaciones((prev) => prev.filter((c) => c.id !== deleteId));
    setDeleteId(null);
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Cotizaciones"
        subtitle={`${cotizaciones.length} cotizaciones registradas`}
        icon={<FileText className="w-5 h-5" />}
        actions={
          <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={abrirNuevo}>
            Nueva cotización
          </Button>
        }
      />

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mt-4">
        <div className="flex-1">
          <Input
            type="text"
            placeholder="Buscar por número o cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>
        <Select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          className="sm:w-44"
        >
          <option value="todos">Todos los estados</option>
          <option value="pendiente">Pendientes</option>
          <option value="aceptada">Aceptadas</option>
          <option value="rechazada">Rechazadas</option>
          <option value="vencida">Vencidas</option>
          <option value="convertida">Convertidas</option>
        </Select>
      </div>

      {/* Lista de cotizaciones */}
      <Card className="mt-4" padding="sm">
        {cotizacionesFiltradas.length > 0 ? (
          <div className="divide-y divide-white/5">
            {cotizacionesFiltradas.map((cot) => {
              const estCfg = estadoConfig[cot.estado];
              return (
                <div
                  key={cot.id}
                  className="flex items-center gap-3 py-3 px-3 hover:bg-white/5 transition-colors duration-100"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-medium text-slate-100 truncate">
                        {cot.numero}
                      </span>
                      <Badge variant={estCfg.variant} dot>
                        {estCfg.label}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {cot.clienteNombre}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(cot.fecha).toLocaleDateString('es', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                      <span>{cot.items.length} items</span>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-white tabular-nums shrink-0">
                    {formatCurrency(cot.total)}
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      leftIcon={<Download className="w-3.5 h-3.5" />}
                      className="text-slate-400 hover:text-slate-100"
                    >
                      PDF
                    </Button>
                    {cot.estado !== 'convertida' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        leftIcon={<ShoppingCart className="w-3.5 h-3.5" />}
                        onClick={() => setConvertId(cot.id)}
                        className="text-blue-400 hover:text-blue-300"
                      >
                        Convertir a venta
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteId(cot.id)}
                      className="text-slate-500 hover:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon={<FileText className="w-6 h-6" />}
            title="No hay cotizaciones"
            description="No se encontraron cotizaciones con los filtros aplicados"
            action={
              <Button leftIcon={<Plus className="w-4 h-4" />} onClick={abrirNuevo}>
                Nueva cotización
              </Button>
            }
          />
        )}
      </Card>

      {/* Modal nueva cotización */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Nueva cotización"
        description="Crea una cotización para un cliente"
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={guardar}
              disabled={!clienteNombre.trim() || items.length === 0}
              leftIcon={<Check className="w-4 h-4" />}
            >
              Crear cotización
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {/* Cliente */}
          <div>
            <label className="text-xs text-slate-400 mb-1.5 block">Cliente</label>
            <Input
              value={clienteNombre}
              onChange={(e) => setClienteNombre(e.target.value)}
              placeholder="Nombre del cliente"
              leftIcon={<User className="w-4 h-4" />}
              autoFocus
            />
          </div>

          {/* Agregar productos */}
          <div>
            <label className="text-xs text-slate-400 mb-1.5 block">Agregar producto</label>
            <div className="flex items-center gap-2">
              <Select
                value={productoSeleccionado}
                onChange={(e) => setProductoSeleccionado(e.target.value)}
                className="flex-1"
              >
                <option value="">Selecciona un producto...</option>
                {mockProductos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} — {formatCurrency(p.precioVenta)}
                  </option>
                ))}
              </Select>
              <Button
                variant="secondary"
                onClick={agregarProducto}
                disabled={!productoSeleccionado}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Agregar
              </Button>
            </div>
          </div>

          {/* Items */}
          {items.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Productos
              </p>
              {items.map((it) => (
                <div
                  key={it.productoId}
                  className="flex items-center gap-3 py-2 px-3 rounded-lg bg-slate-800/30 border border-white/5"
                >
                  <Package className="w-4 h-4 text-slate-500 shrink-0" />
                  <span className="text-sm text-slate-200 flex-1 truncate">{it.nombre}</span>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={it.cantidad}
                      onChange={(e) =>
                        actualizarCantidad(it.productoId, parseInt(e.target.value) || 1)
                      }
                      className="w-16 text-center"
                    />
                    <span className="text-xs text-slate-500">x</span>
                    <span className="text-sm text-slate-300 tabular-nums w-20 text-right">
                      {formatCurrency(it.precioUnitario * it.cantidad)}
                    </span>
                    <button
                      onClick={() => eliminarItem(it.productoId)}
                      className="text-slate-500 hover:text-red-400 transition-colors duration-150"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}

              {/* Totales */}
              <div className="pt-3 border-t border-white/5 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Subtotal</span>
                  <span className="text-slate-300 tabular-nums">
                    {formatCurrency(totalNuevo)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Impuesto (10%)</span>
                  <span className="text-slate-300 tabular-nums">
                    {formatCurrency(totalConImpuesto - totalNuevo)}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-white/5">
                  <span className="text-sm font-semibold text-white">Total</span>
                  <span className="text-sm font-semibold text-white tabular-nums">
                    {formatCurrencyWithSymbol(totalConImpuesto)}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-6 text-center">
              <Package className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-500">Agrega productos a la cotización</p>
            </div>
          )}
        </div>
      </Modal>

      {/* Modal convertir a venta */}
      <Modal
        open={convertId !== null}
        onClose={() => setConvertId(null)}
        title="Convertir a venta"
        description="La cotización pasará a estado convertida"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConvertId(null)}>
              Cancelar
            </Button>
            <Button onClick={convertirVenta} leftIcon={<ShoppingCart className="w-4 h-4" />}>
              Convertir
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-400">
          ¿Seguro que deseas convertir esta cotización en una venta? Se registrará como una
          nueva transacción y la cotización quedará marcada como convertida.
        </p>
      </Modal>

      {/* Modal eliminar */}
      <Modal
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        title="Eliminar cotización"
        description="Esta acción no se puede deshacer"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteId(null)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={eliminar} leftIcon={<Trash2 className="w-4 h-4" />}>
              Eliminar
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-400">
          ¿Seguro que deseas eliminar esta cotización? Se perderán todos los datos asociados.
        </p>
      </Modal>
    </div>
  );
}
