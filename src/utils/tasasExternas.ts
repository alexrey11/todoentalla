// ============================================================
// Tasas de cambio — El Toque (modo manual mientras llega el token)
// ============================================================

const WORKER_URL = ''; // ← Deja vacío hasta que llegue el token
const CLAVE_CACHE = 'cc.tasas.cache';
const CLAVE_ULTIMA_ACT = 'cc.tasas.ultima.actualizacion';

let cache: TasasExternas | null = null;

export interface TasasExternas {
    usd: number;
    eur: number;
    mlc: number;
    fecha: string;
    fuente: string;
    timestamp: number;
}

export async function obtenerTasasAutomaticas(): Promise<TasasExternas | null> {
    // Si no hay Worker configurado, no intentes nada
    if (!WORKER_URL) return null;

    // Cache en memoria
    if (cache && esReciente(cache.timestamp)) return cache;

    // Cache en localStorage
    try {
        const raw = localStorage.getItem(CLAVE_CACHE);
        if (raw) {
            const guardado = JSON.parse(raw) as TasasExternas;
            if (esReciente(guardado.timestamp)) {
                cache = guardado;
                return guardado;
            }
        }
    } catch { /* noop */ }

    // Fetch al Worker
    try {
        const res = await fetch(WORKER_URL, { headers: { 'Accept': 'application/json' } });
        if (!res.ok) return null;

        const data = await res.json();
        if (!data.usd && !data.eur && !data.mlc) return null;

        const tasas: TasasExternas = {
            usd: Number(data.usd) || 0,
            eur: Number(data.eur) || 0,
            mlc: Number(data.mlc) || 0,
            fecha: data.fecha || new Date().toISOString().split('T')[0],
            fuente: data.fuente || 'El Toque',
            timestamp: Date.now(),
        };

        cache = tasas;
        try {
            localStorage.setItem(CLAVE_CACHE, JSON.stringify(tasas));
            localStorage.setItem(CLAVE_ULTIMA_ACT, String(Date.now()));
        } catch { /* noop */ }

        return tasas;
    } catch {
        return null;
    }
}

function esReciente(timestamp: number): boolean {
    return Date.now() - timestamp < 60 * 60 * 1000;
}

export function obtenerUltimaActualizacion(): number | null {
    try {
        const raw = localStorage.getItem(CLAVE_ULTIMA_ACT);
        return raw ? Number(raw) : null;
    } catch { return null; }
}

export function limpiarCacheTasas(): void {
    cache = null;
    try {
        localStorage.removeItem(CLAVE_CACHE);
        localStorage.removeItem(CLAVE_ULTIMA_ACT);
    } catch { /* noop */ }
}

/** Marca la actualización como hecha manualmente */
export function marcarActualizacionManual(): void {
    try {
        localStorage.setItem(CLAVE_ULTIMA_ACT, String(Date.now()));
    } catch { /* noop */ }
}