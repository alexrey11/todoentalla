import { useState } from 'react';
import {
  Store,
  Plus,
  Pencil,
  Trash2,
  MapPin,
  Phone,
  Percent,
  Package,
  Check,
  X,
  Layers,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { Card, Button, Badge, Input, Modal, EmptyState } from '@/components/ui';
import { PageHeader } from '@/layout/PageHeader';
import { mockPuntosDeVenta, mockCategorias, mockProductos } from '@/mockData';
import type { PuntoDeVenta } from '@/types';

export function PuntosDeVenta() {
  const [puntos, setPuntos] = useState<PuntoDeVenta[]>(mockPuntosDeVenta);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [vistaConsolidada, setVistaConsolidada] = useState(false);
  const [form, setForm] = useState({
    nombre: '',
    direccion: '',
    telefono: '',
    impuestoPorcentaje: '10',
    activo: true,
  });

  const abrirNuevo = () => {
    setEditId(null);
    setForm({ nombre: '', direccion: '', telefono: '', impuestoPorcentaje: '10', activo: true });
    setModalOpen(true);
  };

  const abrirEditar = (pdv: PuntoDeVenta) => {
    setEditId(pdv.id);
    setForm({
      nombre: pdv.nombre,
      direccion: pdv.direccion,
      telefono: pdv.telefono,
      impuestoPorcentaje: String(pdv.impuestoPorcentaje),
      activo: pdv.activo,
    });
    setModalOpen(true);
  };

  const guardar = () => {
    if (!form.nombre.trim()) return;
    if (editId) {
      setPuntos((prev) =>
        prev.map((p) =>
          p.id === editId
            ? {
                ...p,
                nombre: form.nombre,
                direccion: form.direccion,
                telefono: form.telefono,
                impuestoPorcentaje: parseFloat(form.impuestoPorcentaje) || 0,
                activo: form.activo,
              }
            : p
        )
      );
    } else {
      const nuevo: PuntoDeVenta = {
        id: `pdv-${Date.now()}`,
        nombre: form.nombre,
        direccion: form.direccion,
        telefono: form.telefono,
        icono: 'Store',
        activo: form.activo,
        impuestoPorcentaje: parseFloat(form.impuestoPorcentaje) || 0,
      };
      setPuntos((prev) => [...prev, nuevo]);
    }
    setModalOpen(false);
  };

  const eliminar = () => {
    if (deleteId) {
      setPuntos((prev) => prev.filter((p) => p.id !== deleteId));
      setDeleteId(null);
    }
  };

  const toggleActivo = (id: string) => {
    setPuntos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, activo: !p.activo } : p))
    );
  };

  const getProductosCount = (pdvId: string) =>
    mockProductos.filter((p) => p.puntoDeVentaId === pdvId).length;
  const getCategoriasCount = (pdvId: string) =>
    mockCategorias.filter((c) => c.puntoDeVentaId === pdvId).length;

  if (vistaConsolidada) {
    const totalProductos = puntos.reduce((s, p) => s + getProductosCount(p.id), 0);
    const totalCategorias = puntos.reduce((s, p) => s + getCategoriasCount(p.id), 0);
    return (
      <div className="animate-fade-in">
        <PageHeader
          title="Puntos de Venta"
          subtitle="Vista consolidada de todos los puntos de venta"
          icon={<Store className="w-5 h-5" />}
          actions={
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Layers className="w-4 h-4" />}
              onClick={() => setVistaConsolidada(false)}
            >
              Vista individual
            </Button>
          }
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          <Card>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-lg bg-slate-800 border border-white/10 flex items-center justify-center">
                <Store className="w-5 h-5 text-slate-400" />
              </div>
              <span className="text-xs text-slate-400">Puntos de venta</span>
            </div>
            <p className="text-xl font-semibold text-white tabular-nums">{puntos.length}</p>
          </Card>
          <Card>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-lg bg-slate-800 border border-white/10 flex items-center justify-center">
                <Check className="w-5 h-5 text-emerald-400" />
              </div>
              <span className="text-xs text-slate-400">Activos</span>
            </div>
            <p className="text-xl font-semibold text-white tabular-nums">
              {puntos.filter((p) => p.activo).length}
            </p>
          </Card>
          <Card>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-lg bg-slate-800 border border-white/10 flex items-center justify-center">
                <Package className="w-5 h-5 text-slate-400" />
              </div>
              <span className="text-xs text-slate-400">Total productos</span>
            </div>
            <p className="text-xl font-semibold text-white tabular-nums">{totalProductos}</p>
          </Card>
          <Card>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-lg bg-slate-800 border border-white/10 flex items-center justify-center">
                <Layers className="w-5 h-5 text-slate-400" />
              </div>
              <span className="text-xs text-slate-400">Total categorías</span>
            </div>
            <p className="text-xl font-semibold text-white tabular-nums">{totalCategorias}</p>
          </Card>
        </div>

        <Card className="mt-4">
          <h3 className="text-sm font-semibold text-white mb-4">Inventario consolidado</h3>
          <div className="space-y-2">
            {puntos.map((pdv) => (
              <div
                key={pdv.id}
                className="flex items-center justify-between py-3 px-3 rounded-lg bg-slate-800/30 border border-white/5"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-slate-800 border border-white/10 flex items-center justify-center">
                    <Store className="w-4 h-4 text-slate-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-100">{pdv.nombre}</p>
                    <p className="text-xs text-slate-500">
                      {getProductosCount(pdv.id)} productos · {getCategoriasCount(pdv.id)} categorías
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={pdv.activo ? 'success' : 'danger'} dot>
                    {pdv.activo ? 'Activo' : 'Inactivo'}
                  </Badge>
                  <span className="text-xs text-slate-500">{pdv.impuestoPorcentaje}% imp.</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Puntos de Venta"
        subtitle="Gestiona las sucursales de tu negocio"
        icon={<Store className="w-5 h-5" />}
        actions={
          <>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Layers className="w-4 h-4" />}
              onClick={() => setVistaConsolidada(true)}
            >
              Vista consolidada
            </Button>
            <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={abrirNuevo}>
              Nuevo PDV
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
        {puntos.map((pdv) => (
          <Card key={pdv.id} hoverable className="flex flex-col">
            <div className="flex items-start justify-between mb-4">
              <div className="w-11 h-11 rounded-xl bg-slate-800 border border-white/10 flex items-center justify-center">
                <Store className="w-6 h-6 text-slate-300" />
              </div>
              <Badge variant={pdv.activo ? 'success' : 'danger'} dot>
                {pdv.activo ? 'Activo' : 'Inactivo'}
              </Badge>
            </div>

            <h3 className="text-base font-semibold text-white mb-1">{pdv.nombre}</h3>

            <div className="space-y-1.5 text-sm text-slate-400 flex-1">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-slate-500 shrink-0" />
                <span className="truncate">{pdv.direccion || 'Sin dirección'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-slate-500 shrink-0" />
                <span>{pdv.telefono || 'Sin teléfono'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Percent className="w-4 h-4 text-slate-500 shrink-0" />
                <span>Impuesto: {pdv.impuestoPorcentaje}%</span>
              </div>
            </div>

            <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white/10">
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Package className="w-3.5 h-3.5" />
                <span>{getProductosCount(pdv.id)} productos</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Layers className="w-3.5 h-3.5" />
                <span>{getCategoriasCount(pdv.id)} categorías</span>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-4">
              <Button
                variant="secondary"
                size="sm"
                fullWidth
                leftIcon={<Pencil className="w-3.5 h-3.5" />}
                onClick={() => abrirEditar(pdv)}
              >
                Editar
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleActivo(pdv.id)}
                className={cn(pdv.activo ? 'text-emerald-400' : 'text-slate-400')}
              >
                {pdv.activo ? 'Desactivar' : 'Activar'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDeleteId(pdv.id)}
                className="text-slate-500 hover:text-red-400"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {puntos.length === 0 && (
        <Card className="mt-4">
          <EmptyState
            icon={<Store className="w-6 h-6" />}
            title="No hay puntos de venta"
            description="Crea tu primer punto de venta para empezar a gestionar inventario y ventas"
            action={
              <Button leftIcon={<Plus className="w-4 h-4" />} onClick={abrirNuevo}>
                Nuevo PDV
              </Button>
            }
          />
        </Card>
      )}

      {/* Modal crear/editar */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editId ? 'Editar punto de venta' : 'Nuevo punto de venta'}
        description="Configura los datos básicos de la sucursal"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={guardar} disabled={!form.nombre.trim()} leftIcon={<Check className="w-4 h-4" />}>
              {editId ? 'Guardar cambios' : 'Crear PDV'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs text-slate-400 mb-1.5 block">Nombre</label>
            <Input
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              placeholder="Ej: Tienda Principal"
              leftIcon={<Store className="w-4 h-4" />}
              autoFocus
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1.5 block">Dirección</label>
            <Input
              value={form.direccion}
              onChange={(e) => setForm({ ...form, direccion: e.target.value })}
              placeholder="Ej: Calle 23 #456, Habana"
              leftIcon={<MapPin className="w-4 h-4" />}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Teléfono</label>
              <Input
                value={form.telefono}
                onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                placeholder="+53 5555-0000"
                leftIcon={<Phone className="w-4 h-4" />}
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Impuesto (%)</label>
              <Input
                type="number"
                value={form.impuestoPorcentaje}
                onChange={(e) => setForm({ ...form, impuestoPorcentaje: e.target.value })}
                placeholder="10"
                leftIcon={<Percent className="w-4 h-4" />}
              />
            </div>
          </div>
          <div className="flex items-center justify-between pt-2">
            <span className="text-sm text-slate-300">Punto de venta activo</span>
            <button
              onClick={() => setForm({ ...form, activo: !form.activo })}
              className={cn(
                'relative w-10 h-6 rounded-full transition-colors duration-150',
                form.activo ? 'bg-blue-600' : 'bg-slate-700'
              )}
            >
              <span
                className={cn(
                  'absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all duration-150',
                  form.activo ? 'left-[18px]' : 'left-0.5'
                )}
              />
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal eliminar */}
      <Modal
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        title="Eliminar punto de venta"
        description="Esta acción no se puede deshacer"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteId(null)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={eliminar} leftIcon={<Trash2 className="w-4 h-4" />}>
              Eliminar
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-400">
          ¿Seguro que deseas eliminar este punto de venta? Se perderán todas las configuraciones
          asociadas.
        </p>
      </Modal>
    </div>
  );
}
