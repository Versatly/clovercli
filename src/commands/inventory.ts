import { Command } from 'commander';
import { createClient } from '../lib/client';
import { outputTable, success, error, formatPrice, getOutputFormat } from '../lib/output';
import type { Item, Category } from '../types/clover';

export function registerInventoryCommands(program: Command): void {
  const inventory = program.command('inventory').description('Inventory commands');
  const items = inventory.command('items').description('Manage items');

  items.command('list')
    .description('List inventory items')
    .option('--limit <n>', 'Max results', '100')
    .option('--offset <n>', 'Offset', '0')
    .option('--merchant <id>', 'Merchant ID')
    .action(async (opts) => {
      try {
        const { client } = await createClient(opts.merchant);
        const list = await client.listItems({ limit: parseInt(opts.limit), offset: parseInt(opts.offset) });
        if (getOutputFormat() === 'json') {
          console.log(JSON.stringify(list, null, 2));
        } else {
          outputTable(['ID', 'Name', 'Price', 'SKU', 'Available'],
            list.map((i: Item) => [i.id, i.name, i.price ? formatPrice(i.price) : '-', i.sku || '-', i.available !== false ? 'Yes' : 'No'])
          );
        }
      } catch (err: unknown) { error((err as Error).message); process.exit(1); }
    });

  items.command('get')
    .description('Get item details')
    .argument('<item-id>', 'Item ID')
    .option('--merchant <id>', 'Merchant ID')
    .action(async (itemId, opts) => {
      try {
        const { client } = await createClient(opts.merchant);
        const item = await client.getItem(itemId);
        console.log(JSON.stringify(item, null, 2));
      } catch (err: unknown) { error((err as Error).message); process.exit(1); }
    });

  items.command('create')
    .description('Create item')
    .requiredOption('--name <name>', 'Item name')
    .option('--price <cents>', 'Price in cents')
    .option('--sku <sku>', 'SKU')
    .option('--merchant <id>', 'Merchant ID')
    .action(async (opts) => {
      try {
        const { client } = await createClient(opts.merchant);
        const item = await client.createItem({ name: opts.name, price: opts.price ? parseInt(opts.price) : undefined, sku: opts.sku });
        success(`Created item ${item.id}`);
        console.log(JSON.stringify(item, null, 2));
      } catch (err: unknown) { error((err as Error).message); process.exit(1); }
    });

  items.command('update')
    .description('Update item')
    .argument('<item-id>', 'Item ID')
    .option('--name <name>', 'Item name')
    .option('--price <cents>', 'Price in cents')
    .option('--sku <sku>', 'SKU')
    .option('--merchant <id>', 'Merchant ID')
    .action(async (itemId, opts) => {
      try {
        const { client } = await createClient(opts.merchant);
        const data: Record<string, unknown> = {};
        if (opts.name) data.name = opts.name;
        if (opts.price) data.price = parseInt(opts.price);
        if (opts.sku) data.sku = opts.sku;
        const item = await client.updateItem(itemId, data);
        success(`Updated item ${item.id}`);
      } catch (err: unknown) { error((err as Error).message); process.exit(1); }
    });

  items.command('delete')
    .description('Delete item')
    .argument('<item-id>', 'Item ID')
    .option('--merchant <id>', 'Merchant ID')
    .action(async (itemId, opts) => {
      try {
        const { client } = await createClient(opts.merchant);
        await client.deleteItem(itemId);
        success(`Deleted item ${itemId}`);
      } catch (err: unknown) { error((err as Error).message); process.exit(1); }
    });

  const categories = inventory.command('categories').description('Manage categories');

  categories.command('list')
    .option('--merchant <id>', 'Merchant ID')
    .action(async (opts) => {
      try {
        const { client } = await createClient(opts.merchant);
        const list = await client.listCategories();
        outputTable(['ID', 'Name', 'Sort Order'],
          list.map((c: Category) => [c.id, c.name, c.sortOrder?.toString() || '-'])
        );
      } catch (err: unknown) { error((err as Error).message); process.exit(1); }
    });

  categories.command('create')
    .requiredOption('--name <name>', 'Category name')
    .option('--merchant <id>', 'Merchant ID')
    .action(async (opts) => {
      try {
        const { client } = await createClient(opts.merchant);
        const cat = await client.createCategory(opts.name);
        success(`Created category ${cat.id}`);
      } catch (err: unknown) { error((err as Error).message); process.exit(1); }
    });

  const stock = inventory.command('stock').description('Manage stock');

  stock.command('get')
    .argument('<item-id>', 'Item ID')
    .option('--merchant <id>', 'Merchant ID')
    .action(async (itemId, opts) => {
      try {
        const { client } = await createClient(opts.merchant);
        const s = await client.getItemStock(itemId);
        console.log(JSON.stringify(s, null, 2));
      } catch (err: unknown) { error((err as Error).message); process.exit(1); }
    });

  stock.command('update')
    .argument('<item-id>', 'Item ID')
    .requiredOption('--quantity <n>', 'Stock quantity')
    .option('--merchant <id>', 'Merchant ID')
    .action(async (itemId, opts) => {
      try {
        const { client } = await createClient(opts.merchant);
        await client.updateItemStock(itemId, parseInt(opts.quantity));
        success(`Updated stock for ${itemId}`);
      } catch (err: unknown) { error((err as Error).message); process.exit(1); }
    });
}
