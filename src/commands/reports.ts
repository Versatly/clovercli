import { Command } from 'commander';
import { CloverClient } from '../lib/client.js';
import chalk from 'chalk';

const fmt = (cents: number) => '$' + (cents / 100).toFixed(2);
const pct = (n: number, total: number) => total > 0 ? ((n / total) * 100).toFixed(1) + '%' : '0%';

// Period shortcuts: today, yesterday, this-week, last-week, this-month, last-month, mtd, ytd
function parsePeriod(period: string): { from: string; to: string; fromMs: number; toMs: number } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let fromDate: Date;
  let toDate: Date = today;

  switch (period.toLowerCase()) {
    case 'today':
      fromDate = today;
      toDate = today;
      break;
    case 'yesterday':
      fromDate = new Date(today.getTime() - 86400000);
      toDate = fromDate;
      break;
    case 'this-week':
      fromDate = new Date(today.getTime() - (today.getDay() * 86400000));
      toDate = today;
      break;
    case 'last-week':
      const lastWeekEnd = new Date(today.getTime() - (today.getDay() * 86400000) - 86400000);
      fromDate = new Date(lastWeekEnd.getTime() - 6 * 86400000);
      toDate = lastWeekEnd;
      break;
    case 'this-month':
      fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
      toDate = today;
      break;
    case 'last-month':
      fromDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      toDate = new Date(now.getFullYear(), now.getMonth(), 0);
      break;
    case 'mtd': // Month to date
      fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
      toDate = today;
      break;
    case 'ytd': // Year to date
      fromDate = new Date(now.getFullYear(), 0, 1);
      toDate = today;
      break;
    default:
      throw new Error(`Unknown period: ${period}. Use: today, yesterday, this-week, last-week, this-month, last-month, mtd, ytd`);
  }

  const from = fromDate.toISOString().split('T')[0];
  const to = toDate.toISOString().split('T')[0];
  return {
    from,
    to,
    fromMs: fromDate.getTime(),
    toMs: toDate.getTime() + 86400000
  };
}

export function reportsCommands(): Command {
  const reports = new Command('reports').description('Analytics and reporting');

  // Sales Summary - Uses PAYMENTS for accuracy
  reports.command('sales')
    .description('Sales summary by date range (uses payments data)')
    .option('--from <date>', 'Start date (YYYY-MM-DD)')
    .option('--to <date>', 'End date (YYYY-MM-DD)')
    .option('--period <period>', 'Period shortcut: today, yesterday, this-week, last-week, this-month, last-month, mtd, ytd')
    .option('--output <format>', 'Output: table|json', 'table')
    .action(async (opts) => {
      try {
        const client = new CloverClient();
        
        let fromMs: number, toMs: number, fromStr: string, toStr: string;
        if (opts.period) {
          const p = parsePeriod(opts.period);
          fromMs = p.fromMs; toMs = p.toMs; fromStr = p.from; toStr = p.to;
        } else if (opts.from && opts.to) {
          fromMs = new Date(opts.from).getTime();
          toMs = new Date(opts.to).getTime() + 86400000;
          fromStr = opts.from; toStr = opts.to;
        } else {
          console.error(chalk.red('Error: Provide --from/--to or --period'));
          process.exit(1);
        }

        console.log(chalk.dim('Fetching payments (this may take a moment)...'));
        const payments = await client.listAllPayments({ fromMs, toMs });
        const refunds = await client.listAllRefunds({ fromMs, toMs });

        const grossSales = payments.reduce((s, p) => s + (p.amount || 0), 0);
        const totalTips = payments.reduce((s, p) => s + (p.tipAmount || 0), 0);
        const totalTax = payments.reduce((s, p) => s + (p.taxAmount || 0), 0);
        const totalRefunds = refunds.reduce((s, r) => s + (r.amount || 0), 0);
        const netSales = grossSales - totalRefunds;
        const avgPayment = payments.length > 0 ? grossSales / payments.length : 0;

        if (opts.output === 'json') {
          console.log(JSON.stringify({
            period: { from: fromStr, to: toStr },
            grossSales, netSales, totalRefunds, totalTax, totalTips,
            paymentCount: payments.length, refundCount: refunds.length, avgPayment
          }, null, 2));
        } else {
          console.log(chalk.bold.cyan('\n📊 Sales Report: ') + fromStr + ' to ' + toStr);
          console.log(chalk.dim('─'.repeat(45)));
          console.log(chalk.cyan('Gross Sales:    ') + chalk.green.bold(fmt(grossSales)));
          console.log(chalk.cyan('Refunds:        ') + chalk.red('-' + fmt(totalRefunds)));
          console.log(chalk.cyan('Net Sales:      ') + chalk.green.bold(fmt(netSales)));
          console.log(chalk.dim('─'.repeat(45)));
          console.log(chalk.cyan('Total Tax:      ') + fmt(totalTax));
          console.log(chalk.cyan('Total Tips:     ') + fmt(totalTips));
          console.log(chalk.cyan('Transactions:   ') + payments.length);
          console.log(chalk.cyan('Avg Transaction:') + fmt(avgPayment));
          console.log();
        }
      } catch (e: any) { console.error(chalk.red('Error: ' + e.message)); process.exit(1); }
    });

  // Daily breakdown - Uses PAYMENTS
  reports.command('daily')
    .description('Daily breakdown for date range')
    .option('--from <date>', 'Start date')
    .option('--to <date>', 'End date')
    .option('--period <period>', 'Period shortcut: today, yesterday, this-week, last-week, this-month, last-month, mtd, ytd')
    .option('--output <format>', 'Output: table|json', 'table')
    .action(async (opts) => {
      try {
        const client = new CloverClient();
        
        let fromMs: number, toMs: number;
        if (opts.period) {
          const p = parsePeriod(opts.period);
          fromMs = p.fromMs; toMs = p.toMs;
        } else if (opts.from && opts.to) {
          fromMs = new Date(opts.from).getTime();
          toMs = new Date(opts.to).getTime() + 86400000;
        } else {
          console.error(chalk.red('Error: Provide --from/--to or --period'));
          process.exit(1);
        }

        console.log(chalk.dim('Fetching payments...'));
        const payments = await client.listAllPayments({ fromMs, toMs });

        const byDay: Record<string, { sales: number; count: number; tips: number; tax: number }> = {};
        payments.forEach(p => {
          const day = new Date(p.createdTime || 0).toISOString().split('T')[0];
          if (!byDay[day]) byDay[day] = { sales: 0, count: 0, tips: 0, tax: 0 };
          byDay[day].sales += p.amount || 0;
          byDay[day].count += 1;
          byDay[day].tips += p.tipAmount || 0;
          byDay[day].tax += p.taxAmount || 0;
        });

        if (opts.output === 'json') {
          console.log(JSON.stringify(byDay, null, 2));
        } else {
          console.log(chalk.bold.cyan('\n📅 Daily Breakdown\n'));
          console.log(chalk.dim('Date         | Sales       | Txns | Avg     | Tips'));
          console.log(chalk.dim('─'.repeat(60)));
          let totalSales = 0, totalTxns = 0;
          Object.keys(byDay).sort().forEach(day => {
            const d = byDay[day];
            const avg = d.count > 0 ? d.sales / d.count : 0;
            console.log(`${day} | ${fmt(d.sales).padStart(11)} | ${String(d.count).padStart(4)} | ${fmt(avg).padStart(7)} | ${fmt(d.tips)}`);
            totalSales += d.sales;
            totalTxns += d.count;
          });
          console.log(chalk.dim('─'.repeat(60)));
          console.log(`${'TOTAL'.padEnd(12)} | ${fmt(totalSales).padStart(11)} | ${String(totalTxns).padStart(4)} |`);
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

        const payments = await client.listAllPayments({ fromMs: dayStart, toMs: dayEnd });

        const byHour: Record<number, { sales: number; count: number }> = {};
        for (let h = 0; h < 24; h++) byHour[h] = { sales: 0, count: 0 };

        payments.forEach(p => {
          const hour = new Date(p.createdTime || 0).getHours();
          byHour[hour].sales += p.amount || 0;
          byHour[hour].count += 1;
        });

        if (opts.output === 'json') {
          console.log(JSON.stringify({ date: opts.date, hourly: byHour }, null, 2));
        } else {
          console.log(chalk.bold.cyan('\n⏰ Hourly Sales: ') + opts.date + '\n');
          const total = payments.reduce((s, p) => s + (p.amount || 0), 0);
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
        const fromMs = opts.from ? new Date(opts.from).getTime() : Date.now() - 30 * 86400000;
        const toMs = opts.to ? new Date(opts.to).getTime() + 86400000 : Date.now() + 86400000;

        console.log(chalk.dim('Fetching orders with line items (this may take a while)...'));
        const orders = await client.listAllOrders({ fromMs, toMs, limit: 500 });
        
        const itemSales: Record<string, { name: string; qty: number; revenue: number }> = {};
        
        let processed = 0;
        for (const order of orders) {
          try {
            const details = await client.request<any>('GET', `/v3/merchants/{mId}/orders/${order.id}?expand=lineItems`);
            const lineItems = details.lineItems?.elements || [];
            lineItems.forEach((li: any) => {
              const id = li.item?.id || li.name || 'unknown';
              if (!itemSales[id]) itemSales[id] = { name: li.name || id, qty: 0, revenue: 0 };
              itemSales[id].qty += 1;
              itemSales[id].revenue += li.price || 0;
            });
            processed++;
            if (processed % 100 === 0) process.stdout.write(chalk.dim(`\rProcessed ${processed}/${orders.length} orders...`));
          } catch { /* skip orders without line items */ }
        }
        console.log('');

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

  // Payments breakdown by method
  reports.command('payments')
    .description('Payment method breakdown')
    .option('--from <date>', 'Start date')
    .option('--to <date>', 'End date')
    .option('--output <format>', 'Output: table|json', 'table')
    .action(async (opts) => {
      try {
        const client = new CloverClient();
        const fromMs = opts.from ? new Date(opts.from).getTime() : Date.now() - 30 * 86400000;
        const toMs = opts.to ? new Date(opts.to).getTime() + 86400000 : Date.now() + 86400000;

        console.log(chalk.dim('Fetching payments...'));
        const payments = await client.listAllPayments({ fromMs, toMs });

        const byType: Record<string, { count: number; amount: number }> = {};
        let total = 0;

        payments.forEach(p => {
          const type = p.tender?.label || p.cardTransaction?.cardType || 'Other';
          if (!byType[type]) byType[type] = { count: 0, amount: 0 };
          byType[type].count += 1;
          byType[type].amount += p.amount || 0;
          total += p.amount || 0;
        });

        if (opts.output === 'json') {
          console.log(JSON.stringify({ total, count: payments.length, byType }, null, 2));
        } else {
          console.log(chalk.bold.cyan('\n💳 Payment Methods\n'));
          console.log(chalk.dim('Method               | Count | Amount      | Share'));
          console.log(chalk.dim('─'.repeat(55)));
          Object.entries(byType).sort((a, b) => b[1].amount - a[1].amount).forEach(([type, d]) => {
            console.log(`${type.padEnd(20)} | ${String(d.count).padStart(5)} | ${fmt(d.amount).padStart(11)} | ${pct(d.amount, total)}`);
          });
          console.log(chalk.dim('─'.repeat(55)));
          console.log(`${'TOTAL'.padEnd(20)} | ${String(payments.length).padStart(5)} | ${fmt(total).padStart(11)} |`);
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
        const fromMs = opts.from ? new Date(opts.from).getTime() : Date.now() - 30 * 86400000;
        const toMs = opts.to ? new Date(opts.to).getTime() + 86400000 : Date.now() + 86400000;

        const refunds = await client.listAllRefunds({ fromMs, toMs });
        const totalRefunded = refunds.reduce((s, r) => s + (r.amount || 0), 0);

        if (opts.output === 'json') {
          console.log(JSON.stringify({ totalRefunded, count: refunds.length, refunds }, null, 2));
        } else {
          console.log(chalk.bold.cyan('\n🔄 Refunds Summary\n'));
          console.log(chalk.cyan('Total Refunded: ') + chalk.red(fmt(totalRefunded)));
          console.log(chalk.cyan('Refund Count:   ') + refunds.length);
          if (refunds.length > 0) {
            console.log(chalk.cyan('Avg Refund:     ') + fmt(totalRefunded / refunds.length));
            console.log(chalk.dim('\nRecent Refunds:'));
            refunds.slice(0, 10).forEach((r) => {
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
        const fromMs = opts.from ? new Date(opts.from).getTime() : Date.now() - 30 * 86400000;
        const toMs = opts.to ? new Date(opts.to).getTime() + 86400000 : Date.now() + 86400000;

        console.log(chalk.dim('Fetching payments...'));
        const payments = await client.listAllPayments({ fromMs, toMs });

        const totalTax = payments.reduce((s, p) => s + (p.taxAmount || 0), 0);
        const totalSales = payments.reduce((s, p) => s + (p.amount || 0), 0);
        const effectiveRate = totalSales > 0 ? (totalTax / (totalSales - totalTax)) * 100 : 0;

        if (opts.output === 'json') {
          console.log(JSON.stringify({ totalTax, totalSales, effectiveRate: effectiveRate.toFixed(2), paymentCount: payments.length }, null, 2));
        } else {
          console.log(chalk.bold.cyan('\n🧾 Tax Summary\n'));
          console.log(chalk.cyan('Total Tax Collected: ') + chalk.yellow(fmt(totalTax)));
          console.log(chalk.cyan('Total Sales:         ') + fmt(totalSales));
          console.log(chalk.cyan('Effective Tax Rate:  ') + effectiveRate.toFixed(2) + '%');
          console.log(chalk.cyan('Transactions:        ') + payments.length);
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

        console.log(chalk.dim('Fetching payments for this month...'));
        const payments = await client.listAllPayments({ fromMs: monthStart });
        const refunds = await client.listAllRefunds({ fromMs: monthStart });
        
        const today = payments.filter(p => (p.createdTime || 0) >= todayStart);
        const week = payments.filter(p => (p.createdTime || 0) >= weekStart);
        const month = payments;

        const todayRefunds = refunds.filter(r => (r.createdTime || 0) >= todayStart);
        const weekRefunds = refunds.filter(r => (r.createdTime || 0) >= weekStart);
        const monthRefunds = refunds;

        const sum = (arr: any[]) => arr.reduce((s, p) => s + (p.amount || 0), 0);

        const data = {
          today: { gross: sum(today), refunds: sum(todayRefunds), net: sum(today) - sum(todayRefunds), txns: today.length },
          week: { gross: sum(week), refunds: sum(weekRefunds), net: sum(week) - sum(weekRefunds), txns: week.length },
          month: { gross: sum(month), refunds: sum(monthRefunds), net: sum(month) - sum(monthRefunds), txns: month.length },
        };

        if (opts.output === 'json') {
          console.log(JSON.stringify(data, null, 2));
        } else {
          console.log(chalk.bold.cyan('\n📈 Business Dashboard\n'));
          console.log(chalk.bold('Today'));
          console.log(`  Gross: ${chalk.green(fmt(data.today.gross))} | Refunds: ${chalk.red(fmt(data.today.refunds))} | Net: ${chalk.green.bold(fmt(data.today.net))} | Txns: ${data.today.txns}`);
          console.log(chalk.bold('\nThis Week'));
          console.log(`  Gross: ${chalk.green(fmt(data.week.gross))} | Refunds: ${chalk.red(fmt(data.week.refunds))} | Net: ${chalk.green.bold(fmt(data.week.net))} | Txns: ${data.week.txns}`);
          console.log(chalk.bold('\nThis Month'));
          console.log(`  Gross: ${chalk.green(fmt(data.month.gross))} | Refunds: ${chalk.red(fmt(data.month.refunds))} | Net: ${chalk.green.bold(fmt(data.month.net))} | Txns: ${data.month.txns}`);
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
    .option('--limit <n>', 'Max records', '10000')
    .option('--from <date>', 'Start date (for orders/payments)')
    .option('--to <date>', 'End date')
    .action(async (type: string, opts) => {
      try {
        const client = new CloverClient();
        const fs = await import('fs');
        let data: any[];

        const fromMs = opts.from ? new Date(opts.from).getTime() : undefined;
        const toMs = opts.to ? new Date(opts.to).getTime() + 86400000 : undefined;

        console.log(chalk.dim(`Fetching ${type}...`));
        switch (type) {
          case 'orders':
            data = await client.listAllOrders({ fromMs, toMs, limit: +opts.limit });
            break;
          case 'items':
            data = await client.listItems({ limit: +opts.limit });
            break;
          case 'payments':
            data = await client.listAllPayments({ fromMs, toMs, limit: +opts.limit });
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

        console.log(chalk.dim('Fetching orders with line items (limited to 300 for speed)...'));
        const orders = await client.listAllOrders({ fromMs, toMs, limit: 300 });

        let totalSales = 0;
        let processed = 0;
        for (const order of orders) {
          try {
            const details = await client.request<any>('GET', `/v3/merchants/{mId}/orders/${order.id}?expand=lineItems.item`);
            const lineItems = details.lineItems?.elements || [];
            const orderCategories = new Set<string>();

            for (const li of lineItems) {
              const price = li.price || 0;
              totalSales += price;
              
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
            
            processed++;
            if (processed % 50 === 0) process.stdout.write(chalk.dim(`\rProcessed ${processed}/${orders.length}...`));
          } catch { /* skip orders without line items */ }
        }
        console.log('');

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

        console.log(chalk.dim('Fetching payments for both periods...'));
        const [period1, period2] = await Promise.all([
          client.listAllPayments({ fromMs: p1From, toMs: p1To }),
          client.listAllPayments({ fromMs: p2From, toMs: p2To })
        ]);

        const p1Sales = period1.reduce((s, p) => s + (p.amount || 0), 0);
        const p2Sales = period2.reduce((s, p) => s + (p.amount || 0), 0);
        const p1Txns = period1.length;
        const p2Txns = period2.length;
        const p1Avg = p1Txns > 0 ? p1Sales / p1Txns : 0;
        const p2Avg = p2Txns > 0 ? p2Sales / p2Txns : 0;

        const salesChange = p2Sales > 0 ? ((p1Sales - p2Sales) / p2Sales) * 100 : 0;
        const txnsChange = p2Txns > 0 ? ((p1Txns - p2Txns) / p2Txns) * 100 : 0;
        const avgChange = p2Avg > 0 ? ((p1Avg - p2Avg) / p2Avg) * 100 : 0;

        const data = {
          period1: { from: opts.period1From, to: opts.period1To, sales: p1Sales, txns: p1Txns, avgTxn: p1Avg },
          period2: { from: opts.period2From, to: opts.period2To, sales: p2Sales, txns: p2Txns, avgTxn: p2Avg },
          changes: { sales: salesChange, txns: txnsChange, avgTxn: avgChange }
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
          console.log(`${'Transactions'.padEnd(15)} | ${String(p1Txns).padStart(18)} | ${String(p2Txns).padStart(18)} | ${arrow(txnsChange)}`);
          console.log(`${'Avg Txn'.padEnd(15)} | ${fmt(p1Avg).padStart(18)} | ${fmt(p2Avg).padStart(18)} | ${arrow(avgChange)}`);
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
        const employees: Record<string, { name: string; sales: number; txns: number; tips: number }> = {};
        (empResp.elements || []).forEach((e: any) => {
          employees[e.id] = { name: e.name || 'Unknown', sales: 0, txns: 0, tips: 0 };
        });

        console.log(chalk.dim('Fetching payments...'));
        const payments = await client.listAllPayments({ fromMs, toMs });

        let totalSales = 0;
        payments.forEach(p => {
          const empId = p.employee?.id;
          const amount = p.amount || 0;
          const tips = p.tipAmount || 0;
          totalSales += amount;

          if (empId && employees[empId]) {
            employees[empId].sales += amount;
            employees[empId].txns += 1;
            employees[empId].tips += tips;
          }
        });

        const sorted = Object.values(employees)
          .filter(e => e.sales > 0)
          .sort((a, b) => b.sales - a.sales);

        if (opts.output === 'json') {
          console.log(JSON.stringify({ totalSales, employees: sorted }, null, 2));
        } else {
          console.log(chalk.bold.cyan('\n👥 Sales by Employee\n'));
          console.log(chalk.dim('Employee                      | Sales       | Txns | Avg Txn   | Tips    | Share'));
          console.log(chalk.dim('─'.repeat(85)));
          sorted.forEach((e, i) => {
            const medal = i === 0 ? '🥇 ' : i === 1 ? '🥈 ' : i === 2 ? '🥉 ' : '   ';
            const avg = e.txns > 0 ? e.sales / e.txns : 0;
            console.log(`${medal}${e.name.slice(0, 26).padEnd(26)} | ${fmt(e.sales).padStart(11)} | ${String(e.txns).padStart(4)} | ${fmt(avg).padStart(9)} | ${fmt(e.tips).padStart(7)} | ${pct(e.sales, totalSales)}`);
          });
          console.log(chalk.dim('─'.repeat(85)));
          console.log(`${'   TOTAL'.padEnd(29)} | ${fmt(totalSales).padStart(11)} | ${String(payments.length).padStart(4)} |`);
          console.log();
        }
      } catch (e: any) { console.error(chalk.red('Error: ' + e.message)); process.exit(1); }
    });

  return reports;
}
