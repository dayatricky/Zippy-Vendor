import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { VendorProfile, CategoryItem, Product, Order, PayoutRequest } from '../useVendorStore';

const rawBaseUrl = (process.env.NEXT_PUBLIC_API_URL || 'https://zippy-api.elyriasoft.com/api/v1').replace(/\/+$/, '');
const API_BASE_URL = rawBaseUrl.endsWith('/api/v1')
  ? rawBaseUrl
  : rawBaseUrl.endsWith('/api')
  ? `${rawBaseUrl}/v1`
  : `${rawBaseUrl}/api/v1`;

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

export const vendorApi = createApi({
  reducerPath: 'vendorApi',
  baseQuery: fetchBaseQuery({
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
  }),
  tagTypes: ['Vendor', 'Products', 'Categories', 'Orders', 'Payouts'],
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
        stock_quantity?: number;
        images?: Array<{ image_url: string; display_order?: number; is_primary?: boolean }>;
        status?: 'ACTIVE' | 'INACTIVE' | 'PENDING' | string;
      }
    >({
      query: (rawBody) => {
        const { price, stock, ...cleanBody } = rawBody as any;
        const generatedSlug = cleanBody.slug || cleanBody.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
        const imagesPayload = cleanBody.images && cleanBody.images.length > 0
          ? cleanBody.images
          : cleanBody.image
            ? [{ image_url: cleanBody.image, display_order: 0, is_primary: true }]
            : [];

        return {
          url: '/vendor/products',
          method: 'POST',
          body: {
            category_id: cleanBody.category_id,
            name: cleanBody.name,
            slug: generatedSlug,
            description: cleanBody.description || cleanBody.name,
            brand_name: cleanBody.brand_name || 'Generic',
            sku: cleanBody.sku || `SKU-${Date.now()}`,
            barcode: cleanBody.barcode || `${Math.floor(1000000000 + Math.random() * 9000000000)}`,
            unit: cleanBody.unit || '1 kg',
            pack_size: cleanBody.pack_size || cleanBody.unit || '1 kg',
            mrp: Number(cleanBody.mrp ?? price) || 0,
            stock_quantity: Number(cleanBody.stock_quantity ?? stock ?? 100),
            images: imagesPayload,
            status: cleanBody.status || 'PENDING',
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
        price?: number;
        stock?: number;
        stock_quantity?: number;
        images?: Array<{ image_url: string; display_order?: number; is_primary?: boolean }>;
        status?: 'ACTIVE' | 'INACTIVE' | 'PENDING' | string;
      }
    >({
      query: ({ id, price, stock, ...body }) => ({
        url: `/vendor/products/${id}`,
        method: 'PATCH',
        body: {
          ...body,
          ...(stock !== undefined || body.stock_quantity !== undefined
            ? { stock_quantity: Number(body.stock_quantity ?? stock) }
            : {}),
        },
      }),
      invalidatesTags: ['Products'],
    }),

    deleteProduct: builder.mutation<{ success: boolean; message?: string }, string>({
      query: (id) => ({
        url: `/vendor/products/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Products'],
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

    // Payouts Ledger Endpoints
    getPayouts: builder.query<{ data: PayoutRequest[] }, void>({
      query: () => '/vendor/payouts',
      providesTags: ['Payouts'],
    }),

    requestPayout: builder.mutation<{ success: boolean; data: PayoutRequest }, { amount: number }>({
      query: (body) => ({
        url: '/vendor/payouts/request',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Payouts'],
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
  useGetOrdersQuery,
  useGetOrderDetailsQuery,
  useUpdateOrderStatusMutation,
  useGetPayoutsQuery,
  useRequestPayoutMutation,
} = vendorApi;
