// ============================================================
// Sistema de impresión de tickets
// ============================================================

import type { Venta } from '../db';
import { formatearFecha, formatearHora } from './formato';

interface DatosTicket {
    venta: Venta;
    nombreNegocio?: string;
    direccionNegocio?: string;
    telefonoNegocio?: string;
}

export function generarHTMLTicket(datos: DatosTicket): string {
    const { venta, nombreNegocio, direccionNegocio, telefonoNegocio } = datos;

    const fechaStr = formatearFecha(venta.fecha);
    const horaStr = formatearHora(venta.fecha);

    const items = venta.items && venta.items.length > 0
        ? venta.items
        : [{
            productoId: venta.productoId || 0,
            productoNombre: venta.productoNombre || 'Producto',
            cantidad: venta.cantidad || 1,
            precioUnitario: venta.precioUnitario || venta.total,
            precioCompra: 0,
            subtotal: venta.total,
        }];

    const lineasItems = items.map(item => {
        const desc = item.descuentoPorcentaje
            ? `<div class="item-descuento">Descuento: -${item.descuentoPorcentaje}%</div>`
            : '';
        const variante = item.varianteNombre
            ? `<div class="item-descuento">👕 ${escaparHTML(item.varianteNombre)}</div>`
            : '';
        const unidad = item.unidadMedida && item.permiteFracciones ? ` ${item.unidadMedida}` : '';
        return `
            <div class="item">
                <div class="item-nombre">${escaparHTML(item.productoNombre)}</div>
                ${variante}
                ${desc}
                <div class="item-linea">
                    <span>${item.cantidad}${unidad} x $${item.precioUnitario.toFixed(2)}</span>
                    <span class="item-subtotal">$${item.subtotal.toFixed(2)}</span>
                </div>
            </div>
        `;
    }).join('');

    const subtotal = venta.subtotalSinDescuento || venta.total;
    const totalDescuento = (subtotal - venta.total);

    const lineasMetodos = (venta.metodosPago || []).map(mp => {
        const label = mp.tipo === 'efectivo' ? 'Efectivo'
            : mp.tipo === 'transferencia' ? 'Transferencia'
                : mp.tipo === 'tarjeta' ? 'Tarjeta' : 'Fiado';
        return `<div class="linea"><span>${label} (${mp.moneda})</span><span>$${mp.montoEnCUP.toFixed(2)}</span></div>`;
    }).join('');

    const tieneImpuesto = venta.impuestoMonto && venta.impuestoMonto > 0;
    const totalFinal = venta.totalConImpuesto || venta.total;

    return `
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Ticket ${venta.id || ''}</title>
<style>
    @page { margin: 0; size: 80mm auto; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Courier New', monospace; font-size: 12px; color: #000; background: #fff; padding: 4mm; width: 80mm; }
    .centro { text-align: center; }
    .header { text-align: center; margin-bottom: 3mm; }
    .negocio { font-size: 16px; font-weight: bold; text-transform: uppercase; }
    .info { font-size: 10px; margin-top: 1mm; }
    .divisor { border-top: 1px dashed #000; margin: 2mm 0; }
    .divisor-doble { border-top: 2px solid #000; margin: 2mm 0; }
    .linea { display: flex; justify-content: space-between; margin: 1mm 0; font-size: 11px; }
    .item { margin: 2mm 0; }
    .item-nombre { font-weight: bold; font-size: 12px; }
    .item-descuento { font-size: 10px; color: #555; }
    .item-linea { display: flex; justify-content: space-between; font-size: 11px; }
    .item-subtotal { font-weight: bold; }
    .total-grande { font-size: 18px; font-weight: bold; }
    .subtotal-tachado { text-decoration: line-through; color: #555; }
    .mensaje-final { text-align: center; font-size: 10px; margin-top: 3mm; }
    .impuesto { color: #333; }
</style>
</head>
<body>
    <div class="header">
        <div class="negocio">${escaparHTML(nombreNegocio || 'CuentaClara')}</div>
        ${direccionNegocio ? `<div class="info">${escaparHTML(direccionNegocio)}</div>` : ''}
        ${telefonoNegocio ? `<div class="info">Tel: ${escaparHTML(telefonoNegocio)}</div>` : ''}
    </div>
    <div class="divisor-doble"></div>
    <div class="linea"><span>Ticket #${venta.id || 'N/A'}</span><span>${fechaStr} ${horaStr}</span></div>
    <div class="linea"><span>Vendedor:</span><span>${escaparHTML(venta.vendedorNombre)}</span></div>
    ${venta.clienteNombre ? `<div class="linea"><span>Cliente:</span><span>${escaparHTML(venta.clienteNombre)}</span></div>` : ''}
    ${venta.puntoDeVentaNombre ? `<div class="linea"><span>PDV:</span><span>${escaparHTML(venta.puntoDeVentaNombre)}</span></div>` : ''}
    <div class="divisor"></div>
    ${lineasItems}
    <div class="divisor"></div>
    ${venta.descuentoGlobalPorcentaje || totalDescuento > 0 ? `
        <div class="linea"><span>Subtotal:</span><span class="subtotal-tachado">$${subtotal.toFixed(2)}</span></div>
        <div class="linea"><span>Descuento${venta.descuentoGlobalPorcentaje ? ` (${venta.descuentoGlobalPorcentaje}%)` : ''}:</span><span>-$${totalDescuento.toFixed(2)}</span></div>
    ` : ''}
    ${tieneImpuesto ? `
        <div class="linea"><span>Base:</span><span>$${venta.total.toFixed(2)}</span></div>
        <div class="linea impuesto"><span>Impuesto (${venta.impuestoPorcentaje}%):</span><span>+$${venta.impuestoMonto!.toFixed(2)}</span></div>
    ` : ''}
    <div class="divisor-doble"></div>
    <div class="linea total-grande"><span>TOTAL:</span><span>$${totalFinal.toFixed(2)} CUP</span></div>
    <div class="divisor-doble"></div>
    <div style="margin-top: 2mm;">
        ${lineasMetodos}
        ${venta.vueltoCUP && venta.vueltoCUP > 0 ? `<div class="divisor"></div><div class="linea"><span>VUELTO:</span><span>$${venta.vueltoCUP.toFixed(2)}</span></div>` : ''}
        ${venta.esFiado ? `<div class="linea" style="margin-top:2mm;font-weight:bold;"><span>⚠️ VENTA FIADA</span><span>$${totalFinal.toFixed(2)}</span></div>` : ''}
    </div>
    ${venta.notas ? `<div class="divisor"></div><div class="info">Notas: ${escaparHTML(venta.notas)}</div>` : ''}
    <div class="divisor-doble"></div>
    <div class="mensaje-final">¡Gracias por su compra!<br>Conserve este ticket para cambios o devoluciones.</div>
    <div class="info centro" style="margin-top:3mm;font-size:9px;color:#888;">Generado por CuentaClara</div>
</body>
</html>
    `;
}

function escaparHTML(texto: string): string {
    const div = document.createElement('div');
    div.textContent = texto;
    return div.innerHTML;
}

export function imprimirTicket(datos: DatosTicket): void {
    const html = generarHTMLTicket(datos);
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) {
        document.body.removeChild(iframe);
        alert('No se pudo generar el ticket');
        return;
    }
    doc.open();
    doc.write(html);
    doc.close();

    iframe.onload = () => {
        setTimeout(() => {
            try {
                iframe.contentWindow?.focus();
                iframe.contentWindow?.print();
            } catch (e) {
                console.error('[impresion] Error:', e);
                alert('No se pudo abrir el diálogo de impresión');
            } finally {
                setTimeout(() => {
                    if (document.body.contains(iframe)) document.body.removeChild(iframe);
                }, 5000);
            }
        }, 300);
    };
}

export function generarTextoPlanoTicket(datos: DatosTicket): string {
    const { venta, nombreNegocio, direccionNegocio, telefonoNegocio } = datos;
    const linea = '--------------------------------';
    const lineaDoble = '================================';
    let texto = '';

    texto += `\x1B\x61\x01`;
    texto += `${nombreNegocio || 'CuentaClara'}\n`;
    if (direccionNegocio) texto += `${direccionNegocio}\n`;
    if (telefonoNegocio) texto += `Tel: ${telefonoNegocio}\n`;
    texto += `\x1B\x61\x00`;
    texto += `${lineaDoble}\n`;
    texto += `Ticket #${venta.id || 'N/A'}     ${formatearFecha(venta.fecha)} ${formatearHora(venta.fecha)}\n`;
    texto += `Vendedor: ${venta.vendedorNombre}\n`;
    if (venta.clienteNombre) texto += `Cliente: ${venta.clienteNombre}\n`;
    if (venta.puntoDeVentaNombre) texto += `PDV: ${venta.puntoDeVentaNombre}\n`;
    texto += `${linea}\n`;

    const items = venta.items && venta.items.length > 0
        ? venta.items
        : [{
            productoNombre: venta.productoNombre || 'Producto',
            cantidad: venta.cantidad || 1,
            precioUnitario: venta.precioUnitario || venta.total,
            subtotal: venta.total,
            descuentoPorcentaje: 0,
            unidadMedida: undefined,
            permiteFracciones: false,
        }];

    items.forEach(item => {
        const unidad = item.unidadMedida && item.permiteFracciones ? ` ${item.unidadMedida}` : '';
        texto += `${item.productoNombre}\n`;
        if (item.descuentoPorcentaje) texto += `  Descuento: -${item.descuentoPorcentaje}%\n`;
        texto += `  ${item.cantidad}${unidad} x $${item.precioUnitario.toFixed(2)} = $${item.subtotal.toFixed(2)}\n`;
    });

    texto += `${lineaDoble}\n`;
    const tieneImpuesto = venta.impuestoMonto && venta.impuestoMonto > 0;
    const totalFinal = venta.totalConImpuesto || venta.total;
    if (tieneImpuesto) {
        texto += `Base: $${venta.total.toFixed(2)}\n`;
        texto += `Impuesto (${venta.impuestoPorcentaje}%): +$${venta.impuestoMonto!.toFixed(2)}\n`;
    }
    texto += `\x1B\x45\x01`;
    texto += `TOTAL: $${totalFinal.toFixed(2)} CUP\n`;
    texto += `\x1B\x45\x00`;
    texto += `${lineaDoble}\n`;

    (venta.metodosPago || []).forEach(mp => {
        const label = mp.tipo === 'efectivo' ? 'Efectivo' : mp.tipo === 'transferencia' ? 'Transferencia' : mp.tipo === 'tarjeta' ? 'Tarjeta' : 'Fiado';
        texto += `${label} (${mp.moneda}): $${mp.montoEnCUP.toFixed(2)}\n`;
    });
    if (venta.vueltoCUP && venta.vueltoCUP > 0) texto += `VUELTO: $${venta.vueltoCUP.toFixed(2)}\n`;
    if (venta.esFiado) texto += `\n*** VENTA FIADA ***\n`;
    texto += `${lineaDoble}\n`;
    texto += `\x1B\x61\x01`;
    texto += `¡Gracias por su compra!\n`;
    texto += `Conserve este ticket.\n\n\n\n`;
    texto += `\x1D\x56\x00`;
    return texto;
}

export function imprimirConRawBT(datos: DatosTicket): void {
    const texto = generarTextoPlanoTicket(datos);
    const base64 = btoa(unescape(encodeURIComponent(texto)));
    window.location.href = `rawbt:base64,${base64}`;
}