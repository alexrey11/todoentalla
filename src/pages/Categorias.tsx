import { useState, useEffect, useMemo, useRef } from 'react';
import {
  FolderTree,
  Plus,
  Pencil,
  Trash2,
  ArrowLeft,
  Package,
  Search,
  Check,
  AlertCircle,
  Layers,
  Tag,
  DollarSign,
  TrendingDown,
  Image as ImageIcon,
  X,
  Barcode,
  Calendar,
  Store,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { Card, Button, Badge, Input, Select, Modal, EmptyState } from '@/components/ui';
import { PageHeader } from '@/layout/PageHeader';
import { formatCurrency } from '@/utils/format';
import { db, stockTotalProducto } from '@/db';
import type { Categoria, Producto } from '@/db';
import { usePDV } from '@/contexts/PuntoDeVentaContext';
import { toast } from '@/utils/toast';
import { registrarLog } from '@/utils/logger';

type UnidadMedida = 'unidad' | 'kg' | 'lb' | 'litro' | 'docena' | 'metro';

export function Categorias() {
  const { pdvActivo } = usePDV();

  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [cargando, setCargando] = useState(true);

  const [vista, setVista] = useState<'grid' | 'productos'>('grid');
  const [categoriaActiva, setCategoriaActiva] = useState<Categoria | null>(null);
  const [search, setSearch] = useState('');

  // Modal categoría
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [deleteCatId, setDeleteCatId] = useState<number | null>(null);
  const [form, setForm] = useState({ nombre: '', descripcion: '' });
  const [guardando, setGuardando] = useState(false);

  // Modal producto
  const [modalProdOpen, setModalProdOpen] = useState(false);
  const [editProdId, setEditProdId] = useState<number | null>(null);
  const [deleteProdId, setDeleteProdId] = useState<number | null>(null);
  const [guardandoProd, setGuardandoProd] = useState(false);
  const [prodForm, setProdForm] = useState({
    nombre: '',
    precioCompra: '',
    precioVenta: '',
    stockActual: '',
    stockMinimo: '',
    unidadMedida: 'unidad' as UnidadMedida,
    codigoBarras: '',
    fechaVencimiento: '',
    imagen: '' as string | undefined,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ===== CARGA DESDE DEXIE =====
  const recargar = async () => {
    if (!pdvActivo?.id) {
      setCategorias([]);
      setProductos([]);
      return;
    }
    try {
      const [cats, prods] = await Promise.all([
        db.categorias.where('puntoDeVentaId').equals(pdvActivo.id).toArray(),
        db.productos.where('puntoDeVentaId').equals(pdvActivo.id).toArray(),
      ]);
      setCategorias(cats.sort((a, b) => a.nombre.localeCompare(b.nombre)));
      setProductos(prods);
    } catch (e) {
      console.error('[categorias] Error recargando:', e);
      toast.error('Error al cargar datos');
    }
  };

  useEffect(() => {
    setCargando(true);
    recargar().finally(() => setCargando(false));
  }, [pdvActivo?.id]);

  // Cuando se recargan productos, si una categoría activa ya no existe, volver al grid
  useEffect(() => {
    if (categoriaActiva && vista === 'productos') {
      const existe = categorias.find((c) => c.id === categoriaActiva.id);
      if (!existe) {
        setVista('grid');
        setCategoriaActiva(null);
      } else if (existe !== categoriaActiva) {
        setCategoriaActiva(existe);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categorias]);

  // ===== HELPERS =====
  const productosDeCategoria = (catId: number): Producto[] =>
    productos.filter((p) => p.categoriaId === catId);

  const productosFiltrados = useMemo(() => {
    if (!categoriaActiva) return [];
    let lista = productosDeCategoria(categoriaActiva.id!);
    if (search.trim()) {
      const q = search.toLowerCase();
      lista = lista.filter(
        (p) =>
          p.nombre.toLowerCase().includes(q) ||
          (p.codigoBarras && p.codigoBarras.includes(q))
      );
    }
    return lista;
  }, [categoriaActiva, search, productos]);

  const valorInventario = (catId: number) =>
    productosDeCategoria(catId).reduce(
      (s, p) => s + p.precioVenta * stockTotalProducto(p),
      0
    );

  // ===== CRUD CATEGORÍA =====
  const abrirNuevo = () => {
    setEditId(null);
    setForm({ nombre: '', descripcion: '' });
    setModalOpen(true);
  };

  const abrirEditar = (cat: Categoria) => {
    setEditId(cat.id!);
    setForm({ nombre: cat.nombre, descripcion: cat.descripcion ?? '' });
    setModalOpen(true);
  };

  const guardar = async () => {
    if (!form.nombre.trim() || !pdvActivo?.id) return;
    setGuardando(true);
    try {
      if (editId) {
        await db.categorias.update(editId, {
          nombre: form.nombre.trim(),
          descripcion: form.descripcion.trim(),
        });
        await registrarLog('categoria_editada', `Categoría editada: ${form.nombre}`, {
          detalles: `ID: ${editId}`,
        });
        toast.ok('Categoría actualizada', form.nombre);
      } else {
        await db.categorias.add({
          puntoDeVentaId: pdvActivo.id,
          nombre: form.nombre.trim(),
          descripcion: form.descripcion.trim(),
          creadoEn: new Date(),
        });
        await registrarLog('categoria_creada', `Categoría creada: ${form.nombre}`, {
          detalles: `PDV: ${pdvActivo.nombre}`,
        });
        toast.ok('Categoría creada', form.nombre);
      }
      await recargar();
      setModalOpen(false);
    } catch (e: any) {
      console.error('[categorias] Error guardando:', e);
      toast.error('Error al guardar', e?.message);
    } finally {
      setGuardando(false);
    }
  };

  const eliminarCategoria = async () => {
    if (!deleteCatId) return;
    try {
      const prods = productosDeCategoria(deleteCatId);
      const cat = categorias.find((c) => c.id === deleteCatId);

      // Eliminar productos asociados
      if (prods.length > 0) {
        await Promise.all(prods.map((p) => db.productos.delete(p.id!)));
      }
      await db.categorias.delete(deleteCatId);

      await registrarLog('categoria_eliminada', `Categoría eliminada: ${cat?.nombre ?? 'N/A'}`, {
        detalles: `${prods.length} productos eliminados`,
      });
      toast.ok(
        'Categoría eliminada',
        prods.length > 0 ? `${prods.length} producto${prods.length !== 1 ? 's' : ''} también` : undefined
      );

      // Si era la categoría activa, volver al grid
      if (categoriaActiva?.id === deleteCatId) {
        setVista('grid');
        setCategoriaActiva(null);
      }

      await recargar();
      setDeleteCatId(null);
    } catch (e: any) {
      console.error('[categorias] Error eliminando:', e);
      toast.error('Error al eliminar', e?.message);
    }
  };

  // ===== CRUD PRODUCTO =====
  const abrirNuevoProd = () => {
    setEditProdId(null);
    setProdForm({
      nombre: '',
      precioCompra: '',
      precioVenta: '',
      stockActual: '',
      stockMinimo: '',
      unidadMedida: 'unidad',
      codigoBarras: '',
      fechaVencimiento: '',
      imagen: undefined,
    });
    setModalProdOpen(true);
  };

  const abrirEditarProd = (prod: Producto) => {
    setEditProdId(prod.id!);
    setProdForm({
      nombre: prod.nombre,
      precioCompra: String(prod.precioCompra ?? 0),
      precioVenta: String(prod.precioVenta ?? 0),
      stockActual: String(prod.stockActual ?? 0),
      stockMinimo: String(prod.stockMinimo ?? 0),
      unidadMedida: ((prod.unidadMedida ?? 'unidad') as UnidadMedida),
      codigoBarras: prod.codigoBarras ?? '',
      fechaVencimiento: prod.fechaVencimiento
        ? new Date(prod.fechaVencimiento).toISOString().split('T')[0]
        : '',
      imagen: prod.imagen,
    });
    setModalProdOpen(true);
  };

  const permiteDecimales = (u: UnidadMedida) =>
    ['kg', 'lb', 'litro', 'metro'].includes(u);

  const guardarProd = async () => {
    if (!prodForm.nombre.trim() || !categoriaActiva || !pdvActivo?.id) return;
    setGuardandoProd(true);
    try {
      const parseStock = permiteDecimales(prodForm.unidadMedida)
        ? parseFloat
        : (v: string) => parseInt(v) || 0;
      const stock = parseStock(prodForm.stockActual);
      const stockMin = parseStock(prodForm.stockMinimo);

      if (editProdId) {
        const prodOriginal = productos.find((p) => p.id === editProdId);
        if (!prodOriginal) {
          toast.error('Producto no encontrado');
          return;
        }

        await db.productos.update(editProdId, {
          nombre: prodForm.nombre.trim(),
          precioCompra: parseFloat(prodForm.precioCompra) || 0,
          precioVenta: parseFloat(prodForm.precioVenta) || 0,
          stockActual: prodOriginal.tieneVariantes ? prodOriginal.stockActual : (isNaN(stock) ? 0 : stock),
          stockMinimo: isNaN(stockMin) ? 0 : stockMin,
          unidadMedida: prodForm.unidadMedida,
          codigoBarras: prodForm.codigoBarras.trim() || undefined,
          fechaVencimiento: prodForm.fechaVencimiento
            ? new Date(prodForm.fechaVencimiento)
            : undefined,
          imagen: prodForm.imagen,
        });
        await registrarLog('producto_editado', `Producto editado: ${prodForm.nombre}`, {
          detalles: `Categoría: ${categoriaActiva.nombre}`,
        });
        toast.ok('Producto actualizado', prodForm.nombre);
      } else {
        await db.productos.add({
          puntoDeVentaId: pdvActivo.id,
          categoriaId: categoriaActiva.id!,
          nombre: prodForm.nombre.trim(),
          precioCompra: parseFloat(prodForm.precioCompra) || 0,
          precioVenta: parseFloat(prodForm.precioVenta) || 0,
          stockActual: isNaN(stock) ? 0 : stock,
          stockMinimo: isNaN(stockMin) ? 0 : stockMin,
          unidadMedida: prodForm.unidadMedida,
          codigoBarras: prodForm.codigoBarras.trim() || undefined,
          fechaCreacion: new Date(),
          fechaVencimiento: prodForm.fechaVencimiento
            ? new Date(prodForm.fechaVencimiento)
            : undefined,
          imagen: prodForm.imagen,
          variantes: [],
          esCompuesto: false,
          componentes: [],
        });
        await registrarLog('producto_creado', `Producto creado: ${prodForm.nombre}`, {
          detalles: `Categoría: ${categoriaActiva.nombre}`,
        });
        toast.ok('Producto creado', prodForm.nombre);
      }
      await recargar();
      setModalProdOpen(false);
    } catch (e: any) {
      console.error('[categorias] Error guardando producto:', e);
      toast.error('Error al guardar', e?.message);
    } finally {
      setGuardandoProd(false);
    }
  };

  const eliminarProducto = async () => {
    if (!deleteProdId) return;
    try {
      const prod = productos.find((p) => p.id === deleteProdId);
      await db.productos.delete(deleteProdId);
      await registrarLog('producto_eliminado', `Producto eliminado: ${prod?.nombre ?? 'N/A'}`, {
        detalles: `Stock: ${prod?.stockActual ?? 0}`,
      });
      toast.ok('Producto eliminado');
      await recargar();
      setDeleteProdId(null);
    } catch (e: any) {
      console.error('[categorias] Error eliminando producto:', e);
      toast.error('Error al eliminar', e?.message);
    }
  };

  const handleImagenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Imagen muy grande', 'Máximo 2 MB');
      if (e.target) e.target.value = '';
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Formato no válido', 'Usa JPG, PNG o WEBP');
      if (e.target) e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setProdForm((prev) => ({ ...prev, imagen: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const quitarImagen = () => {
    setProdForm((prev) => ({ ...prev, imagen: undefined }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ===== RENDER: SIN PDV =====
  if (!pdvActivo) {
    return (
      <div className="animate-fade-in">
        <PageHeader
          title="Categorías"
          subtitle="Selecciona un punto de venta"
          icon={<FolderTree className="w-5 h-5" />}
        />
        <Card className="mt-4">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-xl bg-slate-800 border border-white/10 flex items-center justify-center mb-4">
              <Store className="w-8 h-8 text-slate-500" />
            </div>
            <h3 className="text-base font-semibold text-slate-100">Sin punto de venta</h3>
            <p className="text-sm text-slate-400 mt-1 max-w-sm">
              Selecciona un punto de venta en el sidebar para gestionar sus categorías.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  // ===== RENDER: CARGANDO =====
  if (cargando) {
    return (
      <div className="animate-fade-in">
        <PageHeader
          title="Categorías"
          subtitle={pdvActivo.nombre.replace(/^[^\s]+\s/, '')}
          icon={<FolderTree className="w-5 h-5" />}
        />
        <Card className="mt-4">
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 animate-spin rounded-full border-2 border-blue-500/30 border-t-blue-500" />
          </div>
        </Card>
      </div>
    );
  }

  // ===== VISTA PRODUCTOS DE CATEGORÍA =====
  if (vista === 'productos' && categoriaActiva) {
    const prods = productosFiltrados;
    const stockBajoCount = prods.filter(
      (p) => stockTotalProducto(p) <= p.stockMinimo
    ).length;
    const precioPromedio =
      prods.length > 0
        ? prods.reduce((s, p) => s + p.precioVenta, 0) / prods.length
        : 0;

    return (
      <div className="animate-fade-in">
        <PageHeader
          title={categoriaActiva.nombre}
          subtitle={`${prods.length} producto${prods.length !== 1 ? 's' : ''}${categoriaActiva.descripcion ? ` · ${categoriaActiva.descripcion}` : ''
            }`}
          icon={<FolderTree className="w-5 h-5" />}
          actions={
            <>
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<ArrowLeft className="w-4 h-4" />}
                onClick={() => {
                  setVista('grid');
                  setCategoriaActiva(null);
                  setSearch('');
                }}
              >
                Volver
              </Button>
              <Button
                size="sm"
                leftIcon={<Plus className="w-4 h-4" />}
                onClick={abrirNuevoProd}
              >
                Agregar producto
              </Button>
            </>
          }
        />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          <Card>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-lg bg-slate-800 border border-white/10 flex items-center justify-center">
                <Package className="w-5 h-5 text-slate-400" />
              </div>
              <span className="text-xs text-slate-400">Productos</span>
            </div>
            <p className="text-xl font-semibold text-white tabular-nums">{prods.length}</p>
          </Card>
          <Card>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-lg bg-slate-800 border border-white/10 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-slate-400" />
              </div>
              <span className="text-xs text-slate-400">Valor inventario</span>
            </div>
            <p className="text-xl font-semibold text-white tabular-nums">
              {formatCurrency(valorInventario(categoriaActiva.id!))}
            </p>
          </Card>
          <Card>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-lg bg-slate-800 border border-white/10 flex items-center justify-center">
                <Tag className="w-5 h-5 text-slate-400" />
              </div>
              <span className="text-xs text-slate-400">Precio promedio</span>
            </div>
            <p className="text-xl font-semibold text-white tabular-nums">
              {formatCurrency(Math.round(precioPromedio))}
            </p>
          </Card>
          <Card>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-lg bg-slate-800 border border-white/10 flex items-center justify-center">
                <TrendingDown className="w-5 h-5 text-amber-400" />
              </div>
              <span className="text-xs text-slate-400">Stock bajo</span>
            </div>
            <p className="text-xl font-semibold text-white tabular-nums">{stockBajoCount}</p>
          </Card>
        </div>

        <div className="mt-4">
          <Input
            type="text"
            placeholder="Buscar producto en esta categoría..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>

        {prods.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mt-4">
            {prods.map((p) => {
              const stockTotal = stockTotalProducto(p);
              const sinStock = stockTotal <= 0;
              const stockBajo = stockTotal <= p.stockMinimo;
              return (
                <Card key={p.id} padding="sm" className="group flex flex-col">
                  <div className="relative w-full aspect-square rounded-lg bg-slate-800 border border-white/5 overflow-hidden mb-3">
                    {p.imagen ? (
                      <img
                        src={p.imagen}
                        alt={p.nombre}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-8 h-8 text-slate-600" />
                      </div>
                    )}
                    <div className="absolute top-2 right-2 flex items-center gap-1">
                      <button
                        onClick={() => abrirEditarProd(p)}
                        className="w-7 h-7 rounded-md bg-slate-900/80 border border-white/10 flex items-center justify-center text-slate-400 hover:text-slate-100 transition-colors duration-150"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteProdId(p.id!)}
                        className="w-7 h-7 rounded-md bg-slate-900/80 border border-white/10 flex items-center justify-center text-slate-400 hover:text-red-400 transition-colors duration-150"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {sinStock ? (
                      <div className="absolute bottom-2 left-2">
                        <Badge variant="danger">Sin stock</Badge>
                      </div>
                    ) : stockBajo ? (
                      <div className="absolute bottom-2 left-2">
                        <Badge variant="warning" dot>Bajo</Badge>
                      </div>
                    ) : null}
                  </div>

                  <p className="text-sm font-medium text-slate-100 leading-snug line-clamp-2 mb-1">
                    {p.nombre}
                  </p>
                  <p className="text-base font-semibold text-white tabular-nums">
                    {formatCurrency(p.precioVenta)}
                  </p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-slate-500 tabular-nums">
                      Stock: {stockTotal}
                    </span>
                    <span className="text-xs text-slate-600 capitalize">
                      {p.unidadMedida ?? 'unidad'}
                    </span>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="mt-4">
            <EmptyState
              icon={<Package className="w-6 h-6" />}
              title={search ? 'Sin resultados' : 'No hay productos'}
              description={
                search
                  ? `No se encontraron productos con "${search}"`
                  : 'Agrega tu primer producto a esta categoría'
              }
              action={
                !search && (
                  <Button
                    leftIcon={<Plus className="w-4 h-4" />}
                    onClick={abrirNuevoProd}
                  >
                    Agregar producto
                  </Button>
                )
              }
            />
          </Card>
        )}

        {/* Modal crear/editar producto */}
        <Modal
          open={modalProdOpen}
          onClose={() => !guardandoProd && setModalProdOpen(false)}
          title={editProdId ? 'Editar producto' : 'Nuevo producto'}
          description={categoriaActiva.nombre}
          size="lg"
          footer={
            <>
              <Button
                variant="ghost"
                onClick={() => setModalProdOpen(false)}
                disabled={guardandoProd}
              >
                Cancelar
              </Button>
              <Button
                onClick={guardarProd}
                disabled={!prodForm.nombre.trim() || guardandoProd}
                leftIcon={!guardandoProd && <Check className="w-4 h-4" />}
                loading={guardandoProd}
              >
                {editProdId ? 'Guardar' : 'Crear producto'}
              </Button>
            </>
          }
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Imagen */}
            <div className="sm:col-span-1">
              <label className="text-xs text-slate-400 mb-1.5 block">
                Imagen del producto
              </label>
              <div className="relative w-full aspect-square rounded-lg bg-slate-800 border border-white/10 overflow-hidden">
                {prodForm.imagen ? (
                  <>
                    <img
                      src={prodForm.imagen}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={quitarImagen}
                      className="absolute top-2 right-2 w-7 h-7 rounded-md bg-slate-900/80 border border-white/10 flex items-center justify-center text-slate-400 hover:text-red-400 transition-colors duration-150"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute bottom-2 left-2 text-xs text-blue-400 hover:text-blue-300 transition-colors duration-150 bg-slate-900/80 rounded px-2 py-1"
                    >
                      Cambiar
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-full flex flex-col items-center justify-center gap-2 text-slate-500 hover:text-slate-300 transition-colors duration-150"
                  >
                    <ImageIcon className="w-8 h-8" />
                    <span className="text-xs">Subir imagen</span>
                    <span className="text-xs text-slate-600">JPG, PNG (max 2MB)</span>
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImagenChange}
                  className="hidden"
                />
              </div>
            </div>

            {/* Datos */}
            <div className="sm:col-span-2 space-y-3">
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">Nombre</label>
                <Input
                  value={prodForm.nombre}
                  onChange={(e) =>
                    setProdForm({ ...prodForm, nombre: e.target.value })
                  }
                  placeholder="Ej: Coca-Cola 1.5L"
                  leftIcon={<Package className="w-4 h-4" />}
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">
                    Precio compra
                  </label>
                  <Input
                    type="number"
                    value={prodForm.precioCompra}
                    onChange={(e) =>
                      setProdForm({ ...prodForm, precioCompra: e.target.value })
                    }
                    placeholder="0"
                    className="tabular-nums"
                    leftIcon={<DollarSign className="w-4 h-4" />}
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">
                    Precio venta
                  </label>
                  <Input
                    type="number"
                    value={prodForm.precioVenta}
                    onChange={(e) =>
                      setProdForm({ ...prodForm, precioVenta: e.target.value })
                    }
                    placeholder="0"
                    className="tabular-nums"
                    leftIcon={<DollarSign className="w-4 h-4" />}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">
                    Stock actual
                  </label>
                  <Input
                    type="number"
                    step={permiteDecimales(prodForm.unidadMedida) ? '0.01' : '1'}
                    value={prodForm.stockActual}
                    onChange={(e) =>
                      setProdForm({ ...prodForm, stockActual: e.target.value })
                    }
                    placeholder="0"
                    className="tabular-nums"
                    disabled={editProdId !== null && productos.find((p) => p.id === editProdId)?.tieneVariantes}
                  />
                  {editProdId !== null &&
                    productos.find((p) => p.id === editProdId)?.tieneVariantes && (
                      <p className="text-xs text-amber-400 mt-1">
                        Stock gestionado por variantes
                      </p>
                    )}
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">
                    Stock mínimo
                  </label>
                  <Input
                    type="number"
                    step={permiteDecimales(prodForm.unidadMedida) ? '0.01' : '1'}
                    value={prodForm.stockMinimo}
                    onChange={(e) =>
                      setProdForm({ ...prodForm, stockMinimo: e.target.value })
                    }
                    placeholder="0"
                    className="tabular-nums"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">
                    Unidad de medida
                  </label>
                  <Select
                    value={prodForm.unidadMedida}
                    onChange={(e) =>
                      setProdForm({
                        ...prodForm,
                        unidadMedida: e.target.value as UnidadMedida,
                      })
                    }
                  >
                    <option value="unidad">Unidad</option>
                    <option value="kg">Kilogramo (kg)</option>
                    <option value="lb">Libra (lb)</option>
                    <option value="litro">Litro</option>
                    <option value="docena">Docena</option>
                    <option value="metro">Metro</option>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">
                    Código de barras
                  </label>
                  <Input
                    value={prodForm.codigoBarras}
                    onChange={(e) =>
                      setProdForm({ ...prodForm, codigoBarras: e.target.value })
                    }
                    placeholder="7501234567890"
                    leftIcon={<Barcode className="w-4 h-4" />}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">
                  Fecha de vencimiento (opcional)
                </label>
                <Input
                  type="date"
                  value={prodForm.fechaVencimiento}
                  onChange={(e) =>
                    setProdForm({ ...prodForm, fechaVencimiento: e.target.value })
                  }
                  leftIcon={<Calendar className="w-4 h-4" />}
                />
              </div>
            </div>
          </div>
        </Modal>

        {/* Modal eliminar producto */}
        <Modal
          open={deleteProdId !== null}
          onClose={() => setDeleteProdId(null)}
          title="Eliminar producto"
          size="sm"
          footer={
            <>
              <Button variant="ghost" onClick={() => setDeleteProdId(null)}>
                Cancelar
              </Button>
              <Button
                variant="danger"
                onClick={eliminarProducto}
                leftIcon={<Trash2 className="w-4 h-4" />}
              >
                Eliminar
              </Button>
            </>
          }
        >
          {(() => {
            const prod = productos.find((p) => p.id === deleteProdId);
            return (
              <div className="space-y-3">
                <p className="text-sm text-slate-400">
                  ¿Eliminar{' '}
                  <strong className="text-slate-200">{prod?.nombre}</strong>? Esta
                  acción no se puede deshacer.
                </p>
                {prod && stockTotalProducto(prod) > 0 && (
                  <div className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3">
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-300">
                      Este producto tiene{' '}
                      <strong>{stockTotalProducto(prod)} en stock</strong>. Al
                      eliminarlo perderás ese inventario.
                    </p>
                  </div>
                )}
              </div>
            );
          })()}
        </Modal>
      </div>
    );
  }

  // ===== VISTA GRID DE CATEGORÍAS =====
  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Categorías"
        subtitle={`${pdvActivo.nombre.replace(/^[^\s]+\s/, '')} · Organiza tus productos`}
        icon={<FolderTree className="w-5 h-5" />}
        actions={
          <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={abrirNuevo}>
            Nueva categoría
          </Button>
        }
      />

      {categorias.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
          {categorias.map((cat) => {
            const prods = productosDeCategoria(cat.id!);
            const stockBajo = prods.filter(
              (p) => stockTotalProducto(p) <= p.stockMinimo
            ).length;
            return (
              <Card
                key={cat.id}
                hoverable
                onClick={() => {
                  setCategoriaActiva(cat);
                  setVista('productos');
                }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-11 h-11 rounded-xl bg-slate-800 border border-white/10 flex items-center justify-center">
                    <FolderTree className="w-6 h-6 text-slate-300" />
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        abrirEditar(cat);
                      }}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-100 hover:bg-white/5 transition-colors duration-150"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteCatId(cat.id!);
                      }}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-red-400 hover:bg-white/5 transition-colors duration-150"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <h3 className="text-base font-semibold text-white mb-1">
                  {cat.nombre}
                </h3>
                <p className="text-xs text-slate-500 mb-3 line-clamp-2 min-h-[2.5em]">
                  {cat.descripcion || 'Sin descripción'}
                </p>

                <div className="flex items-center gap-4 pt-3 border-t border-white/10">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <Package className="w-3.5 h-3.5" />
                    <span>
                      {prods.length} producto{prods.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  {stockBajo > 0 && (
                    <div className="flex items-center gap-1.5 text-xs text-amber-400">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>{stockBajo} bajo</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 ml-auto">
                    <DollarSign className="w-3.5 h-3.5" />
                    <span className="tabular-nums">
                      {formatCurrency(valorInventario(cat.id!))}
                    </span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="mt-4">
          <EmptyState
            icon={<Layers className="w-6 h-6" />}
            title="No hay categorías"
            description="Crea tu primera categoría para organizar tus productos"
            action={
              <Button leftIcon={<Plus className="w-4 h-4" />} onClick={abrirNuevo}>
                Nueva categoría
              </Button>
            }
          />
        </Card>
      )}

      {/* Modal crear/editar categoría */}
      <Modal
        open={modalOpen}
        onClose={() => !guardando && setModalOpen(false)}
        title={editId ? 'Editar categoría' : 'Nueva categoría'}
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setModalOpen(false)}
              disabled={guardando}
            >
              Cancelar
            </Button>
            <Button
              onClick={guardar}
              disabled={!form.nombre.trim() || guardando}
              leftIcon={!guardando && <Check className="w-4 h-4" />}
              loading={guardando}
            >
              {editId ? 'Guardar' : 'Crear'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs text-slate-400 mb-1.5 block">Nombre</label>
            <Input
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              placeholder="Ej: Bebidas"
              leftIcon={<FolderTree className="w-4 h-4" />}
              autoFocus
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1.5 block">
              Descripción (opcional)
            </label>
            <Input
              value={form.descripcion}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
              placeholder="Ej: Refrescos, jugos, agua"
            />
          </div>
        </div>
      </Modal>

      {/* Modal eliminar categoría */}
      <Modal
        open={deleteCatId !== null}
        onClose={() => setDeleteCatId(null)}
        title="Eliminar categoría"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteCatId(null)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={eliminarCategoria}
              leftIcon={<Trash2 className="w-4 h-4" />}
            >
              Eliminar
            </Button>
          </>
        }
      >
        {(() => {
          const cat = categorias.find((c) => c.id === deleteCatId);
          const prods = cat ? productosDeCategoria(cat.id!) : [];
          return (
            <div className="space-y-3">
              <p className="text-sm text-slate-400">
                ¿Eliminar la categoría{' '}
                <strong className="text-slate-200">{cat?.nombre}</strong>?
              </p>
              {prods.length > 0 && (
                <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-300">
                    Esta categoría tiene{' '}
                    <strong>{prods.length} producto{prods.length !== 1 ? 's' : ''}</strong>.
                    Todos serán eliminados junto con la categoría.
                  </p>
                </div>
              )}
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}