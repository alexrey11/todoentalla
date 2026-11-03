import { type ReactNode } from 'react';
import { cn } from '@/utils/cn';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  icon?: ReactNode;
  className?: string;
}

export function PageHeader({ title, subtitle, actions, icon, className }: PageHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 py-4 border-b border-white/10',
        'md:flex-row md:items-center md:justify-between md:gap-4',
        className
      )}
    >
      <div className="flex items-center gap-3">
        {icon && (
          <div className="w-9 h-9 rounded-lg bg-slate-800 border border-white/10 flex items-center justify-center text-slate-300 shrink-0">
            {icon}
          </div>
        )}
        <div>
          <h1 className="text-xl md:text-2xl font-semibold text-white tracking-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-slate-400 mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  );
}
