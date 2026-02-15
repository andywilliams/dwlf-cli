import axios from 'axios';
type AxiosInstance = ReturnType<typeof axios.create>;
type AxiosError = Error & { response?: { status: number; data: unknown }; code?: string };
interface AxiosRequestConfig { params?: Record<string, unknown> }
import chalk from 'chalk';
import { MarketDataResponse, WatchlistResponse, Trade } from './types';

/**
 * Normalize symbol input to DWLF's expected format (e.g. BTC-USD).
 * Reused from @dwlf/mcp-server package for consistency.
 */
const KNOWN_STOCKS = new Set([
  'NVDA', 'TSLA', 'META', 'AAPL', 'AMZN', 'GOOG', 'GOOGL', 'MSFT', 'AMD',
  'SLV', 'GDXJ', 'SILJ', 'AGQ', 'GLD', 'GDX', 'GOLD',  // ETFs/metals
  'MARA', 'RIOT', 'BTBT', 'CIFR', 'IREN', 'CLSK',       // crypto miners
  'COIN', 'MSTR', 'HUT', 'HIVE', 'BITF', 'WULF',        // crypto-adjacent
  'LSPD', 'SOFI',                                          // fintech
]);

export function normalizeSymbol(input: string): string {
  const s = input.trim().toUpperCase();

  // Already has separator: BTC/USD → BTC-USD, BTC-USD stays
  if (s.includes('/')) {
    return s.replace('/', '-');
  }
  if (s.includes('-')) {
    return s;
  }

  // Known stock ticker — pass through as-is
  if (KNOWN_STOCKS.has(s)) {
    return s;
  }

  // Detect concatenated pair: BTCUSD, ETHUSD, SOLUSD etc.
  const pairMatch = s.match(/^([A-Z]{2,5})(USD|USDT|EUR|GBP|BTC|ETH)$/);
  if (pairMatch) {
    return `${pairMatch[1]}-${pairMatch[2]}`;
  }

  // Bare crypto symbol: BTC → BTC-USD
  return `${s}-USD`;
}

export interface ApiValidationResult {
  valid: boolean;
  error?: string;
  userInfo?: {
    email: string;
    permissions: string[];
  };
}

export interface ApiClientOptions {
  apiKey?: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
  rateLimit?: {
    requests: number;
    per: number; // milliseconds
  };
}

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

/**
 * Rate limiter implementation
 */
class RateLimiter {
  private requests: number[] = [];
  private maxRequests: number;
  private windowMs: number;

  constructor(maxRequests: number, windowMs: number) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  async wait(): Promise<void> {
    const now = Date.now();
    
    // Remove requests outside the current window
    this.requests = this.requests.filter(time => now - time < this.windowMs);
    
    if (this.requests.length >= this.maxRequests) {
      // Calculate how long to wait until the oldest request expires
      const oldestRequest = Math.min(...this.requests);
      const waitTime = this.windowMs - (now - oldestRequest);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return this.wait(); // Recursive call to check again
    }
    
    this.requests.push(now);
  }
}

/**
 * Enhanced DWLF API client with error handling, rate limiting, and retry logic
 */
export class DWLFApiClient {
  private http: AxiosInstance;
  private retryConfig: RetryConfig;
  private rateLimiter?: RateLimiter;

  constructor(options: ApiClientOptions = {}) {
    const {
      apiKey,
      baseUrl = 'https://api.dwlf.co.uk',
      timeout = 30000,
      maxRetries = 3,
      retryDelay = 1000,
      rateLimit
    } = options;

    // Set up rate limiter if configured
    if (rateLimit) {
      this.rateLimiter = new RateLimiter(rateLimit.requests, rateLimit.per);
    }

    // Retry configuration
    this.retryConfig = {
      maxRetries,
      baseDelay: retryDelay,
      maxDelay: 10000,
      backoffMultiplier: 2
    };

    // Create axios instance with default configuration
    this.http = axios.create({
      baseURL: `${baseUrl}/v2`,
      timeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'dwlf-cli/0.1.0',
        ...(apiKey ? { Authorization: `ApiKey ${apiKey}` } : {}),
      },
    });

    // Add response interceptor for error handling
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this.http.interceptors.response as any).use(
      undefined,
      async (error: unknown) => {
        return this.handleError(error as AxiosError);
      }
    );
  }

  private async handleError(error: AxiosError): Promise<never> {
    const status = error.response?.status;
    const message = this.extractErrorMessage(error);

    // Create a structured error
    interface ApiError extends Error {
      status?: number;
      isApiError: boolean;
    }
    
    const apiError = new Error(`API Error: ${message}`) as ApiError;
    apiError.status = status;
    apiError.isApiError = true;
    
    throw apiError;
  }

  private extractErrorMessage(error: AxiosError): string {
    if (error.code === 'ECONNREFUSED') {
      return 'Cannot connect to DWLF API. Please check your internet connection.';
    }
    
    if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
      return 'Request timed out. Please try again.';
    }

    const status = error.response?.status;
    const data = error.response?.data as Record<string, unknown> | undefined;

    if (status === 401) {
      return 'Invalid API key. Please check your authentication credentials.';
    }
    
    if (status === 403) {
      return 'Access forbidden. You may not have permission to access this resource.';
    }
    
    if (status === 404) {
      return 'Resource not found.';
    }
    
    if (status === 429) {
      return 'Rate limit exceeded. Please wait a moment before trying again.';
    }
    
    if (status && status >= 500) {
      return 'Server error. Please try again later.';
    }

    // Try to extract error message from response
    if (data?.error) {
      return typeof data.error === 'string' ? data.error : JSON.stringify(data.error);
    }
    
    if (data?.message) {
      return String(data.message);
    }

    return error.message || 'Unknown error occurred';
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private calculateRetryDelay(attempt: number): number {
    const delay = this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffMultiplier, attempt - 1);
    return Math.min(delay, this.retryConfig.maxDelay);
  }

  private shouldRetry(error: AxiosError, attempt: number): boolean {
    if (attempt >= this.retryConfig.maxRetries) {
      return false;
    }

    // Retry on network errors
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      return true;
    }

    // Retry on 5xx server errors and 429 rate limiting
    const status = error.response?.status;
    return status === 429 || (status !== undefined && status >= 500 && status <= 599);
  }

  private async makeRequest<T>(
    method: 'get' | 'post' | 'put' | 'delete',
    path: string,
    data?: unknown,
    params?: Record<string, unknown>
  ): Promise<T> {
    // Apply rate limiting if configured
    if (this.rateLimiter) {
      await this.rateLimiter.wait();
    }

    let attempt = 1;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      try {
        const config: AxiosRequestConfig = {
          params: params ? this.cleanParams(params) : undefined,
        };

        let response;
        switch (method) {
          case 'get':
            response = await this.http.get(path, config);
            break;
          case 'post':
            response = await this.http.post(path, data, config);
            break;
          case 'put':
            response = await this.http.put(path, data, config);
            break;
          case 'delete':
            response = await this.http.delete(path, config);
            break;
        }

        return response.data as T;
      } catch (error: unknown) {
        if (!this.shouldRetry(error as AxiosError, attempt)) {
          throw error;
        }

        const delay = this.calculateRetryDelay(attempt);
        await this.sleep(delay);
        attempt++;
      }
    }
  }

  private cleanParams(params: Record<string, unknown>): Record<string, unknown> {
    const cleaned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        cleaned[key] = value;
      }
    }
    return Object.keys(cleaned).length > 0 ? cleaned : {};
  }

  // HTTP method wrappers
  async get<T = unknown>(path: string, params?: Record<string, unknown>): Promise<T> {
    return this.makeRequest<T>('get', path, undefined, params);
  }

  async post<T = unknown>(path: string, data?: unknown): Promise<T> {
    return this.makeRequest<T>('post', path, data);
  }

  async put<T = unknown>(path: string, data?: unknown): Promise<T> {
    return this.makeRequest<T>('put', path, data);
  }

  async delete<T = unknown>(path: string): Promise<T> {
    return this.makeRequest<T>('delete', path);
  }

  // Utility methods for validation and connectivity testing
  async validateApiKey(): Promise<ApiValidationResult> {
    try {
      // Try to fetch portfolios to validate the key
      await this.get('/portfolios');
      
      return {
        valid: true,
        userInfo: {
          email: 'Validated successfully',
          permissions: []
        }
      };
    } catch (error: unknown) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'API key validation failed'
      };
    }
  }

  async testConnectivity(): Promise<boolean> {
    try {
      // Test connectivity without authentication
      const response = await axios.get(`${this.http.defaults.baseURL?.replace('/v2', '')}/health`, {
        timeout: 5000
      });
      return response.status === 200;
    } catch {
      return false;
    }
  }

  // Market data methods
  async getMarketData(symbols: string[], fields?: string[]): Promise<MarketDataResponse> {
    const params: Record<string, unknown> = {
      symbols: symbols.join(',')
    };
    
    if (fields && fields.length > 0) {
      params.fields = fields.join(',');
    }

    return this.get('/market-data', params);
  }

  // Watchlist methods
  async getWatchlist(): Promise<WatchlistResponse> {
    return this.get('/watchlist');
  }

  async addToWatchlist(symbols: string[]): Promise<WatchlistResponse> {
    return this.post('/watchlist', { symbols });
  }

  async removeFromWatchlist(symbols: string[]): Promise<WatchlistResponse> {
    return this.delete(`/watchlist?symbols=${symbols.join(',')}`);
  }

  async clearWatchlist(): Promise<WatchlistResponse> {
    return this.delete('/watchlist/all');
  }

  // Trade management methods
  async getTrades(filters?: { status?: 'open' | 'closed'; symbol?: string }): Promise<Trade[]> {
    const params: Record<string, unknown> = {};
    if (filters?.status) {
      params.status = filters.status;
    }
    if (filters?.symbol) {
      params.symbol = filters.symbol;
    }
    return this.get('/trades', params);
  }

  async openTrade(tradeData: {
    symbol: string;
    side: 'buy' | 'sell';
    quantity: number;
    entryPrice: number;
    stopLoss?: number;
    takeProfit?: number;
    notes?: string;
    isPaperTrade?: boolean;
  }): Promise<Trade> {
    return this.post('/trades', tradeData);
  }

  async updateTrade(tradeId: string, updates: {
    stopLoss?: number;
    takeProfit?: number;
    notes?: string;
  }): Promise<Trade> {
    return this.put(`/trades/${tradeId}`, updates);
  }

  async closeTrade(tradeId: string, data: {
    exitPrice: number;
    exitAt?: string;
    notes?: string;
  }): Promise<Trade> {
    return this.post(`/trades/${tradeId}/close`, data);
  }

  async getTrade(tradeId: string): Promise<Trade> {
    return this.get(`/trades/${tradeId}`);
  }
}

/**
 * Legacy validation function for backward compatibility
 */
export async function validateApiKey(apiKey: string, apiUrl: string = 'https://api.dwlf.co.uk'): Promise<ApiValidationResult> {
  if (!apiKey) {
    return {
      valid: false,
      error: 'API key is required'
    };
  }

  if (!apiKey.startsWith('dwlf_sk_')) {
    return {
      valid: false,
      error: 'API key must start with "dwlf_sk_"'
    };
  }

  const client = new DWLFApiClient({ apiKey, baseUrl: apiUrl });
  return client.validateApiKey();
}

/**
 * Legacy connectivity test function for backward compatibility
 */
export async function testApiConnectivity(apiUrl: string = 'https://api.dwlf.co.uk'): Promise<boolean> {
  const client = new DWLFApiClient({ baseUrl: apiUrl });
  return client.testConnectivity();
}

/**
 * Display API validation result with appropriate styling
 */
export function displayValidationResult(result: ApiValidationResult): void {
  if (result.valid && result.userInfo) {
    console.log(chalk.green('✅ API key is valid!'));
    console.log(`   User: ${chalk.cyan(result.userInfo.email)}`);
    if (result.userInfo.permissions.length > 0) {
      console.log(`   Permissions: ${chalk.gray(result.userInfo.permissions.join(', '))}`);
    }
  } else {
    console.log(chalk.red('❌ API key validation failed'));
    if (result.error) {
      console.log(`   Error: ${chalk.yellow(result.error)}`);
    }
  }
}