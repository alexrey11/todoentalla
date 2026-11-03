// ============================================================
// Merge inteligente de backups + ajuste de stock por deltas
// ============================================================

import { db } from '../db';

export interface MergeReport {
    nuevos: Record<string, number>;
    omitidos: Record<string, number>;
    totalNuevos: number;
    totalOmitidos: number;
    stockAjustado: number;
    stockSinMatch: string[];
    pdvRemapeados: number;
    errores: string[];
}

const norm = (s: any) => String(s ?? '').toLowerCase().trim();

// ------------------------------------------------------------
// Firmas para detectar duplicados entre dispositivos
// ------------------------------------------------------------
function firma(tabla: string, r: any): string {
    switch (tabla) {
        case 'ventas':
            return [
                r.fecha,
                r.total,
                norm(r.vendedorNombre),
                norm(r.clienteNombre),
                norm(r.puntoDeVentaNombre),
                r.estado ?? '',
                r.items?.length ?? 0,
            ].join('|');
        case 'productos':
            return `${norm(r.nombre)}|${r.puntoDeVentaId ?? ''}|${norm(r.codigoBarras)}`;
        case 'clientes':
            return `${norm(r.nombre)}|${norm(r.telefono)}`;
        case 'categorias':
            return `${norm(r.nombre)}|${r.puntoDeVentaId ?? ''}`;
        case 'puntosDeVenta':
            return norm(r.nombre);
        case 'usuarios':
            return norm(r.nombre);
        case 'proveedores':
            return norm(r.nombre);
        case 'compras':
            return [
                r.fecha,
                norm(r.proveedorNombre),
                r.total,
                norm(r.puntoDeVentaNombre),
            ].join('|');
        case 'gastos':
            return `${r.fecha}|${r.monto}|${norm(r.categoria)}|${norm(r.descripcion)}`;
        case 'tasasCambio':
            return norm(r.moneda).toUpperCase();
        case 'movimientosInventario':
            return `${r.fecha}|${norm(r.productoNombre)}|${r.tipo}|${r.cantidad}|${r.stockAnterior}|${r.stockNuevo}`;
        case 'cierres':
            return `${r.fecha}|${norm(r.puntoDeVentaNombre)}|${r.totalVentas}|${r.cantidadVentas}`;
        case 'devoluciones':
            return `${r.fecha}|${r.ventaId}|${norm(r.productoNombre)}|${r.cantidad}`;
        case 'cotizaciones':
            return norm(r.numero);
        case 'pagosFiados':
            return `${r.fecha}|${norm(r.clienteNombre)}|${r.monto}|${r.metodoPago}`;
        default:
            return JSON.stringify(r);
    }
}

// ------------------------------------------------------------
// Remapeo de PDV (id del dispositivo origen → id local por nombre)
// ------------------------------------------------------------
function construirRemapPDV(
    pdvEntrantes: any[] | undefined,
    pdvLocales: any[]
): { remap: (id: number | undefined) => number | undefined; cuenta: number } {
    const mapa = new Map<number, number>();
    let cuenta = 0;

    if (Array.isArray(pdvEntrantes)) {
        for (const p of pdvEntrantes) {
            if (p?.id == null) continue;
            const local = pdvLocales.find(
                l => norm(l.nombre) === norm(p.nombre)
            );
            if (local?.id != null) {
                mapa.set(p.id, local.id);
                if (local.id !== p.id) cuenta++;
            }
        }
    }

    return {
        remap: (id) => (id == null ? id : (mapa.get(id) ?? id)),
        cuenta,
    };
}

// ------------------------------------------------------------
// Merge genérico de una tabla
// ------------------------------------------------------------
async function mergeTabla(
    nombre: string,
    tabla: any,
    entrantes: any[] | undefined,
    report: MergeReport,
    transform: (r: any) => any = (r) => r
): Promise<any[]> {
    if (!Array.isArray(entrantes) || entrantes.length === 0) return [];

    try {
        const existentes = await tabla.toArray();
        const firmas = new Set<string>(existentes.map((r: any) => firma(nombre, r)));

        const aInsertar: any[] = [];
        const originalesInsertados: any[] = [];

        for (const raw of entrantes) {
            const r = transform(raw);
            const f = firma(nombre, r);
            if (firmas.has(f)) {
                report.omitidos[nombre] = (report.omitidos[nombre] ?? 0) + 1;
                report.totalOmitidos++;
                continue;
            }
            const { id: _ignored, ...rest } = r;
            aInsertar.push(rest);
            originalesInsertados.push(r);
            firmas.add(f);
        }

        if (aInsertar.length > 0) {
            await tabla.bulkAdd(aInsertar);
            report.nuevos[nombre] = aInsertar.length;
            report.totalNuevos += aInsertar.length;
        }
        return originalesInsertados;
    } catch (e: any) {
        report.errores.push(`${nombre}: ${e?.message ?? 'error desconocido'}`);
        return [];
    }
}

// ------------------------------------------------------------
// Extracción de items para deltas de stock
// ------------------------------------------------------------

interface ItemDelta {
    nombre: string;
    cantidad: number;
    variante?: string;
}

function extraerItemsVenta(venta: any): ItemDelta[] {
    // Venta cancelada o error → no afectó stock (o se revirtió)
    if (venta.estado && venta.estado !== 'completada') return [];

    const out: ItemDelta[] = [];
    if (Array.isArray(venta.items) && venta.items.length > 0) {
        for (const it of venta.items) {
            const nombre = it.productoNombre ?? it.nombre;
            const cant = Number(it.cantidad ?? 0);
            if (nombre && cant) {
                out.push({
                    nombre,
                    cantidad: cant,
                    variante: it.varianteNombre ?? undefined,
                });
            }
        }
    } else if (venta.productoNombre && venta.cantidad) {
        out.push({
            nombre: venta.productoNombre,
            cantidad: Number(venta.cantidad),
        });
    }
    return out;
}

function extraerItemsCompra(compra: any): ItemDelta[] {
    const out: ItemDelta[] = [];
    if (Array.isArray(compra.items)) {
        for (const it of compra.items) {
            const nombre = it.productoNombre ?? it.nombre;
            const cant = Number(it.cantidad ?? 0);
            if (nombre && cant) out.push({ nombre, cantidad: cant });
        }
    }
    return out;
}

function extraerItemsDevolucion(dev: any): ItemDelta[] {
    if (dev.productoNombre && dev.cantidad) {
        return [{ nombre: dev.productoNombre, cantidad: Number(dev.cantidad) }];
    }
    return [];
}

// ------------------------------------------------------------
// Aplicar deltas al stock local
// ------------------------------------------------------------

interface DeltaStock {
    nombreProducto: string;
    pdvId?: number;
    varianteNombre?: string;
    delta: number;
}

function construirDeltas(
    ventasNuevas: any[],
    comprasNuevas: any[],
    devolucionesNuevas: any[]
): DeltaStock[] {
    const mapa = new Map<string, DeltaStock>();

    const key = (n: string, pdv?: number, v?: string) =>
        `${norm(n)}|${pdv ?? 0}|${norm(v)}`;

    const add = (
        nombreProducto: string,
        pdvId: number | undefined,
        variante: string | undefined,
        delta: number
    ) => {
        if (!nombreProducto || delta === 0) return;
        const k = key(nombreProducto, pdvId, variante);
        const prev = mapa.get(k);
        if (prev) prev.delta += delta;
        else
            mapa.set(k, {
                nombreProducto,
                pdvId,
                varianteNombre: variante,
                delta,
            });
    };

    // Ventas → restan
    for (const v of ventasNuevas) {
        const pdv = v.puntoDeVentaId;
        for (const it of extraerItemsVenta(v)) {
            add(it.nombre, pdv, it.variante, -it.cantidad);
        }
    }

    // Compras → suman
    for (const c of comprasNuevas) {
        const pdv = c.puntoDeVentaId;
        for (const it of extraerItemsCompra(c)) {
            add(it.nombre, pdv, undefined, +it.cantidad);
        }
    }

    // Devoluciones → suman de vuelta
    for (const d of devolucionesNuevas) {
        const pdv = d.puntoDeVentaId;
        for (const it of extraerItemsDevolucion(d)) {
            add(it.nombre, pdv, undefined, +it.cantidad);
        }
    }

    return Array.from(mapa.values());
}

async function aplicarDeltasStock(deltas: DeltaStock[], report: MergeReport) {
    if (deltas.length === 0) return;

    const productos = await db.productos.toArray();

    // Índices: por (nombre+pdv) y por nombre solo
    const porNombrePdv = new Map<string, any>();
    const porNombre = new Map<string, any[]>();
    for (const p of productos) {
        const n = norm(p.nombre);
        porNombrePdv.set(`${n}|${p.puntoDeVentaId ?? 0}`, p);
        if (!porNombre.has(n)) porNombre.set(n, []);
        porNombre.get(n)!.push(p);
    }

    const modificados = new Map<number, any>();

    for (const d of deltas) {
        const n = norm(d.nombreProducto);

        // Match 1: nombre + pdv
        let prod =
            (d.pdvId != null && porNombrePdv.get(`${n}|${d.pdvId}`)) || undefined;

        // Match 2: nombre único (si solo hay uno)
        if (!prod) {
            const cands = porNombre.get(n);
            if (cands && cands.length === 1) prod = cands[0];
        }

        if (!prod) {
            if (!report.stockSinMatch.includes(d.nombreProducto)) {
                report.stockSinMatch.push(d.nombreProducto);
            }
            continue;
        }

        // Ajuste en variante o stock directo
        if (prod.tieneVariantes && Array.isArray(prod.variantes) && d.varianteNombre) {
            const vn = norm(d.varianteNombre);
            const vari = prod.variantes.find(
                (v: any) => norm(v.nombre) === vn
            );
            if (vari) {
                vari.stockActual = Math.max(0, Number(vari.stockActual ?? 0) + d.delta);
            }
        } else {
            prod.stockActual = Math.max(0, Number(prod.stockActual ?? 0) + d.delta);
        }

        modificados.set(prod.id, prod);
    }

    for (const p of modificados.values()) {
        await db.productos.put(p);
    }

    report.stockAjustado = modificados.size;
}

// ------------------------------------------------------------
// FUNCIÓN PRINCIPAL
// ------------------------------------------------------------

export async function mergeBackup(datos: any): Promise<MergeReport> {
    const report: MergeReport = {
        nuevos: {},
        omitidos: {},
        totalNuevos: 0,
        totalOmitidos: 0,
        stockAjustado: 0,
        stockSinMatch: [],
        pdvRemapeados: 0,
        errores: [],
    };

    // 1) Puntos de venta primero (base para remapeo)
    await mergeTabla('puntosDeVenta', db.puntosDeVenta, datos.puntosDeVenta, report);

    const pdvLocales = await db.puntosDeVenta.toArray();
    const { remap: remapPDV, cuenta } = construirRemapPDV(datos.puntosDeVenta, pdvLocales);
    report.pdvRemapeados = cuenta;

    // Transformadores que remapean PDV
    const txPDV = (r: any) => ({ ...r, puntoDeVentaId: remapPDV(r.puntoDeVentaId) });
    const txPDVRef = (r: any) => ({
        ...r,
        puntoDeVentaId: remapPDV(r.puntoDeVentaId),
        pdvRelacionadoId: remapPDV(r.pdvRelacionadoId),
    });
    const txUsuario = (r: any) => ({
        ...r,
        puntosDeVentaIds: Array.isArray(r.puntosDeVentaIds)
            ? r.puntosDeVentaIds.map((x: number) => remapPDV(x) ?? x)
            : [],
    });

    // 2) Dependencias sin efecto en stock
    await mergeTabla('categorias', db.categorias, datos.categorias, report, txPDV);
    await mergeTabla('clientes', db.clientes, datos.clientes, report);
    await mergeTabla('usuarios', db.usuarios, datos.usuarios, report, txUsuario);
    await mergeTabla('proveedores', db.proveedores, datos.proveedores, report);
    await mergeTabla('tasasCambio', db.tasasCambio, datos.tasasCambio, report);

    // 3) Productos (los ya existentes conservan su stock local)
    await mergeTabla('productos', db.productos, datos.productos, report, txPDV);

    // 4) Movimientos que afectan stock
    const ventasNuevas = await mergeTabla('ventas', db.ventas, datos.ventas, report, txPDV);
    const comprasNuevas = await mergeTabla('compras', db.compras, datos.compras, report, txPDV);
    const devolucionesNuevas = await mergeTabla(
        'devoluciones',
        db.devoluciones,
        datos.devoluciones,
        report,
        txPDV
    );

    // 5) Aplicar deltas al stock
    const deltas = construirDeltas(ventasNuevas, comprasNuevas, devolucionesNuevas);
    await aplicarDeltasStock(deltas, report);

    // 6) Resto (registro, sin efecto en stock)
    await mergeTabla('gastos', db.gastos, datos.gastos, report, txPDV);
    await mergeTabla(
        'movimientosInventario',
        db.movimientosInventario,
        datos.movimientosInventario,
        report,
        txPDVRef
    );
    await mergeTabla('cierres', db.cierres, datos.cierres, report, txPDV);
    await mergeTabla('cotizaciones', db.cotizaciones, datos.cotizaciones, report, txPDV);
    await mergeTabla('pagosFiados', db.pagosFiados, datos.pagosFiados, report, txPDV);

    return report;
}