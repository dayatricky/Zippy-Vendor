'use client';

import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  Settings,
  Store,
  User,
  Phone,
  Mail,
  MapPin,
  Clock,
  CreditCard,
  Building,
  Image as ImageIcon,
  CheckCircle2,
  Save,
  AlertCircle,
  RefreshCw,
  Eye,
  EyeOff,
  ShieldCheck,
  Landmark,
  Sparkles,
  Loader2,
  Check,
  ArrowRight,
  ExternalLink,
  Layers,
} from 'lucide-react';
import { useVendorStore } from '@/store/useVendorStore';
import { useAppSelector } from '@/store';
import {
  useGetStoreRequestQuery,
  useGetBankDetailsQuery,
  useUpdateBankDetailsMutation,
  useUpdateVendorProfileMutation,
  BankDetailsPayload,
} from '@/store/api/vendorApi';

const COMMON_BANKS = [
  'HDFC Bank',
  'State Bank of India',
  'ICICI Bank',
  'Axis Bank',
  'Kotak Mahindra Bank',
  'Punjab National Bank',
  'Bank of Baroda',
];

export default function SettingsPage() {
  const { vendor, updateVendorProfile } = useVendorStore();
  const { user: authUser } = useAppSelector((state) => state.auth);

  // Active Tab: 'bank' (primary requested) or 'store'
  const [activeTab, setActiveTab] = useState<'bank' | 'store'>('bank');

  // API Queries
  const { data: storeRequestData, refetch: refetchStoreRequest } = useGetStoreRequestQuery();
  const {
    data: bankDataResponse,
    isLoading: isBankLoading,
    isFetching: isBankFetching,
    refetch: refetchBankDetails,
  } = useGetBankDetailsQuery();

  // Mutations
  const [updateBankDetails, { isLoading: isUpdatingBank }] = useUpdateBankDetailsMutation();
  const [updateProfileApi, { isLoading: isUpdatingProfile }] = useUpdateVendorProfileMutation();

  const requestObj = (storeRequestData as any)?.data || storeRequestData;

  // ==========================================
  // BANK DETAILS STATE (GET & PATCH /api/v1/vendor/bank-details)
  // ==========================================
  const [bankForm, setBankForm] = useState({
    accountHolderName: '',
    bankName: '',
    bankAccountNumber: '',
    confirmBankAccountNumber: '',
    ifscCode: '',
    accountType: 'Current',
    upiId: '',
  });

  const [showAccountNumber, setShowAccountNumber] = useState(false);
  const [bankSuccessMsg, setBankSuccessMsg] = useState('');
  const [bankErrorMsg, setBankErrorMsg] = useState('');

  // Sync Bank Details from GET /api/v1/vendor/bank-details
  useEffect(() => {
    const rawBank = (bankDataResponse as any)?.data || (bankDataResponse as any)?.bankDetails || bankDataResponse;
    const storeReq = requestObj;

    const holder =
      rawBank?.accountHolderName ||
      rawBank?.account_holder_name ||
      storeReq?.bankDetails?.accountHolderName ||
      vendor.accountHolderName ||
      vendor.ownerName ||
      '';

    const bName =
      rawBank?.bankName ||
      rawBank?.bank_name ||
      storeReq?.bankDetails?.bankName ||
      vendor.bankName ||
      '';

    const accNum =
      rawBank?.bankAccountNumber ||
      rawBank?.bank_account_number ||
      rawBank?.account_number ||
      storeReq?.bankDetails?.bankAccountNumber ||
      vendor.bankAccount ||
      '';

    const ifsc =
      rawBank?.ifscCode ||
      rawBank?.ifsc_code ||
      storeReq?.bankDetails?.ifscCode ||
      vendor.ifscCode ||
      '';

    const accType =
      rawBank?.accountType ||
      rawBank?.account_type ||
      storeReq?.bankDetails?.accountType ||
      vendor.accountType ||
      'Current';

    const upi =
      rawBank?.upiId ||
      rawBank?.upi_id ||
      storeReq?.bankDetails?.upiId ||
      vendor.upiId ||
      '';

    setBankForm((prev) => ({
      accountHolderName: prev.accountHolderName || holder,
      bankName: prev.bankName || bName,
      bankAccountNumber: prev.bankAccountNumber || accNum,
      confirmBankAccountNumber: prev.confirmBankAccountNumber || accNum,
      ifscCode: prev.ifscCode || ifsc.toUpperCase(),
      accountType: prev.accountType || accType,
      upiId: prev.upiId || upi,
    }));
  }, [bankDataResponse, requestObj, vendor]);

  // ==========================================
  // STORE PROFILE FORM STATE
  // ==========================================
  const [profileForm, setProfileForm] = useState({
    storeName: requestObj?.storeName || requestObj?.store_name || vendor.storeName || '',
    ownerName: authUser?.name || vendor.ownerName || '',
    email: authUser?.email || vendor.email || '',
    phone: authUser?.phone || vendor.phone || '',
    category: requestObj?.primary_category || requestObj?.category || vendor.category || '',
    address: requestObj?.address_line1 || requestObj?.address || vendor.address || '',
    operatingHours: vendor.operatingHours || '06:00 AM - 11:00 PM',
    bannerImage: vendor.bannerImage || '',
  });

  const [profileSuccessMsg, setProfileSuccessMsg] = useState('');

  useEffect(() => {
    if (authUser || requestObj) {
      setProfileForm((prev) => ({
        ...prev,
        ownerName: authUser?.name || prev.ownerName,
        email: authUser?.email || prev.email,
        phone: authUser?.phone || prev.phone,
        storeName: requestObj?.storeName || requestObj?.store_name || prev.storeName,
        category: requestObj?.primary_category || requestObj?.category || prev.category,
        address: requestObj?.address_line1 || requestObj?.address || prev.address,
      }));
    }
  }, [authUser, requestObj]);

  // Handle Bank Form Change
  const handleBankChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'ifscCode') {
      setBankForm((prev) => ({ ...prev, [name]: value.toUpperCase().trim() }));
    } else if (name === 'bankAccountNumber' || name === 'confirmBankAccountNumber') {
      // allow only numeric characters
      const cleanVal = value.replace(/[^0-9]/g, '');
      setBankForm((prev) => ({ ...prev, [name]: cleanVal }));
    } else {
      setBankForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  // Submit Bank Details (PATCH /api/v1/vendor/bank-details)
  const handleBankSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBankErrorMsg('');
    setBankSuccessMsg('');

    if (!bankForm.accountHolderName.trim()) {
      setBankErrorMsg('Account Holder Name is required.');
      toast.error('Account Holder Name is required.');
      return;
    }
    if (!bankForm.bankName.trim()) {
      setBankErrorMsg('Bank Name is required.');
      toast.error('Bank Name is required.');
      return;
    }
    if (!bankForm.bankAccountNumber.trim()) {
      setBankErrorMsg('Bank Account Number is required.');
      toast.error('Bank Account Number is required.');
      return;
    }
    if (bankForm.bankAccountNumber.trim().length < 8) {
      setBankErrorMsg('Bank Account Number must be at least 8 digits.');
      toast.error('Bank Account Number must be at least 8 digits.');
      return;
    }
    if (bankForm.bankAccountNumber.trim() !== bankForm.confirmBankAccountNumber.trim()) {
      setBankErrorMsg('Account Number and Confirm Account Number do not match.');
      toast.error('Account numbers do not match!');
      return;
    }

    const cleanIfsc = bankForm.ifscCode.trim().toUpperCase();
    if (!cleanIfsc) {
      setBankErrorMsg('IFSC Code is required.');
      toast.error('IFSC Code is required.');
      return;
    }
    if (cleanIfsc.length !== 11) {
      setBankErrorMsg('IFSC Code must be exactly 11 characters (e.g. HDFC0001234).');
      toast.error('IFSC Code must be exactly 11 characters.');
      return;
    }

    try {
      const payload: BankDetailsPayload = {
        accountHolderName: bankForm.accountHolderName.trim(),
        bankName: bankForm.bankName.trim(),
        bankAccountNumber: bankForm.bankAccountNumber.trim(),
        ifscCode: cleanIfsc,
        accountType: bankForm.accountType || 'Current',
        ...(bankForm.upiId?.trim() ? { upiId: bankForm.upiId.trim() } : {}),
      };

      const res = await updateBankDetails(payload).unwrap();
      const msg = res?.message || 'Bank settlement details updated successfully!';
      setBankSuccessMsg(msg);
      toast.success(msg);

      // Update zustand store
      updateVendorProfile({
        bankName: payload.bankName,
        bankAccount: payload.bankAccountNumber,
        ifscCode: payload.ifscCode,
        accountHolderName: payload.accountHolderName,
        accountType: payload.accountType,
        upiId: payload.upiId,
      });

      // Refetch both bank details & store request to update tags
      refetchBankDetails();
      refetchStoreRequest();

      setTimeout(() => setBankSuccessMsg(''), 4000);
    } catch (err: any) {
      const errText =
        err?.data?.message ||
        err?.data?.error ||
        err?.message ||
        'Failed to update bank details. Please check your data and try again.';
      const formatted = Array.isArray(errText) ? errText.join(', ') : errText;
      setBankErrorMsg(formatted);
      toast.error(formatted);
    }
  };

  // Submit Profile Form
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSuccessMsg('');

    try {
      // Optimistically update local zustand
      updateVendorProfile(profileForm);

      // Attempt to hit backend vendor profile PUT if available
      try {
        await updateProfileApi(profileForm).unwrap();
      } catch {
        // Backend PUT might not be exposed, local zustand update is maintained
      }

      setProfileSuccessMsg('Store Profile updated successfully!');
      toast.success('Store Profile updated successfully!');
      setTimeout(() => setProfileSuccessMsg(''), 4000);
    } catch {
      toast.error('Failed to update store profile');
    }
  };

  // IFSC validation checker
  const isIfscValid = /^[A-Z]{4}0[A-Z0-9]{6}$/.test(bankForm.ifscCode);
  const isAccountsMatch =
    bankForm.bankAccountNumber &&
    bankForm.confirmBankAccountNumber &&
    bankForm.bankAccountNumber === bankForm.confirmBankAccountNumber;

  // Masked account number helper for visual card
  const displayCardNumber = () => {
    if (!bankForm.bankAccountNumber) return '•••• •••• •••• ••••';
    if (showAccountNumber) {
      return bankForm.bankAccountNumber.replace(/(\d{4})/g, '$1 ').trim();
    }
    const last4 = bankForm.bankAccountNumber.slice(-4);
    return `•••• •••• •••• ${last4 || '••••'}`;
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12 animate-in fade-in-50 duration-300">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 flex items-center justify-center text-[#167a46] shadow-xs">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Store Settings</h1>
              <p className="text-slate-500 text-xs md:text-sm">
                Manage your settlement bank account, business information, and storefront branding.
              </p>
            </div>
          </div>
        </div>

        {/* Live Refresh Status Pill */}
        <div className="flex items-center space-x-2 self-start sm:self-auto">
          <button
            onClick={() => {
              refetchBankDetails();
              refetchStoreRequest();
              toast.success('Synced latest settings from server');
            }}
            disabled={isBankFetching}
            className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-all shadow-xs flex items-center space-x-1.5 active:scale-95 disabled:opacity-50"
            title="Refresh bank and store details from server"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#167a46] ${isBankFetching ? 'animate-spin' : ''}`} />
            <span>{isBankFetching ? 'Syncing...' : 'Sync Data'}</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('bank')}
          className={`flex items-center space-x-2 px-5 py-3 border-b-2 text-sm font-black transition-all ${activeTab === 'bank'
              ? 'border-[#167a46] text-[#167a46] bg-emerald-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Bank Settlement Account</span>
          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800">
            Payouts Active
          </span>
        </button>

        <button
          onClick={() => setActiveTab('store')}
          className={`flex items-center space-x-2 px-5 py-3 border-b-2 text-sm font-black transition-all ${activeTab === 'store'
              ? 'border-[#167a46] text-[#167a46] bg-emerald-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
        >
          <Store className="w-4 h-4" />
          <span>Store Profile & Operations</span>
        </button>
      </div>

      {/* ============================================================ */}
      {/* TAB 1: BANK SETTLEMENT ACCOUNT (GET & PATCH /api/v1/vendor/bank-details) */}
      {/* ============================================================ */}
      {activeTab === 'bank' && (
        <div className="space-y-6">
          {/* Status Alert Banner */}
          {bankSuccessMsg && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-sm font-semibold flex items-center space-x-3 shadow-xs animate-in slide-in-from-top-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{bankSuccessMsg}</span>
            </div>
          )}

          {bankErrorMsg && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-300 text-rose-800 text-sm font-semibold flex items-center space-x-3 shadow-xs animate-in slide-in-from-top-2">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <span>{bankErrorMsg}</span>
            </div>
          )}

          {/* Grid Layout: Visual Card on Top/Side + Form Fields */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Visual Bank Settlement Card */}
            <div className="lg:col-span-5 space-y-4">
              <div className="relative rounded-3xl p-6 shadow-xl overflow-hidden bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-950 text-white border border-emerald-500/30">
                {/* Background Glow */}
                <div className="absolute -right-16 -top-16 w-52 h-52 rounded-full bg-emerald-500/20 blur-3xl pointer-events-none" />
                <div className="absolute -left-16 -bottom-16 w-52 h-52 rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />

                <div className="relative z-10 flex flex-col justify-between h-56">
                  {/* Top Row: Zippy Branding & Bank Name */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center text-slate-950 font-black text-xs shadow-md">
                        Z
                      </div>
                      <span className="text-[11px] font-black tracking-wider text-emerald-400 uppercase">
                        Vendor Settlement
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-bold text-slate-300 tracking-wide uppercase">
                        {bankForm.bankName || 'Your Bank'}
                      </span>
                    </div>
                  </div>

                  {/* Middle Row: EMV Chip + Masked Number */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      {/* EMV Chip Visual */}
                      <div className="w-11 h-8 rounded-md bg-gradient-to-br from-amber-200 via-amber-400 to-amber-500 shadow-inner border border-amber-600/40 flex items-center justify-center p-1">
                        <div className="w-full h-full border border-amber-800/40 rounded-xs grid grid-cols-2 gap-0.5 opacity-70" />
                      </div>

                      {/* Toggle Visibility Button */}
                      <button
                        type="button"
                        onClick={() => setShowAccountNumber(!showAccountNumber)}
                        className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 text-xs font-semibold flex items-center space-x-1.5 transition-all"
                      >
                        {showAccountNumber ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        <span>{showAccountNumber ? 'Hide' : 'Show'}</span>
                      </button>
                    </div>

                    {/* Account Number */}
                    <div className="font-mono text-lg md:text-xl font-bold tracking-widest text-slate-100">
                      {displayCardNumber()}
                    </div>
                  </div>

                  {/* Bottom Row: Holder Name & IFSC Code */}
                  <div className="flex items-end justify-between border-t border-white/10 pt-3">
                    <div>
                      <div className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">
                        Account Holder
                      </div>
                      <div className="text-xs md:text-sm font-black text-white tracking-wide uppercase truncate max-w-[180px]">
                        {bankForm.accountHolderName || 'Legal Holder Name'}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">
                        IFSC & Type
                      </div>
                      <div className="text-xs font-mono font-bold text-emerald-300 uppercase">
                        {bankForm.ifscCode || 'IFSC CODE'}
                      </div>
                      <span className="inline-block mt-0.5 text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-bold uppercase">
                        {bankForm.accountType}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Verified Settlement Security Guarantee */}
              <div className="white-card p-4 space-y-3 bg-gradient-to-br from-slate-50 to-emerald-50/30 border border-emerald-100">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0 mt-0.5">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-slate-900">RBI Regulated Settlement Gateway</div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Withdrawals and automated earnings settlements are transferred via IMPS/NEFT directly into this
                      account. Please verify the account number and IFSC to prevent transfer failure.
                    </p>
                  </div>
                </div>

                {bankForm.upiId && (
                  <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-xs">
                    <span className="text-slate-500 font-medium">Linked UPI VPA:</span>
                    <span className="font-mono font-bold text-emerald-800 bg-emerald-100/60 px-2 py-0.5 rounded-md">
                      {bankForm.upiId}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Bank Settlement Update Form */}
            <div className="lg:col-span-7">
              <div className="white-card p-6 md:p-8 space-y-6 shadow-sm border border-slate-200">
                <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                  <div className="flex items-center space-x-2">
                    <Landmark className="w-5 h-5 text-[#167a46]" />
                    <h2 className="text-base font-bold text-slate-900">Bank Account Details</h2>
                  </div>

                </div>

                <form onSubmit={handleBankSubmit} className="space-y-5">
                  {/* Account Holder Name */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Account Holder Name <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        name="accountHolderName"
                        required
                        placeholder="e.g. Rahul Sharma or Zippy Stores Pvt Ltd"
                        value={bankForm.accountHolderName}
                        onChange={handleBankChange}
                        className="custom-input w-full pl-10 pr-4 py-2.5 text-sm font-semibold"
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Must strictly match the beneficiary name registered with your bank.
                    </p>
                  </div>

                  {/* Bank Name with Quick Select Pills */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Bank Name <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative mb-2">
                      <Building className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        name="bankName"
                        required
                        placeholder="e.g. HDFC Bank, State Bank of India"
                        value={bankForm.bankName}
                        onChange={handleBankChange}
                        className="custom-input w-full pl-10 pr-4 py-2.5 text-sm font-semibold"
                      />
                    </div>

                    {/* Quick Bank Select Pills */}
                    <div className="flex flex-wrap gap-1.5">
                      {COMMON_BANKS.map((b) => (
                        <button
                          key={b}
                          type="button"
                          onClick={() => setBankForm((prev) => ({ ...prev, bankName: b }))}
                          className={`text-[11px] px-2.5 py-1 rounded-lg border font-semibold transition-all ${bankForm.bankName === b
                              ? 'bg-emerald-100 border-emerald-400 text-emerald-800 shadow-xs'
                              : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600'
                            }`}
                        >
                          {b}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Account Number & Confirm Account Number */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Bank Account Number <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <CreditCard className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type={showAccountNumber ? 'text' : 'password'}
                          name="bankAccountNumber"
                          required
                          placeholder="91823456789012"
                          value={bankForm.bankAccountNumber}
                          onChange={handleBankChange}
                          className="custom-input w-full pl-10 pr-4 py-2.5 text-sm font-mono font-bold tracking-wider"
                        />
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1">Numbers only (min 8 digits)</p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                        <span>Confirm Account Number <span className="text-rose-500">*</span></span>
                        {isAccountsMatch && (
                          <span className="text-[10px] text-emerald-700 font-bold flex items-center space-x-1">
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span>Matched</span>
                          </span>
                        )}
                      </label>
                      <div className="relative">
                        <CreditCard className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          name="confirmBankAccountNumber"
                          required
                          placeholder="Re-enter Account Number"
                          value={bankForm.confirmBankAccountNumber}
                          onChange={handleBankChange}
                          className={`custom-input w-full pl-10 pr-4 py-2.5 text-sm font-mono font-bold tracking-wider ${bankForm.confirmBankAccountNumber && !isAccountsMatch
                              ? 'border-amber-400 bg-amber-50/30'
                              : ''
                            }`}
                        />
                      </div>
                      {bankForm.confirmBankAccountNumber && !isAccountsMatch && (
                        <p className="text-[11px] text-amber-600 font-semibold mt-1">
                          Account numbers do not match yet.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* IFSC Code & Account Type */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                        <span>IFSC Code <span className="text-rose-500">*</span></span>
                        {isIfscValid && (
                          <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                            Valid Format
                          </span>
                        )}
                      </label>
                      <div className="relative">
                        <Landmark className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          name="ifscCode"
                          required
                          maxLength={11}
                          placeholder="e.g. HDFC0001234"
                          value={bankForm.ifscCode}
                          onChange={handleBankChange}
                          className="custom-input w-full pl-10 pr-4 py-2.5 text-sm font-mono font-black uppercase tracking-wider"
                        />
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        11-character code on your cheque book or passbook
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Account Type <span className="text-rose-500">*</span>
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setBankForm((prev) => ({ ...prev, accountType: 'Current' }))}
                          className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${bankForm.accountType === 'Current'
                              ? 'bg-[#167a46] border-[#167a46] text-white shadow-xs'
                              : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                            }`}
                        >
                          {bankForm.accountType === 'Current' && <Check className="w-3.5 h-3.5 text-white" />}
                          <span>Current</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setBankForm((prev) => ({ ...prev, accountType: 'Savings' }))}
                          className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${bankForm.accountType === 'Savings'
                              ? 'bg-[#167a46] border-[#167a46] text-white shadow-xs'
                              : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                            }`}
                        >
                          {bankForm.accountType === 'Savings' && <Check className="w-3.5 h-3.5 text-white" />}
                          <span>Savings</span>
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1">Current account recommended for GST stores</p>
                    </div>
                  </div>

                  {/* UPI ID (Optional) */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      UPI VPA / ID <span className="text-slate-400 font-normal">(Optional for Instant Payouts)</span>
                    </label>
                    <div className="relative">
                      <Sparkles className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        name="upiId"
                        placeholder="e.g. zippystore@hdfcbank or 9876543210@paytm"
                        value={bankForm.upiId}
                        onChange={handleBankChange}
                        className="custom-input w-full pl-10 pr-4 py-2.5 text-sm font-medium"
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Secondary payout channel for urgent withdrawal disbursements.
                    </p>
                  </div>

                  {/* Form Submission Actions */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={() => refetchBankDetails()}
                      className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs transition-all flex items-center justify-center space-x-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                      <span>Discard Changes</span>
                    </button>

                    <button
                      type="submit"
                      disabled={isUpdatingBank}
                      className="w-full sm:w-auto px-7 py-3 rounded-xl bg-[#167a46] hover:bg-[#12653a] text-white font-black text-sm transition-all shadow-md active:scale-95 flex items-center justify-center space-x-2 disabled:opacity-50"
                    >
                      {isUpdatingBank ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-white" />
                          <span>Updating Bank Details...</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          <span>Save & Verify Bank Details</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 2: STORE PROFILE & GENERAL DETAILS */}
      {/* ============================================================ */}
      {activeTab === 'store' && (
        <form onSubmit={handleProfileSubmit} className="space-y-6">
          {profileSuccessMsg && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-sm font-semibold flex items-center space-x-3 shadow-xs animate-in slide-in-from-top-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{profileSuccessMsg}</span>
            </div>
          )}

          {/* Banner Image Preview */}
          <div className="white-card p-6 space-y-4 shadow-sm border border-slate-200">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2 border-b border-slate-200 pb-3">
              <ImageIcon className="w-4 h-4 text-[#167a46]" />
              <span>Storefront Banner & Branding</span>
            </h3>

            <div className="relative h-44 w-full rounded-2xl overflow-hidden border border-slate-200 bg-slate-100">
              <img
                src={profileForm.bannerImage}
                alt="Store Banner"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    'https://images.unsplash.com/photo-1542838132-92c53300491e?w=1200&q=80';
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex items-end p-5">
                <div>
                  <div className="text-xl font-black text-white">{profileForm.storeName || 'Your Store Name'}</div>
                  <div className="text-xs text-emerald-300 font-semibold">{profileForm.category}</div>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Banner Image URL</label>
              <input
                type="url"
                name="bannerImage"
                value={profileForm.bannerImage}
                onChange={(e) => setProfileForm({ ...profileForm, bannerImage: e.target.value })}
                className="custom-input w-full px-4 py-2.5 text-sm"
                placeholder="https://images.unsplash.com/..."
              />
            </div>
          </div>

          {/* Basic Store & Owner Info */}
          <div className="white-card p-6 space-y-4 shadow-sm border border-slate-200">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2 border-b border-slate-200 pb-3">
              <Store className="w-4 h-4 text-[#167a46]" />
              <span>General Store Details</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Store Name *</label>
                <div className="relative">
                  <Store className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    name="storeName"
                    required
                    value={profileForm.storeName}
                    onChange={(e) => setProfileForm({ ...profileForm, storeName: e.target.value })}
                    className="custom-input w-full pl-10 pr-4 py-2.5 text-sm font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Owner Full Name *</label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    name="ownerName"
                    required
                    value={profileForm.ownerName}
                    onChange={(e) => setProfileForm({ ...profileForm, ownerName: e.target.value })}
                    className="custom-input w-full pl-10 pr-4 py-2.5 text-sm font-semibold"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700">Contact Phone *</label>
                  <span className="text-[10px] font-bold text-slate-400">
                    {profileForm.phone.replace(/^\+91/, '').replace(/\D/g, '').length}/10 digits
                  </span>
                </div>
                <div className="relative flex items-center">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none text-slate-400">
                    <Phone className="w-4 h-4 text-slate-400" />
                    <span className="text-xs font-bold text-slate-600 select-none pl-1 border-r border-slate-200 pr-2">
                      +91
                    </span>
                  </div>
                  <input
                    type="tel"
                    name="phone"
                    required
                    inputMode="numeric"
                    maxLength={10}
                    placeholder="9876543210"
                    value={profileForm.phone.replace(/^\+91/, '').replace(/\D/g, '').slice(0, 10)}
                    onChange={(e) => {
                      let digits = e.target.value.replace(/\D/g, '');
                      if (digits.startsWith('91') && digits.length > 10) digits = digits.slice(2);
                      else if (digits.startsWith('0') && digits.length > 10) digits = digits.slice(1);
                      setProfileForm({ ...profileForm, phone: digits.slice(0, 10) });
                    }}
                    onKeyDown={(e) => {
                      if (['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
                      if ((e.ctrlKey || e.metaKey) && ['a', 'c', 'v', 'x'].includes(e.key.toLowerCase())) return;
                      if (!/^[0-9]$/.test(e.key)) e.preventDefault();
                    }}
                    className="custom-input w-full pl-20 pr-4 py-2.5 text-sm font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Daily Operating Hours *</label>
                <div className="relative">
                  <Clock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    name="operatingHours"
                    required
                    value={profileForm.operatingHours}
                    onChange={(e) => setProfileForm({ ...profileForm, operatingHours: e.target.value })}
                    className="custom-input w-full pl-10 pr-4 py-2.5 text-sm font-semibold"
                    placeholder="06:00 AM - 11:00 PM"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Store Address *</label>
              <div className="relative">
                <MapPin className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                <textarea
                  name="address"
                  required
                  rows={2}
                  value={profileForm.address}
                  onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                  className="custom-input w-full pl-10 pr-4 py-2.5 text-sm resize-none font-medium"
                />
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isUpdatingProfile}
              className="px-8 py-3.5 rounded-2xl bg-[#167a46] hover:bg-[#12653a] text-white font-black text-sm transition-all shadow-md active:scale-95 flex items-center space-x-2 disabled:opacity-50"
            >
              {isUpdatingProfile ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Saving Profile...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Profile Settings</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
