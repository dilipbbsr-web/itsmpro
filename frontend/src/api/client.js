/**
 * ITSM Pro — Axios API Client
 * Handles: base URL, JWT auth headers, token refresh, error handling
 */
import axios from 'axios';

const BASE_URL = '/api/v1';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Request interceptor: attach access token ────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor: handle 401 / refresh ──
let isRefreshing = false;
let failedQueue  = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) prom.reject(error);
    else       prom.resolve(token);
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    if (error.response?.status === 401 && !original._retry) {
      if (error.response.data?.code === 'TOKEN_EXPIRED') {
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          }).then(token => {
            original.headers.Authorization = `Bearer ${token}`;
            return api(original);
          });
        }

        original._retry = true;
        isRefreshing = true;

        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
          window.location.href = '/login';
          return Promise.reject(error);
        }

        try {
          const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
          localStorage.setItem('accessToken', data.accessToken);
          api.defaults.headers.common.Authorization = `Bearer ${data.accessToken}`;
          processQueue(null, data.accessToken);
          original.headers.Authorization = `Bearer ${data.accessToken}`;
          return api(original);
        } catch (refreshErr) {
          processQueue(refreshErr, null);
          localStorage.clear();
          window.location.href = '/login';
          return Promise.reject(refreshErr);
        } finally {
          isRefreshing = false;
        }
      }

      // Other 401s — redirect to login
      localStorage.clear();
      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);

// ── Auth helpers ─────────────────────────────────
export const authAPI = {
  login:          (email, password) => api.post('/auth/login', { email, password }),
  logout:         ()                => api.post('/auth/logout'),
  me:             ()                => api.get('/auth/me'),
  changePassword: (data)            => api.post('/auth/change-password', data),
};

// ── CRUD helpers ──────────────────────────────────
export const incidentAPI = {
  list:   (params) => api.get('/incidents', { params }),
  get:    (id)     => api.get(`/incidents/${id}`),
  create: (data)   => api.post('/incidents', data),
  update: (id, d)  => api.patch(`/incidents/${id}`, d),
  delete: (id)     => api.delete(`/incidents/${id}`),
  addNote:(id, d)  => api.post(`/incidents/${id}/notes`, d),
};

export const srAPI = {
  list:     (params) => api.get('/service-requests', { params }),
  get:      (id)     => api.get(`/service-requests/${id}`),
  create:   (data)   => api.post('/service-requests', data),
  update:   (id, d)  => api.patch(`/service-requests/${id}`, d),
  approve:  (id, d)  => api.post(`/service-requests/${id}/approve`, d),
  catalog:  ()       => api.get('/service-requests/catalog'),
};

export const imacAPI = {
  list:    (params) => api.get('/imac', { params }),
  get:     (id)     => api.get(`/imac/${id}`),
  create:  (data)   => api.post('/imac', data),
  approve: (id, d)  => api.post(`/imac/${id}/approve`, d),
};

export const problemAPI = {
  list:   (params) => api.get('/problems', { params }),
  get:    (id)     => api.get(`/problems/${id}`),
  create: (data)   => api.post('/problems', data),
  update: (id, d)  => api.patch(`/problems/${id}`, d),
};

export const changeAPI = {
  list:     (params) => api.get('/changes', { params }),
  get:      (id)     => api.get(`/changes/${id}`),
  create:   (data)   => api.post('/changes', data),
  update:   (id, d)  => api.patch(`/changes/${id}`, d),
  cabVote:  (id, d)  => api.post(`/changes/${id}/cab-vote`, d),
};

export const cmdbAPI = {
  list:    (params) => api.get('/cmdb/cis', { params }),
  get:     (id)     => api.get(`/cmdb/cis/${id}`),
  create:  (data)   => api.post('/cmdb/cis', data),
  update:  (id, d)  => api.patch(`/cmdb/cis/${id}`, d),
  addRel:  (id, d)  => api.post(`/cmdb/cis/${id}/relationships`, d),
};

export const kbAPI = {
  list:    (params) => api.get('/knowledge', { params }),
  get:     (id)     => api.get(`/knowledge/${id}`),
  create:  (data)   => api.post('/knowledge', data),
  update:  (id, d)  => api.patch(`/knowledge/${id}`, d),
  feedback:(id, d)  => api.post(`/knowledge/${id}/feedback`, d),
};

export const userAPI = {
  list:   (params) => api.get('/users', { params }),
  get:    (id)     => api.get(`/users/${id}`),
  create: (data)   => api.post('/users', data),
  update: (id, d)  => api.patch(`/users/${id}`, d),
  delete: (id)     => api.delete(`/users/${id}`),
};

export const dashboardAPI = {
  summary: (params) => api.get('/dashboard/summary', { params }),
};

export const reportAPI = {
  analytics: (params) => api.get('/reports/analytics', { params }),
  export:    (data)   => api.post('/reports/export', data, { responseType: 'blob' }),
};

export default api;
