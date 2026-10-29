import {
  ClaimDetail,
  ClaimListResponse,
  ReconciliationSummary,
  UnmatchedRemittancesResponse,
} from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

class ApiClientError extends Error {
  code: string;
  statusCode: number;

  constructor(message: string, code: string = 'API_ERROR', statusCode: number = 500) {
    super(message);
    this.name = 'ApiClientError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Accept': 'application/json',
        ...options?.headers,
      },
    });

    if (!res.ok) {
      let errorData;
      try {
        errorData = await res.json();
      } catch {
        errorData = { error: { code: 'HTTP_ERROR', message: res.statusText || 'Request failed' } };
      }

      const code = errorData?.error?.code || `HTTP_${res.status}`;
      const message = errorData?.error?.message || 'An error occurred while contacting the server';
      throw new ApiClientError(message, code, res.status);
    }

    return await res.json();
  } catch (err) {
    if (err instanceof ApiClientError) {
      throw err;
    }
    throw new ApiClientError(
      err instanceof Error ? err.message : 'Network connection failure',
      'NETWORK_ERROR',
      0
    );
  }
}

export const api = {
  getHealth: () => request<{ status: string; database: string }>('/health'),
  getSummary: () => request<ReconciliationSummary>('/summary'),
  getClaims: (params?: {
    payer?: string;
    status?: string;
    claim_id?: string;
    flag?: string;
    page?: number;
    page_size?: number;
  }) => {
    const query = new URLSearchParams();
    if (params?.payer) query.set('payer', params.payer);
    if (params?.status) query.set('status', params.status);
    if (params?.claim_id) query.set('claim_id', params.claim_id);
    if (params?.flag) query.set('flag', params.flag);
    if (params?.page) query.set('page', params.page.toString());
    if (params?.page_size) query.set('page_size', params.page_size.toString());

    const qs = query.toString();
    return request<ClaimListResponse>(`/claims${qs ? `?${qs}` : ''}`);
  },
  getExportUrl: (format: 'csv' | 'json' = 'csv') => `${API_BASE}/claims/export?format=${format}`,
  getClaimById: (claimId: string) => request<ClaimDetail>(`/claims/${encodeURIComponent(claimId)}`),
  getUnmatchedRemittances: () => request<UnmatchedRemittancesResponse>('/remittances/unmatched'),
};
