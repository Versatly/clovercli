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

  // Categories breakdown
  reports.command('categories')
    .description('Sales breakdown by category')
    .option('--from <date>', 'Start date')
    .option('--to <date>', 'End date')
    .option('--output <format>', 'Output: table|json', 'table')
    .action(async (opts) => {
      try {
        const client = new CloverClient();
        const fromMs = opts.from ? new Date(opts.from).getTime() : Date.now() - 30 * 86400000;
        const toMs = opts.to ? new Date(opts.to).getTime() + 86400000 : Date.now() + 86400000;

        // Get categories
        const catResp = await client.request<any>('GET', '/v3/merchants/{mId}/categories?limit=500');
        const categories: Record<string, { name: string; sales: number; orders: number; items: number }> = {};
        (catResp.elements || []).forEach((c: any) => {
          categories[c.id] = { name: c.name, sales: 0, orders: 0, items: 0 };
        });
        categories['uncategorized'] = { name: 'Uncategorized', sales: 0, orders: 0, items: 0 };

        // Get orders with line items
        const orders = (await client.listOrders({ limit: 1000 }))
          .filter(o => (o.createdTime || 0) >= fromMs && (o.createdTime || 0) < toMs);

        let totalSales = 0;
        for (const order of orders) {
          try {
            const details = await client.request<any>('GET', `/v3/merchants/{mId}/orders/${order.id}?expand=lineItems.item`);
            const lineItems = details.lineItems?.elements || [];
            const orderCategories = new Set<string>();

            for (const li of lineItems) {
              const price = li.price || 0;
              totalSales += price;
              
              // Get item's category
              let catId = 'uncategorized';
              if (li.item?.id) {
                try {
                  const itemCats = await client.request<any>('GET', `/v3/merchants/{mId}/items/${li.item.id}/categories`);
                  if (itemCats.elements?.length > 0) {
                    catId = itemCats.elements[0].id;
                  }
                } catch { /* ignore */ }
              }

              if (categories[catId]) {
                categories[catId].sales += price;
                categories[catId].items += 1;
                orderCategories.add(catId);
              } else {
                categories['uncategorized'].sales += price;
                categories['uncategorized'].items += 1;
                orderCategories.add('uncategorized');
              }
            }

            orderCategories.forEach(cid => {
              if (categories[cid]) categories[cid].orders += 1;
            });
          } catch { /* skip orders without line items */ }
        }

        const sorted = Object.values(categories)
          .filter(c => c.sales > 0)
          .sort((a, b) => b.sales - a.sales);

        if (opts.output === 'json') {
          console.log(JSON.stringify({ totalSales, categories: sorted }, null, 2));
        } else {
          console.log(chalk.bold.cyan('\n📦 Sales by Category\n'));
          console.log(chalk.dim('Category                      | Sales      | Orders | Items | Share'));
          console.log(chalk.dim('─'.repeat(70)));
          sorted.forEach(c => {
            console.log(`${c.name.slice(0, 29).padEnd(29)} | ${fmt(c.sales).padStart(10)} | ${String(c.orders).padStart(6)} | ${String(c.items).padStart(5)} | ${pct(c.sales, totalSales)}`);
          });
          console.log(chalk.dim('─'.repeat(70)));
          console.log(`${'TOTAL'.padEnd(29)} | ${fmt(totalSales).padStart(10)} |`);
          console.log();
        }
      } catch (e: any) { console.error(chalk.red('Error: ' + e.message)); process.exit(1); }
    });

  // Period comparison (YoY, MoM, etc.)
  reports.command('compare')
    .description('Compare two time periods (e.g., YoY, MoM)')
    .requiredOption('--period1-from <date>', 'Period 1 start')
    .requiredOption('--period1-to <date>', 'Period 1 end')
    .requiredOption('--period2-from <date>', 'Period 2 start')
    .requiredOption('--period2-to <date>', 'Period 2 end')
    .option('--output <format>', 'Output: table|json', 'table')
    .action(async (opts) => {
      try {
        const client = new CloverClient();
        
        const p1From = new Date(opts.period1From).getTime();
        const p1To = new Date(opts.period1To).getTime() + 86400000;
        const p2From = new Date(opts.period2From).getTime();
        const p2To = new Date(opts.period2To).getTime() + 86400000;

        const allOrders = await client.listOrders({ limit: 1000 });

        const period1 = allOrders.filter(o => (o.createdTime || 0) >= p1From && (o.createdTime || 0) < p1To);
        const period2 = allOrders.filter(o => (o.createdTime || 0) >= p2From && (o.createdTime || 0) < p2To);

        const p1Sales = period1.reduce((s, o) => s + (o.total || 0), 0);
        const p2Sales = period2.reduce((s, o) => s + (o.total || 0), 0);
        const p1Orders = period1.length;
        const p2Orders = period2.length;
        const p1Avg = p1Orders > 0 ? p1Sales / p1Orders : 0;
        const p2Avg = p2Orders > 0 ? p2Sales / p2Orders : 0;

        const salesChange = p2Sales > 0 ? ((p1Sales - p2Sales) / p2Sales) * 100 : 0;
        const ordersChange = p2Orders > 0 ? ((p1Orders - p2Orders) / p2Orders) * 100 : 0;
        const avgChange = p2Avg > 0 ? ((p1Avg - p2Avg) / p2Avg) * 100 : 0;

        const data = {
          period1: { from: opts.period1From, to: opts.period1To, sales: p1Sales, orders: p1Orders, avgOrder: p1Avg },
          period2: { from: opts.period2From, to: opts.period2To, sales: p2Sales, orders: p2Orders, avgOrder: p2Avg },
          changes: { sales: salesChange, orders: ordersChange, avgOrder: avgChange }
        };

        if (opts.output === 'json') {
          console.log(JSON.stringify(data, null, 2));
        } else {
          const arrow = (n: number) => n > 0 ? chalk.green('↑ +' + n.toFixed(1) + '%') : n < 0 ? chalk.red('↓ ' + n.toFixed(1) + '%') : chalk.gray('→ 0%');
          
          console.log(chalk.bold.cyan('\n📈 Period Comparison\n'));
          console.log(chalk.dim('Metric          | Period 1           | Period 2           | Change'));
          console.log(chalk.dim('─'.repeat(75)));
          console.log(`${'Dates'.padEnd(15)} | ${(opts.period1From + ' to ' + opts.period1To).padEnd(18)} | ${(opts.period2From + ' to ' + opts.period2To).padEnd(18)} |`);
          console.log(`${'Total Sales'.padEnd(15)} | ${fmt(p1Sales).padStart(18)} | ${fmt(p2Sales).padStart(18)} | ${arrow(salesChange)}`);
          console.log(`${'Order Count'.padEnd(15)} | ${String(p1Orders).padStart(18)} | ${String(p2Orders).padStart(18)} | ${arrow(ordersChange)}`);
          console.log(`${'Avg Order'.padEnd(15)} | ${fmt(p1Avg).padStart(18)} | ${fmt(p2Avg).padStart(18)} | ${arrow(avgChange)}`);
          console.log();

          if (salesChange > 0) {
            console.log(chalk.green(`🎉 Sales up ${salesChange.toFixed(1)}% compared to previous period!`));
          } else if (salesChange < 0) {
            console.log(chalk.yellow(`⚠️  Sales down ${Math.abs(salesChange).toFixed(1)}% compared to previous period.`));
          }
          console.log();
        }
      } catch (e: any) { console.error(chalk.red('Error: ' + e.message)); process.exit(1); }
    });

  // Employee sales report
  reports.command('employees')
    .description('Sales breakdown by employee')
    .option('--from <date>', 'Start date')
    .option('--to <date>', 'End date')
    .option('--output <format>', 'Output: table|json', 'table')
    .action(async (opts) => {
      try {
        const client = new CloverClient();
        const fromMs = opts.from ? new Date(opts.from).getTime() : Date.now() - 30 * 86400000;
        const toMs = opts.to ? new Date(opts.to).getTime() + 86400000 : Date.now() + 86400000;

        // Get employees
        const empResp = await client.request<any>('GET', '/v3/merchants/{mId}/employees?limit=100');
        const employees: Record<string, { name: string; sales: number; orders: number; avgOrder: number }> = {};
        (empResp.elements || []).forEach((e: any) => {
          employees[e.id] = { name: e.name || 'Unknown', sales: 0, orders: 0, avgOrder: 0 };
        });

        // Get orders
        const orders = (await client.listOrders({ limit: 1000 }))
          .filter(o => (o.createdTime || 0) >= fromMs && (o.createdTime || 0) < toMs);

        let totalSales = 0;
        for (const order of orders) {
          try {
            const details = await client.request<any>('GET', `/v3/merchants/{mId}/orders/${order.id}`);
            const empId = details.employee?.id;
            const amount = order.total || 0;
            totalSales += amount;

            if (empId && employees[empId]) {
              employees[empId].sales += amount;
              employees[empId].orders += 1;
            }
          } catch { /* skip */ }
        }

        // Calculate averages
        Object.values(employees).forEach(e => {
          e.avgOrder = e.orders > 0 ? e.sales / e.orders : 0;
        });

        const sorted = Object.values(employees)
          .filter(e => e.sales > 0)
          .sort((a, b) => b.sales - a.sales);

        if (opts.output === 'json') {
          console.log(JSON.stringify({ totalSales, employees: sorted }, null, 2));
        } else {
          console.log(chalk.bold.cyan('\n👥 Sales by Employee\n'));
          console.log(chalk.dim('Employee                      | Sales      | Orders | Avg Order | Share'));
          console.log(chalk.dim('─'.repeat(75)));
          sorted.forEach((e, i) => {
            const medal = i === 0 ? '🥇 ' : i === 1 ? '🥈 ' : i === 2 ? '🥉 ' : '   ';
            console.log(`${medal}${e.name.slice(0, 26).padEnd(26)} | ${fmt(e.sales).padStart(10)} | ${String(e.orders).padStart(6)} | ${fmt(e.avgOrder).padStart(9)} | ${pct(e.sales, totalSales)}`);
          });
          console.log(chalk.dim('─'.repeat(75)));
          console.log(`${'   TOTAL'.padEnd(29)} | ${fmt(totalSales).padStart(10)} | ${String(orders.length).padStart(6)} |`);
          console.log();
        }
      } catch (e: any) { console.error(chalk.red('Error: ' + e.message)); process.exit(1); }
    });

  return reports;
}
