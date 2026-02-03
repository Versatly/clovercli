import { Command } from 'commander';
import { createClient } from '../lib/client';
import { outputTable, error, getOutputFormat } from '../lib/output';

export function registerMerchantCommands(program: Command): void {
  const merchant = program.command('merchant').description('Merchant commands');

  merchant.command('get')
    .description('Get merchant details')
    .option('--merchant <id>', 'Merchant ID')
    .action(async (opts) => {
      try {
        const { client } = await createClient(opts.merchant);
        const m = await client.getMerchant();
        if (getOutputFormat() === 'json') {
          console.log(JSON.stringify(m, null, 2));
        } else {
          outputTable(['Field', 'Value'], [
            ['ID', m.id],
            ['Name', m.name],
            ['Phone', m.phoneNumber || '-'],
            ['Website', m.website || '-'],
            ['Timezone', m.timezone || '-'],
            ['Currency', m.defaultCurrency || 'USD'],
          ]);
        }
      } catch (err: unknown) {
        error((err as Error).message);
        process.exit(1);
      }
    });
}
