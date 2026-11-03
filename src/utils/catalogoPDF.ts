// ============================================================
// Generador de catálogo PDF de productos
// ============================================================

import jsPDF from 'jspdf';
import type { Producto, Categoria, PuntoDeVenta } from '../db';
import { stockTotalProducto } from '../db';
import { generarBarcodeDataURL, detectarFormato } from './barcode';

interface OpcionesCatalogo {
    productos: Producto[];
    categorias: Categoria[];
    pdv: PuntoDeVenta;
    incluirPrecio: boolean;
    incluirStock: boolean;
    incluirCodigoBarras: boolean;
    incluirImagen: boolean;
    soloConStock: boolean;
    titulo?: string;
    subtitulo?: string;
    colorPrimario?: [number, number, number]; // RGB
}

/**
 * Genera un catálogo PDF con los productos agrupados por categoría.
 */
export function generarCatalogoPDF(opciones: OpcionesCatalogo): Uint8Array {
    const {
        productos,
        categorias,
        pdv,
        incluirPrecio,
        incluirStock,
        incluirCodigoBarras,
        incluirImagen,
        soloConStock,
        titulo,
        subtitulo,
        colorPrimario = [37, 99, 235], // azul
    } = opciones;

    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
    });

    const anchoPagina = doc.internal.pageSize.getWidth();
    const altoPagina = doc.internal.pageSize.getHeight();
    const margen = 12;
    const anchoContenido = anchoPagina - margen * 2;

    // Filtrar
    let productosFiltrados = productos;
    if (soloConStock) {
        productosFiltrados = productosFiltrados.filter(p => stockTotalProducto(p) > 0);
    }

    // Agrupar por categoría
    const porCategoria = new Map<number, Producto[]>();
    productosFiltrados.forEach(p => {
        if (!porCategoria.has(p.categoriaId)) porCategoria.set(p.categoriaId, []);
        porCategoria.get(p.categoriaId)!.push(p);
    });

    // Ordenar categorías
    const categoriasOrdenadas = categorias
        .filter(c => porCategoria.has(c.id!))
        .sort((a, b) => a.nombre.localeCompare(b.nombre));

    // ============ PORTADA ============
    dibujarPortada(doc, {
        titulo: titulo || 'Catálogo de Productos',
        subtitulo: subtitulo || pdv.nombre.replace(/^[^\s]+\s/, ''),
        pdv,
        totalProductos: productosFiltrados.length,
        totalCategorias: categoriasOrdenadas.length,
        colorPrimario,
        anchoPagina,
        altoPagina,
    });

    // ============ PÁGINAS DE PRODUCTOS ============
    let y = margen;

    let paginaActual = 2;

    const altoFila = 26; // altura de cada producto
    const anchoColumna = (anchoContenido - 6) / 2; // 2 columnas con gap de 6mm

    // Función para dibujar header en cada página
    const dibujarHeaderPagina = () => {
        doc.setFillColor(...colorPrimario);
        doc.rect(0, 0, anchoPagina, 18, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.text(titulo || 'Catálogo', margen, 11);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(pdv.nombre.replace(/^[^\s]+\s/, ''), anchoPagina - margen, 11, { align: 'right' });
        y = 26;
    };

    // Dibujar header en la primera página de productos
    doc.addPage();
    dibujarHeaderPagina();

    for (const cat of categoriasOrdenadas) {
        const productosCat = porCategoria.get(cat.id!) || [];

        // Verificar si cabe el título + al menos 1 producto
        if (y + 16 + altoFila > altoPagina - margen) {
            doc.addPage();
            paginaActual++;
            dibujarHeaderPagina();
        }

        // ============ TÍTULO DE CATEGORÍA ============
        doc.setFillColor(240, 244, 250);
        doc.roundedRect(margen, y, anchoContenido, 11, 2, 2, 'F');
        doc.setDrawColor(...colorPrimario);
        doc.setLineWidth(0.8);
        doc.line(margen, y, margen, y + 11);

        doc.setTextColor(...colorPrimario);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(cat.nombre.toUpperCase(), margen + 4, y + 7.5);

        doc.setTextColor(120, 130, 145);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(
            `${productosCat.length} producto${productosCat.length !== 1 ? 's' : ''}`,
            anchoPagina - margen - 4,
            y + 7.5,
            { align: 'right' }
        );

        y += 15;

        // ============ PRODUCTOS EN 2 COLUMNAS ============
        let colActual = 0;

        const altoFilaCategoria = altoFila;

        for (let i = 0; i < productosCat.length; i++) {
            const prod = productosCat[i];

            // ¿Cambio de fila?
            if (colActual === 0 && i > 0 && i % 2 === 0) {
                y += altoFilaCategoria + 3;
            }

            // ¿Cambio de página?
            if (y + altoFilaCategoria > altoPagina - margen) {
                doc.addPage();
                paginaActual++;
                dibujarHeaderPagina();

                colActual = 0;
            }

            const x = margen + colActual * (anchoColumna + 6);

            dibujarProducto(doc, {
                producto: prod,
                x,
                y,
                ancho: anchoColumna,
                alto: altoFilaCategoria,
                incluirPrecio,
                incluirStock,
                incluirCodigoBarras,
                incluirImagen,
                colorPrimario,
            });

            colActual++;
            if (colActual >= 2) colActual = 0;
        }

        // Avanzar y después de la última fila de esta categoría
        if (productosCat.length % 2 !== 0) {
            y += altoFilaCategoria + 3;
        }
        y += 6; // separación entre categorías
    }

    // ============ PIE DE PÁGINA ============
    const totalPaginas = paginaActual;
    for (let i = 1; i <= totalPaginas; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.setFont('helvetica', 'normal');
        doc.text(
            `CuentaClara · Catálogo generado el ${new Date().toLocaleDateString('es-ES')}`,
            margen,
            altoPagina - 6
        );
        doc.text(
            `Página ${i} de ${totalPaginas}`,
            anchoPagina - margen,
            altoPagina - 6,
            { align: 'right' }
        );
    }

    return new Uint8Array(doc.output('arraybuffer'));
}

// ============================================================
// PORTADA
// ============================================================
function dibujarPortada(doc: jsPDF, opts: {
    titulo: string;
    subtitulo: string;
    pdv: PuntoDeVenta;
    totalProductos: number;
    totalCategorias: number;
    colorPrimario: [number, number, number];
    anchoPagina: number;
    altoPagina: number;
}) {
    const { titulo, subtitulo, pdv, totalProductos, totalCategorias, colorPrimario, anchoPagina, altoPagina } = opts;

    // Fondo superior con gradiente simulado (bandas)
    doc.setFillColor(...colorPrimario);
    doc.rect(0, 0, anchoPagina, altoPagina / 2, 'F');
    doc.setFillColor(
        Math.min(255, colorPrimario[0] + 40),
        Math.min(255, colorPrimario[1] + 40),
        Math.min(255, colorPrimario[2] + 40)
    );
    doc.rect(0, altoPagina / 2 - 20, anchoPagina, 20, 'F');

    // Título
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(34);
    doc.setFont('helvetica', 'bold');
    doc.text(titulo, anchoPagina / 2, 60, { align: 'center' });

    // Subtítulo
    doc.setFontSize(16);
    doc.setFont('helvetica', 'normal');
    doc.text(subtitulo, anchoPagina / 2, 75, { align: 'center' });

    // Icono decorativo (una caja)
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.5);
    doc.roundedRect(anchoPagina / 2 - 20, 90, 40, 40, 3, 3, 'S');
    doc.setFontSize(30);
    doc.text('📦', anchoPagina / 2, 116, { align: 'center' });

    // Info del negocio
    const baseY = altoPagina / 2 + 20;
    doc.setTextColor(40, 50, 70);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(pdv.nombre.replace(/^[^\s]+\s/, ''), anchoPagina / 2, baseY, { align: 'center' });

    let infoY = baseY + 12;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(90, 100, 120);

    if (pdv.direccion) {
        doc.text(`📍 ${pdv.direccion}`, anchoPagina / 2, infoY, { align: 'center' });
        infoY += 7;
    }
    if (pdv.telefono) {
        doc.text(`📞 ${pdv.telefono}`, anchoPagina / 2, infoY, { align: 'center' });
        infoY += 7;
    }
    if (pdv.encargado) {
        doc.text(`👤 ${pdv.encargado}`, anchoPagina / 2, infoY, { align: 'center' });
        infoY += 7;
    }

    // Stats
    const statsY = altoPagina - 60;
    doc.setDrawColor(220, 225, 235);
    doc.setLineWidth(0.3);
    doc.line(anchoPagina / 2 - 50, statsY - 12, anchoPagina / 2 + 50, statsY - 12);

    doc.setFontSize(11);
    doc.setTextColor(120, 130, 145);
    doc.text('Este catálogo contiene', anchoPagina / 2, statsY, { align: 'center' });

    doc.setFontSize(26);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colorPrimario);
    doc.text(`${totalProductos}`, anchoPagina / 2 - 20, statsY + 14, { align: 'center' });
    doc.text(`${totalCategorias}`, anchoPagina / 2 + 20, statsY + 14, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 130, 145);
    doc.text('productos', anchoPagina / 2 - 20, statsY + 20, { align: 'center' });
    doc.text('categorías', anchoPagina / 2 + 20, statsY + 20, { align: 'center' });

    // Footer
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text(
        `Generado el ${new Date().toLocaleDateString('es-ES', {
            day: 'numeric', month: 'long', year: 'numeric'
        })}`,
        anchoPagina / 2,
        altoPagina - 15,
        { align: 'center' }
    );
}

// ============================================================
// PRODUCTO INDIVIDUAL
// ============================================================
function dibujarProducto(doc: jsPDF, opts: {
    producto: Producto;
    x: number;
    y: number;
    ancho: number;
    alto: number;
    incluirPrecio: boolean;
    incluirStock: boolean;
    incluirCodigoBarras: boolean;
    incluirImagen: boolean;
    colorPrimario: [number, number, number];
}) {
    const { producto, x, y, ancho, alto, incluirPrecio, incluirStock, incluirCodigoBarras, incluirImagen, colorPrimario } = opts;

    // Borde
    doc.setDrawColor(225, 230, 240);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, y, ancho, alto, 2, 2, 'S');

    // Imagen o placeholder
    const imgSize = 18;
    const imgX = x + 2;
    const imgY = y + (alto - imgSize) / 2;

    if (incluirImagen && producto.imagen) {
        try {
            doc.addImage(producto.imagen, 'JPEG', imgX, imgY, imgSize, imgSize, undefined, 'FAST');
        } catch {
            doc.setFillColor(240, 244, 250);
            doc.roundedRect(imgX, imgY, imgSize, imgSize, 2, 2, 'F');
        }
    } else {
        doc.setFillColor(240, 244, 250);
        doc.roundedRect(imgX, imgY, imgSize, imgSize, 2, 2, 'F');
        doc.setFontSize(14);
        doc.text(
            producto.tieneVariantes ? '👕' : producto.esCompuesto ? '🍕' : '📦',
            imgX + imgSize / 2,
            imgY + imgSize / 2 + 2,
            { align: 'center' }
        );
    }

    // Nombre
    const textoX = x + imgSize + 5;
    const anchoTexto = ancho - imgSize - 7;

    doc.setTextColor(30, 40, 60);
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    const nombreCorto = producto.nombre.length > 32
        ? producto.nombre.slice(0, 30) + '…'
        : producto.nombre;
    doc.text(nombreCorto, textoX, y + 6);

    // Precio
    if (incluirPrecio) {
        doc.setFontSize(11);
        doc.setTextColor(...colorPrimario);
        doc.setFont('helvetica', 'bold');
        doc.text(
            `$${producto.precioVenta.toFixed(2)}`,
            textoX,
            y + 13
        );
    }

    // Stock
    if (incluirStock) {
        const stock = stockTotalProducto(producto);
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(stock <= 0 ? 220 : 120, stock <= 0 ? 60 : 130, stock <= 0 ? 60 : 145);
        doc.text(
            stock <= 0 ? 'Sin stock' : `Stock: ${stock} ${producto.unidadMedida || 'u'}`,
            textoX,
            y + 19
        );
    }

    // Código de barras
    if (incluirCodigoBarras && producto.codigoBarras) {
        try {
            const dataURL = generarBarcodeDataURL(producto.codigoBarras, {
                format: detectarFormato(producto.codigoBarras),
                width: 1,
                height: 24,
                displayValue: false,
                margin: 0,
            });
            if (dataURL) {
                const codigoAncho = Math.min(anchoTexto, 35);
                const codigoX = x + ancho - codigoAncho - 2;
                doc.addImage(dataURL, 'PNG', codigoX, y + alto - 9, codigoAncho, 7);
            }
        } catch {
            // ignorar
        }
    }
}