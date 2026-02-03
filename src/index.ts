#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import { authCommands } from './commands/auth.js';
import { merchantCommands } from './commands/merchant.js';
import { inventoryCommands } from './commands/inventory.js';
import { ordersCommands } from './commands/orders.js';
import { paymentsCommands } from './commands/payments.js';
import { customersCommands } from './commands/customers.js';
import { employeesCommands } from './commands/employees.js';
import { reportsCommands } from './commands/reports.js';

const program = new Command();

program
  .name('clovercli')
  .description('Clover POS CLI for merchants and developers')
  .version('1.0.0');

program.addCommand(authCommands());
program.addCommand(merchantCommands());
program.addCommand(inventoryCommands());
program.addCommand(ordersCommands());
program.addCommand(paymentsCommands());
program.addCommand(customersCommands());
program.addCommand(employeesCommands());
program.addCommand(reportsCommands());

program.command('api').description('Raw API access')
  .argument('<method>', 'HTTP method (get, post, delete)')
  .argument('<path>', 'API path')
  .option('--data <json>', 'JSON data')
  .action(async (method: string, path: string, options) => {
    try {
      const { CloverClient } = await import('./lib/client.js');
      const client = new CloverClient();
      const data = options.data ? JSON.parse(options.data) : undefined;
      console.log(JSON.stringify(await client.request(method.toUpperCase(), path, data), null, 2));
    } catch (error: any) {
      console.error(chalk.red('Error: ' + error.message));
      process.exit(1);
    }
  });

program.parse(process.argv);
if (!process.argv.slice(2).length) program.outputHelp();
