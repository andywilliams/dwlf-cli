import chalk from 'chalk';
import Table from 'cli-table3';
import sparkline from 'sparkline';

export type OutputFormat = 'table' | 'compact' | 'json' | 'csv';

export interface FormatOptions {
  format?: OutputFormat;
  colors?: boolean;
  precision?: number;
  showHeaders?: boolean;
}

export interface PriceData {
  symbol: string;
  price: number;
  change?: number;
  changePercent?: number;
  volume?: number;
  high?: number;
  low?: number;
  open?: number;
}

export interface TradeData {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  entryPrice: number;
  exitPrice?: number;
  pnl?: number;
  pnlPercent?: number;
  status: 'open' | 'closed' | 'cancelled';
  openedAt: string;
  closedAt?: string;
  stopLoss?: number;
  takeProfit?: number;
  notes?: string;
}

export interface SignalData {
  id: string;
  symbol: string;
  strategy: string;
  direction: 'long' | 'short';
  entryPrice: number;
  stopLoss?: number;
  takeProfit?: number;
  strength: number;
  status: 'active' | 'triggered' | 'expired';
  createdAt: string;
}

export interface PerformanceData {
  metric: string;
  value: number | string;
  comparison?: number;
  period: string;
}

// Color utility functions
export const formatPrice = (price: number, precision: number = 2, useColors: boolean = true): string => {
  const formatted = `$${price.toLocaleString(undefined, { minimumFractionDigits: precision, maximumFractionDigits: precision })}`;
  return useColors ? chalk.bold(formatted) : formatted;
};

export const formatChange = (change: number, changePercent: number, useColors: boolean = true): string => {
  const isPositive = change >= 0;
  const changeStr = `${isPositive ? '+' : ''}$${change.toFixed(2)}`;
  const percentStr = `${isPositive ? '+' : ''}${changePercent.toFixed(2)}%`;
  const fullStr = `${changeStr} (${percentStr})`;
  
  if (!useColors) return fullStr;
  
  return isPositive 
    ? chalk.green(fullStr)
    : chalk.red(fullStr);
};

export const formatPnL = (pnl: number, pnlPercent?: number, useColors: boolean = true): string => {
  const isPositive = pnl >= 0;
  const pnlStr = `${isPositive ? '+' : ''}$${Math.abs(pnl).toFixed(2)}`;
  const percentStr = pnlPercent ? ` (${isPositive ? '+' : ''}${pnlPercent.toFixed(2)}%)` : '';
  const fullStr = `${pnlStr}${percentStr}`;
  
  if (!useColors) return fullStr;
  
  return isPositive 
    ? chalk.bold.green(fullStr)
    : chalk.bold.red(fullStr);
};

export const formatStatus = (status: string, useColors: boolean = true): string => {
  if (!useColors) return status.toUpperCase();
  
  switch (status.toLowerCase()) {
    case 'open':
    case 'active':
      return chalk.green.bold(status.toUpperCase());
    case 'closed':
    case 'triggered':
      return chalk.blue.bold(status.toUpperCase());
    case 'cancelled':
    case 'expired':
      return chalk.red.bold(status.toUpperCase());
    default:
      return chalk.yellow.bold(status.toUpperCase());
  }
};

export const formatVolume = (volume: number): string => {
  if (volume >= 1e9) {
    return `${(volume / 1e9).toFixed(1)}B`;
  } else if (volume >= 1e6) {
    return `${(volume / 1e6).toFixed(1)}M`;
  } else if (volume >= 1e3) {
    return `${(volume / 1e3).toFixed(1)}K`;
  }
  return volume.toLocaleString();
};

export const formatSparkline = (data: number[], width: number = 20): string => {
  if (!data || data.length === 0) return ''.padEnd(width);
  
  try {
    // Normalize data to reasonable range for sparkline
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min;
    
    if (range === 0) return '─'.repeat(width);
    
    const normalized = data.map(value => Math.round(((value - min) / range) * 7));
    return sparkline(normalized).substring(0, width).padEnd(width);
  } catch (error) {
    return ''.padEnd(width);
  }
};

export const formatPercentage = (value: number, useColors: boolean = true): string => {
  const isPositive = value >= 0;
  const formatted = `${isPositive ? '+' : ''}${value.toFixed(2)}%`;
  
  if (!useColors) return formatted;
  
  return isPositive ? chalk.green(formatted) : chalk.red(formatted);
};

// Table formatters
export const formatPricesTable = (data: PriceData[], options: FormatOptions = {}): string => {
  const { colors = true } = options;
  
  const table = new Table({
    head: ['Symbol', 'Price', 'Change', 'Change %', 'Volume', 'High', 'Low'].map(h => 
      colors ? chalk.bold.cyan(h) : h
    ),
    colAligns: ['left', 'right', 'right', 'right', 'right', 'right', 'right'],
    style: { 
      head: colors ? ['cyan'] : [],
      border: colors ? ['grey'] : []
    }
  });

  data.forEach(item => {
    const symbol = colors ? chalk.bold(item.symbol) : item.symbol;
    const price = formatPrice(item.price, 2, colors);
    const change = item.change !== undefined 
      ? formatChange(item.change, item.changePercent || 0, colors)
      : 'N/A';
    const changePercent = item.changePercent !== undefined 
      ? formatPercentage(item.changePercent, colors)
      : 'N/A';
    const volume = item.volume ? formatVolume(item.volume) : 'N/A';
    const high = item.high ? formatPrice(item.high, 2, colors) : 'N/A';
    const low = item.low ? formatPrice(item.low, 2, colors) : 'N/A';

    table.push([symbol, price, change, changePercent, volume, high, low]);
  });

  return table.toString();
};

export const formatTradesTable = (data: TradeData[], options: FormatOptions = {}): string => {
  const { colors = true } = options;
  
  const table = new Table({
    head: ['ID', 'Symbol', 'Side', 'Qty', 'Entry', 'Exit', 'P&L', 'Status'].map(h => 
      colors ? chalk.bold.cyan(h) : h
    ),
    colAligns: ['left', 'left', 'center', 'right', 'right', 'right', 'right', 'center'],
    style: { 
      head: colors ? ['cyan'] : [],
      border: colors ? ['grey'] : []
    }
  });

  data.forEach(trade => {
    const id = trade.id.substring(0, 8);
    const symbol = colors ? chalk.bold(trade.symbol) : trade.symbol;
    const side = colors 
      ? (trade.side === 'buy' ? chalk.green('BUY') : chalk.red('SELL'))
      : trade.side.toUpperCase();
    const quantity = trade.quantity.toFixed(4);
    const entryPrice = formatPrice(trade.entryPrice, 2, colors);
    const exitPrice = trade.exitPrice ? formatPrice(trade.exitPrice, 2, colors) : 'N/A';
    const pnl = trade.pnl !== undefined 
      ? formatPnL(trade.pnl, trade.pnlPercent, colors)
      : 'N/A';
    const status = formatStatus(trade.status, colors);

    table.push([id, symbol, side, quantity, entryPrice, exitPrice, pnl, status]);
  });

  return table.toString();
};

export const formatSignalsTable = (data: SignalData[], options: FormatOptions = {}): string => {
  const { colors = true } = options;
  
  const table = new Table({
    head: ['Symbol', 'Strategy', 'Direction', 'Entry', 'SL', 'TP', 'Strength', 'Status'].map(h => 
      colors ? chalk.bold.cyan(h) : h
    ),
    colAligns: ['left', 'left', 'center', 'right', 'right', 'right', 'center', 'center'],
    style: { 
      head: colors ? ['cyan'] : [],
      border: colors ? ['grey'] : []
    }
  });

  data.forEach(signal => {
    const symbol = colors ? chalk.bold(signal.symbol) : signal.symbol;
    const strategy = signal.strategy;
    const direction = colors 
      ? (signal.direction === 'long' ? chalk.green('LONG') : chalk.red('SHORT'))
      : signal.direction.toUpperCase();
    const entryPrice = formatPrice(signal.entryPrice, 2, colors);
    const stopLoss = signal.stopLoss ? formatPrice(signal.stopLoss, 2, colors) : 'N/A';
    const takeProfit = signal.takeProfit ? formatPrice(signal.takeProfit, 2, colors) : 'N/A';
    const strength = colors 
      ? (signal.strength >= 7 
          ? chalk.green.bold(`${signal.strength}/10`)
          : signal.strength >= 4 
            ? chalk.yellow.bold(`${signal.strength}/10`)
            : chalk.red.bold(`${signal.strength}/10`))
      : `${signal.strength}/10`;
    const status = formatStatus(signal.status, colors);

    table.push([symbol, strategy, direction, entryPrice, stopLoss, takeProfit, strength, status]);
  });

  return table.toString();
};

export const formatPerformanceTable = (data: PerformanceData[], options: FormatOptions = {}): string => {
  const { colors = true } = options;
  
  const table = new Table({
    head: ['Metric', 'Value', 'Period'].map(h => 
      colors ? chalk.bold.cyan(h) : h
    ),
    colAligns: ['left', 'right', 'center'],
    style: { 
      head: colors ? ['cyan'] : [],
      border: colors ? ['grey'] : []
    }
  });

  data.forEach(perf => {
    const metric = perf.metric;
    let value: string;
    
    if (typeof perf.value === 'number') {
      if (metric.toLowerCase().includes('return') || metric.toLowerCase().includes('pnl')) {
        value = formatPnL(perf.value, undefined, colors);
      } else if (metric.toLowerCase().includes('rate') || metric.toLowerCase().includes('ratio')) {
        value = formatPercentage(perf.value, colors);
      } else {
        value = perf.value.toLocaleString();
      }
    } else {
      value = String(perf.value);
    }
    
    const period = perf.period;

    table.push([metric, value, period]);
  });

  return table.toString();
};

// Compact formatters
export const formatPricesCompact = (data: PriceData[], options: FormatOptions = {}): string => {
  const { colors = true } = options;
  
  return data.map(item => {
    const symbol = colors ? chalk.cyan.bold(item.symbol) : item.symbol;
    const price = formatPrice(item.price, 2, colors);
    const changeInfo = item.change !== undefined 
      ? ` ${formatChange(item.change, item.changePercent || 0, colors)}`
      : '';
    
    return `${symbol}: ${price}${changeInfo}`;
  }).join('\n');
};

export const formatTradesCompact = (data: TradeData[], options: FormatOptions = {}): string => {
  const { colors = true } = options;
  
  return data.map(trade => {
    const symbol = colors ? chalk.bold(trade.symbol) : trade.symbol;
    const side = colors 
      ? (trade.side === 'buy' ? chalk.green('BUY') : chalk.red('SELL'))
      : trade.side.toUpperCase();
    const pnl = trade.pnl !== undefined 
      ? ` ${formatPnL(trade.pnl, trade.pnlPercent, colors)}`
      : '';
    const status = formatStatus(trade.status, colors);
    
    return `${symbol} ${side} @${formatPrice(trade.entryPrice, 2, colors)}${pnl} [${status}]`;
  }).join('\n');
};

// CSV formatters
export const formatPricesCSV = (data: PriceData[]): string => {
  const headers = ['Symbol', 'Price', 'Change', 'ChangePercent', 'Volume', 'High', 'Low'];
  const rows = data.map(item => [
    item.symbol,
    item.price,
    item.change || '',
    item.changePercent || '',
    item.volume || '',
    item.high || '',
    item.low || ''
  ]);
  
  return [headers, ...rows].map(row => row.join(',')).join('\n');
};

export const formatTradesCSV = (data: TradeData[]): string => {
  const headers = ['ID', 'Symbol', 'Side', 'Quantity', 'EntryPrice', 'ExitPrice', 'PnL', 'PnLPercent', 'Status', 'OpenedAt', 'ClosedAt'];
  const rows = data.map(trade => [
    trade.id,
    trade.symbol,
    trade.side,
    trade.quantity,
    trade.entryPrice,
    trade.exitPrice || '',
    trade.pnl || '',
    trade.pnlPercent || '',
    trade.status,
    trade.openedAt,
    trade.closedAt || ''
  ]);
  
  return [headers, ...rows].map(row => row.join(',')).join('\n');
};

// JSON formatter
export const formatJSON = (data: unknown, pretty: boolean = true): string => {
  return JSON.stringify(data, null, pretty ? 2 : 0);
};

// Main formatter function
export const formatData = (
  data: unknown, 
  type: 'prices' | 'trades' | 'signals' | 'performance', 
  options: FormatOptions = {}
): string => {
  const format = options.format || 'table';
  
  switch (type) {
    case 'prices':
      switch (format) {
        case 'compact': return formatPricesCompact(data, options);
        case 'csv': return formatPricesCSV(data);
        case 'json': return formatJSON(data);
        default: return formatPricesTable(data, options);
      }
    
    case 'trades':
      switch (format) {
        case 'compact': return formatTradesCompact(data, options);
        case 'csv': return formatTradesCSV(data);
        case 'json': return formatJSON(data);
        default: return formatTradesTable(data, options);
      }
    
    case 'signals':
      switch (format) {
        case 'compact': return data.map((s: SignalData) => 
          `${s.symbol} ${s.direction.toUpperCase()} @${formatPrice(s.entryPrice, 2, options.colors)} [${s.strategy}]`
        ).join('\n');
        case 'csv': return formatJSON(data); // TODO: implement CSV for signals
        case 'json': return formatJSON(data);
        default: return formatSignalsTable(data, options);
      }
    
    case 'performance':
      switch (format) {
        case 'compact': return data.map((p: PerformanceData) => 
          `${p.metric}: ${p.value} (${p.period})`
        ).join('\n');
        case 'csv': return formatJSON(data); // TODO: implement CSV for performance
        case 'json': return formatJSON(data);
        default: return formatPerformanceTable(data, options);
      }
    
    default:
      return formatJSON(data);
  }
};

// Progress indicators
export const createProgressBar = (current: number, total: number, width: number = 20, useColors: boolean = true): string => {
  const percentage = Math.min(current / total, 1);
  const filled = Math.round(width * percentage);
  const empty = width - filled;
  
  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  const percent = `${Math.round(percentage * 100)}%`;
  
  if (!useColors) return `[${bar}] ${percent}`;
  
  return `[${chalk.green('█'.repeat(filled))}${chalk.grey('░'.repeat(empty))}] ${chalk.bold(percent)}`;
};

// Status indicators
export const formatHealthStatus = (status: 'healthy' | 'warning' | 'error', message?: string, useColors: boolean = true): string => {
  const indicators = {
    healthy: useColors ? chalk.green('✓') : '✓',
    warning: useColors ? chalk.yellow('⚠') : '⚠',
    error: useColors ? chalk.red('✗') : '✗'
  };
  
  const indicator = indicators[status];
  return message ? `${indicator} ${message}` : indicator;
};