'use client';

import React, { useState } from 'react';
import {
  Store,
  MapPin,
  Clock,
  CreditCard,
  Building,
  FileCheck,
  ShieldCheck,
  X,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  FileText,
  AlertCircle,
  Navigation,
  Crosshair,
} from 'lucide-react';
import { useVendorStore } from '@/store/useVendorStore';

export default function StoreRegistrationModal() {
  const { isStoreModalOpen, setStoreModalOpen, submitStoreRegistration, vendor } = useVendorStore();

  const [step, setStep] = useState(1);
  const [isLocating, setIsLocating] = useState(false);
  const [locationDetected, setLocationDetected] = useState(false);

  const [formData, setFormData] = useState({
    storeName: vendor.storeName || '',
    category: 'Grocery & Fresh Produce',
    address: '',
    city: 'Noida',
    pincode: '201301',
    latitude: vendor.latitude || '',
    longitude: vendor.longitude || '',
    operatingHours: '06:00 AM - 11:00 PM',
    fssaiLicense: '',
    gstin: '',
    bankName: 'HDFC Bank',
    bankAccount: '',
    ifscCode: '',
    bannerImage: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&q=80',
  });

  const detectLocation = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) return;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude.toFixed(6);
        const lng = pos.coords.longitude.toFixed(6);
        setFormData((prev) => ({
          ...prev,
          latitude: lat,
          longitude: lng,
        }));
        setLocationDetected(true);
        setIsLocating(false);
      },
      () => {
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  if (!isStoreModalOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitStoreRegistration({
      storeName: formData.storeName || 'My Zippy Store',
      category: formData.category,
      address: formData.address,
      city: formData.city,
      pincode: formData.pincode,
      latitude: formData.latitude,
      longitude: formData.longitude,
      operatingHours: formData.operatingHours,
      fssaiLicense: formData.fssaiLicense,
      gstin: formData.gstin,
      bankName: formData.bankName,
      bankAccount: formData.bankAccount,
      ifscCode: formData.ifscCode,
      bannerImage: formData.bannerImage,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-in fade-in-50">
      <div className="white-card max-w-2xl w-full max-h-[90vh] flex flex-col justify-between overflow-hidden shadow-2xl relative border-2 border-[#167a46]">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 bg-emerald-950 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-[#34d399]">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-xl font-black text-white">Apply for Zippy Store Registration</h3>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-emerald-400 text-emerald-950">
                  Step {step} of 3
                </span>
              </div>
              <p className="text-xs text-emerald-200/80">Submit your business documents to unlock live ordering.</p>
            </div>
          </div>

          <button
            onClick={() => setStoreModalOpen(false)}
            className="p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-emerald-800"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Step Progress Indicators */}
        <div className="bg-slate-100 px-6 py-3 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-600">
          <div
            className={`flex items-center space-x-1.5 ${
              step === 1 ? 'text-[#167a46] font-black' : step > 1 ? 'text-emerald-700' : ''
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-[#167a46] text-white text-[11px] flex items-center justify-center">
              1
            </span>
            <span>Store & Location</span>
          </div>

          <div
            className={`flex items-center space-x-1.5 ${
              step === 2 ? 'text-[#167a46] font-black' : step > 2 ? 'text-emerald-700' : ''
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-[#167a46] text-white text-[11px] flex items-center justify-center">
              2
            </span>
            <span>FSSAI & Legal</span>
          </div>

          <div
            className={`flex items-center space-x-1.5 ${step === 3 ? 'text-[#167a46] font-black' : ''}`}
          >
            <span className="w-5 h-5 rounded-full bg-[#167a46] text-white text-[11px] flex items-center justify-center">
              3
            </span>
            <span>Bank Settlement</span>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* STEP 1: STORE DETAILS */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in-50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Store Name *</label>
                  <input
                    type="text"
                    name="storeName"
                    required
                    placeholder="e.g. Green Basket Supermarket"
                    value={formData.storeName}
                    onChange={handleChange}
                    className="custom-input w-full px-4 py-2.5 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Store Category *</label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    className="custom-input w-full px-4 py-2.5 text-sm bg-white text-slate-800"
                  >
                    <option value="Grocery & Fresh Produce">Grocery & Fresh Produce</option>
                    <option value="Dairy, Bread & Eggs">Dairy, Bread & Eggs</option>
                    <option value="Fruits & Vegetables">Fruits & Vegetables</option>
                    <option value="Snacks & Beverages">Snacks & Beverages</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Complete Shop Address *</label>
                <textarea
                  name="address"
                  required
                  rows={2}
                  placeholder="Shop #14, Sector 18 Market..."
                  value={formData.address}
                  onChange={handleChange}
                  className="custom-input w-full px-4 py-2 text-sm resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">City *</label>
                  <input
                    type="text"
                    name="city"
                    required
                    placeholder="Noida"
                    value={formData.city}
                    onChange={handleChange}
                    className="custom-input w-full px-4 py-2.5 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Pincode *</label>
                  <input
                    type="text"
                    name="pincode"
                    required
                    placeholder="201301"
                    value={formData.pincode}
                    onChange={handleChange}
                    className="custom-input w-full px-4 py-2.5 text-sm"
                  />
                </div>
              </div>

              {/* GPS Location Auto-detect */}
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Navigation className={`w-4 h-4 text-[#167a46] ${isLocating ? 'animate-spin' : ''}`} />
                  <div>
                    <p className="text-xs font-bold text-emerald-950">Store GPS Coordinates</p>
                    <p className="text-[11px] text-emerald-800">
                      {formData.latitude && formData.longitude
                        ? `${formData.latitude}, ${formData.longitude}`
                        : 'Auto-detect current location for 10-min delivery'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={detectLocation}
                  disabled={isLocating}
                  className="px-3 py-1.5 rounded-lg bg-[#167a46] hover:bg-[#12653a] text-white text-xs font-bold flex items-center space-x-1.5 transition-all shadow-sm active:scale-95"
                >
                  <Crosshair className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
                  <span>{isLocating ? 'Detecting...' : locationDetected ? 'Re-detect GPS' : 'Detect GPS'}</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">GPS Latitude *</label>
                  <input
                    type="text"
                    name="latitude"
                    placeholder="e.g. 28.570800"
                    value={formData.latitude}
                    onChange={handleChange}
                    className="custom-input w-full px-4 py-2.5 text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">GPS Longitude *</label>
                  <input
                    type="text"
                    name="longitude"
                    placeholder="e.g. 77.326100"
                    value={formData.longitude}
                    onChange={handleChange}
                    className="custom-input w-full px-4 py-2.5 text-sm font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Daily Operating Hours</label>
                <input
                  type="text"
                  name="operatingHours"
                  value={formData.operatingHours}
                  onChange={handleChange}
                  className="custom-input w-full px-4 py-2.5 text-sm"
                  placeholder="06:00 AM - 11:00 PM"
                />
              </div>
            </div>
          )}

          {/* STEP 2: FSSAI & LEGAL */}
          {step === 2 && (
            <div className="space-y-4 animate-in fade-in-50">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">FSSAI License Number (14 Digits) *</label>
                <div className="relative">
                  <FileCheck className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    name="fssaiLicense"
                    required
                    maxLength={14}
                    placeholder="11521034000892"
                    value={formData.fssaiLicense}
                    onChange={handleChange}
                    className="custom-input w-full pl-10 pr-4 py-2.5 text-sm font-mono"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Mandatory for selling food and grocery items.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">GSTIN / PAN Number *</label>
                <div className="relative">
                  <ShieldCheck className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    name="gstin"
                    required
                    placeholder="07AAAAA0000A1Z5"
                    value={formData.gstin}
                    onChange={handleChange}
                    className="custom-input w-full pl-10 pr-4 py-2.5 text-sm uppercase font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: BANK SETTLEMENT */}
          {step === 3 && (
            <div className="space-y-4 animate-in fade-in-50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Bank Name *</label>
                  <input
                    type="text"
                    name="bankName"
                    required
                    placeholder="HDFC Bank"
                    value={formData.bankName}
                    onChange={handleChange}
                    className="custom-input w-full px-4 py-2.5 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Bank Account Number *</label>
                  <div className="relative">
                    <CreditCard className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      name="bankAccount"
                      required
                      placeholder="91823456789012"
                      value={formData.bankAccount}
                      onChange={handleChange}
                      className="custom-input w-full pl-10 pr-4 py-2.5 text-sm font-mono"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">IFSC Code *</label>
                <div className="relative">
                  <Building className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    name="ifscCode"
                    required
                    placeholder="HDFC0001234"
                    value={formData.ifscCode}
                    onChange={handleChange}
                    className="custom-input w-full pl-10 pr-4 py-2.5 text-sm uppercase font-mono"
                  />
                </div>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-xl text-xs text-emerald-900 space-y-1">
                <div className="font-bold flex items-center space-x-1 text-[#167a46]">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Ready to submit store verification!</span>
                </div>
                <p className="text-[11px] text-slate-600">
                  By submitting, your store profile will be sent to Zippy Admin for official onboarding approval.
                </p>
              </div>
            </div>
          )}
        </form>

        {/* Footer Navigation Buttons */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="px-4 py-2 rounded-xl bg-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-300"
            >
              Back
            </button>
          ) : (
            <div />
          )}

          {step < 3 ? (
            <button
              type="button"
              onClick={() => setStep(step + 1)}
              className="px-5 py-2.5 rounded-xl bg-[#167a46] hover:bg-[#12653a] text-white font-bold text-xs shadow-md flex items-center space-x-1.5"
            >
              <span>Next Step</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              className="px-6 py-2.5 rounded-xl bg-[#167a46] hover:bg-[#12653a] text-white font-black text-xs shadow-md flex items-center space-x-1.5"
            >
              <span>Submit Store Application</span>
              <Sparkles className="w-4 h-4 text-emerald-300" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
