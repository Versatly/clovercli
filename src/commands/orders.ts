import { Command } from 'commander';
import { CloverClient } from '../lib/client.js';
import { formatOutput } from '../lib/output.js';
import chalk from 'chalk';

export function ordersCommands(): Command {
  const orders = new Command('orders').description('Order management');

  orders.command('list').description('List orders')
    .option('--limit <n>', 'Max results', '20')
    .option('--offset <n>', 'Offset', '0')
    .option('--filter <filter>', 'Filter expression')
    .option('--output <format>', 'Output format', 'table')
    .option('--quiet', 'Only IDs')
    .action(async (options) => {
      try {
        const client = new CloverClient();
        formatOutput(await client.listOrders({ limit: +options.limit, offset: +options.offset, filter: options.filter }), options);
      } catch (error: any) { console.error(chalk.red('Error: ' + error.message)); process.exit(1); }
    });

  orders.command('get').description('Get order').argument('<id>', 'Order ID')
    .option('--expand <fields>', 'Expand fields (lineItems,payments)')
    .option('--output <format>', 'Output format', 'table')
    .action(async (id: string, options) => {
      try {
        const client = new CloverClient();
        formatOutput(await client.getOrder(id, options.expand), options);
      } catch (error: any) { console.error(chalk.red('Error: ' + error.message)); process.exit(1); }
    });

  orders.command('create').description('Create order')
    .option('--total <cents>', 'Total in cents')
    .option('--note <note>', 'Note')
    .option('--output <format>', 'Output format', 'table')
    .action(async (options) => {
      try {
        const client = new CloverClient();
        const order: any = {};
        if (options.total) order.total = +options.total;
        if (options.note) order.note = options.note;
        const result = await client.createOrder(order);
        console.log(chalk.green('Created: ' + result.id));
        formatOutput(result, options);
      } catch (error: any) { console.error(chalk.red('Error: ' + error.message)); process.exit(1); }
    });

  orders.command('add-item').description('Add line item').argument('<order_id>', 'Order ID')
    .requiredOption('--item-id <id>', 'Item ID')
    .option('--quantity <n>', 'Quantity', '1')
    .option('--output <format>', 'Output format', 'table')
    .action(async (orderId: string, options) => {
      try {
        const client = new CloverClient();
        const data = await client.request<any>('POST', '/v3/merchants/{mId}/orders/' + orderId + '/line_items', { item: { id: options.itemId }, quantity: +options.quantity });
        console.log(chalk.green('Added item to order ' + orderId));
        formatOutput(data, options);
      } catch (error: any) { console.error(chalk.red('Error: ' + error.message)); process.exit(1); }
    });

  orders.command('update').description('Update order').argument('<id>', 'Order ID')
    .option('--note <note>', 'Note')
    .option('--output <format>', 'Output format', 'table')
    .action(async (id: string, options) => {
      try {
        const client = new CloverClient();
        const data = await client.request<any>('POST', '/v3/merchants/{mId}/orders/' + id, { note: options.note });
        console.log(chalk.green('Updated: ' + id));
        formatOutput(data, options);
      } catch (error: any) { console.error(chalk.red('Error: ' + error.message)); process.exit(1); }
    });

  orders.command('delete').description('Delete order').argument('<id>', 'Order ID')
    .action(async (id: string) => {
      try {
        const client = new CloverClient();
        await client.request<void>('DELETE', '/v3/merchants/{mId}/orders/' + id);
        console.log(chalk.green('Deleted.'));
      } catch (error: any) { console.error(chalk.red('Error: ' + error.message)); process.exit(1); }
    });

  return orders;
}
