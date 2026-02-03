import axios, { type AxiosInstance } from 'axios';
import { getActiveCredentials, getBaseUrl, getActiveMerchantId } from './config.js';
import type { Merchant, Item, Order, CloverListResponse } from '../types/clover.js';

export class CloverClient {
  private http: AxiosInstance;
  constructor() {
    const creds = getActiveCredentials(); if (!creds?.access_token) throw new Error('Not authenticated. Run: clovercli auth login');
    this.http = axios.create({ baseURL: getBaseUrl(), headers: { Authorization: `Bearer ${creds.access_token}`, 'Content-Type': 'application/json' } });
  }
  private get mId(): string { const m = getActiveMerchantId(); if (!m) throw new Error('No merchant'); return m; }
  async getMerchant(): Promise<Merchant> { return (await this.http.get<Merchant>(`/v3/merchants/${this.mId}`)).data; }
  async listItems(p?: { limit?: number; offset?: number }): Promise<Item[]> { return (await this.http.get<CloverListResponse<Item>>(`/v3/merchants/${this.mId}/items`, { params: p })).data.elements || []; }
  async getItem(id: string): Promise<Item> { return (await this.http.get<Item>(`/v3/merchants/${this.mId}/items/${id}`)).data; }
  async createItem(i: Partial<Item>): Promise<Item> { return (await this.http.post<Item>(`/v3/merchants/${this.mId}/items`, i)).data; }
  async updateItem(id: string, i: Partial<Item>): Promise<Item> { return (await this.http.post<Item>(`/v3/merchants/${this.mId}/items/${id}`, i)).data; }
  async deleteItem(id: string): Promise<void> { await this.http.delete(`/v3/merchants/${this.mId}/items/${id}`); }
  async listOrders(p?: { limit?: number; offset?: number; filter?: string }): Promise<Order[]> { return (await this.http.get<CloverListResponse<Order>>(`/v3/merchants/${this.mId}/orders`, { params: p })).data.elements || []; }
  async getOrder(id: string, expand?: string): Promise<Order> { return (await this.http.get<Order>(`/v3/merchants/${this.mId}/orders/${id}`, { params: expand ? { expand } : {} })).data; }
  async createOrder(o: Partial<Order>): Promise<Order> { return (await this.http.post<Order>(`/v3/merchants/${this.mId}/orders`, o)).data; }
  async request<T>(method: string, path: string, data?: unknown): Promise<T> { return (await this.http.request<T>({ method, url: path.replace('{mId}', this.mId), data })).data; }
}
