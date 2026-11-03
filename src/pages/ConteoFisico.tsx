import { useState, useMemo } from 'react';
import {
  ClipboardCheck,
  Save,
  Search,
  Package,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { Card, Button, Badge, Input, Select, EmptyState } from '@/components/ui';
import { PageHeader } from '@/layout/PageHeader';
import { formatCurrency } from '@/utils/format';
import { mockProductos, mockCategorias } from '@/mockData';
import type { Producto } from '@/types';

interface FilaConteo {
  productoId: string;
  conteoFisico: string;
}

export function ConteoFisico() {
  const [search, setSearch] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState<string>('todas');
  const [filtroDiferencia, setFiltroDiferencia] = useState<string>('todas');
  const [filas, setFilas] = useState<Record<string, FilaConteo>>(
    () =>
      Object.fromEntries(
        mockProductos.map((p) => [
          p.id,
          { productoId: p.id, conteoFisico: '' },
        ])
      )
  );
  const [guardado, setGuardado] = useState(false);

  const productosFiltrados = useMemo(() => {
    let lista = mockProductos;
    if (filtroCategoria !== 'todas') {
      lista = lista.filter((p) => p.categoriaId === filtroCategoria);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      lista = lista.filter(
        (p) =>
          p.nombre.toLowerCase().includes(q) ||
          p.codigoBarras.includes(search.trim())
      );
    }
    return lista;
  }, [search, filtroCategoria]);

  const getDiferencia = (producto: Producto): number | null => {
    const fila = filas[producto.id];
    if (!fila || !fila.conteoFisico) return null;
    const fisico = parseInt(fila.conteoFisico, 10);
    if (isNaN(fisico)) return null;
    return fisico - producto.stockActual;
  };

  const getDiferenciaFiltrada = (producto: Producto): number | null => {
    const diff = getDiferencia(producto);
    if (filtroDiferencia === 'todas') return diff;
    if (diff === null) return null;
    if (filtroDiferencia === 'con_diferencia' && diff === 0) return null;
    if (filtroDiferencia === 'sin_diferencia' && diff !== 0) return null;
    if (filtroDiferencia === 'faltante' && diff >= 0) return null;
    if (filtroDiferencia === 'sobrante' && diff <= 0) return null;
    return diff;
  };

  const productosVisibles = useMemo(() => {
    return productosFiltrados.filter((p) => {
      const diff = getDiferencia(p);
      if (filtroDiferencia === 'todas') return true;
      if (diff === null) {
        return filtroDiferencia === 'todas';
      }
      if (filtroDiferencia === 'con_diferencia') return diff !== 0;
      if (filtroDiferencia === 'sin_diferencia') return diff === 0;
      if (filtroDiferencia === 'faltante') return diff < 0;
      if (filtroDiferencia === 'sobrante') return diff > 0;
      return true;
    });
  }, [productosFiltrados, filas, filtroDiferencia]);

  const resumen = useMemo(() => {
    let conDiferencia = 0;
    let totalAjustes = 0;
    let contados = 0;
    mockProductos.forEach((p) => {
      const diff = getDiferencia(p);
      if (diff !== null) {
        contados++;
        if (diff !== 0) {
          conDiferencia++;
          totalAjustes += Math.abs(diff);
        }
      }
    });
    return {
      total: mockProductos.length,
      contados,
      conDiferencia,
      totalAjustes,
    };
  }, [filas]);

  const actualizarConteo = (productoId: string, valor: string) => {
    setFilas((prev) => ({
      ...prev,
      [productoId]: { productoId, conteoFisico: valor },
    }));
    setGuardado(false);
  };

  const guardarConteo = () => {
    // Genera movimientos de ajuste para los productos con diferencia
    const ajustes = mockProductos
      .map((p) => {
        const diff = getDiferencia(p);
        return { producto: p, diferencia: diff };
      })
      .filter((a) => a.diferencia !== null && a.diferencia !== 0);

    console.log('Movimientos de ajuste generados:', ajustes);
    setGuardado(true);
  };

  const getNombreCategoria = (categoriaId: string): string => {
    return mockCategorias.find((c) => c.id === categoriaId)?.nombre ?? 'Sin categoria';
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Conteo Fisico"
        subtitle="Inventario fisico y ajuste de stock"
        icon={<ClipboardCheck className="w-5 h-5" />}
        actions={
          <Button
            size="sm"
            leftIcon={<Save className="w-4 h-4" />}
            onClick={guardarConteo}
            disabled={resumen.contados === 0}
          >
            Guardar conteo
          </Button>
        }
      />

      {/* Resumen */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
        <Card>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg bg-slate-800 border border-white/10 flex items-center justify-center">
              <Package className="w-5 h-5 text-slate-400" />
            </div>
            <span className="text-xs text-slate-400">Total productos</span>
          </div>
          <p className="text-xl font-semibold text-white tabular-nums">
            {resumen.total}
          </p>
        </Card>
        <Card>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg bg-slate-800 border border-white/10 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-blue-400" />
            </div>
            <span className="text-xs text-slate-400">Contados</span>
          </div>
          <p className="text-xl font-semibold text-white tabular-nums">
            {resumen.contados}
          </p>
        </Card>
        <Card>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg bg-slate-800 border border-white/10 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            </div>
            <span className="text-xs text-slate-400">Con diferencias</span>
          </div>
          <p className="text-xl font-semibold text-white tabular-nums">
            {resumen.conDiferencia}
          </p>
        </Card>
        <Card>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg bg-slate-800 border border-white/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
            </div>
            <span className="text-xs text-slate-400">Total ajustes</span>
          </div>
          <p className="text-xl font-semibold text-white tabular-nums">
            {resumen.totalAjustes} u
          </p>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mt-4">
        <div className="flex-1">
          <Input
            type="text"
            placeholder="Buscar producto o codigo de barras..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>
        <Select
          value={filtroCategoria}
          onChange={(e) => setFiltroCategoria(e.target.value)}
          className="sm:w-44"
        >
          <option value="todas">Todas las categorias</option>
          {mockCategorias.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </Select>
        <Select
          value={filtroDiferencia}
          onChange={(e) => setFiltroDiferencia(e.target.value)}
          className="sm:w-44"
        >
          <option value="todas">Todas las diferencias</option>
          <option value="con_diferencia">Con diferencia</option>
          <option value="sin_diferencia">Sin diferencia</option>
          <option value="faltante">Faltantes</option>
          <option value="sobrante">Sobrantes</option>
        </Select>
      </div>

      {/* Tabla de conteo */}
      <Card padding="sm" className="mt-4">
        {productosVisibles.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider py-3 px-3">
                    Producto
                  </th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider py-3 px-3 hidden md:table-cell">
                    Categoria
                  </th>
                  <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wider py-3 px-3">
                    Stock teorico
                  </th>
                  <th className="text-center text-xs font-medium text-slate-500 uppercase tracking-wider py-3 px-3">
                    Conte fisico
                  </th>
                  <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wider py-3 px-3">
                    Diferencia
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {productosVisibles.map((p) => {
                  const diff = getDiferencia(p);
                  const fila = filas[p.id];
                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-white/5 transition-colors duration-100"
                    >
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-slate-800 border border-white/10 flex items-center justify-center shrink-0">
                            <Package className="w-4 h-4 text-slate-500" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-100 truncate">
                              {p.nombre}
                            </p>
                            <p className="text-xs text-slate-500 tabular-nums">
                              {p.codigoBarras}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 hidden md:table-cell">
                        <span className="text-xs text-slate-400">
                          {getNombreCategoria(p.categoriaId)}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span className="text-sm font-medium text-slate-200 tabular-nums">
                          {p.stockActual}
                        </span>
                        {p.stockActual < p.stockMinimo && (
                          <Badge variant="danger" className="ml-2">
                            Min
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex justify-center">
                          <Input
                            type="number"
                            value={fila?.conteoFisico ?? ''}
                            onChange={(e) =>
                              actualizarConteo(p.id, e.target.value)
                            }
                            placeholder="—"
                            className="w-20 text-center tabular-nums"
                            min="0"
                          />
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right">
                        {diff === null ? (
                          <span className="text-sm text-slate-600">—</span>
                        ) : diff === 0 ? (
                          <span className="inline-flex items-center gap-1 text-sm font-medium text-emerald-400 tabular-nums">
                            <CheckCircle2 className="w-4 h-4" />
                            0
                          </span>
                        ) : (
                          <span
                            className={cn(
                              'inline-flex items-center gap-1 text-sm font-semibold tabular-nums',
                              diff < 0 ? 'text-red-400' : 'text-emerald-400'
                            )}
                          >
                            {diff < 0 ? (
                              <TrendingDown className="w-4 h-4" />
                            ) : (
                              <TrendingUp className="w-4 h-4" />
                            )}
                            {diff > 0 ? '+' : ''}
                            {diff}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={<ClipboardCheck className="w-6 h-6" />}
            title="No hay productos"
            description="No se encontraron productos con los filtros aplicados"
          />
        )}
      </Card>

      {/* Mensaje de guardado */}
      {guardado && (
        <div className="mt-4 flex items-center gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-emerald-400">
              Conteo guardado correctamente
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              Se generaron {resumen.conDiferencia} movimientos de ajuste para{' '}
              {resumen.totalAjustes} unidades
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setGuardado(false)}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Cerrar
          </Button>
        </div>
      )}
    </div>
  );
}
