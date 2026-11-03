import { useMemo, useState } from 'react';
import {
  Users,
  Search,
  Plus,
  Pencil,
  Trash2,
  Phone,
  DollarSign,
  AlertTriangle,
  HandCoins,
  Tag,
} from 'lucide-react';
import { PageHeader } from '@/layout/PageHeader';
import { Card, Button, Badge, Input, Modal, EmptyState } from '@/components/ui';
import { cn } from '@/utils/cn';
import { formatCurrency } from '@/utils/format';
import { mockClientes, mockPagosFiados } from '@/mockData';
import type { Cliente } from '@/types';

interface ClienteForm {
  nombre: string;
  telefono: string;
}

const emptyForm: ClienteForm = { nombre: '', telefono: '' };

export default function Clientes() {
  const [clientes, setClientes] = useState<Cliente[]>(mockClientes);
  const [pagosFiados, setPagosFiados] = useState(mockPagosFiados);
  const [search, setSearch] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ClienteForm>(emptyForm);
  const [formError, setFormError] = useState('');

  const [cobrarCliente, setCobrarCliente] = useState<Cliente | null>(null);
  const [cobroMonto, setCobroMonto] = useState('');

  const [deleteCliente, setDeleteCliente] = useState<Cliente | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return clientes;
    return clientes.filter(
      (c) =>
        c.nombre.toLowerCase().includes(q) ||
        c.telefono.toLowerCase().includes(q)
    );
  }, [clientes, search]);

  const totalFiado = useMemo(
    () => clientes.reduce((acc, c) => acc + c.saldoPendiente, 0),
    [clientes]
  );
  const clientesConDeuda = useMemo(
    () => clientes.filter((c) => c.saldoPendiente > 0).length,
    [clientes]
  );

  function openAdd() {
    setEditingId(null);
    setForm(emptyForm);
    setFormError('');
    setModalOpen(true);
  }

  function openEdit(cliente: Cliente) {
    setEditingId(cliente.id);
    setForm({ nombre: cliente.nombre, telefono: cliente.telefono });
    setFormError('');
    setModalOpen(true);
  }

  function saveCliente() {
    if (!form.nombre.trim()) {
      setFormError('El nombre es obligatorio');
      return;
    }
    if (editingId) {
      setClientes((prev) =>
        prev.map((c) =>
          c.id === editingId
            ? { ...c, nombre: form.nombre.trim(), telefono: form.telefono.trim() }
            : c
        )
      );
    } else {
      const nuevo: Cliente = {
        id: `c-${Date.now()}`,
        nombre: form.nombre.trim(),
        telefono: form.telefono.trim(),
        saldoPendiente: 0,
        preciosEspeciales: [],
      };
      setClientes((prev) => [nuevo, ...prev]);
    }
    setModalOpen(false);
  }

  function confirmDelete() {
    if (!deleteCliente) return;
    setClientes((prev) => prev.filter((c) => c.id !== deleteCliente.id));
    setDeleteCliente(null);
  }

  function confirmCobro() {
    if (!cobrarCliente) return;
    const monto = Number(cobroMonto);
    if (!monto || monto <= 0) return;

    const pago = {
      id: `pf-${Date.now()}`,
      clienteId: cobrarCliente.id,
      clienteNombre: cobrarCliente.nombre,
      monto,
      fecha: new Date().toISOString().slice(0, 10),
    };
    setPagosFiados((prev) => [pago, ...prev]);
    setClientes((prev) =>
      prev.map((c) =>
        c.id === cobrarCliente.id
          ? { ...c, saldoPendiente: Math.max(0, c.saldoPendiente - monto) }
          : c
      )
    );
    setCobrarCliente(null);
    setCobroMonto('');
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Clientes"
        subtitle="Gestiona clientes, fiados y precios especiales"
        icon={<Users className="w-5 h-5" />}
        actions={
          <Button leftIcon={<Plus className="w-4 h-4" />} onClick={openAdd}>
            Nuevo cliente
          </Button>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
        <Card padding="md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-800 border border-white/10 flex items-center justify-center text-slate-300">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Total clientes</p>
              <p className="text-xl font-semibold text-white mt-0.5">
                {clientes.length}
              </p>
            </div>
          </div>
        </Card>

        <Card padding="md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-800 border border-white/10 flex items-center justify-center text-slate-300">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Total fiado</p>
              <p className="text-xl font-semibold text-white mt-0.5">
                {formatCurrency(totalFiado)} CUP
              </p>
            </div>
          </div>
        </Card>

        <Card padding="md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-800 border border-white/10 flex items-center justify-center text-amber-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Clientes con deuda</p>
              <p className="text-xl font-semibold text-white mt-0.5">
                {clientesConDeuda}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Search */}
      <div className="mt-6 max-w-md">
        <Input
          placeholder="Buscar por nombre o teléfono..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftIcon={<Search className="w-4 h-4" />}
        />
      </div>

      {/* List */}
      <Card padding="sm" className="mt-4">
        {filtered.length === 0 ? (
          <EmptyState
            icon={<Users className="w-6 h-6" />}
            title="Sin clientes"
            description="No se encontraron clientes con los criterios de búsqueda."
          />
        ) : (
          <div className="divide-y divide-white/10">
            {filtered.map((cliente) => (
              <div
                key={cliente.id}
                className="flex flex-col gap-3 py-4 px-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-slate-800 border border-white/10 flex items-center justify-center text-slate-300 shrink-0">
                    <Users className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-white truncate">
                        {cliente.nombre}
                      </p>
                      {cliente.preciosEspeciales.length > 0 && (
                        <Badge variant="info">
                          <Tag className="w-3 h-3" />
                          {cliente.preciosEspeciales.length} precios
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-400">
                      <Phone className="w-3.5 h-3.5" />
                      <span>{cliente.telefono || 'Sin teléfono'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 pl-13 sm:pl-0">
                  <div className="text-right">
                    <p className="text-xs text-slate-500 font-medium">Saldo</p>
                    <p
                      className={cn(
                        'text-sm font-semibold mt-0.5',
                        cliente.saldoPendiente > 0
                          ? 'text-red-400'
                          : 'text-slate-300'
                      )}
                    >
                      {formatCurrency(cliente.saldoPendiente)} CUP
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    {cliente.saldoPendiente > 0 && (
                      <Button
                        size="sm"
                        variant="secondary"
                        leftIcon={<HandCoins className="w-4 h-4" />}
                        onClick={() => {
                          setCobrarCliente(cliente);
                          setCobroMonto('');
                        }}
                      >
                        Cobrar fiado
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openEdit(cliente)}
                      aria-label="Editar"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDeleteCliente(cliente)}
                      aria-label="Eliminar"
                      className="hover:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Recent payments */}
      {pagosFiados.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold text-slate-100 mb-3">
            Pagos de fiado recientes
          </h2>
          <Card padding="sm">
            <div className="divide-y divide-white/10">
              {pagosFiados.slice(0, 5).map((pago) => (
                <div
                  key={pago.id}
                  className="flex items-center justify-between py-3 px-2"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                      <HandCoins className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-100">
                        {pago.clienteNombre}
                      </p>
                      <p className="text-xs text-slate-500">{pago.fecha}</p>
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-emerald-400">
                    +{formatCurrency(pago.monto)} CUP
                  </p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Add / Edit modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Editar cliente' : 'Nuevo cliente'}
        description="Información básica del cliente."
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={saveCliente}>
              {editingId ? 'Guardar cambios' : 'Crear cliente'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Nombre
            </label>
            <Input
              value={form.nombre}
              onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
              placeholder="Nombre del cliente"
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
        </div>
      </Modal>

      {/* Cobrar fiado modal */}
      <Modal
        open={!!cobrarCliente}
        onClose={() => setCobrarCliente(null)}
        title="Cobrar fiado"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCobrarCliente(null)}>
              Cancelar
            </Button>
            <Button onClick={confirmCobro}>Registrar pago</Button>
          </>
        }
      >
        {cobrarCliente && (
          <div className="space-y-4">
            <div className="rounded-lg bg-slate-800 border border-white/10 p-4">
              <p className="text-xs text-slate-500 font-medium">Cliente</p>
              <p className="text-sm font-semibold text-white mt-0.5">
                {cobrarCliente.nombre}
              </p>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/10">
                <span className="text-xs text-slate-400">Saldo pendiente</span>
                <span className="text-sm font-semibold text-red-400">
                  {formatCurrency(cobrarCliente.saldoPendiente)} CUP
                </span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Monto a pagar
              </label>
              <Input
                type="number"
                min={0}
                value={cobroMonto}
                onChange={(e) => setCobroMonto(e.target.value)}
                placeholder="0"
                leftIcon={<DollarSign className="w-4 h-4" />}
              />
            </div>
          </div>
        )}
      </Modal>

      {/* Delete confirmation */}
      <Modal
        open={!!deleteCliente}
        onClose={() => setDeleteCliente(null)}
        title="Eliminar cliente"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteCliente(null)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={confirmDelete}>
              Eliminar
            </Button>
          </>
        }
      >
        {deleteCliente && (
          <p className="text-sm text-slate-300">
            ¿Seguro que deseas eliminar a{' '}
            <span className="font-semibold text-white">
              {deleteCliente.nombre}
            </span>
            ? Esta acción no se puede deshacer.
          </p>
        )}
      </Modal>
    </div>
  );
}
