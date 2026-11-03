// ============================================================
// Helper unificado para guardar/leer archivos
// - Tauri (PC): diálogo nativo "Guardar como..."
// - Android: guarda en caché + Share sheet (Android 11+ friendly)
// - Web: descarga directa
// ============================================================

import { Capacitor } from '@capacitor/core';

function esTauri(): boolean {
    return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

/**
 * Guarda un archivo en el dispositivo.
 * - PC: abre diálogo "Guardar como..."
 * - Android: guarda en caché y abre el share sheet nativo
 * - Web: descarga a la carpeta Descargas del navegador
 */
export async function guardarArchivo(
    contenido: Blob | string | Uint8Array,
    nombreArchivo: string,
    mimeType: string
): Promise<{ ok: boolean; mensaje: string; ubicacion?: string }> {
    try {


        if (Capacitor.isNativePlatform()) {
            return await guardarConCapacitor(contenido, nombreArchivo);
        }
        return descargarEnWeb(contenido, nombreArchivo, mimeType);
    } catch (e: any) {
        console.error('[descargas] Error:', e);
        return { ok: false, mensaje: e?.message || 'Error al guardar el archivo' };
    }
}

/**
 * Comparte un archivo (abre el menú de compartir en Android).
 * En PC/Web hace lo mismo que guardar.
 */
export async function compartirArchivo(
    contenido: Blob | string | Uint8Array,
    nombreArchivo: string,
    mimeType: string
): Promise<{ ok: boolean; mensaje: string }> {
    try {
        if (!Capacitor.isNativePlatform() || esTauri()) {
            const res = await guardarArchivo(contenido, nombreArchivo, mimeType);
            return { ok: res.ok, mensaje: res.mensaje };
        }

        const { Filesystem, Directory } = await import('@capacitor/filesystem');
        const { Share } = await import('@capacitor/share');

        const bytes = await convertirABytes(contenido);
        const base64 = bytesToBase64(bytes);

        const res = await Filesystem.writeFile({
            path: nombreArchivo,
            data: base64,
            directory: Directory.Cache,
        });

        await Share.share({
            title: nombreArchivo,
            url: res.uri,
            dialogTitle: 'Guardar o compartir',
        });

        return { ok: true, mensaje: 'Menú de compartir abierto' };
    } catch (e: any) {
        if (esCancelacion(e)) return { ok: false, mensaje: 'cancelado' };
        console.error('[descargas] Error al compartir:', e);
        return { ok: false, mensaje: e?.message || 'Error al compartir' };
    }
}

// ===== Helpers =====
function esCancelacion(e: any): boolean {
    const msg = String(e?.message || '').toLowerCase();
    return msg.includes('cancel') || msg.includes('abort') || msg.includes('user cancelled');
}



// ===== Capacitor (Android 11+) =====
async function guardarConCapacitor(
    contenido: Blob | string | Uint8Array,
    nombreArchivo: string
): Promise<{ ok: boolean; mensaje: string; ubicacion?: string }> {
    const { Filesystem, Directory } = await import('@capacitor/filesystem');
    const { Share } = await import('@capacitor/share');

    const bytes = await convertirABytes(contenido);
    const base64 = bytesToBase64(bytes);

    // ===== INTENTO 1: Documents (funciona en algunos dispositivos) =====
    try {
        const res = await Filesystem.writeFile({
            path: `CuentaClara/${nombreArchivo}`,
            data: base64,
            directory: Directory.Documents,
            recursive: true,
        });
        return {
            ok: true,
            mensaje: `Guardado en Documentos/CuentaClara`,
            ubicacion: res.uri,
        };
    } catch (e) {
        console.warn('[descargas] Documents bloqueado, usando Share:', e);
    }

    // ===== INTENTO 2: Cache + Share (SIEMPRE funciona en Android 13) =====
    try {
        const res = await Filesystem.writeFile({
            path: nombreArchivo,
            data: base64,
            directory: Directory.Cache,
        });

        await Share.share({
            title: nombreArchivo,
            url: res.uri,
            dialogTitle: 'Guardar o compartir',
        });

        return {
            ok: true,
            mensaje: 'Archivo compartido',
            ubicacion: res.uri,
        };
    } catch (e: any) {
        if (esCancelacion(e)) {
            return { ok: false, mensaje: 'cancelado' };
        }
        console.error('[descargas] Error en cache+share:', e);
        return {
            ok: false,
            mensaje: `No se pudo guardar: ${e?.message || 'error'}`,
        };
    }
}

// ===== Web =====
function descargarEnWeb(
    contenido: Blob | string | Uint8Array,
    nombreArchivo: string,
    mimeType: string
): { ok: boolean; mensaje: string } {
    let blob: Blob;

    if (contenido instanceof Blob) {
        blob = contenido;
    } else if (typeof contenido === 'string') {
        blob = new Blob([contenido], { type: mimeType });
    } else {
        const arrayBuffer = contenido.buffer.slice(
            contenido.byteOffset,
            contenido.byteOffset + contenido.byteLength
        ) as ArrayBuffer;
        blob = new Blob([arrayBuffer], { type: mimeType });
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = nombreArchivo;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    return { ok: true, mensaje: 'Descarga iniciada' };
}

// ===== Utilidades =====
async function convertirABytes(
    contenido: Blob | string | Uint8Array
): Promise<Uint8Array> {
    if (contenido instanceof Uint8Array) return contenido;
    if (typeof contenido === 'string') return new TextEncoder().encode(contenido);
    const buffer = await contenido.arrayBuffer();
    return new Uint8Array(buffer);
}

function bytesToBase64(bytes: Uint8Array): string {
    const chunkSize = 8192;
    let binary = '';
    for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
        binary += String.fromCharCode.apply(null, Array.from(chunk));
    }
    return btoa(binary);
}

export function uint8ToBlob(data: Uint8Array, mimeType: string): Blob {
    const arrayBuffer = data.buffer.slice(
        data.byteOffset,
        data.byteOffset + data.byteLength
    ) as ArrayBuffer;
    return new Blob([arrayBuffer], { type: mimeType });
}