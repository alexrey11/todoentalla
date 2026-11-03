import { useState } from 'react';
import {
  Tags,
  FileText,
  Package,
  Barcode,
  DollarSign,
  Box,
  Type,
  Check,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { Card, Button, Input, Select, Badge } from '@/components/ui';
import { PageHeader } from '@/layout/PageHeader';
import { formatCurrency } from '@/utils/format';
import { mockProductos } from '@/mockData';

type TamanoEtiqueta = 'small' | 'medium' | 'large';

interface ConfigEtiqueta {
  tamano: TamanoEtiqueta;
  incluirNombre: boolean;
  incluirPrecio: boolean;
  incluirCodigoBarras: boolean;
  incluirStock: boolean;
  cantidad: string;
  productoId: string;
}

const tamanoConfig: Record<
  TamanoEtiqueta,
  { label: string; dims: string; width: string; height: string }
> = {
  small: { label: 'Pequeña', dims: '30 x 20 mm', width: '120px', height: '72px' },
  medium: { label: 'Mediana', dims: '50 x 30 mm', width: '180px', height: '100px' },
  large: { label: 'Grande', dims: '70 x 40 mm', width: '240px', height: '130px' },
};

export function Etiquetas() {
  const [config, setConfig] = useState<ConfigEtiqueta>({
    tamano: 'medium',
    incluirNombre: true,
    incluirPrecio: true,
    incluirCodigoBarras: true,
    incluirStock: false,
    cantidad: '1',
    productoId: mockProductos[0]?.id ?? '',
  });

  const producto = mockProductos.find((p) => p.id === config.productoId);
  const tamano = tamanoConfig[config.tamano];
  const cantidadNum = parseInt(config.cantidad, 10) || 0;

  const toggle = (key: keyof ConfigEtiqueta) => {
    setConfig((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const camposSeleccionados = [
    config.incluirNombre,
    config.incluirPrecio,
    config.incluirCodigoBarras,
    config.incluirStock,
  ].filter(Boolean).length;

  const generarPDF = () => {
    // Simulacion de generacion de PDF
    console.log('Generando PDF:', { producto, config, cantidad: cantidadNum });
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Etiquetas"
        subtitle="Genera etiquetas con codigo de barras para tus productos"
        icon={<Tags className="w-5 h-5" />}
        actions={
          <Button
            size="sm"
            leftIcon={<FileText className="w-4 h-4" />}
            onClick={generarPDF}
            disabled={cantidadNum <= 0 || !producto}
          >
            Generar PDF
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        {/* Configuracion */}
        <div className="space-y-4">
          <Card>
            <h3 className="text-sm font-semibold text-white mb-4">
              Configuracion
            </h3>
            <div className="space-y-4">
              {/* Producto */}
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">
                  Producto
                </label>
                <Select
                  value={config.productoId}
                  onChange={(e) =>
                    setConfig({ ...config, productoId: e.target.value })
                  }
                >
                  {mockProductos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}
                    </option>
                  ))}
                </Select>
              </div>

              {/* Tamano */}
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">
                  Tamano de etiqueta
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(tamanoConfig) as TamanoEtiqueta[]).map(
                    (key) => (
                      <button
                        key={key}
                        onClick={() => setConfig({ ...config, tamano: key })}
                        className={cn(
                          'rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors duration-150 text-center',
                          config.tamano === key
                            ? 'border-blue-500 bg-blue-600/10 text-blue-400'
                            : 'border-white/10 bg-slate-900 text-slate-400 hover:border-white/20 hover:text-slate-200'
                        )}
                      >
                        {tamanoConfig[key].label}
                        <span className="block text-xs text-slate-500 mt-0.5">
                          {tamanoConfig[key].dims}
                        </span>
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Cantidad */}
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">
                  Cantidad de etiquetas
                </label>
                <Input
                  type="number"
                  value={config.cantidad}
                  onChange={(e) =>
                    setConfig({ ...config, cantidad: e.target.value })
                  }
                  placeholder="1"
                  className="tabular-nums"
                  min="1"
                />
              </div>
            </div>
          </Card>

          {/* Contenido */}
          <Card>
            <h3 className="text-sm font-semibold text-white mb-1">
              Contenido de la etiqueta
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Selecciona que informacion incluir
            </p>
            <div className="space-y-2">
              {[
                {
                  key: 'incluirNombre' as const,
                  label: 'Nombre del producto',
                  icon: Type,
                },
                {
                  key: 'incluirPrecio' as const,
                  label: 'Precio de venta',
                  icon: DollarSign,
                },
                {
                  key: 'incluirCodigoBarras' as const,
                  label: 'Codigo de barras',
                  icon: Barcode,
                },
                {
                  key: 'incluirStock' as const,
                  label: 'Stock actual',
                  icon: Box,
                },
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => toggle(key)}
                  className={cn(
                    'flex items-center gap-3 w-full rounded-lg border px-3 py-2.5 transition-colors duration-150',
                    config[key]
                      ? 'border-blue-500/30 bg-blue-600/5'
                      : 'border-white/10 bg-slate-900 hover:border-white/20'
                  )}
                >
                  <div
                    className={cn(
                      'w-8 h-8 rounded-lg flex items-center justify-center border',
                      config[key]
                        ? 'bg-blue-600/10 border-blue-500/20 text-blue-400'
                        : 'bg-slate-800 border-white/10 text-slate-500'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <span
                    className={cn(
                      'flex-1 text-left text-sm font-medium',
                      config[key] ? 'text-slate-100' : 'text-slate-400'
                    )}
                  >
                    {label}
                  </span>
                  <div
                    className={cn(
                      'w-5 h-5 rounded flex items-center justify-center border transition-colors duration-150',
                      config[key]
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'border-white/20 text-transparent'
                    )}
                  >
                    <Check className="w-3.5 h-3.5" />
                  </div>
                </button>
              ))}
            </div>
          </Card>
        </div>

        {/* Vista previa */}
        <div>
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white">
                Vista previa
              </h3>
              <Badge variant="info">{tamano.label}</Badge>
            </div>

            {/* Etiqueta preview */}
            <div className="flex flex-col items-center justify-center py-8 px-4 rounded-lg bg-slate-950 border border-white/5 min-h-[280px]">
              {producto ? (
                <div
                  className="rounded-lg bg-white border border-slate-200 flex flex-col items-center justify-center text-center p-2"
                  style={{
                    width: tamano.width,
                    height: tamano.height,
                  }}
                >
                  {config.incluirNombre && (
                    <p
                      className="text-slate-900 font-medium leading-tight truncate w-full"
                      style={{ fontSize: config.tamano === 'small' ? '8px' : config.tamano === 'medium' ? '10px' : '12px' }}
                    >
                      {producto.nombre}
                    </p>
                  )}
                  {config.incluirPrecio && (
                    <p
                      className="text-slate-900 font-bold leading-tight"
                      style={{ fontSize: config.tamano === 'small' ? '11px' : config.tamano === 'medium' ? '14px' : '18px' }}
                    >
                      {formatCurrency(producto.precioVenta)} CUP
                    </p>
                  )}
                  {config.incluirCodigoBarras && (
                    <div className="flex items-end justify-center gap-px h-6 mt-1">
                      {producto.codigoBarras
                        .split('')
                        .map((d, i) => (
                          <div
                            key={i}
                            className="bg-slate-900"
                            style={{
                              width: parseInt(d) > 4 ? '2px' : '1px',
                              height: `${60 + (parseInt(d) % 4) * 10}%`,
                            }}
                          />
                        ))}
                    </div>
                  )}
                  {config.incluirCodigoBarras && (
                    <p
                      className="text-slate-600 font-medium tabular-nums mt-0.5"
                      style={{ fontSize: config.tamano === 'small' ? '6px' : '7px' }}
                    >
                      {producto.codigoBarras}
                    </p>
                  )}
                  {config.incluirStock && (
                    <p
                      className="text-slate-500 mt-1"
                      style={{ fontSize: config.tamano === 'small' ? '7px' : config.tamano === 'medium' ? '8px' : '9px' }}
                    >
                      Stock: {producto.stockActual}
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center text-slate-600">
                  <Tags className="w-8 h-8 mb-2" />
                  <p className="text-sm">Selecciona un producto</p>
                </div>
              )}
            </div>

            {/* Resumen */}
            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="rounded-lg bg-slate-800/50 border border-white/5 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Package className="w-4 h-4 text-slate-500" />
                  <span className="text-xs text-slate-500">Producto</span>
                </div>
                <p className="text-xs font-medium text-slate-200 truncate">
                  {producto?.nombre ?? '—'}
                </p>
              </div>
              <div className="rounded-lg bg-slate-800/50 border border-white/5 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Tags className="w-4 h-4 text-slate-500" />
                  <span className="text-xs text-slate-500">Campos</span>
                </div>
                <p className="text-xs font-medium text-slate-200 tabular-nums">
                  {camposSeleccionados} / 4
                </p>
              </div>
              <div className="rounded-lg bg-slate-800/50 border border-white/5 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="w-4 h-4 text-slate-500" />
                  <span className="text-xs text-slate-500">Etiquetas</span>
                </div>
                <p className="text-xs font-medium text-slate-200 tabular-nums">
                  {cantidadNum}
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
