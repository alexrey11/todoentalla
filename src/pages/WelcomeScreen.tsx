interface WelcomeScreenProps {
    onComenzarPrueba: () => void;
    onActivarLicencia: () => void;
}

const FEATURES = [
    { icon: '🛒', title: 'Ventas rápidas', desc: 'Cobra en segundos con carrito', tile: 'from-sky-500 to-blue-600' },
    { icon: '📦', title: 'Inventario', desc: 'Stock y precios siempre al día', tile: 'from-violet-500 to-purple-600' },
    { icon: '👥', title: 'Clientes y fiados', desc: 'Quién te debe y cuánto, claro', tile: 'from-amber-500 to-orange-600' },
    { icon: '📊', title: 'Reportes', desc: 'Ganancias reales, sin calcular', tile: 'from-emerald-500 to-teal-600' },
];

const STYLES = `
@keyframes cc-float {
  0%, 100% { transform: translateY(0) rotate(-3deg); }
  50%      { transform: translateY(-8px) rotate(3deg); }
}
.cc-float { animation: cc-float 5s ease-in-out infinite; }

@keyframes cc-fade-up {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}
.cc-fade-up { opacity: 0; animation: cc-fade-up .5s ease-out forwards; }

@keyframes cc-gradient {
  0%, 100% { background-position: 0% 50%; }
  50%      { background-position: 100% 50%; }
}
.cc-gradient-text { background-size: 200% 200%; animation: cc-gradient 8s ease infinite; }

@media (prefers-reduced-motion: reduce) {
  .cc-float, .cc-gradient-text { animation: none; }
  .cc-fade-up { opacity: 1; animation: none; }
}
`;

export default function WelcomeScreen({ onComenzarPrueba, onActivarLicencia }: WelcomeScreenProps) {
    return (
        <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-slate-950 p-4 md:p-6">
            <style>{STYLES}</style>

            {/* Fondo: blobs estáticos (sin blur caro) */}
            <div className="pointer-events-none absolute inset-0" aria-hidden="true">
                <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-blue-600/20 blur-2xl" />
                <div className="absolute -right-32 top-1/3 h-[26rem] w-[26rem] rounded-full bg-indigo-600/20 blur-2xl" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.06),transparent_60%)]" />
            </div>

            <div className="relative w-full max-w-lg">
                <div className="max-h-[95vh] overflow-y-auto rounded-3xl border border-white/10 bg-slate-900/95 p-6 shadow-2xl shadow-black/60 ring-1 ring-inset ring-white/5 md:p-9">

                    {/* Badge de oferta */}
                    <div className="cc-fade-up mb-5 flex justify-center">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-3.5 py-1.5 text-[11px] font-extrabold uppercase tracking-wider text-amber-950 shadow-lg shadow-orange-500/30">
                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-900" />
                            Oferta de lanzamiento · 40% OFF
                        </span>
                    </div>

                    {/* Logo */}
                    <div className="cc-fade-up mb-5 flex justify-center" style={{ animationDelay: '0.05s' }}>
                        <div className="cc-float flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-blue-500 via-indigo-600 to-violet-600 text-4xl shadow-xl shadow-indigo-600/50 ring-2 ring-white/10">
                            📊
                        </div>
                    </div>

                    {/* Título */}
                    <div className="cc-fade-up mb-6 text-center" style={{ animationDelay: '0.1s' }}>
                        <h1 className="cc-gradient-text bg-gradient-to-r from-blue-400 via-indigo-400 to-violet-400 bg-clip-text text-4xl font-black tracking-tight text-transparent md:text-5xl">
                            CuentaClara
                        </h1>
                        <p className="mt-2 text-base font-medium text-gray-400 md:text-lg">
                            Tu negocio, siempre en orden.{' '}
                            <span className="font-bold text-gray-200">Aunque no haya internet.</span>
                        </p>
                    </div>

                    {/* Beneficios */}
                    <div className="mb-6 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                        {FEATURES.map((f, i) => (
                            <div
                                key={f.title}
                                className="cc-fade-up group flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-800/50 p-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-400/40 hover:bg-slate-800/80"
                                style={{ animationDelay: `${0.15 + i * 0.07}s` }}
                            >
                                <span
                                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${f.tile} text-lg shadow-sm transition-transform duration-200 group-hover:scale-110`}
                                >
                                    {f.icon}
                                </span>
                                <span className="min-w-0">
                                    <span className="block text-sm font-bold text-gray-100">{f.title}</span>
                                    <span className="block truncate text-xs text-gray-400">{f.desc}</span>
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Sellos de confianza */}
                    <div
                        className="cc-fade-up mb-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 rounded-2xl border border-white/10 bg-slate-800/40 px-4 py-3 text-[11px] font-semibold text-gray-300 md:text-xs"
                        style={{ animationDelay: '0.45s' }}
                    >
                        <span className="flex items-center gap-1">🔒 Pago único</span>
                        <span className="h-3 w-px bg-white/15" />
                        <span className="flex items-center gap-1">📴 Sin internet</span>
                        <span className="h-3 w-px bg-white/15" />
                        <span className="flex items-center gap-1">♾️ Licencia de por vida</span>
                    </div>

                    {/* CTA principal */}
                    <div className="cc-fade-up" style={{ animationDelay: '0.5s' }}>
                        <button
                            onClick={onComenzarPrueba}
                            className="group relative w-full overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 px-6 py-4 font-bold text-white shadow-[0_14px_40px_-12px_rgba(79,70,229,0.9)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_50px_-12px_rgba(99,102,241,1)] active:translate-y-0 active:scale-[0.99]"
                        >
                            <span className="relative flex items-center justify-center gap-2 text-base md:text-lg">
                                🎁 Comenzar prueba gratis de 15 días
                                <svg
                                    className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth={2.5}
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M20 12H4" />
                                </svg>
                            </span>
                        </button>

                        <p className="mt-2.5 text-center text-[11px] font-medium text-gray-500 md:text-xs">
                            ✅ Sin tarjeta de crédito · ✅ Instalación en 1 minuto · ✅ Tus datos son tuyos
                        </p>
                    </div>

                    {/* Separador */}
                    <div className="cc-fade-up my-5 flex items-center gap-3" style={{ animationDelay: '0.55s' }}>
                        <span className="h-px flex-1 bg-gradient-to-r from-transparent to-white/10" />
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">o</span>
                        <span className="h-px flex-1 bg-gradient-to-l from-transparent to-white/10" />
                    </div>

                    {/* CTA secundario */}
                    <button
                        onClick={onActivarLicencia}
                        className="cc-fade-up w-full rounded-2xl border border-white/10 bg-slate-800/50 px-6 py-3 text-sm font-bold text-gray-200 transition-all duration-200 hover:border-blue-400/60 hover:bg-blue-500/10 hover:text-blue-300 md:text-base"
                        style={{ animationDelay: '0.6s' }}
                    >
                        🔑 Ya tengo un código de licencia
                    </button>

                    {/* Prueba social */}
                    <div
                        className="cc-fade-up mt-6 flex flex-col items-center gap-2"
                        style={{ animationDelay: '0.65s' }}
                    >
                        <div className="flex items-center gap-2">
                            <div className="flex -space-x-2">
                                {['MJ', 'CR', 'LP', 'AT'].map((ini, i) => (
                                    <span
                                        key={ini}
                                        className={`flex h-7 w-7 items-center justify-center rounded-full border-2 border-slate-900 text-[9px] font-bold text-white ${['bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-violet-500'][i]
                                            }`}
                                    >
                                        {ini}
                                    </span>
                                ))}
                            </div>
                            <span className="text-xs font-semibold text-gray-400">
                                +120 negocios ya lo usan
                            </span>
                        </div>
                        <div className="text-sm tracking-widest text-amber-400">★★★★★</div>
                    </div>

                    <p className="mt-5 text-center text-[10px] leading-relaxed text-gray-500">
                        Funciona sin conexión · Tus datos se guardan en tu dispositivo
                    </p>
                </div>
            </div>
        </div>
    );
}