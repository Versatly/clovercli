import { Command } from 'commander';
import { login, refreshToken } from '../lib/auth.js';
import config, { getActiveMerchantId } from '../lib/config.js';
import type { Region } from '../types/clover.js';
import chalk from 'chalk';
export function authCommands(): Command {
  const auth = new Command('auth').description('Authentication');
  auth.command('login').description('OAuth login').option('--client-id <id>').option('--client-secret <secret>').option('--region <r>', 'us|eu|la|sandbox', 'us')
    .action(async (o) => { const id = o.clientId || process.env.CLOVER_CLIENT_ID; const sec = o.clientSecret || process.env.CLOVER_CLIENT_SECRET; if (!id || !sec) { console.error(chalk.red('Need --client-id and --client-secret')); process.exit(1); } try { await login(id, sec, o.region as Region); console.log(chalk.green('OK')); } catch (e: any) { console.error(chalk.red(e.message)); process.exit(1); } });
  auth.command('status').description('Check status').action(() => { const m = getActiveMerchantId(); if (!m) { console.log(chalk.yellow('Not logged in')); return; } const c = config.get('credentials')[m]; console.log('Merchant:', m, '| Region:', config.get('region'), c?.expires_at ? (Date.now() > c.expires_at ? '| EXPIRED' : '') : ''); });
  auth.command('refresh').description('Refresh token').action(async () => { const m = getActiveMerchantId(); if (!m) { console.error(chalk.red('Not logged in')); process.exit(1); } try { await refreshToken(m); console.log(chalk.green('Refreshed')); } catch (e: any) { console.error(chalk.red(e.message)); process.exit(1); } });
  auth.command('logout').description('Clear creds').action(() => { config.clear(); console.log(chalk.green('Logged out')); });
  return auth;
}
