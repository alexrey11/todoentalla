import { useEffect, useState } from 'react';
import { db, stockTotalProducto } from '../db';
import type { Producto, PuntoDeVenta } from '../db';
import { STYLES, BackgroundBlobs } from '../theme';

export interface ConfigKiosco {
    activo: boolean;
    titulo: string;
    subtitulo: string;
    mensajeBienvenida: string;
    logoUrl?: string;
    colorTema: 'blue' | 'violet' | 'emerald' | 'rose' | 'amber';
    mostrarProductos: boolean;
    mostrarReloj: boolean;
    textoToque: string;
}

export const KIOSCO_DEFAULT: ConfigKiosco = {
    activo: false,
    titulo: 'CuentaClara',
    subtitulo: 'Bienvenido a nuestra tienda',
    mensajeBienvenida: 'Toca la pantalla para comenzar',
    logoUrl: undefined,
    colorTema: 'blue',
    mostrarProductos: true,
    mostrarReloj: true,
    textoToque: '👉 Toca para iniciar sesión',
};

const TEMAS: Record<ConfigKiosco['colorTema'], {
    gradiente: string;
    texto: string;
    acento: string;
    ring: string;
}> = {
    blue: { gradiente: 'from-blue-600 via-indigo-700 to-violet-800', texto: 'text-blue-200', acento: 'bg-blue-500', ring: 'ring-blue-400/40' },
    violet: { gradiente: 'from-violet-600 via-purple-700 to-fuchsia-800', texto: 'text-violet-200', acento: 'bg-violet-500', ring: 'ring-violet-400/40' },
    emerald: { gradiente: 'from-emerald-600 via-teal-700 to-cyan-800', texto: 'text-emerald-200', acento: 'bg-emerald-500', ring: 'ring-emerald-400/40' },
    rose: { gradiente: 'from-rose-600 via-pink-700 to-red-800', texto: 'text-rose-200', acento: 'bg-rose-500', ring: 'ring-rose-400/40' },
    amber: { gradiente: 'from-amber-500 via-orange-600 to-red-700', texto: 'text-amber-200', acento: 'bg-amber-500', ring: 'ring-amber-400/40' },
};

interface KioscoProps {
    config: ConfigKiosco;
    onIniciarSesion: () => void;
}

export default function Kiosco({ config, onIniciarSesion }: KioscoProps) {
    const [hora, setHora] = useState(new Date());
    const [productos, setProductos] = useState<Producto[]>([]);
    const [pdv, setPdv] = useState<PuntoDeVenta | null>(null);

    const tema = TEMAS[config.colorTema] ?? TEMAS.blue;

    useEffect(() => {
        if (!config.mostrarReloj) return;
        const t = setInterval(() => setHora(new Date()), 1000);
        return () => clearInterval(t);
    }, [config.mostrarReloj]);

    useEffect(() => {
        if (!config.mostrarProductos) return;
        (async () => {
            const pdvs = await db.puntosDeVenta.toArray();
            const activo = pdvs.find(p => p.activo) ?? pdvs[0] ?? null;
            setPdv(activo);
            if (activo?.id) {
                const prods = await db.productos.where('puntoDeVentaId').equals(activo.id).toArray();
                setProductos(
                    prods
                        .filter(p => stockTotalProducto(p) > 0)
                        .sort((a, b) => b.precioVenta - a.precioVenta)
                        .slice(0, 6)
                );
            }
        })();
    }, [config.mostrarProductos]);

    const formatearHora = (d: Date) =>
        d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

    const formatearFecha = (d: Date) =>
        d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    return (
        <div
            className={`min-h-screen bg-gradient-to-br ${tema.gradiente} text-white`}
            onClick={onIniciarSesion}
            role="button"
            tabIndex={0}
        >
            <style>{STYLES}</style>
            <BackgroundBlobs />

            <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-8 md:px-10 md:py-12">
                {/* Header con reloj */}
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                        {config.logoUrl ? (
                            <img src={config.logoUrl} alt="Logo" className="h-16 w-16 rounded-2xl object-cover shadow-lg ring-2 ring-white/20 md:h-20 md:w-20" />
                        ) : (
                            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 text-4xl shadow-lg ring-2 ring-white/20 backdrop-blur md:h-20 md:w-20 md:text-5xl">
                                🏪
                            </div>
                        )}
                        <div>
                            <h1 className="text-2xl font-black tracking-tight md:text-4xl">{config.titulo}</h1>
                            <p className={`text-sm font-medium ${tema.texto} md:text-base`}>{config.subtitulo}</p>
                        </div>
                    </div>

                    {config.mostrarReloj && (
                        <div className="hidden text-right md:block">
                            <p className="text-4xl font-black tabular-nums">{formatearHora(hora)}</p>
                            <p className={`text-xs capitalize ${tema.texto}`}>{formatearFecha(hora)}</p>
                        </div>
                    )}
                </div>

                {/* Centro: mensaje principal */}
                <div className="my-8 flex flex-1 flex-col items-center justify-center text-center md:my-12">
                    <div className="mb-6 animate-pulse text-6xl md:text-8xl">👋</div>
                    <h2 className="mb-3 max-w-2xl text-3xl font-black leading-tight md:text-5xl">
                        {config.mensajeBienvenida}
                    </h2>
                    <p className={`mb-8 max-w-xl text-base ${tema.texto} md:text-lg`}>
                        {config.textoToque}
                    </p>

                    <button
                        onClick={(e) => { e.stopPropagation(); onIniciarSesion(); }}
                        className={`group flex items-center gap-3 rounded-2xl bg-white/15 px-8 py-4 text-lg font-black shadow-xl ring-2 ring-white/20 backdrop-blur transition-all hover:scale-105 hover:bg-white/25 md:px-12 md:py-5 md:text-xl ${tema.texto} hover:text-white`}
                    >
                        <span className="text-2xl md:text-3xl">🔓</span>
                        <span>Iniciar sesión</span>
                    </button>
                </div>

                {/* Productos destacados */}
                {config.mostrarProductos && productos.length > 0 && (
                    <div>
                        <h3 className="mb-3 text-sm font-bold uppercase tracking-wider opacity-80 md:text-base">
                            ✨ Productos destacados {pdv ? `· ${pdv.nombre.replace(/^[^\s]+\s/, '')}` : ''}
                        </h3>
                        <div className="grid grid-cols-3 gap-3 md:grid-cols-6 md:gap-4">
                            {productos.map(p => (
                                <div key={p.id} className="rounded-2xl bg-white/10 p-3 text-center shadow-md ring-1 ring-white/15 backdrop-blur">
                                    <div className="mb-2 flex h-16 items-center justify-center overflow-hidden rounded-xl bg-white/10 md:h-20">
                                        {p.imagen
                                            ? <img src={p.imagen} alt="" className="h-full w-full object-cover" />
                                            : <span className="text-3xl">{p.esCompuesto ? '🍕' : p.tieneVariantes ? '👕' : '📦'}</span>}
                                    </div>
                                    <p className="truncate text-xs font-bold md:text-sm">{p.nombre}</p>
                                    <p className="text-sm font-black text-emerald-300 md:text-base">${p.precioVenta.toFixed(0)}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="mt-8 text-center text-xs opacity-60 md:text-sm">
                    CuentaClara · Sistema de gestión
                </div>
            </div>
        </div>
    );
}