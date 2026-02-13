import { normalizeSymbol, validateApiKey } from './api-client';
import axios from 'axios';

// Mock axios for testing
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock the axios instance with minimal required properties
const mockAxiosInstance = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  interceptors: {
    request: { use: jest.fn(), eject: jest.fn(), clear: jest.fn() },
    response: { use: jest.fn(), eject: jest.fn(), clear: jest.fn() }
  },
  defaults: {
    baseURL: 'https://api.test.com/v2',
    headers: {}
  }
};

// Make axios.create return our mocked instance
mockedAxios.create = jest.fn().mockReturnValue(mockAxiosInstance as any);

describe('normalizeSymbol', () => {
  test('handles crypto symbols correctly', () => {
    expect(normalizeSymbol('BTC')).toBe('BTC-USD');
    expect(normalizeSymbol('ETH')).toBe('ETH-USD');
    expect(normalizeSymbol('SOL')).toBe('SOL-USD');
  });

  test('handles slash-separated pairs', () => {
    expect(normalizeSymbol('BTC/USD')).toBe('BTC-USD');
    expect(normalizeSymbol('ETH/USDT')).toBe('ETH-USDT');
  });

  test('handles dash-separated pairs', () => {
    expect(normalizeSymbol('BTC-USD')).toBe('BTC-USD');
    expect(normalizeSymbol('ETH-EUR')).toBe('ETH-EUR');
  });

  test('handles concatenated pairs', () => {
    expect(normalizeSymbol('BTCUSD')).toBe('BTC-USD');
    expect(normalizeSymbol('ETHUSD')).toBe('ETH-USD');
  });

  test('handles known stock tickers', () => {
    expect(normalizeSymbol('AAPL')).toBe('AAPL');
    expect(normalizeSymbol('TSLA')).toBe('TSLA');
    expect(normalizeSymbol('NVDA')).toBe('NVDA');
  });

  test('handles case insensitive input', () => {
    expect(normalizeSymbol('btc')).toBe('BTC-USD');
    expect(normalizeSymbol('aapl')).toBe('AAPL');
    expect(normalizeSymbol('btc/usd')).toBe('BTC-USD');
  });
});

describe('validateApiKey', () => {
  test('returns error for missing API key', async () => {
    const result = await validateApiKey('');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('API key is required');
  });

  test('returns error for invalid API key format', async () => {
    const result = await validateApiKey('invalid_key');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('API key must start with "dwlf_sk_"');
  });
});