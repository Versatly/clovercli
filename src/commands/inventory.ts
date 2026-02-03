import { Command } from 'commander';
import { CloverClient } from '../lib/client.js';
import { formatOutput } from '../lib/output.js';
import chalk from 'chalk';

export function inventoryCommands(): Command {
  const inventory = new Command('inventory').description('Inventory management');

  const items = inventory.command('items').description('Manage items');

  items.command('list').description('List items')
    .option('--limit <n>', 'Max results', '50')
    .option('--offset <n>', 'Offset', '0')
    .option('--output <format>', 'Output format', 'table')
    .option('--quiet', 'Only IDs')
    .action(async (options) => {
      try {
        const client = new CloverClient();
        formatOutput(await client.listItems({ limit: +options.limit, offset: +options.offset }), options);
      } catch (error: any) { console.error(chalk.red('Error: ' + error.message)); process.exit(1); }
    });

  items.command('get').description('Get item').argument('<id>', 'Item ID')
    .option('--output <format>', 'Output format', 'table')
    .action(async (id: string, options) => {
      try {
        const client = new CloverClient();
        formatOutput(await client.getItem(id), options);
      } catch (error: any) { console.error(chalk.red('Error: ' + error.message)); process.exit(1); }
    });

  items.command('create').description('Create item')
    .requiredOption('--name <name>', 'Item name')
    .option('--price <cents>', 'Price in cents')
    .option('--sku <sku>', 'SKU')
    .option('--output <format>', 'Output format', 'table')
    .action(async (options) => {
      try {
        const client = new CloverClient();
        const item: any = { name: options.name };
        if (options.price) item.price = +options.price;
        if (options.sku) item.sku = options.sku;
        const result = await client.createItem(item);
        console.log(chalk.green('Created: ' + result.id));
        formatOutput(result, options);
      } catch (error: any) { console.error(chalk.red('Error: ' + error.message)); process.exit(1); }
    });

  items.command('update').description('Update item').argument('<id>', 'Item ID')
    .option('--name <name>', 'Name')
    .option('--price <cents>', 'Price')
    .option('--sku <sku>', 'SKU')
    .option('--output <format>', 'Output format', 'table')
    .action(async (id: string, options) => {
      try {
        const client = new CloverClient();
        const item: any = {};
        if (options.name) item.name = options.name;
        if (options.price) item.price = +options.price;
        if (options.sku) item.sku = options.sku;
        const result = await client.updateItem(id, item);
        console.log(chalk.green('Updated: ' + result.id));
        formatOutput(result, options);
      } catch (error: any) { console.error(chalk.red('Error: ' + error.message)); process.exit(1); }
    });

  items.command('delete').description('Delete item').argument('<id>', 'Item ID')
    .action(async (id: string) => {
      try {
        const client = new CloverClient();
        await client.deleteItem(id);
        console.log(chalk.green('Deleted.'));
      } catch (error: any) { console.error(chalk.red('Error: ' + error.message)); process.exit(1); }
    });

  const categories = inventory.command('categories').description('Manage categories');

  categories.command('list').description('List categories')
    .option('--output <format>', 'Output format', 'table')
    .action(async (options) => {
      try {
        const client = new CloverClient();
        const data = await client.request<any>('GET', '/v3/merchants/{mId}/categories');
        formatOutput(data.elements || [], options);
      } catch (error: any) { console.error(chalk.red('Error: ' + error.message)); process.exit(1); }
    });

  categories.command('create').description('Create category')
    .requiredOption('--name <name>', 'Category name')
    .option('--output <format>', 'Output format', 'table')
    .action(async (options) => {
      try {
        const client = new CloverClient();
        const data = await client.request<any>('POST', '/v3/merchants/{mId}/categories', { name: options.name });
        console.log(chalk.green('Created: ' + data.id));
        formatOutput(data, options);
      } catch (error: any) { console.error(chalk.red('Error: ' + error.message)); process.exit(1); }
    });

  return inventory;
}
