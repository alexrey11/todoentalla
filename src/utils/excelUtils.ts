import * as XLSX from 'xlsx';

export interface LecturaExcel {
    workbook: XLSX.WorkBook;
    nombresHojas: string[];
}

export async function leerArchivoExcel(file: File):
    Promise<{ ok: true; data: LecturaExcel } | { ok: false; error: string }> {
    try {
        const buffer = await file.arrayBuffer();
        const wb = XLSX.read(buffer, { type: 'array', cellDates: true });
        return {
            ok: true,
            data: { workbook: wb, nombresHojas: wb.SheetNames },
        };
    } catch (e: any) {
        return { ok: false, error: `No se pudo leer el archivo: ${e?.message ?? 'error'}` };
    }
}

/** Devuelve las filas de la hoja como string[][] (primera fila = headers si las hay) */
export function extraerFilas(wb: XLSX.WorkBook, nombreHoja: string): string[][] {
    const hoja = wb.Sheets[nombreHoja];
    if (!hoja) return [];
    const filasRaw: any[][] = XLSX.utils.sheet_to_json(hoja, {
        header: 1,
        raw: false,
        defval: '',
        blankrows: false,
    });
    return filasRaw
        .map(fila => fila.map(c => String(c ?? '').trim()))
        .filter(fila => fila.some(c => c.length > 0));
}

// ============ DETECCIÓN AUTOMÁTICA DE HEADERS ============

const SINONIMOS: Record<string, string[]> = {
    nombre: ['nombre', 'producto', 'articulo', 'artículo', 'item', 'name', 'descripcion producto', 'detalle'],
    categoria: ['categoria', 'categoría', 'rubro', 'grupo', 'familia', 'seccion', 'sección', 'cat', 'linea', 'línea'],
    precioVenta: ['precioventa', 'precio venta', 'precio', 'pvp', 'venta', 'precio_venta', 'precio al publico'],
    precioCompra: ['preciocompra', 'precio compra', 'costo', 'compra', 'precio_compra', 'precio costo'],
    stockActual: ['stockactual', 'stock actual', 'stock', 'cantidad', 'existencia', 'qty', 'inventario', 'saldo'],
    stockMinimo: ['stockminimo', 'stock minimo', 'mínimo', 'minimo', 'min', 'stock_min'],
    codigoBarras: ['codigobarras', 'codigo barras', 'código de barras', 'codigo', 'código', 'barcode', 'ean', 'upc', 'cod', 'sku'],
    unidadMedida: ['unidadmedida', 'unidad medida', 'unidad', 'medida', 'um', 'presentacion', 'presentación'],
    descripcion: ['descripcion', 'descripción', 'detalle', 'observaciones', 'notas'],
    fechaVencimiento: ['fechavencimiento', 'vencimiento', 'fecha vencimiento', 'vence', 'caduca', 'expira'],
    lote: ['lote', 'batch'],
    numeroSerie: ['numeroserie', 'numero serie', 'serie', 'serial'],
};

function normalizar(s: string): string {
    return s
        .toLowerCase()
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[_\-\s]+/g, ' ')
        .trim();
}

/** Dado un array de headers, sugiere un mapeo campo → índice */
export function detectarMapeo(headers: string[]): Record<string, number> {
    const mapeo: Record<string, number> = {};
    const headersNorm = headers.map(normalizar);

    for (const [campo, sinonimos] of Object.entries(SINONIMOS)) {
        for (const sin of sinonimos) {
            const sinNorm = normalizar(sin);
            const idx = headersNorm.findIndex(h => h === sinNorm);
            if (idx >= 0 && !Object.values(mapeo).includes(idx)) {
                mapeo[campo] = idx;
                break;
            }
        }
    }

    // Fallback por posición si no hay headers claros
    if (!('nombre' in mapeo) && headers.length > 0) mapeo.nombre = 0;
    if (!('categoria' in mapeo) && headers.length > 1) mapeo.categoria = 1;
    if (!('precioVenta' in mapeo) && headers.length > 2) mapeo.precioVenta = 2;

    return mapeo;
}

/** ¿La primera fila parece cabecera? (todas las celdas son texto no numérico) */
export function pareceCabecera(fila: string[]): boolean {
    if (!fila || fila.length === 0) return false;
    let texto = 0;
    let numeros = 0;
    for (const c of fila) {
        if (!c) continue;
        if (/^-?\d+([.,]\d+)?$/.test(c)) numeros++;
        else texto++;
    }
    return texto >= numeros && texto > 0;
}