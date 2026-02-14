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

// Type declarations for modules without types
declare module 'sparkline' {
  function sparkline(data: number[]): string;
  export = sparkline;
}