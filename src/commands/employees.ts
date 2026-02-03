import { Command } from 'commander';
import { CloverClient } from '../lib/client.js';
import { formatOutput } from '../lib/output.js';
import chalk from 'chalk';

export function employeesCommands(): Command {
  const employees = new Command('employees').description('Employee management');

  employees.command('list')
    .description('List employees')
    .option('--limit <n>', 'Max results', '50')
    .option('--offset <n>', 'Offset', '0')
    .option('--output <format>', 'Output format', 'table')
    .action(async (options) => {
      try {
        const client = new CloverClient();
        const params = { limit: +options.limit, offset: +options.offset };
        const data = await client.request<any>('GET', '/v3/merchants/{mId}/employees?' + new URLSearchParams(params as any));
        formatOutput(data.elements || [], options);
      } catch (error: any) {
        console.error(chalk.red('Error: ' + error.message));
        process.exit(1);
      }
    });

  employees.command('get')
    .description('Get employee details')
    .argument('<id>', 'Employee ID')
    .option('--output <format>', 'Output format', 'table')
    .action(async (id: string, options) => {
      try {
        const client = new CloverClient();
        const data = await client.request<any>('GET', '/v3/merchants/{mId}/employees/' + id);
        formatOutput(data, options);
      } catch (error: any) {
        console.error(chalk.red('Error: ' + error.message));
        process.exit(1);
      }
    });

  employees.command('me')
    .description('Get current employee (based on token)')
    .option('--output <format>', 'Output format', 'table')
    .action(async (options) => {
      try {
        const client = new CloverClient();
        const data = await client.request<any>('GET', '/v3/merchants/{mId}/employees/current');
        formatOutput(data, options);
      } catch (error: any) {
        console.error(chalk.red('Error: ' + error.message));
        process.exit(1);
      }
    });

  return employees;
}
