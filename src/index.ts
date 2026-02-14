#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { prompt } from 'enquirer';
import ora from 'ora';
import { loadConfig, saveConfig, getApiKey, getApiUrl, maskApiKey, displayConfigStatus, isAuthenticated, resetConfig, setConfigValue, getConfigValue } from './config';
import { validateApiKey, displayValidationResult } from './api-client';
import { createSignalsCommand } from './signals';
import { createPortfolioCommand } from './portfolio';
import { createEventsCommand } from './events';
import { createChartCommand } from './chart';
import { createStrategiesCommand } from './strategies';
import { createIndicatorsCommand } from './indicators';

const program = new Command();

program
  .name('dwlf')
  .description('CLI tool for DWLF market analysis platform')
  .version('0.1.0');

// Login command - now fully implemented!
program
  .command('login')
  .description('Configure API credentials')
  .option('--show-config', 'Show current configuration without changing it')
  .option('--validate', 'Validate current API key')
  .action(async (options) => {
    try {
      // Show config option
      if (options.showConfig) {
        await displayConfigStatus();
        return;
      }

      // Validate current key option
      if (options.validate) {
        const currentKey = await getApiKey();
        if (!currentKey) {
          console.log(chalk.red('❌ No API key configured.'));
          console.log(chalk.gray('Run `dwlf login` to configure your credentials.'));
          return;
        }

        const spinner = ora('Validating API key...').start();
        const apiUrl = await getApiUrl();
        const result = await validateApiKey(currentKey, apiUrl);
        spinner.stop();
        
        displayValidationResult(result);
        return;
      }

      console.log(chalk.bold.cyan('🦊 Welcome to DWLF CLI!'));
      console.log();

      // Check if already authenticated
      if (await isAuthenticated()) {
        const currentKey = await getApiKey();
        console.log(chalk.gray(`Currently using API key: ${maskApiKey(currentKey!)}`));
        console.log();

        const { overwrite }: { overwrite: boolean } = await prompt({
          type: 'confirm',
          name: 'overwrite',
          message: 'API key is already configured. Do you want to update it?',
          initial: false
        });

        if (!overwrite) {
          console.log(chalk.green('✅ Keeping current configuration.'));
          return;
        }
        console.log();
      }

      // Prompt for API key
      const { apiKey }: { apiKey: string } = await prompt({
        type: 'password',
        name: 'apiKey',
        message: 'Enter your DWLF API key:',
        validate: (input: string) => {
          if (!input.trim()) {
            return 'API key is required';
          }
          if (!input.startsWith('dwlf_sk_')) {
            return 'API key must start with "dwlf_sk_"';
          }
          return true;
        }
      });

      // Validate the API key
      const spinner = ora('Validating API key...').start();
      const apiUrl = await getApiUrl();
      const validationResult = await validateApiKey(apiKey.trim(), apiUrl);
      spinner.stop();

      if (!validationResult.valid) {
        console.log();
        displayValidationResult(validationResult);
        console.log(chalk.gray('\nPlease check your API key and try again.'));
        process.exit(1);
      }

      // Save the validated API key
      const config = await loadConfig();
      config.apiKey = apiKey.trim();
      await saveConfig(config);

      console.log();
      displayValidationResult(validationResult);
      console.log(chalk.green('🎉 Configuration saved successfully!'));
      console.log(chalk.gray(`Config file: ~/.dwlf/config.json (chmod 600)`));
      console.log();
      console.log(chalk.dim('You can now use other DWLF commands. Try:'));
      console.log(chalk.dim('  dwlf price BTC-USD AAPL'));
      console.log(chalk.dim('  dwlf watchlist'));

    } catch (error) {
      console.error(chalk.red('Error during login:'), error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

// Config command with subcommands
const configCommand = program
  .command('config')
  .description('Manage CLI configuration');

configCommand
  .command('show')
  .description('Display current configuration')
  .action(async () => {
    try {
      await displayConfigStatus();
    } catch (error) {
      console.error(chalk.red('Error displaying config:'), error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

configCommand
  .command('list-keys')
  .description('List available configuration keys')
  .action(async () => {
    console.log(chalk.bold('\n📋 Available Configuration Keys:'));
    console.log('  apiKey         - Your DWLF API key');
    console.log('  apiUrl         - API base URL (default: https://api.dwlf.co.uk)');
    console.log('  defaultSymbols - Comma-separated list of default symbols');
    console.log('  defaultTimeframe - Default timeframe (1m, 5m, 15m, 1h, 4h, daily, weekly, monthly)');
    console.log('  outputFormat   - Output format (table, json, csv)');
  });

configCommand
  .command('set <key> <value>')
  .description('Set a configuration value')
  .action(async (key: string, value: string) => {

    try {
      await setConfigValue(key as keyof import('./config').DWLFConfig, value);
      console.log(chalk.green(`✅ Configuration updated: ${key} = ${value}`));
      
      // Show updated config
      const updatedValue = await getConfigValue(key as keyof import('./config').DWLFConfig);
      if (key === 'apiKey' && typeof updatedValue === 'string') {
        console.log(chalk.gray(`Current value: ${maskApiKey(updatedValue)}`));
      } else if (Array.isArray(updatedValue)) {
        console.log(chalk.gray(`Current value: ${updatedValue.join(', ')}`));
      } else {
        console.log(chalk.gray(`Current value: ${updatedValue}`));
      }
    } catch (error) {
      console.error(chalk.red('Error setting config:'), error instanceof Error ? error.message : 'Unknown error');
      console.log(chalk.gray('\nRun `dwlf config list-keys` to see available keys and formats.'));
      process.exit(1);
    }
  });

configCommand
  .command('reset')
  .description('Reset configuration to defaults (keeping API key)')
  .option('--confirm', 'Skip confirmation prompt')
  .action(async (options) => {
    try {
      if (!options.confirm) {
        const { proceed }: { proceed: boolean } = await prompt({
          type: 'confirm',
          name: 'proceed',
          message: 'This will reset all configuration to defaults (API key will be preserved). Continue?',
          initial: false
        });

        if (!proceed) {
          console.log(chalk.yellow('Configuration reset cancelled.'));
          return;
        }
      }

      await resetConfig();
      console.log(chalk.green('✅ Configuration reset to defaults.'));
      
      // Show the reset config
      await displayConfigStatus();
    } catch (error) {
      console.error(chalk.red('Error resetting config:'), error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

program
  .command('price')
  .description('Get current prices')
  .argument('[symbols...]', 'symbols to check')
  .action(() => {
    console.log(chalk.yellow('🔧 Command not yet implemented. Coming soon!'));
  });

program
  .command('watchlist')
  .description('Manage your watchlist')
  .action(() => {
    console.log(chalk.yellow('🔧 Command not yet implemented. Coming soon!'));
  });

program
  .command('trades')
  .description('View and manage trades')
  .action(() => {
    console.log(chalk.yellow('🔧 Command not yet implemented. Coming soon!'));
  });

// Add the signals command
program.addCommand(createSignalsCommand());

// Add the portfolio command
program.addCommand(createPortfolioCommand());

// Add the events command
program.addCommand(createEventsCommand());

// Add the chart command
program.addCommand(createChartCommand());

// Add the strategies command
program.addCommand(createStrategiesCommand());

// Add the indicators command
program.addCommand(createIndicatorsCommand());

// Help command customization
program
  .configureHelp({
    sortSubcommands: true,
  });

// Handle unknown commands
program.on('command:*', () => {
  console.log(chalk.red('Unknown command. Use --help for available commands.'));
  process.exit(1);
});

// Parse and execute
try {
  program.parse(process.argv);
} catch (error) {
  console.error(chalk.red('Error:'), error instanceof Error ? error.message : 'Unknown error');
  process.exit(1);
}