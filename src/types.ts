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

// Type declarations for modules without types
declare module 'sparkline' {
  function sparkline(data: number[]): string;
  export = sparkline;
}