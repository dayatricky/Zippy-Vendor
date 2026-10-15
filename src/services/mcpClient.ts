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

/**
 * Extracts product items from the MCP response payload
 * Handles both single product objects and arrays of products.
 */
function extractProductsFromPayload(payload: any): McpProductResult[] {
  if (!payload?.result) return [];
  const res = payload.result;

  // 1. Check structuredContent
  if (res.structuredContent?.result) {
    const sc = res.structuredContent.result;
    if (Array.isArray(sc)) {
      return sc.filter((p) => p && typeof p === 'object' && p.product_name);
    }
    if (sc && typeof sc === 'object' && sc.product_name) {
      return [sc as McpProductResult];
    }
    if (Array.isArray(sc.products)) {
      return sc.products.filter((p: any) => p && typeof p === 'object' && p.product_name);
    }
  }

  // 2. Check content array text
  if (Array.isArray(res.content)) {
    for (const item of res.content) {
      if (item.text) {
        try {
          const parsed = JSON.parse(item.text);
          if (Array.isArray(parsed)) {
            return parsed.filter((p) => p && typeof p === 'object' && p.product_name);
          }
          if (Array.isArray(parsed.result)) {
            return parsed.result.filter((p: any) => p && typeof p === 'object' && p.product_name);
          }
          if (parsed.result?.product_name) {
            return [parsed.result as McpProductResult];
          }
          if (parsed.product_name) {
            return [parsed as McpProductResult];
          }
          if (Array.isArray(parsed.products)) {
            return parsed.products.filter((p: any) => p && typeof p === 'object' && p.product_name);
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
            user_message: userMessage,
          },
        },
      }),
      signal: AbortSignal.timeout(60000), // 60s timeout for LLM generation
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
