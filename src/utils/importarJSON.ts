// ============================================================
// Importador de productos desde JSON
// ============================================================

import { db } from '../db';
import type { Producto } from '../db';

// ============ TIPOS ============
export interface ProductoImport {
    nombre: string;
    categoria: string;
    precioVenta: number;
    precioCompra?: number;
    stockActual?: number;
    stockMinimo?: number;
    codigoBarras?: string;
    unidadMedida?: string;
    descripcion?: string;
    fechaVencimiento?: string | Date;
    lote?: string;
    numeroSerie?: string;
}

export interface CategoriaImport {
    nombre: string;
    descripcion?: string;
}

export interface JSONImport {
    version?: number;
    categorias?: CategoriaImport[];
    productos: ProductoImport[];
}

export type EstadoFila = 'ok' | 'warn' | 'error';

export interface FilaValidada {
    indice: number;
    estado: EstadoFila;
    problemas: string[];
    advertencias: string[];
    producto: ProductoImport;
}

export interface ResultadoValidacion {
    ok: boolean;
    errorGeneral?: string;
    filas: FilaValidada[];
    totalOk: number;
    totalWarn: number;
    totalError: number;
    categoriasNuevas: string[];
    categoriasExistentes: string[];
    duplicadosCodigo: number;
    duplicadosNombre: number;
}

// ============ PLANTILLA DESCARGABLE ============
export const PLANTILLA_JSON: JSONImport = {
    version: 1,
    categorias: [
        { nombre: 'Bebidas', descripcion: 'Refrescos, jugos, agua' },
        { nombre: 'Alimentos', descripcion: 'Comestibles en general' },
    ],
    productos: [
        {
            nombre: 'Coca Cola 2L',
            categoria: 'Bebidas',
            precioVenta: 500,
            precioCompra: 300,
            stockActual: 24,
            stockMinimo: 5,
            codigoBarras: '7461234567890',
            unidadMedida: 'Unidad',
            descripcion: 'Refresco de cola 2 litros',
        },
        {
            nombre: 'Arroz',
            categoria: 'Alimentos',
            precioVenta: 80,
            precioCompra: 50,
            stockActual: 10.5,
            stockMinimo: 2,
            unidadMedida: 'kg',
        },
    ],
};

export function descargarPlantillaJSON() {
    const json = JSON.stringify(PLANTILLA_JSON, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'plantilla_productos_cuentaclara.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ============ VALIDACIÓN ============
export async function validarJSON(
    datos: any,
    pdvId: number
): Promise<ResultadoValidacion> {
    const resultado: ResultadoValidacion = {
        ok: false,
        filas: [],
        totalOk: 0,
        totalWarn: 0,
        totalError: 0,
        categoriasNuevas: [],
        categoriasExistentes: [],
        duplicadosCodigo: 0,
        duplicadosNombre: 0,
    };

    // 1. Estructura básica
    if (!datos || typeof datos !== 'object' || Array.isArray(datos)) {
        resultado.errorGeneral = 'El archivo no es un objeto JSON válido.';
        return resultado;
    }
    if (!Array.isArray(datos.productos)) {
        resultado.errorGeneral = 'Falta el array "productos" o no es un array.';
        return resultado;
    }
    if (datos.productos.length === 0) {
        resultado.errorGeneral = 'No hay productos para importar.';
        return resultado;
    }

    // 2. Cargar categorías existentes del PDV
    const categoriasExistentes = await db.categorias
        .where('puntoDeVentaId').equals(pdvId).toArray();
    const nombresCategoriasExistentes = new Set(
        categoriasExistentes.map(c => c.nombre.toLowerCase().trim())
    );

    // 3. Cargar productos existentes para detectar duplicados
    const productosExistentes = await db.productos
        .where('puntoDeVentaId').equals(pdvId).toArray();
    const codigosExistentes = new Set<string>();
    const nombresExistentes = new Set<string>();
    productosExistentes.forEach(p => {
        if (p.codigoBarras) codigosExistentes.add(p.codigoBarras.trim());
        nombresExistentes.add(p.nombre.toLowerCase().trim());
    });

    // 4. Categorías nuevas que aparecen en el JSON
    const categoriasNuevasSet = new Set<string>();
    (datos.categorias || []).forEach((c: any) => {
        const nombre = String(c?.nombre ?? '').trim();
        if (nombre && !nombresCategoriasExistentes.has(nombre.toLowerCase())) {
            categoriasNuevasSet.add(nombre);
        }
    });

    // 5. Validar cada fila
    const codigosEnArchivo = new Map<string, number>();

    datos.productos.forEach((prod: any, idx: number) => {
        const problemas: string[] = [];
        const advertencias: string[] = [];

        const p: ProductoImport = {
            nombre: String(prod?.nombre ?? '').trim(),
            categoria: String(prod?.categoria ?? '').trim(),
            precioVenta: Number(prod?.precioVenta),
            precioCompra: prod?.precioCompra !== undefined ? Number(prod.precioCompra) : 0,
            stockActual: prod?.stockActual !== undefined ? Number(prod.stockActual) : 0,
            stockMinimo: prod?.stockMinimo !== undefined ? Number(prod.stockMinimo) : 0,
            codigoBarras: prod?.codigoBarras ? String(prod.codigoBarras).trim() : undefined,
            unidadMedida: prod?.unidadMedida ? String(prod.unidadMedida).trim() : 'Unidad',
            descripcion: prod?.descripcion ? String(prod.descripcion).trim() : undefined,
            fechaVencimiento: prod?.fechaVencimiento,
            lote: prod?.lote ? String(prod.lote).trim() : undefined,
            numeroSerie: prod?.numeroSerie ? String(prod.numeroSerie).trim() : undefined,
        };

        // --- Nombre ---
        if (!p.nombre) problemas.push('Falta el nombre');

        // --- Categoría ---
        if (!p.categoria) {
            problemas.push('Falta la categoría');
        } else if (!nombresCategoriasExistentes.has(p.categoria.toLowerCase())) {
            categoriasNuevasSet.add(p.categoria);
        }

        // --- Precio venta ---
        if (isNaN(p.precioVenta) || p.precioVenta < 0) {
            problemas.push('precioVenta inválido (debe ser número ≥ 0)');
        }

        // --- Precio compra ---
        if (isNaN(p.precioCompra!)) {
            advertencias.push('precioCompra inválido, se usará 0');
            p.precioCompra = 0;
        }

        // --- Stock ---
        if (isNaN(p.stockActual!)) {
            advertencias.push('stockActual inválido, se usará 0');
            p.stockActual = 0;
        }
        if (isNaN(p.stockMinimo!)) p.stockMinimo = 0;

        // --- Fecha vencimiento ---
        if (p.fechaVencimiento) {
            const d = new Date(p.fechaVencimiento);
            if (isNaN(d.getTime())) {
                advertencias.push('fechaVencimiento inválida, se ignora');
                p.fechaVencimiento = undefined;
            }
        }

        // --- Código de barras duplicado ---
        if (p.codigoBarras) {
            if (codigosEnArchivo.has(p.codigoBarras)) {
                advertencias.push(`Código repetido en el archivo (fila ${codigosEnArchivo.get(p.codigoBarras)! + 1})`);
            } else {
                codigosEnArchivo.set(p.codigoBarras, idx);
            }
            if (codigosExistentes.has(p.codigoBarras)) {
                advertencias.push('Código ya existe en el sistema');
                resultado.duplicadosCodigo++;
            }
        }

        // --- Nombre duplicado ---
        if (p.nombre && nombresExistentes.has(p.nombre.toLowerCase())) {
            advertencias.push('Ya existe un producto con ese nombre');
            resultado.duplicadosNombre++;
        }

        let estado: EstadoFila = 'ok';
        if (problemas.length > 0) estado = 'error';
        else if (advertencias.length > 0) estado = 'warn';

        if (estado === 'error') resultado.totalError++;
        else if (estado === 'warn') resultado.totalWarn++;
        else resultado.totalOk++;

        resultado.filas.push({
            indice: idx,
            estado,
            problemas,
            advertencias,
            producto: p,
        });
    });

    resultado.categoriasNuevas = Array.from(categoriasNuevasSet);
    resultado.categoriasExistentes = Array.from(nombresCategoriasExistentes);
    resultado.ok = resultado.totalError === 0;

    return resultado;
}

// ============ IMPORTACIÓN ============
export interface OpcionesImport {
    crearCategoriasFaltantes: boolean;
    saltarDuplicadosCodigo: boolean;
    saltarDuplicadosNombre: boolean;
}

export interface ResultadoImport {
    productosImportados: number;
    productosSaltados: number;
    categoriasCreadas: number;
}

export async function ejecutarImportacion(
    validacion: ResultadoValidacion,
    pdvId: number,
    opciones: OpcionesImport
): Promise<ResultadoImport> {
    const res: ResultadoImport = {
        productosImportados: 0,
        productosSaltados: 0,
        categoriasCreadas: 0,
    };

    // 1. Crear categorías faltantes
    const mapaCategorias = new Map<string, number>();
    const cats = await db.categorias.where('puntoDeVentaId').equals(pdvId).toArray();
    cats.forEach(c => mapaCategorias.set(c.nombre.toLowerCase().trim(), c.id!));

    if (opciones.crearCategoriasFaltantes) {
        for (const nombreCat of validacion.categoriasNuevas) {
            const key = nombreCat.toLowerCase().trim();
            if (!mapaCategorias.has(key)) {
                const nuevoId = await db.categorias.add({
                    nombre: nombreCat,
                    puntoDeVentaId: pdvId,
                    creadoEn: new Date(),
                });
                mapaCategorias.set(key, nuevoId);
                res.categoriasCreadas++;
            }
        }
    }

    // 2. Cargar existentes para chequear duplicados
    const productosExistentes = await db.productos.where('puntoDeVentaId').equals(pdvId).toArray();
    const codigosExistentes = new Set<string>();
    const nombresExistentes = new Set<string>();
    productosExistentes.forEach(p => {
        if (p.codigoBarras) codigosExistentes.add(p.codigoBarras.trim());
        nombresExistentes.add(p.nombre.toLowerCase().trim());
    });

    // 3. Preparar todos los productos a insertar
    const aInsertar: Producto[] = [];

    for (const fila of validacion.filas) {
        if (fila.estado === 'error') {
            res.productosSaltados++;
            continue;
        }
        const p = fila.producto;
        const catId = mapaCategorias.get(p.categoria.toLowerCase().trim());
        if (!catId) {
            res.productosSaltados++;
            continue;
        }

        if (p.codigoBarras && codigosExistentes.has(p.codigoBarras) && opciones.saltarDuplicadosCodigo) {
            res.productosSaltados++;
            continue;
        }
        if (nombresExistentes.has(p.nombre.toLowerCase()) && opciones.saltarDuplicadosNombre) {
            res.productosSaltados++;
            continue;
        }

        let fechaVenc: Date | undefined;
        if (p.fechaVencimiento) {
            const d = new Date(p.fechaVencimiento);
            if (!isNaN(d.getTime())) fechaVenc = d;
        }

        aInsertar.push({
            puntoDeVentaId: pdvId,
            categoriaId: catId,
            nombre: p.nombre,
            descripcion: p.descripcion,
            precioCompra: p.precioCompra ?? 0,
            precioVenta: p.precioVenta,
            stockActual: p.stockActual ?? 0,
            stockMinimo: p.stockMinimo ?? 0,
            unidadMedida: p.unidadMedida || 'Unidad',
            fechaCreacion: new Date(),
            fechaVencimiento: fechaVenc,
            codigoBarras: p.codigoBarras,
            lote: p.lote,
            numeroSerie: p.numeroSerie,
        });

        if (p.codigoBarras) codigosExistentes.add(p.codigoBarras);
        nombresExistentes.add(p.nombre.toLowerCase());
    }

    if (aInsertar.length > 0) {
        await db.productos.bulkAdd(aInsertar);
        res.productosImportados = aInsertar.length;
    }

    return res;
}

// ============ PARSER SEGURO ============
export function parsearJSONSeguro(texto: string): { ok: true; datos: any } | { ok: false; error: string } {
    const limpio = texto.trim();
    if (!limpio) return { ok: false, error: 'El texto está vacío' };
    try {
        const datos = JSON.parse(limpio);
        return { ok: true, datos };
    } catch (e: any) {
        return { ok: false, error: `JSON inválido: ${e?.message ?? 'error de sintaxis'}` };
    }
}