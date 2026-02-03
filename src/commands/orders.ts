import { Command } from 'commander';
import { CloverClient } from '../lib/client.js';
import { formatOutput } from '../lib/output.js';
import chalk from 'chalk';
export function ordersCommands(): Command {
  const ord = new Command('orders').description('Orders');
  ord.command('list').option('--limit <n>', '', '20').option('--offset <n>', '', '0').option('--filter <f>').option('--output <f>', '', 'table').option('--quiet').action(async (o) => { try { formatOutput(await new CloverClient().listOrders({ limit: +o.limit, offset: +o.offset, filter: o.filter }), o); } catch (e: any) { console.error(chalk.red(e.message)); process.exit(1); } });
  ord.command('get').argument('<id>').option('--expand <fields>').option('--output <f>', '', 'table').action(async (id: string, o) => { try { formatOutput(await new CloverClient().getOrder(id, o.expand), o); } catch (e: any) { console.error(chalk.red(e.message)); process.exit(1); } });
  ord.command('create').option('--total <c>').option('--note <n>').option('--output <f>', '', 'table').action(async (o) => { try { const d: any = {}; if (o.total) d.total = +o.total; if (o.note) d.note = o.note; const r = await new CloverClient().createOrder(d); console.log(chalk.green('Created: ' + r.id)); formatOutput(r, o); } catch (e: any) { console.error(chalk.red(e.message)); process.exit(1); } });
  ord.command('add-item').argument('<order_id>').requiredOption('--item-id <id>').option('--quantity <n>', '', '1').option('--output <f>', '', 'table').action(async (oid: string, o) => { try { const d = await new CloverClient().request<any>('POST', '/v3/merchants/{mId}/orders/' + oid + '/line_items', { item: { id: o.itemId }, quantity: +o.quantity }); console.log(chalk.green('Added')); formatOutput(d, o); } catch (e: any) { console.error(chalk.red(e.message)); process.exit(1); } });
  ord.command('delete').argument('<id>').action(async (id: string) => { try { await new CloverClient().request<void>('DELETE', '/v3/merchants/{mId}/orders/' + id); console.log(chalk.green('Deleted')); } catch (e: any) { console.error(chalk.red(e.message)); process.exit(1); } });
  return ord;
}
