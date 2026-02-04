import { Command } from 'commander';
import { CloverClient } from '../lib/client.js';
import chalk from 'chalk';
import Table from 'cli-table3';

const fmt = (cents: number) => '$' + (cents / 100).toFixed(2);

export function discountsCommands(): Command {
  const discounts = new Command('discounts').description('Manage discounts');

  discounts.command('list')
    .description('List all discounts')
    .option('--output <format>', 'Output: table|json|quiet', 'table')
    .action(async (opts) => {
      try {
        const client = new CloverClient();
        const items = await client.listDiscounts();

        if (opts.output === 'json') {
          console.log(JSON.stringify(items, null, 2));
        } else if (opts.output === 'quiet') {
          items.forEach(d => console.log(d.id));
        } else {
          if (items.length === 0) {
            console.log(chalk.yellow('No discounts found.'));
            return;
          }
          const table = new Table({
            head: ['ID', 'Name', 'Type', 'Value'],
            style: { head: ['cyan'] }
          });
          items.forEach(d => {
            const type = d.percentage ? 'Percentage' : 'Fixed';
            const value = d.percentage ? `${d.percentage / 10000}%` : fmt(d.amount || 0);
            table.push([d.id, d.name, type, value]);
          });
          console.log(table.toString());
          console.log(chalk.dim(`\nTotal: ${items.length} discounts`));
        }
      } catch (e: any) {
        console.error(chalk.red('Error: ' + e.message));
        process.exit(1);
      }
    });

  discounts.command('get <id>')
    .description('Get discount details')
    .option('--output <format>', 'Output: table|json', 'table')
    .action(async (id, opts) => {
      try {
        const client = new CloverClient();
        const d = await client.getDiscount(id);

        if (opts.output === 'json') {
          console.log(JSON.stringify(d, null, 2));
        } else {
          console.log(chalk.bold.cyan('\n📍 Discount Details\n'));
          console.log(chalk.cyan('ID:     ') + d.id);
          console.log(chalk.cyan('Name:   ') + d.name);
          if (d.percentage) {
            console.log(chalk.cyan('Type:   ') + 'Percentage');
            console.log(chalk.cyan('Value:  ') + (d.percentage / 10000) + '%');
          } else {
            console.log(chalk.cyan('Type:   ') + 'Fixed Amount');
            console.log(chalk.cyan('Value:  ') + fmt(d.amount || 0));
          }
          console.log();
        }
      } catch (e: any) {
        console.error(chalk.red('Error: ' + e.message));
        process.exit(1);
      }
    });

  discounts.command('create')
    .description('Create a new discount')
    .requiredOption('--name <name>', 'Discount name')
    .option('--percentage <pct>', 'Percentage off (e.g., 10 for 10%)')
    .option('--amount <cents>', 'Fixed amount in cents')
    .action(async (opts) => {
      try {
        if (!opts.percentage && !opts.amount) {
          console.error(chalk.red('Error: Provide either --percentage or --amount'));
          process.exit(1);
        }

        const client = new CloverClient();
        const data: any = { name: opts.name };
        
        if (opts.percentage) {
          data.percentage = parseFloat(opts.percentage) * 10000; // Clover stores as basis points * 100
        } else {
          data.amount = parseInt(opts.amount);
        }

        const d = await client.createDiscount(data);
        console.log(chalk.green(`✅ Created discount: ${d.name} (${d.id})`));
      } catch (e: any) {
        console.error(chalk.red('Error: ' + e.message));
        process.exit(1);
      }
    });

  discounts.command('delete <id>')
    .description('Delete a discount')
    .option('--force', 'Skip confirmation')
    .action(async (id, opts) => {
      try {
        const client = new CloverClient();
        
        if (!opts.force) {
          const d = await client.getDiscount(id);
          console.log(chalk.yellow(`⚠️  About to delete discount: ${d.name}`));
          console.log(chalk.dim('Use --force to skip this warning'));
        }

        await client.deleteDiscount(id);
        console.log(chalk.green(`✅ Deleted discount ${id}`));
      } catch (e: any) {
        console.error(chalk.red('Error: ' + e.message));
        process.exit(1);
      }
    });

  return discounts;
}
