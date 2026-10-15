'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '@/store';
import { vendorApi } from '@/store/api/vendorApi';
import toast from 'react-hot-toast';
import {
  connectVendorSocket,
  disconnectVendorSocket,
  NewOrderPayload,
  fetchOrderDetails,
} from '@/services/vendorSocket';

export function useVendorSocket() {
  const dispatch = useAppDispatch();
  const { token } = useAppSelector((state) => state.auth);
  const [latestOrder, setLatestOrder] = useState<NewOrderPayload | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  const handleNewOrder = useCallback(
    async (order: NewOrderPayload) => {
      console.log('⚡ [useVendorSocket] Real-time New Order event received:', order);
      setLatestOrder(order);
      const msg = `🔔 New Order Received: #${order.order_number} (₹${order.total_amount})`;
      setNotification(msg);
      toast.success(msg, { duration: 6000 });

      // 1. Invalidate RTK Query cache so orders list updates automatically in real-time
      dispatch(vendorApi.util.invalidateTags(['Orders']));

      // 2. Fetch full order details using order.order_id if token exists
      const currentToken = token || (typeof window !== 'undefined' ? localStorage.getItem('zippy_vendor_token') : null);
      if (currentToken && order.order_id) {
        try {
          const fullDetails = await fetchOrderDetails(order.order_id, currentToken);
          console.log('📦 [useVendorSocket] Fetched full order details:', fullDetails);
        } catch (err) {
          console.error('Failed to fetch full order details for socket event:', err);
        }
      }
    },
    [dispatch, token]
  );

  useEffect(() => {
    const currentToken =
      token || (typeof window !== 'undefined' ? localStorage.getItem('zippy_vendor_token') : null);

    if (currentToken) {
      connectVendorSocket(currentToken, handleNewOrder);
    } else {
      disconnectVendorSocket();
    }

    return () => {
      // Disconnect on unmount if needed
    };
  }, [token, handleNewOrder]);

  const clearNotification = () => setNotification(null);

  return {
    latestOrder,
    notification,
    clearNotification,
    disconnectSocket: disconnectVendorSocket,
  };
}
