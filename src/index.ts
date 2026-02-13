#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { prompt } from 'enquirer';
import ora from 'ora';
import { loadConfig, saveConfig, getApiKey, getApiUrl, maskApiKey, displayConfigStatus, isAuthenticated } from './config';
import { validateApiKey, displayValidationResult } from './api-client';
import { createSignalsCommand } from './signals';
import { createPortfolioCommand } from './portfolio';
import { createEventsCommand } from './events';
import { createChartCommand } from './chart';

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