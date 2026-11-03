import { forwardRef, type SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ error, className, children, ...props }, ref) => {
    return (
      <div className="relative flex items-center w-full">
        <select
          ref={ref}
          className={cn(
            'w-full h-10 rounded-lg bg-slate-900 border text-sm text-slate-100 transition-colors duration-150 focus:outline-none px-3 py-2 appearance-none pr-9 cursor-pointer',
            error
              ? 'border-red-500/50 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
              : 'border-white/10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20',
            className
          )}
          {...props}
        >
          {children}
        </select>
        <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3 pointer-events-none" />
      </div>
    );
  }
);

Select.displayName = 'Select';
