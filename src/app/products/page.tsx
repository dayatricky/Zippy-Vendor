'use client';

import React, { useState } from 'react';
import toast from 'react-hot-toast';
import {
  Package,
  Plus,
  Search,
  Filter,
  X,
  Edit,
  Trash2,
  RefreshCw,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { useVendorStore } from '@/store/useVendorStore';
import {
  useGetStoreRequestQuery,
  useGetProductsQuery,
  useGetCategoriesQuery,
  useAddProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
} from '@/store/api/vendorApi';
import Link from 'next/link';
import AiProductChatbot, { AiSuggestedProduct } from '@/components/AiProductChatbot';

export default function ProductsPage() {
  const { products: localProducts, categories: localCategories, addProduct, updateProduct, deleteProduct, toggleProductAvailability, vendor, setStoreModalOpen } = useVendorStore();
  
  const token = typeof window !== 'undefined' ? localStorage.getItem('zippy_vendor_token') : null;
  const savedStatus = typeof window !== 'undefined' ? localStorage.getItem('zippy_store_status') : null;

  const { data: storeRequestData } = useGetStoreRequestQuery(undefined, {
    skip: !token,
    refetchOnMountOrArgChange: true,
  });

  const requestObj = (storeRequestData as any)?.data || storeRequestData;
  const rawStatus = requestObj?.status || requestObj?.approvalStatus || requestObj?.storeRequest?.status;
  const currentStatus = rawStatus
    ? String(rawStatus).toUpperCase()
    : savedStatus
    ? String(savedStatus).toUpperCase()
    : vendor.approvalStatus;
  const isApproved = currentStatus === 'APPROVED';

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [approvalError, setApprovalError] = useState('');
  const [isAiAssistantOpen, setIsAiAssistantOpen] = useState(false);

  // RTK Query API hooks matching Swagger Specs
  const {
    data: productsApiData,
    isLoading: isProductsLoading,
    isFetching: isProductsFetching,
    error: productsError,
    refetch: refetchProducts,
  } = useGetProductsQuery({ search: searchTerm });
  const { data: categoriesApiData, refetch: refetchCategories } = useGetCategoriesQuery();
  const [addProductApi] = useAddProductMutation();
  const [updateProductApi] = useUpdateProductMutation();
  const [deleteProductApi] = useDeleteProductMutation();

  // Helper to safely extract categories list from GET /vendor/categories API
  const rawApiCategories = (() => {
    if (!categoriesApiData) return null;
    if (Array.isArray(categoriesApiData)) return categoriesApiData;
    if (Array.isArray((categoriesApiData as any).data)) return (categoriesApiData as any).data;
    if (Array.isArray((categoriesApiData as any).categories)) return (categoriesApiData as any).categories;
    if (Array.isArray((categoriesApiData as any).items)) return (categoriesApiData as any).items;
    if (Array.isArray((categoriesApiData as any).data?.categories)) return (categoriesApiData as any).data.categories;
    if (Array.isArray((categoriesApiData as any).data?.items)) return (categoriesApiData as any).data.items;
    return null;
  })();

  const categoriesList: Array<{ id: string; name: string }> = (() => {
    let list: Array<{ id: string; name: string }> = [];
    if (rawApiCategories && Array.isArray(rawApiCategories)) {
      list = rawApiCategories
        .filter((c: any) => c && typeof c === 'object')
        .map((c: any) => ({
          id: String(c.id || c._id || c.categoryId || ''),
          name: String(c.name || c.title || c.category_name || 'Category'),
        }))
        .filter((c) => c.id && c.name);
    }
    if (list.length === 0 && localCategories && localCategories.length > 0) {
      list = localCategories
        .map((c: any) => ({
          id: String(c.id || c._id || ''),
          name: String(c.name || 'Category'),
        }))
        .filter((c) => c.id && c.name);
    }
    return list;
  })();

  // Helper to safely extract products array from any API payload structure
  const rawApiProducts = (() => {
    if (!productsApiData) return null;
    if (Array.isArray(productsApiData)) return productsApiData;
    if (Array.isArray((productsApiData as any).data)) return (productsApiData as any).data;
    if (Array.isArray((productsApiData as any).products)) return (productsApiData as any).products;
    if (Array.isArray((productsApiData as any).items)) return (productsApiData as any).items;
    if (Array.isArray((productsApiData as any).data?.products)) return (productsApiData as any).data.products;
    if (Array.isArray((productsApiData as any).data?.items)) return (productsApiData as any).data.items;
    return null;
  })();

  const displayProducts = rawApiProducts && Array.isArray(rawApiProducts)
    ? rawApiProducts.map((p: any, idx: number) => {
        const catName = typeof p.category === 'object' && p.category !== null 
          ? p.category.name 
          : typeof p.category_name === 'object' && p.category_name !== null
          ? p.category_name.name
          : p.category_name || p.category || 'Grocery';

        const primaryImgObj = Array.isArray(p.images) && p.images.length > 0
          ? (p.images.find((img: any) => img?.is_primary) || p.images[0])
          : null;
        const imageUrl = primaryImgObj?.image_url || primaryImgObj?.url || p.image_url || p.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&q=80';

        return {
          id: p.id || p._id || `p-${idx}`,
          name: p.name || 'Product',
          price: p.price || p.mrp || 0,
          mrp: p.mrp || p.price || 0,
          image: imageUrl,
          category: typeof catName === 'string' ? catName : 'Grocery',
          categoryId: typeof p.category === 'object' && p.category !== null ? p.category.id : p.category_id,
          stock: p.stock ?? p.stock_quantity ?? 10,
          isAvailable: p.status === 'ACTIVE' || p.isAvailable !== false,
          unit: p.pack_size || p.unit || '1 kg',
        };
      })
    : [];

  const handleAddProductClick = () => {
    if (!isApproved) {
      setApprovalError(`Store approval is required to add products to inventory. Current status: ${currentStatus || 'NOT_REGISTERED'}`);
      return;
    }
    if (categoriesList.length === 0) {
      setApprovalError('Please create at least one Category in the Categories tab before adding products.');
      toast.error('Please create a Category first!');
      return;
    }
    setApprovalError('');
    setIsModalOpen(true);
  };

  // Form State for Add / Edit Product Modal
  const [newProduct, setNewProduct] = useState({
    name: '',
    price: '',
    mrp: '',
    categoryId: '',
    categoryName: '',
    stock: '',
    unit: '1 kg',
    image: '',
  });

  const handleEditProductClick = (product: any) => {
    setEditingProductId(product.id);
    const catObj = categoriesList.find((c: any) => c.id === product.categoryId || c.name === product.category);
    setNewProduct({
      name: product.name || '',
      price: String(product.price || ''),
      mrp: String(product.mrp || product.price || ''),
      categoryId: catObj?.id || product.categoryId || categoriesList[0]?.id || '',
      categoryName: product.category || categoriesList[0]?.name || '',
      stock: String(product.stock ?? 10),
      unit: product.unit || '1 kg',
      image: product.image || '',
    });
    setApprovalError('');
    setIsEditModalOpen(true);
  };

  const categoriesPills = ['All', ...Array.from(new Set(categoriesList.map((c: any) => c.name)))];

  const filteredProducts = displayProducts.filter((p: any) => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const isUUID = (str?: string) => Boolean(str && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(str));

  const handleEditProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProductId || !newProduct.name || !newProduct.price) return;

    const selectedCat = categoriesList.find((c: any) => c.id === newProduct.categoryId || c.name === newProduct.categoryName) || categoriesList[0];
    let category_id = selectedCat?.id || newProduct.categoryId;

    const images = newProduct.image ? [
      {
        image_url: newProduct.image,
        display_order: 0,
        is_primary: true
      }
    ] : [];

    try {
      if (isUUID(editingProductId)) {
        await updateProductApi({
          id: editingProductId,
          name: newProduct.name,
          slug: newProduct.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          mrp: parseFloat(newProduct.mrp) || parseFloat(newProduct.price) || 0,
          price: parseFloat(newProduct.price) || 0,
          stock: parseInt(newProduct.stock) || 10,
          unit: newProduct.unit,
          pack_size: newProduct.unit,
          images: images,
          ...(isUUID(category_id) ? { category_id } : {}),
        }).unwrap();
      }
      toast.success('Product updated successfully! ✏️');
    } catch (err: any) {
      console.error('Edit Product Error:', err);
      const errMsg = err?.data?.msg || err?.data?.message || err?.message || 'Failed to update product';
      setApprovalError(errMsg);
      toast.error(errMsg);
    }

    updateProduct(editingProductId, {
      name: newProduct.name,
      price: parseFloat(newProduct.price) || 0,
      mrp: parseFloat(newProduct.mrp) || parseFloat(newProduct.price) || 0,
      category: selectedCat?.name || newProduct.categoryName || 'Grocery',
      stock: parseInt(newProduct.stock) || 10,
      unit: newProduct.unit,
      image: newProduct.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&q=80',
    });

    setIsEditModalOpen(false);
    setEditingProductId(null);
    setNewProduct({
      name: '',
      price: '',
      mrp: '',
      categoryId: '',
      categoryName: '',
      stock: '',
      unit: '1 kg',
      image: '',
    });
  };

  const handleDeleteProduct = async (prodId: string) => {
    try {
      if (isUUID(prodId)) {
        await deleteProductApi(prodId).unwrap();
      }
      toast.success('Product removed from catalog! 🗑️');
    } catch (err: any) {
      console.error('Delete Product Error:', err);
      const errMsg = err?.data?.msg || err?.data?.message || err?.message || 'Failed to delete product';
      toast.error(errMsg);
    }
    deleteProduct(prodId);
  };

  const handleAddProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.name || !newProduct.price) return;

    const selectedCat = categoriesList.find((c: any) => c.id === newProduct.categoryId || c.name === newProduct.categoryName) || categoriesList[0];
    
    let category_id = selectedCat?.id;
    if (!isUUID(category_id)) {
      const validUuidCat = categoriesList.find((c: any) => isUUID(c.id));
      if (validUuidCat) {
        category_id = validUuidCat.id;
      }
    }

    if (!isUUID(category_id)) {
      const msg = 'Please select a valid category from your store categories list.';
      setApprovalError(msg);
      toast.error(msg);
      return;
    }

    const images = newProduct.image ? [
      {
        image_url: newProduct.image,
        display_order: 0,
        is_primary: true
      }
    ] : [];

    try {
      await addProductApi({
        category_id: category_id,
        name: newProduct.name,
        slug: newProduct.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        mrp: parseFloat(newProduct.mrp) || parseFloat(newProduct.price) || 0,
        unit: newProduct.unit,
        pack_size: newProduct.unit,
        stock_quantity: parseInt(newProduct.stock) || 100,
        images: images,
        status: 'ACTIVE',
      }).unwrap();
      toast.success('Product added to store catalog! 🛒');
    } catch (err: any) {
      console.error('Add Product Error:', err);
      const errMsg = err?.data?.msg || err?.data?.message || err?.message || 'Failed to add product';
      setApprovalError(errMsg);
      toast.error(errMsg);
    }

    addProduct({
      name: newProduct.name,
      price: parseFloat(newProduct.price) || 0,
      mrp: parseFloat(newProduct.mrp) || parseFloat(newProduct.price) || 0,
      category: selectedCat?.name || 'Grocery',
      stock: parseInt(newProduct.stock) || 10,
      isAvailable: true,
      unit: newProduct.unit,
      image: newProduct.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&q=80',
    });

    setIsModalOpen(false);
    setNewProduct({
      name: '',
      price: '',
      mrp: '',
      categoryId: '',
      categoryName: '',
      stock: '',
      unit: '1 kg',
      image: '',
    });
  };

  const handleToggleAvailability = async (prodId: string, currentAvailable: boolean) => {
    try {
      await updateProductApi({
        id: prodId,
        status: currentAvailable ? 'INACTIVE' : 'ACTIVE',
      }).unwrap();
    } catch (err) {
      console.error('API Update Product Status Error:', err);
    }
    toggleProductAvailability(prodId);
  };

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Package className="w-6 h-6 text-[#167a46]" />
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Product Catalog Manager</h1>
          </div>
          <p className="text-slate-600 text-xs md:text-sm mt-1">
            Manage your store inventory, stock availability & pricing in real-time.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 sm:space-x-3">
          {/* AI Chatbot / MCP Copilot Button */}
          <button
            onClick={() => {
              if (!isApproved) {
                setApprovalError(`Store approval is required to add products to inventory. Current status: ${currentStatus || 'NOT_REGISTERED'}`);
                return;
              }
              setApprovalError('');
              setIsAiAssistantOpen(true);
            }}
            className="px-4 py-2.5 rounded-2xl font-bold text-xs transition-all flex items-center space-x-2 shadow-sm hover:shadow-md bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-700 hover:to-indigo-700 text-white cursor-pointer active:scale-95 group"
          >
            <Sparkles className="w-4 h-4 text-amber-300 animate-pulse group-hover:rotate-12 transition-transform" />
            <span>AI Product Copilot</span>
            <span className="px-1.5 py-0.5 text-[9px] bg-white/20 rounded-full font-bold uppercase tracking-wider">
              MCP
            </span>
          </button>

          <button
            onClick={() => refetchProducts()}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold shadow-xs transition-all cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 text-[#167a46] ${isProductsFetching ? 'animate-spin' : ''}`} />
            <span>{isProductsFetching ? 'Refreshing...' : 'Refresh'}</span>
          </button>

          <button
            onClick={handleAddProductClick}
            className={`px-5 py-2.5 rounded-2xl font-bold text-xs transition-all flex items-center space-x-2 shadow-md active:scale-95 cursor-pointer ${
              isApproved
                ? 'bg-[#167a46] hover:bg-[#12653a] text-white'
                : 'bg-slate-200 text-slate-500 cursor-not-allowed'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>Add New Product</span>
          </button>
        </div>
      </div>

      {/* API Error Alert Banner */}
      {productsError && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
            <span>Products server sync notice: Could not fetch products from server.</span>
          </div>
          <button
            onClick={() => refetchProducts()}
            className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ml-3"
          >
            Retry Sync
          </button>
        </div>
      )}

      {/* Approval Status Warning Banner */}
      {!isApproved && (
        <div className="bg-amber-50 border-2 border-amber-300 p-4 rounded-2xl text-amber-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-sm">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping shrink-0" />
            <span>
              <strong>Store Approval Required:</strong> Product inventory management is locked until your store application is approved by Zippy Admin. Status: <strong>{currentStatus || 'NOT_REGISTERED'}</strong>
            </span>
          </div>
          <Link
            href="/store-request"
            className="px-4 py-2 bg-amber-950 text-white rounded-xl text-xs font-black hover:bg-black transition-all shrink-0"
          >
            Check Store Onboarding 🚀
          </Link>
        </div>
      )}

      {approvalError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-xl text-xs font-bold">
          {approvalError}
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="white-card p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
        {/* Search Bar */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search items by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="custom-input w-full pl-10 pr-4 py-2.5 text-sm"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center space-x-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 scrollbar-none">
          <Filter className="w-4 h-4 text-slate-400 shrink-0 hidden sm:block" />
          {categoriesPills.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-[#167a46] text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Products Grid */}
      {isProductsLoading ? (
        <div className="p-16 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
          <RefreshCw className="w-8 h-8 text-[#167a46] animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-600">Loading products...</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="p-16 text-center bg-white rounded-2xl border border-dashed border-slate-200 space-y-4">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
            <Package className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">No Products Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              {searchTerm
                ? `No products matched "${searchTerm}".`
                : selectedCategory !== 'All'
                ? `No products found in category "${selectedCategory}".`
                : 'No products have been added to your store inventory yet.'}
            </p>
          </div>
          {!searchTerm && (
            <button
              onClick={handleAddProductClick}
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-[#167a46] hover:bg-[#12653a] text-white font-bold text-xs transition-all shadow-sm cursor-pointer mx-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Add First Product</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              className={`white-card p-5 space-y-4 relative overflow-hidden transition-all flex flex-col justify-between shadow-sm border ${
                !product.isAvailable ? 'opacity-70 border-rose-200 bg-rose-50/20' : 'border-slate-200'
              }`}
            >
              <div className="space-y-3">
                {/* Image & Stock Badge */}
                <div className="relative h-44 w-full rounded-2xl overflow-hidden bg-slate-100 border border-slate-200">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-200 text-[10px] font-bold text-[#167a46]">
                    {product.category}
                  </div>

                  {/* Availability Badge */}
                  <div className="absolute top-3 right-3">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-black border backdrop-blur-md ${
                        product.isAvailable
                          ? 'bg-emerald-600 border-emerald-500 text-white'
                          : 'bg-rose-600 border-rose-500 text-white'
                      }`}
                    >
                      {product.isAvailable ? 'IN STOCK' : 'OUT OF STOCK'}
                    </span>
                  </div>
                </div>

                {/* Product Info */}
                <div>
                  <h3 className="text-base font-bold text-slate-900 line-clamp-1">{product.name}</h3>
                  <p className="text-xs text-slate-500 font-medium">Unit: {product.unit}</p>
                </div>

                {/* Price & MRP */}
                <div className="flex items-center space-x-2">
                  <span className="text-xl font-black text-[#167a46]">₹{product.price}</span>
                  {product.mrp > product.price && (
                    <span className="text-xs text-slate-400 line-through">₹{product.mrp}</span>
                  )}
                  <span className="text-xs text-slate-600 font-bold ml-auto">Stock: {product.stock}</span>
                </div>
              </div>

              {/* Card Bottom Actions: Edit, Delete & In-Stock Switch */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => handleEditProductClick(product)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-[#167a46] hover:bg-emerald-50 transition-colors flex items-center space-x-1 text-xs font-semibold cursor-pointer"
                    title="Edit Product"
                  >
                    <Edit className="w-4 h-4" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => handleDeleteProduct(product.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    title="Delete Product"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-[11px] font-semibold text-slate-500">In-Stock:</span>
                  <button
                    onClick={() => handleToggleAvailability(product.id, product.isAvailable)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${
                      product.isAvailable ? 'bg-[#167a46]' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow-xs ${
                        product.isAvailable ? 'translate-x-4' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Product Modal Dialog */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in-50">
          <div className="white-card max-w-lg w-full p-6 space-y-6 shadow-2xl relative border-2 border-[#167a46]">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div className="flex items-center space-x-2">
                <Edit className="w-5 h-5 text-[#167a46]" />
                <h3 className="text-xl font-black text-slate-900">Edit Product Details</h3>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleEditProductSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Product Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Organic Farm Fresh Tomatoes"
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                  className="custom-input w-full px-4 py-2 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Selling Price (₹) *</label>
                  <input
                    type="number"
                    required
                    placeholder="40"
                    value={newProduct.price}
                    onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                    className="custom-input w-full px-4 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">MRP Price (₹)</label>
                  <input
                    type="number"
                    placeholder="50"
                    value={newProduct.mrp}
                    onChange={(e) => setNewProduct({ ...newProduct, mrp: e.target.value })}
                    className="custom-input w-full px-4 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Category *</label>
                  <select
                    value={newProduct.categoryId || newProduct.categoryName || categoriesList[0]?.id || categoriesList[0]?.name || ''}
                    onChange={(e) => {
                      const catObj = categoriesList.find((c: any) => c.id === e.target.value || c.name === e.target.value);
                      setNewProduct({
                        ...newProduct,
                        categoryId: catObj?.id || e.target.value,
                        categoryName: catObj?.name || e.target.value,
                      });
                    }}
                    className="custom-input w-full px-4 py-2 text-sm bg-white text-slate-800"
                  >
                    {categoriesList.length > 0 ? (
                      categoriesList.map((cat: any) => (
                        <option key={cat.id || cat.name} value={cat.id || cat.name}>
                          {cat.name}
                        </option>
                      ))
                    ) : (
                      <option value="">-- No Vendor Categories Found --</option>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Stock Count *</label>
                  <input
                    type="number"
                    required
                    placeholder="25"
                    value={newProduct.stock}
                    onChange={(e) => setNewProduct({ ...newProduct, stock: e.target.value })}
                    className="custom-input w-full px-4 py-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Product Image URL</label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={newProduct.image}
                  onChange={(e) => setNewProduct({ ...newProduct, image: e.target.value })}
                  className="custom-input w-full px-4 py-2 text-sm"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#167a46] hover:bg-[#12653a] text-white font-bold text-xs shadow-md"
                >
                  Update Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add New Product Modal Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in-50">
          <div className="white-card max-w-lg w-full p-6 space-y-6 shadow-2xl relative border-2 border-[#167a46]">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div className="flex items-center space-x-2">
                <Plus className="w-5 h-5 text-[#167a46]" />
                <h3 className="text-xl font-black text-slate-900">Add New Product to Store</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleAddProductSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Product Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Organic Farm Fresh Tomatoes"
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                  className="custom-input w-full px-4 py-2 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Selling Price (₹) *</label>
                  <input
                    type="number"
                    required
                    placeholder="40"
                    value={newProduct.price}
                    onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                    className="custom-input w-full px-4 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">MRP Price (₹)</label>
                  <input
                    type="number"
                    placeholder="50"
                    value={newProduct.mrp}
                    onChange={(e) => setNewProduct({ ...newProduct, mrp: e.target.value })}
                    className="custom-input w-full px-4 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Category *</label>
                  <select
                    value={newProduct.categoryId || newProduct.categoryName || categoriesList[0]?.id || categoriesList[0]?.name || ''}
                    onChange={(e) => {
                      const catObj = categoriesList.find((c: any) => c.id === e.target.value || c.name === e.target.value);
                      setNewProduct({
                        ...newProduct,
                        categoryId: catObj?.id || e.target.value,
                        categoryName: catObj?.name || e.target.value,
                      });
                    }}
                    className="custom-input w-full px-4 py-2 text-sm bg-white text-slate-800"
                  >
                    {categoriesList.length > 0 ? (
                      categoriesList.map((cat: any) => (
                        <option key={cat.id || cat.name} value={cat.id || cat.name}>
                          {cat.name}
                        </option>
                      ))
                    ) : (
                      <option value="">-- No Vendor Categories Found (Add in Category Manager) --</option>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Initial Stock Count *</label>
                  <input
                    type="number"
                    required
                    placeholder="25"
                    value={newProduct.stock}
                    onChange={(e) => setNewProduct({ ...newProduct, stock: e.target.value })}
                    className="custom-input w-full px-4 py-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Product Image URL</label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={newProduct.image}
                  onChange={(e) => setNewProduct({ ...newProduct, image: e.target.value })}
                  className="custom-input w-full px-4 py-2 text-sm"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#167a46] hover:bg-[#12653a] text-white font-bold text-xs shadow-md"
                >
                  Save Product to Store
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI Product Creation Copilot Drawer */}
      <AiProductChatbot
        isOpen={isAiAssistantOpen}
        onClose={() => setIsAiAssistantOpen(false)}
        categoriesList={categoriesList}
        isStoreApproved={isApproved}
        onCatalogRefresh={() => refetchProducts()}
        onAddProduct={async (payload) => {
          const res = await addProductApi(payload).unwrap();
          // Update local store for instant UI feedback
          addProduct({
            name: payload.name,
            price: Number(payload.mrp) || 0,
            mrp: Number(payload.mrp) || 0,
            category: categoriesList.find((c: any) => c.id === payload.category_id)?.name || 'Grocery',
            stock: Number(payload.stock_quantity) || 50,
            isAvailable: true,
            unit: payload.unit || '1 kg',
            image: payload.images?.[0]?.image_url || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&q=80',
          });
          return res;
        }}
        onOpenManualModal={(prod) => {
          setIsAiAssistantOpen(false);
          const catObj = categoriesList.find(
            (c: any) => c.id === prod.category_id || c.name === prod.category_name
          );
          setNewProduct({
            name: prod.name || '',
            price: String(prod.price || ''),
            mrp: String(prod.mrp || prod.price || ''),
            categoryId: catObj?.id || prod.category_id || categoriesList[0]?.id || '',
            categoryName: catObj?.name || prod.category_name || categoriesList[0]?.name || '',
            stock: String(prod.stock_quantity || '50'),
            unit: prod.unit || '1 kg',
            image: prod.image_url || '',
          });
          setIsModalOpen(true);
        }}
      />
    </div>
  );
}

