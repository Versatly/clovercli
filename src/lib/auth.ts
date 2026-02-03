import axios from 'axios';
import express from 'express';
import open from 'open';
import type { Region, MerchantCredentials } from '../types/clover';
import { saveMerchantCredentials, getMerchantCredentials, updateAccessToken } from './config';

const API_URLS: Record<Region, string> = {
  us: 'https://api.clover.com',
  eu: 'https://api.eu.clover.com',
  la: 'https://api.la.clover.com',
  sandbox: 'https://apisandbox.dev.clover.com',
};

const AUTH_URLS: Record<Region, string> = {
  us: 'https://www.clover.com',
  eu: 'https://www.eu.clover.com',
  la: 'https://www.la.clover.com',
  sandbox: 'https://sandbox.dev.clover.com',
};

export function getApiUrl(region: Region): string {
  return API_URLS[region] || API_URLS.us;
}

const PORT = 8089;
const REDIRECT_URI = `http://localhost:${PORT}/callback`;

export async function startOAuthFlow(
  clientId: string,
  clientSecret: string,
  region: Region = 'us'
): Promise<{ merchantId: string; credentials: MerchantCredentials }> {
  return new Promise((resolve, reject) => {
    const app = express();
    let server: ReturnType<typeof app.listen>;

    app.get('/callback', async (req, res) => {
      const { code, merchant_id } = req.query;
      if (!code || !merchant_id) {
        res.status(400).send('Missing code or merchant_id');
        reject(new Error('Missing code or merchant_id'));
        server?.close();
        return;
      }

      try {
        const tokenRes = await axios.post(`${API_URLS[region]}/oauth/v2/token`, null, {
          params: { client_id: clientId, client_secret: clientSecret, code, grant_type: 'authorization_code' }
        });

        const credentials: MerchantCredentials = {
          client_id: clientId,
          client_secret: clientSecret,
          access_token: tokenRes.data.access_token,
          refresh_token: tokenRes.data.refresh_token,
          expires_at: tokenRes.data.expires_in ? Date.now() + tokenRes.data.expires_in * 1000 : undefined,
          region,
        };

        saveMerchantCredentials(String(merchant_id), credentials);
        res.send('<h1>✓ Authentication successful!</h1><p>You can close this window.</p>');
        resolve({ merchantId: String(merchant_id), credentials });
      } catch (err) {
        res.status(500).send('Token exchange failed');
        reject(err);
      } finally {
        server?.close();
      }
    });

    server = app.listen(PORT, () => {
      const authUrl = `${AUTH_URLS[region]}/oauth/v2/authorize?client_id=${clientId}&redirect_uri=${REDIRECT_URI}&response_type=code`;
      console.log(`Opening browser for authorization...`);
      console.log(`If browser doesn't open, visit: ${authUrl}\n`);
      open(authUrl).catch(() => {});
    });

    setTimeout(() => { reject(new Error('OAuth timeout')); server?.close(); }, 5 * 60 * 1000);
  });
}

export async function refreshAccessToken(merchantId: string): Promise<string> {
  const creds = getMerchantCredentials(merchantId);
  if (!creds?.refresh_token) throw new Error('No refresh token');

  const res = await axios.post(`${API_URLS[creds.region]}/oauth/v2/refresh`, null, {
    params: { client_id: creds.client_id, client_secret: creds.client_secret, refresh_token: creds.refresh_token }
  });

  updateAccessToken(merchantId, res.data.access_token, res.data.expires_in);
  return res.data.access_token;
}

export function isTokenExpired(creds: MerchantCredentials): boolean {
  if (!creds.expires_at) return false;
  return Date.now() >= creds.expires_at - 300000;
}
