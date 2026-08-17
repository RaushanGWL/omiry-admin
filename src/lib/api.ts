const BASE_URL =
  (import.meta.env.VITE_SUPABASE_URL as string) ||
  'https://qmfsodjevoooohalsorw.supabase.co';

const ANON_KEY =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string) ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFtZnNvZGpldm9vb29oYWxzb3J3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYyOTA4NzIsImV4cCI6MjEwMTg2Njg3Mn0.ZT32g9WVbevgQIVgISoiRGtz3IxXsCVtQ-qSpqavyK8';

// ─── Token Management ─────────────────────────────────────────────────────────

export const getToken = (): string | null => localStorage.getItem('omriy_admin_token');
export const setToken = (token: string) => localStorage.setItem('omriy_admin_token', token);
export const clearToken = () => localStorage.removeItem('omriy_admin_token');

// ─── API Response wrapper (all edge functions return { success, data, pagination? }) ──

interface ApiResponse<T> {
  success: boolean;
  data: T;
  pagination?: { page: number; limit: number; total: number; total_pages: number };
  message?: string;
}

// ─── Core Fetch Wrapper ───────────────────────────────────────────────────────

async function apiFetch<T>(
  path: string,
  options: RequestInit & { params?: Record<string, string | boolean | null | undefined> } = {}
): Promise<T> {
  const { params, ...rest } = options;

  let url = `${BASE_URL}${path}`;
  if (params) {
    const qs = Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== null)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join('&');
    if (qs) url += `?${qs}`;
  }

  const token = getToken();
  const isFormData = rest.body instanceof FormData;
  const headers: HeadersInit = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    apikey: ANON_KEY,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(rest.headers || {}),
  };

  const response = await fetch(url, { ...rest, headers });

  // Some DELETE calls return 204 No Content
  if (response.status === 204) return {} as T;

  const json = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errMsg =
      (json as { message?: string; error?: string }).message ||
      (json as { error?: string }).error ||
      `HTTP ${response.status}`;
    throw new Error(errMsg);
  }

  return json as T;
}

// ─── Helper: unwrap { success, data } envelope ────────────────────────────────

async function apiList<T>(path: string, params?: Record<string, string>): Promise<T[]> {
  const res = await apiFetch<ApiResponse<T[]>>(path, { params });
  // Support both wrapped { success, data: [] } and plain array responses
  if (res && typeof res === 'object' && 'data' in res && Array.isArray(res.data)) {
    return res.data;
  }
  if (Array.isArray(res)) return res as unknown as T[];
  return [];
}

async function apiSingle<T>(
  path: string,
  options: RequestInit & { params?: Record<string, string | boolean | null | undefined> } = {}
): Promise<T> {
  const res = await apiFetch<ApiResponse<T> | T>(path, options);
  // Unwrap if wrapped
  if (res && typeof res === 'object' && 'data' in (res as object) && 'success' in (res as object)) {
    return (res as ApiResponse<T>).data;
  }
  return res as T;
}

// ─── Auth API ─────────────────────────────────────────────────────────────────

export interface AuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  user: { id: string; email: string };
}

export const authApi = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const url = `${BASE_URL}/auth/v1/token?grant_type=password`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: ANON_KEY },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(
        (data as { error_description?: string }).error_description ||
        (data as { message?: string }).message ||
        `Login failed (${res.status})`
      );
    }

    return data as AuthResponse;
  },
};

// ─── Products API ─────────────────────────────────────────────────────────────

export interface Product {
  id: string;
  sku?: string;
  name: string;
  slug: string;
  short_description: string;
  description: string;
  alt_text: string;
  images: string[];
  product_images?: {
    id: string;
    alt_text?: string;
    image_url: string;
    is_primary?: boolean;
    sort_order?: number;
  }[];
  is_published: boolean;
  is_best_seller: boolean;
  collection_ids?: string;
  collection_products?: {
    sort_order: number;
    collections: {
      id: string;
      name: string;
      slug: string;
      image_url: string;
      is_published: boolean;
    };
  }[];
  material?: string;
  origin?: string;
  finish?: string;
  dimensions?: string;
  weight?: string;
  authenticity?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ProductPayload {
  sku?: string;
  name: string;
  slug: string;
  short_description: string;
  description: string;
  alt_text: string;
  is_published: boolean;
  is_best_seller: boolean;
  collection_ids?: string;
  material?: string;
  origin?: string;
  finish?: string;
  dimensions?: string;
  weight?: string;
  authenticity?: string;
}

export const productsApi = {
  list: (): Promise<Product[]> =>
    apiList<Product>('/functions/v1/products', { all: 'true' }),

  /** Full create — sends multipart/form-data with image files */
  create: (data: FormData): Promise<Product> =>
    apiSingle<Product>('/functions/v1/products', {
      method: 'POST',
      body: data,
    }),

  /** Full update — sends multipart/form-data with image files */
  update: (id: string, data: FormData | Partial<ProductPayload>): Promise<Product> =>
    apiSingle<Product>('/functions/v1/products', {
      method: 'PATCH',
      body: data instanceof FormData ? data : JSON.stringify(data),
      params: { id },
    }),

  /** Delete a specific product image by ID */
  deleteImage: (id: string): Promise<void> =>
    apiSingle<void>('/functions/v1/products/images', {
      method: 'DELETE',
      params: { id },
    }),

  /** Partial JSON update (used for quick toggles like published / best-seller) */
  patch: (id: string, data: Partial<ProductPayload>): Promise<Product> =>
    apiSingle<Product>('/functions/v1/products', {
      method: 'PATCH',
      body: JSON.stringify(data),
      params: { id },
    }),

  delete: (id: string): Promise<void> =>
    apiFetch<void>('/functions/v1/products', {
      method: 'DELETE',
      params: { id },
    }),
};

// ─── Collections API ──────────────────────────────────────────────────────────

export interface Collection {
  id: string;
  name: string;
  slug: string;
  description: string;
  image_url: string;
  is_published: boolean;
  is_featured: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

export type CollectionPayload = Omit<Collection, 'id' | 'created_at' | 'updated_at'>;

export const collectionsApi = {
  list: (): Promise<Collection[]> =>
    apiList<Collection>('/functions/v1/collections', { all: 'true' }),

  create: (data: FormData | CollectionPayload): Promise<Collection> =>
    apiSingle<Collection>('/functions/v1/collections', {
      method: 'POST',
      body: data instanceof FormData ? data : JSON.stringify(data),
    }),

  update: (id: string, data: FormData | Partial<CollectionPayload>): Promise<Collection> =>
    apiSingle<Collection>('/functions/v1/collections', {
      method: 'PATCH',
      body: data instanceof FormData ? data : JSON.stringify(data),
      params: { id },
    }),

  delete: (id: string): Promise<void> =>
    apiFetch<void>('/functions/v1/collections', {
      method: 'DELETE',
      params: { id },
    }),

  action: (id: string, action: 'publish' | 'unpublish' | 'feature' | 'unfeature'): Promise<Collection> =>
    apiSingle<Collection>('/functions/v1/collections', {
      method: 'PATCH',
      body: JSON.stringify({}),
      params: { id, action },
    }),
};

// ─── Blogs API ────────────────────────────────────────────────────────────────

export interface Blog {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  cover_image_url: string;
  status: 'draft' | 'published';
  created_at?: string;
  updated_at?: string;
}

export type BlogPayload = Omit<Blog, 'id' | 'created_at' | 'updated_at'>;

export const blogsApi = {
  list: (): Promise<Blog[]> =>
    apiList<Blog>('/functions/v1/blogs', { all: 'true' }),

  create: (data: BlogPayload): Promise<Blog> =>
    apiSingle<Blog>('/functions/v1/blogs', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<BlogPayload>): Promise<Blog> =>
    apiSingle<Blog>('/functions/v1/blogs', {
      method: 'PATCH',
      body: JSON.stringify(data),
      params: { id },
    }),

  delete: (id: string): Promise<void> =>
    apiFetch<void>('/functions/v1/blogs', {
      method: 'DELETE',
      params: { id },
    }),

  action: (id: string, action: 'publish' | 'draft'): Promise<Blog> =>
    apiSingle<Blog>('/functions/v1/blogs', {
      method: 'PATCH',
      body: JSON.stringify({}),
      params: { id, action },
    }),
};

// ─── Hero Section API ─────────────────────────────────────────────────────────

export interface HeroSection {
  id?: string;
  heading: string;
  description: string;
  cta_text: string;
  cta_url: string;
  image_url: string;
  is_active: boolean;
}

export const heroApi = {
  get: async (): Promise<HeroSection | null> => {
    const res = await apiFetch<ApiResponse<HeroSection | HeroSection[]>>('/functions/v1/hero_section');
    if (!res) return null;
    const d = res.data;
    if (Array.isArray(d)) return d[0] ?? null;
    return d ?? null;
  },

  upsert: (data: HeroSection): Promise<HeroSection> =>
    apiSingle<HeroSection>('/functions/v1/hero_section', {
      method: 'POST',
      body: JSON.stringify(data),
      ...(data.id ? { params: { id: data.id } } : {}),
    }),

  update: (id: string, data: Partial<HeroSection>): Promise<HeroSection> =>
    apiSingle<HeroSection>('/functions/v1/hero_section', {
      method: 'PATCH',
      body: JSON.stringify(data),
      params: { id },
    }),
};

// ─── Enquiries API ────────────────────────────────────────────────────────────

export interface Enquiry {
  id: string;
  name: string;
  email: string;
  phone?: string;
  message: string;
  status: 'new' | 'read' | 'resolved';
  created_at?: string;
}

export const enquiriesApi = {
  list: (): Promise<Enquiry[]> =>
    apiList<Enquiry>('/functions/v1/enquiries', { all: 'true' }),

  update: (id: string, data: Partial<Enquiry>): Promise<Enquiry> =>
    apiSingle<Enquiry>('/functions/v1/enquiries', {
      method: 'PATCH',
      body: JSON.stringify(data),
      params: { id },
    }),
};

// ─── Customers API ────────────────────────────────────────────────────────────

export interface Customer {
  id: string;
  email: string;
  created_at?: string;
  full_name?: string;
  user_metadata?: { full_name?: string; name?: string };
}

export const customersApi = {
  list: (search: string = '', page: number = 1, limit: number = 20): Promise<Customer[]> =>
    apiSingle<Customer[]>('/rest/v1/rpc/get_customers', {
      method: 'POST',
      body: JSON.stringify({ p_search: search, p_page: page, p_limit: limit }),
    }),
};

// ─── Dashboard API ────────────────────────────────────────────────────────────

export interface DashboardCounts {
  products: number;
  customers: number;
  new_enquiries: number;
  collections_count: number;
}

export const dashboardApi = {
  getCounts: (): Promise<DashboardCounts> =>
    apiSingle<DashboardCounts>('/rest/v1/rpc/get_admin_dashboard_counts', { method: 'POST' }),
};
