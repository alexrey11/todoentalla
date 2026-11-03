// ============================================================
// Sistema de trazas de seguridad
// ============================================================
import { db } from '../db';
import type { TipoLogSeguridad } from '../db';

interface ContextoLog {
    usuarioId?: number;
    usuarioNombre?: string;
    detalles?: string;
}

/**
 * Registra un evento de seguridad en la base de datos.
 * Falla silenciosamente si hay error (no queremos que un log roto rompa la app).
 */
export async function registrarLog(
    tipo: TipoLogSeguridad,
    descripcion: string,
    contexto: ContextoLog = {}
): Promise<void> {
    try {
        await db.logsSeguridad.add({
            tipo,
            descripcion,
            usuarioId: contexto.usuarioId,
            usuarioNombre: contexto.usuarioNombre,
            detalles: contexto.detalles,
            fecha: new Date(),
        });
    } catch (e) {
        console.warn('[logger] No se pudo registrar log:', e);
    }
}

/** Cuenta total de logs */
export async function contarLogs(): Promise<number> {
    try {
        return await db.logsSeguridad.count();
    } catch {
        return 0;
    }
}

/** Borra logs con más de X días de antigüedad (mantenimiento) */
export async function limpiarLogsAntiguos(diasMaximos = 90): Promise<number> {
    try {
        const limite = new Date();
        limite.setDate(limite.getDate() - diasMaximos);
        const antiguos = await db.logsSeguridad
            .where('fecha')
            .below(limite)
            .toArray();
        if (antiguos.length === 0) return 0;
        await db.logsSeguridad.bulkDelete(antiguos.map((l) => l.id!));
        return antiguos.length;
    } catch {
        return 0;
    }
}