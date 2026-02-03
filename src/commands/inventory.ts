import { Command } from 'commander';
import { CloverClient } from '../lib/client.js';
import { formatOutput } from '../lib/output.js';
import chalk from 'chalk';
export function inventoryCommands(): Command {
  const inv = new Command('inventory').description('Inventory');
  const items = inv.command('items').description('Items');
  items.command('list').option('--limit <n>', '', '50').option('--offset <n>', '', '0').option('--output <f>', '', 'table').option('--quiet').action(async (o) => { try { formatOutput(await new CloverClient().listItems({ limit: +o.limit, offset: +o.offset }), o); } catch (e: any) { console.error(chalk.red(e.message)); process.exit(1); } });
  items.command('get').argument('<id>').option('--output <f>', '', 'table').action(async (id: string, o) => { try { formatOutput(await new CloverClient().getItem(id), o); } catch (e: any) { console.error(chalk.red(e.message)); process.exit(1); } });
  items.command('create').requiredOption('--name <n>').option('--price <c>').option('--sku <s>').option('--output <f>', '', 'table').action(async (o) => { try { const i: any = { name: o.name }; if (o.price) i.price = +o.price; if (o.sku) i.sku = o.sku; const r = await new CloverClient().createItem(i); console.log(chalk.green('Created: ' + r.id)); formatOutput(r, o); } catch (e: any) { console.error(chalk.red(e.message)); process.exit(1); } });
  items.command('update').argument('<id>').option('--name <n>').option('--price <c>').option('--sku <s>').option('--output <f>', '', 'table').action(async (id: string, o) => { try { const i: any = {}; if (o.name) i.name = o.name; if (o.price) i.price = +o.price; if (o.sku) i.sku = o.sku; const r = await new CloverClient().updateItem(id, i); console.log(chalk.green('Updated')); formatOutput(r, o); } catch (e: any) { console.error(chalk.red(e.message)); process.exit(1); } });
  items.command('delete').argument('<id>').action(async (id: string) => { try { await new CloverClient().deleteItem(id); console.log(chalk.green('Deleted')); } catch (e: any) { console.error(chalk.red(e.message)); process.exit(1); } });
  const cats = inv.command('categories').description('Categories');
  cats.command('list').option('--output <f>', '', 'table').action(async (o) => { try { const d = await new CloverClient().request<any>('GET', '/v3/merchants/{mId}/categories'); formatOutput(d.elements || [], o); } catch (e: any) { console.error(chalk.red(e.message)); process.exit(1); } });
  cats.command('create').requiredOption('--name <n>').option('--output <f>', '', 'table').action(async (o) => { try { const d = await new CloverClient().request<any>('POST', '/v3/merchants/{mId}/categories', { name: o.name }); console.log(chalk.green('Created: ' + d.id)); formatOutput(d, o); } catch (e: any) { console.error(chalk.red(e.message)); process.exit(1); } });
  return inv;
}
