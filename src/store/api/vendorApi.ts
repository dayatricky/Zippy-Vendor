import { createApi, fetchBaseQuery, BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query/react';
import { VendorProfile, CategoryItem, Product, Order, PayoutRequest } from '../useVendorStore';

const rawBaseUrl = (process.env.NEXT_PUBLIC_API_URL || 'https://zippy-api.elyriasoft.com/api/v1').replace(/\/+$/, '');
export const API_BASE_URL = rawBaseUrl.endsWith('/api/v1')
  ? rawBaseUrl
  : rawBaseUrl.endsWith('/api')
  ? `${rawBaseUrl}/v1`
  : `${rawBaseUrl}/api/v1`;

export const getBackendBaseUrl = (): string => {
  const origin = API_BASE_URL.replace(/\/api(\/v1)?\/?$/, '');
  return origin || 'http://192.168.1.66:5014';
};

export const resolveImageUrl = (
  url?: string | null,
  fallback = 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&q=80'
): string => {
  if (!url || typeof url !== 'string' || !url.trim()) return fallback;
  const trimmed = url.trim();
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:')
  ) {
    return trimmed;
  }
  if (trimmed === '/zippy-logo-crop.jpg' || trimmed === 'zippy-logo-crop.jpg' || trimmed.startsWith('/icons/')) {
    return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  }
  const backendBase = getBackendBaseUrl();
  const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${backendBase}${cleanPath}`;
};

export const getReturnEvidenceUrl = (itemId: string, filename: string): string => {
  if (!filename || typeof filename !== 'string') return '';
  const trimmed = filename.trim();
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:')
  ) {
    return trimmed;
  }

  const backendBase = getBackendBaseUrl();

  // If already a full relative API path (e.g. /api/v1/vendor/returns/items/...)
  if (trimmed.startsWith('/api/') || trimmed.startsWith('api/')) {
    const clean = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
    return `${backendBase}${clean}`;
  }

  // If contains evidence path
  if (trimmed.includes('/evidence/')) {
    const clean = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
    return `${backendBase}${clean.startsWith('/api') ? clean : `/api/v1${clean}`}`;
  }

  const clean = trimmed.replace(/^\/+/, '');
  return `${API_BASE_URL}/vendor/returns/items/${itemId}/evidence/${encodeURIComponent(clean)}`;
};

export interface VendorSignupPayload {
  email: string;
  password?: string;
  fullName: string;
  phoneNumber: string;
  deviceId?: string;
  platform?: string;
}

export interface SendOtpPayload {
  email: string;
}

export interface VerifyOtpPayload {
  email: string;
  otp: string;
  deviceId?: string;
  platform?: string;
}

export interface VendorLoginPayload {
  email: string;
  password?: string;
  deviceId?: string;
  platform?: string;
}

export interface BankDetailsPayload {
  accountHolderName: string;
  bankName: string;
  bankAccountNumber: string;
  ifscCode: string;
  accountType: 'Current' | 'Savings' | string;
  upiId?: string;
}

export interface BankDetailsData {
  accountHolderName?: string;
  account_holder_name?: string;
  bankName?: string;
  bank_name?: string;
  bankAccountNumber?: string;
  bank_account_number?: string;
  ifscCode?: string;
  ifsc_code?: string;
  accountType?: string;
  account_type?: string;
  upiId?: string;
  upi_id?: string;
  [key: string]: any;
}

export interface BankDetailsResponse {
  success?: boolean;
  message?: string;
  data?: BankDetailsData;
  accountHolderName?: string;
  account_holder_name?: string;
  bankName?: string;
  bank_name?: string;
  bankAccountNumber?: string;
  bank_account_number?: string;
  ifscCode?: string;
  ifsc_code?: string;
  accountType?: string;
  account_type?: string;
  upiId?: string;
  upi_id?: string;
  [key: string]: any;
}

const rawBaseQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  prepareHeaders: (headers) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('zippy_vendor_token');
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
    }
    return headers;
  },
});

const notifySessionExpired = (message: string) => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('zippy_vendor_token');
    localStorage.removeItem('zippy_vendor_refresh_token');
    const pathname = window.location.pathname;
    if (!pathname.startsWith('/login') && !pathname.startsWith('/register')) {
      sessionStorage.setItem('zippy_auth_message', message);
      window.dispatchEvent(
        new CustomEvent('zippy_session_expired', {
          detail: { message },
        })
      );
    }
  }
};

const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  let result = await rawBaseQuery(args, api, extraOptions);

  const status = result.error?.status;
  const errorData = result.error?.data as any;
  const errorMsg = String(errorData?.msg || errorData?.message || errorData?.error || '').toLowerCase();

  const isTokenExpired =
    status === 401 ||
    errorMsg.includes('token has expired') ||
    errorMsg.includes('jwt expired') ||
    errorMsg.includes('token expired') ||
    errorMsg.includes('unauthorized') ||
    errorMsg.includes('invalid token');

  if (isTokenExpired) {
    if (typeof window !== 'undefined') {
      const refreshToken = localStorage.getItem('zippy_vendor_refresh_token');
      if (refreshToken) {
        try {
          const refreshResult = await rawBaseQuery(
            {
              url: '/vendor/auth/refresh-token',
              method: 'POST',
              body: { refreshToken },
            },
            api,
            extraOptions
          );

          const refreshData = refreshResult.data as any;
          const dataPayload = refreshData?.data || refreshData;
          const newAccessToken =
            dataPayload?.accessToken ||
            dataPayload?.token ||
            refreshData?.accessToken ||
            refreshData?.token;
          const newRefreshToken =
            dataPayload?.refreshToken ||
            refreshData?.refreshToken;

          if (newAccessToken) {
            localStorage.setItem('zippy_vendor_token', newAccessToken);
            if (newRefreshToken) {
              localStorage.setItem('zippy_vendor_refresh_token', newRefreshToken);
            }
            // Retry the original query with the refreshed access token
            result = await rawBaseQuery(args, api, extraOptions);
          } else {
            notifySessionExpired('Authentication token has expired. Please log in again to continue.');
          }
        } catch (refreshErr) {
          console.error('Auto token refresh failed in RTK Query:', refreshErr);
          notifySessionExpired('Authentication token has expired. Please log in again to continue.');
        }
      } else {
        notifySessionExpired('Authentication token has expired. Please log in again to continue.');
      }
    }
  }

  return result;
};

export const vendorApi = createApi({
  reducerPath: 'vendorApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Vendor', 'Products', 'Categories', 'Orders', 'Payouts', 'Returns', 'Withdrawals', 'BankDetails'],
  endpoints: (builder) => ({
    // Auth Endpoints matching Swagger Specs
    vendorSignup: builder.mutation<{ success: boolean; message: string; data?: any }, VendorSignupPayload>({
      query: (body) => ({
        url: '/vendor/auth/signup',
        method: 'POST',
        body: {
          ...body,
          deviceId: body.deviceId || 'vendor-device-123',
          platform: body.platform || 'web',
        },
      }),
    }),

    sendOtp: builder.mutation<{ success: boolean; message: string }, SendOtpPayload>({
      query: (body) => ({
        url: '/vendor/auth/send-otp',
        method: 'POST',
        body,
      }),
    }),

    verifyOtp: builder.mutation<{ success: boolean; message: string; data?: { accessToken: string; refreshToken: string; user: any } }, VerifyOtpPayload>({
      query: (body) => ({
        url: '/vendor/auth/verify-otp',
        method: 'POST',
        body: {
          ...body,
          deviceId: body.deviceId || 'vendor-device-123',
          platform: body.platform || 'web',
        },
      }),
    }),

    vendorLogin: builder.mutation<{ success: boolean; data?: { accessToken: string; refreshToken: string; user: any } }, VendorLoginPayload>({
      query: (body) => ({
        url: '/vendor/auth/login',
        method: 'POST',
        body: {
          ...body,
          deviceId: body.deviceId || 'vendor-device-123',
          platform: body.platform || 'web',
        },
      }),
    }),

    refreshToken: builder.mutation<{ success: boolean; data?: { accessToken: string; refreshToken: string } }, { refreshToken: string }>({
      query: (body) => ({
        url: '/vendor/auth/refresh-token',
        method: 'POST',
        body,
      }),
    }),

    vendorLogout: builder.mutation<{ success: boolean; message?: string }, void>({
      query: () => ({
        url: '/vendor/auth/logout',
        method: 'POST',
      }),
    }),

    // Store Request Endpoints matching Swagger Spec (/vendor/store-request)
    getStoreRequest: builder.query<{ success: boolean; data: any }, void>({
      query: () => '/vendor/store-request',
      providesTags: ['Vendor'],
    }),

    submitStoreRequest: builder.mutation<{ success: boolean; message: string; data?: any }, any>({
      query: (body) => ({
        url: '/vendor/store-request',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Vendor'],
    }),

    // Vendor Profile & Store Registration
    getVendorProfile: builder.query<{ data: VendorProfile }, void>({
      query: () => '/vendor/profile',
      providesTags: ['Vendor'],
    }),

    updateVendorProfile: builder.mutation<{ success: boolean; data: VendorProfile }, Partial<VendorProfile>>({
      query: (body) => ({
        url: '/vendor/profile',
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['Vendor'],
    }),

    registerStore: builder.mutation<{ success: boolean; message: string }, Partial<VendorProfile>>({
      query: (body) => ({
        url: '/vendor/store/register',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Vendor'],
    }),

    // Categories Endpoints matching Swagger Spec (/vendor/categories)
    getCategories: builder.query<{ success?: boolean; data: any }, { status?: string; search?: string; page?: number; limit?: number } | void>({
      query: (params) => ({
        url: '/vendor/categories',
        params: params || {},
      }),
      providesTags: ['Categories'],
    }),

    addCategory: builder.mutation<
      { success: boolean; message?: string; data?: any },
      { name: string; slug: string; description?: string; image_url?: string; display_order?: number; status?: 'ACTIVE' | 'INACTIVE' }
    >({
      query: (body) => ({
        url: '/vendor/categories',
        method: 'POST',
        body: {
          display_order: 1,
          status: 'ACTIVE',
          ...body,
        },
      }),
      invalidatesTags: ['Categories'],
    }),

    updateCategory: builder.mutation<
      { success: boolean; message?: string; data?: any },
      { id: string; name?: string; slug?: string; description?: string; image_url?: string; display_order?: number; status?: 'ACTIVE' | 'INACTIVE' }
    >({
      query: ({ id, ...body }) => ({
        url: `/vendor/categories/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['Categories'],
    }),

    deleteCategory: builder.mutation<{ success: boolean; message?: string }, string>({
      query: (id) => ({
        url: `/vendor/categories/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Categories'],
    }),

    // Products Endpoints matching Swagger Spec (/vendor/products)
    getProducts: builder.query<{ success?: boolean; data: any }, { search?: string; category_id?: string; status?: string; sort_by?: string; sort_order?: string; page?: number; limit?: number } | void>({
      query: (params) => ({
        url: '/vendor/products',
        params: params || {},
      }),
      providesTags: ['Products'],
    }),

    addProduct: builder.mutation<
      { success: boolean; message?: string; data?: any },
      {
        category_id: string;
        name: string;
        slug?: string;
        description?: string;
        brand_name?: string;
        sku?: string;
        barcode?: string;
        unit?: string;
        pack_size?: string;
        mrp?: number;
        selling_price?: number;
        price?: number;
        stock?: number;
        stock_quantity?: number;
        images?: Array<{ image_url: string; display_order?: number; is_primary?: boolean }>;
        status?: 'ACTIVE' | 'INACTIVE' | 'PENDING' | string;
      }
    >({
      query: (rawBody) => {
        const { price, stock, selling_price, ...cleanBody } = rawBody as any;
        const generatedSlug = cleanBody.slug || cleanBody.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
        
        // Exact 1:1 Swagger structure for images: Array<{ image_url, display_order, is_primary }>
        const defaultPlaceholder = 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&q=80';
        const imagesPayload = Array.isArray(cleanBody.images) && cleanBody.images.length > 0
          ? cleanBody.images.map((img: any, idx: number) => ({
              image_url: String(img.image_url || img.url || img.path || defaultPlaceholder),
              display_order: Number(img.display_order ?? idx),
              is_primary: Boolean(img.is_primary ?? idx === 0),
            }))
          : [
              {
                image_url: cleanBody.image ? String(cleanBody.image) : defaultPlaceholder,
                display_order: 0,
                is_primary: true,
              },
            ];

        // Backend NestJS DTO strictly only has 'mrp' (forbidNonWhitelisted: true).
        // Neither 'price' nor 'selling_price' is allowed in the payload.
        const effectiveMrp = Number(cleanBody.mrp ?? selling_price ?? price ?? cleanBody.price ?? 0);
        const finalStock = Number(cleanBody.stock_quantity ?? stock ?? 100);

        return {
          url: '/vendor/products',
          method: 'POST',
          body: {
            category_id: String(cleanBody.category_id),
            name: String(cleanBody.name),
            slug: generatedSlug,
            description: String(cleanBody.description || cleanBody.name),
            brand_name: String(cleanBody.brand_name || 'Generic'),
            sku: String(cleanBody.sku || `SKU-${Date.now()}`),
            barcode: String(cleanBody.barcode || `${Math.floor(1000000000 + Math.random() * 9000000000)}`),
            unit: String(cleanBody.unit || '1 kg'),
            pack_size: String(cleanBody.pack_size || cleanBody.unit || '1 kg'),
            mrp: effectiveMrp,
            stock_quantity: finalStock,
            images: imagesPayload,
            status: cleanBody.status || 'ACTIVE',
          },
        };
      },
      invalidatesTags: ['Products'],
    }),

    updateProduct: builder.mutation<
      { success: boolean; message?: string; data?: any },
      {
        id: string;
        category_id?: string;
        name?: string;
        slug?: string;
        description?: string;
        brand_name?: string;
        sku?: string;
        barcode?: string;
        unit?: string;
        pack_size?: string;
        mrp?: number;
        selling_price?: number;
        price?: number;
        stock?: number;
        stock_quantity?: number;
        images?: Array<{ image_url: string; display_order?: number; is_primary?: boolean }>;
        status?: 'ACTIVE' | 'INACTIVE' | 'PENDING' | string;
      }
    >({
      query: ({ id, price, stock, selling_price, ...body }) => {
        // Build strictly whitelisted body matching UpdateProductDto
        const patchBody: Record<string, any> = {};
        if (body.category_id !== undefined) patchBody.category_id = String(body.category_id);
        if (body.name !== undefined) patchBody.name = String(body.name);
        if (body.slug !== undefined) patchBody.slug = String(body.slug);
        if (body.description !== undefined) patchBody.description = String(body.description);
        if (body.brand_name !== undefined) patchBody.brand_name = String(body.brand_name);
        if (body.sku !== undefined) patchBody.sku = String(body.sku);
        if (body.barcode !== undefined) patchBody.barcode = String(body.barcode);
        if (body.unit !== undefined) patchBody.unit = String(body.unit);
        if (body.pack_size !== undefined) patchBody.pack_size = String(body.pack_size);
        if (body.mrp !== undefined || selling_price !== undefined || price !== undefined) {
          patchBody.mrp = Number(body.mrp ?? selling_price ?? price);
        }
        if (body.stock_quantity !== undefined || stock !== undefined) {
          patchBody.stock_quantity = Number(body.stock_quantity ?? stock);
        }
        if (body.images !== undefined) patchBody.images = body.images;
        if (body.status !== undefined) patchBody.status = body.status;

        return {
          url: `/vendor/products/${id}`,
          method: 'PATCH',
          body: patchBody,
        };
      },
      invalidatesTags: ['Products'],
    }),

    deleteProduct: builder.mutation<{ success: boolean; message?: string }, string>({
      query: (id) => ({
        url: `/vendor/products/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Products'],
    }),

    // Product Images Upload & Patch matching Swagger UI Specs:
    // 1. POST /api/v1/vendor/products/{productId}/images (multipart/form-data: file, image_url, display_order, is_primary)
    // 2. PATCH /api/v1/vendor/products/{productId}/images/{imageId} (multipart/form-data: file, image_url, display_order, is_primary)
    uploadProductImage: builder.mutation<
      { success: boolean; data?: any; image_url?: string; url?: string; id?: string; message?: string },
      { productId: string; file?: File; image_url?: string; formData?: FormData; is_primary?: boolean; display_order?: number }
    >({
      query: ({ productId, file, image_url, formData, is_primary, display_order }) => {
        let body = formData;
        if (!body) {
          body = new FormData();
          if (file) {
            body.append('file', file); // Strict Swagger binary field: exactly 1 file
          }
          if (image_url) {
            body.append('image_url', image_url);
          }
          if (is_primary !== undefined) {
            body.append('is_primary', String(is_primary));
          }
          if (display_order !== undefined) {
            body.append('display_order', String(display_order));
          }
        }
        return {
          url: `/vendor/products/${productId}/images`,
          method: 'POST',
          body,
        };
      },
      invalidatesTags: ['Products'],
    }),

    updateProductImage: builder.mutation<
      { success: boolean; data?: any; message?: string },
      { productId: string; imageId: string; file?: File; image_url?: string; formData?: FormData; is_primary?: boolean; display_order?: number }
    >({
      query: ({ productId, imageId, file, image_url, formData, is_primary, display_order }) => {
        let body = formData;
        if (!body) {
          body = new FormData(); // Swagger requires multipart/form-data for PATCH
          if (file) {
            body.append('file', file); // Strict Swagger binary field: exactly 1 file
          }
          if (image_url) {
            body.append('image_url', image_url);
          }
          if (is_primary !== undefined) {
            body.append('is_primary', String(is_primary));
          }
          if (display_order !== undefined) {
            body.append('display_order', String(display_order));
          }
        }
        return {
          url: `/vendor/products/${productId}/images/${imageId}`,
          method: 'PATCH',
          body,
        };
      },
      invalidatesTags: ['Products'],
    }),

    deleteProductImage: builder.mutation<
      { success: boolean; message?: string },
      { productId: string; imageId: string }
    >({
      query: ({ productId, imageId }) => ({
        url: `/vendor/products/${productId}/images/${imageId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Products'],
    }),

    // Category Image Upload (Optional support for backend local category image upload)
    uploadCategoryImage: builder.mutation<
      { success: boolean; data?: any; image_url?: string; url?: string; message?: string },
      { categoryId: string; file?: File; formData?: FormData }
    >({
      query: ({ categoryId, file, formData }) => {
        let body = formData;
        if (!body && file) {
          body = new FormData();
          body.append('file', file);
        }
        return {
          url: `/vendor/categories/${categoryId}/images`,
          method: 'POST',
          body,
        };
      },
      invalidatesTags: ['Categories'],
    }),

    // Orders Stream Endpoints matching Swagger Spec (/vendor/orders)
    getOrders: builder.query<
      { success?: boolean; data: any; items?: any; orders?: any },
      {
        status?: string;
        order_number?: string;
        search?: string;
        store_id?: string;
        vendor_id?: string;
        date_from?: string;
        date_to?: string;
        page?: number;
        limit?: number;
      } | void
    >({
      query: (params) => ({
        url: '/vendor/orders',
        params: params || {},
      }),
      providesTags: ['Orders'],
    }),

    getOrderDetails: builder.query<{ success?: boolean; data: any }, string>({
      query: (orderId) => `/vendor/orders/${orderId}`,
      providesTags: (_result, _error, id) => [{ type: 'Orders', id }],
    }),

    updateOrderStatus: builder.mutation<
      { success: boolean; data: any; message?: string },
      { orderId: string; status: string; remarks?: string }
    >({
      query: ({ orderId, status, remarks }) => ({
        url: `/vendor/orders/${orderId}/status`,
        method: 'PATCH',
        body: {
          status,
          remarks: remarks || `Status updated to ${status}`,
        },
      }),
      invalidatesTags: ['Orders'],
    }),

    // ==========================================
    // VENDOR WITHDRAWALS (Swagger Specifications)
    // 1. GET /api/v1/vendor/withdrawals/balance
    // 2. GET /api/v1/vendor/withdrawals/history
    // 3. POST /api/v1/vendor/withdrawals/request
    // ==========================================

    // 1. GET /api/v1/vendor/withdrawals/balance — eligible balance for withdrawal
    getWithdrawalBalance: builder.query<
      {
        success?: boolean;
        balance?: number | string;
        eligible_balance?: number | string;
        available_balance?: number | string;
        total_amount?: number | string;
        amount?: number | string;
        data?: any;
      },
      void
    >({
      query: () => '/vendor/withdrawals/balance',
      providesTags: ['Withdrawals', 'Payouts'],
    }),

    // 2. GET /api/v1/vendor/withdrawals/history — withdrawal history and order records
    getWithdrawalHistory: builder.query<
      {
        success?: boolean;
        data?: any;
        pending?: {
          total_amount?: string | number;
          records?: any[];
        };
        withdrawals?: any[];
        requests?: any[];
        records?: any[];
      },
      void
    >({
      query: () => '/vendor/withdrawals/history',
      providesTags: ['Withdrawals', 'Payouts'],
    }),

    // 3. POST /api/v1/vendor/withdrawals/request — submit withdrawal request (Strictly { "amount": 500 })
    requestWithdrawal: builder.mutation<
      { success: boolean; data?: any; message?: string },
      {
        amount: number;
        [key: string]: any;
      }
    >({
      query: ({ amount }) => ({
        url: '/vendor/withdrawals/request',
        method: 'POST',
        body: {
          amount: Number(amount),
        },
      }),
      invalidatesTags: ['Withdrawals', 'Payouts', 'Orders'],
    }),

    // Aliases for compatibility
    getWithdrawals: builder.query<{ success?: boolean; data?: any; pending?: any; withdrawals?: any; requests?: any }, void>({
      query: () => '/vendor/withdrawals/history',
      providesTags: ['Withdrawals', 'Payouts'],
    }),

    createWithdrawal: builder.mutation<
      { success: boolean; data?: any; message?: string },
      {
        amount?: number;
        order_ids?: string[];
        notes?: string;
        [key: string]: any;
      }
    >({
      query: ({ amount, ...rest }) => ({
        url: '/vendor/withdrawals/request',
        method: 'POST',
        body: {
          amount: Number(amount || 0),
          ...rest,
        },
      }),
      invalidatesTags: ['Withdrawals', 'Payouts', 'Orders'],
    }),

    getWithdrawalEarnings: builder.query<
      {
        success?: boolean;
        data?: any;
        earnings?: any;
        gross_amount?: number;
        commission?: number;
        net_amount?: number;
        order_count?: number;
        orders?: any[];
      },
      { start_date?: string; end_date?: string; startDate?: string; endDate?: string } | void
    >({
      query: () => '/vendor/withdrawals/history',
      providesTags: ['Withdrawals', 'Orders'],
    }),

    getPayouts: builder.query<{ data?: any; payouts?: any; items?: any; success?: boolean }, void>({
      query: () => '/vendor/withdrawals/history',
      providesTags: ['Withdrawals', 'Payouts'],
    }),

    requestPayout: builder.mutation<
      { success: boolean; data?: any; message?: string },
      {
        amount?: number;
        [key: string]: any;
      }
    >({
      query: (body) => ({
        url: '/vendor/withdrawals/request',
        method: 'POST',
        body: {
          amount: Number(body.amount || 0),
          ...body,
        },
      }),
      invalidatesTags: ['Withdrawals', 'Payouts', 'Orders'],
    }),

    // Returns & Exchange Management Endpoints (/vendor/returns)
    // GET /api/v1/vendor/returns — list requests for your store items
    getReturns: builder.query<
      { success?: boolean; data: any; items?: any; returns?: any },
      {
        status?: string;
        type?: string;
        search?: string;
        page?: number;
        limit?: number;
      } | void
    >({
      query: (params) => ({
        url: '/vendor/returns',
        params: params || {},
      }),
      providesTags: ['Returns'],
    }),

    // GET /api/v1/vendor/returns/:id — view a single return request
    getReturnDetails: builder.query<{ success?: boolean; data: any }, string>({
      query: (returnId) => `/vendor/returns/${returnId}`,
      providesTags: (_result, _error, id) => [{ type: 'Returns', id }],
    }),

    // GET /api/v1/vendor/returns/items/:itemId/evidence/:filename — fetch evidence asset
    getReturnItemEvidence: builder.query<string, { itemId: string; filename: string }>({
      query: ({ itemId, filename }) => ({
        url: `/vendor/returns/items/${itemId}/evidence/${encodeURIComponent(filename.replace(/^\/+/, ''))}`,
        responseHandler: async (response) => {
          const blob = await response.blob();
          return URL.createObjectURL(blob);
        },
      }),
    }),

    // PATCH /api/v1/vendor/returns/items/:itemId/status — approve/reject or update workflow status
    updateReturnItemStatus: builder.mutation<
      { success: boolean; data?: any; message?: string },
      {
        itemId?: string;
        returnId?: string;
        status: string;
        remarks?: string;
        rejectionReason?: string;
        rejection_reason?: string;
        reason?: string;
        vendor_notes?: string;
        refundAmount?: number;
        refund_amount?: number;
        pickupDate?: string;
        pickup_date?: string;
        pickupPartner?: string;
        pickup_partner?: string;
        trackingNumber?: string;
        tracking_number?: string;
        exchangeItem?: string;
      }
    >({
      query: ({ itemId, returnId, ...body }) => {
        const targetId = itemId || returnId;
        const payload: Record<string, any> = {
          status: body.status,
        };
        const rejectionReason =
          body.rejection_reason ||
          body.rejectionReason ||
          body.reason;

        // In Swagger schema:
        // status: "APPROVED" | "REJECTED"
        // rejection_reason: "The item is outside the return policy"
        if (body.status === 'REJECTED') {
          payload.rejection_reason =
            rejectionReason || body.remarks || body.vendor_notes || 'The item is outside the return policy';
        } else if (rejectionReason && body.status !== 'APPROVED') {
          payload.rejection_reason = rejectionReason;
        }

        if (body.refund_amount !== undefined || body.refundAmount !== undefined) {
          payload.refund_amount = body.refund_amount ?? body.refundAmount;
        }
        if (body.tracking_number || body.trackingNumber) {
          payload.tracking_number = body.tracking_number || body.trackingNumber;
        }
        return {
          url: `/vendor/returns/items/${targetId}/status`,
          method: 'PATCH',
          body: payload,
        };
      },
      invalidatesTags: ['Returns'],
    }),

    // Backward compatible alias
    updateReturnStatus: builder.mutation<
      { success: boolean; data?: any; message?: string },
      {
        itemId?: string;
        returnId?: string;
        status: string;
        remarks?: string;
        rejectionReason?: string;
        rejection_reason?: string;
        reason?: string;
        vendor_notes?: string;
        refundAmount?: number;
        refund_amount?: number;
        pickupDate?: string;
        pickup_date?: string;
        pickupPartner?: string;
        pickup_partner?: string;
        trackingNumber?: string;
        tracking_number?: string;
        exchangeItem?: string;
      }
    >({
      query: ({ itemId, returnId, ...body }) => {
        const targetId = itemId || returnId;
        const payload: Record<string, any> = {
          status: body.status,
        };
        const rejectionReason =
          body.rejection_reason ||
          body.rejectionReason ||
          body.reason;

        if (body.status === 'REJECTED') {
          payload.rejection_reason =
            rejectionReason || body.remarks || body.vendor_notes || 'The item is outside the return policy';
        } else if (rejectionReason && body.status !== 'APPROVED') {
          payload.rejection_reason = rejectionReason;
        }

        if (body.refund_amount !== undefined || body.refundAmount !== undefined) {
          payload.refund_amount = body.refund_amount ?? body.refundAmount;
        }
        if (body.tracking_number || body.trackingNumber) {
          payload.tracking_number = body.tracking_number || body.trackingNumber;
        }
        return {
          url: `/vendor/returns/items/${targetId}/status`,
          method: 'PATCH',
          body: payload,
        };
      },
      invalidatesTags: ['Returns'],
    }),

    // ==========================================
    // VENDOR BANK DETAILS (Swagger Specification)
    // 1. GET /api/v1/vendor/bank-details
    // 2. PATCH /api/v1/vendor/bank-details
    // ==========================================
    getBankDetails: builder.query<BankDetailsResponse, void>({
      query: () => '/vendor/bank-details',
      providesTags: ['BankDetails', 'Vendor'],
    }),

    updateBankDetails: builder.mutation<
      { success?: boolean; message?: string; data?: any; [key: string]: any },
      BankDetailsPayload
    >({
      query: (body) => ({
        url: '/vendor/bank-details',
        method: 'PATCH',
        body: {
          accountHolderName: body.accountHolderName.trim(),
          bankName: body.bankName.trim(),
          bankAccountNumber: body.bankAccountNumber.trim(),
          ifscCode: body.ifscCode.trim().toUpperCase(),
          accountType: body.accountType,
          ...(body.upiId?.trim() ? { upiId: body.upiId.trim() } : {}),
        },
      }),
      invalidatesTags: ['BankDetails', 'Vendor', 'Withdrawals', 'Payouts'],
    }),
  }),
});

export const {
  useVendorSignupMutation,
  useSendOtpMutation,
  useVerifyOtpMutation,
  useVendorLoginMutation,
  useRefreshTokenMutation,
  useVendorLogoutMutation,
  useGetStoreRequestQuery,
  useSubmitStoreRequestMutation,
  useGetVendorProfileQuery,
  useUpdateVendorProfileMutation,
  useRegisterStoreMutation,
  useGetCategoriesQuery,
  useAddCategoryMutation,
  useUpdateCategoryMutation,
  useDeleteCategoryMutation,
  useGetProductsQuery,
  useAddProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
  useUploadProductImageMutation,
  useUpdateProductImageMutation,
  useDeleteProductImageMutation,
  useUploadCategoryImageMutation,
  useGetOrdersQuery,
  useGetOrderDetailsQuery,
  useUpdateOrderStatusMutation,
  useGetWithdrawalBalanceQuery,
  useGetWithdrawalHistoryQuery,
  useRequestWithdrawalMutation,
  useGetWithdrawalsQuery,
  useGetWithdrawalEarningsQuery,
  useCreateWithdrawalMutation,
  useGetPayoutsQuery,
  useRequestPayoutMutation,
  useGetReturnsQuery,
  useGetReturnDetailsQuery,
  useGetReturnItemEvidenceQuery,
  useUpdateReturnItemStatusMutation,
  useUpdateReturnStatusMutation,
  useGetBankDetailsQuery,
  useUpdateBankDetailsMutation,
} = vendorApi;
