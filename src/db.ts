import Dexie from 'dexie';
import type { Table } from 'dexie';

// ===== INTERFACES =====

export interface PuntoDeVenta {
    id?: number;
    nombre: string;
    direccion?: string;
    telefono?: string;
    encargado?: string;
    icono: string;
    activo: boolean;
    creadoEn: Date;
    impuestoPorcentaje?: number;
}

export interface Categoria {
    id?: number;
    puntoDeVentaId: number;
    nombre: string;
    descripcion?: string;
    imagen?: string;
    creadoEn: Date;
}

export interface ItemComponente {
    productoId: number;
    productoNombre: string;
    cantidad: number;
}

export interface VarianteProducto {
    id: string;
    nombre: string;
    atributos?: Record<string, string>;
    stockActual: number;
    codigoBarras?: string;
    precioExtra?: number;
}

export interface Producto {
    id?: number;
    puntoDeVentaId: number;
    categoriaId: number;
    nombre: string;
    descripcion?: string;
    precioCompra: number;
    precioVenta: number;
    stockActual: number;
    stockMinimo: number;
    unidadMedida?: string;
    imagen?: string;
    fechaCreacion: Date;
    fechaVencimiento?: Date;
    codigoBarras?: string;
    esCompuesto?: boolean;
    componentes?: ItemComponente[];
    tieneVariantes?: boolean;
    variantes?: VarianteProducto[];
    lote?: string;
    numeroSerie?: string;
}

export interface Usuario {
    id?: number;
    nombre: string;
    pin: string;
    rol: 'admin' | 'jefe' | 'vendedor';
    creadoEn: Date;
    comisionPorcentaje?: number;
    puntosDeVentaIds: number[];
    activo?: boolean;
}

export interface PrecioEspecial {
    productoId: number;
    precio: number;
}

export interface Cliente {
    id?: number;
    nombre: string;
    telefono?: string;
    email?: string;
    direccion?: string;
    notas?: string;
    creadoEn: Date;
    saldoPendiente: number;
    preciosEspeciales?: PrecioEspecial[];
}

export interface Proveedor {
    id?: number;
    nombre: string;
    telefono?: string;
    email?: string;
    direccion?: string;
    notas?: string;
    creadoEn: Date;
}

export interface ItemCompra {
    productoId: number;
    productoNombre: string;
    cantidad: number;
    precioUnitario: number;
    subtotal: number;
}

export interface Compra {
    id?: number;
    fecha: Date;
    proveedorId: number;
    proveedorNombre: string;
    items: ItemCompra[];
    total: number;
    metodoPago: 'efectivo' | 'transferencia' | 'tarjeta';
    notas?: string;
    puntoDeVentaId: number;
    puntoDeVentaNombre: string;
    registradoPor: string;
    registradoPorId: number;
}

export interface TasaCambio {
    id?: number;
    moneda: 'USD' | 'EUR' | 'MLC';
    tasa: number;
    fechaActualizacion: Date;
    actualizadoPor: string;
}

export interface MetodoPago {
    tipo: 'efectivo' | 'transferencia' | 'tarjeta' | 'fiado';
    monto: number;
    moneda: 'CUP' | 'USD' | 'EUR' | 'MLC';
    montoEnCUP: number;
}

export interface ItemCarrito {
    productoId: number;
    productoNombre: string;
    codigoBarras?: string;
    cantidad: number;
    precioUnitario: number;
    precioCompra: number;
    subtotal: number;
    descuentoPorcentaje?: number;
    unidadMedida?: string;
    permiteFracciones?: boolean;
    esCompuesto?: boolean;
    componentes?: ItemComponente[];
    varianteId?: string;
    varianteNombre?: string;
}

export interface Venta {
    id?: number;
    items?: ItemCarrito[];
    productoId?: number;
    productoNombre?: string;
    cantidad?: number;
    precioUnitario?: number;
    total: number;
    fecha: Date;
    vendedorId: number;
    vendedorNombre: string;
    estado: 'completada' | 'cancelada' | 'error' | 'devuelta';
    notaCancelacion?: string;
    clienteId?: number;
    clienteNombre?: string;
    metodosPago: MetodoPago[];
    notas?: string;
    comisionVendedor?: number;
    esFiado?: boolean;
    fechaPagoFiado?: Date;
    vueltoCUP?: number;
    puntoDeVentaId: number;
    puntoDeVentaNombre: string;
    descuentoGlobalPorcentaje?: number;
    descuentoGlobalMonto?: number;
    subtotalSinDescuento?: number;
    impuestoPorcentaje?: number;
    impuestoMonto?: number;
    totalConImpuesto?: number;
}

export interface Devolucion {
    id?: number;
    ventaId: number;
    productoId: number;
    productoNombre: string;
    cantidad: number;
    motivo: string;
    fecha: Date;
    realizadoPor: string;
    montoReembolsado: number;
    puntoDeVentaId: number;
}

export interface MovimientoInventario {
    id?: number;
    productoId: number;
    productoNombre: string;
    tipo: 'entrada' | 'salida' | 'ajuste' | 'perdida' | 'devolucion' | 'transferencia_salida' | 'transferencia_entrada' | 'compra' | 'conteo';
    cantidad: number;
    motivo: string;
    fecha: Date;
    realizadoPor: string;
    stockAnterior: number;
    stockNuevo: number;
    puntoDeVentaId: number;
    pdvRelacionadoId?: number;
    pdvRelacionadoNombre?: string;
    varianteId?: string;
    varianteNombre?: string;
}

export interface CierreCaja {
    id?: number;
    fecha: Date;
    totalVentas: number;
    cantidadVentas: number;
    montoReal: number;
    diferencia: number;
    notas: string;
    realizadoPor: string;
    ventasPorVendedor: { vendedor: string; total: number }[];
    desgloseMetodosPago?: {
        efectivo: number;
        transferencia: number;
        tarjeta: number;
        fiado: number;
    };
    puntoDeVentaId: number;
    puntoDeVentaNombre: string;
}

export type CategoriaGasto =
    | 'luz' | 'agua' | 'alquiler' | 'salario' | 'proveedor'
    | 'transporte' | 'impuestos' | 'mantenimiento' | 'otros';

export interface Gasto {
    id?: number;
    fecha: Date;
    categoria: CategoriaGasto;
    monto: number;
    descripcion: string;
    puntoDeVentaId: number;
    puntoDeVentaNombre: string;
    registradoPor: string;
    registradoPorId: number;
    metodoPago: 'efectivo' | 'transferencia' | 'tarjeta';
    notas?: string;
}

// ===== COTIZACIONES =====

export interface Cotizacion {
    id?: number;
    numero: string;              // Ej: COT-2026-0001
    fecha: Date;
    validaHasta: Date;           // Fecha de validez
    clienteId?: number;
    clienteNombre: string;       // Obligatorio (puede ser informal)
    clienteTelefono?: string;
    items: ItemCarrito[];
    subtotal: number;
    descuentoMonto?: number;
    descuentoPorcentaje?: number;
    total: number;
    notas?: string;
    estado: 'pendiente' | 'aceptada' | 'rechazada' | 'vencida' | 'convertida';
    puntoDeVentaId: number;
    puntoDeVentaNombre: string;
    creadaPor: string;
    creadaPorId: number;
    ventaId?: number;            // Si se convirtió a venta
}

// ===== LICENCIAS =====

export interface Licencia {
    id?: number;
    codigo: string;
    cliente: string;
    fechaCreacion: Date;
    fechaActivacion: Date | null;
    estado: 'disponible' | 'activada' | 'vendida';
    plan: 'mensual' | 'anual';
}

export interface ConfigEntry {
    key: string;
    value: string;
}

export type TipoLogSeguridad =
    | 'login_ok' | 'login_fallido' | 'logout'
    | 'usuario_creado' | 'usuario_editado' | 'usuario_eliminado'
    | 'acceso_denegado'
    | 'licencia_activada' | 'licencia_invalida'
    | 'reset_total' | 'datos_borrados'
    | 'backup_exportado' | 'backup_importado'
    | 'tasa_editada'
    | 'categoria_creada' | 'categoria_editada' | 'categoria_eliminada'
    | 'producto_creado' | 'producto_editado' | 'producto_eliminado'
    | 'pdv_creado' | 'pdv_editado' | 'pdv_eliminado' | 'pdv_cambio'
    | 'gasto_creado' | 'gasto_editado' | 'gasto_eliminado'
    | 'transferencia_creada'
    | 'proveedor_creado' | 'proveedor_editado' | 'proveedor_eliminado'
    | 'compra_registrada' | 'compra_eliminada'
    | 'cliente_precio_especial'
    | 'cotizacion_creada' | 'cotizacion_eliminada' | 'cotizacion_convertida'
    | 'conteo_inventario';

export interface LogSeguridad {
    id?: number;
    tipo: TipoLogSeguridad;
    descripcion: string;
    usuarioId?: number;
    usuarioNombre?: string;
    detalles?: string;
    fecha: Date;
}

export interface PagoFiado {
    id?: number;
    clienteId: number;
    clienteNombre: string;
    monto: number;
    moneda: 'CUP' | 'USD' | 'EUR' | 'MLC';
    montoEnCUP: number;
    metodoPago: 'efectivo' | 'transferencia' | 'tarjeta';
    fecha: Date;
    realizadoPor: string;
    realizadoPorId: number;
    puntoDeVentaId: number;
    notas?: string;
}
// ===== CLASE DE BASE DE DATOS =====

export class CuentaClaraDB extends Dexie {
    categorias!: Table<Categoria, number>;
    productos!: Table<Producto, number>;
    ventas!: Table<Venta, number>;
    usuarios!: Table<Usuario, number>;
    cierres!: Table<CierreCaja, number>;
    licencias!: Table<Licencia, number>;
    clientes!: Table<Cliente, number>;
    tasasCambio!: Table<TasaCambio, number>;
    devoluciones!: Table<Devolucion, number>;
    movimientosInventario!: Table<MovimientoInventario, number>;
    config!: Table<ConfigEntry, string>;
    logsSeguridad!: Table<LogSeguridad, number>;
    puntosDeVenta!: Table<PuntoDeVenta, number>;
    gastos!: Table<Gasto, number>;
    proveedores!: Table<Proveedor, number>;
    compras!: Table<Compra, number>;
    cotizaciones!: Table<Cotizacion, number>;
    proyectosMigracion!: Table<ProyectoMigracion, number>;
    pagosFiados!: Table<PagoFiado, number>;

    constructor() {
        super('CuentaClaraDB');

        this.version(8).stores({
            categorias: '++id, nombre',
            productos: '++id, categoriaId, nombre, stockActual, codigoBarras',
            ventas: '++id, fecha, vendedorId, estado, clienteId',
            usuarios: '++id, nombre, pin, rol',
            cierres: '++id, fecha, realizadoPor',
            licencias: '++id, codigo, cliente, estado',
            clientes: '++id, nombre, telefono, saldoPendiente',
            tasasCambio: '++id, moneda',
            devoluciones: '++id, ventaId, productoId, fecha',
            movimientosInventario: '++id, productoId, tipo, fecha',
        });

        this.version(9).stores({
            categorias: '++id, nombre',
            productos: '++id, categoriaId, nombre, stockActual, codigoBarras',
            ventas: '++id, fecha, vendedorId, estado, clienteId',
            usuarios: '++id, nombre, pin, rol',
            cierres: '++id, fecha, realizadoPor',
            licencias: '++id, codigo, cliente, estado',
            clientes: '++id, nombre, telefono, saldoPendiente',
            tasasCambio: '++id, moneda',
            devoluciones: '++id, ventaId, productoId, fecha',
            movimientosInventario: '++id, productoId, tipo, fecha',
            config: 'key',
        });

        this.version(10).stores({
            categorias: '++id, nombre',
            productos: '++id, categoriaId, nombre, stockActual, codigoBarras',
            ventas: '++id, fecha, vendedorId, estado, clienteId',
            usuarios: '++id, nombre, pin, rol',
            cierres: '++id, fecha, realizadoPor',
            licencias: '++id, codigo, cliente, estado',
            clientes: '++id, nombre, telefono, saldoPendiente',
            tasasCambio: '++id, moneda',
            devoluciones: '++id, ventaId, productoId, fecha',
            movimientosInventario: '++id, productoId, tipo, fecha',
            config: 'key',
            logsSeguridad: '++id, tipo, fecha, usuarioNombre',
        });

        this.version(11).stores({
            categorias: '++id, nombre, puntoDeVentaId',
            productos: '++id, categoriaId, nombre, stockActual, codigoBarras, puntoDeVentaId',
            ventas: '++id, fecha, vendedorId, estado, clienteId, puntoDeVentaId',
            usuarios: '++id, nombre, pin, rol',
            cierres: '++id, fecha, realizadoPor, puntoDeVentaId',
            licencias: '++id, codigo, cliente, estado',
            clientes: '++id, nombre, telefono, saldoPendiente',
            tasasCambio: '++id, moneda',
            devoluciones: '++id, ventaId, productoId, fecha, puntoDeVentaId',
            movimientosInventario: '++id, productoId, tipo, fecha, puntoDeVentaId',
            config: 'key',
            logsSeguridad: '++id, tipo, fecha, usuarioNombre',
            puntosDeVenta: '++id, nombre, activo',
        }).upgrade(async (tx) => {
            const ahora = new Date();
            const pdvId = await tx.table('puntosDeVenta').add({
                nombre: '🏪 Principal', icono: '🏪', activo: true, creadoEn: ahora,
            });
            await tx.table('categorias').toCollection().modify({ puntoDeVentaId: pdvId });
            await tx.table('productos').toCollection().modify({ puntoDeVentaId: pdvId });
            await tx.table('ventas').toCollection().modify({ puntoDeVentaId: pdvId, puntoDeVentaNombre: '🏪 Principal' });
            await tx.table('devoluciones').toCollection().modify({ puntoDeVentaId: pdvId });
            await tx.table('movimientosInventario').toCollection().modify({ puntoDeVentaId: pdvId });
            await tx.table('cierres').toCollection().modify({ puntoDeVentaId: pdvId, puntoDeVentaNombre: '🏪 Principal' });
            await tx.table('usuarios').toCollection().modify((u: any) => { u.puntosDeVentaIds = [pdvId]; });
        });

        this.version(12).stores({
            categorias: '++id, nombre, puntoDeVentaId',
            productos: '++id, categoriaId, nombre, stockActual, codigoBarras, puntoDeVentaId',
            ventas: '++id, fecha, vendedorId, estado, clienteId, puntoDeVentaId',
            usuarios: '++id, nombre, pin, rol',
            cierres: '++id, fecha, realizadoPor, puntoDeVentaId',
            licencias: '++id, codigo, cliente, estado',
            clientes: '++id, nombre, telefono, saldoPendiente',
            tasasCambio: '++id, moneda',
            devoluciones: '++id, ventaId, productoId, fecha, puntoDeVentaId',
            movimientosInventario: '++id, productoId, tipo, fecha, puntoDeVentaId',
            config: 'key',
            logsSeguridad: '++id, tipo, fecha, usuarioNombre',
            puntosDeVenta: '++id, nombre, activo',
            gastos: '++id, fecha, categoria, puntoDeVentaId',
        });

        this.version(13).stores({
            categorias: '++id, nombre, puntoDeVentaId',
            productos: '++id, categoriaId, nombre, stockActual, codigoBarras, puntoDeVentaId',
            ventas: '++id, fecha, vendedorId, estado, clienteId, puntoDeVentaId',
            usuarios: '++id, nombre, pin, rol',
            cierres: '++id, fecha, realizadoPor, puntoDeVentaId',
            licencias: '++id, codigo, cliente, estado',
            clientes: '++id, nombre, telefono, saldoPendiente',
            tasasCambio: '++id, moneda',
            devoluciones: '++id, ventaId, productoId, fecha, puntoDeVentaId',
            movimientosInventario: '++id, productoId, tipo, fecha, puntoDeVentaId',
            config: 'key',
            logsSeguridad: '++id, tipo, fecha, usuarioNombre',
            puntosDeVenta: '++id, nombre, activo',
            gastos: '++id, fecha, categoria, puntoDeVentaId',
            proveedores: '++id, nombre',
            compras: '++id, fecha, proveedorId, puntoDeVentaId',
        });

        this.version(14).stores({
            categorias: '++id, nombre, puntoDeVentaId',
            productos: '++id, categoriaId, nombre, stockActual, codigoBarras, puntoDeVentaId',
            ventas: '++id, fecha, vendedorId, estado, clienteId, puntoDeVentaId',
            usuarios: '++id, nombre, pin, rol',
            cierres: '++id, fecha, realizadoPor, puntoDeVentaId',
            licencias: '++id, codigo, cliente, estado',
            clientes: '++id, nombre, telefono, saldoPendiente',
            tasasCambio: '++id, moneda',
            devoluciones: '++id, ventaId, productoId, fecha, puntoDeVentaId',
            movimientosInventario: '++id, productoId, tipo, fecha, puntoDeVentaId',
            config: 'key',
            logsSeguridad: '++id, tipo, fecha, usuarioNombre',
            puntosDeVenta: '++id, nombre, activo',
            gastos: '++id, fecha, categoria, puntoDeVentaId',
            proveedores: '++id, nombre',
            compras: '++id, fecha, proveedorId, puntoDeVentaId',
        });

        // v15: cotizaciones
        this.version(15).stores({
            categorias: '++id, nombre, puntoDeVentaId',
            productos: '++id, categoriaId, nombre, stockActual, codigoBarras, puntoDeVentaId',
            ventas: '++id, fecha, vendedorId, estado, clienteId, puntoDeVentaId',
            usuarios: '++id, nombre, pin, rol',
            cierres: '++id, fecha, realizadoPor, puntoDeVentaId',
            licencias: '++id, codigo, cliente, estado',
            clientes: '++id, nombre, telefono, saldoPendiente',
            tasasCambio: '++id, moneda',
            devoluciones: '++id, ventaId, productoId, fecha, puntoDeVentaId',
            movimientosInventario: '++id, productoId, tipo, fecha, puntoDeVentaId',
            config: 'key',
            logsSeguridad: '++id, tipo, fecha, usuarioNombre',
            puntosDeVenta: '++id, nombre, activo',
            gastos: '++id, fecha, categoria, puntoDeVentaId',
            proveedores: '++id, nombre',
            compras: '++id, fecha, proveedorId, puntoDeVentaId',
            cotizaciones: '++id, numero, fecha, clienteId, estado, puntoDeVentaId',
        });
        // v16: proyectos de migración (solo master)
        this.version(16).stores({
            categorias: '++id, nombre, puntoDeVentaId',
            productos: '++id, categoriaId, nombre, stockActual, codigoBarras, puntoDeVentaId',
            ventas: '++id, fecha, vendedorId, estado, clienteId, puntoDeVentaId',
            usuarios: '++id, nombre, pin, rol',
            cierres: '++id, fecha, realizadoPor, puntoDeVentaId',
            licencias: '++id, codigo, cliente, estado',
            clientes: '++id, nombre, telefono, saldoPendiente',
            tasasCambio: '++id, moneda',
            devoluciones: '++id, ventaId, productoId, fecha, puntoDeVentaId',
            movimientosInventario: '++id, productoId, tipo, fecha, puntoDeVentaId',
            config: 'key',
            logsSeguridad: '++id, tipo, fecha, usuarioNombre',
            puntosDeVenta: '++id, nombre, activo',
            gastos: '++id, fecha, categoria, puntoDeVentaId',
            proveedores: '++id, nombre',
            compras: '++id, fecha, proveedorId, puntoDeVentaId',
            cotizaciones: '++id, numero, fecha, clienteId, estado, puntoDeVentaId',
            proyectosMigracion: '++id, nombreCliente, estado, fechaModificacion',
        });
        // v18: pagos de fiados
        this.version(18).stores({
            categorias: '++id, nombre, puntoDeVentaId',
            productos: '++id, categoriaId, nombre, stockActual, codigoBarras, puntoDeVentaId',
            ventas: '++id, fecha, vendedorId, estado, clienteId, puntoDeVentaId',
            usuarios: '++id, nombre, pin, rol',
            cierres: '++id, fecha, realizadoPor, puntoDeVentaId',
            licencias: '++id, codigo, cliente, estado',
            clientes: '++id, nombre, telefono, saldoPendiente',
            tasasCambio: '++id, moneda',
            devoluciones: '++id, ventaId, productoId, fecha, puntoDeVentaId',
            movimientosInventario: '++id, productoId, tipo, fecha, puntoDeVentaId',
            config: 'key',
            logsSeguridad: '++id, tipo, fecha, usuarioNombre',
            puntosDeVenta: '++id, nombre, activo',
            gastos: '++id, fecha, categoria, puntoDeVentaId',
            proveedores: '++id, nombre',
            compras: '++id, fecha, proveedorId, puntoDeVentaId',
            cotizaciones: '++id, numero, fecha, clienteId, estado, puntoDeVentaId',
            proyectosMigracion: '++id, nombreCliente, estado, fechaModificacion',
            mesas: '++id, numero, puntoDeVentaId, activa',
            pedidosMesa: '++id, mesaId, puntoDeVentaId, estado, abiertoEn',
            pagosFiados: '++id, clienteId, fecha, puntoDeVentaId',
        });

    }
}
// ===== PROYECTOS DE MIGRACIÓN (solo master) =====

export interface ProductoMigracion {
    nombre: string;
    categoria: string;
    precioVenta: number;
    precioCompra?: number;
    stockActual?: number;
    stockMinimo?: number;
    codigoBarras?: string;
    unidadMedida?: string;
    descripcion?: string;
    fechaVencimiento?: string;
    lote?: string;
    numeroSerie?: string;
}

export interface ProyectoMigracion {
    id?: number;
    nombreCliente: string;
    fechaCreacion: Date;
    fechaModificacion: Date;
    estado: 'borrador' | 'revisado' | 'entregado';
    origen: 'excel' | 'manual' | 'pegado' | 'json-externo';
    categorias: { nombre: string; descripcion?: string }[];
    productos: ProductoMigracion[];
    mapeoColumnas?: Record<string, number>;
    notas?: string;
}

export const db = new CuentaClaraDB();

// ===== FUNCIONES AUXILIARES =====

export const obtenerTasaCambio = async (moneda: 'USD' | 'EUR' | 'MLC'): Promise<number> => {
    const tasa = await db.tasasCambio.where('moneda').equals(moneda).first();
    return tasa?.tasa || 1;
};

export const convertirACUP = async (monto: number, moneda: 'CUP' | 'USD' | 'EUR' | 'MLC'): Promise<number> => {
    if (moneda === 'CUP') return monto;
    const tasa = await obtenerTasaCambio(moneda);
    return monto * tasa;
};

export const calcularComision = async (venta: Venta): Promise<number> => {
    const vendedor = await db.usuarios.get(venta.vendedorId);
    if (!vendedor || !vendedor.comisionPorcentaje) return 0;
    return venta.total * (vendedor.comisionPorcentaje / 100);
};

export const tieneAccesoAPDV = (usuario: Usuario, pdvId: number): boolean => {
    if (usuario.rol === 'admin' || usuario.rol === 'jefe') return true;
    return usuario.puntosDeVentaIds?.includes(pdvId) ?? false;
};

export const permiteFracciones = (unidad: string | undefined): boolean => {
    if (!unidad) return false;
    const u = unidad.toLowerCase();
    return ['kg', 'kilo', 'kilogramo', 'g', 'gramo', 'lb', 'libra', 'litro', 'l', 'ml', 'metro', 'm', 'cm', 'onza', 'oz'].some(x => u.includes(x));
};

export const generarIdVariante = (): string => {
    return `v-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
};

export const stockTotalProducto = (p: Producto): number => {
    if (p.tieneVariantes && p.variantes && p.variantes.length > 0) {
        return p.variantes.reduce((s, v) => s + v.stockActual, 0);
    }
    return p.stockActual;
};

export const precioParaCliente = (producto: Producto, cliente: Cliente | null): number => {
    if (cliente?.preciosEspeciales) {
        const esp = cliente.preciosEspeciales.find(p => p.productoId === producto.id);
        if (esp) return esp.precio;
    }
    return producto.precioVenta;
};

/** Genera el siguiente número de cotización */
export const generarNumeroCotizacion = async (): Promise<string> => {
    const anio = new Date().getFullYear();
    const count = await db.cotizaciones.count();
    const numero = String(count + 1).padStart(4, '0');
    return `COT-${anio}-${numero}`;
};