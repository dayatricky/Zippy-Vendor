'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, CheckCircle2, Clock, ArrowRight, Sparkles, ShieldAlert, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useVendorStore } from '@/store/useVendorStore';
import { useAppDispatch } from '@/store';
import { loginVendorThunk } from '@/store/slices/authSlice';
import { vendorApi } from '@/store/api/vendorApi';
import { ReCaptcha, ReCaptchaRef } from '@/components/ReCaptcha';

export default function LoginPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { loginAsApproved, loginAsPending, loginAsNotRegistered } = useVendorStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const recaptchaRef = useRef<ReCaptchaRef>(null);

  // If user is already authenticated, redirect away from /login to /
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('zippy_vendor_token');
      if (token) {
        router.replace('/');
      }
    }
  }, [router]);

  const handleStandardLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMessage('Please enter both email and password');
      return;
    }

    if (!captchaToken) {
      setErrorMessage('Please check the "I\'m not a robot" reCAPTCHA box to continue.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      // 1. Secure Server-side reCAPTCHA Verification
      const verifyRes = await fetch('/api/verify-captcha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: captchaToken }),
      });
      const verifyData = await verifyRes.json();

      if (!verifyData.success) {
        setErrorMessage(verifyData.message || 'reCAPTCHA verification failed. Please try again.');
        recaptchaRef.current?.reset();
        setCaptchaToken(null);
        setIsLoading(false);
        return;
      }

      // 2. Dispatch Login
      const result = await dispatch(
        loginVendorThunk({
          email: email,
          password: password,
        })
      ).unwrap();

      if (result?.user) {
        // Reset RTK Query cache to clear stale unauthenticated results
        dispatch(vendorApi.util.resetApiState());
        window.location.href = '/';
      }
    } catch (err: any) {
      const msg = typeof err === 'string' ? err : err?.message || 'Login failed. Please check your credentials and try again.';
      setErrorMessage(msg);
      recaptchaRef.current?.reset();
      setCaptchaToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprovedClick = () => {
    loginAsApproved();
    if (typeof window !== 'undefined') {
      localStorage.setItem('zippy_vendor_token', 'demo_approved_token');
      localStorage.setItem('zippy_store_status', 'APPROVED');
      localStorage.setItem('zippy_store_name', 'Green Basket Supermarket');
    }
    dispatch(vendorApi.util.resetApiState());
    router.replace('/');
  };

  const handlePendingClick = () => {
    loginAsPending();
    if (typeof window !== 'undefined') {
      localStorage.setItem('zippy_vendor_token', 'demo_pending_token');
      localStorage.setItem('zippy_store_status', 'PENDING');
      localStorage.setItem('zippy_store_name', 'Organic Daily Fresh');
    }
    dispatch(vendorApi.util.resetApiState());
    router.replace('/');
  };

  const handleNotRegisteredClick = () => {
    loginAsNotRegistered();
    if (typeof window !== 'undefined') {
      localStorage.setItem('zippy_vendor_token', 'demo_not_registered_token');
      localStorage.setItem('zippy_store_status', 'NOT_REGISTERED');
      localStorage.removeItem('zippy_store_name');
    }
    dispatch(vendorApi.util.resetApiState());
    router.replace('/');
  };

  return (
    <div className="h-screen max-h-screen w-full overflow-hidden flex flex-col md:flex-row bg-white selection:bg-[#34d399] selection:text-[#0e4828]">
      {/* LEFT SIDE: BRAND SHOWCASE WITH OFFICIAL ZIPPY LOGO GRAPHIC */}
      <div className="hidden lg:flex w-1/2 bg-[#167a46] text-white flex-col justify-center items-center p-10 lg:p-14 relative overflow-hidden">
        {/* Background Glows */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-emerald-400/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-emerald-300/15 rounded-full blur-3xl pointer-events-none" />

        {/* Center Graphic Banner */}
        <div className="relative z-10 space-y-6 max-w-md text-center">
          <div className="bg-white p-3 rounded-3xl shadow-2xl border border-emerald-100 inline-flex items-center justify-center overflow-hidden">
            <img
              src="/zippy-logo-user.jpg"
              alt="Zippy Delivery Rider"
              className="w-full max-h-72 object-cover rounded-2xl shadow-md"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-center space-x-2">
              <span className="text-3xl font-black tracking-tight text-white leading-none">zippy</span>
              <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-emerald-400 text-emerald-950">
                Vendor Portal
              </span>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-emerald-100">
              Empowering Local Stores with 10-Minute Grocery Delivery ⚡
            </h2>
            <p className="text-emerald-100/80 text-xs leading-relaxed max-w-sm mx-auto">
              Fulfill customer orders instantaneously, track live store payouts, and manage catalog items with ease.
            </p>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE: SEXY COMPACT LOGIN FORM (NO SCROLL!) */}
      <div className="w-full lg:w-1/2 h-full flex flex-col justify-center items-center p-6 md:p-12 bg-slate-50 relative overflow-y-auto">
        <div className="max-w-md w-full space-y-5">
          {/* Mobile Zippy Logo Badge */}
          <div className="lg:hidden text-center mb-2">
            <div className="bg-white p-2 rounded-2xl shadow-md border border-slate-200 inline-block mb-2">
              <img src="/zippy-logo-crop.jpg" alt="Zippy Logo" className="h-10 object-contain" />
            </div>
            <h1 className="text-2xl font-black text-slate-900">Zippy Vendor Login</h1>
          </div>

          {/* Header */}
          <div className="hidden lg:block space-y-1">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Vendor Account Sign In</h2>
            <p className="text-xs text-slate-500 font-medium">Enter your credentials to access your store dashboard.</p>
          </div>

          {/* Error alert */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleStandardLogin} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Vendor Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="custom-input w-full pl-10 pr-4 py-2.5 text-sm"
                  placeholder="vendor@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="custom-input w-full pl-10 pr-10 py-2.5 text-sm"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none p-1 transition-colors rounded-lg"
                  title={showPassword ? 'Hide password' : 'Show password'}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Google reCAPTCHA v2 Widget */}
            <div className="py-1 flex flex-col items-center justify-center">
              <ReCaptcha
                ref={recaptchaRef}
                onChange={setCaptchaToken}
                onExpired={() => setCaptchaToken(null)}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-[#167a46] hover:bg-[#12653a] text-white font-black text-sm transition-all shadow-md active:scale-[0.99] flex items-center justify-center space-x-2"
            >
              <span>{isLoading ? 'Signing In...' : 'Sign In to Dashboard'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick-Fill Demo Buttons */}
          <div className="pt-3 border-t border-slate-200 space-y-2">
            <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-600">
              <Sparkles className="w-3.5 h-3.5 text-[#167a46]" />
              <span>Select Demo Testing Mode:</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={handleApprovedClick}
                className="flex flex-col items-center p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-900 text-center transition-all"
              >
                <CheckCircle2 className="w-4 h-4 text-[#167a46] mb-1" />
                <span className="font-bold text-[11px] leading-tight">Approved</span>
                <span className="text-[9px] text-emerald-700">Full Access</span>
              </button>

              <button
                type="button"
                onClick={handlePendingClick}
                className="flex flex-col items-center p-2 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 text-center transition-all"
              >
                <Clock className="w-4 h-4 text-amber-600 mb-1" />
                <span className="font-bold text-[11px] leading-tight">Pending</span>
                <span className="text-[9px] text-amber-700">Under Review</span>
              </button>

              <button
                type="button"
                onClick={handleNotRegisteredClick}
                className="flex flex-col items-center p-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 text-center transition-all"
              >
                <ShieldAlert className="w-4 h-4 text-amber-500 mb-1" />
                <span className="font-bold text-[11px] leading-tight">No Store</span>
                <span className="text-[9px] text-slate-500">Apply Required</span>
              </button>
            </div>
          </div>

          <div className="pt-1 text-center text-xs text-slate-600">
            <span>New user account? </span>
            <Link href="/register" className="font-bold text-[#167a46] underline hover:text-emerald-800">
              Create Vendor User Account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
