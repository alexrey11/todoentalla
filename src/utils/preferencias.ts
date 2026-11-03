// ============================================================
// Sistema de preferencias del usuario
// ============================================================

import { db } from '../db';
import type { ConfigKiosco } from '../pages/Kiosco';
import { KIOSCO_DEFAULT } from '../pages/Kiosco';

const CLAVE = 'preferencias';

export type TamanoFuente = 'pequeno' | 'normal' | 'grande';
export type FormatoFecha = 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
export type FormatoHora = '12h' | '24h';
export type PinLongitud = 4 | 6 | 8;

export interface Preferencias {
    // Venta
    ticketAutomatico: boolean;
    vibracionAlEscanear: boolean;
    sonidoAlCobrar: boolean;
    // Clara IA
    mostrarIA: boolean;

    // Apariencia
    modoCompacto: boolean;
    animacionesActivas: boolean;
    tamanoFuente: TamanoFuente;
    // Escucha continua por voz (wake word)
    wakeWordActivo: boolean;
    wakeWordFrases: string[];

    // Formato
    monedaSimbolo: string;
    formatoFecha: FormatoFecha;
    formatoHora: FormatoHora;

    // Confirmaciones
    confirmarEliminar: boolean;
    confirmarCerrarSesion: boolean;

    // Seguridad
    autoLogoutMinutos: 0 | 5 | 15 | 30;
    pinLongitud: PinLongitud;
    pinMaestro: string;

    // Onboarding
    mostrarBannerBienvenida: boolean;
    mostrarGuiaAlEntrar: boolean;

    // Notificaciones
    notificarStockBajo: boolean;
    backupRecordatorioSemanal: boolean;

    // Sidebar
    menuItemsOcultos: string[];

    // Permisos del vendedor (lo que el admin/jefe decide que vea)
    vistasPermitidasVendedor: string[];

    // Modo Kiosco (pantalla cuando nadie ha iniciado sesión)
    kiosco: ConfigKiosco;
}

// Vistas que un vendedor puede tener acceso (configurable por admin)
export const VISTAS_OPCIONALES_VENDEDOR = [
    { id: 'historial', icon: '📜', label: 'Historial Ventas', desc: 'Ver todas las ventas registradas' },
    { id: 'clientes', icon: '👥', label: 'Clientes', desc: 'Gestionar clientes y fiados' },
    { id: 'cierre', icon: '💰', label: 'Cierre de Caja', desc: 'Cerrar la caja al final del día' },
    { id: 'devoluciones', icon: '🔄', label: 'Devoluciones', desc: 'Procesar devoluciones' },
    { id: 'movimientos', icon: '📦', label: 'Movimientos', desc: 'Ver movimientos de inventario' },
    { id: 'comisiones', icon: '💵', label: 'Comisiones', desc: 'Ver sus propias comisiones' },
    { id: 'reportes', icon: '📄', label: 'Reportes', desc: 'Generar reportes PDF/CSV' },
    { id: 'cotizaciones', icon: '📄', label: 'Cotizaciones', desc: 'Generar presupuestos' },
    { id: 'etiquetas', icon: '🏷️', label: 'Etiquetas', desc: 'Generar códigos de barras' },
    { id: 'dashboard', icon: '📊', label: 'Panel de Control', desc: 'Ver estadísticas del negocio' },
    { id: 'categorias', icon: '📂', label: 'Categorías', desc: 'Ver catálogo de productos' },
    { id: 'transferencias', icon: '🔄', label: 'Transferencias', desc: 'Mover stock entre sucursales' },
] as const;

export const PREFERENCIAS_DEFAULT: Preferencias = {
    ticketAutomatico: true,
    vibracionAlEscanear: true,
    sonidoAlCobrar: false,
    modoCompacto: false,
    animacionesActivas: true,
    tamanoFuente: 'normal',
    monedaSimbolo: '$',
    formatoFecha: 'DD/MM/YYYY',
    formatoHora: '24h',
    confirmarEliminar: true,
    confirmarCerrarSesion: false,
    autoLogoutMinutos: 0,
    pinLongitud: 4,
    pinMaestro: '',
    mostrarIA: true,
    mostrarBannerBienvenida: true,
    mostrarGuiaAlEntrar: true,
    notificarStockBajo: true,
    backupRecordatorioSemanal: true,
    wakeWordActivo: false,
    wakeWordFrases: ['busca', 'ia busca', 'oye busca', 'hey busca'],

    menuItemsOcultos: [],
    vistasPermitidasVendedor: [],

    kiosco: KIOSCO_DEFAULT,
};

let cache: Preferencias | null = null;

export async function cargarPreferencias(): Promise<Preferencias> {
    if (cache) return cache;
    try {
        const entry = await db.config.get(CLAVE);
        if (entry) {
            const parsed = JSON.parse(entry.value);
            const resultado: Preferencias = {
                ...PREFERENCIAS_DEFAULT,
                ...parsed,
                // Merge profundo del kiosco para no perder campos al actualizar versiones
                kiosco: { ...KIOSCO_DEFAULT, ...(parsed?.kiosco ?? {}) },
            };
            cache = resultado;
            return resultado;
        }
    } catch (e) {
        console.warn('[preferencias] Error al cargar:', e);
    }
    const defaults: Preferencias = { ...PREFERENCIAS_DEFAULT };
    cache = defaults;
    return defaults;
}

export async function guardarPreferencias(prefs: Preferencias): Promise<void> {
    cache = prefs;
    await db.config.put({ key: CLAVE, value: JSON.stringify(prefs) });
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('preferencias-cambiadas', { detail: prefs }));
    }
}

export async function actualizarPreferencia<K extends keyof Preferencias>(
    clave: K,
    valor: Preferencias[K]
): Promise<Preferencias> {
    const actuales = await cargarPreferencias();
    const nuevas: Preferencias = { ...actuales, [clave]: valor };
    await guardarPreferencias(nuevas);
    return nuevas;
}

export function obtenerPreferenciasSync(): Preferencias {
    return cache ?? { ...PREFERENCIAS_DEFAULT };
}

export async function resetearPreferencias(): Promise<Preferencias> {
    const defaults: Preferencias = { ...PREFERENCIAS_DEFAULT };
    await guardarPreferencias(defaults);
    return defaults;
}

/** Aplica el tamaño de fuente al documento */
export function aplicarTamanoFuente(tamano: TamanoFuente) {
    const html = document.documentElement;
    const map: Record<TamanoFuente, string> = {
        pequeno: '13px',
        normal: '16px',
        grande: '19px',
    };
    html.style.fontSize = map[tamano] || '16px';
}

/** Aplica el modo compacto (clase en el body) */
export function aplicarModoCompacto(activo: boolean) {
    if (activo) document.body.classList.add('modo-compacto');
    else document.body.classList.remove('modo-compacto');
}

/** Aplica animaciones on/off (clase en el body) */
export function aplicarAnimaciones(activas: boolean) {
    if (!activas) document.body.classList.add('sin-animaciones');
    else document.body.classList.remove('sin-animaciones');
}

/** Aplica TODAS las preferencias visuales al documento */
export function aplicarPreferenciasVisuales(prefs: Preferencias) {
    aplicarTamanoFuente(prefs.tamanoFuente);
    aplicarModoCompacto(prefs.modoCompacto);
    aplicarAnimaciones(prefs.animacionesActivas);
}

/** ¿Un vendedor puede ver esta vista? */
export function vendedorPuedeVer(vista: string, prefs: Preferencias): boolean {
    // Vistas que SIEMPRE puede ver un vendedor
    if (vista === 'venta' || vista === 'ayuda') return true;
    // El resto depende de lo que el admin haya permitido
    return prefs.vistasPermitidasVendedor.includes(vista);
}