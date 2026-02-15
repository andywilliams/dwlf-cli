import { Command } from 'commander';
import chalk from 'chalk';
import Table from 'cli-table3';
import ora from 'ora';
import { DWLFApiClient, normalizeSymbol } from './api-client';
import { getApiKey, getApiUrl, isAuthenticated } from './config';
import { IndicatorsApiResponse, TrendlinesApiResponse, SupportResistanceApiResponse } from './types';

export interface IndicatorValue {
  name: string;
  value: number | string;
  signal?: 'bullish' | 'bearish' | 'neutral';
  description?: string;
}

export interface TrendlineData {
  type: 'support' | 'resistance' | 'trend';
  slope: number;
  yIntercept: number;
  touchPoints: Array<{ date: string; price: number }>;
  strength: number;
  isActive: boolean;
}

export interface SupportResistanceLevel {
  price: number;
  type: 'support' | 'resistance';
  strength: number;
  touchCount: number;
  lastTouch?: string;
}

export interface IndicatorData {
  symbol: string;
  interval: string;
  timestamp: string;
  indicators: {
    rsi?: { value: number; signal: string; overbought: boolean; oversold: boolean };
    macd?: { 
      macd: number; 
      signal: number; 
      histogram: number; 
      trend: string; 
      crossover?: string 
    };
    movingAverages?: {
      sma20?: number;
      sma50?: number;
      sma200?: number;
      ema21?: number;
      ema50?: number;
      alignment?: string;
    };
    bollingerBands?: {
      upper: number;
      middle: number;
      lower: number;
      position: string;
      squeeze?: boolean;
    };
    stochastic?: {
      k: number;
      d: number;
      signal: string;
    };
    atr?: {
      value: number;
      volatility: string;
    };
  };
}

/**
 * Create ASCII chart for RSI values
 */
function createRSIChart(rsi: number): string {
  const width = 20;
  const filled = Math.round((rsi / 100) * width);
  const empty = width - filled;
  
  let chart = '│';
  chart += '█'.repeat(filled);
  chart += '─'.repeat(empty);
  chart += '│';
  
  // Color coding
  if (rsi > 70) {
    return chalk.red(chart) + ` ${rsi.toFixed(1)}% (Overbought)`;
  } else if (rsi < 30) {
    return chalk.green(chart) + ` ${rsi.toFixed(1)}% (Oversold)`;
  } else {
    return chalk.yellow(chart) + ` ${rsi.toFixed(1)}% (Neutral)`;
  }
}

/**
 * Create ASCII chart for MACD histogram
 */
function createMACDChart(histogram: number, maxHist: number = 5): string {
  const width = 10;
  const normalized = Math.max(-1, Math.min(1, histogram / maxHist));
  const center = Math.floor(width / 2);
  
  let chart = '';
  for (let i = 0; i < width; i++) {
    if (normalized > 0 && i >= center && i < center + Math.round(normalized * center)) {
      chart += '▲';
    } else if (normalized < 0 && i <= center && i > center + Math.round(normalized * center)) {
      chart += '▼';
    } else {
      chart += '─';
    }
  }
  
  const color = histogram > 0 ? chalk.green : chalk.red;
  return color(chart) + ` ${histogram.toFixed(4)}`;
}

/**
 * Format indicator signal with appropriate color
 */
function formatSignal(signal: string): string {
  switch (signal.toLowerCase()) {
    case 'bullish':
    case 'buy':
    case 'strong_buy':
      return chalk.green('🟢 ' + signal);
    case 'bearish':
    case 'sell':
    case 'strong_sell':
      return chalk.red('🔴 ' + signal);
    case 'neutral':
    case 'hold':
      return chalk.yellow('🟡 ' + signal);
    default:
      return chalk.gray(signal);
  }
}

/**
 * Format price with appropriate precision
 */
function formatPrice(price: number): string {
  if (price >= 1000) {
    return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  if (price >= 1) {
    return price.toFixed(4);
  }
  return price.toFixed(6);
}

/**
 * Fetch indicators data from API
 */
async function fetchIndicators(
  client: DWLFApiClient, 
  symbol: string, 
  interval: string = '1d'
): Promise<IndicatorData> {
  try {
    const normalizedSymbol = normalizeSymbol(symbol);
    const response = await client.get<IndicatorsApiResponse>(`/chart-indicators/${normalizedSymbol}`, { interval });
    
    return {
      symbol: normalizedSymbol,
      interval,
      timestamp: new Date().toISOString(),
      indicators: response || {}
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error(`Failed to fetch indicators: ${errorMessage}`);
  }
}

/**
 * Fetch trendlines from API
 */
async function fetchTrendlines(client: DWLFApiClient, symbol: string): Promise<TrendlineData[]> {
  try {
    const normalizedSymbol = normalizeSymbol(symbol);
    const response = await client.get<TrendlinesApiResponse>(`/trendlines/${normalizedSymbol}`);
    return response.trendlines || [];
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error(`Failed to fetch trendlines: ${errorMessage}`);
  }
}

/**
 * Fetch support/resistance levels from API
 */
async function fetchSupportResistance(client: DWLFApiClient, symbol: string): Promise<SupportResistanceLevel[]> {
  try {
    const normalizedSymbol = normalizeSymbol(symbol);
    const response = await client.get<SupportResistanceApiResponse>(`/support-resistance/${normalizedSymbol}`);
    return response.levels || [];
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error(`Failed to fetch support/resistance levels: ${errorMessage}`);
  }
}

/**
 * Display indicators overview
 */
function displayIndicatorsOverview(data: IndicatorData): void {
  console.log(chalk.bold(`\n📊 Technical Indicators: ${data.symbol}`));
  console.log(chalk.gray(`Timeframe: ${data.interval.toUpperCase()} | Updated: ${new Date(data.timestamp).toLocaleString()}`));
  console.log(chalk.gray('─'.repeat(60)));

  const { indicators } = data;

  // RSI Section
  if (indicators.rsi) {
    console.log(chalk.bold('\n🎯 RSI (Relative Strength Index)'));
    console.log(`   ${createRSIChart(indicators.rsi.value)}`);
    console.log(`   Signal: ${formatSignal(indicators.rsi.signal)}`);
  }

  // MACD Section
  if (indicators.macd) {
    console.log(chalk.bold('\n📈 MACD (Moving Average Convergence Divergence)'));
    console.log(`   MACD: ${indicators.macd.macd.toFixed(4)} | Signal: ${indicators.macd.signal.toFixed(4)}`);
    console.log(`   Histogram: ${createMACDChart(indicators.macd.histogram)}`);
    console.log(`   Trend: ${formatSignal(indicators.macd.trend)}`);
    if (indicators.macd.crossover) {
      console.log(`   Crossover: ${formatSignal(indicators.macd.crossover)}`);
    }
  }

  // Moving Averages Section
  if (indicators.movingAverages) {
    const ma = indicators.movingAverages;
    console.log(chalk.bold('\n📊 Moving Averages'));
    
    const table = new Table({
      head: [chalk.cyan('Type'), chalk.cyan('Value'), chalk.cyan('Period')],
      style: { head: [], border: [] }
    });
    
    if (ma.sma20) table.push(['SMA', formatPrice(ma.sma20), '20']);
    if (ma.sma50) table.push(['SMA', formatPrice(ma.sma50), '50']);
    if (ma.sma200) table.push(['SMA', formatPrice(ma.sma200), '200']);
    if (ma.ema21) table.push(['EMA', formatPrice(ma.ema21), '21']);
    if (ma.ema50) table.push(['EMA', formatPrice(ma.ema50), '50']);
    
    console.log(table.toString());
    
    if (ma.alignment) {
      console.log(`   Alignment: ${formatSignal(ma.alignment)}`);
    }
  }

  // Bollinger Bands Section
  if (indicators.bollingerBands) {
    const bb = indicators.bollingerBands;
    console.log(chalk.bold('\n🎈 Bollinger Bands'));
    console.log(`   Upper: ${formatPrice(bb.upper)}`);
    console.log(`   Middle: ${formatPrice(bb.middle)} (SMA 20)`);
    console.log(`   Lower: ${formatPrice(bb.lower)}`);
    console.log(`   Position: ${formatSignal(bb.position)}`);
    if (bb.squeeze) {
      console.log(`   ${chalk.hex('#FFA500')('⚡ Bollinger Squeeze Detected!')}`);
    }
  }

  // Stochastic Section
  if (indicators.stochastic) {
    const stoch = indicators.stochastic;
    console.log(chalk.bold('\n🌊 Stochastic Oscillator'));
    console.log(`   %K: ${stoch.k.toFixed(2)}% | %D: ${stoch.d.toFixed(2)}%`);
    console.log(`   Signal: ${formatSignal(stoch.signal)}`);
  }

  // ATR Section
  if (indicators.atr) {
    console.log(chalk.bold('\n📏 Average True Range (ATR)'));
    console.log(`   Value: ${indicators.atr.value.toFixed(4)}`);
    console.log(`   Volatility: ${formatSignal(indicators.atr.volatility)}`);
  }
}

/**
 * Display specific indicator details
 */
function displaySpecificIndicator(data: IndicatorData, indicatorName: string): void {
  const { indicators } = data;
  const name = indicatorName.toLowerCase();

  console.log(chalk.bold(`\n📊 ${indicatorName.toUpperCase()}: ${data.symbol}`));
  console.log(chalk.gray(`Timeframe: ${data.interval.toUpperCase()} | Updated: ${new Date(data.timestamp).toLocaleString()}`));
  console.log(chalk.gray('─'.repeat(50)));

  switch (name) {
    case 'rsi':
      if (indicators.rsi) {
        console.log(`\n${createRSIChart(indicators.rsi.value)}`);
        console.log(`\nCurrent Value: ${chalk.cyan(indicators.rsi.value.toFixed(2))}`);
        console.log(`Signal: ${formatSignal(indicators.rsi.signal)}`);
        console.log(`Overbought (>70): ${indicators.rsi.overbought ? chalk.red('YES') : chalk.green('NO')}`);
        console.log(`Oversold (<30): ${indicators.rsi.oversold ? chalk.green('YES') : chalk.red('NO')}`);
        
        console.log(chalk.dim('\nInterpretation:'));
        console.log(chalk.dim('• RSI > 70: Potentially overbought, watch for reversal'));
        console.log(chalk.dim('• RSI < 30: Potentially oversold, watch for bounce'));
        console.log(chalk.dim('• RSI 30-70: Normal trading range'));
      } else {
        console.log(chalk.yellow('RSI data not available for this symbol/timeframe'));
      }
      break;

    case 'macd':
      if (indicators.macd) {
        const macd = indicators.macd;
        console.log(`\nMACD Line: ${chalk.cyan(macd.macd.toFixed(4))}`);
        console.log(`Signal Line: ${chalk.yellow(macd.signal.toFixed(4))}`);
        console.log(`Histogram: ${createMACDChart(macd.histogram)}`);
        console.log(`Trend: ${formatSignal(macd.trend)}`);
        
        if (macd.crossover) {
          console.log(`Recent Crossover: ${formatSignal(macd.crossover)}`);
        }

        console.log(chalk.dim('\nInterpretation:'));
        console.log(chalk.dim('• MACD > Signal: Bullish momentum'));
        console.log(chalk.dim('• MACD < Signal: Bearish momentum'));
        console.log(chalk.dim('• Histogram > 0: Momentum increasing'));
        console.log(chalk.dim('• Histogram < 0: Momentum decreasing'));
      } else {
        console.log(chalk.yellow('MACD data not available for this symbol/timeframe'));
      }
      break;

    case 'bb':
    case 'bollinger':
      if (indicators.bollingerBands) {
        const bb = indicators.bollingerBands;
        console.log(`\nUpper Band: ${chalk.red(formatPrice(bb.upper))}`);
        console.log(`Middle Band: ${chalk.yellow(formatPrice(bb.middle))} (SMA 20)`);
        console.log(`Lower Band: ${chalk.green(formatPrice(bb.lower))}`);
        console.log(`Position: ${formatSignal(bb.position)}`);
        
        if (bb.squeeze) {
          console.log(chalk.hex('#FFA500')('\n⚡ BOLLINGER SQUEEZE DETECTED!'));
          console.log(chalk.dim('Low volatility period - expect a breakout soon'));
        }

        console.log(chalk.dim('\nInterpretation:'));
        console.log(chalk.dim('• Price near upper band: Potential resistance'));
        console.log(chalk.dim('• Price near lower band: Potential support'));
        console.log(chalk.dim('• Squeeze: Low volatility, breakout coming'));
        console.log(chalk.dim('• Expansion: High volatility period'));
      } else {
        console.log(chalk.yellow('Bollinger Bands data not available for this symbol/timeframe'));
      }
      break;

    default:
      console.log(chalk.red(`Unknown indicator: ${indicatorName}`));
      console.log(chalk.dim('Available indicators: rsi, macd, bb/bollinger'));
      break;
  }
}

/**
 * Display trendlines information
 */
function displayTrendlines(symbol: string, trendlines: TrendlineData[]): void {
  console.log(chalk.bold(`\n📈 Trendlines: ${symbol}`));
  console.log(chalk.gray('─'.repeat(50)));

  if (trendlines.length === 0) {
    console.log(chalk.yellow('No active trendlines detected for this symbol'));
    return;
  }

  const table = new Table({
    head: [
      chalk.cyan('Type'),
      chalk.cyan('Slope'),
      chalk.cyan('Strength'),
      chalk.cyan('Touches'),
      chalk.cyan('Status')
    ],
    style: { head: [], border: [] }
  });

  trendlines.forEach(line => {
    const typeColor = line.type === 'support' ? chalk.green : 
                     line.type === 'resistance' ? chalk.red : chalk.blue;
    const slopeDirection = line.slope > 0 ? '↗️' : line.slope < 0 ? '↘️' : '→';
    const status = line.isActive ? chalk.green('Active') : chalk.gray('Inactive');
    
    table.push([
      typeColor(line.type.toUpperCase()),
      `${slopeDirection} ${line.slope.toFixed(4)}`,
      `${line.strength.toFixed(1)}/10`,
      line.touchPoints.length.toString(),
      status
    ]);
  });

  console.log(table.toString());

  // Show active trendlines details
  const activeTrendlines = trendlines.filter(t => t.isActive);
  if (activeTrendlines.length > 0) {
    console.log(chalk.bold('\n🎯 Active Trendlines:'));
    activeTrendlines.forEach((line, index) => {
      console.log(`\n${index + 1}. ${line.type.toUpperCase()} Line`);
      console.log(`   Strength: ${line.strength.toFixed(1)}/10`);
      console.log(`   Touch Points: ${line.touchPoints.length}`);
      if (line.touchPoints.length > 0) {
        const lastTouch = line.touchPoints[line.touchPoints.length - 1];
        if (lastTouch && lastTouch.date && lastTouch.price !== undefined) {
          console.log(`   Last Touch: ${formatPrice(lastTouch.price)} on ${new Date(lastTouch.date).toLocaleDateString()}`);
        }
      }
    });
  }
}

/**
 * Display support/resistance levels
 */
function displaySupportResistance(symbol: string, levels: SupportResistanceLevel[]): void {
  console.log(chalk.bold(`\n🎯 Support & Resistance: ${symbol}`));
  console.log(chalk.gray('─'.repeat(50)));

  if (levels.length === 0) {
    console.log(chalk.yellow('No significant support/resistance levels detected'));
    return;
  }

  // Sort by price (resistance high to low, support low to high)
  const supportLevels = levels.filter(l => l.type === 'support').sort((a, b) => b.price - a.price);
  const resistanceLevels = levels.filter(l => l.type === 'resistance').sort((a, b) => a.price - b.price);

  if (resistanceLevels.length > 0) {
    console.log(chalk.bold('\n🔴 Resistance Levels:'));
    const resistanceTable = new Table({
      head: [chalk.cyan('Price'), chalk.cyan('Strength'), chalk.cyan('Touches'), chalk.cyan('Last Touch')],
      style: { head: [], border: [] }
    });

    resistanceLevels.forEach(level => {
      resistanceTable.push([
        chalk.red(formatPrice(level.price)),
        `${level.strength.toFixed(1)}/10`,
        level.touchCount.toString(),
        level.lastTouch && level.lastTouch !== undefined ? new Date(level.lastTouch).toLocaleDateString() : '-'
      ]);
    });

    console.log(resistanceTable.toString());
  }

  if (supportLevels.length > 0) {
    console.log(chalk.bold('\n🟢 Support Levels:'));
    const supportTable = new Table({
      head: [chalk.cyan('Price'), chalk.cyan('Strength'), chalk.cyan('Touches'), chalk.cyan('Last Touch')],
      style: { head: [], border: [] }
    });

    supportLevels.forEach(level => {
      supportTable.push([
        chalk.green(formatPrice(level.price)),
        `${level.strength.toFixed(1)}/10`,
        level.touchCount.toString(),
        level.lastTouch && level.lastTouch !== undefined ? new Date(level.lastTouch).toLocaleDateString() : '-'
      ]);
    });

    console.log(supportTable.toString());
  }

  // Key level analysis
  const strongLevels = levels.filter(l => l.strength >= 7);
  if (strongLevels.length > 0) {
    console.log(chalk.bold('\n⭐ Key Levels (Strength ≥ 7.0):'));
    strongLevels.forEach(level => {
      const color = level.type === 'support' ? chalk.green : chalk.red;
      console.log(`   ${color(`${level.type.toUpperCase()}: ${formatPrice(level.price)}`)} (${level.strength.toFixed(1)}/10)`);
    });
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
    rateLimit: { requests: 10, per: 1000 }
  });
}

/**
 * Create and configure the indicators command
 */
export function createIndicatorsCommand(): Command {
  const indicatorsCommand = new Command('indicators')
    .description('View technical indicators, trendlines, and support/resistance levels')
    .argument('<symbol>', 'trading symbol (e.g., BTC-USD, AAPL, TSLA)')
    .option('--indicator <type>', 'show specific indicator (rsi, macd, bb)')
    .option('--interval <timeframe>', 'chart interval (1d, 4h, 1h)', '1d')
    .option('--trendlines', 'show detected trendlines')
    .option('--levels', 'show support/resistance levels')
    .option('--all', 'show all available indicator data');

  indicatorsCommand.action(async (symbol, options) => {
    try {
      const client = await createAuthenticatedClient();
      const normalizedSymbol = normalizeSymbol(symbol);

      // Validate interval
      const validIntervals = ['1d', '4h', '1h'];
      if (!validIntervals.includes(options.interval)) {
        console.log(chalk.red(`Invalid interval: ${options.interval}`));
        console.log(chalk.gray(`Valid intervals: ${validIntervals.join(', ')}`));
        process.exit(1);
      }

      // If specific requests are made
      if (options.trendlines) {
        const spinner = ora('Fetching trendlines...').start();
        try {
          const trendlines = await fetchTrendlines(client, symbol);
          spinner.stop();
          displayTrendlines(normalizedSymbol, trendlines);
        } catch (error: unknown) {
          spinner.stop();
          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
          console.error(chalk.red('Error:'), errorMessage);
          process.exit(1);
        }
        return;
      }

      if (options.levels) {
        const spinner = ora('Fetching support/resistance levels...').start();
        try {
          const levels = await fetchSupportResistance(client, symbol);
          spinner.stop();
          displaySupportResistance(normalizedSymbol, levels);
        } catch (error: unknown) {
          spinner.stop();
          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
          console.error(chalk.red('Error:'), errorMessage);
          process.exit(1);
        }
        return;
      }

      // Fetch indicators data
      const spinner = ora(`Fetching indicators for ${normalizedSymbol}...`).start();
      let indicatorData: IndicatorData;

      try {
        indicatorData = await fetchIndicators(client, symbol, options.interval);
        spinner.stop();
      } catch (error: unknown) {
        spinner.stop();
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        console.error(chalk.red('Error:'), errorMessage);
        process.exit(1);
      }

      // Display specific indicator or overview
      if (options.indicator) {
        displaySpecificIndicator(indicatorData, options.indicator);
      } else {
        displayIndicatorsOverview(indicatorData);
      }

      // Show all additional data if requested
      if (options.all) {
        try {
          const [trendlines, levels] = await Promise.all([
            fetchTrendlines(client, symbol),
            fetchSupportResistance(client, symbol)
          ]);
          
          displayTrendlines(normalizedSymbol, trendlines);
          displaySupportResistance(normalizedSymbol, levels);
        } catch (error: unknown) {
          console.log(chalk.yellow('\nNote: Could not fetch additional data - some features may not be available for this symbol'));
        }
      }

      // Show helpful tips
      if (!options.indicator && !options.all) {
        console.log(chalk.dim('\nTips:'));
        console.log(chalk.dim('  --indicator rsi     Show detailed RSI analysis'));
        console.log(chalk.dim('  --indicator macd    Show detailed MACD analysis'));
        console.log(chalk.dim('  --trendlines        Show detected trendlines'));
        console.log(chalk.dim('  --levels            Show support/resistance levels'));
        console.log(chalk.dim('  --all               Show everything'));
        console.log(chalk.dim('  --interval 4h       Use 4-hour timeframe'));
      }

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error(chalk.red('Unexpected error:'), errorMessage);
      process.exit(1);
    }
  });

  return indicatorsCommand;
}