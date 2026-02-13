import { createChartCommand } from './chart';

// Mock the config module
jest.mock('./config', () => ({
  isAuthenticated: jest.fn(),
  getApiKey: jest.fn(),
  getApiUrl: jest.fn()
}));

// Mock the api-client module
jest.mock('./api-client', () => ({
  DWLFApiClient: jest.fn().mockImplementation(() => ({
    get: jest.fn()
  }))
}));

// Mock ora (spinner)
jest.mock('ora', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    start: jest.fn().mockReturnThis(),
    stop: jest.fn().mockReturnThis(),
    succeed: jest.fn().mockReturnThis(),
    fail: jest.fn().mockReturnThis()
  }))
}));

// Mock chalk
jest.mock('chalk', () => {
  const mockChalk = {
    red: jest.fn((str) => str),
    green: jest.fn((str) => str),
    blue: jest.fn((str) => str),
    yellow: jest.fn((str) => str),
    cyan: jest.fn((str) => str),
    magenta: jest.fn((str) => str),
    gray: jest.fn((str) => str),
    grey: jest.fn((str) => str),
    dim: jest.fn((str) => str),
    bold: jest.fn((str) => str)
  };
  return {
    __esModule: true,
    default: mockChalk,
    ...mockChalk
  };
});

// Mock sparkline
jest.mock('sparkline', () => ({
  __esModule: true,
  default: jest.fn(() => '▁▃▄▅▆▇▆▅▄▃▁')
}));

describe('Chart Command', () => {
  let mockConsoleLog: jest.SpyInstance;
  let mockConsoleError: jest.SpyInstance;
  let mockProcessExit: jest.SpyInstance;

  beforeEach(() => {
    mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});
    mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockProcessExit = jest.spyOn(process, 'exit').mockImplementation((code?: number) => {
      throw new Error(`Process exited with code ${code}`);
    });
    jest.clearAllMocks();
  });

  afterEach(() => {
    mockConsoleLog.mockRestore();
    mockConsoleError.mockRestore();
    mockProcessExit.mockRestore();
  });

  test('should create chart command with correct name and description', () => {
    const command = createChartCommand();
    
    expect(command.name()).toBe('chart');
    expect(command.description()).toBe('Display ASCII charts and price visualization');
  });

  test('should have required symbol argument', () => {
    const command = createChartCommand();
    const args = command.args;
    
    expect(args).toHaveLength(1);
    expect(args[0].name()).toBe('symbol');
    expect(args[0].required).toBe(true);
  });

  test('should have all expected options', () => {
    const command = createChartCommand();
    const options = command.options;
    
    const optionNames = options.map(opt => opt.long);
    
    expect(optionNames).toContain('--timeframe');
    expect(optionNames).toContain('--period');
    expect(optionNames).toContain('--volume');
    expect(optionNames).toContain('--stats');
    expect(optionNames).toContain('--browser');
    expect(optionNames).toContain('--ascii-only');
  });

  test('should validate timeframe option', async () => {
    const command = createChartCommand();
    
    // Mock authentication
    const { isAuthenticated, getApiKey, getApiUrl } = require('./config');
    isAuthenticated.mockResolvedValue(true);
    getApiKey.mockResolvedValue('dwlf_sk_test');
    getApiUrl.mockResolvedValue('https://api.dwlf.co.uk/v2');
    
    try {
      await command.parseAsync(['node', 'test', 'chart', 'BTC-USD', '--timeframe', 'invalid'], { from: 'user' });
    } catch (error) {
      expect(error.message).toContain('Process exited with code 1');
    }
    
    expect(mockConsoleError).toHaveBeenCalledWith(
      expect.anything(), 
      expect.stringContaining('Invalid timeframe')
    );
  });

  test('should handle unauthenticated user', async () => {
    const command = createChartCommand();
    
    // Mock authentication failure
    const { isAuthenticated } = require('./config');
    isAuthenticated.mockResolvedValue(false);
    
    try {
      await command.parseAsync(['node', 'test', 'chart', 'BTC-USD'], { from: 'user' });
    } catch (error) {
      expect(error.message).toContain('Process exited with code 1');
    }
    
    expect(mockConsoleLog).toHaveBeenCalledWith(
      expect.stringContaining('❌ Not authenticated')
    );
  });

  test('should handle API errors gracefully', async () => {
    const command = createChartCommand();
    
    // Mock authentication
    const { isAuthenticated, getApiKey, getApiUrl } = require('./config');
    isAuthenticated.mockResolvedValue(true);
    getApiKey.mockResolvedValue('dwlf_sk_test');
    getApiUrl.mockResolvedValue('https://api.dwlf.co.uk/v2');
    
    // Mock API client failure
    const { DWLFApiClient } = require('./api-client');
    const mockGet = jest.fn().mockRejectedValue(new Error('API Error'));
    DWLFApiClient.mockImplementation(() => ({ get: mockGet }));
    
    try {
      await command.parseAsync(['node', 'test', 'chart', 'BTC-USD'], { from: 'user' });
    } catch (error) {
      expect(error.message).toContain('Process exited with code 1');
    }
    
    expect(mockConsoleError).toHaveBeenCalledWith(
      expect.anything(),
      expect.stringContaining('Failed to fetch market data for BTC-USD')
    );
  });

  test('should handle successful chart display', async () => {
    const command = createChartCommand();
    
    // Mock authentication
    const { isAuthenticated, getApiKey, getApiUrl } = require('./config');
    isAuthenticated.mockResolvedValue(true);
    getApiKey.mockResolvedValue('dwlf_sk_test');
    getApiUrl.mockResolvedValue('https://api.dwlf.co.uk/v2');
    
    // Mock successful API response
    const { DWLFApiClient } = require('./api-client');
    const mockMarketData = {
      candles: [
        { timestamp: '2024-01-01T00:00:00Z', open: 100, high: 110, low: 95, close: 105, volume: 1000 },
        { timestamp: '2024-01-02T00:00:00Z', open: 105, high: 115, low: 100, close: 110, volume: 1200 }
      ]
    };
    const mockGet = jest.fn().mockResolvedValue(mockMarketData);
    DWLFApiClient.mockImplementation(() => ({ get: mockGet }));
    
    await command.parseAsync(['node', 'test', 'chart', 'BTC-USD', '--stats'], { from: 'user' });
    
    // Should display chart header and statistics
    expect(mockConsoleLog).toHaveBeenCalledWith(
      expect.stringContaining('📈 BTC-USD')
    );
    expect(mockConsoleLog).toHaveBeenCalledWith(
      expect.stringContaining('📊 Statistics')
    );
  });
});