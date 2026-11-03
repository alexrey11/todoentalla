import { useState, useMemo } from 'react';
import {
  Receipt,
  Plus,
  Pencil,
  Trash2,
  Search,
  Check,
  Zap,
  Droplets,
  Home,
  Users,
  Truck,
  Car,
  Landmark,
  Wrench,
  MoreHorizontal,
  Calendar,
  TrendingDown,
  Filter,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { Card, Button, Badge, Input, Select, Modal, EmptyState } from '@/components/ui';
import { PageHeader } from '@/layout/PageHeader';
import { formatCurrency } from '@/utils/format';
import { mockGastos } from '@/mockData';
import type { Gasto, CategoriaGasto } from '@/types';

const categoriaConfig: Record<
  CategoriaGasto,
  { label: string; icon: typeof Receipt; color: string }
> = {
  luz: { label: 'Luz', icon: Zap, color: 'text-amber-400' },
  agua: { label: 'Agua', icon: Droplets, color: 'text-blue-400' },
  alquiler: { label: 'Alquiler', icon: Home, color: 'text-slate-300' },
  salario: { label: 'Salario', icon: Users, color: 'text-emerald-400' },
  proveedor: { label: 'Proveedor', icon: Truck, color: 'text-blue-400' },
  transporte: { label: 'Transporte', icon: Car, color: 'text-slate-300' },
  impuestos: { label: 'Impuestos', icon: Landmark, color: 'text-red-400' },
  mantenimiento: { label: 'Mantenimiento', icon: Wrench, color: 'text-amber-400' },
  otros: { label: 'Otros', icon: MoreHorizontal, color: 'text-slate-400' },
};

export function Gastos() {
  const [gastos, setGastos] = useState<Gasto[]>(mockGastos);
  const [search, setSearch] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState<string>('todas');
  const [filtroMes, setFiltroMes] = useState<string>('todos');
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({
    fecha: new Date().toISOString().slice(0, 10),
    categoria: 'luz' as CategoriaGasto,
    monto: '',
    descripcion: '',
  });

  const abrirNuevo = () => {
    setEditId(null);
    setForm({
      fecha: new Date().toISOString().slice(0, 10),
      categoria: 'luz',
      monto: '',
      descripcion: '',
    });
    setModalOpen(true);
  };

  const abrirEditar = (g: Gasto) => {
    setEditId(g.id);
    setForm({
      fecha: g.fecha,
      categoria: g.categoria,
      monto: String(g.monto),
      descripcion: g.descripcion,
    });
    setModalOpen(true);
  };

  const guardar = () => {
    if (!form.monto || parseFloat(form.monto) <= 0) return;
    if (editId) {
      setGastos((prev) =>
        prev.map((g) =>
          g.id === editId
            ? {
                ...g,
                fecha: form.fecha,
                categoria: form.categoria,
                monto: parseFloat(form.monto),
                descripcion: form.descripcion,
              }
            : g
        )
      );
    } else {
      const nuevo: Gasto = {
        id: `g-${Date.now()}`,
        fecha: form.fecha,
        categoria: form.categoria,
        monto: parseFloat(form.monto),
        descripcion: form.descripcion,
        puntoDeVentaId: 'pdv-1',
      };
      setGastos((prev) => [nuevo, ...prev]);
    }
    setModalOpen(false);
  };

  const eliminar = () => {
    if (deleteId) {
      setGastos((prev) => prev.filter((g) => g.id !== deleteId));
      setDeleteId(null);
    }
  };

  const gastosFiltrados = useMemo(() => {
    let lista = gastos;
    if (filtroCategoria !== 'todas') {
      lista = lista.filter((g) => g.categoria === filtroCategoria);
    }
    if (filtroMes !== 'todos') {
      lista = lista.filter((g) => g.fecha.startsWith(filtroMes));
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      lista = lista.filter(
        (g) =>
          g.descripcion.toLowerCase().includes(q) ||
          categoriaConfig[g.categoria].label.toLowerCase().includes(q)
      );
    }
    return lista.sort((a, b) => b.fecha.localeCompare(a.fecha));
  }, [gastos, filtroCategoria, filtroMes, search]);

  const totalMes = useMemo(() => {
    const mesActual = new Date().toISOString().slice(0, 7);
    return gastos
      .filter((g) => g.fecha.startsWith(mesActual))
      .reduce((s, g) => s + g.monto, 0);
  }, [gastos]);

  const totalFiltrado = gastosFiltrados.reduce((s, g) => s + g.monto, 0);

  const desgloseCategoria = useMemo(() => {
    const grupos: Record<string, number> = {};
    gastosFiltrados.forEach((g) => {
      grupos[g.categoria] = (grupos[g.categoria] || 0) + g.monto;
    });
    return Object.entries(grupos)
      .sort(([, a], [, b]) => b - a)
      .map(([cat, monto]) => ({
        categoria: cat as CategoriaGasto,
        monto,
        pct: totalFiltrado > 0 ? (monto / totalFiltrado) * 100 : 0,
      }));
  }, [gastosFiltrados, totalFiltrado]);

  const meses = useMemo(() => {
    const set = new Set(gastos.map((g) => g.fecha.slice(0, 7)));
    return Array.from(set).sort().reverse();
  }, [gastos]);

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Gastos"
        subtitle="Registra y controla los gastos del negocio"
        icon={<Receipt className="w-5 h-5" />}
        actions={
          <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={abrirNuevo}>
            Nuevo gasto
          </Button>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
        <Card>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg bg-slate-800 border border-white/10 flex items-center justify-center">
              <Receipt className="w-5 h-5 text-slate-400" />
            </div>
            <span className="text-xs text-slate-400">Total del mes</span>
          </div>
          <p className="text-xl font-semibold text-white tabular-nums">{formatCurrency(totalMes)}</p>
          <p className="text-xs text-slate-500 mt-0.5">
            {new Date().toLocaleDateString('es', { month: 'long', year: 'numeric' })}
          </p>
        </Card>
        <Card>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg bg-slate-800 border border-white/10 flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-red-400" />
            </div>
            <span className="text-xs text-slate-400">Total filtrado</span>
          </div>
          <p className="text-xl font-semibold text-white tabular-nums">{formatCurrency(totalFiltrado)}</p>
          <p className="text-xs text-slate-500 mt-0.5">{gastosFiltrados.length} gastos</p>
        </Card>
        <Card>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg bg-slate-800 border border-white/10 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-slate-400" />
            </div>
            <span className="text-xs text-slate-400">Categoría mayor</span>
          </div>
          {desgloseCategoria.length > 0 ? (
            <>
              <p className="text-xl font-semibold text-white">
                {categoriaConfig[desgloseCategoria[0].categoria].label}
              </p>
              <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
                {formatCurrency(desgloseCategoria[0].monto)}
              </p>
            </>
          ) : (
            <p className="text-xl font-semibold text-slate-600">—</p>
          )}
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mt-4">
        <div className="flex-1">
          <Input
            type="text"
            placeholder="Buscar gasto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>
        <Select
          value={filtroCategoria}
          onChange={(e) => setFiltroCategoria(e.target.value)}
          className="sm:w-40"
        >
          <option value="todas">Todas las categorías</option>
          {Object.entries(categoriaConfig).map(([key, cfg]) => (
            <option key={key} value={key}>
              {cfg.label}
            </option>
          ))}
        </Select>
        <Select
          value={filtroMes}
          onChange={(e) => setFiltroMes(e.target.value)}
          className="sm:w-36"
        >
          <option value="todos">Todos los meses</option>
          {meses.map((m) => (
            <option key={m} value={m}>
              {new Date(m + '-01').toLocaleDateString('es', { month: 'long', year: 'numeric' })}
            </option>
          ))}
        </Select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
        {/* Lista de gastos */}
        <div className="lg:col-span-2">
          <Card padding="sm">
            {gastosFiltrados.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider py-3 px-3">Fecha</th>
                      <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider py-3 px-3">Categoría</th>
                      <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider py-3 px-3">Descripción</th>
                      <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wider py-3 px-3">Monto</th>
                      <th className="text-center text-xs font-medium text-slate-500 uppercase tracking-wider py-3 px-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {gastosFiltrados.map((g) => {
                      const cfg = categoriaConfig[g.categoria];
                      const Icon = cfg.icon;
                      return (
                        <tr key={g.id} className="hover:bg-white/5 transition-colors duration-100">
                          <td className="py-3 px-3 text-xs text-slate-400 whitespace-nowrap">
                            {new Date(g.fecha).toLocaleDateString('es', { day: '2-digit', month: 'short' })}
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2">
                              <Icon className={cn('w-4 h-4', cfg.color)} />
                              <span className="text-sm text-slate-200">{cfg.label}</span>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-sm text-slate-400 max-w-xs truncate">
                            {g.descripcion || '—'}
                          </td>
                          <td className="py-3 px-3 text-right text-sm font-medium text-white tabular-nums whitespace-nowrap">
                            {formatCurrency(g.monto)}
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => abrirEditar(g)}
                                className="w-7 h-7 rounded-md flex items-center justify-center text-slate-500 hover:text-slate-100 hover:bg-white/5 transition-colors duration-150"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setDeleteId(g.id)}
                                className="w-7 h-7 rounded-md flex items-center justify-center text-slate-500 hover:text-red-400 hover:bg-white/5 transition-colors duration-150"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                icon={<Receipt className="w-6 h-6" />}
                title="No hay gastos"
                description="Registra tu primer gasto para llevar el control"
                action={
                  <Button leftIcon={<Plus className="w-4 h-4" />} onClick={abrirNuevo}>
                    Nuevo gasto
                  </Button>
                }
              />
            )}
          </Card>
        </div>

        {/* Desglose por categoría */}
        <div>
          <Card>
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              Desglose por categoría
            </h3>
            {desgloseCategoria.length > 0 ? (
              <div className="space-y-3">
                {desgloseCategoria.map(({ categoria, monto, pct }) => {
                  const cfg = categoriaConfig[categoria];
                  const Icon = cfg.icon;
                  return (
                    <div key={categoria}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <Icon className={cn('w-4 h-4', cfg.color)} />
                          <span className="text-sm text-slate-200">{cfg.label}</span>
                        </div>
                        <span className="text-sm font-medium text-white tabular-nums">
                          {formatCurrency(monto)}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-blue-600 rounded-full transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-500 mt-0.5 block text-right tabular-nums">
                        {pct.toFixed(1)}%
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-slate-500 text-center py-4">Sin datos para mostrar</p>
            )}
          </Card>
        </div>
      </div>

      {/* Modal crear/editar */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editId ? 'Editar gasto' : 'Nuevo gasto'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={guardar}
              disabled={!form.monto || parseFloat(form.monto) <= 0}
              leftIcon={<Check className="w-4 h-4" />}
            >
              {editId ? 'Guardar' : 'Crear'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Fecha</label>
              <Input
                type="date"
                value={form.fecha}
                onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                leftIcon={<Calendar className="w-4 h-4" />}
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Monto (CUP)</label>
              <Input
                type="number"
                value={form.monto}
                onChange={(e) => setForm({ ...form, monto: e.target.value })}
                placeholder="0"
                className="tabular-nums"
                leftIcon={<Receipt className="w-4 h-4" />}
                autoFocus
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1.5 block">Categoría</label>
            <Select
              value={form.categoria}
              onChange={(e) => setForm({ ...form, categoria: e.target.value as CategoriaGasto })}
            >
              {Object.entries(categoriaConfig).map(([key, cfg]) => (
                <option key={key} value={key}>
                  {cfg.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1.5 block">Descripción</label>
            <Input
              value={form.descripcion}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
              placeholder="Ej: Recibo eléctrico de octubre"
            />
          </div>
        </div>
      </Modal>

      {/* Modal eliminar */}
      <Modal
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        title="Eliminar gasto"
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
        <p className="text-sm text-slate-400">¿Seguro que deseas eliminar este gasto?</p>
      </Modal>
    </div>
  );
}
