import { Command } from 'commander';
import { CloverClient } from '../lib/client.js';
import { formatOutput } from '../lib/output.js';
import chalk from 'chalk';
export function customersCommands(): Command {
  const c = new Command('customers').description('Customers');
  c.command('list').option('--limit <n>', '', '50').option('--filter <f>').option('--output <f>', '', 'table').action(async (o) => { try { const q = new URLSearchParams({ limit: o.limit }); if (o.filter) q.set('filter', o.filter); const d = await new CloverClient().request<any>('GET', '/v3/merchants/{mId}/customers?' + q); formatOutput(d.elements || [], o); } catch (e: any) { console.error(chalk.red(e.message)); process.exit(1); } });
  c.command('get').argument('<id>').option('--output <f>', '', 'table').action(async (id: string, o) => { try { formatOutput(await new CloverClient().request<any>('GET', '/v3/merchants/{mId}/customers/' + id), o); } catch (e: any) { console.error(chalk.red(e.message)); process.exit(1); } });
  c.command('create').option('--first-name <n>').option('--last-name <n>').option('--email <e>').option('--phone <p>').option('--output <f>', '', 'table').action(async (o) => { try { const d: any = {}; if (o.firstName) d.firstName = o.firstName; if (o.lastName) d.lastName = o.lastName; if (o.email) d.emailAddresses = [{ emailAddress: o.email }]; if (o.phone) d.phoneNumbers = [{ phoneNumber: o.phone }]; const r = await new CloverClient().request<any>('POST', '/v3/merchants/{mId}/customers', d); console.log(chalk.green('Created: ' + r.id)); formatOutput(r, o); } catch (e: any) { console.error(chalk.red(e.message)); process.exit(1); } });
  c.command('delete').argument('<id>').action(async (id: string) => { try { await new CloverClient().request<void>('DELETE', '/v3/merchants/{mId}/customers/' + id); console.log(chalk.green('Deleted')); } catch (e: any) { console.error(chalk.red(e.message)); process.exit(1); } });
  return c;
}
