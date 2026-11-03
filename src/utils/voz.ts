// ─────────────────────────────────────────────────────────────
//  voz.ts · Voz natural para CuentaClara IA
//  Síntesis de voz (TTS) + dictado por micrófono (STT) usando
//  las APIs nativas del navegador: sin internet y sin claves.
//  Colócalo en: src/utils/voz.ts
// ─────────────────────────────────────────────────────────────

/** ¿El navegador soporta síntesis de voz? */
export function soportaVoz(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

/** ¿El navegador soporta dictado por micrófono? */
export function soportaMicrofono(): boolean {
    if (typeof window === 'undefined') return false;
    const w = window as any;
    return !!(w.SpeechRecognition || w.webkitSpeechRecognition);
}

type Oyente = () => void;

class GestorDeVoz {
    private voces: SpeechSynthesisVoice[] = [];
    private oyentes = new Set<Oyente>();
    private _habilitada = false;
    private _hablando = false;
    private vozElegida: SpeechSynthesisVoice | null = null;

    constructor() {
        if (!soportaVoz()) return;
        const cargar = () => {
            this.voces = window.speechSynthesis.getVoices();
        };
        cargar();
        window.speechSynthesis.addEventListener('voiceschanged', cargar);
        // Algunos navegadores cargan las voces tarde; reintentamos suave
        setTimeout(cargar, 300);
        setTimeout(cargar, 1200);
    }

    get habilitada() {
        return this._habilitada;
    }
    get hablando() {
        return this._hablando;
    }
    get disponible() {
        return soportaVoz();
    }

    /** Se suscribe a cambios (voz activada/desactivada, hablando o no). */
    suscribir(fn: Oyente): () => void {
        this.oyentes.add(fn);
        return () => {
            this.oyentes.delete(fn);
        };
    }

    private notificar() {
        this.oyentes.forEach(fn => fn());
    }

    /** Activa o apaga la voz. Devuelve el nuevo estado. */
    alternar(): boolean {
        this._habilitada = !this._habilitada;
        if (this._habilitada) {
            // El primer "speak" necesita un gesto del usuario: este es el momento perfecto
            this.decir('¡Listo! Ya te puedo hablar.');
        } else {
            this.detener();
        }
        this.notificar();
        return this._habilitada;
    }

    /** Corta cualquier voz en curso. */
    detener() {
        if (soportaVoz()) window.speechSynthesis.cancel();
        this._hablando = false;
        this.notificar();
    }

    /**
     * Limpia el texto para que la voz suene natural:
     * quita emojis y markdown, y convierte precios y porcentajes a palabras.
     */
    private limpiar(texto: string): string {
        return texto
            .replace(/\*\*(.+?)\*\*/g, '$1') // negritas
            .replace(/CUP/gi, ' pesos')
            .replace(/(\d)\s*%/g, '$1 por ciento')
            .replace(/(\d),(\d{3})\b/g, '$1$2') // separador de miles: 2,450 → 2450
            .replace(/(\d+)\.00\b/g, '$1') // 12.00 → 12
            .replace(/(\d+)\.(\d{2})\b/g, '$1 con $2') // 12.50 → 12 con 50
            .replace(/[•—–·]/g, ',')
            .replace(/[^\p{L}\p{N}\s.,¡!¿?()+-]/gu, ' ') // emojis y símbolos fuera
            .replace(/\s+/g, ' ')
            .replace(/\s([.,])/g, '$1')
            .trim();
    }

    /** Habla en voz alta (solo si está activada). */
    decir(texto: string) {
        if (!this._habilitada || !soportaVoz()) return;
        const limpio = this.limpiar(texto);
        if (!limpio) return;
        window.speechSynthesis.cancel(); // corta lo anterior para no encimarse
        const u = new SpeechSynthesisUtterance(limpio);
        const v = this.vozEspanol();
        if (v) {
            u.voice = v;
            u.lang = v.lang;
        } else {
            u.lang = 'es-ES';
        }
        u.rate = 1.05; // ritmo natural, ni robot lento ni acelerado
        u.pitch = 1.06; // un pelín cálida
        u.volume = 1;
        u.onstart = () => {
            this._hablando = true;
            this.notificar();
        };
        const fin = () => {
            this._hablando = false;
            this.notificar();
        };
        u.onend = fin;
        u.onerror = fin;
        window.speechSynthesis.speak(u);
    }

    /** Elige la mejor voz en español disponible en el dispositivo. */
    private vozEspanol(): SpeechSynthesisVoice | null {
        if (this.vozElegida) return this.vozElegida;
        if (!this.voces.length) return null;
        const es = this.voces.filter(v => v.lang.toLowerCase().startsWith('es'));
        if (!es.length) return null;
        // Prioridad: Latinoamérica y Cuba primero, España después
        const preferidas = ['es-419', 'es-cu', 'es-mx', 'es-co', 'es-ar', 'es-us', 'es-es'];
        for (const pref of preferidas) {
            const encontrada = es.find(v => v.lang.toLowerCase() === pref);
            if (encontrada) {
                this.vozElegida = encontrada;
                return this.vozElegida;
            }
        }
        this.vozElegida = es[0];
        return this.vozElegida;
    }
}

/** Instancia única de voz para toda la app. */
export const voz = new GestorDeVoz();

// ─────────────────────────────────────────────────────────────
//  Dictado por micrófono (STT)
// ─────────────────────────────────────────────────────────────

export interface EscuchaCallbacks {
    /** Texto provisional mientras la persona habla. */
    onParcial: (texto: string) => void;
    /** Frase completa (puede venir vacía si no se entendió nada). */
    onFinal: (texto: string) => void;
    /** Motivos típicos: 'not-allowed' (sin permiso), 'no-speech', 'network'. */
    onError: (motivo: string) => void;
}

/** Inicia el dictado y devuelve una función para detenerlo. */
export function escuchar(cb: EscuchaCallbacks): () => void {
    const w = window as any;
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) {
        cb.onError('no-soportado');
        return () => { };
    }

    const rec = new SR();
    const langNavegador = (typeof navigator !== 'undefined' && navigator.language) || 'es-ES';
    rec.lang = langNavegador.startsWith('es') ? langNavegador : 'es-ES';
    rec.interimResults = true;
    rec.continuous = false;
    rec.maxAlternatives = 1;

    let terminado = false;
    rec.onresult = (e: any) => {
        let parcial = '';
        let final = '';
        for (let i = 0; i < e.results.length; i++) {
            const r = e.results[i];
            if (r.isFinal) final += r[0].transcript;
            else parcial += r[0].transcript;
        }
        if (parcial) cb.onParcial(parcial.trim());
        if (final) {
            terminado = true;
            cb.onFinal(final.trim());
        }
    };
    rec.onerror = (e: any) => {
        terminado = true; // evita duplicar el aviso cuando dispare onend
        cb.onError(e?.error || 'error');
    };
    rec.onend = () => {
        if (!terminado) cb.onFinal('');
    };

    try {
        rec.start();
    } catch {
        cb.onError('ya-escuchando');
    }

    return () => {
        try {
            rec.stop();
        } catch {
            /* ya estaba detenida */
        }
    };
}
