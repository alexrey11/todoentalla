import { useState, useEffect, useRef } from 'react';

import type { Usuario } from './db';
import { ThemeProvider } from './ThemeContext';
import { PuntoDeVentaProvider } from './contexts/PuntoDeVentaContext';
import { AppShell } from './layout/AppShell';
import { Sidebar } from './layout/Sidebar';
import { PageHeader } from './layout/PageHeader';

// Pantallas
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { NuevaVenta } from './pages/NuevaVenta';
import { CierreCaja } from './pages/CierreCaja';
import { PuntosDeVenta } from './pages/PuntosDeVenta';
import { Configuracion } from './pages/Configuracion';
import { Categorias } from './pages/Categorias';
import { Gastos } from './pages/Gastos';
import { TasasCambio } from './pages/TasasCambio';
import { Reportes } from './pages/Reportes';
import WelcomeScreen from './pages/WelcomeScreen';
import ActivarLicencia from './pages/ActivarLicencia';
import Kiosco from './pages/Kiosco';
import ClaraIA from './pages/ClaraIA';

// Componentes y utilidades
import { Card, Button, EmptyState } from './components/ui';
import ToastContainer from './components/ToastContainer';
import IndicadorAhorro from './components/IndicadorAhorro';
import { useBateria } from './hooks/useBateria';
import { modoAhorro } from './utils/modoAhorro';
import { Construction } from 'lucide-react';

import {
  esPrimeraInstalacion,
  obtenerFechaInstalacion,
  obtenerInfoLicencia,
} from './utils/trialUtils';
import {
  cargarPreferencias,
  aplicarPreferenciasVisuales,
  vendedorPuedeVer,
  type Preferencias,
  PREFERENCIAS_DEFAULT,
} from './utils/preferencias';

type EstadoApp = 'cargando' | 'bienvenida' | 'activar' | 'login' | 'bloqueado' | 'app';

function App() {
  const [estado, setEstado] = useState<EstadoApp>('cargando');
  const [usuarioActual, setUsuarioActual] = useState<Usuario | null>(null);
  const [activePage, setActivePage] = useState('dashboard');
  const [sidebarAbierto, setSidebarAbierto] = useState(false);

  const [esMaster, setEsMaster] = useState(false);
  const [licenciaActiva, setLicenciaActiva] = useState(false);
  const [diasRestantes, setDiasRestantes] = useState(15);

  const [prefs, setPrefs] = useState<Preferencias>(PREFERENCIAS_DEFAULT);
  const [mostrarLoginKiosco, setMostrarLoginKiosco] = useState(false);
  const [iaAbierta, setIaAbierta] = useState(false);

  // 🔋 Modo ahorro
  const bateria = useBateria();
  const [ahorroManual, setAhorroManual] = useState(() => {
    try { return localStorage.getItem('cc.modo-ahorro-manual') === '1'; } catch { return false; }
  });

  const timeoutRef = useRef<number | null>(null);

  // ===== ARRANQUE =====
  useEffect(() => {
    (async () => {
      // 1) Seed inicial: si no hay PDV ni usuarios, crear datos por defecto
      try {
        const { db } = await import('./db');

        // PDV por defecto
        let pdvs = await db.puntosDeVenta.toArray();
        let pdvId: number;
        if (pdvs.length === 0) {
          pdvId = await db.puntosDeVenta.add({
            nombre: 'Principal',
            icono: '🏪',
            activo: true,
            creadoEn: new Date(),
          });
          console.log('[seed] PDV "Principal" creado con id', pdvId);
        } else {
          pdvId = pdvs[0].id!;
        }

        // Categoría por defecto
        const cats = await db.categorias.toArray();
        if (cats.length === 0) {
          await db.categorias.add({
            puntoDeVentaId: pdvId,
            nombre: 'General',
            descripcion: 'Categoría por defecto',
            creadoEn: new Date(),
          });
          console.log('[seed] Categoría "General" creada');
        }

        // Usuario admin por defecto
        const usuarios = await db.usuarios.toArray();
        if (usuarios.length === 0) {
          await db.usuarios.add({
            nombre: 'Administrador',
            pin: '1234',
            rol: 'admin',
            creadoEn: new Date(),
            puntosDeVentaIds: [pdvId],
            activo: true,
          });
          console.log('[seed] Usuario admin creado. PIN: 1234');
        }
      } catch (e) {
        console.error('[seed] Error creando datos iniciales:', e);
      }

      // 2) Continuar con el arranque normal
      const p = await cargarPreferencias();
      setPrefs(p);
      aplicarPreferenciasVisuales(p);

      const esPrimera = await esPrimeraInstalacion();
      if (esPrimera) { setEstado('bienvenida'); return; }

      const info = await obtenerInfoLicencia();
      setEsMaster(info.esMaster);
      setLicenciaActiva(info.activa);
      setDiasRestantes(info.diasRestantes);

      if (info.activa) { setEstado('login'); return; }
      setEstado(info.diasRestantes > 0 ? 'login' : 'bloqueado');
    })();
  }, []);

  // ===== APLICAR PREFERENCIAS VISUALES =====
  useEffect(() => {
    aplicarPreferenciasVisuales(prefs);
  }, [prefs]);

  // ===== ESCUCHAR CAMBIOS DE PREFERENCIAS =====
  useEffect(() => {
    const handler = (e: any) => {
      if (e?.detail) setPrefs(e.detail);
    };
    window.addEventListener('preferencias-cambiadas', handler);
    return () => window.removeEventListener('preferencias-cambiadas', handler);
  }, []);

  // ===== MODO AHORRO =====
  useEffect(() => {
    const debeAhorrar = ahorroManual || bateria.ahorroPorBateria;
    modoAhorro.set(debeAhorrar);
  }, [ahorroManual, bateria.ahorroPorBateria]);

  useEffect(() => {
    const handler = () => {
      try {
        const saved = localStorage.getItem('cc.modo-ahorro-manual') === '1';
        if (saved !== ahorroManual) setAhorroManual(saved);
      } catch { /* noop */ }
    };
    window.addEventListener('storage', handler);
    window.addEventListener('cc-ahorro-cambiado', handler);
    return () => {
      window.removeEventListener('storage', handler);
      window.removeEventListener('cc-ahorro-cambiado', handler);
    };
  }, [ahorroManual]);

  // ===== AUTO-LOGOUT POR INACTIVIDAD =====
  useEffect(() => {
    if (!usuarioActual || !prefs.autoLogoutMinutos) return;

    const limpiar = () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };

    const resetear = () => {
      limpiar();
      timeoutRef.current = window.setTimeout(() => {
        alert('⏱️ Sesión cerrada por inactividad');
        setUsuarioActual(null);
        setActivePage('dashboard');
        setMostrarLoginKiosco(false);
        setEstado('login');
      }, prefs.autoLogoutMinutos * 60 * 1000);
    };

    const eventos = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    eventos.forEach(e => window.addEventListener(e, resetear));
    resetear();

    return () => {
      limpiar();
      eventos.forEach(e => window.removeEventListener(e, resetear));
    };
  }, [usuarioActual, prefs.autoLogoutMinutos]);

  // ===== VALIDAR PERMISOS DEL VENDEDOR =====
  useEffect(() => {
    if (!usuarioActual || usuarioActual.rol !== 'vendedor') return;
    if (activePage === 'venta' || activePage === 'nueva-venta' || activePage === 'ayuda') return;
    if (!vendedorPuedeVer(activePage, prefs)) {
      setActivePage('nueva-venta');
    }
  }, [activePage, usuarioActual, prefs.vistasPermitidasVendedor]);

  // ===== CERRAR CLARA SI SE OCULTA =====
  useEffect(() => {
    if (!prefs.mostrarIA && iaAbierta) setIaAbierta(false);
  }, [prefs.mostrarIA, iaAbierta]);

  const refrescarInfoLicencia = async () => {
    const info = await obtenerInfoLicencia();
    setEsMaster(info.esMaster);
    setLicenciaActiva(info.activa);
    setDiasRestantes(info.diasRestantes);
  };

  const comenzarPrueba = async () => {
    await obtenerFechaInstalacion();
    await refrescarInfoLicencia();
    setEstado('login');
  };

  const irAActivar = () => { setEstado('activar'); };

  const handleLogin = (usuario: Usuario) => {
    setUsuarioActual(usuario);
    setActivePage(usuario.rol === 'vendedor' ? 'nueva-venta' : 'dashboard');
    setEstado('app');
    setMostrarLoginKiosco(false);
  };

  const cerrarSesion = () => {
    setUsuarioActual(null);
    setActivePage('dashboard');
    setSidebarAbierto(false);
    setMostrarLoginKiosco(false);
    setIaAbierta(false);
    setEstado('login');
  };

  const toggleSidebar = () => setSidebarAbierto(v => !v);

  const cambiarVista = (vista: string) => {
    setActivePage(vista);
    if (window.innerWidth < 1024) setSidebarAbierto(false);
  };

  // ===== RENDER POR ESTADO =====
  if (estado === 'cargando') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-500/30 border-t-blue-500" />
          <p className="text-sm font-semibold text-slate-400">Cargando TodoenTalla…</p>
        </div>
      </div>
    );
  }

  if (estado === 'bienvenida') {
    return (
      <ThemeProvider>
        <WelcomeScreen onComenzarPrueba={comenzarPrueba} onActivarLicencia={irAActivar} />
      </ThemeProvider>
    );
  }

  if (estado === 'activar') {
    return (
      <ThemeProvider>
        <ActivarLicencia bloqueada={false} onActivar={async () => { await refrescarInfoLicencia(); setEstado('login'); }} />
      </ThemeProvider>
    );
  }

  if (estado === 'bloqueado') {
    return (
      <ThemeProvider>
        <ActivarLicencia bloqueada={true} onActivar={async () => { await refrescarInfoLicencia(); setEstado('login'); }} />
      </ThemeProvider>
    );
  }

  if (estado === 'login' || !usuarioActual) {
    if (prefs.kiosco.activo && !mostrarLoginKiosco) {
      return (
        <ThemeProvider>
          <Kiosco config={prefs.kiosco} onIniciarSesion={() => setMostrarLoginKiosco(true)} />
        </ThemeProvider>
      );
    }
    return (
      <ThemeProvider>
        <Login onLogin={handleLogin} />
      </ThemeProvider>
    );
  }

  // ===== ROUTING DE PANTALLAS =====
  const renderPage = () => {
    // IDs de Bolt
    if (activePage === 'dashboard') return <Dashboard />;
    if (activePage === 'nueva-venta') return <NuevaVenta usuarioActual={usuarioActual} />;
    if (activePage === 'cierre') return <CierreCaja />;
    if (activePage === 'puntos-venta') return <PuntosDeVenta />;
    if (activePage === 'configuracion') return <Configuracion usuarioActual={usuarioActual} />;
    if (activePage === 'categorias') return <Categorias />;
    if (activePage === 'gastos') return <Gastos />;
    if (activePage === 'tasas') return <TasasCambio />;
    if (activePage === 'reportes') return <Reportes />;

    // Pendientes (pantallas que Bolt no implementó)
    return (
      <div className="animate-fade-in">
        <PageHeader
          title={pageTitle(activePage)}
          subtitle="Esta sección se implementará en las próximas fases"
        />
        <Card className="mt-4">
          <EmptyState
            icon={<Construction className="w-6 h-6" />}
            title="Próximamente"
            description="Esta página se conectará a la lógica real en la siguiente fase del proyecto."
            action={
              <Button variant="secondary" onClick={() => setActivePage('dashboard')}>
                Volver al Dashboard
              </Button>
            }
          />
        </Card>
      </div>
    );
  };

  const esAdminOJefe = usuarioActual.rol === 'admin' || usuarioActual.rol === 'jefe';

  return (
    <ThemeProvider>
      <PuntoDeVentaProvider usuarioActual={usuarioActual}>
        <AppShell
          sidebar={
            <Sidebar
              activeId={activePage}
              onNavigate={cambiarVista}
              userRol={usuarioActual.rol}
              userName={usuarioActual.nombre}
              pdvNombre="Principal"
              onLogout={cerrarSesion}
            />
          }
          sidebarWidth="w-64"
        >
          {renderPage()}
        </AppShell>

        {/* Botón flotante IA */}
        {!iaAbierta && prefs.mostrarIA && esAdminOJefe && (
          <button
            onPointerDown={(e) => {
              e.stopPropagation();
              setIaAbierta(true);
            }}
            aria-label="Abrir Clara"
            className="fixed bottom-20 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 hover:bg-blue-700 text-2xl text-white shadow-lg transition-colors md:bottom-6 md:right-6"
          >
            🤖
          </button>
        )}

        {/* Panel de Clara IA */}
        {esAdminOJefe && (
          <ClaraIA
            usuarioActual={usuarioActual}
            abierto={iaAbierta}
            onCerrar={() => setIaAbierta(false)}
          />
        )}

        {/* Notificaciones y modo ahorro */}
        <ToastContainer />

        {(bateria.ahorroPorBateria || ahorroManual) && (
          <IndicadorAhorro
            nivel={bateria.nivel}
            soportado={bateria.soportado}
            manual={ahorroManual && !bateria.ahorroPorBateria}
            onDesactivar={ahorroManual ? () => {
              setAhorroManual(false);
              try { localStorage.setItem('cc.modo-ahorro-manual', '0'); } catch { /* noop */ }
              window.dispatchEvent(new Event('cc-ahorro-cambiado'));
            } : undefined}
          />
        )}
      </PuntoDeVentaProvider>
    </ThemeProvider>
  );
}

function pageTitle(id: string): string {
  const titles: Record<string, string> = {
    'nueva-venta': 'Nueva Venta',
    historial: 'Historial de Ventas',
    cierre: 'Cierre de Caja',
    categorias: 'Categorías',
    clientes: 'Clientes',
    proveedores: 'Proveedores',
    compras: 'Compras',
    movimientos: 'Movimientos de Inventario',
    transferencias: 'Transferencias',
    etiquetas: 'Etiquetas',
    conteo: 'Conteo Físico',
    devoluciones: 'Devoluciones',
    gastos: 'Gastos',
    tasas: 'Tasas de Cambio',
    reportes: 'Reportes',
    cotizaciones: 'Cotizaciones',
    comisiones: 'Comisiones',
    usuarios: 'Usuarios',
    'puntos-venta': 'Puntos de Venta',
    seguridad: 'Seguridad / Logs',
    configuracion: 'Configuración',
    ayuda: 'Ayuda / Guía',
  };
  return titles[id] ?? 'Página';
}

export default App;