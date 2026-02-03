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
program.name('clovercli').description('Clover POS CLI').version('1.0.0');
program.addCommand(authCommands());
program.addCommand(merchantCommands());
program.addCommand(inventoryCommands());
program.addCommand(ordersCommands());
program.addCommand(paymentsCommands());
program.addCommand(customersCommands());
program.addCommand(employeesCommands());
program.addCommand(reportsCommands());
program.command('api').description('Raw API').argument('<method>').argument('<path>').option('--data <json>')
  .action(async (m: string, p: string, o) => { try { const { CloverClient } = await import('./lib/client.js'); console.log(JSON.stringify(await new CloverClient().request(m.toUpperCase(), p, o.data ? JSON.parse(o.data) : undefined), null, 2)); } catch (e: any) { console.error(chalk.red(e.message)); process.exit(1); } });
program.parse();
if (!process.argv.slice(2).length) program.outputHelp();
