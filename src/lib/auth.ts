import express from 'express';
import open from 'open';
import axios from 'axios';
import config, { getAuthUrl, getBaseUrl } from './config.js';
import type { Region, TokenResponse } from '../types/clover.js';

export async function login(clientId: string, clientSecret: string, region: Region): Promise<void> {
  const app = express();
  const port = 3000;
  const redirectUri = `http://localhost:${port}/callback`;

  return new Promise<void>((resolve, reject) => {
    const server = app.listen(port, async () => {
      const authUrl = getAuthUrl();
      const url = `${authUrl}/oauth/v2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code`;
      console.log('Opening browser for authentication...');
      console.log('If browser does not open, visit:', url);
      await open(url);
    });

    app.get('/callback', async (req, res) => {
      const { code, merchant_id } = req.query;
      if (!code || !merchant_id) {
        res.send('Authentication failed: Missing code or merchant_id');
        server.close();
        reject(new Error('Missing code or merchant_id'));
        return;
      }

      try {
        const baseUrl = getBaseUrl();
        const tokenResponse = await axios.get<TokenResponse>(`${baseUrl}/oauth/v2/token`, {
          params: { client_id: clientId, client_secret: clientSecret, code },
        });

        const { access_token, refresh_token, expires_in } = tokenResponse.data;
        const expiresAt = Date.now() + expires_in * 1000;

        const credentials = config.get('credentials') || {};
        credentials[merchant_id as string] = {
          client_id: clientId,
          client_secret: clientSecret,
          access_token,
          refresh_token,
          expires_at: expiresAt,
          region,
        };

        config.set('credentials', credentials);
        config.set('default_merchant', merchant_id as string);
        config.set('region', region);

        res.send('Authentication successful! You can close this tab.');
        console.log('Authenticated for merchant:', merchant_id);
        server.close();
        resolve();
      } catch (error: any) {
        const msg = error.response?.data?.message || error.message;
        res.send('Authentication failed: ' + msg);
        server.close();
        reject(error);
      }
    });

    setTimeout(() => { server.close(); reject(new Error('Auth timeout')); }, 300000);
  });
}

export async function refreshToken(merchantId: string): Promise<string> {
  const credentials = config.get('credentials')[merchantId];
  if (!credentials?.refresh_token) throw new Error('No refresh token available.');

  const baseUrl = getBaseUrl();
  const response = await axios.get<TokenResponse>(`${baseUrl}/oauth/v2/refresh`, {
    params: {
      client_id: credentials.client_id,
      client_secret: credentials.client_secret,
      refresh_token: credentials.refresh_token,
    },
  });

  const { access_token, refresh_token, expires_in } = response.data;
  const allCredentials = config.get('credentials');
  allCredentials[merchantId] = {
    ...credentials,
    access_token,
    refresh_token,
    expires_at: Date.now() + expires_in * 1000,
  };
  config.set('credentials', allCredentials);
  return access_token;
}
