import { Command } from 'commander';
import chalk from 'chalk';
import Table from 'cli-table3';
import ora from 'ora';
import { DWLFApiClient } from './api-client';
import { getApiKey, getApiUrl, isAuthenticated } from './config';

export interface SupportResistanceLevel {
  price: number;
  type: 'support' | 'resistance';
  strength: number;
}

export interface ActiveEvent {
  eventType: string;
  description: string;
  timestamp: string;
}

export interface IntelligenceData {
  symbol: string;
  price?: number;
  change?: number;
  changePercent?: number;
  regime?: {
    trend: string;
    cycle: string;
    momentum: string;
    volatility: string;
  };
  fsmState?: string;
  activeEvents?: ActiveEvent[];
  supportResistance?: {
    support: number[];
    resistance: number[];
  };
  timestamp?: string;
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
    return price.toFixed(4);
  }
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
 * Format regime value with color coding
 */
function formatRegimeValue(value: string | undefined): string {
  if (!value) return chalk.gray('-');
  
  const upperValue = value.toUpperCase();
  
  if (upperValue.includes('BULL') || upperValue.includes('UP')) {
    return chalk.green(value);
  } else if (upperValue.includes('BEAR') || upperValue.includes('DOWN')) {
    return chalk.red(value);
  } else if (upperValue.includes('NEUTRAL') || upperValue.includes('SIDEWAYS')) {
    return chalk.yellow(value);
  }
  
  return chalk.cyan(value);
}

/**
 * Display FSM state with color coding
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
 * Display intelligence data in a formatted way
 */
function displayIntelligence(data: IntelligenceData): void {
  console.log(chalk.bold.cyan(`\n🧠 Intelligence Snapshot: ${data.symbol}`));
  console.log(chalk.gray('─'.repeat(60)));
  console.log();
  
  // Price section
  if (data.price !== undefined) {
    console.log(chalk.bold('💰 Price'));
    const priceRow = new Table({
      colAligns: ['left', 'right'],
      style: { head: [], border: ['grey'] }
    });
    
    priceRow.push(
      ['Current', chalk.cyan(formatPrice(data.price))],
      ['Change', formatPercentage(data.changePercent)]
    );
    
    console.log(priceRow.toString());
    console.log();
  }
  
  // Regime section
  if (data.regime) {
    console.log(chalk.bold('📊 Market Regime'));
    const regimeTable = new Table({
      colAligns: ['left', 'left'],
      style: { head: [], border: ['grey'] }
    });
    
    regimeTable.push(
      [chalk.cyan('Trend'), formatRegimeValue(data.regime.trend)],
      [chalk.cyan('Cycle'), formatRegimeValue(data.regime.cycle)],
      [chalk.cyan('Momentum'), formatRegimeValue(data.regime.momentum)],
      [chalk.cyan('Volatility'), formatRegimeValue(data.regime.volatility)]
    );
    
    console.log(regimeTable.toString());
    console.log();
  }
  
  // FSM State section
  if (data.fsmState) {
    console.log(chalk.bold('🔄 FSM State'));
    console.log(`  ${formatFSMState(data.fsmState)}`);
    console.log();
  }
  
  // Support/Resistance section
  if (data.supportResistance) {
    console.log(chalk.bold('📈 Support & Resistance'));
    
    const srTable = new Table({
      head: [chalk.cyan('Support Levels'), chalk.cyan('Resistance Levels')],
      style: { head: [], border: ['grey'] }
    });
    
    const maxLevels = Math.max(
      data.supportResistance.support?.length || 0,
      data.supportResistance.resistance?.length || 0
    );
    
    const supportLevels = data.supportResistance.support || [];
    const resistanceLevels = data.supportResistance.resistance || [];
    
    for (let i = 0; i < maxLevels; i++) {
      const support = supportLevels[i] ? chalk.green(formatPrice(supportLevels[i])) : '';
      const resistance = resistanceLevels[i] ? chalk.red(formatPrice(resistanceLevels[i])) : '';
      srTable.push([support, resistance]);
    }
    
    console.log(srTable.toString());
    console.log();
  }
  
  // Active Events section
  if (data.activeEvents && data.activeEvents.length > 0) {
    console.log(chalk.bold('🎯 Active Events'));
    const eventsTable = new Table({
      head: [
        chalk.cyan('Type'),
        chalk.cyan('Description'),
        chalk.cyan('Timestamp')
      ],
      style: { head: [], border: ['grey'] }
    });
    
    data.activeEvents.forEach(event => {
      eventsTable.push([
        chalk.yellow(event.eventType),
        event.description,
        event.timestamp ? new Date(event.timestamp).toLocaleString() : '-'
      ]);
    });
    
    console.log(eventsTable.toString());
    console.log();
  }
  
  // Timestamp
  if (data.timestamp) {
    console.log(chalk.gray(`Last updated: ${new Date(data.timestamp).toLocaleString()}`));
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
 * Create and configure the intelligence command
 */
export function createIntelligenceCommand(): Command {
  const intelligenceCommand = new Command('intelligence')
    .description('Get full semantic snapshot for a symbol (price, regime, FSM state, events, S/R)')
    .argument('<symbol>', 'symbol to analyze (e.g., BTC-USD, AAPL)')
    .option('-j, --json', 'output as JSON');

  intelligenceCommand.action(async (symbol: string, options) => {
    try {
      const client = await createAuthenticatedClient();
      const normalizedSymbol = symbol.toUpperCase();
      
      const spinner = ora('Fetching intelligence data...').start();
      let data: IntelligenceData;
      
      try {
        data = await client.get<IntelligenceData>(`/v2/intelligence/${normalizedSymbol}`);
        spinner.stop();
      } catch (error: unknown) {
        spinner.stop();
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        
        // Handle 404 gracefully
        if ((error as { status?: number }).status === 404) {
          console.log(chalk.yellow(`⚠️  No intelligence data found for ${normalizedSymbol}.`));
          return;
        }
        
        console.error(chalk.red('Error:'), errorMessage);
        process.exit(1);
      }
      
      if (options.json) {
        console.log(JSON.stringify(data, null, 2));
        return;
      }
      
      displayIntelligence(data);
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(chalk.red('Unexpected error:'), errorMessage);
      process.exit(1);
    }
  });

  return intelligenceCommand;
}