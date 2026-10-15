'use client';

import React from 'react';
import Link from 'next/link';
import {
  DollarSign,
  TrendingUp,
  Percent,
  ShoppingBag,
  PackageX,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Zap,
} from 'lucide-react';
import { useVendorStore } from '@/store/useVendorStore';
import { useAppSelector } from '@/store';
import { useGetOrdersQuery, useGetProductsQuery, useGetStoreRequestQuery } from '@/store/api/vendorApi';

export default function VendorDashboard() {
  const { user: authUser } = useAppSelector((state) => state.auth);
  const { vendor } = useVendorStore();

  const token = typeof window !== 'undefined' ? localStorage.getItem('zippy_vendor_token') : null;
  const savedStatus = typeof window !== 'undefined' ? localStorage.getItem('zippy_store_status') : null;
  const savedStoreName = typeof window !== 'undefined' ? localStorage.getItem('zippy_store_name') : null;

  const { data: ordersApiData } = useGetOrdersQuery(undefined, { skip: !token });
  const { data: productsApiData } = useGetProductsQuery(undefined, { skip: !token });
  const { data: storeRequestData } = useGetStoreRequestQuery(undefined, {
    skip: !token,
    refetchOnMountOrArgChange: true,
  });

  const requestObj = (storeRequestData as any)?.data || storeRequestData;
  const rawStatus = requestObj?.status || requestObj?.approvalStatus || requestObj?.storeRequest?.status;
  const currentApprovalStatus = rawStatus
    ? String(rawStatus).toUpperCase()
    : savedStatus
    ? String(savedStatus).toUpperCase()
    : (vendor.approvalStatus || 'NOT_REGISTERED');

  const storeName =
    requestObj?.storeName ||
    requestObj?.store_name ||
    requestObj?.storeRequest?.storeName ||
    requestObj?.storeRequest?.store_name ||
    savedStoreName ||
    vendor.storeName ||
    (authUser?.name ? `${authUser.name}'s Store` : 'Your Store');

  const ownerName = authUser?.name || vendor.ownerName || 'Vendor Partner';

  // Extract real orders
  const realOrders: any[] = (() => {
    if (!ordersApiData) return [];
    let list = Array.isArray(ordersApiData) ? ordersApiData : (ordersApiData as any).data || (ordersApiData as any).orders || (ordersApiData as any).items || [];
    if (!Array.isArray(list) && Array.isArray((list as any)?.orders)) list = (list as any).orders;
    if (!Array.isArray(list) && Array.isArray((list as any)?.items)) list = (list as any).items;
    if (!Array.isArray(list)) return [];
    return list.map((o: any, idx: number) => ({
      id: String(o.order_id || o.id || o._id || `order-${idx}`),
      orderNumber: String(o.order_number || o.orderNumber || `#ZP-${String(o.id || idx).slice(0, 6)}`),
      customerName: o.customer?.name || o.customer?.full_name || o.customer_name || 'Customer',
      address: typeof o.delivery_address === 'string' ? o.delivery_address : o.delivery_address?.address_line1 || 'Delivery Address',
      totalAmount: Number(o.billing_details?.total_amount ?? o.total_amount ?? o.grand_total ?? 0),
      status: String(o.status || o.order_status || 'PENDING').toUpperCase(),
      createdAt: o.created_at ? new Date(o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now',
      items: Array.isArray(o.items) ? o.items.map((i: any) => ({
        productName: i.product_name || i.product?.name || i.name || 'Item',
      })) : [],
    }));
  })();

  // Extract real products
  const realProducts: any[] = (() => {
    if (!productsApiData) return [];
    let list = Array.isArray(productsApiData) ? productsApiData : (productsApiData as any).data || (productsApiData as any).products || (productsApiData as any).items || [];
    if (!Array.isArray(list) && Array.isArray((list as any)?.products)) list = (list as any).products;
    if (!Array.isArray(list) && Array.isArray((list as any)?.items)) list = (list as any).items;
    if (!Array.isArray(list)) return [];
    return list.map((p: any, idx: number) => {
      const primaryImgObj = Array.isArray(p.images) && p.images.length > 0 ? (p.images.find((img: any) => img?.is_primary) || p.images[0]) : null;
      return {
        id: String(p.id || p._id || `prod-${idx}`),
        name: p.name || 'Product',
        stock: p.stock ?? p.stock_quantity ?? 0,
        isAvailable: p.status === 'ACTIVE' || p.isAvailable !== false,
        image: primaryImgObj?.image_url || p.image_url || p.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&q=80',
      };
    });
  })();

  // Real Calculations based on live data
  const completedOrders = realOrders.filter((o) => o.status === 'COMPLETED' || o.status === 'DELIVERED');
  const grossSales = completedOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const adminCommission = grossSales * (vendor.commissionRate || 0.1);
  const netEarnings = grossSales - adminCommission;
  const activeOrdersCount = realOrders.filter((o) => o.status !== 'COMPLETED' && o.status !== 'DELIVERED' && o.status !== 'CANCELLED' && o.status !== 'REJECTED').length;

  const outOfStockProducts = realProducts.filter((p) => !p.isAvailable || p.stock === 0);
  const recentOrders = realOrders.slice(0, 5);

  return (
    <div className="space-y-8 animate-in fade-in-50 duration-300">
      {/* Welcome Header Banner */}
      <div className="white-card p-6 md:p-8 relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border-l-4 border-l-[#167a46] shadow-sm">
        <div className="space-y-1.5 z-10 max-w-xl">
          <div className="inline-flex items-center space-x-2 text-xs font-bold text-[#167a46] uppercase tracking-wider bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            <Zap className="w-3.5 h-3.5 fill-[#167a46]" />
            <span>Zippy 10-Minute Delivery Partner</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
            Welcome back, {ownerName}! 👋
          </h1>
          <p className="text-slate-600 text-sm">
            Here is your real-time store performance overview for <strong>{storeName}</strong>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 z-10">
          <Link
            href="/products"
            className="px-4 py-2.5 rounded-xl bg-[#167a46] hover:bg-[#12653a] text-white font-bold text-xs transition-all flex items-center space-x-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add Product</span>
          </Link>
          <Link
            href="/orders"
            className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 font-bold text-xs transition-all flex items-center space-x-1.5"
          >
            <ShoppingBag className="w-4 h-4 text-[#167a46]" />
            <span>View Orders ({realOrders.length})</span>
          </Link>
        </div>
      </div>

      {/* Store Application / Status Banner */}
      {currentApprovalStatus !== 'APPROVED' && (
        <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-950 text-xs shadow-xs">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping shrink-0" />
            <span>
              <strong>Store Status: {currentApprovalStatus === 'NOT_REGISTERED' ? 'Registration Required' : currentApprovalStatus}</strong> — {currentApprovalStatus === 'NOT_REGISTERED' ? 'Complete your store onboarding application to start selling on Zippy.' : 'Your store request is currently under review by Zippy Admin.'}
            </span>
          </div>
          <Link
            href="/store-request"
            className="px-4 py-2 bg-amber-900 text-white rounded-xl text-xs font-bold hover:bg-black transition-all shrink-0"
          >
            {currentApprovalStatus === 'NOT_REGISTERED' ? 'Complete Store Onboarding 🚀' : 'Track Application'}
          </Link>
        </div>
      )}

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Total Sales */}
        <div className="white-card p-5 space-y-3 relative overflow-hidden group hover:border-[#167a46] transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Gross Sales</span>
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[#167a46]">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-slate-900 tracking-tight">₹{grossSales.toLocaleString('en-IN')}</div>
            <p className="text-[11px] text-slate-500 font-medium mt-1">Total customer order volume</p>
          </div>
        </div>

        {/* Card 2: Admin 10% Commission */}
        <div className="white-card p-5 space-y-3 relative overflow-hidden group hover:border-amber-400 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Admin 10% Commission</span>
            <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
              <Percent className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-amber-600 tracking-tight">₹{adminCommission.toLocaleString('en-IN')}</div>
            <p className="text-[11px] text-slate-500 font-medium mt-1">Platform service fee (10%)</p>
          </div>
        </div>

        {/* Card 3: Net Vendor Earnings */}
        <div className="white-card p-5 space-y-3 relative overflow-hidden group hover:border-[#167a46] transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Net Vendor Earnings</span>
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 border border-emerald-300 flex items-center justify-center text-[#167a46]">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-[#167a46] tracking-tight">₹{netEarnings.toLocaleString('en-IN')}</div>
            <p className="text-[11px] text-slate-500 font-medium mt-1">Available for payout ledger</p>
          </div>
        </div>

        {/* Card 4: Active Orders */}
        <div className="white-card p-5 space-y-3 relative overflow-hidden group hover:border-sky-400 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Live Orders</span>
            <div className="w-10 h-10 rounded-2xl bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-600">
              <ShoppingBag className="w-5 h-5 animate-pulse" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-slate-900 tracking-tight">{activeOrdersCount} Orders</div>
            <p className="text-[11px] text-slate-500 font-medium mt-1">Pending packing & pickup</p>
          </div>
        </div>
      </div>

      {/* Main Content Grid: Recent Orders & Stock Warnings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Orders Table Stream (2 Columns) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ShoppingBag className="w-5 h-5 text-[#167a46]" />
              <h2 className="text-lg font-bold text-slate-900">Live Orders Processing Stream</h2>
            </div>
            <Link
              href="/orders"
              className="text-xs font-bold text-[#167a46] hover:underline flex items-center space-x-1"
            >
              <span>View All Stream</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="white-card overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 text-xs uppercase font-bold">
                    <th className="p-4">Order ID</th>
                    <th className="p-4">Customer</th>
                    <th className="p-4">Items</th>
                    <th className="p-4">Total</th>
                    <th className="p-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {recentOrders.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-10 text-center text-slate-400">
                        <ShoppingBag className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        <p className="text-xs font-semibold text-slate-600">No live orders yet</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">When customers place orders at your store, they will appear here in real-time.</p>
                      </td>
                    </tr>
                  ) : (
                    recentOrders.map((ord) => (
                      <tr key={ord.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4 font-mono font-bold text-slate-900">
                          {ord.orderNumber}
                          <div className="text-[11px] text-slate-500 font-normal">{ord.createdAt}</div>
                        </td>
                        <td className="p-4">
                          <div className="font-semibold text-slate-900">{ord.customerName}</div>
                          <div className="text-xs text-slate-500 truncate max-w-[140px]">{ord.address}</div>
                        </td>
                        <td className="p-4">
                          <span className="text-xs font-medium text-slate-700">
                            {ord.items.map((i: any) => i.productName).join(', ')}
                          </span>
                        </td>
                        <td className="p-4 font-bold text-[#167a46]">₹{ord.totalAmount}</td>
                        <td className="p-4">
                          {ord.status === 'NEW' || ord.status === 'PENDING' ? (
                            <span className="px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold inline-flex items-center space-x-1">
                              <Clock className="w-3 h-3" />
                              <span>PENDING</span>
                            </span>
                          ) : ord.status === 'PACKING' || ord.status === 'PREPARING' ? (
                            <span className="px-2.5 py-1 rounded-full bg-sky-50 border border-sky-200 text-sky-800 text-xs font-bold inline-flex items-center space-x-1">
                              <PackageX className="w-3 h-3" />
                              <span>PACKING</span>
                            </span>
                          ) : ord.status === 'READY_FOR_PICKUP' ? (
                            <span className="px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs font-bold inline-flex items-center space-x-1">
                              <Zap className="w-3 h-3" />
                              <span>READY</span>
                            </span>
                          ) : ord.status === 'COMPLETED' || ord.status === 'DELIVERED' ? (
                            <span className="px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold inline-flex items-center space-x-1">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>COMPLETED</span>
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold">
                              {ord.status}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Out-of-Stock Warnings Widget (1 Column) */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-amber-500 animate-pulse" />
            <h2 className="text-lg font-bold text-slate-900">Stock Warnings & Alerts</h2>
          </div>

          <div className="white-card p-5 space-y-4 shadow-sm">
            <div className="text-xs font-semibold text-slate-500 border-b border-slate-200 pb-3 flex justify-between">
              <span>Low / Out-of-Stock Items ({outOfStockProducts.length})</span>
              <Link href="/products" className="text-[#167a46] font-bold hover:underline">
                Manage All
              </Link>
            </div>

            {realProducts.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-xs text-slate-500 font-medium">No products have been added to your store yet.</p>
              </div>
            ) : outOfStockProducts.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-4">All inventory items are well-stocked! 🎉</p>
            ) : (
              <div className="space-y-3">
                {outOfStockProducts.map((prod) => (
                  <div
                    key={prod.id}
                    className="p-3 rounded-2xl bg-amber-50/50 border border-amber-200 flex items-center space-x-3"
                  >
                    <img
                      src={prod.image}
                      alt={prod.name}
                      className="w-12 h-12 rounded-xl object-cover border border-slate-200"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-slate-900 truncate">{prod.name}</h4>
                      <p className="text-[11px] text-amber-700 font-semibold mt-0.5">
                        {prod.stock === 0 ? 'Out of Stock (0 remaining)' : `Low Stock: ${prod.stock} units remaining`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <Link
              href="/products"
              className="w-full py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold hover:text-[#167a46] hover:border-[#167a46] transition-all flex items-center justify-center space-x-1.5"
            >
              <Plus className="w-3.5 h-3.5 text-[#167a46]" />
              <span>Update Product Inventory</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
