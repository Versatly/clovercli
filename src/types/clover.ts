export type Region = 'us' | 'eu' | 'la' | 'sandbox';
export interface Merchant { id: string; name: string; phoneNumber?: string; website?: string; }
export interface Item { id: string; name: string; price: number; sku?: string; hidden?: boolean; }
export interface Order { id: string; total?: number; taxAmount?: number; tipAmount?: number; status?: string; note?: string; createdTime?: number; }
export interface LineItem { id: string; name: string; price: number; quantity?: number; }
export interface CloverListResponse<T> { elements: T[]; }
export interface TokenResponse { access_token: string; refresh_token: string; expires_in: number; }
export interface CloverCredential { client_id: string; client_secret: string; access_token?: string; refresh_token?: string; expires_at?: number; region?: Region; }
export interface CloverConfig { default_merchant?: string; region: Region; credentials: Record<string, CloverCredential>; }
