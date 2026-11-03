// ============================================================
// Animación fly-to-cart
// ============================================================

/**
 * Lanza un emoji volando desde un elemento origen hasta el carrito.
 * @param fromEl Elemento desde donde sale (el botón + o la card)
 * @param emoji Emoji o texto que vuela
 * @param targetSelector Selector CSS del destino (por defecto el ícono del carrito)
 */
export function flyToCart(
    fromEl: HTMLElement | null,
    emoji: string,
    targetSelector: string = '[data-cart-target]'
) {
    if (!fromEl) return;

    const target = document.querySelector(targetSelector) as HTMLElement | null;
    if (!target) return;

    const a = fromEl.getBoundingClientRect();
    const b = target.getBoundingClientRect();

    // Crear el elemento volador
    const el = document.createElement('div');
    el.textContent = emoji;
    el.style.position = 'fixed';
    el.style.zIndex = '9999';
    el.style.pointerEvents = 'none';
    el.style.fontSize = '28px';
    el.style.left = (a.left + a.width / 2 - 14) + 'px';
    el.style.top = (a.top + a.height / 2 - 14) + 'px';
    el.style.filter = 'drop-shadow(0 6px 10px rgba(0,0,0,0.4))';
    el.style.transition = 'none';
    document.body.appendChild(el);

    // Calcular trayectoria
    const dx = b.left + b.width / 2 - (a.left + a.width / 2);
    const dy = b.top + b.height / 2 - (a.top + a.height / 2);

    // Animar
    const anim = el.animate([
        { transform: 'translate(0, 0) scale(1)', opacity: 1 },
        {
            transform: `translate(${dx * 0.5}px, ${dy * 0.5 - 80}px) scale(1.15)`,
            opacity: 1,
            offset: 0.55,
        },
        {
            transform: `translate(${dx}px, ${dy}px) scale(0.25)`,
            opacity: 0.2,
        },
    ], {
        duration: 620,
        easing: 'cubic-bezier(.3,.7,.4,1)',
    });

    anim.onfinish = () => {
        el.remove();
        // Pop del carrito
        target.animate([
            { transform: 'scale(1)' },
            { transform: 'scale(1.35)' },
            { transform: 'scale(1)' },
        ], { duration: 320, easing: 'ease-out' });
    };
}