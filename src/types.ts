// src/types.ts
// Alias para mantener compatibilidad con imports de Bolt
export type {
  Usuario,
  Producto,
  VarianteProducto as Variante,
  Venta,
  ItemCarrito as ItemVenta,
  MetodoPago,
  Cliente,
  Categoria,
  PuntoDeVenta,
  Gasto,
  CierreCaja as Cierre,
  MovimientoInventario,
  Cotizacion,
  PagoFiado,
  TasaCambio,
  LogSeguridad as LogAuditoria,
  CategoriaGasto,
  PrecioEspecial,
} from './db';

// Re-exports de tipos propios de Bolt que no existen en db.ts
export type Rol = 'admin' | 'jefe' | 'vendedor';
export type EstadoVenta = 'completada' | 'cancelada' | 'devuelta';
export type TipoMovimiento =
  | 'entrada' | 'salida' | 'ajuste' | 'perdida' | 'devolucion'
  | 'transferencia_salida' | 'transferencia_entrada' | 'compra' | 'conteo';
export type EstadoCotizacion = 'pendiente' | 'aceptada' | 'rechazada' | 'vencida' | 'convertida';