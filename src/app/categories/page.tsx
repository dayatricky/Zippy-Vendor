'use client';

import React, { useState } from 'react';
import toast from 'react-hot-toast';
import {
  Grid,
  Plus,
  Search,
  Check,
  X,
  Trash2,
  FolderPlus,
  Layers,
  Package,
  RefreshCw,
  AlertCircle,
  Edit,
} from 'lucide-react';
import { useVendorStore } from '@/store/useVendorStore';
import {
  useGetCategoriesQuery,
  useAddCategoryMutation,
  useUpdateCategoryMutation,
  useDeleteCategoryMutation,
} from '@/store/api/vendorApi';

export default function CategoriesPage() {
  const {
    categories: localCategories,
    addCategory,
    toggleCategoryStatus,
    deleteCategory,
  } = useVendorStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [apiError, setApiError] = useState('');

  // RTK Query API hooks matching Swagger Specs (/vendor/categories)
  const {
    data: categoriesApiData,
    isLoading: isCategoriesLoading,
    isFetching: isCategoriesFetching,
    error: categoriesQueryError,
    refetch: refetchCategories,
  } = useGetCategoriesQuery(searchTerm ? { search: searchTerm } : undefined);

  const [addCategoryApi, { isLoading: isAddingApi }] = useAddCategoryMutation();
  const [updateCategoryApi, { isLoading: isUpdatingApi }] = useUpdateCategoryMutation();
  const [deleteCategoryApi] = useDeleteCategoryMutation();

  const isUUID = (str?: string) =>
    Boolean(str && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(str));

  // Helper to safely extract categories array from any API payload structure
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

  const displayCategories =
    rawApiCategories && Array.isArray(rawApiCategories)
      ? rawApiCategories.map((c: any, idx: number) => ({
          id: c.id || c._id || `cat-${idx}`,
          name: c.name || 'Category',
          slug: c.slug || (c.name ? c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'category'),
          description: c.description || 'Grocery and daily store items category.',
          image: c.image_url || c.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&q=80',
          productCount: c.productCount || c.product_count || 0,
          isActive: c.status === 'ACTIVE' || c.isActive !== false,
        }))
      : [];

  // Form State for New / Edit Category
  const [newCat, setNewCat] = useState({
    name: '',
    slug: '',
    description: '',
    image: '',
    isActive: true,
  });

  const filteredCategories = displayCategories.filter(
    (c: any) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleNameChange = (name: string) => {
    const generatedSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    setNewCat({ ...newCat, name, slug: generatedSlug });
  };

  const handleAddCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCat.name) return;
    setApiError('');

    try {
      await addCategoryApi({
        name: newCat.name,
        slug: newCat.slug || newCat.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        description: newCat.description || 'Grocery and daily store items category.',
        image_url: newCat.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&q=80',
        display_order: 1,
        status: newCat.isActive ? 'ACTIVE' : 'INACTIVE',
      }).unwrap();

      toast.success('Category created successfully! 🚀');
      setIsModalOpen(false);
      setNewCat({ name: '', slug: '', description: '', image: '', isActive: true });
    } catch (err: any) {
      console.error('Add Category Error:', err);
      const msg = err?.data?.msg || err?.data?.message || err?.message || 'Failed to create category';
      setApiError(msg);
      toast.error(msg);
    }

    // Local fallback update for instant UI response
    addCategory({
      name: newCat.name,
      slug: newCat.slug || 'category-' + Date.now(),
      description: newCat.description || 'Grocery and daily store items category.',
      image: newCat.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&q=80',
      isActive: newCat.isActive,
    });
  };

  const handleEditCategoryClick = (cat: any) => {
    setEditingCatId(cat.id);
    setNewCat({
      name: cat.name || '',
      slug: cat.slug || '',
      description: cat.description || '',
      image: cat.image || '',
      isActive: cat.isActive !== false,
    });
    setApiError('');
    setIsEditModalOpen(true);
  };

  const handleEditCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCatId || !newCat.name) return;
    setApiError('');

    try {
      if (isUUID(editingCatId)) {
        await updateCategoryApi({
          id: editingCatId,
          name: newCat.name,
          slug: newCat.slug || newCat.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          description: newCat.description,
          image_url: newCat.image,
          status: newCat.isActive ? 'ACTIVE' : 'INACTIVE',
        }).unwrap();
      }
      toast.success('Category updated successfully! ✨');
      setIsEditModalOpen(false);
      setEditingCatId(null);
      setNewCat({ name: '', slug: '', description: '', image: '', isActive: true });
    } catch (err: any) {
      console.error('Edit Category Error:', err);
      const msg = err?.data?.msg || err?.data?.message || err?.message || 'Failed to update category';
      setApiError(msg);
      toast.error(msg);
    }
  };

  const handleToggleStatus = async (catId: string, currentActive: boolean) => {
    setApiError('');
    try {
      if (isUUID(catId)) {
        await updateCategoryApi({
          id: catId,
          status: currentActive ? 'INACTIVE' : 'ACTIVE',
        }).unwrap();
      }
      toast.success(`Category status set to ${currentActive ? 'INACTIVE' : 'ACTIVE'}`);
    } catch (err: any) {
      console.error('Update Category Status Error:', err);
      const msg = err?.data?.msg || err?.data?.message || err?.message || 'Failed to update status';
      setApiError(msg);
      toast.error(msg);
    }
    toggleCategoryStatus(catId);
  };

  const handleDeleteCategory = async (catId: string) => {
    setApiError('');
    try {
      if (isUUID(catId)) {
        await deleteCategoryApi(catId).unwrap();
      }
      toast.success('Category removed! 🗑️');
    } catch (err: any) {
      console.error('Delete Category Error:', err);
      const msg = err?.data?.msg || err?.data?.message || err?.message || 'Failed to delete category';
      setApiError(msg);
      toast.error(msg);
    }
    deleteCategory(catId);
  };

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Grid className="w-6 h-6 text-[#167a46]" />
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Category Manager</h1>
          </div>
          <p className="text-slate-600 text-xs md:text-sm mt-1">
            Organize and manage your store product categories.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => refetchCategories()}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-2xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold shadow-xs transition-all cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 text-[#167a46] ${isCategoriesFetching ? 'animate-spin' : ''}`} />
            <span>{isCategoriesFetching ? 'Refreshing...' : 'Refresh'}</span>
          </button>

          <button
            onClick={() => {
              setApiError('');
              setIsModalOpen(true);
            }}
            className="px-5 py-2.5 rounded-2xl font-bold text-xs bg-[#167a46] hover:bg-[#12653a] text-white transition-all flex items-center space-x-2 shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Category</span>
          </button>
        </div>
      </div>

      {/* API Error Alert Banner */}
      {categoriesQueryError && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
            <span>Categories server sync notice: Could not fetch categories from server.</span>
          </div>
          <button
            onClick={() => refetchCategories()}
            className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ml-3"
          >
            Retry Sync
          </button>
        </div>
      )}

      {apiError && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{apiError}</span>
          </div>
          <button onClick={() => setApiError('')} className="text-rose-500 hover:text-rose-700 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Category Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="white-card p-4 flex items-center justify-between border border-slate-200 shadow-sm">
          <div>
            <span className="text-xs text-slate-500 font-bold uppercase">Total Categories</span>
            <div className="text-2xl font-black text-slate-900">{displayCategories.length}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#167a46] flex items-center justify-center border border-emerald-200">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="white-card p-4 flex items-center justify-between border border-slate-200 shadow-sm">
          <div>
            <span className="text-xs text-slate-500 font-bold uppercase">Active Categories</span>
            <div className="text-2xl font-black text-[#167a46]">
              {displayCategories.filter((c: any) => c.isActive).length}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-[#167a46] flex items-center justify-center border border-emerald-300">
            <Check className="w-5 h-5" />
          </div>
        </div>

        <div className="white-card p-4 flex items-center justify-between border border-slate-200 shadow-sm">
          <div>
            <span className="text-xs text-slate-500 font-bold uppercase">Hidden / Inactive</span>
            <div className="text-2xl font-black text-slate-500">
              {displayCategories.filter((c: any) => !c.isActive).length}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center border border-slate-200">
            <X className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="white-card p-4 flex items-center justify-between gap-4 shadow-sm border border-slate-200">
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search categories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="custom-input w-full pl-10 pr-4 py-2.5 text-sm"
          />
        </div>
        <div className="text-xs text-slate-500 font-semibold hidden sm:block">
          Showing {filteredCategories.length} of {displayCategories.length} categories
        </div>
      </div>

      {/* Categories Cards Grid */}
      {isCategoriesLoading ? (
        <div className="p-16 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
          <RefreshCw className="w-8 h-8 text-[#167a46] animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-600">Loading categories...</p>
        </div>
      ) : filteredCategories.length === 0 ? (
        <div className="p-16 text-center bg-white rounded-2xl border border-dashed border-slate-200 space-y-4">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
            <Layers className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">No Categories Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              {searchTerm
                ? `No categories matched "${searchTerm}".`
                : 'No categories have been added yet. Please create a category first to begin listing products.'}
            </p>
          </div>
          {!searchTerm && (
            <button
              onClick={() => {
                setEditingCatId(null);
                setNewCat({ name: '', slug: '', description: '', image: '', isActive: true });
                setIsModalOpen(true);
              }}
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-[#167a46] hover:bg-[#12653a] text-white font-bold text-xs transition-all shadow-sm cursor-pointer mx-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Add First Category</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCategories.map((category: any) => (
            <div
              key={category.id}
              className={`white-card p-5 space-y-4 relative overflow-hidden transition-all flex flex-col justify-between shadow-sm border ${
                !category.isActive ? 'opacity-60 bg-slate-50 border-slate-300' : 'border-slate-200'
              }`}
            >
              <div className="space-y-3">
                {/* Category Image Header */}
                <div className="relative h-36 w-full rounded-2xl overflow-hidden bg-slate-100 border border-slate-200">
                  <img
                    src={category.image}
                    alt={category.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-200 text-[10px] font-bold text-slate-800 font-mono">
                    /{category.slug}
                  </div>

                  <div className="absolute top-3 right-3 flex items-center space-x-1.5">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-black border backdrop-blur-md ${
                        category.isActive
                          ? 'bg-emerald-600 border-emerald-500 text-white'
                          : 'bg-slate-600 border-slate-500 text-white'
                      }`}
                    >
                      {category.isActive ? 'ACTIVE' : 'HIDDEN'}
                    </span>
                  </div>
                </div>

                {/* Title & Description */}
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-slate-900">{category.name}</h3>
                    <span className="text-xs px-2 py-0.5 rounded-md bg-emerald-50 text-[#167a46] font-bold border border-emerald-200 flex items-center space-x-1">
                      <Package className="w-3 h-3" />
                      <span>{category.productCount} items</span>
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                    {category.description}
                  </p>
                </div>
              </div>

              {/* Actions: Toggle Active Switch, Edit & Delete */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-semibold text-slate-600">Active:</span>
                  <button
                    onClick={() => handleToggleStatus(category.id, category.isActive)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${
                      category.isActive ? 'bg-[#167a46]' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow-xs ${
                        category.isActive ? 'translate-x-4' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleEditCategoryClick(category)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-[#167a46] hover:bg-emerald-50 transition-colors cursor-pointer"
                    title="Edit Category"
                  >
                    <Edit className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleDeleteCategory(category.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    title="Delete Category"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Category Modal Dialog */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in-50">
          <div className="white-card max-w-lg w-full p-6 space-y-6 shadow-2xl relative border-2 border-[#167a46]">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div className="flex items-center space-x-2">
                <Edit className="w-5 h-5 text-[#167a46]" />
                <h3 className="text-xl font-black text-slate-900">Edit Category Details</h3>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleEditCategorySubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Category Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Organic Vegetables"
                  value={newCat.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="custom-input w-full px-4 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Category Slug (URL Path)</label>
                <input
                  type="text"
                  required
                  placeholder="organic-vegetables"
                  value={newCat.slug}
                  onChange={(e) => setNewCat({ ...newCat, slug: e.target.value })}
                  className="custom-input w-full px-4 py-2 text-sm font-mono text-xs bg-slate-50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Brief description of items included in this category..."
                  value={newCat.description}
                  onChange={(e) => setNewCat({ ...newCat, description: e.target.value })}
                  className="custom-input w-full px-4 py-2 text-sm resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Category Banner Image URL</label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={newCat.image}
                  onChange={(e) => setNewCat({ ...newCat, image: e.target.value })}
                  className="custom-input w-full px-4 py-2 text-sm"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingApi}
                  className="px-5 py-2 rounded-xl bg-[#167a46] hover:bg-[#12653a] text-white font-bold text-xs shadow-md cursor-pointer"
                >
                  {isUpdatingApi ? 'Saving...' : 'Update Category via API'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Category Modal Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in-50">
          <div className="white-card max-w-lg w-full p-6 space-y-6 shadow-2xl relative border-2 border-[#167a46]">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div className="flex items-center space-x-2">
                <FolderPlus className="w-5 h-5 text-[#167a46]" />
                <h3 className="text-xl font-black text-slate-900">Add New Category to Store</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleAddCategorySubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Category Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Organic Vegetables"
                  value={newCat.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="custom-input w-full px-4 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Category Slug (URL Path)</label>
                <input
                  type="text"
                  required
                  placeholder="organic-vegetables"
                  value={newCat.slug}
                  onChange={(e) => setNewCat({ ...newCat, slug: e.target.value })}
                  className="custom-input w-full px-4 py-2 text-sm font-mono text-xs bg-slate-50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Brief description of items included in this category..."
                  value={newCat.description}
                  onChange={(e) => setNewCat({ ...newCat, description: e.target.value })}
                  className="custom-input w-full px-4 py-2 text-sm resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Category Banner Image URL</label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={newCat.image}
                  onChange={(e) => setNewCat({ ...newCat, image: e.target.value })}
                  className="custom-input w-full px-4 py-2 text-sm"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAddingApi}
                  className="px-5 py-2 rounded-xl bg-[#167a46] hover:bg-[#12653a] text-white font-bold text-xs shadow-md cursor-pointer"
                >
                  {isAddingApi ? 'Creating...' : 'Save Category via API'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
