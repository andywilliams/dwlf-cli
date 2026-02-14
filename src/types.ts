/**
 * Common type definitions for DWLF API responses
 */

export interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface MarketDataResponse {
  symbol: string;
  timeframe: string;
  candles: Candle[];
}

export interface SignalResponse {
  signalId: string;
  strategyId: string;
  symbol: string;
  timestamp: number;
  price: number;
  side: 'long' | 'short';
  confidence?: number;
  metadata?: Record<string, unknown>;
}

export interface StrategyResponse {
  strategyId: string;
  name: string;
  description?: string;
  createdAt: string;
  createdBy: string;
  isActive: boolean;
  symbols?: string[];
  config?: Record<string, unknown>;
}

export interface BacktestResponse {
  backtestId: string;
  strategyId: string;
  symbols: string[];
  startDate: string;
  endDate: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  results?: BacktestResults;
}

export interface BacktestResults {
  totalTrades: number;
  winRate: number;
  totalReturn: number;
  maxDrawdown: number;
  sharpeRatio?: number;
  profitFactor?: number;
  trades: BacktestTrade[];
}

export interface BacktestTrade {
  symbol: string;
  entryDate: string;
  exitDate: string;
  entryPrice: number;
  exitPrice: number;
  side: 'long' | 'short';
  pnl: number;
  pnlPct: number;
}

export interface Trade {
  tradeId: string;
  symbol: string;
  side: 'long' | 'short';
  entryPrice: number;
  exitPrice?: number;
  quantity: number;
  status: 'open' | 'closed';
  entryDate: string;
  exitDate?: string;
  pnl?: number;
  pnlPct?: number;
}

export interface EventResponse {
  eventId: string;
  eventType: string;
  symbol: string;
  timestamp: number;
  data: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface IndicatorResponse {
  symbol: string;
  timeframe: string;
  indicator: string;
  values: Array<{
    timestamp: number;
    value: number | Record<string, number>;
  }>;
}

export interface WatchlistResponse {
  symbols: string[];
  createdAt: string;
  updatedAt: string;
}

export interface PortfolioResponse {
  totalValue: number;
  totalPnl: number;
  totalPnlPct: number;
  positions: PortfolioPosition[];
}

export interface PortfolioPosition {
  symbol: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  marketValue: number;
  pnl: number;
  pnlPct: number;
}

export interface ApiError {
  error: string;
  message: string;
  code?: string;
  statusCode?: number;
}

export interface CustomEventResponse {
  eventId: string;
  eventName: string;
  symbol: string;
  timestamp: number;
  data?: Record<string, unknown>;
}

export interface PaginatedResponse<T> {
  data: T[];
  cursor?: string;
  hasMore?: boolean;
}

export interface ChartOptions {
  timeframe?: string;
  limit?: number;
  indicators?: string[];
  style?: 'candle' | 'line' | 'bar';
}

export interface ConfigSettings {
  apiKey?: string;
  apiUrl?: string;
  format?: 'table' | 'json' | 'csv';
  theme?: 'light' | 'dark';
}