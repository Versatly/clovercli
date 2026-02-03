import { Command } from 'commander';
import { CloverClient } from '../lib/client.js';
import { formatOutput } from '../lib/output.js';
import chalk from 'chalk';
export function employeesCommands(): Command {
  const e = new Command('employees').description('Employees');
  e.command('list').option('--limit <n>', '', '50').option('--output <f>', '', 'table').action(async (o) => { try { const d = await new CloverClient().request<any>('GET', '/v3/merchants/{mId}/employees?limit=' + o.limit); formatOutput(d.elements || [], o); } catch (e: any) { console.error(chalk.red(e.message)); process.exit(1); } });
  e.command('get').argument('<id>').option('--output <f>', '', 'table').action(async (id: string, o) => { try { formatOutput(await new CloverClient().request<any>('GET', '/v3/merchants/{mId}/employees/' + id), o); } catch (e: any) { console.error(chalk.red(e.message)); process.exit(1); } });
  e.command('me').option('--output <f>', '', 'table').action(async (o) => { try { formatOutput(await new CloverClient().request<any>('GET', '/v3/merchants/{mId}/employees/current'), o); } catch (e: any) { console.error(chalk.red(e.message)); process.exit(1); } });
  return e;
}
