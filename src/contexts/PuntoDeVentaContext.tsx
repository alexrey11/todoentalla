import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { db } from '../db';
import type { PuntoDeVenta, Usuario } from '../db';

interface ContextoPDV {
    pdvActivo: PuntoDeVenta | null;
    pdvList: PuntoDeVenta[];
    modoTodos: boolean;
    cargando: boolean;
    cambiarPDV: (pdv: PuntoDeVenta | null) => void;
    activarModoTodos: () => void;
    recargarPDV: () => Promise<void>;
}

const Ctx = createContext<ContextoPDV | null>(null);

const LS_KEY_PDV = 'cc.pdv.activo';

interface ProviderProps {
    children: ReactNode;
    usuarioActual: Usuario | null;
}

export function PuntoDeVentaProvider({ children, usuarioActual }: ProviderProps) {
    const [pdvActivo, setPdvActivo] = useState<PuntoDeVenta | null>(null);
    const [pdvList, setPdvList] = useState<PuntoDeVenta[]>([]);
    const [modoTodos, setModoTodos] = useState(false);
    const [cargando, setCargando] = useState(true);

    const cargarPDV = useCallback(async (usuario: Usuario | null): Promise<PuntoDeVenta[]> => {
        setCargando(true);
        const todos = await db.puntosDeVenta.toArray();
        todos.sort((a, b) => {
            if (a.activo !== b.activo) return a.activo ? -1 : 1;
            return a.nombre.localeCompare(b.nombre);
        });

        let filtrados: PuntoDeVenta[];
        if (!usuario) {
            filtrados = [];
        } else if (usuario.rol === 'admin' || usuario.rol === 'jefe') {
            filtrados = todos;
        } else {
            const ids = usuario.puntosDeVentaIds || [];
            filtrados = todos.filter(p => ids.includes(p.id!));
        }

        setPdvList(filtrados);
        setCargando(false);
        return filtrados;
    }, []);

    useEffect(() => {
        (async () => {
            if (!usuarioActual) {
                setPdvActivo(null);
                setModoTodos(false);
                setPdvList([]);
                setCargando(false);
                return;
            }

            const lista = await cargarPDV(usuarioActual);
            const guardado = localStorage.getItem(LS_KEY_PDV);
            const puedeVerTodos = usuarioActual.rol === 'admin' || usuarioActual.rol === 'jefe';

            if (guardado === 'TODOS' && puedeVerTodos) {
                setModoTodos(true);
                setPdvActivo(null);
            } else if (guardado) {
                const pdv = lista.find(p => p.id === Number(guardado));
                if (pdv) {
                    setPdvActivo(pdv);
                    setModoTodos(false);
                } else if (lista.length > 0) {
                    setPdvActivo(lista[0]);
                    setModoTodos(false);
                } else {
                    setPdvActivo(null);
                    setModoTodos(false);
                }
            } else if (puedeVerTodos) {
                // Por defecto, los jefes ven "Todos"
                setModoTodos(true);
                setPdvActivo(null);
            } else if (lista.length >= 1) {
                // Vendedor: usar el primero disponible por defecto
                setPdvActivo(lista[0]);
                setModoTodos(false);
            } else {
                setPdvActivo(null);
                setModoTodos(false);
            }
        })();
    }, [usuarioActual, cargarPDV]);

    const cambiarPDV = useCallback((pdv: PuntoDeVenta | null) => {
        setPdvActivo(pdv);
        setModoTodos(false);
        if (pdv) {
            localStorage.setItem(LS_KEY_PDV, String(pdv.id));
            localStorage.removeItem('cc.pdv.todos');
        }
    }, []);

    const activarModoTodos = useCallback(() => {
        setPdvActivo(null);
        setModoTodos(true);
        localStorage.setItem(LS_KEY_PDV, 'TODOS');
        localStorage.setItem('cc.pdv.todos', '1');
    }, []);

    const recargarPDV = useCallback(async () => {
        if (!usuarioActual) return;
        const lista = await cargarPDV(usuarioActual);
        if (pdvActivo && !lista.find(p => p.id === pdvActivo.id)) {
            if (lista.length > 0) cambiarPDV(lista[0]);
            else setPdvActivo(null);
        }
    }, [usuarioActual, cargarPDV, pdvActivo, cambiarPDV]);

    return (
        <Ctx.Provider value={{
            pdvActivo,
            pdvList,
            modoTodos,
            cargando,
            cambiarPDV,
            activarModoTodos,
            recargarPDV,
        }}>
            {children}
        </Ctx.Provider>
    );
}

export function usePDV() {
    const ctx = useContext(Ctx);
    if (!ctx) {
        throw new Error('usePDV debe usarse dentro de PuntoDeVentaProvider');
    }
    return ctx;
}