// ============================================================
// Estado de la caja por PDV
// - Cierra: al guardar el cierre de caja
// - Abre: al día siguiente automáticamente, o manualmente por admin/jefe
// ============================================================

const CLAVE = (pdvId: number) => `cc.caja-estado.${pdvId}`;

export interface EstadoCaja {
    cerrada: boolean;
    /** Fecha de cierre en ISO (YYYY-MM-DD). Si es de otro día, se ignora. */
    fechaCierre: string;
    cerradaPor: string;
    cerradaEn: number; // timestamp
    motivo?: string;
}

/** Devuelve la fecha de hoy en formato YYYY-MM-DD */
function hoy(): string {
    return new Date().toISOString().split('T')[0];
}

/**
 * ¿La caja de este PDV está cerrada HOY?
 * Si el cierre es de otro día, se considera abierta (día nuevo).
 */
export function estaCajaCerrada(pdvId: number): boolean {
    try {
        const raw = localStorage.getItem(CLAVE(pdvId));
        if (!raw) return false;
        const estado: EstadoCaja = JSON.parse(raw);
        if (!estado.cerrada) return false;
        // Si el cierre es de hoy → cerrada
        // Si es de otro día → abierta (día nuevo, arranca limpio)
        return estado.fechaCierre === hoy();
    } catch {
        return false;
    }
}

/** Marca la caja como cerrada */
export function cerrarCaja(pdvId: number, cerradaPor: string, motivo?: string): void {
    try {
        const estado: EstadoCaja = {
            cerrada: true,
            fechaCierre: hoy(),
            cerradaPor,
            cerradaEn: Date.now(),
            motivo,
        };
        localStorage.setItem(CLAVE(pdvId), JSON.stringify(estado));
    } catch (e) {
        console.warn('[estadoCaja] Error al cerrar:', e);
    }
}

/** Reabre la caja (solo admin/jefe) */
export function reabrirCaja(pdvId: number, reabiertaPor: string, motivo: string): void {
    try {
        const estado: EstadoCaja = {
            cerrada: false,
            fechaCierre: hoy(),
            cerradaPor: reabiertaPor,
            cerradaEn: Date.now(),
            motivo,
        };
        localStorage.setItem(CLAVE(pdvId), JSON.stringify(estado));
    } catch (e) {
        console.warn('[estadoCaja] Error al reabrir:', e);
    }
}

/** Lee el estado completo (útil para mostrar info) */
export function obtenerEstadoCaja(pdvId: number): EstadoCaja | null {
    try {
        const raw = localStorage.getItem(CLAVE(pdvId));
        if (!raw) return null;
        return JSON.parse(raw) as EstadoCaja;
    } catch {
        return null;
    }
}