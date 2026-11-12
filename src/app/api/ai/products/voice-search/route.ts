import { NextResponse } from 'next/server';
import {
  callMcpSearchProductsTool,
  callMcpVoiceSearchTool,
  getMcpUrl,
  McpVoiceSearchResult,
} from '@/services/mcpClient';

const normalizeVoiceResults = (results: McpVoiceSearchResult[]) =>
  results.map((item, idx) => {
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
  });

export async function POST(request: Request) {
  let cleanTranscript = '';

  try {
    const body = await request.json();
    let rawAudio: string = body.audio_base64 || body.audio || '';
    cleanTranscript = typeof body.transcript === 'string' ? body.transcript.trim() : '';

    // Clean data URL prefix if present (e.g. data:audio/wav;base64,UklGR...)
    if (rawAudio.includes('base64,')) {
      rawAudio = rawAudio.split('base64,')[1];
    }
    const cleanAudioBase64 = typeof rawAudio === 'string' ? rawAudio.trim() : '';

    if (cleanAudioBase64.length === 0 && cleanTranscript.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'audio_base64 is required. Please provide recorded audio.',
        },
        { status: 400 }
      );
    }

    const authHeader = request.headers.get('authorization') || undefined;
    const mcpUrl = getMcpUrl();

    if (cleanAudioBase64.length > 0) {
      try {
        const results = await callMcpVoiceSearchTool(cleanAudioBase64, authHeader);
        return NextResponse.json({
          success: true,
          engine: 'search_products_from_voice_tool',
          server_url: mcpUrl,
          transcript: cleanTranscript,
          count: results.length,
          results: normalizeVoiceResults(results),
        });
      } catch (voiceErr: any) {
        // Fallback to MCP text search if browser SpeechRecognition captured spoken transcript
        if (cleanTranscript.length > 0) {
          try {
            const fallbackResults = await callMcpSearchProductsTool(cleanTranscript, authHeader);
            return NextResponse.json({
              success: true,
              engine: 'speech_recognition_mcp_fallback',
              server_url: mcpUrl,
              transcript: cleanTranscript,
              count: fallbackResults.length,
              results: normalizeVoiceResults(fallbackResults),
            });
          } catch {
            // Re-throw the original voice error so client can run local catalog search fallback
            throw voiceErr;
          }
        }
        throw voiceErr;
      }
    }

    const textResults = await callMcpSearchProductsTool(cleanTranscript, authHeader);
    return NextResponse.json({
      success: true,
      engine: 'speech_recognition_mcp_fallback',
      server_url: mcpUrl,
      transcript: cleanTranscript,
      count: textResults.length,
      results: normalizeVoiceResults(textResults),
    });
  } catch (err: any) {
    console.error('[API] /api/ai/products/voice-search error:', err);
    const rawMsg = String(err.message || 'Voice search failed');
    const lowerMsg = rawMsg.toLowerCase();

    const isAudioIssue =
      lowerMsg.includes('could not understand') ||
      lowerMsg.includes('understand the audio') ||
      lowerMsg.includes('audio format');

    const isAuthIssue =
      lowerMsg.includes('unauthorized') ||
      lowerMsg.includes('authorization') ||
      lowerMsg.includes('token');

    const isCreditsExhausted =
      lowerMsg.includes('402') ||
      lowerMsg.includes('usage credits') ||
      lowerMsg.includes('ollama.com/plans') ||
      lowerMsg.includes('subscribe') ||
      lowerMsg.includes('payment required') ||
      lowerMsg.includes('quota');

    const userFriendlyMessage = isAudioIssue
      ? 'Could not understand the audio. Please speak clearly (e.g. "Milk", "Amul Milk", "Bread") and try again.'
      : isAuthIssue
      ? 'Vendor session expired or unauthorized. Please re-login to your store account to use Voice Search.'
      : isCreditsExhausted
      ? 'Voice AI server credits exhausted (402). Falling back to local catalog voice matching.'
      : rawMsg;

    return NextResponse.json(
      {
        success: false,
        code: isCreditsExhausted ? 'AI_CREDITS_EXHAUSTED' : isAuthIssue ? 'UNAUTHORIZED' : 'VOICE_ERROR',
        transcript: cleanTranscript,
        message: userFriendlyMessage,
        raw_error: rawMsg,
      },
      { status: 200 }
    );
  }
}
