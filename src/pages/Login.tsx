import { useState, useCallback, useEffect } from 'react';
import { Store, Delete, AlertCircle, HelpCircle, ArrowRight, ShieldCheck, Package, TrendingUp, Wallet } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { Usuario } from '@/types';

interface LoginProps {
  usuarios: Usuario[];
  onLogin: (usuario: Usuario) => void;
}

const MAX_PIN_LENGTH = 8;
const MIN_PIN_LENGTH = 4;

export function Login({ usuarios, onLogin }: LoginProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [shake, setShake] = useState(false);
  const [attempts, setAttempts] = useState(0);

  const handleDigit = useCallback((digit: string) => {
    setError('');
    setPin((prev) => (prev.length < MAX_PIN_LENGTH ? prev + digit : prev));
  }, []);

  const handleDelete = useCallback(() => {
    setError('');
    setPin((prev) => prev.slice(0, -1));
  }, []);

  const handleSubmit = useCallback(() => {
    if (pin.length < MIN_PIN_LENGTH) return;
    const user = usuarios.find((u) => u.pin === pin);
    if (user) {
      onLogin(user);
    } else {
      setAttempts((a) => a + 1);
      setError('PIN incorrecto. Inténtalo de nuevo.');
      setShake(true);
      setTimeout(() => setShake(false), 400);
      setTimeout(() => setPin(''), 400);
    }
  }, [pin, usuarios, onLogin]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') handleDigit(e.key);
      else if (e.key === 'Backspace') handleDelete();
      else if (e.key === 'Enter') handleSubmit();
    },
    [handleDigit, handleDelete, handleSubmit]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const canSubmit = pin.length >= MIN_PIN_LENGTH;

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Panel izquierdo — branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 border-r border-white/5 relative overflow-hidden">
        {/* Fondo decorativo sutil */}
        <div className="absolute inset-0 opacity-[0.015]" style={{
          backgroundImage: 'radial-gradient(circle at 25% 25%, white 1px, transparent 1px), radial-gradient(circle at 75% 75%, white 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }} />

        {/* Logo + nombre */}
        <div className="relative flex items-center gap-3 animate-fade-in">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
            <Store className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-white tracking-tight">TodoenTalla</h1>
            <p className="text-xs text-slate-500">Punto de Venta & Gestión</p>
          </div>
        </div>

        {/* Mensaje central */}
        <div className="relative max-w-md animate-slide-up">
          <h2 className="text-3xl font-semibold text-white tracking-tight leading-tight">
            Gestiona tu negocio con total control
          </h2>
          <p className="text-sm text-slate-400 mt-3 leading-relaxed">
            Ventas, inventario, fiados, caja y reportes en una sola aplicación.
            Funciona sin internet — tus datos siempre contigo.
          </p>

          {/* Features */}
          <div className="grid grid-cols-1 gap-3 mt-8">
            {[
              { icon: Package, text: 'Inventario en tiempo real con alertas de stock' },
              { icon: TrendingUp, text: 'Dashboard con ventas, ganancias y top productos' },
              { icon: Wallet, text: 'Cierre de caja con arqueo de denominaciones' },
            ].map((f, i) => {
              const Icon = f.icon;
              return (
                <div
                  key={i}
                  className="flex items-center gap-3 animate-slide-up"
                  style={{ animationDelay: `${i * 80 + 100}ms`, animationFillMode: 'both' }}
                >
                  <div className="w-9 h-9 rounded-lg bg-slate-900 border border-white/10 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-blue-400" />
                  </div>
                  <span className="text-sm text-slate-300">{f.text}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="relative flex items-center gap-2 text-xs text-slate-600">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Datos locales cifrados — 100% offline</span>
        </div>
      </div>

      {/* Panel derecho — login */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          {/* Logo móvil (visible solo en móvil) */}
          <div className="lg:hidden flex flex-col items-center mb-8 animate-fade-in">
            <div className="w-14 h-14 rounded-xl bg-blue-600 flex items-center justify-center mb-3">
              <Store className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-xl font-semibold text-white tracking-tight">TodoenTalla</h1>
            <p className="text-xs text-slate-500 mt-1">Punto de Venta & Gestión</p>
          </div>

          {/* Header */}
          <div className="mb-8 animate-fade-in">
            <h2 className="text-xl font-semibold text-white tracking-tight">Bienvenido</h2>
            <p className="text-sm text-slate-400 mt-1">Ingresa tu PIN para continuar</p>
          </div>

          {/* PIN dots */}
          <div
            className={cn(
              'flex items-center justify-center gap-2.5 mb-5 animate-slide-up',
              shake && 'shaking'
            )}
          >
            {Array.from({ length: MAX_PIN_LENGTH }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  'w-3 h-3 rounded-full border transition-all duration-200',
                  i < pin.length
                    ? error
                      ? 'bg-red-500 border-red-500 scale-110'
                      : 'bg-blue-500 border-blue-500 scale-110'
                    : error
                    ? 'border-red-500/30'
                    : 'border-white/15'
                )}
              />
            ))}
          </div>

          {/* Error message */}
          {error && (
            <div className="flex items-center justify-center gap-2 text-sm text-red-400 mb-4 animate-fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Numpad */}
          <div className="grid grid-cols-3 gap-2.5 animate-slide-up" style={{ animationDelay: '60ms', animationFillMode: 'both' }}>
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
              <button
                key={digit}
                onClick={() => handleDigit(digit)}
                className="h-14 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-lg font-semibold text-slate-100 transition-colors duration-150 active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30"
              >
                {digit}
              </button>
            ))}
            <button
              onClick={handleDelete}
              className="h-14 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-400 hover:text-slate-100 transition-colors duration-150 flex items-center justify-center active:scale-[0.97]"
            >
              <Delete className="w-5 h-5" />
            </button>
            <button
              onClick={() => handleDigit('0')}
              className="h-14 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-lg font-semibold text-slate-100 transition-colors duration-150 active:scale-[0.97]"
            >
              0
            </button>
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className={cn(
                'h-14 rounded-xl border text-sm font-semibold transition-all duration-150 flex items-center justify-center gap-1.5 active:scale-[0.97]',
                canSubmit
                  ? 'bg-blue-600 hover:bg-blue-700 border-blue-600 text-white'
                  : 'bg-slate-900 border-white/10 text-slate-600 cursor-not-allowed'
              )}
            >
              Entrar
              {canSubmit && <ArrowRight className="w-4 h-4" />}
            </button>
          </div>

          {/* Hint */}
          <div className="mt-6 text-center animate-fade-in" style={{ animationDelay: '120ms', animationFillMode: 'both' }}>
            <button
              onClick={() => setShowHint(!showHint)}
              className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors duration-150"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              ¿Olvidaste tu PIN?
            </button>
            {showHint && (
              <p className="text-xs text-slate-400 mt-2 animate-fade-in max-w-xs mx-auto">
                Contacta al administrador o jefe del punto de venta para restablecer tu PIN.
              </p>
            )}
          </div>

          {/* Demo PINs */}
          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-600 animate-fade-in" style={{ animationDelay: '200ms', animationFillMode: 'both' }}>
            <span>Demo:</span>
            <code className="px-1.5 py-0.5 rounded bg-slate-900 border border-white/5 text-slate-400">1234</code>
            <span>admin</span>
            <span class="text-slate-700">·</span>
            <code className="px-1.5 py-0.5 rounded bg-slate-900 border border-white/5 text-slate-400">5678</code>
            <span>vendedor</span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-10px); }
          40% { transform: translateX(10px); }
          60% { transform: translateX(-6px); }
          80% { transform: translateX(6px); }
        }
        .shaking { animation: shake 0.4s ease-in-out; }
      `}</style>
    </div>
  );
}
