'use client';

import React, { useState, useEffect } from 'react';
import {
  Settings,
  Store,
  User,
  Phone,
  MapPin,
  Clock,
  CreditCard,
  Building,
  Image as ImageIcon,
  CheckCircle2,
  Save,
} from 'lucide-react';
import { useVendorStore } from '@/store/useVendorStore';
import { useAppSelector } from '@/store';
import { useGetStoreRequestQuery } from '@/store/api/vendorApi';

export default function SettingsPage() {
  const { vendor, updateVendorProfile } = useVendorStore();
  const { user: authUser } = useAppSelector((state) => state.auth);
  const { data: storeRequestData } = useGetStoreRequestQuery();

  const requestObj = (storeRequestData as any)?.data || storeRequestData;

  const [formData, setFormData] = useState({
    storeName: requestObj?.storeName || requestObj?.store_name || vendor.storeName || '',
    ownerName: authUser?.name || vendor.ownerName || '',
    email: authUser?.email || vendor.email || '',
    phone: authUser?.phone || vendor.phone || '',
    category: requestObj?.primary_category || requestObj?.category || vendor.category || 'Grocery & Daily Needs',
    address: requestObj?.address_line1 || requestObj?.address || vendor.address || '',
    operatingHours: vendor.operatingHours || '06:00 AM - 11:00 PM',
    bankAccount: requestObj?.bank_account_number || vendor.bankAccount || '',
    ifscCode: requestObj?.bank_ifsc || vendor.ifscCode || '',
    bannerImage: vendor.bannerImage || '',
  });

  useEffect(() => {
    if (authUser || requestObj) {
      setFormData((prev) => ({
        ...prev,
        ownerName: authUser?.name || prev.ownerName,
        email: authUser?.email || prev.email,
        phone: authUser?.phone || prev.phone,
        storeName: requestObj?.storeName || requestObj?.store_name || prev.storeName,
        category: requestObj?.primary_category || requestObj?.category || prev.category,
        address: requestObj?.address_line1 || requestObj?.address || prev.address,
        bankAccount: requestObj?.bank_account_number || prev.bankAccount,
        ifscCode: requestObj?.bank_ifsc || prev.ifscCode,
      }));
    }
  }, [authUser, requestObj]);

  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateVendorProfile(formData);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="max-w-4xl space-y-6 animate-in fade-in-50 duration-300">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <Settings className="w-6 h-6 text-[#167a46]" />
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Store Profile Settings</h1>
          </div>
          <p className="text-slate-600 text-xs md:text-sm mt-1">
            Update your business details, operating hours, and bank settlement account.
          </p>
        </div>

        {savedSuccess && (
          <div className="px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold flex items-center space-x-1.5 animate-bounce shadow-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Profile Updated Successfully!</span>
          </div>
        )}
      </div>

      {/* Settings Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Banner Image Preview */}
        <div className="white-card p-6 space-y-4 shadow-sm border border-slate-200">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2 border-b border-slate-200 pb-3">
            <ImageIcon className="w-4 h-4 text-[#167a46]" />
            <span>Store Storefront & Branding</span>
          </h3>

          <div className="relative h-40 w-full rounded-2xl overflow-hidden border border-slate-200 bg-slate-100">
            <img src={formData.bannerImage} alt="Store Banner" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent flex items-end p-4">
              <div>
                <div className="text-lg font-black text-white">{formData.storeName}</div>
                <div className="text-xs text-emerald-300 font-semibold">{formData.category}</div>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Banner Image URL</label>
            <input
              type="url"
              name="bannerImage"
              value={formData.bannerImage}
              onChange={handleChange}
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
                  value={formData.storeName}
                  onChange={handleChange}
                  className="custom-input w-full pl-10 pr-4 py-2.5 text-sm"
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
                  value={formData.ownerName}
                  onChange={handleChange}
                  className="custom-input w-full pl-10 pr-4 py-2.5 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Contact Phone *</label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="tel"
                  name="phone"
                  required
                  value={formData.phone}
                  onChange={handleChange}
                  className="custom-input w-full pl-10 pr-4 py-2.5 text-sm"
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
                  value={formData.operatingHours}
                  onChange={handleChange}
                  className="custom-input w-full pl-10 pr-4 py-2.5 text-sm"
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
                value={formData.address}
                onChange={handleChange}
                className="custom-input w-full pl-10 pr-4 py-2.5 text-sm resize-none"
              />
            </div>
          </div>
        </div>

        {/* Banking Settlement Info */}
        <div className="white-card p-6 space-y-4 shadow-sm border border-slate-200">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2 border-b border-slate-200 pb-3">
            <CreditCard className="w-4 h-4 text-[#167a46]" />
            <span>Bank Settlement Account</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Bank Account Number *</label>
              <div className="relative">
                <CreditCard className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  name="bankAccount"
                  required
                  value={formData.bankAccount}
                  onChange={handleChange}
                  className="custom-input w-full pl-10 pr-4 py-2.5 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Bank IFSC Code *</label>
              <div className="relative">
                <Building className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  name="ifscCode"
                  required
                  value={formData.ifscCode}
                  onChange={handleChange}
                  className="custom-input w-full pl-10 pr-4 py-2.5 text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="px-8 py-3.5 rounded-2xl bg-[#167a46] hover:bg-[#12653a] text-white font-black text-sm transition-all shadow-md active:scale-95 flex items-center space-x-2"
          >
            <Save className="w-4 h-4" />
            <span>Save Profile Settings</span>
          </button>
        </div>
      </form>
    </div>
  );
}
