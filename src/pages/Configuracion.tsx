import { useState } from 'react';
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
  ChevronRight,
  Save,
  AlertTriangle,
  Bell,
  Type,
  Zap,
  Lock,
  Clock,
  Store,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { Card, Button, Badge, Input, Select, Modal, Tabs } from '@/components/ui';
import { PageHeader } from '@/layout/PageHeader';

type Seccion = 'tema' | 'general' | 'confirmaciones' | 'seguridad' | 'kiosco' | 'permisos' | 'menu' | 'backup';

export function Configuracion() {
  const [seccion, setSeccion] = useState<Seccion>('tema');
  const [config, setConfig] = useState({
    fuente: 'inter',
    compacto: false,
    animaciones: true,
    moneda: 'CUP',
    formatoFecha: 'dd/mm/yyyy',
    formatoHora: '24h',
    confirmarEliminar: true,
    confirmarCerrarSesion: true,
    longitudPin: '4',
    autoLogout: '30',
    pinMaestro: '',
    kioscoTitulo: 'TodoenTalla',
    kioscoSubtitulo: 'Bienvenido',
    kioscoColor: 'blue',
    kioscoReloj: true,
    kioscoProductosDestacados: true,
  });
  const [permisosVendedor, setPermisosVendedor] = useState<Record<string, boolean>>({
    dashboard: true,
    historial: true,
    cierre: true,
    categorias: false,
    clientes: true,
    gastos: false,
    reportes: false,
    cotizaciones: true,
  });
  const [menuOculto, setMenuOculto] = useState<Record<string, boolean>>({
    comisiones: false,
    transferencias: false,
    etiquetas: false,
    conteo: false,
  });
  const [modalBorrar, setModalBorrar] = useState(false);
  const [guardado, setGuardado] = useState(false);

  const set = (key: keyof typeof config, value: string | boolean) =>
    setConfig((prev) => ({ ...prev, [key]: value }));

  const guardar = () => {
    setGuardado(true);
    setTimeout(() => setGuardado(false), 2500);
  };

  const tabItems = [
    { id: 'tema' as Seccion, label: 'Tema', icon: <Palette className="w-4 h-4" /> },
    { id: 'general' as Seccion, label: 'General', icon: <Settings className="w-4 h-4" /> },
    { id: 'confirmaciones' as Seccion, label: 'Confirmaciones', icon: <CheckCircle className="w-4 h-4" /> },
    { id: 'seguridad' as Seccion, label: 'Seguridad', icon: <ShieldCheck className="w-4 h-4" /> },
    { id: 'kiosco' as Seccion, label: 'Kiosco', icon: <Monitor className="w-4 h-4" /> },
    { id: 'permisos' as Seccion, label: 'Permisos', icon: <Eye className="w-4 h-4" /> },
    { id: 'menu' as Seccion, label: 'Menú', icon: <Menu className="w-4 h-4" /> },
    { id: 'backup' as Seccion, label: 'Backup', icon: <Database className="w-4 h-4" /> },
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Configuración"
        subtitle="Personaliza la app según tus preferencias"
        icon={<Settings className="w-5 h-5" />}
        actions={
          <Button
            size="sm"
            leftIcon={guardado ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            variant={guardado ? 'secondary' : 'primary'}
            onClick={guardar}
          >
            {guardado ? 'Guardado' : 'Guardar'}
          </Button>
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

        {/* Content */}
        <div className="lg:col-span-3">
          {seccion === 'tema' && (
            <ConfigSection title="Tema visual" description="Personaliza la apariencia de la interfaz">
              <ConfigRow icon={<Type className="w-4 h-4" />} label="Fuente" description="Familia tipográfica de la app">
                <Select value={config.fuente} onChange={(e) => set('fuente', e.target.value)} className="w-40">
                  <option value="inter">Inter (recomendada)</option>
                  <option value="system">System UI</option>
                </Select>
              </ConfigRow>
              <ConfigRow icon={<Zap className="w-4 h-4" />} label="Modo compacto" description="Reduce el espaciado entre elementos">
                <Toggle value={config.compacto} onChange={(v) => set('compacto', v)} />
              </ConfigRow>
              <ConfigRow icon={<Palette className="w-4 h-4" />} label="Animaciones" description="Transiciones y efectos visuales">
                <Toggle value={config.animaciones} onChange={(v) => set('animaciones', v)} />
              </ConfigRow>
            </ConfigSection>
          )}

          {seccion === 'general' && (
            <ConfigSection title="General" description="Moneda y formatos regionales">
              <ConfigRow icon={<DollarSign className="w-4 h-4" />} label="Moneda" description="Moneda principal del negocio">
                <Select value={config.moneda} onChange={(e) => set('moneda', e.target.value)} className="w-40">
                  <option value="CUP">CUP (Peso cubano)</option>
                  <option value="USD">USD (Dólar)</option>
                  <option value="EUR">EUR (Euro)</option>
                </Select>
              </ConfigRow>
              <ConfigRow icon={<Clock className="w-4 h-4" />} label="Formato de fecha" description="Cómo se muestran las fechas">
                <Select value={config.formatoFecha} onChange={(e) => set('formatoFecha', e.target.value)} className="w-40">
                  <option value="dd/mm/yyyy">DD/MM/YYYY</option>
                  <option value="mm/dd/yyyy">MM/DD/YYYY</option>
                  <option value="yyyy-mm-dd">YYYY-MM-DD</option>
                </Select>
              </ConfigRow>
              <ConfigRow icon={<Clock className="w-4 h-4" />} label="Formato de hora" description="Reloj de 12 o 24 horas">
                <Select value={config.formatoHora} onChange={(e) => set('formatoHora', e.target.value)} className="w-40">
                  <option value="24h">24 horas</option>
                  <option value="12h">12 horas (AM/PM)</option>
                </Select>
              </ConfigRow>
            </ConfigSection>
          )}

          {seccion === 'confirmaciones' && (
            <ConfigSection title="Confirmaciones" description="Controla cuándo la app pide confirmación">
              <ConfigRow icon={<Trash2 className="w-4 h-4" />} label="Confirmar al eliminar" description="Pedir confirmación antes de borrar registros">
                <Toggle value={config.confirmarEliminar} onChange={(v) => set('confirmarEliminar', v)} />
              </ConfigRow>
              <ConfigRow icon={<Lock className="w-4 h-4" />} label="Confirmar cierre de sesión" description="Pedir confirmación al salir">
                <Toggle value={config.confirmarCerrarSesion} onChange={(v) => set('confirmarCerrarSesion', v)} />
              </ConfigRow>
            </ConfigSection>
          )}

          {seccion === 'seguridad' && (
            <ConfigSection title="Seguridad" description="Protege el acceso a la app">
              <ConfigRow icon={<Lock className="w-4 h-4" />} label="Longitud mínima del PIN" description="Dígitos requeridos para el PIN">
                <Select value={config.longitudPin} onChange={(e) => set('longitudPin', e.target.value)} className="w-32">
                  <option value="4">4 dígitos</option>
                  <option value="6">6 dígitos</option>
                  <option value="8">8 dígitos</option>
                </Select>
              </ConfigRow>
              <ConfigRow icon={<Clock className="w-4 h-4" />} label="Auto-logout (minutos)" description="Cerrar sesión por inactividad">
                <Input
                  type="number"
                  value={config.autoLogout}
                  onChange={(e) => set('autoLogout', e.target.value)}
                  className="w-24 tabular-nums"
                />
              </ConfigRow>
              <ConfigRow icon={<ShieldCheck className="w-4 h-4" />} label="PIN maestro" description="PIN de emergencia para desbloquear">
                <Input
                  type="password"
                  value={config.pinMaestro}
                  onChange={(e) => set('pinMaestro', e.target.value)}
                  placeholder="••••"
                  className="w-32 tabular-nums"
                />
              </ConfigRow>
            </ConfigSection>
          )}

          {seccion === 'kiosco' && (
            <ConfigSection title="Modo Kiosco" description="Pantalla completa para tablet en mostrador">
              <ConfigRow icon={<Store className="w-4 h-4" />} label="Título" description="Texto principal en pantalla kiosco">
                <Input
                  value={config.kioscoTitulo}
                  onChange={(e) => set('kioscoTitulo', e.target.value)}
                  className="w-48"
                />
              </ConfigRow>
              <ConfigRow icon={<Store className="w-4 h-4" />} label="Subtítulo" description="Texto secundario">
                <Input
                  value={config.kioscoSubtitulo}
                  onChange={(e) => set('kioscoSubtitulo', e.target.value)}
                  className="w-48"
                />
              </ConfigRow>
              <ConfigRow icon={<Palette className="w-4 h-4" />} label="Color principal" description="Color de acento del kiosco">
                <Select value={config.kioscoColor} onChange={(e) => set('kioscoColor', e.target.value)} className="w-32">
                  <option value="blue">Azul</option>
                  <option value="emerald">Verde</option>
                  <option value="amber">Ámbar</option>
                  <option value="slate">Gris</option>
                </Select>
              </ConfigRow>
              <ConfigRow icon={<Clock className="w-4 h-4" />} label="Reloj en vivo" description="Mostrar hora actual en el kiosco">
                <Toggle value={config.kioscoReloj} onChange={(v) => set('kioscoReloj', v)} />
              </ConfigRow>
              <ConfigRow icon={<Store className="w-4 h-4" />} label="Productos destacados" description="Mostrar los 6 productos más caros con stock">
                <Toggle value={config.kioscoProductosDestacados} onChange={(v) => set('kioscoProductosDestacados', v)} />
              </ConfigRow>
            </ConfigSection>
          )}

          {seccion === 'permisos' && (
            <ConfigSection title="Permisos del vendedor" description="Controla qué secciones puede ver el rol vendedor">
              <p className="text-xs text-slate-500 mb-4">
                Activa o desactiva las vistas disponibles para los usuarios con rol de vendedor
              </p>
              <div className="space-y-1">
                {Object.entries(permisosVendedor).map(([key, value]) => (
                  <div
                    key={key}
                    className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-slate-800/30 border border-white/5"
                  >
                    <span className="text-sm text-slate-200 capitalize">{key}</span>
                    <Toggle value={value} onChange={(v) => setPermisosVendedor((prev) => ({ ...prev, [key]: v }))} />
                  </div>
                ))}
              </div>
            </ConfigSection>
          )}

          {seccion === 'menu' && (
            <ConfigSection title="Opciones del menú lateral" description="Oculta items que no necesitas en el sidebar">
              <p className="text-xs text-slate-500 mb-4">
                Los items ocultos no aparecerán en la navegación pero seguirán funcionando
              </p>
              <div className="space-y-1">
                {Object.entries(menuOculto).map(([key, oculto]) => (
                  <div
                    key={key}
                    className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-slate-800/30 border border-white/5"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-200 capitalize">{key}</span>
                      {oculto && <Badge variant="warning">Oculto</Badge>}
                    </div>
                    <Toggle
                      value={!oculto}
                      onChange={(v) => setMenuOculto((prev) => ({ ...prev, [key]: !v }))}
                    />
                  </div>
                ))}
              </div>
            </ConfigSection>
          )}

          {seccion === 'backup' && (
            <div className="space-y-4">
              <ConfigSection title="Backup y datos" description="Exporta, importa o borra los datos del negocio">
                <div className="space-y-3">
                  <BackupAction
                    icon={<Download className="w-5 h-5" />}
                    title="Exportar backup"
                    description="Descarga un archivo JSON con todos los datos"
                    buttonLabel="Exportar"
                    onClick={() => {}}
                  />
                  <BackupAction
                    icon={<Share2 className="w-5 h-5" />}
                    title="Compartir backup"
                    description="Comparte el archivo de respaldo por WhatsApp o email"
                    buttonLabel="Compartir"
                    onClick={() => {}}
                  />
                  <BackupAction
                    icon={<Upload className="w-5 h-5" />}
                    title="Importar backup"
                    description="Carga un archivo JSON y fusiona los datos (merge inteligente)"
                    buttonLabel="Importar"
                    onClick={() => {}}
                  />
                </div>
              </ConfigSection>

              <Card className="border-red-500/20">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-5 h-5 text-red-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-white">Borrar datos de negocio</h3>
                    <p className="text-xs text-slate-400 mt-1 mb-3">
                      Elimina permanentemente todas las ventas, productos, clientes y configuraciones.
                      Esta acción no se puede deshacer.
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
            <Button variant="danger" onClick={() => setModalBorrar(false)} leftIcon={<Trash2 className="w-4 h-4" />}>
              Borrar todo
            </Button>
          </>
        }
      >
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <p className="text-sm text-slate-400">
            Se eliminarán todas las ventas, productos, clientes, proveedores, gastos, cierres y
            configuraciones. Considera exportar un backup antes de continuar.
          </p>
        </div>
      </Modal>
    </div>
  );
}

// ===== Sub-componentes =====

function ConfigSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      {description && <p className="text-xs text-slate-500 mt-0.5 mb-4">{description}</p>}
      <div className={cn(!description && 'mt-4', 'space-y-1')}>
        {children}
      </div>
    </Card>
  );
}

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

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
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
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  buttonLabel: string;
  onClick: () => void;
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
      <Button variant="secondary" size="sm" onClick={onClick} className="shrink-0">
        {buttonLabel}
      </Button>
    </div>
  );
}
