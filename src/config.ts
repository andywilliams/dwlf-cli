import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import chalk from 'chalk';

export interface DWLFConfig {
  apiKey?: string;
  apiUrl?: string;
  defaultSymbols?: string[];
  defaultTimeframe?: string;
  outputFormat?: 'table' | 'json' | 'csv';
  version?: number;
}

const CONFIG_DIR = path.join(os.homedir(), '.dwlf');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');
const CURRENT_CONFIG_VERSION = 1;

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: Partial<DWLFConfig> = {
  apiUrl: 'https://api.dwlf.co.uk',
  defaultSymbols: ['BTC-USD', 'AAPL', 'NVDA', 'TSLA'],
  defaultTimeframe: 'daily',
  outputFormat: 'table',
  version: CURRENT_CONFIG_VERSION,
};

/**
 * Ensure the config directory exists
 */
async function ensureConfigDir(): Promise<void> {
  try {
    await fs.access(CONFIG_DIR);
  } catch {
    await fs.mkdir(CONFIG_DIR, { mode: 0o700 });
  }
}

/**
 * Load the config file, creating it if it doesn't exist
 */
export async function loadConfig(): Promise<DWLFConfig> {
  await ensureConfigDir();
  
  try {
    const configData = await fs.readFile(CONFIG_FILE, 'utf-8');
    const config = JSON.parse(configData) as DWLFConfig;
    
    // Migrate config if needed
    const migratedConfig = migrateConfig(config);
    
    // Save if migration occurred
    if (migratedConfig.version !== config.version) {
      await saveConfig(migratedConfig);
    }
    
    return migratedConfig;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      // Config file doesn't exist, return defaults with empty API key
      const defaultConfig = { ...DEFAULT_CONFIG };
      await saveConfig(defaultConfig);
      return defaultConfig;
    }
    throw error;
  }
}

/**
 * Save the config file with secure permissions
 */
export async function saveConfig(config: DWLFConfig): Promise<void> {
  await ensureConfigDir();
  
  const configData = JSON.stringify(config, null, 2);
  await fs.writeFile(CONFIG_FILE, configData, { mode: 0o600 });
}

/**
 * Get API key from config or environment variable
 */
export async function getApiKey(): Promise<string | null> {
  // Check environment variable first
  const envKey = process.env.DWLF_API_KEY;
  if (envKey) {
    return envKey;
  }

  // Check config file
  const config = await loadConfig();
  return config.apiKey || null;
}

/**
 * Get API URL from config or use default
 */
export async function getApiUrl(): Promise<string> {
  const config = await loadConfig();
  return config.apiUrl || 'https://api.dwlf.co.uk';
}

/**
 * Display masked API key for security
 */
export function maskApiKey(apiKey: string): string {
  if (apiKey.length <= 12) {
    return '*'.repeat(apiKey.length);
  }
  
  const prefix = apiKey.substring(0, 12); // Show "dwlf_sk_" + 4 chars
  const suffix = apiKey.substring(apiKey.length - 4);
  const maskedLength = apiKey.length - 16;
  
  // Ensure we don't get negative values for repeat()
  const masked = maskedLength > 0 ? '*'.repeat(maskedLength) : '';
  
  return `${prefix}${masked}${suffix}`;
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const apiKey = await getApiKey();
  return apiKey !== null;
}

/**
 * Remove API key from config (logout)
 */
export async function removeApiKey(): Promise<void> {
  const config = await loadConfig();
  delete config.apiKey;
  await saveConfig(config);
}

/**
 * Migrate config to current version
 */
function migrateConfig(config: DWLFConfig): DWLFConfig {
  const migratedConfig = { ...DEFAULT_CONFIG, ...config };
  
  // Ensure version is set
  if (!migratedConfig.version || migratedConfig.version < CURRENT_CONFIG_VERSION) {
    migratedConfig.version = CURRENT_CONFIG_VERSION;
  }
  
  return migratedConfig;
}

/**
 * Reset configuration to defaults (keeping API key)
 */
export async function resetConfig(): Promise<void> {
  const config = await loadConfig();
  const resetConfig = { ...DEFAULT_CONFIG };
  
  // Keep the API key if it exists
  if (config.apiKey) {
    resetConfig.apiKey = config.apiKey;
  }
  
  await saveConfig(resetConfig);
}

/**
 * Set a configuration value
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function setConfigValue(key: keyof DWLFConfig, value: any): Promise<void> {
  const config = await loadConfig();
  
  // Validate the value based on the key
  switch (key) {
    case 'apiKey':
      if (typeof value !== 'string' || !value.startsWith('dwlf_sk_')) {
        throw new Error('API key must be a string starting with "dwlf_sk_"');
      }
      break;
    case 'apiUrl':
      if (typeof value !== 'string' || !value.startsWith('http')) {
        throw new Error('API URL must be a valid HTTP/HTTPS URL');
      }
      break;
    case 'defaultSymbols':
      if (Array.isArray(value)) {
        config[key] = value;
      } else if (typeof value === 'string') {
        config[key] = value.split(',').map(s => s.trim());
      } else {
        throw new Error('Default symbols must be an array or comma-separated string');
      }
      await saveConfig(config);
      return;
    case 'defaultTimeframe':
      if (!['1m', '5m', '15m', '1h', '4h', 'daily', 'weekly', 'monthly'].includes(value)) {
        throw new Error('Invalid timeframe. Valid options: 1m, 5m, 15m, 1h, 4h, daily, weekly, monthly');
      }
      break;
    case 'outputFormat':
      if (!['table', 'json', 'csv'].includes(value)) {
        throw new Error('Invalid output format. Valid options: table, json, csv');
      }
      break;
    default:
      throw new Error(`Unknown configuration key: ${key}`);
  }
  
  config[key] = value;
  await saveConfig(config);
}

/**
 * Display current configuration status
 */
export async function displayConfigStatus(): Promise<void> {
  const config = await loadConfig();
  const envKey = process.env.DWLF_API_KEY;
  
  console.log(chalk.bold('\n📋 Configuration Status:'));
  console.log(`Config file: ${CONFIG_FILE}`);
  console.log(`API URL: ${config.apiUrl || DEFAULT_CONFIG.apiUrl}`);
  
  if (envKey) {
    console.log(`API Key: ${chalk.green('Set via environment')} (${maskApiKey(envKey)})`);
  } else if (config.apiKey) {
    console.log(`API Key: ${chalk.green('Set in config')} (${maskApiKey(config.apiKey)})`);
  } else {
    console.log(`API Key: ${chalk.red('Not configured')}`);
  }
  
  console.log(`Default Symbols: ${config.defaultSymbols?.join(', ') || DEFAULT_CONFIG.defaultSymbols?.join(', ')}`);
  console.log(`Default Timeframe: ${config.defaultTimeframe || DEFAULT_CONFIG.defaultTimeframe}`);
  console.log(`Output Format: ${config.outputFormat || DEFAULT_CONFIG.outputFormat}`);
  console.log(`Config Version: ${config.version || DEFAULT_CONFIG.version}`);
  
  console.log(`\n${chalk.dim('Environment variable DWLF_API_KEY takes precedence over config file.')}`);
}

/**
 * Get configuration value with fallback to defaults
 */
export async function getConfigValue<K extends keyof DWLFConfig>(key: K): Promise<DWLFConfig[K]> {
  const config = await loadConfig();
  return config[key] !== undefined ? config[key] : DEFAULT_CONFIG[key];
}