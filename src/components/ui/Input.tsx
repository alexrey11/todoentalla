import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  error?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ leftIcon, rightIcon, error, className, ...props }, ref) => {
    return (
      <div className="relative flex items-center w-full">
        {leftIcon && (
          <span className="absolute left-3 text-slate-500 pointer-events-none">
            {leftIcon}
          </span>
        )}
        <input
          ref={ref}
          className={cn(
            'w-full h-10 rounded-lg bg-slate-900 border text-sm text-slate-100 placeholder:text-slate-500 transition-colors duration-150 focus:outline-none px-3 py-2',
            leftIcon && 'pl-9',
            rightIcon && 'pr-9',
            error
              ? 'border-red-500/50 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
              : 'border-white/10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20',
            className
          )}
          {...props}
        />
        {rightIcon && (
          <span className="absolute right-3 text-slate-500">{rightIcon}</span>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
