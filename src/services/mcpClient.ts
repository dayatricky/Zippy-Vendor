/**
 * MCP (Model Context Protocol) Client for Zippy Vendor Panel
 * Connects directly to the live MCP Server (http://192.168.1.75:8000/mcp)
 * to execute 'generate_product_detail_tool'.
 */

export interface McpProductResult {
  product_name: string;
  category: string;
  description: string;
  key_features?: string[];
  price_range?: string;
  image_url?: string;
}

let cachedSessionId: string | null = null;

export const getMcpUrl = (): string => {
  return (process.env.MCP_SERVER_URL || 'http://192.168.1.75:8000/mcp').replace(/\/+$/, '');
};

/**
 * Initializes a new session with the MCP server
 */
async function initializeMcpSession(mcpUrl: string): Promise<string | null> {
  try {
    const initRes = await fetch(mcpUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'zippy-vendor-panel', version: '1.0.0' },
        },
      }),
      signal: AbortSignal.timeout(15000),
    });

    const sessionId = initRes.headers.get('mcp-session-id');
    try {
      await initRes.text();
    } catch {}
    if (sessionId) {
      cachedSessionId = sessionId;
      return sessionId;
    }
  } catch (err) {
    console.warn('[MCP] Session initialization failed:', err);
  }
  return null;
}

/**
 * Parses JSON from either raw JSON or SSE 'data: {...}' chunk
 */
function parseMcpPayload(text: string): any {
  if (text.includes('data:')) {
    const lines = text.split('\n');
    for (const line of lines) {
      if (line.startsWith('data:')) {
        const rawJson = line.replace(/^data:\s*/, '').trim();
        try {
          return JSON.parse(rawJson);
        } catch {
          // continue checking other lines
        }
      }
    }
  }

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function normalizeImageUrl(url?: string | null): string | undefined {
  if (!url || typeof url !== 'string') return undefined;
  let clean = url.trim();
  // Strip markdown link formatting if present e.g. [http://...](http://...)
  const match = clean.match(/https?:\/\/[^\s'")\]]+/);
  if (match) clean = match[0];

  const mcpUrl = getMcpUrl();
  try {
    const mcpOrigin = new URL(mcpUrl).origin;
    if (clean.includes('127.0.0.1:8000') || clean.includes('localhost:8000')) {
      clean = clean.replace(/https?:\/\/(127\.0\.0\.1|localhost):8000/, mcpOrigin);
    }
  } catch {}
  return clean;
}

/**
 * Extracts product items from the MCP response payload
 * Handles both wrapped JSON-RPC { result: ... } and direct tool payloads { structuredContent, content }
 */
function extractProductsFromPayload(payload: any): McpProductResult[] {
  if (!payload) return [];
  const res = payload.result !== undefined ? payload.result : payload;

  const mapItem = (p: any): McpProductResult => ({
    product_name: p.product_name,
    category: p.category,
    description: p.description,
    key_features: Array.isArray(p.key_features) ? p.key_features : [],
    price_range: p.price_range,
    image_url: normalizeImageUrl(p.image_url),
  });

  // 1. Check structuredContent
  if (res.structuredContent?.result) {
    const sc = res.structuredContent.result;
    if (Array.isArray(sc)) {
      return sc.filter((p) => p && typeof p === 'object' && p.product_name).map(mapItem);
    }
    if (sc && typeof sc === 'object' && sc.product_name) {
      return [mapItem(sc)];
    }
    if (Array.isArray(sc.products)) {
      return sc.products.filter((p: any) => p && typeof p === 'object' && p.product_name).map(mapItem);
    }
  }

  // 2. Check content array text
  if (Array.isArray(res.content)) {
    for (const item of res.content) {
      if (item.text) {
        try {
          const parsed = JSON.parse(item.text);
          if (Array.isArray(parsed)) {
            return parsed.filter((p) => p && typeof p === 'object' && p.product_name).map(mapItem);
          }
          if (Array.isArray(parsed.result)) {
            return parsed.result.filter((p: any) => p && typeof p === 'object' && p.product_name).map(mapItem);
          }
          if (parsed.result?.product_name) {
            return [mapItem(parsed.result)];
          }
          if (parsed.product_name) {
            return [mapItem(parsed)];
          }
          if (Array.isArray(parsed.products)) {
            return parsed.products.filter((p: any) => p && typeof p === 'object' && p.product_name).map(mapItem);
          }
        } catch {
          // not valid JSON text
        }
      }
    }
  }

  return [];
}

/**
 * Calls generate_product_detail_tool on the live MCP Server
 * Always returns an array of McpProductResult (empty array if none found)
 */
export async function callMcpProductTool(userMessage: string): Promise<McpProductResult[]> {
  const mcpUrl = getMcpUrl();

  // Step 1: Ensure active session ID
  let sessionId = cachedSessionId;
  if (!sessionId) {
    sessionId = await initializeMcpSession(mcpUrl);
  }

  const executeCall = async (sessId: string | null) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
    };
    if (sessId) {
      headers['mcp-session-id'] = sessId;
    }

    const response = await fetch(mcpUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'tools/call',
        params: {
          name: 'generate_product_detail_tool',
          arguments: {
            user_message: /rupee|inr|₹/i.test(userMessage)
              ? userMessage
              : `${userMessage} (Pricing requirement: Provide realistic retail pricing in Indian Rupees INR ₹, e.g. price_range: '₹40 - ₹120')`,
          },
        },
      }),
      signal: AbortSignal.timeout(90000), // 90s timeout for LLM generation
    });

    const newSession = response.headers.get('mcp-session-id');
    if (newSession) cachedSessionId = newSession;

    const rawText = await response.text();
    return parseMcpPayload(rawText);
  };

  try {
    let payload = await executeCall(sessionId);

    // If session expired or missing, re-initialize once and retry
    if (!payload || (payload?.error && payload.error?.message?.toLowerCase().includes('session'))) {
      cachedSessionId = await initializeMcpSession(mcpUrl);
      payload = await executeCall(cachedSessionId);
    }

    const products = extractProductsFromPayload(payload);
    return products;
  } catch (err: any) {
    console.error('[MCP] Tool call error:', err);
    throw new Error(`MCP Server Error (${mcpUrl}): ${err.message || 'Call failed'}`);
  }
}

export interface McpUpdateProductArgs {
  product_name: string;
  category?: string;
  description?: string;
  key_features?: string[];
  price_range?: string;
}

/**
 * Calls update_product_detail_tool on the live MCP Server
 * to update an existing product using AI prompt instructions
 */
export async function callMcpUpdateProductTool(
  userMessage: string,
  productDetail: McpUpdateProductArgs
): Promise<McpProductResult | null> {
  const mcpUrl = getMcpUrl();

  let sessionId = cachedSessionId;
  if (!sessionId) {
    sessionId = await initializeMcpSession(mcpUrl);
  }

  const executeCall = async (sessId: string | null) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
    };
    if (sessId) {
      headers['mcp-session-id'] = sessId;
    }

    const response = await fetch(mcpUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'tools/call',
        params: {
          name: 'update_product_detail_tool',
          arguments: {
            user_message: /rupee|inr|₹/i.test(userMessage)
              ? userMessage
              : `${userMessage} (Pricing requirement: Keep or update prices in Indian Rupees INR ₹, e.g. price_range: '₹40 - ₹120')`,
            product_detail: {
              product_name: productDetail.product_name,
              category: productDetail.category || 'General',
              description: productDetail.description || '',
              key_features: productDetail.key_features || [],
              price_range: productDetail.price_range || '',
            },
          },
        },
      }),
      signal: AbortSignal.timeout(90000),
    });

    const newSession = response.headers.get('mcp-session-id');
    if (newSession) cachedSessionId = newSession;

    const rawText = await response.text();
    return parseMcpPayload(rawText);
  };

  try {
    let payload = await executeCall(sessionId);

    // If session expired or missing, re-initialize once and retry
    if (!payload || (payload?.error && payload.error?.message?.toLowerCase().includes('session'))) {
      cachedSessionId = await initializeMcpSession(mcpUrl);
      payload = await executeCall(cachedSessionId);
    }

    const products = extractProductsFromPayload(payload);
    return products.length > 0 ? products[0] : null;
  } catch (err: any) {
    console.error('[MCP] update_product_detail_tool call error:', err);
    throw new Error(`MCP Server Error (${mcpUrl}): ${err.message || 'Update call failed'}`);
  }
}

export interface McpVoiceSearchResult {
  id?: string;
  name: string;
  category?: string;
  description?: string;
  mrp?: string | number;
  price?: number;
  brand_name?: string;
  sku?: string;
  unit?: string;
  store_id?: string;
  stock_quantity?: number;
  image_url?: string;
}

function extractVoiceSearchResults(payload: any): McpVoiceSearchResult[] {
  if (!payload) return [];

  // Check structuredContent.results
  if (payload.structuredContent?.results && Array.isArray(payload.structuredContent.results)) {
    return payload.structuredContent.results;
  }
  if (Array.isArray(payload.structuredContent)) {
    return payload.structuredContent;
  }

  // Check result.results
  if (payload.result?.results && Array.isArray(payload.result.results)) {
    return payload.result.results;
  }
  if (payload.result?.structuredContent?.results && Array.isArray(payload.result.structuredContent.results)) {
    return payload.result.structuredContent.results;
  }

  // Check text content inside content array
  if (Array.isArray(payload.content)) {
    for (const item of payload.content) {
      if (item.text) {
        try {
          const parsed = JSON.parse(item.text);
          if (Array.isArray(parsed.results)) return parsed.results;
          if (Array.isArray(parsed)) return parsed;
        } catch {}
      }
    }
  }

  return [];
}

function extractVoiceSearchError(payload: any): string | null {
  if (!payload) return null;
  if (payload.structuredContent?.error) return String(payload.structuredContent.error);
  if (payload.result?.structuredContent?.error) return String(payload.result.structuredContent.error);
  if (payload.error?.message) return String(payload.error.message);
  if (Array.isArray(payload.content)) {
    for (const item of payload.content) {
      if (item.text) {
        try {
          const parsed = JSON.parse(item.text);
          if (parsed.error) return String(parsed.error);
        } catch {}
      }
    }
  }
  return null;
}

/**
 * Calls search_products_from_voice_tool on the live MCP Server
 * passing audio_base64 to search products matching spoken audio
 */
export async function callMcpVoiceSearchTool(audioBase64: string): Promise<McpVoiceSearchResult[]> {
  const mcpUrl = getMcpUrl();

  let sessionId = cachedSessionId;
  if (!sessionId) {
    sessionId = await initializeMcpSession(mcpUrl);
  }

  const executeCall = async (sessId: string | null) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
    };
    if (sessId) {
      headers['mcp-session-id'] = sessId;
    }

    const response = await fetch(mcpUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'tools/call',
        params: {
          name: 'search_products_from_voice_tool',
          arguments: {
            audio_base64: audioBase64,
          },
        },
      }),
      signal: AbortSignal.timeout(60000),
    });

    const newSession = response.headers.get('mcp-session-id');
    if (newSession) cachedSessionId = newSession;

    const rawText = await response.text();
    return parseMcpPayload(rawText);
  };

  try {
    let payload = await executeCall(sessionId);

    // If session expired or missing, retry once
    if (!payload || (payload?.error && payload.error?.message?.toLowerCase().includes('session'))) {
      cachedSessionId = await initializeMcpSession(mcpUrl);
      payload = await executeCall(cachedSessionId);
    }

    const errorMsg = extractVoiceSearchError(payload);
    if (errorMsg) {
      throw new Error(errorMsg);
    }

    const rawResults = extractVoiceSearchResults(payload);
    return rawResults.map((p) => {
      const numMrp = parseFloat(String(p.mrp)) || 40;
      const numPrice = p.price ? Number(p.price) : Math.round(numMrp * 0.9);
      return {
        ...p,
        mrp: numMrp,
        price: numPrice,
      };
    });
  } catch (err: any) {
    console.error('[MCP] search_products_from_voice_tool call error:', err);
    throw new Error(err.message || 'Voice search call failed');
  }
}

/**
 * Calls search_products_tool on the live MCP Server
 * passing user_message to search products matching text query
 */
export async function callMcpSearchProductsTool(userMessage: string): Promise<McpVoiceSearchResult[]> {
  const mcpUrl = getMcpUrl();

  let sessionId = cachedSessionId;
  if (!sessionId) {
    sessionId = await initializeMcpSession(mcpUrl);
  }

  const executeCall = async (sessId: string | null) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
    };
    if (sessId) {
      headers['mcp-session-id'] = sessId;
    }

    const response = await fetch(mcpUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'tools/call',
        params: {
          name: 'search_products_tool',
          arguments: {
            user_message: userMessage,
          },
        },
      }),
      signal: AbortSignal.timeout(60000),
    });

    const newSession = response.headers.get('mcp-session-id');
    if (newSession) cachedSessionId = newSession;

    const rawText = await response.text();
    return parseMcpPayload(rawText);
  };

  try {
    let payload = await executeCall(sessionId);

    // If session expired or missing, retry once
    if (!payload || (payload?.error && payload.error?.message?.toLowerCase().includes('session'))) {
      cachedSessionId = await initializeMcpSession(mcpUrl);
      payload = await executeCall(cachedSessionId);
    }

    const errorMsg = extractVoiceSearchError(payload);
    if (errorMsg) {
      throw new Error(errorMsg);
    }

    const rawResults = extractVoiceSearchResults(payload);
    return rawResults.map((p) => {
      const numMrp = parseFloat(String(p.mrp)) || 40;
      const numPrice = p.price ? Number(p.price) : Math.round(numMrp * 0.9);
      return {
        ...p,
        mrp: numMrp,
        price: numPrice,
      };
    });
  } catch (err: any) {
    console.error('[MCP] search_products_tool call error:', err);
    throw new Error(err.message || 'Product text search call failed');
  }
}



