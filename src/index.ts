#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { prompt } from 'enquirer';
import ora from 'ora';
import Table from 'cli-table3';
import { loadConfig, saveConfig, getApiKey, getApiUrl, maskApiKey, displayConfigStatus, isAuthenticated } from './config';
import { validateApiKey, displayValidationResult, DWLFApiClient, normalizeSymbol } from './api-client';
import { createBacktestCommand } from './backtest';
import { 
  formatData, 
  formatJSON,
  formatHealthStatus,
  createProgressBar,
  formatSparkline,
  OutputFormat,
  PriceData,
  TradeData,
  SignalData,
  PerformanceData
} from './formatters';
import { createSignalsCommand } from './signals';
import { createPortfolioCommand } from './portfolio';
import { createEventsCommand } from './events';
import { createChartCommand } from './chart';
import { createStrategiesCommand } from './strategies';
import { createIndicatorsCommand } from './indicators';

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

      // Transform API data to formatter format
      const priceData: PriceData[] = data.candles.map((candle: any) => ({
        symbol: candle.symbol || 'N/A',
        price: Number(candle.close) || 0,
        change: candle.change ? Number(candle.change) : undefined,
        changePercent: candle.changePercent ? Number(candle.changePercent) : undefined,
        volume: candle.volume ? Number(candle.volume) : undefined,
        high: candle.high ? Number(candle.high) : undefined,
        low: candle.low ? Number(candle.low) : undefined,
        open: candle.open ? Number(candle.open) : undefined
      }));

      // Format output using the new formatting system
      const formatted = formatData(priceData, 'prices', { 
        format: options.format as OutputFormat,
        colors: true 
      });
      console.log(formatted);

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
            
            // Transform API data to formatter format
            const watchlistPriceData: PriceData[] = priceData.candles.map((candle: any) => ({
              symbol: candle.symbol || 'N/A',
              price: Number(candle.close) || 0,
              change: candle.change ? Number(candle.change) : undefined,
              changePercent: candle.changePercent ? Number(candle.changePercent) : undefined,
              volume: candle.volume ? Number(candle.volume) : undefined,
              high: candle.high ? Number(candle.high) : undefined,
              low: candle.low ? Number(candle.low) : undefined,
              open: candle.open ? Number(candle.open) : undefined
            }));

            const formatted = formatData(watchlistPriceData, 'prices', { 
              format: options.format as OutputFormat,
              colors: true 
            });
            console.log(formatted);
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

// Trades command with subcommands for comprehensive trade management
const tradesCmd = program
  .command('trades')
  .description('Trade journal management');

// List trades
tradesCmd
  .command('list')
  .alias('ls')
  .description('List trades')
  .option('--format <type>', 'output format: table, compact, json, csv', 'table')
  .option('--status <status>', 'filter by status: open, closed, all', 'all')
  .option('--symbol <symbol>', 'filter by symbol (e.g., BTC-USD, AAPL)')
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

      // Prepare filters
      const filters: any = {};
      if (options.status && options.status !== 'all') {
        filters.status = options.status;
      }
      if (options.symbol) {
        filters.symbol = normalizeSymbol(options.symbol);
      }

      const spinner = ora('Fetching trades...').start();
      const tradesResponse = await client.getTrades(filters);
      spinner.stop();

      if (!tradesResponse || !tradesResponse.trades || tradesResponse.trades.length === 0) {
        const statusText = options.status === 'all' ? '' : options.status;
        const symbolText = options.symbol ? ` for ${options.symbol}` : '';
        console.log(chalk.yellow(`📋 No ${statusText} trades found${symbolText}.`));
        return;
      }

      const trades = tradesResponse.trades;
      
      // Transform API data to formatter format
      const tradeData: TradeData[] = trades.map((trade: any) => ({
        id: trade.tradeId || trade.id,
        symbol: trade.symbol,
        side: trade.side,
        quantity: Number(trade.quantity),
        entryPrice: Number(trade.entryPrice),
        exitPrice: trade.exitPrice ? Number(trade.exitPrice) : undefined,
        pnl: trade.pnlAbs ? Number(trade.pnlAbs) : undefined,
        pnlPercent: trade.pnlPct ? Number(trade.pnlPct) : undefined,
        status: trade.status,
        openedAt: trade.openedAt,
        closedAt: trade.closedAt,
        stopLoss: trade.stopLoss ? Number(trade.stopLoss) : undefined,
        takeProfit: trade.takeProfit ? Number(trade.takeProfit) : undefined,
        notes: trade.notes
      }));

      console.log(chalk.bold.cyan(`📊 Trades ${options.status !== 'all' ? `(${options.status})` : ''}`));
      
      const formatted = formatData(tradeData, 'trades', { 
        format: options.format as OutputFormat,
        colors: true 
      });
      console.log(formatted);

      // Summary statistics
      if (options.format === 'table') {
        const openTrades = tradeData.filter(t => t.status === 'open').length;
        const closedTrades = tradeData.filter(t => t.status === 'closed').length;
        const totalPnL = tradeData
          .filter(t => t.pnl !== undefined)
          .reduce((sum, t) => sum + (t.pnl || 0), 0);
        
        console.log(chalk.gray(`\nSummary: ${openTrades} open, ${closedTrades} closed, Total P&L: ${totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(2)}`));
      }

    } catch (error: any) {
      console.error(chalk.red('Error fetching trades:'), error.message || 'Unknown error');
      if (error.status === 401) {
        console.log(chalk.gray('Try running `dwlf login --validate` to check your API key.'));
      }
    }
  });

// Open new trade
tradesCmd
  .command('open')
  .description('Open a new trade')
  .requiredOption('--symbol <symbol>', 'trading symbol (e.g., BTC-USD, AAPL)')
  .requiredOption('--side <side>', 'trade direction: buy or sell')
  .requiredOption('--quantity <qty>', 'position size')
  .requiredOption('--entry <price>', 'entry price')
  .option('--stop <price>', 'stop loss price')
  .option('--target <price>', 'take profit price')
  .option('--notes <text>', 'trade notes')
  .option('--paper', 'paper trade (default: true for CLI)')
  .action(async (options) => {
    try {
      // Check authentication
      const apiKey = await getApiKey();
      if (!apiKey) {
        console.log(chalk.red('❌ No API key configured.'));
        console.log(chalk.gray('Run `dwlf login` to configure your credentials.'));
        return;
      }

      // Validate inputs
      const side = options.side.toLowerCase();
      if (!['buy', 'sell'].includes(side)) {
        console.log(chalk.red('Error: Side must be "buy" or "sell"'));
        return;
      }

      const quantity = parseFloat(options.quantity);
      const entryPrice = parseFloat(options.entry);
      const stopLoss = options.stop ? parseFloat(options.stop) : undefined;
      const takeProfit = options.target ? parseFloat(options.target) : undefined;

      if (isNaN(quantity) || quantity <= 0) {
        console.log(chalk.red('Error: Quantity must be a positive number'));
        return;
      }

      if (isNaN(entryPrice) || entryPrice <= 0) {
        console.log(chalk.red('Error: Entry price must be a positive number'));
        return;
      }

      const tradeData: any = {
        symbol: normalizeSymbol(options.symbol),
        side: side as 'buy' | 'sell',
        quantity,
        entryPrice,
        isPaperTrade: true // CLI defaults to paper trading
      };

      // Only include optional fields if they have values
      if (stopLoss !== undefined) tradeData.stopLoss = stopLoss;
      if (takeProfit !== undefined) tradeData.takeProfit = takeProfit;
      if (options.notes) tradeData.notes = options.notes;

      console.log(chalk.gray('Opening trade...'));
      console.log(chalk.gray(`${side.toUpperCase()} ${quantity} ${tradeData.symbol} @ $${entryPrice}`));
      
      const apiUrl = await getApiUrl();
      const client = new DWLFApiClient({ apiKey, baseUrl: apiUrl });
      
      const spinner = ora('Submitting trade...').start();
      const result = await client.openTrade(tradeData);
      spinner.stop();

      console.log(chalk.green('✅ Trade opened successfully!'));
      console.log(chalk.gray(`Trade ID: ${result.tradeId}`));
      if (stopLoss) console.log(chalk.gray(`Stop Loss: $${stopLoss}`));
      if (takeProfit) console.log(chalk.gray(`Take Profit: $${takeProfit}`));

    } catch (error: any) {
      console.error(chalk.red('Error opening trade:'), error.message || 'Unknown error');
      if (error.status === 401) {
        console.log(chalk.gray('Try running `dwlf login --validate` to check your API key.'));
      }
    }
  });

// Close trade
tradesCmd
  .command('close')
  .description('Close an open trade')
  .requiredOption('--id <tradeId>', 'trade ID to close')
  .requiredOption('--price <price>', 'exit price')
  .option('--notes <text>', 'closing notes')
  .action(async (options) => {
    try {
      // Check authentication
      const apiKey = await getApiKey();
      if (!apiKey) {
        console.log(chalk.red('❌ No API key configured.'));
        console.log(chalk.gray('Run `dwlf login` to configure your credentials.'));
        return;
      }

      const exitPrice = parseFloat(options.price);
      if (isNaN(exitPrice) || exitPrice <= 0) {
        console.log(chalk.red('Error: Exit price must be a positive number'));
        return;
      }

      const apiUrl = await getApiUrl();
      const client = new DWLFApiClient({ apiKey, baseUrl: apiUrl });

      const closeData: any = {
        exitPrice,
        exitAt: new Date().toISOString()
      };

      // Only include notes if provided
      if (options.notes) closeData.notes = options.notes;

      const spinner = ora('Closing trade...').start();
      const result = await client.closeTrade(options.id, closeData);
      spinner.stop();

      console.log(chalk.green('✅ Trade closed successfully!'));
      console.log(chalk.gray(`Exit Price: $${exitPrice}`));
      if (result.pnlAbs !== undefined) {
        const pnlColor = result.pnlAbs >= 0 ? chalk.green : chalk.red;
        console.log(pnlColor(`P&L: ${result.pnlAbs >= 0 ? '+' : ''}$${result.pnlAbs.toFixed(2)} (${result.pnlPct >= 0 ? '+' : ''}${result.pnlPct.toFixed(2)}%)`));
      }

    } catch (error: any) {
      console.error(chalk.red('Error closing trade:'), error.message || 'Unknown error');
      if (error.status === 401) {
        console.log(chalk.gray('Try running `dwlf login --validate` to check your API key.'));
      }
    }
  });

// Update trade (stop loss, take profit, notes)
tradesCmd
  .command('update')
  .description('Update trade parameters')
  .requiredOption('--id <tradeId>', 'trade ID to update')
  .option('--stop <price>', 'new stop loss price')
  .option('--target <price>', 'new take profit price')
  .option('--notes <text>', 'update notes')
  .action(async (options) => {
    try {
      // Check authentication
      const apiKey = await getApiKey();
      if (!apiKey) {
        console.log(chalk.red('❌ No API key configured.'));
        console.log(chalk.gray('Run `dwlf login` to configure your credentials.'));
        return;
      }

      // Validate at least one update is provided
      if (!options.stop && !options.target && !options.notes) {
        console.log(chalk.red('Error: Specify at least one parameter to update (--stop, --target, or --notes)'));
        return;
      }

      const updates: any = {};
      
      if (options.stop) {
        const stopLoss = parseFloat(options.stop);
        if (isNaN(stopLoss) || stopLoss <= 0) {
          console.log(chalk.red('Error: Stop loss must be a positive number'));
          return;
        }
        updates.stopLoss = stopLoss;
      }

      if (options.target) {
        const takeProfit = parseFloat(options.target);
        if (isNaN(takeProfit) || takeProfit <= 0) {
          console.log(chalk.red('Error: Take profit must be a positive number'));
          return;
        }
        updates.takeProfit = takeProfit;
      }

      if (options.notes) {
        updates.notes = options.notes;
      }

      const apiUrl = await getApiUrl();
      const client = new DWLFApiClient({ apiKey, baseUrl: apiUrl });

      const spinner = ora('Updating trade...').start();
      await client.updateTrade(options.id, updates);
      spinner.stop();

      console.log(chalk.green('✅ Trade updated successfully!'));
      if (updates.stopLoss) console.log(chalk.gray(`New Stop Loss: $${updates.stopLoss}`));
      if (updates.takeProfit) console.log(chalk.gray(`New Take Profit: $${updates.takeProfit}`));
      if (updates.notes) console.log(chalk.gray(`Updated Notes: ${updates.notes}`));

    } catch (error: any) {
      console.error(chalk.red('Error updating trade:'), error.message || 'Unknown error');
      if (error.status === 401) {
        console.log(chalk.gray('Try running `dwlf login --validate` to check your API key.'));
      }
    }
  });

// Show trade details
tradesCmd
  .command('show')
  .description('Show detailed information for a specific trade')
  .requiredOption('--id <tradeId>', 'trade ID to display')
  .option('--format <type>', 'output format: table, json', 'table')
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

      const spinner = ora('Fetching trade details...').start();
      const trade = await client.getTrade(options.id);
      spinner.stop();

      if (options.format === 'json') {
        console.log(formatJSON(trade, true));
        return;
      }

      // Display trade details in table format
      console.log(chalk.bold.cyan(`📊 Trade Details: ${trade.tradeId}`));
      
      const details = new Table({
        colAligns: ['left', 'left'],
        style: { head: [], border: ['grey'] }
      });

      details.push(
        ['Symbol', chalk.bold(trade.symbol)],
        ['Side', chalk.bold(trade.side.toUpperCase())],
        ['Quantity', trade.quantity.toString()],
        ['Entry Price', `$${Number(trade.entryPrice).toFixed(2)}`],
        ['Status', trade.status === 'open' ? chalk.green('OPEN') : chalk.gray('CLOSED')]
      );

      if (trade.exitPrice) {
        details.push(['Exit Price', `$${Number(trade.exitPrice).toFixed(2)}`]);
      }

      if (trade.stopLoss) {
        details.push(['Stop Loss', `$${Number(trade.stopLoss).toFixed(2)}`]);
      }

      if (trade.takeProfit) {
        details.push(['Take Profit', `$${Number(trade.takeProfit).toFixed(2)}`]);
      }

      if (trade.pnlAbs !== undefined) {
        const pnlColor = trade.pnlAbs >= 0 ? chalk.green : chalk.red;
        details.push([
          'P&L', 
          pnlColor(`${trade.pnlAbs >= 0 ? '+' : ''}$${trade.pnlAbs.toFixed(2)} (${trade.pnlPct >= 0 ? '+' : ''}${trade.pnlPct.toFixed(2)}%)`)
        ]);
      }

      details.push(
        ['Opened', new Date(trade.openedAt).toLocaleString()]
      );

      if (trade.closedAt) {
        details.push(['Closed', new Date(trade.closedAt).toLocaleString()]);
      }

      if (trade.notes) {
        details.push(['Notes', trade.notes]);
      }

      console.log(details.toString());

    } catch (error: any) {
      console.error(chalk.red('Error fetching trade details:'), error.message || 'Unknown error');
      if (error.status === 401) {
        console.log(chalk.gray('Try running `dwlf login --validate` to check your API key.'));
      }
    }
  });

// Default trades command shows list
tradesCmd
  .description('View and manage trades (use `dwlf trades list` or see subcommands)')
  .action(async () => {
    console.log(chalk.bold.cyan('📊 DWLF Trade Management'));
    console.log();
    console.log('Available commands:');
    console.log(`  ${chalk.cyan('dwlf trades list')}         List all trades`);
    console.log(`  ${chalk.cyan('dwlf trades open')}         Open a new trade`);
    console.log(`  ${chalk.cyan('dwlf trades close')}        Close an existing trade`);
    console.log(`  ${chalk.cyan('dwlf trades update')}       Update trade parameters`);
    console.log(`  ${chalk.cyan('dwlf trades show')}         Show trade details`);
    console.log();
    console.log('Examples:');
    console.log(`  ${chalk.gray('dwlf trades list --status open')}`);
    console.log(`  ${chalk.gray('dwlf trades open --symbol BTC-USD --side buy --quantity 0.1 --entry 46000 --stop 44000 --target 50000')}`);
    console.log(`  ${chalk.gray('dwlf trades close --id TRADE123 --price 47500')}`);
    console.log(`  ${chalk.gray('dwlf trades update --id TRADE123 --stop 45000')}`);
    console.log();
    console.log(chalk.yellow('💡 Use `dwlf trades <command> --help` for detailed options'));
  });

// Add the signals command
program.addCommand(createSignalsCommand());

// Add the portfolio command
program.addCommand(createPortfolioCommand());

// Add the events command
program.addCommand(createEventsCommand());

// Add the chart command
program.addCommand(createChartCommand());

// Add the strategies command
program.addCommand(createStrategiesCommand());

// Add the indicators command
program.addCommand(createIndicatorsCommand());

// Add the backtest command
program.addCommand(createBacktestCommand());

program
  .command('demo')
  .description('Demonstrate all output formatting features')
  .option('--format <type>', 'output format: table, compact, json, csv', 'table')
  .action(async (options) => {
    console.log(chalk.bold.magenta('🎨 Output Formatting System Demo'));
    console.log(chalk.gray('Showcasing all available formatting features...'));
    console.log();

    // Price formatting demo
    console.log(chalk.bold.cyan('💰 Price Data Formatting:'));
    const demoPrice: PriceData[] = [
      { symbol: 'BTC-USD', price: 46234.56, change: 1234.50, changePercent: 2.75, volume: 12450000000, high: 47200, low: 45800, open: 46000 },
      { symbol: 'AAPL', price: 182.45, change: -3.25, changePercent: -1.75, volume: 85000000, high: 185.70, low: 181.20, open: 184.50 }
    ];
    console.log(formatData(demoPrice, 'prices', { format: options.format as OutputFormat, colors: true }));

    if (options.format === 'table') {
      console.log();
      
      // Health indicators demo
      console.log(chalk.bold.cyan('🏥 Status Indicators:'));
      console.log(formatHealthStatus('healthy', 'System operational', true));
      console.log(formatHealthStatus('warning', 'Rate limit approaching', true));
      console.log(formatHealthStatus('error', 'API connection failed', true));
      console.log();

      // Progress bars demo
      console.log(chalk.bold.cyan('📊 Progress Bars:'));
      console.log(`API Rate Limit:    ${createProgressBar(750, 1000, 25, true)}`);
      console.log(`Daily P&L Target:  ${createProgressBar(320, 500, 25, true)}`);
      console.log(`Monthly Goal:      ${createProgressBar(1200, 2000, 25, true)}`);
      console.log();

      // Sparklines demo
      console.log(chalk.bold.cyan('📈 ASCII Sparklines:'));
      const btcPrices = [45000, 46000, 45500, 47000, 46800, 46234];
      const aaplPrices = [185, 183, 184, 182, 181, 182.45];
      console.log(`BTC-USD:  ${formatSparkline(btcPrices, 30)} $${btcPrices[btcPrices.length - 1]?.toLocaleString() || 'N/A'}`);
      console.log(`AAPL:     ${formatSparkline(aaplPrices, 30)} $${aaplPrices[aaplPrices.length - 1]}`);
      console.log();

      // Trade formatting demo
      console.log(chalk.bold.cyan('📋 Trade Data Formatting:'));
      const demoTrades: TradeData[] = [
        { id: 'demo-001', symbol: 'BTC-USD', side: 'buy', quantity: 0.1, entryPrice: 45000, exitPrice: 46500, pnl: 150, pnlPercent: 3.33, status: 'closed', openedAt: '2024-01-15T10:00:00Z', closedAt: '2024-01-16T14:00:00Z' }
      ];
      console.log(formatData(demoTrades, 'trades', { format: 'compact', colors: true }));
      console.log();

      // Performance metrics demo
      console.log(chalk.bold.cyan('📊 Performance Metrics:'));
      const demoPerf: PerformanceData[] = [
        { metric: 'Win Rate', value: 68.5, period: 'Month' },
        { metric: 'Profit Factor', value: 1.45, period: 'Month' },
        { metric: 'Max Drawdown', value: -5.2, period: 'Month' }
      ];
      console.log(formatData(demoPerf, 'performance', { format: 'compact', colors: true }));
    }

    console.log(chalk.bold.green('\n✅ Formatting system demonstration complete!'));
    console.log(chalk.gray('Try different --format options: table, compact, json, csv'));
  });

// Display helper functions

function displayWatchlist(symbols: string[], format: string = 'table'): void {
  const data = { symbols, count: symbols.length };
  
  switch (format) {
    case 'json':
      console.log(formatJSON(data, true));
      break;
    case 'csv':
      console.log('Symbol');
      symbols.forEach(symbol => console.log(symbol));
      break;
    case 'compact':
      symbols.forEach((symbol, index) => {
        console.log(`${chalk.gray(`${index + 1}.`)} ${chalk.cyan.bold(symbol)}`);
      });
      break;
    default:
      if (symbols.length <= 10) {
        // Simple list for small watchlists with enhanced formatting
        console.log();
        symbols.forEach((symbol, index) => {
          const indicator = chalk.gray('•');
          const numbering = chalk.gray(`${(index + 1).toString().padStart(2)}.`);
          const symbolFormatted = chalk.cyan.bold(symbol);
          console.log(`  ${numbering} ${symbolFormatted}`);
        });
      } else {
        // Enhanced table format for larger watchlists
        const table = new Table({
          head: [chalk.bold.cyan('#'), chalk.bold.cyan('Symbol')],
          colAligns: ['right', 'left'],
          style: { 
            head: ['cyan'],
            border: ['grey'] 
          }
        });
        
        symbols.forEach((symbol, index) => {
          table.push([index + 1, chalk.bold(symbol)]);
        });
        
        console.log(table.toString());
      }
  }
  
  const totalText = `Total: ${symbols.length} symbol(s)`;
  console.log(chalk.gray(`\n${totalText}`));
}
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