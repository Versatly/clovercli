import Conf from 'conf';
import type { Region, CloverCredential, CloverConfig } from '../types/clover.js';

const schema = {
  default_merchant: { type: 'string' },
  region: { type: 'string', enum: ['us', 'eu', 'la', 'sandbox'], default: 'us' },
  credentials: { type: 'object', default: {} },
} as const;

const config = new Conf<CloverConfig>({ projectName: 'clovercli', schema });
export default config;

export function getActiveMerchantId(): string | undefined {
  return process.env.CLOVER_MERCHANT_ID || config.get('default_merchant');
}

export function getActiveCredentials(): CloverCredential | undefined {
  const mId = getActiveMerchantId();
  if (!mId) return undefined;
  if (process.env.CLOVER_ACCESS_TOKEN) {
    return {
      client_id: process.env.CLOVER_CLIENT_ID || '',
      client_secret: process.env.CLOVER_CLIENT_SECRET || '',
      access_token: process.env.CLOVER_ACCESS_TOKEN,
    };
  }
  return config.get('credentials')?.[mId];
}

export function getRegion(): Region {
  return (process.env.CLOVER_REGION as Region) || config.get('region') || 'us';
}

export function getBaseUrl(): string {
  const region = getRegion();
  const urls: Record<Region, string> = {
    sandbox: 'https://apisandbox.dev.clover.com',
    eu: 'https://api.eu.clover.com',
    la: 'https://api.la.clover.com',
    us: 'https://api.clover.com',
  };
  return urls[region];
}

export function getAuthUrl(): string {
  const region = getRegion();
  const urls: Record<Region, string> = {
    sandbox: 'https://sandbox.dev.clover.com',
    eu: 'https://www.eu.clover.com',
    la: 'https://www.la.clover.com',
    us: 'https://www.clover.com',
  };
  return urls[region];
}
