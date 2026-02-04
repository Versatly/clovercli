import axios, { type AxiosInstance, type AxiosError } from 'axios';
import { getActiveCredentials, getBaseUrl, getActiveMerchantId } from './config.js';
import type { Merchant, Item, Order, CloverListResponse } from '../types/clover.js';
import chalk from 'chalk';

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

export interface Discount {
  id: string;
  name: string;
  percentage?: number;
  amount?: number;
}

export interface TaxRate {
  id: string;
  name: string;
  rate: number;
  isDefault?: boolean;
}

export interface Tender {
  id: string;
  label: string;
  labelKey?: string;
  enabled?: boolean;
  visible?: boolean;
}

const BATCH_SIZE = 1000;
const RATE_LIMIT_DELAY = 100;
const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;
const MAX_RETRIES = 5;

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

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

  /**
   * Request with exponential backoff retry on rate limits
   */
  private async requestWithRetry<T>(
    method: string,
    url: string,
    data?: unknown,
    retries = MAX_RETRIES
  ): Promise<T> {
    for (let i = 0; i < retries; i++) {
      try {
        const resp = await this.http.request<T>({ method, url, data });
        return resp.data;
      } catch (error) {
        const axiosError = error as AxiosError;
        if (axiosError.response?.status === 429 && i < retries - 1) {
          const retryAfter = parseInt(axiosError.response.headers['retry-after'] as string || '1');
          const delay = Math.max(retryAfter * 1000, Math.pow(2, i) * 1000);
          console.log(chalk.yellow(`Rate limited. Retrying in ${delay/1000}s... (${i+1}/${retries})`));
          await sleep(delay);
          continue;
        }
        throw error;
      }
    }
    throw new Error('Max retries exceeded');
  }

  async getMerchant(): Promise<Merchant> {
    return this.requestWithRetry('GET', `/v3/merchants/${this.mId}`);
  }

  async listItems(p?: { limit?: number; offset?: number }): Promise<Item[]> {
    const resp = await this.requestWithRetry<CloverListResponse<Item>>('GET', `/v3/merchants/${this.mId}/items?limit=${p?.limit || 100}&offset=${p?.offset || 0}`);
    return resp.elements || [];
  }

  async getItem(id: string): Promise<Item> {
    return this.requestWithRetry('GET', `/v3/merchants/${this.mId}/items/${id}`);
  }

  async createItem(i: Partial<Item>): Promise<Item> {
    return this.requestWithRetry('POST', `/v3/merchants/${this.mId}/items`, i);
  }

  async updateItem(id: string, i: Partial<Item>): Promise<Item> {
    return this.requestWithRetry('POST', `/v3/merchants/${this.mId}/items/${id}`, i);
  }

  async deleteItem(id: string): Promise<void> {
    await this.requestWithRetry('DELETE', `/v3/merchants/${this.mId}/items/${id}`);
  }

  async listOrders(p?: { limit?: number; offset?: number; filter?: string }): Promise<Order[]> {
    let url = `/v3/merchants/${this.mId}/orders?limit=${p?.limit || 100}&offset=${p?.offset || 0}`;
    if (p?.filter) url += `&filter=${encodeURIComponent(p.filter)}`;
    const resp = await this.requestWithRetry<CloverListResponse<Order>>('GET', url);
    return resp.elements || [];
  }

  async getOrder(id: string, expand?: string): Promise<Order> {
    let url = `/v3/merchants/${this.mId}/orders/${id}`;
    if (expand) url += `?expand=${expand}`;
    return this.requestWithRetry('GET', url);
  }

  async createOrder(o: Partial<Order>): Promise<Order> {
    return this.requestWithRetry('POST', `/v3/merchants/${this.mId}/orders`, o);
  }

  async request<T>(method: string, path: string, data?: unknown): Promise<T> {
    return this.requestWithRetry(method, path.replace('{mId}', this.mId), data);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DISCOUNTS
  // ═══════════════════════════════════════════════════════════════════════════
  
  async listDiscounts(): Promise<Discount[]> {
    const resp = await this.requestWithRetry<CloverListResponse<Discount>>('GET', `/v3/merchants/${this.mId}/discounts?limit=500`);
    return resp.elements || [];
  }

  async getDiscount(id: string): Promise<Discount> {
    return this.requestWithRetry('GET', `/v3/merchants/${this.mId}/discounts/${id}`);
  }

  async createDiscount(d: Partial<Discount>): Promise<Discount> {
    return this.requestWithRetry('POST', `/v3/merchants/${this.mId}/discounts`, d);
  }

  async deleteDiscount(id: string): Promise<void> {
    await this.requestWithRetry('DELETE', `/v3/merchants/${this.mId}/discounts/${id}`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TAX RATES
  // ═══════════════════════════════════════════════════════════════════════════

  async listTaxRates(): Promise<TaxRate[]> {
    const resp = await this.requestWithRetry<CloverListResponse<TaxRate>>('GET', `/v3/merchants/${this.mId}/tax_rates?limit=100`);
    return resp.elements || [];
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TENDERS
  // ═══════════════════════════════════════════════════════════════════════════

  async listTenders(): Promise<Tender[]> {
    const resp = await this.requestWithRetry<CloverListResponse<Tender>>('GET', `/v3/merchants/${this.mId}/tenders?limit=100`);
    return resp.elements || [];
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGINATED FETCHERS WITH 90-DAY CHUNKING
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Fetch ALL payments with automatic 90-day chunking
   * Clover API limits date-filtered queries to 90 days max
   */
  async listAllPayments(opts?: { fromMs?: number; toMs?: number; limit?: number; showWarning?: boolean }): Promise<Payment[]> {
    const fromMs = opts?.fromMs;
    const toMs = opts?.toMs;
    
    // Check if we need chunking
    if (fromMs && toMs && (toMs - fromMs) > NINETY_DAYS_MS) {
      if (opts?.showWarning !== false) {
        console.log(chalk.yellow('⚠️  Date range >90 days. Using chunked requests...'));
      }
      return this.listAllPaymentsChunked(fromMs, toMs, opts?.limit);
    }
    
    return this.fetchPaymentsBatch(fromMs, toMs, opts?.limit);
  }

  private async listAllPaymentsChunked(fromMs: number, toMs: number, limit?: number): Promise<Payment[]> {
    const all: Payment[] = [];
    let start = fromMs;
    
    while (start < toMs) {
      const end = Math.min(start + NINETY_DAYS_MS, toMs);
      const chunk = await this.fetchPaymentsBatch(start, end, limit ? limit - all.length : undefined);
      all.push(...chunk);
      if (limit && all.length >= limit) break;
      start = end;
    }
    
    return limit ? all.slice(0, limit) : all;
  }

  private async fetchPaymentsBatch(fromMs?: number, toMs?: number, limit?: number): Promise<Payment[]> {
    const all: Payment[] = [];
    let offset = 0;
    const maxItems = limit || 10000;
    
    const filters: string[] = [];
    if (fromMs) filters.push(`createdTime>=${fromMs}`);
    if (toMs) filters.push(`createdTime<${toMs}`);

    while (all.length < maxItems) {
      const qs = buildQueryString({ limit: BATCH_SIZE, offset, filters: filters.length ? filters : undefined });
      const resp = await this.requestWithRetry<CloverListResponse<Payment>>('GET', `/v3/merchants/${this.mId}/payments?${qs}`);
      const batch = resp.elements || [];
      all.push(...batch);
      
      if (batch.length < BATCH_SIZE) break;
      offset += BATCH_SIZE;
      await sleep(RATE_LIMIT_DELAY);
    }
    
    return all.slice(0, maxItems);
  }

  /**
   * Fetch ALL orders with automatic 90-day chunking
   */
  async listAllOrders(opts?: { fromMs?: number; toMs?: number; limit?: number; showWarning?: boolean }): Promise<Order[]> {
    const fromMs = opts?.fromMs;
    const toMs = opts?.toMs;
    
    if (fromMs && toMs && (toMs - fromMs) > NINETY_DAYS_MS) {
      if (opts?.showWarning !== false) {
        console.log(chalk.yellow('⚠️  Date range >90 days. Using chunked requests...'));
      }
      return this.listAllOrdersChunked(fromMs, toMs, opts?.limit);
    }
    
    return this.fetchOrdersBatch(fromMs, toMs, opts?.limit);
  }

  private async listAllOrdersChunked(fromMs: number, toMs: number, limit?: number): Promise<Order[]> {
    const all: Order[] = [];
    let start = fromMs;
    
    while (start < toMs) {
      const end = Math.min(start + NINETY_DAYS_MS, toMs);
      const chunk = await this.fetchOrdersBatch(start, end, limit ? limit - all.length : undefined);
      all.push(...chunk);
      if (limit && all.length >= limit) break;
      start = end;
    }
    
    return limit ? all.slice(0, limit) : all;
  }

  private async fetchOrdersBatch(fromMs?: number, toMs?: number, limit?: number): Promise<Order[]> {
    const all: Order[] = [];
    let offset = 0;
    const maxItems = limit || 10000;
    
    const filters: string[] = [];
    if (fromMs) filters.push(`createdTime>=${fromMs}`);
    if (toMs) filters.push(`createdTime<${toMs}`);

    while (all.length < maxItems) {
      const qs = buildQueryString({ limit: BATCH_SIZE, offset, filters: filters.length ? filters : undefined });
      const resp = await this.requestWithRetry<CloverListResponse<Order>>('GET', `/v3/merchants/${this.mId}/orders?${qs}`);
      const batch = resp.elements || [];
      all.push(...batch);
      
      if (batch.length < BATCH_SIZE) break;
      offset += BATCH_SIZE;
      await sleep(RATE_LIMIT_DELAY);
    }
    
    return all.slice(0, maxItems);
  }

  /**
   * Fetch ALL refunds with automatic 90-day chunking
   */
  async listAllRefunds(opts?: { fromMs?: number; toMs?: number; showWarning?: boolean }): Promise<Refund[]> {
    const fromMs = opts?.fromMs;
    const toMs = opts?.toMs;
    
    if (fromMs && toMs && (toMs - fromMs) > NINETY_DAYS_MS) {
      if (opts?.showWarning !== false) {
        console.log(chalk.yellow('⚠️  Date range >90 days. Using chunked requests...'));
      }
      return this.listAllRefundsChunked(fromMs, toMs);
    }
    
    return this.fetchRefundsBatch(fromMs, toMs);
  }

  private async listAllRefundsChunked(fromMs: number, toMs: number): Promise<Refund[]> {
    const all: Refund[] = [];
    let start = fromMs;
    
    while (start < toMs) {
      const end = Math.min(start + NINETY_DAYS_MS, toMs);
      const chunk = await this.fetchRefundsBatch(start, end);
      all.push(...chunk);
      start = end;
    }
    
    return all;
  }

  private async fetchRefundsBatch(fromMs?: number, toMs?: number): Promise<Refund[]> {
    const all: Refund[] = [];
    let offset = 0;
    
    const filters: string[] = [];
    if (fromMs) filters.push(`createdTime>=${fromMs}`);
    if (toMs) filters.push(`createdTime<${toMs}`);

    while (true) {
      const qs = buildQueryString({ limit: BATCH_SIZE, offset, filters: filters.length ? filters : undefined });
      const resp = await this.requestWithRetry<CloverListResponse<Refund>>('GET', `/v3/merchants/${this.mId}/refunds?${qs}`);
      const batch = resp.elements || [];
      all.push(...batch);
      
      if (batch.length < BATCH_SIZE) break;
      offset += BATCH_SIZE;
      await sleep(RATE_LIMIT_DELAY);
    }
    
    return all;
  }
}
