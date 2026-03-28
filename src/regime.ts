import { Command } from 'commander';
import chalk from 'chalk';
import Table from 'cli-table3';
import ora from 'ora';
import { DWLFApiClient } from './api-client';
import { getApiKey, getApiUrl, isAuthenticated } from './config';

export interface RegimeData {
  symbol: string;
  regime: {
    trend: string;
    cycle: string;
    momentum: string;
    volatility: string;
  };
  since?: string;
}

export interface RegimeHistoryItem {
  timestamp: string;
  regime: {
    trend: string;
    cycle: string;
    momentum: string;
    volatility: string;
  };
}

export interface RegimeHistoryResponse {
  symbol: string;
  history: RegimeHistoryItem[];
}

/**
 * Format regime value with color coding
 */
function formatRegimeValue(value: string | undefined): string {
  if (!value) return chalk.gray('-');
  
  const upperValue = value.toUpperCase();
  
  // Color coding based on regime type
  if (upperValue.includes('BULL') || upperValue.includes('UP') || upperValue.includes('HIGH')) {
    return chalk.green(value);
  } else if (upperValue.includes('BEAR') || upperValue.includes('DOWN') || upperValue.includes('LOW')) {
    return chalk.red(value);
  } else if (upperValue.includes('NEUTRAL') || upperValue.includes('SIDEWAYS')) {
    return chalk.yellow(value);
  }
  
  return chalk.cyan(value);
}

/**
 * Format timestamp to readable date
 */
function formatSinceDate(timestamp: string | undefined): string {
  if (!timestamp) return '-';
  
  try {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return timestamp;
  }
}

/**
 * Display current regime in a table
 */
function displayRegime(regime: RegimeData): void {
  console.log(chalk.bold.cyan(`\n📊 Market Regime: ${regime.symbol}`));
  console.log(chalk.gray('─'.repeat(50)));
  console.log();
  
  const table = new Table({
    colAligns: ['left', 'left'],
    style: { head: [], border: ['grey'] }
  });
  
  table.push(
    [chalk.cyan('Trend'), formatRegimeValue(regime.regime.trend)],
    [chalk.cyan('Cycle'), formatRegimeValue(regime.regime.cycle)],
    [chalk.cyan('Momentum'), formatRegimeValue(regime.regime.momentum)],
    [chalk.cyan('Volatility'), formatRegimeValue(regime.regime.volatility)]
  );
  
  console.log(table.toString());
  
  if (regime.since) {
    console.log(chalk.gray(`\nSince: ${formatSinceDate(regime.since)}`));
  }
  
  console.log();
}

/**
 * Display regime history in a table
 */
function displayRegimeHistory(response: RegimeHistoryResponse): void {
  console.log(chalk.bold.cyan(`\n📈 Regime History: ${response.symbol}`));
  console.log(chalk.gray('─'.repeat(60)));
  console.log();
  
  if (!response.history || response.history.length === 0) {
    console.log(chalk.yellow('No regime history available.'));
    return;
  }
  
  const table = new Table({
    head: [
      chalk.cyan('Date'),
      chalk.cyan('Trend'),
      chalk.cyan('Cycle'),
      chalk.cyan('Momentum'),
      chalk.cyan('Volatility')
    ],
    style: { head: [], border: ['grey'] }
  });
  
  // Show most recent first (reverse the array)
  const history = [...response.history].reverse().slice(0, 20); // Limit to 20 most recent
  
  history.forEach(item => {
    const date = item.timestamp 
      ? new Date(item.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      : '-';
    
    table.push([
      chalk.gray(date),
      formatRegimeValue(item.regime?.trend),
      formatRegimeValue(item.regime?.cycle),
      formatRegimeValue(item.regime?.momentum),
      formatRegimeValue(item.regime?.volatility)
    ]);
  });
  
  console.log(table.toString());
  console.log(chalk.gray(`\nShowing ${history.length} most recent entries`));
  console.log();
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
    baseUrl: apiUrl 
  });
}

/**
 * Create and configure the regime command
 */
export function createRegimeCommand(): Command {
  const regimeCommand = new Command('regime')
    .description('Get market regime classification for a symbol')
    .argument('<symbol>', 'symbol to check (e.g., BTC-USD, AAPL)')
    .option('--history', 'show historical regime data')
    .option('-j, --json', 'output as JSON');

  regimeCommand.action(async (symbol: string, options) => {
    try {
      const client = await createAuthenticatedClient();
      const normalizedSymbol = symbol.toUpperCase();
      
      if (options.history) {
        // Fetch regime history
        const spinner = ora('Fetching regime history...').start();
        try {
          const response = await client.get<RegimeHistoryResponse>(`/v2/regime/${normalizedSymbol}/history`);
          spinner.stop();
          
          if (options.json) {
            console.log(JSON.stringify(response, null, 2));
            return;
          }
          
          displayRegimeHistory(response);
        } catch (error: unknown) {
          spinner.stop();
          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
          
          // Handle 404 gracefully
          if ((error as { status?: number }).status === 404) {
            console.log(chalk.yellow(`⚠️  No regime history found for ${normalizedSymbol}.`));
            return;
          }
          
          console.error(chalk.red('Error:'), errorMessage);
          process.exit(1);
        }
      } else {
        // Fetch current regime
        const spinner = ora('Fetching market regime...').start();
        let regime: RegimeData;
        
        try {
          regime = await client.get<RegimeData>(`/v2/regime/${normalizedSymbol}`);
          spinner.stop();
        } catch (error: unknown) {
          spinner.stop();
          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
          
          // Handle 404 gracefully
          if ((error as { status?: number }).status === 404) {
            console.log(chalk.yellow(`⚠️  No regime data found for ${normalizedSymbol}.`));
            console.log(chalk.gray('Try: dwlf regime BTC-USD --history'));
            return;
          }
          
          console.error(chalk.red('Error:'), errorMessage);
          process.exit(1);
        }
        
        if (options.json) {
          console.log(JSON.stringify(regime, null, 2));
          return;
        }
        
        displayRegime(regime);
      }
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(chalk.red('Unexpected error:'), errorMessage);
      process.exit(1);
    }
  });

  return regimeCommand;
}