import { Command } from 'commander';
import chalk from 'chalk';
import { prompt } from 'enquirer';
import ora from 'ora';
import { DWLFApiClient } from './api-client';
import { getApiUrl, loadConfig, saveConfig } from './config';

export interface RegisterResponse {
  apiKey: string;
  message?: string;
  email?: string;
  verified?: boolean;
}

/**
 * Check if the user wants to save the API key
 */
async function promptSaveApiKey(): Promise<boolean> {
  const { save }: { save: boolean } = await prompt({
    type: 'confirm',
    name: 'save',
    message: 'Would you like to save this API key to your config?',
    initial: true
  });
  
  return save;
}

/**
 * Save API key to config
 */
async function saveApiKeyToConfig(apiKey: string): Promise<void> {
  try {
    const config = await loadConfig();
    config.apiKey = apiKey;
    await saveConfig(config);
    
    console.log(chalk.green('✅ API key saved to ~/.dwlf/config.json'));
    console.log(chalk.gray('You can now use other DWLF commands.'));
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(chalk.red('Failed to save API key:'), errorMessage);
    console.log(chalk.gray(`\nYou can manually add it to ~/.dwlf/config.json:`));
    console.log(chalk.gray(`{ "apiKey": "${apiKey}" }`));
  }
}

/**
 * Display registration success information
 */
function displayRegistrationSuccess(response: RegisterResponse, email: string): void {
  console.log();
  console.log(chalk.bold.green('🎉 Registration Successful!'));
  console.log(chalk.gray('─'.repeat(50)));
  console.log();
  
  console.log(chalk.cyan('Email:'), email);
  console.log(chalk.cyan('API Key:'), chalk.yellow(response.apiKey));
  console.log();
  
  if (response.message) {
    console.log(chalk.white(response.message));
    console.log();
  }
  
  console.log(chalk.bold('📋 Next Steps:'));
  console.log(`  1. ${chalk.gray('Check your email and verify your account')}`);
  console.log(`  2. ${chalk.gray('Run ')}${chalk.cyan('dwlf login')} ${chalk.gray('to configure the CLI')}`);
  console.log(`  3. ${chalk.gray('Or copy this key:')}`);
  console.log(chalk.gray(`  ${response.apiKey}`));
  console.log();
  
  console.log(chalk.bold('💡 Tip:'));
  console.log(chalk.gray('The API key has been saved to your config file.'));
  console.log(chalk.gray('You can start using DWLF commands immediately!'));
  console.log();
}

/**
 * Create and configure the register command
 */
export function createRegisterCommand(): Command {
  const registerCommand = new Command('register')
    .description('Programmatically register a new account (for CI/CD pipelines and agents)')
    .option('--email <email>', 'email address for registration')
    .option('--name <name>', 'name for the account')
    .option('--save', 'automatically save the API key to config (no prompt)')
    .option('-j, --json', 'output only the API key as JSON');

  registerCommand.action(async (options) => {
    try {
      let email = options.email;
      
      // Prompt for email if not provided
      if (!email) {
        const { emailInput }: { emailInput: string } = await prompt({
          type: 'input',
          name: 'emailInput',
          message: 'Enter your email address:',
          validate: (input: string) => {
            if (!input.trim()) {
              return 'Email is required';
            }
            // Simple email validation
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input)) {
              return 'Please enter a valid email address';
            }
            return true;
          }
        });
        
        email = emailInput;
      }
      
      // Validate email format
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        console.log(chalk.red('Error: Please provide a valid email address.'));
        process.exit(1);
      }
      
      const name = options.name;
      
      // Build request body
      const requestBody: Record<string, string> = {
        email
      };
      
      if (name) {
        requestBody.name = name;
      }
      
      const spinner = ora('Registering account...').start();
      let response: RegisterResponse;
      
      try {
        const apiUrl = await getApiUrl();
        const client = new DWLFApiClient({ 
          apiKey: 'dummy', // No auth needed for registration
          baseUrl: apiUrl 
        });
        
        response = await client.post<RegisterResponse>('/v2/agent/register', requestBody);
        spinner.stop();
      } catch (error: unknown) {
        spinner.stop();
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        
        console.error(chalk.red('Registration failed:'), errorMessage);
        process.exit(1);
      }
      
      // JSON output mode
      if (options.json) {
        console.log(JSON.stringify({
          apiKey: response.apiKey,
          email: response.email || email,
          verified: response.verified || false
        }, null, 2));
        
        // Also save if --save flag is provided
        if (options.save) {
          await saveApiKeyToConfig(response.apiKey);
        }
        return;
      }
      
      // Display success
      displayRegistrationSuccess(response, email);
      
      // Prompt to save or auto-save
      if (options.save) {
        await saveApiKeyToConfig(response.apiKey);
      } else {
        const shouldSave = await promptSaveApiKey();
        if (shouldSave) {
          await saveApiKeyToConfig(response.apiKey);
        }
      }
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(chalk.red('Unexpected error:'), errorMessage);
      process.exit(1);
    }
  });

  return registerCommand;
}