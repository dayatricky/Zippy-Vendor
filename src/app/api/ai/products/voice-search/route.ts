import { NextResponse } from 'next/server';
import { callMcpVoiceSearchTool, getMcpUrl } from '@/services/mcpClient';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    let rawAudio: string = body.audio_base64 || body.audio || '';

    if (!rawAudio || typeof rawAudio !== 'string' || rawAudio.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'audio_base64 is required. Please provide recorded audio.',
        },
        { status: 400 }
      );
    }

    // Clean data URL prefix if present (e.g. data:audio/wav;base64,UklGR...)
    if (rawAudio.includes('base64,')) {
      rawAudio = rawAudio.split('base64,')[1];
    }
    const cleanAudioBase64 = rawAudio.trim();

    if (cleanAudioBase64.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid audio base64 data.',
        },
        { status: 400 }
      );
    }

    const mcpUrl = getMcpUrl();
    const results = await callMcpVoiceSearchTool(cleanAudioBase64);

    return NextResponse.json({
      success: true,
      engine: 'search_products_from_voice_tool',
      server_url: mcpUrl,
      count: results.length,
      results: results.map((item, idx) => {
        const mrpNum = typeof item.mrp === 'number' ? item.mrp : parseFloat(String(item.mrp)) || 40;
        const priceNum = typeof item.price === 'number' ? item.price : Math.round(mrpNum * 0.9);

        return {
          id: item.id || `voice-prod-${idx}-${Date.now()}`,
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
    console.error('[API] /api/ai/products/voice-search error:', err);
    const rawMsg = err.message || 'Voice search failed';
    const isAudioIssue =
      rawMsg.toLowerCase().includes('could not understand') ||
      rawMsg.toLowerCase().includes('understand the audio') ||
      rawMsg.toLowerCase().includes('audio format');

    const userFriendlyMessage = isAudioIssue
      ? 'Could not understand the audio. Please speak clearly (e.g. "Milk", "Amul Milk", "Bread") and try again.'
      : rawMsg;

    return NextResponse.json(
      {
        success: false,
        message: userFriendlyMessage,
        raw_error: rawMsg,
      },
      { status: 200 }
    );
  }
}
