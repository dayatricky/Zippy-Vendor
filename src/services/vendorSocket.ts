import { io, Socket } from 'socket.io-client';

export interface NewOrderPayload {
  order_id: string;
  order_number: string;
  store_id: string;
  status: string;
  total_amount: number;
  payment_method: string;
  created_at: string;
}

let socket: Socket | null = null;

export const getSocketUrl = (): string => {
  const raw = (process.env.NEXT_PUBLIC_SOCKET_URL || 'https://zippy-api.elyriasoft.com/vendor/orders').replace(/\/+$/, '');
  return raw.endsWith('/vendor/orders') ? raw : `${raw}/vendor/orders`;
};

export const getApiBaseUrl = (): string => {
  const rawUrl = (process.env.NEXT_PUBLIC_API_URL || 'https://zippy-api.elyriasoft.com/api/v1').replace(/\/+$/, '');
  return rawUrl.endsWith('/api/v1')
    ? rawUrl
    : rawUrl.endsWith('/api')
    ? `${rawUrl}/v1`
    : `${rawUrl}/api/v1`;
};

/**
 * Connect to Vendor Socket namespace using Vendor Access Token
 */
export const connectVendorSocket = (
  vendorAccessToken: string,
  onNewOrder?: (order: NewOrderPayload) => void
): Socket | null => {
  if (!vendorAccessToken) {
    console.warn('[Socket] Cannot connect vendor socket: vendor access token is missing');
    return null;
  }

  // Reuse existing connected socket
  if (socket && socket.connected) {
    return socket;
  }

  if (socket) {
    socket.disconnect();
  }

  const socketUrl = getSocketUrl();
  console.log('[Socket] Initializing Vendor Socket.IO connection:', socketUrl);

  socket = io(socketUrl, {
    auth: {
      token: vendorAccessToken,
    },
    transports: ['websocket', 'polling'],
  });

  // Listen for successful connection
  socket.on('connected', (data: any) => {
    console.log('Vendor socket connected:', data);
    // data.store_id
    // data.room = store:{storeId}
  });

  // Listen for new orders
  socket.on('new_order', (order: NewOrderPayload) => {
    console.log('New order received:', order);
    if (onNewOrder) {
      onNewOrder(order);
    }
  });

  // Handle socket errors/disconnect
  socket.on('connect_error', (error: any) => {
    console.error('Socket connection error:', error?.message || error);
  });

  socket.on('error', (error: any) => {
    console.error('Socket error:', error);
  });

  socket.on('disconnect', (reason: string) => {
    console.log('Socket disconnected:', reason);
  });

  return socket;
};

/**
 * Disconnect socket (e.g. on logout)
 */
export const disconnectVendorSocket = (): void => {
  if (socket) {
    console.log('Disconnecting Vendor Socket...');
    socket.disconnect();
    socket = null;
  }
};

export const getVendorSocket = (): Socket | null => socket;

/**
 * REST API Helper: Fetch full order details using order_id
 */
export async function fetchOrderDetails(orderId: string, vendorAccessToken: string) {
  const baseUrl = getApiBaseUrl();
  const res = await fetch(`${baseUrl}/vendor/orders/${orderId}`, {
    headers: {
      Authorization: `Bearer ${vendorAccessToken}`,
    },
  });
  return res.json();
}

/**
 * REST API Helper: Refresh pending orders list
 */
export async function fetchPendingOrders(vendorAccessToken: string) {
  const baseUrl = getApiBaseUrl();
  const res = await fetch(`${baseUrl}/vendor/orders?status=PENDING`, {
    headers: {
      Authorization: `Bearer ${vendorAccessToken}`,
    },
  });
  return res.json();
}
