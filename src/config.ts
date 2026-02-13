import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import chalk from 'chalk';

export interface DWLFConfig {
  apiKey?: string;
  apiUrl?: string;
}

const CONFIG_DIR = path.join(os.homedir(), '.dwlf');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

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
    return JSON.parse(configData);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      // Config file doesn't exist, return empty config
      return {};
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
  if (apiKey.length <= 8) {
    return '*'.repeat(apiKey.length);
  }
  
  const prefix = apiKey.substring(0, 12); // Show "dwlf_sk_" + 4 chars
  const suffix = apiKey.substring(apiKey.length - 4);
  const masked = '*'.repeat(apiKey.length - 16);
  
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
 * Display current configuration status
 */
export async function displayConfigStatus(): Promise<void> {
  const config = await loadConfig();
  const envKey = process.env.DWLF_API_KEY;
  
  console.log(chalk.bold('\n📋 Configuration Status:'));
  console.log(`Config file: ${CONFIG_FILE}`);
  console.log(`API URL: ${await getApiUrl()}`);
  
  if (envKey) {
    console.log(`API Key: ${chalk.green('Set via environment')} (${maskApiKey(envKey)})`);
  } else if (config.apiKey) {
    console.log(`API Key: ${chalk.green('Set in config')} (${maskApiKey(config.apiKey)})`);
  } else {
    console.log(`API Key: ${chalk.red('Not configured')}`);
  }
  
  console.log(`\n${chalk.dim('Environment variable DWLF_API_KEY takes precedence over config file.')}`);
}