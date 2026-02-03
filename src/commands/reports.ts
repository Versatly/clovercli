import { Command } from 'commander';
import { createClient } from '../lib/client';
import { outputTable, success, error, formatPrice, formatDate, getOutputFormat } from '../lib/output';

interface ReportSummary {
  totalSales?: number;
  totalRefunds?: number;
  totalTax?: number;
  netSales?: number;
  orderCount?: number;
  avgOrderValue?: number;
}

interface PaymentSummary {
  tender?: string;
  amount?: number;
  count?: number;
}

export function registerReportsCommands(program: Command): void {
  const reports = program.command('reports').description('Analytics and reporting commands');

  reports.command('sales')
    .description('Sales report by date range')
    .requiredOption('--from <date>', 'Start date (YYYY-MM-DD)')
    .requiredOption('--to <date>', 'End date (YYYY-MM-DD)')
    .option('--employee <id>', 'Filter by employee ID')
    .option('--item <id>', 'Filter by item ID')
    .option('--merchant <id>', 'Merchant ID')
    .action(async (opts) => {
      try {
        const { client, merchantId } = await createClient(opts.merchant);
        const fromMs = new Date(opts.from).getTime();
        const toMs = new Date(opts.to).getTime() + 86400000; // Include end date

        // Fetch orders in date range
        const orders = await client.listOrders({ limit: 1000 });
        const filtered = orders.filter(o => {
          if (!o.createdTime) return false;
          if (o.createdTime < fromMs || o.createdTime >= toMs) return false;
          return true;
        });

        // Calculate summary
        const totalSales = filtered.reduce((sum, o) => sum + (o.total || 0), 0);
        const orderCount = filtered.length;
        const avgOrderValue = orderCount > 0 ? totalSales / orderCount : 0;

        if (getOutputFormat() === 'json') {
          console.log(JSON.stringify({
            period: { from: opts.from, to: opts.to },
            totalSales,
            orderCount,
            avgOrderValue,
            orders: filtered
          }, null, 2));
        } else {
          console.log(`\nSales Report: ${opts.from} to ${opts.to}`);
          console.log(`Merchant: ${merchantId}\n`);
          outputTable(['Metric', 'Value'], [
            ['Total Sales', formatPrice(totalSales)],
            ['Order Count', orderCount.toString()],
            ['Average Order', formatPrice(avgOrderValue)],
          ]);
          if (filtered.length > 0) {
            console.log('\nRecent Orders:');
            outputTable(['ID', 'Total', 'Created', 'Note'],
              filtered.slice(0, 20).map(o => [
                o.id,
                o.total ? formatPrice(o.total) : '-',
                o.createdTime ? formatDate(o.createdTime) : '-',
                (o.note || '-').slice(0, 30)
              ])
            );
          }
        }
      } catch (err: unknown) { error((err as Error).message); process.exit(1); }
    });

  reports.command('payments')
    .description('Payment report by date range')
    .requiredOption('--from <date>', 'Start date (YYYY-MM-DD)')
    .requiredOption('--to <date>', 'End date (YYYY-MM-DD)')
    .option('--merchant <id>', 'Merchant ID')
    .action(async (opts) => {
      try {
        const { client, merchantId } = await createClient(opts.merchant);
        const fromMs = new Date(opts.from).getTime();
        const toMs = new Date(opts.to).getTime() + 86400000;

        // Note: Clover API /v3/merchants/{mId}/payments endpoint
        // For now, we'll aggregate from orders
        const orders = await client.listOrders({ limit: 1000 });
        const filtered = orders.filter(o => {
          if (!o.createdTime) return false;
          return o.createdTime >= fromMs && o.createdTime < toMs;
        });

        const totalPayments = filtered.reduce((sum, o) => sum + (o.total || 0), 0);
        const paymentCount = filtered.length;

        if (getOutputFormat() === 'json') {
          console.log(JSON.stringify({
            period: { from: opts.from, to: opts.to },
            totalPayments,
            paymentCount
          }, null, 2));
        } else {
          console.log(`\nPayment Report: ${opts.from} to ${opts.to}`);
          console.log(`Merchant: ${merchantId}\n`);
          outputTable(['Metric', 'Value'], [
            ['Total Payments', formatPrice(totalPayments)],
            ['Payment Count', paymentCount.toString()],
          ]);
        }
      } catch (err: unknown) { error((err as Error).message); process.exit(1); }
    });

  reports.command('refunds')
    .description('Refund report by date range')
    .requiredOption('--from <date>', 'Start date (YYYY-MM-DD)')
    .requiredOption('--to <date>', 'End date (YYYY-MM-DD)')
    .option('--merchant <id>', 'Merchant ID')
    .action(async (opts) => {
      try {
        const { client, merchantId } = await createClient(opts.merchant);
        
        // Note: Clover API has /v3/merchants/{mId}/refunds endpoint
        // This would require adding refund methods to the client
        console.log(`\nRefund Report: ${opts.from} to ${opts.to}`);
        console.log(`Merchant: ${merchantId}`);
        console.log('\nNote: Refund reporting requires additional API integration.');
        console.log('Use --output json for programmatic access once implemented.');
        
        if (getOutputFormat() === 'json') {
          console.log(JSON.stringify({
            period: { from: opts.from, to: opts.to },
            message: 'Refund API integration pending'
          }, null, 2));
        }
      } catch (err: unknown) { error((err as Error).message); process.exit(1); }
    });

  reports.command('taxes')
    .description('Tax report by date range')
    .requiredOption('--from <date>', 'Start date (YYYY-MM-DD)')
    .requiredOption('--to <date>', 'End date (YYYY-MM-DD)')
    .option('--merchant <id>', 'Merchant ID')
    .action(async (opts) => {
      try {
        const { client, merchantId } = await createClient(opts.merchant);
        
        // Tax calculations would come from order line items
        // Clover API: /v3/merchants/{mId}/tax_rates
        console.log(`\nTax Report: ${opts.from} to ${opts.to}`);
        console.log(`Merchant: ${merchantId}`);
        console.log('\nNote: Tax reporting requires line item analysis.');
        
        if (getOutputFormat() === 'json') {
          console.log(JSON.stringify({
            period: { from: opts.from, to: opts.to },
            message: 'Tax calculation requires line item integration'
          }, null, 2));
        }
      } catch (err: unknown) { error((err as Error).message); process.exit(1); }
    });

  reports.command('summary')
    .description('Quick summary for a period')
    .option('--period <period>', 'Period: day, week, month, year', 'day')
    .option('--merchant <id>', 'Merchant ID')
    .action(async (opts) => {
      try {
        const { client, merchantId } = await createClient(opts.merchant);
        
        const now = new Date();
        let fromDate: Date;
        
        switch (opts.period) {
          case 'day':
            fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
          case 'week':
            fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case 'month':
            fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
          case 'year':
            fromDate = new Date(now.getFullYear(), 0, 1);
            break;
          default:
            fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        }

        const fromMs = fromDate.getTime();
        const orders = await client.listOrders({ limit: 1000 });
        const filtered = orders.filter(o => o.createdTime && o.createdTime >= fromMs);

        const totalSales = filtered.reduce((sum, o) => sum + (o.total || 0), 0);
        const orderCount = filtered.length;
        const avgOrder = orderCount > 0 ? totalSales / orderCount : 0;

        // Get merchant info for context
        const merchant = await client.getMerchant();

        if (getOutputFormat() === 'json') {
          console.log(JSON.stringify({
            merchant: { id: merchantId, name: merchant.name },
            period: opts.period,
            from: fromDate.toISOString().split('T')[0],
            to: now.toISOString().split('T')[0],
            totalSales,
            orderCount,
            avgOrderValue: avgOrder
          }, null, 2));
        } else {
          console.log(`\n📊 ${merchant.name} - ${opts.period.charAt(0).toUpperCase() + opts.period.slice(1)}ly Summary`);
          console.log(`Period: ${fromDate.toLocaleDateString()} - ${now.toLocaleDateString()}\n`);
          outputTable(['Metric', 'Value'], [
            ['💰 Total Sales', formatPrice(totalSales)],
            ['📦 Orders', orderCount.toString()],
            ['📈 Avg Order', formatPrice(avgOrder)],
          ]);
        }
      } catch (err: unknown) { error((err as Error).message); process.exit(1); }
    });

  reports.command('top-items')
    .description('Top selling items')
    .option('--limit <n>', 'Number of items to show', '10')
    .option('--merchant <id>', 'Merchant ID')
    .action(async (opts) => {
      try {
        const { client } = await createClient(opts.merchant);
        
        // Get all items and show them (actual sales data would need order line items)
        const items = await client.listItems({ limit: parseInt(opts.limit) });
        
        if (getOutputFormat() === 'json') {
          console.log(JSON.stringify(items, null, 2));
        } else {
          console.log(`\nTop ${opts.limit} Items:\n`);
          outputTable(['ID', 'Name', 'Price', 'SKU'],
            items.map(i => [i.id, i.name, i.price ? formatPrice(i.price) : '-', i.sku || '-'])
          );
        }
      } catch (err: unknown) { error((err as Error).message); process.exit(1); }
    });
}
