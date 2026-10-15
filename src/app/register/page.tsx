'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { User, Mail, Lock, Phone, ArrowRight, KeyRound, RefreshCw, CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useVendorStore } from '@/store/useVendorStore';
import { useAppDispatch } from '@/store';
import { signupVendorThunk, sendOtpThunk, verifyOtpThunk } from '@/store/slices/authSlice';
import { vendorApi } from '@/store/api/vendorApi';
import { ReCaptcha, ReCaptchaRef } from '@/components/ReCaptcha';

export default function RegisterPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { registerUserAccount } = useVendorStore();

  const [step, setStep] = useState<'SIGNUP' | 'VERIFY_OTP'>('SIGNUP');

  // Form States
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
    password: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState('');
  const [resendTimer, setResendTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const recaptchaRef = useRef<ReCaptchaRef>(null);

  // Countdown timer for Resend OTP
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (step === 'VERIFY_OTP' && resendTimer > 0) {
      setCanResend(false);
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    } else if (resendTimer === 0) {
      setCanResend(true);
    }
    return () => clearInterval(interval);
  }, [step, resendTimer]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Step 1: Submit Signup & Trigger POST /api/v1/vendor/auth/signup
  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.fullName) return;

    if (!captchaToken) {
      setErrorMessage('Please check the "I\'m not a robot" reCAPTCHA box to continue.');
      return;
    }

    setIsLoading(true);
    setStatusMessage('');
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

      await dispatch(
        signupVendorThunk({
          fullName: formData.fullName,
          email: formData.email,
          phoneNumber: formData.phoneNumber,
          password: formData.password,
        })
      ).unwrap();

      registerUserAccount(formData.fullName, formData.email, formData.phoneNumber);
      setStep('VERIFY_OTP');
      setResendTimer(30);
      setStatusMessage(`OTP sent to ${formData.email}!`);
    } catch (err: any) {
      const msg = typeof err === 'string' ? err : err?.message || 'Signup failed. Please try again.';
      setErrorMessage(msg);
      recaptchaRef.current?.reset();
      setCaptchaToken(null);
      // Stay on SIGNUP step so the user can see error and retry
    } finally {
      setIsLoading(false);
    }
  };

  // Resend OTP Action: Trigger POST /api/v1/vendor/auth/send-otp
  const handleResendOtp = async () => {
    if (!canResend || !formData.email) return;

    setIsLoading(true);
    setStatusMessage('');
    setErrorMessage('');

    try {
      await dispatch(sendOtpThunk(formData.email)).unwrap();
      setStatusMessage(`New OTP resent to ${formData.email}!`);
      setResendTimer(30);
      setCanResend(false);
    } catch (err: any) {
      const msg = typeof err === 'string' ? err : err?.message || 'Failed to resend OTP';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Redirect away from /register if user is already authenticated
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('zippy_vendor_token');
      if (token) {
        router.replace('/');
      }
    }
  }, [router]);

  // Step 2: Submit OTP Verification & Trigger POST /api/v1/vendor/auth/verify-otp
  const handleVerifyOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.length < 4) return;

    setIsLoading(true);
    setStatusMessage('');
    setErrorMessage('');

    try {
      await dispatch(
        verifyOtpThunk({
          email: formData.email,
          otp: otp,
        })
      ).unwrap();

      dispatch(vendorApi.util.resetApiState());
      window.location.href = '/';
    } catch (err: any) {
      const msg = typeof err === 'string' ? err : err?.message || 'Invalid OTP. Please try again.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen max-h-screen w-full overflow-hidden flex flex-col md:flex-row bg-white selection:bg-[#34d399] selection:text-[#0e4828]">
      {/* LEFT SIDE: BRAND SHOWCASE */}
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
                Vendor Account
              </span>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-emerald-100">
              Create Your Vendor Account 🚀
            </h2>
            <p className="text-emerald-100/80 text-xs leading-relaxed max-w-sm mx-auto">
              Sign up today to explore the Zippy vendor portal. Apply for store onboarding whenever you are ready!
            </p>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE: REGISTRATION / VERIFY OTP FORM */}
      <div className="w-full lg:w-1/2 h-full flex flex-col justify-center items-center p-6 md:p-12 bg-slate-50 relative overflow-y-auto">
        <div className="max-w-md w-full space-y-5">
          {/* Mobile Logo Header */}
          <div className="lg:hidden text-center mb-2">
            <div className="bg-white p-2 rounded-2xl shadow-md border border-slate-200 inline-block mb-2">
              <img src="/zippy-logo-crop.jpg" alt="Zippy Logo" className="h-10 object-contain" />
            </div>
            <h1 className="text-2xl font-black text-slate-900">
              {step === 'SIGNUP' ? 'Create Vendor Account' : 'Verify Email OTP'}
            </h1>
          </div>

          {/* Header */}
          <div className="hidden lg:block space-y-1">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              {step === 'SIGNUP' ? 'Create Vendor Account' : 'Email OTP Verification'}
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              {step === 'SIGNUP'
                ? 'Enter your details to register as a partner user.'
                : `Enter the 6-digit OTP sent to ${formData.email}`}
            </p>
          </div>

          {/* Error Alert */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center space-x-2 animate-in fade-in-50">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Success / Status Toast Message */}
          {statusMessage && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center space-x-2 animate-in fade-in-50">
              <CheckCircle2 className="w-4 h-4 text-[#167a46] shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}

          {/* STEP 1: SIGNUP FORM */}
          {step === 'SIGNUP' ? (
            <div className="bg-white text-slate-900 rounded-3xl p-6 shadow-xl border border-slate-200">
              <form onSubmit={handleSignupSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      name="fullName"
                      required
                      placeholder="Rahul Sharma"
                      value={formData.fullName}
                      onChange={handleChange}
                      className="custom-input w-full pl-9 pr-3 py-2 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email Address *</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      name="email"
                      required
                      placeholder="vendor@example.com"
                      value={formData.email}
                      onChange={handleChange}
                      className="custom-input w-full pl-9 pr-3 py-2 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Mobile Phone *</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="tel"
                      name="phoneNumber"
                      required
                      placeholder="+91 98765 43210"
                      value={formData.phoneNumber}
                      onChange={handleChange}
                      className="custom-input w-full pl-9 pr-3 py-2 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Password *</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      required
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={handleChange}
                      className="custom-input w-full pl-9 pr-9 py-2 text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none p-1 transition-colors"
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
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
                  className="w-full py-3 rounded-xl bg-[#167a46] hover:bg-[#12653a] text-white font-black text-xs transition-all shadow-md active:scale-[0.99] flex items-center justify-center space-x-2"
                >
                  <span>{isLoading ? 'Sending OTP...' : 'Send OTP to Register'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              <div className="mt-4 text-center text-xs text-slate-600 space-y-2">
                <div>
                  <span>Already received an OTP code? </span>
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMessage('');
                      setStep('VERIFY_OTP');
                    }}
                    className="font-bold text-[#167a46] underline hover:text-emerald-800"
                  >
                    Enter OTP directly
                  </button>
                </div>
                <div>
                  <span>Already have an account? </span>
                  <Link href="/login" className="font-bold text-[#167a46] underline hover:text-emerald-800">
                    Log in to Dashboard
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            /* STEP 2: VERIFY OTP & RESEND OTP FORM */
            <div className="bg-white text-slate-900 rounded-3xl p-6 shadow-xl border border-slate-200 space-y-4 animate-in zoom-in-95">
              <form onSubmit={handleVerifyOtpSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Enter 6-Digit Email OTP *</label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      required
                      maxLength={6}
                      placeholder="123456"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      className="custom-input w-full pl-10 pr-4 py-2.5 text-sm font-mono tracking-widest text-center text-lg font-bold"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">Check your inbox for the Mailjet OTP code.</p>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 rounded-xl bg-[#167a46] hover:bg-[#12653a] text-white font-black text-sm transition-all shadow-md active:scale-[0.99] flex items-center justify-center space-x-2"
                >
                  <span>{isLoading ? 'Verifying...' : 'Verify OTP & Authenticate'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              {/* RESEND OTP ACTION WITH COUNTDOWN TIMER */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                <span className="text-xs text-slate-500 font-medium">Didn't receive code?</span>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={!canResend || isLoading}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    canResend
                      ? 'bg-emerald-50 text-[#167a46] border border-emerald-300 hover:bg-emerald-100'
                      : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                  }`}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                  <span>{canResend ? 'Resend OTP' : `Resend OTP in ${resendTimer}s`}</span>
                </button>
              </div>

              <div className="pt-2 text-center text-xs text-slate-500">
                <button
                  type="button"
                  onClick={() => setStep('SIGNUP')}
                  className="font-bold text-[#167a46] underline hover:text-emerald-800"
                >
                  ← Change Email Address
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
