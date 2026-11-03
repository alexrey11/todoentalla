import { useState } from 'react';
import type { Venta } from '../db';
import { imprimirTicket, generarHTMLTicket, imprimirConRawBT } from '../utils/impresion';
import { Capacitor } from '@capacitor/core';
import {
    modalOverlay, modalPanel, modalTitle, modalClose,
} from '../theme';

interface TicketPreviewProps {
    venta: Venta;
    nombreNegocio?: string;
    direccionNegocio?: string;
    telefonoNegocio?: string;
    onCerrar: () => void;
}

export default function TicketPreview({
    venta,
    nombreNegocio,
    direccionNegocio,
    telefonoNegocio,
    onCerrar,
}: TicketPreviewProps) {
    const [copiado, setCopiado] = useState(false);
    const esAndroid = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

    const datos = { venta, nombreNegocio, direccionNegocio, telefonoNegocio };
    const html = generarHTMLTicket(datos);

    const handleImprimir = () => {
        imprimirTicket(datos);
    };

    const handleRawBT = () => {
        try {
            imprimirConRawBT(datos);
        } catch (e) {
            console.error(e);
            alert('No se pudo abrir RawBT. ¿Lo tienes instalado?');
        }
    };

    const handleCopiar = async () => {
        try {
            // Copiar como texto plano
            const texto = html
                .replace(/<style[\s\S]*?<\/style>/gi, '')
                .replace(/<[^>]*>/g, '')
                .replace(/\n\s*\n/g, '\n')
                .trim();
            await navigator.clipboard.writeText(texto);
            setCopiado(true);
            setTimeout(() => setCopiado(false), 1800);
        } catch {
            alert('No se pudo copiar');
        }
    };

    return (
        <div className={modalOverlay}>
            <div className={`${modalPanel} md:max-w-md`}>
                <div className="flex items-center justify-between bg-gradient-to-r from-slate-700 to-slate-900 px-4 py-3 md:px-6 md:py-4">
                    <h2 className={modalTitle}>🧾 Ticket de venta</h2>
                    <button onClick={onCerrar} className={modalClose}>&times;</button>
                </div>

                <div className="p-4 md:p-6">
                    {/* Preview del ticket */}
                    <div className="mb-4 rounded-xl border border-white/10 bg-white p-4 text-black">
                        <iframe
                            srcDoc={html}
                            title="Preview del ticket"
                            className="h-96 w-full border-0 bg-white"
                            sandbox="allow-same-origin"
                        />
                    </div>

                    {/* Botones de impresión */}
                    <div className="space-y-2">
                        <button
                            onClick={handleImprimir}
                            className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-3 text-base font-bold text-white shadow-md shadow-blue-500/25 transition-transform hover:-translate-y-0.5"
                        >
                            🖨️ Imprimir
                        </button>

                        {esAndroid && (
                            <button
                                onClick={handleRawBT}
                                className="w-full rounded-xl border border-emerald-400/30 bg-emerald-500/10 py-3 text-sm font-bold text-emerald-300 transition-colors hover:bg-emerald-500/20"
                            >
                                📱 Imprimir con RawBT (Bluetooth)
                            </button>
                        )}

                        <button
                            onClick={handleCopiar}
                            className="w-full rounded-xl border border-white/10 bg-slate-800/60 py-3 text-sm font-bold text-gray-300 transition-colors hover:bg-slate-800"
                        >
                            {copiado ? '✅ ¡Copiado!' : '📋 Copiar ticket como texto'}
                        </button>
                    </div>

                    {esAndroid && (
                        <p className="mt-3 text-center text-[11px] leading-relaxed text-gray-500">
                            💡 Para impresora térmica Bluetooth, instala <strong className="text-gray-300">RawBT</strong> desde Play Store y configura tu impresora ahí.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}