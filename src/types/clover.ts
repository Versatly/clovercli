export type Region = 'us' | 'eu' | 'la' | 'sandbox';

export interface Merchant {
  id: string;
  name: string;
  owner?: { id: string };
  address?: { address1?: string; city?: string; state?: string; zip?: string; country?: string };
  phoneNumber?: string;
  website?: string;
}

export interface Item {
  id: string;
  name: string;
  price: number;
  priceType?: 'FIXED' | 'VARIABLE' | 'PER_UNIT';
  sku?: string;
  code?: string;
  hidden?: boolean;
  available?: boolean;
}

export interface Order {
  id: string;
  total?: number;
  currency?: string;
  status?: string;
  note?: string;
  createdTime?: number;
  lineItems?: { elements: LineItem[] };
}

export interface LineItem {
  id: string;
  name: string;
  price: number;
  quantity?: number;
}

export interface CloverListResponse<T> {
  elements: T[];
  href?: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface CloverCredential {
  client_id: string;
  client_secret: string;
  access_token?: string;
  refresh_token?: string;
  expires_at?: number;
  region?: Region;
}

export interface CloverConfig {
  default_merchant?: string;
  region: Region;
  credentials: Record<string, CloverCredential>;
}
