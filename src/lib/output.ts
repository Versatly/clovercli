import Table from 'cli-table3';

export type OutputFormat = 'json' | 'table' | 'quiet';
let outputFormat: OutputFormat = 'table';

export function setOutputFormat(fmt: OutputFormat): void { outputFormat = fmt; }
export function getOutputFormat(): OutputFormat { return outputFormat; }

export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function formatDate(ts: number): string {
  return new Date(ts).toLocaleString();
}

export function output(data: unknown): void {
  if (outputFormat === 'json') {
    console.log(JSON.stringify(data, null, 2));
  } else {
    console.log(data);
  }
}

export function outputTable(headers: string[], rows: string[][]): void {
  if (outputFormat === 'json') {
    const result = rows.map(row => {
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => { obj[h] = row[i]; });
      return obj;
    });
    console.log(JSON.stringify(result, null, 2));
  } else if (outputFormat === 'quiet') {
    rows.forEach(row => console.log(row[0]));
  } else {
    const table = new Table({ head: headers, style: { head: ['cyan'] } });
    rows.forEach(row => table.push(row));
    console.log(table.toString());
  }
}

export function success(msg: string): void { console.log(`✓ ${msg}`); }
export function error(msg: string): void { console.error(`✗ ${msg}`); }
export function info(msg: string): void { console.log(`ℹ ${msg}`); }
