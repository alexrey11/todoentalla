import { useState, useEffect } from 'react';
import {
  Settings,
  Palette,
  DollarSign,
  CheckCircle,
  ShieldCheck,
  Monitor,
  Eye,
  Menu,
  Database,
  Download,
  Upload,
  Share2,
  Trash2,
  Save,
  AlertTriangle,
  Bell,
  Type,
  Zap,
  Lock,
  Clock,
  Store,
  Bot,
  Image as ImageIcon,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { Card, Button, Badge, Input, Select, Modal } from '@/components/ui';
import { PageHeader } from '@/layout/PageHeader';

import { db } from '@/db';
import type { Usuario } from '@/db';
import {
  cargarPreferencias,
  guardarPreferencias,
  resetearPreferencias,
  aplicarPreferenciasVisuales,
  PREFERENCIAS_DEFAULT,
  VISTAS_OPCIONALES_VENDEDOR,
  type Preferencias,
  type TamanoFuente,
  type FormatoFecha,
  type FormatoHora,
  type PinLongitud,
} from '@/utils/preferencias';
import { guardarArchivo, compartirArchivo } from '@/utils/descargas';
import { registrarLog } from '@/utils/logger';
import { mergeBackup } from '@/utils/mergeBackup';
import { navSections } from '@/layout/navConfig';

type Seccion =
  | 'tema'
  | 'general'
  | 'confirmaciones'
  | 'seguridad'
  | 'kiosco'
  | 'permisos'
  | 'menu'
  | 'backup';

interface ConfiguracionProps {
  usuarioActual: Usuario;
}

const TIPOS_IMAGEN = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'];

const TAMANOS_FUENTE: { id: TamanoFuente; label: string }[] = [
  { id: 'pequeno', label: 'Pequeño' },
  { id: 'normal', label: 'Normal' },
  { id: 'grande', label: 'Grande' },
];

const FORMATOS_FECHA: { id: FormatoFecha; label: string }[] = [
  { id: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
  { id: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
  { id: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
];

const FORMATOS_HORA: { id: FormatoHora; label: string }[] = [
  { id: '24h', label: '24 horas' },
  { id: '12h', label: '12 horas (AM/PM)' },
];

const AUTO_LOGOUT: { id: 0 | 5 | 15 | 30; label: string }[] = [
  { id: 0, label: 'Nunca' },
  { id: 5, label: '5 min' },
  { id: 15, label: '15 min' },
  { id: 30, label: '30 min' },
];

const PIN_LONGITUDES: { id: PinLongitud; label: string }[] = [
  { id: 4, label: '4 dígitos' },
  { id: 6, label: '6 dígitos' },
  { id: 8, label: '8 dígitos' },
];

const COLORES_KIOSCO = [
  { id: 'blue', hex: '#2563eb', label: 'Azul' },
  { id: 'violet', hex: '#7c3aed', label: 'Violeta' },
  { id: 'emerald', hex: '#059669', label: 'Verde' },
  { id: 'rose', hex: '#e11d48', label: 'Rojo' },
  { id: 'amber', hex: '#d97706', label: 'Ámbar' },
] as const;

// Helpers para imágenes
function leerArchivoComoDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Error al leer archivo'));
    reader.readAsDataURL(file);
  });
}

function comprimirImagen(file: File, maxSize: number, calidad: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxSize || height > maxSize) {
          const ratio = Math.min(maxSize / width, maxSize / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('No canvas ctx')); return; }
        if (file.type === 'image/png') {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/png'));
        } else {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', calidad));
        }
      };
      img.onerror = () => reject(new Error('Imagen inválida'));
      img.src = ev.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Error al leer archivo'));
    reader.readAsDataURL(file);
  });
}

export function Configuracion({ usuarioActual }: ConfiguracionProps) {
  const [seccion, setSeccion] = useState<Seccion>('tema');
  const [prefs, setPrefs] = useState<Preferencias>(PREFERENCIAS_DEFAULT);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);

  const [pinMaestroInput, setPinMaestroInput] = useState('');
  const [subiendoLogo, setSubiendoLogo] = useState(false);
  const [urlLogoInput, setUrlLogoInput] = useState('');

  const [modalBorrar, setModalBorrar] = useState(false);
  const [msgBackup, setMsgBackup] = useState<{ tipo: 'ok' | 'error' | 'info'; texto: string } | null>(null);
  const [exportando, setExportando] = useState(false);
  const [importando, setImportando] = useState(false);

  const esAdminOJefe = usuarioActual.rol === 'admin' || usuarioActual.rol === 'jefe';

  // Cargar preferencias al montar
  useEffect(() => {
    cargarPreferencias().then((p) => {
      setPrefs(p);
      setPinMaestroInput(p.pinMaestro || '');
      setCargando(false);
    });
  }, []);

  // Actualizar preferencias
  const actualizarPref = async <K extends keyof Preferencias>(clave: K, valor: Preferencias[K]) => {
    const nuevo = { ...prefs, [clave]: valor };
    setPrefs(nuevo);
    setGuardando(true);
    await guardarPreferencias(nuevo);
    aplicarPreferenciasVisuales(nuevo);
    setTimeout(() => setGuardando(false), 500);
  };

  const togglePref = (clave: keyof Preferencias) => {
    const valorActual = prefs[clave];
    if (typeof valorActual === 'boolean') {
      actualizarPref(clave, !valorActual as any);
    }
  };

  const actualizarKiosco = <K extends keyof Preferencias['kiosco']>(
    clave: K,
    valor: Preferencias['kiosco'][K]
  ) => {
    actualizarPref('kiosco', { ...prefs.kiosco, [clave]: valor });
  };

  // PIN maestro
  const guardarPinMaestro = async () => {
    const limpio = pinMaestroInput.trim();
    if (limpio && limpio.length !== prefs.pinLongitud) {
      alert(`El PIN maestro debe tener exactamente ${prefs.pinLongitud} dígitos, o estar vacío para desactivarlo.`);
      return;
    }
    await actualizarPref('pinMaestro', limpio);
    alert(limpio ? '✅ PIN maestro guardado' : '✅ PIN maestro desactivado');
  };

  // Kiosco: logo
  const manejarSubirLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!TIPOS_IMAGEN.includes(file.type)) {
      alert('Formato no soportado.\nUsa PNG, JPG, WEBP o SVG.');
      if (e.target) e.target.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('La imagen es muy grande (máx 5 MB).');
      if (e.target) e.target.value = '';
      return;
    }

    setSubiendoLogo(true);
    try {
      const dataUrl = file.type === 'image/svg+xml'
        ? await leerArchivoComoDataURL(file)
        : await comprimirImagen(file, 512, 0.9);
      await actualizarKiosco('logoUrl', dataUrl);
    } catch (err: any) {
      alert(`Error al procesar la imagen: ${err?.message ?? 'desconocido'}`);
    } finally {
      setSubiendoLogo(false);
      if (e.target) e.target.value = '';
    }
  };

  const aplicarUrlLogo = async () => {
    const val = urlLogoInput.trim();
    if (!val) return;
    await actualizarKiosco('logoUrl', val);
    setUrlLogoInput('');
  };

  // Backup
  const recolectarDatos = async () => ({
    _meta: { app: 'TodoenTalla', version: 1, fecha: new Date().toISOString() },
    categorias: await db.categorias.toArray(),
    productos: await db.productos.toArray(),
    ventas: await db.ventas.toArray(),
    clientes: await db.clientes.toArray(),
    usuarios: await db.usuarios.toArray(),
    tasasCambio: await db.tasasCambio.toArray(),
    puntosDeVenta: await db.puntosDeVenta.toArray(),
    proveedores: await db.proveedores.toArray(),
    compras: await db.compras.toArray(),
    gastos: await db.gastos.toArray(),
    movimientosInventario: await db.movimientosInventario.toArray(),
    cierres: await db.cierres.toArray(),
    devoluciones: await db.devoluciones.toArray(),
    cotizaciones: await db.cotizaciones.toArray(),
    pagosFiados: await db.pagosFiados.toArray(),
    preferencias: prefs,
  });

  const exportarBackup = async () => {
    setExportando(true); setMsgBackup(null);
    try {
      const json = JSON.stringify(await recolectarDatos(), null, 2);
      const nombre = `backup_todoentalla_${new Date().toISOString().split('T')[0]}.json`;
      const res = await guardarArchivo(json, nombre, 'application/json');
      if (res.ok) {
        setMsgBackup({ tipo: 'ok', texto: res.mensaje });
        await registrarLog('backup_exportado', 'Backup guardado', {
          usuarioId: usuarioActual.id, usuarioNombre: usuarioActual.nombre,
        });
      } else if (res.mensaje.includes('cancelado')) {
        setMsgBackup({ tipo: 'info', texto: 'Guardado cancelado' });
      } else {
        setMsgBackup({ tipo: 'error', texto: `Error: ${res.mensaje}` });
      }
    } catch (e: any) {
      setMsgBackup({ tipo: 'error', texto: `Error: ${e?.message || 'desconocido'}` });
    } finally { setExportando(false); }
  };

  const compartirBackup = async () => {
    setExportando(true); setMsgBackup(null);
    try {
      const json = JSON.stringify(await recolectarDatos(), null, 2);
      const nombre = `backup_todoentalla_${new Date().toISOString().split('T')[0]}.json`;
      const res = await compartirArchivo(json, nombre, 'application/json');
      if (res.ok) setMsgBackup({ tipo: 'ok', texto: `✅ ${res.mensaje}` });
      else if (res.mensaje.includes('cancelado')) setMsgBackup({ tipo: 'info', texto: 'Compartir cancelado' });
      else setMsgBackup({ tipo: 'error', texto: `Error: ${res.mensaje}` });
    } catch (e: any) {
      setMsgBackup({ tipo: 'error', texto: `Error: ${e?.message || 'desconocido'}` });
    } finally { setExportando(false); }
  };

  const importarBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportando(true); setMsgBackup(null);

    try {
      const text = await file.text();
      let datos: any;
      try { datos = JSON.parse(text); } catch {
        setMsgBackup({ tipo: 'error', texto: 'El archivo no es un backup válido.' });
        setImportando(false); if (e.target) e.target.value = ''; return;
      }

      const tieneDatos =
        Array.isArray(datos.categorias) ||
        Array.isArray(datos.productos) ||
        Array.isArray(datos.ventas) ||
        Array.isArray(datos.clientes) ||
        Array.isArray(datos.puntosDeVenta);

      if (!tieneDatos) {
        setMsgBackup({ tipo: 'error', texto: 'El archivo no contiene datos de TodoenTalla.' });
        setImportando(false); if (e.target) e.target.value = ''; return;
      }

      const ok = confirm(
        '🔄 MODO FUSIÓN\n\n' +
        'No se borrará nada. Solo se añadirán registros nuevos y se ajustará el stock según las ventas/compras del backup.\n\n' +
        '¿Continuar?'
      );
      if (!ok) { setImportando(false); if (e.target) e.target.value = ''; return; }

      const report = await mergeBackup(datos);

      const partesNuevas: string[] = [];
      Object.entries(report.nuevos).forEach(([k, v]) => partesNuevas.push(`+${v} ${k}`));
      const resumenNuevos = partesNuevas.length > 0 ? partesNuevas.join(', ') : 'nada nuevo';
      const resumenStock = report.stockAjustado > 0
        ? ` Stock ajustado en ${report.stockAjustado} producto${report.stockAjustado !== 1 ? 's' : ''}.`
        : '';
      const avisoSinMatch = report.stockSinMatch.length > 0
        ? ` ⚠️ Sin coincidencia local: ${report.stockSinMatch.slice(0, 5).join(', ')}${report.stockSinMatch.length > 5 ? '…' : ''}.`
        : '';
      const avisoPDV = report.pdvRemapeados > 0
        ? ` (${report.pdvRemapeados} PDV remapeados por nombre)`
        : '';

      await registrarLog('backup_importado', 'Backup fusionado', {
        usuarioId: usuarioActual.id, usuarioNombre: usuarioActual.nombre,
      });

      const huboErrores = report.errores.length > 0;
      setMsgBackup({
        tipo: huboErrores ? 'error' : 'ok',
        texto: huboErrores
          ? `⚠️ Fusionado con errores. ${resumenNuevos}.${resumenStock} ${report.errores.join(' | ')}`
          : `✅ Fusión completa${avisoPDV}. Nuevos: ${report.totalNuevos}. Ya existían: ${report.totalOmitidos}.${resumenStock}${avisoSinMatch}`,
      });

      if (report.totalNuevos > 0) {
        setTimeout(() => window.location.reload(), 3000);
      }
    } catch (err: any) {
      setMsgBackup({ tipo: 'error', texto: `Error al importar: ${err?.message}` });
    } finally {
      setImportando(false);
      if (e.target) e.target.value = '';
    }
  };

  const borrarDatosNegocio = async () => {
    try {
      await db.categorias.clear();
      await db.productos.clear();
      await db.ventas.clear();
      await db.clientes.clear();
      await db.tasasCambio.clear();
      await db.movimientosInventario.clear();
      await db.cierres.clear();
      await db.devoluciones.clear();
      await db.compras.clear();
      await db.gastos.clear();
      await registrarLog('datos_borrados', 'Datos de negocio borrados', {
        usuarioId: usuarioActual.id, usuarioNombre: usuarioActual.nombre,
      });
      alert('✅ Datos de negocio borrados. Recargando…');
      window.location.reload();
    } catch (e: any) {
      alert(`❌ Error: ${e?.message}`);
    }
  };

  const resetPrefs = async () => {
    if (!confirm('¿Restaurar todas las preferencias por defecto? Se perderán tus ajustes actuales.')) return;
    const def = await resetearPreferencias();
    setPrefs(def);
    aplicarPreferenciasVisuales(def);
    alert('✅ Preferencias restauradas');
  };

  const guardarManual = async () => {
    setGuardando(true);
    await guardarPreferencias(prefs);
    aplicarPreferenciasVisuales(prefs);
    setGuardado(true);
    setGuardando(false);
    setTimeout(() => setGuardado(false), 2000);
  };

  // ===== RENDER =====
  if (cargando) {
    return (
      <div className="animate-fade-in">
        <PageHeader title="Configuración" subtitle="Cargando…" />
        <Card className="mt-4">
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 animate-spin rounded-full border-2 border-blue-500/30 border-t-blue-500" />
          </div>
        </Card>
      </div>
    );
  }

  const tabItems = [
    { id: 'tema' as Seccion, label: 'Tema', icon: <Palette className="w-4 h-4" /> },
    { id: 'general' as Seccion, label: 'General', icon: <Settings className="w-4 h-4" /> },
    { id: 'confirmaciones' as Seccion, label: 'Confirmar', icon: <CheckCircle className="w-4 h-4" /> },
    { id: 'seguridad' as Seccion, label: 'Seguridad', icon: <ShieldCheck className="w-4 h-4" /> },
    { id: 'kiosco' as Seccion, label: 'Kiosco', icon: <Monitor className="w-4 h-4" /> },
    { id: 'permisos' as Seccion, label: 'Permisos', icon: <Eye className="w-4 h-4" /> },
    { id: 'menu' as Seccion, label: 'Menú', icon: <Menu className="w-4 h-4" /> },
    { id: 'backup' as Seccion, label: 'Backup', icon: <Database className="w-4 h-4" /> },
  ];

  // Items del menú para la sección "Menu oculto"
  const todosLosItems = navSections.flatMap((sec) => sec.items);

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Configuración"
        subtitle="Personaliza la app según tus preferencias"
        icon={<Settings className="w-5 h-5" />}
        actions={
          <div className="flex items-center gap-2">
            {guardando && <span className="text-xs text-blue-400">Guardando…</span>}
            <Button
              size="sm"
              variant={guardado ? 'secondary' : 'primary'}
              leftIcon={guardado ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              onClick={guardarManual}
            >
              {guardado ? 'Guardado' : 'Guardar'}
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mt-4">
        {/* Sidebar tabs */}
        <div className="lg:col-span-1">
          <div className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible">
            {tabItems.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSeccion(tab.id)}
                className={cn(
                  'flex items-center gap-2.5 h-9 px-3 rounded-lg text-sm font-medium transition-colors duration-150 whitespace-nowrap shrink-0',
                  seccion === tab.id
                    ? 'bg-white/5 text-white'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'
                )}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Contenido */}
        <div className="lg:col-span-3 space-y-4">
          {/* ===== TEMA ===== */}
          {seccion === 'tema' && (
            <Card>
              <h3 className="text-sm font-semibold text-white mb-1">Tema visual</h3>
              <p className="text-xs text-slate-500 mb-4">Personaliza la apariencia de la interfaz</p>
              <div className="space-y-1">
                <ConfigRow icon={<Type className="w-4 h-4" />} label="Tamaño de fuente" description="Ajusta el tamaño del texto en toda la app">
                  <div className="flex items-center gap-1 bg-slate-900 border border-white/10 rounded-lg p-0.5">
                    {TAMANOS_FUENTE.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => actualizarPref('tamanoFuente', t.id)}
                        className={cn(
                          'h-7 px-2.5 text-xs font-medium rounded-md transition-colors duration-150',
                          prefs.tamanoFuente === t.id ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-100'
                        )}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </ConfigRow>
                <ConfigRow icon={<Zap className="w-4 h-4" />} label="Modo compacto" description="Reduce el espaciado entre elementos">
                  <Toggle value={prefs.modoCompacto} onChange={() => togglePref('modoCompacto')} />
                </ConfigRow>
                <ConfigRow icon={<Palette className="w-4 h-4" />} label="Animaciones" description="Transiciones y efectos visuales">
                  <Toggle value={prefs.animacionesActivas} onChange={() => togglePref('animacionesActivas')} />
                </ConfigRow>
                <ConfigRow icon={<Bot className="w-4 h-4" />} label="Mostrar Clara IA" description="Botón flotante del asistente inteligente">
                  <Toggle value={prefs.mostrarIA} onChange={() => togglePref('mostrarIA')} />
                </ConfigRow>
              </div>
            </Card>
          )}

          {/* ===== GENERAL ===== */}
          {seccion === 'general' && (
            <Card>
              <h3 className="text-sm font-semibold text-white mb-1">General</h3>
              <p className="text-xs text-slate-500 mb-4">Moneda y formatos regionales</p>
              <div className="space-y-1">
                <ConfigRow icon={<DollarSign className="w-4 h-4" />} label="Símbolo de moneda" description="Aparecerá en todos los precios">
                  <Input
                    value={prefs.monedaSimbolo}
                    onChange={(e) => actualizarPref('monedaSimbolo', e.target.value)}
                    maxLength={4}
                    className="w-24 text-center"
                  />
                </ConfigRow>
                <ConfigRow icon={<Clock className="w-4 h-4" />} label="Formato de fecha" description="Cómo se muestran las fechas">
                  <Select
                    value={prefs.formatoFecha}
                    onChange={(e) => actualizarPref('formatoFecha', e.target.value as FormatoFecha)}
                    className="w-40"
                  >
                    {FORMATOS_FECHA.map((f) => (
                      <option key={f.id} value={f.id}>{f.label}</option>
                    ))}
                  </Select>
                </ConfigRow>
                <ConfigRow icon={<Clock className="w-4 h-4" />} label="Formato de hora" description="Reloj de 12 o 24 horas">
                  <Select
                    value={prefs.formatoHora}
                    onChange={(e) => actualizarPref('formatoHora', e.target.value as FormatoHora)}
                    className="w-40"
                  >
                    {FORMATOS_HORA.map((f) => (
                      <option key={f.id} value={f.id}>{f.label}</option>
                    ))}
                  </Select>
                </ConfigRow>
                <ConfigRow icon={<Bell className="w-4 h-4" />} label="Avisar de stock bajo" description="Notificar al abrir si hay productos bajo mínimo">
                  <Toggle value={prefs.notificarStockBajo} onChange={() => togglePref('notificarStockBajo')} />
                </ConfigRow>
                <ConfigRow icon={<Database className="w-4 h-4" />} label="Recordar backup semanal" description="Avisar cada 7 días para hacer copia de seguridad">
                  <Toggle value={prefs.backupRecordatorioSemanal} onChange={() => togglePref('backupRecordatorioSemanal')} />
                </ConfigRow>
              </div>
            </Card>
          )}

          {/* ===== CONFIRMACIONES ===== */}
          {seccion === 'confirmaciones' && (
            <Card>
              <h3 className="text-sm font-semibold text-white mb-1">Confirmaciones</h3>
              <p className="text-xs text-slate-500 mb-4">Controla cuándo la app pide confirmación</p>
              <div className="space-y-1">
                <ConfigRow icon={<Trash2 className="w-4 h-4" />} label="Confirmar al eliminar" description="Pedir confirmación antes de borrar registros">
                  <Toggle value={prefs.confirmarEliminar} onChange={() => togglePref('confirmarEliminar')} />
                </ConfigRow>
                <ConfigRow icon={<Lock className="w-4 h-4" />} label="Confirmar cierre de sesión" description="Pedir confirmación al salir">
                  <Toggle value={prefs.confirmarCerrarSesion} onChange={() => togglePref('confirmarCerrarSesion')} />
                </ConfigRow>
                <ConfigRow icon={<Bell className="w-4 h-4" />} label="Banner de bienvenida" description="Mostrar el mensaje inicial al abrir la app">
                  <Toggle value={prefs.mostrarBannerBienvenida} onChange={() => togglePref('mostrarBannerBienvenida')} />
                </ConfigRow>
                <ConfigRow icon={<Eye className="w-4 h-4" />} label="Guía al entrar" description="Mostrar la guía de uso la primera vez">
                  <Toggle value={prefs.mostrarGuiaAlEntrar} onChange={() => togglePref('mostrarGuiaAlEntrar')} />
                </ConfigRow>
              </div>
            </Card>
          )}

          {/* ===== SEGURIDAD ===== */}
          {seccion === 'seguridad' && (
            <Card>
              <h3 className="text-sm font-semibold text-white mb-1">Seguridad</h3>
              <p className="text-xs text-slate-500 mb-4">Protege el acceso a la app</p>
              <div className="space-y-1">
                <ConfigRow icon={<Lock className="w-4 h-4" />} label="Longitud del PIN" description="Dígitos requeridos para nuevos usuarios">
                  <Select
                    value={String(prefs.pinLongitud)}
                    onChange={(e) => actualizarPref('pinLongitud', Number(e.target.value) as PinLongitud)}
                    className="w-32"
                  >
                    {PIN_LONGITUDES.map((p) => (
                      <option key={p.id} value={p.id}>{p.label}</option>
                    ))}
                  </Select>
                </ConfigRow>
                <ConfigRow icon={<Clock className="w-4 h-4" />} label="Auto-logout por inactividad" description="Cerrar sesión automáticamente">
                  <Select
                    value={String(prefs.autoLogoutMinutos)}
                    onChange={(e) => actualizarPref('autoLogoutMinutos', Number(e.target.value) as 0 | 5 | 15 | 30)}
                    className="w-32"
                  >
                    {AUTO_LOGOUT.map((a) => (
                      <option key={a.id} value={a.id}>{a.label}</option>
                    ))}
                  </Select>
                </ConfigRow>
                {esAdminOJefe && (
                  <>
                    <div className="pt-3 mt-2 border-t border-white/10">
                      <p className="text-xs font-medium text-slate-300 mb-1">PIN maestro de recuperación</p>
                      <p className="text-xs text-slate-500 mb-2">
                        Desbloquea cualquier cuenta. Misma longitud que el PIN normal ({prefs.pinLongitud} dígitos). Vacío para desactivar.
                      </p>
                      <div className="flex gap-2">
                        <Input
                          type="text"
                          inputMode="numeric"
                          maxLength={prefs.pinLongitud}
                          value={pinMaestroInput}
                          onChange={(e) => setPinMaestroInput(e.target.value.replace(/\D/g, '').slice(0, prefs.pinLongitud))}
                          placeholder={'•'.repeat(prefs.pinLongitud)}
                          className="flex-1 text-center font-mono tracking-widest"
                        />
                        <Button onClick={guardarPinMaestro} size="sm">
                          Guardar
                        </Button>
                      </div>
                      {pinMaestroInput && pinMaestroInput.length !== prefs.pinLongitud && (
                        <p className="text-xs text-amber-400 mt-1.5">
                          ⚠️ Debe tener exactamente {prefs.pinLongitud} dígitos (o estar vacío)
                        </p>
                      )}
                    </div>
                  </>
                )}
              </div>
            </Card>
          )}

          {/* ===== KIOSCO ===== */}
          {seccion === 'kiosco' && (
            <Card>
              <h3 className="text-sm font-semibold text-white mb-1">Modo Kiosco</h3>
              <p className="text-xs text-slate-500 mb-4">Pantalla cuando nadie ha iniciado sesión</p>
              <div className="space-y-1">
                <ConfigRow icon={<Monitor className="w-4 h-4" />} label="Activar modo kiosco" description="Ideal para tablets en mostrador">
                  <Toggle value={prefs.kiosco.activo} onChange={() => actualizarKiosco('activo', !prefs.kiosco.activo)} />
                </ConfigRow>

                {prefs.kiosco.activo && (
                  <>
                    <div className="pt-3 mt-2 border-t border-white/10 space-y-3">
                      <div>
                        <label className="text-xs font-medium text-slate-400 mb-1.5 block">Título</label>
                        <Input
                          value={prefs.kiosco.titulo}
                          onChange={(e) => actualizarKiosco('titulo', e.target.value)}
                          placeholder="TodoenTalla"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-400 mb-1.5 block">Subtítulo</label>
                        <Input
                          value={prefs.kiosco.subtitulo}
                          onChange={(e) => actualizarKiosco('subtitulo', e.target.value)}
                          placeholder="Bienvenido"
                        />
                      </div>

                      {/* Logo */}
                      <div>
                        <label className="text-xs font-medium text-slate-400 mb-1.5 block">Logo del kiosco</label>
                        {prefs.kiosco.logoUrl ? (
                          <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-slate-800/40 p-3">
                            <img
                              src={prefs.kiosco.logoUrl}
                              alt="Logo"
                              className="h-14 w-14 shrink-0 rounded-lg bg-slate-900 object-contain ring-2 ring-white/10"
                              onError={(e) => { (e.currentTarget as HTMLImageElement).src = ''; }}
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-medium text-slate-200">Logo configurado</p>
                              <p className="text-xs text-slate-500">
                                {prefs.kiosco.logoUrl.startsWith('data:') ? '📁 Imagen subida' : '🔗 URL externa'}
                              </p>
                            </div>
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => actualizarKiosco('logoUrl', undefined)}
                            >
                              Quitar
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <label className={cn(
                              'flex cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-white/10 bg-slate-900/50 p-4 text-center transition-colors hover:border-blue-500/40',
                              subiendoLogo && 'pointer-events-none opacity-60'
                            )}>
                              <input
                                type="file"
                                accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                                onChange={manejarSubirLogo}
                                className="hidden"
                              />
                              <div>
                                <ImageIcon className="w-6 h-6 text-slate-500 mx-auto mb-2" />
                                <p className="text-sm font-medium text-slate-200">
                                  {subiendoLogo ? 'Procesando…' : 'Subir imagen'}
                                </p>
                                <p className="text-xs text-slate-500 mt-0.5">PNG, JPG, WEBP o SVG · máx 5 MB</p>
                              </div>
                            </label>
                            <div className="flex items-center gap-2">
                              <div className="h-px flex-1 bg-white/10" />
                              <span className="text-xs text-slate-500">o</span>
                              <div className="h-px flex-1 bg-white/10" />
                            </div>
                            <div className="flex gap-2">
                              <Input
                                placeholder="https://…"
                                value={urlLogoInput}
                                onChange={(e) => setUrlLogoInput(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') aplicarUrlLogo(); }}
                                className="flex-1"
                              />
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={aplicarUrlLogo}
                                disabled={!urlLogoInput.trim()}
                              >
                                Aplicar
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Color tema */}
                      <div>
                        <label className="text-xs font-medium text-slate-400 mb-1.5 block">Color de tema</label>
                        <div className="flex items-center gap-2">
                          {COLORES_KIOSCO.map((c) => (
                            <button
                              key={c.id}
                              onClick={() => actualizarKiosco('colorTema', c.id as any)}
                              title={c.label}
                              className={cn(
                                'h-10 flex-1 rounded-lg transition-all',
                                prefs.kiosco.colorTema === c.id
                                  ? 'ring-2 ring-white scale-105 shadow-lg'
                                  : 'opacity-60 hover:opacity-100'
                              )}
                              style={{ background: c.hex }}
                            />
                          ))}
                        </div>
                      </div>

                      <ConfigRow icon={<Clock className="w-4 h-4" />} label="Mostrar reloj" description="Hora en vivo">
                        <Toggle value={prefs.kiosco.mostrarReloj} onChange={() => actualizarKiosco('mostrarReloj', !prefs.kiosco.mostrarReloj)} />
                      </ConfigRow>
                      <ConfigRow icon={<Store className="w-4 h-4" />} label="Productos destacados" description="Los 6 más caros con stock">
                        <Toggle value={prefs.kiosco.mostrarProductos} onChange={() => actualizarKiosco('mostrarProductos', !prefs.kiosco.mostrarProductos)} />
                      </ConfigRow>
                    </div>
                  </>
                )}
              </div>
            </Card>
          )}

          {/* ===== PERMISOS DEL VENDEDOR ===== */}
          {seccion === 'permisos' && esAdminOJefe && (
            <Card>
              <h3 className="text-sm font-semibold text-white mb-1">Permisos del vendedor</h3>
              <p className="text-xs text-slate-500 mb-4">
                Elige qué secciones puede ver un vendedor. Siempre tiene acceso a Nueva Venta y Ayuda.
              </p>
              <div className="space-y-1">
                {VISTAS_OPCIONALES_VENDEDOR.map((v) => {
                  const activo = prefs.vistasPermitidasVendedor.includes(v.id);
                  return (
                    <div
                      key={v.id}
                      className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-slate-800/30 border border-white/5"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-lg shrink-0">{v.icon}</span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-100 truncate">{v.label}</p>
                          <p className="text-xs text-slate-500 truncate">{v.desc}</p>
                        </div>
                      </div>
                      <Toggle
                        value={activo}
                        onChange={() => {
                          const nuevas = activo
                            ? prefs.vistasPermitidasVendedor.filter((x) => x !== v.id)
                            : [...prefs.vistasPermitidasVendedor, v.id];
                          actualizarPref('vistasPermitidasVendedor', nuevas);
                        }}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 rounded-lg bg-slate-800/30 border border-white/5 p-2.5">
                <p className="text-xs text-slate-400">
                  <strong className="text-slate-200">Actual:</strong>{' '}
                  {prefs.vistasPermitidasVendedor.length === 0
                    ? 'Solo Nueva Venta y Ayuda'
                    : `${prefs.vistasPermitidasVendedor.length} sección${prefs.vistasPermitidasVendedor.length !== 1 ? 'es' : ''} extra`}
                </p>
              </div>
            </Card>
          )}

          {/* ===== MENÚ OCULTO ===== */}
          {seccion === 'menu' && esAdminOJefe && (
            <Card>
              <h3 className="text-sm font-semibold text-white mb-1">Opciones del menú lateral</h3>
              <p className="text-xs text-slate-500 mb-4">
                Oculta items del sidebar que no uses. Los vendedores tienen sus propios permisos.
              </p>
              <div className="space-y-1">
                {todosLosItems
                  .filter((item) => item.id !== 'nueva-venta')
                  .map((item) => {
                    const oculto = prefs.menuItemsOcultos.includes(item.id);
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-slate-800/30 border border-white/5"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Icon className="w-4 h-4 text-slate-400 shrink-0" />
                          <div className="min-w-0">
                            <p className={cn('text-sm font-medium truncate', oculto ? 'text-slate-500 line-through' : 'text-slate-100')}>
                              {item.label}
                            </p>
                          </div>
                        </div>
                        <Toggle
                          value={!oculto}
                          onChange={() => {
                            const nuevos = oculto
                              ? prefs.menuItemsOcultos.filter((x) => x !== item.id)
                              : [...prefs.menuItemsOcultos, item.id];
                            actualizarPref('menuItemsOcultos', nuevos);
                          }}
                        />
                      </div>
                    );
                  })}
              </div>
              {prefs.menuItemsOcultos.length > 0 && (
                <div className="mt-3 flex items-center justify-between rounded-lg bg-slate-800/30 border border-white/5 p-2.5">
                  <p className="text-xs text-slate-400">
                    <strong className="text-slate-200">{prefs.menuItemsOcultos.length}</strong> oculto{prefs.menuItemsOcultos.length !== 1 ? 's' : ''}
                  </p>
                  <Button
                    variant="secondary"
                    size="sm"
                    leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                    onClick={() => actualizarPref('menuItemsOcultos', [])}
                  >
                    Mostrar todos
                  </Button>
                </div>
              )}
              <div className="mt-3 rounded-lg bg-amber-500/10 border border-amber-500/20 p-2.5">
                <p className="text-xs text-amber-300">
                  ⚠️ <strong>Nueva Venta</strong> no se puede ocultar: es el núcleo de la app.
                </p>
              </div>
            </Card>
          )}

          {/* ===== BACKUP ===== */}
          {seccion === 'backup' && (
            <div className="space-y-4">
              <Card>
                <h3 className="text-sm font-semibold text-white mb-1">Backup y datos</h3>
                <p className="text-xs text-slate-500 mb-4">
                  Exporta, importa o borra los datos del negocio
                </p>

                {msgBackup && (
                  <div className={cn(
                    'mb-3 rounded-lg px-3 py-2.5 text-xs font-medium border',
                    msgBackup.tipo === 'ok'
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                      : msgBackup.tipo === 'info'
                        ? 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                        : 'bg-red-500/10 border-red-500/20 text-red-400'
                  )}>
                    {msgBackup.texto}
                  </div>
                )}

                <div className="space-y-2">
                  <BackupAction
                    icon={<Download className="w-5 h-5" />}
                    title="Exportar backup"
                    description="Descarga un archivo JSON con todos los datos"
                    buttonLabel={exportando ? 'Exportando…' : 'Exportar'}
                    onClick={exportarBackup}
                    disabled={exportando}
                  />
                  <BackupAction
                    icon={<Share2 className="w-5 h-5" />}
                    title="Compartir backup"
                    description="Comparte el respaldo por WhatsApp o email"
                    buttonLabel={exportando ? 'Compartiendo…' : 'Compartir'}
                    onClick={compartirBackup}
                    disabled={exportando}
                  />
                  <div className="flex items-center justify-between py-3 px-3 rounded-lg bg-slate-800/30 border border-white/5">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-slate-800 border border-white/10 flex items-center justify-center shrink-0 text-slate-400">
                        <Upload className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-100">Importar backup</p>
                        <p className="text-xs text-slate-500 truncate">Carga un JSON y fusiona los datos</p>
                      </div>
                    </div>
                    <label className={cn(
                      'inline-flex items-center justify-center h-8 px-3 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 border border-white/10 text-slate-100 transition-colors cursor-pointer',
                      importando && 'opacity-40 pointer-events-none'
                    )}>
                      {importando ? 'Importando…' : 'Importar'}
                      <input
                        type="file"
                        accept=".json,application/json"
                        onChange={importarBackup}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              </Card>

              <Card className="border-red-500/20">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-5 h-5 text-red-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-white">Borrar datos de negocio</h3>
                    <p className="text-xs text-slate-400 mt-1 mb-3">
                      Elimina permanentemente ventas, productos, clientes, gastos y cierres. No toca usuarios ni licencia.
                    </p>
                    <Button
                      variant="danger"
                      size="sm"
                      leftIcon={<Trash2 className="w-4 h-4" />}
                      onClick={() => setModalBorrar(true)}
                    >
                      Borrar todo
                    </Button>
                  </div>
                </div>
              </Card>

              <Card>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                    <RefreshCw className="w-5 h-5 text-amber-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-white">Restaurar preferencias</h3>
                    <p className="text-xs text-slate-400 mt-1 mb-3">
                      Vuelve todas las preferencias a sus valores por defecto.
                    </p>
                    <Button variant="secondary" size="sm" onClick={resetPrefs}>
                      Restaurar por defecto
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Modal borrar datos */}
      <Modal
        open={modalBorrar}
        onClose={() => setModalBorrar(false)}
        title="Borrar todos los datos"
        description="Esta acción es irreversible"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalBorrar(false)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={() => { setModalBorrar(false); borrarDatosNegocio(); }}
              leftIcon={<Trash2 className="w-4 h-4" />}
            >
              Borrar todo
            </Button>
          </>
        }
      >
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <p className="text-sm text-slate-400">
            Se eliminarán todas las ventas, productos, clientes, proveedores, gastos y cierres.
            <strong className="text-slate-200"> Los usuarios y la licencia se conservan.</strong> Considera exportar un backup antes de continuar.
          </p>
        </div>
      </Modal>
    </div>
  );
}

// ===== Sub-componentes =====

function ConfigRow({
  icon,
  label,
  description,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-white/5 last:border-0 gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-lg bg-slate-800 border border-white/10 flex items-center justify-center shrink-0 text-slate-400">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-100">{label}</p>
          {description && <p className="text-xs text-slate-500 truncate">{description}</p>}
        </div>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={cn(
        'relative w-10 h-6 rounded-full transition-colors duration-150',
        value ? 'bg-blue-600' : 'bg-slate-700'
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all duration-150',
          value ? 'left-[18px]' : 'left-0.5'
        )}
      />
    </button>
  );
}

function BackupAction({
  icon,
  title,
  description,
  buttonLabel,
  onClick,
  disabled,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  buttonLabel: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-3 px-3 rounded-lg bg-slate-800/30 border border-white/5">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-lg bg-slate-800 border border-white/10 flex items-center justify-center shrink-0 text-slate-400">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-100">{title}</p>
          <p className="text-xs text-slate-500 truncate">{description}</p>
        </div>
      </div>
      <Button variant="secondary" size="sm" onClick={onClick} disabled={disabled} className="shrink-0">
        {buttonLabel}
      </Button>
    </div>
  );
}