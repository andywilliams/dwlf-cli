import { Command } from 'commander';
import chalk from 'chalk';
// Removed unused Table import
import ora from 'ora';
import { DWLFApiClient } from './api-client';
import { getApiKey, getApiUrl, isAuthenticated } from './config';

// Import sparkline for ASCII chart generation
import * as sparkline from 'sparkline';

export interface Candle {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface MarketDataResponse {
  candles: Candle[];
  symbol: string;
  timeframe: string;
  startDate: string;
  endDate: string;
}

export interface ChartOptions {
  symbol: string;
  timeframe?: string;
  period?: string;
  output?: 'ascii' | 'browser';
  showVolume?: boolean;
  showStats?: boolean;
}

/**
 * Available timeframes
 */
const TIMEFRAMES = ['1m', '5m', '15m', '1h', '4h', '1d', '1w'] as const;
type Timeframe = typeof TIMEFRAMES[number];

/**
 * Format number with appropriate precision for prices
 */
function formatPrice(price: number): string {
  if (price >= 1000) return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (price >= 1) return price.toFixed(4);
  return price.toFixed(6);
}

/**
 * Format volume with K/M/B suffixes
 */
function formatVolume(volume: number): string {
  if (volume >= 1e9) return (volume / 1e9).toFixed(1) + 'B';
  if (volume >= 1e6) return (volume / 1e6).toFixed(1) + 'M';
  if (volume >= 1e3) return (volume / 1e3).toFixed(1) + 'K';
  return volume.toFixed(0);
}

/**
 * Calculate price change and percentage
 */
function calculatePriceChange(candles: Candle[]): { change: number; changePercent: number } {
  if (candles.length < 2) return { change: 0, changePercent: 0 };
  
  const firstPrice = candles[0]?.close ?? 0;
  const lastPrice = candles[candles.length - 1]?.close ?? 0;
  const change = lastPrice - firstPrice;
  const changePercent = (change / firstPrice) * 100;
  
  return { change, changePercent };
}

/**
 * Calculate basic statistics
 */
function calculateStats(candles: Candle[]): {
  high: number;
  low: number;
  avgVolume: number;
  volatility: number;
} {
  if (candles.length === 0) {
    return { high: 0, low: 0, avgVolume: 0, volatility: 0 };
  }

  const high = Math.max(...candles.map(c => c.high));
  const low = Math.min(...candles.map(c => c.low));
  const avgVolume = candles.reduce((sum, c) => sum + c.volume, 0) / candles.length;
  
  // Calculate volatility as standard deviation of close prices
  const closes = candles.map(c => c.close);
  const avgClose = closes.reduce((sum, c) => sum + c, 0) / closes.length;
  const variance = closes.reduce((sum, c) => sum + Math.pow(c - avgClose, 2), 0) / closes.length;
  const volatility = Math.sqrt(variance) / avgClose * 100;

  return { high, low, avgVolume, volatility };
}

/**
 * Generate ASCII sparkline chart
 */
function generateSparkline(candles: Candle[], type: 'price' | 'volume' = 'price'): string {
  if (candles.length === 0) return '';
  
  const values = type === 'price' 
    ? candles.map(c => c.close)
    : candles.map(c => c.volume);
    
  try {
    return sparkline(values);
  } catch (error) {
    // Fallback to simple text representation if sparkline fails
    return values.map(() => '▄').join('');
  }
}

/**
 * Generate ASCII candlestick chart (simplified)
 */
function generateCandlestickChart(candles: Candle[], width: number = 60): string[] {
  if (candles.length === 0) return [];
  
  const stats = calculateStats(candles);
  const priceRange = stats.high - stats.low;
  const height = 10;
  
  // Sample candles to fit width
  const step = Math.max(1, Math.floor(candles.length / width));
  const sampledCandles = candles.filter((_, i) => i % step === 0);
  
  const lines: string[] = [];
  
  for (let row = height - 1; row >= 0; row--) {
    let line = '';
    const priceLevel = stats.low + (priceRange * row / height);
    
    for (const candle of sampledCandles) {
      const isGreen = candle.close >= candle.open;
      const bodyTop = Math.max(candle.open, candle.close);
      const bodyBottom = Math.min(candle.open, candle.close);
      
      let char = ' ';
      
      if (candle.high >= priceLevel && candle.low <= priceLevel) {
        if (bodyTop >= priceLevel && bodyBottom <= priceLevel) {
          // Body
          char = isGreen ? '█' : '█';
        } else {
          // Wick
          char = '│';
        }
      }
      
      line += isGreen ? chalk.green(char) : chalk.red(char);
    }
    
    lines.push(line + chalk.gray(` ${formatPrice(priceLevel)}`));
  }
  
  return lines;
}

/**
 * Fetch market data from the API
 */
async function fetchMarketData(
  client: DWLFApiClient, 
  symbol: string, 
  timeframe: string = '1d',
  period: string = '30d'
): Promise<MarketDataResponse> {
  try {
    // Calculate date range based on period
    const endDate = new Date();
    const startDate = new Date();
    
    // Parse period (e.g., '30d', '1w', '3m', '1y')
    const periodMatch = period.match(/^(\d+)([dwmy])$/);
    if (periodMatch && periodMatch[1] && periodMatch[2]) {
      const [, amount, unit] = periodMatch;
      const num = parseInt(amount!);
      
      switch (unit) {
        case 'd':
          startDate.setDate(startDate.getDate() - num);
          break;
        case 'w':
          startDate.setDate(startDate.getDate() - (num * 7));
          break;
        case 'm':
          startDate.setMonth(startDate.getMonth() - num);
          break;
        case 'y':
          startDate.setFullYear(startDate.getFullYear() - num);
          break;
      }
    } else {
      // Default to 30 days
      startDate.setDate(startDate.getDate() - 30);
    }
    
    const params = {
      timeframe,
      startDate: startDate.toISOString().split('T')[0] as string,
      endDate: endDate.toISOString().split('T')[0] as string
    };
    
    const response = await client.get<{ candles: Candle[] }>(`/market-data/${symbol.toUpperCase()}`, params);
    
    return {
      candles: response.candles || [],
      symbol: symbol.toUpperCase(),
      timeframe,
      startDate: params.startDate || '',
      endDate: params.endDate || ''
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to fetch market data for ${symbol}: ${message}`);
  }
}

/**
 * Display chart header with symbol info
 */
function displayChartHeader(data: MarketDataResponse): void {
  const { candles, symbol, timeframe } = data;
  const { change, changePercent } = calculatePriceChange(candles);
  
  if (candles.length === 0) {
    console.log(chalk.red(`❌ No data available for ${symbol}`));
    return;
  }
  
  const currentPrice = candles[candles.length - 1]?.close ?? 0;
  const changeColor = change >= 0 ? chalk.green : chalk.red;
  const changeSymbol = change >= 0 ? '+' : '';
  
  console.log(chalk.bold(`\n📈 ${symbol} (${timeframe.toUpperCase()})`));
  console.log(chalk.gray(`${data.startDate} to ${data.endDate}`));
  console.log(`Price: ${chalk.yellow(formatPrice(currentPrice))} ${changeColor(changeSymbol + formatPrice(change))} ${changeColor(`(${changeSymbol}${changePercent.toFixed(2)}%)`)}`);
}

/**
 * Display ASCII chart
 */
function displayASCIIChart(data: MarketDataResponse, options: ChartOptions): void {
  const { candles } = data;
  
  if (candles.length === 0) {
    console.log(chalk.yellow('📭 No chart data available.'));
    return;
  }
  
  // Price sparkline
  console.log(chalk.cyan('\nPrice Chart:'));
  const priceSparkline = generateSparkline(candles, 'price');
  console.log(chalk.yellow(priceSparkline));
  
  // Volume sparkline
  if (options.showVolume) {
    console.log(chalk.cyan('\nVolume Chart:'));
    const volumeSparkline = generateSparkline(candles, 'volume');
    console.log(chalk.blue(volumeSparkline));
  }
  
  // ASCII candlestick chart
  console.log(chalk.cyan('\nCandlestick Chart:'));
  const candlestickLines = generateCandlestickChart(candles);
  candlestickLines.forEach(line => console.log(line));
  
  console.log(chalk.gray('─'.repeat(70)));
}

/**
 * Display chart statistics
 */
function displayChartStats(data: MarketDataResponse): void {
  const { candles } = data;
  
  if (candles.length === 0) return;
  
  const stats = calculateStats(candles);
  
  console.log(chalk.bold('\n📊 Statistics:'));
  console.log(`High: ${chalk.green(formatPrice(stats.high))}`);
  console.log(`Low: ${chalk.red(formatPrice(stats.low))}`);
  console.log(`Avg Volume: ${chalk.blue(formatVolume(stats.avgVolume))}`);
  console.log(`Volatility: ${chalk.magenta(stats.volatility.toFixed(2) + '%')}`);
  console.log(`Data Points: ${chalk.cyan(candles.length)}`);
}

/**
 * Open browser chart (placeholder - would integrate with DWLF web interface)
 */
function openBrowserChart(symbol: string, timeframe: string): void {
  const url = `https://www.dwlf.co.uk/markets/${symbol}?timeframe=${timeframe}`;
  console.log(chalk.cyan(`\n🌐 Opening browser chart: ${url}`));
  console.log(chalk.gray('(In a real implementation, this would open your default browser)'));
  
  // In a real implementation, you could use:
  // const { spawn } = require('child_process');
  // spawn('open', [url]); // macOS
  // spawn('xdg-open', [url]); // Linux  
  // spawn('start', [url]); // Windows
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
    rateLimit: { requests: 5, per: 1000 } // Conservative rate limit for market data
  });
}

/**
 * Validate timeframe
 */
function validateTimeframe(timeframe: string): Timeframe {
  if (!TIMEFRAMES.includes(timeframe as Timeframe)) {
    throw new Error(`Invalid timeframe. Must be one of: ${TIMEFRAMES.join(', ')}`);
  }
  return timeframe as Timeframe;
}

/**
 * Create and configure the chart command
 */
export function createChartCommand(): Command {
  const chartCommand = new Command('chart')
    .description('Display ASCII charts and price visualization')
    .argument('<symbol>', 'symbol to chart (e.g., BTC-USD, AAPL)')
    .option('-t, --timeframe <timeframe>', `timeframe for chart data (${TIMEFRAMES.join(', ')})`, '1d')
    .option('-p, --period <period>', 'period of historical data (e.g., 7d, 1w, 1m, 3m, 1y)', '30d')
    .option('-v, --volume', 'show volume chart')
    .option('-s, --stats', 'show detailed statistics')
    .option('-b, --browser', 'open full chart in browser')
    .option('--ascii-only', 'force ASCII output even when browser is requested');

  chartCommand.action(async (symbol: string, options) => {
    try {
      // Validate timeframe
      let timeframe: Timeframe;
      try {
        timeframe = validateTimeframe(options.timeframe);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown validation error';
        console.error(chalk.red('Error:'), message);
        process.exit(1);
      }
      
      const chartOptions: ChartOptions = {
        symbol: symbol.toUpperCase(),
        timeframe,
        period: options.period,
        output: options.browser && !options.asciiOnly ? 'browser' : 'ascii',
        showVolume: options.volume,
        showStats: options.stats
      };
      
      // Create API client
      const client = await createAuthenticatedClient();
      
      // Fetch market data
      const spinner = ora(`Fetching chart data for ${chartOptions.symbol}...`).start();
      let data: MarketDataResponse;
      
      try {
        data = await fetchMarketData(client, chartOptions.symbol, timeframe, options.period);
        spinner.stop();
      } catch (error: unknown) {
        spinner.stop();
        const message = error instanceof Error ? error.message : 'Unknown data fetch error';
        console.error(chalk.red('Error:'), message);
        process.exit(1);
      }
      
      // Display chart header
      displayChartHeader(data);
      
      // Display based on output preference
      if (chartOptions.output === 'browser') {
        openBrowserChart(chartOptions.symbol, timeframe);
      }
      
      // Always show ASCII chart unless browser-only is specified
      if (chartOptions.output === 'ascii' || !options.browser) {
        displayASCIIChart(data, chartOptions);
      }
      
      // Show statistics if requested
      if (chartOptions.showStats) {
        displayChartStats(data);
      }
      
      // Show helpful tips
      if (!options.stats && !options.volume) {
        console.log(chalk.dim(`\nTip: Use --stats for detailed statistics, --volume for volume chart, --browser for full web chart`));
      }
      
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown unexpected error';
      console.error(chalk.red('Unexpected error:'), message);
      process.exit(1);
    }
  });

  return chartCommand;
}