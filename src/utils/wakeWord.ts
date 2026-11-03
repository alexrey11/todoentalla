// ============================================================
// Motor de detección de wake word
// ============================================================

/** Frases que activan el modo de escucha (normalizadas, sin tildes) */
export const WAKE_WORDS_DEFAULT = ['busca', 'ia busca', 'oye busca', 'hey busca'];

/** Normaliza texto: minúsculas, sin tildes, sin puntuación extra */
export function normalizar(texto: string): string {
    return texto
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[.,!?¿¡;:]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Detecta si un texto contiene la wake word.
 * Devuelve:
 *  - detectada: boolean
 *  - query: texto que queda después de la wake word (puede estar vacío)
 *  - fraseDetectada: la frase exacta que activó
 */
export function detectarWakeWord(
    textoOriginal: string,
    frases: string[] = WAKE_WORDS_DEFAULT
): { detectada: boolean; query: string; fraseDetectada?: string } {
    const texto = normalizar(textoOriginal);
    if (!texto) return { detectada: false, query: '' };

    // Ordenar frases de más larga a más corta para no matchear "busca" antes que "ia busca"
    const frasesOrdenadas = [...frases].sort((a, b) => b.length - a.length);

    for (const frase of frasesOrdenadas) {
        const fraseNorm = normalizar(frase);
        if (!fraseNorm) continue;

        // Caso 1: la frase aparece al inicio del texto
        if (texto.startsWith(fraseNorm + ' ') || texto === fraseNorm) {
            const resto = texto.slice(fraseNorm.length).trim();
            return { detectada: true, query: resto, fraseDetectada: frase };
        }

        // Caso 2: la frase aparece en cualquier parte (por si el STT agrega ruido)
        const idx = texto.indexOf(' ' + fraseNorm + ' ');
        if (idx >= 0) {
            const resto = texto.slice(idx + fraseNorm.length + 1).trim();
            return { detectada: true, query: resto, fraseDetectada: frase };
        }
    }

    return { detectada: false, query: '' };
}

/** ¿El texto es SOLO la wake word sin query? Ej: "busca" solo */
export function esSoloWakeWord(texto: string, frases: string[] = WAKE_WORDS_DEFAULT): boolean {
    const r = detectarWakeWord(texto, frases);
    return r.detectada && !r.query;
}