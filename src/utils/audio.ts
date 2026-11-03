// ============================================================
// Sonidos de la app (Web Audio API, sin archivos externos)
// ============================================================

let audioContext: AudioContext | null = null;

function getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (audioContext) return audioContext;
    try {
        const Ctx = (window.AudioContext || (window as any).webkitAudioContext);
        if (!Ctx) return null;
        audioContext = new Ctx();
        return audioContext;
    } catch {
        return null;
    }
}

/** Reproduce un tono simple */
function reproducirTono(
    frecuencia: number,
    duracion: number,
    tipo: OscillatorType = 'sine',
    volumen: number = 0.15,
    delay: number = 0
) {
    const ctx = getContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = tipo;
    osc.frequency.value = frecuencia;

    const ahora = ctx.currentTime + delay;
    gain.gain.setValueAtTime(0, ahora);
    gain.gain.linearRampToValueAtTime(volumen, ahora + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, ahora + duracion);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ahora);
    osc.stop(ahora + duracion);
}

/** 🔊 Sonido de cobro exitoso (dos tonos ascendentes) */
export function reproducirDingCobro() {
    reproducirTono(880, 0.12, 'sine', 0.15, 0);
    reproducirTono(1175, 0.15, 'sine', 0.12, 0.08);
}

/** ✅ Sonido de confirmación */
export function reproducirOk() {
    reproducirTono(1000, 0.1, 'sine', 0.12);
}

/** ⚠️ Sonido de error */
export function reproducirError() {
    reproducirTono(300, 0.15, 'square', 0.1);
    reproducirTono(250, 0.2, 'square', 0.08, 0.1);
}

/** 🔔 Sonido de alerta (stock bajo, etc.) */
export function reproducirAlerta() {
    reproducirTono(1200, 0.15, 'triangle', 0.12);
    reproducirTono(1200, 0.15, 'triangle', 0.12, 0.18);
}