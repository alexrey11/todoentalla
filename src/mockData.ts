import type {
  PuntoDeVenta,
  Categoria,
  Producto,
  Venta,
  Cliente,
  Usuario,
  Gasto,
  Cierre,
  MovimientoInventario,
  Cotizacion,
  PagoFiado,
  TasaCambio,
  LogAuditoria,
} from '@/types';

export const mockPuntosDeVenta: PuntoDeVenta[] = [
  {
    id: 'pdv-1',
    nombre: 'Tienda Principal',
    direccion: 'Calle 23 #456, Habana',
    telefono: '+53 5555-1234',
    icono: 'Store',
    activo: true,
    impuestoPorcentaje: 10,
  },
  {
    id: 'pdv-2',
    nombre: 'Sucursal Centro',
    direccion: 'Av. Revolución #789',
    telefono: '+53 5555-5678',
    icono: 'Store',
    activo: true,
    impuestoPorcentaje: 10,
  },
];

export const mockCategorias: Categoria[] = [
  { id: 'cat-1', puntoDeVentaId: 'pdv-1', nombre: 'Bebidas', descripcion: 'Refrescos, jugos, agua' },
  { id: 'cat-2', puntoDeVentaId: 'pdv-1', nombre: 'Abarrotes', descripcion: 'Arroz, frijoles, aceite' },
  { id: 'cat-3', puntoDeVentaId: 'pdv-1', nombre: 'Limpieza', descripcion: 'Detergentes, jabones' },
  { id: 'cat-4', puntoDeVentaId: 'pdv-1', nombre: 'Carnes', descripcion: 'Pollo, res, cerdo' },
  { id: 'cat-5', puntoDeVentaId: 'pdv-1', nombre: 'Panadería', descripcion: 'Pan, dulces, galletas' },
  { id: 'cat-6', puntoDeVentaId: 'pdv-1', nombre: 'Higiene', descripcion: 'Pasta dental, papel' },
];

export const mockProductos: Producto[] = [
  { id: 'p-1', categoriaId: 'cat-1', puntoDeVentaId: 'pdv-1', nombre: 'Coca-Cola 1.5L', precioCompra: 120, precioVenta: 200, stockActual: 48, stockMinimo: 10, unidadMedida: 'unidad', codigoBarras: '7501234567890', variantes: [], esCompuesto: false, componentes: [] },
  { id: 'p-2', categoriaId: 'cat-1', puntoDeVentaId: 'pdv-1', nombre: 'Agua Mineral 500ml', precioCompra: 60, precioVenta: 100, stockActual: 8, stockMinimo: 15, unidadMedida: 'unidad', codigoBarras: '7501234567891', variantes: [], esCompuesto: false, componentes: [] },
  { id: 'p-3', categoriaId: 'cat-1', puntoDeVentaId: 'pdv-1', nombre: 'Jugo Naranja 1L', precioCompra: 140, precioVenta: 220, stockActual: 32, stockMinimo: 8, unidadMedida: 'unidad', codigoBarras: '7501234567892', variantes: [], esCompuesto: false, componentes: [] },
  { id: 'p-4', categoriaId: 'cat-2', puntoDeVentaId: 'pdv-1', nombre: 'Arroz 5kg', precioCompra: 380, precioVenta: 520, stockActual: 24, stockMinimo: 6, unidadMedida: 'unidad', codigoBarras: '7501234567893', variantes: [], esCompuesto: false, componentes: [] },
  { id: 'p-5', categoriaId: 'cat-2', puntoDeVentaId: 'pdv-1', nombre: 'Frijol Negro 1kg', precioCompra: 180, precioVenta: 260, stockActual: 18, stockMinimo: 5, unidadMedida: 'kg', codigoBarras: '7501234567894', variantes: [], esCompuesto: false, componentes: [] },
  { id: 'p-6', categoriaId: 'cat-2', puntoDeVentaId: 'pdv-1', nombre: 'Aceite Vegetal 1L', precioCompra: 220, precioVenta: 320, stockActual: 4, stockMinimo: 8, unidadMedida: 'litro', codigoBarras: '7501234567895', variantes: [], esCompuesto: false, componentes: [] },
  { id: 'p-7', categoriaId: 'cat-3', puntoDeVentaId: 'pdv-1', nombre: 'Detergente 1kg', precioCompra: 190, precioVenta: 280, stockActual: 22, stockMinimo: 5, unidadMedida: 'kg', codigoBarras: '7501234567896', variantes: [], esCompuesto: false, componentes: [] },
  { id: 'p-8', categoriaId: 'cat-3', puntoDeVentaId: 'pdv-1', nombre: 'Jabón de Lavaloza', precioCompra: 85, precioVenta: 130, stockActual: 36, stockMinimo: 10, unidadMedida: 'unidad', codigoBarras: '7501234567897', variantes: [], esCompuesto: false, componentes: [] },
  { id: 'p-9', categoriaId: 'cat-4', puntoDeVentaId: 'pdv-1', nombre: 'Pechuga de Pollo 1kg', precioCompra: 280, precioVenta: 390, stockActual: 14, stockMinimo: 6, unidadMedida: 'kg', codigoBarras: '7501234567898', variantes: [], esCompuesto: false, componentes: [], fechaVencimiento: '2026-11-15' },
  { id: 'p-10', categoriaId: 'cat-5', puntoDeVentaId: 'pdv-1', nombre: 'Pan de Agua', precioCompra: 40, precioVenta: 70, stockActual: 60, stockMinimo: 20, unidadMedida: 'unidad', codigoBarras: '7501234567899', variantes: [], esCompuesto: false, componentes: [] },
  { id: 'p-11', categoriaId: 'cat-5', puntoDeVentaId: 'pdv-1', nombre: 'Galletas Dulces 200g', precioCompra: 75, precioVenta: 120, stockActual: 42, stockMinimo: 12, unidadMedida: 'unidad', codigoBarras: '7501234567800', variantes: [], esCompuesto: false, componentes: [] },
  { id: 'p-12', categoriaId: 'cat-6', puntoDeVentaId: 'pdv-1', nombre: 'Papel Higiénico 4pk', precioCompra: 110, precioVenta: 170, stockActual: 28, stockMinimo: 8, unidadMedida: 'unidad', codigoBarras: '7501234567801', variantes: [], esCompuesto: false, componentes: [] },
  { id: 'p-13', categoriaId: 'cat-1', puntoDeVentaId: 'pdv-1', nombre: 'Cerveza Cristal 350ml', precioCompra: 95, precioVenta: 150, stockActual: 3, stockMinimo: 12, unidadMedida: 'unidad', codigoBarras: '7501234567802', variantes: [], esCompuesto: false, componentes: [] },
  { id: 'p-14', categoriaId: 'cat-2', puntoDeVentaId: 'pdv-1', nombre: 'Azúcar 1kg', precioCompra: 130, precioVenta: 190, stockActual: 30, stockMinimo: 8, unidadMedida: 'kg', codigoBarras: '7501234567803', variantes: [], esCompuesto: false, componentes: [] },
  { id: 'p-15', categoriaId: 'cat-2', puntoDeVentaId: 'pdv-1', nombre: 'Café Molido 250g', precioCompra: 240, precioVenta: 350, stockActual: 16, stockMinimo: 5, unidadMedida: 'unidad', codigoBarras: '7501234567804', variantes: [], esCompuesto: false, componentes: [] },
];

export const mockUsuarios: Usuario[] = [
  { id: 'u-1', nombre: 'Carlos Pérez', pin: '1234', rol: 'admin', puntosDeVentaIds: ['pdv-1', 'pdv-2'], comisionPorcentaje: 0 },
  { id: 'u-2', nombre: 'María García', pin: '5678', rol: 'vendedor', puntosDeVentaIds: ['pdv-1'], comisionPorcentaje: 3 },
  { id: 'u-3', nombre: 'José López', pin: '9012', rol: 'jefe', puntosDeVentaIds: ['pdv-1', 'pdv-2'], comisionPorcentaje: 5 },
];

export const mockClientes: Cliente[] = [
  { id: 'c-1', nombre: 'Ana Martínez', telefono: '+53 5555-1111', saldoPendiente: 0, preciosEspeciales: [] },
  { id: 'c-2', nombre: 'Pedro Sánchez', telefono: '+53 5555-2222', saldoPendiente: 450, preciosEspeciales: [{ productoId: 'p-1', nombre: 'Coca-Cola 1.5L', precio: 180 }] },
  { id: 'c-3', nombre: 'Restaurant El Sol', telefono: '+53 5555-3333', saldoPendiente: 1200, preciosEspeciales: [{ productoId: 'p-4', nombre: 'Arroz 5kg', precio: 480 }, { productoId: 'p-5', nombre: 'Frijol Negro 1kg', precio: 240 }] },
  { id: 'c-4', nombre: 'Lucía Fernández', telefono: '+53 5555-4444', saldoPendiente: 0, preciosEspeciales: [] },
  { id: 'c-5', nombre: 'Roberto Díaz', telefono: '+53 5555-5555', saldoPendiente: 780, preciosEspeciales: [] },
];

function makeVentas(): Venta[] {
  const ventas: Venta[] = [];
  const now = new Date('2026-11-03');
  const vendedores = [
    { id: 'u-1', nombre: 'Carlos Pérez' },
    { id: 'u-2', nombre: 'María García' },
    { id: 'u-3', nombre: 'José López' },
  ];
  const clientes = [
    { id: 'c-1', nombre: 'Ana Martínez' },
    { id: 'c-2', nombre: 'Pedro Sánchez' },
    { id: 'c-4', nombre: 'Lucía Fernández' },
  ];

  for (let d = 30; d >= 0; d--) {
    const day = new Date(now);
    day.setDate(day.getDate() - d);
    const numVentas = Math.floor(Math.random() * 5) + 2;
    for (let v = 0; v < numVentas; v++) {
      const vendedor = vendedores[Math.floor(Math.random() * vendedores.length)];
      const numItems = Math.floor(Math.random() * 3) + 1;
      const items = [];
      let subtotal = 0;
      for (let i = 0; i < numItems; i++) {
        const prod = mockProductos[Math.floor(Math.random() * mockProductos.length)];
        const cantidad = Math.floor(Math.random() * 3) + 1;
        const st = prod.precioVenta * cantidad;
        subtotal += st;
        items.push({
          productoId: prod.id,
          nombre: prod.nombre,
          cantidad,
          precioUnitario: prod.precioVenta,
          descuento: 0,
          subtotal: st,
        });
      }
      const descuentoGlobal = Math.random() > 0.7 ? Math.floor(subtotal * 0.05) : 0;
      const baseImponible = subtotal - descuentoGlobal;
      const impuesto = Math.floor(baseImponible * 0.1);
      const total = baseImponible + impuesto;
      const tieneCliente = Math.random() > 0.5;
      const esFiado = Math.random() > 0.85;
      const metodos: Venta['metodosPago'] = [];
      const metodo = (['efectivo', 'tarjeta', 'transferencia'] as const)[Math.floor(Math.random() * 3)];
      metodos.push({ metodo, monto: total });
      const hora = Math.floor(Math.random() * 12) + 8;
      day.setHours(hora, Math.floor(Math.random() * 60));
      ventas.push({
        id: `v-${d}-${v}`,
        items,
        subtotal,
        descuentoGlobal,
        impuesto,
        total,
        fecha: new Date(day).toISOString(),
        vendedorId: vendedor.id,
        vendedorNombre: vendedor.nombre,
        estado: 'completada',
        clienteId: tieneCliente ? clientes[Math.floor(Math.random() * clientes.length)].id : undefined,
        clienteNombre: tieneCliente ? clientes[Math.floor(Math.random() * clientes.length)].nombre : undefined,
        metodosPago: metodos,
        esFiado,
        puntoDeVentaId: 'pdv-1',
      });
    }
  }
  return ventas.sort((a, b) => b.fecha.localeCompare(a.fecha));
}

export const mockVentas: Venta[] = makeVentas();

export const mockGastos: Gasto[] = [
  { id: 'g-1', fecha: '2026-11-01', categoria: 'luz', monto: 850, descripcion: 'Recibo eléctrico octubre', puntoDeVentaId: 'pdv-1' },
  { id: 'g-2', fecha: '2026-11-01', categoria: 'agua', monto: 120, descripcion: 'Recibo de agua', puntoDeVentaId: 'pdv-1' },
  { id: 'g-3', fecha: '2026-11-02', categoria: 'salario', monto: 5000, descripcion: 'Salario María García', puntoDeVentaId: 'pdv-1' },
  { id: 'g-4', fecha: '2026-11-02', categoria: 'transporte', monto: 300, descripcion: 'Flete mercancía', puntoDeVentaId: 'pdv-1' },
  { id: 'g-5', fecha: '2026-11-03', categoria: 'alquiler', monto: 3500, descripcion: 'Alquiler local noviembre', puntoDeVentaId: 'pdv-1' },
];

export const mockCierres: Cierre[] = [
  { id: 'ci-1', fecha: '2026-11-02', totalVentas: 4250, montoReal: 4230, diferencia: -20, puntoDeVentaId: 'pdv-1', vendedorId: 'u-1', vendedorNombre: 'Carlos Pérez' },
  { id: 'ci-2', fecha: '2026-11-01', totalVentas: 3890, montoReal: 3910, diferencia: 20, puntoDeVentaId: 'pdv-1', vendedorId: 'u-1', vendedorNombre: 'Carlos Pérez' },
  { id: 'ci-3', fecha: '2026-10-31', totalVentas: 5120, montoReal: 5120, diferencia: 0, puntoDeVentaId: 'pdv-1', vendedorId: 'u-3', vendedorNombre: 'José López' },
];

export const mockMovimientos: MovimientoInventario[] = [
  { id: 'm-1', productoId: 'p-1', productoNombre: 'Coca-Cola 1.5L', tipo: 'entrada', cantidad: 24, motivo: 'Compra a proveedor', fecha: '2026-11-01T10:00:00Z' },
  { id: 'm-2', productoId: 'p-6', productoNombre: 'Aceite Vegetal 1L', tipo: 'salida', cantidad: 2, motivo: 'Venta', fecha: '2026-11-02T14:30:00Z' },
  { id: 'm-3', productoId: 'p-13', productoNombre: 'Cerveza Cristal 350ml', tipo: 'perdida', cantidad: 1, motivo: 'Botella rota', fecha: '2026-11-02T16:00:00Z' },
  { id: 'm-4', productoId: 'p-4', productoNombre: 'Arroz 5kg', tipo: 'ajuste', cantidad: -2, motivo: 'Ajuste por diferencia', fecha: '2026-11-03T09:00:00Z' },
];

export const mockCotizaciones: Cotizacion[] = [
  { id: 'cot-1', numero: 'COT-2026-0001', fecha: '2026-11-02', estado: 'pendiente', items: [{ productoId: 'p-4', nombre: 'Arroz 5kg', cantidad: 10, precioUnitario: 520, descuento: 0, subtotal: 5200 }], total: 5720, clienteNombre: 'Restaurant El Sol' },
  { id: 'cot-2', numero: 'COT-2026-0002', fecha: '2026-11-01', estado: 'aceptada', items: [{ productoId: 'p-14', nombre: 'Café Molido 250g', cantidad: 5, precioUnitario: 350, descuento: 0, subtotal: 1750 }], total: 1925, clienteNombre: 'Ana Martínez' },
];

export const mockPagosFiados: PagoFiado[] = [
  { id: 'pf-1', clienteId: 'c-2', clienteNombre: 'Pedro Sánchez', monto: 200, fecha: '2026-11-02' },
  { id: 'pf-2', clienteId: 'c-5', clienteNombre: 'Roberto Díaz', monto: 300, fecha: '2026-11-03' },
];

export const mockTasasCambio: TasaCambio[] = [
  { id: 't-1', moneda: 'USD', valorCUP: 320, fechaActualizacion: '2026-11-01' },
  { id: 't-2', moneda: 'EUR', valorCUP: 345, fechaActualizacion: '2026-11-01' },
  { id: 't-3', moneda: 'MLC', valorCUP: 250, fechaActualizacion: '2026-11-01' },
];

export const mockLogs: LogAuditoria[] = [
  { id: 'l-1', fecha: '2026-11-03T08:30:00Z', usuarioId: 'u-1', usuarioNombre: 'Carlos Pérez', tipo: 'login', detalle: 'Inicio de sesión exitoso' },
  { id: 'l-2', fecha: '2026-11-02T18:00:00Z', usuarioId: 'u-1', usuarioNombre: 'Carlos Pérez', tipo: 'cierre_caja', detalle: 'Cierre de caja con diferencia de -20 CUP' },
  { id: 'l-3', fecha: '2026-11-02T15:00:00Z', usuarioId: 'u-2', usuarioNombre: 'María García', tipo: 'venta_cancelada', detalle: 'Venta v-2-3 cancelada' },
  { id: 'l-4', fecha: '2026-11-01T10:00:00Z', usuarioId: 'u-1', usuarioNombre: 'Carlos Pérez', tipo: 'backup', detalle: 'Exportación de backup manual' },
];
