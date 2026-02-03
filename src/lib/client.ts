import axios, { AxiosInstance } from 'axios';
import type { Region, MerchantCredentials, CloverResponse, Merchant, Item, Category, ItemStock, Order, LineItem } from '../types/clover';
import { getMerchantCredentials } from './config';
import { getApiUrl, refreshAccessToken, isTokenExpired } from './auth';

export class CloverClient {
  private axios: AxiosInstance;
  private merchantId: string;

  constructor(merchantId: string, credentials: MerchantCredentials) {
    this.merchantId = merchantId;
    this.axios = axios.create({
      baseURL: getApiUrl(credentials.region),
      headers: { 'Authorization': `Bearer ${credentials.access_token}` }
    });

    this.axios.interceptors.response.use(r => r, async (error) => {
      if (error.response?.status === 401 && !error.config._retry) {
        error.config._retry = true;
        const newToken = await refreshAccessToken(this.merchantId);
        error.config.headers['Authorization'] = `Bearer ${newToken}`;
        return this.axios(error.config);
      }
      return Promise.reject(error);
    });
  }

  private path(p: string): string {
    return p.replace('{mId}', this.merchantId);
  }

  async getMerchant(): Promise<Merchant> {
    const r = await this.axios.get<Merchant>(this.path('/v3/merchants/{mId}'));
    return r.data;
  }

  async listItems(params?: { limit?: number; offset?: number }): Promise<Item[]> {
    const r = await this.axios.get<CloverResponse<Item>>(this.path('/v3/merchants/{mId}/items'), { params });
    return r.data.elements || [];
  }

  async getItem(itemId: string): Promise<Item> {
    const r = await this.axios.get<Item>(this.path(`/v3/merchants/{mId}/items/${itemId}`));
    return r.data;
  }

  async createItem(data: { name: string; price?: number; sku?: string }): Promise<Item> {
    const r = await this.axios.post<Item>(this.path('/v3/merchants/{mId}/items'), data);
    return r.data;
  }

  async updateItem(itemId: string, data: Partial<Item>): Promise<Item> {
    const r = await this.axios.post<Item>(this.path(`/v3/merchants/{mId}/items/${itemId}`), data);
    return r.data;
  }

  async deleteItem(itemId: string): Promise<void> {
    await this.axios.delete(this.path(`/v3/merchants/{mId}/items/${itemId}`));
  }

  async listCategories(): Promise<Category[]> {
    const r = await this.axios.get<CloverResponse<Category>>(this.path('/v3/merchants/{mId}/categories'));
    return r.data.elements || [];
  }

  async createCategory(name: string): Promise<Category> {
    const r = await this.axios.post<Category>(this.path('/v3/merchants/{mId}/categories'), { name });
    return r.data;
  }

  async getItemStock(itemId: string): Promise<ItemStock> {
    const r = await this.axios.get<ItemStock>(this.path(`/v3/merchants/{mId}/item_stocks/${itemId}`));
    return r.data;
  }

  async updateItemStock(itemId: string, quantity: number): Promise<ItemStock> {
    const r = await this.axios.post<ItemStock>(this.path(`/v3/merchants/{mId}/item_stocks/${itemId}`), { quantity });
    return r.data;
  }

  async listOrders(params?: { limit?: number; offset?: number }): Promise<Order[]> {
    const r = await this.axios.get<CloverResponse<Order>>(this.path('/v3/merchants/{mId}/orders'), { params });
    return r.data.elements || [];
  }

  async getOrder(orderId: string): Promise<Order> {
    const r = await this.axios.get<Order>(this.path(`/v3/merchants/{mId}/orders/${orderId}`));
    return r.data;
  }

  async createOrder(data: { total?: number; note?: string }): Promise<Order> {
    const r = await this.axios.post<Order>(this.path('/v3/merchants/{mId}/orders'), data);
    return r.data;
  }

  async updateOrder(orderId: string, data: Partial<Order>): Promise<Order> {
    const r = await this.axios.post<Order>(this.path(`/v3/merchants/{mId}/orders/${orderId}`), data);
    return r.data;
  }

  async deleteOrder(orderId: string): Promise<void> {
    await this.axios.delete(this.path(`/v3/merchants/{mId}/orders/${orderId}`));
  }

  async addLineItem(orderId: string, data: { item?: { id: string }; name?: string; price?: number; unitQty?: number }): Promise<LineItem> {
    const r = await this.axios.post<LineItem>(this.path(`/v3/merchants/{mId}/orders/${orderId}/line_items`), data);
    return r.data;
  }
}

export async function createClient(merchantId?: string): Promise<{ client: CloverClient; merchantId: string }> {
  const mId = merchantId || process.env.CLOVER_MERCHANT_ID;
  if (!mId) throw new Error('No merchant ID. Use --merchant or set CLOVER_MERCHANT_ID.');

  let creds = getMerchantCredentials(mId);
  if (!creds && process.env.CLOVER_ACCESS_TOKEN) {
    creds = {
      client_id: process.env.CLOVER_CLIENT_ID || '',
      client_secret: process.env.CLOVER_CLIENT_SECRET || '',
      access_token: process.env.CLOVER_ACCESS_TOKEN,
      region: (process.env.CLOVER_REGION as Region) || 'us',
    };
  }
  if (!creds) throw new Error(`No credentials for ${mId}. Run 'clovercli auth login' first.`);

  if (creds.refresh_token && isTokenExpired(creds)) {
    creds.access_token = await refreshAccessToken(mId);
  }

  return { client: new CloverClient(mId, creds), merchantId: mId };
}
