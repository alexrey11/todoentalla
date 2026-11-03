import { useEffect, useRef, useState } from 'react';
import { BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';
import { iniciarEscaneoOverlay, detenerEscaneo } from '../utils/scanner';

interface EscanerCamaraProps {
    onDetectado: (codigo: string) => void;
    onCancelar: () => void;
}

export default function EscanerCamara({ onDetectado, onCancelar }: EscanerCamaraProps) {
    const [error, setError] = useState<string | null>(null);
    const procesando = useRef(false);
    const onDetectadoRef = useRef(onDetectado);

    // Mantener la referencia actualizada sin re-ejecutar el useEffect
    useEffect(() => {
        onDetectadoRef.current = onDetectado;
    }, [onDetectado]);

    useEffect(() => {
        let listenerHandle: { remove: () => Promise<void> } | null = null;
        let cancelado = false;

        const arrancar = async () => {
            try {
                // Registrar listener ANTES de iniciar el escaneo
                listenerHandle = await BarcodeScanner.addListener('barcodesScanned', (event: any) => {
                    if (procesando.current) return;
                    if (!event.barcodes || event.barcodes.length === 0) return;

                    const codigo = event.barcodes[0].rawValue;
                    if (!codigo) return;

                    procesando.current = true;

                    if (navigator.vibrate) navigator.vibrate(60);

                    // Detener y notificar
                    (async () => {
                        try { await detenerEscaneo(); } catch { }
                        try { if (listenerHandle) await listenerHandle.remove(); } catch { }
                        if (!cancelado) {
                            onDetectadoRef.current(codigo);
                        }
                    })();
                });

                // Iniciar escaneo
                await iniciarEscaneoOverlay();
            } catch (e: any) {
                console.error('[EscanerCamara]', e);
                if (!cancelado) {
                    setError(e?.message || 'No se pudo abrir la cámara');
                }
            }
        };

        arrancar();

        // Cleanup al desmontar
        return () => {
            cancelado = true;
            (async () => {
                try { await detenerEscaneo(); } catch { }
                try { if (listenerHandle) await listenerHandle.remove(); } catch { }
            })();
        };
    }, []);

    const cancelar = async () => {
        try { await detenerEscaneo(); } catch { }
        onCancelar();
    };

    return (
        <div className="scanner-modal fixed inset-0 z-[9999] flex flex-col">
            {/* Marco oscuro alrededor del área de escaneo */}
            <div className="relative flex-1">
                {/* Esquinas del marco de escaneo */}
                <div className="absolute inset-0 flex items-center justify-center p-8">
                    <div className="relative h-64 w-full max-w-sm">
                        <div className="absolute -top-1 -left-1 h-8 w-8 rounded-tl-lg border-t-4 border-l-4 border-emerald-400" />
                        <div className="absolute -top-1 -right-1 h-8 w-8 rounded-tr-lg border-t-4 border-r-4 border-emerald-400" />
                        <div className="absolute -bottom-1 -left-1 h-8 w-8 rounded-bl-lg border-b-4 border-l-4 border-emerald-400" />
                        <div className="absolute -bottom-1 -right-1 h-8 w-8 rounded-br-lg border-b-4 border-r-4 border-emerald-400" />
                    </div>
                </div>

                {/* Header */}
                <div className="relative flex items-center justify-between p-4 pt-6">
                    <button
                        onClick={cancelar}
                        className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/20 bg-slate-900/80 text-xl font-black text-white backdrop-blur-sm transition-colors hover:bg-slate-900"
                        aria-label="Cancelar"
                    >
                        ✕
                    </button>
                    <div className="rounded-full border border-white/20 bg-slate-900/80 px-4 py-2 text-xs font-bold text-white backdrop-blur-sm">
                        📷 Apunta al código
                    </div>
                    <div className="w-11" />
                </div>
            </div>

            {/* Panel inferior */}
            <div className="bg-slate-900/95 p-5 pb-8 backdrop-blur-sm">
                {error ? (
                    <div className="rounded-xl border border-rose-400/30 bg-rose-500/15 p-3 text-center text-sm font-bold text-rose-200">
                        ⚠️ {error}
                    </div>
                ) : (
                    <>
                        <p className="mb-1 text-center text-sm font-bold text-gray-100">
                            Centra el código de barras en el recuadro
                        </p>
                        <p className="text-center text-xs text-gray-400">
                            El producto se agregará automáticamente al carrito
                        </p>
                    </>
                )}
            </div>
        </div>
    );
}