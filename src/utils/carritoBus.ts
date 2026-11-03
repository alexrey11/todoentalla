// ============================================================
// Bus de eventos para que Clara pueda agregar productos al
// carrito de Nueva Venta desde cualquier parte de la app.
// ============================================================

export interface ItemParaCarrito {
    productoId: number;
    cantidad: number;
}

const EVENT_NAME = 'cc:agregar-al-carrito';

/** Clara dispara este evento con los productos a agregar */
export function enviarAlCarrito(items: ItemParaCarrito[]) {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: items }));
}

/** NuevaVenta se suscribe para escuchar a Clara */
export function escucharCarrito(handler: (items: ItemParaCarrito[]) => void) {
    if (typeof window === 'undefined') return () => { };
    const listener = (e: any) => {
        const items = e?.detail;
        if (Array.isArray(items) && items.length > 0) handler(items);
    };
    window.addEventListener(EVENT_NAME, listener);
    return () => window.removeEventListener(EVENT_NAME, listener);
}