import { useState, useMemo } from 'react';
import {
  DollarSign,
  Plus,
  Pencil,
  Trash2,
  Check,
  TrendingUp,
  Calendar,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { Card, Button, Badge, Input, Modal, EmptyState } from '@/components/ui';
import { PageHeader } from '@/layout/PageHeader';
import { formatCurrency } from '@/utils/format';
import { mockTasasCambio } from '@/mockData';
import type { TasaCambio } from '@/types';

const monedaInfo: Record<TasaCambio['moneda'], { label: string; simbolo: string; color: string }> = {
  USD: { label: 'Dólar EE.UU.', simbolo: '$', color: 'text-emerald-400' },
  EUR: { label: 'Euro', simbolo: '€', color: 'text-blue-400' },
  MLC: { label: 'Moneda Libremente Convertible', simbolo: 'MLC', color: 'text-amber-400' },
};

export function TasasCambio() {
  const [tasas, setTasas] = useState<TasaCambio[]>(mockTasasCambio);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({
    moneda: 'USD' as TasaCambio['moneda'],
    valorCUP: '',
  });

  const abrirNuevo = () => {
    setEditId(null);
    setForm({ moneda: 'USD', valorCUP: '' });
    setModalOpen(true);
  };

  const abrirEditar = (t: TasaCambio) => {
    setEditId(t.id);
    setForm({ moneda: t.moneda, valorCUP: String(t.valorCUP) });
    setModalOpen(true);
  };

  const guardar = () => {
    if (!form.valorCUP || parseFloat(form.valorCUP) <= 0) return;
    const valor = parseFloat(form.valorCUP);
    const fecha = new Date().toISOString().slice(0, 10);
    if (editId) {
      setTasas((prev) =>
        prev.map((t) =>
          t.id === editId
            ? { ...t, moneda: form.moneda, valorCUP: valor, fechaActualizacion: fecha }
            : t
        )
      );
    } else {
      // Check if already exists
      const existe = tasas.find((t) => t.moneda === form.moneda);
      if (existe) {
        setTasas((prev) =>
          prev.map((t) =>
            t.id === existe.id
              ? { ...t, valorCUP: valor, fechaActualizacion: fecha }
              : t
          )
        );
      } else {
        const nueva: TasaCambio = {
          id: `t-${Date.now()}`,
          moneda: form.moneda,
          valorCUP: valor,
          fechaActualizacion: fecha,
        };
        setTasas((prev) => [...prev, nueva]);
      }
    }
    setModalOpen(false);
  };

  const eliminar = () => {
    if (deleteId) {
      setTasas((prev) => prev.filter((t) => t.id !== deleteId));
      setDeleteId(null);
    }
  };

  // Conversor
  const [convertirDe, setConvertirDe] = useState<string>('USD');
  const [convertirCant, setConvertirCant] = useState('1');
  const cant = parseFloat(convertirCant) || 0;
  const tasaDe = tasas.find((t) => t.moneda === convertirDe);
  const resultadoCUP = tasaDe ? cant * tasaDe.valorCUP : 0;

  const ordenadas = useMemo(
    () => [...tasas].sort((a, b) => a.moneda.localeCompare(b.moneda)),
    [tasas]
  );

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Tasas de Cambio"
        subtitle="Actualiza los valores de conversión a CUP"
        icon={<DollarSign className="w-5 h-5" />}
        actions={
          <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={abrirNuevo}>
            Actualizar tasa
          </Button>
        }
      />

      {/* Cards de tasas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
        {ordenadas.map((tasa) => {
          const info = monedaInfo[tasa.moneda];
          return (
            <Card key={tasa.id}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-slate-800 border border-white/10 flex items-center justify-center">
                    <DollarSign className={cn('w-6 h-6', info.color)} />
                  </div>
                  <div>
                    <p className="text-base font-semibold text-white">{tasa.moneda}</p>
                    <p className="text-xs text-slate-500">{info.label}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => abrirEditar(tasa)}
                    className="w-7 h-7 rounded-md flex items-center justify-center text-slate-500 hover:text-slate-100 hover:bg-white/5 transition-colors duration-150"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleteId(tasa.id)}
                    className="w-7 h-7 rounded-md flex items-center justify-center text-slate-500 hover:text-red-400 hover:bg-white/5 transition-colors duration-150"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="bg-slate-800/50 rounded-lg p-4 text-center">
                <p className="text-xs text-slate-500 mb-1">1 {tasa.moneda} equivale a</p>
                <p className="text-2xl font-semibold text-white tabular-nums tracking-tight">
                  {formatCurrency(tasa.valorCUP)}
                </p>
                <p className="text-xs text-slate-500 mt-1">CUP</p>
              </div>

              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>
                    Actualizado: {new Date(tasa.fechaActualizacion).toLocaleDateString('es', { day: '2-digit', month: 'short' })}
                  </span>
                </div>
                <Badge variant="success" dot>
                  Activa
                </Badge>
              </div>
            </Card>
          );
        })}
      </div>

      {ordenadas.length === 0 && (
        <Card className="mt-4">
          <EmptyState
            icon={<DollarSign className="w-6 h-6" />}
            title="No hay tasas configuradas"
            description="Agrega la primera tasa de cambio para usar el conversor"
            action={
              <Button leftIcon={<Plus className="w-4 h-4" />} onClick={abrirNuevo}>
                Actualizar tasa
              </Button>
            }
          />
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        {/* Conversor */}
        <Card>
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-slate-400" />
            Conversor rápido
          </h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">Cantidad</label>
                <Input
                  type="number"
                  value={convertirCant}
                  onChange={(e) => setConvertirCant(e.target.value)}
                  className="tabular-nums text-lg"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">Moneda</label>
                <div className="flex items-center gap-1 bg-slate-900 border border-white/10 rounded-lg h-10 px-3">
                  {tasas.map((t) => (
                    <button
                      key={t.moneda}
                      onClick={() => setConvertirDe(t.moneda)}
                      className={cn(
                        'h-7 px-2.5 rounded-md text-xs font-medium transition-colors duration-150',
                        convertirDe === t.moneda
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-400 hover:text-slate-100'
                      )}
                    >
                      {t.moneda}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center">
              <ArrowRight className="w-5 h-5 text-slate-600 rotate-90" />
            </div>

            <div className="bg-slate-800/50 rounded-lg p-4 text-center">
              <p className="text-xs text-slate-500 mb-1">
                {cant} {convertirDe} equivale a
              </p>
              <p className="text-3xl font-semibold text-white tabular-nums tracking-tight">
                {formatCurrency(resultadoCUP)}
              </p>
              <p className="text-xs text-slate-500 mt-1">CUP</p>
            </div>

            {tasaDe && (
              <p className="text-xs text-slate-500 text-center">
                Tasa aplicada: 1 {convertirDe} = {formatCurrency(tasaDe.valorCUP)} CUP
              </p>
            )}
          </div>
        </Card>

        {/* Historial */}
        <Card>
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-slate-400" />
            Historial de actualizaciones
          </h3>
          <div className="space-y-2">
            {ordenadas.map((tasa) => {
              const info = monedaInfo[tasa.moneda];
              return (
                <div
                  key={tasa.id}
                  className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-slate-800/30 border border-white/5"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-800 border border-white/10 flex items-center justify-center">
                      <DollarSign className={cn('w-4 h-4', info.color)} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-100">{tasa.moneda}</p>
                      <p className="text-xs text-slate-500">
                        {new Date(tasa.fechaActualizacion).toLocaleDateString('es', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-white tabular-nums">
                      {formatCurrency(tasa.valorCUP)}
                    </p>
                    <p className="text-xs text-slate-500">CUP</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Modal crear/editar */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editId ? 'Editar tasa' : 'Actualizar tasa de cambio'}
        description="Define cuántos CUP equivale una unidad de esta moneda"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={guardar}
              disabled={!form.valorCUP || parseFloat(form.valorCUP) <= 0}
              leftIcon={<Check className="w-4 h-4" />}
            >
              {editId ? 'Guardar' : 'Crear'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs text-slate-400 mb-1.5 block">Moneda</label>
            <div className="flex items-center gap-1 bg-slate-900 border border-white/10 rounded-lg h-10 px-2">
              {(['USD', 'EUR', 'MLC'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setForm({ ...form, moneda: m })}
                  className={cn(
                    'flex-1 h-7 rounded-md text-xs font-medium transition-colors duration-150',
                    form.moneda === m
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:text-slate-100'
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1.5 block">
              Valor en CUP (1 {form.moneda} = ? CUP)
            </label>
            <Input
              type="number"
              value={form.valorCUP}
              onChange={(e) => setForm({ ...form, valorCUP: e.target.value })}
              placeholder="320"
              className="tabular-nums text-lg"
              leftIcon={<DollarSign className="w-4 h-4" />}
              autoFocus
            />
          </div>
        </div>
      </Modal>

      {/* Modal eliminar */}
      <Modal
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        title="Eliminar tasa"
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
          ¿Seguro que deseas eliminar esta tasa de cambio?
        </p>
      </Modal>
    </div>
  );
}
