// ============================================================
// Helpers de formato (fecha, hora, moneda)
// Leen las preferencias del usuario automáticamente
// ============================================================

import { obtenerPreferenciasSync } from './preferencias';

/** Convierte una fecha a string según el formato configurado */
export function formatearFecha(fecha: Date | string | number): string {
    const d = fecha instanceof Date ? fecha : new Date(fecha);
    if (isNaN(d.getTime())) return '—';

    const prefs = obtenerPreferenciasSync();
    const dia = String(d.getDate()).padStart(2, '0');
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const anio = d.getFullYear();

    switch (prefs.formatoFecha) {
        case 'MM/DD/YYYY':
            return `${mes}/${dia}/${anio}`;
        case 'YYYY-MM-DD':
            return `${anio}-${mes}-${dia}`;
        case 'DD/MM/YYYY':
        default:
            return `${dia}/${mes}/${anio}`;
    }
}

/** Convierte una fecha a hora según el formato configurado */
export function formatearHora(fecha: Date | string | number): string {
    const d = fecha instanceof Date ? fecha : new Date(fecha);
    if (isNaN(d.getTime())) return '—';

    const prefs = obtenerPreferenciasSync();

    if (prefs.formatoHora === '12h') {
        let horas = d.getHours();
        const minutos = String(d.getMinutes()).padStart(2, '0');
        const ampm = horas >= 12 ? 'PM' : 'AM';
        horas = horas % 12;
        if (horas === 0) horas = 12;
        return `${horas}:${minutos} ${ampm}`;
    }

    const horas = String(d.getHours()).padStart(2, '0');
    const minutos = String(d.getMinutes()).padStart(2, '0');
    return `${horas}:${minutos}`;
}

/** Fecha + hora juntas */
export function formatearFechaHora(fecha: Date | string | number): string {
    return `${formatearFecha(fecha)} ${formatearHora(fecha)}`;
}

/** Formato corto para listas (ej: "18 sep") */
export function formatearFechaCorta(fecha: Date | string | number): string {
    const d = fecha instanceof Date ? fecha : new Date(fecha);
    if (isNaN(d.getTime())) return '—';

    const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    return `${d.getDate()} ${meses[d.getMonth()]}`;
}

/** Fecha larga (ej: "18 de septiembre de 2026") */
export function formatearFechaLarga(fecha: Date | string | number): string {
    const d = fecha instanceof Date ? fecha : new Date(fecha);
    if (isNaN(d.getTime())) return '—';

    const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    return `${d.getDate()} de ${meses[d.getMonth()]} de ${d.getFullYear()}`;
}

/** Formatea un monto con el símbolo de moneda configurado */
export function formatearMoneda(monto: number, opciones?: { decimals?: number; incluirSimbolo?: boolean }): string {
    const prefs = obtenerPreferenciasSync();
    const decimals = opciones?.decimals ?? 2;
    const incluirSimbolo = opciones?.incluirSimbolo ?? true;
    const numStr = monto.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

    if (!incluirSimbolo) return numStr;
    return `${prefs.monedaSimbolo}${numStr}`;
}

/** Monto redondeado (sin decimales) — para KPIs y cards */
export function formatearMonedaCorta(monto: number): string {
    return formatearMoneda(monto, { decimals: 0 });
}

/** Retorna solo el símbolo (para casos donde se muestra aparte) */
export function simboloMoneda(): string {
    return obtenerPreferenciasSync().monedaSimbolo;
}