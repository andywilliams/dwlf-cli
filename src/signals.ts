import { Command } from 'commander';
import chalk from 'chalk';
import Table from 'cli-table3';
import ora from 'ora';
import { DWLFApiClient } from './api-client';
import { getApiKey, getApiUrl, isAuthenticated } from './config';

export interface Signal {
  signalId: string;
  symbol: string;
  strategy: {
    strategyId: string;
    name: string;
  };
  signalType: 'LONG' | 'SHORT';
  entryPrice: number;
  currentPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  riskRewardRatio?: number;
  pnlPct?: number;
  status: 'ACTIVE' | 'CLOSED';
  generatedAt: string;
  closedAt?: string;
  signalAge?: string; // Human readable format like "2h 30m"
}

export interface SignalsResponse {
  signals: Signal[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  };
}

export interface SignalFilters {
  strategy?: string;
  symbol?: string;
  status?: 'ACTIVE' | 'CLOSED';
  signalType?: 'LONG' | 'SHORT';
  limit?: number;
  page?: number;
}

/**
 * Transform API signal to CLI signal interface
 */
function transformApiSignal(apiSignal: any): Signal {
  return {
    signalId: apiSignal.signalId,
    symbol: apiSignal.symbol,
    strategy: {
      strategyId: apiSignal.strategy || apiSignal.strategyDetails?.visualStrategyId || 'unknown',
      name: apiSignal.strategyDescription || apiSignal.strategyDetails?.strategyName || 'Unknown Strategy'
    },
    signalType: 'LONG', // API doesn't seem to have this field, defaulting to LONG
    entryPrice: apiSignal.initialPrice || 0,
    currentPrice: apiSignal.currentPrice,
    stopLoss: apiSignal.stopLossLevel,
    takeProfit: apiSignal.target3R, // Use 3R target as take profit
    riskRewardRatio: apiSignal.currentRR,
    pnlPct: apiSignal.percentageGain,
    status: apiSignal.active === 'true' || apiSignal.active === true ? 'ACTIVE' : 'CLOSED',
    generatedAt: apiSignal.createdAt || apiSignal.date,
    closedAt: apiSignal.closedAt || apiSignal.exitDate
  };
}

/**
 * Calculate human-readable signal age
 */
function formatSignalAge(generatedAt: string): string {
  const now = new Date();
  const generated = new Date(generatedAt);
  const diffMs = now.getTime() - generated.getTime();
  
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
    const seconds = diffSeconds % 60;
    return seconds > 30 ? `${diffMinutes}m ${seconds}s` : `${diffMinutes}m`;
  }
  
  return `${diffSeconds}s`;
}

/**
 * Format price with appropriate precision
 */
function formatPrice(price: number): string {
  if (price >= 1000) return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (price >= 1) return price.toFixed(4);
  return price.toFixed(6);
}

/**
 * Format percentage with color coding
 */
function formatPercentage(pct: number | undefined): string {
  if (pct === undefined) return '-';
  
  const formatted = (pct >= 0 ? '+' : '') + pct.toFixed(2) + '%';
  return pct >= 0 ? chalk.green(formatted) : chalk.red(formatted);
}

/**
 * Format R-multiple with color coding
 */
function formatRMultiple(rMultiple: number | undefined): string {
  if (rMultiple === undefined) return '-';
  
  const formatted = (rMultiple >= 0 ? '+' : '') + rMultiple.toFixed(2) + 'R';
  return rMultiple >= 0 ? chalk.green(formatted) : chalk.red(formatted);
}

/**
 * Fetch signals from the API
 */
async function fetchSignals(client: DWLFApiClient, filters: SignalFilters = {}): Promise<SignalsResponse> {
  try {
    // Build query parameters
    const params: Record<string, any> = {};
    
    if (filters.strategy) params.strategy = filters.strategy;
    if (filters.symbol) params.symbol = filters.symbol.toUpperCase();
    if (filters.status) params.status = filters.status;
    if (filters.signalType) params.signalType = filters.signalType;
    if (filters.limit) params.limit = filters.limit;
    if (filters.page) params.page = filters.page;

    // Fetch from signals API endpoint
    const apiResponse = await client.get<any>('/v2/user/trade-signals', params);
    
    // Transform API response to CLI format
    const signals = apiResponse.signals ? apiResponse.signals.map((apiSignal: any) => {
      const signal = transformApiSignal(apiSignal);
      return {
        ...signal,
        signalAge: formatSignalAge(signal.generatedAt)
      };
    }) : [];
    
    // Transform pagination structure
    const pagination = apiResponse.pagination ? {
      total: apiResponse.pagination.total || apiResponse.total || 0,
      page: Math.floor((apiResponse.pagination.offset || 0) / (params.limit || 50)) + 1,
      limit: params.limit || 50,
      hasMore: apiResponse.pagination.hasMore || false
    } : undefined;
    
    return {
      signals,
      pagination
    } as SignalsResponse;
  } catch (error: any) {
    throw new Error(`Failed to fetch signals: ${error.message}`);
  }
}

/**
 * Fetch detailed information for a specific signal
 */
async function fetchSignalDetails(client: DWLFApiClient, signalId: string): Promise<Signal> {
  try {
    const apiSignal = await client.get<any>(`/v2/trade-signals/${signalId}`);
    const signal = transformApiSignal(apiSignal);
    return {
      ...signal,
      signalAge: formatSignalAge(signal.generatedAt)
    };
  } catch (error: any) {
    throw new Error(`Failed to fetch signal details: ${error.message}`);
  }
}

/**
 * Display signals in a table format
 */
function displaySignalsTable(signals: Signal[], showDetails: boolean = false): void {
  if (signals.length === 0) {
    console.log(chalk.yellow('📭 No signals found matching your criteria.'));
    return;
  }

  const table = new Table({
    head: showDetails 
      ? [
          chalk.cyan('ID'),
          chalk.cyan('Symbol'),
          chalk.cyan('Strategy'),
          chalk.cyan('Type'),
          chalk.cyan('Entry'),
          chalk.cyan('Current'),
          chalk.cyan('SL'),
          chalk.cyan('TP'),
          chalk.cyan('R:R'),
          chalk.cyan('P&L%'),
          chalk.cyan('Age'),
          chalk.cyan('Status')
        ]
      : [
          chalk.cyan('Symbol'),
          chalk.cyan('Strategy'),
          chalk.cyan('Type'),
          chalk.cyan('Entry'),
          chalk.cyan('P&L%'),
          chalk.cyan('Age'),
          chalk.cyan('Status')
        ],
    style: {
      head: [],
      border: []
    }
  });

  signals.forEach(signal => {
    const statusColor = signal.status === 'ACTIVE' ? chalk.green : chalk.gray;
    const typeColor = signal.signalType === 'LONG' ? chalk.blue : chalk.red;
    
    const row = showDetails
      ? [
          signal.signalId.slice(-8), // Show last 8 chars of ID
          signal.symbol,
          signal.strategy.name,
          typeColor(signal.signalType),
          formatPrice(signal.entryPrice),
          signal.currentPrice ? formatPrice(signal.currentPrice) : '-',
          signal.stopLoss ? formatPrice(signal.stopLoss) : '-',
          signal.takeProfit ? formatPrice(signal.takeProfit) : '-',
          signal.riskRewardRatio ? signal.riskRewardRatio.toFixed(2) : '-',
          formatPercentage(signal.pnlPct),
          signal.signalAge || '-',
          statusColor(signal.status)
        ]
      : [
          signal.symbol,
          signal.strategy.name,
          typeColor(signal.signalType),
          formatPrice(signal.entryPrice),
          formatPercentage(signal.pnlPct),
          signal.signalAge || '-',
          statusColor(signal.status)
        ];

    table.push(row);
  });

  console.log(table.toString());
}

/**
 * Display detailed information for a single signal
 */
function displaySignalDetails(signal: Signal): void {
  console.log(chalk.bold(`\n🎯 Signal Details: ${signal.signalId}`));
  console.log(chalk.gray('─'.repeat(50)));
  
  console.log(`Symbol: ${chalk.cyan(signal.symbol)}`);
  console.log(`Strategy: ${chalk.cyan(signal.strategy.name)}`);
  
  const typeColor = signal.signalType === 'LONG' ? chalk.blue : chalk.red;
  console.log(`Signal Type: ${typeColor(signal.signalType)}`);
  
  const statusColor = signal.status === 'ACTIVE' ? chalk.green : chalk.gray;
  console.log(`Status: ${statusColor(signal.status)}`);
  
  console.log(`\nPrices:`);
  console.log(`  Entry: ${chalk.yellow(formatPrice(signal.entryPrice))}`);
  if (signal.currentPrice) {
    console.log(`  Current: ${chalk.cyan(formatPrice(signal.currentPrice))}`);
  }
  if (signal.stopLoss) {
    console.log(`  Stop Loss: ${chalk.red(formatPrice(signal.stopLoss))}`);
  }
  if (signal.takeProfit) {
    console.log(`  Take Profit: ${chalk.green(formatPrice(signal.takeProfit))}`);
  }
  
  console.log(`\nPerformance:`);
  if (signal.riskRewardRatio) {
    console.log(`  Risk:Reward: ${chalk.cyan(signal.riskRewardRatio.toFixed(2))}`);
  }
  if (signal.pnlPct !== undefined) {
    console.log(`  P&L: ${formatPercentage(signal.pnlPct)}`);
  }
  
  console.log(`\nTiming:`);
  console.log(`  Generated: ${chalk.cyan(new Date(signal.generatedAt).toLocaleString())}`);
  console.log(`  Age: ${chalk.cyan(signal.signalAge || 'Unknown')}`);
  if (signal.closedAt) {
    console.log(`  Closed: ${chalk.cyan(new Date(signal.closedAt).toLocaleString())}`);
  }
}

/**
 * Display summary statistics
 */
function displaySignalsSummary(signals: Signal[]): void {
  if (signals.length === 0) return;

  const activeSignals = signals.filter(s => s.status === 'ACTIVE');
  const longSignals = signals.filter(s => s.signalType === 'LONG');
  const shortSignals = signals.filter(s => s.signalType === 'SHORT');
  
  const profitableSignals = signals.filter(s => s.pnlPct && s.pnlPct > 0);
  const totalPnl = signals.reduce((sum, s) => sum + (s.pnlPct || 0), 0);
  
  console.log(chalk.bold('\n📊 Summary:'));
  console.log(`Total Signals: ${chalk.cyan(signals.length)}`);
  console.log(`Active: ${chalk.green(activeSignals.length)} | Closed: ${chalk.gray(signals.length - activeSignals.length)}`);
  console.log(`Long: ${chalk.blue(longSignals.length)} | Short: ${chalk.red(shortSignals.length)}`);
  
  if (signals.some(s => s.pnlPct !== undefined)) {
    const winRate = (profitableSignals.length / signals.length * 100).toFixed(1);
    console.log(`Win Rate: ${profitableSignals.length > signals.length / 2 ? chalk.green(winRate + '%') : chalk.red(winRate + '%')}`);
    console.log(`Total P&L: ${formatPercentage(totalPnl)}`);
  }
}

/**
 * Check authentication and create API client
 */
async function createAuthenticatedClient(): Promise<DWLFApiClient> {
  if (!await isAuthenticated()) {
    console.log(chalk.red('❌ Not authenticated.'));
    console.log(chalk.gray('Run `dwlf login` first to configure your API key.'));
    process.exit(1);
  }
  
  const apiKey = await getApiKey();
  const apiUrl = await getApiUrl();
  
  return new DWLFApiClient({ 
    apiKey: apiKey!, 
    baseUrl: apiUrl,
    rateLimit: { requests: 10, per: 1000 } // 10 requests per second
  });
}

/**
 * Create and configure the signals command
 */
export function createSignalsCommand(): Command {
  const signalsCommand = new Command('signals')
    .description('View and manage trading signals')
    .option('--strategy <name>', 'filter by strategy name')
    .option('--symbol <symbol>', 'filter by symbol (e.g., BTC-USD, AAPL)')
    .option('--status <status>', 'filter by status (active, closed)', (value) => {
      const valid = ['active', 'closed'];
      if (!valid.includes(value.toLowerCase())) {
        throw new Error(`Status must be one of: ${valid.join(', ')}`);
      }
      return value.toUpperCase() as 'ACTIVE' | 'CLOSED';
    })
    .option('--type <type>', 'filter by signal type (long, short)', (value) => {
      const valid = ['long', 'short'];
      if (!valid.includes(value.toLowerCase())) {
        throw new Error(`Type must be one of: ${valid.join(', ')}`);
      }
      return value.toUpperCase() as 'LONG' | 'SHORT';
    })
    .option('--limit <number>', 'limit number of results', parseInt)
    .option('--page <number>', 'page number for pagination', parseInt)
    .option('--details', 'show detailed information')
    .option('--summary', 'show summary statistics')
    .option('--id <signalId>', 'show details for a specific signal ID');

  signalsCommand.action(async (options) => {
    try {
      const client = await createAuthenticatedClient();
      
      // If specific signal ID requested
      if (options.id) {
        const spinner = ora('Fetching signal details...').start();
        try {
          const signal = await fetchSignalDetails(client, options.id);
          spinner.stop();
          displaySignalDetails(signal);
        } catch (error: any) {
          spinner.stop();
          console.error(chalk.red('Error:'), error.message);
          process.exit(1);
        }
        return;
      }
      
      // Build filters from options
      const filters: SignalFilters = {
        strategy: options.strategy,
        symbol: options.symbol,
        status: options.status,
        signalType: options.type,
        limit: options.limit || 20,
        page: options.page || 1
      };
      
      // Fetch signals
      const spinner = ora('Fetching signals...').start();
      let response: SignalsResponse;
      
      try {
        response = await fetchSignals(client, filters);
        spinner.stop();
      } catch (error: any) {
        spinner.stop();
        console.error(chalk.red('Error:'), error.message);
        process.exit(1);
      }
      
      // Display results
      console.log(chalk.bold(`\n🎯 Trading Signals`));
      
      if (response.pagination) {
        const { total, page, hasMore } = response.pagination;
        console.log(chalk.gray(`Page ${page}, showing ${response.signals.length} of ${total} total signals`));
        if (hasMore) {
          console.log(chalk.dim(`Use --page ${page + 1} to see more results`));
        }
      }
      
      displaySignalsTable(response.signals, options.details);
      
      if (options.summary) {
        displaySignalsSummary(response.signals);
      }
      
      // Show helpful tips for first-time users
      if (response.signals.length > 0 && !options.details && !options.id) {
        console.log(chalk.dim(`\nTip: Use --details for more information, or --id <signalId> for full signal details`));
      }

    } catch (error: any) {
      console.error(chalk.red('Unexpected error:'), error.message);
      process.exit(1);
    }
  });

  return signalsCommand;
}