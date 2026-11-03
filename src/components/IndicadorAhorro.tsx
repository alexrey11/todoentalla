import { useEffect, useState } from 'react';
import { modoAhorro } from '../utils/modoAhorro';

interface Props {
    nivel: number;
    soportado: boolean;
    /** ¿Fue activado por el usuario manualmente? */
    manual?: boolean;
    onDesactivar?: () => void;
}

export default function IndicadorAhorro({ nivel, soportado, manual, onDesactivar }: Props) {
    const [activo, setActivo] = useState(modoAhorro.activo);
    const [cerrado, setCerrado] = useState(false);

    useEffect(() => {
        return modoAhorro.subscribe(setActivo);
    }, []);

    // Resetear el cierre cuando se active de nuevo
    useEffect(() => {
        if (activo) setCerrado(false);
    }, [activo]);

    if (!activo || cerrado) return null;

    return (
        <div className="fixed inset-x-2 top-2 z-[300] flex items-center gap-3 rounded-xl border border-amber-400/40 bg-gradient-to-r from-amber-500/25 to-orange-500/20 p-3 shadow-lg backdrop-blur-md md:inset-x-auto md:right-4 md:top-4 md:max-w-md">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 text-lg shadow-md">
                🔋
            </span>
            <div className="min-w-0 flex-1">
                <p className="text-sm font-black text-amber-100">
                    Modo ahorro activo
                </p>
                <p className="text-[11px] text-amber-200/80">
                    {manual
                        ? 'Activado manualmente desde Configuración'
                        : soportado
                            ? `Batería al ${nivel}% · animaciones y sonidos en pausa`
                            : 'Sin animaciones ni sonidos para ahorrar batería'}
                </p>
            </div>
            {onDesactivar && (
                <button
                    onClick={onDesactivar}
                    className="shrink-0 rounded-lg bg-amber-500/25 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-amber-100 transition-colors hover:bg-amber-500/40"
                >
                    Quitar
                </button>
            )}
            <button
                onClick={() => setCerrado(true)}
                aria-label="Cerrar aviso"
                className="shrink-0 rounded-lg p-1.5 text-amber-200/70 transition-colors hover:bg-white/10 hover:text-white"
            >
                ✕
            </button>
        </div>
    );
}