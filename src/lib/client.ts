import axios, { type AxiosInstance } from 'axios';
import { getActiveCredentials, getBaseUrl, getActiveMerchantId } from './config.js';
import type { Merchant, Item, Order, CloverListResponse } from '../types/clover.js';

export class CloverClient {
  private http: AxiosInstance;

  constructor() {
    const credentials = getActiveCredentials();
    if (!credentials?.access_token) throw new Error('Not authenticated. Run "clovercli auth login" first.');

    this.http = axios.create({
      baseURL: getBaseUrl(),
      headers: { Authorization: `Bearer ${credentials.access_token}`, 'Content-Type': 'application/json' },
    });
  }

  private get mId(): string {
    const mId = getActiveMerchantId();
    if (!mId) throw new Error('Merchant ID not configured.');
    return mId;
  }

  async getMerchant(): Promise<Merchant> {
    return (await this.http.get<Merchant>(`/v3/merchants/${this.mId}`)).data;
  }

  async listItems(params?: { limit?: number; offset?: number }): Promise<Item[]> {
    return (await this.http.get<CloverListResponse<Item>>(`/v3/merchants/${this.mId}/items`, { params })).data.elements || [];
  }

  async getItem(itemId: string): Promise<Item> {
    return (await this.http.get<Item>(`/v3/merchants/${this.mId}/items/${itemId}`)).data;
  }

  async createItem(item: Partial<Item>): Promise<Item> {
    return (await this.http.post<Item>(`/v3/merchants/${this.mId}/items`, item)).data;
  }

  async updateItem(itemId: string, item: Partial<Item>): Promise<Item> {
    return (await this.http.post<Item>(`/v3/merchants/${this.mId}/items/${itemId}`, item)).data;
  }

  async deleteItem(itemId: string): Promise<void> {
    await this.http.delete(`/v3/merchants/${this.mId}/items/${itemId}`);
  }

  async listOrders(params?: { limit?: number; offset?: number; filter?: string }): Promise<Order[]> {
    return (await this.http.get<CloverListResponse<Order>>(`/v3/merchants/${this.mId}/orders`, { params })).data.elements || [];
  }

  async getOrder(orderId: string, expand?: string): Promise<Order> {
    return (await this.http.get<Order>(`/v3/merchants/${this.mId}/orders/${orderId}`, { params: expand ? { expand } : {} })).data;
  }

  async createOrder(order: Partial<Order>): Promise<Order> {
    return (await this.http.post<Order>(`/v3/merchants/${this.mId}/orders`, order)).data;
  }

  async request<T>(method: string, path: string, data?: unknown): Promise<T> {
    return (await this.http.request<T>({ method, url: path.replace('{mId}', this.mId), data })).data;
  }
}
