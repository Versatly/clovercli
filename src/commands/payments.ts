import { Command } from 'commander';
import { CloverClient } from '../lib/client.js';
import { formatOutput } from '../lib/output.js';
import chalk from 'chalk';

export function paymentsCommands(): Command {
  const payments = new Command('payments').description('Payment management');

  payments.command('list')
    .description('List payments')
    .option('--limit <n>', 'Max results', '20')
    .option('--offset <n>', 'Offset', '0')
    .option('--order <id>', 'Filter by order ID')
    .option('--output <format>', 'Output format', 'table')
    .option('--quiet', 'Only IDs')
    .action(async (options) => {
      try {
        const client = new CloverClient();
        let path = '/v3/merchants/{mId}/payments';
        const params: any = { limit: +options.limit, offset: +options.offset };
        if (options.order) {
          path = '/v3/merchants/{mId}/orders/' + options.order + '/payments';
        }
        const data = await client.request<any>('GET', path + '?' + new URLSearchParams(params));
        formatOutput(data.elements || [], options);
      } catch (error: any) {
        console.error(chalk.red('Error: ' + error.message));
        process.exit(1);
      }
    });

  payments.command('get')
    .description('Get payment details')
    .argument('<id>', 'Payment ID')
    .option('--output <format>', 'Output format', 'table')
    .action(async (id: string, options) => {
      try {
        const client = new CloverClient();
        const data = await client.request<any>('GET', '/v3/merchants/{mId}/payments/' + id);
        formatOutput(data, options);
      } catch (error: any) {
        console.error(chalk.red('Error: ' + error.message));
        process.exit(1);
      }
    });

  payments.command('refund')
    .description('Refund a payment')
    .argument('<id>', 'Payment ID')
    .option('--amount <cents>', 'Amount to refund (omit for full refund)')
    .option('--reason <reason>', 'Refund reason')
    .option('--output <format>', 'Output format', 'table')
    .action(async (id: string, options) => {
      try {
        const client = new CloverClient();
        const refundData: any = {};
        if (options.amount) refundData.amount = +options.amount;
        if (options.reason) refundData.reason = options.reason;
        
        const data = await client.request<any>('POST', '/v3/merchants/{mId}/refunds', {
          payment: { id },
          ...refundData
        });
        console.log(chalk.green('Refund processed: ' + data.id));
        formatOutput(data, options);
      } catch (error: any) {
        console.error(chalk.red('Error: ' + error.message));
        process.exit(1);
      }
    });

  return payments;
}
