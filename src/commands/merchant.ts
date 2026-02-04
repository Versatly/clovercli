import { Command } from 'commander';
import { CloverClient } from '../lib/client.js';
import { formatOutput } from '../lib/output.js';
import chalk from 'chalk';
import Table from 'cli-table3';

export function merchantCommands(): Command {
  const m = new Command('merchant').description('Merchant info and settings');

  m.command('get')
    .description('Get merchant details')
    .option('--output <format>', 'json|table', 'table')
    .action(async (opts) => {
      try {
        const merchant = await new CloverClient().getMerchant();
        formatOutput(merchant, opts);
      } catch (e: any) {
        console.error(chalk.red(e.message));
        process.exit(1);
      }
    });

  // Tax Rates
  const taxes = m.command('taxes').description('Tax rate management');

  taxes.command('list')
    .description('List all tax rates')
    .option('--output <format>', 'Output: table|json', 'table')
    .action(async (opts) => {
      try {
        const client = new CloverClient();
        const rates = await client.listTaxRates();

        if (opts.output === 'json') {
          console.log(JSON.stringify(rates, null, 2));
        } else {
          if (rates.length === 0) {
            console.log(chalk.yellow('No tax rates configured.'));
            return;
          }
          const table = new Table({
            head: ['ID', 'Name', 'Rate', 'Default'],
            style: { head: ['cyan'] }
          });
          rates.forEach(t => {
            const rate = (t.rate / 10000000).toFixed(3) + '%';
            table.push([t.id, t.name, rate, t.isDefault ? '✓' : '']);
          });
          console.log(chalk.bold.cyan('\n🧾 Tax Rates\n'));
          console.log(table.toString());
        }
      } catch (e: any) {
        console.error(chalk.red('Error: ' + e.message));
        process.exit(1);
      }
    });

  // Tenders (payment methods)
  const tenders = m.command('tenders').description('Payment tender management');

  tenders.command('list')
    .description('List all payment tenders')
    .option('--output <format>', 'Output: table|json', 'table')
    .action(async (opts) => {
      try {
        const client = new CloverClient();
        const items = await client.listTenders();

        if (opts.output === 'json') {
          console.log(JSON.stringify(items, null, 2));
        } else {
          if (items.length === 0) {
            console.log(chalk.yellow('No tenders configured.'));
            return;
          }
          const table = new Table({
            head: ['ID', 'Label', 'Enabled', 'Visible'],
            style: { head: ['cyan'] }
          });
          items.forEach(t => {
            table.push([
              t.id,
              t.label || t.labelKey || 'Unknown',
              t.enabled !== false ? '✓' : '',
              t.visible !== false ? '✓' : ''
            ]);
          });
          console.log(chalk.bold.cyan('\n💳 Payment Tenders\n'));
          console.log(table.toString());
        }
      } catch (e: any) {
        console.error(chalk.red('Error: ' + e.message));
        process.exit(1);
      }
    });

  return m;
}
