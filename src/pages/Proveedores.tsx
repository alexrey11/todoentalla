import { useMemo, useState } from 'react';
import {
  Truck,
  Search,
  Plus,
  Pencil,
  Trash2,
  Phone,
  MapPin,
  Mail,
  User,
} from 'lucide-react';
import { PageHeader } from '@/layout/PageHeader';
import { Card, Button, Badge, Input, Modal, EmptyState } from '@/components/ui';
import { cn } from '@/utils/cn';
import { formatCurrency } from '@/utils/format';

interface Proveedor {
  id: string;
  nombre: string;
  telefono: string;
  direccion: string;
  contacto: string;
  email: string;
}

const initialProveedores: Proveedor[] = [
  {
    id: 'prov-1',
    nombre: 'Distribuidora Caribe',
    telefono: '+53 7333-1111',
    direccion: 'Calle Industria #100, Habana',
    contacto: 'Juan Ruiz',
    email: 'ventas@caribe.com',
  },
  {
    id: 'prov-2',
    nombre: 'Bebidas del Norte',
    telefono: '+53 7333-2222',
    direccion: 'Av. Independencia #45, Habana',
    contacto: 'Marta Díaz',
    email: 'pedidos@norte.com',
  },
  {
    id: 'prov-3',
    nombre: 'Abarrotes Central',
    telefono: '+53 7333-3333',
    direccion: 'Calle Muralla #78, Habana Vieja',
    contacto: 'Luis Gómez',
    email: 'info@central.com',
  },
  {
    id: 'prov-4',
    nombre: 'Frigorífico Oriental',
    telefono: '+53 2233-4444',
    direccion: 'Reparto Sueño, Santiago de Cuba',
    contacto: 'Elena Castro',
    email: 'ventas@oriental.com',
  },
  {
    id: 'prov-5',
    nombre: 'Limpieza Total S.A.',
    telefono: '+53 7333-5555',
    direccion: 'Calle San Rafael #220, Habana',
    contacto: 'Rafael Pino',
    email: 'comercial@total.com',
  },
];

interface ProveedorForm {
  nombre: string;
  telefono: string;
  direccion: string;
  contacto: string;
  email: string;
}

const emptyForm: ProveedorForm = {
  nombre: '',
  telefono: '',
  direccion: '',
  contacto: '',
  email: '',
};

export default function Proveedores() {
  const [proveedores, setProveedores] =
    useState<Proveedor[]>(initialProveedores);
  const [search, setSearch] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProveedorForm>(emptyForm);
  const [formError, setFormError] = useState('');

  const [deleteProveedor, setDeleteProveedor] = useState<Proveedor | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return proveedores;
    return proveedores.filter(
      (p) =>
        p.nombre.toLowerCase().includes(q) ||
        p.contacto.toLowerCase().includes(q) ||
        p.telefono.toLowerCase().includes(q)
    );
  }, [proveedores, search]);

  function openAdd() {
    setEditingId(null);
    setForm(emptyForm);
    setFormError('');
    setModalOpen(true);
  }

  function openEdit(prov: Proveedor) {
    setEditingId(prov.id);
    setForm({
      nombre: prov.nombre,
      telefono: prov.telefono,
      direccion: prov.direccion,
      contacto: prov.contacto,
      email: prov.email,
    });
    setFormError('');
    setModalOpen(true);
  }

  function saveProveedor() {
    if (!form.nombre.trim()) {
      setFormError('El nombre es obligatorio');
      return;
    }
    if (editingId) {
      setProveedores((prev) =>
        prev.map((p) =>
          p.id === editingId
            ? {
                ...p,
                nombre: form.nombre.trim(),
                telefono: form.telefono.trim(),
                direccion: form.direccion.trim(),
                contacto: form.contacto.trim(),
                email: form.email.trim(),
              }
            : p
        )
      );
    } else {
      const nuevo: Proveedor = {
        id: `prov-${Date.now()}`,
        nombre: form.nombre.trim(),
        telefono: form.telefono.trim(),
        direccion: form.direccion.trim(),
        contacto: form.contacto.trim(),
        email: form.email.trim(),
      };
      setProveedores((prev) => [nuevo, ...prev]);
    }
    setModalOpen(false);
  }

  function confirmDelete() {
    if (!deleteProveedor) return;
    setProveedores((prev) =>
      prev.filter((p) => p.id !== deleteProveedor.id)
    );
    setDeleteProveedor(null);
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Proveedores"
        subtitle="Gestiona los proveedores de tu negocio"
        icon={<Truck className="w-5 h-5" />}
        actions={
          <Button leftIcon={<Plus className="w-4 h-4" />} onClick={openAdd}>
            Nuevo proveedor
          </Button>
        }
      />

      {/* KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
        <Card padding="md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-800 border border-white/10 flex items-center justify-center text-slate-300">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">
                Total proveedores
              </p>
              <p className="text-xl font-semibold text-white mt-0.5">
                {proveedores.length}
              </p>
            </div>
          </div>
        </Card>
        <Card padding="md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-800 border border-white/10 flex items-center justify-center text-slate-300">
              <User className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">
                Resultados mostrados
              </p>
              <p className="text-xl font-semibold text-white mt-0.5">
                {filtered.length}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Search */}
      <div className="mt-6 max-w-md">
        <Input
          placeholder="Buscar por nombre, contacto o teléfono..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftIcon={<Search className="w-4 h-4" />}
        />
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <Card padding="md" className="mt-4">
          <EmptyState
            icon={<Truck className="w-6 h-6" />}
            title="Sin proveedores"
            description="No se encontraron proveedores con los criterios de búsqueda."
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
          {filtered.map((prov) => (
            <Card key={prov.id} padding="md" className="flex flex-col">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-slate-800 border border-white/10 flex items-center justify-center text-slate-300 shrink-0">
                    <Truck className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">
                      {prov.nombre}
                    </p>
                    {prov.contacto && (
                      <p className="text-xs text-slate-400 mt-0.5">
                        {prov.contacto}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openEdit(prov)}
                    aria-label="Editar"
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setDeleteProveedor(prov)}
                    aria-label="Eliminar"
                    className="hover:text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="mt-4 space-y-2.5">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Phone className="w-3.5 h-3.5 text-slate-500" />
                  <span>{prov.telefono || 'Sin teléfono'}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <MapPin className="w-3.5 h-3.5 text-slate-500" />
                  <span className="truncate">
                    {prov.direccion || 'Sin dirección'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Mail className="w-3.5 h-3.5 text-slate-500" />
                  <span className="truncate">
                    {prov.email || 'Sin email'}
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add / Edit modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Editar proveedor' : 'Nuevo proveedor'}
        description="Información de contacto del proveedor."
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={saveProveedor}>
              {editingId ? 'Guardar cambios' : 'Crear proveedor'}
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Nombre
            </label>
            <Input
              value={form.nombre}
              onChange={(e) =>
                setForm((f) => ({ ...f, nombre: e.target.value }))
              }
              placeholder="Nombre del proveedor"
              error={!!formError}
            />
            {formError && (
              <p className="text-xs text-red-400 mt-1.5">{formError}</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Teléfono
            </label>
            <Input
              value={form.telefono}
              onChange={(e) =>
                setForm((f) => ({ ...f, telefono: e.target.value }))
              }
              placeholder="+53 5555-0000"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Persona de contacto
            </label>
            <Input
              value={form.contacto}
              onChange={(e) =>
                setForm((f) => ({ ...f, contacto: e.target.value }))
              }
              placeholder="Nombre del contacto"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Dirección
            </label>
            <Input
              value={form.direccion}
              onChange={(e) =>
                setForm((f) => ({ ...f, direccion: e.target.value }))
              }
              placeholder="Dirección del proveedor"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Email
            </label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) =>
                setForm((f) => ({ ...f, email: e.target.value }))
              }
              placeholder="proveedor@ejemplo.com"
            />
          </div>
        </div>
      </Modal>

      {/* Delete confirmation */}
      <Modal
        open={!!deleteProveedor}
        onClose={() => setDeleteProveedor(null)}
        title="Eliminar proveedor"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteProveedor(null)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={confirmDelete}>
              Eliminar
            </Button>
          </>
        }
      >
        {deleteProveedor && (
          <p className="text-sm text-slate-300">
            ¿Seguro que deseas eliminar a{' '}
            <span className="font-semibold text-white">
              {deleteProveedor.nombre}
            </span>
            ? Esta acción no se puede deshacer.
          </p>
        )}
      </Modal>
    </div>
  );
}
