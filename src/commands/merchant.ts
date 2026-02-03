import { Command } from 'commander';
import { CloverClient } from '../lib/client.js';
import { formatOutput } from '../lib/output.js';
import chalk from 'chalk';

export function merchantCommands(): Command {
  const merchant = new Command('merchant').description('Merchant information');

  merchant.command('get').description('Get merchant details')
    .option('--output <format>', 'Output format (json, table)', 'table')
    .action(async (options) => {
      try {
        const client = new CloverClient();
        formatOutput(await client.getMerchant(), options);
      } catch (error: any) {
        console.error(chalk.red('Error: ' + error.message));
        process.exit(1);
      }
    });

  return merchant;
}
