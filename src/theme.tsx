// src/theme.ts
// Tokens de estilo compatibles con el diseño de Bolt.
// Los usan las pantallas heredadas de CuentaClara que aún no han sido rediseñadas.
// Cuando se rediseñen, este archivo puede eliminarse.

import type { ReactNode } from 'react';
import { cn } from './utils/cn';

// ===== ANIMACIONES =====
export const STYLES = `
  @keyframes fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes slide-up {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .animate-fade-in { animation: fade-in 0.2s ease-out; }
  .animate-slide-up { animation: slide-up 0.25s ease-out; }
`;

// ===== LAYOUT =====
export const pageWrap = 'min-h-screen';

export const BackgroundBlobs = (): ReactNode => null;

// ===== CARDS =====
export const card = 'bg-slate-900 border border-white/10 rounded-xl';
export const cardPadded = 'bg-slate-900 border border-white/10 rounded-xl p-4 md:p-6';

// ===== TEXTOS =====
export const titleGradient = 'text-white font-semibold tracking-tight';
export const sectionTitle = 'text-base font-semibold text-white';

// ===== INPUTS =====
export const input =
    'w-full h-10 rounded-lg bg-slate-900 border border-white/10 text-sm text-slate-100 placeholder:text-slate-500 px-3 py-2 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors duration-150';

export const label = 'text-xs font-medium text-slate-400 mb-1.5 block';

// ===== BOTONES =====
export const btnSecondary =
    'inline-flex items-center justify-center h-10 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 border border-white/10 text-sm font-medium text-slate-100 transition-colors duration-150';

// ===== MODALES =====
export const modalOverlay = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60';
export const modalPanel = 'relative w-full max-w-lg bg-slate-900 border border-white/10 rounded-xl shadow-sm animate-slide-up';
export const modalTitle = 'text-lg font-semibold text-white';
export const modalClose = 'text-slate-500 hover:text-slate-100 transition-colors duration-150 p-1 text-xl leading-none';

// ===== COMPONENTES =====
export function EmptyState({ icon = '📦', texto = 'No hay datos' }: { icon?: string; texto?: string }) {
    return (
        <div className= "flex flex-col items-center justify-center py-12 text-center" >
        <div className="text-4xl mb-3 opacity-40" > { icon } </div>
            < p className = "text-sm text-slate-400" > { texto } </p>
                </div>
  );
}

export function MetricCard({
    icon,
    label,
    value,
    sub,
    tile,
}: {
    icon: string;
    label: string;
    value: string;
    sub?: string;
    tile?: string;
}) {
    return (
        <div className= { cardPadded } >
        <div className="flex items-start justify-between mb-3" >
            <div className="w-9 h-9 rounded-lg bg-slate-800 border border-white/10 flex items-center justify-center text-lg" >
                { icon }
                </div>
                </div>
                < p className = "text-xl font-semibold text-white tabular-nums" > { value } </p>
                    < p className = "text-sm text-slate-400 mt-1" > { label } </p>
    { sub && <p className="text-xs text-slate-500 mt-0.5" > { sub } </p> }
    </div>
  );
}

export function filterPill(activo: boolean): string {
    return cn(
        'inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium transition-colors duration-150',
        activo
            ? 'bg-blue-600 text-white'
            : 'bg-slate-900 border border-white/10 text-slate-400 hover:text-slate-100'
    );
}