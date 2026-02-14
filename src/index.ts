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

program
  .command('trades')
  .description('View and manage trades')
  .option('--format <type>', 'output format: table, compact, json, csv', 'table')
  .option('--status <status>', 'filter by status: open, closed, all', 'all')
  .action(async (options) => {
    try {
      console.log(chalk.bold.cyan('📊 Trades'));
      console.log(chalk.gray('Demonstrating formatting system with sample data...'));
      console.log();

      // Sample trade data to demonstrate formatting
      const sampleTrades: TradeData[] = [
        {
          id: 'trade-001-abc',
          symbol: 'BTC-USD',
          side: 'buy',
          quantity: 0.5,
          entryPrice: 45000,
          exitPrice: 47500,
          pnl: 1250,
          pnlPercent: 5.56,
          status: 'closed',
          openedAt: '2024-01-15T10:30:00Z',
          closedAt: '2024-01-16T14:20:00Z'
        },
        {
          id: 'trade-002-def',
          symbol: 'AAPL',
          side: 'buy',
          quantity: 100,
          entryPrice: 185.50,
          exitPrice: 182.30,
          pnl: -320,
          pnlPercent: -1.73,
          status: 'closed',
          openedAt: '2024-01-14T09:15:00Z',
          closedAt: '2024-01-15T16:45:00Z'
        },
        {
          id: 'trade-003-ghi',
          symbol: 'TSLA',
          side: 'sell',
          quantity: 50,
          entryPrice: 245.80,
          pnl: 150,
          pnlPercent: 1.22,
          status: 'open',
          openedAt: '2024-01-16T11:20:00Z'
        }
      ];

      // Filter by status if specified
      let filteredTrades = sampleTrades;
      if (options.status && options.status !== 'all') {
        filteredTrades = sampleTrades.filter(trade => trade.status === options.status);
      }

      if (filteredTrades.length === 0) {
        console.log(chalk.yellow(`No ${options.status} trades found.`));
        return;
      }

      const formatted = formatData(filteredTrades, 'trades', { 
        format: options.format as OutputFormat,
        colors: true 
      });
      console.log(formatted);

      console.log(chalk.gray(`\nShowing ${filteredTrades.length} of ${sampleTrades.length} total trades`));

    } catch (error: any) {
      console.error(chalk.red('Error fetching trades:'), error.message || 'Unknown error');
    }
  });

program
  .command('signals')
  .description('View active trading signals')
  .option('--format <type>', 'output format: table, compact, json, csv', 'table')
  .option('--strategy <name>', 'filter by strategy name')
  .action(async (options) => {
    try {
      console.log(chalk.bold.cyan('🎯 Trading Signals'));
      console.log(chalk.gray('Demonstrating formatting system with sample data...'));
      console.log();

      // Sample signals data to demonstrate formatting
      const sampleSignals: SignalData[] = [
        {
          id: 'signal-001',
          symbol: 'BTC-USD',
          strategy: 'Trend Momentum',
          direction: 'long',
          entryPrice: 46500,
          stopLoss: 44000,
          takeProfit: 52000,
          strength: 8,
          status: 'active',
          createdAt: '2024-01-16T08:30:00Z'
        },
        {
          id: 'signal-002',
          symbol: 'AAPL',
          strategy: 'Mean Reversion',
          direction: 'short',
          entryPrice: 183.50,
          stopLoss: 190.00,
          takeProfit: 175.00,
          strength: 6,
          status: 'active',
          createdAt: '2024-01-16T09:15:00Z'
        },
        {
          id: 'signal-003',
          symbol: 'NVDA',
          strategy: 'Breakout',
          direction: 'long',
          entryPrice: 720.00,
          stopLoss: 680.00,
          takeProfit: 800.00,
          strength: 9,
          status: 'triggered',
          createdAt: '2024-01-15T14:20:00Z'
        }
      ];

      // Filter by strategy if specified
      let filteredSignals = sampleSignals;
      if (options.strategy) {
        filteredSignals = sampleSignals.filter(signal => 
          signal.strategy.toLowerCase().includes(options.strategy?.toLowerCase() || '')
        );
      }

      if (filteredSignals.length === 0) {
        console.log(chalk.yellow(`No signals found${options.strategy ? ` for strategy "${options.strategy}"` : ''}.`));
        return;
      }

      const formatted = formatData(filteredSignals, 'signals', { 
        format: options.format as OutputFormat,
        colors: true 
      });
      console.log(formatted);

      console.log(chalk.gray(`\nShowing ${filteredSignals.length} of ${sampleSignals.length} total signals`));

    } catch (error: any) {
      console.error(chalk.red('Error fetching signals:'), error.message || 'Unknown error');
    }
  });

program
  .command('portfolio')
  .description('Portfolio overview and performance metrics')
  .option('--format <type>', 'output format: table, compact, json, csv', 'table')
  .option('--period <period>', 'performance period: day, week, month, year', 'month')
  .action(async (options) => {
    try {
      console.log(chalk.bold.cyan('💼 Portfolio Overview'));
      console.log(chalk.gray('Demonstrating formatting system with sample data...'));
      console.log();

      // Sample performance data to demonstrate formatting
      const samplePerformance: PerformanceData[] = [
        { metric: 'Total Value', value: 125450.75, period: options.period },
        { metric: 'Total P&L', value: 8932.50, period: options.period },
        { metric: 'Return %', value: 7.66, period: options.period },
        { metric: 'Win Rate', value: 68.5, period: options.period },
        { metric: 'Avg Trade', value: 245.30, period: options.period },
        { metric: 'Max Drawdown', value: -3.2, period: options.period },
        { metric: 'Sharpe Ratio', value: 1.84, period: options.period },
        { metric: 'Total Trades', value: 42, period: options.period }
      ];

      const formatted = formatData(samplePerformance, 'performance', { 
        format: options.format as OutputFormat,
        colors: true 
      });
      console.log(formatted);

      // Add some visual indicators
      if (options.format === 'table') {
        console.log();
        console.log(chalk.bold.cyan('📈 Portfolio Health:'));
        console.log(formatHealthStatus('healthy', 'Portfolio is performing well', true));
        console.log(formatHealthStatus('warning', 'Consider rebalancing soon', true));
        console.log();

        // Sample progress bars
        console.log(chalk.bold.cyan('📊 Progress Indicators:'));
        console.log(`Year Progress: ${createProgressBar(new Date().getMonth() + 1, 12, 20, true)}`);
        console.log(`Goal Achievement: ${createProgressBar(8932.50, 12000, 20, true)}`);
        console.log();

        // Sample sparkline (price history)
        const samplePrices = [125000, 124500, 126000, 125800, 125450];
        console.log(chalk.bold.cyan('📉 Recent Portfolio Value Trend:'));
        console.log(`${formatSparkline(samplePrices, 30)} $${samplePrices[samplePrices.length - 1]?.toLocaleString() || 'N/A'}`);
      }

    } catch (error: any) {
      console.error(chalk.red('Error fetching portfolio:'), error.message || 'Unknown error');
    }
  });

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