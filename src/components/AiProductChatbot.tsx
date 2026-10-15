'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Sparkles,
  Bot,
  User,
  Send,
  X,
  Plus,
  Check,
  CheckCircle2,
  Package,
  Layers,
  ChevronRight,
  RefreshCw,
  SlidersHorizontal,
  Info,
  ExternalLink,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useGetCategoriesQuery } from '@/store/api/vendorApi';

const isUUID = (str?: string) =>
  Boolean(str && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(str));

export interface AiSuggestedProduct {
  name: string;
  slug: string;
  category_id?: string;
  category_name?: string;
  brand_name?: string;
  unit: string;
  pack_size: string;
  mrp: number;
  price: number;
  stock_quantity: number;
  image_url: string;
  description: string;
  key_features?: string[];
  price_range?: string;
  sku: string;
  barcode: string;
  status: string;
  isAdded?: boolean;
  selected?: boolean;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  products?: AiSuggestedProduct[];
  engine?: string;
}

interface AiProductChatbotProps {
  isOpen: boolean;
  onClose: () => void;
  categoriesList: Array<{ id: string; name: string }>;
  onAddProduct: (payload: any) => Promise<any>;
  onOpenManualModal?: (product: Partial<AiSuggestedProduct>) => void;
  onCatalogRefresh?: () => void;
  isStoreApproved?: boolean;
}

const QUICK_PROMPTS = [
  { label: '🍎 Fresh Seasonal Fruits', prompt: 'Generate fresh fruits (Apples, Bananas, Oranges)' },
  { label: '🥛 Dairy & Milk Items', prompt: 'Generate dairy products (Milk, Paneer, Curd, Butter)' },
  { label: '🥬 Farm Fresh Vegetables', prompt: 'Generate farm fresh daily vegetables (Tomato, Potato, Onion, Capsicum)' },
  { label: '🍞 Bakery & Farm Eggs', prompt: 'Generate bakery items (Whole wheat bread, white eggs, pav buns)' },
  { label: '🥤 Cold Drinks & Juices', prompt: 'Generate cold drinks and fruit juices (Coca-Cola, Fruit Juice)' },
  { label: '🍫 Chips & Snacks', prompt: 'Generate snacks and munchies (Potato chips, instant noodles)' },
  { label: '🌾 Atta, Rice & Staples', prompt: 'Generate daily grocery staples (Whole wheat atta, sunflower oil, rice)' },
];

export default function AiProductChatbot({
  isOpen,
  onClose,
  categoriesList,
  onAddProduct,
  onOpenManualModal,
  onCatalogRefresh,
  isStoreApproved = true,
}: AiProductChatbotProps) {
  // Query categories directly from Category API as well
  const { data: categoriesApiData } = useGetCategoriesQuery(undefined, { skip: !isOpen });

  const apiCategories = useMemo(() => {
    if (!categoriesApiData) return [];
    let raw: any[] = [];
    if (Array.isArray(categoriesApiData)) raw = categoriesApiData;
    else if (Array.isArray((categoriesApiData as any).data)) raw = (categoriesApiData as any).data;
    else if (Array.isArray((categoriesApiData as any).categories)) raw = (categoriesApiData as any).categories;
    else if (Array.isArray((categoriesApiData as any).items)) raw = (categoriesApiData as any).items;
    else if (Array.isArray((categoriesApiData as any).data?.categories)) raw = (categoriesApiData as any).data.categories;
    else if (Array.isArray((categoriesApiData as any).data?.items)) raw = (categoriesApiData as any).data.items;
    else if (Array.isArray((categoriesApiData as any).data?.rows)) raw = (categoriesApiData as any).data.rows;
    else if (Array.isArray((categoriesApiData as any).data?.result)) raw = (categoriesApiData as any).data.result;

    return raw
      .filter((c: any) => c && typeof c === 'object')
      .map((c: any) => ({
        id: String(c.id || c._id || c.categoryId || ''),
        name: String(c.name || c.title || c.category_name || 'Category'),
      }))
      .filter((c) => c.id && c.name);
  }, [categoriesApiData]);

  // Merge categories from props and Category API
  const activeCategories: Array<{ id: string; name: string }> = useMemo(() => {
    const map = new Map<string, string>();
    (categoriesList || []).forEach((c) => {
      if (c && c.id && c.name) map.set(c.id, c.name);
    });
    apiCategories.forEach((c) => {
      if (c && c.id && c.name) map.set(c.id, c.name);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [categoriesList, apiCategories]);

  const findBestCategory = (catHint: string = '', prodName: string = ''): { id: string; name: string } | null => {
    if (activeCategories.length === 0) return null;
    const text = `${catHint} ${prodName}`.toLowerCase();

    for (const c of activeCategories) {
      const cName = c.name.toLowerCase();
      if (text.includes(cName) || cName.includes(catHint.toLowerCase())) {
        return c;
      }
    }

    if (/dairy|milk|curd|paneer|butter|cheese|yogurt|cream/i.test(text)) {
      const found = activeCategories.find((c) => /dairy|milk/i.test(c.name));
      if (found) return found;
    }
    if (/fruit|apple|banana|mango|orange|berry/i.test(text)) {
      const found = activeCategories.find((c) => /fruit/i.test(c.name));
      if (found) return found;
    }
    if (/veg|produce|tomato|potato|onion|greens|capsicum/i.test(text)) {
      const found = activeCategories.find((c) => /veg|produce/i.test(c.name));
      if (found) return found;
    }
    if (/bakery|bread|egg|bun|pav|cake|toast/i.test(text)) {
      const found = activeCategories.find((c) => /bakery|bread|egg/i.test(c.name));
      if (found) return found;
    }
    if (/drink|juice|beverage|cola|soda|coffee|tea/i.test(text)) {
      const found = activeCategories.find((c) => /drink|juice|beverage/i.test(c.name));
      if (found) return found;
    }
    if (/snack|chips|munchies|noodle|maggi|biscuit/i.test(text)) {
      const found = activeCategories.find((c) => /snack|munchies|biscuit/i.test(c.name));
      if (found) return found;
    }
    if (/staple|atta|rice|oil|dal|flour|sugar/i.test(text)) {
      const found = activeCategories.find((c) => /staple|atta|rice|oil|grocery/i.test(c.name));
      if (found) return found;
    }

    const uuidCat = activeCategories.find((c) => isUUID(c.id));
    return uuidCat || activeCategories[0];
  };

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      sender: 'assistant',
      text: 'Hello! 👋 I am your **Zippy AI Catalog Copilot**. Tell me what products you want to generate (e.g., *"Generate dairy products like milk and yogurt"* or *"Generate fresh fruits like apples and bananas"*). All product details are fetched live from your **MCP Server** (`http://192.168.1.75:8000/mcp`)!',
      timestamp: 'Just now',
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mcpServerStatus, setMcpServerStatus] = useState<string>('Live MCP Server (192.168.1.75:8000/mcp)');
  const [addingIds, setAddingIds] = useState<Record<string, boolean>>({});
  const [batchAdding, setBatchAdding] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  if (!isOpen) return null;

  const handleSendMessage = async (queryText?: string) => {
    const textToSend = (queryText || inputValue).trim();
    if (!textToSend || isLoading) return;

    const userMsgId = `user-${Date.now()}`;
    const newMessages: ChatMessage[] = [
      ...messages,
      {
        id: userMsgId,
        sender: 'user',
        text: textToSend,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ];

    setMessages(newMessages);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          categories: activeCategories,
        }),
      });

      const data = await response.json();

      if (data.success && Array.isArray(data.products)) {
        if (data.server_url) {
          setMcpServerStatus(`Live MCP Server (${data.server_url.replace(/^https?:\/\//, '')})`);
        }

        const preparedProducts: AiSuggestedProduct[] = data.products.map((p: any, idx: number) => {
          // Match category ID from store Category API
          const matchedCategory = findBestCategory(p.category_name || '', p.name || '');

          return {
            ...p,
            category_id: matchedCategory?.id || p.category_id || activeCategories[0]?.id || '',
            category_name: matchedCategory?.name || p.category_name || activeCategories[0]?.name || 'Grocery',
            selected: true,
            isAdded: false,
          };
        });

        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            sender: 'assistant',
            text: data.message,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            products: preparedProducts,
            engine: data.engine,
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            sender: 'assistant',
            text: data.message || 'Could not generate product details. Please try again.',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      }
    } catch (err: any) {
      console.error('Chat error:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          sender: 'assistant',
          text: 'Unable to get a response due to a network or server issue. Please try again.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProductFieldChange = (
    msgId: string,
    prodIndex: number,
    field: keyof AiSuggestedProduct,
    value: any
  ) => {
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id !== msgId || !msg.products) return msg;
        const updatedProds = [...msg.products];
        updatedProds[prodIndex] = {
          ...updatedProds[prodIndex],
          [field]: value,
        };
        // Auto update category_name when category_id changes
        if (field === 'category_id') {
          const cat = activeCategories.find((c) => c.id === value);
          if (cat) updatedProds[prodIndex].category_name = cat.name;
        }
        return { ...msg, products: updatedProds };
      })
    );
  };

  const handleToggleSelect = (msgId: string, prodIndex: number) => {
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id !== msgId || !msg.products) return msg;
        const updatedProds = [...msg.products];
        updatedProds[prodIndex] = {
          ...updatedProds[prodIndex],
          selected: !updatedProds[prodIndex].selected,
        };
        return { ...msg, products: updatedProds };
      })
    );
  };

  const handleToggleSelectAll = (msgId: string, selectAll: boolean) => {
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id !== msgId || !msg.products) return msg;
        const updatedProds = msg.products.map((p) => (p.isAdded ? p : { ...p, selected: selectAll }));
        return { ...msg, products: updatedProds };
      })
    );
  };

  const handleAddSingleProduct = async (
    msgId: string,
    prodIndex: number,
    product: AiSuggestedProduct
  ) => {
    if (!isStoreApproved) {
      toast.error('Store approval required to add products to inventory.');
      return;
    }

    const itemKey = `${msgId}-${prodIndex}`;
    setAddingIds((prev) => ({ ...prev, [itemKey]: true }));

    // Resolve category matching Category API
    let targetCatId = product.category_id;
    const catObj = activeCategories.find((c) => c.id === targetCatId || c.name === product.category_name) || activeCategories[0];
    if (catObj) {
      targetCatId = catObj.id;
    }
    if (!isUUID(targetCatId)) {
      const validUuidCat = activeCategories.find((c) => isUUID(c.id));
      if (validUuidCat) {
        targetCatId = validUuidCat.id;
      }
    }

    if (!targetCatId) {
      toast.error('Please create at least one category before adding products.');
      setAddingIds((prev) => ({ ...prev, [itemKey]: false }));
      return;
    }

    const payload = {
      category_id: targetCatId,
      name: product.name,
      slug: product.slug || product.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''),
      description: product.description || product.name,
      brand_name: product.brand_name || 'Generic',
      sku: product.sku || `SKU-${Date.now()}`,
      barcode: product.barcode || `${Math.floor(1000000000 + Math.random() * 9000000000)}`,
      unit: product.unit || '1 kg',
      pack_size: product.pack_size || product.unit || '1 kg',
      mrp: parseFloat(String(product.price ?? product.mrp)) || parseFloat(String(product.mrp)) || 0,
      stock_quantity: parseInt(String(product.stock_quantity)) || 50,
      images: product.image_url
        ? [{ image_url: product.image_url, display_order: 0, is_primary: true }]
        : [],
      status: 'ACTIVE',
    };

    try {
      await onAddProduct(payload);
      toast.success(`🛒 "${product.name}" added to catalog!`);

      // Mark as added in UI
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id !== msgId || !msg.products) return msg;
          const updatedProds = [...msg.products];
          updatedProds[prodIndex] = { ...updatedProds[prodIndex], isAdded: true, selected: false };
          return { ...msg, products: updatedProds };
        })
      );

      if (onCatalogRefresh) onCatalogRefresh();
    } catch (err: any) {
      console.error('Failed to add product:', err);
      const errMsg = err?.data?.msg || err?.data?.message || err?.message || 'Failed to add product';
      toast.error(errMsg);
    } finally {
      setAddingIds((prev) => ({ ...prev, [itemKey]: false }));
    }
  };

  const handleAddBatchProducts = async (msgId: string, products: AiSuggestedProduct[]) => {
    if (!isStoreApproved) {
      toast.error('Store approval required to add products to inventory.');
      return;
    }

    const selectedProducts = products.filter((p) => p.selected && !p.isAdded);
    if (selectedProducts.length === 0) {
      toast.error('Please select at least one product to add.');
      return;
    }

    setBatchAdding(true);
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < selectedProducts.length; i++) {
      const p = selectedProducts[i];
      let targetCatId = p.category_id;
      const catObj = activeCategories.find((c) => c.id === targetCatId || c.name === p.category_name) || activeCategories[0];
      if (catObj) {
        targetCatId = catObj.id;
      }
      if (!isUUID(targetCatId)) {
        const validUuidCat = activeCategories.find((c) => isUUID(c.id));
        if (validUuidCat) {
          targetCatId = validUuidCat.id;
        }
      }

      if (!targetCatId) {
        failCount++;
        continue;
      }

      const payload = {
        category_id: targetCatId,
        name: p.name,
        slug: p.slug || p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''),
        description: p.description || p.name,
        brand_name: p.brand_name || 'Generic',
        sku: p.sku || `SKU-${Date.now()}-${i}`,
        barcode: p.barcode || `${Math.floor(1000000000 + Math.random() * 9000000000)}`,
        unit: p.unit || '1 kg',
        pack_size: p.pack_size || p.unit || '1 kg',
        mrp: parseFloat(String(p.price ?? p.mrp)) || parseFloat(String(p.mrp)) || 0,
        stock_quantity: parseInt(String(p.stock_quantity)) || 50,
        images: p.image_url
          ? [{ image_url: p.image_url, display_order: 0, is_primary: true }]
          : [],
        status: 'ACTIVE',
      };

      try {
        await onAddProduct(payload);
        successCount++;
      } catch (err) {
        console.error(`Failed to add ${p.name}:`, err);
        failCount++;
      }
    }

    setBatchAdding(false);

    if (successCount > 0) {
      toast.success(`🎉 ${successCount} products added to catalog successfully!`);

      // Update added flags in message
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id !== msgId || !msg.products) return msg;
          const updatedProds = msg.products.map((p) =>
            p.selected ? { ...p, isAdded: true, selected: false } : p
          );
          return { ...msg, products: updatedProds };
        })
      );

      if (onCatalogRefresh) onCatalogRefresh();
    }

    if (failCount > 0) {
      toast.error(`${failCount} products failed to add. Check categories and required fields.`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-sm flex justify-end transition-opacity duration-300">
      <div
        className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 transform transition-transform duration-300 ease-out"
        role="dialog"
        aria-label="AI Product Assistant"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-700 text-white flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 text-white shadow-inner">
              <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold tracking-tight">Zippy AI Catalog Copilot</h2>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-white/20 rounded-full border border-white/30 uppercase tracking-wider">
                  MCP Ready
                </span>
              </div>
              <p className="text-xs text-white/80 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-300 animate-ping" />
                <span className="text-emerald-100 font-medium">Connected to {mcpServerStatus}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors text-white"
            title="Close Assistant"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Suggestion Chips */}
        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 overflow-x-auto shrink-0 flex items-center space-x-2 scrollbar-none">
          <span className="text-xs font-semibold text-slate-500 flex items-center gap-1 shrink-0">
            <Bot className="w-3.5 h-3.5 text-emerald-600" /> Prompts:
          </span>
          {QUICK_PROMPTS.map((qp, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(qp.prompt)}
              disabled={isLoading}
              className="text-xs px-3 py-1 bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-200 hover:border-emerald-300 rounded-full transition-all shrink-0 font-medium shadow-2xs hover:shadow-xs active:scale-95 disabled:opacity-50"
            >
              {qp.label}
            </button>
          ))}
        </div>

        {/* Chat Messages Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-slate-50/50">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`flex items-start gap-2.5 max-w-[90%] sm:max-w-[85%] ${
                  msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold shadow-xs ${
                    msg.sender === 'user'
                      ? 'bg-slate-800 text-white'
                      : 'bg-gradient-to-br from-emerald-500 to-teal-700 text-white'
                  }`}
                >
                  {msg.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                <div
                  className={`rounded-2xl px-4 py-3 text-sm shadow-2xs ${
                    msg.sender === 'user'
                      ? 'bg-slate-900 text-white rounded-tr-none'
                      : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'
                  }`}
                >
                  <div className="whitespace-pre-line leading-relaxed font-sans">{msg.text}</div>
                  <div
                    className={`text-[10px] mt-1.5 text-right ${
                      msg.sender === 'user' ? 'text-slate-400' : 'text-slate-400'
                    }`}
                  >
                    {msg.timestamp}
                  </div>
                </div>
              </div>

              {/* Suggested Products Display */}
              {msg.products && msg.products.length > 0 && (
                <div className="w-full mt-4 pl-10">
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                    {/* Header Controls for Batch Add */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                      <div className="flex items-center space-x-2">
                        <label className="flex items-center space-x-2 text-xs font-semibold text-slate-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={msg.products.every((p) => p.selected || p.isAdded)}
                            onChange={(e) => handleToggleSelectAll(msg.id, e.target.checked)}
                            className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 border-slate-300"
                          />
                          <span>Select All ({msg.products.length} Products)</span>
                        </label>
                      </div>

                      <button
                        onClick={() => handleAddBatchProducts(msg.id, msg.products!)}
                        disabled={
                          batchAdding ||
                          !msg.products.some((p) => p.selected && !p.isAdded)
                        }
                        className="px-4 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      >
                        {batchAdding ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Registering Products...</span>
                          </>
                        ) : (
                          <>
                            <Package className="w-3.5 h-3.5" />
                            <span>
                              Register Selected (
                              {msg.products.filter((p) => p.selected && !p.isAdded).length}) to Catalog
                            </span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Products Grid */}
                    <div className="grid grid-cols-1 gap-3.5 mt-3.5 max-h-[460px] overflow-y-auto pr-1">
                      {msg.products.map((prod, pIdx) => {
                        const itemKey = `${msg.id}-${pIdx}`;
                        const isAdding = addingIds[itemKey];

                        return (
                          <div
                            key={pIdx}
                            className={`p-3 rounded-xl border transition-all ${
                              prod.isAdded
                                ? 'bg-emerald-50/50 border-emerald-200'
                                : prod.selected
                                ? 'bg-white border-emerald-400 shadow-xs'
                                : 'bg-slate-50/50 border-slate-200 opacity-80'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              {/* Selection Checkbox */}
                              <div className="pt-2">
                                <input
                                  type="checkbox"
                                  disabled={prod.isAdded}
                                  checked={prod.selected || prod.isAdded}
                                  onChange={() => handleToggleSelect(msg.id, pIdx)}
                                  className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 border-slate-300 disabled:opacity-50"
                                />
                              </div>

                              {/* Product Image Preview */}
                              <div className="w-16 h-16 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 shrink-0 relative">
                                <img
                                  src={prod.image_url}
                                  alt={prod.name}
                                  className="w-full h-full object-cover"
                                  onError={(e: any) => {
                                    e.target.src =
                                      'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200&q=80';
                                  }}
                                />
                                {prod.isAdded && (
                                  <div className="absolute inset-0 bg-emerald-600/80 backdrop-blur-2xs flex items-center justify-center text-white">
                                    <Check className="w-5 h-5 font-bold" />
                                  </div>
                                )}
                              </div>

                              {/* Details & Live Editable Inputs */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <input
                                    type="text"
                                    value={prod.name}
                                    disabled={prod.isAdded}
                                    onChange={(e) =>
                                      handleProductFieldChange(msg.id, pIdx, 'name', e.target.value)
                                    }
                                    className="font-semibold text-slate-800 text-sm w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-emerald-500 focus:bg-white rounded px-1 -mx-1 py-0.5 outline-hidden"
                                    title="Click to edit product name"
                                  />
                                  {prod.isAdded ? (
                                    <span className="shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                                      <CheckCircle2 className="w-3.5 h-3.5" /> Added
                                    </span>
                                  ) : prod.price_range ? (
                                    <span className="shrink-0 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                                      {prod.price_range}
                                    </span>
                                  ) : (
                                    <span className="shrink-0 text-[10px] font-medium text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                                      {prod.brand_name || 'Generic'}
                                    </span>
                                  )}
                                </div>

                                {prod.key_features && prod.key_features.length > 0 && (
                                  <div className="mt-1 flex flex-wrap gap-1">
                                    {prod.key_features.slice(0, 3).map((feat, fIdx) => (
                                      <span key={fIdx} className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                                        ✓ {feat}
                                      </span>
                                    ))}
                                  </div>
                                )}

                                {/* Category Mapping Selector */}
                                <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
                                  <div>
                                    <label className="text-[10px] font-semibold text-slate-500 block uppercase">
                                      Category
                                    </label>
                                    <select
                                      value={
                                        prod.category_id && activeCategories.some((c) => c.id === prod.category_id)
                                          ? prod.category_id
                                          : activeCategories[0]?.id || ''
                                      }
                                      disabled={prod.isAdded}
                                      onChange={(e) =>
                                        handleProductFieldChange(msg.id, pIdx, 'category_id', e.target.value)
                                      }
                                      className="w-full text-xs bg-white border border-slate-200 rounded px-1.5 py-1 text-slate-700 focus:ring-1 focus:ring-emerald-500 outline-hidden font-medium"
                                    >
                                      {activeCategories.length > 0 ? (
                                        activeCategories.map((cat) => (
                                          <option key={cat.id} value={cat.id}>
                                            {cat.name}
                                          </option>
                                        ))
                                      ) : (
                                        <option value="">No categories found</option>
                                      )}
                                    </select>
                                  </div>

                                  <div>
                                    <label className="text-[10px] font-semibold text-slate-500 block uppercase">
                                      Selling Price (₹)
                                    </label>
                                    <input
                                      type="number"
                                      value={prod.price}
                                      disabled={prod.isAdded}
                                      onChange={(e) =>
                                        handleProductFieldChange(
                                          msg.id,
                                          pIdx,
                                          'price',
                                          parseFloat(e.target.value) || 0
                                        )
                                      }
                                      className="w-full text-xs bg-white border border-slate-200 rounded px-2 py-1 text-emerald-700 font-bold focus:ring-1 focus:ring-emerald-500 outline-hidden"
                                    />
                                  </div>

                                  <div>
                                    <label className="text-[10px] font-semibold text-slate-500 block uppercase">
                                      MRP (₹)
                                    </label>
                                    <input
                                      type="number"
                                      value={prod.mrp}
                                      disabled={prod.isAdded}
                                      onChange={(e) =>
                                        handleProductFieldChange(
                                          msg.id,
                                          pIdx,
                                          'mrp',
                                          parseFloat(e.target.value) || 0
                                        )
                                      }
                                      className="w-full text-xs bg-white border border-slate-200 rounded px-2 py-1 text-slate-600 focus:ring-1 focus:ring-emerald-500 outline-hidden"
                                    />
                                  </div>

                                  <div>
                                    <label className="text-[10px] font-semibold text-slate-500 block uppercase">
                                      Stock & Pack
                                    </label>
                                    <div className="flex items-center gap-1">
                                      <input
                                        type="number"
                                        value={prod.stock_quantity}
                                        disabled={prod.isAdded}
                                        onChange={(e) =>
                                          handleProductFieldChange(
                                            msg.id,
                                            pIdx,
                                            'stock_quantity',
                                            parseInt(e.target.value) || 1
                                          )
                                        }
                                        title="Stock count"
                                        className="w-1/2 text-xs bg-white border border-slate-200 rounded px-1.5 py-1 text-slate-700 focus:ring-1 focus:ring-emerald-500 outline-hidden font-medium"
                                      />
                                      <input
                                        type="text"
                                        value={prod.unit}
                                        disabled={prod.isAdded}
                                        onChange={(e) =>
                                          handleProductFieldChange(msg.id, pIdx, 'unit', e.target.value)
                                        }
                                        title="Unit/Pack (e.g. 1 kg, 500 ml)"
                                        className="w-1/2 text-xs bg-white border border-slate-200 rounded px-1 py-1 text-slate-600 focus:ring-1 focus:ring-emerald-500 outline-hidden"
                                      />
                                    </div>
                                  </div>
                                </div>

                                {/* Action Buttons per Item */}
                                <div className="mt-2.5 flex items-center justify-end space-x-2">
                                  {onOpenManualModal && !prod.isAdded && (
                                    <button
                                      type="button"
                                      onClick={() => onOpenManualModal(prod)}
                                      className="text-[11px] text-slate-500 hover:text-slate-800 font-medium px-2 py-1 rounded hover:bg-slate-100 flex items-center gap-1 transition-colors"
                                    >
                                      <SlidersHorizontal className="w-3 h-3" />
                                      <span>Edit in Form</span>
                                    </button>
                                  )}

                                  {!prod.isAdded && (
                                    <button
                                      type="button"
                                      onClick={() => handleAddSingleProduct(msg.id, pIdx, prod)}
                                      disabled={isAdding || batchAdding}
                                      className="text-xs px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-md shadow-2xs flex items-center gap-1 transition-all disabled:opacity-50"
                                    >
                                      {isAdding ? (
                                        <>
                                          <RefreshCw className="w-3 h-3 animate-spin" />
                                          <span>Adding...</span>
                                        </>
                                      ) : (
                                        <>
                                          <Plus className="w-3 h-3" />
                                          <span>Add Product</span>
                                        </>
                                      )}
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 animate-spin" />
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm text-slate-600 shadow-2xs flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span className="font-medium text-slate-700">
                  Generating catalog details via MCP Server...
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 bg-white border-t border-slate-200 shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center space-x-2"
          >
            <div className="relative flex-1">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="e.g. 'Generate dairy products like milk and yogurt' or 'Farm fresh fruits'..."
                disabled={isLoading}
                className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 transition-all shadow-inner"
              />
              <Sparkles className="w-4 h-4 text-emerald-500 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            <button
              type="submit"
              disabled={!inputValue.trim() || isLoading}
              className="px-5 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold rounded-xl text-sm shadow-sm hover:shadow transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Ask AI</span>
            </button>
          </form>

          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
            <span>MCP Server: 192.168.1.75:8000/mcp</span>
            <span>Store API: 192.168.1.15:5014</span>
          </div>
        </div>
      </div>
    </div>
  );
}
