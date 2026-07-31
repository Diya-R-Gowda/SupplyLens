import axios from 'axios';

const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
const BASE_URL = 'http://127.0.0.1:5000/api';

export const getAccessToken = () => localStorage.getItem(ACCESS_TOKEN_KEY);
export const getRefreshToken = () => localStorage.getItem(REFRESH_TOKEN_KEY);

export const setTokens = ({ accessToken, refreshToken }) => {
  if (accessToken) localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
};

export const clearTokens = () => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
};

let onAuthFailure = null;
export const setOnAuthFailure = (handler) => {
  onAuthFailure = handler;
};

const api = axios.create({
  baseURL: BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshPromise = null;

const performRefresh = () => {
  if (!refreshPromise) {
    refreshPromise = axios
      .post(`${BASE_URL}/auth/refresh`, { refreshToken: getRefreshToken() })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;
    const code = response?.data?.error?.code;

    // Only an expired access token is worth silently refreshing. A missing or
    // malformed token means the client's auth state is broken some other way -
    // retrying with a refresh won't fix that, so force re-login instead.
    if (response?.status === 401 && code === 'TOKEN_EXPIRED' && !config?._retriedAfterRefresh && getRefreshToken()) {
      config._retriedAfterRefresh = true;
      try {
        const { data: refreshed } = await performRefresh();
        setTokens(refreshed.data);
        config.headers.Authorization = `Bearer ${refreshed.data.accessToken}`;
        return api(config);
      } catch (refreshError) {
        clearTokens();
        onAuthFailure?.();
        return Promise.reject(refreshError);
      }
    }

    if (response?.status === 401) {
      clearTokens();
      onAuthFailure?.();
    }

    return Promise.reject(error);
  }
);

export default api;
