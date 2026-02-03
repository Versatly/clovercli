import { Command } from 'commander';
import { login, refreshToken } from '../lib/auth.js';
import config, { getActiveMerchantId } from '../lib/config.js';
import type { Region } from '../types/clover.js';
import chalk from 'chalk';

export function authCommands(): Command {
  const auth = new Command('auth').description('Authentication commands');

  auth.command('login').description('OAuth login (opens browser)')
    .option('--client-id <id>', 'Clover App ID')
    .option('--client-secret <secret>', 'Clover App Secret')
    .option('--region <region>', 'Region (us, eu, la, sandbox)', 'us')
    .action(async (options) => {
      const clientId = options.clientId || process.env.CLOVER_CLIENT_ID;
      const clientSecret = options.clientSecret || process.env.CLOVER_CLIENT_SECRET;
      if (!clientId || !clientSecret) {
        console.error(chalk.red('Error: --client-id and --client-secret required.'));
        process.exit(1);
      }
      try {
        await login(clientId, clientSecret, options.region as Region);
        console.log(chalk.green('Login successful!'));
      } catch (error: any) {
        console.error(chalk.red('Login failed: ' + error.message));
        process.exit(1);
      }
    });

  auth.command('status').description('Check auth status')
    .action(() => {
      const mId = getActiveMerchantId();
      if (!mId) { console.log(chalk.yellow('Not logged in.')); return; }
      const creds = config.get('credentials')[mId];
      console.log(chalk.cyan('Merchant ID:'), mId);
      console.log(chalk.cyan('Region:'), config.get('region'));
      if (creds?.expires_at) {
        const expired = Date.now() > creds.expires_at;
        console.log(chalk.cyan('Token Expires:'), expired ? chalk.red('EXPIRED') : new Date(creds.expires_at).toLocaleString());
      }
    });

  auth.command('refresh').description('Refresh access token')
    .action(async () => {
      const mId = getActiveMerchantId();
      if (!mId) { console.error(chalk.red('Not logged in.')); process.exit(1); }
      try {
        await refreshToken(mId);
        console.log(chalk.green('Token refreshed.'));
      } catch (error: any) {
        console.error(chalk.red('Refresh failed: ' + error.message));
        process.exit(1);
      }
    });

  auth.command('logout').description('Clear credentials')
    .action(() => { config.clear(); console.log(chalk.green('Logged out.')); });

  return auth;
}
