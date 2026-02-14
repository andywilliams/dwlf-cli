import { Command } from 'commander';
import chalk from 'chalk';
import Table from 'cli-table3';
import ora from 'ora';
import { DWLFApiClient, normalizeSymbol } from './api-client';
import { getApiKey, getApiUrl, isAuthenticated } from './config';

export interface Strategy {
  strategyId: string;
  name: string;
  description?: string;
  author?: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  totalSignals?: number;
  activeSignals?: number;
  performance?: StrategyPerformance;
}

export interface StrategyPerformance {
  totalSignals: number;
  activeSignals: number;
  winRate: number;
  totalPnL: number;
  avgReturn: number;
  maxDrawdown: number;
  sharpeRatio?: number;
  profitFactor?: number;
}

export interface StrategyDetails extends Strategy {
  signals?: StrategySignal[];
  activatedSymbols?: string[];
  configuration?: StrategyConfiguration;
}

export interface StrategySignal {
  signalId: string;
  symbol: string;
  signalType: 'LONG' | 'SHORT';
  entryPrice: number;
  currentPrice?: number;
  pnlPct?: number;
  status: 'ACTIVE' | 'CLOSED';
  generatedAt: string;
  closedAt?: string;
}

export interface StrategyConfiguration {
  [key: string]: any;
}

export interface StrategiesResponse {
  strategies: Strategy[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  };
}

export interface StrategyActivation {
  strategyId: string;
  symbol: string;
  isActive: boolean;
  activatedAt?: string;
  deactivatedAt?: string;
}

/**
 * Format strategy performance data for display
 */
function formatPerformance(performance?: StrategyPerformance): string[] {
  if (!performance) {
    return ['N/A', 'N/A', 'N/A', 'N/A'];
  }

  const winRate = `${(performance.winRate * 100).toFixed(1)}%`;
  const totalPnL = performance.totalPnL >= 0 
    ? chalk.green(`+${performance.totalPnL.toFixed(2)}%`)
    : chalk.red(`${performance.totalPnL.toFixed(2)}%`);
  const signals = `${performance.activeSignals}/${performance.totalSignals}`;
  const sharpe = performance.sharpeRatio ? performance.sharpeRatio.toFixed(2) : 'N/A';

  return [winRate, totalPnL, signals, sharpe];
}

/**
 * Display strategies in a formatted table
 */
function displayStrategiesTable(strategies: Strategy[]): void {
  if (strategies.length === 0) {
    console.log(chalk.gray('No strategies found.'));
    return;
  }

  const table = new Table({
    head: ['ID', 'Name', 'Author', 'Public', 'Win Rate', 'Total P&L', 'Signals', 'Sharpe'],
    colWidths: [12, 25, 15, 8, 10, 12, 10, 8],
    style: {
      head: ['cyan'],
      border: ['gray']
    }
  });

  for (const strategy of strategies) {
    const [winRate, totalPnL, signals, sharpe] = formatPerformance(strategy.performance);
    const isPublic = strategy.isPublic ? chalk.green('Yes') : chalk.gray('No');
    const author = strategy.author || chalk.gray('Unknown');

    table.push([
      strategy.strategyId.substring(0, 10) + '...',
      strategy.name,
      author,
      isPublic,
      winRate,
      totalPnL,
      signals,
      sharpe
    ]);
  }

  console.log(table.toString());
}

/**
 * Display detailed strategy information
 */
function displayStrategyDetails(strategy: StrategyDetails): void {
  console.log(chalk.bold.cyan(`📊 Strategy: ${strategy.name}`));
  console.log();
  
  console.log(chalk.bold('Basic Information:'));
  console.log(`  ID: ${chalk.gray(strategy.strategyId)}`);
  console.log(`  Description: ${strategy.description || chalk.gray('None')}`);
  console.log(`  Author: ${strategy.author || chalk.gray('Unknown')}`);
  console.log(`  Public: ${strategy.isPublic ? chalk.green('Yes') : chalk.red('No')}`);
  console.log(`  Created: ${chalk.gray(new Date(strategy.createdAt).toLocaleString())}`);
  console.log();

  if (strategy.performance) {
    console.log(chalk.bold('Performance Metrics:'));
    const perf = strategy.performance;
    
    console.log(`  Total Signals: ${chalk.cyan(perf.totalSignals)}`);
    console.log(`  Active Signals: ${chalk.cyan(perf.activeSignals)}`);
    console.log(`  Win Rate: ${chalk.cyan((perf.winRate * 100).toFixed(1))}%`);
    
    const pnlColor = perf.totalPnL >= 0 ? chalk.green : chalk.red;
    console.log(`  Total P&L: ${pnlColor(perf.totalPnL.toFixed(2))}%`);
    console.log(`  Avg Return: ${pnlColor(perf.avgReturn.toFixed(2))}%`);
    console.log(`  Max Drawdown: ${chalk.red(perf.maxDrawdown.toFixed(2))}%`);
    
    if (perf.sharpeRatio) {
      console.log(`  Sharpe Ratio: ${chalk.cyan(perf.sharpeRatio.toFixed(2))}`);
    }
    if (perf.profitFactor) {
      console.log(`  Profit Factor: ${chalk.cyan(perf.profitFactor.toFixed(2))}`);
    }
    console.log();
  }

  if (strategy.activatedSymbols && strategy.activatedSymbols.length > 0) {
    console.log(chalk.bold('Activated Symbols:'));
    console.log(`  ${strategy.activatedSymbols.map(s => chalk.cyan(s)).join(', ')}`);
    console.log();
  }

  if (strategy.signals && strategy.signals.length > 0) {
    console.log(chalk.bold('Recent Signals:'));
    const signalsTable = new Table({
      head: ['Symbol', 'Type', 'Entry Price', 'P&L', 'Status', 'Generated'],
      style: {
        head: ['cyan'],
        border: ['gray']
      }
    });

    for (const signal of strategy.signals.slice(0, 10)) { // Show last 10 signals
      const pnl = signal.pnlPct 
        ? signal.pnlPct >= 0 
          ? chalk.green(`+${signal.pnlPct.toFixed(2)}%`)
          : chalk.red(`${signal.pnlPct.toFixed(2)}%`)
        : chalk.gray('N/A');
      
      const status = signal.status === 'ACTIVE' 
        ? chalk.green('ACTIVE') 
        : chalk.gray('CLOSED');
      
      const type = signal.signalType === 'LONG' 
        ? chalk.green('LONG') 
        : chalk.red('SHORT');

      signalsTable.push([
        chalk.cyan(signal.symbol),
        type,
        `$${signal.entryPrice.toFixed(2)}`,
        pnl,
        status,
        new Date(signal.generatedAt).toLocaleDateString()
      ]);
    }

    console.log(signalsTable.toString());
  }
}

/**
 * Display strategy activation status for symbols
 */
function displayActivationTable(activations: StrategyActivation[]): void {
  if (activations.length === 0) {
    console.log(chalk.gray('No symbol activations found.'));
    return;
  }

  const table = new Table({
    head: ['Symbol', 'Status', 'Activated At', 'Deactivated At'],
    style: {
      head: ['cyan'],
      border: ['gray']
    }
  });

  for (const activation of activations) {
    const status = activation.isActive 
      ? chalk.green('ACTIVE') 
      : chalk.red('INACTIVE');
    
    const activatedAt = activation.activatedAt 
      ? new Date(activation.activatedAt).toLocaleDateString()
      : chalk.gray('N/A');
    
    const deactivatedAt = activation.deactivatedAt 
      ? new Date(activation.deactivatedAt).toLocaleDateString()
      : chalk.gray('N/A');

    table.push([
      chalk.cyan(activation.symbol),
      status,
      activatedAt,
      deactivatedAt
    ]);
  }

  console.log(table.toString());
}

/**
 * Create the strategies command with all subcommands
 */
export function createStrategiesCommand(): Command {
  const strategiesCmd = new Command('strategies')
    .alias('strat')
    .description('Manage trading strategies');

  // List strategies
  strategiesCmd
    .command('list')
    .alias('ls')
    .description('List available strategies')
    .option('--public-only', 'Show only public strategies')
    .option('--mine-only', 'Show only your strategies')
    .option('--limit <number>', 'Maximum number of strategies to show', '20')
    .action(async (options) => {
      try {
        if (!(await isAuthenticated())) {
          console.log(chalk.red('❌ Not authenticated. Run `dwlf login` first.'));
          return;
        }

        const spinner = ora('Fetching strategies...').start();
        const apiKey = await getApiKey();
        const apiUrl = await getApiUrl();
        const client = new DWLFApiClient({ apiKey: apiKey!, baseUrl: apiUrl });

        const params: any = {
          limit: parseInt(options.limit)
        };

        if (options.publicOnly) {
          params.public = true;
        } else if (options.mineOnly) {
          params.mine = true;
        }

        const response = await client.get<StrategiesResponse>('/strategies', params);
        spinner.stop();

        console.log(chalk.bold.cyan('📊 Available Strategies\n'));
        displayStrategiesTable(response.strategies);

        if (response.pagination) {
          console.log();
          console.log(chalk.gray(`Showing ${response.strategies.length} of ${response.pagination.total} strategies`));
        }

      } catch (error: any) {
        console.error(chalk.red('❌ Failed to fetch strategies:'), error.message);
      }
    });

  // Show strategy details
  strategiesCmd
    .command('show')
    .alias('info')
    .description('Show detailed information about a strategy')
    .argument('<strategyId>', 'Strategy ID to show')
    .option('--signals <number>', 'Number of recent signals to show', '10')
    .action(async (strategyId: string, options) => {
      try {
        if (!(await isAuthenticated())) {
          console.log(chalk.red('❌ Not authenticated. Run `dwlf login` first.'));
          return;
        }

        const spinner = ora('Fetching strategy details...').start();
        const apiKey = await getApiKey();
        const apiUrl = await getApiUrl();
        const client = new DWLFApiClient({ apiKey: apiKey!, baseUrl: apiUrl });

        const strategy = await client.get<StrategyDetails>(`/strategies/${strategyId}`, {
          includeSignals: true,
          signalsLimit: parseInt(options.signals)
        });
        
        spinner.stop();
        console.log();
        displayStrategyDetails(strategy);

      } catch (error: any) {
        console.error(chalk.red('❌ Failed to fetch strategy details:'), error.message);
      }
    });

  // Show strategy signals
  strategiesCmd
    .command('signals')
    .description('Show signals generated by a strategy')
    .argument('<strategyId>', 'Strategy ID')
    .option('--symbol <symbol>', 'Filter by symbol')
    .option('--status <status>', 'Filter by status (ACTIVE/CLOSED)')
    .option('--limit <number>', 'Maximum number of signals to show', '20')
    .action(async (strategyId: string, options) => {
      try {
        if (!(await isAuthenticated())) {
          console.log(chalk.red('❌ Not authenticated. Run `dwlf login` first.'));
          return;
        }

        const spinner = ora('Fetching strategy signals...').start();
        const apiKey = await getApiKey();
        const apiUrl = await getApiUrl();
        const client = new DWLFApiClient({ apiKey: apiKey!, baseUrl: apiUrl });

        const params: any = {
          strategy: strategyId,
          limit: parseInt(options.limit)
        };

        if (options.symbol) {
          params.symbol = normalizeSymbol(options.symbol);
        }

        if (options.status) {
          params.status = options.status.toUpperCase();
        }

        const response = await client.get<{ signals: StrategySignal[] }>('/signals', params);
        spinner.stop();

        if (response.signals.length === 0) {
          console.log(chalk.gray('No signals found for this strategy.'));
          return;
        }

        console.log(chalk.bold.cyan(`📈 Signals for Strategy ${strategyId.substring(0, 10)}...\n`));
        
        const table = new Table({
          head: ['Symbol', 'Type', 'Entry Price', 'Current', 'P&L', 'Status', 'Generated'],
          style: {
            head: ['cyan'],
            border: ['gray']
          }
        });

        for (const signal of response.signals) {
          const pnl = signal.pnlPct 
            ? signal.pnlPct >= 0 
              ? chalk.green(`+${signal.pnlPct.toFixed(2)}%`)
              : chalk.red(`${signal.pnlPct.toFixed(2)}%`)
            : chalk.gray('N/A');
          
          const status = signal.status === 'ACTIVE' 
            ? chalk.green('ACTIVE') 
            : chalk.gray('CLOSED');
          
          const type = signal.signalType === 'LONG' 
            ? chalk.green('LONG') 
            : chalk.red('SHORT');

          const current = signal.currentPrice 
            ? `$${signal.currentPrice.toFixed(2)}`
            : chalk.gray('N/A');

          table.push([
            chalk.cyan(signal.symbol),
            type,
            `$${signal.entryPrice.toFixed(2)}`,
            current,
            pnl,
            status,
            new Date(signal.generatedAt).toLocaleDateString()
          ]);
        }

        console.log(table.toString());

      } catch (error: any) {
        console.error(chalk.red('❌ Failed to fetch strategy signals:'), error.message);
      }
    });

  // Activate strategy for symbols
  strategiesCmd
    .command('activate')
    .description('Activate a strategy for specific symbols')
    .argument('<strategyId>', 'Strategy ID to activate')
    .argument('<symbols...>', 'Symbols to activate for')
    .action(async (strategyId: string, symbols: string[]) => {
      try {
        if (!(await isAuthenticated())) {
          console.log(chalk.red('❌ Not authenticated. Run `dwlf login` first.'));
          return;
        }

        const normalizedSymbols = symbols.map(normalizeSymbol);
        const spinner = ora(`Activating strategy for ${normalizedSymbols.join(', ')}...`).start();
        
        const apiKey = await getApiKey();
        const apiUrl = await getApiUrl();
        const client = new DWLFApiClient({ apiKey: apiKey!, baseUrl: apiUrl });

        // Activate for each symbol
        const results = await Promise.allSettled(
          normalizedSymbols.map(symbol =>
            client.post(`/strategies/${strategyId}/activate`, { symbol })
          )
        );

        spinner.stop();

        console.log(chalk.bold.cyan(`📊 Strategy Activation Results\n`));
        
        for (let i = 0; i < normalizedSymbols.length; i++) {
          const symbol = normalizedSymbols[i];
          const result = results[i];
          
          if (result?.status === 'fulfilled') {
            console.log(chalk.green(`✅ ${symbol}: Activated successfully`));
          } else if (result?.status === 'rejected') {
            console.log(chalk.red(`❌ ${symbol}: Failed - ${result.reason.message}`));
          }
        }

      } catch (error: any) {
        console.error(chalk.red('❌ Failed to activate strategy:'), error.message);
      }
    });

  // Deactivate strategy for symbols
  strategiesCmd
    .command('deactivate')
    .description('Deactivate a strategy for specific symbols')
    .argument('<strategyId>', 'Strategy ID to deactivate')
    .argument('<symbols...>', 'Symbols to deactivate for')
    .action(async (strategyId: string, symbols: string[]) => {
      try {
        if (!(await isAuthenticated())) {
          console.log(chalk.red('❌ Not authenticated. Run `dwlf login` first.'));
          return;
        }

        const normalizedSymbols = symbols.map(normalizeSymbol);
        const spinner = ora(`Deactivating strategy for ${normalizedSymbols.join(', ')}...`).start();
        
        const apiKey = await getApiKey();
        const apiUrl = await getApiUrl();
        const client = new DWLFApiClient({ apiKey: apiKey!, baseUrl: apiUrl });

        // Deactivate for each symbol
        const results = await Promise.allSettled(
          normalizedSymbols.map(symbol =>
            client.post(`/strategies/${strategyId}/deactivate`, { symbol })
          )
        );

        spinner.stop();

        console.log(chalk.bold.cyan(`📊 Strategy Deactivation Results\n`));
        
        for (let i = 0; i < normalizedSymbols.length; i++) {
          const symbol = normalizedSymbols[i];
          const result = results[i];
          
          if (result?.status === 'fulfilled') {
            console.log(chalk.green(`✅ ${symbol}: Deactivated successfully`));
          } else if (result?.status === 'rejected') {
            console.log(chalk.red(`❌ ${symbol}: Failed - ${result.reason.message}`));
          }
        }

      } catch (error: any) {
        console.error(chalk.red('❌ Failed to deactivate strategy:'), error.message);
      }
    });

  // Show activation status
  strategiesCmd
    .command('status')
    .description('Show strategy activation status for symbols')
    .argument('<strategyId>', 'Strategy ID to check')
    .option('--symbol <symbol>', 'Check specific symbol only')
    .action(async (strategyId: string, options) => {
      try {
        if (!(await isAuthenticated())) {
          console.log(chalk.red('❌ Not authenticated. Run `dwlf login` first.'));
          return;
        }

        const spinner = ora('Fetching activation status...').start();
        const apiKey = await getApiKey();
        const apiUrl = await getApiUrl();
        const client = new DWLFApiClient({ apiKey: apiKey!, baseUrl: apiUrl });

        const params: any = {};
        if (options.symbol) {
          params.symbol = normalizeSymbol(options.symbol);
        }

        const response = await client.get<{ activations: StrategyActivation[] }>(
          `/strategies/${strategyId}/activations`,
          params
        );
        
        spinner.stop();

        console.log(chalk.bold.cyan(`📊 Activation Status for Strategy ${strategyId.substring(0, 10)}...\n`));
        displayActivationTable(response.activations);

      } catch (error: any) {
        console.error(chalk.red('❌ Failed to fetch activation status:'), error.message);
      }
    });

  return strategiesCmd;
}