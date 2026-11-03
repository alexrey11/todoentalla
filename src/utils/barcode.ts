// ============================================================
// Generador de códigos de barras (para etiquetas y PDFs)
// ============================================================

import JsBarcode from 'jsbarcode';

/**
 * Genera un código de barras como Data URL (PNG en base64).
 * Ideal para embeber en PDFs o en etiquetas HTML.
 */
export function generarBarcodeDataURL(
    codigo: string,
    opciones?: {
        format?: 'EAN13' | 'CODE128' | 'UPC' | 'EAN8' | 'CODE39';
        width?: number;
        height?: number;
        displayValue?: boolean;
        fontSize?: number;
        margin?: number;
        background?: string;
        lineColor?: string;
    }
): string {
    const canvas = document.createElement('canvas');

    const opts = {
        format: opciones?.format || 'CODE128',
        width: opciones?.width || 2,
        height: opciones?.height || 60,
        displayValue: opciones?.displayValue ?? true,
        fontSize: opciones?.fontSize || 14,
        margin: opciones?.margin ?? 4,
        background: opciones?.background || '#ffffff',
        lineColor: opciones?.lineColor || '#000000',
    };

    try {
        JsBarcode(canvas, codigo, opts);
        return canvas.toDataURL('image/png');
    } catch (e) {
        console.warn('[barcode] Error generando código:', codigo, e);
        return '';
    }
}

/**
 * Detecta el formato más adecuado según el código.
 * EAN-13 = 13 dígitos numéricos
 * EAN-8 = 8 dígitos numéricos
 * UPC-A = 12 dígitos numéricos
 * CODE128 = cualquier texto (fallback)
 */
export function detectarFormato(codigo: string): 'EAN13' | 'EAN8' | 'UPC' | 'CODE128' {
    const limpio = codigo.trim();
    if (/^\d{13}$/.test(limpio)) return 'EAN13';
    if (/^\d{8}$/.test(limpio)) return 'EAN8';
    if (/^\d{12}$/.test(limpio)) return 'UPC';
    return 'CODE128';
}