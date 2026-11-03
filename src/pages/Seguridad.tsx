import { useState, useMemo } from 'react';
import {
  ShieldCheck,
  Search,
  Calendar,
  User,
  Info,
  Download,
} from 'lucide-react';
import { Card, Button, Badge, Input, Select, EmptyState } from '@/components/ui';
import { PageHeader } from '@/layout/PageHeader';
import { mockLogs } from '@/mockData';
import type { LogAuditoria } from '@/types';

const tipoConfig: Record<
  string,
  { label: string; variant: 'default' | 'success' | 'danger' | 'warning' | 'info' }
> = {
  login: { label: 'Inicio de sesión', variant: 'success' },
  venta_cancelada: { label: 'Venta cancelada', variant: 'danger' },
  backup: { label: 'Backup', variant: 'info' },
  cierre_caja: { label: 'Cierre de caja', variant: 'warning' },
  logout: { label: 'Cierre de sesión', variant: 'default' },
  usuario_creado: { label: 'Usuario creado', variant: 'info' },
  usuario_eliminado: { label: 'Usuario eliminado', variant: 'danger' },
  configuracion: { label: 'Configuración', variant: 'default' },
};

export function Seguridad() {
  const [search, setSearch] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');

  const logsFiltrados = useMemo(() => {
    let lista = mockLogs;
    if (filtroTipo !== 'todos') lista = lista.filter((l) => l.tipo === filtroTipo);
    if (search.trim()) {
      const q = search.toLowerCase();
      lista = lista.filter(
        (l) =>
          l.usuarioNombre.toLowerCase().includes(q) ||
          l.detalle.toLowerCase().includes(q) ||
          l.tipo.toLowerCase().includes(q)
      );
    }
    return lista;
  }, [search, filtroTipo]);

  const tiposPresentes = useMemo(
    () => Array.from(new Set(mockLogs.map((l) => l.tipo))),
    []
  );

  const getTipoConfig = (tipo: string) =>
    tipoConfig[tipo] ?? { label: tipo, variant: 'default' as const };

  const formatDate = (fecha: string) =>
    new Date(fecha).toLocaleDateString('es', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Seguridad"
        subtitle={`${mockLogs.length} registros de auditoría`}
        icon={<ShieldCheck className="w-5 h-5" />}
        actions={
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Download className="w-4 h-4" />}
          >
            Exportar logs
          </Button>
        }
      />

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mt-4">
        <div className="flex-1">
          <Input
            type="text"
            placeholder="Buscar por usuario, detalle o tipo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>
        <Select
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value)}
          className="sm:w-48"
        >
          <option value="todos">Todos los tipos</option>
          {tiposPresentes.map((tipo) => {
            const cfg = getTipoConfig(tipo);
            return (
              <option key={tipo} value={tipo}>
                {cfg.label}
              </option>
            );
          })}
        </Select>
      </div>

      {/* Tabla de logs */}
      <Card className="mt-4" padding="sm">
        {logsFiltrados.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider py-3 px-3">
                    Fecha
                  </th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider py-3 px-3">
                    Usuario
                  </th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider py-3 px-3">
                    Tipo
                  </th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider py-3 px-3">
                    Detalle
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {logsFiltrados.map((log: LogAuditoria) => {
                  const cfg = getTipoConfig(log.tipo);
                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-white/5 transition-colors duration-100"
                    >
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="text-sm text-slate-400 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-600" />
                          {formatDate(log.fecha)}
                        </span>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="text-sm text-slate-200 flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-600" />
                          {log.usuarioNombre}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <Badge variant={cfg.variant}>{cfg.label}</Badge>
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-sm text-slate-400 flex items-start gap-1.5">
                          <Info className="w-3.5 h-3.5 text-slate-600 shrink-0 mt-0.5" />
                          {log.detalle}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={<ShieldCheck className="w-6 h-6" />}
            title="No hay registros"
            description="No se encontraron logs con los filtros aplicados"
          />
        )}
      </Card>

      <p className="text-xs text-slate-500 mt-3">
        Los logs de auditoría registran todas las acciones relevantes del sistema para
        fines de seguridad y seguimiento.
      </p>
    </div>
  );
}
