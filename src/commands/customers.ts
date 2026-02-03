import { Command } from 'commander';
import { CloverClient } from '../lib/client.js';
import { formatOutput } from '../lib/output.js';
import chalk from 'chalk';

export function customersCommands(): Command {
  const customers = new Command('customers').description('Customer management');

  customers.command('list')
    .description('List customers')
    .option('--limit <n>', 'Max results', '50')
    .option('--offset <n>', 'Offset', '0')
    .option('--filter <filter>', 'Filter (e.g., email:*@example.com)')
    .option('--output <format>', 'Output format', 'table')
    .option('--quiet', 'Only IDs')
    .action(async (options) => {
      try {
        const client = new CloverClient();
        const params: any = { limit: +options.limit, offset: +options.offset };
        if (options.filter) params.filter = options.filter;
        const data = await client.request<any>('GET', '/v3/merchants/{mId}/customers?' + new URLSearchParams(params));
        formatOutput(data.elements || [], options);
      } catch (error: any) {
        console.error(chalk.red('Error: ' + error.message));
        process.exit(1);
      }
    });

  customers.command('get')
    .description('Get customer details')
    .argument('<id>', 'Customer ID')
    .option('--output <format>', 'Output format', 'table')
    .action(async (id: string, options) => {
      try {
        const client = new CloverClient();
        const data = await client.request<any>('GET', '/v3/merchants/{mId}/customers/' + id);
        formatOutput(data, options);
      } catch (error: any) {
        console.error(chalk.red('Error: ' + error.message));
        process.exit(1);
      }
    });

  customers.command('create')
    .description('Create customer')
    .option('--first-name <name>', 'First name')
    .option('--last-name <name>', 'Last name')
    .option('--email <email>', 'Email address')
    .option('--phone <phone>', 'Phone number')
    .option('--output <format>', 'Output format', 'table')
    .action(async (options) => {
      try {
        const client = new CloverClient();
        const customer: any = {};
        if (options.firstName) customer.firstName = options.firstName;
        if (options.lastName) customer.lastName = options.lastName;
        if (options.email) customer.emailAddresses = [{ emailAddress: options.email }];
        if (options.phone) customer.phoneNumbers = [{ phoneNumber: options.phone }];
        
        const data = await client.request<any>('POST', '/v3/merchants/{mId}/customers', customer);
        console.log(chalk.green('Created customer: ' + data.id));
        formatOutput(data, options);
      } catch (error: any) {
        console.error(chalk.red('Error: ' + error.message));
        process.exit(1);
      }
    });

  customers.command('update')
    .description('Update customer')
    .argument('<id>', 'Customer ID')
    .option('--first-name <name>', 'First name')
    .option('--last-name <name>', 'Last name')
    .option('--phone <phone>', 'Phone number')
    .option('--output <format>', 'Output format', 'table')
    .action(async (id: string, options) => {
      try {
        const client = new CloverClient();
        const customer: any = {};
        if (options.firstName) customer.firstName = options.firstName;
        if (options.lastName) customer.lastName = options.lastName;
        if (options.phone) customer.phoneNumbers = [{ phoneNumber: options.phone }];
        
        const data = await client.request<any>('POST', '/v3/merchants/{mId}/customers/' + id, customer);
        console.log(chalk.green('Updated customer: ' + id));
        formatOutput(data, options);
      } catch (error: any) {
        console.error(chalk.red('Error: ' + error.message));
        process.exit(1);
      }
    });

  customers.command('delete')
    .description('Delete customer')
    .argument('<id>', 'Customer ID')
    .action(async (id: string) => {
      try {
        const client = new CloverClient();
        await client.request<void>('DELETE', '/v3/merchants/{mId}/customers/' + id);
        console.log(chalk.green('Deleted customer: ' + id));
      } catch (error: any) {
        console.error(chalk.red('Error: ' + error.message));
        process.exit(1);
      }
    });

  return customers;
}
