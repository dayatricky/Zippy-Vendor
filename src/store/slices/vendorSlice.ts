import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { VendorProfile, CategoryItem, Product, Order, PayoutRequest, OrderStatus } from '../useVendorStore';

interface VendorState {
  vendor: VendorProfile;
  categories: CategoryItem[];
  products: Product[];
  orders: Order[];
  payouts: PayoutRequest[];
  isStoreModalOpen: boolean;
}

const initialState: VendorState = {
  isStoreModalOpen: false,
  vendor: {
    id: '',
    storeName: '',
    ownerName: '',
    email: '',
    phone: '',
    category: '',
    address: '',
    city: '',
    pincode: '',
    fssaiLicense: '',
    gstin: '',
    bankName: '',
    bankAccount: '',
    ifscCode: '',
    bannerImage: '',
    operatingHours: '06:00 AM - 11:00 PM',
    approvalStatus: 'NOT_REGISTERED',
    isOpen: true,
    commissionRate: 0.1, // 10%
  },
  categories: [],
  products: [],
  orders: [],
  payouts: [],
};

const vendorSlice = createSlice({
  name: 'vendor',
  initialState,
  reducers: {
    setStoreModalOpen: (state, action: PayloadAction<boolean>) => {
      state.isStoreModalOpen = action.payload;
    },
    toggleStoreOpen: (state) => {
      state.vendor.isOpen = !state.vendor.isOpen;
    },
    updateVendorProfile: (state, action: PayloadAction<Partial<VendorProfile>>) => {
      state.vendor = { ...state.vendor, ...action.payload };
    },
    submitStoreRegistration: (state, action: PayloadAction<Partial<VendorProfile>>) => {
      state.isStoreModalOpen = false;
      state.vendor = {
        ...state.vendor,
        ...action.payload,
        approvalStatus: 'PENDING_APPROVAL',
      };
    },
    setApprovalStatus: (state, action: PayloadAction<'NOT_REGISTERED' | 'PENDING_APPROVAL' | 'APPROVED'>) => {
      state.vendor.approvalStatus = action.payload;
    },
    addCategory: (state, action: PayloadAction<Omit<CategoryItem, 'id' | 'productCount'>>) => {
      const newCat: CategoryItem = {
        id: `cat-${Date.now()}`,
        productCount: 0,
        ...action.payload,
      };
      state.categories.unshift(newCat);
    },
    toggleCategoryStatus: (state, action: PayloadAction<string>) => {
      const cat = state.categories.find((c) => c.id === action.payload);
      if (cat) cat.isActive = !cat.isActive;
    },
    deleteCategory: (state, action: PayloadAction<string>) => {
      state.categories = state.categories.filter((c) => c.id !== action.payload);
    },
    addProduct: (state, action: PayloadAction<Omit<Product, 'id'>>) => {
      const newProd: Product = {
        id: `p-${Date.now()}`,
        ...action.payload,
      };
      state.products.unshift(newProd);
    },
    toggleProductAvailability: (state, action: PayloadAction<string>) => {
      const prod = state.products.find((p) => p.id === action.payload);
      if (prod) prod.isAvailable = !prod.isAvailable;
    },
    updateOrderStatus: (state, action: PayloadAction<{ orderId: string; nextStatus: OrderStatus }>) => {
      const ord = state.orders.find((o) => o.id === action.payload.orderId);
      if (ord) ord.status = action.payload.nextStatus;
    },
    requestPayout: (state, action: PayloadAction<number>) => {
      const amount = action.payload;
      const commission = amount * state.vendor.commissionRate;
      const net = amount - commission;
      const newPayout: PayoutRequest = {
        id: `pay-${Date.now()}`,
        amount,
        commissionDeducted: commission,
        netAmount: net,
        date: new Date().toISOString().split('T')[0],
        status: 'PENDING',
        bankAccount: `${state.vendor.bankAccount.slice(-4)}`,
      };
      state.payouts.unshift(newPayout);
    },
  },
});

export const {
  setStoreModalOpen,
  toggleStoreOpen,
  updateVendorProfile,
  submitStoreRegistration,
  setApprovalStatus,
  addCategory,
  toggleCategoryStatus,
  deleteCategory,
  addProduct,
  toggleProductAvailability,
  updateOrderStatus,
  requestPayout,
} = vendorSlice.actions;

export default vendorSlice.reducer;
