// ============================================================
// Generador de PDF para cotizaciones
// ============================================================

import jsPDF from 'jspdf';
import type { Cotizacion } from '../db';
import { formatearFecha, formatearMoneda } from './formato';

export async function generarPDFCotizacion(
    cot: Cotizacion,
    opciones?: {
        nombreNegocio?: string;
        direccionNegocio?: string;
        telefonoNegocio?: string;
        emailNegocio?: string;
    }
): Promise<Uint8Array> {
    const doc = new jsPDF();
    const ancho = doc.internal.pageSize.getWidth();

    // ===== HEADER =====
    // Barra superior
    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, ancho, 28, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('COTIZACIÓN', 14, 18);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(opciones?.nombreNegocio || 'CuentaClara', ancho - 14, 12, { align: 'right' });
    if (opciones?.telefonoNegocio) {
        doc.text(`Tel: ${opciones.telefonoNegocio}`, ancho - 14, 18, { align: 'right' });
    }
    if (opciones?.direccionNegocio) {
        doc.setFontSize(8);
        doc.text(opciones.direccionNegocio, ancho - 14, 24, { align: 'right' });
    }

    // ===== INFO =====
    doc.setTextColor(15, 23, 42);
    let y = 42;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`N° ${cot.numero}`, 14, y);
    doc.text(`Fecha: ${formatearFecha(cot.fecha)}`, ancho - 14, y, { align: 'right' });
    y += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Válida hasta: ${formatearFecha(cot.validaHasta)}`, ancho - 14, y, { align: 'right' });
    y += 12;

    // Cliente
    doc.setFillColor(241, 245, 249);
    doc.rect(14, y, ancho - 28, 20, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Cliente:', 18, y + 7);
    doc.setFont('helvetica', 'normal');
    doc.text(cot.clienteNombre, 18, y + 14);
    if (cot.clienteTelefono) {
        doc.setFontSize(9);
        doc.text(`Tel: ${cot.clienteTelefono}`, ancho - 18, y + 14, { align: 'right' });
    }
    y += 30;

    // ===== TABLA DE ITEMS =====
    // Encabezado
    doc.setFillColor(30, 41, 59);
    doc.rect(14, y, ancho - 28, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Producto', 18, y + 5.5);
    doc.text('Cant.', 130, y + 5.5, { align: 'center' });
    doc.text('Precio', 155, y + 5.5, { align: 'right' });
    doc.text('Subtotal', ancho - 18, y + 5.5, { align: 'right' });
    y += 8;

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'normal');

    let subtotal = 0;

    cot.items.forEach((item, idx) => {
        // Nueva página si se acaba el espacio
        if (y > 250) {
            doc.addPage();
            y = 20;
        }

        // Fila alternada
        if (idx % 2 === 0) {
            doc.setFillColor(248, 250, 252);
            doc.rect(14, y, ancho - 28, 8, 'F');
        }

        const nombre = item.productoNombre.length > 45
            ? item.productoNombre.slice(0, 42) + '...'
            : item.productoNombre;

        doc.text(nombre, 18, y + 5.5);
        doc.text(String(item.cantidad), 130, y + 5.5, { align: 'center' });
        doc.text(formatearMoneda(item.precioUnitario), 155, y + 5.5, { align: 'right' });
        doc.text(formatearMoneda(item.subtotal), ancho - 18, y + 5.5, { align: 'right' });

        subtotal += item.subtotal;
        y += 8;
    });

    y += 6;

    // ===== TOTALES =====
    doc.setDrawColor(37, 99, 235);
    doc.setLineWidth(0.5);
    doc.line(ancho - 80, y, ancho - 14, y);
    y += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Subtotal:', ancho - 80, y);
    doc.text(formatearMoneda(subtotal), ancho - 18, y, { align: 'right' });
    y += 6;

    if (cot.descuentoMonto && cot.descuentoMonto > 0) {
        doc.setTextColor(220, 38, 38);
        doc.text(`Descuento${cot.descuentoPorcentaje ? ` (${cot.descuentoPorcentaje}%)` : ''}:`, ancho - 80, y);
        doc.text(`-${formatearMoneda(cot.descuentoMonto)}`, ancho - 18, y, { align: 'right' });
        doc.setTextColor(15, 23, 42);
        y += 6;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(37, 99, 235);
    doc.text('TOTAL:', ancho - 80, y);
    doc.text(formatearMoneda(cot.total), ancho - 18, y, { align: 'right' });

    // ===== NOTAS =====
    if (cot.notas) {
        y += 16;
        if (y > 250) { doc.addPage(); y = 20; }
        doc.setTextColor(15, 23, 42);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text('Notas:', 14, y);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(71, 85, 105);
        const notas = doc.splitTextToSize(cot.notas, ancho - 28);
        doc.text(notas, 14, y + 5);
        y += 5 + notas.length * 4;
    }

    // ===== PIE =====
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
        `Cotización válida hasta ${formatearFecha(cot.validaHasta)}. Los precios pueden cambiar sin previo aviso.`,
        ancho / 2,
        pageHeight - 15,
        { align: 'center' }
    );
    doc.text(
        `Generado por CuentaClara · ${formatearFecha(new Date())}`,
        ancho / 2,
        pageHeight - 10,
        { align: 'center' }
    );

    return new Uint8Array(doc.output('arraybuffer'));
}