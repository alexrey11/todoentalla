import { useEffect, useState } from 'react';

export const NIVEL_AHORRO = 15;

export interface EstadoBateria {
    nivel: number;
    cargando: boolean;
    soportado: boolean;
    ahorroPorBateria: boolean;
}

/**
 * Lee el estado de la batería del dispositivo.
 * Solo funciona en Chrome/Edge/Safari (y en el WebView de Android).
 * En navegadores sin soporte, devuelve `soportado: false`.
 */
export function useBateria(): EstadoBateria {
    const [nivel, setNivel] = useState(100);
    const [cargando, setCargando] = useState(true);
    const [soportado, setSoportado] = useState(false);

    useEffect(() => {
        let battery: any = null;

        const actualizar = () => {
            if (!battery) return;
            setNivel(Math.round((battery.level ?? 1) * 100));
            setCargando(!!battery.charging);
        };

        (async () => {
            try {
                const nav = navigator as any;
                if (typeof nav.getBattery !== 'function') {
                    setSoportado(false);
                    return;
                }
                battery = await nav.getBattery();
                setSoportado(true);
                actualizar();

                battery.addEventListener?.('levelchange', actualizar);
                battery.addEventListener?.('chargingchange', actualizar);
            } catch {
                setSoportado(false);
            }
        })();

        return () => {
            try {
                battery?.removeEventListener?.('levelchange', actualizar);
                battery?.removeEventListener?.('chargingchange', actualizar);
            } catch { /* noop */ }
        };
    }, []);

    const ahorroPorBateria = soportado && !cargando && nivel <= NIVEL_AHORRO;

    return { nivel, cargando, soportado, ahorroPorBateria };
}