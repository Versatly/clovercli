import { Command } from 'commander';
import { createClient } from '../lib/client';
import { outputTable, success, error, formatPrice, formatDate, getOutputFormat } from '../lib/output';
import type { Order } from '../types/clover';

export function registerOrdersCommands(program: Command): void {
  const orders = program.command('orders').description('Order commands');

  orders.command('list')
    .description('List orders')
    .option('--limit <n>', 'Max results', '100')
    .option('--offset <n>', 'Offset', '0')
    .option('--merchant <id>', 'Merchant ID')
    .action(async (opts) => {
      try {
        const { client } = await createClient(opts.merchant);
        const list = await client.listOrders({ limit: parseInt(opts.limit), offset: parseInt(opts.offset) });
        if (getOutputFormat() === 'json') {
          console.log(JSON.stringify(list, null, 2));
        } else {
          outputTable(['ID', 'Total', 'State', 'Created', 'Note'],
            list.map((o: Order) => [
              o.id,
              o.total ? formatPrice(o.total) : '-',
              o.state || 'open',
              o.createdTime ? formatDate(o.createdTime) : '-',
              (o.note || '-').slice(0, 30)
            ])
          );
        }
      } catch (err: unknown) { error((err as Error).message); process.exit(1); }
    });

  orders.command('get')
    .description('Get order details')
    .argument('<order-id>', 'Order ID')
    .option('--merchant <id>', 'Merchant ID')
    .action(async (orderId, opts) => {
      try {
        const { client } = await createClient(opts.merchant);
        const order = await client.getOrder(orderId);
        console.log(JSON.stringify(order, null, 2));
      } catch (err: unknown) { error((err as Error).message); process.exit(1); }
    });

  orders.command('create')
    .description('Create order')
    .option('--total <cents>', 'Total in cents')
    .option('--note <note>', 'Order note')
    .option('--merchant <id>', 'Merchant ID')
    .action(async (opts) => {
      try {
        const { client } = await createClient(opts.merchant);
        const order = await client.createOrder({
          total: opts.total ? parseInt(opts.total) : undefined,
          note: opts.note
        });
        success(`Created order ${order.id}`);
        console.log(JSON.stringify(order, null, 2));
      } catch (err: unknown) { error((err as Error).message); process.exit(1); }
    });

  orders.command('update')
    .description('Update order')
    .argument('<order-id>', 'Order ID')
    .option('--note <note>', 'Order note')
    .option('--merchant <id>', 'Merchant ID')
    .action(async (orderId, opts) => {
      try {
        const { client } = await createClient(opts.merchant);
        await client.updateOrder(orderId, { note: opts.note });
        success(`Updated order ${orderId}`);
      } catch (err: unknown) { error((err as Error).message); process.exit(1); }
    });

  orders.command('delete')
    .description('Delete order')
    .argument('<order-id>', 'Order ID')
    .option('--merchant <id>', 'Merchant ID')
    .action(async (orderId, opts) => {
      try {
        const { client } = await createClient(opts.merchant);
        await client.deleteOrder(orderId);
        success(`Deleted order ${orderId}`);
      } catch (err: unknown) { error((err as Error).message); process.exit(1); }
    });

  orders.command('add-item')
    .description('Add line item to order')
    .argument('<order-id>', 'Order ID')
    .option('--item-id <id>', 'Item ID')
    .option('--name <name>', 'Item name')
    .option('--price <cents>', 'Price in cents')
    .option('--quantity <n>', 'Quantity', '1')
    .option('--merchant <id>', 'Merchant ID')
    .action(async (orderId, opts) => {
      try {
        const { client } = await createClient(opts.merchant);
        const lineItem = await client.addLineItem(orderId, {
          item: opts.itemId ? { id: opts.itemId } : undefined,
          name: opts.name,
          price: opts.price ? parseInt(opts.price) : undefined,
          unitQty: parseInt(opts.quantity)
        });
        success(`Added line item ${lineItem.id}`);
      } catch (err: unknown) { error((err as Error).message); process.exit(1); }
    });
}
