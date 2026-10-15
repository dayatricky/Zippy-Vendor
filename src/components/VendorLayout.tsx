'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Grid,
  Package,
  ShoppingBag,
  Wallet,
  Settings,
  Power,
  AlertTriangle,
  Menu,
  X,
  Bell,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Store,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { useVendorStore } from '@/store/useVendorStore';
import { useAppDispatch, useAppSelector } from '@/store';
import { initializeAuth, logoutVendorThunk } from '@/store/slices/authSlice';
import StoreRegistrationModal from '@/components/StoreRegistrationModal';
import { useGetStoreRequestQuery, vendorApi } from '@/store/api/vendorApi';
import { useVendorSocket } from '@/hooks/useVendorSocket';
import { disconnectVendorSocket } from '@/services/vendorSocket';
import { Toaster } from 'react-hot-toast';

interface VendorLayoutProps {
  children: React.ReactNode;
}

export default function VendorLayout({ children }: VendorLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { user: authUser } = useAppSelector((state) => state.auth);
  const { vendor, toggleStoreOpen, loginAsApproved, loginAsPending, setStoreModalOpen } = useVendorStore();
  const { notification, clearNotification } = useVendorSocket();

  const isAuthPage = pathname === '/login' || pathname === '/register';
  const token = typeof window !== 'undefined' ? localStorage.getItem('zippy_vendor_token') : null;
  const savedStatus = typeof window !== 'undefined' ? localStorage.getItem('zippy_store_status') : null;
  const savedStoreName = typeof window !== 'undefined' ? localStorage.getItem('zippy_store_name') : null;

  const { data: storeRequestData, isLoading: isStoreLoading } = useGetStoreRequestQuery(undefined, {
    skip: isAuthPage || !token,
    refetchOnMountOrArgChange: true,
  });
  const requestObj = (storeRequestData as any)?.data || storeRequestData;
  const rawStatus =
    requestObj?.status ||
    requestObj?.approvalStatus ||
    requestObj?.storeRequest?.status;

  // Persist store status & name whenever valid API response arrives
  useEffect(() => {
    if (rawStatus && typeof window !== 'undefined') {
      const norm = String(rawStatus).toUpperCase();
      localStorage.setItem('zippy_store_status', norm);
      const name =
        requestObj?.storeName ||
        requestObj?.store_name ||
        requestObj?.storeRequest?.storeName ||
        requestObj?.storeRequest?.store_name;
      if (name) {
        localStorage.setItem('zippy_store_name', name);
      }
    }
  }, [rawStatus, requestObj]);

  const currentApprovalStatus = rawStatus
    ? String(rawStatus).toUpperCase()
    : savedStatus
    ? String(savedStatus).toUpperCase()
    : (vendor.approvalStatus || 'NOT_REGISTERED');

  const currentStoreName =
    requestObj?.storeName ||
    requestObj?.store_name ||
    requestObj?.storeRequest?.storeName ||
    requestObj?.storeRequest?.store_name ||
    savedStoreName ||
    vendor.storeName ||
    '';

  const currentStoreCategory =
    requestObj?.primary_category ||
    requestObj?.category ||
    vendor.category ||
    'Grocery & Daily Needs';

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    dispatch(initializeAuth());
    if (typeof window !== 'undefined') {
      const storedToken = localStorage.getItem('zippy_vendor_token');
      if (!isAuthPage && !storedToken) {
        setIsAuthenticated(false);
        router.replace('/login');
      } else {
        setIsAuthenticated(true);
      }
    }
  }, [dispatch, isAuthPage, pathname, router]);

  // Sync Zustand store status with real backend store status
  useEffect(() => {
    if (currentApprovalStatus === 'APPROVED' && vendor.approvalStatus !== 'APPROVED') {
      loginAsApproved();
    } else if (
      (currentApprovalStatus === 'PENDING' || currentApprovalStatus === 'PENDING_APPROVAL' || currentApprovalStatus === 'UNDER_REVIEW') &&
      vendor.approvalStatus !== 'PENDING_APPROVAL'
    ) {
      loginAsPending();
    }
  }, [currentApprovalStatus, vendor.approvalStatus, loginAsApproved, loginAsPending]);

  // Derive real logged in user details
  const ownerName = authUser?.name || vendor.ownerName || 'Vendor Partner';
  const ownerEmail = authUser?.email || vendor.email || 'vendor@zippy.com';

  const handleLogout = async () => {
    disconnectVendorSocket();
    if (typeof window !== 'undefined') {
      localStorage.removeItem('zippy_vendor_token');
      localStorage.removeItem('zippy_vendor_refresh_token');
      localStorage.removeItem('zippy_vendor_user');
      localStorage.removeItem('zippy_store_status');
      localStorage.removeItem('zippy_store_name');
    }
    dispatch(vendorApi.util.resetApiState());
    await dispatch(logoutVendorThunk());
    window.location.href = '/login';
  };

  // If on login or register, bypass full dashboard sidebar layout shell for auth-first feel
  if (pathname === '/login' || pathname === '/register') {
    return (
      <>
        <Toaster position="top-right" />
        {children}
      </>
    );
  }

  // If user is not authenticated or auth state is checking, do not render dashboard
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-4 border-[#167a46] border-t-transparent rounded-full animate-spin" />
        <p className="text-white text-xs font-bold tracking-wider uppercase">Redirecting to Login...</p>
      </div>
    );
  }
 
  interface NavItem {
    label: string;
    href: string;
    icon: any;
    badge?: string;
  }

  const navItems: NavItem[] = [
    { label: 'Overview', href: '/', icon: LayoutDashboard },
    { label: 'Store Onboarding', href: '/store-request', icon: Store },
    { label: 'Categories', href: '/categories', icon: Grid },
    { label: 'Products Catalog', href: '/products', icon: Package },
    { label: 'Orders Stream', href: '/orders', icon: ShoppingBag },
    { label: 'Earnings & Payouts', href: '/payouts', icon: Wallet },
    { label: 'Store Settings', href: '/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col md:flex-row">
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#0f172a',
            color: '#ffffff',
            fontSize: '13px',
            fontWeight: 700,
            borderRadius: '16px',
            border: '1px solid #334155',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
          },
          success: {
            iconTheme: {
              primary: '#167a46',
              secondary: '#ffffff',
            },
          },
          error: {
            iconTheme: {
              primary: '#e11d48',
              secondary: '#ffffff',
            },
          },
        }}
      />
      {/* Store Application Modal */}
      <StoreRegistrationModal />

      {/* Mobile Top Navigation */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-[#167a46] text-white shadow-md sticky top-0 z-50">
        <div className="flex items-center space-x-3">
          <div className="bg-white p-1 rounded-xl shadow-xs overflow-hidden w-9 h-9 flex items-center justify-center">
            <img src="/zippy-logo-crop.jpg" alt="Zippy Logo" className="h-7 w-7 object-contain" />
          </div>
          <div>
            <span className="text-xl font-black tracking-tight text-white leading-none block">zippy</span>
            <span className="text-[10px] font-bold text-emerald-200 tracking-wider uppercase">VENDOR DASHBOARD</span>
          </div>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-xl bg-[#115b34] text-white hover:bg-[#1a854d]"
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* RICH EMERALD GREEN VERTICAL SIDEBAR */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 bg-[#167a46] border-r border-[#13663a] shadow-2xl flex flex-col transition-all duration-300 ${
          collapsed ? 'w-20' : 'w-64'
        } ${mobileOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0'}`}
      >
        {/* Brand Header with Zippy Logo */}
        <div
          className={`h-20 flex items-center border-b border-[#13663a] bg-[#12653a] transition-all relative ${
            collapsed ? 'justify-center px-2' : 'justify-between px-4'
          }`}
        >
          <Link href="/" className="flex items-center space-x-3 overflow-hidden py-1 group">
            <div className="bg-white p-1.5 rounded-xl shadow-md border border-emerald-100 flex items-center justify-center shrink-0 w-10 h-10 group-hover:scale-105 transition-transform overflow-hidden">
              <img src="/zippy-logo-crop.jpg" alt="Zippy Logo" className="w-full h-full object-contain" />
            </div>
            {!collapsed && (
              <div className="flex flex-col whitespace-nowrap">
                <div className="flex items-center space-x-1.5">
                  <span className="text-2xl font-black tracking-tight text-white leading-none">zippy</span>
                  <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-emerald-400 text-emerald-950">
                    Vendor
                  </span>
                </div>
                <span className="text-[10px] font-bold tracking-wider text-emerald-200 uppercase mt-0.5">
                  GROCERIES IN MINUTES
                </span>
              </div>
            )}
          </Link>

          {/* Collapse/Expand Sidebar Button */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={`hidden md:flex p-1.5 rounded-lg bg-[#115b34] hover:bg-[#1a854d] text-white transition-colors shrink-0 ${
              collapsed
                ? 'absolute -right-3 top-1/2 -translate-y-1/2 rounded-full p-1 border border-[#167a46] shadow-md z-10'
                : ''
            }`}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Store Status / Name Pill */}
        {!collapsed && (
          <div className="mx-3 mt-4 p-3 rounded-2xl bg-[#115b34] border border-[#1a854d] text-white space-y-1">
            <div className="flex items-center justify-between text-xs text-emerald-200 font-semibold">
              <span className="truncate">{currentStoreCategory}</span>
              <span
                className={`w-2 h-2 rounded-full ${
                  currentApprovalStatus === 'APPROVED' && vendor.isOpen
                    ? 'bg-emerald-400 animate-ping'
                    : 'bg-amber-400'
                }`}
              />
            </div>
            <p className="text-sm font-bold text-white truncate">
              {currentApprovalStatus === 'NOT_REGISTERED' ? 'No Store Registered' : (currentStoreName || 'My Store')}
            </p>
          </div>
        )}

        {/* Navigation Items List */}
        <nav className="flex-1 py-4 px-3 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                title={item.label}
                className={`flex items-center px-3.5 py-3 rounded-xl font-bold transition-all ${
                  collapsed ? 'justify-center space-x-0' : 'space-x-3'
                } ${
                  isActive
                    ? 'bg-white text-[#167a46] shadow-lg shadow-black/10 scale-[1.02]'
                    : 'text-emerald-100 hover:bg-[#12653a] hover:text-white'
                }`}
              >
                <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-[#167a46]' : 'text-emerald-200'}`} />
                {!collapsed && (
                  <div className="flex items-center justify-between w-full">
                    <span className="text-sm truncate">{item.label}</span>
                    {item.badge && (
                      <span
                        className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                          isActive ? 'bg-[#167a46] text-white' : 'bg-emerald-400 text-emerald-950'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Register Store Trigger Pill in Sidebar - Only when actually not registered */}
        {!collapsed && currentApprovalStatus === 'NOT_REGISTERED' && (
          <div className="p-3 mx-3 mb-3 rounded-2xl bg-amber-400 text-amber-950 space-y-2 text-xs font-bold shadow-lg border border-amber-300">
            <div className="flex items-center space-x-1.5">
              <Store className="w-4 h-4 shrink-0 text-amber-950" />
              <span>Store Not Registered</span>
            </div>
            <p className="text-[11px] font-normal leading-tight">
              Register your store details to unlock product inventory & order processing.
            </p>
            <Link
              href="/store-request"
              className="w-full py-2 rounded-xl bg-amber-950 hover:bg-black text-white font-black text-xs transition-all flex items-center justify-center space-x-1"
            >
              <span>Register Store Now</span>
              <ArrowRight className="w-3.5 h-3.5 text-amber-300" />
            </Link>
          </div>
        )}

        {/* Sidebar Footer: Vendor Profile */}
        <div className="p-3 border-t border-[#13663a] bg-[#115b34]">
          {!collapsed ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3 overflow-hidden">
                <div className="w-9 h-9 rounded-xl bg-white text-[#167a46] font-black flex items-center justify-center shadow-md shrink-0 text-sm">
                  {ownerName?.[0] || 'V'}
                </div>
                <div className="truncate">
                  <p className="text-xs font-bold text-white truncate">{ownerName}</p>
                  <p className="text-[10px] text-emerald-200 truncate">{ownerEmail}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-rose-500/20 transition-colors"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div
                className="w-9 h-9 rounded-xl bg-white text-[#167a46] font-black flex items-center justify-center shadow-md shrink-0 text-sm"
                title={ownerName}
              >
                {ownerName?.[0] || 'V'}
              </div>
              <button
                onClick={handleLogout}
                className="p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-rose-500/20 transition-colors"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* LIGHT MAIN WORKSPACE AREA */}
      <main
        className={`flex-1 transition-all duration-300 flex flex-col min-h-screen ${
          collapsed ? 'md:ml-20' : 'md:ml-64'
        }`}
      >
        {/* Top Header Bar */}
        <header className="h-16 border-b border-slate-200 bg-white px-4 md:px-8 flex items-center justify-between sticky top-0 z-40 shadow-xs">
          {/* Left Store Online Indicator & Status */}
          <div className="flex items-center space-x-3">
            <button
              onClick={toggleStoreOpen}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-full border text-xs font-bold transition-all shadow-xs ${
                vendor.isOpen
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
                  : 'bg-rose-50 border-rose-200 text-rose-800 hover:bg-rose-100'
              }`}
            >
              <span className="relative flex h-2.5 w-2.5">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    vendor.isOpen ? 'bg-emerald-500' : 'bg-rose-500'
                  }`}
                />
                <span
                  className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                    vendor.isOpen ? 'bg-emerald-600' : 'bg-rose-600'
                  }`}
                />
              </span>
              <span>{vendor.isOpen ? 'Store Live • Receiving Orders' : 'Store Offline (Closed)'}</span>
              <Power className="w-3.5 h-3.5 ml-1 opacity-70" />
            </button>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center space-x-3">
            <button className="p-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 hover:text-[#167a46] relative">
              <Bell className="w-4 h-4" />
              <span className="w-2 h-2 rounded-full bg-[#167a46] absolute top-1.5 right-1.5" />
            </button>

            <Link
              href="/settings"
              className="flex items-center space-x-2.5 pl-3 pr-2 py-1.5 rounded-xl bg-slate-100 border border-slate-200 hover:border-[#167a46] transition-all"
            >
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold text-slate-800 leading-tight">
                  {currentApprovalStatus === 'NOT_REGISTERED' ? 'Unregistered Store' : (currentStoreName || vendor.storeName || 'My Store')}
                </p>
                <p
                  className={`text-[10px] font-semibold ${
                    currentApprovalStatus === 'NOT_REGISTERED'
                      ? 'text-amber-600'
                      : currentApprovalStatus === 'PENDING_APPROVAL' || currentApprovalStatus === 'PENDING'
                      ? 'text-amber-600'
                      : 'text-emerald-700'
                  }`}
                >
                  {currentApprovalStatus}
                </p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-[#167a46] text-white font-black flex items-center justify-center text-xs shadow-sm">
                {ownerName?.[0] || 'V'}
              </div>
            </Link>
          </div>
        </header>

        {/* NOT REGISTERED Top Alert Banner */}
        {currentApprovalStatus === 'NOT_REGISTERED' && (
          <div className="bg-amber-400 text-amber-950 px-6 py-3 border-b border-amber-300 flex items-center justify-between text-xs font-bold shadow-sm">
            <div className="flex items-center space-x-2">
              <ShieldAlert className="w-5 h-5 text-amber-950 animate-bounce shrink-0" />
              <span>
                <strong>Store Registration Required:</strong> You are currently viewing static preview data. Please register your store to add products, categories & receive real orders.
              </span>
            </div>
            <Link
              href="/store-request"
              className="px-4 py-1.5 bg-amber-950 text-white rounded-xl hover:bg-black transition-all text-xs font-black shrink-0 ml-3 flex items-center space-x-1 shadow-md"
            >
              <span>Register Store Now 🚀</span>
            </Link>
          </div>
        )}

        {/* Pending Approval Top Banner */}
        {(currentApprovalStatus === 'PENDING_APPROVAL' || currentApprovalStatus === 'PENDING' || currentApprovalStatus === 'UNDER_REVIEW') && (
          <div className="bg-amber-500 text-amber-950 px-6 py-2.5 border-b border-amber-400 flex items-center justify-between text-xs font-semibold shadow-xs">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-950 animate-bounce shrink-0" />
              <span>
                <strong>Store Pending Verification ({currentApprovalStatus}):</strong> Zippy Admin is reviewing your submitted registration documents.
              </span>
            </div>
            <button
              onClick={loginAsApproved}
              className="px-3 py-1 bg-amber-950 text-amber-100 rounded-lg hover:bg-black transition-all text-xs font-bold shrink-0 ml-2"
            >
              Simulate Admin Approval ✨
            </button>
          </div>
        )}

        {/* Real-time Socket New Order Toast Banner */}
        {notification && (
          <div className="bg-[#167a46] text-white px-6 py-3 border-b border-[#12653a] flex items-center justify-between text-xs font-bold shadow-md animate-in slide-in-from-top-2">
            <div className="flex items-center space-x-2">
              <Bell className="w-4 h-4 text-emerald-200 animate-bounce shrink-0" />
              <span>{notification}</span>
            </div>
            <div className="flex items-center space-x-3">
              <Link
                href="/orders"
                onClick={() => clearNotification()}
                className="px-3 py-1 bg-white text-[#167a46] rounded-lg hover:bg-emerald-50 transition-all font-black text-xs cursor-pointer shadow-xs"
              >
                View Orders Stream 🚀
              </Link>
              <button
                onClick={clearNotification}
                className="text-emerald-200 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Dynamic Page Content in Clean Light Slate Area */}
        <div className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">{children}</div>

        {/* Footer */}
        <footer className="mt-auto border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500 font-medium">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p>© 2026 Zippy Grocery Technologies Inc. • Vendor Portal</p>
            <div className="flex items-center space-x-2 text-[#167a46] font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Zippy Emerald Sidebar & Light Workspace</span>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
