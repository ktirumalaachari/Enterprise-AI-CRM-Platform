import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  '/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Sends cookies (e.g. Refresh Token) with every request
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach JWT token to requests if available
api.interceptors.request.use(
  (config) => {
    const { accessToken, user } = useAuthStore.getState();
    if (accessToken && config.headers) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    if (user?.companyId && config.headers) {
      config.headers['X-Company-Id'] = user.companyId;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Catch 401s, silently refresh access token, and retry request
let isRefreshing = false;
let failedQueue: any[] = [];

/**
 * Set to true while AppRoutes restoreSession() is in-flight.
 * Prevents the 401 response interceptor from firing a concurrent
 * /auth/refresh while restoreSession is already doing so, which
 * would cause a token-rotation race and a second 401.
 */
export let isRestoringSession = false;
export const setIsRestoringSession = (v: boolean) => { isRestoringSession = v; };

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // These endpoints should never trigger a refresh-token retry loop
    const isAuthEndpoint =
      originalRequest?.url?.includes('/auth/login') ||
      originalRequest?.url?.includes('/auth/register') ||
      originalRequest?.url?.includes('/auth/refresh') ||
      originalRequest?.url?.includes('/auth/google-login') ||
      originalRequest?.url?.includes('/auth/forgot-password') ||
      originalRequest?.url?.includes('/auth/verify-reset-otp') ||
      originalRequest?.url?.includes('/auth/reset-password') ||
      originalRequest?.url?.includes('/auth/logout');

    // Check if error is 401 (Unauthorized), not an auth route, has not been retried already,
    // and session restoration is not already in-flight (to avoid token rotation race condition)
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry && !isAuthEndpoint && !isRestoringSession) {
      // If we are already refreshing, queue this request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return api(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Request token refresh using the HttpOnly cookie
        const refreshUrl = `${API_BASE_URL.replace(/\/$/, '')}/auth/refresh`;
        const response = await axios.post(
          refreshUrl,
          {},
          { withCredentials: true }
        );

        const { accessToken, user } = response.data;

        if (!accessToken) {
          throw new Error('No access token returned from refresh');
        }

        // Update store with new credentials
        if (user) {
          useAuthStore.getState().login(accessToken, user);
        } else {
          useAuthStore.getState().setAccessToken(accessToken);
        }

        processQueue(null, accessToken);
        isRefreshing = false;

        // Retry the original request with new token
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        }
        return api(originalRequest);
      } catch (refreshError: any) {
        // Refresh token failed (expired, invalid, or revoked)
        processQueue(refreshError, null);
        isRefreshing = false;

        // Log out user only if they were authenticated
        if (useAuthStore.getState().isAuthenticated) {
          useAuthStore.getState().logout();
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
