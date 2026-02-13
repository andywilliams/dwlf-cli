import { Command } from 'commander';
import chalk from 'chalk';
import Table from 'cli-table3';
import ora from 'ora';
import { DWLFApiClient } from './api-client';
import { getApiKey, getApiUrl, isAuthenticated } from './config';

export interface Portfolio {
  portfolioId: string;
  name: string;
  description?: string;
  totalValue?: number;
  pnlAbs?: number;
  pnlPct?: number;
  lastUpdated?: string;
  isDefault?: boolean;
}

export interface PortfoliosResponse {
  portfolios: Portfolio[];
}

export interface Holding {
  symbol: string;
  quantity: number;
  avgPrice: number;
  currentPrice?: number;
  totalValue?: number;
  pnlAbs?: number;
  pnlPct?: number;
  allocation?: number;
}

export interface PortfolioDetails {
  portfolio: Portfolio;
  holdings?: Holding[];
  summary?: {
    totalValue: number;
    totalCost: number;
    pnlAbs: number;
    pnlPct: number;
    dayChange?: number;
    dayChangePct?: number;
  };
}

export interface Trade {
  tradeId: string;
  symbol: string;
  direction: 'long' | 'short';
  entryPrice: number;
  exitPrice?: number;
  quantity: number;
  pnlAbs?: number;
  pnlPct?: number;
  rMultiple?: number;
  status: 'open' | 'closed';
  entryAt: string;
  exitAt?: string;
  isPaperTrade?: boolean;
}

export interface TradesResponse {
  trades: Trade[];
  summary?: {
    total: number;
    open: number;
    closed: number;
    winRate?: number;
    avgRMultiple?: number;
    totalPnl?: number;
  };
}

/**
 * Format currency amount with appropriate precision and color
 */
function formatCurrency(amount: number | undefined, currency: string = '$'): string {
  if (amount === undefined || amount === null) return '-';
  
  const formatted = `${currency}${Math.abs(amount).toLocaleString('en-US', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  })}`;
  
  if (amount === 0) return formatted;
  
  const withSign = amount >= 0 ? `+${formatted}` : `-${formatted}`;
  return amount >= 0 ? chalk.green(withSign) : chalk.red(withSign);
}

/**
 * Format percentage with color coding
 */
function formatPercentage(pct: number | undefined): string {
  if (pct === undefined || pct === null) return '-';
  
  const formatted = (pct >= 0 ? '+' : '') + pct.toFixed(2) + '%';
  return pct >= 0 ? chalk.green(formatted) : chalk.red(formatted);
}

/**
 * Format R-multiple with color coding
 */
function formatRMultiple(r: number | undefined): string {
  if (r === undefined || r === null) return '-';
  
  const formatted = (r >= 0 ? '+' : '') + r.toFixed(2) + 'R';
  return r >= 0 ? chalk.green(formatted) : chalk.red(formatted);
}

/**
 * Format allocation percentage
 */
function formatAllocation(allocation: number | undefined): string {
  if (allocation === undefined || allocation === null) return '-';
  return allocation.toFixed(1) + '%';
}

/**
 * Format trade duration
 */
function formatTradeDuration(entryAt: string, exitAt?: string): string {
  const entry = new Date(entryAt);
  const exit = exitAt ? new Date(exitAt) : new Date();
  const diffMs = exit.getTime() - entry.getTime();
  
  if (diffMs < 0) return 'Future';
  
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffDays > 0) {
    const hours = diffHours % 24;
    return hours > 0 ? `${diffDays}d ${hours}h` : `${diffDays}d`;
  }
  
  if (diffHours > 0) {
    const minutes = diffMinutes % 60;
    return minutes > 0 ? `${diffHours}h ${minutes}m` : `${diffHours}h`;
  }
  
  if (diffMinutes > 0) {
    return `${diffMinutes}m`;
  }
  
  return `${diffSeconds}s`;
}

/**
 * Display portfolios in a table format
 */
async function displayPortfolios(portfolios: Portfolio[], compact: boolean = false): Promise<void> {
  if (portfolios.length === 0) {
    console.log(chalk.yellow('📂 No portfolios found.'));
    return;
  }

  if (compact) {
    // Simple list format for scripting
    portfolios.forEach(portfolio => {
      console.log(`${portfolio.portfolioId}\t${portfolio.name}\t${portfolio.totalValue || 0}\t${portfolio.pnlPct || 0}`);
    });
    return;
  }

  // Rich table format
  const table = new Table({
    head: [
      chalk.cyan('Portfolio'),
      chalk.cyan('Value'),
      chalk.cyan('P&L'),
      chalk.cyan('P&L %'),
      chalk.cyan('Updated')
    ],
    colWidths: [25, 15, 15, 12, 20],
    style: { border: ['grey'] }
  });

  portfolios.forEach(portfolio => {
    const name = portfolio.isDefault ? `${portfolio.name} ${chalk.yellow('(default)')}` : portfolio.name;
    const value = formatCurrency(portfolio.totalValue);
    const pnlAbs = formatCurrency(portfolio.pnlAbs);
    const pnlPct = formatPercentage(portfolio.pnlPct);
    const updated = portfolio.lastUpdated ? new Date(portfolio.lastUpdated).toLocaleDateString() : '-';
    
    table.push([name, value, pnlAbs, pnlPct, updated]);
  });

  console.log(table.toString());
}

/**
 * Display portfolio holdings in a table format
 */
async function displayHoldings(holdings: Holding[], compact: boolean = false): Promise<void> {
  if (holdings.length === 0) {
    console.log(chalk.yellow('📊 No holdings found.'));
    return;
  }

  if (compact) {
    // Simple format for scripting
    holdings.forEach(holding => {
      console.log(`${holding.symbol}\t${holding.quantity}\t${holding.avgPrice}\t${holding.currentPrice || 0}\t${holding.pnlPct || 0}`);
    });
    return;
  }

  // Rich table format
  const table = new Table({
    head: [
      chalk.cyan('Symbol'),
      chalk.cyan('Qty'),
      chalk.cyan('Avg Price'),
      chalk.cyan('Current'),
      chalk.cyan('Value'),
      chalk.cyan('P&L'),
      chalk.cyan('P&L %'),
      chalk.cyan('Alloc')
    ],
    colWidths: [12, 12, 12, 12, 15, 12, 10, 8],
    style: { border: ['grey'] }
  });

  holdings.forEach(holding => {
    const value = formatCurrency(holding.totalValue);
    const pnlAbs = formatCurrency(holding.pnlAbs);
    const pnlPct = formatPercentage(holding.pnlPct);
    const allocation = formatAllocation(holding.allocation);
    
    table.push([
      holding.symbol,
      holding.quantity.toString(),
      formatCurrency(holding.avgPrice),
      formatCurrency(holding.currentPrice),
      value,
      pnlAbs,
      pnlPct,
      allocation
    ]);
  });

  console.log(table.toString());
}

/**
 * Display trade history in a table format
 */
async function displayTrades(trades: Trade[], compact: boolean = false): Promise<void> {
  if (trades.length === 0) {
    console.log(chalk.yellow('📋 No trades found.'));
    return;
  }

  if (compact) {
    // Simple format for scripting
    trades.forEach(trade => {
      console.log(`${trade.tradeId}\t${trade.symbol}\t${trade.direction}\t${trade.status}\t${trade.pnlPct || 0}`);
    });
    return;
  }

  // Rich table format
  const table = new Table({
    head: [
      chalk.cyan('Symbol'),
      chalk.cyan('Side'),
      chalk.cyan('Entry'),
      chalk.cyan('Exit'),
      chalk.cyan('P&L'),
      chalk.cyan('P&L %'),
      chalk.cyan('R'),
      chalk.cyan('Duration'),
      chalk.cyan('Status')
    ],
    colWidths: [10, 6, 12, 12, 12, 10, 8, 12, 8],
    style: { border: ['grey'] }
  });

  trades.forEach(trade => {
    const direction = trade.direction === 'long' ? chalk.green('LONG') : chalk.red('SHORT');
    const entry = formatCurrency(trade.entryPrice);
    const exit = trade.exitPrice ? formatCurrency(trade.exitPrice) : '-';
    const pnlAbs = formatCurrency(trade.pnlAbs);
    const pnlPct = formatPercentage(trade.pnlPct);
    const rMultiple = formatRMultiple(trade.rMultiple);
    const duration = formatTradeDuration(trade.entryAt, trade.exitAt);
    const status = trade.status === 'open' ? chalk.blue('OPEN') : chalk.gray('CLOSED');
    
    table.push([
      trade.symbol,
      direction,
      entry,
      exit,
      pnlAbs,
      pnlPct,
      rMultiple,
      duration,
      status
    ]);
  });

  console.log(table.toString());
}

/**
 * Create the portfolio command with subcommands
 */
export function createPortfolioCommand(): Command {
  const portfolioCmd = new Command('portfolio')
    .alias('pf')
    .description('Portfolio management and analysis');

  // List portfolios
  portfolioCmd
    .command('list')
    .alias('ls')
    .description('List all portfolios')
    .option('-c, --compact', 'compact output for scripting')
    .option('-j, --json', 'output as JSON')
    .action(async (options) => {
      try {
        if (!await isAuthenticated()) {
          console.log(chalk.red('❌ Not authenticated. Run `dwlf login` first.'));
          return;
        }

        const apiKey = await getApiKey();
        const apiUrl = await getApiUrl();
        const client = new DWLFApiClient({ apiKey: apiKey!, baseUrl: apiUrl });

        const spinner = ora('Fetching portfolios...').start();
        const response = await client.get<PortfoliosResponse>('/portfolios');
        spinner.stop();

        if (options.json) {
          console.log(JSON.stringify(response, null, 2));
          return;
        }

        await displayPortfolios(response.portfolios, options.compact);

      } catch (error: any) {
        console.error(chalk.red('❌ Failed to fetch portfolios:'), error.message);
        process.exit(1);
      }
    });

  // Portfolio overview
  portfolioCmd
    .command('overview')
    .alias('show')
    .description('Show portfolio overview with holdings')
    .option('-p, --portfolio <id>', 'portfolio ID (uses default if not specified)')
    .option('-c, --compact', 'compact output for scripting')
    .option('-j, --json', 'output as JSON')
    .action(async (options) => {
      try {
        if (!await isAuthenticated()) {
          console.log(chalk.red('❌ Not authenticated. Run `dwlf login` first.'));
          return;
        }

        const apiKey = await getApiKey();
        const apiUrl = await getApiUrl();
        const client = new DWLFApiClient({ apiKey: apiKey!, baseUrl: apiUrl });

        let portfolioId = options.portfolio;

        // If no portfolio specified, get the default one
        if (!portfolioId) {
          const spinner = ora('Finding default portfolio...').start();
          const response = await client.get<PortfoliosResponse>('/portfolios');
          spinner.stop();

          const defaultPortfolio = response.portfolios.find(p => p.isDefault) || response.portfolios[0];
          if (!defaultPortfolio) {
            console.log(chalk.yellow('📂 No portfolios found.'));
            return;
          }
          portfolioId = defaultPortfolio.portfolioId;
        }

        const spinner = ora('Fetching portfolio details...').start();
        const [portfolioResponse, holdingsResponse] = await Promise.all([
          client.get<{ portfolio: Portfolio }>(`/portfolios/${portfolioId}`),
          client.get<{ holdings: Holding[] }>(`/portfolios/${portfolioId}/holdings/details`)
        ]);
        spinner.stop();

        const portfolio = portfolioResponse.portfolio;
        const holdings = holdingsResponse.holdings || [];

        if (options.json) {
          console.log(JSON.stringify({ portfolio, holdings }, null, 2));
          return;
        }

        // Display portfolio summary
        console.log(chalk.bold.cyan(`\n📊 ${portfolio.name}`));
        if (portfolio.description) {
          console.log(chalk.gray(portfolio.description));
        }
        console.log();

        if (portfolio.totalValue !== undefined) {
          console.log(`${chalk.cyan('Total Value:')} ${formatCurrency(portfolio.totalValue)}`);
        }
        if (portfolio.pnlAbs !== undefined) {
          console.log(`${chalk.cyan('P&L:')} ${formatCurrency(portfolio.pnlAbs)} ${formatPercentage(portfolio.pnlPct)}`);
        }
        console.log();

        // Display holdings
        if (holdings.length > 0) {
          console.log(chalk.bold('🏛️ Holdings'));
          await displayHoldings(holdings, options.compact);
        } else {
          console.log(chalk.yellow('📊 No holdings found.'));
        }

      } catch (error: any) {
        console.error(chalk.red('❌ Failed to fetch portfolio details:'), error.message);
        process.exit(1);
      }
    });

  // Trade history
  portfolioCmd
    .command('trades')
    .description('Show trade history')
    .option('-s, --status <status>', 'filter by status (open/closed)', /^(open|closed)$/i)
    .option('-l, --limit <number>', 'limit number of trades', parseInt)
    .option('-c, --compact', 'compact output for scripting')
    .option('-j, --json', 'output as JSON')
    .action(async (options) => {
      try {
        if (!await isAuthenticated()) {
          console.log(chalk.red('❌ Not authenticated. Run `dwlf login` first.'));
          return;
        }

        const apiKey = await getApiKey();
        const apiUrl = await getApiUrl();
        const client = new DWLFApiClient({ apiKey: apiKey!, baseUrl: apiUrl });

        const params: Record<string, any> = {};
        if (options.status) params.status = options.status.toLowerCase();
        if (options.limit) params.limit = options.limit;

        const spinner = ora('Fetching trades...').start();
        const response = await client.get<TradesResponse>('/trades', params);
        spinner.stop();

        if (options.json) {
          console.log(JSON.stringify(response, null, 2));
          return;
        }

        // Display summary if available
        if (response.summary) {
          const summary = response.summary;
          console.log(chalk.bold.cyan('\n📈 Trade Summary'));
          console.log(`${chalk.cyan('Total Trades:')} ${summary.total}`);
          console.log(`${chalk.cyan('Open:')} ${summary.open} | ${chalk.cyan('Closed:')} ${summary.closed}`);
          if (summary.winRate !== undefined) {
            console.log(`${chalk.cyan('Win Rate:')} ${summary.winRate.toFixed(1)}%`);
          }
          if (summary.avgRMultiple !== undefined) {
            console.log(`${chalk.cyan('Avg R:')} ${formatRMultiple(summary.avgRMultiple)}`);
          }
          if (summary.totalPnl !== undefined) {
            console.log(`${chalk.cyan('Total P&L:')} ${formatCurrency(summary.totalPnl)}`);
          }
          console.log();
        }

        // Display trades table
        console.log(chalk.bold('📋 Trade History'));
        await displayTrades(response.trades, options.compact);

      } catch (error: any) {
        console.error(chalk.red('❌ Failed to fetch trades:'), error.message);
        process.exit(1);
      }
    });

  // Performance metrics
  portfolioCmd
    .command('performance')
    .alias('perf')
    .description('Show portfolio performance metrics')
    .option('-p, --portfolio <id>', 'portfolio ID (uses default if not specified)')
    .option('-j, --json', 'output as JSON')
    .action(async (options) => {
      try {
        if (!await isAuthenticated()) {
          console.log(chalk.red('❌ Not authenticated. Run `dwlf login` first.'));
          return;
        }

        const apiKey = await getApiKey();
        const apiUrl = await getApiUrl();
        const client = new DWLFApiClient({ apiKey: apiKey!, baseUrl: apiUrl });

        let portfolioId = options.portfolio;

        // If no portfolio specified, get the default one
        if (!portfolioId) {
          const response = await client.get<PortfoliosResponse>('/portfolios');
          const defaultPortfolio = response.portfolios.find(p => p.isDefault) || response.portfolios[0];
          if (!defaultPortfolio) {
            console.log(chalk.yellow('📂 No portfolios found.'));
            return;
          }
          portfolioId = defaultPortfolio.portfolioId;
        }

        const spinner = ora('Fetching performance data...').start();
        const response = await client.get(`/portfolios/${portfolioId}/snapshots`);
        spinner.stop();

        if (options.json) {
          console.log(JSON.stringify(response, null, 2));
          return;
        }

        console.log(chalk.yellow('📊 Portfolio performance analysis coming soon...'));
        console.log(chalk.gray('This will include metrics like Sharpe ratio, max drawdown, volatility, etc.'));

      } catch (error: any) {
        console.error(chalk.red('❌ Failed to fetch performance data:'), error.message);
        process.exit(1);
      }
    });

  // Default action - show overview
  portfolioCmd.action(async () => {
    portfolioCmd.help();
  });

  return portfolioCmd;
}