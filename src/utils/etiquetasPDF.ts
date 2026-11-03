// ============================================================
// Generador de PDF con etiquetas de código de barras
// Formato pensado para impresora térmica o A4
// ============================================================

import jsPDF from 'jspdf';
import { generarBarcodeDataURL, detectarFormato } from './barcode';

interface DatosEtiqueta {
    nombreProducto: string;
    codigoBarras: string;
    precio?: number;
    mostrarPrecio: boolean;
    mostrarNombre: boolean;
}

interface OpcionesPDF {
    etiquetas: DatosEtiqueta[];
    // Dimensiones en mm
    anchoEtiqueta?: number;
    altoEtiqueta?: number;
    // Cuántas etiquetas por fila
    columnas?: number;
    // Espacio entre etiquetas
    gap?: number;
    // Margen de la página
    margenPagina?: number;
}

/**
 * Genera un PDF con las etiquetas en una grilla.
 * Tamaño por defecto: 50mm × 30mm (etiqueta térmica común).
 */
export function generarPDFEtiquetas(opciones: OpcionesPDF): Uint8Array {
    const {
        etiquetas,
        anchoEtiqueta = 50,
        altoEtiqueta = 30,
        columnas = 3,
        gap = 3,
        margenPagina = 10,
    } = opciones;

    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
    });

    const anchoPagina = doc.internal.pageSize.getWidth();
    const altoPagina = doc.internal.pageSize.getHeight();

    // Ancho total que ocupa la grilla (N columnas + gaps entre ellas)
    const anchoGrilla = columnas * anchoEtiqueta + (columnas - 1) * gap;
    // Margen horizontal sobrante a cada lado (centra la grilla en la página)
    const margenX = Math.max(margenPagina, (anchoPagina - anchoGrilla) / 2);

    let x = margenX;
    let y = margenPagina;
    let columnaActual = 0;

    for (let i = 0; i < etiquetas.length; i++) {
        const etq = etiquetas[i];

        // ¿Hay espacio para esta etiqueta?
        if (y + altoEtiqueta > altoPagina - margenPagina) {
            doc.addPage();
            y = margenPagina;
            x = margenX;
            columnaActual = 0;
        }

        // Dibujar borde de la etiqueta (muy fino, para cortar)
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.1);
        doc.rect(x, y, anchoEtiqueta, altoEtiqueta);

        // Nombre del producto (arriba)
        let cursorY = y + 4;
        if (etq.mostrarNombre) {
            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(15, 23, 42);
            const nombreCorto = etq.nombreProducto.length > 28
                ? etq.nombreProducto.slice(0, 26) + '...'
                : etq.nombreProducto;
            doc.text(nombreCorto, x + anchoEtiqueta / 2, cursorY, { align: 'center' });
            cursorY += 3;
        }

        // Código de barras
        try {
            const dataURL = generarBarcodeDataURL(etq.codigoBarras, {
                format: detectarFormato(etq.codigoBarras),
                width: 1.5,
                height: 40,
                displayValue: true,
                fontSize: 10,
                margin: 1,
            });

            if (dataURL) {
                // Calcular posición y tamaño del barcode dentro de la etiqueta
                const anchoBarcode = anchoEtiqueta - 6;
                const altoBarcode = etq.mostrarPrecio ? 14 : 16;
                const xBarcode = x + 3;
                const yBarcode = cursorY + 1;

                doc.addImage(dataURL, 'PNG', xBarcode, yBarcode, anchoBarcode, altoBarcode);
                cursorY += altoBarcode + 2;
            }
        } catch (e) {
            console.warn('Error generando barcode para etiqueta:', e);
            doc.setFontSize(7);
            doc.setTextColor(150, 150, 150);
            doc.text('⚠️ código inválido', x + anchoEtiqueta / 2, cursorY + 8, { align: 'center' });
            cursorY += 12;
        }

        // Precio (abajo)
        if (etq.mostrarPrecio && etq.precio !== undefined) {
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(15, 23, 42);
            doc.text(`$${etq.precio.toFixed(2)}`, x + anchoEtiqueta / 2, y + altoEtiqueta - 3, { align: 'center' });
        }

        // Avanzar posición
        columnaActual++;
        if (columnaActual >= columnas) {
            columnaActual = 0;
            x = margenX;
            y += altoEtiqueta + gap;
        } else {
            x += anchoEtiqueta + gap;
        }
    }

    return new Uint8Array(doc.output('arraybuffer'));
}

/**
 * Genera PDF de etiquetas para UN solo producto (repetido N veces).
 */
export function generarPDFEtiquetasProducto(
    producto: { nombre: string; codigoBarras: string; precioVenta: number },
    cantidad: number,
    opciones?: {
        mostrarPrecio?: boolean;
        mostrarNombre?: boolean;
    }
): Uint8Array {
    const etiquetas: DatosEtiqueta[] = Array.from({ length: cantidad }, () => ({
        nombreProducto: producto.nombre,
        codigoBarras: producto.codigoBarras,
        precio: producto.precioVenta,
        mostrarPrecio: opciones?.mostrarPrecio ?? true,
        mostrarNombre: opciones?.mostrarNombre ?? true,
    }));

    return generarPDFEtiquetas({ etiquetas });
}