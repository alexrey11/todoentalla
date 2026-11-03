import { useMemo, useState } from 'react';
import {
  ShoppingCart,
  Search,
  Plus,
  Trash2,
  Calendar,
  Package,
  DollarSign,
  X,
} from 'lucide-react';
import { PageHeader } from '@/layout/PageHeader';
import { Card, Button, Badge, Input, Select, Modal, EmptyState } from '@/components/ui';
import { cn } from '@/utils/cn';
import { formatCurrency } from '@/utils/format';
import { mockProductos } from '@/mockData';

interface ItemCompra {
  productoId: string;
  nombre: string;
  cantidad: number;
  costo: number;
  subtotal: number;
}

interface Compra {
  id: string;
  proveedor: string;
  fecha: string;
  items: ItemCompra[];
  total: number;
}

const initialCompras: Compra[] = [
  {
    id: 'comp-1',
    proveedor: 'Distribuidora Caribe',
    fecha: '2026-11-01',
    items: [
      { productoId: 'p-1', nombre: 'Coca-Cola 1.5L', cantidad: 24, costo: 120, subtotal: 2880 },
      { productoId: 'p-3', nombre: 'Jugo Naranja 1L', cantidad: 12, costo: 140, subtotal: 1680 },
    ],
    total: 4560,
  },
  {
    id: 'comp-2',
    proveedor: 'Bebidas del Norte',
    fecha: '2026-10-28',
    items: [
      { productoId: 'p-13', nombre: 'Cerveza Cristal 350ml', cantidad: 48, costo: 95, subtotal: 4560 },
    ],
    total: 4560,
  },
  {
    id: 'comp-3',
    proveedor: 'Abarrotes Central',
    fecha: '2026-10-25',
    items: [
      { productoId: 'p-4', nombre: 'Arroz 5kg', cantidad: 10, costo: 380, subtotal: 3800 },
      { productoId: 'p-5', nombre: 'Frijol Negro 1kg', cantidad: 15, costo: 180, subtotal: 2700 },
      { productoId: 'p-14', nombre: 'Azúcar 1kg', cantidad: 20, costo: 130, subtotal: 2600 },
    ],
    total: 9100,
  },
];

const proveedores = [
  'Distribuidora Caribe',
  'Bebidas del Norte',
  'Abarrotes Central',
  'Frigorífico Oriental',
  'Limpieza Total S.A.',
];

export default function Compras() {
  const [compras, setCompras] = useState<Compra[]>(initialCompras);
  const [search, setSearch] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [proveedor, setProveedor] = useState('');
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [items, setItems] = useState<ItemCompra[]>([]);
  const [selProducto, setSelProducto] = useState('');
  const [selCantidad, setSelCantidad] = useState('1');
  const [selCosto, setSelCosto] = useState('');
  const [formError, setFormError] = useState('');

  const [detalleCompra, setDetalleCompra] = useState<Compra | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return compras;
    return compras.filter(
      (c) =>
        c.proveedor.toLowerCase().includes(q) ||
        c.fecha.includes(q) ||
        c.items.some((i) => i.nombre.toLowerCase().includes(q))
    );
  }, [compras, search]);

  const totalCompras = useMemo(
    () => compras.reduce((acc, c) => acc + c.total, 0),
    [compras]
  );
  const totalItems = useMemo(
    () => compras.reduce((acc, c) => acc + c.items.length, 0),
    [compras]
  );

  const modalTotal = useMemo(
    () => items.reduce((acc, i) => acc + i.subtotal, 0),
    [items]
  );

  function resetModal() {
    setProveedor('');
    setFecha(new Date().toISOString().slice(0, 10));
    setItems([]);
    setSelProducto('');
    setSelCantidad('1');
    setSelCosto('');
    setFormError('');
  }

  function openAdd() {
    resetModal();
    setModalOpen(true);
  }

  function addItem() {
    if (!selProducto) {
      setFormError('Selecciona un producto');
      return;
    }
    const prod = mockProductos.find((p) => p.id === selProducto);
    if (!prod) return;
    const cantidad = Number(selCantidad) || 0;
    const costo = Number(selCosto) || prod.precioCompra;
    if (cantidad <= 0) {
      setFormError('La cantidad debe ser mayor a 0');
      return;
    }
    const subtotal = cantidad * costo;
    setItems((prev) => [
      ...prev,
      {
        productoId: prod.id,
        nombre: prod.nombre,
        cantidad,
        costo,
        subtotal,
      },
    ]);
    setSelProducto('');
    setSelCantidad('1');
    setSelCosto('');
    setFormError('');
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function saveCompra() {
    if (!proveedor) {
      setFormError('Selecciona un proveedor');
      return;
    }
    if (items.length === 0) {
      setFormError('Agrega al menos un producto');
      return;
    }
    const nueva: Compra = {
      id: `comp-${Date.now()}`,
      proveedor,
      fecha,
      items,
      total: modalTotal,
    };
    setCompras((prev) => [nueva, ...prev]);
    setModalOpen(false);
  }

  function formatDate(fecha: string) {
    const d = new Date(fecha + 'T00:00:00');
    return d.toLocaleDateString('es-CU', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Compras"
        subtitle="Registro de compras a proveedores"
        icon={<ShoppingCart className="w-5 h-5" />}
        actions={
          <Button leftIcon={<Plus className="w-4 h-4" />} onClick={openAdd}>
            Nueva compra
          </Button>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
        <Card padding="md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-800 border border-white/10 flex items-center justify-center text-slate-300">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Total compras</p>
              <p className="text-xl font-semibold text-white mt-0.5">
                {compras.length}
              </p>
            </div>
          </div>
        </Card>

        <Card padding="md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-800 border border-white/10 flex items-center justify-center text-slate-300">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Artículos</p>
              <p className="text-xl font-semibold text-white mt-0.5">
                {totalItems}
              </p>
            </div>
          </div>
        </Card>

        <Card padding="md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-800 border border-white/10 flex items-center justify-center text-slate-300">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Invertido</p>
              <p className="text-xl font-semibold text-white mt-0.5">
                {formatCurrency(totalCompras)} CUP
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Search */}
      <div className="mt-6 max-w-md">
        <Input
          placeholder="Buscar por proveedor, fecha o producto..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftIcon={<Search className="w-4 h-4" />}
        />
      </div>

      {/* Table */}
      <Card padding="sm" className="mt-4 overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState
            icon={<ShoppingCart className="w-6 h-6" />}
            title="Sin compras"
            description="No se encontraron compras con los criterios de búsqueda."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left">
                  <th className="py-3 px-3 text-xs font-semibold text-slate-400">
                    Fecha
                  </th>
                  <th className="py-3 px-3 text-xs font-semibold text-slate-400">
                    Proveedor
                  </th>
                  <th className="py-3 px-3 text-xs font-semibold text-slate-400 text-center">
                    Artículos
                  </th>
                  <th className="py-3 px-3 text-xs font-semibold text-slate-400 text-right">
                    Total
                  </th>
                  <th className="py-3 px-3 text-xs font-semibold text-slate-400 text-right">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {filtered.map((compra) => (
                  <tr
                    key={compra.id}
                    className="hover:bg-white/5 transition-colors duration-150"
                  >
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2 text-slate-300">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        <span className="text-xs">
                          {formatDate(compra.fecha)}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-sm font-medium text-slate-100">
                        {compra.proveedor}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <Badge variant="default">{compra.items.length}</Badge>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span className="text-sm font-semibold text-white">
                        {formatCurrency(compra.total)} CUP
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDetalleCompra(compra)}
                      >
                        Ver detalle
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Nueva compra modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Nueva compra"
        description="Registra una compra a un proveedor."
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={saveCompra}>Registrar compra</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Proveedor
              </label>
              <Select
                value={proveedor}
                onChange={(e) => setProveedor(e.target.value)}
              >
                <option value="">Selecciona un proveedor</option>
                {proveedores.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Fecha
              </label>
              <Input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
              />
            </div>
          </div>

          {/* Add product */}
          <div className="rounded-lg border border-white/10 p-4 bg-slate-950/50">
            <p className="text-xs font-semibold text-slate-300 mb-3">
              Agregar producto
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
              <div className="sm:col-span-6">
                <Select
                  value={selProducto}
                  onChange={(e) => {
                    setSelProducto(e.target.value);
                    const prod = mockProductos.find(
                      (p) => p.id === e.target.value
                    );
                    if (prod) setSelCosto(String(prod.precioCompra));
                  }}
                >
                  <option value="">Selecciona un producto</option>
                  {mockProductos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Input
                  type="number"
                  min={1}
                  value={selCantidad}
                  onChange={(e) => setSelCantidad(e.target.value)}
                  placeholder="Cant."
                />
              </div>
              <div className="sm:col-span-3">
                <Input
                  type="number"
                  min={0}
                  value={selCosto}
                  onChange={(e) => setSelCosto(e.target.value)}
                  placeholder="Costo unit."
                  leftIcon={<DollarSign className="w-4 h-4" />}
                />
              </div>
              <div className="sm:col-span-1">
                <Button
                  variant="secondary"
                  fullWidth
                  onClick={addItem}
                  aria-label="Agregar"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {formError && (
            <p className="text-xs text-red-400">{formError}</p>
          )}

          {/* Items list */}
          {items.length > 0 ? (
            <div className="rounded-lg border border-white/10 divide-y divide-white/10 overflow-hidden">
              {items.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between py-2.5 px-3 gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-100 truncate">
                      {item.nombre}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {item.cantidad} x {formatCurrency(item.costo)} CUP
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-white shrink-0">
                    {formatCurrency(item.subtotal)} CUP
                  </span>
                  <button
                    onClick={() => removeItem(idx)}
                    className="text-slate-500 hover:text-red-400 transition-colors duration-150 p-1 shrink-0"
                    aria-label="Quitar"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500 text-center py-4">
              No hay productos agregados
            </p>
          )}

          {/* Total */}
          <div className="flex items-center justify-between rounded-lg bg-slate-800 border border-white/10 px-4 py-3">
            <span className="text-sm font-medium text-slate-300">Total</span>
            <span className="text-lg font-semibold text-white">
              {formatCurrency(modalTotal)} CUP
            </span>
          </div>
        </div>
      </Modal>

      {/* Detail modal */}
      <Modal
        open={!!detalleCompra}
        onClose={() => setDetalleCompra(null)}
        title="Detalle de compra"
        size="md"
        footer={
          <Button variant="ghost" onClick={() => setDetalleCompra(null)}>
            Cerrar
          </Button>
        }
      >
        {detalleCompra && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-500 font-medium">Proveedor</p>
                <p className="text-sm font-semibold text-white mt-0.5">
                  {detalleCompra.proveedor}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Fecha</p>
                <p className="text-sm font-semibold text-white mt-0.5">
                  {formatDate(detalleCompra.fecha)}
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-white/10 divide-y divide-white/10 overflow-hidden">
              {detalleCompra.items.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between py-2.5 px-3 gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-100 truncate">
                      {item.nombre}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {item.cantidad} x {formatCurrency(item.costo)} CUP
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-white shrink-0">
                    {formatCurrency(item.subtotal)} CUP
                  </span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between rounded-lg bg-slate-800 border border-white/10 px-4 py-3">
              <span className="text-sm font-medium text-slate-300">Total</span>
              <span className="text-lg font-semibold text-white">
                {formatCurrency(detalleCompra.total)} CUP
              </span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
