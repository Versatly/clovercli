import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type { Config, MerchantCredentials, Region } from '../types/clover';

function getConfigDir(): string { return process.platform === 'win32' ? path.join(process.env.APPDATA || os.homedir(), 'clovercli') : path.join(os.homedir(), '.config', 'clovercli'); }
function getConfigPath(): string { return path.join(getConfigDir(), 'config.json'); }

export function loadConfig(): Config {
  try { if (fs.existsSync(getConfigPath())) return JSON.parse(fs.readFileSync(getConfigPath(), 'utf-8')); } catch {}
  return { credentials: {} };
}

export function saveConfig(config: Config): void {
  const dir = getConfigDir(); if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(getConfigPath(), JSON.stringify(config, null, 2));
}

export function getMerchantCredentials(merchantId?: string): MerchantCredentials | null {
  const config = loadConfig(); const mId = merchantId || config.default_merchant;
  return mId ? config.credentials[mId] || null : null;
}

export function saveMerchantCredentials(merchantId: string, creds: MerchantCredentials): void {
  const config = loadConfig(); config.credentials[merchantId] = creds;
  if (!config.default_merchant) config.default_merchant = merchantId;
  saveConfig(config);
}

export function updateAccessToken(merchantId: string, token: string, expiresIn?: number): void {
  const config = loadConfig();
  if (config.credentials[merchantId]) {
    config.credentials[merchantId].access_token = token;
    if (expiresIn) config.credentials[merchantId].expires_at = Date.now() + expiresIn * 1000;
    saveConfig(config);
  }
}

export function removeMerchantCredentials(merchantId: string): void {
  const config = loadConfig(); delete config.credentials[merchantId];
  if (config.default_merchant === merchantId) { const k = Object.keys(config.credentials); config.default_merchant = k.length > 0 ? k[0] : undefined; }
  saveConfig(config);
}

export function setDefaultMerchant(merchantId: string): void { const config = loadConfig(); config.default_merchant = merchantId; saveConfig(config); }
export function listMerchants(): string[] { return Object.keys(loadConfig().credentials); }
export function getDefaultMerchant(): string | undefined { return loadConfig().default_merchant; }
export function resolveMerchantId(id?: string): string | null { return id || process.env.CLOVER_MERCHANT_ID || loadConfig().default_merchant || null; }
