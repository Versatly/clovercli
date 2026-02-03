#!/usr/bin/env node
import { Command } from 'commander';
import { setOutputFormat, OutputFormat } from './lib/output';
import { registerAuthCommands } from './commands/auth';
import { registerMerchantCommands } from './commands/merchant';
import { registerInventoryCommands } from './commands/inventory';
import { registerOrdersCommands } from './commands/orders';

const program = new Command();

program
  .name('clovercli')
  .description('Clover POS CLI for merchants and developers')
  .version('1.0.0')
  .option('-o, --output <format>', 'Output format (json, table, quiet)', 'table')
  .hook('preAction', (thisCommand) => {
    const opts = thisCommand.opts();
    if (opts.output) {
      setOutputFormat(opts.output as OutputFormat);
    }
  });

registerAuthCommands(program);
registerMerchantCommands(program);
registerInventoryCommands(program);
registerOrdersCommands(program);

program.parse();
