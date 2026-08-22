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

// ─── Storage API ──────────────────────────────────────────────────────────────

export const storageApi = {
  /**
   * Upload an image file to the public `blog-images` bucket.
   * Returns the permanent public URL of the uploaded file.
   */
  uploadBlogImage: async (file: File): Promise<string> => {
    const ext = file.name.split('.').pop() ?? 'jpg';
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const token = getToken();

    const res = await fetch(
      `${BASE_URL}/storage/v1/object/blog-images/${filename}`,
      {
        method: 'POST',
        headers: {
          apikey: ANON_KEY,
          Authorization: `Bearer ${token}`,
          'Content-Type': file.type || 'application/octet-stream',
        },
        body: file,
      }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(
        (err as { message?: string }).message || `Storage upload failed (${res.status})`
      );
    }

    // Public bucket — return the direct public URL
    return `${BASE_URL}/storage/v1/object/public/blog-images/${filename}`;
  },

  /**
   * Upload a hero section image to the public `hero-images` bucket.
   * Returns the permanent public URL of the uploaded file.
   */
  uploadHeroImage: async (file: File): Promise<string> => {
    const ext = file.name.split('.').pop() ?? 'jpg';
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const token = getToken();

    const res = await fetch(
      `${BASE_URL}/storage/v1/object/hero-images/${filename}`,
      {
        method: 'POST',
        headers: {
          apikey: ANON_KEY,
          Authorization: `Bearer ${token}`,
          'Content-Type': file.type || 'application/octet-stream',
        },
        body: file,
      }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(
        (err as { message?: string }).message || `Hero image upload failed (${res.status})`
      );
    }

    return `${BASE_URL}/storage/v1/object/public/hero-images/${filename}`;
  },
};

// ─── Blogs API ────────────────────────────────────────────────────────────────

export interface Blog {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  cover_image_url: string;
  category?: string;
  author?: string;
  date?: string;
  status: 'draft' | 'published';
  created_at?: string;
  updated_at?: string;
}

export type BlogPayload = Omit<Blog, 'id' | 'created_at' | 'updated_at'>;

export const blogsApi = {
  list: (): Promise<Blog[]> =>
    apiList<Blog>('/functions/v1/blogs', { all: 'true' }),

  create: (data: FormData | BlogPayload, action?: 'publish' | 'draft'): Promise<Blog> =>
    apiSingle<Blog>('/functions/v1/blogs', {
      method: 'POST',
      body: data instanceof FormData ? data : JSON.stringify(data),
      ...(action ? { params: { action } } : {}),
    }),

  update: (id: string, data: FormData | Partial<BlogPayload>, action?: 'publish' | 'draft'): Promise<Blog> =>
    apiSingle<Blog>('/functions/v1/blogs', {
      method: 'PATCH',
      body: data instanceof FormData ? data : JSON.stringify(data),
      params: { id, ...(action ? { action } : {}) },
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
  subject?: string;
  sku?: string;
  product_sku?: string;
  message: string;
  /** All known status values from the API */
  status: 'new' | 'read' | 'contacted' | 'resolved';
  created_at?: string;
  updated_at?: string;
}

export interface EnquiriesListResponse {
  data: Enquiry[];
  pagination: { page: number; limit: number; total: number; total_pages: number };
}

export const enquiriesApi = {
  /** List all enquiries (no pagination) */
  list: (): Promise<Enquiry[]> =>
    apiList<Enquiry>('/functions/v1/enquiries'),

  /** Paginated list */
  listPaginated: async (
    page: number = 1,
    limit: number = 20
  ): Promise<EnquiriesListResponse> => {
    const res = await apiFetch<ApiResponse<Enquiry[]>>('/functions/v1/enquiries', {
      params: { page: String(page), limit: String(limit) },
    });
    return {
      data: Array.isArray(res.data) ? res.data : [],
      pagination: res.pagination ?? { page, limit, total: 0, total_pages: 0 },
    };
  },

  /** Fetch a single enquiry by ID */
  getById: (id: string): Promise<Enquiry> =>
    apiSingle<Enquiry>('/functions/v1/enquiries', {
      params: { id },
    }),

  /** Update status of an enquiry */
  updateStatus: (id: string, status: Enquiry['status']): Promise<Enquiry> =>
    apiSingle<Enquiry>('/functions/v1/enquiries', {
      method: 'PATCH',
      body: JSON.stringify({ status }),
      params: { id },
    }),

  /** General partial update */
  update: (id: string, data: Partial<Enquiry>): Promise<Enquiry> =>
    apiSingle<Enquiry>('/functions/v1/enquiries', {
      method: 'PATCH',
      body: JSON.stringify(data),
      params: { id },
    }),

  /** Delete an enquiry by ID */
  delete: (id: string): Promise<void> =>
    apiFetch<void>('/functions/v1/enquiries', {
      method: 'DELETE',
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

// ─── FAQs API ─────────────────────────────────────────────────────────────────

export interface Faq {
  id: string;
  question: string;
  answer: string;
  type: string;
  blog_id: string | null;
  sort_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export type FaqPayload = Omit<Faq, 'id' | 'created_at' | 'updated_at'>;

export const faqsApi = {
  list: (params?: Record<string, string>): Promise<Faq[]> =>
    apiList<Faq>('/rest/v1/faqs', { select: '*', order: 'sort_order.asc', ...params }),

  create: (data: FaqPayload): Promise<Faq> =>
    apiSingle<Faq[]>('/rest/v1/faqs', {
      method: 'POST',
      body: JSON.stringify(data),
      headers: { Prefer: 'return=representation' }
    }).then(res => (Array.isArray(res) ? res[0] : res)),

  update: (id: string, data: Partial<FaqPayload>): Promise<Faq> =>
    apiSingle<Faq[]>('/rest/v1/faqs', {
      method: 'PATCH',
      body: JSON.stringify(data),
      params: { id: `eq.${id}` },
      headers: { Prefer: 'return=representation' }
    }).then(res => (Array.isArray(res) ? res[0] : res)),

  delete: (id: string): Promise<void> =>
    apiFetch<void>('/rest/v1/faqs', {
      method: 'DELETE',
      params: { id: `eq.${id}` },
    }),
    
  action: (id: string, action: 'publish' | 'unpublish'): Promise<Faq> =>
    apiSingle<Faq[]>('/rest/v1/faqs', {
      method: 'PATCH',
      body: JSON.stringify({ is_active: action === 'publish' }),
      params: { id: `eq.${id}` },
      headers: { Prefer: 'return=representation' }
    }).then(res => (Array.isArray(res) ? res[0] : res)),
};

