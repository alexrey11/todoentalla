import { useState } from 'react';
import { activarLicencia, DIAS_PRUEBA } from '../utils/trialUtils';
import { urlWhatsApp, MENSAJE_PRECARGADO, telefonoFormateado, NOMBRE_VENDEDOR } from '../utils/contacto';
import { STYLES, BackgroundBlobs } from '../theme';
import { registrarLog } from '../utils/logger';

interface ActivarLicenciaProps {
    onActivar: () => void;
    bloqueada?: boolean;
}

export default function ActivarLicencia({ onActivar, bloqueada = true }: ActivarLicenciaProps) {
    const [codigo, setCodigo] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [cargando, setCargando] = useState(false);
    const [ok, setOk] = useState(false);
    const [copiado, setCopiado] = useState(false);

    const formatearInput = (raw: string) => {
        const clean = raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
        const body = clean.startsWith('CC') ? clean.slice(2) : clean;
        const bloques = body.slice(0, 16).match(/.{1,4}/g) ?? [];
        const base = bloques.join('-');
        return clean.startsWith('CC') ? (base ? `CC-${base}` : 'CC') : base;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setCodigo(formatearInput(e.target.value));
        setError(null);
    };

    const handleActivar = async () => {
        if (!codigo.trim()) { setError('Introduce tu código de licencia'); return; }
        setCargando(true);
        setError(null);
        const res = await activarLicencia(codigo);
        setCargando(false);
        if (res.ok) {
            await registrarLog('licencia_activada', 'Licencia activada correctamente', {
                usuarioNombre: 'Sistema',
                detalles: `Código: ${codigo.trim().toUpperCase()}`,
            });
            setOk(true);
            setTimeout(() => onActivar(), 900);
        } else {
            await registrarLog('licencia_invalida', 'Intento de activación con código inválido', {
                usuarioNombre: 'Sistema',
                detalles: `Código introducido: ${codigo.trim().toUpperCase()}`,
            });
            setError(res.error ?? 'Código inválido');
        }
    };

    const copiarTelefono = async () => {
        try {
            await navigator.clipboard.writeText(telefonoFormateado());
            setCopiado(true);
            setTimeout(() => setCopiado(false), 1800);
        } catch { /* noop */ }
    };

    return (
        <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-slate-950 p-4 md:p-6">
            <style>{STYLES}</style>
            <BackgroundBlobs />

            <div className="relative w-full max-w-md">
                <div className="rounded-3xl border border-white/10 bg-slate-900/95 p-6 shadow-2xl shadow-black/60 ring-1 ring-inset ring-white/5 md:p-8">

                    <div className="cc-fade-up mb-5 flex justify-center">
                        <div className="relative">
                            <div className="absolute inset-0 animate-ping rounded-3xl bg-amber-500/20" />
                            <div className="relative flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-amber-500 via-orange-600 to-rose-600 text-3xl shadow-xl shadow-orange-600/40 ring-4 ring-white/10">
                                🔒
                            </div>
                        </div>
                    </div>

                    <div className="cc-fade-up mb-6 text-center" style={{ animationDelay: '0.05s' }}>
                        <h1 className="cc-gradient-text bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400 bg-clip-text text-2xl font-black tracking-tight text-transparent md:text-3xl">
                            Licencia requerida
                        </h1>
                        <p className="mt-2 text-sm text-gray-400 md:text-base">
                            {bloqueada
                                ? `Tu prueba gratuita de ${DIAS_PRUEBA} días ha terminado.`
                                : 'Introduce tu código para activar CuentaClara.'}
                        </p>
                    </div>

                    {/* ===== Botón WhatsApp ===== */}
                    <div className="cc-fade-up mb-4 rounded-2xl border border-emerald-400/25 bg-emerald-500/10 p-4" style={{ animationDelay: '0.1s' }}>
                        <div className="mb-3 flex items-center gap-2">
                            <span className="text-xl">💬</span>
                            <p className="text-sm font-bold text-emerald-200">Contacta a {NOMBRE_VENDEDOR}</p>
                        </div>
                        <p className="mb-3 text-xs text-emerald-300/80">
                            Escríbele por WhatsApp para recibir tu código de activación.
                        </p>

                        <button
                            onClick={() => window.open(urlWhatsApp(MENSAJE_PRECARGADO(DIAS_PRUEBA)), '_blank')}
                            className="mb-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-3 text-sm font-black text-white shadow-md shadow-emerald-500/30 transition-transform duration-150 hover:-translate-y-0.5 active:translate-y-0"
                        >
                            <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                            </svg>
                            Abrir WhatsApp
                        </button>

                        <button
                            onClick={copiarTelefono}
                            className="w-full rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-2 text-xs font-bold text-emerald-300 transition-colors duration-150 hover:bg-emerald-500/20"
                        >
                            {copiado ? '✅ Copiado' : `📋 Copiar número: ${telefonoFormateado()}`}
                        </button>
                    </div>

                    {/* ===== Divisor ===== */}
                    <div className="cc-fade-up my-4 flex items-center gap-3" style={{ animationDelay: '0.15s' }}>
                        <span className="h-px flex-1 bg-gradient-to-r from-transparent to-white/10" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">¿Ya tienes código?</span>
                        <span className="h-px flex-1 bg-gradient-to-l from-transparent to-white/10" />
                    </div>

                    {/* ===== Input de código ===== */}
                    <div className="cc-fade-up mb-4" style={{ animationDelay: '0.2s' }}>
                        <input
                            type="text"
                            inputMode="text"
                            autoComplete="off"
                            spellCheck={false}
                            value={codigo}
                            onChange={handleChange}
                            placeholder="CC-XXXX-XXXX-XXXX-XXXX"
                            disabled={ok || cargando}
                            className="w-full rounded-2xl border border-white/10 bg-slate-800/60 px-4 py-4 text-center font-mono text-lg font-black tracking-wider text-gray-100 outline-none transition-colors duration-150 placeholder:font-normal placeholder:tracking-normal placeholder:text-gray-600 focus:border-amber-400/60 focus:bg-slate-800 disabled:opacity-60 md:text-xl"
                        />
                    </div>

                    {(error || ok) && (
                        <div className={`cc-fade-up mb-4 flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold ${ok
                            ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/25'
                            : 'bg-rose-500/15 text-rose-300 ring-1 ring-rose-400/25'
                            }`}>
                            <span>{ok ? '✅' : '⚠️'}</span>
                            <span>{ok ? '¡Licencia activada! Entrando…' : error}</span>
                        </div>
                    )}

                    <button
                        onClick={handleActivar}
                        disabled={cargando || ok}
                        className="cc-fade-up w-full rounded-2xl bg-gradient-to-r from-amber-500 via-orange-600 to-rose-600 px-6 py-4 text-base font-black text-white shadow-lg shadow-orange-500/30 transition-transform duration-150 hover:-translate-y-0.5 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 md:text-lg"
                        style={{ animationDelay: '0.25s' }}
                    >
                        {ok ? '✅ Activada' : cargando ? 'Validando…' : '🔓 Activar Licencia'}
                    </button>

                    <p className="cc-fade-up mt-5 text-center text-[10px] leading-relaxed text-gray-500" style={{ animationDelay: '0.3s' }}>
                        💡 Tu código funciona sin conexión a internet.<br />
                        Tus datos actuales no se pierden al activar.
                    </p>
                </div>
            </div>
        </div>
    );
}