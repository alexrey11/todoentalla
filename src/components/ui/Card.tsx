import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
  padding?: 'sm' | 'md' | 'lg';
}

const paddingMap = {
  sm: 'p-4',
  md: 'p-4 md:p-6',
  lg: 'p-6 md:p-8',
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ hoverable, padding = 'md', className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'bg-slate-900 border border-white/10 rounded-xl',
          paddingMap[padding],
          hoverable &&
            'cursor-pointer transition-colors duration-150 hover:border-white/20',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';
