// ============================================================
// Control de prueba de 15 días + activación de licencia
// ============================================================
import { db } from '../db';
import { firmaInterna, validarCodigoLicencia, esCodigoMaster } from './licenciaUtils';

const LS_TRIAL = 'cc.meta.v1';
const LS_LIC = 'cc.lic.v1';
const IDB_TRIAL = 'trial_meta';
const IDB_LIC = 'licencia_activa';

export const DIAS_PRUEBA = 15;

function b64e(s: string): string {
    try { return btoa(unescape(encodeURIComponent(s))); } catch { return s; }
}
function b64d(s: string): string {
    try { return decodeURIComponent(escape(atob(s))); } catch { return s; }
}

// ---------- Trial ----------

interface RegistroTrial { fecha: string; firma: string; }
const firmaTrial = (fecha: string) => firmaInterna(`TRIAL#${fecha}`);

async function escribirTrial(reg: RegistroTrial): Promise<void> {
    const json = JSON.stringify(reg);
    try { await db.config.put({ key: IDB_TRIAL, value: json }); } catch { /* noop */ }
    try { localStorage.setItem(LS_TRIAL, b64e(json)); } catch { /* noop */ }
}

async function leerTrial(): Promise<RegistroTrial | null> {
    try {
        const idb = await db.config.get(IDB_TRIAL);
        if (idb) {
            const r = JSON.parse(idb.value) as RegistroTrial;
            if (r?.fecha && r.firma === firmaTrial(r.fecha)) return r;
        }
    } catch { /* noop */ }

    try {
        const ls = localStorage.getItem(LS_TRIAL);
        if (ls) {
            const r = JSON.parse(b64d(ls)) as RegistroTrial;
            if (r?.fecha && r.firma === firmaTrial(r.fecha)) {
                await db.config.put({ key: IDB_TRIAL, value: JSON.stringify(r) });
                return r;
            }
        }
    } catch { /* noop */ }

    return null;
}

export async function esPrimeraInstalacion(): Promise<boolean> {
    return (await leerTrial()) === null;
}

export async function obtenerFechaInstalacion(): Promise<Date> {
    const reg = await leerTrial();
    if (reg) return new Date(reg.fecha);
    const ahora = new Date();
    await escribirTrial({
        fecha: ahora.toISOString(),
        firma: firmaTrial(ahora.toISOString()),
    });
    return ahora;
}

export async function diasRestantesPrueba(): Promise<number> {
    const fecha = await obtenerFechaInstalacion();
    const dias = Math.floor((Date.now() - fecha.getTime()) / 86_400_000);
    return Math.max(0, DIAS_PRUEBA - dias);
}

// ---------- Licencia activada ----------

interface LicenciaGuardada {
    codigo: string;
    fechaActivacion: string;
    esMaster: boolean;
    firma: string;
}

const firmaLic = (codigo: string, fecha: string, esMaster: boolean) =>
    firmaInterna(`LIC#${codigo}#${fecha}#${esMaster ? 'M' : 'R'}`);

async function escribirLicencia(lic: LicenciaGuardada): Promise<void> {
    const json = JSON.stringify(lic);
    try { await db.config.put({ key: IDB_LIC, value: json }); } catch { /* noop */ }
    try { localStorage.setItem(LS_LIC, b64e(json)); } catch { /* noop */ }
}

async function leerLicencia(): Promise<LicenciaGuardada | null> {
    const validar = (l: LicenciaGuardada): boolean =>
        !!l?.codigo &&
        !!l.fechaActivacion &&
        typeof l.esMaster === 'boolean' &&
        l.firma === firmaLic(l.codigo, l.fechaActivacion, l.esMaster) &&
        validarCodigoLicencia(l.codigo);

    try {
        const idb = await db.config.get(IDB_LIC);
        if (idb) {
            const l = JSON.parse(idb.value) as LicenciaGuardada;
            if (validar(l)) return l;
        }
    } catch { /* noop */ }

    try {
        const ls = localStorage.getItem(LS_LIC);
        if (ls) {
            const l = JSON.parse(b64d(ls)) as LicenciaGuardada;
            if (validar(l)) {
                await db.config.put({ key: IDB_LIC, value: JSON.stringify(l) });
                return l;
            }
        }
    } catch { /* noop */ }

    return null;
}

export async function estaActivada(): Promise<boolean> {
    return (await leerLicencia()) !== null;
}

export async function activarLicencia(codigo: string): Promise<{ ok: boolean; error?: string }> {
    const limpio = codigo.trim().toUpperCase().replace(/\s+/g, '');
    if (!validarCodigoLicencia(limpio)) {
        return { ok: false, error: 'Código inválido. Verifica que lo copiaste bien.' };
    }
    const fecha = new Date().toISOString();
    const esMaster = esCodigoMaster(limpio);
    await escribirLicencia({
        codigo: limpio,
        fechaActivacion: fecha,
        esMaster,
        firma: firmaLic(limpio, fecha, esMaster),
    });
    return { ok: true };
}

export async function obtenerInfoLicencia(): Promise<{
    activa: boolean;
    esMaster: boolean;
    codigo: string | null;
    fechaActivacion: string | null;
    diasRestantes: number;
}> {
    const lic = await leerLicencia();
    const dias = await diasRestantesPrueba();
    return {
        activa: lic !== null,
        esMaster: lic?.esMaster ?? false,
        codigo: lic?.codigo ?? null,
        fechaActivacion: lic?.fechaActivacion ?? null,
        diasRestantes: dias,
    };
}