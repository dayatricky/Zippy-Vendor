import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiClient } from '@/services/apiClient';

export interface VendorUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'VENDOR';
}

interface AuthState {
  user: VendorUser | null;
  token: string | null;
  refreshToken: string | null;
  pendingEmail: string | null;
  otpSent: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  message: string | null;
}

const initialState: AuthState = {
  user: null,
  token: null,
  refreshToken: null,
  pendingEmail: null,
  otpSent: false,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  message: null,
};

// Helper to save auth state to localStorage
const saveAuthToStorage = (accessToken: string, refreshToken: string | null, vendorUser: VendorUser) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('zippy_vendor_token', accessToken);
    if (refreshToken) {
      localStorage.setItem('zippy_vendor_refresh_token', refreshToken);
    }
    localStorage.setItem('zippy_vendor_user', JSON.stringify(vendorUser));
  }
};

// 1. Signup Vendor Thunk (POST /api/v1/vendor/auth/signup)
export const signupVendorThunk = createAsyncThunk(
  'auth/signupVendor',
  async (
    payload: { fullName: string; email: string; phoneNumber: string; password?: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await apiClient.post('/vendor/auth/signup', {
        email: payload.email,
        password: payload.password || 'Use-a-strong-password-123!',
        fullName: payload.fullName,
        phoneNumber: payload.phoneNumber,
        deviceId: 'vendor-device-123',
        platform: 'web',
      });
      if (response.data?.error) {
        return rejectWithValue(response.data?.msg || response.data?.message || 'Signup failed');
      }
      return { email: payload.email, message: response.data?.msg || response.data?.message || 'OTP sent to email successfully!' };
    } catch (err: any) {
      const errMsg = err.response?.data?.msg || err.response?.data?.message || err.message || 'Signup failed';
      return rejectWithValue(errMsg);
    }
  }
);

// 2. Send / Resend OTP Thunk (POST /api/v1/vendor/auth/send-otp)
export const sendOtpThunk = createAsyncThunk(
  'auth/sendOtp',
  async (email: string, { rejectWithValue }) => {
    try {
      const response = await apiClient.post('/vendor/auth/send-otp', { email });
      if (response.data?.error) {
        return rejectWithValue(response.data?.msg || response.data?.message || 'Failed to resend OTP');
      }
      return { email, message: response.data?.msg || response.data?.message || 'OTP resent to email!' };
    } catch (err: any) {
      const errMsg = err.response?.data?.msg || err.response?.data?.message || err.message || 'Failed to send OTP';
      return rejectWithValue(errMsg);
    }
  }
);

// 3. Verify OTP Thunk (POST /api/v1/vendor/auth/verify-otp)
export const verifyOtpThunk = createAsyncThunk(
  'auth/verifyOtp',
  async (
    payload: { email: string; otp: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await apiClient.post('/vendor/auth/verify-otp', {
        email: payload.email,
        otp: payload.otp,
        deviceId: 'vendor-device-123',
        platform: 'web',
      });

      const resData = response.data;
      if (resData?.error) {
        return rejectWithValue(resData?.msg || resData?.message || 'OTP verification failed');
      }

      const dataPayload = resData?.data || resData;
      const accessToken = dataPayload?.accessToken || resData?.accessToken;
      const refreshToken = dataPayload?.refreshToken || resData?.refreshToken;
      const rawVendor = dataPayload?.vendor || dataPayload?.user;

      if (!accessToken) {
        return rejectWithValue('Access token missing in response');
      }

      const vendorUser: VendorUser = {
        id: rawVendor?.id || `v-usr-${Date.now()}`,
        name: rawVendor?.fullName || rawVendor?.name || 'Vendor Partner',
        email: rawVendor?.email || payload.email,
        phone: rawVendor?.phoneNumber || rawVendor?.phone || '',
        role: 'VENDOR',
      };

      saveAuthToStorage(accessToken, refreshToken || null, vendorUser);

      // Check if store info is returned in response or fetch immediately
      const storeObj = dataPayload?.store || dataPayload?.storeRequest || rawVendor?.store || rawVendor?.storeRequest;
      let storeStatus = storeObj?.status || storeObj?.approvalStatus || rawVendor?.approvalStatus || rawVendor?.status;
      let storeName = storeObj?.storeName || storeObj?.store_name || rawVendor?.storeName || rawVendor?.store_name;

      if (!storeStatus) {
        try {
          const storeRes = await apiClient.get('/vendor/store-request', {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          const storeData = storeRes.data?.data || storeRes.data;
          storeStatus = storeData?.status || storeData?.approvalStatus || storeData?.storeRequest?.status;
          storeName = storeData?.storeName || storeData?.store_name || storeData?.storeRequest?.storeName;
        } catch {
          // Gracefully continue if fetch fails
        }
      }

      if (typeof window !== 'undefined') {
        if (storeStatus) {
          localStorage.setItem('zippy_store_status', String(storeStatus).toUpperCase());
        }
        if (storeName) {
          localStorage.setItem('zippy_store_name', String(storeName));
        }
      }

      return { user: vendorUser, token: accessToken, refreshToken };
    } catch (err: any) {
      const errMsg = err.response?.data?.msg || err.response?.data?.message || err.message || 'OTP verification failed';
      return rejectWithValue(errMsg);
    }
  }
);

// 4. Login Vendor Thunk (POST /api/v1/vendor/auth/login)
export const loginVendorThunk = createAsyncThunk(
  'auth/loginVendor',
  async (credentials: { email: string; password?: string }, { rejectWithValue }) => {
    try {
      const response = await apiClient.post('/vendor/auth/login', {
        email: credentials.email,
        password: credentials.password || 'Use-a-strong-password-123!',
        deviceId: 'vendor-device-123',
        platform: 'web',
      });

      const resData = response.data;
      if (resData?.error) {
        return rejectWithValue(resData?.msg || resData?.message || 'Login failed');
      }

      const dataPayload = resData?.data || resData;
      const accessToken = dataPayload?.accessToken || resData?.accessToken;
      const refreshToken = dataPayload?.refreshToken || resData?.refreshToken;
      const rawVendor = dataPayload?.vendor || dataPayload?.user;

      if (!accessToken) {
        return rejectWithValue('Access token missing in response');
      }

      const vendorUser: VendorUser = {
        id: rawVendor?.id || 'v-usr-101',
        name: rawVendor?.fullName || rawVendor?.name || 'Vendor Partner',
        email: rawVendor?.email || credentials.email,
        phone: rawVendor?.phoneNumber || rawVendor?.phone || '',
        role: 'VENDOR',
      };

      saveAuthToStorage(accessToken, refreshToken || null, vendorUser);

      // Check if store info is returned in login response or fetch immediately
      const storeObj = dataPayload?.store || dataPayload?.storeRequest || rawVendor?.store || rawVendor?.storeRequest;
      let storeStatus = storeObj?.status || storeObj?.approvalStatus || rawVendor?.approvalStatus || rawVendor?.status;
      let storeName = storeObj?.storeName || storeObj?.store_name || rawVendor?.storeName || rawVendor?.store_name;

      if (!storeStatus) {
        try {
          const storeRes = await apiClient.get('/vendor/store-request', {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          const storeData = storeRes.data?.data || storeRes.data;
          storeStatus = storeData?.status || storeData?.approvalStatus || storeData?.storeRequest?.status;
          storeName = storeData?.storeName || storeData?.store_name || storeData?.storeRequest?.storeName;
        } catch {
          // Gracefully continue if fetch fails
        }
      }

      if (typeof window !== 'undefined') {
        if (storeStatus) {
          localStorage.setItem('zippy_store_status', String(storeStatus).toUpperCase());
        }
        if (storeName) {
          localStorage.setItem('zippy_store_name', String(storeName));
        }
      }

      return { user: vendorUser, token: accessToken, refreshToken };
    } catch (err: any) {
      const errMsg = err.response?.data?.msg || err.response?.data?.message || err.message || 'Login failed';
      return rejectWithValue(errMsg);
    }
  }
);

// 5. Refresh Token Thunk (POST /api/v1/vendor/auth/refresh-token)
export const refreshTokenThunk = createAsyncThunk(
  'auth/refreshToken',
  async (_, { getState, rejectWithValue }) => {
    try {
      const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('zippy_vendor_refresh_token') : null;
      if (!refreshToken) {
        return rejectWithValue('No refresh token available');
      }

      const response = await apiClient.post('/vendor/auth/refresh-token', { refreshToken });
      const resData = response.data;
      const dataPayload = resData?.data || resData;

      const newAccessToken = dataPayload?.accessToken || resData?.accessToken || resData?.token;
      const newRefreshToken = dataPayload?.refreshToken || resData?.refreshToken || refreshToken;

      if (newAccessToken && typeof window !== 'undefined') {
        localStorage.setItem('zippy_vendor_token', newAccessToken);
        if (newRefreshToken) {
          localStorage.setItem('zippy_vendor_refresh_token', newRefreshToken);
        }
      }

      return { token: newAccessToken, refreshToken: newRefreshToken };
    } catch (err: any) {
      const errMsg = err.response?.data?.msg || err.response?.data?.message || err.message || 'Token refresh failed';
      return rejectWithValue(errMsg);
    }
  }
);

// 6. Logout Vendor Thunk (POST /api/v1/vendor/auth/logout)
export const logoutVendorThunk = createAsyncThunk(
  'auth/logoutVendor',
  async (_, { dispatch }) => {
    try {
      await apiClient.post('/vendor/auth/logout', {});
    } catch (err) {
      // Ignore API errors on logout to ensure local cleanup always runs
    } finally {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('zippy_vendor_token');
        localStorage.removeItem('zippy_vendor_refresh_token');
        localStorage.removeItem('zippy_vendor_user');
        localStorage.removeItem('zippy_store_status');
        localStorage.removeItem('zippy_store_name');
      }
    }
    return true;
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    initializeAuth: (state) => {
      if (typeof window !== 'undefined') {
        const savedToken = localStorage.getItem('zippy_vendor_token');
        const savedRefreshToken = localStorage.getItem('zippy_vendor_refresh_token');
        const savedUserStr = localStorage.getItem('zippy_vendor_user');
        if (savedToken && savedUserStr) {
          try {
            state.user = JSON.parse(savedUserStr);
            state.token = savedToken;
            state.refreshToken = savedRefreshToken;
            state.isAuthenticated = true;
          } catch {
            state.isAuthenticated = false;
          }
        }
      }
    },
    setPendingEmail: (state, action) => {
      state.pendingEmail = action.payload;
    },
    logoutVendor: (state) => {
      state.user = null;
      state.token = null;
      state.refreshToken = null;
      state.pendingEmail = null;
      state.otpSent = false;
      state.isAuthenticated = false;
      if (typeof window !== 'undefined') {
        localStorage.removeItem('zippy_vendor_token');
        localStorage.removeItem('zippy_vendor_refresh_token');
        localStorage.removeItem('zippy_vendor_user');
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Signup
      .addCase(signupVendorThunk.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(signupVendorThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.pendingEmail = action.payload.email;
        state.otpSent = true;
        state.message = action.payload.message;
      })
      .addCase(signupVendorThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.error = (action.payload as string) || 'Signup failed';
      })
      // Send OTP
      .addCase(sendOtpThunk.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(sendOtpThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.pendingEmail = action.payload.email;
        state.otpSent = true;
        state.message = action.payload.message;
      })
      // Verify OTP
      .addCase(verifyOtpThunk.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(verifyOtpThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.refreshToken = action.payload.refreshToken;
        state.otpSent = false;
      })
      .addCase(verifyOtpThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.error = (action.payload as string) || 'OTP verification failed';
      })
      // Login
      .addCase(loginVendorThunk.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginVendorThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.refreshToken = action.payload.refreshToken;
      })
      .addCase(loginVendorThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.error = (action.payload as string) || 'Login failed';
      })
      // Refresh Token
      .addCase(refreshTokenThunk.fulfilled, (state, action) => {
        state.token = action.payload.token;
        if (action.payload.refreshToken) {
          state.refreshToken = action.payload.refreshToken;
        }
      })
      // Logout
      .addCase(logoutVendorThunk.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.refreshToken = null;
        state.pendingEmail = null;
        state.otpSent = false;
        state.isAuthenticated = false;
      });
  },
});

export const { initializeAuth, setPendingEmail, logoutVendor } = authSlice.actions;
export default authSlice.reducer;
