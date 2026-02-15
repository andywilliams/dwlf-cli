import { Command } from 'commander';
import chalk from 'chalk';
import Table from 'cli-table3';
import ora from 'ora';
import { getApiKey, getApiUrl, isAuthenticated } from './config';

/**
 * Normalize symbol input to DWLF's expected format (e.g. BTC-USD).
 */
const KNOWN_STOCKS = new Set([
  'NVDA', 'TSLA', 'META', 'AAPL', 'AMZN', 'GOOG', 'GOOGL', 'MSFT', 'AMD',
  'SLV', 'GDXJ', 'SILJ', 'AGQ', 'GLD', 'GDX', 'GOLD',  // ETFs/metals
  'MARA', 'RIOT', 'BTBT', 'CIFR', 'IREN', 'CLSK',       // crypto miners
  'COIN', 'MSTR', 'HUT', 'HIVE', 'BITF', 'WULF',        // crypto-adjacent
  'LSPD', 'SOFI',                                          // fintech
]);

function normalizeSymbol(input: string): string {
  const s = input.trim().toUpperCase();

  // Already has separator: BTC/USD → BTC-USD, BTC-USD stays
  if (s.includes('/')) {
    return s.replace('/', '-');
  }
  if (s.includes('-')) {
    return s;
  }

  // Known stock ticker — pass through as-is
  if (KNOWN_STOCKS.has(s)) {
    return s;
  }

  // Detect concatenated pair: BTCUSD, ETHUSD, SOLUSD etc.
  const pairMatch = s.match(/^([A-Z]{2,5})(USD|USDT|EUR|GBP|BTC|ETH)$/);
  if (pairMatch) {
    return `${pairMatch[1]}-${pairMatch[2]}`;
  }

  // Bare crypto symbol: BTC → BTC-USD
  return `${s}-USD`;
}

/**
 * Simple API client wrapper
 */
class SimpleApiClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl: string) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  private async request<T = unknown>(method: string, endpoint: string, body?: unknown): Promise<T> {
    const url = `${this.baseUrl}/v2${endpoint}`;
    
    const options: RequestInit = {
      method,
      headers: {
        'Authorization': `ApiKey ${this.apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'dwlf-cli/0.1.0'
      }
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    
    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `HTTP ${response.status}`;
      
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error || errorMessage;
      } catch {
        errorMessage = response.statusText || errorMessage;
      }
      
      throw new Error(errorMessage);
    }

    return response.json() as Promise<T>;
  }

  async get<T = unknown>(endpoint: string, params?: Record<string, unknown>): Promise<T> {
    let url = endpoint;
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }
    return this.request<T>('GET', url);
  }

  async post<T = unknown>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>('POST', endpoint, body);
  }

  async delete<T = unknown>(endpoint: string): Promise<T> {
    return this.request<T>('DELETE', endpoint);
  }
}

export interface BacktestRequest {
  requestId: string;
  strategyId: string;
  symbols: string[];
  startDate: string;
  endDate: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  createdAt: string;
  completedAt?: string;
  error?: string;
}

export interface BacktestResult {
  requestId: string;
  strategyId: string;
  symbols: string[];
  startDate: string;
  endDate: string;
  status: 'completed';
  metrics: BacktestMetrics;
  trades: BacktestTrade[];
  equityCurve: EquityPoint[];
}

export interface BacktestMetrics {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalReturn: number;
  sharpeRatio: number;
  maxDrawdown: number;
  profitFactor: number;
  avgWin: number;
  avgLoss: number;
  bestTrade: number;
  worstTrade: number;
  expectancy: number;
}

export interface BacktestTrade {
  tradeId: string;
  symbol: string;
  side: 'LONG' | 'SHORT';
  entryDate: string;
  entryPrice: number;
  exitDate: string;
  exitPrice: number;
  quantity: number;
  pnl: number;
  pnlPercent: number;
  duration: number; // hours
  exitReason: string;
}

export interface EquityPoint {
  date: string;
  equity: number;
  drawdown: number;
}

export interface BacktestSummary {
  totalBacktests: number;
  completedBacktests: number;
  runningBacktests: number;
  failedBacktests: number;
  recentBacktests: BacktestRequest[];
}

// Removed unused formatMetrics function

/**
 * Display backtest requests in a table
 */
function displayBacktestTable(backtests: BacktestRequest[]): void {
  if (backtests.length === 0) {
    console.log(chalk.gray('No backtests found.'));
    return;
  }

  const table = new Table({
    head: ['Request ID', 'Strategy', 'Symbols', 'Period', 'Status', 'Created'],
    colWidths: [15, 15, 20, 25, 12, 12],
    style: {
      head: ['cyan'],
      border: ['gray']
    }
  });

  for (const backtest of backtests) {
    const status = backtest.status === 'completed' 
      ? chalk.green('COMPLETED')
      : backtest.status === 'failed'
      ? chalk.red('FAILED')
      : backtest.status === 'running'
      ? chalk.yellow('RUNNING')
      : chalk.gray('PENDING');

    const symbols = backtest.symbols.length > 2 
      ? `${backtest.symbols.slice(0, 2).join(', ')}...`
      : backtest.symbols.join(', ');

    const period = `${backtest.startDate} to ${backtest.endDate}`;

    table.push([
      backtest.requestId.substring(0, 12) + '...',
      backtest.strategyId.substring(0, 12) + '...',
      chalk.cyan(symbols),
      chalk.gray(period),
      status,
      new Date(backtest.createdAt).toLocaleDateString()
    ]);
  }

  console.log(table.toString());
}

/**
 * Display detailed backtest results
 */
function displayBacktestResults(result: BacktestResult, showTrades: boolean = false): void {
  console.log(chalk.bold.cyan(`📊 Backtest Results: ${result.requestId.substring(0, 12)}...`));
  console.log();
  
  console.log(chalk.bold('Configuration:'));
  console.log(`  Strategy: ${chalk.gray(result.strategyId)}`);
  console.log(`  Symbols: ${chalk.cyan(result.symbols.join(', '))}`);
  console.log(`  Period: ${chalk.gray(result.startDate)} to ${chalk.gray(result.endDate)}`);
  console.log();

  const metrics = result.metrics;
  console.log(chalk.bold('Performance Metrics:'));
  console.log(`  Total Trades: ${chalk.cyan(metrics.totalTrades)}`);
  console.log(`  Winning Trades: ${chalk.green(metrics.winningTrades)}`);
  console.log(`  Losing Trades: ${chalk.red(metrics.losingTrades)}`);
  console.log(`  Win Rate: ${chalk.cyan((metrics.winRate * 100).toFixed(1))}%`);
  
  const returnColor = metrics.totalReturn >= 0 ? chalk.green : chalk.red;
  console.log(`  Total Return: ${returnColor(metrics.totalReturn.toFixed(2))}%`);
  console.log(`  Sharpe Ratio: ${chalk.cyan(metrics.sharpeRatio.toFixed(2))}`);
  console.log(`  Max Drawdown: ${chalk.red(metrics.maxDrawdown.toFixed(2))}%`);
  console.log(`  Profit Factor: ${chalk.cyan(metrics.profitFactor.toFixed(2))}`);
  console.log(`  Average Win: ${chalk.green(metrics.avgWin.toFixed(2))}%`);
  console.log(`  Average Loss: ${chalk.red(metrics.avgLoss.toFixed(2))}%`);
  console.log(`  Best Trade: ${chalk.green(metrics.bestTrade.toFixed(2))}%`);
  console.log(`  Worst Trade: ${chalk.red(metrics.worstTrade.toFixed(2))}%`);
  console.log(`  Expectancy: ${chalk.cyan(metrics.expectancy.toFixed(2))}%`);
  console.log();

  if (showTrades && result.trades.length > 0) {
    console.log(chalk.bold('Trade Details:'));
    const tradesTable = new Table({
      head: ['Symbol', 'Side', 'Entry', 'Exit', 'Duration', 'P&L %', 'Exit Reason'],
      style: {
        head: ['cyan'],
        border: ['gray']
      }
    });

    for (const trade of result.trades.slice(0, 20)) { // Show first 20 trades
      const pnl = trade.pnlPercent >= 0 
        ? chalk.green(`+${trade.pnlPercent.toFixed(2)}%`)
        : chalk.red(`${trade.pnlPercent.toFixed(2)}%`);
      
      const side = trade.side === 'LONG' 
        ? chalk.green('LONG') 
        : chalk.red('SHORT');

      const duration = trade.duration < 24 
        ? `${Math.round(trade.duration)}h`
        : `${Math.round(trade.duration / 24)}d`;

      tradesTable.push([
        chalk.cyan(trade.symbol),
        side,
        `$${trade.entryPrice.toFixed(2)}`,
        `$${trade.exitPrice.toFixed(2)}`,
        chalk.gray(duration),
        pnl,
        chalk.gray(trade.exitReason)
      ]);
    }

    console.log(tradesTable.toString());

    if (result.trades.length > 20) {
      console.log(chalk.gray(`... and ${result.trades.length - 20} more trades`));
    }
  }
}

/**
 * Wait for backtest completion with progress updates
 */
async function waitForCompletion(requestId: string, client: SimpleApiClient): Promise<BacktestRequest> {
  const maxWaitTime = 5 * 60 * 1000; // 5 minutes
  const pollInterval = 2000; // 2 seconds
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitTime) {
    const request = await client.get<BacktestRequest>(`/backtests/${requestId}`);
    
    if (request.status === 'completed' || request.status === 'failed') {
      return request;
    }

    const elapsed = Math.round((Date.now() - startTime) / 1000);
    process.stdout.write(`\r${chalk.yellow('⏳')} Running backtest... ${elapsed}s elapsed`);
    
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }

  throw new Error('Backtest timed out after 5 minutes');
}

/**
 * Create the backtest command with all subcommands
 */
export function createBacktestCommand(): Command {
  const backtestCmd = new Command('backtest')
    .alias('bt')
    .description('Run and manage strategy backtests');

  // Run a new backtest
  backtestCmd
    .command('run')
    .description('Run a backtest for a strategy')
    .argument('<strategyId>', 'Strategy ID to backtest')
    .argument('<symbols...>', 'Symbols to backtest (e.g., BTC-USD AAPL)')
    .option('--start <date>', 'Start date (YYYY-MM-DD)', '2024-01-01')
    .option('--end <date>', 'End date (YYYY-MM-DD)', new Date().toISOString().split('T')[0])
    .option('--async', 'Run asynchronously without waiting for results')
    .option('--show-trades', 'Show individual trades in results')
    .action(async (strategyId: string, symbols: string[], options) => {
      try {
        if (!(await isAuthenticated())) {
          console.log(chalk.red('❌ Not authenticated. Run `dwlf login` first.'));
          return;
        }

        const normalizedSymbols = symbols.map(normalizeSymbol);
        console.log(chalk.bold.cyan('🔬 Starting Backtest'));
        console.log(`  Strategy: ${chalk.gray(strategyId)}`);
        console.log(`  Symbols: ${chalk.cyan(normalizedSymbols.join(', '))}`);
        console.log(`  Period: ${chalk.gray(options.start)} to ${chalk.gray(options.end)}`);
        console.log();

        const spinner = ora('Submitting backtest request...').start();
        const apiKey = await getApiKey();
        const apiUrl = await getApiUrl();
        const client = new SimpleApiClient(apiKey!, apiUrl);

        const backtestRequest = await client.post<BacktestRequest>('/backtests', {
          strategyId,
          symbols: normalizedSymbols,
          startDate: options.start,
          endDate: options.end
        });

        spinner.stop();
        console.log(chalk.green(`✅ Backtest submitted: ${backtestRequest.requestId}`));

        if (options.async) {
          console.log(chalk.gray('Run `dwlf backtest status <requestId>` to check progress'));
          console.log(chalk.gray('Run `dwlf backtest results <requestId>` to view results when complete'));
          return;
        }

        console.log();
        const completedRequest = await waitForCompletion(backtestRequest.requestId, client);
        console.log(); // New line after progress

        if (completedRequest.status === 'failed') {
          console.log(chalk.red(`❌ Backtest failed: ${completedRequest.error || 'Unknown error'}`));
          return;
        }

        console.log(chalk.green('✅ Backtest completed! Fetching results...'));
        const results = await client.get<BacktestResult>(`/backtests/${backtestRequest.requestId}/results`);
        
        console.log();
        displayBacktestResults(results, options.showTrades);

      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(chalk.red('❌ Failed to run backtest:'), errorMessage);
      }
    });

  // List backtests
  backtestCmd
    .command('list')
    .alias('ls')
    .description('List your backtests')
    .option('--limit <number>', 'Maximum number of backtests to show', '20')
    .option('--status <status>', 'Filter by status (pending/running/completed/failed)')
    .action(async (options) => {
      try {
        if (!(await isAuthenticated())) {
          console.log(chalk.red('❌ Not authenticated. Run `dwlf login` first.'));
          return;
        }

        const spinner = ora('Fetching backtests...').start();
        const apiKey = await getApiKey();
        const apiUrl = await getApiUrl();
        const client = new SimpleApiClient(apiKey!, apiUrl);

        const params: Record<string, unknown> = {
          limit: parseInt(options.limit)
        };

        if (options.status) {
          params.status = options.status.toLowerCase();
        }

        const response = await client.get<{backtests: BacktestRequest[]}>('/backtests', params);
        spinner.stop();

        console.log(chalk.bold.cyan('🔬 Your Backtests\n'));
        displayBacktestTable(response.backtests);

      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(chalk.red('❌ Failed to fetch backtests:'), errorMessage);
      }
    });

  // Show backtest status
  backtestCmd
    .command('status')
    .description('Check backtest status')
    .argument('<requestId>', 'Backtest request ID')
    .action(async (requestId: string) => {
      try {
        if (!(await isAuthenticated())) {
          console.log(chalk.red('❌ Not authenticated. Run `dwlf login` first.'));
          return;
        }

        const spinner = ora('Fetching backtest status...').start();
        const apiKey = await getApiKey();
        const apiUrl = await getApiUrl();
        const client = new SimpleApiClient(apiKey!, apiUrl);

        const backtest = await client.get<BacktestRequest>(`/backtests/${requestId}`);
        spinner.stop();

        console.log(chalk.bold.cyan('🔬 Backtest Status\n'));
        console.log(`  Request ID: ${chalk.gray(backtest.requestId)}`);
        console.log(`  Strategy: ${chalk.gray(backtest.strategyId)}`);
        console.log(`  Symbols: ${chalk.cyan(backtest.symbols.join(', '))}`);
        console.log(`  Period: ${chalk.gray(backtest.startDate)} to ${chalk.gray(backtest.endDate)}`);
        
        const status = backtest.status === 'completed' 
          ? chalk.green('COMPLETED')
          : backtest.status === 'failed'
          ? chalk.red('FAILED')
          : backtest.status === 'running'
          ? chalk.yellow('RUNNING')
          : chalk.gray('PENDING');
        
        console.log(`  Status: ${status}`);
        console.log(`  Created: ${chalk.gray(new Date(backtest.createdAt).toLocaleString())}`);

        if (backtest.completedAt) {
          console.log(`  Completed: ${chalk.gray(new Date(backtest.completedAt).toLocaleString())}`);
        }

        if (backtest.error) {
          console.log(`  Error: ${chalk.red(backtest.error)}`);
        }

        if (backtest.status === 'completed') {
          console.log();
          console.log(chalk.gray('Use `dwlf backtest results <requestId>` to view detailed results'));
        }

      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(chalk.red('❌ Failed to fetch backtest status:'), errorMessage);
      }
    });

  // Show backtest results
  backtestCmd
    .command('results')
    .description('View backtest results')
    .argument('<requestId>', 'Backtest request ID')
    .option('--trades', 'Show individual trades')
    .option('--json', 'Output results as JSON')
    .action(async (requestId: string, options) => {
      try {
        if (!(await isAuthenticated())) {
          console.log(chalk.red('❌ Not authenticated. Run `dwlf login` first.'));
          return;
        }

        const spinner = ora('Fetching backtest results...').start();
        const apiKey = await getApiKey();
        const apiUrl = await getApiUrl();
        const client = new SimpleApiClient(apiKey!, apiUrl);

        const results = await client.get<BacktestResult>(`/backtests/${requestId}/results`);
        spinner.stop();

        if (options.json) {
          console.log(JSON.stringify(results, null, 2));
          return;
        }

        console.log();
        displayBacktestResults(results, options.trades);

      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(chalk.red('❌ Failed to fetch backtest results:'), errorMessage);
      }
    });

  // Delete a backtest
  backtestCmd
    .command('delete')
    .alias('rm')
    .description('Delete a backtest')
    .argument('<requestId>', 'Backtest request ID')
    .option('--force', 'Skip confirmation prompt')
    .action(async (requestId: string, options) => {
      try {
        if (!(await isAuthenticated())) {
          console.log(chalk.red('❌ Not authenticated. Run `dwlf login` first.'));
          return;
        }

        if (!options.force) {
          const { prompt } = await import('enquirer');
          const { confirm }: { confirm: boolean } = await prompt({
            type: 'confirm',
            name: 'confirm',
            message: `Delete backtest ${requestId}?`,
            initial: false
          });

          if (!confirm) {
            console.log(chalk.gray('Cancelled.'));
            return;
          }
        }

        const spinner = ora('Deleting backtest...').start();
        const apiKey = await getApiKey();
        const apiUrl = await getApiUrl();
        const client = new SimpleApiClient(apiKey!, apiUrl);

        await client.delete(`/backtests/${requestId}`);
        spinner.stop();

        console.log(chalk.green('✅ Backtest deleted successfully'));

      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(chalk.red('❌ Failed to delete backtest:'), errorMessage);
      }
    });

  // Summary command
  backtestCmd
    .command('summary')
    .description('Show backtest summary statistics')
    .action(async () => {
      try {
        if (!(await isAuthenticated())) {
          console.log(chalk.red('❌ Not authenticated. Run `dwlf login` first.'));
          return;
        }

        const spinner = ora('Fetching backtest summary...').start();
        const apiKey = await getApiKey();
        const apiUrl = await getApiUrl();
        const client = new SimpleApiClient(apiKey!, apiUrl);

        const summary = await client.get<{ totalBacktests: number; completedBacktests: number; runningBacktests: number; failedBacktests: number; recentBacktests: BacktestRequest[] }>('/backtests/summary');
        spinner.stop();

        console.log(chalk.bold.cyan('🔬 Backtest Summary\n'));
        console.log(`  Total Backtests: ${chalk.cyan(summary.totalBacktests)}`);
        console.log(`  Completed: ${chalk.green(summary.completedBacktests)}`);
        console.log(`  Running: ${chalk.yellow(summary.runningBacktests)}`);
        console.log(`  Failed: ${chalk.red(summary.failedBacktests)}`);
        
        if (summary.recentBacktests.length > 0) {
          console.log();
          console.log(chalk.bold('Recent Backtests:'));
          displayBacktestTable(summary.recentBacktests);
        }

      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(chalk.red('❌ Failed to fetch backtest summary:'), errorMessage);
      }
    });

  return backtestCmd;
}