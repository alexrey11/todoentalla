import { useState, useMemo, useRef } from 'react';
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
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { Card, Button, Badge, Input, Select, Modal, EmptyState } from '@/components/ui';
import { PageHeader } from '@/layout/PageHeader';
import { formatCurrency } from '@/utils/format';
import { mockCategorias, mockProductos } from '@/mockData';
import type { Categoria, Producto, UnidadMedida } from '@/types';

export function Categorias() {
  const [categorias, setCategorias] = useState<Categoria[]>(mockCategorias);
  const [productos, setProductos] = useState<Producto[]>(mockProductos);
  const [vista, setVista] = useState<'grid' | 'productos'>('grid');
  const [categoriaActiva, setCategoriaActiva] = useState<Categoria | null>(null);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteCatId, setDeleteCatId] = useState<string | null>(null);
  const [form, setForm] = useState({ nombre: '', descripcion: '' });

  // Producto modal
  const [modalProdOpen, setModalProdOpen] = useState(false);
  const [editProdId, setEditProdId] = useState<string | null>(null);
  const [deleteProdId, setDeleteProdId] = useState<string | null>(null);
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

  const abrirNuevo = () => {
    setEditId(null);
    setForm({ nombre: '', descripcion: '' });
    setModalOpen(true);
  };

  const abrirEditar = (cat: Categoria) => {
    setEditId(cat.id);
    setForm({ nombre: cat.nombre, descripcion: cat.descripcion });
    setModalOpen(true);
  };

  const guardar = () => {
    if (!form.nombre.trim()) return;
    if (editId) {
      setCategorias((prev) =>
        prev.map((c) =>
          c.id === editId
            ? { ...c, nombre: form.nombre, descripcion: form.descripcion }
            : c
        )
      );
    } else {
      const nueva: Categoria = {
        id: `cat-${Date.now()}`,
        puntoDeVentaId: 'pdv-1',
        nombre: form.nombre,
        descripcion: form.descripcion,
      };
      setCategorias((prev) => [...prev, nueva]);
    }
    setModalOpen(false);
  };

  const eliminar = () => {
    if (deleteCatId) {
      setCategorias((prev) => prev.filter((c) => c.id !== deleteCatId));
      setDeleteCatId(null);
    }
  };

  const productosDeCategoria = (catId: string): Producto[] =>
    productos.filter((p) => p.categoriaId === catId);

  const productosFiltrados = useMemo(() => {
    if (!categoriaActiva) return [];
    let lista = productosDeCategoria(categoriaActiva.id);
    if (search.trim()) {
      const q = search.toLowerCase();
      lista = lista.filter(
        (p) => p.nombre.toLowerCase().includes(q) || p.codigoBarras.includes(q)
      );
    }
    return lista;
  }, [categoriaActiva, search, productos]);

  const valorInventario = (catId: string) =>
    productosDeCategoria(catId).reduce(
      (s, p) => s + p.precioVenta * p.stockActual,
      0
    );

  // === Producto CRUD ===
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
    setEditProdId(prod.id);
    setProdForm({
      nombre: prod.nombre,
      precioCompra: String(prod.precioCompra),
      precioVenta: String(prod.precioVenta),
      stockActual: String(prod.stockActual),
      stockMinimo: String(prod.stockMinimo),
      unidadMedida: prod.unidadMedida,
      codigoBarras: prod.codigoBarras,
      fechaVencimiento: prod.fechaVencimiento ?? '',
      imagen: prod.imagen,
    });
    setModalProdOpen(true);
  };

  const guardarProd = () => {
    if (!prodForm.nombre.trim() || !categoriaActiva) return;
    if (editProdId) {
      setProductos((prev) =>
        prev.map((p) =>
          p.id === editProdId
            ? {
                ...p,
                nombre: prodForm.nombre,
                precioCompra: parseFloat(prodForm.precioCompra) || 0,
                precioVenta: parseFloat(prodForm.precioVenta) || 0,
                stockActual: parseInt(prodForm.stockActual) || 0,
                stockMinimo: parseInt(prodForm.stockMinimo) || 0,
                unidadMedida: prodForm.unidadMedida,
                codigoBarras: prodForm.codigoBarras,
                fechaVencimiento: prodForm.fechaVencimiento || undefined,
                imagen: prodForm.imagen,
              }
            : p
        )
      );
    } else {
      const nuevo: Producto = {
        id: `p-${Date.now()}`,
        categoriaId: categoriaActiva.id,
        puntoDeVentaId: 'pdv-1',
        nombre: prodForm.nombre,
        precioCompra: parseFloat(prodForm.precioCompra) || 0,
        precioVenta: parseFloat(prodForm.precioVenta) || 0,
        stockActual: parseInt(prodForm.stockActual) || 0,
        stockMinimo: parseInt(prodForm.stockMinimo) || 0,
        unidadMedida: prodForm.unidadMedida,
        codigoBarras: prodForm.codigoBarras,
        variantes: [],
        esCompuesto: false,
        componentes: [],
        fechaVencimiento: prodForm.fechaVencimiento || undefined,
        imagen: prodForm.imagen,
      };
      setProductos((prev) => [...prev, nuevo]);
    }
    setModalProdOpen(false);
  };

  const eliminarProd = () => {
    if (deleteProdId) {
      setProductos((prev) => prev.filter((p) => p.id !== deleteProdId));
      setDeleteProdId(null);
    }
  };

  const handleImagenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return;
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

  // ===== VISTA PRODUCTOS DE CATEGORIA =====
  if (vista === 'productos' && categoriaActiva) {
    const prods = productosFiltrados;
    const stockBajoCount = prods.filter((p) => p.stockActual <= p.stockMinimo).length;

    return (
      <div className="animate-fade-in">
        <PageHeader
          title={categoriaActiva.nombre}
          subtitle={`${prods.length} productos · ${categoriaActiva.descripcion}`}
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
              <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={abrirNuevoProd}>
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
              {formatCurrency(valorInventario(categoriaActiva.id))}
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
              {prods.length > 0
                ? formatCurrency(
                    Math.round(
                      prods.reduce((s, p) => s + p.precioVenta, 0) / prods.length
                    )
                  )
                : '0'}
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

        {/* Buscador */}
        <div className="mt-4">
          <Input
            type="text"
            placeholder="Buscar producto en esta categoría..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>

        {/* Grid de productos con imagen */}
        {prods.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mt-4">
            {prods.map((p) => {
              const sinStock = p.stockActual <= 0;
              const stockBajo = p.stockActual <= p.stockMinimo;
              return (
                <Card key={p.id} padding="sm" className="group flex flex-col">
                  {/* Imagen */}
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
                        onClick={() => setDeleteProdId(p.id)}
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

                  {/* Info */}
                  <p className="text-sm font-medium text-slate-100 leading-snug line-clamp-2 mb-1">
                    {p.nombre}
                  </p>
                  <p className="text-base font-semibold text-white tabular-nums">
                    {formatCurrency(p.precioVenta)}
                  </p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-slate-500 tabular-nums">
                      Stock: {p.stockActual}
                    </span>
                    <span className="text-xs text-slate-600 capitalize">{p.unidadMedida}</span>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="mt-4">
            <EmptyState
              icon={<Package className="w-6 h-6" />}
              title="No hay productos"
              description="Agrega tu primer producto a esta categoría"
              action={
                <Button leftIcon={<Plus className="w-4 h-4" />} onClick={abrirNuevoProd}>
                  Agregar producto
                </Button>
              }
            />
          </Card>
        )}
      </div>
    );
  }

  // ===== VISTA GRID DE CATEGORIAS =====
  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Categorías"
        subtitle="Organiza tus productos por categorías"
        icon={<FolderTree className="w-5 h-5" />}
        actions={
          <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={abrirNuevo}>
            Nueva categoría
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
        {categorias.map((cat) => {
          const prods = productosDeCategoria(cat.id);
          const stockBajo = prods.filter((p) => p.stockActual <= p.stockMinimo).length;
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
                      setDeleteCatId(cat.id);
                    }}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-red-400 hover:bg-white/5 transition-colors duration-150"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <h3 className="text-base font-semibold text-white mb-1">{cat.nombre}</h3>
              <p className="text-xs text-slate-500 mb-3 line-clamp-2">{cat.descripcion}</p>

              <div className="flex items-center gap-4 pt-3 border-t border-white/10">
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <Package className="w-3.5 h-3.5" />
                  <span>{prods.length} productos</span>
                </div>
                {stockBajo > 0 && (
                  <div className="flex items-center gap-1.5 text-xs text-amber-400">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{stockBajo} bajo</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5 text-xs text-slate-400 ml-auto">
                  <DollarSign className="w-3.5 h-3.5" />
                  <span className="tabular-nums">{formatCurrency(valorInventario(cat.id))}</span>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {categorias.length === 0 && (
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
        onClose={() => setModalOpen(false)}
        title={editId ? 'Editar categoría' : 'Nueva categoría'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={guardar} disabled={!form.nombre.trim()} leftIcon={<Check className="w-4 h-4" />}>
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
            <label className="text-xs text-slate-400 mb-1.5 block">Descripción</label>
            <Input
              value={form.descripcion}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
              placeholder="Ej: Refrescos, jugos, agua"
            />
          </div>
        </div>
      </Modal>

      {/* Modal crear/editar producto */}
      <Modal
        open={modalProdOpen}
        onClose={() => setModalProdOpen(false)}
        title={editProdId ? 'Editar producto' : 'Nuevo producto'}
        description={categoriaActiva?.nombre}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalProdOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={guardarProd} disabled={!prodForm.nombre.trim()} leftIcon={<Check className="w-4 h-4" />}>
              {editProdId ? 'Guardar' : 'Crear producto'}
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Columna imagen */}
          <div className="sm:col-span-1">
            <label className="text-xs text-slate-400 mb-1.5 block">Imagen del producto</label>
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
              {prodForm.imagen && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-2 left-2 text-xs text-blue-400 hover:text-blue-300 transition-colors duration-150"
                >
                  Cambiar
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

          {/* Columna datos */}
          <div className="sm:col-span-2 space-y-3">
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Nombre</label>
              <Input
                value={prodForm.nombre}
                onChange={(e) => setProdForm({ ...prodForm, nombre: e.target.value })}
                placeholder="Ej: Coca-Cola 1.5L"
                leftIcon={<Package className="w-4 h-4" />}
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">Precio compra</label>
                <Input
                  type="number"
                  value={prodForm.precioCompra}
                  onChange={(e) => setProdForm({ ...prodForm, precioCompra: e.target.value })}
                  placeholder="0"
                  className="tabular-nums"
                  leftIcon={<DollarSign className="w-4 h-4" />}
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">Precio venta</label>
                <Input
                  type="number"
                  value={prodForm.precioVenta}
                  onChange={(e) => setProdForm({ ...prodForm, precioVenta: e.target.value })}
                  placeholder="0"
                  className="tabular-nums"
                  leftIcon={<DollarSign className="w-4 h-4" />}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">Stock actual</label>
                <Input
                  type="number"
                  value={prodForm.stockActual}
                  onChange={(e) => setProdForm({ ...prodForm, stockActual: e.target.value })}
                  placeholder="0"
                  className="tabular-nums"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">Stock mínimo</label>
                <Input
                  type="number"
                  value={prodForm.stockMinimo}
                  onChange={(e) => setProdForm({ ...prodForm, stockMinimo: e.target.value })}
                  placeholder="0"
                  className="tabular-nums"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">Unidad de medida</label>
                <Select
                  value={prodForm.unidadMedida}
                  onChange={(e) => setProdForm({ ...prodForm, unidadMedida: e.target.value as UnidadMedida })}
                >
                  <option value="unidad">Unidad</option>
                  <option value="kg">Kilogramo (kg)</option>
                  <option value="lb">Libra (lb)</option>
                  <option value="litro">Litro</option>
                </Select>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">Código de barras</label>
                <Input
                  value={prodForm.codigoBarras}
                  onChange={(e) => setProdForm({ ...prodForm, codigoBarras: e.target.value })}
                  placeholder="7501234567890"
                  leftIcon={<Barcode className="w-4 h-4" />}
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Fecha de vencimiento (opcional)</label>
              <Input
                type="date"
                value={prodForm.fechaVencimiento}
                onChange={(e) => setProdForm({ ...prodForm, fechaVencimiento: e.target.value })}
                leftIcon={<Calendar className="w-4 h-4" />}
              />
            </div>
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
            <Button variant="danger" onClick={eliminar} leftIcon={<Trash2 className="w-4 h-4" />}>
              Eliminar
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-400">
          ¿Seguro que deseas eliminar esta categoría? Los productos asociados quedarán sin categoría.
        </p>
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
            <Button variant="danger" onClick={eliminarProd} leftIcon={<Trash2 className="w-4 h-4" />}>
              Eliminar
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-400">
          ¿Seguro que deseas eliminar este producto? Esta acción no se puede deshacer.
        </p>
      </Modal>
    </div>
  );
}
