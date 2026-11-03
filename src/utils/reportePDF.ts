// ============================================================
// Reportes PDF con logo, cabecera de marca y firmas
// ============================================================

import { jsPDF } from 'jspdf';

export interface FilaReporte {
    etiqueta: string;
    valor: string;
}

export interface TablaReporte {
    headers: string[];
    rows: string[][];
    anchos?: number[];
}

export interface DatosReportePDF {
    nombreNegocio: string;
    direccion?: string;
    telefono?: string;
    logoUrl?: string;

    titulo: string;
    subtitulo?: string;
    periodo: string;
    generadoPor: string;

    filas: FilaReporte[];
    tabla?: TablaReporte;
    notas?: string;

    mostrarFirmas?: boolean;
    firmaIzquierda?: string;
    firmaDerecha?: string;

    nombreArchivo?: string;
}

async function cargarImagenComoDataURL(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                const ctx = canvas.getContext('2d');
                if (!ctx) return reject(new Error('No ctx'));
                ctx.drawImage(img, 0, 0);
                resolve(canvas.toDataURL('image/png'));
            } catch (e) {
                reject(e);
            }
        };
        img.onerror = () => reject(new Error('Error al cargar imagen'));
        img.src = url;
    });
}

export async function generarReportePDF(datos: DatosReportePDF): Promise<Blob> {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const PAGE_W = 210;
    const PAGE_H = 297;
    const MARGIN = 15;
    const CONTENT_W = PAGE_W - MARGIN * 2;

    // ── CABECERA CON MARCA ──
    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, PAGE_W, 32, 'F');
    doc.setFillColor(99, 102, 241);
    doc.rect(0, 30, PAGE_W, 2, 'F');

    let xTexto = MARGIN;
    if (datos.logoUrl) {
        try {
            const dataUrl = await cargarImagenComoDataURL(datos.logoUrl);
            doc.setFillColor(255, 255, 255);
            doc.roundedRect(MARGIN, 5, 22, 22, 2, 2, 'F');
            doc.addImage(dataUrl, 'PNG', MARGIN + 1, 6, 20, 20);
            xTexto = MARGIN + 28;
        } catch { /* sin logo */ }
    }

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text(datos.nombreNegocio, xTexto, 14);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const contacto = [datos.direccion, datos.telefono].filter(Boolean).join(' · ');
    if (contacto) doc.text(contacto, xTexto, 21);

    doc.setFontSize(8);
    doc.text(`Generado: ${new Date().toLocaleString('es-ES')}`, PAGE_W - MARGIN, 14, { align: 'right' });
    doc.text(`Por: ${datos.generadoPor}`, PAGE_W - MARGIN, 19, { align: 'right' });

    // ── TÍTULO ──
    let y = 48;
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(datos.titulo, MARGIN, y);
    y += 7;

    if (datos.subtitulo) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139);
        doc.text(datos.subtitulo, MARGIN, y);
        y += 6;
    }

    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    doc.text(`Periodo: ${datos.periodo}`, MARGIN, y);
    y += 8;

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(MARGIN, y, PAGE_W - MARGIN, y);
    y += 8;

    // ── RESUMEN ──
    if (datos.filas.length > 0) {
        doc.setFillColor(248, 250, 252);
        const altoFila = 9;
        const altoBloque = datos.filas.length * altoFila + 6;
        doc.roundedRect(MARGIN, y - 3, CONTENT_W, altoBloque, 2, 2, 'F');
        y += 3;

        datos.filas.forEach((fila, i) => {
            if (i % 2 === 1) {
                doc.setFillColor(241, 245, 249);
                doc.rect(MARGIN + 2, y - 4, CONTENT_W - 4, altoFila, 'F');
            }
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.setTextColor(71, 85, 105);
            doc.text(fila.etiqueta, MARGIN + 5, y);

            doc.setFont('helvetica', 'bold');
            doc.setTextColor(15, 23, 42);
            doc.text(fila.valor, PAGE_W - MARGIN - 5, y, { align: 'right' });
            y += altoFila;
        });
        y += 5;
    }

    // ── TABLA ──
    if (datos.tabla && datos.tabla.rows.length > 0) {
        const { headers, rows, anchos } = datos.tabla;
        const cols = headers.length;
        const anchosFinales = anchos && anchos.length === cols
            ? anchos.map(a => (a / 100) * CONTENT_W)
            : Array(cols).fill(CONTENT_W / cols);

        doc.setFillColor(30, 41, 59);
        doc.rect(MARGIN, y - 5, CONTENT_W, 8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);

        let xCol = MARGIN;
        headers.forEach((h, i) => {
            doc.text(String(h), xCol + 2, y);
            xCol += anchosFinales[i];
        });
        y += 8;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        const altoFilaTabla = 7;

        rows.forEach((row, idx) => {
            if (y > PAGE_H - 60) {
                doc.addPage();
                y = 25;
            }

            if (idx % 2 === 0) {
                doc.setFillColor(248, 250, 252);
                doc.rect(MARGIN, y - 5, CONTENT_W, altoFilaTabla, 'F');
            }

            doc.setTextColor(30, 41, 59);
            let xr = MARGIN;
            row.forEach((cell, i) => {
                const texto = String(cell);
                const maxW = anchosFinales[i] - 4;
                const textoFinal = doc.getTextWidth(texto) > maxW
                    ? texto.substring(0, Math.floor(maxW / 1.8)) + '…'
                    : texto;
                doc.text(textoFinal, xr + 2, y);
                xr += anchosFinales[i];
            });
            y += altoFilaTabla;
        });
        y += 5;
    }

    // ── NOTAS ──
    if (datos.notas) {
        if (y > PAGE_H - 70) { doc.addPage(); y = 25; }
        doc.setFillColor(254, 252, 232);
        doc.setDrawColor(250, 204, 21);
        doc.setLineWidth(0.3);
        const lineasNotas = doc.splitTextToSize(datos.notas, CONTENT_W - 10);
        const altoNotas = lineasNotas.length * 5 + 10;
        doc.roundedRect(MARGIN, y, CONTENT_W, altoNotas, 2, 2, 'FD');

        doc.setTextColor(120, 53, 15);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text('Notas:', MARGIN + 4, y + 6);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(71, 85, 105);
        lineasNotas.forEach((linea: string, i: number) => {
            doc.text(linea, MARGIN + 4, y + 11 + i * 5);
        });
        y += altoNotas + 5;
    }

    // ── FIRMAS ──
    const mostrarFirmas = datos.mostrarFirmas !== false;
    if (mostrarFirmas) {
        const firmaY = PAGE_H - 40;
        doc.setDrawColor(148, 163, 184);
        doc.setLineWidth(0.3);

        const firmaIzqCentro = MARGIN + CONTENT_W * 0.22;
        doc.line(firmaIzqCentro - 30, firmaY, firmaIzqCentro + 30, firmaY);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text(datos.firmaIzquierda || 'Firma del responsable', firmaIzqCentro, firmaY + 5, { align: 'center' });

        const firmaDerCentro = MARGIN + CONTENT_W * 0.78;
        doc.line(firmaDerCentro - 30, firmaY, firmaDerCentro + 30, firmaY);
        doc.text(datos.firmaDerecha || 'Firma del cliente / recibido', firmaDerCentro, firmaY + 5, { align: 'center' });

        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        doc.text('Aclaración de firma / C.I. / Fecha', firmaIzqCentro, firmaY + 10, { align: 'center' });
        doc.text('Aclaración de firma / C.I. / Fecha', firmaDerCentro, firmaY + 10, { align: 'center' });
    }

    // ── FOOTER ──
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(`Generado por CuentaClara · ${new Date().getFullYear()}`, PAGE_W / 2, PAGE_H - 8, { align: 'center' });

    return doc.output('blob');
}

export interface ContextoNegocio {
    nombre: string;
    direccion?: string;
    telefono?: string;
    logoUrl?: string;
    usuarioNombre: string;
}

export async function reporteInventario(
    ctx: ContextoNegocio,
    productos: any[],
    opciones?: { soloBajoStock?: boolean }
): Promise<Blob> {
    const filtrados = opciones?.soloBajoStock
        ? productos.filter(p => (p.stockActual ?? 0) <= (p.stockMinimo ?? 0))
        : productos;

    const totalUnidades = filtrados.reduce((s, p) => s + (p.stockActual ?? 0), 0);
    const valorTotal = filtrados.reduce((s, p) => s + (p.stockActual ?? 0) * (p.precioVenta ?? 0), 0);
    const bajoStock = filtrados.filter(p => (p.stockActual ?? 0) <= (p.stockMinimo ?? 0)).length;

    return generarReportePDF({
        nombreNegocio: ctx.nombre,
        direccion: ctx.direccion,
        telefono: ctx.telefono,
        logoUrl: ctx.logoUrl,
        titulo: opciones?.soloBajoStock ? 'Productos con Bajo Stock' : 'Inventario Actual',
        subtitulo: 'Detalle completo de existencias',
        periodo: new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' }),
        generadoPor: ctx.usuarioNombre,
        filas: [
            { etiqueta: 'Total de productos', valor: String(filtrados.length) },
            { etiqueta: 'Unidades en stock', valor: String(totalUnidades) },
            { etiqueta: 'Valor del inventario', valor: `$${valorTotal.toFixed(2)}` },
            { etiqueta: 'Productos bajo mínimo', valor: String(bajoStock) },
        ],
        tabla: {
            headers: ['Producto', 'Stock', 'Mín.', 'P. Venta', 'Valor'],
            anchos: [45, 12, 12, 15, 16],
            rows: filtrados.slice(0, 200).map(p => [
                String(p.nombre ?? ''),
                String(p.stockActual ?? 0),
                String(p.stockMinimo ?? 0),
                `$${(p.precioVenta ?? 0).toFixed(2)}`,
                `$${((p.stockActual ?? 0) * (p.precioVenta ?? 0)).toFixed(2)}`,
            ]),
        },
        firmaIzquierda: 'Firma del encargado',
        firmaDerecha: 'Firma del jefe / auditor',
        nombreArchivo: `inventario_${new Date().toISOString().split('T')[0]}.pdf`,
    });
}

export async function reporteFiados(
    ctx: ContextoNegocio,
    clientes: any[]
): Promise<Blob> {
    const conDeuda = clientes
        .filter(c => (c.saldoPendiente ?? 0) > 0)
        .sort((a, b) => (b.saldoPendiente ?? 0) - (a.saldoPendiente ?? 0));

    const total = conDeuda.reduce((s, c) => s + (c.saldoPendiente ?? 0), 0);

    return generarReportePDF({
        nombreNegocio: ctx.nombre,
        direccion: ctx.direccion,
        telefono: ctx.telefono,
        logoUrl: ctx.logoUrl,
        titulo: 'Libreta de Fiados',
        subtitulo: 'Estado de cuentas pendientes',
        periodo: new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' }),
        generadoPor: ctx.usuarioNombre,
        filas: [
            { etiqueta: 'Clientes con deuda', valor: String(conDeuda.length) },
            { etiqueta: 'Total pendiente', valor: `$${total.toFixed(2)}` },
        ],
        tabla: {
            headers: ['Cliente', 'Teléfono', 'Deuda'],
            anchos: [50, 25, 25],
            rows: conDeuda.map(c => [
                String(c.nombre ?? ''),
                String(c.telefono ?? '—'),
                `$${(c.saldoPendiente ?? 0).toFixed(2)}`,
            ]),
        },
        notas: conDeuda.length === 0 ? 'No hay deudas pendientes.' : undefined,
        firmaIzquierda: 'Firma del cobrador',
        firmaDerecha: 'Firma del cliente / recibido',
        nombreArchivo: `fiados_${new Date().toISOString().split('T')[0]}.pdf`,
    });
}

export async function reporteCierreCaja(
    ctx: ContextoNegocio,
    datos: {
        fecha: string;
        totalVentas: number;
        cantidadVentas: number;
        desglosePorMetodo: { metodo: string; monto: number }[];
        gastos: number;
        efectivoEsperado: number;
        efectivoReal?: number;
    }
): Promise<Blob> {
    const diferencia = datos.efectivoReal !== undefined
        ? datos.efectivoReal - datos.efectivoEsperado
        : undefined;

    const filas: FilaReporte[] = [
        { etiqueta: 'Total vendido', valor: `$${datos.totalVentas.toFixed(2)}` },
        { etiqueta: 'Cantidad de ventas', valor: String(datos.cantidadVentas) },
        { etiqueta: 'Ticket promedio', valor: `$${(datos.totalVentas / Math.max(datos.cantidadVentas, 1)).toFixed(2)}` },
        { etiqueta: 'Gastos del día', valor: `$${datos.gastos.toFixed(2)}` },
        { etiqueta: 'Efectivo esperado', valor: `$${datos.efectivoEsperado.toFixed(2)}` },
    ];

    if (datos.efectivoReal !== undefined) {
        filas.push({ etiqueta: 'Efectivo contado', valor: `$${datos.efectivoReal.toFixed(2)}` });
        if (diferencia !== undefined) {
            filas.push({
                etiqueta: 'Diferencia',
                valor: `${diferencia >= 0 ? '+' : ''}$${diferencia.toFixed(2)}${diferencia === 0 ? ' OK' : ' !'}`,
            });
        }
    }

    return generarReportePDF({
        nombreNegocio: ctx.nombre,
        direccion: ctx.direccion,
        telefono: ctx.telefono,
        logoUrl: ctx.logoUrl,
        titulo: 'Cierre de Caja',
        subtitulo: `Cierre del ${datos.fecha}`,
        periodo: datos.fecha,
        generadoPor: ctx.usuarioNombre,
        filas,
        tabla: {
            headers: ['Método de pago', 'Monto'],
            anchos: [70, 30],
            rows: datos.desglosePorMetodo.map(d => [d.metodo, `$${d.monto.toFixed(2)}`]),
        },
        firmaIzquierda: 'Firma del cajero',
        firmaDerecha: 'Firma del supervisor',
        nombreArchivo: `cierre_${new Date().toISOString().split('T')[0]}.pdf`,
    });
}