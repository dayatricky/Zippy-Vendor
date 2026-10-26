'use client';

import React, { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import {
  Wallet,
  DollarSign,
  TrendingUp,
  CheckCircle2,
  Clock,
  Building,
  X,
  FileText,
  Plus,
  Search,
  Filter,
  ArrowUpRight,
  ShieldCheck,
  AlertCircle,
  Copy,
  Check,
  Printer,
  CreditCard,
  ArrowRight,
  RefreshCw,
  SlidersHorizontal,
  Layers,
  Send,
  Eye,
  Landmark,
  ChevronRight,
  Info,
  Percent,
  ShoppingBag,
  ExternalLink,
  Sparkles,
  Calendar,
  User,
  Phone,
  Package,
} from 'lucide-react';
import { useVendorStore } from '@/store/useVendorStore';
import {
  useGetWithdrawalBalanceQuery,
  useGetWithdrawalHistoryQuery,
  useRequestWithdrawalMutation,
  useGetStoreRequestQuery,
} from '@/store/api/vendorApi';

export type SettlementStatus = 'UNSETTLED' | 'IN_REVIEW' | 'SETTLED';

export interface SettlementOrder {
  id: string;
  orderNumber: string;
  customerName?: string;
  customerPhone?: string;
  address?: string;
  items: {
    id: string;
    productName: string;
    quantity: number;
    price: number;
    totalPrice: number;
    image: string;
  }[];
  grossAmount: number;
  platformFee: number;
  commissionRate: number;
  refundedAmount: number;
  netAmount: number;
  orderStatus: string;
  settlementStatus: SettlementStatus;
  createdAt: string;
  rawDate?: string;
  deliveredAt: string;
  paymentMethod: string;
  withdrawalRequestId?: string;
  adminUtr?: string;
}

export interface WithdrawalRequestRecord {
  id: string;
  createdAt: string;
  orderIds: string[];
  orderNumbers: string[];
  orderCount: number;
  grossAmount: number;
  platformFee: number;
  netAmount: number;
  status: 'PENDING_ADMIN_TRANSFER' | 'TRANSFERRED_TO_BANK' | 'REJECTED';
  payoutMethod: 'BANK_TRANSFER' | 'UPI';
  bankDetails: {
    bankName: string;
    accountNumber: string;
    ifscCode: string;
    accountHolderName: string;
  };
  upiId?: string;
  adminUtr?: string;
  adminRemarks?: string;
  settledAt?: string;
  vendorNotes?: string;
  startDate?: string;
  endDate?: string;
}

// Helper to normalize any backend order payload into SettlementOrder
function mapOrderToSettlement(o: any, idx: number = 0): SettlementOrder {
  const ordId = String(o.order_id || o.id || o._id || o.orderId || `ord-${idx}`);
  const ordNum = String(o.order_number || o.orderNumber || o.order_no || `ORD-${ordId.slice(-6).toUpperCase()}`);

  const gross = Number(
    o.gross_amount ??
    o.grossAmount ??
    o.billing_details?.total_amount ??
    o.total_amount ??
    o.totalAmount ??
    o.grand_total ??
    o.amount ??
    0
  );

  const fee = Number(
    o.commission_amount ??
    o.commissionAmount ??
    o.commission ??
    o.platform_fee ??
    o.platformFee ??
    o.fee ??
    (gross * 0.05)
  );

  const commRate = Number(
    o.commission_rate_percent ??
    o.commissionRate ??
    (gross > 0 ? (fee / gross) * 100 : 5)
  );

  const refunded = Number(o.refunded_amount ?? o.refundedAmount ?? 0);

  const net = Number(
    o.amount ??
    o.net_amount ??
    o.netAmount ??
    o.vendor_amount ??
    (gross - fee)
  );

  const rawStatus = String(o.status || o.order_status || 'AVAILABLE').toUpperCase();
  const rawSettlementStatus = String(o.settlement_status || o.settlementStatus || '').toUpperCase();

  let settlementStatus: SettlementStatus = 'UNSETTLED';
  if (
    rawSettlementStatus === 'SETTLED' ||
    o.is_settled ||
    rawStatus === 'SETTLED' ||
    rawStatus === 'TRANSFERRED' ||
    rawStatus === 'COMPLETED'
  ) {
    settlementStatus = 'SETTLED';
  } else if (
    rawSettlementStatus === 'IN_REVIEW' ||
    rawStatus === 'IN_REVIEW' ||
    rawStatus === 'REQUESTED' ||
    (Array.isArray(o.withdrawal_request_ids) && o.withdrawal_request_ids.length > 0) ||
    (o.withdrawal_request_id && o.withdrawal_request_id !== null && o.withdrawal_request_id !== 'null' && String(o.withdrawal_request_id).trim() !== '')
  ) {
    settlementStatus = 'IN_REVIEW';
  } else {
    // rawStatus === 'AVAILABLE' or UNSETTLED (Ready for vendor to withdraw)
    settlementStatus = 'UNSETTLED';
  }

  // Look for items in `products` (from user backend) OR `items`
  const rawProducts = Array.isArray(o.products) ? o.products : Array.isArray(o.items) ? o.items : [];
  const items = rawProducts.map((it: any, iIdx: number) => {
    const qty = Number(it.quantity || it.qty || 1);
    const unitPrice = Number(it.unit_price ?? it.price ?? (it.total_price && qty ? Number(it.total_price) / qty : 0));
    const totalPrice = Number(it.total_price ?? (unitPrice * qty));
    return {
      id: String(it.product_id || it.id || it._id || iIdx),
      productName: it.name || it.product_name || it.title || it.product?.name || 'Product Item',
      quantity: qty,
      price: Number(unitPrice.toFixed(2)),
      totalPrice: Number(totalPrice.toFixed(2)),
      image: it.image || it.product_image || it.image_url || it.product?.image || '',
    };
  });

  const customerName =
    o.customer?.name ||
    o.customer?.full_name ||
    o.customer_name ||
    o.customerName ||
    o.user?.name ||
    undefined;

  const customerPhone =
    o.customer?.phone ||
    o.customer?.phone_number ||
    o.customerPhone ||
    o.phone ||
    undefined;

  const address =
    typeof o.delivery_address === 'string'
      ? o.delivery_address
      : o.delivery_address?.address_line1 || o.address || o.shipping_address || undefined;

  const rawDateStr = o.order_date || o.created_at || o.createdAt || o.date;
  const deliveredDateStr = o.delivered_at || o.deliveredAt || o.order_date;

  const formattedCreated = rawDateStr
    ? new Date(rawDateStr).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  const formattedDelivered = deliveredDateStr
    ? new Date(deliveredDateStr).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Delivered';

  const wReqId =
    (Array.isArray(o.withdrawal_request_ids) && o.withdrawal_request_ids[0]) ||
    o.withdrawal_request_id ||
    o.withdrawalRequestId ||
    undefined;

  return {
    id: ordId,
    orderNumber: ordNum,
    customerName,
    customerPhone,
    address,
    items,
    grossAmount: Number(gross.toFixed(2)),
    platformFee: Number(fee.toFixed(2)),
    commissionRate: Number(commRate.toFixed(1)),
    refundedAmount: Number(refunded.toFixed(2)),
    netAmount: Number(net.toFixed(2)),
    orderStatus: rawStatus,
    settlementStatus,
    withdrawalRequestId: wReqId,
    adminUtr: o.admin_utr || o.adminUtr || o.utr || undefined,
    createdAt: formattedCreated,
    rawDate: rawDateStr,
    deliveredAt: formattedDelivered,
    paymentMethod: o.payment_method || o.paymentMethod || 'Online Prepaid',
  };
}


// Fallback-resilient Product Image thumbnail
function ProductImageWithFallback({
  src,
  alt,
  className = 'w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0 bg-slate-100',
}: {
  src?: string;
  alt: string;
  className?: string;
}) {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      <div
        className={`${className} flex items-center justify-center text-slate-400 bg-slate-100`}
        title={alt}
      >
        <Package className="w-4 h-4 text-slate-400" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      onError={() => setHasError(true)}
      className={className}
      loading="lazy"
    />
  );
}

// Detailed Modal for viewing a single order breakdown
function OrderDetailModal({
  order,
  onClose,
  onWithdraw,
}: {
  order: SettlementOrder | null;
  onClose: () => void;
  onWithdraw: (orderId: string) => void;
}) {
  if (!order) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-white border border-slate-200 text-[#167a46] shadow-xs">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900 font-mono">{order.orderNumber}</h3>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                    order.settlementStatus === 'UNSETTLED'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : order.settlementStatus === 'IN_REVIEW'
                      ? 'bg-amber-100 text-amber-900 border border-amber-200'
                      : 'bg-blue-100 text-blue-900 border border-blue-200'
                  }`}
                >
                  {order.settlementStatus === 'UNSETTLED'
                    ? 'Available for Payout'
                    : order.settlementStatus === 'IN_REVIEW'
                    ? 'In Review'
                    : 'Settled'}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Delivered on {order.createdAt}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200/50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs">
          {/* Products List */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Ordered Products ({order.items.length})
            </span>
            <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 overflow-hidden bg-slate-50/50">
              {order.items.map((it, idx) => (
                <div key={idx} className="p-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-center space-x-3 min-w-0">
                    <ProductImageWithFallback
                      src={it.image}
                      alt={it.productName}
                      className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="font-extrabold text-slate-900 text-xs truncate">
                        {it.productName}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Quantity: <strong className="text-slate-800">{it.quantity}</strong> × ₹{it.price.toFixed(2)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono font-black text-slate-900 text-sm">
                      ₹{it.totalPrice.toFixed(2)}
                    </div>
                    <div className="text-[10px] text-emerald-700 font-semibold">Delivered</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Financial Breakdown */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex justify-between items-center text-slate-600">
              <span>Gross Order Value (Customer Paid to Admin):</span>
              <span className="font-extrabold text-slate-900">
                ₹{order.grossAmount.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between items-center text-amber-800">
              <span>Admin Platform Commission ({order.commissionRate}%):</span>
              <span className="font-bold">- ₹{order.platformFee.toFixed(2)}</span>
            </div>
            {order.refundedAmount > 0 && (
              <div className="flex justify-between items-center text-rose-700">
                <span>Refunded Amount:</span>
                <span className="font-bold">- ₹{order.refundedAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-sm font-black text-slate-900">
              <span>Net Vendor Payout:</span>
              <span className="text-[#167a46] text-base font-black">
                ₹{order.netAmount.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Settlement Meta */}
          <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-200 text-[11px] space-y-1">
            <div className="font-bold text-emerald-950 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#167a46]" />
              Settlement Eligibility
            </div>
            <p className="text-emerald-800">
              This order has been successfully delivered. Customer payment is collected by Admin and is ready for withdrawal to your verified bank account.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all shadow-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default function WithdrawalsPage() {
  const { vendor, setStoreModalOpen } = useVendorStore();

  // Local date helper to avoid UTC day-offset issues
  const formatYmd = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  // Store request query to get linked bank details
  const { data: storeRequestData } = useGetStoreRequestQuery(undefined);
  const storeReq = (storeRequestData as any)?.data || storeRequestData;
  const bankInfo = useMemo(() => ({
    accountHolderName: storeReq?.bankDetails?.accountHolderName || vendor.ownerName || vendor.storeName || '',
    bankName: storeReq?.bankDetails?.bankName || vendor.bankName || '',
    accountNumber: storeReq?.bankDetails?.bankAccountNumber || vendor.bankAccount || '',
    ifscCode: storeReq?.bankDetails?.ifscCode || vendor.ifscCode || '',
    accountType: storeReq?.bankDetails?.accountType || 'Bank Account',
    upiId: storeReq?.bankDetails?.upiId || (vendor as any)?.upiId || '',
  }), [storeReq, vendor]);

  // ==========================================
  // 3 SWAGGER APIS FOR WITHDRAWALS:
  // 1. GET  /api/v1/vendor/withdrawals/balance  (Eligible balance)
  // 2. GET  /api/v1/vendor/withdrawals/history  (Orders & requests)
  // 3. POST /api/v1/vendor/withdrawals/request  (Request payout)
  // ==========================================

  // 1. GET /api/v1/vendor/withdrawals/balance — eligible balance
  const {
    data: balanceApiData,
    isLoading: isBalanceLoading,
    isError: isBalanceError,
    error: balanceError,
    refetch: refetchBalance,
  } = useGetWithdrawalBalanceQuery();

  // 2. GET /api/v1/vendor/withdrawals/history — order records & request history
  const {
    data: historyApiData,
    isLoading: isHistoryLoading,
    isError: isHistoryError,
    error: historyError,
    refetch: refetchHistory,
  } = useGetWithdrawalHistoryQuery();

  // 3. POST /api/v1/vendor/withdrawals/request — submit withdrawal request
  const [requestWithdrawalApi, { isLoading: isSubmittingWithdrawal }] = useRequestWithdrawalMutation();

  // State for live orders & withdrawal requests (strictly populated from backend APIs, starts empty)
  const [ordersList, setOrdersList] = useState<SettlementOrder[]>([]);
  const [withdrawalsList, setWithdrawalsList] = useState<WithdrawalRequestRecord[]>([]);

  // Amount input for the withdrawal modal (matching Swagger schema: { "amount": 500 })
  const [withdrawAmountInput, setWithdrawAmountInput] = useState<string>('');

  // Purge any legacy dummy items stored in browser localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('zippy_vendor_order_settlements_v2');
        localStorage.removeItem('zippy_vendor_withdrawals_v2');
        localStorage.removeItem('zippy_vendor_order_settlements');
        localStorage.removeItem('zippy_vendor_withdrawals');
      } catch {
        // ignore
      }
    }
  }, []);

// ==========================================
// UNIVERSAL API RESPONSE EXTRACTORS
// Seamlessly handles backend payloads (pending_earnings, reserved_earnings, withdrawal_requests, etc.)
// ==========================================

function extractOrdersFromPayload(rootData: any): any[] {
  if (!rootData) return [];
  const found: any[] = [];
  const visited = new Set();

  function scan(obj: any, defaultStatus: SettlementStatus = 'UNSETTLED') {
    if (!obj || typeof obj !== 'object' || visited.has(obj)) return;
    visited.add(obj);

    if (Array.isArray(obj)) {
      for (const item of obj) {
        if (item && typeof item === 'object') {
          // Is this item an order record?
          if (
            item.order_id ||
            item.order_number ||
            item.orderNumber ||
            item.orderId ||
            item.order_no ||
            (Array.isArray(item.products) && item.products.length > 0) ||
            (item.gross_amount !== undefined && item.amount !== undefined)
          ) {
            found.push({
              ...item,
              settlement_status: item.settlement_status || item.settlementStatus || defaultStatus,
            });
          } else {
            scan(item, defaultStatus);
          }
        }
      }
      return;
    }

    // Direct match for backend's exact arrays
    if (obj.pending_earnings || obj.pending) {
      scan(obj.pending_earnings || obj.pending, 'UNSETTLED');
    }
    if (obj.reserved_earnings || obj.reservedEarnings || obj.in_review || obj.review || obj.inReview || obj.requested) {
      scan(obj.reserved_earnings || obj.reservedEarnings || obj.in_review || obj.review || obj.inReview || obj.requested, 'IN_REVIEW');
    }
    if (obj.settled_earnings || obj.settledEarnings || obj.settled || obj.completed || obj.transferred) {
      scan(obj.settled_earnings || obj.settledEarnings || obj.settled || obj.completed || obj.transferred, 'SETTLED');
    }

    // Direct arrays
    if (Array.isArray(obj.records)) scan(obj.records, defaultStatus);
    if (Array.isArray(obj.orders)) scan(obj.orders, defaultStatus);
    if (Array.isArray(obj.items)) scan(obj.items, defaultStatus);

    // Scan any other nested object keys (e.g. `data`)
    for (const [key, val] of Object.entries(obj)) {
      if (
        [
          'pending', 'pending_earnings', 'pendingEarnings', 'unsettled',
          'reserved_earnings', 'reservedEarnings', 'reserved',
          'in_review', 'review', 'inReview', 'requested',
          'settled', 'settled_earnings', 'settledEarnings', 'completed', 'transferred',
          'records', 'orders', 'items', 'withdrawal_requests', 'withdrawals', 'audit',
        ].includes(key)
      ) {
        continue;
      }
      if (val && typeof val === 'object') {
        scan(val, defaultStatus);
      }
    }
  }

  scan(rootData);

  // Deduplicate by order id or order number
  const uniqueMap = new Map<string, any>();
  for (const ord of found) {
    const key = String(ord.order_id || ord.id || ord._id || ord.order_number || ord.orderNumber || JSON.stringify(ord));
    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, ord);
    }
  }

  return Array.from(uniqueMap.values());
}

function extractWithdrawalsFromPayload(rootData: any): any[] {
  if (!rootData) return [];
  const payload = (rootData as any)?.data || rootData;

  // Direct array matches
  if (Array.isArray(payload.withdrawal_requests)) return payload.withdrawal_requests;
  if (Array.isArray(payload.withdrawalRequests)) return payload.withdrawalRequests;
  if (Array.isArray(payload.withdrawals)) return payload.withdrawals;
  if (Array.isArray(payload.requests)) return payload.requests;
  if (Array.isArray(payload.history)) return payload.history;

  const found: any[] = [];
  const visited = new Set();

  function scan(obj: any) {
    if (!obj || typeof obj !== 'object' || visited.has(obj)) return;
    visited.add(obj);

    if (Array.isArray(obj)) {
      for (const item of obj) {
        if (item && typeof item === 'object') {
          if (
            item.requested_amount !== undefined ||
            item.withdrawal_id ||
            item.withdrawalId ||
            item.payout_id ||
            item.payoutId ||
            item.utr ||
            item.admin_utr ||
            (item.status &&
              ['PENDING_ADMIN_TRANSFER', 'TRANSFERRED_TO_BANK', 'REJECTED', 'REQUESTED', 'APPROVED', 'COMPLETED', 'SETTLED'].includes(
                String(item.status).toUpperCase()
              ) &&
              !item.order_id && !item.order_number)
          ) {
            found.push(item);
          } else {
            scan(item);
          }
        }
      }
      return;
    }

    if (
      obj.withdrawal_requests ||
      obj.withdrawalRequests ||
      obj.withdrawals ||
      obj.requests ||
      obj.withdrawal_history ||
      obj.withdrawalHistory
    ) {
      scan(
        obj.withdrawal_requests ||
        obj.withdrawalRequests ||
        obj.withdrawals ||
        obj.requests ||
        obj.withdrawal_history ||
        obj.withdrawalHistory
      );
    }

    for (const [key, val] of Object.entries(obj)) {
      if (
        [
          'withdrawal_requests', 'withdrawalRequests', 'withdrawals', 'requests',
          'pending_earnings', 'reserved_earnings', 'settled_earnings',
          'records', 'orders', 'audit',
        ].includes(key)
      ) {
        continue;
      }
      if (val && typeof val === 'object') {
        scan(val);
      }
    }
  }

  scan(rootData);
  return found;
}

function extractPendingTotal(rootData: any): number {
  if (!rootData) return 0;
  const candidates: any[] = [
    rootData?.pending?.total_amount,
    rootData?.pending?.totalAmount,
    rootData?.pending?.amount,
    rootData?.pending_earnings?.total_amount,
    rootData?.pending_earnings?.totalAmount,
    rootData?.pending_earnings?.amount,
    rootData?.pendingEarnings?.total_amount,
    rootData?.pendingEarnings?.totalAmount,
    rootData?.pendingEarnings?.amount,
    rootData?.earnings?.pending?.total_amount,
    rootData?.earnings?.total_amount,
    rootData?.data?.pending?.total_amount,
    rootData?.data?.pending?.totalAmount,
    rootData?.data?.pending_earnings?.total_amount,
    rootData?.data?.pendingEarnings?.total_amount,
    rootData?.data?.earnings?.total_amount,
    rootData?.data?.data?.pending?.total_amount,
    rootData?.data?.total_amount,
    rootData?.data?.totalAmount,
    rootData?.total_amount,
    rootData?.totalAmount,
    rootData?.amount,
  ];
  for (const c of candidates) {
    const num = Number(c);
    if (!isNaN(num) && num > 0) return num;
  }
  return 0;
}

function extractBalance(rootData: any): number {
  if (!rootData) return 0;
  const candidates: any[] = [
    rootData?.balance,
    rootData?.eligible_balance,
    rootData?.available_balance,
    rootData?.amount,
    rootData?.total_amount,
    rootData?.data?.balance,
    rootData?.data?.eligible_balance,
    rootData?.data?.available_balance,
    rootData?.data?.amount,
    rootData?.data?.total_amount,
    rootData?.data?.data?.balance,
    rootData?.data?.data?.available_balance,
    rootData?.data?.data?.eligible_balance,
    rootData?.data?.data?.amount,
    rootData?.balanceAmount,
    rootData?.availableBalance,
    rootData?.eligibleBalance,
    rootData,
  ];
  for (const c of candidates) {
    if (typeof c === 'number' && !isNaN(c) && c >= 0) return c;
    if (typeof c === 'string') {
      const num = Number(c);
      if (!isNaN(num) && num >= 0) return num;
    }
  }
  return 0;
}

  // Sync real API orders & history from GET /api/v1/vendor/withdrawals/history
  // Strictly populated from backend data — NO mock fallbacks
  useEffect(() => {
    if (!historyApiData) {
      setOrdersList([]);
      setWithdrawalsList([]);
      return;
    }

    // 1. Extract all vendor orders from any shape in GET /api/v1/vendor/withdrawals/history
    const rawOrders = extractOrdersFromPayload(historyApiData);
    const mapped = rawOrders.map(mapOrderToSettlement);
    setOrdersList(mapped);

    // 2. Extract withdrawal request history (for the Ledger tab)
    const rawWithdrawals = extractWithdrawalsFromPayload(historyApiData);
    if (Array.isArray(rawWithdrawals) && rawWithdrawals.length > 0) {
      const normalized: WithdrawalRequestRecord[] = rawWithdrawals.map((w: any, idx: number) => {
        const id = String(w.id || w._id || w.withdrawal_id || `WTH-${idx + 1000}`);
        const net = Number(w.requested_amount ?? w.requestedAmount ?? w.amount ?? w.net_amount ?? 0);
        const gross = Number(w.gross_amount ?? w.grossAmount ?? net);
        const fee = Number(w.platform_fee ?? w.platformFee ?? (gross > net ? gross - net : 0));
        const rawStatus = String(w.status || 'PENDING_ADMIN_TRANSFER').toUpperCase();

        let status: 'PENDING_ADMIN_TRANSFER' | 'TRANSFERRED_TO_BANK' | 'REJECTED' = 'PENDING_ADMIN_TRANSFER';
        if (['APPROVED', 'COMPLETED', 'SETTLED', 'TRANSFERRED', 'TRANSFERRED_TO_BANK'].includes(rawStatus)) {
          status = 'TRANSFERRED_TO_BANK';
        } else if (['REJECTED', 'CANCELLED', 'FAILED'].includes(rawStatus)) {
          status = 'REJECTED';
        } else {
          status = 'PENDING_ADMIN_TRANSFER';
        }

        const dateStr = w.requested_at || w.created_at || w.createdAt || w.date;
        const formattedDate = dateStr
          ? new Date(dateStr).toLocaleDateString('en-IN', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })
          : 'Recent';

        const nestedOrderIds = Array.isArray(w.orders)
          ? w.orders.map((o: any) => String(o.id || o._id || o.order_id || ''))
          : [];
        const nestedOrderNumbers = Array.isArray(w.orders)
          ? w.orders.map((o: any) => String(o.order_number || o.orderNumber || o.order_id || ''))
          : [];

        return {
          id,
          createdAt: formattedDate,
          orderIds: Array.isArray(w.order_ids || w.orderIds)
            ? (w.order_ids || w.orderIds).map(String)
            : nestedOrderIds,
          orderNumbers: Array.isArray(w.order_numbers || w.orderNumbers)
            ? w.order_numbers || w.orderNumbers
            : nestedOrderNumbers,
          orderCount: Number(
            w.order_count ||
            w.orderCount ||
            (Array.isArray(w.orders) ? w.orders.length : 0) ||
            (Array.isArray(w.order_ids || w.orderIds) ? (w.order_ids || w.orderIds).length : 1)
          ),
          grossAmount: gross,
          platformFee: fee,
          netAmount: net,
          status,
          payoutMethod: (w.payout_method || w.payoutMethod || 'BANK_TRANSFER') as any,
          bankDetails: {
            bankName: w.bank_name || bankInfo.bankName,
            accountNumber: w.account_number || bankInfo.accountNumber,
            ifscCode: w.ifsc_code || bankInfo.ifscCode,
            accountHolderName: w.account_holder_name || bankInfo.accountHolderName,
          },
          upiId: w.upi_id || bankInfo.upiId,
          adminUtr: w.admin_utr || w.utr || w.reference_number || undefined,
          adminRemarks: w.admin_remarks || w.remarks || w.rejection_reason || undefined,
          settledAt: w.settled_at || w.reviewed_at || (status === 'TRANSFERRED_TO_BANK' ? 'Transferred' : undefined),
          vendorNotes: w.notes || undefined,
        };
      });

      setWithdrawalsList(normalized);
    } else {
      setWithdrawalsList([]);
    }
  }, [historyApiData, bankInfo]);

  // Tabs & Filters (Default to 'ALL' so all vendor orders from history are immediately visible)
  const [activeTab, setActiveTab] = useState<'ALL' | 'UNPAID' | 'IN_REVIEW' | 'SETTLED' | 'LEDGER'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);

  // Modals state
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [selectedLedgerItem, setSelectedLedgerItem] = useState<WithdrawalRequestRecord | null>(null);
  const [isLedgerDetailOpen, setIsLedgerDetailOpen] = useState(false);
  const [selectedOrderDetail, setSelectedOrderDetail] = useState<SettlementOrder | null>(null);

  // Form State for Withdrawal Request
  const [payoutForm, setPayoutForm] = useState({
    method: 'BANK_TRANSFER' as 'BANK_TRANSFER' | 'UPI',
    vendorNotes: '',
    agreedProof: true,
  });

  // Calculate Metrics strictly based on live GET /api/v1/vendor/withdrawals/history
  const metrics = useMemo(() => {
    if (!historyApiData) {
      return {
        unpaidCount: 0,
        unpaidGross: 0,
        unpaidFee: 0,
        unpaidNet: 0,
        inReviewCount: 0,
        inReviewNet: 0,
        settledCount: 0,
        settledNet: 0,
        totalDeliveredGross: 0,
        totalDeliveredFee: 0,
        avgCommRate: '5.0',
      };
    }

    const apiPendingTotal = extractPendingTotal(historyApiData);

    // 1. Unsettled: orders delivered where payment has NOT arrived to vendor
    const unpaidOrders = ordersList.filter((o) => o.settlementStatus === 'UNSETTLED');
    const unpaidGross = unpaidOrders.reduce((sum, o) => sum + o.grossAmount, 0);
    const unpaidFee = unpaidOrders.reduce((sum, o) => sum + o.platformFee, 0);
    const computedUnpaidNet = unpaidOrders.reduce((sum, o) => sum + o.netAmount, 0);
    const unpaidNet = apiPendingTotal > 0 ? apiPendingTotal : computedUnpaidNet;
    const effectiveUnpaidCount = unpaidOrders.length > 0 ? unpaidOrders.length : (apiPendingTotal > 0 ? ordersList.length : 0);

    // 2. In Review: orders currently requested and awaiting Admin manual release
    const inReviewOrders = ordersList.filter((o) => o.settlementStatus === 'IN_REVIEW');
    const inReviewNet = inReviewOrders.reduce((sum, o) => sum + o.netAmount, 0);

    // 3. Settled: orders cleared/paid by Admin to vendor
    const settledOrders = ordersList.filter((o) => o.settlementStatus === 'SETTLED');
    const settledNet = settledOrders.reduce((sum, o) => sum + o.netAmount, 0);

    // 4. Gross all delivered
    const totalDeliveredGross =
      ordersList.reduce((sum, o) => sum + o.grossAmount, 0) ||
      (unpaidGross > 0 ? unpaidGross : (unpaidNet > 0 ? Number((unpaidNet * 1.0526).toFixed(2)) : 0));
    const totalDeliveredFee =
      ordersList.reduce((sum, o) => sum + o.platformFee, 0) ||
      (unpaidFee > 0 ? unpaidFee : Number((totalDeliveredGross - unpaidNet).toFixed(2)));

    const avgCommRate =
      totalDeliveredGross > 0 ? ((totalDeliveredFee / totalDeliveredGross) * 100).toFixed(1) : '5.0';

    return {
      unpaidCount: effectiveUnpaidCount,
      unpaidGross: Number(unpaidGross.toFixed(2)),
      unpaidFee: Number(unpaidFee.toFixed(2)),
      unpaidNet: Number(unpaidNet.toFixed(2)),
      inReviewCount: inReviewOrders.length,
      inReviewNet: Number(inReviewNet.toFixed(2)),
      settledCount: settledOrders.length,
      settledNet: Number(settledNet.toFixed(2)),
      totalDeliveredGross: Number(totalDeliveredGross.toFixed(2)),
      totalDeliveredFee: Number(totalDeliveredFee.toFixed(2)),
      avgCommRate,
    };
  }, [ordersList, historyApiData]);

  // Eligible balance strictly derived from live GET /api/v1/vendor/withdrawals/balance
  const eligibleWithdrawalBalance = useMemo(() => {
    const bal = extractBalance(balanceApiData);
    if (bal > 0) return Number(bal.toFixed(2));
    // Return unpaidNet from history if orders exist, else 0 (NO mock fallback)
    return metrics.unpaidNet > 0 ? metrics.unpaidNet : 0;
  }, [balanceApiData, metrics.unpaidNet]);

  // Filtered Orders for the Table
  const filteredOrders = useMemo(() => {
    return ordersList.filter((order) => {
      // Tab filter
      if (activeTab === 'UNPAID' && order.settlementStatus !== 'UNSETTLED') return false;
      if (activeTab === 'IN_REVIEW' && order.settlementStatus !== 'IN_REVIEW') return false;
      if (activeTab === 'SETTLED' && order.settlementStatus !== 'SETTLED') return false;

      // Search filter
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesNum = order.orderNumber.toLowerCase().includes(query);
        const matchesCust = (order.customerName || '').toLowerCase().includes(query);
        const matchesPhone = (order.customerPhone || '').includes(query);
        const matchesItem = order.items.some((i) => i.productName.toLowerCase().includes(query));
        if (!matchesNum && !matchesCust && !matchesPhone && !matchesItem) return false;
      }
      return true;
    });
  }, [ordersList, activeTab, searchTerm]);

  // Calculate selected orders totals for the drawer/modal
  const selectedOrdersData = useMemo(() => {
    const list = ordersList.filter((o) => selectedOrderIds.includes(o.id));
    const gross = list.reduce((sum, o) => sum + o.grossAmount, 0);
    const fee = list.reduce((sum, o) => sum + o.platformFee, 0);
    const net = list.reduce((sum, o) => sum + o.netAmount, 0);
    return { list, gross, fee, net, count: list.length };
  }, [ordersList, selectedOrderIds]);

  // Toggle Single Order Selection
  const toggleOrderSelection = (id: string) => {
    setSelectedOrderIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Select / Deselect All visible unpaid orders
  const toggleSelectAllUnpaid = () => {
    const unpaidVisibleIds = filteredOrders
      .filter((o) => o.settlementStatus === 'UNSETTLED')
      .map((o) => o.id);

    if (unpaidVisibleIds.every((id) => selectedOrderIds.includes(id))) {
      setSelectedOrderIds((prev) => prev.filter((id) => !unpaidVisibleIds.includes(id)));
    } else {
      setSelectedOrderIds((prev) => Array.from(new Set([...prev, ...unpaidVisibleIds])));
    }
  };

  // Open Withdrawal Modal (pre-fills with eligible balance or selected order amount)
  const handleOpenWithdrawalModal = (orderId?: string) => {
    if (orderId) {
      setSelectedOrderIds([orderId]);
      const target = ordersList.find((o) => o.id === orderId);
      if (target) {
        setWithdrawAmountInput(target.netAmount.toFixed(2));
      } else {
        setWithdrawAmountInput(eligibleWithdrawalBalance.toFixed(2));
      }
    } else if (selectedOrderIds.length > 0) {
      const selNet = ordersList
        .filter((o) => selectedOrderIds.includes(o.id))
        .reduce((sum, o) => sum + o.netAmount, 0);
      setWithdrawAmountInput((selNet > 0 ? selNet : eligibleWithdrawalBalance).toFixed(2));
    } else {
      setWithdrawAmountInput(eligibleWithdrawalBalance.toFixed(2));
    }
    setIsRequestModalOpen(true);
  };

  // Confirm and Submit Withdrawal Request to Admin
  // Swagger: POST /api/v1/vendor/withdrawals/request
  // Request Body: { "amount": 500 }
  const handleConfirmWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    const reqAmount = Number(withdrawAmountInput);

    if (isNaN(reqAmount) || reqAmount <= 0) {
      toast.error('Please enter a valid withdrawal amount (greater than ₹0).');
      return;
    }

    if (reqAmount > eligibleWithdrawalBalance && eligibleWithdrawalBalance > 0) {
      toast.error(`Requested amount (₹${reqAmount}) exceeds eligible balance (₹${eligibleWithdrawalBalance}).`);
      return;
    }

    const newReqId = `WTH-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const effectiveCount = selectedOrdersData.count > 0 ? selectedOrdersData.count : (metrics.unpaidCount || 1);
    const effectiveGross = selectedOrdersData.gross > 0 ? selectedOrdersData.gross : Number((reqAmount * 1.0526).toFixed(2));
    const effectiveFee = Number((effectiveGross - reqAmount).toFixed(2));

    const newRecord: WithdrawalRequestRecord = {
      id: newReqId,
      createdAt: new Date().toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      orderIds: selectedOrdersData.list.map((o) => o.id),
      orderNumbers: selectedOrdersData.list.map((o) => o.orderNumber),
      orderCount: effectiveCount,
      grossAmount: effectiveGross,
      platformFee: effectiveFee > 0 ? effectiveFee : 0,
      netAmount: reqAmount,
      status: 'PENDING_ADMIN_TRANSFER',
      payoutMethod: payoutForm.method,
      bankDetails: {
        bankName: bankInfo.bankName,
        accountNumber: bankInfo.accountNumber,
        ifscCode: bankInfo.ifscCode,
        accountHolderName: bankInfo.accountHolderName,
      },
      upiId: payoutForm.method === 'UPI' ? bankInfo.upiId : undefined,
      vendorNotes: payoutForm.vendorNotes || undefined,
    };

    // 1. Update orders settlement status to IN_REVIEW if orders were selected
    if (selectedOrderIds.length > 0) {
      setOrdersList((prev) =>
        prev.map((o) => {
          if (selectedOrderIds.includes(o.id)) {
            return {
              ...o,
              settlementStatus: 'IN_REVIEW',
              withdrawalRequestId: newReqId,
            };
          }
          return o;
        })
      );
    }

    // 2. Add to withdrawals history ledger
    setWithdrawalsList((prev) => [newRecord, ...prev]);

    // 3. Clear selections & close modal
    setSelectedOrderIds([]);
    setIsRequestModalOpen(false);

    // 4. Trigger backend mutation POST /api/v1/vendor/withdrawals/request
    try {
      await requestWithdrawalApi({
        amount: reqAmount,
      }).unwrap();

      toast.success(
        `Withdrawal Request ${newReqId} of ₹${reqAmount.toLocaleString('en-IN')} submitted to Admin! 🚀`
      );
      refetchBalance();
      refetchHistory();
    } catch (err: any) {
      console.warn('Backend sync note:', err);
      const errMsg = err?.data?.message || err?.data?.msg || err?.message || 'Failed to submit withdrawal request to server';
      toast.error(errMsg);
    }
  };



  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied!`);
  };

  const handlePrintSlip = (w: WithdrawalRequestRecord) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Popup blocked. Please allow popups.');
      return;
    }

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Withdrawal Settlement Voucher - ${w.id}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 35px; color: #0f172a; line-height: 1.5; }
            .header { border-bottom: 2px solid #167a46; padding-bottom: 15px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
            .logo { font-size: 26px; font-weight: 900; color: #167a46; letter-spacing: -0.5px; }
            .badge { background: #dcfce7; color: #166534; padding: 4px 12px; border-radius: 8px; font-weight: bold; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 13px; }
            th, td { border: 1px solid #cbd5e1; padding: 10px 12px; text-align: left; }
            th { background: #f8fafc; color: #334155; font-weight: bold; }
            .total-box { margin-top: 20px; padding: 15px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; }
            .footer { margin-top: 40px; font-size: 11px; color: #64748b; text-align: center; border-top: 1px dashed #cbd5e1; padding-top: 15px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="logo">ZIPPY VENDOR PARTNER</div>
              <div style="font-size: 12px; color: #64748b; font-weight: bold;">ORDER SETTLEMENT & WITHDRAWAL VOUCHER</div>
            </div>
            <div style="text-align: right;">
              <span class="badge">${w.status.replace(/_/g, ' ')}</span>
              <div style="font-size: 18px; font-weight: 900; margin-top: 6px;">${w.id}</div>
              <div style="font-size: 12px; color: #64748b;">${w.createdAt}</div>
            </div>
          </div>

          <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
            <div style="width: 48%;">
              <div style="font-size: 11px; font-weight: bold; color: #64748b; text-transform: uppercase;">Beneficiary Bank Account</div>
              <div style="font-size: 14px; font-weight: bold; margin-top: 4px;">${w.bankDetails.accountHolderName}</div>
              <div style="font-size: 13px; color: #334155;">${w.bankDetails.bankName} • A/C: ${w.bankDetails.accountNumber}</div>
              <div style="font-size: 12px; color: #475569;">IFSC: ${w.bankDetails.ifscCode} | Mode: ${w.payoutMethod}</div>
            </div>
            <div style="width: 48%;">
              <div style="font-size: 11px; font-weight: bold; color: #64748b; text-transform: uppercase;">Admin Settlement Status</div>
              <div style="font-size: 13px; margin-top: 4px;"><strong>Admin UTR / Ref:</strong> ${w.adminUtr || 'Pending Clearance'}</div>
              <div style="font-size: 13px; margin-top: 2px;"><strong>Settlement Date:</strong> ${w.settledAt || 'In Processing'}</div>
              <div style="font-size: 12px; color: #64748b; margin-top: 2px;">${w.adminRemarks || 'Awaiting manual disbursement by platform admin'}</div>
            </div>
          </div>

          <div style="margin-top: 20px;">
            <div style="font-size: 12px; font-weight: bold; color: #334155; text-transform: uppercase;">Included Delivered Orders (${w.orderCount})</div>
            <table>
              <thead>
                <tr>
                  <th>Order Reference</th>
                  <th>Order Gross Value</th>
                  <th>Admin 10% Fee</th>
                  <th>Net Vendor Payout</th>
                </tr>
              </thead>
              <tbody>
                ${w.orderNumbers
                  .map(
                    (num) => `
                  <tr>
                    <td><strong>${num}</strong></td>
                    <td>Customer paid to Admin</td>
                    <td>10% Platform Commission</td>
                    <td>Eligible for Transfer</td>
                  </tr>
                `
                  )
                  .join('')}
              </tbody>
            </table>
          </div>

          <div class="total-box">
            <div style="display: flex; justify-content: space-between; font-size: 13px; color: #334155;">
              <span>Total Orders Gross Value:</span>
              <span>₹${w.grossAmount.toLocaleString('en-IN')}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 13px; color: #b45309; margin-top: 4px;">
              <span>Admin Platform Commission (10%):</span>
              <span>- ₹${w.platformFee.toLocaleString('en-IN')}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 18px; font-weight: 900; color: #166534; margin-top: 10px; border-top: 1px dashed #86efac; padding-top: 8px;">
              <span>Net Amount Transferred to Vendor:</span>
              <span>₹${w.netAmount.toLocaleString('en-IN')}</span>
            </div>
          </div>

          <div class="footer">
            Official Zippy Vendor Settlement Document • Generated electronically from Store Dashboard
          </div>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  return (
    <div className="space-y-8 animate-in fade-in-50 duration-300 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-[#167a46] to-[#115b34] text-white shadow-md">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
                Withdrawals & Settlements
              </h1>
              <p className="text-slate-600 text-xs md:text-sm mt-0.5 font-medium">
                Customer payments are collected by Admin. Request manual bank payout for your delivered & unpaid orders.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => {
              refetchBalance();
              refetchHistory();
              toast.success('Balance and withdrawal history refreshed from server!');
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-slate-200 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 transition-colors shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isBalanceLoading || isHistoryLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          <button
            onClick={() => handleOpenWithdrawalModal()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#167a46] hover:bg-[#12653a] text-white text-xs font-black transition-all shadow-md hover:shadow-lg active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Request Withdrawal</span>
          </button>
        </div>
      </div>

      {/* API Connection / Error Banner */}
      {(isHistoryError || isBalanceError) && (
        <div className="p-4 rounded-3xl bg-amber-50/90 border border-amber-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-950">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-black text-amber-900 flex items-center gap-2">
                <span>API Connection Failed</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-200/80 text-amber-900 font-mono">
                  {((historyError || balanceError) as any)?.status || 'Network / Auth Error'}
                </span>
              </div>
              <p className="text-[11px] text-amber-800 mt-0.5">
                Backend withdrawal API is unreachable or returned an error. No dummy/mock data is displayed.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              refetchBalance();
              refetchHistory();
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black transition-all shrink-0 shadow-xs self-start sm:self-auto cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry API
          </button>
        </div>
      )}

      {/* KPI Financial Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Unsettled Balance (Ready to Withdraw) */}
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50/40 p-5 rounded-3xl border-2 border-emerald-300/80 shadow-xs flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Available for Payout
            </span>
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-black text-emerald-950 tracking-tight">
              ₹{metrics.unpaidNet.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] font-bold text-emerald-800 mt-1 flex items-center justify-between">
              <span>{metrics.unpaidCount} delivered orders ready</span>
              <button
                type="button"
                onClick={() => handleOpenWithdrawalModal()}
                className="underline hover:text-emerald-950 cursor-pointer font-black"
              >
                Withdraw All →
              </button>
            </div>
          </div>
        </div>

        {/* Card 2: Gross Delivered Sales */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Gross Delivered Sales
            </span>
            <div className="p-2 rounded-xl bg-slate-100 text-slate-700">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-black text-slate-900 tracking-tight">
              ₹{metrics.totalDeliveredGross.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] font-semibold text-slate-500 mt-1 flex items-center justify-between">
              <span>Platform Fee: {metrics.avgCommRate}%</span>
              <span className="text-emerald-700 font-bold">Vendor Share: {(100 - Number(metrics.avgCommRate)).toFixed(1)}%</span>
            </div>
          </div>
        </div>

        {/* Card 3: Platform Commission */}
        <div className="bg-gradient-to-br from-amber-50 to-orange-50/40 p-5 rounded-3xl border border-amber-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-amber-900 uppercase tracking-wider">
              Admin Commission
            </span>
            <div className="p-2 rounded-xl bg-amber-100 text-amber-800">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-black text-amber-950 tracking-tight">
              -₹{metrics.totalDeliveredFee.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] font-bold text-amber-700 mt-1">
              Platform fee @ {metrics.avgCommRate}% on sales
            </div>
          </div>
        </div>

        {/* Card 4: In-Review with Admin */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              In Review with Admin
            </span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-700">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-black text-slate-900 tracking-tight">
              ₹{metrics.inReviewNet.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] font-semibold text-slate-500 mt-1">
              {metrics.inReviewCount} orders awaiting Admin transfer
            </div>
          </div>
        </div>
      </div>

      {/* Linked Settlement Bank & Account Banner */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[#167a46] shrink-0 shadow-2xs">
            <Landmark className="w-6 h-6" />
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Payout Settlement Account
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-emerald-50 text-emerald-800 border border-emerald-200">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                Verified for Payouts
              </span>
            </div>
            {bankInfo.accountNumber ? (
              <>
                <h3 className="text-sm font-black text-slate-900">
                  {bankInfo.bankName || 'Bank Account'} • Account: <span className="font-mono">{bankInfo.accountNumber}</span>
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  {bankInfo.accountHolderName && <>Holder: <strong className="text-slate-700">{bankInfo.accountHolderName}</strong></>}
                  {bankInfo.ifscCode && <> | IFSC: <span className="font-mono text-slate-700 font-bold">{bankInfo.ifscCode}</span></>}
                  {bankInfo.upiId && <> | UPI: <span className="text-[#167a46] font-bold">{bankInfo.upiId}</span></>}
                </p>
              </>
            ) : (
              <>
                <h3 className="text-sm font-black text-slate-900">
                  {vendor.storeName ? `${vendor.storeName} Settlement Profile` : 'Registered Vendor Payout Channel'}
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  {bankInfo.upiId ? (
                    <>UPI VPA: <span className="text-[#167a46] font-bold">{bankInfo.upiId}</span></>
                  ) : (
                    'Bank transfer will be disbursed to your store verified account by Admin'
                  )}
                </p>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 self-stretch md:self-auto justify-end">
          <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-right">
            <div className="text-[10px] font-bold text-slate-400 uppercase">Settlement SLA</div>
            <div className="text-xs font-black text-slate-800">Direct NEFT/IMPS by Admin</div>
          </div>
        </div>
      </div>

      {/* 3 APIs Architecture Banner: Live Eligible Balance & Quick Payout Action */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-5 rounded-3xl border border-slate-700 shadow-md space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <Wallet className="w-4 h-4" />
              </span>
              <h2 className="text-base font-black tracking-tight text-white">
                Eligible Withdrawal Balance
              </h2>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                GET /vendor/withdrawals/balance
              </span>
            </div>
            <p className="text-xs text-slate-300 font-medium">
              This balance is eligible for immediate withdrawal to your verified bank account or UPI ID.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                refetchBalance();
                refetchHistory();
                toast.success('Eligible balance & orders refreshed from server');
              }}
              disabled={isBalanceLoading || isHistoryLoading}
              title="Refresh Balance and History"
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isBalanceLoading || isHistoryLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh Balance</span>
            </button>
          </div>
        </div>

        {/* Balance Display & Action Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center pt-2 border-t border-slate-800/80">
          {/* Big Balance Callout */}
          <div className="lg:col-span-5 bg-slate-800/60 p-4 rounded-2xl border border-slate-700/60 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Available for Withdrawal</div>
              <div className="text-2xl font-black text-emerald-400 mt-0.5">
                ₹{eligibleWithdrawalBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                Verified & ready for payout
              </div>
            </div>
            <div className="text-right">
              <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Active
              </span>
            </div>
          </div>

          {/* Breakdown Chips from GET /vendor/withdrawals/history */}
          <div className="lg:col-span-4 grid grid-cols-3 gap-2 bg-slate-800/60 p-3 rounded-2xl border border-slate-700/60">
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase">Gross Sales</div>
              <div className="text-xs font-black text-white mt-0.5">
                ₹{metrics.unpaidGross.toLocaleString('en-IN')}
              </div>
              <div className="text-[9px] text-slate-400 mt-0.5 font-bold">
                {metrics.unpaidCount} orders
              </div>
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase">Fee ({metrics.avgCommRate}%)</div>
              <div className="text-xs font-bold text-amber-400 mt-0.5">
                -₹{metrics.unpaidFee.toLocaleString('en-IN')}
              </div>
              <div className="text-[9px] text-slate-400 mt-0.5">Platform</div>
            </div>
            <div>
              <div className="text-[10px] font-bold text-emerald-400 uppercase">Net Orders</div>
              <div className="text-xs font-black text-emerald-400 mt-0.5">
                ₹{metrics.unpaidNet.toLocaleString('en-IN')}
              </div>
              <div className="text-[9px] text-emerald-300 font-bold">Payable</div>
            </div>
          </div>

          {/* Action Button */}
          <div className="lg:col-span-3 flex justify-end">
            <button
              type="button"
              onClick={() => handleOpenWithdrawalModal()}
              className="w-full py-3.5 px-4 rounded-xl bg-[#167a46] hover:bg-[#12653a] text-white text-xs font-black shadow-md transition-all flex items-center justify-center gap-2 active:scale-95"
            >
              <Send className="w-4 h-4" />
              <span>Request Payout (₹{eligibleWithdrawalBalance.toLocaleString('en-IN')})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs and Search */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs space-y-3">
        {/* Status Tabs */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 border-b border-slate-100 text-xs font-bold">
          <button
            onClick={() => setActiveTab('ALL')}
            className={`px-4 py-2.5 rounded-2xl whitespace-nowrap transition-all flex items-center gap-2 ${
              activeTab === 'ALL'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span>All Vendor Orders</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] ${
                activeTab === 'ALL' ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-800 font-black'
              }`}
            >
              {ordersList.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('UNPAID')}
            className={`px-4 py-2.5 rounded-2xl whitespace-nowrap transition-all flex items-center gap-2 ${
              activeTab === 'UNPAID'
                ? 'bg-[#167a46] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span>Pending Orders</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] ${
                activeTab === 'UNPAID' ? 'bg-emerald-900 text-white' : 'bg-emerald-100 text-emerald-900 font-black'
              }`}
            >
              {metrics.unpaidCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('IN_REVIEW')}
            className={`px-4 py-2.5 rounded-2xl whitespace-nowrap transition-all flex items-center gap-2 ${
              activeTab === 'IN_REVIEW'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span>In-Review with Admin</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] ${
                activeTab === 'IN_REVIEW' ? 'bg-amber-700 text-white' : 'bg-amber-100 text-amber-900 font-black'
              }`}
            >
              {metrics.inReviewCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('SETTLED')}
            className={`px-4 py-2.5 rounded-2xl whitespace-nowrap transition-all flex items-center gap-2 ${
              activeTab === 'SETTLED'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span>Settled / Transferred</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] ${
                activeTab === 'SETTLED' ? 'bg-blue-800 text-white' : 'bg-blue-100 text-blue-900 font-black'
              }`}
            >
              {metrics.settledCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('LEDGER')}
            className={`px-4 py-2.5 rounded-2xl whitespace-nowrap transition-all flex items-center gap-2 ${
              activeTab === 'LEDGER'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span>Withdrawal Requests Ledger</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] ${
                activeTab === 'LEDGER' ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-800 font-black'
              }`}
            >
              {withdrawalsList.length}
            </span>
          </button>
        </div>

        {/* Search Bar & Quick Multi-Select */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by Order ID (ZPY-xxx), Customer name, Phone, or Product..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-xs font-semibold rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#167a46] focus:bg-white transition-all text-slate-900"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

        </div>
      </div>

      {/* Main Content Sections Based on Active Tab */}
      {activeTab === 'LEDGER' ? (
        /* TAB 4: WITHDRAWAL REQUESTS LEDGER */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FileText className="w-5 h-5 text-[#167a46]" />
              <h2 className="text-lg font-black text-slate-900">Withdrawal Requests to Admin</h2>
            </div>
            <span className="text-xs text-slate-500 font-semibold">
              Showing {withdrawalsList.length} settlement requests
            </span>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 uppercase font-black tracking-wider">
                    <th className="p-4">Request ID</th>
                    <th className="p-4">Period / Date</th>
                    <th className="p-4">Orders Covered</th>
                    <th className="p-4">Gross Sales</th>
                    <th className="p-4">10% Platform Fee</th>
                    <th className="p-4">Net Payout</th>
                    <th className="p-4">Settlement Status</th>
                    <th className="p-4">Admin UTR / Ref</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isHistoryLoading ? (
                    <tr>
                      <td colSpan={9} className="p-12 text-center text-slate-400 space-y-2">
                        <RefreshCw className="w-8 h-8 mx-auto text-[#167a46] animate-spin" />
                        <p className="text-sm font-bold text-slate-700">Loading withdrawal history from server...</p>
                        <p className="text-xs text-slate-400 font-mono">GET /api/v1/vendor/withdrawals/history</p>
                      </td>
                    </tr>
                  ) : isHistoryError ? (
                    <tr>
                      <td colSpan={9} className="p-12 text-center text-slate-500 space-y-3">
                        <AlertCircle className="w-10 h-10 mx-auto text-amber-500" />
                        <div className="space-y-1">
                          <p className="text-sm font-bold text-slate-800">Failed to load withdrawal history</p>
                          <p className="text-xs text-slate-500">
                            Server endpoint returned an error ({((historyError as any)?.status || 'API Error')}). No mock data is shown.
                          </p>
                        </div>
                        <button
                          onClick={() => refetchHistory()}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#167a46] hover:bg-[#12653a] text-white text-xs font-bold transition shadow-xs cursor-pointer"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          Retry Fetch History
                        </button>
                      </td>
                    </tr>
                  ) : withdrawalsList.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-12 text-center text-slate-400 space-y-2">
                        <Wallet className="w-10 h-10 mx-auto text-slate-300" />
                        <p className="text-sm font-bold text-slate-700">No withdrawal requests submitted yet</p>
                        <p className="text-xs text-slate-500">
                          When you request payout for delivered orders, your requests will appear here.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    withdrawalsList.map((req) => (
                      <tr key={req.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-black text-slate-900">{req.id}</span>
                            <button
                              onClick={() => copyToClipboard(req.id, 'Request ID')}
                              className="text-slate-400 hover:text-slate-600 p-0.5"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                        <td className="p-4 whitespace-nowrap">
                          <div className="text-slate-700 font-bold">{req.createdAt}</div>
                          {req.startDate && req.endDate && (
                            <div className="text-[10px] text-emerald-800 font-mono font-bold mt-0.5 flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-emerald-600 shrink-0" />
                              <span>{req.startDate} → {req.endDate}</span>
                            </div>
                          )}
                        </td>
                        <td className="p-4">
                          <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-extrabold">
                            {req.orderCount} Orders
                          </span>
                        </td>
                        <td className="p-4 font-bold text-slate-700">₹{req.grossAmount.toLocaleString('en-IN')}</td>
                        <td className="p-4 font-bold text-amber-700">-₹{req.platformFee.toLocaleString('en-IN')}</td>
                        <td className="p-4 font-black text-[#167a46] text-sm">
                          ₹{req.netAmount.toLocaleString('en-IN')}
                        </td>
                        <td className="p-4">
                          {req.status === 'TRANSFERRED_TO_BANK' ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              Transferred to Bank
                            </span>
                          ) : req.status === 'REJECTED' ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase bg-rose-100 text-rose-800 border border-rose-300">
                              <X className="w-3.5 h-3.5 text-rose-600" />
                              Declined by Admin
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase bg-amber-100 text-amber-900 border border-amber-300">
                              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                              Pending Admin Transfer
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          {req.adminUtr ? (
                            <div className="font-mono text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[11px]">
                              {req.adminUtr}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Processing...</span>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setSelectedLedgerItem(req);
                                setIsLedgerDetailOpen(true);
                              }}
                              className="p-1.5 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handlePrintSlip(req)}
                              className="p-1.5 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                              title="Print Settlement Voucher"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* TABS 1, 2, 3: ORDER LEVEL SETTLEMENT TABLE */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ShoppingBag className="w-5 h-5 text-[#167a46]" />
              <h2 className="text-lg font-black text-slate-900">
                {activeTab === 'UNPAID'
                  ? 'Delivered Orders Pending Payment from Admin'
                  : activeTab === 'IN_REVIEW'
                  ? 'Orders in Admin Settlement Review'
                  : 'Settled & Paid Orders'}
              </h2>
            </div>
            <span className="text-xs text-slate-500 font-semibold">
              {filteredOrders.length} orders listed
            </span>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 uppercase font-black tracking-wider text-[11px]">
                    <th className="p-4">Order Reference & Date</th>
                    <th className="p-4">Products Ordered</th>
                    <th className="p-4">Customer Paid (Gross)</th>
                    <th className="p-4">Platform Fee ({metrics.avgCommRate}%)</th>
                    <th className="p-4">Net Vendor Payout</th>
                    <th className="p-4">Settlement Status</th>
                    <th className="p-4 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isHistoryLoading ? (
                    <tr>
                      <td colSpan={7} className="p-12 text-center text-slate-400 space-y-2">
                        <RefreshCw className="w-8 h-8 mx-auto text-[#167a46] animate-spin" />
                        <p className="text-sm font-bold text-slate-700">Loading orders from server...</p>
                        <p className="text-xs text-slate-400 font-mono">GET /api/v1/vendor/withdrawals/history</p>
                      </td>
                    </tr>
                  ) : isHistoryError ? (
                    <tr>
                      <td colSpan={7} className="p-12 text-center text-slate-500 space-y-3">
                        <AlertCircle className="w-10 h-10 mx-auto text-amber-500" />
                        <div className="space-y-1">
                          <p className="text-sm font-bold text-slate-800">Failed to load orders from server</p>
                          <p className="text-xs text-slate-500 max-w-md mx-auto">
                            Server endpoint /vendor/withdrawals/history failed ({((historyError as any)?.status || 'API Error')}). No mock data is shown.
                          </p>
                        </div>
                        <button
                          onClick={() => refetchHistory()}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#167a46] hover:bg-[#12653a] text-white text-xs font-bold transition shadow-xs cursor-pointer"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          Retry Fetch Orders
                        </button>
                      </td>
                    </tr>
                  ) : filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-12 text-center text-slate-400 space-y-2">
                        <ShoppingBag className="w-10 h-10 mx-auto text-slate-300" />
                        <p className="text-sm font-bold text-slate-700">No orders found in this section</p>
                        <p className="text-xs text-slate-500">
                          {activeTab === 'UNPAID'
                            ? 'All delivered orders have been requested or cleared by Admin!'
                            : 'No orders match the selected filters.'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((order) => {
                      return (
                        <tr
                          key={order.id}
                          className="hover:bg-slate-50/70 transition-colors"
                        >
                          {/* Order Reference & Date */}
                          <td className="p-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono font-black text-slate-900 text-xs tracking-tight">
                                  {order.orderNumber}
                                </span>
                                <button
                                  onClick={() => copyToClipboard(order.orderNumber, 'Order ID')}
                                  className="text-slate-400 hover:text-slate-700 p-0.5 rounded transition-colors"
                                  title="Copy Order ID"
                                >
                                  <Copy className="w-3 h-3" />
                                </button>
                              </div>
                              <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                                <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                                <span>{order.createdAt}</span>
                              </div>
                              <div className="text-[10px] font-bold text-slate-400 uppercase">
                                {order.paymentMethod}
                              </div>
                            </div>
                          </td>

                          {/* Products Ordered */}
                          <td className="p-4">
                            <div className="flex items-center gap-3 max-w-sm">
                              <ProductImageWithFallback
                                src={order.items[0]?.image}
                                alt={order.items[0]?.productName || 'Product'}
                                className="w-11 h-11 rounded-xl object-cover border border-slate-200 shrink-0 shadow-2xs"
                              />
                              <div className="min-w-0 space-y-0.5">
                                <p
                                  className="font-bold text-slate-900 truncate text-xs"
                                  title={order.items[0]?.productName}
                                >
                                  {order.items[0]?.productName}
                                </p>
                                <div className="flex items-center gap-2 flex-wrap text-[11px]">
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold">
                                    Qty: {order.items[0]?.quantity || 1} × ₹{(order.items[0]?.price || 0).toFixed(2)}
                                  </span>
                                  {order.items.length > 1 && (
                                    <span className="text-[10px] text-emerald-700 font-bold">
                                      +{order.items.length - 1} more
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Customer Paid (Gross) */}
                          <td className="p-4 whitespace-nowrap">
                            <div className="font-extrabold text-slate-900 text-xs">
                              ₹{order.grossAmount.toFixed(2)}
                            </div>
                            <div className="text-[10px] text-slate-400 font-medium">Customer Paid</div>
                          </td>

                          {/* Platform Commission (5%) */}
                          <td className="p-4 whitespace-nowrap">
                            <div className="font-bold text-amber-700 text-xs">
                              -₹{order.platformFee.toFixed(2)}
                            </div>
                            <div className="inline-block mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-black bg-amber-50 text-amber-800 border border-amber-200">
                              {order.commissionRate}% fee
                            </div>
                          </td>

                          {/* Net Vendor Payout */}
                          <td className="p-4 whitespace-nowrap">
                            <span className="font-black text-[#167a46] text-sm bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200 inline-block shadow-2xs">
                              ₹{order.netAmount.toFixed(2)}
                            </span>
                            <div className="text-[10px] text-emerald-800 font-semibold mt-0.5">Net Payable</div>
                          </td>

                          {/* Settlement Status */}
                          <td className="p-4 whitespace-nowrap">
                            {order.settlementStatus === 'UNSETTLED' ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase bg-amber-50 text-amber-800 border border-amber-200">
                                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                                Pending
                              </span>
                            ) : order.settlementStatus === 'IN_REVIEW' ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase bg-blue-50 text-blue-800 border border-blue-200">
                                <Clock className="w-3.5 h-3.5 text-blue-600" />
                                In Review
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase bg-emerald-50 text-emerald-800 border border-emerald-200">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                Settled
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="p-4 text-right whitespace-nowrap">
                            <button
                              onClick={() => setSelectedOrderDetail(order)}
                              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all shadow-2xs inline-flex items-center gap-1.5"
                              title="View Order Details"
                            >
                              <Eye className="w-3.5 h-3.5 text-slate-500" />
                              <span>View</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: SUBMIT WITHDRAWAL REQUEST TO ADMIN (Swagger POST /api/v1/vendor/withdrawals/request: { "amount": 500 }) */}
      {isRequestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white w-full max-w-lg max-h-[92vh] sm:max-h-[88vh] rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-emerald-50/60 shrink-0">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-[#167a46] text-white shadow-xs">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Request Payout from Admin</h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Submit withdrawal request directly to Admin for clearance
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsRequestModalOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body with internal scrolling */}
            <form onSubmit={handleConfirmWithdrawal} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
                {/* Eligible Balance Indicator */}
                <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-xs flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Eligible Balance Available</div>
                    <div className="text-base font-black text-[#167a46]">₹{eligibleWithdrawalBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                  </div>
                  <span className="text-[10px] font-black uppercase text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-300">
                    Ready to Withdraw
                  </span>
                </div>

                {/* Amount Input (Swagger POST /vendor/withdrawals/request body: { "amount": 500 }) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700">Withdrawal Amount (₹)</label>
                    <span className="text-[11px] text-slate-500 font-medium">Eligible: ₹{eligibleWithdrawalBalance.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">₹</span>
                    <input
                      type="number"
                      step="0.01"
                      min="1"
                      max={eligibleWithdrawalBalance || undefined}
                      required
                      value={withdrawAmountInput}
                      onChange={(e) => setWithdrawAmountInput(e.target.value)}
                      placeholder="Enter amount (e.g. 500)"
                      className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-black text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#167a46]"
                    />
                  </div>
                  {/* Quick Presets */}
                  <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Presets:</span>
                    {[500, 1000].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setWithdrawAmountInput(String(preset))}
                        className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                      >
                        ₹{preset}
                      </button>
                    ))}
                    {eligibleWithdrawalBalance > 0 && (
                      <button
                        type="button"
                        onClick={() => setWithdrawAmountInput(String(eligibleWithdrawalBalance))}
                        className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-100 hover:bg-emerald-200 text-[#167a46] border border-emerald-200 transition-colors cursor-pointer"
                      >
                        Full Balance (₹{eligibleWithdrawalBalance.toLocaleString('en-IN')})
                      </button>
                    )}
                  </div>
                </div>

                {/* Registered Payout Channel Info */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                    <span>Settlement Destination Account</span>
                    <span className="text-emerald-700 font-extrabold flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-[#167a46]" />
                      Verified
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    <div className="font-black text-slate-900 flex items-center gap-1.5">
                      <Landmark className="w-3.5 h-3.5 text-[#167a46]" />
                      <span>{bankInfo.bankName || 'Registered Bank'}</span>
                    </div>
                    {bankInfo.accountNumber ? (
                      <>
                        <div className="text-slate-600 font-mono text-[11px]">A/C: {bankInfo.accountNumber}</div>
                        <div className="text-slate-500 text-[10px]">IFSC: {bankInfo.ifscCode} | {bankInfo.accountHolderName}</div>
                      </>
                    ) : (
                      <div className="text-slate-500 text-[11px]">Direct transfer to store partner registered account</div>
                    )}
                  </div>
                </div>

                {/* Confirmation notice */}
                <div className="p-3 rounded-2xl bg-emerald-50/60 border border-emerald-200 text-[11px] text-emerald-900 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#167a46] shrink-0 mt-0.5" />
                  <p>
                    On submit, a payout request of <strong>₹{Number(withdrawAmountInput || 0).toLocaleString('en-IN')}</strong> will be sent to Admin for transfer.
                  </p>
                </div>
              </div>

              {/* Modal Footer - FIXED & ALWAYS VISIBLE */}
              <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsRequestModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingWithdrawal}
                  className="px-5 py-2.5 rounded-xl bg-[#167a46] hover:bg-[#12653a] text-white text-xs font-black shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 disabled:opacity-50 active:scale-95 cursor-pointer"
                >
                  {isSubmittingWithdrawal ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Submitting Request...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>
                        Request Payout of ₹{Number(withdrawAmountInput || 0).toLocaleString('en-IN')}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: WITHDRAWAL REQUEST DETAIL DRAWER */}
      {isLedgerDetailOpen && selectedLedgerItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-xl max-h-[90vh] rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-2xl bg-white border border-slate-200 text-[#167a46] shadow-xs">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-slate-900">{selectedLedgerItem.id}</h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                      {selectedLedgerItem.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Submitted: {selectedLedgerItem.createdAt}
                    {selectedLedgerItem.startDate && selectedLedgerItem.endDate && (
                      <span className="ml-1 text-emerald-800 font-bold font-mono">
                        • Period: {selectedLedgerItem.startDate} to {selectedLedgerItem.endDate}
                      </span>
                    )}
                    {' '}• Mode: {selectedLedgerItem.payoutMethod}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsLedgerDetailOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200/50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs">
              {/* Financial Summary */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex justify-between items-center text-slate-600">
                  <span>Gross Orders Value:</span>
                  <span className="font-extrabold text-slate-900">
                    ₹{selectedLedgerItem.grossAmount.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between items-center text-amber-800">
                  <span>10% Platform Commission:</span>
                  <span className="font-bold">- ₹{selectedLedgerItem.platformFee.toLocaleString('en-IN')}</span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-sm font-black text-slate-900">
                  <span>Net Transferred to Vendor:</span>
                  <span className="text-emerald-800 text-base">
                    ₹{selectedLedgerItem.netAmount.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Bank & Settlement Clearance */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-white border border-slate-200 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Beneficiary Bank
                  </span>
                  <div className="font-black text-slate-900">{selectedLedgerItem.bankDetails.bankName}</div>
                  <div className="text-slate-600 font-mono">A/C: {selectedLedgerItem.bankDetails.accountNumber}</div>
                  <div className="text-slate-500">IFSC: {selectedLedgerItem.bankDetails.ifscCode}</div>
                </div>

                <div className="p-3.5 rounded-2xl bg-white border border-slate-200 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Admin Clearance Record
                  </span>
                  <div>
                    <strong>UTR / Ref:</strong>{' '}
                    <span className="font-mono text-emerald-800 font-bold">
                      {selectedLedgerItem.adminUtr || 'Pending clearance'}
                    </span>
                  </div>
                  <div>
                    <strong>Cleared Date:</strong> {selectedLedgerItem.settledAt || 'In Process'}
                  </div>
                  <div className="text-slate-500 italic mt-1 text-[11px]">
                    "{selectedLedgerItem.adminRemarks || selectedLedgerItem.vendorNotes || 'Standard transfer'}"
                  </div>
                </div>
              </div>

              {/* Covered Orders list */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Delivered Orders Included in this Payout ({selectedLedgerItem.orderCount})
                </span>
                <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 overflow-hidden bg-white">
                  {selectedLedgerItem.orderNumbers.map((num, idx) => (
                    <div key={idx} className="p-3 flex items-center justify-between hover:bg-slate-50">
                      <div className="flex items-center space-x-2">
                        <ShoppingBag className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-mono font-bold text-slate-800">{num}</span>
                      </div>
                      <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        Delivered & Verified
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={() => handlePrintSlip(selectedLedgerItem)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5 text-slate-500" />
                Print Voucher
              </button>
              <button
                onClick={() => setIsLedgerDetailOpen(false)}
                className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: ORDER DETAIL VIEW */}
      {selectedOrderDetail && (
        <OrderDetailModal
          order={selectedOrderDetail}
          onClose={() => setSelectedOrderDetail(null)}
          onWithdraw={(id) => handleOpenWithdrawalModal(id)}
        />
      )}
    </div>
  );
}
