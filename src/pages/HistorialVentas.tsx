import { useState, useMemo } from 'react';
import {
  History,
  Search,
  Filter,
  ChevronDown,
  ChevronRight,
  Printer,
  RotateCcw,
  XCircle,
  Check,
  CreditCard,
  Banknote,
  ArrowLeftRight,
  User,
  Calendar,
  Receipt,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { Card, Button, Badge, Input, Select, EmptyState, Modal } from '@/components/ui';
import { PageHeader } from '@/layout/PageHeader';
import { formatCurrency, formatCurrencyWithSymbol } from '@/utils/format';
import { mockVentas } from '@/mockData';
import type { Venta, EstadoVenta, MetodoPago } from '@/types';

const estadoConfig: Record<EstadoVenta, { label: string; variant: 'success' | 'danger' | 'warning' }> = {
  completada: { label: 'Completada', variant: 'success' },
  cancelada: { label: 'Cancelada', variant: 'danger' },
  devuelta: { label: 'Devuelta', variant: 'warning' },
};

const metodoIcon: Record<MetodoPago, typeof CreditCard> = {
  efectivo: Banknote,
  tarjeta: CreditCard,
  transferencia: ArrowLeftRight,
};

export function HistorialVentas() {
  const [search, setSearch] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');
  const [filtroMetodo, setFiltroMetodo] = useState<string>('todos');
  const [filtroVendedor, setFiltroVendedor] = useState<string>('todos');
  const [ventaExpandida, setVentaExpandida] = useState<string | null>(null);
  const [modalAccion, setModalAccion] = useState<{ tipo: string; venta: Venta } | null>(null);

  const ventasFiltradas = useMemo(() => {
    let lista = mockVentas.filter((v) => v.estado === 'completada');
    if (filtroEstado !== 'todos') lista = lista.filter((v) => v.estado === filtroEstado);
    if (filtroMetodo !== 'todos')
      lista = lista.filter((v) => v.metodosPago.some((p) => p.metodo === filtroMetodo));
    if (filtroVendedor !== 'todos') lista = lista.filter((v) => v.vendedorId === filtroVendedor);
    if (search.trim()) {
      const q = search.toLowerCase();
      lista = lista.filter(
        (v) =>
          v.id.toLowerCase().includes(q) ||
          v.clienteNombre?.toLowerCase().includes(q) ||
          v.vendedorNombre.toLowerCase().includes(q)
      );
    }
    return lista.slice(0, 50);
  }, [search, filtroEstado, filtroMetodo, filtroVendedor]);

  const vendedores = useMemo(
    () => Array.from(new Set(mockVentas.map((v) => v.vendedorId))).map((id) => ({
      id,
      nombre: mockVentas.find((v) => v.vendedorId === id)?.vendedorNombre ?? '',
    })),
    []
  );

  const totalFiltrado = ventasFiltradas.reduce((s, v) => s + v.total, 0);

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Historial de Ventas"
        subtitle={`${ventasFiltradas.length} ventas · ${formatCurrencyWithSymbol(totalFiltrado)}`}
        icon={<History className="w-5 h-5" />}
      />

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mt-4">
        <div className="flex-1">
          <Input
            type="text"
            placeholder="Buscar por ID, cliente o vendedor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>
        <Select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} className="sm:w-36">
          <option value="todos">Todos los estados</option>
          <option value="completada">Completadas</option>
          <option value="cancelada">Canceladas</option>
          <option value="devuelta">Devueltas</option>
        </Select>
        <Select value={filtroMetodo} onChange={(e) => setFiltroMetodo(e.target.value)} className="sm:w-36">
          <option value="todos">Todos los métodos</option>
          <option value="efectivo">Efectivo</option>
          <option value="tarjeta">Tarjeta</option>
          <option value="transferencia">Transferencia</option>
        </Select>
        <Select value={filtroVendedor} onChange={(e) => setFiltroVendedor(e.target.value)} className="sm:w-36">
          <option value="todos">Todos los vendedores</option>
          {vendedores.map((v) => (
            <option key={v.id} value={v.id}>{v.nombre}</option>
          ))}
        </Select>
      </div>

      {/* Lista de ventas */}
      <Card className="mt-4" padding="sm">
        {ventasFiltradas.length > 0 ? (
          <div className="divide-y divide-white/5">
            {ventasFiltradas.map((venta) => {
              const expanded = ventaExpandida === venta.id;
              const estCfg = estadoConfig[venta.estado];
              return (
                <div key={venta.id}>
                  {/* Row principal */}
                  <button
                    onClick={() => setVentaExpandida(expanded ? null : venta.id)}
                    className="w-full flex items-center gap-3 py-3 px-3 hover:bg-white/5 transition-colors duration-100 text-left"
                  >
                    <ChevronRight className={cn(
                      'w-4 h-4 text-slate-600 shrink-0 transition-transform duration-150',
                      expanded && 'rotate-90'
                    )} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-medium text-slate-100 truncate">
                          {venta.clienteNombre ?? 'Venta general'}
                        </span>
                        <Badge variant={estCfg.variant} dot>{estCfg.label}</Badge>
                        {venta.esFiado && <Badge variant="warning">Fiado</Badge>}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(venta.fecha).toLocaleDateString('es', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {venta.vendedorNombre}
                        </span>
                        <span>{venta.items.length} items</span>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-white tabular-nums shrink-0">
                      {formatCurrency(venta.total)}
                    </span>
                  </button>

                  {/* Detalle expandible */}
                  {expanded && (
                    <div className="px-3 pb-4 pt-1 animate-fade-in">
                      <div className="bg-slate-800/30 rounded-lg border border-white/5 p-4 space-y-3">
                        {/* Items */}
                        <div>
                          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Productos</p>
                          <div className="space-y-1.5">
                            {venta.items.map((item, i) => (
                              <div key={i} className="flex items-center justify-between text-sm">
                                <span className="text-slate-200">
                                  <span className="text-slate-500 tabular-nums">{item.cantidad}x</span> {item.nombre}
                                </span>
                                <span className="text-slate-300 tabular-nums">{formatCurrency(item.subtotal)}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Totales */}
                        <div className="pt-3 border-t border-white/5 space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-500">Subtotal</span>
                            <span className="text-slate-300 tabular-nums">{formatCurrency(venta.subtotal)}</span>
                          </div>
                          {venta.descuentoGlobal > 0 && (
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-slate-500">Descuento</span>
                              <span className="text-red-400 tabular-nums">-{formatCurrency(venta.descuentoGlobal)}</span>
                            </div>
                          )}
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-500">Impuesto</span>
                            <span className="text-slate-300 tabular-nums">{formatCurrency(venta.impuesto)}</span>
                          </div>
                          <div className="flex items-center justify-between pt-1 border-t border-white/5">
                            <span className="text-sm font-semibold text-white">Total</span>
                            <span className="text-sm font-semibold text-white tabular-nums">{formatCurrency(venta.total)}</span>
                          </div>
                        </div>

                        {/* Métodos de pago */}
                        <div className="pt-3 border-t border-white/5">
                          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Pago</p>
                          <div className="flex items-center gap-2">
                            {venta.metodosPago.map((p, i) => {
                              const Icon = metodoIcon[p.metodo];
                              return (
                                <Badge key={i} variant="info">
                                  <Icon className="w-3 h-3 mr-1" />
                                  {p.metodo} — {formatCurrency(p.monto)}
                                </Badge>
                              );
                            })}
                          </div>
                        </div>

                        {/* Acciones */}
                        <div className="flex items-center gap-2 pt-3 border-t border-white/5">
                          <Button variant="secondary" size="sm" leftIcon={<Printer className="w-3.5 h-3.5" />}>
                            Reimprimir
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                            onClick={() => setModalAccion({ tipo: 'devolver', venta })}
                          >
                            Devolver
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            leftIcon={<XCircle className="w-3.5 h-3.5" />}
                            onClick={() => setModalAccion({ tipo: 'cancelar', venta })}
                            className="text-slate-500 hover:text-red-400"
                          >
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon={<History className="w-6 h-6" />}
            title="No hay ventas"
            description="No se encontraron ventas con los filtros aplicados"
          />
        )}
      </Card>

      {/* Modal acción */}
      <Modal
        open={modalAccion !== null}
        onClose={() => setModalAccion(null)}
        title={modalAccion?.tipo === 'cancelar' ? 'Cancelar venta' : 'Devolver venta'}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalAccion(null)}>Cancelar</Button>
            <Button
              variant={modalAccion?.tipo === 'cancelar' ? 'danger' : 'primary'}
              onClick={() => setModalAccion(null)}
              leftIcon={<Check className="w-4 h-4" />}
            >
              Confirmar
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-400">
          {modalAccion?.tipo === 'cancelar'
            ? '¿Seguro que deseas cancelar esta venta? El stock será reintegrado.'
            : '¿Seguro que deseas devolver esta venta? Los productos volverán al inventario.'}
        </p>
      </Modal>
    </div>
  );
}
