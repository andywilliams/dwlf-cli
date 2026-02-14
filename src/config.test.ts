import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { 
  loadConfig, 
  saveConfig, 
  resetConfig, 
  setConfigValue, 
  getConfigValue, 
  maskApiKey, 
  DEFAULT_CONFIG,
  DWLFConfig 
} from './config';

// Mock the config directory to use a temporary location for tests
const TEST_CONFIG_DIR = path.join(os.tmpdir(), '.dwlf-test');
const TEST_CONFIG_FILE = path.join(TEST_CONFIG_DIR, 'config.json');

// Mock the config file path
jest.mock('./config', () => {
  const originalModule = jest.requireActual('./config');
  return {
    ...originalModule,
    // Override the config paths for testing
  };
});

describe('Config Management', () => {
  beforeEach(async () => {
    // Clean up test config directory before each test
    try {
      await fs.rm(TEST_CONFIG_DIR, { recursive: true, force: true });
    } catch {
      // Directory might not exist, ignore
    }
  });

  afterAll(async () => {
    // Clean up after all tests
    try {
      await fs.rm(TEST_CONFIG_DIR, { recursive: true, force: true });
    } catch {
      // Directory might not exist, ignore
    }
  });

  describe('loadConfig', () => {
    it('should create default config when file does not exist', async () => {
      const config = await loadConfig();
      expect(config).toMatchObject(DEFAULT_CONFIG);
      expect(config.version).toBe(DEFAULT_CONFIG.version);
    });

    it('should load existing config file', async () => {
      const testConfig: DWLFConfig = {
        ...DEFAULT_CONFIG,
        apiKey: 'dwlf_sk_test123',
        defaultSymbols: ['BTC-USD', 'ETH-USD']
      };

      await saveConfig(testConfig);
      const loadedConfig = await loadConfig();
      
      expect(loadedConfig).toMatchObject(testConfig);
    });
  });

  describe('setConfigValue', () => {
    it('should set string values correctly', async () => {
      await setConfigValue('defaultTimeframe', '1h');
      const value = await getConfigValue('defaultTimeframe');
      expect(value).toBe('1h');
    });

    it('should set array values from string correctly', async () => {
      await setConfigValue('defaultSymbols', 'BTC-USD,ETH-USD,AAPL');
      const value = await getConfigValue('defaultSymbols');
      expect(value).toEqual(['BTC-USD', 'ETH-USD', 'AAPL']);
    });

    it('should set array values from array correctly', async () => {
      await setConfigValue('defaultSymbols', ['NVDA', 'TSLA']);
      const value = await getConfigValue('defaultSymbols');
      expect(value).toEqual(['NVDA', 'TSLA']);
    });

    it('should validate API key format', async () => {
      await expect(setConfigValue('apiKey', 'invalid_key'))
        .rejects.toThrow('API key must be a string starting with "dwlf_sk_"');
      
      // Valid API key should work
      await expect(setConfigValue('apiKey', 'dwlf_sk_valid123'))
        .resolves.not.toThrow();
    });

    it('should validate timeframe values', async () => {
      await expect(setConfigValue('defaultTimeframe', 'invalid'))
        .rejects.toThrow('Invalid timeframe');
      
      // Valid timeframes should work
      const validTimeframes = ['1m', '5m', '15m', '1h', '4h', 'daily', 'weekly', 'monthly'];
      for (const timeframe of validTimeframes) {
        await expect(setConfigValue('defaultTimeframe', timeframe))
          .resolves.not.toThrow();
      }
    });

    it('should validate output format values', async () => {
      await expect(setConfigValue('outputFormat', 'invalid'))
        .rejects.toThrow('Invalid output format');
      
      // Valid formats should work
      const validFormats = ['table', 'json', 'csv'];
      for (const format of validFormats) {
        await expect(setConfigValue('outputFormat', format))
          .resolves.not.toThrow();
      }
    });

    it('should reject unknown keys', async () => {
      await expect(setConfigValue('unknownKey' as any, 'value'))
        .rejects.toThrow('Unknown configuration key');
    });
  });

  describe('resetConfig', () => {
    it('should reset to defaults while preserving API key', async () => {
      // Set some custom values and API key
      await setConfigValue('apiKey', 'dwlf_sk_test123');
      await setConfigValue('defaultTimeframe', '1h');
      await setConfigValue('outputFormat', 'json');
      
      // Reset config
      await resetConfig();
      
      // Check that defaults are restored but API key is preserved
      const config = await loadConfig();
      expect(config.apiKey).toBe('dwlf_sk_test123');
      expect(config.defaultTimeframe).toBe(DEFAULT_CONFIG.defaultTimeframe);
      expect(config.outputFormat).toBe(DEFAULT_CONFIG.outputFormat);
    });
  });

  describe('maskApiKey', () => {
    it('should mask short keys completely', async () => {
      const masked = maskApiKey('short');
      expect(masked).toBe('*****');
    });

    it('should mask long keys showing prefix and suffix', async () => {
      const key = 'dwlf_sk_abcdefghijklmnopqrstuvwxyz';
      const masked = maskApiKey(key);
      
      expect(masked).toMatch(/^dwlf_sk_abcd.*wxyz$/);
      expect(masked).toContain('*');
      expect(masked.length).toBe(key.length);
    });
  });

  describe('getConfigValue', () => {
    it('should return config value when set', async () => {
      await setConfigValue('defaultTimeframe', '4h');
      const value = await getConfigValue('defaultTimeframe');
      expect(value).toBe('4h');
    });

    it('should return default value when not set', async () => {
      // Load fresh config (should be defaults)
      const config = await loadConfig();
      delete config.defaultTimeframe;
      await saveConfig(config);
      
      const value = await getConfigValue('defaultTimeframe');
      expect(value).toBe(DEFAULT_CONFIG.defaultTimeframe);
    });
  });
});