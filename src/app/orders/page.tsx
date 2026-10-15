'use client';

import React, { useState } from 'react';
import toast from 'react-hot-toast';
import {
  ShoppingBag,
  Clock,
  Package,
  CheckCircle2,
  XCircle,
  Phone,
  MapPin,
  ArrowRight,
  User,
  Eye,
  X,
  Search,
  RefreshCw,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { useVendorStore } from '@/store/useVendorStore';
import {
  useGetOrdersQuery,
  useGetOrderDetailsQuery,
  useUpdateOrderStatusMutation,
} from '@/store/api/vendorApi';

export default function OrdersPage() {
  const { orders: localOrders, updateOrderStatus: localUpdateOrderStatus } = useVendorStore();
  const [activeTab, setActiveTab] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [statusRemarks, setStatusRemarks] = useState<string>('');
  const [actionError, setActionError] = useState<string>('');

  // 1. Fetch Orders List via RTK Query matching Swagger (/vendor/orders)
  const {
    data: ordersApiData,
    isLoading: isOrdersLoading,
    isFetching: isOrdersFetching,
    error: ordersError,
    refetch: refetchOrders,
  } = useGetOrdersQuery(
    activeTab !== 'ALL' ? { status: activeTab, search: searchTerm } : { search: searchTerm },
    { pollingInterval: 15000 } // Auto-refresh orders every 15 seconds for real-time stream
  );

  // 2. Fetch Single Order Details via RTK Query matching Swagger (/vendor/orders/{orderId})
  const {
    data: singleOrderApiData,
    isLoading: isSingleOrderLoading,
  } = useGetOrderDetailsQuery(selectedOrderId || '', {
    skip: !selectedOrderId,
  });

  // 3. Update Order Status Mutation matching Swagger (/vendor/orders/{orderId}/status)
  const [updateOrderStatusApi, { isLoading: isUpdatingStatus }] = useUpdateOrderStatusMutation();

  // Helper to safely extract orders array from API response
  const rawApiOrders = (() => {
    if (!ordersApiData) return null;
    if (Array.isArray(ordersApiData)) return ordersApiData;
    if (Array.isArray((ordersApiData as any).data)) return (ordersApiData as any).data;
    if (Array.isArray((ordersApiData as any).orders)) return (ordersApiData as any).orders;
    if (Array.isArray((ordersApiData as any).items)) return (ordersApiData as any).items;
    if (Array.isArray((ordersApiData as any).data?.orders)) return (ordersApiData as any).data.orders;
    if (Array.isArray((ordersApiData as any).data?.items)) return (ordersApiData as any).data.items;
    return null;
  })();

  // Helper functions to safely convert API objects to primitives for React rendering
  const formatAddress = (raw: any): string => {
    if (!raw) return 'Standard Delivery Address';
    if (typeof raw === 'string') return raw;
    if (typeof raw === 'object' && raw !== null) {
      const parts = [
        raw.address_line1 || raw.address_line || raw.full_address || raw.line1,
        raw.address_line2 || raw.landmark || raw.line2,
        raw.city,
        raw.state,
        raw.postal_code || raw.pincode,
      ].filter((p) => typeof p === 'string' && p.trim().length > 0);
      if (parts.length > 0) return parts.join(', ');
    }
    return 'Standard Delivery Address';
  };

  const formatCustomerName = (cust: any, user: any, addr: any, fallback?: any): string => {
    if (typeof fallback === 'string' && fallback.trim()) return fallback;
    if (typeof cust === 'string' && cust.trim()) return cust;
    if (typeof cust === 'object' && cust !== null) {
      if (typeof cust.full_name === 'string' && cust.full_name.trim()) return cust.full_name;
      if (typeof cust.name === 'string' && cust.name.trim()) return cust.name;
      if (typeof cust.contact_name === 'string' && cust.contact_name.trim()) return cust.contact_name;
    }
    if (typeof user === 'object' && user !== null && typeof user.name === 'string' && user.name.trim()) return user.name;
    if (typeof addr === 'object' && addr !== null && typeof addr.contact_name === 'string' && addr.contact_name.trim()) return addr.contact_name;
    return 'Customer';
  };

  const formatCustomerPhone = (cust: any, user: any, addr: any, fallback?: any): string => {
    if (typeof fallback === 'string' && fallback.trim()) return fallback;
    if (typeof cust === 'string' && cust.trim()) return cust;
    if (typeof cust === 'object' && cust !== null) {
      if (typeof cust.phone_number === 'string' && cust.phone_number.trim()) return cust.phone_number;
      if (typeof cust.phone === 'string' && cust.phone.trim()) return cust.phone;
      if (typeof cust.contact_phone === 'string' && cust.contact_phone.trim()) return cust.contact_phone;
    }
    if (typeof user === 'object' && user !== null && typeof user.phone === 'string' && user.phone.trim()) return user.phone;
    if (typeof addr === 'object' && addr !== null && typeof addr.contact_phone === 'string' && addr.contact_phone.trim()) return addr.contact_phone;
    return '+91 9876543210';
  };

  // Only display real orders returned from API, never dummy/static fallback data
  const displayOrders = rawApiOrders && Array.isArray(rawApiOrders)
    ? rawApiOrders.map((o: any, idx: number) => {
        const orderIdStr = String(o.order_id || o.id || o._id || `order-${idx}`);
        const rawStatusStr = typeof o.status === 'string' ? o.status.toUpperCase() : typeof o.order_status === 'string' ? o.order_status.toUpperCase() : 'PENDING';
        const addressStr = formatAddress(o.delivery_address || o.address || o.shipping_address);
        const nameStr = formatCustomerName(o.customer, o.user, o.delivery_address || o.address, o.customer_name);
        const phoneStr = formatCustomerPhone(o.customer, o.user, o.delivery_address || o.address, o.customer_phone);
        const orderNumStr = typeof o.order_number === 'string' ? o.order_number : typeof o.orderNumber === 'string' ? o.orderNumber : `ORD-${String(orderIdStr).slice(0, 8)}`;
        const totalAmountNum = Number(o.billing_details?.total_amount ?? o.total_amount ?? o.totalAmount ?? o.grand_total ?? 0);

        return {
          id: orderIdStr,
          orderNumber: orderNumStr,
          customerName: nameStr,
          customerPhone: phoneStr,
          address: addressStr,
          totalAmount: totalAmountNum,
          status: rawStatusStr,
          createdAt: o.created_at ? new Date(o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now',
          items: Array.isArray(o.items)
            ? o.items.map((it: any, iIdx: number) => {
                const itemImg = typeof it.product_image === 'string' && it.product_image.trim()
                  ? it.product_image
                  : typeof it.image_url === 'string' && it.image_url.trim()
                  ? it.image_url
                  : typeof it.image === 'string' && it.image.trim()
                  ? it.image
                  : typeof it.product?.image_url === 'string' && it.product.image_url.trim()
                  ? it.product.image_url
                  : Array.isArray(it.product?.images) && it.product.images.length > 0
                  ? (it.product.images[0]?.image_url || it.product.images[0]?.url)
                  : 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&q=80';

                return {
                  id: String(it.id || `item-${iIdx}`),
                  productName: typeof it.product_name === 'string' ? it.product_name : typeof it.product?.name === 'string' ? it.product.name : typeof it.name === 'string' ? it.name : 'Product Item',
                  quantity: Number(it.quantity || 1),
                  price: Number(it.unit_price ?? it.price ?? it.total_price ?? 0),
                  image: itemImg,
                };
              })
            : [],
        };
      })
    : [];

  const filteredOrders = displayOrders.filter((o) => {
    const matchesSearch =
      o.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.customerPhone.includes(searchTerm);

    if (activeTab === 'ALL') return matchesSearch;
    return matchesSearch && (o.status === activeTab || (activeTab === 'PENDING' && o.status === 'NEW'));
  });

  const handleStatusChange = async (orderId: string, nextStatus: string, remarks?: string) => {
    setActionError('');
    try {
      await updateOrderStatusApi({
        orderId,
        status: nextStatus,
        remarks: remarks || `Order status updated to ${nextStatus}`,
      }).unwrap();
      toast.success(`Order status updated to ${nextStatus}! 🚀`);
    } catch (err: any) {
      console.error('Order Status Update Failed:', err);
      const msg = err?.data?.msg || err?.data?.message || err?.message || 'Failed to update order status';
      setActionError(msg);
      toast.error(msg);
    }

    // Also update local Zustand store for instant optimistic feedback
    const mappedLocalStatus = nextStatus === 'PENDING' ? 'NEW' : nextStatus === 'PREPARING' ? 'PACKING' : nextStatus === 'DELIVERED' ? 'COMPLETED' : nextStatus;
    localUpdateOrderStatus(orderId, mappedLocalStatus as any);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
      case 'NEW':
        return <span className="px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-black animate-pulse">PENDING ACCEPTANCE</span>;
      case 'CONFIRMED':
        return <span className="px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-xs font-black">CONFIRMED</span>;
      case 'PREPARING':
      case 'PACKING':
        return <span className="px-3 py-1 rounded-full bg-sky-50 border border-sky-200 text-sky-800 text-xs font-black">PREPARING / PACKING</span>;
      case 'READY_FOR_PICKUP':
        return <span className="px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs font-black">READY FOR PICKUP</span>;
      case 'OUT_FOR_DELIVERY':
        return <span className="px-3 py-1 rounded-full bg-purple-50 border border-purple-200 text-purple-800 text-xs font-black">OUT FOR DELIVERY</span>;
      case 'DELIVERED':
      case 'COMPLETED':
        return <span className="px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-black">DELIVERED</span>;
      case 'REJECTED':
      case 'CANCELLED':
        return <span className="px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-800 text-xs font-black">REJECTED / CANCELLED</span>;
      default:
        return <span className="px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-black">{status}</span>;
    }
  };

  // Helper to extract full details from single order API call
  const singleOrderObj = (singleOrderApiData as any)?.data || singleOrderApiData;

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <ShoppingBag className="w-6 h-6 text-[#167a46]" />
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Order Processing Stream</h1>
          </div>
          <p className="text-slate-600 text-xs md:text-sm mt-1">
            Manage and track all your customer orders in real time.
          </p>
        </div>

        <button
          onClick={() => refetchOrders()}
          className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold shadow-xs transition-all cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 text-[#167a46] ${isOrdersFetching ? 'animate-spin' : ''}`} />
          <span>{isOrdersFetching ? 'Refreshing...' : 'Refresh Orders'}</span>
        </button>
      </div>

      {ordersError && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
            <span>Orders server sync notice: Could not retrieve live orders. Please check your network or login session.</span>
          </div>
          <button
            onClick={() => refetchOrders()}
            className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ml-3"
          >
            Retry Sync
          </button>
        </div>
      )}

      {actionError && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError('')} className="text-rose-500 hover:text-rose-700 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Controls Bar: Search & Filter Tabs */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 justify-between">
        {/* Search Box */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Order #, Customer Name or Phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="custom-input w-full pl-10 pr-4 py-2 text-xs"
          />
        </div>

        {/* Filter Tabs matching Swagger Status Enum */}
        <div className="white-card p-1.5 flex items-center space-x-1.5 overflow-x-auto scrollbar-none shadow-xs">
          {[
            { id: 'ALL', label: 'All Orders', count: displayOrders.length },
            { id: 'PENDING', label: 'Pending', count: displayOrders.filter((o) => o.status === 'PENDING' || o.status === 'NEW').length },
            { id: 'CONFIRMED', label: 'Confirmed', count: displayOrders.filter((o) => o.status === 'CONFIRMED').length },
            { id: 'PREPARING', label: 'Preparing', count: displayOrders.filter((o) => o.status === 'PREPARING' || o.status === 'PACKING').length },
            { id: 'READY_FOR_PICKUP', label: 'Ready for Pickup', count: displayOrders.filter((o) => o.status === 'READY_FOR_PICKUP').length },
            { id: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', count: displayOrders.filter((o) => o.status === 'OUT_FOR_DELIVERY').length },
            { id: 'DELIVERED', label: 'Delivered', count: displayOrders.filter((o) => o.status === 'DELIVERED' || o.status === 'COMPLETED').length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-[#167a46] text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>
      </div>

      {/* Orders Stream Grid */}
      {isOrdersLoading ? (
        <div className="p-16 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
          <RefreshCw className="w-8 h-8 text-[#167a46] animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-600">Fetching live orders from store server...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="p-16 text-center bg-white rounded-2xl border border-dashed border-slate-200 space-y-3">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-800">No Orders Found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {searchTerm
              ? `No orders matched "${searchTerm}".`
              : activeTab !== 'ALL'
              ? `You do not have any orders with "${activeTab}" status.`
              : 'No orders received yet. When customers place orders, they will appear here in real-time.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredOrders.map((order) => (
            <div
              key={order.id}
              className="white-card p-6 space-y-5 relative overflow-hidden flex flex-col justify-between shadow-xs border border-slate-200 hover:border-[#167a46]/40 transition-all"
            >
              <div className="space-y-4">
                {/* Order Top Bar */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <span className="font-mono text-lg font-black text-slate-900">{order.orderNumber}</span>
                    <span className="text-xs text-slate-500 ml-2 font-medium">({order.createdAt})</span>
                  </div>
                  <div>{getStatusBadge(order.status)}</div>
                </div>

                {/* Customer Info Card */}
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-slate-900 font-bold">
                    <div className="flex items-center space-x-2">
                      <User className="w-3.5 h-3.5 text-[#167a46]" />
                      <span>{order.customerName}</span>
                    </div>
                    <a
                      href={`tel:${order.customerPhone}`}
                      className="flex items-center space-x-1 text-[#167a46] hover:underline font-semibold cursor-pointer"
                    >
                      <Phone className="w-3 h-3" />
                      <span>{order.customerPhone}</span>
                    </a>
                  </div>
                  <div className="flex items-start space-x-2 text-slate-600">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{order.address}</span>
                  </div>
                </div>

                {/* Items List Snapshot */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <span>Ordered Items ({order.items.length})</span>
                    <button
                      onClick={() => setSelectedOrderId(order.id)}
                      className="text-[#167a46] hover:underline flex items-center space-x-1 font-bold normal-case cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View Order Details</span>
                    </button>
                  </div>
                  <div className="space-y-2">
                    {order.items.slice(0, 3).map((item: any) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                      >
                        <div className="flex items-center space-x-2.5">
                          <img
                            src={item.image}
                            alt={item.productName}
                            className="w-9 h-9 rounded-lg object-cover border border-slate-200 bg-white"
                          />
                          <span className="font-semibold text-slate-800 line-clamp-1">{item.productName}</span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-bold text-[#167a46]">
                            {item.quantity} x ₹{item.price}
                          </span>
                        </div>
                      </div>
                    ))}
                    {order.items.length > 3 && (
                      <div className="text-center text-xs font-bold text-slate-500 pt-1">
                        + {order.items.length - 3} more items in order
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Order Footer & Status Action Controls matching Swagger Specs */}
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-500 block font-medium">Total Bill Amount</span>
                    <span className="text-xl font-black text-slate-900">₹{order.totalAmount}</span>
                  </div>

                  {/* Actions according to Swagger Status Flow */}
                  <div className="flex items-center space-x-2">
                    {(order.status === 'PENDING' || order.status === 'NEW') && (
                      <>
                        <button
                          disabled={isUpdatingStatus}
                          onClick={() => handleStatusChange(order.id, 'REJECTED', 'Rejected by store team')}
                          className="px-3 py-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 font-bold text-xs transition-all cursor-pointer"
                        >
                          Reject
                        </button>
                        <button
                          disabled={isUpdatingStatus}
                          onClick={() => handleStatusChange(order.id, 'CONFIRMED', 'Accepted by store team')}
                          className="px-4 py-2 rounded-xl bg-[#167a46] hover:bg-[#12653a] text-white font-black text-xs transition-all shadow-xs flex items-center space-x-1.5 cursor-pointer"
                        >
                          <span>Accept & Confirm</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}

                    {order.status === 'CONFIRMED' && (
                      <button
                        disabled={isUpdatingStatus}
                        onClick={() => handleStatusChange(order.id, 'PREPARING', 'Order packaging in progress')}
                        className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs transition-all shadow-xs flex items-center space-x-1.5 cursor-pointer"
                      >
                        <span>Start Preparing</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {(order.status === 'PREPARING' || order.status === 'PACKING') && (
                      <button
                        disabled={isUpdatingStatus}
                        onClick={() => handleStatusChange(order.id, 'READY_FOR_PICKUP', 'Order packed and ready for delivery agent')}
                        className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-black text-xs transition-all shadow-xs flex items-center space-x-1.5 cursor-pointer"
                      >
                        <span>Mark Ready for Pickup</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {order.status === 'READY_FOR_PICKUP' && (
                      <button
                        disabled={isUpdatingStatus}
                        onClick={() => handleStatusChange(order.id, 'OUT_FOR_DELIVERY', 'Handed over to delivery agent')}
                        className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs transition-all shadow-xs flex items-center space-x-1.5 cursor-pointer"
                      >
                        <span>Handover / Out for Delivery</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {order.status === 'OUT_FOR_DELIVERY' && (
                      <button
                        disabled={isUpdatingStatus}
                        onClick={() => handleStatusChange(order.id, 'DELIVERED', 'Order delivered successfully')}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs transition-all shadow-xs flex items-center space-x-1.5 cursor-pointer"
                      >
                        <span>Mark Delivered</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {(order.status === 'DELIVERED' || order.status === 'COMPLETED') && (
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 flex items-center space-x-1">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Order Completed</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Order Details Modal matching GET /api/v1/vendor/orders/{orderId} */}
      {selectedOrderId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in-50">
          <div className="white-card max-w-2xl w-full p-6 space-y-6 shadow-2xl relative border-2 border-[#167a46] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-[#167a46]" />
                <h3 className="text-xl font-black text-slate-900">
                  Order Details
                </h3>
              </div>
              <button
                onClick={() => setSelectedOrderId(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {isSingleOrderLoading ? (
              <div className="p-8 text-center space-y-2">
                <RefreshCw className="w-6 h-6 text-[#167a46] animate-spin mx-auto" />
                <p className="text-xs font-bold text-slate-600">Loading order details...</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Details breakdown */}
                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                  <div>
                    <span className="text-slate-500 font-semibold block">Order ID</span>
                    <span className="font-mono font-bold text-slate-900">{singleOrderObj?.id || selectedOrderId}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-semibold block">Order Number</span>
                    <span className="font-mono font-bold text-slate-900">{singleOrderObj?.order_number || singleOrderObj?.orderNumber || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-semibold block">Status</span>
                    <span className="font-bold text-[#167a46]">{singleOrderObj?.status || 'PENDING'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-semibold block">Total Amount</span>
                    <span className="font-bold text-slate-900">₹{singleOrderObj?.total_amount || singleOrderObj?.grand_total || 0}</span>
                  </div>
                </div>

                {/* Status Update Form inside Modal */}
                <div className="p-4 rounded-xl border border-slate-200 space-y-3 bg-white">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Update Order Status</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">New Status</label>
                      <select
                        id="modal-status-select"
                        className="custom-input w-full px-3 py-2 text-xs bg-white cursor-pointer"
                        defaultValue={singleOrderObj?.status || 'CONFIRMED'}
                      >
                        <option value="PENDING">PENDING</option>
                        <option value="CONFIRMED">CONFIRMED</option>
                        <option value="PREPARING">PREPARING</option>
                        <option value="READY_FOR_PICKUP">READY_FOR_PICKUP</option>
                        <option value="OUT_FOR_DELIVERY">OUT_FOR_DELIVERY</option>
                        <option value="DELIVERED">DELIVERED</option>
                        <option value="REJECTED">REJECTED</option>
                        <option value="CANCELLED">CANCELLED</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Status Remarks</label>
                      <input
                        type="text"
                        placeholder="e.g. Accepted by store team"
                        value={statusRemarks}
                        onChange={(e) => setStatusRemarks(e.target.value)}
                        className="custom-input w-full px-3 py-2 text-xs"
                      />
                    </div>
                  </div>
                  <div className="pt-2 flex justify-end">
                    <button
                      disabled={isUpdatingStatus}
                      onClick={() => {
                        const selectEl = document.getElementById('modal-status-select') as HTMLSelectElement;
                        if (selectEl) {
                          handleStatusChange(selectedOrderId, selectEl.value, statusRemarks || 'Updated via Order Details modal');
                        }
                      }}
                      className="px-4 py-2 rounded-xl bg-[#167a46] hover:bg-[#12653a] text-white font-bold text-xs shadow-xs cursor-pointer"
                    >
                      {isUpdatingStatus ? 'Updating...' : 'Update Status'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
