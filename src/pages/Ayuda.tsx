import { useState, useMemo } from 'react';
import {
  BookOpen,
  Search,
  ChevronDown,
  ChevronRight,
  Check,
  MessageCircle,
  Home,
  CalendarDays,
  Settings2,
  LifeBuoy,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { Card, Button, Input, EmptyState, Badge } from '@/components/ui';
import { PageHeader } from '@/layout/PageHeader';

interface SeccionAyuda {
  id: string;
  titulo: string;
  pasos: string[];
}

interface CategoriaAyuda {
  id: string;
  nombre: string;
  icon: typeof Home;
  secciones: SeccionAyuda[];
}

const categorias: CategoriaAyuda[] = [
  {
    id: 'inicio',
    nombre: 'Inicio',
    icon: Home,
    secciones: [
      {
        id: 'inicio-1',
        titulo: 'Cómo iniciar sesión',
        pasos: [
          'Ingresa tu PIN en la pantalla de login',
          'Selecciona el punto de venta asignado',
          'Presiona el botón "Ingresar" para acceder al sistema',
        ],
      },
      {
        id: 'inicio-2',
        titulo: 'Navegación por el menú',
        pasos: [
          'Usa la barra lateral izquierda para navegar entre módulos',
          'El dashboard muestra el resumen general del día',
          'Cada sección tiene su propio encabezado con acciones rápidas',
        ],
      },
      {
        id: 'inicio-3',
        titulo: 'Cambiar de punto de venta',
        pasos: [
          'Haz clic en el nombre del PDV en la barra superior',
          'Selecciona el punto de venta al que deseas cambiar',
          'Los datos mostrados se actualizarán según el PDV seleccionado',
        ],
      },
    ],
  },
  {
    id: 'diario',
    nombre: 'Diario',
    icon: CalendarDays,
    secciones: [
      {
        id: 'diario-1',
        titulo: 'Registrar una nueva venta',
        pasos: [
          'Ve a "Nueva Venta" en el menú principal',
          'Busca o escanea los productos para agregarlos al carrito',
          'Selecciona el método de pago (efectivo, tarjeta o transferencia)',
          'Confirma la venta para registrarla en el sistema',
        ],
      },
      {
        id: 'diario-2',
        titulo: 'Realizar el cierre de caja',
        pasos: [
          'Al final del día, ve a "Cierre de Caja"',
          'Cuenta el dinero físico en caja e ingresa el monto real',
          'El sistema calculará automáticamente la diferencia',
          'Confirma el cierre para registrar el cuadre del día',
        ],
      },
      {
        id: 'diario-3',
        titulo: 'Gestionar clientes y fiados',
        pasos: [
          'Registra nuevos clientes desde la sección "Clientes"',
          'Para ventas a crédito, marca la opción "Fiado" al registrar la venta',
          'Consulta el saldo pendiente de cada cliente en su perfil',
          'Registra los pagos de fiados desde la sección correspondiente',
        ],
      },
      {
        id: 'diario-4',
        titulo: 'Crear una cotización',
        pasos: [
          'Ve a "Cotizaciones" y presiona "Nueva cotización"',
          'Ingresa el nombre del cliente y agrega los productos',
          'El total se calcula automáticamente con impuestos',
          'Puedes convertir la cotización en venta cuando el cliente acepte',
        ],
      },
    ],
  },
  {
    id: 'avanzado',
    nombre: 'Avanzado',
    icon: Settings2,
    secciones: [
      {
        id: 'avanzado-1',
        titulo: 'Gestión de inventario',
        pasos: [
          'Registra entradas y salidas de stock desde "Inventario"',
          'Configura stock mínimo para recibir alertas automáticas',
          'Usa variantes para manejar tallas y colores de productos',
          'Crea productos compuestos que descuentan ingredientes automáticamente',
        ],
      },
      {
        id: 'avanzado-2',
        titulo: 'Reportes y análisis',
        pasos: [
          'Accede a "Reportes" para ver métricas de ventas y ganancias',
          'Filtra por período, punto de venta o vendedor',
          'Exporta los reportes en formato PDF o Excel',
          'Revisa las comisiones de cada vendedor en la sección correspondiente',
        ],
      },
      {
        id: 'avanzado-3',
        titulo: 'Configuración del sistema',
        pasos: [
          'Desde "Configuración" ajusta los parámetros generales del negocio',
          'Configura las tasas de cambio para monedas extranjeras',
          'Gestiona los puntos de venta y sus porcentajes de impuesto',
          'Administra los usuarios, roles y permisos desde "Usuarios"',
        ],
      },
    ],
  },
  {
    id: 'soporte',
    nombre: 'Soporte',
    icon: LifeBuoy,
    secciones: [
      {
        id: 'soporte-1',
        titulo: 'Respaldar la información',
        pasos: [
          'Ve a "Seguridad" y selecciona "Exportar logs"',
          'Realiza respaldos periódicos de tu base de datos',
          'Guarda los archivos de backup en un lugar seguro',
          'Los backups manuales quedan registrados en el log de auditoría',
        ],
      },
      {
        id: 'soporte-2',
        titulo: 'Revisar logs de auditoría',
        pasos: [
          'Accede a "Seguridad" para ver el historial de acciones',
          'Filtra por tipo de evento (login, venta cancelada, backup, etc.)',
          'Busca por usuario o detalle para encontrar eventos específicos',
          'Exporta los logs para análisis externo si es necesario',
        ],
      },
      {
        id: 'soporte-3',
        titulo: 'Contactar soporte técnico',
        pasos: [
          'Si tienes problemas, usa el botón de WhatsApp al final de esta página',
          'Describe el problema con el mayor detalle posible',
          'Incluye capturas de pantalla si es necesario',
          'Ten a mano tu número de PDV y versión del sistema',
        ],
      },
    ],
  },
];

export function Ayuda() {
  const [search, setSearch] = useState('');
  const [expandido, setExpandido] = useState<string | null>(null);

  const seccionesFiltradas = useMemo(() => {
    if (!search.trim()) return categorias;
    const q = search.toLowerCase();
    return categorias
      .map((cat) => ({
        ...cat,
        secciones: cat.secciones.filter(
          (sec) =>
            sec.titulo.toLowerCase().includes(q) ||
            sec.pasos.some((p) => p.toLowerCase().includes(q)) ||
            cat.nombre.toLowerCase().includes(q)
        ),
      }))
      .filter((cat) => cat.secciones.length > 0);
  }, [search]);

  const totalSecciones = categorias.reduce((s, c) => s + c.secciones.length, 0);

  const toggleSeccion = (id: string) => {
    setExpandido((prev) => (prev === id ? null : id));
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Ayuda"
        subtitle={`${totalSecciones} guías en ${categorias.length} categorías`}
        icon={<BookOpen className="w-5 h-5" />}
      />

      {/* Buscador */}
      <div className="mt-4">
        <Input
          type="text"
          placeholder="Buscar en las guías de ayuda..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftIcon={<Search className="w-4 h-4" />}
        />
      </div>

      {/* Categorías */}
      {seccionesFiltradas.length > 0 ? (
        <div className="space-y-6 mt-4">
          {seccionesFiltradas.map((cat) => {
            const CatIcon = cat.icon;
            return (
              <div key={cat.id}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-800 border border-white/10 flex items-center justify-center">
                    <CatIcon className="w-4 h-4 text-slate-300" />
                  </div>
                  <h2 className="text-base font-semibold text-white">{cat.nombre}</h2>
                  <Badge variant="default">{cat.secciones.length}</Badge>
                </div>

                <div className="space-y-2">
                  {cat.secciones.map((sec) => {
                    const isOpen = expandido === sec.id;
                    return (
                      <Card key={sec.id} padding="sm" className="overflow-hidden">
                        <button
                          onClick={() => toggleSeccion(sec.id)}
                          className="w-full flex items-center gap-3 text-left"
                        >
                          {isOpen ? (
                            <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
                          )}
                          <span className="text-sm font-medium text-slate-100 flex-1">
                            {sec.titulo}
                          </span>
                        </button>
                        {isOpen && (
                          <div className="mt-3 pl-7 space-y-2 animate-fade-in">
                            {sec.pasos.map((paso, i) => (
                              <div key={i} className="flex items-start gap-2.5">
                                <div className="w-5 h-5 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                                  <Check className="w-3 h-3 text-emerald-400" />
                                </div>
                                <span className="text-sm text-slate-400">{paso}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <Card className="mt-4">
          <EmptyState
            icon={<BookOpen className="w-6 h-6" />}
            title="No se encontraron resultados"
            description="Intenta con otros términos de búsqueda"
          />
        </Card>
      )}

      {/* Botón de soporte WhatsApp */}
      <Card className="mt-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-slate-800 border border-white/10 flex items-center justify-center">
              <MessageCircle className="w-6 h-6 text-slate-300" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">¿Necesitas más ayuda?</h3>
              <p className="text-sm text-slate-400 mt-0.5">
                Contáctanos por WhatsApp y te responderemos lo antes posible
              </p>
            </div>
          </div>
          <Button
            size="lg"
            leftIcon={<MessageCircle className="w-5 h-5" />}
            onClick={() =>
              window.open('https://wa.me/5355551234?text=Hola%2C%20necesito%20ayuda%20con%20TodoenTalla', '_blank')
            }
          >
            Contactar soporte
          </Button>
        </div>
      </Card>
    </div>
  );
}
