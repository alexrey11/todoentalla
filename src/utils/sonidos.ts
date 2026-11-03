// ============================================================
// Sonidos sintetizados con Web Audio API
// - Cero archivos
// - Cero permisos
// - Funciona 100% offline
// ============================================================

let audioCtx: AudioContext | null = null;
let habilitados = true;

function getCtx(): AudioContext | null {
    try {
        if (!audioCtx) {
            const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
            if (!AC) return null;
            audioCtx = new AC();
        }
        const ctx = audioCtx;
        if (!ctx) return null;
        if (ctx.state === 'suspended') {
            ctx.resume().catch(() => { });
        }
        return ctx;
    } catch {
        return null;
    }
}

function tono(
    freq: number,
    duracion: number = 0.07,
    tipo: OscillatorType = 'sine',
    volumen: number = 0.04,
    delay: number = 0
) {
    if (!habilitados) return;
    const c = getCtx();
    if (!c) return;
    try {
        const osc = c.createOscillator();
        const gain = c.createGain();
        const t = c.currentTime + delay;
        osc.type = tipo;
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(volumen, t);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + duracion);
        osc.connect(gain);
        gain.connect(c.destination);
        osc.start(t);
        osc.stop(t + duracion + 0.03);
    } catch { /* noop */ }
}

export const sonidos = {
    /** Activarlos o desactivarlos globalmente */
    setActivos(v: boolean) {
        habilitados = v;
    },

    getActivos(): boolean {
        return habilitados;
    },

    /** Producto agregado al carrito */
    agregar() {
        tono(640, 0.06);
        tono(880, 0.09, 'sine', 0.045, 0.055);
    },

    /** Producto quitado del carrito */
    quitar() {
        tono(300, 0.1, 'sine', 0.04);
    },

    /** Tecla del numpad */
    tecla() {
        tono(560, 0.035, 'square', 0.018);
    },

    /** Abrir un modal o drawer */
    abrir() {
        tono(470, 0.05, 'sine', 0.03);
    },

    /** Error / validación fallida */
    error() {
        tono(170, 0.2, 'sawtooth', 0.045);
    },

    /** Éxito / venta cobrada */
    exito() {
        tono(620, 0.1, 'sine', 0.05);
        tono(784, 0.11, 'sine', 0.05, 0.09);
        tono(1046, 0.18, 'sine', 0.05, 0.18);
    },

    /** Notificación entrante */
    notificacion() {
        tono(880, 0.08);
        tono(1100, 0.1, 'sine', 0.05, 0.1);
    },

    /** Wake word detectada */
    wake() {
        tono(720, 0.06);
        tono(980, 0.1, 'sine', 0.05, 0.07);
    },
};
// Stub del módulo de sonidos para verificación de tipos
