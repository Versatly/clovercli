import { Command } from 'commander';
import { CloverClient } from '../lib/client.js';
import { formatOutput } from '../lib/output.js';
import chalk from 'chalk';

export function reportsCommands(): Command {
  const reports = new Command('reports').description('Analytics and reporting');

  reports.command('sales')
    .description('Sales summary for date range')
    .requiredOption('--from <date>', 'Start date (YYYY-MM-DD)')
    .requiredOption('--to <date>', 'End date (YYYY-MM-DD)')
    .option('--output <format>', 'Output format', 'table')
    .action(async (options) => {
      try {
        const client = new CloverClient();
        const fromMs = new Date(options.from).getTime();
        const toMs = new Date(options.to).getTime() + 86400000;

        // Fetch orders in date range
        const allOrders = await client.listOrders({ limit: 1000 });
        const orders = allOrders.filter(o => {
          const t = o.createdTime || 0;
          return t >= fromMs && t < toMs;
        });

        const totalSales = orders.reduce((sum, o) => sum + (o.total || 0), 0);
        const orderCount = orders.length;
        const avgOrder = orderCount > 0 ? Math.round(totalSales / orderCount) : 0;

        const summary = {
          period: options.from + ' to ' + options.to,
          totalSales: '$' + (totalSales / 100).toFixed(2),
          orderCount,
          avgOrderValue: '$' + (avgOrder / 100).toFixed(2),
        };

        if (options.output === 'json') {
          console.log(JSON.stringify({ summary, orders }, null, 2));
        } else {
          console.log(chalk.cyan('\nSales Summary'));
          console.log(chalk.dim('─'.repeat(40)));
          console.log(chalk.cyan('Period:'), summary.period);
          console.log(chalk.cyan('Total Sales:'), chalk.green(summary.totalSales));
          console.log(chalk.cyan('Orders:'), summary.orderCount);
          console.log(chalk.cyan('Avg Order:'), summary.avgOrderValue);
          console.log();
        }
      } catch (error: any) {
        console.error(chalk.red('Error: ' + error.message));
        process.exit(1);
      }
    });

  reports.command('daily')
    .description('Daily summary')
    .option('--date <date>', 'Date (YYYY-MM-DD)', new Date().toISOString().split('T')[0])
    .option('--output <format>', 'Output format', 'table')
    .action(async (options) => {
      try {
        const client = new CloverClient();
        const dateMs = new Date(options.date).getTime();
        const nextDayMs = dateMs + 86400000;

        const allOrders = await client.listOrders({ limit: 500 });
        const orders = allOrders.filter(o => {
          const t = o.createdTime || 0;
          return t >= dateMs && t < nextDayMs;
        });

        const totalSales = orders.reduce((sum, o) => sum + (o.total || 0), 0);

        const summary = {
          date: options.date,
          totalSales: '$' + (totalSales / 100).toFixed(2),
          orderCount: orders.length,
        };

        if (options.output === 'json') {
          console.log(JSON.stringify({ summary, orders }, null, 2));
        } else {
          console.log(chalk.cyan('\nDaily Summary:'), options.date);
          console.log(chalk.dim('─'.repeat(40)));
          console.log(chalk.cyan('Total Sales:'), chalk.green(summary.totalSales));
          console.log(chalk.cyan('Orders:'), summary.orderCount);
          console.log();
        }
      } catch (error: any) {
        console.error(chalk.red('Error: ' + error.message));
        process.exit(1);
      }
    });

  reports.command('export')
    .description('Export data to file')
    .argument('<type>', 'Data type (orders, items)')
    .requiredOption('--output <file>', 'Output file path')
    .option('--format <format>', 'Format (json, csv)', 'json')
    .option('--limit <n>', 'Max records', '1000')
    .action(async (type: string, options) => {
      try {
        const client = new CloverClient();
        const fs = await import('fs');
        let data: any[];

        if (type === 'orders') {
          data = await client.listOrders({ limit: +options.limit });
        } else if (type === 'items') {
          data = await client.listItems({ limit: +options.limit });
        } else {
          console.error(chalk.red('Unknown type: ' + type + '. Use: orders, items'));
          process.exit(1);
        }

        if (options.format === 'csv' && data.length > 0) {
          const headers = Object.keys(data[0]).filter(k => typeof data[0][k] !== 'object');
          const csv = [headers.join(',')];
          data.forEach(row => {
            csv.push(headers.map(h => JSON.stringify((row as any)[h] ?? '')).join(','));
          });
          fs.writeFileSync(options.output, csv.join('\n'));
        } else {
          fs.writeFileSync(options.output, JSON.stringify(data, null, 2));
        }

        console.log(chalk.green('Exported ' + data.length + ' ' + type + ' to ' + options.output));
      } catch (error: any) {
        console.error(chalk.red('Error: ' + error.message));
        process.exit(1);
      }
    });

  return reports;
}
