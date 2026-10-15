import { NextResponse } from 'next/server';
import { callMcpProductTool, getMcpUrl, McpProductResult } from '@/services/mcpClient';

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

  // 3. Fallback to first available category
  return { id: categories[0]?.id || '', name: categories[0]?.name || mcpCategory || 'Grocery' };
}

function getProductImageUrl(name: string, category: string): string {
  const text = `${name} ${category}`.toLowerCase();

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
  if (text.includes('chips') || text.includes('snack')) {
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

  return 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&q=80';
}

function parsePriceRange(priceRange?: string): { price: number; mrp: number } {
  if (!priceRange) return { price: 0, mrp: 0 };
  const nums = priceRange.match(/\d+(\.\d+)?/g)?.map(Number) || [];
  if (nums.length === 0) return { price: 0, mrp: 0 };

  const min = nums[0];
  const max = nums.length > 1 ? nums[1] : nums[0];
  return { price: min, mrp: max };
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

    const { message, prompt, categories = [] } = body;
    const query = (message || prompt || '').trim();

    if (!query) {
      return NextResponse.json(
        {
          success: false,
          message: 'Please provide a product description or name to generate.',
        },
        { status: 400 }
      );
    }

    const mcpUrl = getMcpUrl();

    // Call user's live MCP Server (http://192.168.1.75:8000/mcp)
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
      const { price, mrp } = parsePriceRange(item.price_range);
      const { unit, packSize } = parsePackSize(`${item.product_name} ${item.price_range || ''}`);
      const brand = extractBrand(item.product_name);
      const imageUrl = getProductImageUrl(item.product_name, item.category || '');
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
        mrp: mrp > 0 ? mrp : price > 0 ? price : 50,
        price: price > 0 ? price : 45,
        price_range: item.price_range || '',
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
