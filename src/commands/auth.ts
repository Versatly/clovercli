import { Command } from 'commander';
import { startOAuthFlow, refreshAccessToken } from '../lib/auth';
import { getMerchantCredentials, removeMerchantCredentials, listMerchants, getDefaultMerchant, setDefaultMerchant, resolveMerchantId } from '../lib/config';
import { success, error, info, outputTable } from '../lib/output';
import type { Region } from '../types/clover';

export function registerAuthCommands(program: Command): void {
  const auth = program.command('auth').description('Authentication commands');

  auth.command('login')
    .description('Authenticate with Clover')
    .requiredOption('--client-id <id>', 'Clover App ID')
    .requiredOption('--client-secret <secret>', 'Clover App Secret')
    .option('--region <region>', 'Region (us, eu, la, sandbox)', 'us')
    .action(async (opts) => {
      try {
        const { merchantId } = await startOAuthFlow(opts.clientId, opts.clientSecret, opts.region as Region);
        success(`Logged in as merchant ${merchantId}`);
      } catch (err: unknown) {
        error((err as Error).message);
        process.exit(1);
      }
    });

  auth.command('status')
    .description('Show authentication status')
    .action(() => {
      const merchants = listMerchants();
      const defaultMerchant = getDefaultMerchant();
      if (merchants.length === 0) {
        info('Not logged in. Run "clovercli auth login" to authenticate.');
        return;
      }
      outputTable(['Merchant ID', 'Default', 'Region'], 
        merchants.map((m: string) => {
          const creds = getMerchantCredentials(m);
          return [m, m === defaultMerchant ? 'Yes' : '', creds?.region || 'us'];
        })
      );
    });

  auth.command('refresh')
    .description('Refresh access token')
    .option('--merchant <id>', 'Merchant ID')
    .action(async (opts) => {
      try {
        const mId = resolveMerchantId(opts.merchant);
        if (!mId) { error('No merchant specified'); process.exit(1); }
        await refreshAccessToken(mId);
        success('Token refreshed');
      } catch (err: unknown) {
        error((err as Error).message);
        process.exit(1);
      }
    });

  auth.command('logout')
    .description('Remove stored credentials')
    .option('--merchant <id>', 'Merchant ID (default: all)')
    .action((opts) => {
      if (opts.merchant) {
        removeMerchantCredentials(opts.merchant);
        success(`Logged out merchant ${opts.merchant}`);
      } else {
        listMerchants().forEach((m: string) => removeMerchantCredentials(m));
        success('Logged out all merchants');
      }
    });

  auth.command('default')
    .description('Set default merchant')
    .argument('<merchant-id>', 'Merchant ID')
    .action((merchantId) => {
      setDefaultMerchant(merchantId);
      success(`Default merchant set to ${merchantId}`);
    });
}
