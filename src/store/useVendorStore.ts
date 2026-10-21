import { create } from 'zustand';

export type StoreApprovalStatus = 'NOT_REGISTERED' | 'PENDING_APPROVAL' | 'APPROVED';

export interface VendorProfile {
  id: string;
  storeName: string;
  ownerName: string;
  email: string;
  phone: string;
  category: string;
  address: string;
  city: string;
  pincode: string;
  fssaiLicense: string;
  gstin: string;
  bankName: string;
  bankAccount: string;
  ifscCode: string;
  bannerImage: string;
  operatingHours: string;
  approvalStatus: StoreApprovalStatus;
  isOpen: boolean;
  commissionRate: number; // 0.10 for 10%
  latitude?: string;
  longitude?: string;
}

export interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  image: string;
  productCount: number;
  isActive: boolean;
  description: string;
}

export type ProductStatus = 'PENDING' | 'ACTIVE' | 'INACTIVE' | 'REJECTED';

export interface Product {
  id: string;
  name: string;
  price: number;
  mrp: number;
  image: string;
  category: string;
  categoryId?: string;
  stock: number;
  isAvailable: boolean;
  unit: string;
  status?: ProductStatus | string;
  rejectionReason?: string;
  sku?: string;
  barcode?: string;
  brand_name?: string;
}

export interface OrderItem {
  id: string;
  productName: string;
  quantity: number;
  price: number;
  image: string;
}

export type OrderStatus = 'NEW' | 'PACKING' | 'READY_FOR_PICKUP' | 'COMPLETED';

export interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  address: string;
  items: OrderItem[];
  totalAmount: number;
  status: OrderStatus;
  createdAt: string;
  timeAgo: string;
}

export interface PayoutRequest {
  id: string;
  amount: number;
  commissionDeducted: number;
  netAmount: number;
  date: string;
  status: 'PROCESSED' | 'PENDING';
  bankAccount: string;
}

interface VendorStore {
  vendor: VendorProfile;
  categories: CategoryItem[];
  products: Product[];
  orders: Order[];
  payouts: PayoutRequest[];
  isLoggedIn: boolean;
  isStoreModalOpen: boolean;

  // Actions
  setStoreModalOpen: (open: boolean) => void;
  toggleStoreOpen: () => void;
  updateVendorProfile: (updated: Partial<VendorProfile>) => void;
  registerUserAccount: (name: string, email: string, phone: string) => void;
  submitStoreRegistration: (data: Partial<VendorProfile>) => void;
  loginAsApproved: () => void;
  loginAsPending: () => void;
  loginAsNotRegistered: () => void;

  // Category Actions
  addCategory: (data: Omit<CategoryItem, 'id' | 'productCount'>) => void;
  toggleCategoryStatus: (id: string) => void;
  deleteCategory: (id: string) => void;

  // Product Actions
  addProduct: (product: Omit<Product, 'id'>) => void;
  updateProduct: (id: string, updated: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  toggleProductAvailability: (id: string) => void;
  updateOrderStatus: (orderId: string, nextStatus: OrderStatus) => void;
  requestPayout: (amount: number) => void;
}

export const useVendorStore = create<VendorStore>((set, get) => ({
  isLoggedIn: true,
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

  setStoreModalOpen: (open) => set({ isStoreModalOpen: open }),

  toggleStoreOpen: () =>
    set((state) => ({
      vendor: { ...state.vendor, isOpen: !state.vendor.isOpen },
    })),

  updateVendorProfile: (updated) =>
    set((state) => ({
      vendor: { ...state.vendor, ...updated },
    })),

  registerUserAccount: (name, email, phone) =>
    set((state) => ({
      isLoggedIn: true,
      vendor: {
        ...state.vendor,
        ownerName: name,
        email: email,
        phone: phone,
        approvalStatus: 'NOT_REGISTERED',
      },
    })),

  submitStoreRegistration: (data) =>
    set((state) => ({
      isStoreModalOpen: false,
      vendor: {
        ...state.vendor,
        ...data,
        approvalStatus: 'PENDING_APPROVAL',
      },
    })),

  loginAsApproved: () =>
    set((state) => ({
      isLoggedIn: true,
      vendor: { ...state.vendor, approvalStatus: 'APPROVED' },
    })),

  loginAsPending: () =>
    set((state) => ({
      isLoggedIn: true,
      vendor: { ...state.vendor, approvalStatus: 'PENDING_APPROVAL' },
    })),

  loginAsNotRegistered: () =>
    set((state) => ({
      isLoggedIn: true,
      vendor: {
        ...state.vendor,
        storeName: 'My Unregistered Store',
        approvalStatus: 'NOT_REGISTERED',
      },
    })),

  addCategory: (catData) =>
    set((state) => {
      const newCat: CategoryItem = {
        id: `cat-${Date.now()}`,
        productCount: 0,
        ...catData,
      };
      return { categories: [newCat, ...state.categories] };
    }),

  toggleCategoryStatus: (id) =>
    set((state) => ({
      categories: state.categories.map((c) =>
        c.id === id ? { ...c, isActive: !c.isActive } : c
      ),
    })),

  deleteCategory: (id) =>
    set((state) => ({
      categories: state.categories.filter((c) => c.id !== id),
    })),

  addProduct: (productData) =>
    set((state) => {
      const newProd: Product = {
        id: `p-${Date.now()}`,
        ...productData,
      };
      return { products: [newProd, ...state.products] };
    }),

  updateProduct: (id, updated) =>
    set((state) => ({
      products: state.products.map((p) =>
        p.id === id ? { ...p, ...updated } : p
      ),
    })),

  deleteProduct: (id) =>
    set((state) => ({
      products: state.products.filter((p) => p.id !== id),
    })),

  toggleProductAvailability: (id) =>
    set((state) => ({
      products: state.products.map((p) =>
        p.id === id ? { ...p, isAvailable: !p.isAvailable } : p
      ),
    })),

  updateOrderStatus: (orderId, nextStatus) =>
    set((state) => ({
      orders: state.orders.map((ord) =>
        ord.id === orderId ? { ...ord, status: nextStatus } : ord
      ),
    })),

  requestPayout: (amount) =>
    set((state) => {
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
      return { payouts: [newPayout, ...state.payouts] };
    }),
}));
