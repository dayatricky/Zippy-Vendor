import { NextResponse } from 'next/server';
import { callMcpSearchProductsTool, getMcpUrl } from '@/services/mcpClient';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const query: string = body.user_message || body.query || body.search || '';

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'user_message or query is required for search.',
        },
        { status: 400 }
      );
    }

    const authHeader = request.headers.get('authorization') || undefined;
    const mcpUrl = getMcpUrl();
    const results = await callMcpSearchProductsTool(query.trim(), authHeader);

    return NextResponse.json({
      success: true,
      engine: 'search_products_tool',
      server_url: mcpUrl,
      query: query.trim(),
      count: results.length,
      results: results.map((item, idx) => {
        const mrpNum = typeof item.mrp === 'number' ? item.mrp : parseFloat(String(item.mrp)) || 40;
        const priceNum = typeof item.price === 'number' ? item.price : Math.round(mrpNum * 0.9);

        return {
          id: item.id || `search-prod-${idx}-${Date.now()}`,
          name: item.name || 'Unnamed Product',
          category: item.category || 'General',
          category_name: item.category || 'General',
          description: item.description || item.name || '',
          mrp: mrpNum,
          price: priceNum,
          brand_name: item.brand_name || 'Generic',
          sku: item.sku || `SKU-${Date.now()}-${idx}`,
          unit: item.unit || '1 kg',
          store_id: item.store_id || '',
          stock_quantity: typeof item.stock_quantity === 'number' ? item.stock_quantity : 20,
          image_url: item.image_url || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&q=80',
        };
      }),
    });
  } catch (err: any) {
    console.error('[API] /api/ai/products/search error:', err);
    const rawMsg = err.message || 'Product search failed';
    return NextResponse.json(
      {
        success: false,
        message: rawMsg,
        raw_error: rawMsg,
      },
      { status: 200 }
    );
  }
}
