// DWLF API Response Interfaces
export interface MarketDataResponse {
  symbol: string;
  timeframe: string;
  candles: Array<{
    timestamp: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }>;
}

export interface WatchlistResponse {
  symbols: string[];
}

export interface Trade {
  tradeId: string;
  symbol: string;
  side: 'long' | 'short';
  entryPrice: number;
  exitPrice?: number;
  size: number;
  quantity?: number;
  openedAt: string;
  closedAt?: string;
  status: 'open' | 'closed';
  pnlAbs?: number;
  pnlPct?: number;
  rMultiple?: number;
  stopLoss?: number;
  takeProfit?: number;
  isPaperTrade: boolean;
  notes?: string;
}

export interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  symbol?: string;
  change?: number;
  changePercent?: number;
}

export interface ApiSignal {
  signalId: string;
  symbol: string;
  strategy?: string;
  strategyDetails?: {
    visualStrategyId?: string;
    strategyName?: string;
  };
  strategyDescription?: string;
  initialPrice?: number;
  currentPrice?: number;
  stopLossLevel?: number;
  target3R?: number;
  currentRR?: number;
  percentageGain?: number;
  active?: string | boolean;
  createdAt?: string;
  date?: string;
  closedAt?: string;
  exitDate?: string;
}

export interface SignalsApiResponse {
  signals: ApiSignal[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  };
}

export interface IndicatorsApiResponse {
  [key: string]: unknown; // Generic object for indicator data
}

export interface TrendlinesApiResponse {
  trendlines: Array<{
    type: 'support' | 'resistance' | 'trend';
    slope: number;
    yIntercept: number;
    touchPoints: Array<{ date: string; price: number }>;
    strength: number;
    isActive: boolean;
  }>;
}

export interface SupportResistanceApiResponse {
  levels: Array<{
    price: number;
    type: 'support' | 'resistance';
    strength: number;
    touchCount: number;
    lastTouch?: string;
  }>;
}

// Additional type interfaces used across the CLI

export interface TradeData {
  tradeId: string;
  symbol: string;
  side: string;
  entryPrice: number;
  exitPrice?: number;
  size: number;
  quantity?: number;
  openedAt: string;
  closedAt?: string;
  status: string;
  pnlAbs?: number;
  pnlPct?: number;
  rMultiple?: number;
  stopLoss?: number;
  takeProfit?: number;
  isPaperTrade?: boolean;
  notes?: string;
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

export interface BacktestResult {
  requestId?: string;
  strategyId?: string;
  status?: string;
  trades?: BacktestTrade[];
  summary?: BacktestSummary;
  results?: BacktestResult;
  error?: string;
}

export interface BacktestTrade {
  symbol?: string;
  entryDate?: string;
  exitDate?: string;
  entryPrice?: number;
  exitPrice?: number;
  side?: string;
  pnlPct?: number;
  rMultiple?: number;
}

export interface BacktestSummary {
  totalTrades?: number;
  winRate?: number;
  totalReturn?: number;
  profitFactor?: number;
  maxDrawdown?: number;
  avgWin?: number;
  avgLoss?: number;
  expectancy?: number;
  sharpeRatio?: number;
  [key: string]: unknown;
}

export interface BacktestRequest {
  requestId: string;
  strategyId?: string;
  symbols?: string[];
  startDate?: string;
  endDate?: string;
  status?: string;
  createdAt?: string;
}

export interface PerformanceData {
  date: string;
  value: number;
  pnl?: number;
  [key: string]: unknown;
}

export interface SignalData {
  signalId: string;
  symbol: string;
  strategy?: string;
  active?: boolean | string;
  date?: string;
  initialPrice?: number;
  currentPrice?: number;
  percentageGain?: number;
  [key: string]: unknown;
}

export interface CloseTradeData {
  exitPrice: number;
  exitAt?: string;
  notes?: string;
}

export interface TradeFilters {
  status?: 'open' | 'closed' | undefined;
  symbol?: string | undefined;
}

export interface PromptConfig {
  type: string;
  name: string;
  message: string;
  choices?: Array<{ name: string; value: string }>;
  default?: unknown;
}