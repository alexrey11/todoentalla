// ============================================================
// Sistema de licencias offline con firma HMAC-like
// ============================================================

// Secreto fragmentado (dificulta encontrarlo con Ctrl+F en el bundle)
const _a = 'CuentaClara';
const _b = 'Biz';
const _c = '-v1.0.0-';
const _d = '2024';
const _secreto = () => [_a, _c, _b, _d].join('');

// Master code fragmentado — cambia esto antes de compilar para producción
const _m1 = 'CC';
const _m2 = 'X9K2';
const _m3 = 'M4T7';
const _m4 = 'R8W3';
const _m5 = 'J5N8';
export const getMasterCode = () => [_m1, _m2, _m3, _m4, _m5].join('-');
// ⬆️ CC-X9K2-M4T7-R8W3-J5N8

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CHAR_CLASS = '[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]';
const CODE_RE = new RegExp(
    `^CC-${CHAR_CLASS}{4}-${CHAR_CLASS}{4}-${CHAR_CLASS}{4}-${CHAR_CLASS}{4}$`
);

function hash32(str: string, seed: number): number {
    let h = seed >>> 0;
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h >>> 0;
}

function firma(str: string): string {
    const a = hash32(str, 0x811c9dc5);
    const b = hash32(str + _secreto(), 0x9e3779b1);
    const c = hash32(_secreto() + str, 0x85ebca6b);
    let n = (a ^ b ^ c) >>> 0;
    let out = '';
    for (let i = 0; i < 4; i++) {
        out += ALPHABET[n & 31];
        n = ((n >>> 5) ^ Math.imul(n, 0x9e3779b1)) >>> 0;
    }
    return out;
}

export function esCodigoMaster(codigo: string): boolean {
    const limpio = codigo.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const masterLimpio = getMasterCode().toUpperCase().replace(/[^A-Z0-9]/g, '');
    return limpio === masterLimpio;
}
/** Genera un código nuevo. Solo lo usa el panel del dev. */
export function generarCodigoLicencia(): string {
    let cuerpo = '';
    for (let b = 0; b < 3; b++) {
        let bloque = '';
        for (let i = 0; i < 4; i++) {
            bloque += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
        }
        cuerpo += (b > 0 ? '-' : '') + bloque;
    }
    return `CC-${cuerpo}-${firma(cuerpo)}`;
}

/** Valida un código introducido por el usuario. Acepta master también. */
export function validarCodigoLicencia(codigo: string): boolean {
    if (!codigo) return false;
    const limpio = codigo.trim().toUpperCase().replace(/\s+/g, '');

    // Master bypass
    if (esCodigoMaster(limpio)) return true;

    // Validación HMAC regular
    if (!CODE_RE.test(limpio)) return false;
    const partes = limpio.split('-');
    const cuerpo = `${partes[1]}-${partes[2]}-${partes[3]}`;
    return partes[4] === firma(cuerpo);
}
/** Firma interna usada por trialUtils para firmar registros. */
export function firmaInterna(str: string): string {
    return firma(str);
}