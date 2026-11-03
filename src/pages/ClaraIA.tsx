import { useState, useEffect, useRef } from 'react';
import { db, stockTotalProducto } from '../db';
import type { Usuario, Producto } from '../db';
import { enviarAlCarrito, type ItemParaCarrito } from '../utils/carritoBus';
import { sonidos } from '../utils/sonidos';
import { voz, soportaVoz, soportaMicrofono, escuchar } from '../utils/voz';

// ─────────────────────────────────────────────────────────────
//  CuentaClara IA · "Clara"
//  Copiloto con personalidad, memoria persistente, voz,
//  recordatorios con notificación, y capacidad de EJECUTAR
//  acciones: crear productos, gastos, clientes, cobrar fiados,
//  cambiar precios y ajustar stock. Todo local.
// ─────────────────────────────────────────────────────────────

interface Props {
    usuarioActual: Usuario;
    abierto: boolean;
    onCerrar: () => void;
}

interface Msg {
    id: number;
    texto: string;
    de: 'bot' | 'me';
    hora: string;
}

type Periodo = 'hoy' | 'ayer' | 'semana' | 'mes';
type Tema =
    | 'resumen'
    | 'stock'
    | 'estrella'
    | 'clientes'
    | 'gastos'
    | 'consejo'
    | 'cuadre'
    | 'mayoristas'
    | 'ganancia'
    | 'producto'
    | 'notas'
    | 'otro';

interface Respuesta {
    texto: string;
    tema: Tema;
    periodo?: Periodo;
}

// ── Memoria persistente ───────────────────────────────────────

interface NotaMemoria {
    id: number;
    texto: string;
    fecha: number;
}

interface Recordatorio {
    id: number;
    texto: string;
    dispararEn: number;
    creadoEn: number;
    disparado: boolean;
}

interface MemoriaIA {
    nombre?: string;
    conocidos?: boolean;
    visitas: number;
    ultimaVisita?: number;
    ultimoTema: Tema;
    ultimoPeriodo: Periodo;
    ultimoProducto?: string;
    ultimoConsejo?: number;
    notas: NotaMemoria[];
    frecuencia: Record<string, number>;
    consultasProductos: Record<string, number>;
    clientesMencionados: Record<string, number>;
    chistesContados: number[];
    frasesFavoritas: string[];
    ultimaPregunta?: string;
    totalCharlas: number;
    recordatorios: Recordatorio[];
    accionesEjecutadas: number;
}

const MEMORIA_KEY = 'cc_ia_memoria_v1';

const MEMORIA_INICIAL: MemoriaIA = {
    visitas: 0,
    ultimoTema: 'otro',
    ultimoPeriodo: 'hoy',
    notas: [],
    frecuencia: {},
    consultasProductos: {},
    clientesMencionados: {},
    chistesContados: [],
    frasesFavoritas: [],
    totalCharlas: 0,
    recordatorios: [],
    accionesEjecutadas: 0,
};

function cargarMemoria(): MemoriaIA {
    const base: MemoriaIA = {
        ...MEMORIA_INICIAL,
        notas: [],
        frecuencia: {},
        consultasProductos: {},
        clientesMencionados: {},
        chistesContados: [],
        frasesFavoritas: [],
        recordatorios: [],
        accionesEjecutadas: 0,
    };
    try {
        const raw = localStorage.getItem(MEMORIA_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            return {
                ...base,
                ...parsed,
                notas: parsed.notas || [],
                frecuencia: parsed.frecuencia || {},
                consultasProductos: parsed.consultasProductos || {},
                clientesMencionados: parsed.clientesMencionados || {},
                chistesContados: parsed.chistesContados || [],
                frasesFavoritas: parsed.frasesFavoritas || [],
                recordatorios: parsed.recordatorios || [],
                accionesEjecutadas: parsed.accionesEjecutadas ?? 0,
            };
        }
        const legacy = Number(localStorage.getItem('cc_ia_visitas') || '0');
        if (legacy > 0) base.visitas = legacy;
        return base;
    } catch {
        return base;
    }
}

function guardarMemoria(m: MemoriaIA) {
    try {
        localStorage.setItem(MEMORIA_KEY, JSON.stringify(m));
    } catch {
        /* sin espacio */
    }
}

function haceCuanto(t: number): string {
    const dias = Math.floor((Date.now() - t) / 86400000);
    if (dias <= 0) return 'hoy más temprano';
    if (dias === 1) return 'ayer';
    if (dias < 7) return `hace ${dias} días`;
    return `el ${new Date(t).toLocaleDateString('es', { day: 'numeric', month: 'short' })}`;
}

const TEMA_FAVORITO: Partial<Record<Tema, string>> = {
    resumen: 'el resumen del día',
    cuadre: 'el cuadre de caja',
    stock: 'el inventario',
    estrella: 'tus productos estrella',
    clientes: 'la libreta de fiados',
    gastos: 'los gastos',
    mayoristas: 'los mayoristas',
    ganancia: 'la ganancia',
    producto: 'consultar productos',
    consejo: 'los consejos',
    notas: 'sus notas y recuerdos',
};

// ── Utilidades de lenguaje ─────────────────────────────────────

const alAzar = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

function normalizar(s: string): string {
    return s
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[¿?¡!.,;:"'()«»]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function levenshtein(a: string, b: string): number {
    if (a === b) return 0;
    if (Math.abs(a.length - b.length) > 2) return 3;
    const m = a.length;
    const n = b.length;
    let prev = Array.from({ length: n + 1 }, (_, j) => j);
    for (let i = 1; i <= m; i++) {
        const cur = [i];
        for (let j = 1; j <= n; j++) {
            cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
        }
        prev = cur;
    }
    return prev[n];
}

function incluyeAprox(texto: string, palabra: string): boolean {
    if (palabra.length >= 5 && texto.includes(palabra)) return true;
    const maxErr = palabra.length >= 8 ? 2 : 1;
    return texto.split(' ').some(w => {
        if (w === palabra) return true;
        if (Math.abs(w.length - palabra.length) > maxErr) return false;
        return levenshtein(w, palabra) <= maxErr;
    });
}

// ── Parseo de recordatorios con hora natural ─────────────────

interface ParseoRecordatorio {
    texto: string;
    cuando: number;
}

function parsearRecordatorio(original: string): ParseoRecordatorio | null {
    const q = normalizar(original);

    const mMin = q.match(/en\s+(\d+)\s*(minuto|min)/);
    if (mMin) {
        const cuando = Date.now() + Number(mMin[1]) * 60_000;
        const limpio = original
            .replace(/en\s+\d+\s*(minuto|min)s?/i, '')
            .replace(/(recu[eé]rdame|av[ií]same|recuerda)\s*(que\s+)?/i, '')
            .replace(/\bque\b/gi, '')
            .trim();
        return { texto: limpio || 'Recordatorio', cuando };
    }

    const mHor = q.match(/en\s+(\d+)\s*(hora|h\b)/);
    if (mHor) {
        const cuando = Date.now() + Number(mHor[1]) * 3_600_000;
        const limpio = original
            .replace(/en\s+\d+\s*(hora|h)s?/i, '')
            .replace(/(recu[eé]rdame|av[ií]same|recuerda)\s*(que\s+)?/i, '')
            .replace(/\bque\b/gi, '')
            .trim();
        return { texto: limpio || 'Recordatorio', cuando };
    }

    const mHora = q.match(/a\s+las?\s+(\d{1,2})(?::(\d{2}))?\s*(de\s+la\s+(mañana|tarde|noche)|am|pm|hrs?)?/);
    if (mHora) {
        let h = Number(mHora[1]);
        const min = Number(mHora[2] ?? 0);
        const sufijo = mHora[3] ?? '';
        const esPM = /tarde|noche|pm/i.test(sufijo);
        const esAM = /mañana|am/i.test(sufijo);

        if (h < 0 || h > 23 || min < 0 || min > 59) return null;
        if (esPM && h < 12) h += 12;
        if (esAM && h === 12) h = 0;

        const ahora = new Date();
        const objetivo = new Date();
        objetivo.setHours(h, min, 0, 0);

        const diceMañana = /mañana/.test(q) && !/de la mañana/.test(q);
        const dicePasado = /pasado\s+mañana/.test(q);

        if (dicePasado) {
            objetivo.setDate(objetivo.getDate() + 2);
        } else if (diceMañana) {
            objetivo.setDate(objetivo.getDate() + 1);
        } else if (objetivo.getTime() <= ahora.getTime()) {
            objetivo.setDate(objetivo.getDate() + 1);
        }

        const limpio = original
            .replace(/a\s+las?\s+\d{1,2}(:\d{2})?\s*(de\s+la\s+(mañana|tarde|noche)|am|pm|hrs?)?/i, '')
            .replace(/\b(mañana|pasado\s+mañana|hoy)\b/gi, '')
            .replace(/(recu[eé]rdame|av[ií]same|recuerda)\s*(que\s+)?/i, '')
            .replace(/\bque\b/gi, '')
            .replace(/\s+/g, ' ')
            .trim();

        return { texto: limpio || 'Recordatorio', cuando: objetivo.getTime() };
    }

    return null;
}

function formatearCuando(ts: number): string {
    const d = new Date(ts);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const mañana = new Date(hoy);
    mañana.setDate(mañana.getDate() + 1);
    const pasado = new Date(hoy);
    pasado.setDate(pasado.getDate() + 2);
    const d0 = new Date(d);
    d0.setHours(0, 0, 0, 0);

    const hora = d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
    if (d0.getTime() === hoy.getTime()) return `hoy a las ${hora}`;
    if (d0.getTime() === mañana.getTime()) return `mañana a las ${hora}`;
    if (d0.getTime() === pasado.getTime()) return `pasado mañana a las ${hora}`;
    return d.toLocaleString('es', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function pedirPermisoNotificaciones() {
    try {
        if (typeof window === 'undefined') return;
        if (!('Notification' in window)) return;
        if (Notification.permission === 'default') {
            Notification.requestPermission().catch(() => { /* noop */ });
        }
    } catch { /* noop */ }
}

function lanzarNotificacion(titulo: string, cuerpo: string) {
    try {
        if (typeof window === 'undefined') return;
        if (!('Notification' in window)) return;
        if (Notification.permission !== 'granted') return;
        new Notification(titulo, {
            body: cuerpo,
            icon: '/icon-192.png',
            badge: '/icon-192.png',
            tag: 'cc-recordatorio',
        });
    } catch { /* noop */ }
}

// ═══════════════════════════════════════════════════════════════
//  🎯 SISTEMA DE ACCIONES
// ═══════════════════════════════════════════════════════════════

type TipoAccion =
    | 'crear_producto'
    | 'crear_gasto'
    | 'crear_cliente'
    | 'pago_fiado'
    | 'cambiar_precio'
    | 'ajustar_stock';

interface AccionPendiente {
    tipo: TipoAccion;
    datos: any;
    resumen: string;
    advertencias?: string[];
}

interface ResultadoAccion {
    ok: boolean;
    mensaje: string;
    tema: Tema;
}

async function ejecutarAccion(acc: AccionPendiente): Promise<ResultadoAccion> {
    try {
        switch (acc.tipo) {
            case 'crear_producto': {
                const d = acc.datos;
                const pds = await db.puntosDeVenta.toArray();
                const pdvId = pds[0]?.id;
                if (!pdvId) {
                    return { ok: false, mensaje: '⚠️ No hay ningún Punto de Venta creado. Ve a **Puntos de Venta** y crea uno primero.', tema: 'otro' };
                }
                let catId = d.categoriaId;
                if (!catId) {
                    const cats = await db.categorias.where('puntoDeVentaId').equals(pdvId).toArray();
                    if (cats.length === 0) {
                        catId = await db.categorias.add({
                            puntoDeVentaId: pdvId,
                            nombre: 'General',
                            descripcion: 'Categoría creada automáticamente',
                            creadoEn: new Date(),
                        });
                    } else {
                        catId = cats[0].id!;
                    }
                }
                await db.productos.add({
                    puntoDeVentaId: pdvId,
                    categoriaId: catId,
                    nombre: d.nombre,
                    precioCompra: d.precioCompra ?? 0,
                    precioVenta: d.precioVenta,
                    stockActual: d.stock ?? 0,
                    stockMinimo: d.stockMinimo ?? 0,
                    fechaCreacion: new Date(),
                    unidadMedida: d.unidad ?? 'unidades',
                });
                return {
                    ok: true,
                    mensaje: `✅ **Producto creado**\n\n📦 ${d.nombre}\n💵 Venta: ${fmtCUP(d.precioVenta)}${d.precioCompra ? `\n📥 Compra: ${fmtCUP(d.precioCompra)}` : ''}${d.stock ? `\n📊 Stock: ${d.stock}` : ''}\n\nDime «precio del ${d.nombre}» cuando quieras y te lo reviso. 😊`,
                    tema: 'producto',
                };
            }

            case 'crear_gasto': {
                const d = acc.datos;
                const pds = await db.puntosDeVenta.toArray();
                const pdv = pds[0];
                if (!pdv?.id) {
                    return { ok: false, mensaje: '⚠️ Necesitas un Punto de Venta para registrar gastos.', tema: 'otro' };
                }
                await db.gastos.add({
                    fecha: new Date(),
                    categoria: d.categoria,
                    monto: d.monto,
                    descripcion: d.descripcion,
                    puntoDeVentaId: pdv.id,
                    puntoDeVentaNombre: pdv.nombre,
                    registradoPor: 'Clara IA',
                    registradoPorId: 0,
                    metodoPago: 'efectivo',
                });
                return {
                    ok: true,
                    mensaje: `✅ **Gasto registrado**\n\n💸 ${fmtCUP(d.monto)}\n📂 ${capital(d.categoria)}\n📝 ${d.descripcion}\n\nTe lo sumé al mes en curso. Cuando quieras, dime «gastos» y te lo desgloso.`,
                    tema: 'gastos',
                };
            }

            case 'crear_cliente': {
                const d = acc.datos;
                await db.clientes.add({
                    nombre: d.nombre,
                    telefono: d.telefono ?? '',
                    direccion: d.direccion ?? '',
                    creadoEn: new Date(),
                    saldoPendiente: 0,
                });
                return {
                    ok: true,
                    mensaje: `✅ **Cliente creado**\n\n👤 ${d.nombre}${d.telefono ? `\n📞 ${d.telefono}` : ''}${d.direccion ? `\n📍 ${d.direccion}` : ''}\n\nYa puedes hacerle ventas fiadas y le llevaré la cuenta.`,
                    tema: 'clientes',
                };
            }

            case 'pago_fiado': {
                const d = acc.datos;
                const clientes = await db.clientes.toArray();
                const cliente = clientes.find(c =>
                    normalizar(c.nombre).includes(normalizar(d.nombreCliente))
                );
                if (!cliente) {
                    return { ok: false, mensaje: `No encontré a **${d.nombreCliente}** en tu lista de clientes. Dime «¿quién me debe?» para ver los que tienes.`, tema: 'clientes' };
                }
                if (cliente.saldoPendiente <= 0) {
                    return { ok: true, mensaje: `**${cliente.nombre}** no tiene deuda pendiente, ya está al día ✅`, tema: 'clientes' };
                }
                const monto = Math.min(d.monto, cliente.saldoPendiente);
                const nuevoSaldo = Math.max(0, cliente.saldoPendiente - monto);
                await db.clientes.update(cliente.id!, { saldoPendiente: nuevoSaldo });

                const pdv = (await db.puntosDeVenta.toArray())[0];
                if (pdv?.id) {
                    await db.pagosFiados.add({
                        clienteId: cliente.id!,
                        clienteNombre: cliente.nombre,
                        monto,
                        moneda: 'CUP',
                        montoEnCUP: monto,
                        metodoPago: 'efectivo',
                        fecha: new Date(),
                        realizadoPor: 'Clara IA',
                        realizadoPorId: 0,
                        puntoDeVentaId: pdv.id,
                        notas: 'Registrado desde Clara',
                    });
                }
                const sobra = d.monto > cliente.saldoPendiente
                    ? `\n\n💡 Ojo: pagó ${fmtCUP(d.monto)}, pero solo debía ${fmtCUP(cliente.saldoPendiente)}. Le sobraron ${fmtCUP(d.monto - cliente.saldoPendiente)}.`
                    : '';
                return {
                    ok: true,
                    mensaje: nuevoSaldo === 0
                        ? `✅ **${cliente.nombre}** quedó **al día** 🎉\n\nPago: ${fmtCUP(monto)}\nSaldo restante: **0 CUP**${sobra}`
                        : `✅ **Pago registrado**\n\n👤 ${cliente.nombre}\n💰 Pagó: ${fmtCUP(monto)}\n📉 Le debe aún: **${fmtCUP(nuevoSaldo)}**${sobra}`,
                    tema: 'clientes',
                };
            }

            case 'cambiar_precio': {
                const d = acc.datos;
                const productos = await db.productos.toArray();
                const prod = productos.find(p => normalizar(p.nombre) === normalizar(d.nombreProducto))
                    ?? productos.find(p => normalizar(p.nombre).includes(normalizar(d.nombreProducto)));
                if (!prod) {
                    return { ok: false, mensaje: `No encontré **${d.nombreProducto}** en tu inventario 🤔`, tema: 'producto' };
                }
                const antes = prod.precioVenta;
                await db.productos.update(prod.id!, { precioVenta: d.nuevoPrecio });
                const pct = antes > 0 ? Math.round(((d.nuevoPrecio - antes) / antes) * 100) : 0;
                const flecha = pct > 0 ? '📈' : pct < 0 ? '📉' : '➡️';
                return {
                    ok: true,
                    mensaje: `✅ **Precio actualizado**\n\n📦 ${prod.nombre}\n${flecha} ${fmtCUP(antes)} → **${fmtCUP(d.nuevoPrecio)}** (${pct >= 0 ? '+' : ''}${pct}%)`,
                    tema: 'producto',
                };
            }

            case 'ajustar_stock': {
                const d = acc.datos;
                const productos = await db.productos.toArray();
                const prod = productos.find(p => normalizar(p.nombre) === normalizar(d.nombreProducto))
                    ?? productos.find(p => normalizar(p.nombre).includes(normalizar(d.nombreProducto)));
                if (!prod) {
                    return { ok: false, mensaje: `No encontré **${d.nombreProducto}** en tu inventario 🤔`, tema: 'producto' };
                }
                const antes = prod.stockActual;
                const nuevo = Math.max(0, antes + d.cantidad);
                await db.productos.update(prod.id!, { stockActual: nuevo });

                const pdv = (await db.puntosDeVenta.toArray())[0];
                if (pdv?.id) {
                    await db.movimientosInventario.add({
                        productoId: prod.id!,
                        productoNombre: prod.nombre,
                        tipo: d.cantidad > 0 ? 'entrada' : 'salida',
                        cantidad: Math.abs(d.cantidad),
                        motivo: 'Ajuste desde Clara',
                        fecha: new Date(),
                        realizadoPor: 'Clara IA',
                        stockAnterior: antes,
                        stockNuevo: nuevo,
                        puntoDeVentaId: pdv.id,
                    });
                }
                const icono = d.cantidad > 0 ? '📥' : '📤';
                return {
                    ok: true,
                    mensaje: `✅ **Stock ajustado**\n\n📦 ${prod.nombre}\n${icono} ${antes} → **${nuevo}** (${d.cantidad > 0 ? '+' : ''}${d.cantidad})`,
                    tema: 'stock',
                };
            }
        }

        return { ok: false, mensaje: 'Acción no reconocida.', tema: 'otro' };
    } catch (e: any) {
        return {
            ok: false,
            mensaje: `Ups, algo falló al ejecutarlo: ${e?.message ?? 'error desconocido'}. Nada se guardó. 😅`,
            tema: 'otro',
        };
    }
}

// ── Parsers de acciones ────────────────────────────────────────

function parsearProducto(original: string): AccionPendiente | null {
    const m = original.match(
        /(?:crea|crear|a[ñn]ade|a[ñn]adir|agrega|agregar|nuevo|nueva)\s+(?:un\s+|una\s+)?producto\s+(?:llamado\s+|que\s+se\s+llame\s+)?["']?([^"'\n,]+?)["']?(?:\s+a\s+|\s+con\s+precio\s+(?:de\s+)?|\s+por\s+)([\d.,]+)/i
    );
    if (!m) return null;
    const nombre = m[1].trim();
    const precioVenta = Number(m[2].replace(/\./g, '').replace(',', '.'));
    if (!nombre || !precioVenta || precioVenta <= 0) return null;

    const mCosto = original.match(/(?:costo|compra|me\s+cuesta)\s+(?:de\s+)?([\d.,]+)/i);
    const mStock = original.match(/(?:stock|inventario|tengo|hay)\s+(?:de\s+)?(\d+)/i);
    const mUnidad = original.match(/(?:en|por|unidad(?:es)?\s+de)\s+(kg|kilos?|lb|libras?|litros?|ml|metros?|docenas?)/i);

    const precioCompra = mCosto ? Number(mCosto[1].replace(/\./g, '').replace(',', '.')) : 0;
    const stock = mStock ? Number(mStock[1]) : 0;
    const unidad = mUnidad ? mUnidad[1] : 'unidades';

    const advertencias: string[] = [];
    if (precioCompra > 0 && precioCompra >= precioVenta) {
        advertencias.push(`⚠️ El costo (${fmtCUP(precioCompra)}) es mayor o igual al precio de venta (${fmtCUP(precioVenta)}). No vas a ganar nada.`);
    }

    let resumen = `🎯 **Voy a crear este producto:**\n\n📦 **${nombre}**\n💵 Precio venta: **${fmtCUP(precioVenta)}**`;
    if (precioCompra > 0) resumen += `\n📥 Precio compra: ${fmtCUP(precioCompra)}`;
    if (stock > 0) resumen += `\n📊 Stock inicial: ${stock} ${unidad}`;
    resumen += `\n\nSe asignará a tu Punto de Venta principal. ¿Lo creo?`;

    return {
        tipo: 'crear_producto',
        datos: { nombre, precioVenta, precioCompra, stock, unidad },
        resumen,
        advertencias,
    };
}

function parsearGasto(original: string): AccionPendiente | null {
    const m = original.match(
        /(?:apunta|apuntar|registra|registrar|a[ñn]ade|a[ñn]adir|agrega|agregar|pon|anota|anotar)\s+(?:un\s+|el\s+)?gasto\s+(?:de\s+)?([\d.,]+)(?:\s+(?:en|de|para)\s+([a-záéíóúñ]+))?/i
    );
    if (!m) return null;
    const monto = Number(m[1].replace(/\./g, '').replace(',', '.'));
    if (!monto || monto <= 0) return null;

    const categoriaRaw = (m[2] ?? 'otros').toLowerCase();
    const mapaCat: Record<string, any> = {
        luz: 'luz', electricidad: 'luz',
        agua: 'agua',
        alquiler: 'alquiler', renta: 'alquiler',
        salario: 'salario', sueldo: 'salario',
        proveedor: 'proveedor', proveedores: 'proveedor',
        transporte: 'transporte', gasolina: 'transporte', guagua: 'transporte',
        impuestos: 'impuestos', impuesto: 'impuestos',
        mantenimiento: 'mantenimiento', reparacion: 'mantenimiento',
    };
    const categoria = mapaCat[categoriaRaw] ?? 'otros';

    const mDesc = original.match(/(?:por|para|concepto\s+de|descripci[oó]n[:]?\s*)\s*(.+)$/i);
    const descripcion = mDesc ? mDesc[1].trim() : capital(categoriaRaw);

    return {
        tipo: 'crear_gasto',
        datos: { monto, categoria, descripcion },
        resumen: `🎯 **Voy a registrar este gasto:**\n\n💸 **${fmtCUP(monto)}**\n📂 ${capital(categoria)}\n📝 ${descripcion}\n\n¿Lo apunto?`,
    };
}

function parsearCliente(original: string): AccionPendiente | null {
    const m = original.match(
        /(?:crea|crear|a[ñn]ade|a[ñn]adir|agrega|agregar|nuevo|nueva)\s+(?:un\s+|una\s+)?cliente\s+(?:llamado\s+|que\s+se\s+llame\s+)?["']?([^"'\n,]+?)["']?(?:\s+(?:con\s+)?(?:tel[eé]fono|tel|celular|movil)\s+([\d\s\-+()]+))?(?:\s+(?:direcci[oó]n|vive\s+en|de)\s+(.+))?$/i
    );
    if (!m) return null;
    const nombre = m[1].trim().replace(/\s+y\s*$/, '');
    if (!nombre || nombre.length < 2) return null;
    const telefono = m[2]?.trim() ?? '';
    const direccion = m[3]?.trim() ?? '';

    let resumen = `🎯 **Voy a crear este cliente:**\n\n👤 **${capital(nombre)}**`;
    if (telefono) resumen += `\n📞 ${telefono}`;
    if (direccion) resumen += `\n📍 ${direccion}`;
    resumen += `\n\n¿Lo agrego a la libreta?`;

    return {
        tipo: 'crear_cliente',
        datos: { nombre: capital(nombre), telefono, direccion },
        resumen,
    };
}

function parsearPagoFiado(original: string): AccionPendiente | null {
    const m = original.match(
        /(?:el\s+|la\s+)?([A-Za-zÁÉÍÓÚÑáéíóúñ\s]{2,30}?)\s+(?:me\s+)?pag[oó]\s+(?:de\s+fiado\s+)?([\d.,]+)/i
    );
    if (!m) return null;
    const nombreCliente = m[1].trim();
    const monto = Number(m[2].replace(/\./g, '').replace(',', '.'));
    if (!nombreCliente || !monto || monto <= 0) return null;

    return {
        tipo: 'pago_fiado',
        datos: { nombreCliente, monto },
        resumen: `🎯 **Voy a registrar este pago:**\n\n👤 ${capital(nombreCliente)}\n💰 ${fmtCUP(monto)}\n\nSe restará de su deuda pendiente. ¿Lo apunto?`,
    };
}

function parsearCambioPrecio(original: string): AccionPendiente | null {
    const m = original.match(
        /(?:cambia|cambiar|sube|subir|baja|bajar|actualiza|actualizar|pon|poner|ajusta|ajustar)\s+(?:el\s+)?precio\s+(?:del?\s+|de\s+la\s+)?["']?([^"'\n,]+?)["']?\s+(?:a|en|por)\s+([\d.,]+)/i
    );
    if (!m) return null;
    const nombreProducto = m[1].trim();
    const nuevoPrecio = Number(m[2].replace(/\./g, '').replace(',', '.'));
    if (!nombreProducto || !nuevoPrecio || nuevoPrecio <= 0) return null;

    return {
        tipo: 'cambiar_precio',
        datos: { nombreProducto, nuevoPrecio },
        resumen: `🎯 **Voy a cambiar el precio:**\n\n📦 ${nombreProducto}\n💵 Nuevo precio: **${fmtCUP(nuevoPrecio)}**\n\n¿Lo actualizo?`,
    };
}
// ── Parser: "vende 2 cocas y 1 pan" → items para el carrito ──

interface ItemParseado {
    nombreProducto: string;
    cantidad: number;
}

function parsearVentaAlCarrito(original: string): ItemParseado[] | null {
    const m = original.match(
        /(?:vende(?:me)?|agrega|a[ñn]ade|mete|pon|echa)\s+(?:al?\s+carrito\s+)?(.+?)(?:\s+al?\s+carrito)?\s*$/i
    );
    if (!m) return null;

    const cuerpo = m[1].trim();
    if (!cuerpo) return null;

    const partes = cuerpo
        .split(/\s+y\s+|\s+e\s+|,\s*/i)
        .map(p => p.trim())
        .filter(Boolean);

    const items: ItemParseado[] = [];

    for (const parte of partes) {
        const mNum = parte.match(/^(\d+(?:[.,]\d+)?)\s+(.+)$/);
        if (mNum) {
            const cantidad = Number(mNum[1].replace(',', '.'));
            const nombreProducto = mNum[2].trim();
            if (nombreProducto && cantidad > 0) {
                items.push({ nombreProducto, cantidad });
                continue;
            }
        }

        const mPor = parte.match(/^(.+?)\s+x\s*(\d+(?:[.,]\d+)?)$/i);
        if (mPor) {
            const cantidad = Number(mPor[2].replace(',', '.'));
            const nombreProducto = mPor[1].trim();
            if (nombreProducto && cantidad > 0) {
                items.push({ nombreProducto, cantidad });
                continue;
            }
        }

        if (parte.length >= 2) {
            items.push({ nombreProducto: parte, cantidad: 1 });
        }
    }

    return items.length > 0 ? items : null;
}

function emparejarProductos(
    items: ItemParseado[],
    productos: any[]
): { resueltos: { producto: any; cantidad: number }[]; noEncontrados: string[] } {
    const resueltos: { producto: any; cantidad: number }[] = [];
    const noEncontrados: string[] = [];

    for (const it of items) {
        const nombreNorm = normalizar(it.nombreProducto);

        let prod = productos.find(p => normalizar(p.nombre) === nombreNorm);

        if (!prod) {
            const sinPlural = nombreNorm.replace(/s$/, '').replace(/es$/, '');
            prod = productos.find(p => {
                const pn = normalizar(p.nombre);
                return pn === sinPlural || pn.replace(/s$/, '') === sinPlural;
            });
        }

        if (!prod) {
            prod = productos.find(p => {
                const pn = normalizar(p.nombre);
                const primeraPalabra = pn.split(' ')[0];
                if (primeraPalabra.length < 3) return false;
                return nombreNorm.includes(primeraPalabra) || primeraPalabra.includes(nombreNorm);
            });
        }

        if (!prod) {
            prod = productos.find(p => {
                const palabras = normalizar(p.nombre).split(' ').filter((w: string) => w.length >= 4);
                return palabras.some((w: string) => incluyeAprox(nombreNorm, w));
            });
        }

        if (prod) {
            resueltos.push({ producto: prod, cantidad: it.cantidad });
        } else {
            noEncontrados.push(it.nombreProducto);
        }
    }

    return { resueltos, noEncontrados };
}


function parsearAjusteStock(original: string): AccionPendiente | null {
    const mAñadir = original.match(
        /(?:agrega|agregar|a[ñn]ade|a[ñn]adir|entraron|entran|mete|meter|suma|sumar|recib[ií])\s+(\d+)\s+(?:al?\s+|de\s+|a\s+)?["']?([^"'\n,]+?)["']?\s*$/i
    );
    if (mAñadir) {
        const cantidad = Number(mAñadir[1]);
        const nombreProducto = mAñadir[2].trim();
        if (cantidad > 0 && nombreProducto) {
            return {
                tipo: 'ajustar_stock',
                datos: { nombreProducto, cantidad },
                resumen: `🎯 **Voy a sumar stock:**\n\n📦 ${nombreProducto}\n📥 +${cantidad} unidades\n\n¿Lo apunto?`,
            };
        }
    }

    const mQuitar = original.match(
        /(?:quita|quitar|saca|sacar|resta|restar|merma|perdida|se\s+perdieron|se\s+da[ñn]aron)\s+(\d+)\s+(?:al?\s+|de\s+|a\s+)?["']?([^"'\n,]+?)["']?\s*$/i
    );
    if (mQuitar) {
        const cantidad = Number(mQuitar[1]);
        const nombreProducto = mQuitar[2].trim();
        if (cantidad > 0 && nombreProducto) {
            return {
                tipo: 'ajustar_stock',
                datos: { nombreProducto, cantidad: -cantidad },
                resumen: `🎯 **Voy a restar stock:**\n\n📦 ${nombreProducto}\n📤 −${cantidad} unidades\n\nSe registrará como merma o pérdida. ¿Lo apunto?`,
            };
        }
    }

    return null;
}

function detectarAccion(original: string): AccionPendiente | null {
    return (
        parsearProducto(original) ??
        parsearGasto(original) ??
        parsearCliente(original) ??
        parsearPagoFiado(original) ??
        parsearCambioPrecio(original) ??
        parsearAjusteStock(original) ??
        null
    );

}

// ── Reporte diario compartible ─────────────────────────────────

async function generarReporteDiario(): Promise<string> {
    const [ventasTodas, gastosTodos] = await Promise.all([
        db.ventas.toArray(),
        db.gastos.toArray(),
    ]);
    const hoy0 = new Date();
    hoy0.setHours(0, 0, 0, 0);
    const t0 = hoy0.getTime();

    const deHoy = ventasTodas.filter(v => v.estado === 'completada' && new Date(v.fecha).getTime() >= t0);
    const gastosHoy = gastosTodos.filter(g => new Date(g.fecha).getTime() >= t0);
    const totalVentas = deHoy.reduce((s, v) => s + v.total, 0);
    const totalGastos = gastosHoy.reduce((s, g) => s + g.monto, 0);
    const ticket = deHoy.length > 0 ? totalVentas / deHoy.length : 0;

    const conteo: Record<string, number> = {};
    let fiadoHoy = 0;
    deHoy.forEach(v => {
        v.items?.forEach(i => {
            conteo[i.productoNombre] = (conteo[i.productoNombre] || 0) + i.cantidad;
        });
        if (v.esFiado) fiadoHoy += v.total;
    });
    const topProd = Object.entries(conteo).sort((a, b) => b[1] - a[1])[0];

    const fecha = new Date().toLocaleDateString('es', { day: '2-digit', month: '2-digit', year: 'numeric' });
    let rep = `📊 *REPORTE ${fecha}*\n`;
    rep += `━━━━━━━━━━━━━━━\n`;
    rep += `• Ventas: ${deHoy.length} · $${totalVentas.toFixed(0)} CUP\n`;
    rep += `• Ticket promedio: $${ticket.toFixed(0)}\n`;
    if (topProd) rep += `• Producto estrella: ${topProd[0]} (${topProd[1]} u.)\n`;
    if (fiadoHoy > 0) rep += `• Fiados del día: $${fiadoHoy.toFixed(0)}\n`;
    if (gastosHoy.length > 0) rep += `• Gastos: $${totalGastos.toFixed(0)}\n`;
    const efectivo = totalVentas - totalGastos - fiadoHoy;
    rep += `• *Efectivo esperado:* $${Math.max(efectivo, 0).toFixed(0)} CUP\n`;
    rep += `━━━━━━━━━━━━━━━\n`;
    rep += `_Generado por CuentaClara_ ✅`;

    return rep;
}

// ── Análisis predictivo ────────────────────────────────────────

async function predecirCierreMes(): Promise<string> {
    const ventas = (await db.ventas.toArray()).filter(v => v.estado === 'completada');
    const ahora = new Date();
    const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1).getTime();
    const inicioMesPrev = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1).getTime();
    const finMesPrev = inicioMes;

    const delMes = ventas.filter(v => new Date(v.fecha).getTime() >= inicioMes);
    if (delMes.length === 0) {
        return 'Todavía no hay ventas este mes, así que no puedo proyectar. En cuanto hagas unas cuantas, te digo cómo vas a cerrar. 😊';
    }

    const totalMes = delMes.reduce((s, v) => s + v.total, 0);
    const diasTranscurridos = ahora.getDate();
    const diasDelMes = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0).getDate();
    const promedioDiario = totalMes / diasTranscurridos;
    const proyeccion = promedioDiario * diasDelMes;

    const mesPasado = ventas
        .filter(v => {
            const t = new Date(v.fecha).getTime();
            return t >= inicioMesPrev && t < finMesPrev;
        })
        .reduce((s, v) => s + v.total, 0);

    let texto = `🔮 **Proyección del mes**\n\n`;
    texto += `Vas **${fmtCUP(totalMes)}** en ${diasTranscurridos} ${diasTranscurridos === 1 ? 'día' : 'días'}.\n`;
    texto += `A este ritmo (**${fmtCUP(promedioDiario)}/día**), cerrarías en **${fmtCUP(proyeccion)}**.\n`;

    if (mesPasado > 0) {
        const dif = proyeccion - mesPasado;
        const pct = Math.round((dif / mesPasado) * 100);
        if (pct >= 0) {
            texto += `\n📈 El mes pasado terminaste en **${fmtCUP(mesPasado)}**. Vas a cerrar **+${pct}%** arriba si sigues así. ¡A no aflojar! 💪`;
        } else {
            texto += `\n📉 El mes pasado cerraste en **${fmtCUP(mesPasado)}**. Vas a quedar **${pct}%** por debajo, pero quedan ${diasDelMes - diasTranscurridos} días para remontar. 🚀`;
        }
    } else {
        texto += `\n¡Este es tu primer mes con datos! Guarda ese número, que el mes que viene lo comparamos. 📌`;
    }
    return texto;
}

async function analizarMejorDia(): Promise<string> {
    const ventas = (await db.ventas.toArray()).filter(v => v.estado === 'completada');
    if (ventas.length < 7) {
        return 'Necesito al menos una semana de ventas para decirte cuál es tu mejor día. Vuelve cuando tengas más historial. 📊';
    }

    const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const totales: Record<number, { total: number; dias: Set<string> }> = {};
    ventas.forEach(v => {
        const d = new Date(v.fecha);
        const dia = d.getDay();
        if (!totales[dia]) totales[dia] = { total: 0, dias: new Set() };
        totales[dia].total += v.total;
        totales[dia].dias.add(d.toDateString());
    });

    const promedios: Array<{ dia: number; promedio: number }> = [];
    Object.entries(totales).forEach(([k, v]) => {
        const dia = Number(k);
        const prom = v.total / Math.max(v.dias.size, 1);
        promedios.push({ dia, promedio: prom });
    });
    promedios.sort((a, b) => b.promedio - a.promedio);

    const top = promedios[0];
    const peor = promedios[promedios.length - 1];
    const promedioGeneral = promedios.reduce((s, p) => s + p.promedio, 0) / promedios.length;
    const ratio = top.promedio / promedioGeneral;

    let texto = `📅 **Tu mejor día de la semana**\n\n`;
    texto += `🏆 **${dias[top.dia]}**: en promedio facturas **${fmtCUP(top.promedio)}**.\n`;
    texto += `📉 Tu día flojo es **${dias[peor.dia]}** con ${fmtCUP(peor.promedio)}.\n\n`;

    if (ratio >= 1.5) {
        texto += `Los ${dias[top.dia].toLowerCase()}s vendes **${ratio.toFixed(1)}x más** que un día normal. Asegura stock la noche anterior. 💪\n\n`;
    }
    texto += `Y aprovecha los ${dias[peor.dia].toLowerCase()}s para surtir, ordenar y descansar — el día flojo es perfecto para eso. 😌`;

    return texto;
}

// ── Alertas proactivas ─────────────────────────────────────────

async function generarAlertaProactiva(): Promise<string | null> {
    const [productos, clientes, ventasTodas] = await Promise.all([
        db.productos.toArray(),
        db.clientes.toArray(),
        db.ventas.toArray(),
    ]);

    const alertas: string[] = [];

    const bajos = productos.filter(p =>
        !p.esCompuesto && stockTotalProducto(p) <= p.stockMinimo
    );
    if (bajos.length > 0) {
        const agotados = bajos.filter(p => stockTotalProducto(p) <= 0);
        if (agotados.length > 0) {
            alertas.push(`🚨 **${agotados.length} ${agotados.length === 1 ? 'producto agotado' : 'productos agotados'}**: ${agotados.slice(0, 3).map(p => p.nombre).join(', ')}${agotados.length > 3 ? '…' : ''}`);
        } else {
            alertas.push(`⚠️ **${bajos.length} ${bajos.length === 1 ? 'producto' : 'productos'} con stock bajo**`);
        }
    }

    const deudores = clientes.filter(c => c.saldoPendiente > 0);
    if (deudores.length > 0) {
        const total = deudores.reduce((s, c) => s + c.saldoPendiente, 0);
        alertas.push(`💸 **${deudores.length} ${deudores.length === 1 ? 'cliente' : 'clientes'} te deben** — ${fmtCUP(total)} en total`);
    }

    const ayer = new Date();
    ayer.setDate(ayer.getDate() - 1);
    ayer.setHours(0, 0, 0, 0);
    const ayerFin = new Date(ayer);
    ayerFin.setDate(ayerFin.getDate() + 1);
    const ventasAyer = ventasTodas.filter(v => {
        const t = new Date(v.fecha).getTime();
        return v.estado === 'completada' && t >= ayer.getTime() && t < ayerFin.getTime();
    }).length;
    if (ventasAyer === 0) {
        alertas.push(`😴 **Ayer no registraste ventas**. ¿Vamos a remontar hoy?`);
    }

    try {
        const ultimoAviso = localStorage.getItem('cc.ultimo-aviso-backup');
        const sieteDias = 7 * 24 * 60 * 60 * 1000;
        if (ultimoAviso && (Date.now() - Number(ultimoAviso)) > sieteDias) {
            const diasSin = Math.floor((Date.now() - Number(ultimoAviso)) / 86400000);
            if (diasSin >= 7 && diasSin < 900) {
                alertas.push(`💾 **${diasSin} días sin backup** — pásate por Configuración`);
            }
        }
    } catch { /* noop */ }

    if (alertas.length === 0) return null;

    let texto = `☀️ **Buenos días** — así va la tienda:\n\n`;
    texto += alertas.map(a => `• ${a}`).join('\n');
    texto += `\n\n¿Por dónde empezamos? Si quieres, dime «¿cómo voy hoy?» y revisamos números. 😊`;
    return texto;
}

// ═══════════════════════════════════════════════════════════════
//  INTENCIONES
// ═══════════════════════════════════════════════════════════════

const INTENCIONES: Array<{ nombre: string; claves: string[] }> = [
    { nombre: 'saludo', claves: ['hola', 'holaa', 'buenas', 'buenos dias', 'buenas tardes', 'buenas noches', 'hey', 'hi', 'saludos', 'que tal', 'epa', 'oye'] },
    { nombre: 'estado', claves: ['como estas', 'como te va', 'como te sientes', 'como andas', 'todo bien', 'que haces', 'estas bien'] },
    { nombre: 'quien_eres', claves: ['quien eres', 'como te llamas', 'tu nombre', 'que eres', 'eres humana', 'eres un robot', 'eres real'] },
    { nombre: 'ayuda', claves: ['ayuda', 'ayudame', 'que puedes hacer', 'que sabes', 'que sabes hacer', 'opciones', 'comandos', 'para que sirves', 'tus funciones', 'que haces exactamente'] },
    { nombre: 'cuadre', claves: ['cuadre', 'cuadrar', 'cuadrar caja', 'cerrar caja', 'cierre de caja', 'cuanto hay en caja', 'cuanto queda en caja', 'cuanto llevamos de caja', 'caja del dia', 'efectivo en caja', 'revisar la caja', 'como va la caja', 'caja'] },
    { nombre: 'mayoristas', claves: ['mayorista', 'mayoristas', 'al por mayor', 'por mayor', 'al mayor', 'volumen', 'granel', 'wholesale', 'clientes grandes'] },
    { nombre: 'mes', claves: ['del mes', 'este mes', 'en el mes', 'mensual', 'resumen del mes', 'ventas del mes', 'cuanto vendi este mes', 'cuanto vendi en el mes', 'mes'] },
    { nombre: 'ganancia', claves: ['ganancia', 'ganancias', 'ganancia del mes', 'ganancias del mes', 'mi ganancia', 'cual es mi ganancia', 'margen', 'utilidad', 'rentabilidad', 'cuanto gano', 'cuanto dejo', 'dejo limpio', 'profit', 'ganar de verdad'] },
    { nombre: 'animo', claves: ['animame', 'estoy cansado', 'estoy cansada', 'estoy agotado', 'estoy agotada', 'dia dificil', 'no puedo mas', 'estoy triste', 'desanimado', 'desanimada', 'estoy estresado'] },
    { nombre: 'hora', claves: ['que hora es', 'que hora', 'hora es', 'que dia es hoy', 'que dia estamos', 'que fecha es', 'fecha de hoy'] },
    { nombre: 'resumen', claves: ['resumen', 'como fue', 'como va', 'como voy', 'como ando', 'que tal va', 'cuanto vendi', 'cuanto he vendido', 'cuanto llevo', 'cuanto facture', 'ventas', 'vendi', 'recaudado', 'ingresos', 'hoy', 'dia'] },
    { nombre: 'stock', claves: ['stock', 'inventario', 'existencia', 'existencias', 'quedan', 'falta', 'faltan', 'agotado', 'agotandose', 'reponer', 'reposicion', 'bajo', 'productos'] },
    { nombre: 'estrella', claves: ['estrella', 'mas vendido', 'mas sale', 'top', 'popular', 'mejor producto', 'ranking', 'favorito de la gente', 'mas venden'] },
    { nombre: 'clientes', claves: ['cliente', 'clientes', 'deuda', 'deudas', 'deben', 'me deben', 'debo', 'fiado', 'fiados', 'fiar', 'cobrar', 'cobro', 'morosos', 'cuenta pendiente', 'libreta'] },
    { nombre: 'gastos', claves: ['gasto', 'gastos', 'gaste', 'perdida', 'perdi', 'compra', 'compre', 'inverti', 'cuanto he gastado', 'salidas'] },
    { nombre: 'consejo', claves: ['consejo', 'consejos', 'tip', 'tips', 'sugerencia', 'recomendacion', 'recomienda', 'idea', 'mejorar', 'vender mas', 'truco', 'como vendo mas', 'ayudame a vender'] },
    { nombre: 'carrito', claves: ['carrito', 'venta actual', 'venta en curso', 'venta abierta', 'nueva venta', 'venta pendiente'] },
    { nombre: 'chiste', claves: ['chiste', 'hazme reir', 'algo gracioso', 'algo divertido', 'cuentame algo', 'sorprendeme'] },
    { nombre: 'elogio', claves: ['eres genial', 'eres la mejor', 'me gustas', 'te quiero', 'buen trabajo', 'bien hecho', 'lo haces genial', 'eres lo maximo'] },
    { nombre: 'gracias', claves: ['gracias', 'te lo agradezco', 'grasias', 'muy amable', 'un crack', 'excelente', 'perfecto', 'buenisimo', 'de lujo', 'genial'] },
    { nombre: 'despedida', claves: ['adios', 'hasta luego', 'nos vemos', 'chao', 'hasta manana', 'me voy', 'bye', 'descansa', 'hasta pronto'] },
];

function detectarIntencion(q: string): string | null {
    let mejorNombre: string | null = null;
    let mejorPuntaje = 0;
    for (const intento of INTENCIONES) {
        let puntaje = 0;
        for (const clave of intento.claves) {
            if (clave.includes(' ')) {
                if (q.includes(clave)) puntaje += clave.length + 8;
            } else if (incluyeAprox(q, clave)) {
                puntaje += clave.length;
            }
        }
        if (puntaje > mejorPuntaje) {
            mejorPuntaje = puntaje;
            mejorNombre = intento.nombre;
        }
    }
    return mejorNombre;
}

const fmtCUP = (n: number): string =>
    n.toLocaleString('es', {
        minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
        maximumFractionDigits: 2,
    }) + ' CUP';

const horaAhora = () => new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });

function saludoSegunHora(): string {
    const h = new Date().getHours();
    if (h >= 5 && h < 12) return 'Buenos días';
    if (h >= 12 && h < 19) return 'Buenas tardes';
    return 'Buenas noches';
}

const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const escapar = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const formatear = (t: string) =>
    escapar(t).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');

// ── Contenido ──────────────────────────────────────────────────

const CONSEJOS = [
    '💡 Coloca los productos más vendidos a la altura de los ojos: se venden hasta un 30% más.',
    '💡 Un producto de impulso (dulces, pilas, pan) junto a la caja puede subir tu ticket promedio un 8%.',
    '💡 Revisa el stock cada mañana: perder una venta por falta de producto es la pérdida más fácil de evitar.',
    '💡 Los precios terminados en .90 se sienten más baratos que los .99. Pruébalo con tus productos clave.',
    '💡 Saluda por el nombre a tus clientes frecuentes: la fidelidad no se compra, se cultiva.',
    '💡 Un cliente nuevo te cuesta 5 veces más que mantener uno que ya te compra. Cuídalos.',
    '💡 Si un producto no se mueve en 30 días, ponlo en oferta: el dinero quieto es dinero perdido.',
    '💡 Anota cada gasto por pequeño que sea. Los gastos chicos son los que más se comen la ganancia.',
    '💡 Vende en combo: pan + queso + jugo sale mejor junto, y te hace vender tres cosas de una vez.',
    '💡 Cuadra la caja todos los días. Cinco minutos hoy te evitan un dolor de cabeza mañana.',
    '💡 Fija un precio mayorista (−10% a −12% desde 6 unidades): el volumen paga el descuento y fidelizas al que más compra.',
    '💡 Separa el dinero de la casa del dinero del negocio: el día que se mezclen, nadie sabrá cómo va la tienda.',
    '💡 A quien te compre al mayor trátalo como VIP: es tu mejor publicidad y tu flujo de caja más sano.',
    '💡 De vez en cuando revisa el margen: vender mucho con margen cero es trabajar de gratis.',
    '💡 Antes de bajar un precio, prueba subirlo 5% en un producto clave. A veces la gente ni lo nota y tú ganas más.',
    '💡 No compres al por mayor solo porque está barato: compra lo que ya sabes que va a rotar.',
    '💡 Si un cliente paga puntual sus fiados tres veces, dale un pequeño descuento. Lo vas a fidelizar para siempre.',
];

const CHISTES = [
    'Un cliente me preguntó si el cambio lo daba en dólares. Le dije: ¡claro! Y la deuda te la cobro en euros. 😄',
    '¿Sabes cuál es el producto que nunca falta y nunca se vende? El que recuerdas que tienes… cuando ya lo vendiste. 😅',
    'Me dijeron que la contabilidad era pan comido. Nadie me avisó que el pan también sube de precio. 🍞',
    '¿Qué hace una caja registradora en la playa? ¡Cobrando la luz del sol! ☀️ 😄',
    'Un mayorista me dijo: «te lo dejo barato si llevas 12». Llevé los 12… y me quedé sin dinero para la movilidad. 😂',
    '¿Qué le dijo una caja a la otra? «Cuéntame tus problemas». 💸 😆',
    'Un día llegó un cliente y me pidió «lo más barato que tenga». Le dije: mi paciencia. Pero no la vendo. 😅',
    '¿Cómo se llama un negocio que nunca cuadra la caja? Un misterio. 🕵️ 😂',
];

const FRASES_PENSANDO = [
    'Déjame revisar…',
    'Un segundo, cuadro los números…',
    'Revisando tus datos…',
    'Pensando…',
    'Ya casi…',
    'Sacando cuentas…',
];

const CAPACIDADES = `Aquí va **todo lo que puedo hacer** por ti. Soy tu copiloto en CuentaClara. 🧠

**🎯 ¡AHORA HAGO COSAS POR TI!**
• «Crea un producto llamado Pan a 250» — lo agrego a tu catálogo
• «Apunta un gasto de 1500 en luz» — lo registro al instante
• «Nuevo cliente Juan, teléfono 5555-1234»
• «Juan pagó 500» — le rebajo la deuda de fiado
• «Sube el arroz a 180» — cambio el precio
• «Agrega 20 al pan» / «Quita 5 del arroz» — ajusto stock
• «Vende 2 cocas y 1 pan» — te los meto directo en el carrito 🛒
• *Cualquier acción te muestra un resumen y te pide confirmar antes de ejecutarla.* 🛡️

**📤 Reporte listo para compartir**
• «Dame el reporte del día» — texto formateado para WhatsApp
• «¿Cómo voy a cerrar el mes?» — predicción
• «¿Cuál es mi mejor día?» — análisis de la semana

**📅 Ventas y resumen**
• «¿Cómo voy hoy?» — ventas del día, comparación con ayer
• «¿Cuánto vendí ayer?» · «¿Cómo va la semana?» · «¿Y el mes?»
• «¿Cuál fue mi hora pico?» — cuéntame más y te lo digo

**🧾 Cuadre y caja**
• «Cuadre de caja» — cuánto entró, cuánto salió, cuánto debería haber

**🤝 Mayoristas**
• «Mayoristas» — quién compra al por mayor y qué productos

**🧮 Ganancia real**
• «¿Cuánto estoy ganando?» — ingreso vs costo de lo vendido

**📦 Inventario y productos**
• «¿Qué me falta?» — productos bajo stock o agotados
• «Precio del [producto]» — cualquier dato de un producto

**⭐ Estrellas y patrones**
• «Producto estrella» — top 3 más vendidos
• «Cuéntame más» — el puesto 4, 5 y 6

**👥 Fiados y clientes**
• «¿Quién me debe?» — lista de deudores con montos

**💸 Gastos**
• «¿En qué me gasté?» — desglose por categoría del mes

**⏰ Recordatorios con aviso**
• «Recuérdame a las 8 cuadrar la caja»
• «Avísame mañana a las 9 que llega el proveedor»
• «¿Qué recordatorios tengo?» · «Borra los recordatorios»

**🧠 Mi memoria**
• «Apúntame que…» — guardo cualquier nota
• «¿Qué recuerdas?» — te muestro todo
• «Llámame [nombre]» · «Olvídate de todo»

**🎙️ Extras**
• Micrófono para hablarme · Altavoz para voz
• Hora, fecha, chistes, consejos…

Todo se queda **aquí, en tu dispositivo**. Sin internet, sin servidores. 🔒

¿Por dónde empezamos? 😊`;

const SUGERENCIAS = [
    { label: '🤔 ¿Qué puedo hacer?', q: '__CAPACIDADES__' },
];

// ═══════════════════════════════════════════════════════════════
//  COMPONENTE
// ═══════════════════════════════════════════════════════════════

export default function CuentaClaraIA({ usuarioActual, abierto, onCerrar }: Props) {
    const [mensajes, setMensajes] = useState<Msg[]>([]);
    const [input, setInput] = useState('');
    const [escribiendo, setEscribiendo] = useState(false);
    const [frasePensando, setFrasePensando] = useState(FRASES_PENSANDO[0]);
    const [vozOn, setVozOn] = useState(voz.habilitada);
    const [hablando, setHablando] = useState(false);
    const [escuchando, setEscuchando] = useState(false);
    const [overlayActivo, setOverlayActivo] = useState(false);

    const chatRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const nextIdRef = useRef(1);
    const detenerEscuchaRef = useRef<() => void>(() => { });
    const canceloEscuchaRef = useRef(false);
    const abrioRef = useRef(false);
    const olvidoPendienteRef = useRef(false);
    const accionPendienteRef = useRef<AccionPendiente | null>(null);
    const openTimeRef = useRef(0);
    const memoriaRef = useRef<MemoriaIA | null>(null);
    if (!memoriaRef.current) memoriaRef.current = cargarMemoria();
    const memoria = memoriaRef.current;

    const recordarTema = (tema: Tema, periodo?: Periodo) => {
        memoria.ultimoTema = tema;
        if (periodo) memoria.ultimoPeriodo = periodo;
        memoria.frecuencia[tema] = (memoria.frecuencia[tema] || 0) + 1;
        guardarMemoria(memoria);
    };

    const agregarMensaje = (texto: string, de: 'bot' | 'me') => {
        setMensajes(prev => [...prev, { id: nextIdRef.current++, texto, de, hora: horaAhora() }]);
        memoria.ultimaVisita = Date.now();
        guardarMemoria(memoria);
    };

    // ── Efectos ──

    useEffect(() => {
        const off = voz.suscribir(() => {
            setVozOn(voz.habilitada);
            setHablando(voz.hablando);
        });
        return off;
    }, []);

    // ⏰ Recordatorios cada 30s
    useEffect(() => {
        const chequear = () => {
            const ahora = Date.now();
            const vencidos = memoria.recordatorios.filter(
                r => !r.disparado && r.dispararEn <= ahora
            );
            if (vencidos.length === 0) return;

            vencidos.forEach(r => {
                r.disparado = true;
                lanzarNotificacion('⏰ CuentaClara · Recordatorio', r.texto);
                setMensajes(prev => [
                    ...prev,
                    {
                        id: nextIdRef.current++,
                        texto: `⏰ **Recordatorio**: ${r.texto}`,
                        de: 'bot',
                        hora: horaAhora(),
                    },
                ]);
            });
            guardarMemoria(memoria);
            if (voz.habilitada && abierto) {
                voz.decir(vencidos.map(r => `Recordatorio: ${r.texto}`).join('. '));
            }
        };

        const interval = setInterval(chequear, 30_000);
        chequear();
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (abierto) {
            openTimeRef.current = Date.now();
            const t = setTimeout(() => setOverlayActivo(true), 300);
            return () => clearTimeout(t);
        }
        setOverlayActivo(false);
    }, [abierto]);

    const cerrarSeguro = () => {
        if (Date.now() - openTimeRef.current < 500) return;
        onCerrar();
    };

    // Bienvenida + alertas proactivas
    useEffect(() => {
        if (!abierto) return;
        if (mensajes.length > 0) return;
        abrioRef.current = true;
        const nuevaSesion = !memoria.ultimaVisita || Date.now() - memoria.ultimaVisita > 20 * 60 * 1000;
        if (nuevaSesion) {
            memoria.visitas += 1;
            guardarMemoria(memoria);
        }
        const esPrimeraVez = !memoria.conocidos;
        const nombre = memoria.nombre || usuarioActual.nombre.split(' ')[0];

        void (async () => {
            let bienvenida: string;
            if (esPrimeraVez) {
                bienvenida = `¡${saludoSegunHora()}, ${nombre}! 👋 Me llamo **Clara** y seré tu copiloto en CuentaClara.\n\nConozco tus ventas, tu inventario, tu caja y tus fiados… y todo se queda **aquí, en tu dispositivo**. Sin internet, sin servidores, sin que nadie más lo vea. 🔒\n\n**Y ahora puedo hacer cosas por ti**: dime «crea un producto…», «apunta un gasto…», «recuérdame a las 8…» y lo ejecuto. 🎯\n\nToca **«🤔 ¿Qué puedo hacer?»** abajo y te cuento todo. 😊`;
            } else {
                const partes: string[] = [`¡${saludoSegunHora()} de nuevo, ${nombre}! 😄 Qué bueno verte por aquí.`];
                partes.push(`La última vez que charlamos fue ${haceCuanto(memoria.ultimaVisita ?? Date.now())}.`);

                const recPend = memoria.recordatorios.filter(r => !r.disparado && r.dispararEn > Date.now());
                if (recPend.length > 0) {
                    const prox = recPend.sort((a, b) => a.dispararEn - b.dispararEn)[0];
                    partes.push(`⏰ Tienes **${recPend.length} ${recPend.length === 1 ? 'recordatorio pendiente' : 'recordatorios pendientes'}** — el próximo es ${formatearCuando(prox.dispararEn)}: «${prox.texto}».`);
                }

                const fav = Object.entries(memoria.frecuencia).sort((a, b) => b[1] - a[1])[0];
                if (fav && fav[1] >= 3 && TEMA_FAVORITO[fav[0] as Tema]) {
                    partes.push(`Y ya lo sé de memoria: lo tuyo es ${TEMA_FAVORITO[fav[0] as Tema]} 😉`);
                }

                bienvenida = partes.join('\n\n');

                // Alerta proactiva (solo si hay algo que reportar)
                const alerta = await generarAlertaProactiva();
                if (alerta) {
                    bienvenida += `\n\n${alerta}`;
                } else {
                    bienvenida += '\n\n¿Qué revisamos hoy? Si quieres, toca **«🤔 ¿Qué puedo hacer?»** y te refresco la lista.';
                }
            }

            const t = setTimeout(() => {
                memoria.conocidos = true;
                guardarMemoria(memoria);
                agregarMensaje(bienvenida, 'bot');
            }, 350);
            return () => clearTimeout(t);
        })();
    }, [abierto]);

    useEffect(() => {
        if (chatRef.current) {
            chatRef.current.scrollTop = chatRef.current.scrollHeight;
        }
    }, [mensajes, escribiendo, escuchando]);

    useEffect(() => {
        if (abierto) {
            setTimeout(() => inputRef.current?.focus(), 350);
        }
    }, [abierto]);

    useEffect(() => {
        if (!abierto) {
            if (abrioRef.current) {
                memoria.ultimaVisita = Date.now();
                guardarMemoria(memoria);
            }
            voz.detener();
            canceloEscuchaRef.current = true;
            detenerEscuchaRef.current();
            setEscuchando(false);
        }
    }, [abierto]);

    useEffect(
        () => () => {
            if (abrioRef.current) {
                memoria.ultimaVisita = Date.now();
                guardarMemoria(memoria);
            }
            voz.detener();
            detenerEscuchaRef.current();
        },
        []
    );

    const botResponder = (texto: string) => {
        setFrasePensando(alAzar(FRASES_PENSANDO));
        setEscribiendo(true);
        const delay = 550 + Math.random() * 450 + Math.min(texto.length * 5, 1500);
        setTimeout(() => {
            setEscribiendo(false);
            agregarMensaje(texto, 'bot');
            sonidos.notificacion();
            voz.decir(texto);
        }, delay);
    };

    const detenerEscucha = () => {
        canceloEscuchaRef.current = true;
        detenerEscuchaRef.current();
        setEscuchando(false);
    };

    const enviar = (textoDirecto?: string) => {
        const txt = (textoDirecto ?? input).trim();
        if (!txt || escribiendo) return;
        setInput('');
        detenerEscucha();
        agregarMensaje(escapar(txt), 'me');
        sonidos.tecla();

        if (txt === '__CAPACIDADES__') {
            botResponder(CAPACIDADES);
            return;
        }

        void (async () => {
            try {
                const r = await analizar(txt);
                recordarTema(r.tema, r.periodo);
                botResponder(r.texto);
            } catch {
                botResponder('Uy, se me trastabilló un número por ahí 😅 ¿Me lo preguntas otra vez?');
            }
        })();
    };

    const manejarSugerencia = (q: string) => {
        if (escribiendo || escuchando) return;
        enviar(q);
    };

    const alternarVoz = () => {
        voz.alternar();
        setVozOn(voz.habilitada);
        sonidos.tecla();
    };

    const iniciarEscucha = () => {
        if (escuchando) {
            detenerEscucha();
            return;
        }
        voz.detener();
        canceloEscuchaRef.current = false;
        setEscuchando(true);
        detenerEscuchaRef.current = escuchar({
            onParcial: t => setInput(t),
            onFinal: t => {
                setEscuchando(false);
                if (t) {
                    enviar(t);
                } else if (!canceloEscuchaRef.current) {
                    agregarMensaje('No te escuché bien 👂 ¿Me lo repites?', 'bot');
                }
            },
            onError: motivo => {
                setEscuchando(false);
                if (motivo === 'not-allowed') {
                    agregarMensaje('Para escucharte necesito permiso del micrófono 🎙️ Actívalo en los permisos del navegador y lo intentamos de nuevo.', 'bot');
                } else if (motivo === 'no-speech') {
                    agregarMensaje('No escuché nada 🤔 Acércate un poquito al micrófono y probamos otra vez.', 'bot');
                } else if (motivo === 'network') {
                    agregarMensaje('El dictado necesita conexión en este navegador 📡 Puedes escribirme igual, aquí estoy.', 'bot');
                }
            },
        });
    };

    // ── Cerebro ──

    const cargarDatos = async () => {
        const [ventas, productos] = await Promise.all([db.ventas.toArray(), db.productos.toArray()]);
        return { ventas, productos };
    };

    const periodoDesde = (q: string): Periodo =>
        q.includes('semana') ? 'semana' : /mes|mensual/.test(q) ? 'mes' : q.includes('ayer') ? 'ayer' : 'hoy';

    const responderResumen = async (periodo: Periodo): Promise<Respuesta> => {
        const { ventas: todasVentas } = await cargarDatos();
        const completadas = todasVentas.filter(v => v.estado === 'completada');

        const hoy0 = new Date();
        hoy0.setHours(0, 0, 0, 0);
        const t0 = hoy0.getTime();
        const dia = 86400000;
        const inicioSemana = (() => {
            const d = new Date();
            const day = (d.getDay() + 6) % 7;
            d.setDate(d.getDate() - day);
            d.setHours(0, 0, 0, 0);
            return d.getTime();
        })();
        const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
        const inicioMesPrev = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).getTime();

        const rangos: Record<Periodo, { desde: number; hasta: number; etiqueta: string; prevEtiqueta: string; prev: [number, number] }> = {
            hoy: { desde: t0, hasta: Infinity, etiqueta: 'Hoy', prevEtiqueta: 'ayer', prev: [t0 - dia, t0] },
            ayer: { desde: t0 - dia, hasta: t0, etiqueta: 'Ayer', prevEtiqueta: 'anteayer', prev: [t0 - 2 * dia, t0 - dia] },
            semana: { desde: inicioSemana, hasta: Infinity, etiqueta: 'Esta semana', prevEtiqueta: 'la semana pasada', prev: [inicioSemana - 7 * dia, inicioSemana] },
            mes: { desde: inicioMes, hasta: Infinity, etiqueta: 'Este mes', prevEtiqueta: 'el mes pasado', prev: [inicioMesPrev, inicioMes] },
        };
        const r = rangos[periodo];

        const enRango = (fecha: Date | string | number, desde: number, hasta: number) => {
            const t = new Date(fecha).getTime();
            return t >= desde && t < hasta;
        };

        const ventas = completadas.filter(v => enRango(v.fecha, r.desde, r.hasta));
        const ventasPrev = completadas.filter(v => enRango(v.fecha, r.prev[0], r.prev[1]));
        const total = ventas.reduce((s, v) => s + v.total, 0);
        const items = ventas.reduce((s, v) => s + (v.items?.reduce((a, i) => a + i.cantidad, 0) || 0), 0);

        if (ventas.length === 0) {
            const totalPrev = ventasPrev.reduce((s, v) => s + v.total, 0);
            let vacio = alAzar([
                `Por ahora **no registras ventas** ${periodo === 'hoy' ? 'de hoy' : r.etiqueta.toLowerCase()}… pero eso tiene arreglo: ¡a vender se dijo! 💪`,
                `Todavía no veo ventas ${periodo === 'hoy' ? 'de hoy' : r.etiqueta.toLowerCase()}. Cuando cobres la primera, aquí estaré para celebrarla contigo. 🎉`,
            ]);
            if (totalPrev > 0) {
                vacio += `\n\n${capital(r.prevEtiqueta)} terminaste en **${fmtCUP(totalPrev)}**, así que hay con qué compararse.`;
            }
            return { texto: vacio, tema: 'resumen', periodo };
        }

        const ticket = total / ventas.length;
        const emojiPeriodo = periodo === 'hoy' ? '📅' : periodo === 'ayer' ? '🌙' : periodo === 'mes' ? '📆' : '🗓️';
        const u1 = ventas.length === 1 ? 'venta' : 'ventas';

        let texto = `${emojiPeriodo} **${r.etiqueta}** vas **${fmtCUP(total)}** en **${ventas.length} ${u1}** (${items} ${items === 1 ? 'artículo' : 'artículos'}).\n\nEl ticket promedio anda por **${fmtCUP(ticket)}**.`;

        const totalPrev = ventasPrev.reduce((s, v) => s + v.total, 0);
        if (totalPrev > 0) {
            const pct = Math.round((total - totalPrev) / totalPrev * 100);
            if (pct >= 0) {
                texto += `\n\n📈 Comparado con ${r.prevEtiqueta} vas **+${pct}%** (${fmtCUP(totalPrev)}). ${pct >= 15 ? '¡Ahí se trabaja duro, enhorabuena! 💪' : pct > 0 ? 'Vas por buen camino, no aflojes.' : 'Vas parejo, que no es poco.'}`;
            } else {
                texto += `\n\n📉 Comparado con ${r.prevEtiqueta} vas **${pct}%** (${fmtCUP(totalPrev)}). ${periodo === 'hoy' ? 'Tranquilo, el día no se ha acabado: todavía hay tiempo de remontar. 💪' : 'Hay días así; lo importante es verlo a tiempo y ajustar.'}`;
            }
        }

        if (periodo === 'hoy') {
            const h = new Date().getHours();
            if (h < 10) texto += '\n\nEl día apenas arranca… ¡vamos con todo! ☀️';
            else if (h >= 20) texto += '\n\nSe hace de noche. ¿Ya cuadraste la caja?';
        }

        return { texto, tema: 'resumen', periodo };
    };

    const responderStock = async (): Promise<Respuesta> => {
        const { productos } = await cargarDatos();
        const bajos = productos
            .filter(p => !p.esCompuesto && stockTotalProducto(p) <= p.stockMinimo)
            .map(p => ({ p, s: stockTotalProducto(p) }))
            .sort((a, b) => a.s - b.s);

        if (bajos.length === 0) {
            return {
                texto: alAzar([
                    '✅ Pasé lista a tu inventario y va **todo en orden**: ningún producto por debajo del mínimo. ¡Qué gusto da una bodega así!',
                    'Buenas noticias: **no tengo alertas de stock**. Todo por encima del mínimo. Disfrútalo, que eso no pasa todos los días. 😌',
                ]),
                tema: 'stock',
            };
        }

        const agotados = bajos.filter(b => b.s <= 0).length;
        const lista = bajos
            .slice(0, 6)
            .map(b => `• ${b.p.nombre}: ${b.s <= 0 ? '**agotado** 🚨' : `quedan solo **${b.s}**`}`)
            .join('\n');
        const resto = bajos.length > 6 ? `\n\n…y ${bajos.length - 6} más en la misma situación.` : '';

        const intro = agotados > 0
            ? `Oye, te tengo que dar un aviso 🚨: tienes **${bajos.length} ${bajos.length === 1 ? 'producto' : 'productos'}** con el stock por los suelos, y **${agotados} ${agotados === 1 ? 'ya está agotado del todo' : 'ya están agotados del todo'}**:`
            : `Ojo, hay **${bajos.length} ${bajos.length === 1 ? 'producto que está' : 'productos que están'}** por debajo del mínimo:`;

        return {
            texto: `${intro}\n\n${lista}${resto}\n\nMi consejo: empieza por los que ya están en cero — esos son ventas que se te están escapando ahora mismo. 🏃`,
            tema: 'stock',
        };
    };

    const responderEstrella = async (): Promise<Respuesta> => {
        const { ventas: todasVentas } = await cargarDatos();
        const conteo: Record<string, number> = {};
        todasVentas
            .filter(v => v.estado === 'completada')
            .forEach(v => {
                v.items?.forEach(i => {
                    conteo[i.productoNombre] = (conteo[i.productoNombre] || 0) + i.cantidad;
                });
            });
        const top = Object.entries(conteo).sort((a, b) => b[1] - a[1]);

        if (top.length === 0) {
            return {
                texto: 'Aún no tengo ventas suficientes para conocer a tu estrella 🛒. Registra algunas ventas y vuelvo con el podio.',
                tema: 'estrella',
            };
        }

        const [primero, segundo, tercero] = top;
        const u = (n: number) => (n === 1 ? 'unidad' : 'unidades');
        let texto = `⭐ Tu **producto estrella** es **${primero[0]}** — ya lleva **${primero[1]} ${u(primero[1])}** vendidas. Ese no puede faltar nunca en la estantería.`;
        if (segundo && tercero) {
            texto += `\n\n🥈 Después viene **${segundo[0]}** (${segundo[1]} u.) y 🥉 **${tercero[0]}** (${tercero[1]} u.).`;
        } else if (segundo) {
            texto += `\n\n🥈 Y después viene **${segundo[0]}** (${segundo[1]} u.).`;
        }
        texto += '\n\nSi quieres te cuento los que vienen detrás: dime «cuéntame más».';
        return { texto, tema: 'estrella' };
    };

    const responderClientes = async (): Promise<Respuesta> => {
        const clientes = await db.clientes.toArray();
        const conDeuda = clientes
            .filter(c => c.saldoPendiente > 0)
            .sort((a, b) => b.saldoPendiente - a.saldoPendiente);
        const totalDeuda = conDeuda.reduce((s, c) => s + c.saldoPendiente, 0);

        if (conDeuda.length === 0) {
            return {
                texto: alAzar([
                    `👥 Tienes **${clientes.length} ${clientes.length === 1 ? 'cliente registrado' : 'clientes registrados'}** y lo mejor: **nadie te debe nada**. ¡Todo al día! Así da gusto. ✅`,
                    'La libreta de fiados está limpia: **cero deudas**. Que siga así. 😌',
                ]),
                tema: 'clientes',
            };
        }

        const lista = conDeuda
            .slice(0, 5)
            .map(c => {
                memoria.clientesMencionados[c.nombre] = (memoria.clientesMencionados[c.nombre] || 0) + 1;
                return `• ${c.nombre}: **${fmtCUP(c.saldoPendiente)}**`;
            })
            .join('\n');
        guardarMemoria(memoria);
        const resto = conDeuda.length > 5 ? `\n\n…y ${conDeuda.length - 5} más.` : '';

        return {
            texto: `👥 Déjame ver la libreta… tienes **${conDeuda.length} ${conDeuda.length === 1 ? 'cliente que te debe' : 'clientes que te deben'}**:\n\n${lista}${resto}\n\n💰 En total hay **${fmtCUP(totalDeuda)}** durmiendo fuera de la caja. Un recuerdo amable no cuesta nada… y un cobro tampoco. 😉`,
            tema: 'clientes',
        };
    };

    const responderGastos = async (): Promise<Respuesta> => {
        const gastos = await db.gastos.toArray();
        const ahora = new Date();
        const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1).getTime();
        const delMes = gastos.filter(g => new Date(g.fecha).getTime() >= inicioMes);
        const total = delMes.reduce((s, g) => s + g.monto, 0);

        if (delMes.length === 0) {
            return {
                texto: 'Este mes **no has registrado gastos**. O eres de los que no gastan… o de los que no apuntan. 😏 Apuntarlos es la única forma de saber cuánto queda de ganancia.',
                tema: 'gastos',
            };
        }

        const porCat: Record<string, number> = {};
        delMes.forEach(g => {
            porCat[g.categoria] = (porCat[g.categoria] || 0) + g.monto;
        });
        const top = Object.entries(porCat).sort((a, b) => b[1] - a[1]);
        const lista = top
            .slice(0, 4)
            .map(([cat, monto]) => `• ${cat}: **${fmtCUP(monto)}**`)
            .join('\n');

        return {
            texto: `💸 Este mes has gastado **${fmtCUP(total)}** en ${delMes.length} ${delMes.length === 1 ? 'movimiento' : 'movimientos'}. Se fue más o menos así:\n\n${lista}${top.length > 4 ? `\n\n…y otras ${top.length - 4} categorías.` : ''}\n\nSi una categoría pesa demasiado, ahí está tu primera oportunidad de ahorro. 🕵️`,
            tema: 'gastos',
        };
    };

    const responderCuadre = async (): Promise<Respuesta> => {
        const [ventasTodas, gastosTodos] = await Promise.all([db.ventas.toArray(), db.gastos.toArray()]);
        const hoy0 = new Date();
        hoy0.setHours(0, 0, 0, 0);
        const t0 = hoy0.getTime();
        const dia = 86400000;

        const deHoy = ventasTodas.filter(v => v.estado === 'completada' && new Date(v.fecha).getTime() >= t0);
        const gastosHoy = gastosTodos.filter(g => new Date(g.fecha).getTime() >= t0);
        const totalVentas = deHoy.reduce((s, v) => s + v.total, 0);
        const totalGastos = gastosHoy.reduce((s, g) => s + g.monto, 0);

        if (deHoy.length === 0 && gastosHoy.length === 0) {
            return {
                texto: 'El día va en blanco todavía 😴 En cuanto entre la primera venta o el primer gasto, aquí te dejo el cuadre listo. 🧾',
                tema: 'cuadre',
            };
        }

        const porForma: Record<string, number> = {};
        deHoy.forEach(v => {
            const f = normalizar(String((v as any).formaPago || 'efectivo'));
            porForma[f] = (porForma[f] || 0) + v.total;
        });
        const tieneFormas = Object.keys(porForma).length > 1 || !('efectivo' in porForma);
        const efectivo = porForma['efectivo'] ?? totalVentas;
        const enCaja = efectivo - totalGastos;

        const mayor = deHoy.length > 0 ? deHoy.reduce((a, b) => (b.total > a.total ? b : a)) : null;
        const horaMayor = mayor ? new Date(mayor.fecha).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }) : '';
        const fechaHoy = capital(new Date().toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' }));

        let texto = `🧾 **Cuadre de caja — ${fechaHoy}**\n\n`;
        texto += `• Ventas: **${deHoy.length}** ${deHoy.length === 1 ? 'cobro' : 'cobros'} → **${fmtCUP(totalVentas)}**\n`;
        if (tieneFormas) {
            texto += '  ─ ' + Object.entries(porForma).sort((a, b) => b[1] - a[1]).map(([f, t]) => `${capital(f)}: ${fmtCUP(t)}`).join('\n  ─ ') + '\n';
        }
        if (gastosHoy.length > 0) {
            texto += `• Gastos de hoy: **${fmtCUP(totalGastos)}** en ${gastosHoy.length} ${gastosHoy.length === 1 ? 'apunte' : 'apuntes'}\n`;
        }
        texto += `• **Efectivo que debería haber en caja: ${fmtCUP(Math.max(enCaja, 0))}**\n`;
        if (mayor) texto += `• La venta más gorda: **${fmtCUP(mayor.total)}** a las ${horaMayor}\n`;

        const totalAyer = ventasTodas
            .filter(v => {
                const t = new Date(v.fecha).getTime();
                return v.estado === 'completada' && t >= t0 - dia && t < t0;
            })
            .reduce((s, v) => s + v.total, 0);
        if (totalAyer > 0) {
            const dif = totalVentas - totalAyer;
            texto += dif >= 0
                ? `\nAyer cerraste con ${fmtCUP(totalAyer)} — hoy vas **${fmtCUP(dif)} por encima**. 📈`
                : `\nAyer cerraste con ${fmtCUP(totalAyer)} — hoy vas ${fmtCUP(Math.abs(dif))} abajo, pero el día no se ha acabado. 😉`;
        }

        texto += `\n\n💡 Ahora cuenta el efectivo físico y compáralo con la cifra de arriba. Si cuadra: ¡a cerrar sonriendo! 🎉 Si no, revisa fiados anotados hoy o gastos sin registrar. Y dime «cuéntame más» si quieres el desglose.`;
        return { texto, tema: 'cuadre' };
    };

    const UMBRAL_MAYOREO = 6;

    const calcularMayoristas = async () => {
        const ventasTodas = await db.ventas.toArray();
        const t0 = new Date();
        t0.setHours(0, 0, 0, 0);
        const desde = t0.getTime() - 29 * 86400000;
        const recientes = ventasTodas.filter(v => v.estado === 'completada' && new Date(v.fecha).getTime() >= desde);
        const totalPeriodo = recientes.reduce((s, v) => s + v.total, 0);
        let montoMayoreo = 0;
        let piezasMayoreo = 0;
        let ventasMayoreo = 0;
        const porProducto: Record<string, { cant: number; monto: number; precio: number }> = {};
        const porCliente: Record<string, number> = {};

        recientes.forEach(v => {
            const items = v.items || [];
            if (!items.some(i => i.cantidad >= UMBRAL_MAYOREO)) return;
            ventasMayoreo += 1;
            montoMayoreo += v.total;
            const cli = String((v as any).clienteNombre || '').trim();
            if (cli) porCliente[cli] = (porCliente[cli] || 0) + v.total;
            const unidadesVenta = items.reduce((a, i) => a + i.cantidad, 0) || 1;
            items.forEach(i => {
                if (i.cantidad < UMBRAL_MAYOREO) return;
                const precio = (i as any).precioUnitario ?? (i as any).precio ?? v.total / unidadesVenta;
                const p = (porProducto[i.productoNombre] = porProducto[i.productoNombre] || { cant: 0, monto: 0, precio });
                p.cant += i.cantidad;
                p.monto += precio * i.cantidad;
                if (!p.precio) p.precio = precio;
                piezasMayoreo += i.cantidad;
            });
        });
        return { totalPeriodo, montoMayoreo, piezasMayoreo, ventasMayoreo, porProducto, porCliente };
    };

    const lineaMayorista = (productos: Producto[], nombre: string, d: { cant: number; monto: number; precio: number }, conSugerencia: boolean) => {
        const prod = productos.find(p => p.nombre === nombre);
        const pm = (prod as any)?.precioMayorista;
        const sugerido = d.precio > 0 ? Math.round(d.precio * 0.9 * 100) / 100 : 0;
        return `• **${nombre}** — ${d.cant} uds · ${fmtCUP(d.monto)}${pm ? ` (tu precio al mayor: ${fmtCUP(pm)})` : conSugerencia && sugerido > 0 ? ` → al mayor rondaría ${fmtCUP(sugerido)}/ud (−10%)` : ''}`;
    };

    const responderMayoristas = async (): Promise<Respuesta> => {
        const m = await calcularMayoristas();
        if (m.ventasMayoreo === 0) {
            return {
                texto: alAzar([
                    `De ${UMBRAL_MAYOREO} unidades para arriba no veo ninguna venta en los últimos 30 días 🤔\n\nSi quieres meterle al negocio del mayor, mi fórmula: **−10% a −12% desde 6 unidades**. Vendes más de una sola vez, giras el inventario más rápido y el cliente grande vuelve. 😉`,
                    'Todavía no detecto compras grandes tipo mayorista 📦 Cuando alguien te lleve 6+ unidades de algo, aquí estaré para analizar el volumen y decirte si el precio te conviene.',
                ]),
                tema: 'mayoristas',
            };
        }
        const productos = await db.productos.toArray();
        const pct = m.totalPeriodo > 0 ? Math.round((m.montoMayoreo / m.totalPeriodo) * 100) : 0;
        const topProd = Object.entries(m.porProducto).sort((a, b) => b[1].monto - a[1].monto).slice(0, 4).map(([nombre, d]) => lineaMayorista(productos, nombre, d, true)).join('\n');
        const listaCli = Object.entries(m.porCliente).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([c, t]) => `• ${c}: ${fmtCUP(t)}`).join('\n');

        let texto = `🤝 **Mayoristas (últimos 30 días)**\n\n`;
        texto += `Detecto **${m.ventasMayoreo} ${m.ventasMayoreo === 1 ? 'venta al por mayor' : 'ventas al por mayor'}**: ${m.piezasMayoreo} ${m.piezasMayoreo === 1 ? 'unidad' : 'unidades'} por **${fmtCUP(m.montoMayoreo)}** — un **${pct}%** de tus ventas del periodo.\n\n`;
        texto += `**Lo que más se llevan al mayor:**\n${topProd}\n`;
        if (listaCli) texto += `\n**Tus compradores grandes:**\n${listaCli}\n`;
        texto += `\n${alAzar(['Trata a esos clientes como VIP: son tu flujo de caja más sano y tu mejor publicidad. 😎', 'Si el mayor ya pesa así, fija precios claros: −10% a −12% desde 6 unidades, y nadie te regatea a mano alzada. 😉'])}`;
        return { texto, tema: 'mayoristas' };
    };

    const responderGanancia = async (): Promise<Respuesta> => {
        const [ventasTodas, productos] = await Promise.all([db.ventas.toArray(), db.productos.toArray()]);
        const conCosto = productos.filter(p => typeof (p as any).costo === 'number' && (p as any).costo > 0);

        if (conCosto.length === 0) {
            return {
                texto: 'Para calcular tu **ganancia de verdad** me faltan los costos 🧮\n\nSi cargas lo que te cuesta cada producto (el precio al que lo compras tú), te digo cuánto dejas limpio por venta, por día y por mes. Ahora mismo no veo ningún costo cargado 😅',
                tema: 'ganancia',
            };
        }

        const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
        const delMes = ventasTodas.filter(v => v.estado === 'completada' && new Date(v.fecha).getTime() >= inicioMes);
        if (delMes.length === 0) {
            return {
                texto: 'Este mes todavía no hay ventas, así que la ganancia va en… cero 😅 ¡Vamos a mover ese inventario!',
                tema: 'ganancia',
            };
        }

        const ingreso = delMes.reduce((s, v) => s + v.total, 0);
        let costo = 0;
        const faltantes = new Set<string>();
        delMes.forEach(v => (v.items || []).forEach(i => {
            const prod = productos.find(p => p.nombre === i.productoNombre);
            const c = (prod as any)?.costo;
            if (typeof c === 'number' && c > 0) costo += c * i.cantidad;
            else faltantes.add(i.productoNombre);
        }));
        const ganancia = ingreso - costo;
        const margen = ingreso > 0 ? Math.round((ganancia / ingreso) * 100) : 0;

        let texto = `🧮 **Ganancia del mes** (con los costos que tengo cargados)\n\n`;
        texto += `• Ingresos: **${fmtCUP(ingreso)}**\n`;
        texto += `• Costo de lo vendido: ${fmtCUP(costo)}\n`;
        texto += `• **Ganancia: ${fmtCUP(ganancia)}** (margen ~${margen}%)\n`;
        if (faltantes.size > 0) {
            texto += `\n⚠️ No conozco el costo de: ${Array.from(faltantes).slice(0, 4).join(', ')}${faltantes.size > 4 ? '…' : ''}. Cárgalo y te afino el número.`;
        }
        texto += `\n\n${margen >= 25 ? '¡Margen sano! 💪' : margen >= 10 ? 'Margen regular… hay espacio para ajustar precios. 🤏' : 'Ojo: con ese margen, vender más es trabajar más para casi lo mismo. 🤔'}`;
        return { texto, tema: 'ganancia' };
    };

    const buscarProducto = async (q: string): Promise<Producto | null> => {
        const productos = await db.productos.toArray();
        const VACIAS = new Set(['de', 'la', 'el', 'los', 'las', 'del', 'y', 'con', 'para', 'en', 'un', 'una', 'al', 'ml', 'kg', 'gr', 'grs', 'lt', 'cl']);
        const palabras = q.split(' ').filter(Boolean);
        const encontrado = productos.find(p => {
            const claves = normalizar(p.nombre).split(' ').filter(t => t.length >= 3 && !VACIAS.has(t) && !/^\d+/.test(t));
            if (claves.length === 0) return false;
            return claves.some(clave => palabras.some(w => incluyeAprox(w, clave)));
        });
        return encontrado || null;
    };

    const responderProducto = async (prod: Producto): Promise<Respuesta> => {
        memoria.ultimoProducto = prod.nombre;
        memoria.consultasProductos[prod.nombre] = (memoria.consultasProductos[prod.nombre] || 0) + 1;
        guardarMemoria(memoria);
        const st = stockTotalProducto(prod);
        const min = prod.stockMinimo;
        const precio = (prod as any).precio;
        const costo = (prod as any).costo;
        const pmayor = (prod as any).precioMayorista;
        const icono = st <= 0 ? '🔴 **agotado**' : st <= min ? '🟡 **justo de stock**' : '🟢 bien servido';

        const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
        const delMes = (await db.ventas.toArray()).filter(v => v.estado === 'completada' && new Date(v.fecha).getTime() >= inicioMes);
        let uds = 0;
        let monto = 0;
        delMes.forEach(v => (v.items || []).forEach(i => {
            if (i.productoNombre !== prod.nombre) return;
            const pu = (i as any).precioUnitario ?? (i as any).precio ?? precio ?? 0;
            uds += i.cantidad;
            monto += pu * i.cantidad;
        }));
        const margen = typeof precio === 'number' && typeof costo === 'number' && precio > 0 ? Math.round(((precio - costo) / precio) * 100) : null;

        let texto = `${prod.esCompuesto ? '🧩' : '📦'} **${prod.nombre}**\n\n`;
        if (typeof precio === 'number') texto += `• Precio: **${fmtCUP(precio)}**${margen !== null ? ` (margen ~${margen}%)` : ''}\n`;
        if (typeof pmayor === 'number') texto += `• Al por mayor: **${fmtCUP(pmayor)}**\n`;
        texto += `• Stock: **${st}** (mínimo ${min}) → ${icono}\n`;
        texto += `• Este mes: **${uds}** ${uds === 1 ? 'vendida' : 'vendidas'}${monto > 0 ? ` por ${fmtCUP(monto)}` : ''}\n\n`;
        texto += st <= 0
            ? '¡Está en cero! Cada día sin él es una venta que se va con el vecino 😩 ¿Lo reponemos pronto?'
            : st <= min
                ? 'Va justo 👀 Apúntalo en tu lista de reposición antes de que se acabe del todo.'
                : alAzar(['De este hay para la larga 😌', 'Bien servido de inventario 👌']);
        return { texto, tema: 'producto' };
    };

    const detalleExtra = async (tema: Tema): Promise<Respuesta> => {
        if (tema === 'resumen') {
            const { ventas: todasVentas } = await cargarDatos();
            const completadas = todasVentas.filter(v => v.estado === 'completada');
            const hoy0 = new Date();
            hoy0.setHours(0, 0, 0, 0);
            const t0 = hoy0.getTime();
            const dia = 86400000;

            let base = completadas;
            if (memoria.ultimoPeriodo === 'hoy') {
                base = completadas.filter(v => new Date(v.fecha).getTime() >= t0);
            } else if (memoria.ultimoPeriodo === 'ayer') {
                base = completadas.filter(v => {
                    const t = new Date(v.fecha).getTime();
                    return t >= t0 - dia && t < t0;
                });
            } else if (memoria.ultimoPeriodo === 'mes') {
                base = completadas.filter(v => new Date(v.fecha).getTime() >= new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime());
            }

            if (base.length === 0) {
                return { texto: 'De eso no tengo más datos todavía… cuando entren ventas, te cuento hasta la hora pico. ⏰', tema: 'resumen' };
            }

            const porHora: Record<number, number> = {};
            base.forEach(v => {
                const h = new Date(v.fecha).getHours();
                porHora[h] = (porHora[h] || 0) + v.total;
            });
            const horaPico = Object.entries(porHora).sort((a, b) => b[1] - a[1])[0];

            const conteo: Record<string, number> = {};
            base.forEach(v => v.items?.forEach(i => {
                conteo[i.productoNombre] = (conteo[i.productoNombre] || 0) + i.cantidad;
            }));
            const topProd = Object.entries(conteo).sort((a, b) => b[1] - a[1])[0];

            let texto = 'A ver, te saco más jugo a esos números:\n\n';
            texto += `⏰ Tu hora más fuerte fue a las **${horaPico[0]}:00**, ahí entraron **${fmtCUP(Number(horaPico[1]))}**.\n`;
            if (topProd) texto += `🛒 Y lo que más salió fue **${topProd[0]}** (${topProd[1]} u.).\n`;
            texto += '\nAprovecha la hora pico: tenlo todo listo antes, y métete un producto de impulso en la caja. 😏';
            return { texto, tema: 'resumen' };
        }

        if (tema === 'estrella') {
            const { ventas: todasVentas } = await cargarDatos();
            const conteo: Record<string, number> = {};
            todasVentas.filter(v => v.estado === 'completada').forEach(v => v.items?.forEach(i => {
                conteo[i.productoNombre] = (conteo[i.productoNombre] || 0) + i.cantidad;
            }));
            const top = Object.entries(conteo).sort((a, b) => b[1] - a[1]).slice(3, 6);
            if (top.length === 0) {
                return { texto: 'Del podio no bajo más 😅 Ya te dije los 3 primeros. ¿Quieres que revisemos el stock de esos tres para que nunca falten?', tema: 'estrella' };
            }
            const medallas = ['4️⃣', '5️⃣', '6️⃣'];
            return {
                texto: `Los que vienen detrás del podio:\n\n${top.map(([n, cant], idx) => `${medallas[idx]} **${n}** (${cant} u.)`).join('\n')}\n\nOjo con ellos: a veces un puesto medio esconde al próximo estrella. 🌟`,
                tema: 'estrella',
            };
        }

        if (tema === 'stock') {
            const { productos } = await cargarDatos();
            const bajos = productos.filter(p => !p.esCompuesto && stockTotalProducto(p) <= p.stockMinimo).map(p => ({ p, s: stockTotalProducto(p) })).sort((a, b) => a.s - b.s);
            if (bajos.length === 0) {
                return { texto: 'Nada nuevo por acá: todo el inventario sigue en orden. ✅', tema: 'stock' };
            }
            return {
                texto: `En total son **${bajos.length} ${bajos.length === 1 ? 'producto' : 'productos'}** los que piden reposición, del más urgente al menos:\n\n${bajos.map(b => `• ${b.p.nombre} (${b.s <= 0 ? 'agotado 🚨' : `${b.s} restantes`})`).join('\n')}\n\nVe bajando la lista: así da menos pereza reponer. 📝`,
                tema: 'stock',
            };
        }

        if (tema === 'clientes') {
            const clientes = await db.clientes.toArray();
            const conDeuda = clientes.filter(c => c.saldoPendiente > 0).sort((a, b) => b.saldoPendiente - a.saldoPendiente);
            const resto = conDeuda.slice(5);
            if (resto.length === 0) {
                const total = conDeuda.reduce((s, c) => s + c.saldoPendiente, 0);
                return {
                    texto: `Eso es todo: ${conDeuda.length} ${conDeuda.length === 1 ? 'deudor' : 'deudores'} por **${fmtCUP(total)}** en total. ¿Empiezas por el más grande o por el más amable? 😄`,
                    tema: 'clientes',
                };
            }
            return {
                texto: `El resto de la libreta:\n\n${resto.map(c => `• ${c.nombre}: **${fmtCUP(c.saldoPendiente)}**`).join('\n')}`,
                tema: 'clientes',
            };
        }

        if (tema === 'gastos') {
            const gastos = await db.gastos.toArray();
            const ahora = new Date();
            const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1).getTime();
            const delMes = gastos.filter(g => new Date(g.fecha).getTime() >= inicioMes);
            const porCat: Record<string, number> = {};
            delMes.forEach(g => {
                porCat[g.categoria] = (porCat[g.categoria] || 0) + g.monto;
            });
            const top = Object.entries(porCat).sort((a, b) => b[1] - a[1]);
            const resto = top.slice(4);
            if (resto.length === 0) {
                return { texto: 'Eso es todo lo que tengo anotado del mes. No está mal… siempre que gastes menos de lo que entra. 😉', tema: 'gastos' };
            }
            return {
                texto: `Las demás categorías del mes:\n\n${resto.map(([cat, monto]) => `• ${cat}: **${fmtCUP(monto)}**`).join('\n')}`,
                tema: 'gastos',
            };
        }

        if (tema === 'cuadre') {
            const [ventasTodas, gastosTodos] = await Promise.all([db.ventas.toArray(), db.gastos.toArray()]);
            const hoy0 = new Date();
            hoy0.setHours(0, 0, 0, 0);
            const t0 = hoy0.getTime();
            const deHoy = ventasTodas.filter(v => v.estado === 'completada' && new Date(v.fecha).getTime() >= t0);
            if (deHoy.length === 0) {
                return { texto: 'Del cuadre no hay más que contar: todavía no entra ninguna venta hoy. 🧾', tema: 'cuadre' };
            }
            const porHora: Record<number, number> = {};
            deHoy.forEach(v => {
                const h = new Date(v.fecha).getHours();
                porHora[h] = (porHora[h] || 0) + v.total;
            });
            const horas = Object.entries(porHora).sort((a, b) => b[1] - a[1]).slice(0, 3);
            const gastosHoy = gastosTodos.filter(g => new Date(g.fecha).getTime() >= t0);
            const mayor = deHoy.reduce((a, b) => (b.total > a.total ? b : a));
            let texto = 'Más jugo al cuadre de hoy:\n\n';
            texto += `⏰ Tus horas más fuertes: ${horas.map(([h, t]) => `**${h}:00** (${fmtCUP(Number(t))})`).join(', ')}.\n`;
            texto += `🏆 La venta más gorda: ${fmtCUP(mayor.total)} a las ${new Date(mayor.fecha).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}.\n`;
            texto += gastosHoy.length
                ? `💸 Gastos de hoy: ${fmtCUP(gastosHoy.reduce((s, g) => s + g.monto, 0))} en ${gastosHoy.length} ${gastosHoy.length === 1 ? 'apunte' : 'apuntes'}.\n`
                : '💸 Hoy no has anotado ningún gasto: o vas limpio, o se te escapó alguno. 😉\n';
            texto += '\nRecuerda: el efectivo físico es el que manda — cuenta y compara. 🧾';
            return { texto, tema: 'cuadre' };
        }

        if (tema === 'mayoristas') {
            const m = await calcularMayoristas();
            const productos = await db.productos.toArray();
            const entradas = Object.entries(m.porProducto).sort((a, b) => b[1].monto - a[1].monto);
            if (entradas.length === 0) {
                return { texto: 'Del mayor no hay más que contar: sigo sin ver compras grandes en 30 días. 🤔', tema: 'mayoristas' };
            }
            const lista = entradas.map(([nombre, d]) => lineaMayorista(productos, nombre, d, false)).join('\n');
            const clientes = Object.entries(m.porCliente).sort((a, b) => b[1] - a[1]);
            return {
                texto: `Todo el detalle del mayor:\n\n${lista}\n\n${clientes.length ? `Y los compradores grandes:\n${clientes.map(([c, t]) => `• ${c}: ${fmtCUP(t)}`).join('\n')}` : 'Si anotas el nombre del cliente en la venta, te digo exactamente quién compra más por volumen 😉'}`,
                tema: 'mayoristas',
            };
        }

        if (tema === 'producto') {
            const nombre = memoria.ultimoProducto;
            if (!nombre) {
                return { texto: 'Dime primero qué producto quieres rascar: escríbeme su nombre (por ejemplo «precio del refresco») y te doy precio, stock y ventas. 😊', tema: 'producto' };
            }
            const productos = await db.productos.toArray();
            const prod = productos.find(p => p.nombre === nombre);
            if (!prod) {
                return { texto: `Ay, no encuentro «${nombre}» en tu inventario ahora mismo 🤔 ¿Lo escribí bien?`, tema: 'producto' };
            }
            const hoy0 = new Date();
            hoy0.setHours(0, 0, 0, 0);
            const t0 = hoy0.getTime();
            const dia = 86400000;
            const semanas: Array<{ etiqueta: string; uds: number }> = [
                { etiqueta: 'Esta semana', uds: 0 },
                { etiqueta: 'La semana pasada', uds: 0 },
                { etiqueta: 'Hace 2 semanas', uds: 0 },
                { etiqueta: 'Hace 3 semanas', uds: 0 },
            ];
            (await db.ventas.toArray()).filter(v => v.estado === 'completada').forEach(v => {
                const t = new Date(v.fecha).getTime();
                (v.items || []).forEach(i => {
                    if (i.productoNombre !== prod.nombre) return;
                    if (t >= t0 - 6 * dia) semanas[0].uds += i.cantidad;
                    else if (t >= t0 - 13 * dia) semanas[1].uds += i.cantidad;
                    else if (t >= t0 - 20 * dia) semanas[2].uds += i.cantidad;
                    else if (t >= t0 - 27 * dia) semanas[3].uds += i.cantidad;
                });
            });
            const max = Math.max(...semanas.map(s => s.uds), 1);
            const barras = semanas.map(s => `${s.etiqueta}: ${'█'.repeat(Math.max(s.uds > 0 ? 1 : 0, Math.round((s.uds / max) * 8)))} (${s.uds} uds)`).join('\n');
            const ritmo = semanas[0].uds > 0 && semanas[0].uds >= semanas[1].uds
                ? 'Va en ritmo de mantenerse o subir 📈'
                : semanas[0].uds < semanas[1].uds
                    ? 'Va más lento que la semana pasada 📉'
                    : 'Esta semana aún no arranca.';
            return { texto: `📊 **${prod.nombre}** — últimas 4 semanas:\n\n${barras}\n\n${ritmo}`, tema: 'producto' };
        }

        if (tema === 'notas') {
            if (memoria.notas.length === 0) {
                return { texto: 'Mi libreta está en blanco 📝 Dime «apunta que…» con lo que quieras recordar y lo guardo para siempre.', tema: 'notas' };
            }
            return {
                texto: `🧠 Todo lo que me has pedido recordar:\n\n${memoria.notas.slice(-10).reverse().map(n => `• ${n.texto} (${haceCuanto(n.fecha)})`).join('\n')}${memoria.notas.length > 10 ? `\n\n…y ${memoria.notas.length - 10} más.` : ''}\n\nY para borrarlo todo: «olvídate de todo». 🧹`,
                tema: 'notas',
            };
        }

        if (tema === 'consejo') {
            let idx = Math.floor(Math.random() * CONSEJOS.length);
            if (idx === memoria.ultimoConsejo) idx = (idx + 1) % CONSEJOS.length;
            memoria.ultimoConsejo = idx;
            guardarMemoria(memoria);
            return { texto: `Otro más, de los buenos:\n\n${CONSEJOS[idx]}`, tema: 'consejo' };
        }

        return {
            texto: alAzar([
                'Eso es lo que tengo por ahora. 😊 ¿Revisamos el inventario, las ventas de hoy o los fiados?',
                'De ahí no tengo más… pero sí de otras cosas: ¿vemos el stock, las ventas o los gastos?',
            ]),
            tema: 'otro',
        };
    };

    const analizar = async (pregunta: string): Promise<Respuesta> => {
        let q = normalizar(pregunta);

        // 🎯 Confirmación de acción pendiente
        if (accionPendienteRef.current) {
            const corta = q.split(' ').filter(Boolean).length <= 5;
            const confirma = corta && (q === 'si' || q === 'sí' || /^(dale|ok|okey|hazlo|adelante|confirmo|confirmar|si\s+dale|si\s+hazlo|va|listo|ejecuta|aplicalo)/.test(q));
            const cancela = corta && /^(no|cancela|cancelar|olvidalo|olvidate|mejor no|dejalo|nada|stop)/.test(q);

            if (confirma) {
                const acc = accionPendienteRef.current;
                accionPendienteRef.current = null;
                const result = await ejecutarAccion(acc);
                if (result.ok) {
                    memoria.accionesEjecutadas += 1;
                    guardarMemoria(memoria);
                }
                return { texto: result.mensaje, tema: result.tema };
            }
            if (cancela) {
                accionPendienteRef.current = null;
                return { texto: 'Vale, cancelado ✅ No toqué nada.', tema: 'otro' };
            }
            // Si no es ni sí ni no, limpiamos y seguimos con la nueva pregunta
            accionPendienteRef.current = null;
        }

        if (/\bclara\b/.test(q)) {
            const resto = q.replace(/\bclara\b/g, '').trim();
            if (resto.split(' ').filter(Boolean).length <= 1) {
                return {
                    texto: alAzar(['¿Dime? 👂 Aquí estoy, ¿qué necesitas?', 'Te escucho. ¿Qué revisamos hoy?', 'Presente. ¿Qué anda pasando en la tienda?']),
                    tema: 'otro',
                };
            }
            q = resto;
        }

        if (olvidoPendienteRef.current) {
            const corta = q.split(' ').filter(Boolean).length <= 5;
            const confirma = corta && (q === 'si' || /^(dale|ok|seguro|adelante|hazlo|borralo|borra|olvidalo|olvidate)/.test(q) || (/^si\b/.test(q) && /(olvid|borr|todo|hazlo|adelante|dale)/.test(q)));
            olvidoPendienteRef.current = false;
            if (confirma) {
                memoria.nombre = undefined;
                memoria.notas = [];
                memoria.frecuencia = {};
                memoria.ultimoConsejo = undefined;
                memoria.ultimoProducto = undefined;
                memoria.ultimoTema = 'otro';
                memoria.ultimoPeriodo = 'hoy';
                memoria.consultasProductos = {};
                memoria.clientesMencionados = {};
                memoria.chistesContados = [];
                memoria.recordatorios = [];
                memoria.accionesEjecutadas = 0;
                guardarMemoria(memoria);
                return {
                    texto: alAzar([
                        'Hecho: memoria en blanco 🧠✨ Como si nos conociéramos hoy mismo. ¿Empezamos de cero?',
                        'Listo, no me queda nada tuyo guardado 🧹 Tranquilo: tus ventas y tus datos siguen intactos — solo borré lo que me habías contado a mí.',
                    ]),
                    tema: 'otro',
                };
            }
        }

        // Guardar nombre
        const mNombre = pregunta.match(/(?:ll[aá]mame|me llamo)\s+([A-Za-zÁÉÍÓÚÑáéíóúñ]{2,})/);
        if (mNombre) {
            memoria.nombre = capital(mNombre[1].toLowerCase());
            guardarMemoria(memoria);
            return {
                texto: alAzar([
                    `**${capital(memoria.nombre)}**, ¿dices? Apuntado en mi libreta 📝 De ahora en adelante te llamo así, prometido.`,
                    `Un placer, **${capital(memoria.nombre)}** 😊 Y no se me olvida: recordar es mi superpoder 🧠`,
                ]),
                tema: 'notas',
            };
        }

        if (/(como me llamo|sabes mi nombre|cual es mi nombre|te sabes mi nombre)/.test(q)) {
            return {
                texto: memoria.nombre
                    ? alAzar([`Claro que sé cómo te llamas: **${capital(memoria.nombre)}** 😎 ¿Dudas de mí?`, `**${capital(memoria.nombre)}**. De mí no se escapa nada 🧠`])
                    : 'Aún no me lo has dicho 😅 Dime «llámame…» con el nombre que quieras y te guardo para siempre.',
                tema: 'notas',
            };
        }
        // 🎤 AGREGAR PRODUCTOS AL CARRITO POR VOZ/TEXTO
        if (/(vende(me)?|agrega|a[ñn]ade|mete|pon|echa)\b/.test(q) && /carrito|vende|agrega|a[ñn]ade|mete|pon|echa/.test(q)) {
            const items = parsearVentaAlCarrito(pregunta);
            if (items && items.length > 0) {
                const productos = await db.productos.toArray();
                const { resueltos, noEncontrados } = emparejarProductos(items, productos);

                if (resueltos.length === 0) {
                    return {
                        texto: `Mmm, no encontré esos productos en tu inventario 🤔\n\n${noEncontrados.map(n => `• ${n}`).join('\n')}\n\nPrueba con el nombre exacto tal como lo tienes en **Categorías**.`,
                        tema: 'otro',
                    };
                }

                const itemsCarrito: ItemParaCarrito[] = resueltos.map(r => ({
                    productoId: r.producto.id,
                    cantidad: r.cantidad,
                }));

                enviarAlCarrito(itemsCarrito);

                const lista = resueltos.map(r => {
                    const stock = stockTotalProducto(r.producto);
                    const aviso = r.cantidad > stock ? ` ⚠️ (solo hay ${stock})` : '';
                    return `• **${r.cantidad}×** ${r.producto.nombre}${aviso}`;
                }).join('\n');

                const avisoNoEnc = noEncontrados.length > 0
                    ? `\n\n⚠️ No encontré: ${noEncontrados.join(', ')}`
                    : '';

                return {
                    texto: `✅ **Agregado al carrito:**\n\n${lista}${avisoNoEnc}\n\nAbre **Nueva Venta** para cobrar. 🛒`,
                    tema: 'otro',
                };
            }
        }


        // 🎯 DETECCIÓN DE ACCIONES
        const accion = detectarAccion(pregunta);
        if (accion) {
            accionPendienteRef.current = accion;
            let respuesta = accion.resumen;
            if (accion.advertencias && accion.advertencias.length > 0) {
                respuesta += `\n\n${accion.advertencias.join('\n')}`;
            }
            respuesta += `\n\nResponde **«sí»** para confirmar, o **«cancela»** para dejarlo.`;
            return { texto: respuesta, tema: 'otro' };
        }

        // ⏰ Recordatorios
        if (/(recuerdame|recuérdame|avisame|avísame|recordarme)/.test(q)) {
            const r = parsearRecordatorio(pregunta);
            if (r) {
                const rec: Recordatorio = {
                    id: Date.now(),
                    texto: r.texto,
                    dispararEn: r.cuando,
                    creadoEn: Date.now(),
                    disparado: false,
                };
                memoria.recordatorios.push(rec);
                const corte = Date.now() - 7 * 86_400_000;
                memoria.recordatorios = memoria.recordatorios.filter(x => !x.disparado || x.dispararEn > corte);
                guardarMemoria(memoria);
                pedirPermisoNotificaciones();
                const cuando = formatearCuando(r.cuando);
                return {
                    texto: `⏰ Listo. Te aviso **${cuando}**: «${r.texto}».\n\nSi quieres verlos todos, dime «mis recordatorios».`,
                    tema: 'notas',
                };
            }
        }

        if (/(mis recordatorios|que recordatorios|ver recordatorios|tengo recordatorios|proximos recordatorios|recordatorios pendientes)/.test(q)) {
            const pendientes = memoria.recordatorios
                .filter(r => !r.disparado && r.dispararEn > Date.now())
                .sort((a, b) => a.dispararEn - b.dispararEn);
            if (pendientes.length === 0) {
                return {
                    texto: 'No tienes recordatorios pendientes ⏰ Dime por ejemplo:\n\n• «Recuérdame a las 8 cuadrar la caja»\n• «Avísame mañana a las 9 que llega el proveedor»\n• «Recuérdame en 30 minutos sacar el pan del horno»',
                    tema: 'notas',
                };
            }
            const lista = pendientes.map(r => `• **${formatearCuando(r.dispararEn)}** — ${r.texto}`).join('\n');
            return {
                texto: `⏰ Tienes **${pendientes.length} ${pendientes.length === 1 ? 'recordatorio' : 'recordatorios'}** pendiente${pendientes.length === 1 ? '' : 's'}:\n\n${lista}\n\nSi quieres borrarlos todos, dime «borra los recordatorios».`,
                tema: 'notas',
            };
        }

        if (/(borra|cancel|quita|elimina)\s+(los?\s+|todos\s+los?\s+)?recordatorios?/.test(q)) {
            memoria.recordatorios = [];
            guardarMemoria(memoria);
            return {
                texto: '🧹 Hecho, borré todos los recordatorios. Los avisos ya disparados también quedaron limpios.',
                tema: 'notas',
            };
        }

        // 📤 Reporte diario
        if (/(reporte|informe|resumen para enviar|resumen del dia|pasame el dia|cierre para enviar|compartir el dia)/.test(q)) {
            const rep = await generarReporteDiario();
            // Intentar copiar al portapapeles
            let copiado = false;
            try {
                await navigator.clipboard.writeText(rep);
                copiado = true;
            } catch { /* noop */ }
            return {
                texto: `${rep}\n\n${copiado ? '📋 **Copiado al portapapeles** — pégalo en WhatsApp o donde quieras.' : '💡 Selecciona el texto de arriba y cópialo para compartirlo.'}`,
                tema: 'resumen',
            };
        }

        // 🔮 Predicción del mes
        if (/(voy a cerrar|cerrar el mes|proyeccion|proyeccion del mes|vamos a cerrar|como voy a terminar)/.test(q)) {
            const pred = await predecirCierreMes();
            return { texto: pred, tema: 'resumen' };
        }

        // 📅 Mejor día
        if (/(mejor dia|peor dia|que dia vendo mas|cual es mi mejor dia|dia de la semana)/.test(q)) {
            const txt = await analizarMejorDia();
            return { texto: txt, tema: 'resumen' };
        }

        // Apuntar nota
        if (/(apuntame|apunta|anota|recuerdame|acuerdate|recuerda que|nota)/.test(q)) {
            let nota = pregunta.trim();
            const idxDos = nota.indexOf(':');
            if (idxDos >= 0 && idxDos < 40) {
                nota = nota.slice(idxDos + 1);
            } else {
                nota = nota.replace(/^\s*(?:oye\s+|clara,?\s+|hey,?\s+|por favor\s+)?(?:ap[uú]nta\w*|anota\w*|recu[eé]rda\w*|ac[uú]erda\w*|nota\w*)\s*(?:que\s+|de\s+|:)?\s*/i, '');
                nota = nota.replace(/^(?:que|de)\s+/i, '');
            }
            nota = nota.trim();
            if (!nota) {
                return { texto: '¿Y qué quiero apuntar? 😄 Dime por ejemplo: «apunta: el viernes llega el camión de harina» 📝', tema: 'notas' };
            }
            memoria.notas.push({ id: Date.now(), texto: capital(nota), fecha: Date.now() });
            if (memoria.notas.length > 50) memoria.notas = memoria.notas.slice(-50);
            guardarMemoria(memoria);
            return {
                texto: alAzar([
                    `📝 Hecho: «${capital(nota)}». Me lo guardo para siempre — hasta que me digas «olvídate de todo».`,
                    `Anotado ✅ «${capital(nota)}». De mí no se escapa nada 😎`,
                    `Recibido 📝 «${capital(nota)}». Cuando quieras repasarlo, dime «¿qué recuerdas?» y te lo paso.`,
                ]),
                tema: 'notas',
            };
        }

        // Ver memoria
        if (/(que recuerdas|que sabes de mi|mis notas|que te apunt|tu memoria|que te he pedido|que sabes sobre mi)/.test(q)) {
            let texto = `🧠 Lo que recuerdo de ti:\n\n`;
            texto += `• Nos hemos charlado **${memoria.visitas} ${memoria.visitas === 1 ? 'vez' : 'veces'}**${memoria.ultimaVisita ? ` — la última fue ${haceCuanto(memoria.ultimaVisita)}` : ''}.\n`;
            if (memoria.nombre) texto += `• Te gusta que te llame **${capital(memoria.nombre)}**.\n`;
            if (memoria.accionesEjecutadas > 0) texto += `• Has dejado que te eche una mano **${memoria.accionesEjecutadas} ${memoria.accionesEjecutadas === 1 ? 'vez' : 'veces'}** 🎯\n`;
            const fav = Object.entries(memoria.frecuencia).sort((a, b) => b[1] - a[1])[0];
            if (fav && fav[1] >= 2 && TEMA_FAVORITO[fav[0] as Tema]) {
                texto += `• Y por lo visto, tu tema favorito es ${TEMA_FAVORITO[fav[0] as Tema]} 😉\n`;
            }
            texto += memoria.notas.length
                ? `\n📝 Tus notas:\n${memoria.notas.slice(-8).reverse().map(n => `• ${n.texto} (${haceCuanto(n.fecha)})`).join('\n')}${memoria.notas.length > 8 ? `\n…y ${memoria.notas.length - 8} más.` : ''}`
                : '\n📝 Todavía no me has apuntado nada: dime «apunta que…» y lo guardo.';

            const recPend = memoria.recordatorios
                .filter(r => !r.disparado && r.dispararEn > Date.now())
                .sort((a, b) => a.dispararEn - b.dispararEn);
            if (recPend.length > 0) {
                texto += `\n\n⏰ Y tienes **${recPend.length} ${recPend.length === 1 ? 'recordatorio' : 'recordatorios'}** pendiente${recPend.length === 1 ? '' : 's'}:\n${recPend.slice(0, 5).map(r => `• ${formatearCuando(r.dispararEn)} — ${r.texto}`).join('\n')}${recPend.length > 5 ? `\n…y ${recPend.length - 5} más.` : ''}`;
            }

            texto += `\n\nY para que lo borre todo: «olvídate de todo». 🧹`;
            return { texto, tema: 'notas' };
        }

        // Olvidar
        if (/(olvid|borr)[a-z]*\s+(de\s+)?(todo|la memoria|las notas|mi nombre)/.test(q)) {
            olvidoPendienteRef.current = true;
            return {
                texto: '¿Seguro? 🧠⚠️ Se borra TODO lo que sé de ti: tu nombre, tus notas, tus recordatorios, cuántas veces hemos charlado…\n\nSi estás seguro, responde **«sí, olvídate de todo»**.',
                tema: 'notas',
            };
        }

        // Seguimientos
        const esCorta = q.split(' ').filter(Boolean).length <= 4;
        if (esCorta && memoria.ultimoTema !== 'otro') {
            if (/^(y |que )?(cuentame mas|cuentalo mas|dime mas|mas|sigue|que mas|y que|y luego|y despues)/.test(q)) {
                return await detalleExtra(memoria.ultimoTema);
            }
            if (memoria.ultimoTema === 'resumen' && /(ayer|semana)/.test(q)) {
                return await responderResumen(periodoDesde(q));
            }
        }

        const intencion = detectarIntencion(q);

        switch (intencion) {
            case 'saludo': {
                const nombre = usuarioActual.nombre.split(' ')[0];
                return {
                    texto: alAzar([
                        `¡${saludoSegunHora()}, ${nombre}! 😊 ¿Cómo va todo por ahí?`,
                        `¡Hola, ${nombre}! Qué bueno verte por aquí. ¿Qué revisamos hoy?`,
                        `Aquí Clara, lista y con tus números fresquitos. ¿Por dónde empezamos, ${nombre}?`,
                    ]),
                    tema: 'otro',
                };
            }

            case 'estado':
                return {
                    texto: alAzar([
                        '¡De maravilla! Con energía de sobra y todos tus datos al día. 😄 ¿Y tú, cómo va?',
                        'Aquí sigo, pendiente de tu negocio como siempre. ¿Qué te reviso hoy?',
                        '¡Excelente! Sobre todo porque tú estás moviendo la tienda. ¿Te ayudo con algo?',
                    ]),
                    tema: 'otro',
                };

            case 'quien_eres':
                return {
                    texto: 'Soy **Clara**, tu copiloto en CuentaClara. 🙋\n\nVivo aquí mismo, en tu dispositivo — no gasto internet ni mando tus datos a ninguna parte 🔒 — y sé de memoria tus ventas, tu inventario, tu caja y hasta quién te debe.\n\n**Y además puedo hacer cosas por ti**: crear productos, apuntar gastos, cobrar fiados, cambiar precios, ajustar stock… todo con confirmación previa. 🎯\n\nHáblame normal, como a una amiga. Si quieres ver todo lo que sé hacer, toca **«🤔 ¿Qué puedo hacer?»**.',
                    tema: 'otro',
                };

            case 'ayuda':
                return { texto: CAPACIDADES, tema: 'otro' };

            case 'resumen':
                return await responderResumen(periodoDesde(q));

            case 'cuadre':
                return await responderCuadre();

            case 'mayoristas':
                return await responderMayoristas();

            case 'mes':
                return await responderResumen('mes');

            case 'ganancia':
                return await responderGanancia();

            case 'hora': {
                const ahora = new Date();
                const extra = ahora.getDay() === 5
                    ? '\n\n¡Viernes! Buen día para dejar el stock listo para el fin de semana 📦'
                    : ahora.getDay() === 1
                        ? '\n\nLunes: la semana se gana desde temprano 💪'
                        : '';
                return {
                    texto: `Ahora mismo son las **${horaAhora()}** y hoy es ${capital(ahora.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' }))}.${extra}`,
                    tema: 'otro',
                };
            }

            case 'animo': {
                const ventasTodas = (await db.ventas.toArray()).filter(v => v.estado === 'completada');
                const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
                const total = ventasTodas.filter(v => new Date(v.fecha).getTime() >= inicioMes).reduce((s, v) => s + v.total, 0);
                const dato = total > 0 ? `\n\nY por si no lo sabías: este mes ya llevas **${fmtCUP(total)}** en ventas. Eso no lo hizo la suerte — lo hiciste tú. 💪` : '';
                return {
                    texto: alAzar([
                        'Te entiendo… llevar un negocio no es fácil, y menos cuando nadie ve lo que cuesta por dentro 🤗',
                        'Respira. Los días difíciles son los que más enseñan — y tú llevas más bolas en el aire de las que crees 🤗',
                        'Ánimo. Lo que se logra con esfuerzo se disfruta doble 😌',
                    ]) + dato,
                    tema: 'otro',
                };
            }

            case 'stock': {
                const prodStock = await buscarProducto(q);
                if (prodStock) return await responderProducto(prodStock);
                return await responderStock();
            }

            case 'estrella':
                return await responderEstrella();

            case 'clientes':
                return await responderClientes();

            case 'gastos':
                return await responderGastos();

            case 'consejo': {
                let idx = Math.floor(Math.random() * CONSEJOS.length);
                if (idx === memoria.ultimoConsejo) idx = (idx + 1) % CONSEJOS.length;
                memoria.ultimoConsejo = idx;
                guardarMemoria(memoria);
                return {
                    texto: `${alAzar(['A ver, un consejito para la colección:', 'Ojo, este me gusta mucho:', 'Te tengo uno que funciona de verdad:'])}\n\n${CONSEJOS[idx]}\n\n¿Otro? Cuando quieras, aquí estoy. 😊`,
                    tema: 'consejo',
                };
            }

            case 'carrito':
                return {
                    texto: 'El carrito de la venta que tienes abierta lo ves en el panel derecho de **Nueva Venta**: ahí van cayendo los productos, las cantidades y el total en vivo.\n\nYo de ahí no me meto… todavía. 😄',
                    tema: 'otro',
                };

            case 'chiste': {
                let disponibles = CHISTES.map((_, i) => i).filter(i => !memoria.chistesContados.includes(i));
                if (disponibles.length === 0) {
                    memoria.chistesContados = [];
                    disponibles = CHISTES.map((_, i) => i);
                }
                const elegido = alAzar(disponibles);
                memoria.chistesContados.push(elegido);
                guardarMemoria(memoria);
                return { texto: CHISTES[elegido], tema: 'otro' };
            }

            case 'elogio':
                return {
                    texto: alAzar([
                        'Ayyy, me sonrojo… 🙈 Pero ojo, que el que está haciendo el trabajo duro eres tú. ¡Sigue así!',
                        '¡Gracias! Me guardo ese elogio para los días de mucho inventario. Y tú también lo estás haciendo muy bien. 😊',
                        'Ji ji, qué cariñoso… Por eso me da gusto cuadrarte los números. 💜',
                    ]),
                    tema: 'otro',
                };

            case 'gracias':
                return {
                    texto: alAzar([
                        '¡Para eso estoy! 😄 Aquí me tienes cuando me necesites.',
                        '¡Con gusto! Ahora déjame tranquila que sigo vigilando la caja. 😌',
                        'De nada, de nada. ¿Otra cosa? Estoy aquí. 💜',
                    ]),
                    tema: 'otro',
                };

            case 'despedida':
                return {
                    texto: alAzar([
                        '¡Hasta pronto! Ciérrame cuando quieras, aquí me quedo cuidando la caja. 👋',
                        '¡Nos vemos! Y que entren muchas ventas. 💰',
                        'Descansa. Mañana sigo aquí, con las pilas puestas — y con todo lo que me contaste guardado 🧠. 😴',
                        '¡Nos vemos! Si no lo hiciste, pasa por el **cuadre de caja** antes de cerrar. 🧾',
                    ]),
                    tema: 'otro',
                };
        }

        const prodMencionado = await buscarProducto(q);
        if (prodMencionado) {
            return await responderProducto(prodMencionado);
        }

        return {
            texto: alAzar([
                'Mmm… esa se me escapó 🤔 ¿Me la explicas de otra forma? Puedo hablar de ventas, caja, mayoristas, inventario, fiados, gastos… o darte un consejo. Toca **«🤔 ¿Qué puedo hacer?»** para la lista completa.',
                'Uy, esa no la tengo en mi repertorio todavía 😅 Prueba con «¿cómo voy hoy?», «cuadre de caja», «mayoristas» o «¿quién me debe?». O toca **«🤔 ¿Qué puedo hacer?»** para ver todo.',
                'No estoy segura de haber entendido 🤭 Háblame de tu negocio: ventas, cuadre, stock, deudas, ganancia… O pulsa **«🤔 ¿Qué puedo hacer?»** y te refresco la lista.',
            ]),
            tema: 'otro',
        };
    };

    // ── Interfaz ──

    return (
        <>
            {abierto && overlayActivo && (
                <div
                    className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm"
                    onClick={cerrarSeguro}
                    onPointerDown={(e) => e.stopPropagation()}
                />
            )}

            <div
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                style={{
                    transform: abierto ? 'translateX(0)' : 'translateX(100%)',
                    transition: 'transform 0.3s ease-out',
                    willChange: 'transform',
                }}
                className="fixed top-0 right-0 bottom-0 z-50 flex w-[min(420px,100vw)] flex-col border-l border-white/10 bg-slate-900 shadow-2xl"
            >
                <div className="flex items-center gap-3 border-b border-white/10 p-4">
                    <div className="relative flex h-12 w-12 shrink-0 items-center justify-center">
                        {hablando && <span className="absolute inset-0 animate-ping rounded-full bg-violet-500/40" />}
                        <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-700 text-lg font-black text-white shadow-md">
                            C
                            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-slate-900 bg-emerald-400" title="en línea" />
                        </div>
                    </div>
                    <div className="min-w-0 flex-1">
                        <h3 className="text-base font-black text-gray-100">
                            Clara{' '}
                            <span className="ml-1 text-[10px] font-bold uppercase tracking-wide text-emerald-400">en línea</span>
                        </h3>
                        <p className="truncate text-[11px] text-gray-400">
                            {hablando ? '🔊 hablando…' : escribiendo ? '✍️ escribiendo…' : '🎯 ahora ejecuto acciones · 🧠 recuerdo'}
                        </p>
                    </div>
                    {soportaVoz() && (
                        <button
                            onClick={alternarVoz}
                            className={`rounded-lg p-2 text-lg transition-colors hover:bg-white/5 ${vozOn ? 'text-violet-300' : 'text-gray-500'}`}
                            aria-label={vozOn ? 'Apagar la voz' : 'Escuchar a Clara'}
                        >
                            {vozOn ? '🔊' : '🔇'}
                        </button>
                    )}
                    <button onClick={onCerrar} className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-white/5 hover:text-gray-100" aria-label="Cerrar">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                            <path d="M6 6l12 12M18 6L6 18" />
                        </svg>
                    </button>
                </div>

                <div ref={chatRef} className="flex-1 space-y-3 overflow-y-auto p-4">
                    {mensajes.map(m => (
                        <div key={m.id} className={`flex items-end gap-2 ${m.de === 'me' ? 'justify-end' : ''}`}>
                            {m.de === 'bot' && (
                                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-700 text-[10px] font-black text-white">
                                    C
                                </div>
                            )}
                            <div className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${m.de === 'bot' ? 'rounded-bl-sm bg-slate-800/80 text-gray-100' : 'ml-auto rounded-br-sm bg-gradient-to-br from-violet-600 to-indigo-700 font-semibold text-white'}`}>
                                <div dangerouslySetInnerHTML={{ __html: formatear(m.texto) }} />
                                <div className={`mt-1 text-right text-[10px] ${m.de === 'bot' ? 'text-gray-500' : 'text-white/60'}`}>
                                    {m.hora}
                                </div>
                            </div>
                        </div>
                    ))}

                    {escribiendo && (
                        <div className="flex items-end gap-2">
                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-700 text-[10px] font-black text-white">
                                C
                            </div>
                            <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-sm bg-slate-800/80 px-4 py-3">
                                <span className="h-2 w-2 animate-bounce rounded-full bg-violet-400" style={{ animationDelay: '0ms' }} />
                                <span className="h-2 w-2 animate-bounce rounded-full bg-violet-400" style={{ animationDelay: '150ms' }} />
                                <span className="h-2 w-2 animate-bounce rounded-full bg-violet-400" style={{ animationDelay: '300ms' }} />
                                <span className="ml-1 text-[11px] italic text-gray-400">{frasePensando}</span>
                            </div>
                        </div>
                    )}

                    {escuchando && (
                        <div className="flex w-fit items-center gap-2 rounded-full bg-red-500/10 px-4 py-2 text-xs font-semibold text-red-300">
                            <span className="relative flex h-2.5 w-2.5">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
                            </span>
                            Te escucho… habla cuando quieras
                        </div>
                    )}
                </div>

                <div className="flex flex-wrap gap-2 border-t border-white/10 px-4 py-3">
                    {SUGERENCIAS.map(s => (
                        <button
                            key={s.q}
                            onClick={() => manejarSugerencia(s.q)}
                            disabled={escribiendo || escuchando}
                            className="w-full rounded-xl border border-violet-400/30 bg-gradient-to-r from-violet-500/15 to-indigo-500/10 px-4 py-2.5 text-sm font-black text-violet-200 transition-colors hover:border-violet-400/60 hover:bg-violet-500/25 disabled:opacity-40"
                        >
                            {s.label}
                        </button>
                    ))}
                </div>

                <div className="flex gap-2 border-t border-white/10 p-3">
                    {soportaMicrofono() && (
                        <button
                            onClick={iniciarEscucha}
                            disabled={escribiendo}
                            aria-label={escuchando ? 'Detener la escucha' : 'Hablar con Clara'}
                            className={`flex h-10 w-11 shrink-0 items-center justify-center rounded-xl border transition-colors disabled:opacity-40 ${escuchando ? 'border-red-400/50 bg-red-500/20 text-red-300' : 'border-white/10 bg-slate-800/60 text-gray-300 hover:text-violet-200'}`}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                                <path d="M12 19v4" />
                            </svg>
                        </button>
                    )}
                    <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') enviar(); }}
                        placeholder={escuchando ? 'Escuchando…' : 'Escríbeme o pulsa el micro…'}
                        className="flex-1 rounded-xl border border-white/10 bg-slate-800/60 px-4 py-2.5 text-sm text-gray-100 outline-none placeholder:text-gray-500 focus:border-violet-400/60"
                    />
                    <button
                        onClick={() => enviar()}
                        disabled={!input.trim() || escribiendo}
                        className="flex h-10 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-700 text-white shadow-md transition-transform hover:-translate-y-0.5 disabled:opacity-40 disabled:hover:translate-y-0"
                        aria-label="Enviar"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 11l18-7-7 18-2.6-7.4z" />
                        </svg>
                    </button>
                </div>
            </div>
        </>
    );
}