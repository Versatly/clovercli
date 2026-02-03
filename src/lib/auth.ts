import express from 'express';
import open from 'open';
import axios from 'axios';
import config, { getAuthUrl, getBaseUrl } from './config.js';
import type { Region, TokenResponse } from '../types/clover.js';

export async function login(clientId: string, clientSecret: string, region: Region): Promise<void> {
  const app = express(); const port = 3000; const redirectUri = `http://localhost:${port}/callback`;
  return new Promise<void>((resolve, reject) => {
    const server = app.listen(port, async () => { const u = `${getAuthUrl()}/oauth/v2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code`; console.log('Opening browser...'); console.log('URL:', u); await open(u); });
    app.get('/callback', async (req, res) => {
      const { code, merchant_id } = req.query;
      if (!code || !merchant_id) { res.send('Failed'); server.close(); reject(new Error('Missing code/merchant_id')); return; }
      try {
        const r = await axios.get<TokenResponse>(`${getBaseUrl()}/oauth/v2/token`, { params: { client_id: clientId, client_secret: clientSecret, code } });
        const { access_token, refresh_token, expires_in } = r.data;
        const creds = config.get('credentials') || {};
        creds[merchant_id as string] = { client_id: clientId, client_secret: clientSecret, access_token, refresh_token, expires_at: Date.now() + expires_in * 1000, region };
        config.set('credentials', creds); config.set('default_merchant', merchant_id as string); config.set('region', region);
        res.send('Success! Close this tab.'); console.log('Authenticated:', merchant_id); server.close(); resolve();
      } catch (e: any) { res.send('Error: ' + e.message); server.close(); reject(e); }
    });
    setTimeout(() => { server.close(); reject(new Error('Timeout')); }, 300000);
  });
}

export async function refreshToken(merchantId: string): Promise<string> {
  const creds = config.get('credentials')[merchantId]; if (!creds?.refresh_token) throw new Error('No refresh token');
  const r = await axios.get<TokenResponse>(`${getBaseUrl()}/oauth/v2/refresh`, { params: { client_id: creds.client_id, client_secret: creds.client_secret, refresh_token: creds.refresh_token } });
  const all = config.get('credentials'); all[merchantId] = { ...creds, access_token: r.data.access_token, refresh_token: r.data.refresh_token, expires_at: Date.now() + r.data.expires_in * 1000 };
  config.set('credentials', all); return r.data.access_token;
}
