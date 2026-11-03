import { useState, useMemo } from 'react';
import {
  Percent,
  Download,
  Calendar,
  TrendingUp,
  Users,
  DollarSign,
} from 'lucide-react';
import { Card, Button, Badge, Select, EmptyState } from '@/components/ui';
import { PageHeader } from '@/layout/PageHeader';
import { formatCurrency, formatCurrencyWithSymbol } from '@/utils/format';
import { mockUsuarios, mockVentas } from '@/mockData';
import type { Venta } from '@/types';

type Periodo = 'hoy' | 'semana' | 'mes' | 'todo';

interface ComisionVendedor {
  id: string;
  nombre: string;
  rol: string;
  ventasCount: number;
  totalVendido: number;
  comisionPorcentaje: number;
  comisionMonto: number;
}

export function Comisiones() {
  const [periodo, setPeriodo] = useState<Periodo>('mes');

  const filtrarPorPeriodo = (ventas: Venta[]): Venta[] => {
    if (periodo === 'todo') return ventas;
    const ahora = new Date('2026-11-03');
    const inicio = new Date(ahora);
    if (periodo === 'hoy') {
      inicio.setHours(0, 0, 0, 0);
    } else if (periodo === 'semana') {
      inicio.setDate(ahora.getDate() - 7);
    } else if (periodo === 'mes') {
      inicio.setMonth(ahora.getMonth());
      inicio.setDate(1);
      inicio.setHours(0, 0, 0, 0);
    }
    return ventas.filter((v) => new Date(v.fecha) >= inicio && v.estado === 'completada');
  };

  const ventasFiltradas = useMemo(
    () => filtrarPorPeriodo(mockVentas),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [periodo]
  );

  const comisiones: ComisionVendedor[] = useMemo(() => {
    return mockUsuarios.map((usuario) => {
      const ventasVendedor = ventasFiltradas.filter((v) => v.vendedorId === usuario.id);
      const totalVendido = ventasVendedor.reduce((s, v) => s + v.total, 0);
      const comisionMonto = Math.round(
        (totalVendido * usuario.comisionPorcentaje) / 100
      );
      return {
        id: usuario.id,
        nombre: usuario.nombre,
        rol: usuario.rol,
        ventasCount: ventasVendedor.length,
        totalVendido,
        comisionPorcentaje: usuario.comisionPorcentaje,
        comisionMonto,
      };
    });
  }, [ventasFiltradas]);

  const vendedoresConComision = comisiones.filter((c) => c.comisionPorcentaje > 0);
  const totalComisiones = vendedoresConComision.reduce((s, c) => s + c.comisionMonto, 0);
  const totalVendido = comisiones.reduce((s, c) => s + c.totalVendido, 0);
  const totalVentas = comisiones.reduce((s, c) => s + c.ventasCount, 0);

  const rolLabel: Record<string, string> = {
    admin: 'Administrador',
    jefe: 'Jefe',
    vendedor: 'Vendedor',
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Comisiones"
        subtitle="Reporte de comisiones por vendedor"
        icon={<Percent className="w-5 h-5" />}
        actions={
          <>
            <Select
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value as Periodo)}
              className="sm:w-40"
            >
              <option value="hoy">Hoy</option>
              <option value="semana">Esta semana</option>
              <option value="mes">Este mes</option>
              <option value="todo">Todo el tiempo</option>
            </Select>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Download className="w-4 h-4" />}
            >
              Exportar
            </Button>
          </>
        }
      />

      {/* Resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
        <Card>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg bg-slate-800 border border-white/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-slate-400" />
            </div>
            <span className="text-xs text-slate-400">Total vendido</span>
          </div>
          <p className="text-xl font-semibold text-white tabular-nums">
            {formatCurrency(totalVendido)}
          </p>
        </Card>
        <Card>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg bg-slate-800 border border-white/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-slate-400" />
            </div>
            <span className="text-xs text-slate-400">Ventas realizadas</span>
          </div>
          <p className="text-xl font-semibold text-white tabular-nums">{totalVentas}</p>
        </Card>
        <Card>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg bg-slate-800 border border-white/10 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-emerald-400" />
            </div>
            <span className="text-xs text-slate-400">Total comisiones</span>
          </div>
          <p className="text-xl font-semibold text-white tabular-nums">
            {formatCurrency(totalComisiones)}
          </p>
        </Card>
      </div>

      {/* Tabla de comisiones */}
      <Card className="mt-4" padding="sm">
        {comisiones.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider py-3 px-3">
                    Vendedor
                  </th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider py-3 px-3">
                    Rol
                  </th>
                  <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wider py-3 px-3">
                    Ventas
                  </th>
                  <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wider py-3 px-3">
                    Total vendido
                  </th>
                  <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wider py-3 px-3">
                    Comisión %
                  </th>
                  <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wider py-3 px-3">
                    Comisión
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {comisiones.map((c) => (
                  <tr key={c.id} className="hover:bg-white/5 transition-colors duration-100">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-slate-800 border border-white/10 flex items-center justify-center text-sm font-semibold text-slate-300 shrink-0">
                          {c.nombre.charAt(0)}
                        </div>
                        <span className="text-sm font-medium text-slate-100">{c.nombre}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <Badge
                        variant={
                          c.rol === 'admin'
                            ? 'info'
                            : c.rol === 'jefe'
                              ? 'warning'
                              : 'default'
                        }
                      >
                        {rolLabel[c.rol]}
                      </Badge>
                    </td>
                    <td className="py-3 px-3 text-right text-sm text-slate-300 tabular-nums">
                      {c.ventasCount}
                    </td>
                    <td className="py-3 px-3 text-right text-sm text-slate-300 tabular-nums">
                      {formatCurrency(c.totalVendido)}
                    </td>
                    <td className="py-3 px-3 text-right text-sm text-slate-400 tabular-nums">
                      {c.comisionPorcentaje}%
                    </td>
                    <td className="py-3 px-3 text-right text-sm font-semibold text-emerald-400 tabular-nums">
                      {formatCurrency(c.comisionMonto)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-white/10">
                  <td colSpan={2} className="py-3 px-3 text-sm font-semibold text-white">
                    Total
                  </td>
                  <td className="py-3 px-3 text-right text-sm font-semibold text-white tabular-nums">
                    {totalVentas}
                  </td>
                  <td className="py-3 px-3 text-right text-sm font-semibold text-white tabular-nums">
                    {formatCurrency(totalVendido)}
                  </td>
                  <td className="py-3 px-3" />
                  <td className="py-3 px-3 text-right text-sm font-semibold text-emerald-400 tabular-nums">
                    {formatCurrency(totalComisiones)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={<Percent className="w-6 h-6" />}
            title="No hay datos"
            description="No se encontraron ventas en el período seleccionado"
          />
        )}
      </Card>

      <p className="text-xs text-slate-500 mt-3 flex items-center gap-1.5">
        <Calendar className="w-3.5 h-3.5" />
        Las comisiones se calculan como: total vendido x porcentaje de comisión / 100
      </p>
    </div>
  );
}
