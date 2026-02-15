import { 
  normalizeSymbol, 
  validateApiKey, 
  testApiConnectivity, 
  DWLFApiClient,
  displayValidationResult 
} from './api-client';
import axios from 'axios';

// Mock axios for testing
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Create a more comprehensive mock axios instance
const createMockAxiosInstance = () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  interceptors: {
    request: { use: jest.fn(), eject: jest.fn(), clear: jest.fn() },
    response: { use: jest.fn((success, error) => {
      // Store the error handler for testing
      mockAxiosInstance._errorHandler = error;
      return 1; // mock interceptor id
    }), eject: jest.fn(), clear: jest.fn() }
  },
  defaults: {
    baseURL: 'https://api.test.com/v2',
    headers: {},
    timeout: 30000
  },
  _errorHandler: undefined as any // For testing interceptor
});

let mockAxiosInstance: any;

// Mock console methods for testing display functions
const originalConsoleLog = console.log;
beforeAll(() => {
  console.log = jest.fn();
});

afterAll(() => {
  console.log = originalConsoleLog;
});

beforeEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
  jest.useFakeTimers();
  
  mockAxiosInstance = createMockAxiosInstance();
  mockedAxios.create = jest.fn().mockReturnValue(mockAxiosInstance);
  mockedAxios.get = jest.fn();
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

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

describe('DWLFApiClient', () => {
  describe('constructor and configuration', () => {
    test('creates instance with default options', () => {
      const client = new DWLFApiClient({ maxRetries: 0 });
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'https://api.dwlf.co.uk/v2',
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'dwlf-cli/0.1.0'
        }
      });
    });

    test('creates instance with custom options', () => {
      const client = new DWLFApiClient({
        apiKey: 'dwlf_sk_test123',
        baseUrl: 'https://custom-api.test.com',
        timeout: 60000,
        maxRetries: 5,
        retryDelay: 2000
      });

      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'https://custom-api.test.com/v2',
        timeout: 60000,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'dwlf-cli/0.1.0',
          Authorization: 'ApiKey dwlf_sk_test123'
        }
      });
    });

    test('creates axios instance with proper config', () => {
      new DWLFApiClient({ maxRetries: 0 });
      expect(mockedAxios.create).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    test('handles network connection errors', async () => {
      const client = new DWLFApiClient({ maxRetries: 0 });
      const networkError = new Error('Network Error');
      (networkError as any).code = 'ECONNREFUSED';
      
      mockAxiosInstance.get.mockRejectedValueOnce(networkError);
      
      await expect(client.get('/test')).rejects.toThrow('Cannot connect to DWLF API');
    });

    test('handles timeout errors', async () => {
      const client = new DWLFApiClient({ maxRetries: 0 });
      const timeoutError = new Error('timeout of 30000ms exceeded');
      (timeoutError as any).code = 'ETIMEDOUT';
      
      mockAxiosInstance.get.mockRejectedValueOnce(timeoutError);
      
      await expect(client.get('/test')).rejects.toThrow('Request timed out');
    });

    test('handles 401 unauthorized errors', async () => {
      const client = new DWLFApiClient({ maxRetries: 0 });
      const authError = {
        response: { status: 401, data: { error: 'Unauthorized' } },
        message: 'Request failed with status code 401'
      } as any;
      
      // Simulate the error handler being called
      mockAxiosInstance.get.mockImplementation(() => {
        return Promise.reject(authError);
      });
      
      await expect(client.get('/test')).rejects.toThrow('Invalid API key');
    });

    test('handles 403 forbidden errors', async () => {
      const client = new DWLFApiClient({ maxRetries: 0 });
      const forbiddenError = {
        response: { status: 403, data: { error: 'Forbidden' } },
        message: 'Request failed with status code 403'
      } as any;
      
      mockAxiosInstance.get.mockImplementation(() => {
        return Promise.reject(forbiddenError);
      });
      
      await expect(client.get('/test')).rejects.toThrow('Access forbidden');
    });

    test('handles 404 not found errors', async () => {
      const client = new DWLFApiClient({ maxRetries: 0 });
      const notFoundError = {
        response: { status: 404, data: { error: 'Not found' } },
        message: 'Request failed with status code 404'
      } as any;
      
      mockAxiosInstance.get.mockImplementation(() => {
        return Promise.reject(notFoundError);
      });
      
      await expect(client.get('/test')).rejects.toThrow('Resource not found');
    });

    test('handles 429 rate limit errors', async () => {
      const client = new DWLFApiClient({ maxRetries: 0 });
      const rateLimitError = {
        response: { status: 429, data: { error: 'Too many requests' } },
        message: 'Request failed with status code 429'
      } as any;
      
      mockAxiosInstance.get.mockImplementation(() => {
        return Promise.reject(rateLimitError);
      });
      
      await expect(client.get('/test')).rejects.toThrow('Rate limit exceeded');
    });

    test('handles 500 server errors', async () => {
      const client = new DWLFApiClient({ maxRetries: 0 });
      const serverError = {
        response: { status: 500, data: { error: 'Internal server error' } },
        message: 'Request failed with status code 500'
      } as any;
      
      mockAxiosInstance.get.mockImplementation(() => {
        return Promise.reject(serverError);
      });
      
      await expect(client.get('/test')).rejects.toThrow('Server error');
    });

    test('extracts error message from response data', async () => {
      const client = new DWLFApiClient({ maxRetries: 0 });
      const customError = {
        response: { status: 400, data: { message: 'Custom error message' } },
        message: 'Request failed with status code 400'
      } as any;
      
      mockAxiosInstance.get.mockImplementation(() => {
        return Promise.reject(customError);
      });
      
      await expect(client.get('/test')).rejects.toThrow('Custom error message');
    });
  });

  describe('retry logic', () => {
    test('shouldRetry method logic', () => {
      const client = new DWLFApiClient({ maxRetries: 3 });
      const shouldRetry = (client as any).shouldRetry.bind(client);
      
      // Test retry conditions
      expect(shouldRetry({ code: 'ECONNREFUSED' }, 1)).toBe(true);
      expect(shouldRetry({ code: 'ETIMEDOUT' }, 1)).toBe(true);
      expect(shouldRetry({ response: { status: 500 } }, 1)).toBe(true);
      expect(shouldRetry({ response: { status: 429 } }, 1)).toBe(true);
      
      // Test non-retry conditions
      expect(shouldRetry({ response: { status: 400 } }, 1)).toBe(false);
      expect(shouldRetry({ response: { status: 404 } }, 1)).toBe(false);
      expect(shouldRetry({ response: { status: 401 } }, 1)).toBe(false);
      
      // Test max retries exceeded
      expect(shouldRetry({ code: 'ECONNREFUSED' }, 4)).toBe(false);
    });

    test('calculateRetryDelay uses exponential backoff', () => {
      const client = new DWLFApiClient({ maxRetries: 3, retryDelay: 100 });
      const calculateDelay = (client as any).calculateRetryDelay.bind(client);
      
      expect(calculateDelay(1)).toBe(100);  // First retry: baseDelay * 2^0
      expect(calculateDelay(2)).toBe(200);  // Second retry: baseDelay * 2^1  
      expect(calculateDelay(3)).toBe(400);  // Third retry: baseDelay * 2^2
    });

    test('simple retry on network error', async () => {
      jest.useRealTimers();
      const client = new DWLFApiClient({ maxRetries: 1, retryDelay: 1 });
      const networkError = new Error('Network Error');
      (networkError as any).code = 'ECONNREFUSED';
      
      let callCount = 0;
      mockAxiosInstance.get.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(networkError);
        }
        return Promise.resolve({ data: { success: true } });
      });
      
      const result = await client.get('/test');
      expect(result).toEqual({ success: true });
      expect(callCount).toBe(2);
    });

    test('simple retry on 500 server error', async () => {
      jest.useRealTimers();
      const client = new DWLFApiClient({ maxRetries: 1, retryDelay: 1 });
      const serverError = {
        response: { status: 500 },
        message: 'Server error'
      } as any;
      
      let callCount = 0;
      mockAxiosInstance.get.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(serverError);
        }
        return Promise.resolve({ data: { success: true } });
      });
      
      const result = await client.get('/test');
      expect(result).toEqual({ success: true });
      expect(callCount).toBe(2);
    });

    test('does not retry on 4xx client errors (except 429)', async () => {
      const client = new DWLFApiClient({ maxRetries: 3, retryDelay: 100 });
      const clientError = {
        response: { status: 404 },
        message: 'Not found'
      } as any;
      
      mockAxiosInstance.get.mockImplementation(() => {
        return Promise.reject(clientError);
      });
      
      await expect(client.get('/test')).rejects.toThrow();
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(1);
    });

    test('exhausts retries on persistent errors', async () => {
      jest.useRealTimers();
      const client = new DWLFApiClient({ maxRetries: 2, retryDelay: 1 });
      const networkError = new Error('Persistent Network Error');
      (networkError as any).code = 'ECONNREFUSED';
      
      let callCount = 0;
      mockAxiosInstance.get.mockImplementation(() => {
        callCount++;
        return Promise.reject(networkError);
      });
      
      await expect(client.get('/test')).rejects.toThrow('Cannot connect to DWLF API');
      expect(callCount).toBe(3); // Initial + 2 retries
    });
  });

  describe('rate limiting', () => {
    test('applies rate limiting when configured', async () => {
      const client = new DWLFApiClient({
        rateLimit: { requests: 2, per: 1000 }
      });
      
      mockAxiosInstance.get.mockResolvedValue({ data: { success: true } });
      
      const startTime = Date.now();
      
      // Make 3 requests rapidly
      const promises = [
        client.get('/test1'),
        client.get('/test2'),
        client.get('/test3')
      ];
      
      // Advance time to allow rate limiter to work
      jest.advanceTimersByTime(1000);
      await jest.runAllTimersAsync();
      
      await Promise.all(promises);
      
      // All requests should eventually succeed
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(3);
    });

    test('works without rate limiting when not configured', async () => {
      const client = new DWLFApiClient({ maxRetries: 0 });
      
      mockAxiosInstance.get.mockResolvedValue({ data: { success: true } });
      
      // Make multiple requests rapidly
      await Promise.all([
        client.get('/test1'),
        client.get('/test2'),
        client.get('/test3')
      ]);
      
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(3);
    });
  });

  describe('HTTP method wrappers', () => {
    test('get method works correctly', async () => {
      const client = new DWLFApiClient({ maxRetries: 0 });
      mockAxiosInstance.get.mockResolvedValueOnce({ data: { result: 'success' } });
      
      const result = await client.get('/test', { param1: 'value1' });
      
      expect(result).toEqual({ result: 'success' });
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/test', {
        params: { param1: 'value1' }
      });
    });

    test('post method works correctly', async () => {
      const client = new DWLFApiClient({ maxRetries: 0 });
      mockAxiosInstance.post.mockResolvedValueOnce({ data: { id: 123 } });
      
      const result = await client.post('/create', { name: 'test' });
      
      expect(result).toEqual({ id: 123 });
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/create', { name: 'test' }, {
        params: undefined
      });
    });

    test('put method works correctly', async () => {
      const client = new DWLFApiClient({ maxRetries: 0 });
      mockAxiosInstance.put.mockResolvedValueOnce({ data: { updated: true } });
      
      const result = await client.put('/update/123', { name: 'updated' });
      
      expect(result).toEqual({ updated: true });
      expect(mockAxiosInstance.put).toHaveBeenCalledWith('/update/123', { name: 'updated' }, {
        params: undefined
      });
    });

    test('delete method works correctly', async () => {
      const client = new DWLFApiClient({ maxRetries: 0 });
      mockAxiosInstance.delete.mockResolvedValueOnce({ data: { deleted: true } });
      
      const result = await client.delete('/delete/123');
      
      expect(result).toEqual({ deleted: true });
      expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/delete/123', {
        params: undefined
      });
    });

    test('cleans undefined parameters', async () => {
      const client = new DWLFApiClient({ maxRetries: 0 });
      mockAxiosInstance.get.mockResolvedValueOnce({ data: { result: 'success' } });
      
      await client.get('/test', { 
        param1: 'value1', 
        param2: undefined, 
        param3: null, 
        param4: 'value4' 
      });
      
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/test', {
        params: { param1: 'value1', param4: 'value4' }
      });
    });
  });

  describe('validateApiKey method', () => {
    test('returns valid result when API key works', async () => {
      const client = new DWLFApiClient({ apiKey: 'dwlf_sk_test123' });
      mockAxiosInstance.get.mockResolvedValueOnce({ data: { portfolios: [] } });
      
      const result = await client.validateApiKey();
      
      expect(result.valid).toBe(true);
      expect(result.userInfo?.email).toBe('Validated successfully');
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/portfolios', { params: undefined });
    });

    test('returns invalid result when API key fails', async () => {
      const client = new DWLFApiClient({ apiKey: 'dwlf_sk_invalid', maxRetries: 0 });
      const error = {
        response: { status: 401, data: { error: 'Invalid API key' } },
        message: 'Request failed with status code 401'
      };
      mockAxiosInstance.get.mockRejectedValueOnce(error);
      
      const result = await client.validateApiKey();
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid API key');
    });
  });

  describe('testConnectivity method', () => {
    test('returns true when health endpoint is reachable', async () => {
      const client = new DWLFApiClient({ maxRetries: 0 });
      mockedAxios.get.mockResolvedValueOnce({ 
        status: 200, 
        data: {}, 
        statusText: 'OK',
        headers: {},
        config: { url: 'https://api.test.com/health' }
      } as any);
      
      const result = await client.testConnectivity();
      
      expect(result).toBe(true);
      expect(mockedAxios.get).toHaveBeenCalledWith('https://api.test.com/health', {
        timeout: 5000
      });
    });

    test('returns false when health endpoint is unreachable', async () => {
      const client = new DWLFApiClient({ maxRetries: 0 });
      mockedAxios.get.mockRejectedValueOnce(new Error('Network error'));
      
      const result = await client.testConnectivity();
      
      expect(result).toBe(false);
    });
  });
});

describe('legacy validation function', () => {
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

  test('validates API key with remote call when format is correct', async () => {
    mockAxiosInstance.get.mockResolvedValueOnce({ data: { portfolios: [] } });
    
    const result = await validateApiKey('dwlf_sk_test123');
    expect(result.valid).toBe(true);
  });
});

describe('testApiConnectivity legacy function', () => {
  test('tests connectivity using health endpoint', async () => {
    mockedAxios.get.mockResolvedValueOnce({ 
      status: 200, 
      data: {}, 
      statusText: 'OK',
      headers: {},
      config: { url: 'https://api.dwlf.co.uk/health' }
    } as any);
    
    const result = await testApiConnectivity();
    expect(result).toBe(true);
  });
});

describe('displayValidationResult', () => {
  test('displays success message for valid API key', () => {
    const result = {
      valid: true,
      userInfo: {
        email: 'test@example.com',
        permissions: ['read', 'write']
      }
    };
    
    displayValidationResult(result);
    
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('✅ API key is valid!'));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('test@example.com'));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('read, write'));
  });

  test('displays error message for invalid API key', () => {
    const result = {
      valid: false,
      error: 'Invalid credentials'
    };
    
    displayValidationResult(result);
    
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('❌ API key validation failed'));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Invalid credentials'));
  });

  test('displays success without permissions when none provided', () => {
    const result = {
      valid: true,
      userInfo: {
        email: 'test@example.com',
        permissions: []
      }
    };
    
    displayValidationResult(result);
    
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('✅ API key is valid!'));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('test@example.com'));
    // Should not call permissions line when empty
    expect(console.log).not.toHaveBeenCalledWith(expect.stringContaining('Permissions:'));
  });
});