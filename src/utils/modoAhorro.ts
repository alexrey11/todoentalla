import { sonidos } from './sonidos';

let activo = false;
const listeners = new Set<(activo: boolean) => void>();

/**
 * Control global del modo ahorro.
 * - Aplica la clase `modo-ahorro` al <body> para que el CSS desactive animaciones
 * - Silencia sonidos automáticamente
 * - Notifica a los suscriptores (para indicadores visuales)
 */
export const modoAhorro = {
    get activo(): boolean {
        return activo;
    },

    set(nuevo: boolean) {
        if (activo === nuevo) return;
        activo = nuevo;

        if (typeof document !== 'undefined') {
            document.body.classList.toggle('modo-ahorro', nuevo);
        }

        if (nuevo) {
            sonidos.setActivos(false);
        }

        listeners.forEach(l => l(nuevo));
    },

    subscribe(fn: (activo: boolean) => void): () => void {
        listeners.add(fn);
        fn(activo);
        return () => { listeners.delete(fn); };
    },
};