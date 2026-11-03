/**
 * Genera el `d` de un <path> SVG en forma de línea a partir de un array de números.
 * El resultado es una polyline suavizada con coordenadas absolutas.
 */
export function sparklinePath(
    data: number[],
    width: number,
    height: number,
    padding = 4
): string {
    if (!data || data.length < 2) return '';

    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    const stepX = (width - padding * 2) / (data.length - 1);

    return data
        .map((v, i) => {
            const x = padding + i * stepX;
            const y = height - padding - ((v - min) / range) * (height - padding * 2);
            return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
        })
        .join(' ');
}

/**
 * Devuelve el path de área (cerrado hasta la base) para rellenar bajo la línea.
 */
export function sparklineAreaPath(
    data: number[],
    width: number,
    height: number,
    padding = 4
): string {
    const line = sparklinePath(data, width, height, padding);
    if (!line) return '';
    const baseY = (height - padding).toFixed(1);
    return `${line} L ${(width - padding).toFixed(1)} ${baseY} L ${padding.toFixed(1)} ${baseY} Z`;
}