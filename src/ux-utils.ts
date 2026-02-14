import chalk from 'chalk';
import { prompt } from 'enquirer';
import ora, { Ora } from 'ora';

/**
 * Create a clickable terminal link
 * Supports iTerm2, Windows Terminal, and other modern terminals
 */
export function createLink(url: string, text?: string): string {
  const displayText = text || url;
  return `\u001b]8;;${url}\u001b\\${displayText}\u001b]8;;\u001b\\`;
}

/**
 * Enhanced error display with context and suggestions
 */
export function displayError(error: string, context?: string, suggestions?: string[]): void {
  console.log();
  console.log(chalk.red('❌ Error:'), error);
  
  if (context) {
    console.log(chalk.gray(`Context: ${context}`));
  }
  
  if (suggestions && suggestions.length > 0) {
    console.log();
    console.log(chalk.yellow('💡 Suggestions:'));
    suggestions.forEach(suggestion => {
      console.log(chalk.gray(`  • ${suggestion}`));
    });
  }
  console.log();
}

/**
 * Display success message with optional next steps
 */
export function displaySuccess(message: string, nextSteps?: string[]): void {
  console.log();
  console.log(chalk.green('✅'), message);
  
  if (nextSteps && nextSteps.length > 0) {
    console.log();
    console.log(chalk.dim('Next steps:'));
    nextSteps.forEach(step => {
      console.log(chalk.dim(`  • ${step}`));
    });
  }
  console.log();
}

/**
 * Display warning with optional context
 */
export function displayWarning(message: string, context?: string): void {
  console.log();
  console.log(chalk.yellow('⚠️ Warning:'), message);
  
  if (context) {
    console.log(chalk.gray(`Context: ${context}`));
  }
  console.log();
}

/**
 * Display info message with optional details
 */
export function displayInfo(message: string, details?: string[]): void {
  console.log();
  console.log(chalk.blue('ℹ️ Info:'), message);
  
  if (details && details.length > 0) {
    details.forEach(detail => {
      console.log(chalk.gray(`  ${detail}`));
    });
  }
  console.log();
}

/**
 * Create a loading spinner with customizable text
 */
export function createSpinner(text: string, options?: {
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'cyan' | 'magenta';
  spinner?: 'dots' | 'line' | 'simpleDotsScrolling' | 'star' | 'flip';
}): Ora {
  return ora({
    text,
    color: options?.color || 'cyan',
    spinner: options?.spinner || 'dots'
  });
}

/**
 * Enhanced confirmation prompt with custom styling
 */
export async function confirmAction(
  message: string, 
  options?: { 
    default?: boolean; 
    warning?: string;
    details?: string[];
  }
): Promise<boolean> {
  if (options?.warning) {
    displayWarning(options.warning);
  }
  
  if (options?.details) {
    options.details.forEach(detail => {
      console.log(chalk.gray(`  ${detail}`));
    });
    console.log();
  }
  
  const { confirm }: { confirm: boolean } = await prompt({
    type: 'confirm',
    name: 'confirm',
    message,
    initial: options?.default ?? false
  });
  
  return confirm;
}

/**
 * Interactive multi-select prompt with enhanced styling
 */
export async function selectMultiple(
  message: string,
  choices: Array<string | { name: string; value: string; hint?: string }>,
  options?: {
    min?: number;
    max?: number;
    initial?: string[];
  }
): Promise<string[]> {
  const { selected }: { selected: string[] } = await prompt({
    type: 'multiselect',
    name: 'selected',
    message,
    choices,
    initial: options?.initial
  } as any);
  
  return selected;
}

/**
 * Interactive single select prompt with search
 */
export async function selectOne(
  message: string,
  choices: Array<string | { name: string; value: string; hint?: string }>,
  options?: {
    initial?: string;
    searchable?: boolean;
  }
): Promise<string> {
  const promptType = options?.searchable ? 'autocomplete' : 'select';
  
  const { selected }: { selected: string } = await prompt({
    type: promptType,
    name: 'selected',
    message,
    choices,
    initial: options?.initial
  } as any);
  
  return selected;
}

/**
 * Progress bar for long-running operations
 */
export class ProgressBar {
  private spinner: Ora;
  private total: number;
  private current: number = 0;
  
  constructor(message: string, total: number) {
    this.total = total;
    this.spinner = createSpinner(`${message} (0/${total})`);
  }
  
  start(): void {
    this.spinner.start();
  }
  
  increment(message?: string): void {
    this.current++;
    const progress = `(${this.current}/${this.total})`;
    this.spinner.text = message ? `${message} ${progress}` : this.spinner.text.replace(/\(\d+\/\d+\)$/, progress);
  }
  
  complete(message?: string): void {
    this.spinner.succeed(message || `Completed (${this.total}/${this.total})`);
  }
  
  fail(message?: string): void {
    this.spinner.fail(message || 'Failed');
  }
}

/**
 * Format duration in human readable format
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
  return `${(ms / 3600000).toFixed(1)}h`;
}

/**
 * Format file size in human readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Display a table with enhanced formatting
 */
export function displayTable(
  data: Array<Record<string, any>>,
  options?: {
    columns?: string[];
    maxWidth?: number;
    sortBy?: string;
  }
): void {
  // Import moved to top of file
  const Table = require('cli-table3');
  
  if (data.length === 0) {
    console.log(chalk.gray('No data to display'));
    return;
  }
  
  // Get columns (either specified or auto-detect)
  const columns = options?.columns || (data[0] ? Object.keys(data[0]) : []);
  
  // Sort data if requested
  let sortedData = data;
  if (options?.sortBy && columns.includes(options.sortBy)) {
    sortedData = [...data].sort((a, b) => {
      const aVal = a[options.sortBy!];
      const bVal = b[options.sortBy!];
      
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return aVal - bVal;
      }
      
      return String(aVal).localeCompare(String(bVal));
    });
  }
  
  // Create table
  const table = new Table({
    head: columns.map(col => chalk.cyan(col.charAt(0).toUpperCase() + col.slice(1))),
    style: {
      head: [],
      border: ['gray']
    },
    colWidths: options?.maxWidth ? undefined : columns.map(() => undefined),
    wordWrap: true
  });
  
  // Add rows
  sortedData.forEach(row => {
    table.push(columns.map(col => {
      const value = row[col];
      if (value === null || value === undefined) {
        return chalk.gray('—');
      }
      if (typeof value === 'boolean') {
        return value ? chalk.green('✓') : chalk.red('✗');
      }
      if (typeof value === 'number') {
        return chalk.yellow(value.toString());
      }
      return String(value);
    }));
  });
  
  console.log(table.toString());
}

/**
 * Display help for common issues
 */
export function displayHelp(topic: string): void {
  const helpTopics: Record<string, { description: string; details: string[]; links?: { text: string; url: string }[] }> = {
    'authentication': {
      description: 'Help with API key authentication',
      details: [
        'Get your API key from the DWLF dashboard',
        'Run `dwlf login` to configure your credentials',
        'Use `dwlf config status` to verify your setup',
        'Check `dwlf login --validate` to test your key'
      ],
      links: [
        { text: 'DWLF Dashboard', url: 'https://dwlf.co.uk/dashboard' },
        { text: 'API Documentation', url: 'https://api.dwlf.co.uk/docs' }
      ]
    },
    'commands': {
      description: 'Available commands and their usage',
      details: [
        'Run `dwlf --help` to see all available commands',
        'Use `dwlf <command> --help` for detailed command help',
        'Most commands support JSON output with `--json` flag',
        'Enable completion with `dwlf completion install`'
      ]
    },
    'configuration': {
      description: 'Managing CLI configuration',
      details: [
        'Configuration is stored in `~/.dwlf/config.json`',
        'Use `dwlf config show` to view current settings',
        'Set values with `dwlf config set <key> <value>`',
        'Reset to defaults with `dwlf config reset`'
      ]
    }
  };
  
  const help = helpTopics[topic];
  if (!help) {
    console.log(chalk.red(`Unknown help topic: ${topic}`));
    console.log(chalk.gray('Available topics:'), Object.keys(helpTopics).join(', '));
    return;
  }
  
  console.log();
  console.log(chalk.cyan(`📖 ${help.description}`));
  console.log();
  
  help.details.forEach(detail => {
    console.log(chalk.gray(`  • ${detail}`));
  });
  
  if (help.links) {
    console.log();
    console.log(chalk.dim('Useful links:'));
    help.links.forEach(link => {
      console.log(`  • ${createLink(link.url, link.text)}`);
    });
  }
  
  console.log();
}