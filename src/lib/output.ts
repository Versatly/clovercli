import Table from 'cli-table3';
import chalk from 'chalk';

export interface OutputOptions {
  output?: string;
  quiet?: boolean;
}

export function formatOutput(data: unknown, options: OutputOptions): void {
  if (options.quiet) {
    if (Array.isArray(data)) {
      data.forEach((item: any) => console.log(item.id || item));
    } else if (typeof data === 'object' && data !== null) {
      console.log((data as any).id || JSON.stringify(data));
    } else {
      console.log(data);
    }
    return;
  }

  if (options.output === 'json') {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (Array.isArray(data)) {
    if (data.length === 0) {
      console.log('No results found.');
      return;
    }
    const head = Object.keys(data[0]).filter(k => typeof data[0][k] !== 'object');
    const table = new Table({ head: head.map(h => chalk.cyan(h.toUpperCase())) });
    data.forEach((item: any) => table.push(head.map(h => String(item[h] ?? ''))));
    console.log(table.toString());
  } else if (typeof data === 'object' && data !== null) {
    const table = new Table();
    Object.entries(data).forEach(([key, value]) => {
      const displayValue = typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value ?? '');
      table.push([chalk.cyan(key), displayValue]);
    });
    console.log(table.toString());
  }
}
