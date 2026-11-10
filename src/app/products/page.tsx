'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
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
  AlertTriangle,
  Sparkles,
  Mic,
  MicOff,
  Loader2,
  Volume2,
  Clock,
  CheckCircle,
  XCircle,
  Check,
  Lock,
} from 'lucide-react';
import { useVendorStore } from '@/store/useVendorStore';
import {
  useGetStoreRequestQuery,
  useGetProductsQuery,
  useGetCategoriesQuery,
  useAddProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
  useUploadProductImageMutation,
  useUpdateProductImageMutation,
} from '@/store/api/vendorApi';
import Link from 'next/link';
import AiProductChatbot, { AiSuggestedProduct } from '@/components/AiProductChatbot';
import { startVoiceRecording, VoiceRecordingSession } from '@/utils/audioRecorder';
import ImageUploadField from '@/components/ImageUploadField';
import { resolveImageUrl } from '@/utils/imageUrl';

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
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'PENDING' | 'INACTIVE' | 'REJECTED'>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editingProductImageId, setEditingProductImageId] = useState<string | null>(null);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [isImageUploading, setIsImageUploading] = useState(false);
  const [approvalError, setApprovalError] = useState('');
  const [isAiAssistantOpen, setIsAiAssistantOpen] = useState(false);

  // Unified MCP Search State (supports both search_products_from_voice_tool and search_products_tool)
  const [mcpSearchResults, setMcpSearchResults] = useState<{
    source: 'voice' | 'text';
    query?: string;
    results: any[];
  } | null>(null);

  // Search execution states
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [isVoiceSearching, setIsVoiceSearching] = useState(false);
  const [isTextSearching, setIsTextSearching] = useState(false);
  const [voiceRecordingSession, setVoiceRecordingSession] = useState<VoiceRecordingSession | null>(null);
  const sessionRef = useRef<VoiceRecordingSession | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  useEffect(() => {
    let interval: any;
    if (isRecordingVoice) {
      interval = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setRecordingSeconds(0);
    }
    return () => clearInterval(interval);
  }, [isRecordingVoice]);

  const handleStopVoiceRecording = async () => {
    const session = sessionRef.current || voiceRecordingSession;
    if (!session) return;
    sessionRef.current = null;
    setVoiceRecordingSession(null);
    setIsRecordingVoice(false);
    setIsVoiceSearching(true);

    try {
      const { base64 } = await session.stop();

      const toastId = toast.loading('Searching products from voice (search_products_from_voice_tool)...');

      const userToken = token || (typeof window !== 'undefined' ? localStorage.getItem('zippy_vendor_token') : null);
      const res = await fetch('/api/ai/products/voice-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(userToken ? { 'Authorization': `Bearer ${userToken}` } : {}),
        },
        body: JSON.stringify({ audio_base64: base64 }),
      });

      const data = await res.json();
      toast.dismiss(toastId);

      if (!data.success) {
        toast.error(data.message || 'Voice search could not recognize audio. Please try again.');
        return;
      }

      const results = data.results || [];
      const topTerm = results.length > 0 ? results[0].name : 'Voice Search';
      setMcpSearchResults({
        source: 'voice',
        query: topTerm,
        results: results,
      });

      if (results.length > 0) {
        toast.success(`Found ${results.length} product(s) via Voice Search!`, { icon: '🎙️' });
      } else {
        toast('No matching products found for spoken audio.', { icon: '🔍' });
      }
    } catch (err: any) {
      console.error('Voice search failed:', err);
      toast.error(err.message || 'Voice search request failed.');
    } finally {
      setIsVoiceSearching(false);
    }
  };

  const handleStartVoiceRecording = async () => {
    try {
      setApprovalError('');
      const session = await startVoiceRecording({
        silenceTimeoutMs: 2000, // 2-second silence detection: automatic search!
        onSilenceDetected: () => {
          toast('2s pause detected — searching voice now...', { icon: '⚡' });
          handleStopVoiceRecording();
        },
      });
      sessionRef.current = session;
      setVoiceRecordingSession(session);
      setIsRecordingVoice(true);
      setRecordingSeconds(0);
      toast('Listening... Speak product name (auto-searches on 2s pause or click stop)', { icon: '🎙️' });
    } catch (err: any) {
      console.error('Microphone access error:', err);
      toast.error(err.message || 'Could not access microphone.');
    }
  };

  // MCP Text Search using search_products_tool
  const handleTextSearchSubmit = async (queryText?: string) => {
    const q = (queryText !== undefined ? queryText : searchTerm).trim();
    if (!q) {
      handleClearSearchFilter();
      return;
    }

    setIsTextSearching(true);
    const toastId = toast.loading(`Searching MCP catalog for "${q}"...`);
    try {
      const userToken = token || (typeof window !== 'undefined' ? localStorage.getItem('zippy_vendor_token') : null);
      const res = await fetch('/api/ai/products/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(userToken ? { 'Authorization': `Bearer ${userToken}` } : {}),
        },
        body: JSON.stringify({ user_message: q }),
      });
      const data = await res.json();
      toast.dismiss(toastId);

      if (!data.success) {
        toast.error(data.message || 'Search failed.');
        return;
      }

      const results = data.results || [];
      setMcpSearchResults({
        source: 'text',
        query: q,
        results: results,
      });

      if (results.length > 0) {
        toast.success(`Found ${results.length} product(s) for "${q}"!`, { icon: '🔍' });
      } else {
        toast(`No products found for "${q}".`, { icon: '🔍' });
      }
    } catch (err: any) {
      toast.dismiss(toastId);
      console.error('MCP text search failed:', err);
      toast.error(err.message || 'Search request failed.');
    } finally {
      setIsTextSearching(false);
    }
  };

  const handleAddVoiceResultToCatalog = (item: any) => {
    if (!isApproved) {
      setApprovalError(`Store approval is required to add products to inventory. Current status: ${currentStatus || 'NOT_REGISTERED'}`);
      return;
    }
    const matchingCat = categoriesList.find((c: any) => c.name.toLowerCase() === (item.category || '').toLowerCase()) || categoriesList[0];
    const mrp = parseFloat(String(item.mrp)) || 40;
    const price = item.price ? Number(item.price) : Math.round(mrp * 0.9);

    setNewProduct({
      name: item.name || '',
      price: String(price),
      mrp: String(mrp),
      categoryId: matchingCat?.id || '',
      categoryName: matchingCat?.name || item.category || 'General',
      stock: String(item.stock_quantity || 20),
      unit: item.unit || '1 kg',
      image: item.image_url || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&q=80',
    });
    setApprovalError('');
    setIsModalOpen(true);
  };

  // RTK Query API hooks matching Swagger Specs
  const {
    data: productsApiData,
    isLoading: isProductsLoading,
    isFetching: isProductsFetching,
    error: productsError,
    refetch: refetchProducts,
  } = useGetProductsQuery({ search: searchTerm });
  const { data: categoriesApiData, refetch: refetchCategories } = useGetCategoriesQuery();

  const handleClearSearchFilter = () => {
    setMcpSearchResults(null);
    setSearchTerm('');
    setSelectedCategory('All');
    setStatusFilter('ALL');
    try {
      refetchProducts();
    } catch {}
    toast('Filter cleared — showing all products from store API', { icon: '🔄' });
  };
  const [addProductApi, { isLoading: isAddingProductApi }] = useAddProductMutation();
  const [updateProductApi, { isLoading: isUpdatingProductApi }] = useUpdateProductMutation();
  const [deleteProductApi] = useDeleteProductMutation();
  const [uploadProductImage, { isLoading: isUploadingImageApi }] = useUploadProductImageMutation();
  const [updateProductImage, { isLoading: isUpdatingImageApi }] = useUpdateProductImageMutation();

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
    // Always merge categories created in Categories manager
    if (localCategories && localCategories.length > 0) {
      const extraLocal = localCategories
        .filter((loc) => !list.some((apiCat) => apiCat.id === loc.id || apiCat.name.toLowerCase() === loc.name.toLowerCase()))
        .map((c: any) => ({
          id: String(c.id || c._id || ''),
          name: String(c.name || 'Category'),
        }))
        .filter((c) => c.id && c.name);
      list = [...list, ...extraLocal];
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

  const displayProducts = useMemo(() => {
    let apiList: any[] = [];
    if (rawApiProducts && Array.isArray(rawApiProducts)) {
      apiList = rawApiProducts.map((p: any, idx: number) => {
        const catName = typeof p.category === 'object' && p.category !== null 
          ? p.category.name 
          : typeof p.category_name === 'object' && p.category_name !== null
          ? p.category_name.name
          : p.category_name || p.category || 'Grocery';

        const primaryImgObj = Array.isArray(p.images) && p.images.length > 0
          ? (p.images.find((img: any) => img?.is_primary) || p.images[0])
          : null;
        const imageUrl = primaryImgObj?.image_url || primaryImgObj?.url || p.image_url || p.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&q=80';
        const primaryImageId = primaryImgObj?.id || primaryImgObj?._id || (Array.isArray(p.images) && p.images[0]?.id) || null;

        const rawStatus = (p.status || p.approval_status || p.approvalStatus) as string | undefined;
        let status = rawStatus ? String(rawStatus).toUpperCase() : 'PENDING';
        if (status === 'UNDER_REVIEW' || status === 'PENDING_APPROVAL' || status === 'PENDING_REVIEW') {
          status = 'PENDING';
        }

        const isAvailable = status === 'ACTIVE';

        return {
          id: String(p.id || p._id || `p-${idx}`),
          name: p.name || 'Product',
          price: p.selling_price ?? p.price ?? p.mrp ?? 0,
          mrp: p.mrp ?? p.selling_price ?? p.price ?? 0,
          image: resolveImageUrl(imageUrl),
          rawImageUrl: imageUrl,
          primaryImageId: primaryImageId,
          images: Array.isArray(p.images) ? p.images : [],
          category: typeof catName === 'string' ? catName : 'Grocery',
          categoryId: typeof p.category === 'object' && p.category !== null ? p.category.id : p.category_id,
          stock: p.stock ?? p.stock_quantity ?? 10,
          isAvailable: isAvailable,
          status: status,
          rejectionReason: p.rejection_reason || p.rejectionReason,
          unit: p.pack_size || p.unit || '1 kg',
          sku: p.sku,
          brand_name: p.brand_name || 'Generic',
        };
      });
    }

    // Merge with any local products in Zustand store created in this session
    const combined = [...apiList];
    if (localProducts && localProducts.length > 0) {
      for (const lp of localProducts) {
        if (!combined.some((cp) => cp.id === lp.id || cp.name.toLowerCase() === lp.name.toLowerCase())) {
          combined.unshift({
            id: lp.id,
            name: lp.name,
            price: lp.price,
            mrp: lp.mrp,
            image: lp.image,
            category: lp.category,
            categoryId: lp.categoryId,
            stock: lp.stock,
            isAvailable: lp.status === 'ACTIVE',
            status: lp.status || 'PENDING',
            rejectionReason: lp.rejectionReason,
            unit: lp.unit,
            sku: lp.sku,
            brand_name: lp.brand_name || 'Generic',
          });
        }
      }
    }
    return combined;
  }, [rawApiProducts, localProducts]);

  const pendingCount = useMemo(() => displayProducts.filter((p: any) => p.status === 'PENDING').length, [displayProducts]);
  const activeCount = useMemo(() => displayProducts.filter((p: any) => p.status === 'ACTIVE').length, [displayProducts]);
  const inactiveCount = useMemo(() => displayProducts.filter((p: any) => p.status === 'INACTIVE').length, [displayProducts]);
  const router = useRouter();
  const rejectedCount = useMemo(() => displayProducts.filter((p: any) => p.status === 'REJECTED').length, [displayProducts]);

  // Form Field Validation Error States
  const [priceError, setPriceError] = useState('');
  const [mrpError, setMrpError] = useState('');
  const [stockError, setStockError] = useState('');

  // Validates Selling Price field: Non-negative, positive, cannot exceed MRP if MRP exists
  const validatePriceField = (val: string, currentMrp?: string): string => {
    if (!val || val.trim() === '') {
      return 'Selling Price is required.';
    }
    if (val.includes('-')) {
      return 'Selling Price cannot be negative. Please enter a valid non-negative amount.';
    }
    const num = parseFloat(val);
    if (isNaN(num)) {
      return 'Please enter a valid numerical price.';
    }
    if (num < 0) {
      return 'Selling Price cannot be negative. Please enter a valid non-negative amount.';
    }
    if (num === 0) {
      return 'Selling Price must be greater than ₹0.';
    }
    if (currentMrp && currentMrp.trim() !== '') {
      const mrpNum = parseFloat(currentMrp);
      if (!isNaN(mrpNum) && mrpNum >= 0 && num > mrpNum) {
        return `Selling Price (₹${num}) cannot exceed MRP Price (₹${mrpNum}).`;
      }
    }
    return '';
  };

  // Validates MRP field: Non-negative, cannot be less than Selling Price if price exists
  const validateMrpField = (val: string, currentPrice?: string): string => {
    if (!val || val.trim() === '') {
      return ''; // MRP is optional (defaults to Selling Price)
    }
    if (val.includes('-')) {
      return 'MRP cannot be negative. Please enter a valid non-negative amount.';
    }
    const num = parseFloat(val);
    if (isNaN(num)) {
      return 'Please enter a valid numerical MRP.';
    }
    if (num < 0) {
      return 'MRP cannot be negative. Please enter a valid non-negative amount.';
    }
    if (currentPrice && currentPrice.trim() !== '') {
      const priceNum = parseFloat(currentPrice);
      if (!isNaN(priceNum) && priceNum > 0 && num < priceNum) {
        return `MRP Price (₹${num}) cannot be less than Selling Price (₹${priceNum}).`;
      }
    }
    return '';
  };

  // Validates Stock Count field: Non-negative integer
  const validateStockField = (val: string): string => {
    if (!val || val.trim() === '') {
      return 'Stock count is required.';
    }
    if (val.includes('-')) {
      return 'Stock count cannot be negative.';
    }
    const num = parseInt(val, 10);
    if (isNaN(num) || num < 0) {
      return 'Stock count must be a non-negative whole number.';
    }
    return '';
  };

  const handleAddProductClick = () => {
    const activeToken = typeof window !== 'undefined' ? localStorage.getItem('zippy_vendor_token') : null;
    if (!activeToken) {
      toast.error('Authentication session expired. Please log in again to add products.', {
        duration: 4000,
        icon: '🔒',
      });
      setTimeout(() => {
        router.push('/login');
      }, 1200);
      return;
    }

    setSelectedImageFile(null);
    setEditingProductId(null);
    setEditingProductImageId(null);
    setPriceError('');
    setMrpError('');
    setStockError('');
    setNewProduct({
      name: '',
      price: '',
      mrp: '',
      categoryId: categoriesList[0]?.id || '',
      categoryName: categoriesList[0]?.name || 'Grocery',
      stock: '25',
      unit: '1 kg',
      image: '',
    });
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
    const activeToken = typeof window !== 'undefined' ? localStorage.getItem('zippy_vendor_token') : null;
    if (!activeToken) {
      toast.error('Authentication session expired. Please log in again to edit products.', {
        duration: 4000,
        icon: '🔒',
      });
      setTimeout(() => {
        router.push('/login');
      }, 1200);
      return;
    }

    setEditingProductId(product.id);
    setEditingProductImageId(product.primaryImageId || null);
    setSelectedImageFile(null);
    setPriceError('');
    setMrpError('');
    setStockError('');

    const catObj = categoriesList.find((c: any) => c.id === product.categoryId || c.name === product.category);
    setNewProduct({
      name: product.name || '',
      price: String(product.price || ''),
      mrp: String(product.mrp || product.price || ''),
      categoryId: catObj?.id || product.categoryId || categoriesList[0]?.id || '',
      categoryName: product.category || categoriesList[0]?.name || '',
      stock: String(product.stock ?? 10),
      unit: product.unit || '1 kg',
      image: product.rawImageUrl || product.image || '',
    });
    setApprovalError('');
    setIsEditModalOpen(true);
  };

  const categoriesPills = ['All', ...Array.from(new Set(categoriesList.map((c: any) => c.name)))];

  // When search is active (voice or text), ONLY show the products returned by the search response!
  // When cleared, show all products from the Store API!
  const displayedProductsList = useMemo(() => {
    if (mcpSearchResults !== null) {
      return mcpSearchResults.results.map((item: any, idx: number) => {
        const existingInStore = displayProducts.find(
          (dp: any) =>
            (item.id && dp.id && String(item.id) === String(dp.id)) ||
            dp.name.toLowerCase() === (item.name || '').toLowerCase()
        );

        const mrpNum = parseFloat(String(item.mrp)) || 40;
        const priceNum = item.price ? Number(item.price) : Math.round(mrpNum * 0.9);

        return {
          id: existingInStore ? existingInStore.id : item.id || `mcp-prod-${idx}`,
          name: item.name || 'Product',
          price: existingInStore ? existingInStore.price : priceNum,
          mrp: existingInStore ? existingInStore.mrp : mrpNum,
          image: existingInStore?.image || item.image_url || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&q=80',
          category: existingInStore?.category || item.category || 'General',
          categoryId: existingInStore?.categoryId,
          stock: existingInStore?.stock ?? item.stock_quantity ?? 10,
          isAvailable: existingInStore ? existingInStore.isAvailable : false,
          status: existingInStore ? existingInStore.status : 'PENDING',
          rejectionReason: existingInStore?.rejectionReason,
          unit: existingInStore?.unit || item.unit || '1 kg',
          isExistingInStore: Boolean(existingInStore),
          rawItemData: item,
        };
      });
    }

    // Normal view: from original Store API
    return displayProducts
      .filter((p: any) => {
        const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
        const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;
        const matchesSearch = searchTerm ? p.name.toLowerCase().includes(searchTerm.toLowerCase()) : true;
        return matchesCategory && matchesStatus && matchesSearch;
      })
      .map((p: any) => ({
        ...p,
        isExistingInStore: true,
        rawItemData: p,
      }));
  }, [mcpSearchResults, displayProducts, selectedCategory, statusFilter, searchTerm]);

  const isUUID = (str?: string) => Boolean(str && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(str));

  const handleEditProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Session Validity Check
    const activeToken = typeof window !== 'undefined' ? localStorage.getItem('zippy_vendor_token') : null;
    if (!activeToken) {
      toast.error('Authentication token has expired. Please log in again to continue.', {
        duration: 5000,
        icon: '🔒',
      });
      setTimeout(() => router.push('/login'), 1200);
      return;
    }

    // 2. Strict Input Validations
    const pErr = validatePriceField(newProduct.price, newProduct.mrp);
    const mErr = validateMrpField(newProduct.mrp, newProduct.price);
    const sErr = validateStockField(newProduct.stock);

    if (!newProduct.name || newProduct.name.trim() === '') {
      toast.error('Product title is required.');
      return;
    }

    if (pErr || mErr || sErr) {
      setPriceError(pErr);
      setMrpError(mErr);
      setStockError(sErr);
      toast.error(pErr || mErr || sErr || 'Please resolve the highlighted pricing validation errors.');
      return;
    }

    if (!editingProductId) return;

    const priceNum = parseFloat(newProduct.price);
    const mrpNum = newProduct.mrp && newProduct.mrp.trim() !== '' ? parseFloat(newProduct.mrp) : priceNum;
    const stockNum = parseInt(newProduct.stock, 10) || 10;

    const selectedCat = categoriesList.find((c: any) => c.id === newProduct.categoryId || c.name === newProduct.categoryName) || categoriesList[0];
    let category_id = selectedCat?.id || newProduct.categoryId;

    const images = (!selectedImageFile && newProduct.image) ? [
      {
        image_url: newProduct.image,
        display_order: 0,
        is_primary: true
      }
    ] : [];

    let updatedImageUrl = newProduct.image;

    try {
      if (isUUID(editingProductId)) {
        await updateProductApi({
          id: editingProductId,
          name: newProduct.name.trim(),
          slug: newProduct.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          mrp: mrpNum,
          stock_quantity: stockNum,
          unit: newProduct.unit,
          pack_size: newProduct.unit,
          ...(images.length > 0 ? { images } : {}),
          ...(isUUID(category_id) ? { category_id } : {}),
        }).unwrap();

        // If a new local image file was selected, upload via PATCH/POST
        if (selectedImageFile) {
          setIsImageUploading(true);
          try {
            if (editingProductImageId) {
              // Try PATCH /api/v1/vendor/products/:productId/images/:imageId
              try {
                const patchRes = await updateProductImage({
                  productId: editingProductId,
                  imageId: editingProductImageId,
                  file: selectedImageFile,
                  is_primary: true,
                  display_order: 0,
                }).unwrap();

                const serverPath =
                  patchRes?.data?.image_url ||
                  patchRes?.data?.url ||
                  patchRes?.data?.path ||
                  (patchRes as any)?.image_url ||
                  (patchRes as any)?.url;
                if (serverPath) updatedImageUrl = serverPath;
                toast.success('Product image updated on backend! 📸');
              } catch (patchErr) {
                console.warn('PATCH product image failed, falling back to POST upload:', patchErr);
                const postRes = await uploadProductImage({
                  productId: editingProductId,
                  file: selectedImageFile,
                  is_primary: true,
                  display_order: 0,
                }).unwrap();
                const serverPath =
                  postRes?.data?.image_url ||
                  postRes?.data?.url ||
                  postRes?.data?.path ||
                  (postRes as any)?.image_url ||
                  (postRes as any)?.url;
                if (serverPath) updatedImageUrl = serverPath;
                toast.success('Product image uploaded to backend! 📸');
              }
            } else {
              // POST /api/v1/vendor/products/:productId/images
              const postRes = await uploadProductImage({
                productId: editingProductId,
                file: selectedImageFile,
                is_primary: true,
                display_order: 0,
              }).unwrap();
              const serverPath =
                postRes?.data?.image_url ||
                postRes?.data?.url ||
                postRes?.data?.path ||
                (postRes as any)?.image_url ||
                (postRes as any)?.url;
              if (serverPath) updatedImageUrl = serverPath;
              toast.success('Product image uploaded to backend! 📸');
            }
          } catch (imgErr: any) {
            console.error('Update Image Error:', imgErr);
            toast.error(imgErr?.data?.message || imgErr?.message || 'Failed to upload updated product image');
          } finally {
            setIsImageUploading(false);
          }
        }
      }
      toast.success('Product updated successfully! ✏️');
      refetchProducts();
    } catch (err: any) {
      console.error('Edit Product Error:', err);
      const status = err?.status || err?.originalStatus;
      const errMsg = err?.data?.msg || err?.data?.message || err?.message || 'Failed to update product';

      const isTokenExpired =
        status === 401 ||
        String(errMsg).toLowerCase().includes('token has expired') ||
        String(errMsg).toLowerCase().includes('jwt expired') ||
        String(errMsg).toLowerCase().includes('token expired') ||
        String(errMsg).toLowerCase().includes('unauthorized');

      if (isTokenExpired) {
        toast.error('Authentication token has expired. Please log in again to continue.', {
          duration: 5000,
          icon: '🔒',
        });
        setTimeout(() => router.push('/login'), 1200);
        return;
      }
      setApprovalError(errMsg);
      toast.error(errMsg);
    }

    updateProduct(editingProductId, {
      name: newProduct.name.trim(),
      price: priceNum,
      mrp: mrpNum,
      category: selectedCat?.name || newProduct.categoryName || 'Grocery',
      stock: stockNum,
      unit: newProduct.unit,
      image: resolveImageUrl(updatedImageUrl || newProduct.image),
    });

    setIsEditModalOpen(false);
    setEditingProductId(null);
    setEditingProductImageId(null);
    setSelectedImageFile(null);
    setPriceError('');
    setMrpError('');
    setStockError('');
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
    const activeToken = typeof window !== 'undefined' ? localStorage.getItem('zippy_vendor_token') : null;
    if (!activeToken) {
      toast.error('Authentication token has expired. Please log in again.', {
        duration: 4000,
        icon: '🔒',
      });
      setTimeout(() => router.push('/login'), 1200);
      return;
    }
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

    // 1. Session Validity Check
    const activeToken = typeof window !== 'undefined' ? localStorage.getItem('zippy_vendor_token') : null;
    if (!activeToken) {
      toast.error('Authentication token has expired. Please log in again to continue.', {
        duration: 5000,
        icon: '🔒',
      });
      setTimeout(() => router.push('/login'), 1200);
      return;
    }

    // 2. Strict Input Validations
    const pErr = validatePriceField(newProduct.price, newProduct.mrp);
    const mErr = validateMrpField(newProduct.mrp, newProduct.price);
    const sErr = validateStockField(newProduct.stock);

    if (!newProduct.name || newProduct.name.trim() === '') {
      toast.error('Product title is required.');
      return;
    }

    if (pErr || mErr || sErr) {
      setPriceError(pErr);
      setMrpError(mErr);
      setStockError(sErr);
      toast.error(pErr || mErr || sErr || 'Please resolve the highlighted pricing validation errors.');
      return;
    }

    const priceNum = parseFloat(newProduct.price);
    const mrpNum = newProduct.mrp && newProduct.mrp.trim() !== '' ? parseFloat(newProduct.mrp) : priceNum;
    const stockNum = parseInt(newProduct.stock, 10) || 25;

    const selectedCat = categoriesList.find((c: any) => c.id === newProduct.categoryId || c.name === newProduct.categoryName) || categoriesList[0];
    let category_id = selectedCat?.id || newProduct.categoryId;
    if (!category_id) {
      const validUuidCat = categoriesList.find((c: any) => isUUID(c.id));
      category_id = validUuidCat ? validUuidCat.id : '00000000-0000-0000-0000-000000000001';
    }

    const initialImages = (!selectedImageFile && newProduct.image) ? [
      {
        image_url: newProduct.image,
        display_order: 0,
        is_primary: true
      }
    ] : [];

    let createdProductId = '';
    let uploadedImageUrl = newProduct.image;

    try {
      const createRes = await addProductApi({
        category_id: category_id,
        name: newProduct.name.trim(),
        slug: newProduct.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        mrp: mrpNum,
        unit: newProduct.unit || '1 kg',
        pack_size: newProduct.unit || '1 kg',
        stock_quantity: stockNum,
        images: initialImages,
        status: 'ACTIVE',
      }).unwrap();

      createdProductId = createRes?.data?.id || createRes?.data?._id || (createRes as any)?.id || (createRes as any)?.productId || '';

      // If user selected a local image file, upload it immediately via POST /api/v1/vendor/products/:productId/images
      if (selectedImageFile && createdProductId) {
        setIsImageUploading(true);
        try {
          const uploadRes = await uploadProductImage({
            productId: createdProductId,
            file: selectedImageFile,
            is_primary: true,
            display_order: 0,
          }).unwrap();

          const serverPath =
            uploadRes?.data?.image_url ||
            uploadRes?.data?.url ||
            uploadRes?.data?.path ||
            (uploadRes as any)?.image_url ||
            (uploadRes as any)?.url ||
            (typeof uploadRes?.data === 'string' ? uploadRes.data : null);

          if (serverPath) {
            uploadedImageUrl = serverPath;
          }
          toast.success('Product image saved on backend local storage! 📸');
        } catch (imgErr: any) {
          console.error('Image upload failed after product creation:', imgErr);
        } finally {
          setIsImageUploading(false);
        }
      }

      toast.success('Product added successfully! 🎉', { duration: 4000, icon: '✅' });
      refetchProducts();
    } catch (err: any) {
      console.error('Add Product Error:', err);
      const status = err?.status || err?.originalStatus;
      const errMsg = err?.data?.msg || err?.data?.message || err?.message || 'Failed to add product';

      const isTokenExpired =
        status === 401 ||
        String(errMsg).toLowerCase().includes('token has expired') ||
        String(errMsg).toLowerCase().includes('jwt expired') ||
        String(errMsg).toLowerCase().includes('token expired') ||
        String(errMsg).toLowerCase().includes('unauthorized');

      if (isTokenExpired) {
        toast.error('Authentication token has expired. Please log in again to continue.', {
          duration: 5000,
          icon: '🔒',
        });
        setTimeout(() => router.push('/login'), 1200);
        return;
      }
      setApprovalError(errMsg);
      toast.error(errMsg);
    }

    // Always update vendor catalog so user sees their newly added product immediately
    addProduct({
      name: newProduct.name.trim(),
      price: priceNum,
      mrp: mrpNum,
      category: selectedCat?.name || newProduct.categoryName || 'Grocery',
      categoryId: category_id,
      stock: stockNum,
      isAvailable: false,
      status: 'PENDING',
      unit: newProduct.unit,
      image: resolveImageUrl(uploadedImageUrl || newProduct.image),
    });

    setIsModalOpen(false);
    setSelectedImageFile(null);
    setEditingProductImageId(null);
    setPriceError('');
    setMrpError('');
    setStockError('');
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
    if (!isApproved) {
      toast.error('Store onboarding approval required to change product availability.');
      return;
    }
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
              const activeToken = typeof window !== 'undefined' ? localStorage.getItem('zippy_vendor_token') : null;
              if (!activeToken) {
                toast.error('Authentication session expired. Please log in again.', {
                  duration: 4000,
                  icon: '🔒',
                });
                setTimeout(() => router.push('/login'), 1200);
                return;
              }
              setApprovalError('');
              setIsAiAssistantOpen(true);
            }}
            className="px-4 py-2.5 rounded-2xl font-bold text-xs transition-all flex items-center space-x-2 shadow-sm bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-700 hover:to-indigo-700 text-white cursor-pointer active:scale-95 group"
          >
            <Sparkles className="w-4 h-4 text-amber-300 animate-pulse group-hover:rotate-12 transition-transform" />
            <span>AI Product Copilot</span>
            <span className="px-1.5 py-0.5 text-[9px] rounded-full font-bold uppercase tracking-wider bg-white/20">
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
            className="px-5 py-2.5 rounded-2xl font-bold text-xs transition-all flex items-center space-x-2 shadow-md active:scale-95 bg-[#167a46] hover:bg-[#12653a] text-white cursor-pointer"
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
        <div className="bg-amber-50 border-2 border-amber-300 p-4 rounded-2xl text-amber-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-sm animate-in fade-in-50">
          <div className="flex items-center space-x-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping shrink-0" />
            <div>
              <p className="font-bold text-sm text-amber-950">
                Store Onboarding Approval Required
              </p>
              <p className="text-amber-800 text-xs mt-0.5">
                Product creation and catalog management is locked until your store onboarding application is approved by Zippy Admin. Status: <strong className="uppercase">{currentStatus || 'NOT_REGISTERED'}</strong>
              </p>
            </div>
          </div>
          <Link
            href="/store-request"
            className="px-4 py-2 bg-amber-950 text-white rounded-xl text-xs font-black hover:bg-black transition-all shrink-0 shadow-sm"
          >
            {currentStatus === 'NOT_REGISTERED' ? 'Complete Store Onboarding 🚀' : 'Track Application 📋'}
          </Link>
        </div>
      )}

      {approvalError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-xl text-xs font-bold">
          {approvalError}
        </div>
      )}

      {/* Pending Products Alert Banner */}
      {pendingCount > 0 && (
        <div className="bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border-2 border-amber-300 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-950 shadow-sm animate-in fade-in-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Clock className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-sm text-amber-900">
                  {pendingCount} Product{pendingCount > 1 ? 's' : ''} Awaiting Admin Approval
                </h4>
                <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide bg-amber-200 text-amber-900 rounded-full border border-amber-300">
                  Under Review
                </span>
              </div>
              <p className="text-xs text-amber-700 mt-0.5 font-medium">
                Newly created products are being reviewed by Zippy Admin before going live in customer app.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setStatusFilter(statusFilter === 'PENDING' ? 'ALL' : 'PENDING')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer border ${
              statusFilter === 'PENDING'
                ? 'bg-amber-600 text-white border-amber-700'
                : 'bg-white text-amber-900 border-amber-300 hover:bg-amber-100'
            }`}
          >
            {statusFilter === 'PENDING' ? '✕ Show All Products' : 'View Pending Products Only ➔'}
          </button>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="space-y-3">
        <div className="white-card p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
          {/* Search Bar with Integrated Voice and Text Search via MCP */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleTextSearchSubmit();
            }}
            className="relative w-full md:w-96 flex items-center"
          >
            <button
              type="submit"
              className="p-1.5 text-slate-400 hover:text-emerald-700 absolute left-2.5 top-1/2 -translate-y-1/2 cursor-pointer transition-colors"
              title="Search products (search_products_tool)"
            >
              <Search className="w-4 h-4" />
            </button>
            <input
              type="text"
              placeholder={
                isRecordingVoice
                  ? 'Listening... (auto-searches on 2s silence)'
                  : 'Search items or click mic for voice...'
              }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              disabled={isRecordingVoice}
              className="custom-input w-full pl-10 pr-28 py-2.5 text-sm"
            />
            {/* Search Controls inside Search Input */}
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {isRecordingVoice ? (
                <button
                  type="button"
                  onClick={handleStopVoiceRecording}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold animate-pulse shadow-xs cursor-pointer"
                  title="Click to stop immediately (or pause 2s to auto-search)"
                >
                  <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                  <span>00:0{recordingSeconds}s Stop</span>
                </button>
              ) : isVoiceSearching || isTextSearching ? (
                <div className="p-1.5 text-emerald-600 flex items-center gap-1 text-xs font-semibold">
                  <Loader2 className="w-4 h-4 animate-spin" />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleStartVoiceRecording}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer group"
                  title="Search by voice (search_products_from_voice_tool) - auto-searches on 2s pause"
                >
                  <Mic className="w-4 h-4 group-hover:scale-110 transition-transform" />
                </button>
              )}

              {searchTerm && !mcpSearchResults && !isRecordingVoice && (
                <button
                  type="submit"
                  className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-md shadow-xs cursor-pointer transition-all"
                  title="Search via MCP tool"
                >
                  Search
                </button>
              )}

              {(searchTerm || mcpSearchResults !== null || selectedCategory !== 'All') && (
                <button
                  type="button"
                  onClick={handleClearSearchFilter}
                  className="px-2 py-1 rounded-md text-xs font-bold text-slate-500 hover:text-emerald-800 hover:bg-slate-100 transition-colors cursor-pointer flex items-center gap-1"
                  title="Clear Filter (Show All Products)"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Clear</span>
                </button>
              )}
            </div>
          </form>

          {/* Category Pills */}
          <div className="flex items-center space-x-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 scrollbar-none">
            <Filter className="w-4 h-4 text-slate-400 shrink-0 hidden sm:block" />
            {categoriesPills.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
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

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
              statusFilter === 'ALL'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <span>All Products</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${statusFilter === 'ALL' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
              {displayProducts.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('PENDING')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
              statusFilter === 'PENDING'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-white border border-amber-300 text-amber-800 hover:bg-amber-50'
            }`}
          >
            <Clock className={`w-3.5 h-3.5 ${statusFilter === 'PENDING' ? 'text-white' : 'text-amber-500'}`} />
            <span>Pending Approval</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${statusFilter === 'PENDING' ? 'bg-white/25 text-white' : 'bg-amber-100 text-amber-900'}`}>
              {pendingCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('ACTIVE')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
              statusFilter === 'ACTIVE'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white border border-emerald-200 text-emerald-800 hover:bg-emerald-50'
            }`}
          >
            <CheckCircle className={`w-3.5 h-3.5 ${statusFilter === 'ACTIVE' ? 'text-white' : 'text-emerald-600'}`} />
            <span>Active / Live</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${statusFilter === 'ACTIVE' ? 'bg-white/25 text-white' : 'bg-emerald-100 text-emerald-800'}`}>
              {activeCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('INACTIVE')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
              statusFilter === 'INACTIVE'
                ? 'bg-slate-700 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <AlertCircle className={`w-3.5 h-3.5 ${statusFilter === 'INACTIVE' ? 'text-white' : 'text-slate-500'}`} />
            <span>Out of Stock</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${statusFilter === 'INACTIVE' ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-600'}`}>
              {inactiveCount}
            </span>
          </button>

          {rejectedCount > 0 && (
            <button
              type="button"
              onClick={() => setStatusFilter('REJECTED')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                statusFilter === 'REJECTED'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-white border border-rose-200 text-rose-800 hover:bg-rose-50'
              }`}
            >
              <XCircle className={`w-3.5 h-3.5 ${statusFilter === 'REJECTED' ? 'text-white' : 'text-rose-600'}`} />
              <span>Rejected</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${statusFilter === 'REJECTED' ? 'bg-white/25 text-white' : 'bg-rose-100 text-rose-800'}`}>
                {rejectedCount}
              </span>
            </button>
          )}
        </div>

        {/* Live Voice Recording Status Banner with 2-second Silence Notice */}
        {isRecordingVoice && (
          <div className="bg-rose-50 border border-rose-200 text-rose-900 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs animate-in fade-in-50">
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full bg-rose-600 animate-ping shrink-0" />
              <div>
                <p className="text-xs font-bold text-rose-950">
                  🎙️ Recording Voice... Speak clearly into your microphone
                </p>
                <p className="text-[11px] text-rose-700">
                  Speak product name (e.g. &ldquo;Milk&rdquo;, &ldquo;Amul Taaza Milk&rdquo;). <strong>Auto-searches after 2-second pause</strong>, or click Stop anytime!
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleStopVoiceRecording}
              className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer shrink-0"
            >
              Stop &amp; Search Now (00:0{recordingSeconds}s) ➔
            </button>
          </div>
        )}

        {/* Live Search Processing Status Banner */}
        {(isVoiceSearching || isTextSearching) && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl p-3.5 flex items-center gap-3 shadow-xs animate-pulse">
            <Loader2 className="w-5 h-5 text-emerald-600 animate-spin shrink-0" />
            <div>
              <p className="text-xs font-bold text-emerald-950">
                Searching MCP Server Catalog...
              </p>
              <p className="text-[11px] text-emerald-700 font-mono">
                {isVoiceSearching
                  ? 'Tool: search_products_from_voice_tool @ zippy-mcp.elyriasoft.com/mcp'
                  : 'Tool: search_products_tool @ zippy-mcp.elyriasoft.com/mcp'}
              </p>
            </div>
          </div>
        )}

        {/* Active Search Results Banner (Voice or Text) */}
        {mcpSearchResults !== null && (
          <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border-2 border-emerald-300 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in-50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
                {mcpSearchResults.source === 'voice' ? (
                  <Mic className="w-5 h-5 animate-pulse" />
                ) : (
                  <Search className="w-5 h-5" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-emerald-950">
                    {mcpSearchResults.source === 'voice' ? 'Voice Search Response' : 'Search Response'}: ({displayedProductsList.length} items found)
                  </span>
                  <span className="text-[10px] bg-emerald-200 text-emerald-900 font-mono font-bold px-2 py-0.5 rounded-full border border-emerald-300">
                    {mcpSearchResults.source === 'voice'
                      ? 'search_products_from_voice_tool'
                      : 'search_products_tool'}
                  </span>
                </div>
                <p className="text-xs text-emerald-800 mt-0.5 font-medium">
                  Showing ONLY the products returned from the MCP search response for: <strong>&ldquo;{mcpSearchResults.query}&rdquo;</strong>
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleClearSearchFilter}
              className="text-xs font-bold text-emerald-900 bg-white border border-emerald-400 hover:bg-emerald-100 px-4 py-2 rounded-xl transition-all shadow-xs shrink-0 cursor-pointer flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>✕ Clear Filter (Show All Products)</span>
            </button>
          </div>
        )}
      </div>

      {/* Products Grid */}
      {isProductsLoading ? (
        <div className="p-16 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
          <RefreshCw className="w-8 h-8 text-[#167a46] animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-600">Loading products...</p>
        </div>
      ) : displayedProductsList.length === 0 ? (
        <div className="p-16 text-center bg-white rounded-2xl border border-dashed border-slate-200 space-y-4">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
            <Package className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">No Products Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              {mcpSearchResults !== null
                ? `No matching products were returned from MCP for "${mcpSearchResults.query}".`
                : searchTerm
                ? `No products matched "${searchTerm}".`
                : selectedCategory !== 'All'
                ? `No products found in category "${selectedCategory}".`
                : 'No products in your store inventory yet.'}
            </p>
          </div>
          {mcpSearchResults !== null || searchTerm || selectedCategory !== 'All' ? (
            <button
              onClick={handleClearSearchFilter}
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all shadow-sm cursor-pointer mx-auto"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Clear Filter &amp; Show All Products</span>
            </button>
          ) : (
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
          {displayedProductsList.map((product) => (
            <div
              key={product.id}
              className={`white-card p-5 space-y-4 relative overflow-hidden transition-all flex flex-col justify-between shadow-sm border ${
                product.isExistingInStore === false
                  ? 'border-emerald-300 bg-emerald-50/15'
                  : product.status === 'PENDING'
                  ? 'border-amber-300 bg-amber-50/20'
                  : product.status === 'REJECTED'
                  ? 'border-rose-300 bg-rose-50/25'
                  : !product.isAvailable
                  ? 'opacity-75 border-slate-300 bg-slate-50/50'
                  : 'border-slate-200 hover:border-emerald-300'
              }`}
            >
              <div className="space-y-3">
                {/* Image & Badges */}
                <div className="relative h-44 w-full rounded-2xl overflow-hidden bg-slate-100 border border-slate-200">
                  <img
                    src={resolveImageUrl(product.image)}
                    alt={product.name}
                    className="w-full h-full object-cover"
                    onError={(e: any) => {
                      e.target.src = 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&q=80';
                    }}
                  />
                  <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-200 text-[10px] font-bold text-[#167a46]">
                    {product.category}
                  </div>

                  {mcpSearchResults !== null && (
                    <div className="absolute bottom-3 left-3 bg-emerald-600 text-white backdrop-blur-md px-2.5 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1 shadow-xs border border-emerald-500">
                      {mcpSearchResults.source === 'voice' ? (
                        <Mic className="w-3 h-3" />
                      ) : (
                        <Search className="w-3 h-3" />
                      )}
                      <span>Response Item</span>
                    </div>
                  )}

                  {/* Status / Availability Badge */}
                  <div className="absolute top-3 right-3">
                    {product.isExistingInStore === false ? (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-black border backdrop-blur-md bg-amber-500 border-amber-400 text-white shadow-xs">
                        MCP CATALOG
                      </span>
                    ) : product.status === 'PENDING' ? (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-black border backdrop-blur-md bg-amber-500/95 border-amber-400 text-white flex items-center gap-1 shadow-xs animate-pulse">
                        <Clock className="w-3 h-3" />
                        <span>PENDING APPROVAL</span>
                      </span>
                    ) : product.status === 'REJECTED' ? (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-black border backdrop-blur-md bg-rose-600 border-rose-500 text-white flex items-center gap-1 shadow-xs">
                        <XCircle className="w-3 h-3" />
                        <span>REJECTED</span>
                      </span>
                    ) : (
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-black border backdrop-blur-md flex items-center gap-1 shadow-xs ${
                          product.isAvailable
                            ? 'bg-emerald-600 border-emerald-500 text-white'
                            : 'bg-slate-600 border-slate-500 text-white'
                        }`}
                      >
                        {product.isAvailable ? (
                          <>
                            <CheckCircle className="w-3 h-3" />
                            <span>IN STOCK</span>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-3 h-3" />
                            <span>OUT OF STOCK</span>
                          </>
                        )}
                      </span>
                    )}
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

                {/* Pending / Rejection Banner inside Card */}
                {product.status === 'PENDING' && product.isExistingInStore !== false && (
                  <div className="bg-amber-100/70 border border-amber-300/80 rounded-xl px-2.5 py-1.5 flex items-center gap-2 text-[11px] font-bold text-amber-900">
                    <Clock className="w-3.5 h-3.5 shrink-0 text-amber-600 animate-spin" />
                    <span>Pending Admin Review — will go live once approved</span>
                  </div>
                )}

                {product.status === 'REJECTED' && product.isExistingInStore !== false && (
                  <div className="bg-rose-100/70 border border-rose-300/80 rounded-xl px-2.5 py-1.5 text-[11px] text-rose-800">
                    <span className="font-bold text-rose-900">Admin Rejection: </span>
                    <span>{product.rejectionReason || 'Pricing or details need correction'}</span>
                  </div>
                )}
              </div>

              {/* Card Bottom Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                {product.isExistingInStore === false ? (
                  <div className="w-full flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-emerald-800">Not in Inventory</span>
                    <button
                      onClick={() => handleAddVoiceResultToCatalog(product.rawItemData || product)}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add to Store</span>
                    </button>
                  </div>
                ) : (
                  <>
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

                    {product.status === 'PENDING' ? (
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-800 bg-amber-100/80 px-2.5 py-1 rounded-lg border border-amber-300">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        <span>Awaiting Approval</span>
                      </div>
                    ) : product.status === 'REJECTED' ? (
                      <div className="flex items-center gap-1 text-[11px] font-bold text-rose-800 bg-rose-100/80 px-2.5 py-1 rounded-lg border border-rose-300">
                        <XCircle className="w-3.5 h-3.5 text-rose-600" />
                        <span>Rejected</span>
                      </div>
                    ) : (
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
                    )}
                  </>
                )}
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
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">Selling Price (₹) *</label>
                    {priceError ? (
                      <span className="text-[10px] font-bold text-rose-600 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-rose-500 shrink-0" />
                        Invalid
                      </span>
                    ) : newProduct.price && parseFloat(newProduct.price) > 0 ? (
                      <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                        <Check className="w-3 h-3 text-emerald-500 shrink-0" />
                        Non-negative
                      </span>
                    ) : null}
                  </div>
                  <input
                    type="number"
                    required
                    min="0"
                    step="any"
                    placeholder="e.g. 40"
                    value={newProduct.price}
                    onKeyDown={(e) => {
                      if (['-', '+', 'e', 'E'].includes(e.key)) e.preventDefault();
                    }}
                    onChange={(e) => {
                      let val = e.target.value;
                      if (val.includes('-')) {
                        val = val.replace(/-/g, '');
                        setPriceError('Negative prices are not allowed. Please enter a valid non-negative amount.');
                      }
                      setNewProduct({ ...newProduct, price: val });
                      const err = validatePriceField(val, newProduct.mrp);
                      setPriceError(err);
                      if (newProduct.mrp) {
                        setMrpError(validateMrpField(newProduct.mrp, val));
                      }
                    }}
                    className={`custom-input w-full px-4 py-2 text-sm transition-all ${
                      priceError ? 'border-rose-500 bg-rose-50/40 text-rose-900 focus:border-rose-500 focus:ring-rose-200' : ''
                    }`}
                  />
                  {priceError && (
                    <p className="mt-1 text-xs text-rose-600 font-semibold flex items-center gap-1 animate-in fade-in">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      <span>{priceError}</span>
                    </p>
                  )}
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">MRP Price (₹)</label>
                    {mrpError ? (
                      <span className="text-[10px] font-bold text-rose-600 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-rose-500 shrink-0" />
                        Invalid
                      </span>
                    ) : newProduct.mrp && parseFloat(newProduct.mrp) >= 0 ? (
                      <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                        <Check className="w-3 h-3 text-emerald-500 shrink-0" />
                        Non-negative
                      </span>
                    ) : null}
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="e.g. 50"
                    value={newProduct.mrp}
                    onKeyDown={(e) => {
                      if (['-', '+', 'e', 'E'].includes(e.key)) e.preventDefault();
                    }}
                    onChange={(e) => {
                      let val = e.target.value;
                      if (val.includes('-')) {
                        val = val.replace(/-/g, '');
                        setMrpError('Negative MRP is not allowed. Please enter a valid non-negative amount.');
                      }
                      setNewProduct({ ...newProduct, mrp: val });
                      const err = validateMrpField(val, newProduct.price);
                      setMrpError(err);
                      if (newProduct.price) {
                        setPriceError(validatePriceField(newProduct.price, val));
                      }
                    }}
                    className={`custom-input w-full px-4 py-2 text-sm transition-all ${
                      mrpError ? 'border-rose-500 bg-rose-50/40 text-rose-900 focus:border-rose-500 focus:ring-rose-200' : ''
                    }`}
                  />
                  {mrpError && (
                    <p className="mt-1 text-xs text-rose-600 font-semibold flex items-center gap-1 animate-in fade-in">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      <span>{mrpError}</span>
                    </p>
                  )}
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
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">Stock Count *</label>
                    {stockError && (
                      <span className="text-[10px] font-bold text-rose-600 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-rose-500 shrink-0" />
                        Invalid
                      </span>
                    )}
                  </div>
                  <input
                    type="number"
                    required
                    min="0"
                    step="1"
                    placeholder="25"
                    value={newProduct.stock}
                    onKeyDown={(e) => {
                      if (['-', '+', 'e', 'E', '.'].includes(e.key)) e.preventDefault();
                    }}
                    onChange={(e) => {
                      let val = e.target.value;
                      if (val.includes('-')) {
                        val = val.replace(/-/g, '');
                        setStockError('Stock count cannot be negative.');
                      }
                      setNewProduct({ ...newProduct, stock: val });
                      setStockError(validateStockField(val));
                    }}
                    className={`custom-input w-full px-4 py-2 text-sm transition-all ${
                      stockError ? 'border-rose-500 bg-rose-50/40 text-rose-900 focus:border-rose-500 focus:ring-rose-200' : ''
                    }`}
                  />
                  {stockError && (
                    <p className="mt-1 text-xs text-rose-600 font-semibold flex items-center gap-1 animate-in fade-in">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      <span>{stockError}</span>
                    </p>
                  )}
                </div>
              </div>

              <ImageUploadField
                label="Product Image"
                value={newProduct.image}
                onChangeUrl={(url) => setNewProduct({ ...newProduct, image: url })}
                selectedFile={selectedImageFile}
                onSelectFile={setSelectedImageFile}
                isUploading={isImageUploading || isUpdatingImageApi || isUploadingImageApi}
                uploadStatusText="Saving image on backend storage..."
              />

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
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">Selling Price (₹) *</label>
                    {priceError ? (
                      <span className="text-[10px] font-bold text-rose-600 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-rose-500 shrink-0" />
                        Invalid
                      </span>
                    ) : newProduct.price && parseFloat(newProduct.price) > 0 ? (
                      <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                        <Check className="w-3 h-3 text-emerald-500 shrink-0" />
                        Non-negative
                      </span>
                    ) : null}
                  </div>
                  <input
                    type="number"
                    required
                    min="0"
                    step="any"
                    placeholder="e.g. 40"
                    value={newProduct.price}
                    onKeyDown={(e) => {
                      if (['-', '+', 'e', 'E'].includes(e.key)) e.preventDefault();
                    }}
                    onChange={(e) => {
                      let val = e.target.value;
                      if (val.includes('-')) {
                        val = val.replace(/-/g, '');
                        setPriceError('Negative prices are not allowed. Please enter a valid non-negative amount.');
                      }
                      setNewProduct({ ...newProduct, price: val });
                      const err = validatePriceField(val, newProduct.mrp);
                      setPriceError(err);
                      if (newProduct.mrp) {
                        setMrpError(validateMrpField(newProduct.mrp, val));
                      }
                    }}
                    className={`custom-input w-full px-4 py-2 text-sm transition-all ${
                      priceError ? 'border-rose-500 bg-rose-50/40 text-rose-900 focus:border-rose-500 focus:ring-rose-200' : ''
                    }`}
                  />
                  {priceError && (
                    <p className="mt-1 text-xs text-rose-600 font-semibold flex items-center gap-1 animate-in fade-in">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      <span>{priceError}</span>
                    </p>
                  )}
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">MRP Price (₹)</label>
                    {mrpError ? (
                      <span className="text-[10px] font-bold text-rose-600 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-rose-500 shrink-0" />
                        Invalid
                      </span>
                    ) : newProduct.mrp && parseFloat(newProduct.mrp) >= 0 ? (
                      <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                        <Check className="w-3 h-3 text-emerald-500 shrink-0" />
                        Non-negative
                      </span>
                    ) : null}
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="e.g. 50"
                    value={newProduct.mrp}
                    onKeyDown={(e) => {
                      if (['-', '+', 'e', 'E'].includes(e.key)) e.preventDefault();
                    }}
                    onChange={(e) => {
                      let val = e.target.value;
                      if (val.includes('-')) {
                        val = val.replace(/-/g, '');
                        setMrpError('Negative MRP is not allowed. Please enter a valid non-negative amount.');
                      }
                      setNewProduct({ ...newProduct, mrp: val });
                      const err = validateMrpField(val, newProduct.price);
                      setMrpError(err);
                      if (newProduct.price) {
                        setPriceError(validatePriceField(newProduct.price, val));
                      }
                    }}
                    className={`custom-input w-full px-4 py-2 text-sm transition-all ${
                      mrpError ? 'border-rose-500 bg-rose-50/40 text-rose-900 focus:border-rose-500 focus:ring-rose-200' : ''
                    }`}
                  />
                  {mrpError && (
                    <p className="mt-1 text-xs text-rose-600 font-semibold flex items-center gap-1 animate-in fade-in">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      <span>{mrpError}</span>
                    </p>
                  )}
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
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">Initial Stock Count *</label>
                    {stockError && (
                      <span className="text-[10px] font-bold text-rose-600 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-rose-500 shrink-0" />
                        Invalid
                      </span>
                    )}
                  </div>
                  <input
                    type="number"
                    required
                    min="0"
                    step="1"
                    placeholder="25"
                    value={newProduct.stock}
                    onKeyDown={(e) => {
                      if (['-', '+', 'e', 'E', '.'].includes(e.key)) e.preventDefault();
                    }}
                    onChange={(e) => {
                      let val = e.target.value;
                      if (val.includes('-')) {
                        val = val.replace(/-/g, '');
                        setStockError('Stock count cannot be negative.');
                      }
                      setNewProduct({ ...newProduct, stock: val });
                      setStockError(validateStockField(val));
                    }}
                    className={`custom-input w-full px-4 py-2 text-sm transition-all ${
                      stockError ? 'border-rose-500 bg-rose-50/40 text-rose-900 focus:border-rose-500 focus:ring-rose-200' : ''
                    }`}
                  />
                  {stockError && (
                    <p className="mt-1 text-xs text-rose-600 font-semibold flex items-center gap-1 animate-in fade-in">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      <span>{stockError}</span>
                    </p>
                  )}
                </div>
              </div>

              <ImageUploadField
                label="Product Image"
                value={newProduct.image}
                onChangeUrl={(url) => setNewProduct({ ...newProduct, image: url })}
                selectedFile={selectedImageFile}
                onSelectFile={setSelectedImageFile}
                isUploading={isImageUploading || isUploadingImageApi}
                uploadStatusText="Uploading image to backend storage..."
              />

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
        isStoreApproved={true}
        onCatalogRefresh={() => refetchProducts()}
        onAddProduct={async (payload) => {
          const activeToken = typeof window !== 'undefined' ? localStorage.getItem('zippy_vendor_token') : null;
          if (!activeToken) {
            toast.error('Authentication token has expired. Please log in again to continue.', {
              duration: 5000,
              icon: '🔒',
            });
            setTimeout(() => router.push('/login'), 1200);
            throw new Error('Session expired');
          }
          try {
            const res = await addProductApi({
              ...payload,
              status: payload.status || 'PENDING',
            }).unwrap();
            // Update local store for instant UI feedback
            addProduct({
              name: payload.name,
              price: Number(payload.mrp) || 0,
              mrp: Number(payload.mrp) || 0,
              category: categoriesList.find((c: any) => c.id === payload.category_id)?.name || 'Grocery',
              categoryId: payload.category_id,
              stock: Number(payload.stock_quantity) || 50,
              isAvailable: false,
              status: 'PENDING',
              unit: payload.unit || '1 kg',
              image: payload.images?.[0]?.image_url || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&q=80',
            });
            toast.success('Product submitted for admin approval! ⏳');
            return res;
          } catch (err: any) {
            const status = err?.status || err?.originalStatus;
            const errMsg = err?.data?.msg || err?.data?.message || err?.message || 'Failed to add product';
            if (status === 401 || String(errMsg).toLowerCase().includes('token') || String(errMsg).toLowerCase().includes('unauthorized')) {
              toast.error('Authentication token has expired. Please log in again.', { duration: 5000, icon: '🔒' });
              setTimeout(() => router.push('/login'), 1200);
              throw err;
            }
            throw err;
          }
        }}
        onOpenManualModal={(prod) => {
          setIsAiAssistantOpen(false);
          const catObj = categoriesList.find(
            (c: any) => c.id === prod.category_id || c.name === prod.category_name
          );
          setEditingProductId(null);
          setEditingProductImageId(null);
          setSelectedImageFile(null);
          setPriceError('');
          setMrpError('');
          setStockError('');
          setNewProduct({
            name: prod.name || '',
            price: String(prod.price || prod.mrp || ''),
            mrp: String(prod.mrp || prod.price || ''),
            categoryId: catObj?.id || prod.category_id || categoriesList[0]?.id || '',
            categoryName: catObj?.name || prod.category_name || categoriesList[0]?.name || 'Grocery',
            stock: String(prod.stock_quantity || 25),
            unit: prod.unit || '1 kg',
            image: prod.image_url || (prod as any)?.image || '',
          });
          setIsModalOpen(true);
        }}
      />
    </div>
  );
}

