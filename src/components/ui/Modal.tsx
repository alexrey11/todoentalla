import { type ReactNode, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
};

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 animate-fade-in"
        onClick={onClose}
      />
      <div
        className={cn(
          'relative w-full bg-slate-900 border border-white/10 rounded-xl shadow-sm animate-slide-up',
          sizeMap[size]
        )}
      >
        {(title || description) && (
          <div className="flex items-start justify-between p-4 md:p-6 border-b border-white/10">
            <div>
              {title && (
                <h2 className="text-lg font-semibold text-white">{title}</h2>
              )}
              {description && (
                <p className="text-sm text-slate-400 mt-1">{description}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-slate-500 hover:text-slate-100 transition-colors duration-150 p-1 -m-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
        <div className="p-4 md:p-6">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-3 p-4 md:p-6 border-t border-white/10">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
