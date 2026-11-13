import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Eye, Search, Check, AlertCircle, Upload, Image as ImageIcon, X, Camera, Tag, Layers, Sparkles, Sliders, Palette } from 'lucide-react';
import { apiRequest } from '../../services/api';
import { ProductImageManager, ProductImageItem } from '../../components/ProductImageManager';
import { saveProductImagesToSupabase, deleteProductImageFromStorage } from '../../lib/supabase';

const PRESET_SIZES_SHIRTS = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'];
const PRESET_SIZES_PANTS = ['28', '30', '32', '34', '36', '38', '40'];
const PRESET_MATERIALS = ['100% Organic Cotton', 'Linen Blend', 'Pure Linen', 'Stretch Denim', 'Poly-Cotton', 'Rayon Blend', 'Silk Cotton'];
const PRESET_FITS = ['Slim Fit', 'Regular Fit', 'Relaxed Fit', 'Oversized', 'Tailored Fit'];

// Expanded Master Palette of Shades for Men's and Women's Wear
const COLOR_SHADES_CATALOG: Record<string, string[]> = {
  "👔 Men's Essential & Classic Shades": [
    'Black', 'Pure White', 'Off-White', 'Ivory', 'Cream', 
    'Charcoal Grey', 'Slate Grey', 'Light Grey', 'Melange Grey', 
    'Navy Blue', 'Midnight Blue', 'Royal Blue', 'Sky Blue', 'Denim Blue'
  ],
  "🌿 Men's Earthy & Casual Shades": [
    'Olive Green', 'Army Green', 'Sage Green', 'Bottle Green', 'Mint Green', 
    'Khaki', 'Beige', 'Tan', 'Camel', 'Chocolate Brown', 
    'Coffee Brown', 'Rust', 'Terracotta', 'Mustard Yellow', 'Ochre'
  ],
  "🍷 Men's Premium & Evening Shades": [
    'Crimson Red', 'Burgundy', 'Maroon', 'Deep Wine', 'Coral', 
    'Dusty Pink', 'Salmon', 'Peach', 'Purple', 'Plum', 
    'Indigo Blue', 'Emerald Green', 'Gold Metallic', 'Silver Metallic', 'Bronze'
  ],
  "🌸 Women's Pastels & Elegance": [
    'Rose Gold', 'Blush Pink', 'Baby Pink', 'Pastel Pink', 'Hot Pink', 
    'Fuchsia', 'Magenta', 'Lavender', 'Lilac', 'Violet', 
    'Mauve', 'Dusty Rose', 'Powder Blue', 'Aqua Blue', 'Turquoise'
  ],
  "💃 Women's Vibrant & Festive Shades": [
    'Lemon Yellow', 'Sunshine Yellow', 'Peach Coral', 'Apricot', 'Tangerine Orange', 
    'Crimson', 'Ruby Red', 'Scarlet', 'Seafoam Green', 'Pistachio Green', 
    'Jade Green', 'Champagne Gold', 'Copper Metallic', 'Nude', 'Bare Tan'
  ]
};

export const AdminProductsPage: React.FC = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [deletingProduct, setDeletingProduct] = useState<any>(null);

  // Custom color input states
  const [customAddColorInput, setCustomAddColorInput] = useState<string>('');
  const [customEditColorInput, setCustomEditColorInput] = useState<string>('');
  const [activeColorCategory, setActiveColorCategory] = useState<string>("👔 Men's Essential & Classic Shades");

  // Add Product Form State
  const [addForm, setAddForm] = useState({
    name: '',
    brand_id: '',
    category_id: '',
    gender: 'MEN',
    description: '',
    material: '100% Organic Cotton',
    fit: 'Regular Fit',
    care_instructions: 'Machine wash cold with like colors, gentle cycle, tumble dry low',
    mrp: 1999,
    selling_price: 1499,
    sku_prefix: '',
    colors: 'Black, White, Navy Blue',
    sizes: 'S, M, L, XL',
    initial_stock: 15
  });

  // Multiple product images for Add Form
  const [addImages, setAddImages] = useState<ProductImageItem[]>([
    {
      id: 'default-img-1',
      url: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=80',
      color: '',
      is_primary: true
    }
  ]);

  // Edit Product Form State
  const [editForm, setEditForm] = useState({
    id: '',
    name: '',
    brand_id: '',
    category_id: '',
    gender: 'MEN',
    description: '',
    material: '',
    fit: '',
    care_instructions: '',
    mrp: 1999,
    selling_price: 1499,
    sku_prefix: '',
    colors: '',
    sizes: '',
    initial_stock: 15
  });

  // Multiple product images for Edit Form
  const [editImages, setEditImages] = useState<ProductImageItem[]>([]);

  const toggleSizeInAddForm = (sizeToToggle: string) => {
    const list = addForm.sizes.split(',').map(s => s.trim()).filter(Boolean);
    const exists = list.some(s => s.toUpperCase() === sizeToToggle.toUpperCase());
    const newList = exists 
      ? list.filter(s => s.toUpperCase() !== sizeToToggle.toUpperCase())
      : [...list, sizeToToggle];
    setAddForm(f => ({ ...f, sizes: newList.join(', ') }));
  };

  const toggleColorInAddForm = (colorToToggle: string) => {
    const list = addForm.colors.split(',').map(c => c.trim()).filter(Boolean);
    const exists = list.some(c => c.toLowerCase() === colorToToggle.toLowerCase());
    const newList = exists 
      ? list.filter(c => c.toLowerCase() !== colorToToggle.toLowerCase())
      : [...list, colorToToggle];
    setAddForm(f => ({ ...f, colors: newList.join(', ') }));
  };

  const addCustomColorToAddForm = () => {
    if (!customAddColorInput.trim()) return;
    const colorToAdd = customAddColorInput.trim();
    const list = addForm.colors.split(',').map(c => c.trim()).filter(Boolean);
    if (!list.some(c => c.toLowerCase() === colorToAdd.toLowerCase())) {
      setAddForm(f => ({ ...f, colors: [...list, colorToAdd].join(', ') }));
    }
    setCustomAddColorInput('');
  };

  const toggleSizeInEditForm = (sizeToToggle: string) => {
    const list = editForm.sizes.split(',').map(s => s.trim()).filter(Boolean);
    const exists = list.some(s => s.toUpperCase() === sizeToToggle.toUpperCase());
    const newList = exists 
      ? list.filter(s => s.toUpperCase() !== sizeToToggle.toUpperCase())
      : [...list, sizeToToggle];
    setEditForm(f => ({ ...f, sizes: newList.join(', ') }));
  };

  const toggleColorInEditForm = (colorToToggle: string) => {
    const list = editForm.colors.split(',').map(c => c.trim()).filter(Boolean);
    const exists = list.some(c => c.toLowerCase() === colorToToggle.toLowerCase());
    const newList = exists 
      ? list.filter(c => c.toLowerCase() !== colorToToggle.toLowerCase())
      : [...list, colorToToggle];
    setEditForm(f => ({ ...f, colors: newList.join(', ') }));
  };

  const addCustomColorToEditForm = () => {
    if (!customEditColorInput.trim()) return;
    const colorToAdd = customEditColorInput.trim();
    const list = editForm.colors.split(',').map(c => c.trim()).filter(Boolean);
    if (!list.some(c => c.toLowerCase() === colorToAdd.toLowerCase())) {
      setEditForm(f => ({ ...f, colors: [...list, colorToAdd].join(', ') }));
    }
    setCustomEditColorInput('');
  };

  const fetchCatalog = async () => {
    try {
      setLoading(true);
      const [pRes, bRes, cRes] = await Promise.all([
        apiRequest('/products'),
        apiRequest('/brands'),
        apiRequest('/categories')
      ]);
      setProducts(pRes.products || []);
      setBrands(bRes.brands || []);
      setCategories(cRes.categories || []);
      if (bRes.brands?.[0]) setAddForm(f => ({ ...f, brand_id: bRes.brands[0].id }));
      if (cRes.categories?.[0]) setAddForm(f => ({ ...f, category_id: cRes.categories[0].id }));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalog();
  }, []);

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const colorList = addForm.colors.split(',').map(c => c.trim()).filter(Boolean);
      const sizeList = addForm.sizes.split(',').map(s => s.trim()).filter(Boolean);

      if (colorList.length === 0) {
        alert('Please specify at least one color for the product');
        return;
      }
      if (sizeList.length === 0) {
        alert('Please specify at least one size for the product');
        return;
      }

      // Check if any image is currently uploading
      if (addImages.some(img => img.isUploading)) {
        alert('Please wait for all image uploads to finish before submitting.');
        return;
      }

      // Prepare clean images (never Base64)
      const cleanImages = addImages
        .filter(img => img.url && !img.isUploading && !img.url.startsWith('data:image'))
        .map((img, idx) => ({
          url: img.url,
          color: img.color || '',
          is_primary: img.is_primary,
          display_order: idx
        }));

      if (cleanImages.length === 0) {
        alert('Please upload or provide at least one product image.');
        return;
      }

      // Ensure at least one image is marked as primary
      if (!cleanImages.some(img => img.is_primary)) {
        cleanImages[0].is_primary = true;
      }

      const variantItems: any[] = [];
      colorList.forEach(color => {
        sizeList.forEach(size => {
          variantItems.push({
            color,
            size,
            stock: addForm.initial_stock,
            sku: `${addForm.sku_prefix}-${color.substring(0, 2).toUpperCase()}-${size}`
          });
        });
      });

      const res = await apiRequest('/products', {
        method: 'POST',
        body: JSON.stringify({
          ...addForm,
          images: cleanImages,
          variants: variantItems
        })
      });

      // Save to Supabase PostgreSQL product_images table directly
      const createdProductId = res.product?.id || `prod-${Date.now()}`;
      await saveProductImagesToSupabase(
        createdProductId,
        cleanImages.map((img, idx) => ({
          image_url: img.url,
          color: img.color,
          is_primary: img.is_primary,
          display_order: idx
        }))
      );

      setShowAddModal(false);
      // Reset add form & images
      setAddImages([
        {
          id: 'default-img-1',
          url: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=80',
          color: '',
          is_primary: true
        }
      ]);
      await fetchCatalog();
      alert('Product created successfully with sizes, colors, material details, and images!');
    } catch (err: any) {
      alert(err.message || 'Failed to create product');
    }
  };

  const openEditModal = (product: any) => {
    setEditingProduct(product);
    
    const existingColors = Array.from(new Set(product.variants?.map((v: any) => v.color))) as string[];
    const existingSizes = Array.from(new Set(product.variants?.map((v: any) => v.size))) as string[];

    const colorsStr = existingColors.length > 0 ? existingColors.join(', ') : 'Black, White, Navy Blue';
    const sizesStr = existingSizes.length > 0 ? existingSizes.join(', ') : 'S, M, L, XL';

    // Populate multiple images from product.images
    const existingImages: ProductImageItem[] = product.images && product.images.length > 0
      ? product.images.map((img: any, idx: number) => ({
          id: img.id || `img-${idx}`,
          url: img.image_url,
          color: img.color || '',
          is_primary: img.is_primary ?? (idx === 0)
        }))
      : (product.primary_image ? [{ id: 'img-0', url: product.primary_image, color: '', is_primary: true }] : []);

    setEditImages(existingImages);

    setEditForm({
      id: product.id,
      name: product.name,
      brand_id: product.brand_id,
      category_id: product.category_id,
      gender: product.gender || 'MEN',
      description: product.description || '',
      material: product.material || '100% Organic Cotton',
      fit: product.fit || 'Regular Fit',
      care_instructions: product.care_instructions || 'Machine wash cold with like colors',
      mrp: product.mrp,
      selling_price: product.selling_price,
      sku_prefix: product.sku_prefix,
      colors: colorsStr,
      sizes: sizesStr,
      initial_stock: product.variants?.[0]?.stock || 15
    });
  };

  const handleSaveEditProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    try {
      const colorList = editForm.colors.split(',').map(c => c.trim()).filter(Boolean);
      const sizeList = editForm.sizes.split(',').map(s => s.trim()).filter(Boolean);

      if (colorList.length === 0) {
        alert('Please specify at least one color for the product');
        return;
      }
      if (sizeList.length === 0) {
        alert('Please specify at least one size for the product');
        return;
      }

      // Check if any image is currently uploading
      if (editImages.some(img => img.isUploading)) {
        alert('Please wait for all image uploads to finish before saving changes.');
        return;
      }

      // Prepare clean images (never Base64)
      const cleanImages = editImages
        .filter(img => img.url && !img.isUploading && !img.url.startsWith('data:image'))
        .map((img, idx) => ({
          url: img.url,
          color: img.color || '',
          is_primary: img.is_primary,
          display_order: idx
        }));

      if (cleanImages.length === 0) {
        alert('Please upload or provide at least one product image.');
        return;
      }

      if (!cleanImages.some(img => img.is_primary)) {
        cleanImages[0].is_primary = true;
      }

      const variantItems: any[] = [];
      colorList.forEach(color => {
        sizeList.forEach(size => {
          const match = editingProduct.variants?.find((v: any) => 
            v.color.toLowerCase() === color.toLowerCase() && 
            v.size.toUpperCase() === size.toUpperCase()
          );
          variantItems.push({
            color,
            size,
            stock: match ? match.stock : editForm.initial_stock,
            sku: `${editForm.sku_prefix}-${color.substring(0, 2).toUpperCase()}-${size}`
          });
        });
      });

      await apiRequest(`/products/${editingProduct.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          ...editForm,
          images: cleanImages,
          variants: variantItems
        })
      });

      // Save to Supabase PostgreSQL product_images table directly
      await saveProductImagesToSupabase(
        editingProduct.id,
        cleanImages.map((img, idx) => ({
          image_url: img.url,
          color: img.color,
          is_primary: img.is_primary,
          display_order: idx
        }))
      );

      setEditingProduct(null);
      await fetchCatalog();
      alert('Product details, sizes, colors, material, and images updated successfully!');
    } catch (err: any) {
      alert(err.message || 'Failed to update product');
    }
  };

  const confirmDelete = async () => {
    if (!deletingProduct) return;
    const targetId = deletingProduct.id;
    try {
      setProducts(prev => prev.filter(p => p.id !== targetId));
      setDeletingProduct(null);

      // Clean up Supabase Storage images if any
      if (Array.isArray(deletingProduct.images)) {
        for (const img of deletingProduct.images) {
          if (img.image_url) {
            deleteProductImageFromStorage(img.image_url).catch(() => {});
          }
        }
      }

      await apiRequest(`/products/${targetId}`, { method: 'DELETE' });
      await fetchCatalog();
    } catch (err: any) {
      alert(err.message || 'Failed to delete product');
      await fetchCatalog();
    }
  };

  const filtered = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.sku_prefix.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.brand_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.category_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
        <div>
          <span className="text-xs font-bold text-amber-400 uppercase tracking-widest block">CATALOG MANAGER</span>
          <h1 className="text-2xl font-display font-bold text-white uppercase">Product Catalog & Variant Management</h1>
        </div>

        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs uppercase px-5 py-3 rounded-xl flex items-center space-x-2 shadow-lg shadow-amber-500/10"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Product</span>
        </button>
      </div>

      {/* Search Filter */}
      <div className="flex items-center space-x-4 bg-neutral-900 border border-neutral-800 p-3 rounded-2xl">
        <Search className="w-4 h-4 text-slate-400 ml-2" />
        <input 
          type="text" 
          placeholder="Search by product name, brand, category, SKU..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full bg-transparent text-white text-xs focus:outline-none"
        />
      </div>

      {/* Product Table */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-neutral-800 text-slate-400 uppercase tracking-wider bg-neutral-950">
                <th className="py-3.5 px-4">Item</th>
                <th className="py-3.5 px-4">Brand / Category</th>
                <th className="py-3.5 px-4">Material & Fit</th>
                <th className="py-3.5 px-4">Available Sizes</th>
                <th className="py-3.5 px-4">Available Colors</th>
                <th className="py-3.5 px-4">Pricing</th>
                <th className="py-3.5 px-4">Stock</th>
                <th className="py-3.5 px-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800 text-slate-200">
              {filtered.map(product => {
                const uniqueColors = Array.from(new Set(product.variants?.map((v: any) => v.color))) as string[];
                const uniqueSizes = Array.from(new Set(product.variants?.map((v: any) => v.size))) as string[];

                return (
                  <tr key={product.id} className="hover:bg-neutral-800/40">
                    <td className="py-3 px-4 flex items-center space-x-3">
                      <img src={product.primary_image} alt="" className="w-10 h-12 object-cover rounded border border-neutral-800 shrink-0" />
                      <div>
                        <p className="font-bold text-white text-xs">{product.name}</p>
                        <p className="text-[10px] text-amber-400 font-mono">{product.sku_prefix}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-bold text-white">{product.brand_name}</p>
                      <p className="text-[10px] text-slate-400">{product.category_name} ({product.gender})</p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-200">{product.material || 'Cotton'}</p>
                      <span className="text-[10px] bg-neutral-800 text-slate-400 px-2 py-0.5 rounded font-mono block w-max mt-0.5">
                        {product.fit || 'Regular Fit'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1 max-w-[140px]">
                        {uniqueSizes.length > 0 ? (
                          uniqueSizes.map(size => (
                            <span key={size} className="bg-neutral-800 text-amber-300 font-extrabold text-[10px] px-1.5 py-0.5 rounded border border-amber-500/20">
                              {size}
                            </span>
                          ))
                        ) : (
                          <span className="text-[10px] text-slate-500 italic">No sizes set</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1 max-w-[180px]">
                        {uniqueColors.length > 0 ? (
                          uniqueColors.map(color => (
                            <span key={color} className="bg-neutral-800 text-slate-200 text-[10px] px-2 py-0.5 rounded border border-neutral-700">
                              {color}
                            </span>
                          ))
                        ) : (
                          <span className="text-[10px] text-slate-500 italic">No colors set</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-extrabold text-white">₹{product.selling_price?.toLocaleString()}</p>
                      <p className="text-[10px] text-slate-500 line-through">₹{product.mrp?.toLocaleString()}</p>
                      <span className="text-[10px] text-emerald-400 font-bold">{product.discount_pct}% OFF</span>
                    </td>
                    <td className="py-3 px-4 font-extrabold text-white">{product.total_stock || 0} Units</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <button 
                          onClick={() => openEditModal(product)}
                          className="bg-neutral-800 hover:bg-neutral-700 text-amber-400 p-2 rounded-lg flex items-center space-x-1"
                          title="Edit Details, Sizes, Colors, Material"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span className="text-[11px] font-bold hidden sm:inline">Edit</span>
                        </button>
                        <button 
                          onClick={() => setDeletingProduct(product)}
                          className="bg-red-500/10 hover:bg-red-500 hover:text-white text-red-400 p-2 rounded-lg transition-all"
                          title="Delete Product"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* FULL EDIT PRODUCT MODAL */}
      {editingProduct && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-3xl w-full p-6 space-y-4 max-h-[92vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div>
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest block">ADMIN CATALOG</span>
                <h3 className="font-bold text-white text-lg">Edit Product: {editingProduct.name}</h3>
              </div>
              <button onClick={() => setEditingProduct(null)} className="text-slate-400 hover:text-white p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditProduct} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Product Name</label>
                  <input 
                    type="text" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} required 
                    className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl p-3"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">SKU Prefix</label>
                  <input 
                    type="text" value={editForm.sku_prefix} onChange={e => setEditForm({ ...editForm, sku_prefix: e.target.value.toUpperCase() })} required 
                    className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl p-3"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Brand</label>
                  <select 
                    value={editForm.brand_id} onChange={e => setEditForm({ ...editForm, brand_id: e.target.value })}
                    className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl p-3"
                  >
                    {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Category</label>
                  <select 
                    value={editForm.category_id} onChange={e => setEditForm({ ...editForm, category_id: e.target.value })}
                    className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl p-3"
                  >
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Gender</label>
                  <select 
                    value={editForm.gender} onChange={e => setEditForm({ ...editForm, gender: e.target.value })}
                    className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl p-3"
                  >
                    <option value="MEN">Men</option>
                    <option value="WOMEN">Women</option>
                    <option value="UNISEX">Unisex</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">MRP Price (₹)</label>
                  <input 
                    type="number" value={editForm.mrp} onChange={e => setEditForm({ ...editForm, mrp: Number(e.target.value) })} required 
                    className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl p-3"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Selling Price (₹)</label>
                  <input 
                    type="number" value={editForm.selling_price} onChange={e => setEditForm({ ...editForm, selling_price: Number(e.target.value) })} required 
                    className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl p-3"
                  />
                </div>
              </div>

              {/* MATERIAL & FIT SECTION */}
              <div className="grid grid-cols-2 gap-4 p-3 bg-neutral-950 border border-neutral-800 rounded-xl">
                <div>
                  <label className="block text-amber-400 font-bold mb-1 uppercase tracking-wider text-[10px]">Fabric / Material Specification</label>
                  <input 
                    type="text" 
                    value={editForm.material} 
                    onChange={e => setEditForm({ ...editForm, material: e.target.value })} 
                    placeholder="e.g. 100% Linen / Organic Cotton" 
                    required 
                    className="w-full bg-neutral-900 border border-neutral-700 text-white rounded-lg p-2.5"
                  />
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {PRESET_MATERIALS.slice(0, 4).map(mat => (
                      <button
                        key={mat}
                        type="button"
                        onClick={() => setEditForm(f => ({ ...f, material: mat }))}
                        className="text-[9px] bg-neutral-800 hover:bg-amber-500 hover:text-black text-slate-300 px-1.5 py-0.5 rounded transition-colors"
                      >
                        + {mat}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-amber-400 font-bold mb-1 uppercase tracking-wider text-[10px]">Fit Type</label>
                  <select 
                    value={editForm.fit} 
                    onChange={e => setEditForm({ ...editForm, fit: e.target.value })}
                    className="w-full bg-neutral-900 border border-neutral-700 text-white rounded-lg p-2.5"
                  >
                    {PRESET_FITS.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
              </div>

              {/* SIZES MANAGEMENT SECTION */}
              <div className="p-3 bg-neutral-950 border border-amber-500/30 rounded-xl space-y-2">
                <label className="block text-amber-400 font-bold uppercase tracking-wider text-[11px] flex items-center justify-between">
                  <span>Manage Product Sizes</span>
                  <span className="text-[10px] text-slate-400 font-normal">Click chips to toggle size on/off</span>
                </label>

                {/* Preset Shirt/Top Sizes */}
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 block font-semibold">Standard Clothing Sizes:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_SIZES_SHIRTS.map(size => {
                      const isSelected = editForm.sizes.split(',').map(s => s.trim().toUpperCase()).includes(size.toUpperCase());
                      return (
                        <button
                          key={size}
                          type="button"
                          onClick={() => toggleSizeInEditForm(size)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all border ${
                            isSelected 
                              ? 'bg-amber-500 text-black border-amber-400 shadow' 
                              : 'bg-neutral-900 text-slate-400 border-neutral-800 hover:border-amber-500/50'
                          }`}
                        >
                          {size}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Preset Pant Sizes */}
                <div className="space-y-1 pt-1">
                  <span className="text-[10px] text-slate-400 block font-semibold">Trousers / Waist Sizes:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_SIZES_PANTS.map(size => {
                      const isSelected = editForm.sizes.split(',').map(s => s.trim().toUpperCase()).includes(size.toUpperCase());
                      return (
                        <button
                          key={size}
                          type="button"
                          onClick={() => toggleSizeInEditForm(size)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all border ${
                            isSelected 
                              ? 'bg-amber-500 text-black border-amber-400 shadow' 
                              : 'bg-neutral-900 text-slate-400 border-neutral-800 hover:border-amber-500/50'
                          }`}
                        >
                          {size}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Custom Sizes Input */}
                <input 
                  type="text" 
                  value={editForm.sizes} 
                  onChange={e => setEditForm({ ...editForm, sizes: e.target.value })} 
                  placeholder="Enter custom sizes comma separated (e.g. S, M, L, XL)" 
                  required 
                  className="w-full bg-neutral-900 border border-neutral-800 text-white rounded-lg p-2.5 text-xs font-mono"
                />
              </div>

              {/* UNLIMITED MASTER COLORS PALETTE MANAGER */}
              <div className="p-4 bg-neutral-950 border border-amber-500/40 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-amber-400 font-extrabold uppercase tracking-wider text-[11px] flex items-center space-x-1.5">
                    <Palette className="w-4 h-4" />
                    <span>Master Color Shades & Custom Palette ($N$ Unlimited Colors)</span>
                  </label>
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 font-mono px-2 py-0.5 rounded-full border border-amber-500/30">
                    {editForm.colors.split(',').map(c => c.trim()).filter(Boolean).length} Colors Selected
                  </span>
                </div>

                {/* Active Selected Colors Bar */}
                <div className="bg-neutral-900 border border-neutral-800 p-2.5 rounded-xl space-y-1.5">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Active Selected Colors:</span>
                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                    {editForm.colors.split(',').map(c => c.trim()).filter(Boolean).map(color => (
                      <span 
                        key={color} 
                        className="bg-amber-500 text-black font-extrabold text-[11px] px-2.5 py-1 rounded-lg flex items-center space-x-1 shadow-md shrink-0"
                      >
                        <span>{color}</span>
                        <button
                          type="button"
                          onClick={() => toggleColorInEditForm(color)}
                          className="hover:bg-black/20 p-0.5 rounded"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Custom Color Input Field */}
                <div className="flex items-center space-x-2">
                  <input 
                    type="text"
                    value={customEditColorInput}
                    onChange={e => setCustomEditColorInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addCustomColorToEditForm();
                      }
                    }}
                    placeholder="Type ANY custom color/shade name (e.g. Pecan Brown, Pastel Peach, Ice Blue) and press Enter..."
                    className="flex-1 bg-neutral-900 border border-neutral-700 text-white text-xs rounded-xl p-2.5 focus:border-amber-400 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={addCustomColorToEditForm}
                    className="bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs px-4 py-2.5 rounded-xl shrink-0"
                  >
                    + Add Shade
                  </button>
                </div>

                {/* Category Palette Tabs */}
                <div className="space-y-2 pt-1 border-t border-neutral-800">
                  <div className="flex items-center space-x-1 overflow-x-auto pb-1">
                    {Object.keys(COLOR_SHADES_CATALOG).map(catName => (
                      <button
                        key={catName}
                        type="button"
                        onClick={() => setActiveColorCategory(catName)}
                        className={`text-[10px] font-bold px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
                          activeColorCategory === catName 
                            ? 'bg-amber-500 text-black font-extrabold shadow' 
                            : 'bg-neutral-900 text-slate-400 border border-neutral-800 hover:text-white'
                        }`}
                      >
                        {catName}
                      </button>
                    ))}
                  </div>

                  {/* Preset Shade Chips for Active Category */}
                  <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto bg-neutral-900/60 p-2.5 rounded-xl border border-neutral-800">
                    {COLOR_SHADES_CATALOG[activeColorCategory]?.map(color => {
                      const isSelected = editForm.colors.split(',').map(c => c.trim().toLowerCase()).includes(color.toLowerCase());
                      return (
                        <button
                          key={color}
                          type="button"
                          onClick={() => toggleColorInEditForm(color)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all border ${
                            isSelected 
                              ? 'bg-amber-500 text-black border-amber-400 font-bold shadow' 
                              : 'bg-neutral-900 text-slate-300 border-neutral-800 hover:border-amber-500/50'
                          }`}
                        >
                          {isSelected ? '✓ ' : '+ '}{color}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Raw Comma Separated Input */}
                <input 
                  type="text" 
                  value={editForm.colors} 
                  onChange={e => setEditForm({ ...editForm, colors: e.target.value })} 
                  placeholder="Raw colors list (comma separated)" 
                  required 
                  className="w-full bg-neutral-900 border border-neutral-800 text-white rounded-lg p-2 text-[11px] font-mono"
                />
              </div>

              {/* SUPABASE MULTI-IMAGE GALLERY MANAGER */}
              <ProductImageManager
                images={editImages}
                onChange={setEditImages}
                availableColors={editForm.colors.split(',')}
              />

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Care Instructions</label>
                <input 
                  type="text" 
                  value={editForm.care_instructions} 
                  onChange={e => setEditForm({ ...editForm, care_instructions: e.target.value })}
                  placeholder="e.g. Machine wash cold, do not bleach"
                  className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl p-3"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Description</label>
                <textarea 
                  rows={3} value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl p-3"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-neutral-800">
                <button type="button" onClick={() => setEditingProduct(null)} className="px-5 py-2.5 bg-neutral-800 text-slate-300 rounded-xl font-semibold">Cancel</button>
                <button type="submit" className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-extrabold rounded-xl shadow-lg shadow-amber-500/20">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingProduct && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-red-500/40 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl text-center">
            <div className="w-12 h-12 bg-red-500/20 text-red-400 rounded-full flex items-center justify-center mx-auto border border-red-500/30">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="font-extrabold text-white text-base uppercase">Confirm Product Deletion</h3>
              <p className="text-xs text-amber-400 font-bold">{deletingProduct.name} ({deletingProduct.sku_prefix})</p>
              <p className="text-xs text-slate-400 pt-1">
                Are you sure you want to delete this product? This will remove the item, image gallery, and variant inventory from your catalog.
              </p>
            </div>

            <div className="flex justify-center space-x-3 pt-3 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => setDeletingProduct(null)}
                className="px-5 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-slate-300 font-bold rounded-xl text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-6 py-2.5 bg-red-600 hover:bg-red-500 text-white font-extrabold rounded-xl text-xs uppercase shadow-lg shadow-red-600/30 transition-all hover:scale-105"
              >
                🗑️ Yes, Delete Product
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD PRODUCT MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-3xl w-full p-6 space-y-4 max-h-[92vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h3 className="font-bold text-white text-lg">Add New Product to Store Catalog</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddProduct} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Product Name</label>
                  <input 
                    type="text" value={addForm.name} onChange={e => setAddForm({ ...addForm, name: e.target.value })} required 
                    placeholder="e.g. Slim Fit Linen Shirt"
                    className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl p-3"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">SKU Prefix</label>
                  <input 
                    type="text" value={addForm.sku_prefix} onChange={e => setAddForm({ ...addForm, sku_prefix: e.target.value.toUpperCase() })} required 
                    placeholder="e.g. YCMC-SHRT-09"
                    className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl p-3"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Brand</label>
                  <select 
                    value={addForm.brand_id} onChange={e => setAddForm({ ...addForm, brand_id: e.target.value })}
                    className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl p-3"
                  >
                    {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Category</label>
                  <select 
                    value={addForm.category_id} onChange={e => setAddForm({ ...addForm, category_id: e.target.value })}
                    className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl p-3"
                  >
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Gender</label>
                  <select 
                    value={addForm.gender} onChange={e => setAddForm({ ...addForm, gender: e.target.value })}
                    className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl p-3"
                  >
                    <option value="MEN">Men</option>
                    <option value="WOMEN">Women</option>
                    <option value="UNISEX">Unisex</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">MRP Price (₹)</label>
                  <input 
                    type="number" value={addForm.mrp} onChange={e => setAddForm({ ...addForm, mrp: Number(e.target.value) })} required 
                    className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl p-3"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Selling Price (₹)</label>
                  <input 
                    type="number" value={addForm.selling_price} onChange={e => setAddForm({ ...addForm, selling_price: Number(e.target.value) })} required 
                    className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl p-3"
                  />
                </div>
              </div>

              {/* MATERIAL & FIT INPUTS */}
              <div className="grid grid-cols-2 gap-4 p-3 bg-neutral-950 border border-neutral-800 rounded-xl">
                <div>
                  <label className="block text-amber-400 font-bold mb-1 uppercase tracking-wider text-[10px]">Fabric / Material Specification</label>
                  <input 
                    type="text" 
                    value={addForm.material} 
                    onChange={e => setAddForm({ ...addForm, material: e.target.value })} 
                    placeholder="e.g. 100% Linen / Organic Cotton" 
                    required 
                    className="w-full bg-neutral-900 border border-neutral-700 text-white rounded-lg p-2.5"
                  />
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {PRESET_MATERIALS.slice(0, 4).map(mat => (
                      <button
                        key={mat}
                        type="button"
                        onClick={() => setAddForm(f => ({ ...f, material: mat }))}
                        className="text-[9px] bg-neutral-800 hover:bg-amber-500 hover:text-black text-slate-300 px-1.5 py-0.5 rounded transition-colors"
                      >
                        + {mat}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-amber-400 font-bold mb-1 uppercase tracking-wider text-[10px]">Fit Type</label>
                  <select 
                    value={addForm.fit} 
                    onChange={e => setAddForm({ ...addForm, fit: e.target.value })}
                    className="w-full bg-neutral-900 border border-neutral-700 text-white rounded-lg p-2.5"
                  >
                    {PRESET_FITS.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
              </div>

              {/* SIZES MANAGEMENT SECTION */}
              <div className="p-3 bg-neutral-950 border border-amber-500/30 rounded-xl space-y-2">
                <label className="block text-amber-400 font-bold uppercase tracking-wider text-[11px] flex items-center justify-between">
                  <span>Product Available Sizes</span>
                  <span className="text-[10px] text-slate-400 font-normal">Click chips to toggle size on/off</span>
                </label>

                {/* Preset Shirt/Top Sizes */}
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 block font-semibold">Standard Clothing Sizes:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_SIZES_SHIRTS.map(size => {
                      const isSelected = addForm.sizes.split(',').map(s => s.trim().toUpperCase()).includes(size.toUpperCase());
                      return (
                        <button
                          key={size}
                          type="button"
                          onClick={() => toggleSizeInAddForm(size)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all border ${
                            isSelected 
                              ? 'bg-amber-500 text-black border-amber-400 shadow' 
                              : 'bg-neutral-900 text-slate-400 border-neutral-800 hover:border-amber-500/50'
                          }`}
                        >
                          {size}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Preset Pant Sizes */}
                <div className="space-y-1 pt-1">
                  <span className="text-[10px] text-slate-400 block font-semibold">Trousers / Waist Sizes:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_SIZES_PANTS.map(size => {
                      const isSelected = addForm.sizes.split(',').map(s => s.trim().toUpperCase()).includes(size.toUpperCase());
                      return (
                        <button
                          key={size}
                          type="button"
                          onClick={() => toggleSizeInAddForm(size)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all border ${
                            isSelected 
                              ? 'bg-amber-500 text-black border-amber-400 shadow' 
                              : 'bg-neutral-900 text-slate-400 border-neutral-800 hover:border-amber-500/50'
                          }`}
                        >
                          {size}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Custom Sizes Input */}
                <input 
                  type="text" 
                  value={addForm.sizes} 
                  onChange={e => setAddForm({ ...addForm, sizes: e.target.value })} 
                  placeholder="Comma separated sizes (e.g. S, M, L, XL)" 
                  required 
                  className="w-full bg-neutral-900 border border-neutral-800 text-white rounded-lg p-2.5 text-xs font-mono"
                />
              </div>

              {/* UNLIMITED MASTER COLORS PALETTE MANAGER */}
              <div className="p-4 bg-neutral-950 border border-amber-500/40 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-amber-400 font-extrabold uppercase tracking-wider text-[11px] flex items-center space-x-1.5">
                    <Palette className="w-4 h-4" />
                    <span>Master Color Shades & Custom Palette ($N$ Unlimited Colors)</span>
                  </label>
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 font-mono px-2 py-0.5 rounded-full border border-amber-500/30">
                    {addForm.colors.split(',').map(c => c.trim()).filter(Boolean).length} Colors Selected
                  </span>
                </div>

                {/* Active Selected Colors Bar */}
                <div className="bg-neutral-900 border border-neutral-800 p-2.5 rounded-xl space-y-1.5">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Active Selected Colors:</span>
                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                    {addForm.colors.split(',').map(c => c.trim()).filter(Boolean).map(color => (
                      <span 
                        key={color} 
                        className="bg-amber-500 text-black font-extrabold text-[11px] px-2.5 py-1 rounded-lg flex items-center space-x-1 shadow-md shrink-0"
                      >
                        <span>{color}</span>
                        <button
                          type="button"
                          onClick={() => toggleColorInAddForm(color)}
                          className="hover:bg-black/20 p-0.5 rounded"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Custom Color Input Field */}
                <div className="flex items-center space-x-2">
                  <input 
                    type="text"
                    value={customAddColorInput}
                    onChange={e => setCustomAddColorInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addCustomColorToAddForm();
                      }
                    }}
                    placeholder="Type ANY custom color/shade name (e.g. Pecan Brown, Pastel Peach, Ice Blue) and press Enter..."
                    className="flex-1 bg-neutral-900 border border-neutral-700 text-white text-xs rounded-xl p-2.5 focus:border-amber-400 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={addCustomColorToAddForm}
                    className="bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs px-4 py-2.5 rounded-xl shrink-0"
                  >
                    + Add Shade
                  </button>
                </div>

                {/* Category Palette Tabs */}
                <div className="space-y-2 pt-1 border-t border-neutral-800">
                  <div className="flex items-center space-x-1 overflow-x-auto pb-1">
                    {Object.keys(COLOR_SHADES_CATALOG).map(catName => (
                      <button
                        key={catName}
                        type="button"
                        onClick={() => setActiveColorCategory(catName)}
                        className={`text-[10px] font-bold px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
                          activeColorCategory === catName 
                            ? 'bg-amber-500 text-black font-extrabold shadow' 
                            : 'bg-neutral-900 text-slate-400 border border-neutral-800 hover:text-white'
                        }`}
                      >
                        {catName}
                      </button>
                    ))}
                  </div>

                  {/* Preset Shade Chips for Active Category */}
                  <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto bg-neutral-900/60 p-2.5 rounded-xl border border-neutral-800">
                    {COLOR_SHADES_CATALOG[activeColorCategory]?.map(color => {
                      const isSelected = addForm.colors.split(',').map(c => c.trim().toLowerCase()).includes(color.toLowerCase());
                      return (
                        <button
                          key={color}
                          type="button"
                          onClick={() => toggleColorInAddForm(color)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all border ${
                            isSelected 
                              ? 'bg-amber-500 text-black border-amber-400 font-bold shadow' 
                              : 'bg-neutral-900 text-slate-300 border-neutral-800 hover:border-amber-500/50'
                          }`}
                        >
                          {isSelected ? '✓ ' : '+ '}{color}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Raw Comma Separated Input */}
                <input 
                  type="text" 
                  value={addForm.colors} 
                  onChange={e => setAddForm({ ...addForm, colors: e.target.value })} 
                  placeholder="Raw colors list (comma separated)" 
                  required 
                  className="w-full bg-neutral-900 border border-neutral-800 text-white rounded-lg p-2 text-[11px] font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Initial Stock Quantity Per Variant</label>
                <input 
                  type="number" value={addForm.initial_stock} onChange={e => setAddForm({ ...addForm, initial_stock: Number(e.target.value) })} required 
                  className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl p-3"
                />
              </div>

              {/* SUPABASE MULTI-IMAGE GALLERY MANAGER */}
              <ProductImageManager
                images={addImages}
                onChange={setAddImages}
                availableColors={addForm.colors.split(',')}
              />

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Care Instructions</label>
                <input 
                  type="text" 
                  value={addForm.care_instructions} 
                  onChange={e => setAddForm({ ...addForm, care_instructions: e.target.value })}
                  className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl p-3"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Description</label>
                <textarea 
                  rows={3} value={addForm.description} onChange={e => setAddForm({ ...addForm, description: e.target.value })}
                  placeholder="Describe material, fitting and style..."
                  className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl p-3"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-neutral-800">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-5 py-2.5 bg-neutral-800 text-slate-300 rounded-xl">Cancel</button>
                <button type="submit" className="px-6 py-2.5 bg-amber-500 text-black font-extrabold rounded-xl shadow-lg shadow-amber-500/20">Create Product</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
