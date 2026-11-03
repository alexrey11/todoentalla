import { useState, useEffect, useMemo } from 'react';
import {
  Search,
  ScanLine,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  CreditCard,
  Banknote,
  ArrowLeftRight,
  Check,
  X,
  AlertCircle,
  Package,
  Tag,
  Printer,
  ArrowLeft,
  Percent,
  Weight,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { Card, Button, Badge, Input, Select, Modal } from '@/components/ui';
import { PageHeader } from '@/layout/PageHeader';
import { formatCurrency, formatCurrencyWithSymbol } from '@/utils/format';
import { db, stockTotalProducto, permiteFracciones, precioParaCliente } from '@/db';
import type {
  Producto,
  Venta,
  Usuario,
  Cliente,
  TasaCambio,
  MetodoPago,
  ItemCarrito,
  VarianteProducto,
} from '@/db';
import { usePDV } from '@/contexts/PuntoDeVentaContext';
import { cargarPreferencias, type Preferencias, PREFERENCIAS_DEFAULT } from '@/utils/preferencias';
import { sonidos } from '@/utils/sonidos';
import { toast } from '@/utils/toast';
import { registrarLog } from '@/utils/logger';
import { estaCajaCerrada, reabrirCaja, obtenerEstadoCaja } from '@/utils/estadoCaja';
import { escucharCarrito } from '@/utils/carritoBus';
import { onScanBluetooth, iniciarEscuchaBluetooth } from '@/utils/scanner';
import EscanerCamara from '@/components/EscanerCamara';
import TicketPreview from '@/components/TicketPreview';

type PasoVenta = 'carrito' | 'pago' | 'confirmacion';

interface NuevaVentaProps {
  usuarioActual: Usuario;
  onCerrarSesion?: () => void;
}

export function NuevaVenta({ usuarioActual }: NuevaVentaProps) {
  const { pdvActivo, modoTodos } = usePDV();

  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [tasas, setTasas] = useState<TasaCambio[]>([]);
  const [prefs, setPrefs] = useState<Preferencias>(PREFERENCIAS_DEFAULT);

  const [search, setSearch] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState<string | 'todas'>('todas');
  const [carrito, setCarrito] = useState<ItemCarrito[]>([]);
  const [descuentoGlobal, setDescuentoGlobal] = useState(0);
  const [clienteId, setClienteId] = useState<number | ''>('');
  const [esFiado, setEsFiado] = useState(false);
  const [notas, setNotas] = useState('');

  const [paso, setPaso] = useState<PasoVenta>('carrito');
  const [metodoActivo, setMetodoActivo] = useState<MetodoPago['tipo'] | 'combinado'>('efectivo');
  const [efectivoRecibido, setEfectivoRecibido] = useState('');
  const [pagoCombinado, setPagoCombinado] = useState({ efectivo: '', tarjeta: '', transferencia: '' });

  const [modalDescuentoItem, setModalDescuentoItem] = useState<number | null>(null);
  const [modalDescuentoGlobal, setModalDescuentoGlobal] = useState(false);
  const [modalVariantes, setModalVariantes] = useState<Producto | null>(null);
  const [modalCantidad, setModalCantidad] = useState<{ productoId: number; cantidad: string } | null>(null);
  const [mostrarEscaner, setMostrarEscaner] = useState(false);
  const [ultimoEscaneo, setUltimoEscaneo] = useState<string | null>(null);

  const [cajaCerrada, setCajaCerrada] = useState(false);
  const [motivoReapertura, setMotivoReapertura] = useState('');
  const [modalReapertura, setModalReapertura] = useState(false);

  const [ultimaVenta, setUltimaVenta] = useState<Venta | null>(null);
  const [ventaParaTicket, setVentaParaTicket] = useState<Venta | null>(null);
  const [cargando, setCargando] = useState(true);

  // ===== CARGA INICIAL =====
  useEffect(() => {
    (async () => {
      try {
        const [cats, clis, tasasData, p] = await Promise.all([
          db.categorias.toArray(),
          db.clientes.toArray(),
          db.tasasCambio.toArray(),
          cargarPreferencias(),
        ]);
        setCategorias(cats);
        setClientes(clis);
        setTasas(tasasData);
        setPrefs(p);
        sonidos.setActivos(p.sonidoAlCobrar);
      } catch (e) {
        console.error('[nueva-venta] Error cargando:', e);
      } finally {
        setCargando(false);
      }
    })();
  }, []);

  // ===== CARGA PRODUCTOS POR PDV =====
  useEffect(() => {
    if (!pdvActivo?.id) {
      setProductos([]);
      return;
    }
    db.productos
      .where('puntoDeVentaId')
      .equals(pdvActivo.id)
      .toArray()
      .then((prods) => {
        setProductos(prods.filter((p) => stockTotalProducto(p) > 0 || p.esCompuesto));
      });
  }, [pdvActivo?.id]);

  // ===== CAJA CERRADA =====
  useEffect(() => {
    setCajaCerrada(pdvActivo?.id ? estaCajaCerrada(pdvActivo.id) : false);
  }, [pdvActivo?.id]);

  // ===== 🛡️ REVALIDAR CARRITO CUANDO CAMBIAN LOS PRODUCTOS =====
  // Si un producto pierde stock (por venta paralela o recarga), se quita del carrito
  useEffect(() => {
    setCarrito((prev) => {
      const filtrado = prev.filter((item) => {
        const prod = productos.find((p) => p.id === item.productoId);
        if (!prod) return false;
        if (prod.esCompuesto) return true;

        const stock = item.varianteId
          ? prod.variantes?.find((v) => v.id === item.varianteId)?.stockActual ?? 0
          : stockTotalProducto(prod);

        if (item.cantidad > stock) {
          toast.warn('Stock actualizado', `${item.productoNombre}: ahora quedan ${stock}`);
          return false;
        }
        return true;
      });
      return filtrado.length === prev.length ? prev : filtrado;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productos]);

  // ===== ESCÁNER BLUETOOTH =====
  useEffect(() => {
    const cleanup = iniciarEscuchaBluetooth();
    const unsub = onScanBluetooth((codigo) => procesarCodigoEscaneado(codigo));
    return () => {
      if (typeof cleanup === 'function') cleanup();
      unsub();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productos, carrito]);

  // ===== ESCUCHAR A CLARA =====
  useEffect(() => {
    const off = escucharCarrito((items) => {
      agregarMultiplesAlCarrito(items);
    });
    return off;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productos, clienteId, carrito]);

  // ===== CÁLCULOS =====
  const productosFiltrados = useMemo(() => {
    let lista = productos;
    if (categoriaFiltro !== 'todas') {
      lista = lista.filter((p) => String(p.categoriaId) === categoriaFiltro);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      lista = lista.filter(
        (p) =>
          p.nombre.toLowerCase().includes(q) ||
          (p.codigoBarras && p.codigoBarras.includes(q))
      );
    }
    return lista;
  }, [productos, categoriaFiltro, search]);

  const categoriasFiltradas = useMemo(() => {
    if (!pdvActivo) return categorias;
    return categorias.filter((c) => c.puntoDeVentaId === pdvActivo.id);
  }, [categorias, pdvActivo]);

  const clienteSeleccionado = useMemo(
    () => clientes.find((c) => c.id === clienteId) ?? null,
    [clientes, clienteId]
  );

  const subtotal = carrito.reduce((s, item) => s + item.subtotal, 0);
  const baseImponible = Math.max(0, subtotal - descuentoGlobal);
  const impuestoPct = pdvActivo?.impuestoPorcentaje ?? 0;
  const impuesto = Math.round(baseImponible * (impuestoPct / 100));
  const total = baseImponible + impuesto;

  const obtenerTasa = (moneda: string): number =>
    moneda === 'CUP' ? 1 : (tasas.find((t) => t.moneda === moneda)?.tasa ?? 1);

  const efectivoNum = parseFloat(efectivoRecibido) || 0;
  const vuelto = efectivoNum - total;

  const pagosCombinadosTotal =
    (parseFloat(pagoCombinado.efectivo) || 0) +
    (parseFloat(pagoCombinado.tarjeta) || 0) +
    (parseFloat(pagoCombinado.transferencia) || 0);
  const combinadoCompleto = pagosCombinadosTotal >= total && pagosCombinadosTotal > 0;

  const puedeRegistrar =
    carrito.length > 0 &&
    !cajaCerrada &&
    (esFiado
      ? clienteId !== ''
      : metodoActivo === 'efectivo'
        ? efectivoNum >= total
        : metodoActivo === 'combinado'
          ? combinadoCompleto
          : true);

  // ===== ACCIONES SOBRE EL CARRITO =====
  const precioPara = (producto: Producto): number => {
    return precioParaCliente(producto, clienteSeleccionado);
  };

  const agregarAlCarrito = (producto: Producto, variante?: VarianteProducto) => {
    const precio = precioPara(producto) + (variante?.precioExtra ?? 0);
    const stock = variante ? variante.stockActual : stockTotalProducto(producto);

    // 🛡️ Blindaje: productos NO compuestos requieren stock > 0
    if (!producto.esCompuesto && stock <= 0) {
      sonidos.error();
      toast.error(
        'Sin stock',
        `${producto.nombre}${variante ? ` (${variante.nombre})` : ''} no tiene stock disponible`
      );
      return;
    }

    let agregado = false;

    setCarrito((prev) => {
      const existing = prev.find(
        (item) =>
          item.productoId === producto.id &&
          ((variante && item.varianteId === variante.id) || (!variante && !item.varianteId))
      );

      if (existing) {
        if (existing.cantidad >= stock) {
          toast.error('Stock insuficiente', `Solo quedan ${stock}`);
          return prev;
        }
        agregado = true;
        return prev.map((item) =>
          item === existing
            ? {
              ...item,
              cantidad: item.cantidad + 1,
              subtotal:
                (item.cantidad + 1) *
                item.precioUnitario *
                (1 - (item.descuentoPorcentaje ?? 0) / 100),
            }
            : item
        );
      }

      agregado = true;
      return [
        ...prev,
        {
          productoId: producto.id!,
          productoNombre: producto.nombre,
          codigoBarras: variante?.codigoBarras || producto.codigoBarras,
          cantidad: 1,
          precioUnitario: precio,
          precioCompra: producto.precioCompra ?? 0,
          subtotal: precio,
          descuentoPorcentaje: 0,
          unidadMedida: producto.unidadMedida,
          permiteFracciones: permiteFracciones(producto.unidadMedida),
          esCompuesto: producto.esCompuesto,
          componentes: producto.componentes,
          varianteId: variante?.id,
          varianteNombre: variante?.nombre,
        },
      ];
    });

    if (agregado) sonidos.agregar();
  };

  const agregarMultiplesAlCarrito = (items: { productoId: number; cantidad: number }[]) => {
    let algunoAgregado = false;
    const noAgregados: string[] = [];

    setCarrito((prev) => {
      const nuevo = [...prev];
      for (const item of items) {
        const prod = productos.find((p) => p.id === item.productoId);
        if (!prod) continue;

        const precio = precioPara(prod);
        const stock = stockTotalProducto(prod);

        if (!prod.esCompuesto && stock <= 0) {
          noAgregados.push(prod.nombre);
          continue;
        }

        const idx = nuevo.findIndex((i) => i.productoId === prod.id && !i.varianteId);

        if (idx >= 0) {
          const existente = nuevo[idx];
          const nuevaCantidad = Math.min(existente.cantidad + item.cantidad, stock);
          if (nuevaCantidad > existente.cantidad) {
            nuevo[idx] = {
              ...existente,
              cantidad: nuevaCantidad,
              subtotal:
                nuevaCantidad *
                existente.precioUnitario *
                (1 - (existente.descuentoPorcentaje ?? 0) / 100),
            };
            algunoAgregado = true;
          } else {
            noAgregados.push(prod.nombre);
          }
        } else {
          const cantidad = Math.min(item.cantidad, stock);
          if (cantidad <= 0) {
            noAgregados.push(prod.nombre);
            continue;
          }
          nuevo.push({
            productoId: prod.id!,
            productoNombre: prod.nombre,
            codigoBarras: prod.codigoBarras,
            cantidad,
            precioUnitario: precio,
            precioCompra: prod.precioCompra ?? 0,
            subtotal: precio * cantidad,
            descuentoPorcentaje: 0,
            unidadMedida: prod.unidadMedida,
            permiteFracciones: permiteFracciones(prod.unidadMedida),
            esCompuesto: prod.esCompuesto,
            componentes: prod.componentes,
          });
          algunoAgregado = true;
        }
      }
      return nuevo;
    });

    if (algunoAgregado) sonidos.agregar();
    if (noAgregados.length > 0) {
      toast.warn('Sin stock', `No se agregaron: ${noAgregados.join(', ')}`);
    }
  };

  // 🛡️ CLAVE: recarga el producto fresco de Dexie antes de validar
  const handleClickProducto = async (producto: Producto) => {
    // Recargar desde Dexie para tener stock actualizado
    let prodFresco: Producto | undefined;
    try {
      prodFresco = await db.productos.get(producto.id!);
    } catch (e) {
      console.error('[nueva-venta] Error recargando producto:', e);
    }

    if (!prodFresco) {
      toast.error('Producto no encontrado');
      return;
    }

    // Actualizar en memoria para que la UI refleje el stock real
    setProductos((prev) => {
      const existe = prev.some((p) => p.id === prodFresco!.id);
      if (existe) {
        return prev.map((p) => (p.id === prodFresco!.id ? prodFresco! : p));
      }
      // Si el producto ya no está en la lista (fue vendido), no agregarlo de nuevo
      return prev;
    });

    const stockFresco = stockTotalProducto(prodFresco);

    // 🛡️ Validación con stock fresco
    if (!prodFresco.esCompuesto && !prodFresco.tieneVariantes && stockFresco <= 0) {
      sonidos.error();
      toast.error('Sin stock', `${prodFresco.nombre} no tiene stock disponible`);
      return;
    }

    // Productos con variantes
    if (prodFresco.tieneVariantes && prodFresco.variantes && prodFresco.variantes.length > 0) {
      const conStock = prodFresco.variantes.filter((v) => v.stockActual > 0);
      if (conStock.length === 0) {
        sonidos.error();
        toast.error('Sin stock', `${prodFresco.nombre} no tiene variantes con stock`);
        return;
      }
      if (conStock.length === 1) {
        agregarAlCarrito(prodFresco, conStock[0]);
        return;
      }
      setModalVariantes(prodFresco);
      return;
    }

    agregarAlCarrito(prodFresco);
  };

  const cambiarCantidad = (item: ItemCarrito, delta: number) => {
    const producto = productos.find((p) => p.id === item.productoId);
    if (!producto) return;

    const stock = item.varianteId
      ? producto.variantes?.find((v) => v.id === item.varianteId)?.stockActual ?? 0
      : stockTotalProducto(producto);

    const nuevaCantidad = item.cantidad + delta;

    if (nuevaCantidad > stock) {
      sonidos.error();
      toast.error('Stock insuficiente', `Solo quedan ${stock}`);
      return;
    }

    if (nuevaCantidad <= 0) {
      setCarrito((prev) => prev.filter((i) => i !== item));
      sonidos.quitar();
      return;
    }

    setCarrito((prev) =>
      prev.map((i) =>
        i === item
          ? {
            ...i,
            cantidad: nuevaCantidad,
            subtotal:
              nuevaCantidad * i.precioUnitario * (1 - (i.descuentoPorcentaje ?? 0) / 100),
          }
          : i
      )
    );
    sonidos.tecla();
  };

  const aplicarDescuentoItem = (productoId: number, pct: number) => {
    setCarrito((prev) =>
      prev.map((item) =>
        item.productoId === productoId
          ? {
            ...item,
            descuentoPorcentaje: pct,
            subtotal: item.cantidad * item.precioUnitario * (1 - pct / 100),
          }
          : item
      )
    );
    setModalDescuentoItem(null);
  };

  const aplicarCantidadModal = () => {
    if (!modalCantidad) return;
    const cant = parseFloat(modalCantidad.cantidad);
    if (isNaN(cant) || cant <= 0) {
      toast.error('Cantidad inválida');
      return;
    }

    const item = carrito.find((i) => i.productoId === modalCantidad.productoId);
    if (!item) return;

    const producto = productos.find((p) => p.id === item.productoId);
    const stock = producto ? stockTotalProducto(producto) : 0;

    if (cant > stock) {
      sonidos.error();
      toast.error('Stock insuficiente', `Solo quedan ${stock}`);
      return;
    }

    setCarrito((prev) =>
      prev.map((i) =>
        i.productoId === modalCantidad.productoId
          ? {
            ...i,
            cantidad: cant,
            subtotal: cant * i.precioUnitario * (1 - (i.descuentoPorcentaje ?? 0) / 100),
          }
          : i
      )
    );
    setModalCantidad(null);
  };

  const eliminarItem = (item: ItemCarrito) => {
    setCarrito((prev) => prev.filter((i) => i !== item));
    sonidos.quitar();
  };

  const limpiarCarrito = () => {
    setCarrito([]);
    setDescuentoGlobal(0);
    setClienteId('');
    setEsFiado(false);
    setEfectivoRecibido('');
    setPagoCombinado({ efectivo: '', tarjeta: '', transferencia: '' });
    setNotas('');
  };

  // ===== ESCÁNER =====
  const procesarCodigoEscaneado = async (codigo: string) => {
    const limpio = codigo.trim();
    if (!limpio) return;

    if (!pdvActivo?.id) return;

    // 🛡️ Buscar con productos frescos de la DB
    try {
      const prodsFrescos = await db.productos
        .where('puntoDeVentaId')
        .equals(pdvActivo.id)
        .toArray();

      let producto = prodsFrescos.find((p) => p.codigoBarras === limpio);
      let variante: VarianteProducto | undefined;

      if (!producto) {
        for (const p of prodsFrescos) {
          const v = p.variantes?.find((v) => v.codigoBarras === limpio);
          if (v) {
            producto = p;
            variante = v;
            break;
          }
        }
      }

      if (producto) {
        // Actualizar en memoria
        setProductos((prev) => prev.map((p) => (p.id === producto!.id ? producto! : p)));

        agregarAlCarrito(producto, variante);
        setUltimoEscaneo(
          `✅ ${producto.nombre}${variante ? ` (${variante.nombre})` : ''} agregado`
        );
        if (prefs.vibracionAlEscanear && navigator.vibrate) navigator.vibrate(50);
      } else {
        sonidos.error();
        setUltimoEscaneo(`❌ Código no registrado: ${limpio}`);
      }
    } catch (e) {
      console.error('[nueva-venta] Error escaneo:', e);
    }
    setTimeout(() => setUltimoEscaneo(null), 3000);
  };

  // ===== PAGO =====
  const iniciarPago = () => {
    setPaso('pago');
    setMetodoActivo('efectivo');
    setEfectivoRecibido('');
    setPagoCombinado({ efectivo: '', tarjeta: '', transferencia: '' });
  };

  const registrarVenta = async () => {
    if (!pdvActivo?.id) {
      toast.error('Sin punto de venta');
      return;
    }
    if (cajaCerrada) {
      toast.error('Caja cerrada', 'Reabre la caja para vender');
      return;
    }
    if (carrito.length === 0) {
      toast.warn('Carrito vacío');
      return;
    }

    // 🛡️ Validación final con stock fresco
    try {
      const productosFrescos = await db.productos
        .where('puntoDeVentaId')
        .equals(pdvActivo.id)
        .toArray();

      const sinStock: string[] = [];
      carrito.forEach((item) => {
        const prod = productosFrescos.find((p) => p.id === item.productoId);
        if (!prod) return;
        if (prod.esCompuesto) return;

        const stockDisponible = item.varianteId
          ? prod.variantes?.find((v) => v.id === item.varianteId)?.stockActual ?? 0
          : stockTotalProducto(prod);

        if (stockDisponible < item.cantidad) {
          sinStock.push(
            `${item.productoNombre} (disponible: ${stockDisponible}, en carrito: ${item.cantidad})`
          );
        }
      });

      if (sinStock.length > 0) {
        toast.error(
          'Stock cambió',
          `Revisa: ${sinStock.slice(0, 3).join(', ')}${sinStock.length > 3 ? '…' : ''}`
        );
        setProductos(
          productosFrescos.filter((p) => stockTotalProducto(p) > 0 || p.esCompuesto)
        );
        return;
      }
    } catch (e) {
      console.error('[nueva-venta] Error validando stock:', e);
      toast.error('Error al validar stock');
      return;
    }

    try {
      const metodosPago: MetodoPago[] = esFiado
        ? [{ tipo: 'fiado', monto: total, moneda: 'CUP', montoEnCUP: total }]
        : metodoActivo === 'combinado'
          ? [
            ...(parseFloat(pagoCombinado.efectivo) > 0
              ? [
                {
                  tipo: 'efectivo' as const,
                  monto: parseFloat(pagoCombinado.efectivo),
                  moneda: 'CUP' as const,
                  montoEnCUP: parseFloat(pagoCombinado.efectivo),
                },
              ]
              : []),
            ...(parseFloat(pagoCombinado.tarjeta) > 0
              ? [
                {
                  tipo: 'tarjeta' as const,
                  monto: parseFloat(pagoCombinado.tarjeta),
                  moneda: 'CUP' as const,
                  montoEnCUP: parseFloat(pagoCombinado.tarjeta),
                },
              ]
              : []),
            ...(parseFloat(pagoCombinado.transferencia) > 0
              ? [
                {
                  tipo: 'transferencia' as const,
                  monto: parseFloat(pagoCombinado.transferencia),
                  moneda: 'CUP' as const,
                  montoEnCUP: parseFloat(pagoCombinado.transferencia),
                },
              ]
              : []),
          ]
          : [
            {
              tipo: metodoActivo,
              monto: metodoActivo === 'efectivo' ? efectivoNum : total,
              moneda: 'CUP' as const,
              montoEnCUP: metodoActivo === 'efectivo' ? efectivoNum : total,
            },
          ];

      const vendedor = await db.usuarios.get(usuarioActual.id!);
      const comision = vendedor?.comisionPorcentaje
        ? total * (vendedor.comisionPorcentaje / 100)
        : 0;

      const venta: Omit<Venta, 'id'> = {
        items: carrito,
        total,
        subtotalSinDescuento: subtotal,
        descuentoGlobalMonto: descuentoGlobal || undefined,
        impuestoPorcentaje: impuestoPct || undefined,
        impuestoMonto: impuesto || undefined,
        totalConImpuesto: impuesto > 0 ? total : undefined,
        fecha: new Date(),
        vendedorId: usuarioActual.id!,
        vendedorNombre: usuarioActual.nombre,
        estado: 'completada',
        metodosPago,
        notas: notas || undefined,
        comisionVendedor: comision,
        esFiado,
        clienteId: clienteSeleccionado?.id,
        clienteNombre: clienteSeleccionado?.nombre,
        vueltoCUP: metodoActivo === 'efectivo' && vuelto > 0 ? vuelto : 0,
        puntoDeVentaId: pdvActivo.id,
        puntoDeVentaNombre: pdvActivo.nombre,
      };

      const ventaId = await db.ventas.add(venta);

      for (const item of carrito) {
        const prod = await db.productos.get(item.productoId);
        if (!prod) continue;

        if (item.varianteId && prod.variantes) {
          const variantesActualizadas = prod.variantes.map((v) =>
            v.id === item.varianteId
              ? { ...v, stockActual: Math.max(0, v.stockActual - item.cantidad) }
              : v
          );
          const stockTotal = variantesActualizadas.reduce((s, v) => s + v.stockActual, 0);
          await db.productos.update(prod.id!, {
            variantes: variantesActualizadas,
            stockActual: stockTotal,
          });
          await db.movimientosInventario.add({
            productoId: prod.id!,
            productoNombre: `${prod.nombre} (${item.varianteNombre})`,
            tipo: 'salida',
            cantidad: item.cantidad,
            motivo: 'Venta',
            fecha: new Date(),
            realizadoPor: usuarioActual.nombre,
            stockAnterior:
              prod.variantes.find((v) => v.id === item.varianteId)?.stockActual ?? 0,
            stockNuevo: Math.max(
              0,
              (prod.variantes.find((v) => v.id === item.varianteId)?.stockActual ?? 0) -
              item.cantidad
            ),
            puntoDeVentaId: pdvActivo.id,
            varianteId: item.varianteId,
            varianteNombre: item.varianteNombre,
          });
        } else if (prod.esCompuesto && prod.componentes) {
          for (const comp of prod.componentes) {
            const compProd = await db.productos.get(comp.productoId);
            if (!compProd) continue;
            const cant = comp.cantidad * item.cantidad;
            const stockNuevo = Math.max(0, compProd.stockActual - cant);
            await db.productos.update(compProd.id!, { stockActual: stockNuevo });
            await db.movimientosInventario.add({
              productoId: compProd.id!,
              productoNombre: compProd.nombre,
              tipo: 'salida',
              cantidad: cant,
              motivo: `Consumido en venta de ${prod.nombre}`,
              fecha: new Date(),
              realizadoPor: usuarioActual.nombre,
              stockAnterior: compProd.stockActual,
              stockNuevo,
              puntoDeVentaId: pdvActivo.id,
            });
          }
        } else {
          await db.productos.update(prod.id!, {
            stockActual: Math.max(0, prod.stockActual - item.cantidad),
          });
          await db.movimientosInventario.add({
            productoId: prod.id!,
            productoNombre: prod.nombre,
            tipo: 'salida',
            cantidad: item.cantidad,
            motivo: 'Venta',
            fecha: new Date(),
            realizadoPor: usuarioActual.nombre,
            stockAnterior: prod.stockActual,
            stockNuevo: Math.max(0, prod.stockActual - item.cantidad),
            puntoDeVentaId: pdvActivo.id,
          });
        }
      }

      if (esFiado && clienteSeleccionado) {
        await db.clientes.update(clienteSeleccionado.id!, {
          saldoPendiente: clienteSeleccionado.saldoPendiente + total,
        });
      }

      await registrarLog('backup_exportado', `Venta #${ventaId} registrada`, {
        usuarioId: usuarioActual.id,
        usuarioNombre: usuarioActual.nombre,
        detalles: `Total: $${total.toFixed(2)}`,
      });

      const ventaGuardada = await db.ventas.get(ventaId);

      sonidos.exito();
      toast.ok(
        'Venta registrada',
        `$${total.toFixed(2)} CUP${vuelto > 0 ? ` · Vuelto: $${vuelto.toFixed(2)}` : ''}`
      );

      // Recargar productos frescos
      const prods = await db.productos
        .where('puntoDeVentaId')
        .equals(pdvActivo.id)
        .toArray();
      setProductos(prods.filter((p) => stockTotalProducto(p) > 0 || p.esCompuesto));

      setUltimaVenta(ventaGuardada ?? null);
      setPaso('confirmacion');

      if (prefs.ticketAutomatico && ventaGuardada) {
        setVentaParaTicket(ventaGuardada);
      }
    } catch (e: any) {
      console.error('[nueva-venta] Error registrando:', e);
      toast.error('Error al registrar venta', e?.message);
    }
  };

  const nuevaVenta = () => {
    limpiarCarrito();
    setPaso('carrito');
    setUltimaVenta(null);
  };

  // ===== RENDER: CARGANDO =====
  if (cargando) {
    return (
      <div className="animate-fade-in">
        <PageHeader title="Nueva Venta" subtitle="Cargando…" />
        <Card className="mt-4">
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 animate-spin rounded-full border-2 border-blue-500/30 border-t-blue-500" />
          </div>
        </Card>
      </div>
    );
  }

  // ===== RENDER: SIN PDV =====
  if (!pdvActivo) {
    return (
      <div className="animate-fade-in">
        <PageHeader title="Nueva Venta" subtitle="Selecciona un punto de venta" />
        <Card className="mt-4">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-xl bg-slate-800 border border-white/10 flex items-center justify-center mb-4">
              <Package className="w-8 h-8 text-slate-500" />
            </div>
            <h3 className="text-base font-semibold text-slate-100">
              {modoTodos ? 'Elige un punto de venta' : 'Sin punto de venta asignado'}
            </h3>
            <p className="text-sm text-slate-400 mt-1 max-w-sm">
              {modoTodos
                ? 'Cambia del modo "Todos" a un PDV específico en el sidebar para vender.'
                : 'Contacta al administrador para que te asigne un punto de venta.'}
            </p>
          </div>
        </Card>
      </div>
    );
  }

  // ===== RENDER: CAJA CERRADA =====
  if (cajaCerrada) {
    const estado = obtenerEstadoCaja(pdvActivo.id!);
    const puedeReabrir = usuarioActual.rol === 'admin' || usuarioActual.rol === 'jefe';

    return (
      <div className="animate-fade-in">
        <PageHeader title="Nueva Venta" subtitle="Caja cerrada" />
        <Card className="mt-4 max-w-lg mx-auto">
          <div className="text-center py-6">
            <div className="w-16 h-16 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">Caja cerrada</h2>
            <p className="text-sm text-slate-400 mt-1 mb-4">
              No puedes vender hasta que se reabra la caja.
            </p>

            {estado && (
              <div className="rounded-lg border border-white/10 bg-slate-800/40 p-3 mb-4 text-left text-xs text-slate-400">
                <p>
                  <strong className="text-slate-200">Cerrada por:</strong> {estado.cerradaPor}
                </p>
                <p>
                  <strong className="text-slate-200">Cuándo:</strong>{' '}
                  {new Date(estado.cerradaEn).toLocaleString('es-ES')}
                </p>
                {estado.motivo && <p className="mt-1">📝 {estado.motivo}</p>}
              </div>
            )}

            {puedeReabrir && (
              <Button
                onClick={() => setModalReapertura(true)}
                leftIcon={<Check className="w-4 h-4" />}
              >
                Reabrir caja
              </Button>
            )}
            {!puedeReabrir && (
              <p className="text-xs text-slate-500">Contacta al jefe o administrador.</p>
            )}
          </div>
        </Card>

        <Modal
          open={modalReapertura}
          onClose={() => setModalReapertura(false)}
          title="Reabrir caja"
          size="sm"
          footer={
            <>
              <Button variant="ghost" onClick={() => setModalReapertura(false)}>
                Cancelar
              </Button>
              <Button
                onClick={async () => {
                  if (!motivoReapertura.trim()) {
                    toast.warn('Motivo requerido');
                    return;
                  }
                  reabrirCaja(pdvActivo.id!, usuarioActual.nombre, motivoReapertura.trim());
                  await registrarLog('gasto_editado', 'Caja reabierta', {
                    usuarioId: usuarioActual.id,
                    usuarioNombre: usuarioActual.nombre,
                    detalles: motivoReapertura.trim(),
                  });
                  setCajaCerrada(false);
                  setModalReapertura(false);
                  setMotivoReapertura('');
                  toast.ok('Caja reabierta');
                }}
                disabled={!motivoReapertura.trim()}
              >
                Reabrir
              </Button>
            </>
          }
        >
          <label className="text-xs text-slate-400 mb-1.5 block">Motivo *</label>
          <textarea
            value={motivoReapertura}
            onChange={(e) => setMotivoReapertura(e.target.value)}
            className="w-full rounded-lg bg-slate-900 border border-white/10 text-sm text-slate-100 px-3 py-2 focus:outline-none focus:border-blue-500"
            rows={3}
            placeholder="Ej: Faltó cobrar una venta…"
          />
        </Modal>
      </div>
    );
  }

  // ===== RENDER: CONFIRMACIÓN =====
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

          <Card className="mt-6 w-full max-w-md">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Total cobrado</span>
                <span className="text-lg font-semibold text-white tabular-nums">
                  {formatCurrencyWithSymbol(ultimaVenta.total)}
                </span>
              </div>
              {(ultimaVenta.vueltoCUP ?? 0) > 0 && (
                <div className="flex items-center justify-between pt-3 border-t border-white/10">
                  <span className="text-sm text-slate-400">Vuelto</span>
                  <span className="text-lg font-semibold text-emerald-400 tabular-nums">
                    {formatCurrencyWithSymbol(ultimaVenta.vueltoCUP!)}
                  </span>
                </div>
              )}
              {ultimaVenta.esFiado && ultimaVenta.clienteNombre && (
                <div className="flex items-center justify-between pt-3 border-t border-white/10">
                  <span className="text-sm text-slate-400">Fiado a</span>
                  <span className="text-sm font-medium text-amber-400">
                    {ultimaVenta.clienteNombre}
                  </span>
                </div>
              )}
            </div>
          </Card>

          <div className="flex items-center gap-3 mt-6">
            {ultimaVenta && (
              <Button
                variant="secondary"
                leftIcon={<Printer className="w-4 h-4" />}
                onClick={() => setVentaParaTicket(ultimaVenta)}
              >
                Imprimir ticket
              </Button>
            )}
            <Button onClick={nuevaVenta} leftIcon={<ShoppingCart className="w-4 h-4" />}>
              Nueva venta
            </Button>
          </div>
        </div>

        {ventaParaTicket && (
          <TicketPreview
            venta={ventaParaTicket}
            nombreNegocio={pdvActivo.nombre}
            direccionNegocio={pdvActivo.direccion}
            telefonoNegocio={pdvActivo.telefono}
            onCerrar={() => setVentaParaTicket(null)}
          />
        )}
      </div>
    );
  }

  // ===== RENDER: PAGO =====
  if (paso === 'pago') {
    return (
      <div className="animate-fade-in">
        <PageHeader
          title="Cobrar venta"
          subtitle={`${carrito.length} producto${carrito.length !== 1 ? 's' : ''} en el carrito`}
          actions={
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<ArrowLeft className="w-4 h-4" />}
              onClick={() => setPaso('carrito')}
            >
              Volver
            </Button>
          }
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
          <div className="space-y-4 min-w-0">
            <Card>
              <h3 className="text-sm font-semibold text-white mb-3">Resumen</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Subtotal</span>
                  <span className="text-slate-100 tabular-nums">{formatCurrency(subtotal)}</span>
                </div>
                {descuentoGlobal > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Descuento</span>
                    <span className="text-red-400 tabular-nums">
                      -{formatCurrency(descuentoGlobal)}
                    </span>
                  </div>
                )}
                {impuesto > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Impuesto ({impuestoPct}%)</span>
                    <span className="text-slate-100 tabular-nums">
                      {formatCurrency(impuesto)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between pt-3 border-t border-white/10">
                  <span className="text-base font-semibold text-white">Total</span>
                  <span className="text-2xl font-semibold text-white tabular-nums">
                    {formatCurrency(total)}
                  </span>
                </div>
              </div>
            </Card>

            <Card>
              <h3 className="text-sm font-semibold text-white mb-3">Método de pago</h3>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'efectivo' as const, label: 'Efectivo', icon: Banknote },
                  { id: 'tarjeta' as const, label: 'Tarjeta', icon: CreditCard },
                  { id: 'transferencia' as const, label: 'Transf.', icon: ArrowLeftRight },
                ].map((m) => {
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
                          : 'bg-slate-900 border-white/10 text-slate-400 hover:text-slate-100'
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
                    : 'bg-slate-900 border-white/10 text-slate-400 hover:text-slate-100'
                )}
              >
                <ArrowLeftRight className="w-4 h-4" />
                Combinar métodos
              </button>
            </Card>

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
                    value={String(clienteId)}
                    onChange={(e) =>
                      setClienteId(e.target.value ? Number(e.target.value) : '')
                    }
                    className={!clienteId ? 'border-amber-500/50' : ''}
                  >
                    <option value="">Selecciona cliente…</option>
                    {clientes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre}
                        {c.saldoPendiente > 0
                          ? ` (Debe ${formatCurrency(c.saldoPendiente)})`
                          : ''}
                      </option>
                    ))}
                  </Select>
                  {!clienteId && (
                    <p className="text-xs text-amber-400 mt-1.5 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      Selecciona un cliente para fiar
                    </p>
                  )}
                </div>
              )}
            </Card>
          </div>

          <div className="min-w-0">
            {metodoActivo === 'efectivo' && (
              <Card>
                <h3 className="text-sm font-semibold text-white mb-3">Pago en efectivo</h3>

                <div className="bg-slate-800/50 rounded-lg p-4 mb-4 text-center">
                  <p className="text-xs text-slate-500 mb-1">Total a pagar</p>
                  <p className="text-3xl font-semibold text-white tabular-nums">
                    {formatCurrency(total)}
                  </p>
                </div>

                <label className="text-xs text-slate-400 mb-1.5 block">
                  Efectivo recibido
                </label>
                <Input
                  type="number"
                  value={efectivoRecibido}
                  onChange={(e) => setEfectivoRecibido(e.target.value)}
                  placeholder="0"
                  className="text-lg text-center font-semibold tabular-nums h-12"
                />

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
                  disabled={!puedeRegistrar}
                  onClick={registrarVenta}
                  leftIcon={<Check className="w-5 h-5" />}
                >
                  Registrar venta
                </Button>
              </Card>
            )}

            {(metodoActivo === 'tarjeta' || metodoActivo === 'transferencia') && (
              <Card>
                <h3 className="text-sm font-semibold text-white mb-3">
                  Pago con {metodoActivo === 'tarjeta' ? 'tarjeta' : 'transferencia'}
                </h3>
                <div className="bg-slate-800/50 rounded-lg p-4 mb-4 text-center">
                  {metodoActivo === 'tarjeta' ? (
                    <CreditCard className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                  ) : (
                    <ArrowLeftRight className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                  )}
                  <p className="text-xs text-slate-500 mb-1">Total a cobrar</p>
                  <p className="text-3xl font-semibold text-white tabular-nums">
                    {formatCurrency(total)}
                  </p>
                </div>
                <p className="text-sm text-slate-400 text-center mb-4">
                  {metodoActivo === 'tarjeta'
                    ? 'Procesa el pago en el POS bancario.'
                    : 'Verifica la transferencia recibida.'}
                </p>
                <Button
                  fullWidth
                  size="lg"
                  disabled={!puedeRegistrar}
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
                  <p className="text-2xl font-semibold text-white tabular-nums">
                    {formatCurrency(total)}
                  </p>
                </div>
                <div className="space-y-3">
                  {(['efectivo', 'tarjeta', 'transferencia'] as const).map((m) => (
                    <div key={m}>
                      <label className="text-xs text-slate-400 mb-1.5 block capitalize">
                        {m}
                      </label>
                      <Input
                        type="number"
                        value={pagoCombinado[m]}
                        onChange={(e) =>
                          setPagoCombinado({ ...pagoCombinado, [m]: e.target.value })
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
                  disabled={!puedeRegistrar}
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

  // ===== RENDER: CARRITO / POS =====
  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Nueva Venta"
        subtitle={`${pdvActivo.icono} ${pdvActivo.nombre.replace(/^[^\s]+\s/, '')} · ${usuarioActual.nombre}`}
        actions={
          carrito.length > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<X className="w-4 h-4" />}
              onClick={limpiarCarrito}
            >
              Limpiar
            </Button>
          ) : undefined
        }
      />

      {ultimoEscaneo && (
        <div
          className={cn(
            'rounded-lg border p-3 text-sm font-medium mb-3 animate-fade-in',
            ultimoEscaneo.startsWith('✅')
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              : 'bg-red-500/10 border-red-500/20 text-red-400'
          )}
        >
          {ultimoEscaneo}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
        <div className="lg:col-span-2 space-y-4 min-w-0">
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <Input
                placeholder="Buscar producto por nombre o código…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                leftIcon={<Search className="w-4 h-4" />}
              />
            </div>
            <Button
              variant="secondary"
              leftIcon={<ScanLine className="w-4 h-4" />}
              onClick={() => setMostrarEscaner(true)}
            >
              Escanear
            </Button>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setCategoriaFiltro('todas')}
              className={cn(
                'h-8 px-3 rounded-lg text-xs font-medium whitespace-nowrap transition-colors duration-150 shrink-0',
                categoriaFiltro === 'todas'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-900 border border-white/10 text-slate-400 hover:text-slate-100'
              )}
            >
              Todas
            </button>
            {categoriasFiltradas.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategoriaFiltro(String(cat.id))}
                className={cn(
                  'h-8 px-3 rounded-lg text-xs font-medium whitespace-nowrap transition-colors duration-150 shrink-0',
                  categoriaFiltro === String(cat.id)
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-900 border border-white/10 text-slate-400 hover:text-slate-100'
                )}
              >
                {cat.nombre}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
            {productosFiltrados.map((producto) => {
              const precio = precioPara(producto);
              const sinStock = stockTotalProducto(producto) <= 0 && !producto.esCompuesto;
              const stockBajo = stockTotalProducto(producto) <= producto.stockMinimo;
              return (
                <button
                  key={producto.id}
                  onClick={() => handleClickProducto(producto)}
                  disabled={sinStock}
                  className={cn(
                    'text-left bg-slate-900 border rounded-xl p-3 transition-colors duration-150',
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
                    <p className="text-base font-semibold text-white tabular-nums">
                      {formatCurrency(precio)}
                    </p>
                    <p className="text-xs text-slate-500 tabular-nums">
                      {producto.tieneVariantes
                        ? `${producto.variantes?.length ?? 0} var.`
                        : `Stock: ${stockTotalProducto(producto)}`}
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
                <p className="text-sm font-medium text-slate-100">
                  No se encontraron productos
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Prueba otro término o cambia de categoría
                </p>
              </div>
            </Card>
          )}
        </div>

        <div className="lg:sticky lg:top-4 lg:self-start min-w-0">
          <Card padding="sm" className="flex flex-col max-h-[calc(100vh-120px)]">
            <div className="flex items-center justify-between p-3 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-slate-400" />
                <span className="text-sm font-semibold text-white">Carrito</span>
                {carrito.length > 0 && <Badge variant="info">{carrito.length}</Badge>}
              </div>
              {carrito.length > 0 && (
                <span className="text-xs text-slate-500 tabular-nums">
                  {carrito.reduce((s, i) => s + i.cantidad, 0)} items
                </span>
              )}
            </div>

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
                    <div
                      key={`${item.productoId}-${item.varianteId ?? 'base'}`}
                      className="p-3 animate-fade-in"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-100 leading-snug truncate">
                            {item.productoNombre}
                          </p>
                          {item.varianteNombre && (
                            <p className="text-xs text-blue-400">👕 {item.varianteNombre}</p>
                          )}
                          <p className="text-xs text-slate-500 tabular-nums">
                            {formatCurrency(item.precioUnitario)} c/u
                          </p>
                        </div>
                        <button
                          onClick={() => eliminarItem(item)}
                          className="text-slate-500 hover:text-red-400 transition-colors shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => cambiarCantidad(item, -1)}
                            className="w-7 h-7 rounded-md bg-slate-800 hover:bg-slate-700 border border-white/10 flex items-center justify-center text-slate-300 transition-colors"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          {item.permiteFracciones ? (
                            <button
                              onClick={() =>
                                setModalCantidad({
                                  productoId: item.productoId,
                                  cantidad: String(item.cantidad),
                                })
                              }
                              className="w-10 text-center text-sm font-medium text-white tabular-nums flex items-center gap-0.5 justify-center"
                            >
                              <Weight className="w-3 h-3 text-slate-500" />
                              {item.cantidad}
                            </button>
                          ) : (
                            <span className="w-8 text-center text-sm font-medium text-white tabular-nums">
                              {item.cantidad}
                            </span>
                          )}
                          <button
                            onClick={() => cambiarCantidad(item, 1)}
                            className="w-7 h-7 rounded-md bg-slate-800 hover:bg-slate-700 border border-white/10 flex items-center justify-center text-slate-300 transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setModalDescuentoItem(item.productoId)}
                            className="text-slate-500 hover:text-emerald-400 transition-colors"
                            title="Descuento"
                          >
                            <Percent className="w-4 h-4" />
                          </button>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-white tabular-nums">
                              {formatCurrency(item.subtotal)}
                            </p>
                            {(item.descuentoPorcentaje ?? 0) > 0 && (
                              <p className="text-xs text-red-400">
                                -{item.descuentoPorcentaje}%
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {carrito.length > 0 && (
              <div className="border-t border-white/10 p-3 shrink-0 space-y-3">
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">
                    Cliente (opcional)
                  </label>
                  <Select
                    value={String(clienteId)}
                    onChange={(e) =>
                      setClienteId(e.target.value ? Number(e.target.value) : '')
                    }
                  >
                    <option value="">Sin cliente</option>
                    {clientes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre}
                        {c.saldoPendiente > 0
                          ? ` (Debe ${formatCurrency(c.saldoPendiente)})`
                          : ''}
                        {(c.preciosEspeciales?.length ?? 0) > 0 ? ' 💎' : ''}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-white/10">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Subtotal</span>
                    <span className="text-slate-100 tabular-nums">
                      {formatCurrency(subtotal)}
                    </span>
                  </div>
                  {descuentoGlobal > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Descuento</span>
                      <span className="text-red-400 tabular-nums">
                        -{formatCurrency(descuentoGlobal)}
                      </span>
                    </div>
                  )}
                  {impuesto > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Impuesto ({impuestoPct}%)</span>
                      <span className="text-slate-100 tabular-nums">
                        {formatCurrency(impuesto)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t border-white/10">
                    <span className="text-sm font-semibold text-white">Total</span>
                    <span className="text-xl font-semibold text-white tabular-nums">
                      {formatCurrency(total)}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setModalDescuentoGlobal(true)}
                  className="w-full text-xs text-slate-400 hover:text-emerald-400 transition-colors text-center py-1"
                >
                  {descuentoGlobal > 0
                    ? `Cambiar descuento (-${formatCurrency(descuentoGlobal)})`
                    : 'Aplicar descuento global'}
                </button>

                <Button
                  fullWidth
                  size="lg"
                  onClick={iniciarPago}
                  leftIcon={<CreditCard className="w-5 h-5" />}
                >
                  Ir a pagar
                </Button>
              </div>
            )}
          </Card>
        </div>
      </div>

      {modalVariantes && (
        <Modal
          open
          onClose={() => setModalVariantes(null)}
          title="Elige una variante"
          size="sm"
        >
          <div className="space-y-2">
            {modalVariantes.variantes?.map((v) => {
              const sinStock = v.stockActual <= 0;
              return (
                <button
                  key={v.id}
                  disabled={sinStock}
                  onClick={() => {
                    if (sinStock) return;
                    agregarAlCarrito(modalVariantes, v);
                    setModalVariantes(null);
                  }}
                  className={cn(
                    'w-full flex items-center justify-between gap-3 p-3 rounded-lg border text-left transition-colors',
                    sinStock
                      ? 'border-white/5 opacity-40 cursor-not-allowed'
                      : 'border-white/10 hover:border-blue-500/40'
                  )}
                >
                  <div>
                    <p className="text-sm font-medium text-slate-100">{v.nombre}</p>
                    {v.codigoBarras && (
                      <p className="text-xs text-slate-500 font-mono">{v.codigoBarras}</p>
                    )}
                  </div>
                  <p
                    className={cn(
                      'text-sm font-semibold',
                      sinStock ? 'text-red-400' : 'text-emerald-400'
                    )}
                  >
                    {sinStock ? 'Agotado' : `${v.stockActual} disp.`}
                  </p>
                </button>
              );
            })}
          </div>
        </Modal>
      )}

      {modalDescuentoItem !== null && (
        <Modal
          open
          onClose={() => setModalDescuentoItem(null)}
          title="Descuento por producto"
          size="sm"
        >
          <div className="grid grid-cols-4 gap-2">
            {[0, 5, 10, 15, 20, 25, 30, 50].map((pct) => (
              <button
                key={pct}
                onClick={() => aplicarDescuentoItem(modalDescuentoItem, pct)}
                className="rounded-lg border border-white/10 bg-slate-800/60 py-3 text-sm font-medium text-slate-100 hover:border-blue-500/40 transition-colors"
              >
                {pct === 0 ? 'Sin desc.' : `${pct}%`}
              </button>
            ))}
          </div>
        </Modal>
      )}

      {modalDescuentoGlobal && (
        <Modal
          open
          onClose={() => setModalDescuentoGlobal(false)}
          title="Descuento sobre el total"
          size="sm"
        >
          <div className="rounded-lg border border-white/10 bg-slate-800/50 p-3 mb-4">
            <p className="text-xs text-slate-400">Subtotal</p>
            <p className="text-xl font-semibold text-white tabular-nums">
              {formatCurrency(subtotal)}
            </p>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[0, 3, 5, 10, 15, 20, 25, 30].map((pct) => (
              <button
                key={pct}
                onClick={() => {
                  setDescuentoGlobal((subtotal * pct) / 100);
                  setModalDescuentoGlobal(false);
                }}
                className="rounded-lg border border-white/10 bg-slate-800/60 py-3 text-sm font-medium text-slate-100 hover:border-blue-500/40 transition-colors"
              >
                {pct === 0 ? 'Sin desc.' : `${pct}%`}
              </button>
            ))}
          </div>
        </Modal>
      )}

      {modalCantidad && (
        <Modal
          open
          onClose={() => setModalCantidad(null)}
          title="Cantidad exacta"
          size="sm"
          footer={
            <>
              <Button variant="ghost" onClick={() => setModalCantidad(null)}>
                Cancelar
              </Button>
              <Button onClick={aplicarCantidadModal}>Aplicar</Button>
            </>
          }
        >
          <Input
            type="number"
            step="0.01"
            value={modalCantidad.cantidad}
            onChange={(e) =>
              setModalCantidad({ ...modalCantidad, cantidad: e.target.value })
            }
            className="text-center text-2xl font-semibold"
            autoFocus
          />
        </Modal>
      )}

      {mostrarEscaner && (
        <EscanerCamara
          onDetectado={(codigo) => {
            setMostrarEscaner(false);
            procesarCodigoEscaneado(codigo);
          }}
          onCancelar={() => setMostrarEscaner(false)}
        />
      )}

      {ventaParaTicket && (
        <TicketPreview
          venta={ventaParaTicket}
          nombreNegocio={pdvActivo.nombre}
          direccionNegocio={pdvActivo.direccion}
          telefonoNegocio={pdvActivo.telefono}
          onCerrar={() => setVentaParaTicket(null)}
        />
      )}
    </div>
  );
}