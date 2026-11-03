import type { ProductoMigracion } from '../db';

export type EstadoProyecto = 'borrador' | 'revisado' | 'entregado';
export type OrigenProyecto = 'excel' | 'manual' | 'pegado' | 'json-externo';

export interface JSONExportable {
    version: number;
    categorias?: { nombre: string; descripcion?: string }[];
    productos: ProductoMigracion[];
}

export const ESTADOS_PROYECTO: { id: EstadoProyecto; label: string; icon: string; color: string }[] = [
    { id: 'borrador', label: 'Borrador', icon: '🟡', color: 'amber' },
    { id: 'revisado', label: 'Revisado', icon: '🔵', color: 'blue' },
    { id: 'entregado', label: 'Entregado', icon: '✅', color: 'emerald' },
];

export const ORIGENES_PROYECTO: { id: OrigenProyecto; label: string; icon: string }[] = [
    { id: 'manual', label: 'Manual', icon: '✍️' },
    { id: 'pegado', label: 'Pegado', icon: '📋' },
    { id: 'excel', label: 'Excel', icon: '📊' },
    { id: 'json-externo', label: 'JSON externo', icon: '📄' },
];