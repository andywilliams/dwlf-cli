import { Command } from 'commander';
import chalk from 'chalk';
import Table from 'cli-table3';
import ora from 'ora';
import { DWLFApiClient } from './api-client';
import { getApiKey, getApiUrl, isAuthenticated } from './config';

export interface BriefingItem {
  symbol: string;
  regime?: string;
  fsmState?: string;
  price?: number;
  change?: number;
  changePercent?: number;
  signal?: string;
  summary?: string;
}

export interface BriefingResponse {
  date: string;
  items: BriefingItem[];
  generatedAt?: string;
}

/**
 * Format price with appropriate precision
 */
function formatPrice(price: number | undefined): string {
  if (price === undefined) return '-';
  
  if (price >= 1000) {
    return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  if (price >= 1) {
    return price.toFixed(2);
  }
  return price.toFixed(4);
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
 * Format regime with color coding
 */
function formatRegime(regime: string | undefined): string {
  if (!regime) return chalk.gray('-');
  
  const upperRegime = regime.toUpperCase();
  
  if (upperRegime.includes('BULL') || upperRegime.includes('UP')) {
    return chalk.green(regime);
  } else if (upperRegime.includes('BEAR') || upperRegime.includes('DOWN')) {
    return chalk.red(regime);
  } else if (upperRegime.includes('NEUTRAL') || upperRegime.includes('SIDEWAYS')) {
    return chalk.yellow(regime);
  }
  
  return chalk.cyan(regime);
}

/**
 * Format FSM state with color coding
 */
function formatFSMState(state: string | undefined): string {
  if (!state) return chalk.gray('-');
  
  const upperState = state.toUpperCase();
  
  if (upperState.includes('ACCUMULATION') || upperState.includes('MARKUP')) {
    return chalk.green(state);
  } else if (upperState.includes('DISTRIBUTION') || upperState.includes('MARKDOWN')) {
    return chalk.red(state);
  } else if (upperState.includes('NEUTRAL')) {
    return chalk.yellow(state);
  }
  
  return chalk.cyan(state);
}

/**
 * Format signal with color coding
 */
function formatSignal(signal: string | undefined): string {
  if (!signal) return chalk.gray('-');
  
  const upperSignal = signal.toUpperCase();
  
  if (upperSignal.includes('BUY') || upperSignal.includes('LONG')) {
    return chalk.green(signal);
  } else if (upperSignal.includes('SELL') || upperSignal.includes('SHORT')) {
    return chalk.red(signal);
  }
  
  return chalk.cyan(signal);
}

/**
 * Display briefing data in a table
 */
function displayBriefing(response: BriefingResponse, filterSymbol?: string): void {
  // Filter items if symbol is specified
  let items = response.items;
  if (filterSymbol) {
    items = items.filter(item => 
      item.symbol.toUpperCase() === filterSymbol.toUpperCase()
    );
    
    if (items.length === 0) {
      console.log(chalk.yellow(`⚠️  No briefing data found for ${filterSymbol}.`));
      return;
    }
  }
  
  // Display header
  const dateStr = response.date 
    ? new Date(response.date).toLocaleDateString('en-US', { 
        weekday: 'long', 
        month: 'long', 
        day: 'numeric',
        year: 'numeric'
      })
    : 'Today';
  
  console.log(chalk.bold.cyan(`\n📋 Daily Briefing: ${dateStr}`));
  console.log(chalk.gray('─'.repeat(70)));
  console.log();
  
  if (items.length === 0) {
    console.log(chalk.yellow('No briefing items available.'));
    return;
  }
  
  // Create table
  const table = new Table({
    head: [
      chalk.cyan('Symbol'),
      chalk.cyan('Price'),
      chalk.cyan('Change'),
      chalk.cyan('Regime'),
      chalk.cyan('FSM'),
      chalk.cyan('Signal')
    ],
    style: { head: [], border: ['grey'] },
    colWidths: [12, 12, 10, 16, 16, 12]
  });
  
  items.forEach(item => {
    table.push([
      chalk.bold(item.symbol),
      formatPrice(item.price),
      formatPercentage(item.changePercent),
      formatRegime(item.regime),
      formatFSMState(item.fsmState),
      formatSignal(item.signal)
    ]);
  });
  
  console.log(table.toString());
  
  // Display summaries if available
  const itemsWithSummary = items.filter(item => item.summary);
  if (itemsWithSummary.length > 0) {
    console.log();
    console.log(chalk.bold('📝 Summaries:'));
    
    itemsWithSummary.forEach(item => {
      console.log(chalk.cyan(`\n${item.symbol}:`));
      console.log(chalk.gray(`  ${item.summary}`));
    });
  }
  
  // Display timestamp
  if (response.generatedAt) {
    console.log(chalk.gray(`\nGenerated: ${new Date(response.generatedAt).toLocaleString()}`));
  }
  
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
 * Create and configure the briefing command
 */
export function createBriefingCommand(): Command {
  const briefingCommand = new Command('briefing')
    .description('Get daily briefing across all watchlist symbols')
    .option('--symbol <symbol>', 'filter to a specific symbol (e.g., BTC-USD)')
    .option('-j, --json', 'output as JSON');

  briefingCommand.action(async (options) => {
    try {
      const client = await createAuthenticatedClient();
      
      const spinner = ora('Fetching daily briefing...').start();
      let response: BriefingResponse;
      
      try {
        response = await client.get<BriefingResponse>('/v2/briefing/daily');
        spinner.stop();
      } catch (error: unknown) {
        spinner.stop();
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        
        // Handle 404 gracefully
        if ((error as { status?: number }).status === 404) {
          console.log(chalk.yellow('⚠️  No briefing data available.'));
          console.log(chalk.gray('Try adding symbols to your watchlist first: dwlf watchlist --add BTC-USD AAPL'));
          return;
        }
        
        console.error(chalk.red('Error:'), errorMessage);
        process.exit(1);
      }
      
      if (options.json) {
        console.log(JSON.stringify(response, null, 2));
        return;
      }
      
      displayBriefing(response, options.symbol);
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(chalk.red('Unexpected error:'), errorMessage);
      process.exit(1);
    }
  });

  return briefingCommand;
}