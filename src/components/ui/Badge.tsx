import { type HTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

type BadgeVariant = 'default' | 'success' | 'danger' | 'warning' | 'info';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  dot?: boolean;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-slate-800 text-slate-300 border-white/10',
  success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  danger: 'bg-red-500/10 text-red-400 border-red-500/20',
  warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  info: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
};

const dotColor: Record<BadgeVariant, string> = {
  default: 'bg-slate-400',
  success: 'bg-emerald-400',
  danger: 'bg-red-400',
  warning: 'bg-amber-400',
  info: 'bg-blue-400',
};

export function Badge({
  variant = 'default',
  dot,
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium',
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {dot && (
        <span className={cn('w-1.5 h-1.5 rounded-full', dotColor[variant])} />
      )}
      {children}
    </span>
  );
}
