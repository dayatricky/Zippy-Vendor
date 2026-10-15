import { NextResponse } from 'next/server';
import { callMcpProductTool, callMcpUpdateProductTool, getMcpUrl, McpProductResult } from '@/services/mcpClient';

interface CategoryItem {
  id?: string;
  name: string;
}

interface ProductItem {
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
}

function matchStoreCategory(mcpCategory: string, categories: CategoryItem[]): { id: string; name: string } {
  if (!categories || categories.length === 0) return { id: '', name: mcpCategory || 'General' };
  const catLower = (mcpCategory || '').toLowerCase();

  // 1. Direct name match
  for (const cat of categories) {
    const cName = (cat.name || '').toLowerCase();
    if (catLower.includes(cName) || cName.includes(catLower)) {
      return { id: cat.id || '', name: cat.name };
    }
  }

  // 2. Keyword heuristic
  if (/fruit|veg|produce|fresh|apple|banana|tomato|potato|onion/i.test(catLower)) {
    const found = categories.find((c) => /fruit|veg|produce|fresh/i.test(c.name));
    if (found) return { id: found.id || '', name: found.name };
  }
  if (/dairy|milk|curd|paneer|butter|cheese|yogurt/i.test(catLower)) {
    const found = categories.find((c) => /dairy|milk/i.test(c.name));
    if (found) return { id: found.id || '', name: found.name };
  }
  if (/bakery|bread|egg|bun|toast|cake/i.test(catLower)) {
    const found = categories.find((c) => /bakery|bread|egg/i.test(c.name));
    if (found) return { id: found.id || '', name: found.name };
  }
  if (/beverage|drink|juice|cola|soda|tea|coffee/i.test(catLower)) {
    const found = categories.find((c) => /beverage|drink|juice/i.test(c.name));
    if (found) return { id: found.id || '', name: found.name };
  }
  if (/snack|chips|namkeen|biscuit|munchies|noodle/i.test(catLower)) {
    const found = categories.find((c) => /snack|biscuit|munchies/i.test(c.name));
    if (found) return { id: found.id || '', name: found.name };
  }
  if (/staple|atta|rice|oil|dal|pulse|flour/i.test(catLower)) {
    const found = categories.find((c) => /staple|atta|rice|oil|grocery/i.test(c.name));
    if (found) return { id: found.id || '', name: found.name };
  }
  if (/apparel|cloth|top|bottom|shirt|t-shirt|pant|chino|jacket|outerwear|knitwear|fashion/i.test(catLower)) {
    const found = categories.find((c) => /apparel|cloth|fashion|wear/i.test(c.name));
    if (found) return { id: found.id || '', name: found.name };
  }
  if (/electronic|gadget|mobile|phone|audio|cable/i.test(catLower)) {
    const found = categories.find((c) => /electronic|gadget/i.test(c.name));
    if (found) return { id: found.id || '', name: found.name };
  }
  if (/personal|beauty|care|cosmetic/i.test(catLower)) {
    const found = categories.find((c) => /personal|beauty|care/i.test(c.name));
    if (found) return { id: found.id || '', name: found.name };
  }

  // 3. Fallback to first available category
  return { id: categories[0]?.id || '', name: categories[0]?.name || mcpCategory || 'General' };
}

function getProductImageUrl(name: string, category: string): string {
  const text = `${name} ${category}`.toLowerCase();

  // Apparel & Clothing
  if (text.includes('shirt') || text.includes('t-shirt') || text.includes('crewneck') || text.includes('top') || text.includes('polo')) {
    return 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=500&q=80';
  }
  if (text.includes('chino') || text.includes('pant') || text.includes('trouser') || text.includes('jean') || text.includes('bottom')) {
    return 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=500&q=80';
  }
  if (text.includes('windbreaker') || text.includes('jacket') || text.includes('coat') || text.includes('outerwear') || text.includes('blazer')) {
    return 'https://images.unsplash.com/photo-1544441893-675973e31985?w=500&q=80';
  }
  if (text.includes('pullover') || text.includes('sweater') || text.includes('knitwear') || text.includes('hoodie') || text.includes('cardigan')) {
    return 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=500&q=80';
  }
  if (text.includes('shoe') || text.includes('sneaker') || text.includes('footwear') || text.includes('sandal') || text.includes('boot')) {
    return 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&q=80';
  }
  if (text.includes('dress') || text.includes('skirt') || text.includes('saree') || text.includes('kurti')) {
    return 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=500&q=80';
  }
  if (text.includes('apparel') || text.includes('cloth') || text.includes('fashion') || text.includes('wear')) {
    return 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=500&q=80';
  }

  // Fruits
  if (text.includes('apple') || text.includes('gala') || text.includes('honeycrisp')) {
    return 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=500&q=80';
  }
  if (text.includes('banana') || text.includes('cavendish')) {
    return 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=500&q=80';
  }
  if (text.includes('orange') || text.includes('citrus')) {
    return 'https://images.unsplash.com/photo-1547514701-42782101795e?w=500&q=80';
  }
  if (text.includes('mango')) {
    return 'https://images.unsplash.com/photo-1553279768-865429fa0078?w=500&q=80';
  }
  if (text.includes('fruit') || text.includes('berry')) {
    return 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=500&q=80';
  }

  // Dairy
  if (text.includes('milk')) {
    return 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=500&q=80';
  }
  if (text.includes('paneer') || text.includes('cottage cheese')) {
    return 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=500&q=80';
  }
  if (text.includes('butter')) {
    return 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=500&q=80';
  }
  if (text.includes('curd') || text.includes('yogurt') || text.includes('dahi')) {
    return 'https://images.unsplash.com/photo-1571212515416-fef01fc43637?w=500&q=80';
  }
  if (text.includes('cheese')) {
    return 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=500&q=80';
  }

  // Vegetables
  if (text.includes('tomato')) {
    return 'https://images.unsplash.com/photo-1546470427-e26264be0b11?w=500&q=80';
  }
  if (text.includes('potato')) {
    return 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=500&q=80';
  }
  if (text.includes('onion')) {
    return 'https://images.unsplash.com/photo-1508747703725-719777637510?w=500&q=80';
  }
  if (text.includes('capsicum') || text.includes('pepper')) {
    return 'https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?w=500&q=80';
  }
  if (text.includes('vegetable') || text.includes('produce')) {
    return 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=500&q=80';
  }

  // Bakery & Breakfast
  if (text.includes('bread')) {
    return 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500&q=80';
  }
  if (text.includes('egg')) {
    return 'https://images.unsplash.com/photo-1516467508483-a7212febe31a?w=500&q=80';
  }
  if (text.includes('bun') || text.includes('pav')) {
    return 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=500&q=80';
  }

  // Drinks
  if (text.includes('coke') || text.includes('cola') || text.includes('soda')) {
    return 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=500&q=80';
  }
  if (text.includes('juice')) {
    return 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=500&q=80';
  }
  if (text.includes('coffee') || text.includes('tea')) {
    return 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=500&q=80';
  }

  // Snacks & Staples
  if (text.includes('chips') || text.includes('snack') || text.includes('namkeen')) {
    return 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=500&q=80';
  }
  if (text.includes('noodle') || text.includes('pasta')) {
    return 'https://images.unsplash.com/photo-1612927601601-6638404737ce?w=500&q=80';
  }
  if (text.includes('oil')) {
    return 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=500&q=80';
  }
  if (text.includes('atta') || text.includes('flour') || text.includes('wheat') || text.includes('rice')) {
    return 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500&q=80';
  }

  // Electronics & Personal Care
  if (text.includes('phone') || text.includes('mobile') || text.includes('headphone') || text.includes('earbud') || text.includes('electronic') || text.includes('charger')) {
    return 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&q=80';
  }
  if (text.includes('shampoo') || text.includes('soap') || text.includes('cream') || text.includes('lotion') || text.includes('perfume') || text.includes('beauty')) {
    return 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=500&q=80';
  }

  return 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&q=80';
}

const USD_TO_INR_RATE = 85;

function parseAndConvertPriceRange(rawPriceRange?: string): {
  price: number;
  mrp: number;
  formattedPriceRange: string;
} {
  if (!rawPriceRange) {
    return { price: 40, mrp: 50, formattedPriceRange: '₹40 - ₹50' };
  }

  const isDollar = /\$|usd|dollar/i.test(rawPriceRange);
  const isExplicitRupee = /₹|rs\.?|inr/i.test(rawPriceRange);

  // Extract all numbers including decimals
  const nums = rawPriceRange.match(/\d+(?:\.\d+)?/g)?.map(Number) || [];

  if (nums.length === 0) {
    return { price: 40, mrp: 50, formattedPriceRange: '₹40 - ₹50' };
  }

  let min = nums[0];
  let max = nums.length > 1 ? nums[1] : nums[0];

  if (max < min) {
    const temp = min;
    min = max;
    max = temp;
  }

  // Detect whether these values are USD:
  // Explicitly marked with $, USD, or dollar, OR small values typical of US pricing (max <= 25 and has '.' or max <= 15) without explicit Rupee marking
  const isUsd = isDollar || (!isExplicitRupee && max <= 25 && (rawPriceRange.includes('.') || max <= 15));

  let inrPrice: number;
  let inrMrp: number;

  if (isUsd) {
    inrPrice = Math.round(min * USD_TO_INR_RATE);
    inrMrp = Math.round(max * USD_TO_INR_RATE);
  } else {
    inrPrice = Math.round(min);
    inrMrp = Math.round(max);
  }

  // Ensure MRP is higher than selling price for realistic retail margins
  if (inrMrp <= inrPrice) {
    inrMrp = Math.round(inrPrice * 1.15) || inrPrice + 10;
  }

  if (inrPrice <= 0) inrPrice = 40;
  if (inrMrp <= inrPrice) inrMrp = inrPrice + 10;

  const formattedPriceRange = `₹${inrPrice} - ₹${inrMrp}`;

  return {
    price: inrPrice,
    mrp: inrMrp,
    formattedPriceRange,
  };
}

function parsePackSize(text: string): { unit: string; packSize: string } {
  const lower = text.toLowerCase();
  if (lower.includes('gallon')) return { unit: '1 Gallon', packSize: '1 Gallon' };
  if (lower.includes('per lb') || lower.includes('1 lb') || lower.includes('lb')) return { unit: '1 lb', packSize: '1 lb' };
  if (lower.includes('1 l') || lower.includes('1l') || lower.includes('liter') || lower.includes('litre')) return { unit: '1 L', packSize: '1 L' };
  if (lower.includes('500 ml') || lower.includes('500ml')) return { unit: '500 ml', packSize: '500 ml' };
  if (lower.includes('500 g') || lower.includes('500g')) return { unit: '500 g', packSize: '500 g' };
  if (lower.includes('250 g') || lower.includes('250g')) return { unit: '250 g', packSize: '250 g' };
  if (lower.includes('1 kg') || lower.includes('1kg')) return { unit: '1 kg', packSize: '1 kg' };
  if (lower.includes('5 kg') || lower.includes('5kg')) return { unit: '5 kg', packSize: '5 kg' };
  if (lower.includes('dozen') || lower.includes('12 pcs')) return { unit: '1 dozen', packSize: '12 pcs' };
  if (lower.includes('pack of 6') || lower.includes('6 pcs')) return { unit: '6 pcs', packSize: '6 pcs' };
  return { unit: '1 pc', packSize: '1 pc' };
}

function extractBrand(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts.length > 1 ? parts[0] : 'Generic';
}

function applyLocalProductUpdates(
  currentProducts: any[],
  instruction: string,
  categories: CategoryItem[]
): { updatedProducts: ProductItem[]; summary: string[] } {
  const queryLower = instruction.toLowerCase();
  const summary: string[] = [];
  let updatedList: ProductItem[] = currentProducts.map((p, idx) => ({
    name: p.name,
    slug: p.slug || `product-${Date.now()}-${idx}`,
    category_id: p.category_id,
    category_name: p.category_name || 'General',
    brand_name: p.brand_name || 'Generic',
    unit: p.unit || '1 pc',
    pack_size: p.pack_size || '1 pc',
    mrp: Number(p.mrp) || 50,
    price: Number(p.price) || 40,
    price_range: p.price_range || `₹${p.price} - ₹${p.mrp}`,
    stock_quantity: Number(p.stock_quantity) || 50,
    image_url: p.image_url || getProductImageUrl(p.name, p.category_name || ''),
    description: p.description || p.name,
    key_features: Array.isArray(p.key_features) ? [...p.key_features] : [],
    sku: p.sku || `SKU-${Date.now()}-${idx}`,
    barcode: p.barcode || String(Math.floor(100000000000 + Math.random() * 900000000000)),
    status: p.status || 'ACTIVE',
  }));

  // 1. Check for item removal (e.g. "remove chinos", "delete 2nd item", "hatao")
  if (/remove|delete|hatao|hata do|drop/i.test(queryLower)) {
    const beforeCount = updatedList.length;
    updatedList = updatedList.filter((p, idx) => {
      const pName = p.name.toLowerCase();
      const tokens = pName.split(/[\s-]+/).filter((w) => w.length > 2);
      const nameMatch = queryLower.includes(pName) || tokens.some((w) => queryLower.includes(w));
      const posMatch =
        ((queryLower.includes('first') || queryLower.includes('1st')) && idx === 0) ||
        ((queryLower.includes('second') || queryLower.includes('2nd')) && idx === 1) ||
        ((queryLower.includes('third') || queryLower.includes('3rd')) && idx === 2) ||
        ((queryLower.includes('fourth') || queryLower.includes('4th')) && idx === 3) ||
        (queryLower.includes('last') && idx === updatedList.length - 1);

      if (nameMatch || posMatch) {
        summary.push(`Removed product: "${p.name}"`);
        return false;
      }
      return true;
    });
    if (updatedList.length < beforeCount) {
      return { updatedProducts: updatedList, summary };
    }
  }

  // 2. Check for percentage discount on all items (e.g. "10% discount", "reduce price by 20%")
  const pctMatch = queryLower.match(/(\d+)\s*%\s*(?:discount|off|kam|reduce|less)/i);
  if (pctMatch) {
    const pct = parseFloat(pctMatch[1]);
    if (pct > 0 && pct < 100) {
      const factor = (100 - pct) / 100;
      updatedList = updatedList.map((p) => {
        const newPrice = Math.max(10, Math.round(p.price * factor));
        const newMrp = Math.max(newPrice + 10, p.mrp);
        return {
          ...p,
          price: newPrice,
          mrp: newMrp,
          price_range: `₹${newPrice} - ₹${newMrp}`,
        };
      });
      summary.push(`Applied ${pct}% discount across all products`);
      return { updatedProducts: updatedList, summary };
    }
  }

  // 3. Check for specific price updates (e.g. "T-shirt price 499", "price: 300", "set price to 499")
  const rawNums = instruction.match(/\d+(?:\.\d+)?/g)?.map(Number) || [];

  // Determine target product by full name or keyword tokens (e.g. 't-shirt', 'chinos', 'nimki')
  let targetIdx = updatedList.findIndex((p) => {
    const pName = p.name.toLowerCase();
    if (queryLower.includes(pName)) return true;
    const tokens = pName.split(/[\s-]+/).filter((w) => w.length > 2);
    return tokens.some((w) => queryLower.includes(w));
  });
  if (targetIdx === -1) {
    if (queryLower.includes('first') || queryLower.includes('1st')) targetIdx = 0;
    else if (queryLower.includes('second') || queryLower.includes('2nd')) targetIdx = 1;
    else if (queryLower.includes('third') || queryLower.includes('3rd')) targetIdx = 2;
    else if (queryLower.includes('fourth') || queryLower.includes('4th')) targetIdx = 3;
    else if (updatedList.length === 1) targetIdx = 0;
  }

  if (rawNums.length > 0 && /price|mrp|cost|rate|kam|badao|set|change|rupee|inr|rs|₹/i.test(queryLower)) {
    const newPriceVal = rawNums[0];
    if (targetIdx !== -1) {
      const p = updatedList[targetIdx];
      let newPrice = Math.round(newPriceVal);
      let newMrp = rawNums.length > 1 ? Math.round(rawNums[1]) : Math.max(Math.round(newPrice * 1.2), newPrice + 20);
      updatedList[targetIdx] = {
        ...p,
        price: newPrice,
        mrp: newMrp,
        price_range: `₹${newPrice} - ₹${newMrp}`,
      };
      summary.push(`Updated price for "${p.name}" to ₹${newPrice} (MRP: ₹${newMrp})`);
    } else {
      updatedList = updatedList.map((p) => {
        const newPrice = Math.round(newPriceVal);
        const newMrp = Math.max(Math.round(newPrice * 1.2), newPrice + 20);
        return {
          ...p,
          price: newPrice,
          mrp: newMrp,
          price_range: `₹${newPrice} - ₹${newMrp}`,
        };
      });
      summary.push(`Updated price for all products to ₹${Math.round(newPriceVal)}`);
    }
  }

  // 4. Check for stock update (e.g. "stock 100", "set stock to 50")
  const stockMatch = queryLower.match(/stock\s*(?:to|is|=)?\s*(\d+)/i);
  if (stockMatch) {
    const stockVal = parseInt(stockMatch[1]);
    if (targetIdx !== -1) {
      updatedList[targetIdx].stock_quantity = stockVal;
      summary.push(`Updated stock for "${updatedList[targetIdx].name}" to ${stockVal}`);
    } else {
      updatedList = updatedList.map((p) => ({ ...p, stock_quantity: stockVal }));
      summary.push(`Updated stock for all products to ${stockVal}`);
    }
  }

  // 5. Check for adding feature (e.g. "add feature 100% Breathable Cotton")
  const featMatch = instruction.match(/(?:add\s+feature|feature:?|add:?)\s+([^,.\n]+)/i);
  if (featMatch) {
    const newFeat = featMatch[1].trim();
    if (newFeat) {
      if (targetIdx !== -1) {
        updatedList[targetIdx].key_features = [...(updatedList[targetIdx].key_features || []), newFeat];
        summary.push(`Added key feature "${newFeat}" to "${updatedList[targetIdx].name}"`);
      } else {
        updatedList[0].key_features = [...(updatedList[0].key_features || []), newFeat];
        summary.push(`Added key feature "${newFeat}"`);
      }
    }
  }

  // 6. Check for description update (e.g. "description: ...", "update description to ...")
  const descMatch = instruction.match(/(?:description\s*(?:to|is|:)?)\s+([^,.\n]+)/i);
  if (descMatch && targetIdx !== -1) {
    const newDesc = descMatch[1].trim();
    if (newDesc) {
      updatedList[targetIdx].description = newDesc;
      summary.push(`Updated description for "${updatedList[targetIdx].name}"`);
    }
  }

  if (summary.length === 0) {
    summary.push(`Applied customizations based on "${instruction}"`);
  }

  return { updatedProducts: updatedList, summary };
}

export async function POST(request: Request) {
  try {
    let body: any = {};
    try {
      body = await request.json();
    } catch {
      try {
        const rawText = await request.text();
        body = JSON.parse(rawText);
      } catch {
        body = {};
      }
    }

    const { message, prompt, categories = [], currentProducts = [] } = body;
    const query = (message || prompt || '').trim();

    if (!query) {
      return NextResponse.json(
        {
          success: false,
          message: 'Please provide a product description or request.',
        },
        { status: 400 }
      );
    }

    const mcpUrl = getMcpUrl();

    // Check if the user intends to edit / refine existing products
    const isEditIntent =
      Array.isArray(currentProducts) &&
      currentProducts.length > 0 &&
      (/\b(edit|update|change|modify|set|make|reduce|increase|decrease|discount|badlo|kardo|kar do|badao|ghatao|hatao|delete|remove|add|price|mrp|cost|description|feature|stock|color|colour|size|variant|rupee|inr|rs|₹|%)\b/i.test(query) ||
        currentProducts.some((p: any) => p.name && query.toLowerCase().includes(p.name.toLowerCase().slice(0, 5))));

    if (isEditIntent) {
      // 1. If a specific product is targeted, try update_product_detail_tool first
      let targetProduct = currentProducts.find((p: any) => {
        const pName = (p.name || '').toLowerCase();
        if (query.toLowerCase().includes(pName)) return true;
        const tokens = pName.split(/[\s-]+/).filter((w: string) => w.length > 2);
        return tokens.some((w: string) => query.toLowerCase().includes(w));
      });
      if (!targetProduct && currentProducts.length === 1) {
        targetProduct = currentProducts[0];
      }

      if (targetProduct) {
        try {
          const updatedSingle = await callMcpUpdateProductTool(query, {
            product_name: targetProduct.name,
            category: targetProduct.category_name,
            description: targetProduct.description,
            key_features: targetProduct.key_features,
            price_range: targetProduct.price_range || `₹${targetProduct.price} - ₹${targetProduct.mrp}`,
          });

          if (updatedSingle) {
            const { price, mrp, formattedPriceRange } = parseAndConvertPriceRange(updatedSingle.price_range);
            const updatedList = currentProducts.map((p: any) => {
              if (p.name === targetProduct.name || p.slug === targetProduct.slug) {
                return {
                  ...p,
                  name: updatedSingle.product_name,
                  category_name: updatedSingle.category || p.category_name,
                  description: updatedSingle.description || p.description,
                  key_features: updatedSingle.key_features && updatedSingle.key_features.length > 0
                    ? updatedSingle.key_features
                    : p.key_features || [],
                  price: price > 0 ? price : p.price,
                  mrp: mrp > 0 ? mrp : p.mrp,
                  price_range: formattedPriceRange,
                  image_url: updatedSingle.image_url || p.image_url,
                };
              }
              return p;
            });

            return NextResponse.json({
              success: true,
              source: 'mcp-server-update-tool',
              engine: 'update_product_detail_tool',
              server_url: mcpUrl,
              message: `✅ **Updated "${updatedSingle.product_name}" via AI (MCP Live):**\n\nReview the updated details below and click **Add Product** or **Register Selected** to save to catalog.`,
              products: updatedList,
            });
          }
        } catch (singleErr) {
          console.warn('update_product_detail_tool error, falling back to batch edit / local update:', singleErr);
        }
      }

      // 2. Batch update via MCP server if available
      try {
        const editPrompt = `You are updating the following existing products catalog:
${JSON.stringify(
  currentProducts.map((p: any) => ({
    product_name: p.name,
    category: p.category_name,
    description: p.description,
    key_features: p.key_features,
    price_range: p.price_range || `₹${p.price} - ₹${p.mrp}`,
    image_url: p.image_url,
  }))
)}

User's exact update request: "${query}"

Apply the requested modifications and return the complete updated product list in the exact JSON format in Indian Rupees (INR ₹).`;

        const mcpResults = await callMcpProductTool(editPrompt);
        if (mcpResults && mcpResults.length > 0) {
          const formattedProducts: ProductItem[] = mcpResults.map((item, idx) => {
            const matched = matchStoreCategory(item.category || query, categories);
            const { price, mrp, formattedPriceRange } = parseAndConvertPriceRange(item.price_range);
            const { unit, packSize } = parsePackSize(`${item.product_name} ${item.price_range || ''}`);
            const brand = extractBrand(item.product_name);
            const imageUrl = item.image_url || getProductImageUrl(item.product_name, item.category || '');
            const slug = item.product_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

            return {
              name: item.product_name,
              slug: slug || `product-${Date.now()}-${idx}`,
              category_id: matched.id,
              category_name: item.category || matched.name,
              brand_name: brand,
              unit,
              pack_size: packSize,
              mrp,
              price,
              price_range: formattedPriceRange,
              stock_quantity: 50,
              image_url: imageUrl,
              description: item.description || item.product_name,
              key_features: item.key_features || [],
              sku: `SKU-${slug.slice(0, 8).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`,
              barcode: String(Math.floor(100000000000 + Math.random() * 900000000000)),
              status: 'ACTIVE',
            };
          });

          return NextResponse.json({
            success: true,
            source: 'mcp-server-edit',
            engine: 'live-mcp-server',
            server_url: mcpUrl,
            message: `✅ **Updated products according to your request:**\n\nReview the updated items below, adjust pricing or category if needed, and click **Add Product** or **Register Selected** to save them to your store catalog.`,
            products: formattedProducts,
          });
        }
      } catch (mcpErr) {
        console.warn('MCP edit call failed, applying smart local updater:', mcpErr);
      }

      // Fast, resilient local updater fallback
      const { updatedProducts, summary } = applyLocalProductUpdates(currentProducts, query, categories);
      return NextResponse.json({
        success: true,
        source: 'ai-smart-edit',
        engine: 'smart-product-editor',
        message: `✅ **Updated products according to your request:**\n${summary.map((s) => `• ${s}`).join('\n')}\n\nReview the updated items below and click **Add Product** or **Register Selected** to save them to your catalog.`,
        products: updatedProducts,
      });
    }

    // Standard MCP Product Generation
    const mcpResults: McpProductResult[] = await callMcpProductTool(query);

    if (!mcpResults || mcpResults.length === 0) {
      return NextResponse.json({
        success: false,
        source: 'mcp-server',
        server_url: mcpUrl,
        message: `MCP Server (${mcpUrl}) did not return any product details for "${query}". Please verify your query.`,
        products: [],
      });
    }

    // Format products directly from MCP data - preserving exact product names, categories, descriptions, and features
    const formattedProducts: ProductItem[] = mcpResults.map((item, idx) => {
      const matched = matchStoreCategory(item.category || query, categories);
      const { price, mrp, formattedPriceRange } = parseAndConvertPriceRange(item.price_range);
      const { unit, packSize } = parsePackSize(`${item.product_name} ${item.price_range || ''}`);
      const brand = extractBrand(item.product_name);
      const imageUrl = item.image_url || getProductImageUrl(item.product_name, item.category || '');
      const slug = item.product_name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');

      return {
        name: item.product_name,
        slug: slug || `product-${Date.now()}-${idx}`,
        category_id: matched.id,
        category_name: item.category || matched.name,
        brand_name: brand,
        unit,
        pack_size: packSize,
        mrp,
        price,
        price_range: formattedPriceRange,
        stock_quantity: 50,
        image_url: imageUrl,
        description: item.description || item.product_name,
        key_features: item.key_features || [],
        sku: `SKU-${slug.slice(0, 8).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`,
        barcode: String(Math.floor(100000000000 + Math.random() * 900000000000)),
        status: 'ACTIVE',
      };
    });

    let replyMessage = '';
    if (formattedProducts.length === 1) {
      const p = formattedProducts[0];
      const featText = p.key_features && p.key_features.length > 0
        ? `\n\n**Key Features:**\n${p.key_features.map((f) => `• ${f}`).join('\n')}`
        : '';
      const priceText = p.price_range ? `\n\n**Price Range:** ${p.price_range}` : '';
      replyMessage = `**${p.name}** (${p.category_name})\n\n${p.description}${featText}${priceText}\n\nReview the pricing and stock below, then click **Add Product** to register it directly into your store catalog.`;
    } else {
      replyMessage = `Generated **${formattedProducts.length} products** from live MCP Server for **"${query}"**.\n\nReview the items below, adjust pricing or category if needed, and click **Add Product** or **Register Selected** to save them to your store catalog.`;
    }

    return NextResponse.json({
      success: true,
      source: 'mcp-server',
      engine: 'live-mcp-server',
      server_url: mcpUrl,
      message: replyMessage,
      products: formattedProducts,
    });
  } catch (error: any) {
    console.error('AI Product API Error calling MCP server:', error);
    return NextResponse.json(
      {
        success: false,
        source: 'mcp-server',
        server_url: getMcpUrl(),
        message: `Unable to fetch product data from MCP Server (http://192.168.1.75:8000/mcp): ${error?.message || 'Connection failed'}. Please make sure the MCP server is running.`,
        error: error?.message || 'MCP server unreachable',
        products: [],
      },
      { status: 502 }
    );
  }
}
