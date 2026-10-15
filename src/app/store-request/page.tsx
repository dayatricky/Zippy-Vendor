'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Store,
  MapPin,
  CreditCard,
  Building,
  FileCheck,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Upload,
  Phone,
  Mail,
  User,
  Info,
  Calendar,
  Clock,
  BadgeCheck,
  Check,
  Navigation,
  Crosshair,
  Search,
  ExternalLink,
  LocateFixed,
} from 'lucide-react';
import { useVendorStore } from '@/store/useVendorStore';
import { useSubmitStoreRequestMutation, useGetStoreRequestQuery } from '@/store/api/vendorApi';

export default function StoreRequestPage() {
  const router = useRouter();
  const { vendor, submitStoreRegistration } = useVendorStore();
  const { data: requestStatusData, refetch: refetchStoreStatus, isLoading: isFetchingStatus } = useGetStoreRequestQuery();
  const [submitStoreRequest, { isLoading: isSubmittingApi }] = useSubmitStoreRequestMutation();

  const [activeStep, setActiveStep] = useState<1 | 2 | 3 | 4>(1);
  const [submissionSuccess, setSubmissionSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [locationDetected, setLocationDetected] = useState(false);
  const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null);
  const [geoNotice, setGeoNotice] = useState<string>('');

  // Search Address & Autocomplete States
  const [searchAddressQuery, setSearchAddressQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Extract store request object from API response
  const requestObj = (requestStatusData as any)?.data || requestStatusData;
  const rawStatus = requestObj?.status || requestObj?.approvalStatus || requestObj?.storeRequest?.status;
  
  // Normalize status to UPPERCASE string ('APPROVED', 'PENDING', 'REJECTED', etc.)
  const apiStatus = rawStatus ? String(rawStatus).toUpperCase() : null;
  const savedStatus = typeof window !== 'undefined' ? localStorage.getItem('zippy_store_status') : null;

  const currentStatus =
    apiStatus ||
    (savedStatus ? String(savedStatus).toUpperCase() : null) ||
    (submissionSuccess ? 'PENDING' : vendor.approvalStatus === 'PENDING_APPROVAL' ? 'PENDING' : 'NOT_REGISTERED');

  const isPending =
    currentStatus === 'PENDING' ||
    currentStatus === 'PENDING_APPROVAL' ||
    currentStatus === 'UNDER_REVIEW';

  const isApproved = currentStatus === 'APPROVED';
  const isRejected = currentStatus === 'REJECTED';

  // Store Registration Form Data State (No dummy Noida values, preserves user real inputs)
  const [formData, setFormData] = useState({
    // Step 1: Store & Owner Identity
    storeName: requestObj?.storeName || vendor.storeName || '',
    storeCategory: requestObj?.storeCategory || vendor.category || 'Grocery & Fresh Produce',
    description: requestObj?.description || 'Fresh organic groceries, dairy, vegetables, and daily household items delivered in 10 minutes.',
    ownerName: requestObj?.ownerName || vendor.ownerName || 'Rahul Sharma',
    contactNumber: requestObj?.contactNumber || vendor.phone || '+91 98765 43210',
    alternateNumber: requestObj?.alternateNumber || '+91 98111 22334',
    email: requestObj?.email || vendor.email || 'vendor@zippy.com',
    storeLogo: requestObj?.storeLogo || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&q=80',
    bannerImage: requestObj?.bannerImage || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=1200&q=80',

    // Step 2: Location Address
    shopAddress: requestObj?.address?.shopAddress || vendor.address || '',
    landmark: requestObj?.address?.landmark || '',
    city: requestObj?.address?.city || vendor.city || '',
    state: requestObj?.address?.state || '',
    pincode: requestObj?.address?.pincode || vendor.pincode || '',
    latitude: requestObj?.address?.coordinates?.lat || requestObj?.address?.latitude || requestObj?.latitude || vendor.latitude || '',
    longitude: requestObj?.address?.coordinates?.lng || requestObj?.address?.longitude || requestObj?.longitude || vendor.longitude || '',

    // Step 3: Legal & Tax Verification
    fssaiLicenseNumber: requestObj?.fssaiLicenseNumber || vendor.fssaiLicense || '11521034000892',
    fssaiExpiryDate: '2028-12-31',
    gstinNumber: requestObj?.gstinNumber || vendor.gstin || '07AAAAA0000A1Z5',
    panNumber: 'ABCDE1234F',
    businessType: 'Sole Proprietorship',
    fssaiDocName: 'fssai_certificate.pdf',
    gstDocName: 'gst_certificate.pdf',

    // Step 4: Bank Settlement & Payouts
    accountHolderName: requestObj?.bankDetails?.accountHolderName || vendor.ownerName || 'Rahul Sharma',
    bankName: requestObj?.bankDetails?.bankName || vendor.bankName || 'HDFC Bank',
    bankAccountNumber: requestObj?.bankDetails?.bankAccountNumber || vendor.bankAccount || '91823456789012',
    confirmBankAccountNumber: requestObj?.bankDetails?.bankAccountNumber || vendor.bankAccount || '91823456789012',
    ifscCode: requestObj?.bankDetails?.ifscCode || vendor.ifscCode || 'HDFC0001234',
    accountType: requestObj?.bankDetails?.accountType || 'Current',
    upiId: requestObj?.bankDetails?.upiId || 'zippystore@hdfcbank',
  });

  // Search locality / place with Nominatim autocomplete
  const handleSearchAddressInput = async (val: string) => {
    setSearchAddressQuery(val);
    if (!val || val.trim().length < 3) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    setIsSearchingAddress(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(val)}&addressdetails=1&limit=5`,
        { headers: { 'Accept-Language': 'en' } }
      );
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data || []);
        setShowSearchResults(true);
      }
    } catch {
      // Ignore network errors on search
    } finally {
      setIsSearchingAddress(false);
    }
  };

  const selectSearchResult = (item: any) => {
    const lat = parseFloat(item.lat).toFixed(6);
    const lng = parseFloat(item.lon).toFixed(6);
    const addr = item.address || {};
    const detectedCity = addr.city || addr.town || addr.municipality || addr.state_district || addr.county || '';
    const detectedState = addr.state || '';
    const detectedPincode = addr.postcode || '';
    const detectedRoad = [addr.road, addr.suburb, addr.neighbourhood].filter(Boolean).join(', ');

    setFormData((prev) => ({
      ...prev,
      latitude: lat,
      longitude: lng,
      shopAddress: prev.shopAddress || detectedRoad || item.display_name.split(',').slice(0, 3).join(','),
      city: detectedCity || prev.city,
      state: detectedState || prev.state,
      pincode: detectedPincode || prev.pincode,
    }));

    setSearchAddressQuery(item.display_name);
    setShowSearchResults(false);
    setLocationDetected(true);
    setLocationAccuracy(10);
    setGeoNotice(`Location pinpointed: Lat ${lat}, Lng ${lng} (${detectedCity || 'India'})`);
  };

  // Sync accurate GPS Coordinates directly from entered Shop Address / City / Pincode
  const syncGpsFromAddress = async (overrideQuery?: string) => {
    const query = overrideQuery || [
      formData.shopAddress,
      formData.landmark,
      formData.city,
      formData.state,
      formData.pincode,
    ].filter(Boolean).join(', ');

    if (!query.trim()) {
      setGeoNotice('Please enter your shop address, city, or pincode first to calculate GPS.');
      return;
    }

    setIsLocating(true);
    setGeoNotice('Calculating accurate GPS coordinates from entered address...');

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&limit=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          const item = data[0];
          const lat = parseFloat(item.lat).toFixed(6);
          const lng = parseFloat(item.lon).toFixed(6);
          const addr = item.address || {};
          const detectedCity = addr.city || addr.town || addr.municipality || addr.state_district || '';
          const detectedState = addr.state || '';
          const detectedPincode = addr.postcode || '';

          setFormData((prev) => ({
            ...prev,
            latitude: lat,
            longitude: lng,
            city: prev.city || detectedCity,
            state: prev.state || detectedState,
            pincode: prev.pincode || detectedPincode,
          }));

          setLocationDetected(true);
          setLocationAccuracy(15);
          setGeoNotice(`Accurate GPS synced with address: Lat ${lat}, Lng ${lng}`);
        } else {
          // Fallback: search by City + Pincode
          const fallback = [formData.city, formData.pincode].filter(Boolean).join(', ');
          if (fallback && fallback !== query) {
            const res2 = await fetch(
              `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fallback)}&addressdetails=1&limit=1`,
              { headers: { 'Accept-Language': 'en' } }
            );
            if (res2.ok) {
              const data2 = await res2.json();
              if (data2 && data2.length > 0) {
                const item2 = data2[0];
                const lat2 = parseFloat(item2.lat).toFixed(6);
                const lng2 = parseFloat(item2.lon).toFixed(6);
                setFormData((prev) => ({ ...prev, latitude: lat2, longitude: lng2 }));
                setLocationDetected(true);
                setLocationAccuracy(200);
                setGeoNotice(`Coordinates matched to area: Lat ${lat2}, Lng ${lng2}`);
                setIsLocating(false);
                return;
              }
            }
          }
          setGeoNotice('Could not find GPS for this address. You can also enter coordinates manually or use device location.');
        }
      }
    } catch {
      setGeoNotice('Failed to lookup address coordinates. Please check your internet connection.');
    } finally {
      setIsLocating(false);
    }
  };

  // Device GPS Detection Function
  const detectCurrentLocation = async (manual: boolean = false) => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      if (manual) setGeoNotice('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    setGeoNotice('');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = Number(position.coords.latitude.toFixed(6));
        const lng = Number(position.coords.longitude.toFixed(6));
        const accuracy = Math.round(position.coords.accuracy);

        setFormData((prev) => ({
          ...prev,
          latitude: String(lat),
          longitude: String(lng),
        }));

        setLocationAccuracy(accuracy);
        setLocationDetected(true);
        setIsLocating(false);
        setGeoNotice(`Device GPS detected: ${lat}, ${lng} (±${accuracy}m accuracy)`);

        // Reverse geocoding via OpenStreetMap Nominatim only to fill EMPTY fields
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
            { headers: { 'Accept-Language': 'en' } }
          );
          if (res.ok) {
            const data = await res.json();
            const addr = data.address || {};
            const detectedCity = addr.city || addr.town || addr.municipality || addr.state_district || '';
            const detectedState = addr.state || '';
            const detectedPincode = addr.postcode || '';
            const detectedRoad = [addr.road, addr.suburb, addr.neighbourhood].filter(Boolean).join(', ');

            setFormData((prev) => ({
              ...prev,
              city: prev.city || detectedCity,
              state: prev.state || detectedState,
              pincode: prev.pincode || detectedPincode,
              shopAddress: prev.shopAddress || (detectedRoad ? `${detectedRoad}, ${detectedCity}` : prev.shopAddress),
            }));
          }
        } catch {
          // Gracefully continue with coordinates
        }
      },
      (error) => {
        setIsLocating(false);
        if (manual) {
          let msg = 'Failed to detect location.';
          if (error.code === error.PERMISSION_DENIED) {
            msg = 'Location permission denied. Please allow location access in your browser or use "Sync from Address".';
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            msg = 'GPS signal unavailable. Please use "Sync from Address" or enter manually.';
          } else if (error.code === error.TIMEOUT) {
            msg = 'Location request timed out. Please retry or enter manually.';
          }
          setGeoNotice(msg);
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  // Auto detect / sync when user lands on Step 2 (Location step)
  useEffect(() => {
    if (activeStep === 2) {
      if (!formData.latitude || !formData.longitude) {
        if (formData.shopAddress || formData.city) {
          syncGpsFromAddress();
        } else {
          detectCurrentLocation(false);
        }
      }
    }
  }, [activeStep]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleNextStep = () => {
    if (activeStep < 4) {
      setActiveStep((prev) => (prev + 1) as any);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrevStep = () => {
    if (activeStep > 1) {
      setActiveStep((prev) => (prev - 1) as any);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    try {
      const latNum = formData.latitude ? parseFloat(formData.latitude) : 28.5708;
      const lngNum = formData.longitude ? parseFloat(formData.longitude) : 77.3261;

      // Submit via RTK Query POST /api/v1/vendor/store-request matching exact backend schema
      const storeRequestPayload = {
        storeName: formData.storeName,
        storeCategory: formData.storeCategory,
        description: formData.description,
        ownerName: formData.ownerName,
        contactNumber: formData.contactNumber,
        alternateNumber: formData.alternateNumber || formData.contactNumber,
        email: formData.email,
        storeLogo: formData.storeLogo || 'https://example.com/logo.jpg',
        bannerImage: formData.bannerImage || 'https://example.com/banner.jpg',
        address: {
          shopAddress: formData.shopAddress,
          landmark: formData.landmark,
          city: formData.city,
          state: formData.state || 'Delhi',
          pincode: formData.pincode,
          coordinates: {
            lat: Number(latNum),
            lng: Number(lngNum),
          },
        },
        legal: {
          fssaiLicenseNumber: formData.fssaiLicenseNumber,
          fssaiExpiryDate: formData.fssaiExpiryDate,
          gstinNumber: formData.gstinNumber,
          panNumber: formData.panNumber,
          businessType: formData.businessType,
        },
        bankDetails: {
          accountHolderName: formData.accountHolderName,
          bankName: formData.bankName,
          bankAccountNumber: formData.bankAccountNumber,
          ifscCode: formData.ifscCode,
          accountType: formData.accountType,
          upiId: formData.upiId,
        },
      };

      await submitStoreRequest(storeRequestPayload).unwrap();

      // Refetch API status after successful submission
      refetchStoreStatus();

      // Update local state store
      submitStoreRegistration({
        storeName: formData.storeName,
        category: formData.storeCategory,
        address: formData.shopAddress,
        city: formData.city,
        pincode: formData.pincode,
        latitude: formData.latitude,
        longitude: formData.longitude,
        fssaiLicense: formData.fssaiLicenseNumber,
        gstin: formData.gstinNumber,
        bankName: formData.bankName,
        bankAccount: formData.bankAccountNumber,
        ifscCode: formData.ifscCode,
      });

      if (typeof window !== 'undefined') {
        localStorage.setItem('zippy_store_status', 'PENDING');
        localStorage.setItem('zippy_store_name', formData.storeName);
      }

      setSubmissionSuccess(true);
      setErrorMessage('');
    } catch (err: any) {
      console.error('Store Registration API Failure:', err);
      const msg =
        err?.data?.message ||
        err?.data?.error ||
        err?.message ||
        'Store registration request failed on server. Please check your network or inputs.';
      setErrorMessage(msg);
      setSubmissionSuccess(false);
    }
  };

  const stepsList = [
    { number: 1, title: 'Store Identity', icon: Store, desc: 'Basic info & category' },
    { number: 2, title: 'Location Address', icon: MapPin, desc: 'Address & GPS' },
    { number: 3, title: 'Legal & Licenses', icon: FileCheck, desc: 'FSSAI & GSTIN verification' },
    { number: 4, title: 'Bank Settlement', icon: CreditCard, desc: 'Account details' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in-50 duration-300 pb-12">
      {/* Top Banner Header */}
      <div className="bg-[#167a46] text-white p-6 md:p-10 rounded-3xl shadow-xl relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border border-emerald-700">
        <div className="space-y-2 z-10 max-w-2xl">
          <div className="inline-flex items-center space-x-2 text-xs font-bold text-emerald-950 uppercase tracking-wider bg-emerald-300 px-3 py-1 rounded-full">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Zippy Vendor Onboarding Portal</span>
          </div>
          <h1 className="text-2xl md:text-4xl font-black tracking-tight text-white">
            {isApproved
              ? 'Store Verified & Active! 🚀'
              : isPending
              ? 'Application Under Review ⏳'
              : isRejected
              ? 'Application Action Required ⚠️'
              : 'Register Your Store Account 🚀'}
          </h1>
          <p className="text-emerald-100 text-xs md:text-sm leading-relaxed">
            {isApproved
              ? 'Your store account is fully verified and connected to the Zippy Grocery network.'
              : isPending
              ? 'Your application details have been received and are currently under verification.'
              : isRejected
              ? 'Your store application requires update. Please review rejection feedback below.'
              : 'Fill out the official 4-step onboarding application to receive live grocery orders.'}
          </p>
        </div>

        <div className="z-10 bg-emerald-950/60 backdrop-blur-md p-4 rounded-2xl border border-emerald-400/30 text-right shrink-0">
          <span className="text-xs text-emerald-200 block font-semibold">Live Onboarding Status</span>
          <div className="flex items-center justify-end space-x-2 mt-1">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isApproved
                  ? 'bg-emerald-400 animate-ping'
                  : isPending
                  ? 'bg-amber-400 animate-pulse'
                  : isRejected
                  ? 'bg-rose-400'
                  : 'bg-slate-300'
              }`}
            />
            <span
              className={`text-sm font-black uppercase tracking-wider ${
                isApproved
                  ? 'text-emerald-300'
                  : isPending
                  ? 'text-amber-300'
                  : isRejected
                  ? 'text-rose-300'
                  : 'text-slate-200'
              }`}
            >
              {currentStatus}
            </span>
          </div>
        </div>
      </div>

      {/* APPROVED VIEW CARD */}
      {isApproved ? (
        <div className="white-card p-8 md:p-12 max-w-4xl mx-auto space-y-8 border-2 border-emerald-500 shadow-2xl relative overflow-hidden">
          <div className="text-center space-y-4">
            <div className="w-20 h-20 rounded-full bg-emerald-100 text-[#167a46] flex items-center justify-center mx-auto shadow-lg border-2 border-emerald-400 animate-bounce">
              <BadgeCheck className="w-12 h-12" />
            </div>

            <div>
              <span className="inline-block px-3 py-1 rounded-full bg-emerald-100 text-[#167a46] text-xs font-black uppercase tracking-wider mb-2">
                VERIFIED & APPROVED VENDOR
              </span>
              <h2 className="text-2xl md:text-4xl font-black text-slate-900">
                {requestObj?.storeName || vendor.storeName || 'Your Store'} is Official & Live! 🎉
              </h2>
              <p className="text-slate-600 text-sm max-w-lg mx-auto mt-2">
                Zippy Admin team has approved your registration. Your store is now active to receive instant grocery orders.
              </p>
            </div>
          </div>

          {/* STORE DETAILS CARDS GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center space-x-2 text-emerald-800 font-bold">
                <Store className="w-4 h-4 text-[#167a46]" />
                <span>Store & Category</span>
              </div>
              <p className="font-extrabold text-sm text-slate-900">{requestObj?.storeName || requestObj?.store_name || vendor.storeName || 'My Store'}</p>
              <p className="text-slate-500 font-medium">{requestObj?.storeCategory || requestObj?.primary_category || requestObj?.category || vendor.category || 'Grocery & Daily Needs'}</p>
              <div className="inline-flex items-center space-x-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span>Live & Accepting Orders</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center space-x-2 text-emerald-800 font-bold">
                <MapPin className="w-4 h-4 text-[#167a46]" />
                <span>Operating Location</span>
              </div>
              <p className="font-semibold text-slate-800 truncate">
                {(typeof requestObj?.address === 'string' ? requestObj.address : requestObj?.address?.shopAddress) ||
                  requestObj?.shop_address ||
                  vendor.address ||
                  'Registered Store Location'}
              </p>
              <p className="text-slate-500 font-mono">
                {[
                  requestObj?.address?.city || requestObj?.city || vendor.city,
                  requestObj?.address?.pincode || requestObj?.pincode || vendor.pincode
                ].filter(Boolean).join(' - ') || 'Noida, UP'}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center space-x-2 text-emerald-800 font-bold">
                <FileCheck className="w-4 h-4 text-[#167a46]" />
                <span>FSSAI & GSTIN Verification</span>
              </div>
              <p className="text-slate-800">
                <span className="text-slate-500 font-semibold">FSSAI: </span>
                <span className="font-mono font-bold">
                  {requestObj?.fssaiLicenseNumber || requestObj?.fssai_license_number || requestObj?.fssai || vendor.fssaiLicense || 'Verified / Small Vendor'}
                </span>
              </p>
              <p className="text-slate-800">
                <span className="text-slate-500 font-semibold">GSTIN: </span>
                <span className="font-mono font-bold">
                  {requestObj?.gstinNumber || requestObj?.gstin_number || requestObj?.gstin || vendor.gstin || 'Exempt / Composition Scheme'}
                </span>
              </p>
              <div className="inline-flex items-center space-x-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>Documents Verified</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center space-x-2 text-emerald-800 font-bold">
                <CreditCard className="w-4 h-4 text-[#167a46]" />
                <span>Payout Settlement Bank</span>
              </div>
              {requestObj?.bankDetails?.bankName || requestObj?.bank_name ? (
                <>
                  <p className="font-semibold text-slate-800">{requestObj?.bankDetails?.bankName || requestObj?.bank_name}</p>
                  <p className="font-mono text-slate-500">
                    A/C: •••• {(requestObj?.bankDetails?.bankAccountNumber || requestObj?.bank_account || '').slice(-4)} | IFSC: {requestObj?.bankDetails?.ifscCode || requestObj?.ifsc_code}
                  </p>
                </>
              ) : (
                <>
                  <p className="font-semibold text-slate-800">Settlement Account Active</p>
                  <p className="text-slate-500 text-[11px]">
                    Direct daily / weekly payouts enabled for Dairy store.
                  </p>
                </>
              )}
              <div className="inline-flex items-center space-x-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                <span>Active for Orders</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 border-t border-slate-200">
            <Link
              href="/"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-[#167a46] hover:bg-[#12653a] text-white font-black text-sm transition-all shadow-xl flex items-center justify-center space-x-2"
            >
              <span>Go to Overview Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/products"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-sm transition-all border border-slate-300 flex items-center justify-center space-x-2"
            >
              <span>Manage Products Catalog</span>
            </Link>
          </div>
        </div>
      ) : isPending ? (
        /* PENDING / UNDER REVIEW OVERLAY CARD */
        <div className="white-card p-8 md:p-12 max-w-3xl mx-auto space-y-8 border-2 border-amber-400 shadow-2xl relative overflow-hidden">
          <div className="text-center space-y-4">
            <div className="w-20 h-20 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto shadow-lg border-2 border-amber-300 animate-pulse">
              <Clock className="w-10 h-10" />
            </div>

            <div>
              <span className="inline-block px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-black uppercase tracking-wider mb-2">
                APPLICATION STATUS: {currentStatus}
              </span>
              <h2 className="text-2xl md:text-3xl font-black text-slate-900">
                Store Registration Under Review! ⏳
              </h2>
              <p className="text-slate-600 text-sm max-w-md mx-auto mt-2 leading-relaxed">
                Your store application and legal documents have been received by the <strong>Zippy Admin Verification Team</strong>.
              </p>
            </div>
          </div>

          {/* Verification Timeline Tracker */}
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 text-left max-w-xl mx-auto space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Verification Steps</span>
              <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-950 text-[11px] font-black uppercase">
                {currentStatus}
              </span>
            </div>

            <div className="space-y-4">
              <div className="flex items-start space-x-3 text-xs">
                <CheckCircle2 className="w-5 h-5 text-[#167a46] shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-slate-900">1. Registration Application Submitted</p>
                  <p className="text-slate-500 text-[11px]">Submitted for: {requestObj?.storeName || formData.storeName || 'Store'}</p>
                </div>
              </div>

              <div className="flex items-start space-x-3 text-xs">
                <CheckCircle2 className="w-5 h-5 text-[#167a46] shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-slate-900">2. FSSAI & GSTIN Document Upload Verification</p>
                  <p className="text-slate-500 text-[11px]">FSSAI License ({requestObj?.fssaiLicenseNumber || formData.fssaiLicenseNumber}) attached</p>
                </div>
              </div>

              <div className="flex items-start space-x-3 text-xs">
                <Clock className="w-5 h-5 text-amber-600 animate-pulse shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-amber-900">3. Zippy Admin Field Inspection & Service Area Setup</p>
                  <p className="text-amber-700 text-[11px] font-medium">Estimated completion: Within 24 Hours</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <button
              onClick={() => refetchStoreStatus()}
              disabled={isFetchingStatus}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#167a46] hover:bg-[#12653a] text-white font-black text-xs transition-all shadow-md flex items-center justify-center space-x-2"
            >
              <span>{isFetchingStatus ? 'Refreshing Status...' : 'Check / Refresh Status'}</span>
            </button>
            <Link
              href="/"
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all border border-slate-300 flex items-center justify-center space-x-1"
            >
              <span>Go to Overview Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      ) : isRejected ? (
        /* REJECTED OVERLAY CARD */
        <div className="white-card p-8 md:p-12 max-w-3xl mx-auto space-y-6 border-2 border-rose-400 shadow-2xl text-center">
          <div className="w-20 h-20 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-lg border-2 border-rose-300">
            <AlertTriangle className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <span className="px-3 py-1 rounded-full bg-rose-100 text-rose-900 text-xs font-black uppercase">
              APPLICATION REJECTED
            </span>
            <h2 className="text-2xl md:text-3xl font-black text-slate-900">Registration Needs Updates</h2>
            <p className="text-slate-600 text-xs md:text-sm max-w-md mx-auto">
              Rejection Reason: <strong className="text-rose-700">{requestObj?.rejectionReason || 'Invalid documents or location service criteria.'}</strong>
            </p>
          </div>
          <button
            onClick={() => setActiveStep(1)}
            className="px-6 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs shadow-md"
          >
            Edit & Re-submit Application
          </button>
        </div>
      ) : (
        /* STEP WIZARD CONTAINER (For NOT_REGISTERED) */
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* LEFT SIDEBAR: STEP PROGRESS WIZARD */}
          <div className="lg:col-span-1 space-y-3">
            <div className="white-card p-5 space-y-4 border-l-4 border-l-[#167a46] shadow-sm sticky top-24">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">Registration Steps</h3>

              <div className="space-y-2">
                {stepsList.map((st) => {
                  const Icon = st.icon;
                  const isActive = activeStep === st.number;
                  const isDone = activeStep > st.number;

                  return (
                    <button
                      key={st.number}
                      type="button"
                      onClick={() => setActiveStep(st.number as any)}
                      className={`w-full p-3.5 rounded-2xl text-left transition-all flex items-center space-x-3 border ${
                        isActive
                          ? 'bg-[#167a46] text-white border-[#167a46] shadow-md scale-[1.02]'
                          : isDone
                          ? 'bg-emerald-50 text-emerald-900 border-emerald-200 hover:bg-emerald-100'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                          isActive
                            ? 'bg-white text-[#167a46]'
                            : isDone
                            ? 'bg-[#167a46] text-white'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {isDone ? <Check className="w-4 h-4" /> : st.number}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold truncate">{st.title}</p>
                        <p className={`text-[10px] truncate ${isActive ? 'text-emerald-100' : 'text-slate-500'}`}>
                          {st.desc}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="pt-3 border-t border-slate-200 text-[11px] text-slate-500 space-y-1">
                <div className="flex items-center space-x-1 font-bold text-slate-700">
                  <Info className="w-3.5 h-3.5 text-[#167a46]" />
                  <span>Need Assistance?</span>
                </div>
                <p>Call Zippy Vendor Support at +91 1800-ZIPPY-STORE (09:00 AM - 08:00 PM).</p>
              </div>
            </div>
          </div>

          {/* RIGHT SIDE: SEXY MULTI-STEP FORM CARD */}
          <div className="lg:col-span-3">
            <div className="white-card p-6 md:p-8 space-y-6 shadow-md border-t-4 border-t-[#167a46]">
              {/* Form Title */}
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <div>
                  <h2 className="text-xl font-black text-slate-900">
                    Step {activeStep}: {stepsList[activeStep - 1].title}
                  </h2>
                  <p className="text-xs text-slate-500">{stepsList[activeStep - 1].desc}</p>
                </div>
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-50 text-[#167a46] border border-emerald-200">
                  Step {activeStep} of 4
                </span>
              </div>

              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* ================= STEP 1: STORE & OWNER IDENTITY ================= */}
                {activeStep === 1 && (
                  <div className="space-y-5 animate-in fade-in-50">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">Store / Business Name *</label>
                        <div className="relative">
                          <Store className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            name="storeName"
                            required
                            placeholder="e.g. Green Basket Fresh Supermarket"
                            value={formData.storeName}
                            onChange={handleChange}
                            className="custom-input w-full pl-10 pr-4 py-2.5 text-sm"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">Primary Store Category *</label>
                        <select
                          name="storeCategory"
                          value={formData.storeCategory}
                          onChange={handleChange}
                          className="custom-input w-full px-4 py-2.5 text-sm bg-white text-slate-900"
                        >
                          <option value="Grocery & Fresh Produce">Grocery & Fresh Produce</option>
                          <option value="Dairy, Bread & Eggs">Dairy, Bread & Eggs</option>
                          <option value="Fruits & Vegetables">Fruits & Vegetables</option>
                          <option value="Meat, Seafood & Eggs">Meat, Seafood & Eggs</option>
                          <option value="Bakery & Confectionery">Bakery & Confectionery</option>
                          <option value="Snacks, Munchies & Drinks">Snacks, Munchies & Drinks</option>
                          <option value="Personal Care & Household">Personal Care & Household</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">Store Description / Tagline</label>
                      <textarea
                        name="description"
                        rows={2}
                        placeholder="Briefly describe your store items (e.g. Organic fruits, daily fresh milk, packaged snacks)..."
                        value={formData.description}
                        onChange={handleChange}
                        className="custom-input w-full px-4 py-2.5 text-sm resize-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">Store Owner Full Name *</label>
                        <div className="relative">
                          <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            name="ownerName"
                            required
                            placeholder="Rahul Sharma"
                            value={formData.ownerName}
                            onChange={handleChange}
                            className="custom-input w-full pl-10 pr-4 py-2.5 text-sm"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">Primary Contact Number *</label>
                        <div className="relative">
                          <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="tel"
                            name="contactNumber"
                            required
                            placeholder="+91 98765 43210"
                            value={formData.contactNumber}
                            onChange={handleChange}
                            className="custom-input w-full pl-10 pr-4 py-2.5 text-sm"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">Vendor Email Address *</label>
                        <div className="relative">
                          <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="email"
                            name="email"
                            required
                            placeholder="vendor@example.com"
                            value={formData.email}
                            onChange={handleChange}
                            className="custom-input w-full pl-10 pr-4 py-2.5 text-sm"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">Alternate Contact Number</label>
                        <div className="relative">
                          <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="tel"
                            name="alternateNumber"
                            placeholder="+91 98111 22334"
                            value={formData.alternateNumber}
                            onChange={handleChange}
                            className="custom-input w-full pl-10 pr-4 py-2.5 text-sm"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">Store Logo Image URL</label>
                        <input
                          type="url"
                          name="storeLogo"
                          placeholder="https://example.com/logo.jpg"
                          value={formData.storeLogo}
                          onChange={handleChange}
                          className="custom-input w-full px-4 py-2.5 text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">Store Banner Image URL</label>
                        <input
                          type="url"
                          name="bannerImage"
                          placeholder="https://example.com/banner.jpg"
                          value={formData.bannerImage}
                          onChange={handleChange}
                          className="custom-input w-full px-4 py-2.5 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* ================= STEP 2: LOCATION ADDRESS ================= */}
                {activeStep === 2 && (
                  <div className="space-y-5 animate-in fade-in-50">
                    {/* 1. Quick Address Search & Autocomplete */}
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                          <Search className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Search Shop Area / Landmark (Auto-fill GPS)</span>
                        </label>
                        <span className="text-[11px] text-slate-500 font-medium">Auto-pins exact GPS</span>
                      </div>

                      <div className="relative">
                        <div className="relative">
                          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            value={searchAddressQuery}
                            onChange={(e) => handleSearchAddressInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                syncGpsFromAddress(searchAddressQuery);
                              }
                            }}
                            placeholder="e.g. Yusuf Sarai, Green Park, South Delhi 110029..."
                            className="custom-input w-full pl-10 pr-24 py-2.5 text-sm"
                          />
                          <button
                            type="button"
                            onClick={() => syncGpsFromAddress(searchAddressQuery)}
                            disabled={isLocating || !searchAddressQuery.trim()}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg bg-[#167a46] hover:bg-[#12653a] disabled:bg-slate-300 text-white text-xs font-bold transition-all shadow-xs"
                          >
                            {isSearchingAddress ? 'Searching...' : 'Locate'}
                          </button>
                        </div>

                        {/* Autocomplete Dropdown */}
                        {showSearchResults && searchResults.length > 0 && (
                          <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden max-h-60 overflow-y-auto">
                            <div className="p-2 text-[11px] font-bold text-slate-400 bg-slate-50 border-b border-slate-100 uppercase tracking-wider">
                              Matching Localities (Click to select)
                            </div>
                            {searchResults.map((item, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => selectSearchResult(item)}
                                className="w-full text-left px-4 py-2.5 text-xs hover:bg-emerald-50 border-b border-slate-100 last:border-b-0 flex items-start space-x-2 transition-colors"
                              >
                                <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                                <div>
                                  <p className="font-bold text-slate-800 line-clamp-1">{item.display_name.split(',').slice(0, 2).join(',')}</p>
                                  <p className="text-[11px] text-slate-500 line-clamp-1">{item.display_name}</p>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 2. Live GPS Status & Sync Card */}
                    <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/90 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-xl bg-[#167a46] text-white flex items-center justify-center shrink-0 shadow-sm">
                          <Navigation className={`w-5 h-5 ${isLocating ? 'animate-spin' : ''}`} />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-black text-emerald-950 uppercase tracking-wider">
                              Real-Time GPS Coordinates
                            </span>
                            {locationDetected && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-600 text-white flex items-center gap-1 shadow-xs">
                                <Check className="w-3 h-3" /> Pin Verified
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-emerald-800 font-medium mt-0.5">
                            {formData.latitude && formData.longitude
                              ? `Current: Lat ${formData.latitude}, Lng ${formData.longitude}${locationAccuracy ? ` (±${locationAccuracy}m)` : ''}`
                              : 'Pinpoint shop GPS for 10-minute instant delivery radius'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-stretch sm:self-auto flex-wrap">
                        <button
                          type="button"
                          onClick={() => syncGpsFromAddress()}
                          disabled={isLocating}
                          className="flex-1 sm:flex-initial px-3.5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black flex items-center justify-center space-x-1.5 shadow-sm transition-all active:scale-95 whitespace-nowrap"
                          title="Get exact GPS from shop address entered below"
                        >
                          <LocateFixed className={`w-4 h-4 ${isLocating ? 'animate-spin' : ''}`} />
                          <span>Match GPS to Address</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => detectCurrentLocation(true)}
                          disabled={isLocating}
                          className="flex-1 sm:flex-initial px-3 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-bold flex items-center justify-center space-x-1.5 transition-all active:scale-95 whitespace-nowrap"
                          title="Use current device Wi-Fi/GPS location"
                        >
                          <Crosshair className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
                          <span>Device GPS</span>
                        </button>
                      </div>
                    </div>

                    {geoNotice && (
                      <div className={`p-3 rounded-xl text-xs font-medium flex items-center space-x-2 ${
                        locationDetected
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}>
                        <Info className="w-4 h-4 shrink-0" />
                        <span>{geoNotice}</span>
                      </div>
                    )}

                    {/* 3. Address Text Fields */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-bold text-slate-700">Shop Building & Street Address *</label>
                        <button
                          type="button"
                          onClick={() => syncGpsFromAddress()}
                          className="text-[11px] font-bold text-emerald-700 hover:underline flex items-center gap-1"
                        >
                          <Sparkles className="w-3 h-3" /> Update GPS for this address
                        </button>
                      </div>
                      <textarea
                        name="shopAddress"
                        required
                        rows={2}
                        placeholder="e.g. Shop #14, Ground Floor, Aurobindo Marg, Yusuf Sarai Market..."
                        value={formData.shopAddress}
                        onChange={handleChange}
                        className="custom-input w-full px-4 py-2.5 text-sm resize-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">Landmark *</label>
                        <input
                          type="text"
                          name="landmark"
                          required
                          placeholder="e.g. Near Green Park Metro Station"
                          value={formData.landmark}
                          onChange={handleChange}
                          className="custom-input w-full px-4 py-2.5 text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">City *</label>
                        <input
                          type="text"
                          name="city"
                          required
                          placeholder="e.g. New Delhi"
                          value={formData.city}
                          onChange={handleChange}
                          className="custom-input w-full px-4 py-2.5 text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">Pincode *</label>
                        <input
                          type="text"
                          name="pincode"
                          required
                          placeholder="e.g. 110029"
                          value={formData.pincode}
                          onChange={handleChange}
                          className="custom-input w-full px-4 py-2.5 text-sm font-mono"
                        />
                      </div>
                    </div>

                    {/* 4. GPS Coordinates Inputs */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 border-t border-slate-200 pt-4">
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-xs font-bold text-slate-700">GPS Latitude *</label>
                          <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> Accurate GPS
                          </span>
                        </div>
                        <input
                          type="text"
                          name="latitude"
                          required
                          placeholder="e.g. 28.559634"
                          value={formData.latitude}
                          onChange={handleChange}
                          className="custom-input w-full px-4 py-2.5 text-sm font-mono"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-xs font-bold text-slate-700">GPS Longitude *</label>
                          <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> Accurate GPS
                          </span>
                        </div>
                        <input
                          type="text"
                          name="longitude"
                          required
                          placeholder="e.g. 77.206987"
                          value={formData.longitude}
                          onChange={handleChange}
                          className="custom-input w-full px-4 py-2.5 text-sm font-mono"
                        />
                      </div>
                    </div>

                    {/* 5. Live Interactive Map View */}
                    {formData.latitude && formData.longitude && !isNaN(parseFloat(formData.latitude)) && !isNaN(parseFloat(formData.longitude)) && (
                      <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm mt-3 bg-white">
                        <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-700 flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Live Shop Pin: Lat {formData.latitude}, Lng {formData.longitude}</span>
                          </span>
                          <a
                            href={`https://www.google.com/maps?q=${formData.latitude},${formData.longitude}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-emerald-700 font-bold hover:underline flex items-center gap-1"
                          >
                            <span>Open Google Maps</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                        <iframe
                          title="Store Location Map Preview"
                          width="100%"
                          height="220"
                          style={{ border: 0 }}
                          loading="lazy"
                          src={`https://www.openstreetmap.org/export/embed.html?bbox=${parseFloat(formData.longitude) - 0.007}%2C${parseFloat(formData.latitude) - 0.005}%2C${parseFloat(formData.longitude) + 0.007}%2C${parseFloat(formData.latitude) + 0.005}&layer=mapnik&marker=${formData.latitude}%2C${formData.longitude}`}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* ================= STEP 3: LEGAL & LICENSES ================= */}
                {activeStep === 3 && (
                  <div className="space-y-5 animate-in fade-in-50">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">FSSAI License Number (14 Digits) *</label>
                        <div className="relative">
                          <FileCheck className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            name="fssaiLicenseNumber"
                            required
                            maxLength={14}
                            placeholder="11521034000892"
                            value={formData.fssaiLicenseNumber}
                            onChange={handleChange}
                            className="custom-input w-full pl-10 pr-4 py-2.5 text-sm font-mono"
                          />
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">Required for food & grocery selling.</p>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">FSSAI Expiry Date *</label>
                        <div className="relative">
                          <Calendar className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="date"
                            name="fssaiExpiryDate"
                            required
                            value={formData.fssaiExpiryDate}
                            onChange={handleChange}
                            className="custom-input w-full pl-10 pr-4 py-2.5 text-sm"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">GSTIN Registration Number *</label>
                        <div className="relative">
                          <ShieldCheck className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            name="gstinNumber"
                            required
                            placeholder="07AAAAA0000A1Z5"
                            value={formData.gstinNumber}
                            onChange={handleChange}
                            className="custom-input w-full pl-10 pr-4 py-2.5 text-sm uppercase font-mono"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">Business PAN Card Number *</label>
                        <input
                          type="text"
                          name="panNumber"
                          required
                          placeholder="ABCDE1234F"
                          value={formData.panNumber}
                          onChange={handleChange}
                          className="custom-input w-full px-4 py-2.5 text-sm uppercase font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">Business Ownership Entity Type</label>
                      <select
                        name="businessType"
                        value={formData.businessType}
                        onChange={handleChange}
                        className="custom-input w-full px-4 py-2.5 text-sm bg-white"
                      >
                        <option value="Sole Proprietorship">Sole Proprietorship</option>
                        <option value="Partnership Firm">Partnership Firm</option>
                        <option value="Private Limited Company">Private Limited Company (Pvt Ltd)</option>
                        <option value="LLP">Limited Liability Partnership (LLP)</option>
                      </select>
                    </div>

                    {/* File Upload Placeholders */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-200 pt-4">
                      <div className="p-4 rounded-2xl bg-slate-50 border border-dashed border-slate-300 flex items-center space-x-3">
                        <Upload className="w-6 h-6 text-[#167a46] shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-800">FSSAI Certificate PDF</p>
                          <p className="text-[11px] text-emerald-700 font-medium truncate">{formData.fssaiDocName}</p>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-1 rounded-md">
                          Attached
                        </span>
                      </div>

                      <div className="p-4 rounded-2xl bg-slate-50 border border-dashed border-slate-300 flex items-center space-x-3">
                        <Upload className="w-6 h-6 text-[#167a46] shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-800">GST Registration PDF</p>
                          <p className="text-[11px] text-emerald-700 font-medium truncate">{formData.gstDocName}</p>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-1 rounded-md">
                          Attached
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* ================= STEP 4: BANK SETTLEMENT ================= */}
                {activeStep === 4 && (
                  <div className="space-y-5 animate-in fade-in-50">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">Account Holder Name *</label>
                        <input
                          type="text"
                          name="accountHolderName"
                          required
                          placeholder="Rahul Sharma"
                          value={formData.accountHolderName}
                          onChange={handleChange}
                          className="custom-input w-full px-4 py-2.5 text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">Bank Name *</label>
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
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">Bank Account Number *</label>
                        <div className="relative">
                          <CreditCard className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            name="bankAccountNumber"
                            required
                            placeholder="91823456789012"
                            value={formData.bankAccountNumber}
                            onChange={handleChange}
                            className="custom-input w-full pl-10 pr-4 py-2.5 text-sm font-mono"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">Confirm Account Number *</label>
                        <div className="relative">
                          <CreditCard className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            name="confirmBankAccountNumber"
                            required
                            placeholder="91823456789012"
                            value={formData.confirmBankAccountNumber}
                            onChange={handleChange}
                            className="custom-input w-full pl-10 pr-4 py-2.5 text-sm font-mono"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">Bank IFSC Code *</label>
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

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">Account Type</label>
                        <select
                          name="accountType"
                          value={formData.accountType}
                          onChange={handleChange}
                          className="custom-input w-full px-4 py-2.5 text-sm bg-white"
                        >
                          <option value="Current">Current Account</option>
                          <option value="Savings">Savings Account</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">UPI ID (Optional)</label>
                        <input
                          type="text"
                          name="upiId"
                          placeholder="zippystore@hdfcbank"
                          value={formData.upiId}
                          onChange={handleChange}
                          className="custom-input w-full px-4 py-2.5 text-sm font-mono"
                        />
                      </div>
                    </div>

                    <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl text-xs text-emerald-900 space-y-1.5">
                      <div className="font-bold flex items-center space-x-1.5 text-[#167a46]">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Ready to submit store request for official verification</span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        Your store registration will be sent to Zippy Admin for verification. Once approved, your store will become live for receiving customer orders!
                      </p>
                    </div>
                  </div>
                )}

                {/* FORM WIZARD FOOTER NAVIGATION BUTTONS */}
                <div className="border-t border-slate-200 pt-5 flex items-center justify-between">
                  {activeStep > 1 ? (
                    <button
                      type="button"
                      onClick={handlePrevStep}
                      className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-bold flex items-center space-x-1.5 transition-all"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Previous Step</span>
                    </button>
                  ) : (
                    <div />
                  )}

                  {activeStep < 4 ? (
                    <button
                      type="button"
                      onClick={handleNextStep}
                      className="px-6 py-3 rounded-xl bg-[#167a46] hover:bg-[#12653a] text-white font-bold text-xs shadow-md flex items-center space-x-1.5 transition-all"
                    >
                      <span>Proceed to Step {activeStep + 1}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={isSubmittingApi}
                      className="px-8 py-3.5 rounded-xl bg-[#167a46] hover:bg-[#12653a] text-white font-black text-sm shadow-xl flex items-center space-x-2 transition-all active:scale-[0.99]"
                    >
                      <span>{isSubmittingApi ? 'Submitting Application...' : 'Submit Store Request for Approval'}</span>
                      <Sparkles className="w-4 h-4 text-emerald-300" />
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
