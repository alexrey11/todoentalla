import { useState, useEffect, useMemo } from 'react';

import type { Usuario, ProyectoMigracion, ProductoMigracion } from '../db';
import {
    STYLES, BackgroundBlobs, pageWrap, card, cardPadded, titleGradient,
    sectionTitle, input,

} from '../theme';
import ModalProducto from './components/ModalProducto';
import PegadoMasivo from './components/PegadoMasivo';
import ImportadorExcel from './components/ImportadorExcel';
import VistaPreviaJSON from './components/VistaPreviaJSON';
import PanelCategorias from './components/PanelCategorias';
import { ESTADOS_PROYECTO } from './types';
import {
    guardarProyecto, descargarProyectoJSON, copiarProyectoJSON,
    sincronizarCategorias, compartirProyectoJSON,
    fusionarDuplicados, validarProyecto,
} from '../utils/migracionUtils';

interface Props {
    proyecto: ProyectoMigracion;
    usuarioActual: Usuario;
    onVolver: () => void;
    onActualizar: (p: ProyectoMigracion) => void;
}

type Panel = null | 'producto' | 'pegado' | 'excel' | 'estado' | 'categorias' | 'duplicados' | 'preview';

export default function ProyectoMigracionVista({ proyecto, onVolver, onActualizar }: Props) {
    const [busqueda, setBusqueda] = useState('');
    const [filtroCat, setFiltroCat] = useState<string>('');
    const [modalProducto, setModalProducto] = useState<{ abierto: boolean; edicion: ProductoMigracion | null; indice: number }>({
        abierto: false, edicion: null, indice: -1,
    });
    const [panel, setPanel] = useState<Panel>(null);
    const [copiado, setCopiado] = useState(false);
    const [guardando, setGuardando] = useState(false);
    const [msgCompartir, setMsgCompartir] = useState<{ tipo: 'ok' | 'info' | 'error'; texto: string } | null>(null);
    const [previewAbierto, setPreviewAbierto] = useState(false);

    // Panel por defecto según el origen
    useEffect(() => {
        const abrir = sessionStorage.getItem('cc.migracion.abrirPanel');
        if (abrir === 'pegado') setPanel('pegado');
        else if (abrir === 'excel') setPanel('excel');
        sessionStorage.removeItem('cc.migracion.abrirPanel');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Autoguardado
    useEffect(() => {
        setGuardando(true);
        const t = setTimeout(async () => {
            await guardarProyecto(proyecto);
            setGuardando(false);
        }, 600);
        return () => clearTimeout(t);
    }, [proyecto.productos, proyecto.categorias, proyecto.notas, proyecto.estado, proyecto.mapeoColumnas]);

    const validacion = useMemo(() => validarProyecto(proyecto), [proyecto]);

    const productosFiltrados = useMemo(() => {
        const q = busqueda.toLowerCase().trim();
        return proyecto.productos.map((p, i) => ({ p, i })).filter(({ p }) => {
            if (filtroCat && p.categoria !== filtroCat) return false;
            if (!q) return true;
            return p.nombre.toLowerCase().includes(q)
                || p.categoria.toLowerCase().includes(q)
                || (p.codigoBarras && p.codigoBarras.includes(q));
        });
    }, [proyecto.productos, busqueda, filtroCat]);

    const categoriasUsadas = useMemo(() => {
        const set = new Set<string>();
        proyecto.productos.forEach(p => { if (p.categoria) set.add(p.categoria); });
        return Array.from(set).sort();
    }, [proyecto.productos]);

    // ===== CRUD =====
    const guardarProducto = (p: ProductoMigracion) => {
        const idx = modalProducto.indice;
        let nuevos;
        if (idx >= 0) {
            nuevos = [...proyecto.productos];
            nuevos[idx] = p;
        } else {
            nuevos = [...proyecto.productos, p];
        }
        const actualizado = sincronizarCategorias({ ...proyecto, productos: nuevos });
        onActualizar(actualizado);

        if (idx < 0) {
            setModalProducto({ abierto: true, edicion: null, indice: -1 });
        } else {
            setModalProducto({ abierto: false, edicion: null, indice: -1 });
        }
    };

    const eliminarProducto = (idx: number) => {
        const nuevos = proyecto.productos.filter((_, i) => i !== idx);
        const actualizado = sincronizarCategorias({ ...proyecto, productos: nuevos });
        onActualizar(actualizado);
        setModalProducto({ abierto: false, edicion: null, indice: -1 });
    };

    const agregarMasivo = (productos: ProductoMigracion[]) => {
        const nuevos = [...proyecto.productos, ...productos];
        const actualizado = sincronizarCategorias({ ...proyecto, productos: nuevos });
        onActualizar(actualizado);
        setPanel(null);
    };

    // ===== EXPORTAR =====
    const exportarJSON = () => {
        descargarProyectoJSON(proyecto);
    };

    const copiarJSON = async () => {
        const ok = await copiarProyectoJSON(proyecto);
        if (ok) {
            setCopiado(true);
            setTimeout(() => setCopiado(false), 2000);
        } else {
            alert('No se pudo copiar. Usa "Descargar" mejor.');
        }
    };

    const manejarCompartir = async () => {
        setMsgCompartir(null);
        const res = await compartirProyectoJSON(proyecto);
        if (res.ok) {
            setMsgCompartir({
                tipo: res.viaWebShare ? 'ok' : 'info',
                texto: res.viaWebShare ? '✅ Compartido correctamente' : `ℹ️ ${res.mensaje}`,
            });
        } else if (res.mensaje === 'cancelado') {
            setMsgCompartir({ tipo: 'info', texto: 'Compartir cancelado' });
        } else {
            setMsgCompartir({ tipo: 'error', texto: res.mensaje });
        }
        setTimeout(() => setMsgCompartir(null), 4000);
    };

    const cambiarEstado = async (nuevo: ProyectoMigracion['estado']) => {
        const actualizado = { ...proyecto, estado: nuevo };
        onActualizar(actualizado);
        await guardarProyecto(actualizado);
        setPanel(null);
    };

    return (
        <div className={pageWrap}>
            <style>{STYLES}</style>
            <BackgroundBlobs />

            <div className="relative mx-auto max-w-4xl pb-24 md:pb-8">
                {/* ===== HEADER ===== */}
                <div className={`cc-fade-up mb-4 md:mb-6 ${cardPadded}`}>
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                            <button
                                onClick={onVolver}
                                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-slate-800/60 text-lg text-gray-200 transition-colors hover:bg-slate-800"
                            >
                                ←
                            </button>
                            <div className="min-w-0">
                                <h1 className={`${titleGradient} truncate text-lg md:text-2xl`}>
                                    {proyecto.nombreCliente}
                                </h1>
                                <div className="flex items-center gap-2">
                                    <span className="text-[11px] text-gray-400">
                                        {proyecto.productos.length} producto{proyecto.productos.length !== 1 ? 's' : ''}
                                    </span>
                                    <span className="text-gray-600">·</span>
                                    <span className="text-[11px] text-gray-400">
                                        {proyecto.categorias.length} categoría{proyecto.categorias.length !== 1 ? 's' : ''}
                                    </span>
                                    {guardando && (
                                        <>
                                            <span className="text-gray-600">·</span>
                                            <span className="text-[10px] font-bold uppercase text-emerald-400">Guardando…</span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={() => setPanel(panel === 'estado' ? null : 'estado')}
                            className="shrink-0 rounded-xl border border-white/10 bg-slate-800/60 px-3 py-2 text-xs font-bold text-gray-200 transition-colors hover:bg-slate-800"
                        >
                            {ESTADOS_PROYECTO.find(e => e.id === proyecto.estado)?.icon}{' '}
                            {ESTADOS_PROYECTO.find(e => e.id === proyecto.estado)?.label}
                        </button>
                    </div>

                    {panel === 'estado' && (
                        <div className="mt-3 grid grid-cols-3 gap-2 border-t border-white/10 pt-3">
                            {ESTADOS_PROYECTO.map(e => (
                                <button
                                    key={e.id}
                                    onClick={() => cambiarEstado(e.id)}
                                    className={`rounded-xl border p-3 text-center text-xs font-bold transition-colors ${proyecto.estado === e.id
                                        ? 'border-violet-400/60 bg-violet-500/15 text-violet-200'
                                        : 'border-white/10 bg-slate-800/40 text-gray-300 hover:border-violet-400/40'
                                        }`}
                                >
                                    <span className="block text-lg">{e.icon}</span>
                                    <span className="mt-0.5 block">{e.label}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* ===== MENSAJE COMPARTIR ===== */}
                {msgCompartir && (
                    <div className={`cc-fade-up mb-3 rounded-xl border p-3 text-sm font-bold ${msgCompartir.tipo === 'ok' ? 'border-emerald-400/25 bg-emerald-500/10 text-emerald-300'
                        : msgCompartir.tipo === 'info' ? 'border-blue-400/25 bg-blue-500/10 text-blue-300'
                            : 'border-rose-400/25 bg-rose-500/10 text-rose-300'
                        }`}>
                        {msgCompartir.texto}
                    </div>
                )}

                {/* ===== VALIDACIÓN RÁPIDA ===== */}
                {proyecto.productos.length > 0 && !validacion.valido && (
                    <div className="cc-fade-up mb-4 rounded-xl border border-rose-400/25 bg-rose-500/10 p-3">
                        <p className="text-sm font-bold text-rose-300">
                            ❌ {validacion.errores.length} error{validacion.errores.length !== 1 ? 'es' : ''} crítico{validacion.errores.length !== 1 ? 's' : ''}
                        </p>
                        <ul className="mt-1 list-disc pl-5 text-xs text-rose-200">
                            {validacion.errores.map((e, i) => <li key={i}>{e}</li>)}
                        </ul>
                    </div>
                )}

                {/* ===== AVISOS DE ADVERTENCIAS ===== */}
                {proyecto.productos.length > 0 && validacion.valido && validacion.advertencias.length > 0 && (
                    <div className="cc-fade-up mb-4 rounded-xl border border-amber-400/25 bg-amber-500/10 p-3">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-bold text-amber-300">
                                    ⚠️ {validacion.advertencias.length} advertencia{validacion.advertencias.length !== 1 ? 's' : ''}
                                </p>
                                <p className="mt-0.5 text-[11px] text-amber-200/80">
                                    {validacion.advertencias.join(' · ')}
                                </p>
                            </div>
                            {(validacion.duplicadosCodigo.length > 0 || validacion.duplicadosNombre.length > 0) && (
                                <button
                                    onClick={() => setPanel(panel === 'duplicados' ? null : 'duplicados')}
                                    className="shrink-0 rounded-lg border border-amber-400/30 bg-amber-500/15 px-3 py-1.5 text-xs font-bold text-amber-200 hover:bg-amber-500/25"
                                >
                                    Gestionar
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* ===== PANEL DUPLICADOS ===== */}
                {panel === 'duplicados' && (
                    <div className={`${card} cc-fade-up mb-4 p-4 md:mb-6 md:p-6`}>
                        <div className="mb-3 flex items-center justify-between">
                            <h2 className={sectionTitle}>🔍 Duplicados detectados</h2>
                            <button onClick={() => setPanel(null)} className="text-gray-400 hover:text-white">✕</button>
                        </div>

                        {validacion.duplicadosCodigo.length > 0 && (
                            <div className="mb-4">
                                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-amber-300">
                                    📊 Por código de barras ({validacion.duplicadosCodigo.length})
                                </p>
                                <div className="space-y-1.5">
                                    {validacion.duplicadosCodigo.map((d, i) => (
                                        <div key={i} className="rounded-xl border border-amber-400/20 bg-amber-500/5 p-2.5">
                                            <p className="font-mono text-xs font-bold text-amber-200">{d.codigo}</p>
                                            <p className="mt-0.5 text-[10px] text-gray-400">
                                                {d.productos.join(' · ')}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                                <button
                                    onClick={() => {
                                        if (!confirm(`Se mantendrá solo el primer producto de cada código duplicado.\n\n¿Continuar?`)) return;
                                        onActualizar(fusionarDuplicados(proyecto, 'codigo'));
                                        setPanel(null);
                                    }}
                                    className="mt-2 w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 py-2.5 text-xs font-bold text-white"
                                >
                                    🧹 Fusionar duplicados por código
                                </button>
                            </div>
                        )}

                        {validacion.duplicadosNombre.length > 0 && (
                            <div>
                                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-amber-300">
                                    📝 Por nombre ({validacion.duplicadosNombre.length})
                                </p>
                                <div className="space-y-1.5">
                                    {validacion.duplicadosNombre.slice(0, 10).map((d, i) => (
                                        <div key={i} className="rounded-xl border border-amber-400/20 bg-amber-500/5 p-2.5">
                                            <p className="text-xs font-bold text-amber-200">{d.nombre}</p>
                                            <p className="mt-0.5 text-[10px] text-gray-400">
                                                Filas: {d.filas.join(', ')}
                                            </p>
                                        </div>
                                    ))}
                                    {validacion.duplicadosNombre.length > 10 && (
                                        <p className="text-center text-[10px] text-gray-500">
                                            +{validacion.duplicadosNombre.length - 10} más…
                                        </p>
                                    )}
                                </div>
                                <button
                                    onClick={() => {
                                        if (!confirm(`Se mantendrá solo el primer producto de cada nombre duplicado.\n\n¿Continuar?`)) return;
                                        onActualizar(fusionarDuplicados(proyecto, 'nombre'));
                                        setPanel(null);
                                    }}
                                    className="mt-2 w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 py-2.5 text-xs font-bold text-white"
                                >
                                    🧹 Fusionar duplicados por nombre
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* ===== BOTONES DE ACCIÓN ===== */}
                <div className="cc-fade-up mb-4 grid grid-cols-2 gap-2 md:mb-6 md:grid-cols-4">
                    <button
                        onClick={() => setPreviewAbierto(true)}
                        disabled={proyecto.productos.length === 0}
                        className="rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 py-3 text-sm font-bold text-white shadow-md transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
                    >
                        👁️ Vista previa
                    </button>
                    <button
                        onClick={exportarJSON}
                        disabled={proyecto.productos.length === 0}
                        className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-3 text-sm font-bold text-white shadow-md transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
                    >
                        💾 Descargar
                    </button>
                    <button
                        onClick={copiarJSON}
                        disabled={proyecto.productos.length === 0}
                        className={`rounded-xl py-3 text-sm font-bold text-white shadow-md transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 ${copiado
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-600'
                            : 'bg-gradient-to-r from-cyan-600 to-blue-600'
                            }`}
                    >
                        {copiado ? '✅ Copiado' : '📋 Copiar'}
                    </button>
                    <button
                        onClick={manejarCompartir}
                        disabled={proyecto.productos.length === 0 || !validacion.valido}
                        className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 py-3 text-sm font-bold text-white shadow-md transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
                    >
                        📤 Compartir
                    </button>
                </div>

                {/* ===== HERRAMIENTAS ===== */}
                <div className="cc-fade-up mb-4 grid grid-cols-2 gap-2 md:mb-6 md:grid-cols-4">
                    <button
                        onClick={() => setPanel(panel === 'excel' ? null : 'excel')}
                        className={`rounded-xl py-3 text-xs font-bold shadow-md transition-transform hover:-translate-y-0.5 md:text-sm ${panel === 'excel'
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white'
                            : 'border-2 border-emerald-400/30 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20'
                            }`}
                    >
                        📊 Excel
                    </button>
                    <button
                        onClick={() => setPanel(panel === 'pegado' ? null : 'pegado')}
                        className={`rounded-xl py-3 text-xs font-bold shadow-md transition-transform hover:-translate-y-0.5 md:text-sm ${panel === 'pegado'
                            ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white'
                            : 'border-2 border-cyan-400/30 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/20'
                            }`}
                    >
                        📥 Pegado
                    </button>
                    <button
                        onClick={() => setPanel(panel === 'categorias' ? null : 'categorias')}
                        className={`rounded-xl py-3 text-xs font-bold shadow-md transition-transform hover:-translate-y-0.5 md:text-sm ${panel === 'categorias'
                            ? 'bg-gradient-to-r from-purple-500 to-fuchsia-600 text-white'
                            : 'border-2 border-purple-400/30 bg-purple-500/10 text-purple-200 hover:bg-purple-500/20'
                            }`}
                    >
                        🏷️ Categorías
                    </button>
                    <button
                        onClick={() => setModalProducto({ abierto: true, edicion: null, indice: -1 })}
                        className="rounded-xl bg-gradient-to-r from-violet-600 to-purple-700 py-3 text-xs font-bold text-white shadow-md transition-transform hover:-translate-y-0.5 md:text-sm"
                    >
                        ➕ Manual
                    </button>
                </div>

                {/* ===== PANEL EXCEL ===== */}
                {panel === 'excel' && (
                    <div className={`${card} cc-fade-up mb-4 p-4 md:mb-6 md:p-6`}>
                        <div className="mb-3 flex items-center justify-between">
                            <div>
                                <h2 className={sectionTitle}>📊 Importar desde Excel</h2>
                                <p className="mt-0.5 text-[11px] text-gray-500">Sube un .xlsx, .xls, .csv o .ods</p>
                            </div>
                            <button onClick={() => setPanel(null)} className="text-gray-400 hover:text-white">✕</button>
                        </div>
                        <ImportadorExcel
                            onAgregar={agregarMasivo}
                            mapeoGuardado={proyecto.mapeoColumnas}
                            onGuardarMapeo={(m) => onActualizar({ ...proyecto, mapeoColumnas: m })}
                        />
                    </div>
                )}

                {/* ===== PANEL PEGADO ===== */}
                {panel === 'pegado' && (
                    <div className={`${card} cc-fade-up mb-4 p-4 md:mb-6 md:p-6`}>
                        <div className="mb-3 flex items-center justify-between">
                            <h2 className={sectionTitle}>📥 Pegado masivo</h2>
                            <button onClick={() => setPanel(null)} className="text-gray-400 hover:text-white">✕</button>
                        </div>
                        <PegadoMasivo onAgregar={agregarMasivo} />
                    </div>
                )}

                {/* ===== PANEL CATEGORÍAS ===== */}
                {panel === 'categorias' && (
                    <div className={`${card} cc-fade-up mb-4 p-4 md:mb-6 md:p-6`}>
                        <div className="mb-3 flex items-center justify-between">
                            <h2 className={sectionTitle}>🏷️ Gestión de categorías</h2>
                            <button onClick={() => setPanel(null)} className="text-gray-400 hover:text-white">✕</button>
                        </div>
                        <PanelCategorias proyecto={proyecto} onActualizar={onActualizar} />
                    </div>
                )}

                {/* ===== LISTA DE PRODUCTOS ===== */}
                <div className={`${card} cc-fade-up p-3 md:p-5`}>
                    <div className="mb-3 flex items-center justify-between gap-2">
                        <h2 className={sectionTitle}>📦 Productos ({proyecto.productos.length})</h2>
                        <button
                            onClick={() => setModalProducto({ abierto: true, edicion: null, indice: -1 })}
                            className="rounded-xl bg-gradient-to-r from-violet-600 to-purple-700 px-3 py-2 text-xs font-bold text-white shadow-md transition-transform hover:-translate-y-0.5 md:text-sm"
                        >
                            ➕ Agregar
                        </button>
                    </div>

                    {proyecto.productos.length > 0 && (
                        <div className="mb-3 flex flex-col gap-2 md:flex-row">
                            <input
                                type="text"
                                placeholder="🔍 Buscar..."
                                value={busqueda}
                                onChange={(e) => setBusqueda(e.target.value)}
                                className={`${input} flex-1`}
                            />
                            <select
                                value={filtroCat}
                                onChange={(e) => setFiltroCat(e.target.value)}
                                className={`${input} md:w-48`}
                            >
                                <option value="">Todas las categorías</option>
                                {categoriasUsadas.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                    )}

                    {proyecto.productos.length === 0 ? (
                        <div className="py-10 text-center">
                            <p className="mb-2 text-4xl">📭</p>
                            <p className="text-sm font-bold text-gray-300">Sin productos todavía</p>
                            <p className="mt-1 text-xs text-gray-500">
                                Usa <strong>📊 Excel</strong>, <strong>📥 Pegado</strong> o <strong>➕ Manual</strong>
                            </p>
                        </div>
                    ) : productosFiltrados.length === 0 ? (
                        <p className="py-6 text-center text-sm text-gray-500">Sin resultados</p>
                    ) : (
                        <div className="space-y-1.5">
                            {productosFiltrados.map(({ p, i }) => (
                                <button
                                    key={i}
                                    onClick={() => setModalProducto({ abierto: true, edicion: p, indice: i })}
                                    className="w-full rounded-xl border border-white/10 bg-slate-800/40 p-2.5 text-left transition-colors hover:border-violet-400/40 hover:bg-slate-800/70 md:p-3"
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-bold text-gray-100">{p.nombre}</p>
                                            <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px] text-gray-500">
                                                <span className="rounded bg-cyan-500/15 px-1.5 py-0.5 font-bold text-cyan-300">{p.categoria || '⚠️ sin cat'}</span>
                                                {p.codigoBarras && <span className="font-mono">{p.codigoBarras}</span>}
                                                {p.stockActual !== undefined && <span>Stock: {p.stockActual}</span>}
                                            </p>
                                        </div>
                                        <span className="shrink-0 font-mono text-sm font-black text-blue-300">
                                            ${p.precioVenta.toFixed(2)}
                                        </span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* ===== NOTAS ===== */}
                <div className={`${card} cc-fade-up mt-4 p-4 md:mt-6 md:p-6`}>
                    <h2 className={`${sectionTitle} mb-3`}>📝 Notas del proyecto</h2>
                    <textarea
                        value={proyecto.notas ?? ''}
                        onChange={(e) => onActualizar({ ...proyecto, notas: e.target.value })}
                        className={input}
                        rows={3}
                        placeholder="Ej: El cliente pidió revisar precios el jueves…"
                    />
                </div>
            </div>

            {/* ===== BOTÓN FLOTANTE ===== */}
            <button
                onClick={() => setModalProducto({ abierto: true, edicion: null, indice: -1 })}
                className="fixed bottom-20 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-purple-700 text-2xl text-white shadow-2xl transition-transform hover:scale-105 md:bottom-6 md:right-6"
                aria-label="Agregar producto"
            >
                ➕
            </button>

            {/* ===== MODAL PRODUCTO ===== */}
            {modalProducto.abierto && (
                <ModalProducto
                    producto={modalProducto.edicion}
                    categoriasExistentes={categoriasUsadas}
                    onGuardar={guardarProducto}
                    onCancelar={() => setModalProducto({ abierto: false, edicion: null, indice: -1 })}
                    onEliminar={modalProducto.indice >= 0 ? () => eliminarProducto(modalProducto.indice) : undefined}
                />
            )}

            {/* ===== VISTA PREVIA JSON ===== */}
            {previewAbierto && (
                <VistaPreviaJSON
                    proyecto={proyecto}
                    onCerrar={() => setPreviewAbierto(false)}
                    onCompartir={() => {
                        setPreviewAbierto(false);
                        manejarCompartir();
                    }}
                />
            )}
        </div>
    );
}