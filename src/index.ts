#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { prompt } from 'enquirer';
import ora from 'ora';
import Table from 'cli-table3';
import { loadConfig, saveConfig, getApiKey, getApiUrl, maskApiKey, displayConfigStatus, isAuthenticated } from './config';
import { validateApiKey, displayValidationResult, DWLFApiClient, normalizeSymbol } from './api-client';
import { createBacktestCommand } from './backtest';

const program = new Command();

program
  .name('dwlf')
  .description('CLI tool for DWLF market analysis platform')
  .version('0.1.0');

// Login command - now fully implemented!
program
  .command('login')
  .description('Configure API credentials')
  .option('--show-config', 'Show current configuration without changing it')
  .option('--validate', 'Validate current API key')
  .action(async (options) => {
    try {
      // Show config option
      if (options.showConfig) {
        await displayConfigStatus();
        return;
      }

      // Validate current key option
      if (options.validate) {
        const currentKey = await getApiKey();
        if (!currentKey) {
          console.log(chalk.red('❌ No API key configured.'));
          console.log(chalk.gray('Run `dwlf login` to configure your credentials.'));
          return;
        }

        const spinner = ora('Validating API key...').start();
        const apiUrl = await getApiUrl();
        const result = await validateApiKey(currentKey, apiUrl);
        spinner.stop();
        
        displayValidationResult(result);
        return;
      }

      console.log(chalk.bold.cyan('🦊 Welcome to DWLF CLI!'));
      console.log();

      // Check if already authenticated
      if (await isAuthenticated()) {
        const currentKey = await getApiKey();
        console.log(chalk.gray(`Currently using API key: ${maskApiKey(currentKey!)}`));
        console.log();

        const { overwrite }: { overwrite: boolean } = await prompt({
          type: 'confirm',
          name: 'overwrite',
          message: 'API key is already configured. Do you want to update it?',
          initial: false
        });

        if (!overwrite) {
          console.log(chalk.green('✅ Keeping current configuration.'));
          return;
        }
        console.log();
      }

      // Prompt for API key
      const { apiKey }: { apiKey: string } = await prompt({
        type: 'password',
        name: 'apiKey',
        message: 'Enter your DWLF API key:',
        validate: (input: string) => {
          if (!input.trim()) {
            return 'API key is required';
          }
          if (!input.startsWith('dwlf_sk_')) {
            return 'API key must start with "dwlf_sk_"';
          }
          return true;
        }
      });

      // Validate the API key
      const spinner = ora('Validating API key...').start();
      const apiUrl = await getApiUrl();
      const validationResult = await validateApiKey(apiKey.trim(), apiUrl);
      spinner.stop();

      if (!validationResult.valid) {
        console.log();
        displayValidationResult(validationResult);
        console.log(chalk.gray('\nPlease check your API key and try again.'));
        process.exit(1);
      }

      // Save the validated API key
      const config = await loadConfig();
      config.apiKey = apiKey.trim();
      await saveConfig(config);

      console.log();
      displayValidationResult(validationResult);
      console.log(chalk.green('🎉 Configuration saved successfully!'));
      console.log(chalk.gray(`Config file: ~/.dwlf/config.json (chmod 600)`));
      console.log();
      console.log(chalk.dim('You can now use other DWLF commands. Try:'));
      console.log(chalk.dim('  dwlf price BTC-USD AAPL'));
      console.log(chalk.dim('  dwlf watchlist'));

    } catch (error) {
      console.error(chalk.red('Error during login:'), error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

program
  .command('price')
  .description('Get current prices for one or more symbols')
  .argument('[symbols...]', 'symbols to check (e.g., BTC-USD, AAPL, TSLA)')
  .option('--format <type>', 'output format: table, compact, json, csv', 'table')
  .option('--no-change', 'hide daily change information')
  .action(async (symbols: string[], options) => {
    try {
      // Check authentication
      const apiKey = await getApiKey();
      if (!apiKey) {
        console.log(chalk.red('❌ No API key configured.'));
        console.log(chalk.gray('Run `dwlf login` to configure your credentials.'));
        return;
      }

      // If no symbols provided, prompt user
      if (!symbols || symbols.length === 0) {
        const { inputSymbols }: { inputSymbols: string } = await prompt({
          type: 'input',
          name: 'inputSymbols',
          message: 'Enter symbols to check (comma-separated):',
          validate: (input: string) => {
            if (!input.trim()) {
              return 'Please enter at least one symbol';
            }
            return true;
          }
        });
        symbols = inputSymbols.split(',').map(s => s.trim()).filter(s => s);
      }

      // Normalize symbols
      const normalizedSymbols = symbols.map(normalizeSymbol);
      
      console.log(chalk.gray(`Fetching prices for: ${normalizedSymbols.join(', ')}`));

      // Create API client and fetch data
      const spinner = ora('Fetching market data...').start();
      const apiUrl = await getApiUrl();
      const client = new DWLFApiClient({ apiKey, baseUrl: apiUrl });
      
      const fields = options.change ? ['price', 'change', 'changePercent', 'volume'] : ['price', 'volume'];
      const data = await client.getMarketData(normalizedSymbols, fields);
      
      spinner.stop();

      if (!data || !data.candles || data.candles.length === 0) {
        console.log(chalk.yellow('⚠️  No market data found for the specified symbols.'));
        return;
      }

      // Format output based on requested format
      switch (options.format) {
        case 'json':
          console.log(JSON.stringify(data, null, 2));
          break;
        case 'csv':
          displayPricesCSV(data.candles, options.change);
          break;
        case 'compact':
          displayPricesCompact(data.candles, options.change);
          break;
        default:
          displayPricesTable(data.candles, options.change);
      }

    } catch (error: any) {
      console.error(chalk.red('Error fetching prices:'), error.message || 'Unknown error');
      if (error.status === 401) {
        console.log(chalk.gray('Try running `dwlf login --validate` to check your API key.'));
      }
    }
  });

program
  .command('watchlist')
  .description('Manage your watchlist')
  .option('--add <symbols...>', 'add symbols to watchlist')
  .option('--remove <symbols...>', 'remove symbols from watchlist') 
  .option('--clear', 'clear entire watchlist')
  .option('--format <type>', 'output format: table, compact, json, csv', 'table')
  .option('--prices', 'show current prices for watchlist symbols')
  .action(async (options) => {
    try {
      // Check authentication
      const apiKey = await getApiKey();
      if (!apiKey) {
        console.log(chalk.red('❌ No API key configured.'));
        console.log(chalk.gray('Run `dwlf login` to configure your credentials.'));
        return;
      }

      const apiUrl = await getApiUrl();
      const client = new DWLFApiClient({ apiKey, baseUrl: apiUrl });

      // Handle clear operation
      if (options.clear) {
        const { confirm }: { confirm: boolean } = await prompt({
          type: 'confirm',
          name: 'confirm',
          message: 'Are you sure you want to clear your entire watchlist?',
          initial: false
        });

        if (!confirm) {
          console.log(chalk.yellow('Cancelled.'));
          return;
        }

        const spinner = ora('Clearing watchlist...').start();
        await client.clearWatchlist();
        spinner.stop();
        console.log(chalk.green('✅ Watchlist cleared.'));
        return;
      }

      // Handle add operation
      if (options.add && options.add.length > 0) {
        const normalizedSymbols = options.add.map(normalizeSymbol);
        const spinner = ora(`Adding symbols: ${normalizedSymbols.join(', ')}...`).start();
        
        try {
          await client.addToWatchlist(normalizedSymbols);
          spinner.stop();
          console.log(chalk.green(`✅ Added ${normalizedSymbols.length} symbol(s) to watchlist:`), normalizedSymbols.join(', '));
        } catch (error: any) {
          spinner.stop();
          console.error(chalk.red('Error adding symbols:'), error.message);
        }
      }

      // Handle remove operation
      if (options.remove && options.remove.length > 0) {
        const normalizedSymbols = options.remove.map(normalizeSymbol);
        const spinner = ora(`Removing symbols: ${normalizedSymbols.join(', ')}...`).start();
        
        try {
          await client.removeFromWatchlist(normalizedSymbols);
          spinner.stop();
          console.log(chalk.green(`✅ Removed ${normalizedSymbols.length} symbol(s) from watchlist:`), normalizedSymbols.join(', '));
        } catch (error: any) {
          spinner.stop();
          console.error(chalk.red('Error removing symbols:'), error.message);
        }
      }

      // Fetch and display watchlist
      const spinner = ora('Fetching watchlist...').start();
      const watchlistData = await client.getWatchlist();
      spinner.stop();

      if (!watchlistData || !watchlistData.symbols || watchlistData.symbols.length === 0) {
        console.log(chalk.yellow('📋 Your watchlist is empty.'));
        console.log(chalk.gray('Add symbols with: dwlf watchlist --add BTC-USD AAPL TSLA'));
        return;
      }

      const symbols = watchlistData.symbols;
      
      // If --prices flag is set, fetch current prices
      if (options.prices) {
        console.log(chalk.gray('Fetching prices for watchlist symbols...'));
        try {
          const priceSpinner = ora('Loading prices...').start();
          const priceData = await client.getMarketData(symbols, ['price', 'change', 'changePercent']);
          priceSpinner.stop();

          if (priceData && priceData.candles && priceData.candles.length > 0) {
            console.log(chalk.bold.cyan('📋 Watchlist with Prices:'));
            displayPricesTable(priceData.candles, true);
          } else {
            console.log(chalk.bold.cyan('📋 Watchlist:'));
            displayWatchlist(symbols, options.format);
          }
        } catch (error) {
          console.log(chalk.yellow('⚠️  Could not fetch prices. Showing symbols only.'));
          console.log(chalk.bold.cyan('📋 Watchlist:'));
          displayWatchlist(symbols, options.format);
        }
      } else {
        console.log(chalk.bold.cyan('📋 Watchlist:'));
        displayWatchlist(symbols, options.format);
      }

    } catch (error: any) {
      console.error(chalk.red('Error managing watchlist:'), error.message || 'Unknown error');
      if (error.status === 401) {
        console.log(chalk.gray('Try running `dwlf login --validate` to check your API key.'));
      }
    }
  });

program
  .command('trades')
  .description('View and manage trades')
  .action(() => {
    console.log(chalk.yellow('🔧 Command not yet implemented. Coming soon!'));
  });

program
  .command('signals')
  .description('View active trading signals')
  .action(() => {
    console.log(chalk.yellow('🔧 Command not yet implemented. Coming soon!'));
  });

program
  .command('portfolio')
  .description('Portfolio overview')
  .action(() => {
    console.log(chalk.yellow('🔧 Command not yet implemented. Coming soon!'));
  });

// Display helper functions
function displayPricesTable(candles: any[], showChange: boolean = true): void {
  const headings = ['Symbol', 'Price', ...(showChange ? ['Change', 'Change %'] : []), 'Volume'];
  const alignments = showChange 
    ? ['left', 'right', 'right', 'right', 'right'] 
    : ['left', 'right', 'right'];
  
  const table = new Table({
    head: headings,
    colAligns: alignments as any,
  });

  for (const candle of candles) {
    const symbol = candle.symbol || 'N/A';
    const price = candle.close ? `$${Number(candle.close).toFixed(2)}` : 'N/A';
    const volume = candle.volume ? Number(candle.volume).toLocaleString() : 'N/A';
    
    let change = 'N/A';
    let changePercent = 'N/A';
    
    if (showChange && candle.change !== undefined) {
      const changeValue = Number(candle.change);
      const changePctValue = Number(candle.changePercent || 0);
      
      change = changeValue >= 0 
        ? chalk.green(`+$${changeValue.toFixed(2)}`)
        : chalk.red(`-$${Math.abs(changeValue).toFixed(2)}`);
      
      changePercent = changePctValue >= 0
        ? chalk.green(`+${changePctValue.toFixed(2)}%`)
        : chalk.red(`${changePctValue.toFixed(2)}%`);
    }

    const row = [symbol, price, ...(showChange ? [change, changePercent] : []), volume];
    table.push(row);
  }

  console.log(table.toString());
}

function displayPricesCompact(candles: any[], showChange: boolean = true): void {
  for (const candle of candles) {
    const symbol = candle.symbol || 'N/A';
    const price = candle.close ? `$${Number(candle.close).toFixed(2)}` : 'N/A';
    
    let changeInfo = '';
    if (showChange && candle.change !== undefined) {
      const changeValue = Number(candle.change);
      const changePctValue = Number(candle.changePercent || 0);
      
      const changeColor = changeValue >= 0 ? 'green' : 'red';
      const changeSign = changeValue >= 0 ? '+' : '';
      
      changeInfo = ` (${chalk[changeColor](`${changeSign}$${changeValue.toFixed(2)} ${changeSign}${changePctValue.toFixed(2)}%`)})`;
    }
    
    console.log(`${chalk.cyan(symbol)}: ${chalk.bold(price)}${changeInfo}`);
  }
}

function displayPricesCSV(candles: any[], showChange: boolean = true): void {
  const headers = ['Symbol', 'Price', ...(showChange ? ['Change', 'ChangePercent'] : []), 'Volume'];
  console.log(headers.join(','));
  
  for (const candle of candles) {
    const row = [
      candle.symbol || '',
      candle.close || '',
      ...(showChange ? [candle.change || '', candle.changePercent || ''] : []),
      candle.volume || ''
    ];
    console.log(row.join(','));
  }
}

function displayWatchlist(symbols: string[], format: string = 'table'): void {
  switch (format) {
    case 'json':
      console.log(JSON.stringify({ symbols }, null, 2));
      break;
    case 'csv':
      console.log('Symbol');
      symbols.forEach(symbol => console.log(symbol));
      break;
    case 'compact':
      symbols.forEach((symbol, index) => {
        console.log(`${index + 1}. ${chalk.cyan(symbol)}`);
      });
      break;
    default:
      if (symbols.length <= 10) {
        // Simple list for small watchlists
        symbols.forEach((symbol, index) => {
          console.log(`  ${chalk.gray(`${index + 1}.`)} ${chalk.cyan(symbol)}`);
        });
      } else {
        // Table format for larger watchlists
        const table = new Table({
          head: ['#', 'Symbol'],
          colAligns: ['right', 'left'] as const,
        });
        
        symbols.forEach((symbol, index) => {
          table.push([index + 1, symbol]);
        });
        
        console.log(table.toString());
      }
  }
  
  console.log(chalk.gray(`\nTotal: ${symbols.length} symbol(s)`));
}

// Add the backtest command
program.addCommand(createBacktestCommand());

// Help command customization
program
  .configureHelp({
    sortSubcommands: true,
  });

// Handle unknown commands
program.on('command:*', () => {
  console.log(chalk.red('Unknown command. Use --help for available commands.'));
  process.exit(1);
});

// Parse and execute
try {
  program.parse(process.argv);
} catch (error) {
  console.error(chalk.red('Error:'), error instanceof Error ? error.message : 'Unknown error');
  process.exit(1);
}