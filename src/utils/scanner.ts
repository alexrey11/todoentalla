// ============================================================
// Servicio de escáner: cámara (ML Kit) y Bluetooth HID
// ============================================================

import { Capacitor } from '@capacitor/core';
import { BarcodeScanner, BarcodeFormat } from '@capacitor-mlkit/barcode-scanning';

// ===== BLUETOOTH (HID) =====

let buffer = '';
let ultimaTeclaTiempo = 0;
const VELOCIDAD_MINIMA_MS = 50;

export interface ScannerListener {
    (codigo: string): void;
}

let listeners: ScannerListener[] = [];

export function onScanBluetooth(callback: ScannerListener): () => void {
    listeners.push(callback);
    return () => {
        listeners = listeners.filter(l => l !== callback);
    };
}

export function iniciarEscuchaBluetooth(): () => void {
    if (typeof window === 'undefined') return () => { };

    const handler = (e: KeyboardEvent) => {
        const ahora = Date.now();

        if (ahora - ultimaTeclaTiempo > 100) buffer = '';

        if (e.key.length === 1) {
            const intervalo = ahora - ultimaTeclaTiempo;
            ultimaTeclaTiempo = ahora;
            buffer += e.key;
            if (intervalo < VELOCIDAD_MINIMA_MS || buffer.length > 8) e.preventDefault();
        }

        if (e.key === 'Enter' && buffer.length >= 4) {
            const codigo = buffer.trim();
            buffer = '';
            ultimaTeclaTiempo = 0;
            if (codigo.length >= 4) {
                e.preventDefault();
                listeners.forEach(l => l(codigo));
            }
        }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
}

// ===== CÁMARA (ML KIT) =====

export async function pedirPermisoCamara(): Promise<boolean> {
    try {
        const { camera } = await BarcodeScanner.checkPermissions();
        if (camera === 'granted') return true;
        if (camera === 'denied') {
            await BarcodeScanner.openSettings();
            return false;
        }
        const { camera: nuevo } = await BarcodeScanner.requestPermissions();
        return nuevo === 'granted';
    } catch (e) {
        console.error('[scanner] Error pidiendo permiso:', e);
        return false;
    }
}

/** Formatos soportados (los más comunes en retail) */
export const FORMATOS_ESCANEO = [
    BarcodeFormat.Ean13,
    BarcodeFormat.Ean8,
    BarcodeFormat.UpcA,
    BarcodeFormat.UpcE,
    BarcodeFormat.Code128,
    BarcodeFormat.Code39,
    BarcodeFormat.Code93,
    BarcodeFormat.Itf,
    BarcodeFormat.QrCode,
    BarcodeFormat.DataMatrix,
    BarcodeFormat.Pdf417,
    BarcodeFormat.Aztec,
    BarcodeFormat.Codabar,
];

/** Inicia el escaneo en modo overlay (cámara detrás del webview). */
export async function iniciarEscaneoOverlay(): Promise<() => void> {
    if (!Capacitor.isNativePlatform()) {
        throw new Error('El escáner solo funciona en la app instalada.');
    }

    const permiso = await pedirPermisoCamara();
    if (!permiso) throw new Error('Permiso de cámara denegado');

    // Activar modo transparente
    document.body.classList.add('scanner-activo');

    // Listener para el primer código
    const listener = await BarcodeScanner.addListener('barcodesScanned', () => { });

    await BarcodeScanner.startScan({
        formats: FORMATOS_ESCANEO,
    });

    // Devolvemos función para detener
    return async () => {
        try { await BarcodeScanner.stopScan(); } catch { }
        try { await listener.remove(); } catch { }
        document.body.classList.remove('scanner-activo');
    };
}

/** Detiene el escaneo y limpia. */
export async function detenerEscaneo(): Promise<void> {
    try { await BarcodeScanner.stopScan(); } catch { }
    document.body.classList.remove('scanner-activo');
}