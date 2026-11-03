import { useState, useMemo, useCallback } from 'react';
import {
  Search,
  ScanLine,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  User,
  CreditCard,
  Banknote,
  ArrowLeftRight,
  Check,
  X,
  AlertCircle,
  Package,
  Tag,
  Printer,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { Card, Button, Badge, Input, Select } from '@/components/ui';
import { PageHeader } from '@/layout/PageHeader';
import { formatCurrency, formatCurrencyWithSymbol } from '@/utils/format';
import { mockProductos, mockCategorias, mockClientes, mockPuntosDeVenta } from '@/mockData';
import type { Producto, ItemVenta, MetodoPago } from '@/types';

interface CarritoItem extends ItemVenta {
  stockMax: number;
}

type PasoVenta = 'carrito' | 'pago' | 'confirmacion';

export function NuevaVenta() {
  const [search, setSearch] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>('todas');
  const [carrito, setCarrito] = useState<CarritoItem[]>([]);
  const [descuentoGlobal, setDescuentoGlobal] = useState(0);
  const [clienteId, setClienteId] = useState<string>('');
  const [esFiado, setEsFiado] = useState(false);
  const [paso, setPaso] = useState<PasoVenta>('carrito');
  const [metodoActivo, setMetodoActivo] = useState<MetodoPago | 'combinado'>('efectivo');
  const [efectivoRecibido, setEfectivoRecibido] = useState('');
  const [pagoCombinado, setPagoCombinado] = useState({ efectivo: '', tarjeta: '', transferencia: '' });
  const [ultimaVenta, setUltimaVenta] = useState<{ total: number; vuelto: number } | null>(null);

  const pdv = mockPuntosDeVenta[0];
  const impuestoPct = pdv.impuestoPorcentaje;

  const productosFiltrados = useMemo(() => {
    let lista = mockProductos;
    if (categoriaFiltro !== 'todas') {
      lista = lista.filter((p) => p.categoriaId === categoriaFiltro);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      lista = lista.filter(
        (p) =>
          p.nombre.toLowerCase().includes(q) ||
          p.codigoBarras.includes(q)
      );
    }
    return lista;
  }, [search, categoriaFiltro]);

  const clienteSeleccionado = useMemo(
    () => mockClientes.find((c) => c.id === clienteId) ?? null,
    [clienteId]
  );

  const precioPara = useCallback(
    (producto: Producto): number => {
      if (clienteSeleccionado) {
        const especial = clienteSeleccionado.preciosEspeciales.find(
          (pe) => pe.productoId === producto.id
        );
        if (especial) return especial.precio;
      }
      return producto.precioVenta;
    },
    [clienteSeleccionado]
  );

  const subtotal = carrito.reduce((s, item) => s + item.subtotal, 0);
  const baseImponible = Math.max(0, subtotal - descuentoGlobal);
  const impuesto = Math.round(baseImponible * (impuestoPct / 100));
  const total = baseImponible + impuesto;

  const agregarProducto = (producto: Producto) => {
    if (producto.stockActual <= 0) return;
    const precio = precioPara(producto);
    setCarrito((prev) => {
      const existing = prev.find((item) => item.productoId === producto.id);
      if (existing) {
        if (existing.cantidad >= producto.stockActual) return prev;
        return prev.map((item) =>
          item.productoId === producto.id
            ? {
                ...item,
                cantidad: item.cantidad + 1,
                subtotal: (item.cantidad + 1) * precio - item.descuento,
              }
            : item
        );
      }
      return [
        ...prev,
        {
          productoId: producto.id,
          nombre: producto.nombre,
          cantidad: 1,
          precioUnitario: precio,
          descuento: 0,
          subtotal: precio,
          stockMax: producto.stockActual,
        },
      ];
    });
  };

  const cambiarCantidad = (id: string, delta: number) => {
    setCarrito((prev) =>
      prev
        .map((item) => {
          if (item.productoId !== id) return item;
          const nuevaCantidad = item.cantidad + delta;
          if (nuevaCantidad <= 0) return null;
          if (nuevaCantidad > item.stockMax) return item;
          return {
            ...item,
            cantidad: nuevaCantidad,
            subtotal: nuevaCantidad * item.precioUnitario - item.descuento,
          };
        })
        .filter(Boolean) as CarritoItem[]
    );
  };

  const cambiarDescuentoItem = (id: string, descuento: number) => {
    setCarrito((prev) =>
      prev.map((item) =>
        item.productoId === id
          ? {
              ...item,
              descuento,
              subtotal: item.cantidad * item.precioUnitario - descuento,
            }
          : item
      )
    );
  };

  const eliminarItem = (id: string) => {
    setCarrito((prev) => prev.filter((item) => item.productoId !== id));
  };

  const limpiarCarrito = () => {
    setCarrito([]);
    setDescuentoGlobal(0);
    setClienteId('');
    setEsFiado(false);
    setEfectivoRecibido('');
    setPagoCombinado({ efectivo: '', tarjeta: '', transferencia: '' });
  };

  const efectivoNum = parseInt(efectivoRecibido) || 0;
  const vuelto = efectivoNum - total;

  const pagosCombinadosTotal =
    (parseInt(pagoCombinado.efectivo) || 0) +
    (parseInt(pagoCombinado.tarjeta) || 0) +
    (parseInt(pagoCombinado.transferencia) || 0);
  const combinadoCompleto = pagosCombinadosTotal >= total && pagosCombinadosTotal > 0;

  const puedeRegistrar =
    carrito.length > 0 &&
    (metodoActivo !== 'efectivo' || efectivoNum >= total) &&
    (metodoActivo !== 'combinado' || combinadoCompleto) &&
    (!esFiado || clienteId !== '');

  const registrarVenta = () => {
    const vueltoFinal = metodoActivo === 'efectivo' ? Math.max(0, efectivoNum - total) : 0;
    setUltimaVenta({ total, vuelto: vueltoFinal });
    setPaso('confirmacion');
  };

  const iniciarPago = () => {
    setPaso('pago');
    setMetodoActivo('efectivo');
    setEfectivoRecibido('');
    setPagoCombinado({ efectivo: '', tarjeta: '', transferencia: '' });
  };

  const nuevaVenta = () => {
    limpiarCarrito();
    setPaso('carrito');
    setUltimaVenta(null);
  };

  // ===== CONFIRMACION =====
  if (paso === 'confirmacion' && ultimaVenta) {
    return (
      <div className="animate-fade-in">
        <PageHeader title="Nueva Venta" subtitle="Venta registrada exitosamente" />
        <div className="flex flex-col items-center justify-center py-12">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4 animate-fade-in">
            <Check className="w-8 h-8 text-emerald-400" />
          </div>
          <h2 className="text-xl font-semibold text-white">Venta completada</h2>
          <p className="text-sm text-slate-400 mt-1">La venta se registró correctamente</p>

          <Card className="mt-6 w-full max-w-md" padding="md">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Total cobrado</span>
                <span className="text-lg font-semibold text-white tabular-nums">
                  {formatCurrencyWithSymbol(ultimaVenta.total)}
                </span>
              </div>
              {ultimaVenta.vuelto > 0 && (
                <div className="flex items-center justify-between pt-3 border-t border-white/10">
                  <span className="text-sm text-slate-400">Vuelto</span>
                  <span className="text-lg font-semibold text-emerald-400 tabular-nums">
                    {formatCurrencyWithSymbol(ultimaVenta.vuelto)}
                  </span>
                </div>
              )}
              {clienteSeleccionado && esFiado && (
                <div className="flex items-center justify-between pt-3 border-t border-white/10">
                  <span className="text-sm text-slate-400">Fiado a</span>
                  <span className="text-sm font-medium text-amber-400">
                    {clienteSeleccionado.nombre}
                  </span>
                </div>
              )}
            </div>
          </Card>

          <div className="flex items-center gap-3 mt-6">
            <Button variant="secondary" leftIcon={<Printer className="w-4 h-4" />}>
              Imprimir ticket
            </Button>
            <Button onClick={nuevaVenta} leftIcon={<ShoppingCart className="w-4 h-4" />}>
              Nueva venta
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ===== PAGO =====
  if (paso === 'pago') {
    const metodos: { id: MetodoPago; label: string; icon: typeof CreditCard }[] = [
      { id: 'efectivo', label: 'Efectivo', icon: Banknote },
      { id: 'tarjeta', label: 'Tarjeta', icon: CreditCard },
      { id: 'transferencia', label: 'Transferencia', icon: ArrowLeftRight },
    ];

    return (
      <div className="animate-fade-in">
        <PageHeader
          title="Nueva Venta"
          subtitle="Selecciona el método de pago"
          actions={
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<ArrowLeftRight className="w-4 h-4" />}
              onClick={() => setPaso('carrito')}
            >
              Volver al carrito
            </Button>
          }
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
          {/* Resumen + metodo */}
          <div className="space-y-4">
            <Card>
              <h3 className="text-sm font-semibold text-white mb-3">Resumen</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Subtotal</span>
                  <span className="text-slate-100 tabular-nums">{formatCurrency(subtotal)}</span>
                </div>
                {descuentoGlobal > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">Descuento</span>
                    <span className="text-red-400 tabular-nums">-{formatCurrency(descuentoGlobal)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Impuesto ({impuestoPct}%)</span>
                  <span className="text-slate-100 tabular-nums">{formatCurrency(impuesto)}</span>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-white/10">
                  <span className="text-base font-semibold text-white">Total</span>
                  <span className="text-2xl font-semibold text-white tabular-nums tracking-tight">
                    {formatCurrency(total)}
                  </span>
                </div>
              </div>
            </Card>

            <Card>
              <h3 className="text-sm font-semibold text-white mb-3">Método de pago</h3>
              <div className="grid grid-cols-3 gap-2">
                {metodos.map((m) => {
                  const Icon = m.icon;
                  const active = metodoActivo === m.id;
                  return (
                    <button
                      key={m.id}
                      onClick={() => setMetodoActivo(m.id)}
                      className={cn(
                        'flex flex-col items-center gap-2 h-20 rounded-lg border transition-colors duration-150',
                        active
                          ? 'bg-blue-600/10 border-blue-500 text-white'
                          : 'bg-slate-900 border-white/10 text-slate-400 hover:text-slate-100 hover:border-white/20'
                      )}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-xs font-medium">{m.label}</span>
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setMetodoActivo('combinado')}
                className={cn(
                  'w-full mt-2 h-10 rounded-lg border text-sm font-medium transition-colors duration-150 flex items-center justify-center gap-2',
                  metodoActivo === 'combinado'
                    ? 'bg-blue-600/10 border-blue-500 text-white'
                    : 'bg-slate-900 border-white/10 text-slate-400 hover:text-slate-100 hover:border-white/20'
                )}
              >
                <ArrowLeftRight className="w-4 h-4" />
                Combinar métodos
              </button>
            </Card>

            {/* Fiado */}
            <Card>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-slate-400" />
                  <span className="text-sm font-medium text-slate-100">Venta fiada</span>
                </div>
                <button
                  onClick={() => setEsFiado(!esFiado)}
                  className={cn(
                    'relative w-10 h-6 rounded-full transition-colors duration-150',
                    esFiado ? 'bg-blue-600' : 'bg-slate-700'
                  )}
                >
                  <span
                    className={cn(
                      'absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all duration-150',
                      esFiado ? 'left-[18px]' : 'left-0.5'
                    )}
                  />
                </button>
              </div>
              {esFiado && (
                <div className="mt-3 animate-fade-in">
                  <Select
                    value={clienteId}
                    onChange={(e) => setClienteId(e.target.value)}
                    className={!clienteId ? 'border-amber-500/50' : ''}
                  >
                    <option value="">Selecciona cliente...</option>
                    {mockClientes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre}
                        {c.saldoPendiente > 0 ? ` (Debe ${formatCurrency(c.saldoPendiente)})` : ''}
                      </option>
                    ))}
                  </Select>
                  {esFiado && !clienteId && (
                    <p className="text-xs text-amber-400 mt-1.5 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      Selecciona un cliente para fiar
                    </p>
                  )}
                </div>
              )}
            </Card>
          </div>

          {/* Panel de pago activo */}
          <div className="space-y-4">
            {metodoActivo === 'efectivo' && (
              <Card>
                <h3 className="text-sm font-semibold text-white mb-3">Pago en efectivo</h3>

                {/* Total display */}
                <div className="bg-slate-800/50 rounded-lg p-4 mb-4 text-center">
                  <p className="text-xs text-slate-500 mb-1">Total a pagar</p>
                  <p className="text-3xl font-semibold text-white tabular-nums tracking-tight">
                    {formatCurrency(total)}
                  </p>
                </div>

                {/* Input efectivo */}
                <label className="text-xs text-slate-400 mb-1.5 block">Efectivo recibido</label>
                <Input
                  type="number"
                  value={efectivoRecibido}
                  onChange={(e) => setEfectivoRecibido(e.target.value)}
                  placeholder="0"
                  className="text-lg text-center font-semibold tabular-nums h-12"
                />

                {/* Quick amounts */}
                <div className="grid grid-cols-4 gap-2 mt-3">
                  {[total, 100, 200, 500].map((amt, i) => (
                    <button
                      key={i}
                      onClick={() => setEfectivoRecibido(String(amt))}
                      className="h-9 rounded-lg bg-slate-800 hover:bg-slate-700 border border-white/10 text-xs font-medium text-slate-100 transition-colors duration-150"
                    >
                      {i === 0 ? 'Exacto' : formatCurrency(amt)}
                    </button>
                  ))}
                </div>

                {/* Vuelto */}
                {efectivoNum > 0 && (
                  <div
                    className={cn(
                      'mt-4 rounded-lg p-4 text-center animate-fade-in',
                      vuelto >= 0
                        ? 'bg-emerald-500/10 border border-emerald-500/20'
                        : 'bg-red-500/10 border border-red-500/20'
                    )}
                  >
                    <p className="text-xs text-slate-400 mb-1">
                      {vuelto >= 0 ? 'Vuelto' : 'Falta'}
                    </p>
                    <p
                      className={cn(
                        'text-2xl font-semibold tabular-nums',
                        vuelto >= 0 ? 'text-emerald-400' : 'text-red-400'
                      )}
                    >
                      {formatCurrency(Math.abs(vuelto))}
                    </p>
                  </div>
                )}

                <Button
                  fullWidth
                  size="lg"
                  className="mt-4"
                  disabled={efectivoNum < total || (esFiado && !clienteId)}
                  onClick={registrarVenta}
                  leftIcon={<Check className="w-5 h-5" />}
                >
                  Registrar venta
                </Button>
              </Card>
            )}

            {metodoActivo === 'tarjeta' && (
              <Card>
                <h3 className="text-sm font-semibold text-white mb-3">Pago con tarjeta</h3>
                <div className="bg-slate-800/50 rounded-lg p-4 mb-4 text-center">
                  <CreditCard className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                  <p className="text-xs text-slate-500 mb-1">Total a cobrar</p>
                  <p className="text-3xl font-semibold text-white tabular-nums tracking-tight">
                    {formatCurrency(total)}
                  </p>
                </div>
                <p className="text-sm text-slate-400 text-center mb-4">
                  Procesa el pago en el POS bancario por el monto indicado.
                </p>
                <Button
                  fullWidth
                  size="lg"
                  disabled={esFiado && !clienteId}
                  onClick={registrarVenta}
                  leftIcon={<Check className="w-5 h-5" />}
                >
                  Confirmar pago
                </Button>
              </Card>
            )}

            {metodoActivo === 'transferencia' && (
              <Card>
                <h3 className="text-sm font-semibold text-white mb-3">Transferencia</h3>
                <div className="bg-slate-800/50 rounded-lg p-4 mb-4 text-center">
                  <ArrowLeftRight className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                  <p className="text-xs text-slate-500 mb-1">Total a transferir</p>
                  <p className="text-3xl font-semibold text-white tabular-nums tracking-tight">
                    {formatCurrency(total)}
                  </p>
                </div>
                <p className="text-sm text-slate-400 text-center mb-4">
                  Verifica la transferencia recibida por el monto indicado.
                </p>
                <Button
                  fullWidth
                  size="lg"
                  disabled={esFiado && !clienteId}
                  onClick={registrarVenta}
                  leftIcon={<Check className="w-5 h-5" />}
                >
                  Confirmar pago
                </Button>
              </Card>
            )}

            {metodoActivo === 'combinado' && (
              <Card>
                <h3 className="text-sm font-semibold text-white mb-3">Pago combinado</h3>
                <div className="bg-slate-800/50 rounded-lg p-3 mb-4 text-center">
                  <p className="text-xs text-slate-500 mb-1">Total</p>
                  <p className="text-2xl font-semibold text-white tabular-nums">{formatCurrency(total)}</p>
                </div>
                <div className="space-y-3">
                  {(['efectivo', 'tarjeta', 'transferencia'] as MetodoPago[]).map((met) => (
                    <div key={met}>
                      <label className="text-xs text-slate-400 mb-1.5 block capitalize">{met}</label>
                      <Input
                        type="number"
                        value={pagoCombinado[met]}
                        onChange={(e) =>
                          setPagoCombinado({ ...pagoCombinado, [met]: e.target.value })
                        }
                        placeholder="0"
                        className="tabular-nums"
                      />
                    </div>
                  ))}
                </div>
                <div
                  className={cn(
                    'mt-3 rounded-lg p-3 text-center',
                    combinadoCompleto
                      ? 'bg-emerald-500/10 border border-emerald-500/20'
                      : 'bg-slate-800/50 border border-white/10'
                  )}
                >
                  <p className="text-xs text-slate-400 mb-1">Suma de pagos</p>
                  <p
                    className={cn(
                      'text-lg font-semibold tabular-nums',
                      combinadoCompleto ? 'text-emerald-400' : 'text-slate-100'
                    )}
                  >
                    {formatCurrency(pagosCombinadosTotal)}
                  </p>
                  {pagosCombinadosTotal > 0 && !combinadoCompleto && (
                    <p className="text-xs text-red-400 mt-1">
                      Faltan {formatCurrency(total - pagosCombinadosTotal)}
                    </p>
                  )}
                </div>
                <Button
                  fullWidth
                  size="lg"
                  className="mt-4"
                  disabled={!combinadoCompleto || (esFiado && !clienteId)}
                  onClick={registrarVenta}
                  leftIcon={<Check className="w-5 h-5" />}
                >
                  Registrar venta
                </Button>
              </Card>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ===== CARRITO / POS PRINCIPAL =====
  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Nueva Venta"
        subtitle="Selecciona productos y agrega al carrito"
        actions={
          carrito.length > 0 && (
            <Button variant="ghost" size="sm" leftIcon={<X className="w-4 h-4" />} onClick={limpiarCarrito}>
              Limpiar
            </Button>
          )
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
        {/* Productos — 2/3 */}
        <div className="lg:col-span-2 space-y-4">
          {/* Buscador + scan */}
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <Input
                type="text"
                placeholder="Buscar producto por nombre o código..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                leftIcon={<Search className="w-4 h-4" />}
              />
            </div>
            <Button variant="secondary" leftIcon={<ScanLine className="w-4 h-4" />}>
              Escanear
            </Button>
          </div>

          {/* Categorias filter chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setCategoriaFiltro('todas')}
              className={cn(
                'h-8 px-3 rounded-lg text-xs font-medium whitespace-nowrap transition-colors duration-150',
                categoriaFiltro === 'todas'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-900 border border-white/10 text-slate-400 hover:text-slate-100'
              )}
            >
              Todas
            </button>
            {mockCategorias.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategoriaFiltro(cat.id)}
                className={cn(
                  'h-8 px-3 rounded-lg text-xs font-medium whitespace-nowrap transition-colors duration-150',
                  categoriaFiltro === cat.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-900 border border-white/10 text-slate-400 hover:text-slate-100'
                )}
              >
                {cat.nombre}
              </button>
            ))}
          </div>

          {/* Grid productos */}
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
            {productosFiltrados.map((producto) => {
              const precio = precioPara(producto);
              const tienePrecioEspecial =
                clienteSeleccionado?.preciosEspeciales.some(
                  (pe) => pe.productoId === producto.id
                ) ?? false;
              const sinStock = producto.stockActual <= 0;
              const stockBajo = producto.stockActual <= producto.stockMinimo;
              return (
                <button
                  key={producto.id}
                  onClick={() => agregarProducto(producto)}
                  disabled={sinStock}
                  className={cn(
                    'text-left bg-slate-900 border rounded-xl p-3 transition-colors duration-150 group',
                    sinStock
                      ? 'border-white/5 opacity-40 cursor-not-allowed'
                      : 'border-white/10 hover:border-white/20 cursor-pointer'
                  )}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="w-10 h-10 rounded-lg bg-slate-800 border border-white/5 flex items-center justify-center shrink-0">
                      <Package className="w-5 h-5 text-slate-500" />
                    </div>
                    {stockBajo && !sinStock && (
                      <Badge variant="warning" dot>
                        Bajo
                      </Badge>
                    )}
                    {sinStock && <Badge variant="danger">Sin stock</Badge>}
                  </div>
                  <p className="text-sm font-medium text-slate-100 leading-snug line-clamp-2 mb-1">
                    {producto.nombre}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <div>
                      <p className="text-base font-semibold text-white tabular-nums">
                        {formatCurrency(precio)}
                      </p>
                      {tienePrecioEspecial && (
                        <p className="text-xs text-blue-400">Precio especial</p>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 tabular-nums">
                      Stock: {producto.stockActual}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {productosFiltrados.length === 0 && (
            <Card>
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Search className="w-8 h-8 text-slate-600 mb-3" />
                <p className="text-sm font-medium text-slate-100">No se encontraron productos</p>
                <p className="text-xs text-slate-500 mt-1">
                  Prueba con otro término o cambia de categoría
                </p>
              </div>
            </Card>
          )}
        </div>

        {/* Carrito — 1/3 */}
        <div className="lg:sticky lg:top-4 lg:self-start">
          <Card padding="sm" className="flex flex-col max-h-[calc(100vh-120px)]">
            {/* Header carrito */}
            <div className="flex items-center justify-between p-3 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-slate-400" />
                <span className="text-sm font-semibold text-white">Carrito</span>
                {carrito.length > 0 && (
                  <Badge variant="info">{carrito.length}</Badge>
                )}
              </div>
              {carrito.length > 0 && (
                <span className="text-xs text-slate-500 tabular-nums">
                  {carrito.reduce((s, i) => s + i.cantidad, 0)} items
                </span>
              )}
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto min-h-[200px]">
              {carrito.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                  <ShoppingCart className="w-8 h-8 text-slate-600 mb-3" />
                  <p className="text-sm font-medium text-slate-100">Carrito vacío</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Toca un producto para agregarlo
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {carrito.map((item) => (
                    <CarritoRow
                      key={item.productoId}
                      item={item}
                      onInc={() => cambiarCantidad(item.productoId, 1)}
                      onDec={() => cambiarCantidad(item.productoId, -1)}
                      onRemove={() => eliminarItem(item.productoId)}
                      onDescuento={(d) => cambiarDescuentoItem(item.productoId, d)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Footer carrito */}
            {carrito.length > 0 && (
              <div className="border-t border-white/10 p-3 shrink-0 space-y-3">
                {/* Cliente */}
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">Cliente (opcional)</label>
                  <Select value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
                    <option value="">Sin cliente</option>
                    {mockClientes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre}
                        {c.saldoPendiente > 0 ? ` (Debe ${formatCurrency(c.saldoPendiente)})` : ''}
                      </option>
                    ))}
                  </Select>
                </div>

                {/* Descuento global */}
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">Descuento global (CUP)</label>
                  <Input
                    type="number"
                    value={descuentoGlobal || ''}
                    onChange={(e) => setDescuentoGlobal(Math.max(0, parseInt(e.target.value) || 0))}
                    placeholder="0"
                    className="tabular-nums"
                  />
                </div>

                {/* Totales */}
                <div className="space-y-1.5 pt-2 border-t border-white/10">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Subtotal</span>
                    <span className="text-slate-100 tabular-nums">{formatCurrency(subtotal)}</span>
                  </div>
                  {descuentoGlobal > 0 && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Descuento</span>
                      <span className="text-red-400 tabular-nums">-{formatCurrency(descuentoGlobal)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Impuesto ({impuestoPct}%)</span>
                    <span className="text-slate-100 tabular-nums">{formatCurrency(impuesto)}</span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-white/10">
                    <span className="text-sm font-semibold text-white">Total</span>
                    <span className="text-xl font-semibold text-white tabular-nums tracking-tight">
                      {formatCurrency(total)}
                    </span>
                  </div>
                </div>

                <Button fullWidth size="lg" onClick={iniciarPago} leftIcon={<CreditCard className="w-5 h-5" />}>
                  Ir a pagar
                </Button>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

// ===== CarritoRow component =====
function CarritoRow({
  item,
  onInc,
  onDec,
  onRemove,
  onDescuento,
}: {
  item: CarritoItem;
  onInc: () => void;
  onDec: () => void;
  onRemove: () => void;
  onDescuento: (d: number) => void;
}) {
  const [showDescuento, setShowDescuento] = useState(false);

  return (
    <div className="p-3 animate-fade-in">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-100 leading-snug truncate">
            {item.nombre}
          </p>
          <p className="text-xs text-slate-500 tabular-nums">
            {formatCurrency(item.precioUnitario)} c/u
          </p>
        </div>
        <button
          onClick={onRemove}
          className="text-slate-500 hover:text-red-400 transition-colors duration-150 shrink-0"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center justify-between gap-2">
        {/* Qty controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={onDec}
            className="w-7 h-7 rounded-md bg-slate-800 hover:bg-slate-700 border border-white/10 flex items-center justify-center text-slate-300 transition-colors duration-150"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <span className="w-8 text-center text-sm font-medium text-white tabular-nums">
            {item.cantidad}
          </span>
          <button
            onClick={onInc}
            disabled={item.cantidad >= item.stockMax}
            className="w-7 h-7 rounded-md bg-slate-800 hover:bg-slate-700 border border-white/10 flex items-center justify-center text-slate-300 transition-colors duration-150 disabled:opacity-30 disabled:pointer-events-none"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Subtotal */}
        <div className="text-right">
          <p className="text-sm font-semibold text-white tabular-nums">
            {formatCurrency(item.subtotal)}
          </p>
          {item.descuento > 0 && (
            <p className="text-xs text-red-400 tabular-nums">-{formatCurrency(item.descuento)}</p>
          )}
        </div>
      </div>

      {/* Descuento por item */}
      {showDescuento && (
        <div className="mt-2 flex items-center gap-2 animate-fade-in">
          <Input
            type="number"
            value={item.descuento || ''}
            onChange={(e) => onDescuento(Math.max(0, parseInt(e.target.value) || 0))}
            placeholder="0"
            className="h-8 text-xs tabular-nums"
          />
          <span className="text-xs text-slate-500">CUP desc.</span>
        </div>
      )}
      {!showDescuento && (
        <button
          onClick={() => setShowDescuento(true)}
          className="text-xs text-slate-500 hover:text-slate-300 transition-colors duration-150 mt-1.5"
        >
          + Descuento
        </button>
      )}
    </div>
  );
}
