import Table from 'cli-table3';
import chalk from 'chalk';
export interface OutputOptions { output?: string; quiet?: boolean; }
export function formatOutput(data: unknown, options: OutputOptions): void {
  if (options.quiet) { if (Array.isArray(data)) data.forEach((i: any) => console.log(i.id || i)); else if (typeof data === 'object' && data !== null) console.log((data as any).id || JSON.stringify(data)); else console.log(data); return; }
  if (options.output === 'json') { console.log(JSON.stringify(data, null, 2)); return; }
  if (Array.isArray(data)) { if (data.length === 0) { console.log('No results.'); return; } const h = Object.keys(data[0]).filter(k => typeof data[0][k] !== 'object'); const t = new Table({ head: h.map(x => chalk.cyan(x.toUpperCase())) }); data.forEach((i: any) => t.push(h.map(x => String(i[x] ?? '')))); console.log(t.toString()); }
  else if (typeof data === 'object' && data !== null) { const t = new Table(); Object.entries(data).forEach(([k, v]) => t.push([chalk.cyan(k), typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v ?? '')])); console.log(t.toString()); }
}
