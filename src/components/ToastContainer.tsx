import { useEffect, useRef, useState } from 'react';
import { toast, type ToastItem, type ToastType } from '../utils/toast';
import { sonidos } from '../utils/sonidos';

const ICON: Record<ToastType, string> = {
    ok: '✅',
    error: '⚠️',
    info: 'ℹ️',
    warn: '⚡',
};

const COLOR: Record<ToastType, { bg: string; border: string; bar: string }> = {
    ok: { bg: 'bg-emerald-500/12', border: 'border-emerald-400/30', bar: 'bg-emerald-400' },
    error: { bg: 'bg-rose-500/12', border: 'border-rose-400/30', bar: 'bg-rose-400' },
    info: { bg: 'bg-blue-500/12', border: 'border-blue-400/30', bar: 'bg-blue-400' },
    warn: { bg: 'bg-amber-500/12', border: 'border-amber-400/30', bar: 'bg-amber-400' },
};

const CSS = `
@keyframes cc-toast-in {
  from { opacity: 0; transform: translateX(40px) scale(.96); }
  to   { opacity: 1; transform: translateX(0) scale(1); }
}
@keyframes cc-toast-bar {
  from { width: 100%; }
  to   { width: 0%; }
}
.cc-toast { animation: cc-toast-in .35s cubic-bezier(.2,1.1,.4,1) both; }
.cc-toast-bar { animation: cc-toast-bar linear forwards; }
`;

export default function ToastContainer() {
    const [items, setItems] = useState<ToastItem[]>([]);
    const lastIdRef = useRef<number>(0);

    useEffect(() => toast.subscribe(setItems), []);

    // Sonido cuando entra un toast nuevo
    useEffect(() => {
        const last = items[items.length - 1];
        if (!last || last.id === lastIdRef.current) return;
        lastIdRef.current = last.id;
        try {
            if (last.type === 'ok') sonidos.notificacion();
            else if (last.type === 'error') sonidos.error();
            else if (last.type === 'warn') sonidos.tecla();
        } catch { /* noop */ }
    }, [items]);

    return (
        <>
            <style>{CSS}</style>
            <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[200] flex flex-col items-end gap-2 px-4 md:bottom-6 md:px-6">
                {items.map(t => {
                    const c = COLOR[t.type];
                    return (
                        <div
                            key={t.id}
                            className={`cc-toast pointer-events-auto relative w-full max-w-[360px] cursor-pointer overflow-hidden rounded-xl border ${c.border} ${c.bg} p-3 shadow-2xl backdrop-blur-md`}
                            onClick={() => toast.dismiss(t.id)}
                            role="status"
                        >
                            <div className="flex items-start gap-3">
                                <span className="shrink-0 text-lg">{ICON[t.type]}</span>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-bold text-gray-100">{t.title}</p>
                                    {t.sub && <p className="mt-0.5 text-[11px] text-gray-300">{t.sub}</p>}
                                </div>
                                <span className="shrink-0 text-xs text-gray-400">✕</span>
                            </div>
                            <div
                                className={`cc-toast-bar absolute bottom-0 left-0 h-0.5 ${c.bar}`}
                                style={{ animationDuration: `${t.duration}ms` }}
                            />
                        </div>
                    );
                })}
            </div>
        </>
    );
}