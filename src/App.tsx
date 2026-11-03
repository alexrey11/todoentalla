import { useState } from 'react';
import { Construction } from 'lucide-react';
import { Sidebar } from '@/layout/Sidebar';
import { AppShell } from '@/layout/AppShell';
import { PageHeader } from '@/layout/PageHeader';
import { Login } from '@/pages/Login';
import { Dashboard } from '@/pages/Dashboard';
import { NuevaVenta } from '@/pages/NuevaVenta';
import { CierreCaja } from '@/pages/CierreCaja';
import { PuntosDeVenta } from '@/pages/PuntosDeVenta';
import { Configuracion } from '@/pages/Configuracion';
import { Categorias } from '@/pages/Categorias';
import { Gastos } from '@/pages/Gastos';
import { TasasCambio } from '@/pages/TasasCambio';
import { Reportes } from '@/pages/Reportes';
import { Card, Button, EmptyState } from '@/components/ui';
import { mockUsuarios, mockPuntosDeVenta } from '@/mockData';
import type { Usuario } from '@/types';

function App() {
  const [user, setUser] = useState<Usuario | null>(null);
  const [activePage, setActivePage] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  if (!user) {
    return (
      <Login
        usuarios={mockUsuarios}
        onLogin={(u) => {
          setUser(u);
          setActivePage('dashboard');
        }}
      />
    );
  }

  const pdv = mockPuntosDeVenta.find((p) => p.id === user.puntosDeVentaIds[0]);

  const handleLogout = () => {
    setUser(null);
    setActivePage('dashboard');
  };

  const renderPage = () => {
    if (activePage === 'dashboard') {
      return <Dashboard />;
    }

    if (activePage === 'nueva-venta') {
      return <NuevaVenta />;
    }

    if (activePage === 'cierre') {
      return <CierreCaja />;
    }

    if (activePage === 'puntos-venta') {
      return <PuntosDeVenta />;
    }

    if (activePage === 'configuracion') {
      return <Configuracion />;
    }

    if (activePage === 'categorias') {
      return <Categorias />;
    }

    if (activePage === 'gastos') {
      return <Gastos />;
    }

    if (activePage === 'tasas') {
      return <TasasCambio />;
    }

    if (activePage === 'reportes') {
      return <Reportes />;
    }

    return (
      <div className="animate-fade-in">
        <PageHeader
          title={pageTitle(activePage)}
          subtitle="Esta sección estará disponible en la próxima fase"
        />
        <Card className="mt-4">
          <EmptyState
            icon={<Construction className="w-6 h-6" />}
            title="Próximamente"
            description="Esta página será implementada en la Fase 2 o 3 del proyecto."
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

  return (
    <AppShell
      sidebar={
        <Sidebar
          activeId={activePage}
          onNavigate={(id) => {
            setActivePage(id);
            // Track collapse state for layout
          }}
          userRol={user.rol}
          userName={user.nombre}
          pdvNombre={pdv?.nombre ?? 'Sin PDV'}
          onLogout={handleLogout}
        />
      }
      sidebarWidth={sidebarCollapsed ? 'w-16' : 'w-64'}
    >
      {renderPage()}
    </AppShell>
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
