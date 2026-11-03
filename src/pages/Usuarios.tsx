import { useState } from 'react';
import {
  UserCog,
  Plus,
  Pencil,
  Trash2,
  Check,
  Store,
  KeyRound,
  Percent,
  Shield,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { Card, Button, Badge, Input, Select, Modal, EmptyState } from '@/components/ui';
import { PageHeader } from '@/layout/PageHeader';
import { mockUsuarios, mockPuntosDeVenta } from '@/mockData';
import type { Usuario, Rol } from '@/types';

const rolConfig: Record<Rol, { label: string; variant: 'info' | 'warning' | 'default' }> = {
  admin: { label: 'Administrador', variant: 'info' },
  jefe: { label: 'Jefe', variant: 'warning' },
  vendedor: { label: 'Vendedor', variant: 'default' },
};

interface FormState {
  nombre: string;
  pin: string;
  rol: Rol;
  puntosDeVentaIds: string[];
  comisionPorcentaje: string;
}

const formInicial: FormState = {
  nombre: '',
  pin: '',
  rol: 'vendedor',
  puntosDeVentaIds: [],
  comisionPorcentaje: '0',
};

export function Usuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>(mockUsuarios);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(formInicial);

  const abrirNuevo = () => {
    setEditId(null);
    setForm(formInicial);
    setModalOpen(true);
  };

  const abrirEditar = (usuario: Usuario) => {
    setEditId(usuario.id);
    setForm({
      nombre: usuario.nombre,
      pin: usuario.pin,
      rol: usuario.rol,
      puntosDeVentaIds: [...usuario.puntosDeVentaIds],
      comisionPorcentaje: String(usuario.comisionPorcentaje),
    });
    setModalOpen(true);
  };

  const togglePdv = (pdvId: string) => {
    setForm((prev) => ({
      ...prev,
      puntosDeVentaIds: prev.puntosDeVentaIds.includes(pdvId)
        ? prev.puntosDeVentaIds.filter((id) => id !== pdvId)
        : [...prev.puntosDeVentaIds, pdvId],
    }));
  };

  const guardar = () => {
    if (!form.nombre.trim() || !form.pin.trim()) return;
    if (editId) {
      setUsuarios((prev) =>
        prev.map((u) =>
          u.id === editId
            ? {
                ...u,
                nombre: form.nombre,
                pin: form.pin,
                rol: form.rol,
                puntosDeVentaIds: form.puntosDeVentaIds,
                comisionPorcentaje: parseFloat(form.comisionPorcentaje) || 0,
              }
            : u
        )
      );
    } else {
      const nuevo: Usuario = {
        id: `u-${Date.now()}`,
        nombre: form.nombre,
        pin: form.pin,
        rol: form.rol,
        puntosDeVentaIds: form.puntosDeVentaIds,
        comisionPorcentaje: parseFloat(form.comisionPorcentaje) || 0,
      };
      setUsuarios((prev) => [...prev, nuevo]);
    }
    setModalOpen(false);
  };

  const eliminar = () => {
    if (!deleteId) return;
    setUsuarios((prev) => prev.filter((u) => u.id !== deleteId));
    setDeleteId(null);
  };

  const getNombrePdv = (id: string) =>
    mockPuntosDeVenta.find((p) => p.id === id)?.nombre ?? id;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Usuarios"
        subtitle="Gestiona los usuarios y sus permisos"
        icon={<UserCog className="w-5 h-5" />}
        actions={
          <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={abrirNuevo}>
            Nuevo usuario
          </Button>
        }
      />

      {/* Grid de usuarios */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
        {usuarios.map((usuario) => {
          const rolCfg = rolConfig[usuario.rol];
          return (
            <Card key={usuario.id} className="flex flex-col">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-slate-800 border border-white/10 flex items-center justify-center text-base font-semibold text-slate-300">
                    {usuario.nombre.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-white">{usuario.nombre}</h3>
                    <Badge variant={rolCfg.variant} className="mt-1">
                      <Shield className="w-3 h-3" />
                      {rolCfg.label}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-sm text-slate-400 flex-1">
                <div className="flex items-center gap-2">
                  <Store className="w-4 h-4 text-slate-500 shrink-0" />
                  <span>
                    {usuario.puntosDeVentaIds.length} PDV
                    {usuario.puntosDeVentaIds.length !== 1 ? 's' : ''} asignado
                    {usuario.puntosDeVentaIds.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Percent className="w-4 h-4 text-slate-500 shrink-0" />
                  <span>Comisión: {usuario.comisionPorcentaje}%</span>
                </div>
                {usuario.puntosDeVentaIds.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {usuario.puntosDeVentaIds.map((pdvId) => (
                      <Badge key={pdvId} variant="default">
                        {getNombrePdv(pdvId)}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/10">
                <Button
                  variant="secondary"
                  size="sm"
                  fullWidth
                  leftIcon={<Pencil className="w-3.5 h-3.5" />}
                  onClick={() => abrirEditar(usuario)}
                >
                  Editar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeleteId(usuario.id)}
                  className="text-slate-500 hover:text-red-400"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {usuarios.length === 0 && (
        <Card className="mt-4">
          <EmptyState
            icon={<UserCog className="w-6 h-6" />}
            title="No hay usuarios"
            description="Crea tu primer usuario para empezar a gestionar el sistema"
            action={
              <Button leftIcon={<Plus className="w-4 h-4" />} onClick={abrirNuevo}>
                Nuevo usuario
              </Button>
            }
          />
        </Card>
      )}

      {/* Modal crear/editar */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editId ? 'Editar usuario' : 'Nuevo usuario'}
        description="Configura los datos y permisos del usuario"
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={guardar}
              disabled={!form.nombre.trim() || !form.pin.trim()}
              leftIcon={<Check className="w-4 h-4" />}
            >
              {editId ? 'Guardar cambios' : 'Crear usuario'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Nombre</label>
              <Input
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                placeholder="Nombre completo"
                leftIcon={<UserCog className="w-4 h-4" />}
                autoFocus
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">PIN</label>
              <Input
                value={form.pin}
                onChange={(e) => setForm({ ...form, pin: e.target.value })}
                placeholder="PIN de acceso"
                leftIcon={<KeyRound className="w-4 h-4" />}
                maxLength={8}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Rol</label>
              <Select
                value={form.rol}
                onChange={(e) => setForm({ ...form, rol: e.target.value as Rol })}
              >
                <option value="admin">Administrador</option>
                <option value="jefe">Jefe</option>
                <option value="vendedor">Vendedor</option>
              </Select>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">
                Comisión (%)
              </label>
              <Input
                type="number"
                value={form.comisionPorcentaje}
                onChange={(e) =>
                  setForm({ ...form, comisionPorcentaje: e.target.value })
                }
                placeholder="0"
                leftIcon={<Percent className="w-4 h-4" />}
              />
            </div>
          </div>

          {/* Asignación de PDVs */}
          <div>
            <label className="text-xs text-slate-400 mb-1.5 block">
              Puntos de venta asignados
            </label>
            <div className="space-y-2">
              {mockPuntosDeVenta.map((pdv) => {
                const checked = form.puntosDeVentaIds.includes(pdv.id);
                return (
                  <button
                    key={pdv.id}
                    type="button"
                    onClick={() => togglePdv(pdv.id)}
                    className={cn(
                      'w-full flex items-center gap-3 py-2.5 px-3 rounded-lg border transition-colors duration-150 text-left',
                      checked
                        ? 'bg-blue-600/10 border-blue-500/30'
                        : 'bg-slate-800/30 border-white/5 hover:border-white/10'
                    )}
                  >
                    <div
                      className={cn(
                        'w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors duration-150',
                        checked
                          ? 'bg-blue-600 border-blue-600'
                          : 'border-white/20'
                      )}
                    >
                      {checked && <Check className="w-3.5 h-3.5 text-white" />}
                    </div>
                    <Store className="w-4 h-4 text-slate-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-100 truncate">
                        {pdv.nombre}
                      </p>
                      <p className="text-xs text-slate-500 truncate">{pdv.direccion}</p>
                    </div>
                    {pdv.activo ? (
                      <Badge variant="success">Activo</Badge>
                    ) : (
                      <Badge variant="danger">Inactivo</Badge>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </Modal>

      {/* Modal eliminar */}
      <Modal
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        title="Eliminar usuario"
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
          ¿Seguro que deseas eliminar este usuario? El usuario perderá acceso al sistema y
          todas sus asignaciones serán removidas.
        </p>
      </Modal>
    </div>
  );
}
