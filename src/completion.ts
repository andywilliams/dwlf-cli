import { Command } from 'commander';
import chalk from 'chalk';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

/**
 * Generate bash completion script for dwlf CLI
 */
export function generateBashCompletion(): string {
  return `#!/bin/bash
# dwlf bash completion

_dwlf_completions() {
    local cur prev opts base_commands
    COMPREPLY=()
    cur="\${COMP_WORDS[COMP_CWORD]}"
    prev="\${COMP_WORDS[COMP_CWORD-1]}"

    # Available commands
    base_commands="login config price watchlist trades signals portfolio events chart strategies indicators completion help"
    
    case "\${COMP_CWORD}" in
        1)
            # Complete main commands
            COMPREPLY=( \$(compgen -W "\${base_commands}" -- \${cur}) )
            return 0
            ;;
        2)
            # Complete subcommands based on main command
            case "\${prev}" in
                config)
                    COMPREPLY=( \$(compgen -W "show get set reset status" -- \${cur}) )
                    return 0
                    ;;
                signals)
                    COMPREPLY=( \$(compgen -W "list create update delete stats" -- \${cur}) )
                    return 0
                    ;;
                portfolio)
                    COMPREPLY=( \$(compgen -W "summary positions performance" -- \${cur}) )
                    return 0
                    ;;
                events)
                    COMPREPLY=( \$(compgen -W "list create update delete activate" -- \${cur}) )
                    return 0
                    ;;
                strategies)
                    COMPREPLY=( \$(compgen -W "list create update delete backtest" -- \${cur}) )
                    return 0
                    ;;
                indicators)
                    COMPREPLY=( \$(compgen -W "list get" -- \${cur}) )
                    return 0
                    ;;
                chart)
                    COMPREPLY=( \$(compgen -W "view export" -- \${cur}) )
                    return 0
                    ;;
                completion)
                    COMPREPLY=( \$(compgen -W "bash zsh fish install" -- \${cur}) )
                    return 0
                    ;;
            esac
            ;;
        *)
            # For subsequent arguments, try to complete symbols
            case "\${COMP_WORDS[1]}" in
                price|chart)
                    # Common symbols for completion
                    local symbols="BTC-USD ETH-USD AAPL MSFT GOOGL AMZN TSLA NVDA SPY QQQ"
                    COMPREPLY=( \$(compgen -W "\${symbols}" -- \${cur}) )
                    return 0
                    ;;
            esac
            ;;
    esac

    return 0
}

complete -F _dwlf_completions dwlf
`;
}

/**
 * Generate zsh completion script for dwlf CLI
 */
export function generateZshCompletion(): string {
  return `#compdef dwlf
# dwlf zsh completion

_dwlf() {
    local context state line
    typeset -A opt_args

    _arguments -C \\
        '1:command:->command' \\
        '*:args:->args' && return 0

    case $state in
        command)
            _values 'commands' \\
                'login[Configure API credentials]' \\
                'config[Manage configuration settings]' \\
                'price[Get current prices]' \\
                'watchlist[Manage your watchlist]' \\
                'trades[View and manage trades]' \\
                'signals[Manage trading signals]' \\
                'portfolio[Portfolio management]' \\
                'events[Manage custom events]' \\
                'chart[Chart analysis and export]' \\
                'strategies[Trading strategy management]' \\
                'indicators[Technical indicator tools]' \\
                'completion[Generate shell completion scripts]' \\
                'help[Show help information]'
            ;;
        args)
            case $words[2] in
                config)
                    _values 'config subcommands' \\
                        'show[Display current configuration]' \\
                        'get[Get a specific configuration value]' \\
                        'set[Set a configuration value]' \\
                        'reset[Reset configuration to defaults]' \\
                        'status[Show configuration status]'
                    ;;
                signals)
                    _values 'signals subcommands' \\
                        'list[List trading signals]' \\
                        'create[Create a new signal]' \\
                        'update[Update an existing signal]' \\
                        'delete[Delete a signal]' \\
                        'stats[Show signal statistics]'
                    ;;
                portfolio)
                    _values 'portfolio subcommands' \\
                        'summary[Portfolio summary]' \\
                        'positions[Current positions]' \\
                        'performance[Performance metrics]'
                    ;;
                events)
                    _values 'events subcommands' \\
                        'list[List custom events]' \\
                        'create[Create a new event]' \\
                        'update[Update an existing event]' \\
                        'delete[Delete an event]' \\
                        'activate[Activate event for symbols]'
                    ;;
                strategies)
                    _values 'strategies subcommands' \\
                        'list[List trading strategies]' \\
                        'create[Create a new strategy]' \\
                        'update[Update an existing strategy]' \\
                        'delete[Delete a strategy]' \\
                        'backtest[Run strategy backtest]'
                    ;;
                indicators)
                    _values 'indicators subcommands' \\
                        'list[List available indicators]' \\
                        'get[Get indicator data]'
                    ;;
                chart)
                    _values 'chart subcommands' \\
                        'view[View chart in terminal]' \\
                        'export[Export chart data]'
                    ;;
                completion)
                    _values 'completion subcommands' \\
                        'bash[Generate bash completion script]' \\
                        'zsh[Generate zsh completion script]' \\
                        'fish[Generate fish completion script]' \\
                        'install[Install completion for current shell]'
                    ;;
                price|chart)
                    # Suggest common trading symbols
                    _values 'symbols' \\
                        'BTC-USD[Bitcoin]' \\
                        'ETH-USD[Ethereum]' \\
                        'AAPL[Apple Inc.]' \\
                        'MSFT[Microsoft]' \\
                        'GOOGL[Google]' \\
                        'AMZN[Amazon]' \\
                        'TSLA[Tesla]' \\
                        'NVDA[NVIDIA]' \\
                        'SPY[SPDR S&P 500]' \\
                        'QQQ[Invesco QQQ Trust]'
                    ;;
            esac
            ;;
    esac
}

_dwlf "$@"
`;
}

/**
 * Generate fish completion script for dwlf CLI
 */
export function generateFishCompletion(): string {
  return `# dwlf fish completion

# Main commands
complete -c dwlf -f
complete -c dwlf -n "__fish_use_subcommand" -a "login" -d "Configure API credentials"
complete -c dwlf -n "__fish_use_subcommand" -a "config" -d "Manage configuration settings"
complete -c dwlf -n "__fish_use_subcommand" -a "price" -d "Get current prices"
complete -c dwlf -n "__fish_use_subcommand" -a "watchlist" -d "Manage your watchlist"
complete -c dwlf -n "__fish_use_subcommand" -a "trades" -d "View and manage trades"
complete -c dwlf -n "__fish_use_subcommand" -a "signals" -d "Manage trading signals"
complete -c dwlf -n "__fish_use_subcommand" -a "portfolio" -d "Portfolio management"
complete -c dwlf -n "__fish_use_subcommand" -a "events" -d "Manage custom events"
complete -c dwlf -n "__fish_use_subcommand" -a "chart" -d "Chart analysis and export"
complete -c dwlf -n "__fish_use_subcommand" -a "strategies" -d "Trading strategy management"
complete -c dwlf -n "__fish_use_subcommand" -a "indicators" -d "Technical indicator tools"
complete -c dwlf -n "__fish_use_subcommand" -a "completion" -d "Generate shell completion scripts"
complete -c dwlf -n "__fish_use_subcommand" -a "help" -d "Show help information"

# Config subcommands
complete -c dwlf -n "__fish_seen_subcommand_from config" -a "show" -d "Display current configuration"
complete -c dwlf -n "__fish_seen_subcommand_from config" -a "get" -d "Get a specific configuration value"
complete -c dwlf -n "__fish_seen_subcommand_from config" -a "set" -d "Set a configuration value"
complete -c dwlf -n "__fish_seen_subcommand_from config" -a "reset" -d "Reset configuration to defaults"
complete -c dwlf -n "__fish_seen_subcommand_from config" -a "status" -d "Show configuration status"

# Signals subcommands
complete -c dwlf -n "__fish_seen_subcommand_from signals" -a "list" -d "List trading signals"
complete -c dwlf -n "__fish_seen_subcommand_from signals" -a "create" -d "Create a new signal"
complete -c dwlf -n "__fish_seen_subcommand_from signals" -a "update" -d "Update an existing signal"
complete -c dwlf -n "__fish_seen_subcommand_from signals" -a "delete" -d "Delete a signal"
complete -c dwlf -n "__fish_seen_subcommand_from signals" -a "stats" -d "Show signal statistics"

# Portfolio subcommands
complete -c dwlf -n "__fish_seen_subcommand_from portfolio" -a "summary" -d "Portfolio summary"
complete -c dwlf -n "__fish_seen_subcommand_from portfolio" -a "positions" -d "Current positions"
complete -c dwlf -n "__fish_seen_subcommand_from portfolio" -a "performance" -d "Performance metrics"

# Events subcommands
complete -c dwlf -n "__fish_seen_subcommand_from events" -a "list" -d "List custom events"
complete -c dwlf -n "__fish_seen_subcommand_from events" -a "create" -d "Create a new event"
complete -c dwlf -n "__fish_seen_subcommand_from events" -a "update" -d "Update an existing event"
complete -c dwlf -n "__fish_seen_subcommand_from events" -a "delete" -d "Delete an event"
complete -c dwlf -n "__fish_seen_subcommand_from events" -a "activate" -d "Activate event for symbols"

# Strategies subcommands
complete -c dwlf -n "__fish_seen_subcommand_from strategies" -a "list" -d "List trading strategies"
complete -c dwlf -n "__fish_seen_subcommand_from strategies" -a "create" -d "Create a new strategy"
complete -c dwlf -n "__fish_seen_subcommand_from strategies" -a "update" -d "Update an existing strategy"
complete -c dwlf -n "__fish_seen_subcommand_from strategies" -a "delete" -d "Delete a strategy"
complete -c dwlf -n "__fish_seen_subcommand_from strategies" -a "backtest" -d "Run strategy backtest"

# Indicators subcommands
complete -c dwlf -n "__fish_seen_subcommand_from indicators" -a "list" -d "List available indicators"
complete -c dwlf -n "__fish_seen_subcommand_from indicators" -a "get" -d "Get indicator data"

# Chart subcommands
complete -c dwlf -n "__fish_seen_subcommand_from chart" -a "view" -d "View chart in terminal"
complete -c dwlf -n "__fish_seen_subcommand_from chart" -a "export" -d "Export chart data"

# Completion subcommands
complete -c dwlf -n "__fish_seen_subcommand_from completion" -a "bash" -d "Generate bash completion script"
complete -c dwlf -n "__fish_seen_subcommand_from completion" -a "zsh" -d "Generate zsh completion script"
complete -c dwlf -n "__fish_seen_subcommand_from completion" -a "fish" -d "Generate fish completion script"
complete -c dwlf -n "__fish_seen_subcommand_from completion" -a "install" -d "Install completion for current shell"

# Symbol completion for price and chart commands
set -l common_symbols BTC-USD ETH-USD AAPL MSFT GOOGL AMZN TSLA NVDA SPY QQQ
complete -c dwlf -n "__fish_seen_subcommand_from price chart" -a "$common_symbols"
`;
}

/**
 * Install completion script for the current shell
 */
export async function installCompletion(shell?: string): Promise<void> {
  const detectedShell = shell || detectShell();
  
  console.log(chalk.cyan(`🐚 Installing ${detectedShell} completion for dwlf...`));
  
  try {
    switch (detectedShell) {
      case 'bash':
        await installBashCompletion();
        break;
      case 'zsh':
        await installZshCompletion();
        break;
      case 'fish':
        await installFishCompletion();
        break;
      default:
        console.log(chalk.yellow(`⚠️ Unsupported shell: ${detectedShell}`));
        console.log(chalk.gray('Supported shells: bash, zsh, fish'));
        return;
    }
    
    console.log(chalk.green('✅ Completion installed successfully!'));
    console.log(chalk.gray(`Restart your ${detectedShell} session or run:`));
    
    switch (detectedShell) {
      case 'bash':
        console.log(chalk.gray('  source ~/.bashrc'));
        break;
      case 'zsh':
        console.log(chalk.gray('  source ~/.zshrc'));
        break;
      case 'fish':
        console.log(chalk.gray('  No restart needed for fish'));
        break;
    }
    
  } catch (error) {
    console.error(chalk.red('❌ Failed to install completion:'), error instanceof Error ? error.message : 'Unknown error');
    throw error;
  }
}

/**
 * Detect the current shell
 */
function detectShell(): string {
  const shell = process.env.SHELL || '';
  if (shell.includes('zsh')) return 'zsh';
  if (shell.includes('bash')) return 'bash';
  if (shell.includes('fish')) return 'fish';
  return 'bash'; // Default fallback
}

/**
 * Install bash completion
 */
async function installBashCompletion(): Promise<void> {
  const homeDir = os.homedir();
  const bashrcPath = path.join(homeDir, '.bashrc');
  const completionScript = generateBashCompletion();
  
  // Check if completion is already installed
  try {
    const bashrcContent = await fs.readFile(bashrcPath, 'utf8');
    if (bashrcContent.includes('_dwlf_completions')) {
      console.log(chalk.yellow('⚠️ Bash completion already installed, skipping...'));
      return;
    }
  } catch {
    // .bashrc doesn't exist, we'll create the completion part
  }
  
  // Append completion to .bashrc
  const completionBlock = `
# dwlf CLI completion
${completionScript}
`;
  
  await fs.appendFile(bashrcPath, completionBlock);
}

/**
 * Install zsh completion
 */
async function installZshCompletion(): Promise<void> {
  const homeDir = os.homedir();
  
  // Create zsh completions directory if it doesn't exist
  const completionDir = path.join(homeDir, '.zsh', 'completions');
  await fs.mkdir(completionDir, { recursive: true });
  
  // Write completion file
  const completionFile = path.join(completionDir, '_dwlf');
  await fs.writeFile(completionFile, generateZshCompletion());
  
  // Update .zshrc to include completion directory
  const zshrcPath = path.join(homeDir, '.zshrc');
  const completionDirLine = `fpath=(~/.zsh/completions $fpath)`;
  const autoloadLine = `autoload -Uz compinit && compinit`;
  
  try {
    const zshrcContent = await fs.readFile(zshrcPath, 'utf8');
    
    let needsUpdate = false;
    let newContent = zshrcContent;
    
    if (!zshrcContent.includes('~/.zsh/completions')) {
      newContent = `${completionDirLine}\n${newContent}`;
      needsUpdate = true;
    }
    
    if (!zshrcContent.includes('autoload -Uz compinit')) {
      newContent = `${newContent}\n${autoloadLine}`;
      needsUpdate = true;
    }
    
    if (needsUpdate) {
      await fs.writeFile(zshrcPath, newContent);
    }
    
  } catch {
    // .zshrc doesn't exist, create it with necessary lines
    await fs.writeFile(zshrcPath, `${completionDirLine}\n${autoloadLine}\n`);
  }
}

/**
 * Install fish completion
 */
async function installFishCompletion(): Promise<void> {
  const homeDir = os.homedir();
  
  // Fish completions directory
  const completionDir = path.join(homeDir, '.config', 'fish', 'completions');
  await fs.mkdir(completionDir, { recursive: true });
  
  // Write completion file
  const completionFile = path.join(completionDir, 'dwlf.fish');
  await fs.writeFile(completionFile, generateFishCompletion());
}

/**
 * Create the completion command
 */
export function createCompletionCommand(): Command {
  const command = new Command('completion')
    .description('Generate shell completion scripts');

  command
    .command('bash')
    .description('Generate bash completion script')
    .action(() => {
      console.log(generateBashCompletion());
    });

  command
    .command('zsh')
    .description('Generate zsh completion script')
    .action(() => {
      console.log(generateZshCompletion());
    });

  command
    .command('fish')
    .description('Generate fish completion script')
    .action(() => {
      console.log(generateFishCompletion());
    });

  command
    .command('install')
    .description('Install completion for current shell')
    .option('-s, --shell <shell>', 'Target shell (bash, zsh, fish)')
    .action(async (options) => {
      try {
        await installCompletion(options.shell);
      } catch (error) {
        console.error(chalk.red('Failed to install completion:'), error instanceof Error ? error.message : 'Unknown error');
        process.exit(1);
      }
    });

  return command;
}