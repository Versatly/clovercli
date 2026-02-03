import { Command } from 'commander';
import { CloverClient } from '../lib/client.js';
import { formatOutput } from '../lib/output.js';
import chalk from 'chalk';
export function paymentsCommands(): Command {
  const p = new Command('payments').description('Payments');
  p.command('list').option('--limit <n>', '', '20').option('--order <id>').option('--output <f>', '', 'table').action(async (o) => { try { const path = o.order ? '/v3/merchants/{mId}/orders/' + o.order + '/payments' : '/v3/merchants/{mId}/payments'; const d = await new CloverClient().request<any>('GET', path + '?limit=' + o.limit); formatOutput(d.elements || [], o); } catch (e: any) { console.error(chalk.red(e.message)); process.exit(1); } });
  p.command('get').argument('<id>').option('--output <f>', '', 'table').action(async (id: string, o) => { try { formatOutput(await new CloverClient().request<any>('GET', '/v3/merchants/{mId}/payments/' + id), o); } catch (e: any) { console.error(chalk.red(e.message)); process.exit(1); } });
  p.command('refund').argument('<id>').option('--amount <c>').option('--reason <r>').option('--output <f>', '', 'table').action(async (id: string, o) => { try { const d: any = { payment: { id } }; if (o.amount) d.amount = +o.amount; if (o.reason) d.reason = o.reason; const r = await new CloverClient().request<any>('POST', '/v3/merchants/{mId}/refunds', d); console.log(chalk.green('Refunded: ' + r.id)); formatOutput(r, o); } catch (e: any) { console.error(chalk.red(e.message)); process.exit(1); } });
  return p;
}
