// Centralized API Client with Smart Client-Side Caching for Spring Boot Task Management API

const BASE_URL_STORAGE_KEY = 'tmap_api_base_url';
const ACCESS_TOKEN_KEY = 'tmap_access_token';
const REFRESH_TOKEN_KEY = 'tmap_refresh_token';
const USER_KEY = 'tmap_user_data';

export const getBaseUrl = () => {
  return localStorage.getItem(BASE_URL_STORAGE_KEY) || '';
};

export const setBaseUrl = (url) => {
  if (!url) {
    localStorage.removeItem(BASE_URL_STORAGE_KEY);
  } else {
    localStorage.setItem(BASE_URL_STORAGE_KEY, url.replace(/\/$/, ''));
  }
  clearApiCache();
};

export const getTokens = () => ({
  accessToken: localStorage.getItem(ACCESS_TOKEN_KEY),
  refreshToken: localStorage.getItem(REFRESH_TOKEN_KEY),
});

export const setTokens = (accessToken, refreshToken) => {
  if (accessToken) localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
};

export const clearAuth = () => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  clearApiCache();
};

export const getStoredUser = () => {
  try {
    const data = localStorage.getItem(USER_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
};

export const setStoredUser = (user) => {
  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(USER_KEY);
  }
};

let isRefreshing = false;
let refreshSubscribers = [];

const subscribeTokenRefresh = (cb) => {
  refreshSubscribers.push(cb);
};

const onRefreshed = (token) => {
  refreshSubscribers.map((cb) => cb(token));
  refreshSubscribers = [];
};

// ============================================================================
// SMART CLIENT-SIDE CACHING (In-Memory + Session TTL)
// ============================================================================
const apiCache = new Map();
const DEFAULT_TTL_MS = 90 * 1000; // 90 seconds TTL for read queries

export const invalidateCache = (pattern) => {
  if (!pattern) {
    apiCache.clear();
    return;
  }
  for (const key of apiCache.keys()) {
    if (key.includes(pattern)) {
      apiCache.delete(key);
    }
  }
};

export const clearApiCache = () => {
  apiCache.clear();
};

export async function apiRequest(endpoint, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const isGet = method === 'GET';
  const ttl = options.ttl || DEFAULT_TTL_MS;
  const forceRefresh = options.forceRefresh || options.noCache;

  // 1. Check in-memory cache for GET requests
  const cacheKey = `${endpoint}`;
  if (isGet && !forceRefresh) {
    const cached = apiCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < ttl) {
      return cached.data;
    }
  }

  const baseUrl = getBaseUrl();
  const fullUrl = `${baseUrl}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const { accessToken } = getTokens();
  if (accessToken && !headers.Authorization) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const fetchOptions = {
    ...options,
    headers,
  };

  if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
    fetchOptions.body = JSON.stringify(options.body);
  }

  let response;
  try {
    response = await fetch(fullUrl, fetchOptions);
  } catch (err) {
    throw new Error(`Could not connect to backend server (${fullUrl}). Check that Spring Boot is running.`);
  }

  // Handle 401 Unauthorized for token refresh
  if (
    response.status === 401 &&
    !endpoint.includes('/auth/login') &&
    !endpoint.includes('/auth/refresh') &&
    !endpoint.includes('/auth/register')
  ) {
    const { refreshToken } = getTokens();
    if (refreshToken) {
      if (!isRefreshing) {
        isRefreshing = true;
        try {
          const refreshRes = await fetch(`${baseUrl}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
          });

          if (refreshRes.ok) {
            const data = await refreshRes.json();
            setTokens(data.accessToken, data.refreshToken);
            onRefreshed(data.accessToken);
            isRefreshing = false;

            // Retry original request with new token
            headers.Authorization = `Bearer ${data.accessToken}`;
            return apiRequest(endpoint, { ...options, headers });
          } else {
            clearAuth();
            window.dispatchEvent(new Event('auth:unauthorized'));
            throw new Error('Session expired. Please log in again.');
          }
        } catch (err) {
          clearAuth();
          window.dispatchEvent(new Event('auth:unauthorized'));
          throw err;
        } finally {
          isRefreshing = false;
        }
      } else {
        // Wait for active refresh
        return new Promise((resolve) => {
          subscribeTokenRefresh((newToken) => {
            headers.Authorization = `Bearer ${newToken}`;
            resolve(apiRequest(endpoint, { ...options, headers }));
          });
        });
      }
    }
  }

  // Parse response
  const contentType = response.headers.get('content-type');
  let data;
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    let errorMsg = 'An error occurred with the request';
    if (typeof data === 'object' && data !== null) {
      errorMsg = data.message || data.error || JSON.stringify(data);
    } else if (typeof data === 'string' && data.length > 0) {
      errorMsg = data;
    }
    const error = new Error(errorMsg);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  // 2. Cache successful GET response
  if (isGet) {
    apiCache.set(cacheKey, {
      data,
      timestamp: Date.now(),
    });
  } else {
    // 3. Auto-invalidate affected caches on mutations
    if (endpoint.includes('/tasks') || endpoint.includes('/projects')) {
      invalidateCache('/api/projects');
      invalidateCache('/api/tasks');
    }
    if (endpoint.includes('/comments')) {
      invalidateCache('/comments');
      invalidateCache('/tasks');
    }
    if (endpoint.includes('/users')) {
      invalidateCache('/api/users');
    }
  }

  return data;
}

// Service Methods for API

export const authApi = {
  login: (email, password) =>
    apiRequest('/auth/login', {
      method: 'POST',
      body: { email, password },
    }),
  register: (username, email, password, userRole = 'USER') =>
    apiRequest('/auth/register', {
      method: 'POST',
      body: { username, email, password, userRole },
    }),
  logout: (refreshToken) =>
    apiRequest('/auth/logout', {
      method: 'POST',
      body: { refreshToken },
    }),
  refresh: (refreshToken) =>
    apiRequest('/auth/refresh', {
      method: 'POST',
      body: { refreshToken },
    }),
  ping: () => apiRequest('/auth/ping', { method: 'GET', ttl: 10000 }),
};

export const userApi = {
  getMe: (forceRefresh = false) =>
    apiRequest('/api/users/me', { method: 'GET', forceRefresh, ttl: 120000 }),
  getAllUsers: (pageNumber = 0, pageSize = 50, forceRefresh = false) =>
    apiRequest(`/api/users?pageNumber=${pageNumber}&pageSize=${pageSize}`, {
      method: 'GET',
      forceRefresh,
      ttl: 300000, // 5 minutes cache for user list
    }),
  updateMe: (username) =>
    apiRequest('/api/users/me', {
      method: 'PATCH',
      body: { username },
    }),
  deleteMe: () => apiRequest('/api/users/me', { method: 'DELETE' }),
};

export const projectApi = {
  getAll: (page = 0, size = 100, forceRefresh = false) =>
    apiRequest(`/api/projects?page=${page}&size=${size}`, {
      method: 'GET',
      forceRefresh,
      ttl: 60000,
    }),
  getById: (id, forceRefresh = false) =>
    apiRequest(`/api/projects/${id}`, { method: 'GET', forceRefresh }),
  create: (name, description, color, ownerId) =>
    apiRequest('/api/projects', {
      method: 'POST',
      body: { name, description, color, ownerId },
    }),
  update: (id, data) =>
    apiRequest(`/api/projects/${id}`, {
      method: 'PATCH',
      body: data,
    }),
  delete: (id) =>
    apiRequest(`/api/projects/${id}`, { method: 'DELETE' }),

  // Tasks inside a project
  getTasks: (projectId, filters = {}, forceRefresh = false) => {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.priority) params.append('priority', filters.priority);
    if (filters.assignee) params.append('assignee', filters.assignee);
    const queryString = params.toString() ? `?${params.toString()}` : '';
    return apiRequest(`/api/projects/${projectId}/tasks${queryString}`, {
      method: 'GET',
      forceRefresh,
      ttl: 45000,
    });
  },
  createTask: (projectId, taskData) =>
    apiRequest(`/api/projects/${projectId}/tasks`, {
      method: 'POST',
      body: taskData,
    }),
};

export const taskApi = {
  getById: (id, forceRefresh = false) =>
    apiRequest(`/api/tasks/${id}`, { method: 'GET', forceRefresh, ttl: 45000 }),
  update: (id, data) =>
    apiRequest(`/api/tasks/${id}`, {
      method: 'PATCH',
      body: data,
    }),
  updateStatus: (id, status) =>
    apiRequest(`/api/tasks/${id}/status`, {
      method: 'PATCH',
      body: { status }, // Matches record PatchStatusTaskRequest(TaskStatus status)
    }),


  delete: (id) =>
    apiRequest(`/api/tasks/${id}`, { method: 'DELETE' }),

  getComments: (taskId, forceRefresh = false) =>
    apiRequest(`/api/tasks/${taskId}/comments`, { method: 'GET', forceRefresh, ttl: 30000 }),
  createComment: (taskId, commentData) =>
    apiRequest(`/api/tasks/${taskId}/comments`, {
      method: 'POST',
      body: commentData,
    }),
};

export const commentApi = {
  update: (commentId, content) =>
    apiRequest(`/api/comments/${commentId}`, {
      method: 'PATCH',
      body: { content },
    }),
  delete: (commentId) =>
    apiRequest(`/api/comments/${commentId}`, { method: 'DELETE' }),
};

export const searchApi = {
  searchGlobal: async (query) => {
    try {
      return await apiRequest(`/api/search?q=${encodeURIComponent(query)}`, {
        method: 'GET',
        ttl: 15000,
      });
    } catch {
      return null;
    }
  },
};
