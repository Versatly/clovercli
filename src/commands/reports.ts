import { Command } from 'commander';
import { CloverClient } from '../lib/client.js';
import chalk from 'chalk';

const fmt = (cents: number) => '$' + (cents / 100).toFixed(2);
const pct = (n: number, total: number) => total > 0 ? ((n / total) * 100).toFixed(1) + '%' : '0%';

export function reportsCommands(): Command {
  const reports = new Command('reports').description('Analytics and reporting');

  // Sales Summary
  reports.command('sales')
    .description('Sales summary by date range')
    .requiredOption('--from <date>', 'Start date (YYYY-MM-DD)')
    .requiredOption('--to <date>', 'End date (YYYY-MM-DD)')
    .option('--output <format>', 'Output: table|json', 'table')
    .action(async (opts) => {
      try {
        const client = new CloverClient();
        const fromMs = new Date(opts.from).getTime();
        const toMs = new Date(opts.to).getTime() + 86400000;

        const orders = (await client.listOrders({ limit: 1000 }))
          .filter(o => (o.createdTime || 0) >= fromMs && (o.createdTime || 0) < toMs);

        const totalSales = orders.reduce((s, o) => s + (o.total || 0), 0);
        const totalTax = orders.reduce((s, o) => s + (o.taxAmount || 0), 0);
        const totalTips = orders.reduce((s, o) => s + (o.tipAmount || 0), 0);
        const avgOrder = orders.length > 0 ? totalSales / orders.length : 0;

        if (opts.output === 'json') {
          console.log(JSON.stringify({
            period: { from: opts.from, to: opts.to },
            totalSales, totalTax, totalTips, orderCount: orders.length, avgOrder, orders
          }, null, 2));
        } else {
          console.log(chalk.bold.cyan('\n📊 Sales Report: ') + opts.from + ' to ' + opts.to);
          console.log(chalk.dim('─'.repeat(45)));
          console.log(chalk.cyan('Total Sales:    ') + chalk.green.bold(fmt(totalSales)));
          console.log(chalk.cyan('Total Tax:      ') + fmt(totalTax));
          console.log(chalk.cyan('Total Tips:     ') + fmt(totalTips));
          console.log(chalk.cyan('Order Count:    ') + orders.length);
          console.log(chalk.cyan('Avg Order:      ') + fmt(avgOrder));
          console.log();
        }
      } catch (e: any) { console.error(chalk.red('Error: ' + e.message)); process.exit(1); }
    });

  // Daily breakdown
  reports.command('daily')
    .description('Daily breakdown for date range')
    .requiredOption('--from <date>', 'Start date')
    .requiredOption('--to <date>', 'End date')
    .option('--output <format>', 'Output: table|json', 'table')
    .action(async (opts) => {
      try {
        const client = new CloverClient();
        const fromMs = new Date(opts.from).getTime();
        const toMs = new Date(opts.to).getTime() + 86400000;

        const orders = (await client.listOrders({ limit: 1000 }))
          .filter(o => (o.createdTime || 0) >= fromMs && (o.createdTime || 0) < toMs);

        const byDay: Record<string, { sales: number; orders: number; tax: number }> = {};
        orders.forEach(o => {
          const day = new Date(o.createdTime || 0).toISOString().split('T')[0];
          if (!byDay[day]) byDay[day] = { sales: 0, orders: 0, tax: 0 };
          byDay[day].sales += o.total || 0;
          byDay[day].orders += 1;
          byDay[day].tax += o.taxAmount || 0;
        });

        if (opts.output === 'json') {
          console.log(JSON.stringify(byDay, null, 2));
        } else {
          console.log(chalk.bold.cyan('\n📅 Daily Breakdown\n'));
          console.log(chalk.dim('Date         | Sales      | Orders | Tax'));
          console.log(chalk.dim('─'.repeat(50)));
          Object.keys(byDay).sort().forEach(day => {
            const d = byDay[day];
            console.log(`${day} | ${fmt(d.sales).padStart(10)} | ${String(d.orders).padStart(6)} | ${fmt(d.tax)}`);
          });
          console.log();
        }
      } catch (e: any) { console.error(chalk.red('Error: ' + e.message)); process.exit(1); }
    });

  // Hourly breakdown
  reports.command('hourly')
    .description('Sales by hour of day')
    .option('--date <date>', 'Specific date', new Date().toISOString().split('T')[0])
    .option('--output <format>', 'Output: table|json', 'table')
    .action(async (opts) => {
      try {
        const client = new CloverClient();
        const dayStart = new Date(opts.date).getTime();
        const dayEnd = dayStart + 86400000;

        const orders = (await client.listOrders({ limit: 500 }))
          .filter(o => (o.createdTime || 0) >= dayStart && (o.createdTime || 0) < dayEnd);

        const byHour: Record<number, { sales: number; orders: number }> = {};
        for (let h = 0; h < 24; h++) byHour[h] = { sales: 0, orders: 0 };

        orders.forEach(o => {
          const hour = new Date(o.createdTime || 0).getHours();
          byHour[hour].sales += o.total || 0;
          byHour[hour].orders += 1;
        });

        if (opts.output === 'json') {
          console.log(JSON.stringify({ date: opts.date, hourly: byHour }, null, 2));
        } else {
          console.log(chalk.bold.cyan('\n⏰ Hourly Sales: ') + opts.date + '\n');
          const total = orders.reduce((s, o) => s + (o.total || 0), 0);
          Object.entries(byHour).forEach(([h, d]) => {
            const bar = '█'.repeat(Math.round((d.sales / (total || 1)) * 30));
            const hour = String(h).padStart(2, '0') + ':00';
            console.log(`${hour} | ${fmt(d.sales).padStart(9)} | ${chalk.green(bar)}`);
          });
          console.log();
        }
      } catch (e: any) { console.error(chalk.red('Error: ' + e.message)); process.exit(1); }
    });

  // Top selling items
  reports.command('top-items')
    .description('Best selling items')
    .option('--from <date>', 'Start date')
    .option('--to <date>', 'End date')
    .option('--limit <n>', 'Number of items', '10')
    .option('--output <format>', 'Output: table|json', 'table')
    .action(async (opts) => {
      try {
        const client = new CloverClient();
        const orders = await client.listOrders({ limit: 1000 });
        
        // Try to expand line items
        const itemSales: Record<string, { name: string; qty: number; revenue: number }> = {};
        
        for (const order of orders) {
          if (opts.from && (order.createdTime || 0) < new Date(opts.from).getTime()) continue;
          if (opts.to && (order.createdTime || 0) > new Date(opts.to).getTime() + 86400000) continue;
          
          try {
            const details = await client.request<any>('GET', `/v3/merchants/{mId}/orders/${order.id}?expand=lineItems`);
            const lineItems = details.lineItems?.elements || [];
            lineItems.forEach((li: any) => {
              const id = li.item?.id || li.name || 'unknown';
              if (!itemSales[id]) itemSales[id] = { name: li.name || id, qty: 0, revenue: 0 };
              itemSales[id].qty += 1;
              itemSales[id].revenue += li.price || 0;
            });
          } catch { /* skip orders without line items */ }
        }

        const sorted = Object.values(itemSales).sort((a, b) => b.revenue - a.revenue).slice(0, +opts.limit);

        if (opts.output === 'json') {
          console.log(JSON.stringify(sorted, null, 2));
        } else {
          console.log(chalk.bold.cyan('\n🏆 Top Selling Items\n'));
          console.log(chalk.dim('Rank | Item                      | Qty  | Revenue'));
          console.log(chalk.dim('─'.repeat(55)));
          sorted.forEach((item, i) => {
            console.log(`${String(i + 1).padStart(4)} | ${item.name.slice(0, 25).padEnd(25)} | ${String(item.qty).padStart(4)} | ${fmt(item.revenue)}`);
          });
          console.log();
        }
      } catch (e: any) { console.error(chalk.red('Error: ' + e.message)); process.exit(1); }
    });

  // Payments breakdown
  reports.command('payments')
    .description('Payment method breakdown')
    .option('--from <date>', 'Start date')
    .option('--to <date>', 'End date')
    .option('--output <format>', 'Output: table|json', 'table')
    .action(async (opts) => {
      try {
        const client = new CloverClient();
        const payments = await client.request<any>('GET', '/v3/merchants/{mId}/payments?limit=1000');
        const elements = payments.elements || [];

        const fromMs = opts.from ? new Date(opts.from).getTime() : 0;
        const toMs = opts.to ? new Date(opts.to).getTime() + 86400000 : Date.now() + 86400000;

        const filtered = elements.filter((p: any) => 
          (p.createdTime || 0) >= fromMs && (p.createdTime || 0) < toMs
        );

        const byType: Record<string, { count: number; amount: number }> = {};
        let total = 0;

        filtered.forEach((p: any) => {
          const type = p.tender?.label || p.cardTransaction?.cardType || 'Other';
          if (!byType[type]) byType[type] = { count: 0, amount: 0 };
          byType[type].count += 1;
          byType[type].amount += p.amount || 0;
          total += p.amount || 0;
        });

        if (opts.output === 'json') {
          console.log(JSON.stringify({ total, count: filtered.length, byType }, null, 2));
        } else {
          console.log(chalk.bold.cyan('\n💳 Payment Methods\n'));
          console.log(chalk.dim('Method          | Count | Amount     | Share'));
          console.log(chalk.dim('─'.repeat(50)));
          Object.entries(byType).sort((a, b) => b[1].amount - a[1].amount).forEach(([type, d]) => {
            console.log(`${type.padEnd(15)} | ${String(d.count).padStart(5)} | ${fmt(d.amount).padStart(10)} | ${pct(d.amount, total)}`);
          });
          console.log(chalk.dim('─'.repeat(50)));
          console.log(`${'TOTAL'.padEnd(15)} | ${String(filtered.length).padStart(5)} | ${fmt(total).padStart(10)} |`);
          console.log();
        }
      } catch (e: any) { console.error(chalk.red('Error: ' + e.message)); process.exit(1); }
    });

  // Refunds
  reports.command('refunds')
    .description('Refund summary')
    .option('--from <date>', 'Start date')
    .option('--to <date>', 'End date')
    .option('--output <format>', 'Output: table|json', 'table')
    .action(async (opts) => {
      try {
        const client = new CloverClient();
        const refunds = await client.request<any>('GET', '/v3/merchants/{mId}/refunds?limit=500');
        const elements = refunds.elements || [];

        const fromMs = opts.from ? new Date(opts.from).getTime() : 0;
        const toMs = opts.to ? new Date(opts.to).getTime() + 86400000 : Date.now() + 86400000;

        const filtered = elements.filter((r: any) => 
          (r.createdTime || 0) >= fromMs && (r.createdTime || 0) < toMs
        );

        const totalRefunded = filtered.reduce((s: number, r: any) => s + (r.amount || 0), 0);

        if (opts.output === 'json') {
          console.log(JSON.stringify({ totalRefunded, count: filtered.length, refunds: filtered }, null, 2));
        } else {
          console.log(chalk.bold.cyan('\n🔄 Refunds Summary\n'));
          console.log(chalk.cyan('Total Refunded: ') + chalk.red(fmt(totalRefunded)));
          console.log(chalk.cyan('Refund Count:   ') + filtered.length);
          if (filtered.length > 0) {
            console.log(chalk.cyan('Avg Refund:     ') + fmt(totalRefunded / filtered.length));
            console.log(chalk.dim('\nRecent Refunds:'));
            filtered.slice(0, 10).forEach((r: any) => {
              const date = new Date(r.createdTime || 0).toLocaleDateString();
              console.log(`  ${date} - ${fmt(r.amount || 0)} - ${r.reason || 'No reason'}`);
            });
          }
          console.log();
        }
      } catch (e: any) { console.error(chalk.red('Error: ' + e.message)); process.exit(1); }
    });

  // Tax breakdown
  reports.command('taxes')
    .description('Tax collected summary')
    .option('--from <date>', 'Start date')
    .option('--to <date>', 'End date')
    .option('--output <format>', 'Output: table|json', 'table')
    .action(async (opts) => {
      try {
        const client = new CloverClient();
        const fromMs = opts.from ? new Date(opts.from).getTime() : 0;
        const toMs = opts.to ? new Date(opts.to).getTime() + 86400000 : Date.now() + 86400000;

        const orders = (await client.listOrders({ limit: 1000 }))
          .filter(o => (o.createdTime || 0) >= fromMs && (o.createdTime || 0) < toMs);

        const totalTax = orders.reduce((s, o) => s + (o.taxAmount || 0), 0);
        const totalSales = orders.reduce((s, o) => s + (o.total || 0), 0);
        const effectiveRate = totalSales > 0 ? (totalTax / (totalSales - totalTax)) * 100 : 0;

        if (opts.output === 'json') {
          console.log(JSON.stringify({ totalTax, totalSales, effectiveRate: effectiveRate.toFixed(2), orderCount: orders.length }, null, 2));
        } else {
          console.log(chalk.bold.cyan('\n🧾 Tax Summary\n'));
          console.log(chalk.cyan('Total Tax Collected: ') + chalk.yellow(fmt(totalTax)));
          console.log(chalk.cyan('Total Sales:         ') + fmt(totalSales));
          console.log(chalk.cyan('Effective Tax Rate:  ') + effectiveRate.toFixed(2) + '%');
          console.log(chalk.cyan('Orders with Tax:     ') + orders.filter(o => (o.taxAmount || 0) > 0).length);
          console.log();
        }
      } catch (e: any) { console.error(chalk.red('Error: ' + e.message)); process.exit(1); }
    });

  // Dashboard summary
  reports.command('summary')
    .description('Quick business dashboard')
    .option('--output <format>', 'Output: table|json', 'table')
    .action(async (opts) => {
      try {
        const client = new CloverClient();
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const weekStart = todayStart - (now.getDay() * 86400000);
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

        const orders = await client.listOrders({ limit: 1000 });
        
        const today = orders.filter(o => (o.createdTime || 0) >= todayStart);
        const week = orders.filter(o => (o.createdTime || 0) >= weekStart);
        const month = orders.filter(o => (o.createdTime || 0) >= monthStart);

        const sum = (arr: any[]) => arr.reduce((s, o) => s + (o.total || 0), 0);

        const data = {
          today: { sales: sum(today), orders: today.length },
          week: { sales: sum(week), orders: week.length },
          month: { sales: sum(month), orders: month.length },
        };

        if (opts.output === 'json') {
          console.log(JSON.stringify(data, null, 2));
        } else {
          console.log(chalk.bold.cyan('\n📈 Business Dashboard\n'));
          console.log(chalk.bold('Today'));
          console.log(`  Sales: ${chalk.green(fmt(data.today.sales))} | Orders: ${data.today.orders}`);
          console.log(chalk.bold('\nThis Week'));
          console.log(`  Sales: ${chalk.green(fmt(data.week.sales))} | Orders: ${data.week.orders}`);
          console.log(chalk.bold('\nThis Month'));
          console.log(`  Sales: ${chalk.green(fmt(data.month.sales))} | Orders: ${data.month.orders}`);
          console.log();
        }
      } catch (e: any) { console.error(chalk.red('Error: ' + e.message)); process.exit(1); }
    });

  // Export
  reports.command('export')
    .description('Export data to file')
    .argument('<type>', 'Type: orders|items|payments|customers')
    .requiredOption('--output <file>', 'Output file path')
    .option('--format <fmt>', 'Format: json|csv', 'json')
    .option('--limit <n>', 'Max records', '1000')
    .option('--from <date>', 'Start date (for orders/payments)')
    .option('--to <date>', 'End date')
    .action(async (type: string, opts) => {
      try {
        const client = new CloverClient();
        const fs = await import('fs');
        let data: any[];

        const fromMs = opts.from ? new Date(opts.from).getTime() : 0;
        const toMs = opts.to ? new Date(opts.to).getTime() + 86400000 : Date.now() + 86400000;

        switch (type) {
          case 'orders':
            data = (await client.listOrders({ limit: +opts.limit }))
              .filter(o => (o.createdTime || 0) >= fromMs && (o.createdTime || 0) < toMs);
            break;
          case 'items':
            data = await client.listItems({ limit: +opts.limit });
            break;
          case 'payments':
            const p = await client.request<any>('GET', `/v3/merchants/{mId}/payments?limit=${opts.limit}`);
            data = (p.elements || []).filter((x: any) => (x.createdTime || 0) >= fromMs && (x.createdTime || 0) < toMs);
            break;
          case 'customers':
            const c = await client.request<any>('GET', `/v3/merchants/{mId}/customers?limit=${opts.limit}`);
            data = c.elements || [];
            break;
          default:
            console.error(chalk.red('Unknown type. Use: orders, items, payments, customers'));
            process.exit(1);
        }

        if (opts.format === 'csv' && data.length > 0) {
          const headers = Object.keys(data[0]).filter(k => typeof data[0][k] !== 'object');
          const csv = [headers.join(',')];
          data.forEach(row => {
            csv.push(headers.map(h => JSON.stringify((row as any)[h] ?? '')).join(','));
          });
          fs.writeFileSync(opts.output, csv.join('\n'));
        } else {
          fs.writeFileSync(opts.output, JSON.stringify(data, null, 2));
        }

        console.log(chalk.green(`✅ Exported ${data.length} ${type} to ${opts.output}`));
      } catch (e: any) { console.error(chalk.red('Error: ' + e.message)); process.exit(1); }
    });

  return reports;
}
