import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';

const rawBaseUrl = (process.env.NEXT_PUBLIC_API_URL || 'https://zippy-api.elyriasoft.com/api/v1').replace(/\/+$/, '');
const API_BASE_URL = rawBaseUrl.endsWith('/api/v1')
  ? rawBaseUrl
  : rawBaseUrl.endsWith('/api')
  ? `${rawBaseUrl}/v1`
  : `${rawBaseUrl}/api/v1`;

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request Interceptor: Attach Bearer Token automatically
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('zippy_vendor_token');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Response Interceptor: Handle global auth errors and auto refresh expired tokens
apiClient.interceptors.response.use(
  (response) => {
    const originalRequest = response.config as InternalAxiosRequestConfig & { _retry?: boolean };
    const url = (originalRequest?.url || '').toLowerCase();
    const isAuthEndpoint =
      url.includes('auth') ||
      url.includes('login') ||
      url.includes('signup') ||
      url.includes('otp') ||
      url.includes('refresh-token');

    if (!isAuthEndpoint && response.data?.error && response.data?.msg === 'Token has expired') {
      if (!originalRequest._retry) {
        originalRequest._retry = true;
        return handleTokenRefresh(originalRequest);
      }
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    const url = (originalRequest?.url || '').toLowerCase();
    const isAuthEndpoint =
      url.includes('auth') ||
      url.includes('login') ||
      url.includes('signup') ||
      url.includes('otp') ||
      url.includes('refresh-token');

    const serverMsg = String(
      error.response?.data?.msg || error.response?.data?.message || ''
    ).toLowerCase();

    const isCredentialError =
      serverMsg.includes('password') ||
      serverMsg.includes('email') ||
      serverMsg.includes('credential') ||
      serverMsg.includes('incorrect') ||
      serverMsg.includes('invalid') ||
      serverMsg.includes('user not found');

    // Never trigger token refresh on login/auth endpoints or for credential errors
    const isTokenExpired =
      !isAuthEndpoint &&
      !isCredentialError &&
      (error.response?.status === 401 ||
        serverMsg === 'token has expired' ||
        serverMsg.includes('jwt expired') ||
        serverMsg.includes('token expired'));

    if (isTokenExpired && !originalRequest?._retry) {
      if (originalRequest) originalRequest._retry = true;
      return handleTokenRefresh(originalRequest);
    }

    return Promise.reject(error);
  }
);

async function handleTokenRefresh(originalRequest: InternalAxiosRequestConfig) {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Window unavailable'));
  }

  const refreshToken = localStorage.getItem('zippy_vendor_refresh_token');

  if (!refreshToken) {
    clearAuthAndRedirect();
    return Promise.reject(new Error('No refresh token available'));
  }

  if (isRefreshing) {
    return new Promise((resolve, reject) => {
      failedQueue.push({ resolve, reject });
    }).then((token) => {
      if (originalRequest.headers) {
        originalRequest.headers.Authorization = `Bearer ${token}`;
      }
      return apiClient(originalRequest);
    });
  }

  isRefreshing = true;

  try {
    const refreshResponse = await axios.post(
      `${API_BASE_URL}/vendor/auth/refresh-token`,
      { refreshToken },
      { headers: { 'Content-Type': 'application/json' } }
    );

    const resData = refreshResponse.data;
    const dataPayload = resData?.data || resData;
    const newAccessToken =
      dataPayload?.accessToken || resData?.accessToken || resData?.token;
    const newRefreshToken =
      dataPayload?.refreshToken || resData?.refreshToken;

    if (newAccessToken) {
      localStorage.setItem('zippy_vendor_token', newAccessToken);
      if (newRefreshToken) {
        localStorage.setItem('zippy_vendor_refresh_token', newRefreshToken);
      }

      if (originalRequest.headers) {
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      }

      processQueue(null, newAccessToken);
      isRefreshing = false;
      return apiClient(originalRequest);
    } else {
      throw new Error('Refresh token response missing access token');
    }
  } catch (refreshError) {
    processQueue(refreshError, null);
    isRefreshing = false;
    clearAuthAndRedirect();
    return Promise.reject(refreshError);
  }
}

function clearAuthAndRedirect() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('zippy_vendor_token');
    localStorage.removeItem('zippy_vendor_refresh_token');
    localStorage.removeItem('zippy_vendor_user');
    const pathname = window.location.pathname;
    if (!pathname.startsWith('/login') && !pathname.startsWith('/register')) {
      window.location.href = '/login';
    }
  }
}
