import { db } from '../db';
import type { ProyectoMigracion, ProductoMigracion } from '../db';
import type { JSONExportable } from '../migracion/types';
import { parsearJSONSeguro } from './importarJSON';

// ============ EXPORTAR ============
export function proyectoAJSON(proyecto: ProyectoMigracion): JSONExportable {
    // Detectar categorías usadas en productos (por si acaso)
    const catsUsadas = new Set(proyecto.productos.map(p => p.categoria));
    const categorias = proyecto.categorias.length > 0
        ? proyecto.categorias
        : Array.from(catsUsadas).map(nombre => ({ nombre }));

    return {
        version: 1,
        categorias,
        productos: proyecto.productos,
    };
}

export function descargarProyectoJSON(proyecto: ProyectoMigracion) {
    const json = JSON.stringify(proyectoAJSON(proyecto), null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const nombreSeguro = proyecto.nombreCliente
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
    a.href = url;
    a.download = `productos_${nombreSeguro || 'cliente'}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

export async function copiarProyectoJSON(proyecto: ProyectoMigracion): Promise<boolean> {
    try {
        const json = JSON.stringify(proyectoAJSON(proyecto), null, 2);
        await navigator.clipboard.writeText(json);
        return true;
    } catch {
        return false;
    }
}

// ============ IMPORTAR PROYECTO (JSON existente) ============
export function parsearProyectoDesdeJSON(texto: string):
    | { ok: true; proyecto: Omit<ProyectoMigracion, 'id'> }
    | { ok: false; error: string } {

    const parsed = parsearJSONSeguro(texto);
    if (!parsed.ok) return { ok: false, error: parsed.error };

    const datos = parsed.datos;
    if (!datos || typeof datos !== 'object') {
        return { ok: false, error: 'El JSON no es un objeto válido' };
    }
    if (!Array.isArray(datos.productos)) {
        return { ok: false, error: 'Falta el array "productos"' };
    }

    const productos: ProductoMigracion[] = datos.productos.map((p: any) => ({
        nombre: String(p?.nombre ?? '').trim(),
        categoria: String(p?.categoria ?? '').trim(),
        precioVenta: Number(p?.precioVenta) || 0,
        precioCompra: p?.precioCompra !== undefined ? Number(p.precioCompra) : undefined,
        stockActual: p?.stockActual !== undefined ? Number(p.stockActual) : undefined,
        stockMinimo: p?.stockMinimo !== undefined ? Number(p.stockMinimo) : undefined,
        codigoBarras: p?.codigoBarras ? String(p.codigoBarras).trim() : undefined,
        unidadMedida: p?.unidadMedida ? String(p.unidadMedida).trim() : undefined,
        descripcion: p?.descripcion ? String(p.descripcion).trim() : undefined,
        fechaVencimiento: p?.fechaVencimiento ? String(p.fechaVencimiento) : undefined,
        lote: p?.lote ? String(p.lote).trim() : undefined,
        numeroSerie: p?.numeroSerie ? String(p.numeroSerie).trim() : undefined,
    }));

    const categorias = Array.isArray(datos.categorias)
        ? datos.categorias.map((c: any) => ({
            nombre: String(c?.nombre ?? '').trim(),
            descripcion: c?.descripcion ? String(c.descripcion).trim() : undefined,
        })).filter((c: any) => c.nombre)
        : [];

    // Si no vinieron categorías declaradas, las deducimos de los productos
    const cats = new Set(categorias.map((c: any) => c.nombre));
    productos.forEach(p => { if (p.categoria && !cats.has(p.categoria)) cats.add(p.categoria); });
    const categoriasFinales = Array.from(cats).map(nombre => {
        const encontrada = categorias.find((c: any) => c.nombre === nombre);
        return encontrada ?? { nombre };
    });

    return {
        ok: true,
        proyecto: {
            nombreCliente: 'Proyecto importado',
            fechaCreacion: new Date(),
            fechaModificacion: new Date(),
            estado: 'borrador',
            origen: 'json-externo',
            categorias: categoriasFinales,
            productos,
            notas: '',
        },
    };
}

// ============ PEGADO MASIVO ============
export interface ResultadoPegado {
    filas: string[][];
    separador: 'tab' | 'coma' | 'punto-y-coma' | 'pipe' | 'desconocido';
    totalFilas: number;
}

export function analizarPegado(texto: string): ResultadoPegado {
    const lineas = texto
        .split(/\r?\n/)
        .map(l => l.trimEnd())
        .filter(l => l.trim().length > 0);

    if (lineas.length === 0) {
        return { filas: [], separador: 'desconocido', totalFilas: 0 };
    }

    // Detectar separador más probable
    const muestra = lineas.slice(0, 5).join('\n');
    const conteos = {
        tab: (muestra.match(/\t/g) || []).length,
        coma: (muestra.match(/,/g) || []).length,
        'punto-y-coma': (muestra.match(/;/g) || []).length,
        pipe: (muestra.match(/\|/g) || []).length,
    };
    const max = Math.max(conteos.tab, conteos.coma, conteos['punto-y-coma'], conteos.pipe);
    let separador: ResultadoPegado['separador'] = 'desconocido';
    let regex: RegExp = /\t/;
    if (max === 0) {
        separador = 'desconocido';
    } else if (conteos.tab === max) {
        separador = 'tab';
        regex = /\t/;
    } else if (conteos['punto-y-coma'] === max) {
        separador = 'punto-y-coma';
        regex = /;/;
    } else if (conteos.pipe === max) {
        separador = 'pipe';
        regex = /\|/;
    } else {
        separador = 'coma';
        regex = /,/;
    }

    const filas = lineas.map(l => l.split(regex).map(c => c.trim()));
    return { filas, separador, totalFilas: filas.length };
}

export function filasAProductos(
    filas: string[][],
    mapeo: { [campo: string]: number }
): ProductoMigracion[] {
    return filas.map(fila => {
        const get = (campo: string): string | undefined => {
            const idx = mapeo[campo];
            if (idx === undefined || idx < 0) return undefined;
            return fila[idx]?.trim() || undefined;
        };
        const getNum = (campo: string): number | undefined => {
            const v = get(campo);
            if (!v) return undefined;
            // Acepta "1,50" y "1.50"
            const n = Number(v.replace(',', '.'));
            return isNaN(n) ? undefined : n;
        };

        const p: ProductoMigracion = {
            nombre: get('nombre') ?? '',
            categoria: get('categoria') ?? '',
            precioVenta: getNum('precioVenta') ?? 0,
            precioCompra: getNum('precioCompra'),
            stockActual: getNum('stockActual'),
            stockMinimo: getNum('stockMinimo'),
            codigoBarras: get('codigoBarras'),
            unidadMedida: get('unidadMedida') ?? 'Unidad',
            descripcion: get('descripcion'),
            fechaVencimiento: get('fechaVencimiento'),
            lote: get('lote'),
            numeroSerie: get('numeroSerie'),
        };
        return p;
    }).filter(p => p.nombre || p.categoria || p.precioVenta);
}

// ============ CRUD PROYECTOS ============
export async function crearProyecto(
    nombreCliente: string,
    origen: ProyectoMigracion['origen']
): Promise<number> {
    return await db.proyectosMigracion.add({
        nombreCliente: nombreCliente.trim() || 'Cliente sin nombre',
        fechaCreacion: new Date(),
        fechaModificacion: new Date(),
        estado: 'borrador',
        origen,
        categorias: [],
        productos: [],
        notas: '',
    });
}

export async function guardarProyecto(proyecto: ProyectoMigracion): Promise<void> {
    if (!proyecto.id) return;
    await db.proyectosMigracion.update(proyecto.id, {
        ...proyecto,
        fechaModificacion: new Date(),
    });
}

export async function eliminarProyecto(id: number): Promise<void> {
    await db.proyectosMigracion.delete(id);
}

export async function duplicarProyecto(id: number): Promise<number | null> {
    const orig = await db.proyectosMigracion.get(id);
    if (!orig) return null;
    const { id: _, ...resto } = orig;
    return await db.proyectosMigracion.add({
        ...resto,
        nombreCliente: `${orig.nombreCliente} (copia)`,
        fechaCreacion: new Date(),
        fechaModificacion: new Date(),
        estado: 'borrador',
    });
}

// ============ HELPERS DE CATEGORÍAS ============
export function extraerCategoriasDeProductos(productos: ProductoMigracion[]): { nombre: string; descripcion?: string }[] {
    const set = new Set<string>();
    productos.forEach(p => { if (p.categoria) set.add(p.categoria); });
    return Array.from(set).map(nombre => ({ nombre }));
}

export function sincronizarCategorias(proyecto: ProyectoMigracion): ProyectoMigracion {
    const usadas = extraerCategoriasDeProductos(proyecto.productos);
    const existentes = new Map(proyecto.categorias.map(c => [c.nombre, c]));
    const finales = usadas.map(u => existentes.get(u.nombre) ?? u);
    return { ...proyecto, categorias: finales };
}
// ============ VALIDACIÓN DEL PROYECTO ============
export interface ValidacionProyecto {
    valido: boolean;
    totalProductos: number;
    totalCategorias: number;
    errores: string[];
    advertencias: string[];
    duplicadosCodigo: { codigo: string; productos: string[] }[];
    duplicadosNombre: { nombre: string; filas: number[] }[];
    sinCategoria: number[];
    sinPrecio: number[];
    codigosInvalidos: number[];
}

export function validarProyecto(proyecto: ProyectoMigracion): ValidacionProyecto {
    const errores: string[] = [];
    const advertencias: string[] = [];
    const codigosMap = new Map<string, string[]>();
    const nombresMap = new Map<string, number[]>();
    const sinCategoria: number[] = [];
    const sinPrecio: number[] = [];
    const codigosInvalidos: number[] = [];

    if (proyecto.productos.length === 0) {
        errores.push('El proyecto no tiene productos');
    }
    if (!proyecto.nombreCliente.trim()) {
        errores.push('Falta el nombre del cliente');
    }

    proyecto.productos.forEach((p, idx) => {
        // Categoría
        if (!p.categoria?.trim()) sinCategoria.push(idx + 1);
        // Precio
        if (!p.precioVenta || p.precioVenta <= 0) sinPrecio.push(idx + 1);
        // Código de barras duplicado
        if (p.codigoBarras?.trim()) {
            const cod = p.codigoBarras.trim();
            if (!codigosMap.has(cod)) codigosMap.set(cod, []);
            codigosMap.get(cod)!.push(p.nombre || `Fila ${idx + 1}`);
            // Solo dígitos (o aceptar EAN/UPC que son numéricos)
            if (!/^\d+$/.test(cod)) codigosInvalidos.push(idx + 1);
        }
        // Nombre duplicado
        if (p.nombre?.trim()) {
            const key = p.nombre.trim().toLowerCase();
            if (!nombresMap.has(key)) nombresMap.set(key, []);
            nombresMap.get(key)!.push(idx + 1);
        }
    });

    const duplicadosCodigo = Array.from(codigosMap.entries())
        .filter(([_, arr]) => arr.length > 1)
        .map(([codigo, productos]) => ({ codigo, productos }));

    const duplicadosNombre = Array.from(nombresMap.entries())
        .filter(([_, filas]) => filas.length > 1)
        .map(([nombre, filas]) => ({ nombre, filas }));

    if (sinCategoria.length > 0) {
        advertencias.push(`${sinCategoria.length} producto${sinCategoria.length !== 1 ? 's' : ''} sin categoría`);
    }
    if (sinPrecio.length > 0) {
        advertencias.push(`${sinPrecio.length} producto${sinPrecio.length !== 1 ? 's' : ''} sin precio válido`);
    }
    if (duplicadosCodigo.length > 0) {
        advertencias.push(`${duplicadosCodigo.length} código${duplicadosCodigo.length !== 1 ? 's' : ''} de barras duplicado${duplicadosCodigo.length !== 1 ? 's' : ''}`);
    }
    if (duplicadosNombre.length > 0) {
        advertencias.push(`${duplicadosNombre.length} nombre${duplicadosNombre.length !== 1 ? 's' : ''} duplicado${duplicadosNombre.length !== 1 ? 's' : ''}`);
    }
    if (codigosInvalidos.length > 0) {
        advertencias.push(`${codigosInvalidos.length} código${codigosInvalidos.length !== 1 ? 's' : ''} con formato no numérico`);
    }

    return {
        valido: errores.length === 0,
        totalProductos: proyecto.productos.length,
        totalCategorias: proyecto.categorias.length,
        errores,
        advertencias,
        duplicadosCodigo,
        duplicadosNombre,
        sinCategoria,
        sinPrecio,
        codigosInvalidos,
    };
}

// ============ COMPARTIR ============
export async function compartirProyectoJSON(proyecto: ProyectoMigracion): Promise<{
    ok: boolean;
    mensaje: string;
    viaWebShare?: boolean;
}> {
    const json = JSON.stringify(proyectoAJSON(proyecto), null, 2);
    const nombreSeguro = proyecto.nombreCliente
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '') || 'cliente';
    const nombreArchivo = `productos_${nombreSeguro}.json`;

    // 1. Intentar con Web Share API (compartir archivo, ideal en móvil)
    if (typeof navigator !== 'undefined' && 'canShare' in navigator) {
        try {
            const blob = new Blob([json], { type: 'application/json' });
            const file = new File([blob], nombreArchivo, { type: 'application/json' });

            if ((navigator as any).canShare({ files: [file] })) {
                await (navigator as any).share({
                    files: [file],
                    title: `Productos - ${proyecto.nombreCliente}`,
                    text: `Lista de ${proyecto.productos.length} productos para importar en CuentaClara`,
                });
                return { ok: true, mensaje: 'Compartido', viaWebShare: true };
            }
        } catch (e: any) {
            // Si el usuario cancela, no es un error real
            if (e?.name === 'AbortError') {
                return { ok: false, mensaje: 'cancelado' };
            }
            // Si falla, seguimos con fallback
        }
    }

    // 2. Fallback: descargar el archivo
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombreArchivo;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    return {
        ok: true,
        mensaje: 'Web Share no disponible. Archivo descargado.',
        viaWebShare: false,
    };
}

/** Genera un link de WhatsApp con texto pre-armado */
export function generarLinkWhatsApp(proyecto: ProyectoMigracion, telefono?: string): string {
    const texto = `Hola! Te envío la lista de *${proyecto.productos.length} productos* para cargar en CuentaClara.

📦 ${proyecto.productos.length} productos
📂 ${proyecto.categorias.length} categorías

Adjunto el archivo JSON para que lo importes desde: Productos → 📥 Importar JSON`;

    const encoded = encodeURIComponent(texto);
    const tel = telefono?.replace(/\D/g, '');
    return tel
        ? `https://wa.me/${tel}?text=${encoded}`
        : `https://wa.me/?text=${encoded}`;
}

// ============ ACCIONES MASIVAS ============
export function renombrarCategoria(proyecto: ProyectoMigracion, nombreViejo: string, nombreNuevo: string): ProyectoMigracion {
    const nuevoTrim = nombreNuevo.trim();
    if (!nuevoTrim) return proyecto;

    const productos = proyecto.productos.map(p =>
        p.categoria === nombreViejo ? { ...p, categoria: nuevoTrim } : p
    );

    const categorias = proyecto.categorias.map(c =>
        c.nombre === nombreViejo ? { ...c, nombre: nuevoTrim } : c
    );

    // Re-sincronizar por si quedan huérfanas
    return sincronizarCategorias({ ...proyecto, productos, categorias });
}

export function eliminarProductosPorIndices(proyecto: ProyectoMigracion, indices: number[]): ProyectoMigracion {
    const set = new Set(indices);
    const productos = proyecto.productos.filter((_, i) => !set.has(i));
    return sincronizarCategorias({ ...proyecto, productos });
}

export function fusionarDuplicados(
    proyecto: ProyectoMigracion,
    tipo: 'codigo' | 'nombre'
): ProyectoMigracion {
    const vistos = new Set<string>();
    const productosFiltrados: ProductoMigracion[] = [];

    for (const p of proyecto.productos) {
        const key = tipo === 'codigo'
            ? (p.codigoBarras?.trim() || '')
            : (p.nombre.trim().toLowerCase());

        if (!key) {
            productosFiltrados.push(p);
            continue;
        }
        if (vistos.has(key)) continue;
        vistos.add(key);
        productosFiltrados.push(p);
    }

    return sincronizarCategorias({ ...proyecto, productos: productosFiltrados });
}