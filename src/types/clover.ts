export type Region = 'us' | 'eu' | 'la' | 'sandbox';

export interface CloverResponse<T> {
  elements?: T[];
  href?: string;
}

export interface Merchant {
  id: string;
  name: string;
  phoneNumber?: string;
  website?: string;
  timezone?: string;
  defaultCurrency?: string;
}

export interface Item {
  id: string;
  name: string;
  price?: number;
  sku?: string;
  available?: boolean;
}

export interface Category {
  id: string;
  name: string;
  sortOrder?: number;
}

export interface ItemStock {
  item?: { id: string };
  quantity?: number;
}

export interface Order {
  id: string;
  total?: number;
  state?: string | null;
  note?: string;
  createdTime?: number;
}

export interface LineItem {
  id: string;
  name?: string;
  price?: number;
  unitQty?: number;
}

export interface MerchantCredentials {
  client_id: string;
  client_secret: string;
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
  region: Region;
}

export interface Config {
  default_merchant?: string;
  region?: Region;
  credentials: Record<string, MerchantCredentials>;
}
