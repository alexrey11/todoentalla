import { useState, useEffect } from 'react';
import { db } from '../db';
import type { Usuario, ProyectoMigracion } from '../db';
import {
    STYLES, BackgroundBlobs, pageWrap, card, cardPadded, titleGradient,
    sectionTitle, input, label,
    modalOverlay, modalPanel, modalTitle, modalClose,
} from '../theme';
import TarjetaProyecto from './components/TarjetaProyecto';
import ProyectoMigracionVista from './ProyectoMigracion';
import {
    crearProyecto, eliminarProyecto, duplicarProyecto,
    parsearProyectoDesdeJSON,
} from '../utils/migracionUtils';

interface Props {
    usuarioActual: Usuario;
    onVolver: () => void;
}

type ModalTipo = null | 'nuevo-manual' | 'nuevo-pegado' | 'nuevo-excel' | 'importar-json';

export default function CentroMigracion({ usuarioActual, onVolver }: Props) {
    const [proyectos, setProyectos] = useState<ProyectoMigracion[]>([]);
    const [cargando, setCargando] = useState(true);
    const [proyectoAbierto, setProyectoAbierto] = useState<ProyectoMigracion | null>(null);

    const [modal, setModal] = useState<ModalTipo>(null);
    const [nombreNuevo, setNombreNuevo] = useState('');
    const [jsonPegado, setJsonPegado] = useState('');
    const [errorImport, setErrorImport] = useState<string | null>(null);

    const cargar = async () => {
        setCargando(true);
        const lista = await db.proyectosMigracion.orderBy('fechaModificacion').reverse().toArray();
        setProyectos(lista);
        setCargando(false);
    };

    useEffect(() => { cargar(); }, []);

    // ===== CREAR =====
    const crearYAbrir = async (origen: 'manual' | 'pegado' | 'excel') => {
        if (!nombreNuevo.trim()) return;
        const id = await crearProyecto(nombreNuevo, origen);
        const p = await db.proyectosMigracion.get(id);
        setModal(null);
        setNombreNuevo('');
        if (p) {
            // Autoseleccionar la pestaña a abrir según el origen
            setProyectoAbierto(p);
            // Un pequeño truco: guardamos en sessionStorage qué pestaña abrir
            sessionStorage.setItem('cc.migracion.abrirPanel', origen === 'excel' ? 'excel' : origen === 'pegado' ? 'pegado' : '');
        }
        cargar();
    };

    const manejarImportarJSON = async () => {
        setErrorImport(null);
        const res = parsearProyectoDesdeJSON(jsonPegado);
        if (!res.ok) {
            setErrorImport(res.error);
            return;
        }
        const id = await db.proyectosMigracion.add(res.proyecto);
        const p = await db.proyectosMigracion.get(id);
        setModal(null);
        setJsonPegado('');
        if (p) setProyectoAbierto(p);
        cargar();
    };

    // ===== ABRIR PROYECTO =====
    if (proyectoAbierto) {
        return (
            <ProyectoMigracionVista
                proyecto={proyectoAbierto}
                usuarioActual={usuarioActual}
                onVolver={async () => {
                    setProyectoAbierto(null);
                    await cargar();
                }}
                onActualizar={(p) => setProyectoAbierto(p)}
            />
        );
    }

    // ===== HOME =====
    const totalProductos = proyectos.reduce((s, p) => s + p.productos.length, 0);
    const totalCategorias = proyectos.reduce((s, p) => s + p.categorias.length, 0);
    const entregados = proyectos.filter(p => p.estado === 'entregado').length;

    return (
        <div className={pageWrap}>
            <style>{STYLES}</style>
            <BackgroundBlobs />

            <div className="relative mx-auto max-w-4xl">
                <div className={`cc-fade-up mb-4 md:mb-6 ${cardPadded}`}>
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                            <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 via-violet-600 to-fuchsia-600 text-2xl shadow-md ring-2 ring-white/10 md:flex">🛠️</div>
                            <div className="min-w-0">
                                <h1 className={`${titleGradient} truncate text-xl md:text-3xl`}>Centro de Migración</h1>
                                <p className="truncate text-xs text-gray-400 md:text-sm">Prepara inventarios de clientes para importar</p>
                            </div>
                        </div>
                        <button onClick={onVolver}
                            className="shrink-0 rounded-xl border border-white/10 bg-slate-800/60 px-3 py-2 text-sm font-bold text-gray-200 transition-colors hover:border-violet-400/60 hover:bg-violet-500/15 hover:text-violet-200 md:px-5 md:py-2.5 md:text-base">
                            ← Volver
                        </button>
                    </div>
                </div>

                {/* ===== ESTADÍSTICAS ===== */}
                <div className="mb-4 grid grid-cols-2 gap-3 md:mb-6 md:grid-cols-4">
                    <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-3 md:p-4">
                        <p className="text-2xl font-black text-violet-300 md:text-3xl">{proyectos.length}</p>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 md:text-xs">Proyectos</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-3 md:p-4">
                        <p className="text-2xl font-black text-blue-300 md:text-3xl">{totalProductos}</p>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 md:text-xs">Productos</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-3 md:p-4">
                        <p className="text-2xl font-black text-cyan-300 md:text-3xl">{totalCategorias}</p>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 md:text-xs">Categorías</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-3 md:p-4">
                        <p className="text-2xl font-black text-emerald-300 md:text-3xl">{entregados}</p>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 md:text-xs">Entregados</p>
                    </div>
                </div>

                {/* ===== NUEVA MIGRACIÓN ===== */}
                <div className={`${card} cc-fade-up mb-4 p-4 md:mb-6 md:p-6`}>
                    <h2 className={`${sectionTitle} mb-3`}>⚡ Nueva migración</h2>
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                        <button
                            onClick={() => setModal('nuevo-manual')}
                            className="group flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-slate-800/40 p-4 text-center transition-all hover:-translate-y-0.5 hover:border-violet-400/50 hover:bg-slate-800/70"
                        >
                            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-2xl shadow-md">✍️</span>
                            <span>
                                <span className="block text-sm font-black text-gray-100">Desde cero</span>
                                <span className="block text-[10px] text-gray-400">Uno por uno</span>
                            </span>
                        </button>

                        <button
                            onClick={() => setModal('nuevo-pegado')}
                            className="group flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-slate-800/40 p-4 text-center transition-all hover:-translate-y-0.5 hover:border-cyan-400/50 hover:bg-slate-800/70"
                        >
                            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-2xl shadow-md">📋</span>
                            <span>
                                <span className="block text-sm font-black text-gray-100">Pegar texto</span>
                                <span className="block text-[10px] text-gray-400">Copiado de Excel</span>
                            </span>
                        </button>

                        <button
                            onClick={() => setModal('nuevo-excel')}
                            className="group flex flex-col items-center gap-2 rounded-2xl border-2 border-emerald-400/30 bg-emerald-500/5 p-4 text-center transition-all hover:-translate-y-0.5 hover:border-emerald-400/60 hover:bg-emerald-500/15"
                        >
                            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-2xl shadow-md">📊</span>
                            <span>
                                <span className="block text-sm font-black text-emerald-100">Desde Excel</span>
                                <span className="block text-[10px] text-emerald-200/70">.xlsx .csv .ods</span>
                            </span>
                        </button>

                        <button
                            onClick={() => setModal('importar-json')}
                            className="group flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-slate-800/40 p-4 text-center transition-all hover:-translate-y-0.5 hover:border-blue-400/50 hover:bg-slate-800/70"
                        >
                            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-2xl shadow-md">📄</span>
                            <span>
                                <span className="block text-sm font-black text-gray-100">JSON existente</span>
                                <span className="block text-[10px] text-gray-400">Pegar y editar</span>
                            </span>
                        </button>
                    </div>
                </div>

                {/* ===== PROYECTOS ===== */}
                <div className={`${card} cc-fade-up p-4 md:p-6`}>
                    <div className="mb-4 flex items-center justify-between gap-3">
                        <h2 className={`${sectionTitle}`}>📁 Mis proyectos</h2>
                        {proyectos.length > 0 && (
                            <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-bold text-gray-300 ring-1 ring-white/10">
                                {proyectos.length}
                            </span>
                        )}
                    </div>

                    {cargando ? (
                        <div className="py-8 text-center">
                            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-violet-500/30 border-t-violet-500" />
                        </div>
                    ) : proyectos.length === 0 ? (
                        <div className="py-10 text-center">
                            <p className="mb-2 text-4xl">📭</p>
                            <p className="text-sm font-bold text-gray-300">Aún no tienes proyectos</p>
                            <p className="mt-1 text-xs text-gray-500">Crea uno arriba para comenzar</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            {proyectos.map(p => (
                                <TarjetaProyecto
                                    key={p.id}
                                    proyecto={p}
                                    onAbrir={() => setProyectoAbierto(p)}
                                    onDuplicar={async () => {
                                        await duplicarProyecto(p.id!);
                                        cargar();
                                    }}
                                    onEliminar={async () => {
                                        if (!confirm(`¿Eliminar "${p.nombreCliente}"?\n\nEsta acción no se puede deshacer.`)) return;
                                        await eliminarProyecto(p.id!);
                                        cargar();
                                    }}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* ===== MODALES ===== */}
            {modal === 'nuevo-manual' && (
                <div className={modalOverlay}>
                    <div className={`${modalPanel} max-w-md`}>
                        <div className="flex items-center justify-between bg-gradient-to-r from-violet-600 to-purple-700 px-6 py-4">
                            <h2 className={modalTitle}>✍️ Nuevo proyecto manual</h2>
                            <button onClick={() => { setModal(null); setNombreNuevo(''); }} className={modalClose}>&times;</button>
                        </div>
                        <div className="space-y-4 p-6">
                            <div>
                                <label className={label}>Nombre del cliente</label>
                                <input
                                    type="text"
                                    value={nombreNuevo}
                                    onChange={(e) => setNombreNuevo(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') crearYAbrir('manual'); }}
                                    className={input}
                                    placeholder='Ej: Panadería "Juan"'
                                    autoFocus
                                />
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => { setModal(null); setNombreNuevo(''); }}
                                    className="flex-1 rounded-xl border border-white/10 bg-slate-800/60 py-3 text-sm font-bold text-gray-300">
                                    Cancelar
                                </button>
                                <button
                                    onClick={() => crearYAbrir('manual')}
                                    disabled={!nombreNuevo.trim()}
                                    className="flex-1 rounded-xl bg-gradient-to-r from-violet-600 to-purple-700 py-3 text-sm font-black text-white disabled:opacity-40"
                                >
                                    Crear
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {modal === 'nuevo-pegado' && (
                <div className={modalOverlay}>
                    <div className={`${modalPanel} max-w-md`}>
                        <div className="flex items-center justify-between bg-gradient-to-r from-cyan-600 to-blue-700 px-6 py-4">
                            <h2 className={modalTitle}>📋 Nuevo proyecto con pegado</h2>
                            <button onClick={() => { setModal(null); setNombreNuevo(''); }} className={modalClose}>&times;</button>
                        </div>
                        <div className="space-y-4 p-6">
                            <div>
                                <label className={label}>Nombre del cliente</label>
                                <input
                                    type="text"
                                    value={nombreNuevo}
                                    onChange={(e) => setNombreNuevo(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') crearYAbrir('pegado'); }}
                                    className={input}
                                    placeholder='Ej: Bodega "El Sol"'
                                    autoFocus
                                />
                                <p className="mt-2 text-[11px] text-gray-500">
                                    Se abrirá el proyecto con el panel de pegado listo.
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => { setModal(null); setNombreNuevo(''); }}
                                    className="flex-1 rounded-xl border border-white/10 bg-slate-800/60 py-3 text-sm font-bold text-gray-300">
                                    Cancelar
                                </button>
                                <button
                                    onClick={() => crearYAbrir('pegado')}
                                    disabled={!nombreNuevo.trim()}
                                    className="flex-1 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-700 py-3 text-sm font-black text-white disabled:opacity-40"
                                >
                                    Crear
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {modal === 'nuevo-excel' && (
                <div className={modalOverlay}>
                    <div className={`${modalPanel} max-w-md`}>
                        <div className="flex items-center justify-between bg-gradient-to-r from-emerald-600 to-teal-700 px-6 py-4">
                            <h2 className={modalTitle}>📊 Nuevo proyecto desde Excel</h2>
                            <button onClick={() => { setModal(null); setNombreNuevo(''); }} className={modalClose}>&times;</button>
                        </div>
                        <div className="space-y-4 p-6">
                            <div>
                                <label className={label}>Nombre del cliente</label>
                                <input
                                    type="text"
                                    value={nombreNuevo}
                                    onChange={(e) => setNombreNuevo(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') crearYAbrir('excel'); }}
                                    className={input}
                                    placeholder='Ej: Mercadito "La Esquina"'
                                    autoFocus
                                />
                                <p className="mt-2 text-[11px] text-gray-500">
                                    Se abrirá el proyecto con el importador de Excel listo.
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => { setModal(null); setNombreNuevo(''); }}
                                    className="flex-1 rounded-xl border border-white/10 bg-slate-800/60 py-3 text-sm font-bold text-gray-300">
                                    Cancelar
                                </button>
                                <button
                                    onClick={() => crearYAbrir('excel')}
                                    disabled={!nombreNuevo.trim()}
                                    className="flex-1 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 py-3 text-sm font-black text-white disabled:opacity-40"
                                >
                                    Crear
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {modal === 'importar-json' && (
                <div className={modalOverlay}>
                    <div className={`${modalPanel} my-4 max-w-2xl`}>
                        <div className="flex items-center justify-between bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-4">
                            <h2 className={modalTitle}>📄 Importar JSON existente</h2>
                            <button onClick={() => { setModal(null); setJsonPegado(''); setErrorImport(null); }} className={modalClose}>&times;</button>
                        </div>
                        <div className="max-h-[70vh] space-y-4 overflow-y-auto p-6">
                            <div>
                                <label className={label}>Pega el JSON aquí</label>
                                <textarea
                                    value={jsonPegado}
                                    onChange={(e) => { setJsonPegado(e.target.value); setErrorImport(null); }}
                                    className={`${input} font-mono text-xs`}
                                    rows={12}
                                    placeholder='{"version":1,"productos":[{...}]}'
                                />
                            </div>
                            {errorImport && (
                                <div className="rounded-xl border border-rose-400/25 bg-rose-500/10 p-3 text-xs font-bold text-rose-300">
                                    ⚠️ {errorImport}
                                </div>
                            )}
                            <div className="flex gap-2">
                                <button onClick={() => { setModal(null); setJsonPegado(''); setErrorImport(null); }}
                                    className="flex-1 rounded-xl border border-white/10 bg-slate-800/60 py-3 text-sm font-bold text-gray-300">
                                    Cancelar
                                </button>
                                <button
                                    onClick={manejarImportarJSON}
                                    disabled={!jsonPegado.trim()}
                                    className="flex-1 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-700 py-3 text-sm font-black text-white disabled:opacity-40"
                                >
                                    Importar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}