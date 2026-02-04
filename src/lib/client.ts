import axios, { type AxiosInstance } from 'axios';
import { getActiveCredentials, getBaseUrl, getActiveMerchantId } from './config.js';
import type { Merchant, Item, Order, CloverListResponse } from '../types/clover.js';

export interface Payment {
  id: string;
  order?: { id: string };
  amount: number;
  tipAmount?: number;
  taxAmount?: number;
  cashbackAmount?: number;
  createdTime?: number;
  result?: string;
  tender?: { id: string; label?: string };
  cardTransaction?: { cardType?: string };
  employee?: { id: string };
}

export interface Refund {
  id: string;
  payment?: { id: string };
  amount: number;
  createdTime?: number;
  reason?: string;
}

const BATCH_SIZE = 1000;
const RATE_LIMIT_DELAY = 100; // ms between requests to avoid rate limits

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// Build query string with multiple filter params
function buildQueryString(params: { limit: number; offset: number; filters?: string[] }): string {
  const parts = [`limit=${params.limit}`, `offset=${params.offset}`];
  if (params.filters) {
    params.filters.forEach(f => parts.push(`filter=${encodeURIComponent(f)}`));
  }
  return parts.join('&');
}

export class CloverClient {
  private http: AxiosInstance;
  
  constructor() {
    const creds = getActiveCredentials();
    if (!creds?.access_token) throw new Error('Not authenticated. Run: clovercli auth login');
    this.http = axios.create({
      baseURL: getBaseUrl(),
      headers: { Authorization: `Bearer ${creds.access_token}`, 'Content-Type': 'application/json' }
    });
  }
  
  private get mId(): string {
    const m = getActiveMerchantId();
    if (!m) throw new Error('No merchant');
    return m;
  }

  async getMerchant(): Promise<Merchant> {
    return (await this.http.get<Merchant>(`/v3/merchants/${this.mId}`)).data;
  }

  async listItems(p?: { limit?: number; offset?: number }): Promise<Item[]> {
    return (await this.http.get<CloverListResponse<Item>>(`/v3/merchants/${this.mId}/items`, { params: p })).data.elements || [];
  }

  async getItem(id: string): Promise<Item> {
    return (await this.http.get<Item>(`/v3/merchants/${this.mId}/items/${id}`)).data;
  }

  async createItem(i: Partial<Item>): Promise<Item> {
    return (await this.http.post<Item>(`/v3/merchants/${this.mId}/items`, i)).data;
  }

  async updateItem(id: string, i: Partial<Item>): Promise<Item> {
    return (await this.http.post<Item>(`/v3/merchants/${this.mId}/items/${id}`, i)).data;
  }

  async deleteItem(id: string): Promise<void> {
    await this.http.delete(`/v3/merchants/${this.mId}/items/${id}`);
  }

  async listOrders(p?: { limit?: number; offset?: number; filter?: string }): Promise<Order[]> {
    return (await this.http.get<CloverListResponse<Order>>(`/v3/merchants/${this.mId}/orders`, { params: p })).data.elements || [];
  }

  async getOrder(id: string, expand?: string): Promise<Order> {
    return (await this.http.get<Order>(`/v3/merchants/${this.mId}/orders/${id}`, { params: expand ? { expand } : {} })).data;
  }

  async createOrder(o: Partial<Order>): Promise<Order> {
    return (await this.http.post<Order>(`/v3/merchants/${this.mId}/orders`, o)).data;
  }

  async request<T>(method: string, path: string, data?: unknown): Promise<T> {
    return (await this.http.request<T>({ method, url: path.replace('{mId}', this.mId), data })).data;
  }

  /**
   * Fetch ALL payments with pagination and optional date filter
   * Uses server-side filtering for efficiency
   */
  async listAllPayments(opts?: { fromMs?: number; toMs?: number; limit?: number }): Promise<Payment[]> {
    const all: Payment[] = [];
    let offset = 0;
    const maxItems = opts?.limit || 10000;
    
    // Build date filters
    const filters: string[] = [];
    if (opts?.fromMs) filters.push(`createdTime>=${opts.fromMs}`);
    if (opts?.toMs) filters.push(`createdTime<${opts.toMs}`);

    while (all.length < maxItems) {
      const qs = buildQueryString({ limit: BATCH_SIZE, offset, filters: filters.length ? filters : undefined });
      const resp = await this.http.get<CloverListResponse<Payment>>(
        `/v3/merchants/${this.mId}/payments?${qs}`
      );
      const batch = resp.data.elements || [];
      all.push(...batch);
      
      if (batch.length < BATCH_SIZE) break; // No more pages
      offset += BATCH_SIZE;
      await sleep(RATE_LIMIT_DELAY);
    }
    
    return all.slice(0, maxItems);
  }

  /**
   * Fetch ALL orders with pagination and optional date filter
   */
  async listAllOrders(opts?: { fromMs?: number; toMs?: number; limit?: number }): Promise<Order[]> {
    const all: Order[] = [];
    let offset = 0;
    const maxItems = opts?.limit || 10000;
    
    const filters: string[] = [];
    if (opts?.fromMs) filters.push(`createdTime>=${opts.fromMs}`);
    if (opts?.toMs) filters.push(`createdTime<${opts.toMs}`);

    while (all.length < maxItems) {
      const qs = buildQueryString({ limit: BATCH_SIZE, offset, filters: filters.length ? filters : undefined });
      const resp = await this.http.get<CloverListResponse<Order>>(
        `/v3/merchants/${this.mId}/orders?${qs}`
      );
      const batch = resp.data.elements || [];
      all.push(...batch);
      
      if (batch.length < BATCH_SIZE) break;
      offset += BATCH_SIZE;
      await sleep(RATE_LIMIT_DELAY);
    }
    
    return all.slice(0, maxItems);
  }

  /**
   * Fetch ALL refunds with pagination and optional date filter
   */
  async listAllRefunds(opts?: { fromMs?: number; toMs?: number }): Promise<Refund[]> {
    const all: Refund[] = [];
    let offset = 0;
    
    const filters: string[] = [];
    if (opts?.fromMs) filters.push(`createdTime>=${opts.fromMs}`);
    if (opts?.toMs) filters.push(`createdTime<${opts.toMs}`);

    while (true) {
      const qs = buildQueryString({ limit: BATCH_SIZE, offset, filters: filters.length ? filters : undefined });
      const resp = await this.http.get<CloverListResponse<Refund>>(
        `/v3/merchants/${this.mId}/refunds?${qs}`
      );
      const batch = resp.data.elements || [];
      all.push(...batch);
      
      if (batch.length < BATCH_SIZE) break;
      offset += BATCH_SIZE;
      await sleep(RATE_LIMIT_DELAY);
    }
    
    return all;
  }
}
