export type ToastType = 'ok' | 'error' | 'info' | 'warn';

export interface ToastItem {
    id: number;
    type: ToastType;
    title: string;
    sub?: string;
    duration: number;
}

let toasts: ToastItem[] = [];
const listeners = new Set<(items: ToastItem[]) => void>();
let nextId = 1;

function notify() {
    const snapshot = [...toasts];
    listeners.forEach(l => l(snapshot));
}

export const toast = {
    subscribe(fn: (items: ToastItem[]) => void): () => void {
        listeners.add(fn);
        fn([...toasts]);
        return () => { listeners.delete(fn); };
    },

    dismiss(id: number) {
        toasts = toasts.filter(t => t.id !== id);
        notify();
    },

    clear() {
        toasts = [];
        notify();
    },

    show(type: ToastType, title: string, sub?: string, duration = 3500): number {
        const t: ToastItem = { id: nextId++, type, title, sub, duration };
        toasts = [...toasts, t].slice(-4); // máx 4 a la vez
        notify();
        if (duration > 0) {
            setTimeout(() => toast.dismiss(t.id), duration);
        }
        return t.id;
    },

    ok(title: string, sub?: string) { return toast.show('ok', title, sub, 3500); },
    error(title: string, sub?: string) { return toast.show('error', title, sub, 5000); },
    info(title: string, sub?: string) { return toast.show('info', title, sub, 3500); },
    warn(title: string, sub?: string) { return toast.show('warn', title, sub, 4500); },
};