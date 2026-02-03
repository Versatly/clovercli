import { Command } from 'commander';
import { CloverClient } from '../lib/client.js';
import { formatOutput } from '../lib/output.js';
import chalk from 'chalk';
export function merchantCommands(): Command {
  const m = new Command('merchant').description('Merchant info');
  m.command('get').description('Get details').option('--output <f>', 'json|table', 'table').action(async (o) => { try { formatOutput(await new CloverClient().getMerchant(), o); } catch (e: any) { console.error(chalk.red(e.message)); process.exit(1); } });
  return m;
}
