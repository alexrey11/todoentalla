export type Rol = 'admin' | 'jefe' | 'vendedor';

export type UnidadMedida = 'unidad' | 'kg' | 'lb' | 'litro';

export type EstadoVenta = 'completada' | 'cancelada' | 'devuelta';

export type MetodoPago = 'efectivo' | 'tarjeta' | 'transferencia';

export type EstadoCotizacion =
  | 'pendiente'
  | 'aceptada'
  | 'rechazada'
  | 'vencida'
  | 'convertida';

export type TipoMovimiento =
  | 'entrada'
  | 'salida'
  | 'ajuste'
  | 'perdida'
  | 'transferencia'
  | 'conteo';

export interface PuntoDeVenta {
  id: string;
  nombre: string;
  direccion: string;
  telefono: string;
  icono: string;
  activo: boolean;
  impuestoPorcentaje: number;
}

export interface Categoria {
  id: string;
  puntoDeVentaId: string;
  nombre: string;
  descripcion: string;
}

export interface Variante {
  talla?: string;
  color?: string;
  stock: number;
}

export interface ComponenteCompuesto {
  productoId: string;
  nombre: string;
  cantidad: number;
}

export interface Producto {
  id: string;
  categoriaId: string;
  puntoDeVentaId: string;
  nombre: string;
  precioCompra: number;
  precioVenta: number;
  stockActual: number;
  stockMinimo: number;
  unidadMedida: UnidadMedida;
  codigoBarras: string;
  variantes: Variante[];
  esCompuesto: boolean;
  componentes: ComponenteCompuesto[];
  fechaVencimiento?: string;
  imagen?: string;
}

export interface ItemVenta {
  productoId: string;
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  descuento: number;
  subtotal: number;
}

export interface PagoVenta {
  metodo: MetodoPago;
  monto: number;
}

export interface Venta {
  id: string;
  items: ItemVenta[];
  subtotal: number;
  descuentoGlobal: number;
  impuesto: number;
  total: number;
  fecha: string;
  vendedorId: string;
  vendedorNombre: string;
  estado: EstadoVenta;
  clienteId?: string;
  clienteNombre?: string;
  metodosPago: PagoVenta[];
  esFiado: boolean;
  puntoDeVentaId: string;
}

export interface PrecioEspecial {
  productoId: string;
  nombre: string;
  precio: number;
}

export interface Cliente {
  id: string;
  nombre: string;
  telefono: string;
  saldoPendiente: number;
  preciosEspeciales: PrecioEspecial[];
}

export interface Usuario {
  id: string;
  nombre: string;
  pin: string;
  rol: Rol;
  puntosDeVentaIds: string[];
  comisionPorcentaje: number;
}

export type CategoriaGasto =
  | 'luz'
  | 'agua'
  | 'alquiler'
  | 'salario'
  | 'proveedor'
  | 'transporte'
  | 'impuestos'
  | 'mantenimiento'
  | 'otros';

export interface Gasto {
  id: string;
  fecha: string;
  categoria: CategoriaGasto;
  monto: number;
  descripcion: string;
  puntoDeVentaId: string;
}

export interface Cierre {
  id: string;
  fecha: string;
  totalVentas: number;
  montoReal: number;
  diferencia: number;
  puntoDeVentaId: string;
  vendedorId: string;
  vendedorNombre: string;
}

export interface MovimientoInventario {
  id: string;
  productoId: string;
  productoNombre: string;
  tipo: TipoMovimiento;
  cantidad: number;
  motivo: string;
  fecha: string;
}

export interface Cotizacion {
  id: string;
  numero: string;
  fecha: string;
  estado: EstadoCotizacion;
  items: ItemVenta[];
  total: number;
  clienteNombre: string;
}

export interface PagoFiado {
  id: string;
  clienteId: string;
  clienteNombre: string;
  monto: number;
  fecha: string;
}

export interface TasaCambio {
  id: string;
  moneda: 'USD' | 'EUR' | 'MLC';
  valorCUP: number;
  fechaActualizacion: string;
}

export interface LogAuditoria {
  id: string;
  fecha: string;
  usuarioId: string;
  usuarioNombre: string;
  tipo: string;
  detalle: string;
}
